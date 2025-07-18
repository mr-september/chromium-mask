// Import shared classes and utilities
importScripts("shared.js");

// Global instances
let chromeUAStringManager;
let enabledHostnames;
let initPromise = null;
let dnrUpdateInProgress = false;
let contentScriptUpdateInProgress = false;

// Service worker initialization
chrome.runtime.onInstalled.addListener(async () => {
  console.log("Extension installed, initializing...");
  initPromise = init()
    .catch((error) => {
      console.error("Service worker initialization failed:", error);
    })
    .finally(() => {
      initPromise = null;
    });
  await initPromise;
});

chrome.runtime.onStartup.addListener(async () => {
  console.log("Extension startup, initializing...");
  initPromise = init()
    .catch((error) => {
      console.error("Service worker initialization failed:", error);
    })
    .finally(() => {
      initPromise = null;
    });
  await initPromise;
});

// Handle alarms for periodic tasks
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "version-check") {
    console.log("Version check alarm fired");
    if (chromeUAStringManager) {
      const previousUA = chromeUAStringManager.getUAString();

      await chromeUAStringManager.maybeRefreshRemote();
      // Store updated spoofing data
      await chromeUAStringManager.storeSpoofingData();

      const newUA = chromeUAStringManager.getUAString();

      // After updating UA string, refresh DNR rules
      await updateDeclarativeNetRequestRules();

      // Only reload tabs if the UA string actually changed
      if (previousUA !== newUA) {
        console.log("UA string changed during version check, reloading affected tabs");
        const currentHostnames = new Set(enabledHostnames.get_values());
        await reloadAffectedTabsSelectively(currentHostnames, currentHostnames, "version_update");
      } else {
        console.log("UA string unchanged during version check, no reload needed");
      }
    }
  }
});

// Handle messages from popup/options
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log("Message received:", msg);

  // Handle async operations
  (async () => {
    try {
      console.log("Processing message:", msg.action);

      // Wait for initialization to complete if it's still in progress
      if (initPromise) {
        console.log("Waiting for initialization to complete...");
        await initPromise;
      }

      // Check if we need to reinitialize (in case of service worker restart)
      if (!chromeUAStringManager || !enabledHostnames) {
        console.log("Reinitializing due to missing objects...");
        await init();
      }

      switch (msg.action) {
        case "enabled_hostnames_changed":
          await handleEnabledHostnamesChanged();
          break;
        case "linux_spoof_changed":
          await handleLinuxSpoofChanged();
          break;
        case "get_platform_info":
          try {
            console.log("Getting platform info...");
            const platformInfo = await chrome.runtime.getPlatformInfo();
            console.log("Platform info from runtime:", platformInfo);

            // Ensure ChromeUAStringManager is initialized
            if (!chromeUAStringManager) {
              console.warn("ChromeUAStringManager not initialized, using fallback values");
              const responseData = {
                success: true,
                data: {
                  actualPlatform: platformInfo.os,
                  linuxSpoofAsWindows: true,
                  platformInfo,
                },
              };
              console.log("Sending fallback platform info response:", responseData);
              sendResponse(responseData);
              return;
            }

            const actualPlatform = chromeUAStringManager.getActualPlatform();
            const linuxSpoofAsWindows = chromeUAStringManager.getLinuxSpoofAsWindows();

            const responseData = {
              success: true,
              data: {
                actualPlatform,
                linuxSpoofAsWindows,
                platformInfo,
              },
            };

            console.log("Sending platform info response:", responseData);
            sendResponse(responseData);
          } catch (platformError) {
            console.error("Error getting platform info:", platformError);
            sendResponse({ success: false, error: platformError.message });
          }
          return;
        case "set_linux_spoof":
          if (chromeUAStringManager) {
            await chromeUAStringManager.setLinuxSpoofAsWindows(msg.enabled);
            await updateDeclarativeNetRequestRules();
            await updateContentScriptRegistration();

            // Use the same logic as handleLinuxSpoofChanged for consistency
            const storage = await chrome.storage.local.get("linuxSpoofReloadAllTabs");
            if (storage.linuxSpoofReloadAllTabs === true) {
              console.log("Linux spoof reload all tabs enabled - reloading all enabled sites");
              const currentHostnames = new Set(enabledHostnames.get_values());
              await reloadAffectedTabsSelectively(currentHostnames, currentHostnames, "ua_change");
            } else {
              console.log("Linux spoof changed via message - headers updated, no reload");
            }
          }
          sendResponse({ success: true });
          return;
        case "inspect_dnr_rules":
          const inspection = await inspectDNRRules();
          sendResponse({ success: true, data: inspection });
          return;
        case "force_dnr_update":
          await updateDeclarativeNetRequestRules();
          sendResponse({ success: true, message: "DNR rules updated" });
          return;
        case "get_dnr_stats":
          const storage = await chrome.storage.local.get(["dnrStats", "dnrError"]);
          sendResponse({ success: true, data: storage });
          return;
        case "test":
          // Handle test message from test page
          sendResponse({
            success: true,
            message: "Service worker is responding",
            timestamp: new Date().toISOString(),
            extensionId: chrome.runtime.id,
          });
          return;
        default:
          console.warn("Unexpected message received:", msg);
          sendResponse({ success: false, error: "Unknown action" });
      }
    } catch (error) {
      console.error("Error handling message:", error);
      sendResponse({ success: false, error: error.message });
    }
  })();

  return true; // Will respond asynchronously
}); // Handle tab updates for badge status
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tabInfo) => {
  if (changeInfo.status === "complete" && tabInfo.url) {
    await updateBadgeStatus(tabInfo);
  }
});

// Handle active tab changes for badge status
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url) {
      await updateBadgeStatus(tab);
    }
  } catch (error) {
    console.error("Error updating badge status:", error);
  }
});

async function init() {
  try {
    console.log("Starting service worker initialization...");

    // Initialize global instances
    chromeUAStringManager = new ChromeUAStringManager();
    enabledHostnames = new EnabledHostnamesList();

    // Initialize managers with error handling
    try {
      await chromeUAStringManager.init();
      console.log("ChromeUAStringManager initialized successfully");
    } catch (error) {
      console.error("Failed to initialize ChromeUAStringManager:", error);
      // Don't fail completely, just continue with defaults
    }

    try {
      await enabledHostnames.load();
      console.log("EnabledHostnamesList loaded successfully");
    } catch (error) {
      console.error("Failed to load EnabledHostnamesList:", error);
      // Don't fail completely, just continue with empty list
    } // Store spoofing data for content script access
    try {
      await chromeUAStringManager.storeSpoofingData();
      console.log("Spoofing data stored successfully");

      // Verify the spoofing data was stored correctly
      const storage = await chrome.storage.local.get("spoofingData");
      if (storage.spoofingData) {
        console.log("Verified spoofing data in storage:", {
          userAgent: storage.spoofingData.userAgent?.substring(0, 50) + "...",
          vendor: storage.spoofingData.vendor,
          platform: storage.spoofingData.userAgentData?.platform,
        });
      } else {
        console.error("Spoofing data was not stored properly!");
      }
    } catch (error) {
      console.error("Failed to store spoofing data:", error);
    }

    // Set up initial DNR rules
    try {
      await updateDeclarativeNetRequestRules();
      console.log("DNR rules updated successfully");
    } catch (error) {
      console.error("Failed to update DNR rules:", error);
    }

    // Set up content script registration
    try {
      await updateContentScriptRegistration();
      console.log("Content script registration updated successfully");
    } catch (error) {
      console.error("Failed to update content script registration:", error);
    }

    console.log("Service worker initialized successfully");
  } catch (error) {
    console.error("Failed to initialize service worker:", error);
    // Don't re-throw the error, just log it
  }
}

async function handleEnabledHostnamesChanged() {
  console.log("Handling enabled hostnames changed");

  // Get the previous hostname list before reloading
  const previousHostnames = new Set(enabledHostnames.get_values());

  // Reload the hostnames list
  await enabledHostnames.load();

  // Get the new hostname list
  const currentHostnames = new Set(enabledHostnames.get_values());

  // Refresh spoofing data in case UA string changed
  await chromeUAStringManager.storeSpoofingData();

  // Update DNR rules
  await updateDeclarativeNetRequestRules();

  // Update content script registration
  await updateContentScriptRegistration();

  // Use targeted reload strategy - reload only the specific sites that changed
  await reloadAffectedTabsSelectively(previousHostnames, currentHostnames, "hostname_change");
}

async function handleLinuxSpoofChanged() {
  console.log("Handling Linux spoof setting changed");

  // Get current hostnames for selective reload
  const currentHostnames = new Set(enabledHostnames.get_values());

  // Refresh spoofing data with new settings
  await chromeUAStringManager.storeSpoofingData();

  // Update DNR rules
  await updateDeclarativeNetRequestRules();

  // Update content script registration
  await updateContentScriptRegistration();

  // For Linux spoof changes, we could be more conservative:
  // Most modern sites will pick up the new headers on subsequent requests
  // Only reload if user specifically wants immediate effect for all sites
  const storage = await chrome.storage.local.get("linuxSpoofReloadAllTabs");
  if (storage.linuxSpoofReloadAllTabs === true) {
    console.log("Linux spoof reload all tabs enabled - reloading all enabled sites");
    await reloadAffectedTabsSelectively(currentHostnames, currentHostnames, "ua_change");
  } else {
    console.log("Linux spoof change - headers updated, no tab reload (new requests will use new platform)");
    console.log("   Benefits: No disruption to current browsing session");
    console.log("   Effect: New requests and JavaScript will use updated platform info");
    console.log("   Note: Set 'linuxSpoofReloadAllTabs' to true in storage for immediate reload behavior");
  }
}

async function updateDeclarativeNetRequestRules() {
  // Prevent concurrent DNR updates
  if (dnrUpdateInProgress) {
    console.log("DNR update already in progress, waiting...");
    // Wait for the current update to complete instead of skipping
    let retries = 0;
    while (dnrUpdateInProgress && retries < 10) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      retries++;
    }
    if (dnrUpdateInProgress) {
      console.warn("DNR update still in progress after waiting, proceeding anyway");
    }
  }

  dnrUpdateInProgress = true;

  try {
    console.log("Starting DNR rules update...");

    const hostnames = Array.from(enabledHostnames.get_values());
    const uaString = chromeUAStringManager.getUAString();

    console.log(`Updating DNR rules for ${hostnames.length} hostnames with UA: ${uaString.substring(0, 50)}...`);

    // Get current dynamic rules to remove them
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const existingRuleIds = existingRules.map((rule) => rule.id);

    console.log(`Found ${existingRules.length} existing DNR rules to remove`);

    // Create new rules for enabled hostnames
    const newRules = generateDNRRules(hostnames, uaString);

    // Validate rule IDs don't conflict with existing ones
    const newRuleIds = newRules.map((rule) => rule.id);
    const conflictingIds = newRuleIds.filter((id) => existingRuleIds.includes(id));
    if (conflictingIds.length > 0) {
      console.warn(`Found conflicting rule IDs: ${conflictingIds.join(", ")}, regenerating rules...`);
      // Regenerate with different starting ID to avoid conflicts
      const maxExistingId = Math.max(0, ...existingRuleIds);
      const newRulesWithoutConflicts = generateDNRRules(hostnames, uaString, maxExistingId + 1);
      newRules.splice(0, newRules.length, ...newRulesWithoutConflicts);
    }

    // Update rules atomically
    const updateOptions = {
      removeRuleIds: existingRuleIds,
      addRules: newRules,
    };

    await chrome.declarativeNetRequest.updateDynamicRules(updateOptions);

    console.log(`✅ Successfully updated DNR rules:`);
    console.log(`   - Removed: ${existingRuleIds.length} rules`);
    console.log(`   - Added: ${newRules.length} rules`);

    // Log the new rules for debugging
    if (newRules.length > 0) {
      console.log("New DNR rules:");
      newRules.forEach((rule) => {
        console.log(
          `   Rule ${rule.id}: ${rule.condition.urlFilter} -> ${rule.action.requestHeaders[0].value.substring(0, 50)}...`,
        );
      });
    }

    // Store DNR stats for debugging
    await chrome.storage.local.set({
      dnrStats: {
        lastUpdate: Date.now(),
        rulesCount: newRules.length,
        hostnames: hostnames.slice(),
        uaString: uaString,
      },
    });
  } catch (error) {
    console.error("❌ Error updating DNR rules:", error);

    // Store error info for debugging
    await chrome.storage.local.set({
      dnrError: {
        timestamp: Date.now(),
        error: error.message,
        stack: error.stack,
      },
    });

    throw error; // Re-throw to allow caller to handle
  } finally {
    dnrUpdateInProgress = false;
  }
}

function generateDNRRules(hostnames, uaString, startingRuleId = 1000) {
  const rules = [];

  // Base rule ID - start from provided starting ID to avoid conflicts
  let ruleId = startingRuleId;

  // Extract Chrome version from UA string for Client Hints
  const chromeVersionMatch = uaString.match(/Chrome\/(\d+\.\d+\.\d+\.\d+)/);
  const chromeVersion = chromeVersionMatch ? chromeVersionMatch[1] : "134.0.0.0";
  const chromeMajorVersion = chromeVersion.split(".")[0];

  // Get platform info for Client Hints
  const userAgentData = chromeUAStringManager.getUserAgentData();
  const platformName = userAgentData.platform;
  const platformVersion = userAgentData.highEntropyValues.platformVersion;

  for (const hostname of hostnames) {
    // Create rule for the hostname
    const rule = {
      id: ruleId++,
      priority: 1,
      action: {
        type: "modifyHeaders",
        requestHeaders: [
          {
            header: "User-Agent",
            operation: "set",
            value: uaString,
          },
          {
            header: "sec-ch-ua",
            operation: "set",
            value: `"Chromium";v="${chromeMajorVersion}", "Not:A-Brand";v="24", "Google Chrome";v="${chromeMajorVersion}"`,
          },
          {
            header: "sec-ch-ua-mobile",
            operation: "set",
            value: "?0",
          },
          {
            header: "sec-ch-ua-platform",
            operation: "set",
            value: `"${platformName}"`,
          },
          {
            header: "sec-ch-ua-platform-version",
            operation: "set",
            value: `"${platformVersion}"`,
          },
          {
            header: "sec-ch-ua-model",
            operation: "set",
            value: '""',
          },
          {
            header: "sec-ch-ua-full-version-list",
            operation: "set",
            value: `"Chromium";v="${chromeVersion}", "Not:A-Brand";v="24.0.0.0", "Google Chrome";v="${chromeVersion}"`,
          },
          {
            header: "sec-ch-ua-arch",
            operation: "set",
            value: '"x86"',
          },
          {
            header: "sec-ch-ua-bitness",
            operation: "set",
            value: '"64"',
          },
          {
            header: "sec-ch-ua-wow64",
            operation: "set",
            value: "?0",
          },
          {
            header: "sec-fetch-user",
            operation: "set",
            value: "?1",
          },
          // Remove any Opera-specific headers that might leak through
          {
            header: "x-opera-mini-mode",
            operation: "remove",
          },
          {
            header: "x-opera-info",
            operation: "remove",
          },
          {
            header: "x-forwarded-for-opera-mini",
            operation: "remove",
          },
        ],
      },
      condition: {
        urlFilter: `*://${hostname}/*`,
        resourceTypes: [
          "main_frame",
          "sub_frame",
          "xmlhttprequest",
          "websocket",
          "script",
          "stylesheet",
          "image",
          "font",
          "object",
          "other",
        ],
      },
    };

    rules.push(rule);

    // Also create a rule for www subdomain if not already present
    if (!hostname.startsWith("www.") && !hostnames.includes(`www.${hostname}`)) {
      const wwwRule = {
        id: ruleId++,
        priority: 1,
        action: {
          type: "modifyHeaders",
          requestHeaders: [
            {
              header: "User-Agent",
              operation: "set",
              value: uaString,
            },
            {
              header: "sec-ch-ua",
              operation: "set",
              value: `"Chromium";v="${chromeMajorVersion}", "Not:A-Brand";v="24", "Google Chrome";v="${chromeMajorVersion}"`,
            },
            {
              header: "sec-ch-ua-mobile",
              operation: "set",
              value: "?0",
            },
            {
              header: "sec-ch-ua-platform",
              operation: "set",
              value: `"${platformName}"`,
            },
            {
              header: "sec-ch-ua-platform-version",
              operation: "set",
              value: `"${platformVersion}"`,
            },
            {
              header: "sec-ch-ua-model",
              operation: "set",
              value: '""',
            },
            {
              header: "sec-ch-ua-full-version-list",
              operation: "set",
              value: `"Chromium";v="${chromeVersion}", "Not:A-Brand";v="24.0.0.0", "Google Chrome";v="${chromeVersion}"`,
            },
            {
              header: "sec-ch-ua-arch",
              operation: "set",
              value: '"x86"',
            },
            {
              header: "sec-ch-ua-bitness",
              operation: "set",
              value: '"64"',
            },
            {
              header: "sec-ch-ua-wow64",
              operation: "set",
              value: "?0",
            },
            {
              header: "sec-fetch-user",
              operation: "set",
              value: "?1",
            },
            // Remove any Opera-specific headers that might leak through
            {
              header: "x-opera-mini-mode",
              operation: "remove",
            },
            {
              header: "x-opera-info",
              operation: "remove",
            },
            {
              header: "x-forwarded-for-opera-mini",
              operation: "remove",
            },
          ],
        },
        condition: {
          urlFilter: `*://www.${hostname}/*`,
          resourceTypes: [
            "main_frame",
            "sub_frame",
            "xmlhttprequest",
            "websocket",
            "script",
            "stylesheet",
            "image",
            "font",
            "object",
            "other",
          ],
        },
      };

      rules.push(wwwRule);
    }
  }

  return rules;
}

async function updateContentScriptRegistration() {
  // Prevent concurrent content script updates
  if (contentScriptUpdateInProgress) {
    console.log("Content script update already in progress, waiting...");
    // Wait for the current update to complete instead of skipping
    let retries = 0;
    while (contentScriptUpdateInProgress && retries < 10) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      retries++;
    }
    if (contentScriptUpdateInProgress) {
      console.warn("Content script update still in progress after waiting, proceeding anyway");
    }
  }

  contentScriptUpdateInProgress = true;

  try {
    // Get all registered content scripts
    const registeredScripts = await chrome.scripting.getRegisteredContentScripts();

    // Unregister existing scripts only if they actually exist
    const scriptsToUnregister = registeredScripts.filter(
      (script) =>
        script.id === "chrome-mask-content-script-main" || script.id === "chrome-mask-content-script-isolated",
    );

    if (scriptsToUnregister.length > 0) {
      const scriptIds = scriptsToUnregister.map((script) => script.id);
      console.log(`Unregistering existing content scripts: ${scriptIds.join(", ")}`);
      await chrome.scripting.unregisterContentScripts({ ids: scriptIds });
    }

    const hostnames = Array.from(enabledHostnames.get_values());

    // Register new content script if we have enabled hostnames
    if (hostnames.length > 0) {
      // Create matches array including both hostname and www.hostname variants
      const matches = [];
      for (const hostname of hostnames) {
        matches.push(`*://${hostname}/*`);
        // Add www variant if not already a www subdomain and not already in the list
        if (!hostname.startsWith("www.") && !hostnames.includes(`www.${hostname}`)) {
          matches.push(`*://www.${hostname}/*`);
        }
      }

      // Register multiple content scripts for maximum coverage
      await chrome.scripting.registerContentScripts([
        {
          id: "chrome-mask-content-script-main",
          matches: matches,
          js: ["content-spoofer.js"],
          runAt: "document_start",
          allFrames: true,
          world: "MAIN", // Inject into main world for deeper access
        },
        {
          id: "chrome-mask-content-script-isolated",
          matches: matches,
          js: ["content-spoofer.js"],
          runAt: "document_start",
          allFrames: true,
          world: "ISOLATED", // Also inject into isolated world as backup
        },
      ]);

      console.log(`Registered content scripts for ${hostnames.length} hostnames (${matches.length} total patterns)`);
    } else {
      console.log("No hostnames enabled, content script not registered");
    }
  } catch (error) {
    console.error("Error updating content script registration:", error);
  } finally {
    contentScriptUpdateInProgress = false;
  }
}

async function updateBadgeStatus(tab) {
  try {
    if (!tab.url || tab.id === chrome.tabs.TAB_ID_NONE) {
      return;
    }

    const url = new URL(tab.url);
    const hostname = url.hostname;
    const isEnabled = enabledHostnames.contains(hostname);

    await chrome.action.setIcon({
      tabId: tab.id,
      path: {
        16: `assets/badge-indicator-${isEnabled ? "on" : "off"}-16.png`,
        32: `assets/badge-indicator-${isEnabled ? "on" : "off"}-32.png`,
        48: `assets/badge-indicator-${isEnabled ? "on" : "off"}-48.png`,
        128: `assets/badge-indicator-${isEnabled ? "on" : "off"}-128.png`,
      },
    });

    await chrome.action.setTitle({
      tabId: tab.id,
      title: chrome.i18n.getMessage(`maskStatus${isEnabled ? "On" : "Off"}`),
    });
  } catch (error) {
    console.error("Error updating badge status:", error);
  }
}

/**
 * Selectively reload tabs based on the type of change that occurred.
 * This optimized approach reduces unnecessary tab reloads while maintaining spoofing functionality.
 *
 * @param {Set} previousHostnames - The hostname list before the change
 * @param {Set} currentHostnames - The hostname list after the change
 * @param {string} changeType - Type of change: 'hostname_change', 'ua_change', 'version_update', 'critical_update'
 */
async function reloadAffectedTabsSelectively(previousHostnames, currentHostnames, changeType) {
  try {
    console.log(`Selective tab reload for ${changeType}:`, {
      previous: Array.from(previousHostnames || []),
      current: Array.from(currentHostnames || []),
    });

    // Check for legacy reload mode preference (for advanced users who might need it)
    const storage = await chrome.storage.local.get("forceLegacyTabReload");
    if (storage.forceLegacyTabReload === true) {
      console.log("Legacy tab reload mode enabled - using original behavior");
      await reloadAffectedTabsLegacy();
      return;
    }

    // For hostname changes, we only need to reload in specific scenarios
    if (changeType === "hostname_change") {
      // Calculate which hostnames were added or removed
      const added = new Set([...currentHostnames].filter((x) => !previousHostnames.has(x)));
      const removed = new Set([...previousHostnames].filter((x) => !currentHostnames.has(x)));

      console.log("Hostname changes detected:", {
        added: Array.from(added),
        removed: Array.from(removed),
      });

      // For sites being enabled (added), we need to reload them so spoofing takes effect immediately
      if (added.size > 0) {
        const addedHostnames = Array.from(added);
        const matchPatterns = addedHostnames.map((hostname) => `*://${hostname}/*`);

        const tabs = await chrome.tabs.query({
          url: matchPatterns,
        });

        for (const tab of tabs) {
          if (tab.id !== chrome.tabs.TAB_ID_NONE) {
            console.log(`Reloading newly enabled site: ${new URL(tab.url).hostname}`);
            await chrome.tabs.reload(tab.id, { bypassCache: true });
          }
        }

        console.log(`✅ Reloaded ${tabs.length} tabs for newly enabled sites`);
      }

      // For sites being disabled (removed), no reload needed - they can continue as normal
      if (removed.size > 0) {
        console.log(`✅ ${removed.size} sites disabled - no reload needed (graceful degradation)`);
      }

      // If no actual changes, skip entirely
      if (added.size === 0 && removed.size === 0) {
        console.log("✅ No hostname changes detected - skipping reload");
      }

      console.log("   Benefits: Only affected sites reloaded, others remain undisturbed");
      return;
    }

    // For UA changes (like Linux spoof toggle), reload all currently enabled sites
    if (changeType === "ua_change") {
      const hostnames = Array.from(currentHostnames);
      if (hostnames.length === 0) {
        console.log("No enabled hostnames for UA change reload");
        return;
      }

      const matchPatterns = hostnames.map((hostname) => `*://${hostname}/*`);

      // Query for tabs that match our patterns
      const tabs = await chrome.tabs.query({
        url: matchPatterns,
      });

      // Reload each affected tab
      for (const tab of tabs) {
        if (tab.id !== chrome.tabs.TAB_ID_NONE) {
          await chrome.tabs.reload(tab.id, { bypassCache: true });
        }
      }

      console.log(`Reloaded ${tabs.length} tabs due to UA string change`);
      return;
    }

    // For version updates or other critical changes, reload all enabled sites
    if (changeType === "version_update" || changeType === "critical_update") {
      const hostnames = Array.from(currentHostnames);
      if (hostnames.length === 0) {
        console.log("No enabled hostnames for version update reload");
        return;
      }

      const matchPatterns = hostnames.map((hostname) => `*://${hostname}/*`);

      // Query for tabs that match our patterns
      const tabs = await chrome.tabs.query({
        url: matchPatterns,
      });

      // Reload each affected tab
      for (const tab of tabs) {
        if (tab.id !== chrome.tabs.TAB_ID_NONE) {
          await chrome.tabs.reload(tab.id, { bypassCache: true });
        }
      }

      console.log(`Reloaded ${tabs.length} tabs due to ${changeType}`);
      return;
    }

    console.log(`Unknown change type: ${changeType}, skipping reload`);
  } catch (error) {
    console.error("Error in selective tab reload:", error);
    // Fallback to legacy behavior on error
    console.log("Falling back to legacy reload behavior");
    await reloadAffectedTabsLegacy();
  }
}

// Keep the original function as a fallback for critical scenarios
async function reloadAffectedTabsLegacy() {
  try {
    const hostnames = Array.from(enabledHostnames.get_values());
    if (hostnames.length === 0) {
      return;
    }

    const matchPatterns = hostnames.map((hostname) => `*://${hostname}/*`);

    // Query for tabs that match our patterns
    const tabs = await chrome.tabs.query({
      url: matchPatterns,
    });

    // Reload each affected tab
    for (const tab of tabs) {
      if (tab.id !== chrome.tabs.TAB_ID_NONE) {
        await chrome.tabs.reload(tab.id, { bypassCache: true });
      }
    }

    console.log(`Legacy reload: Reloaded ${tabs.length} affected tabs`);
  } catch (error) {
    console.error("Error reloading affected tabs (legacy):", error);
  }
}

// Debug function to inspect current DNR rules
async function inspectDNRRules() {
  try {
    const dynamicRules = await chrome.declarativeNetRequest.getDynamicRules();
    const sessionRules = await chrome.declarativeNetRequest.getSessionRules();

    console.log("📊 Current DNR Rules Status:");
    console.log(`   Dynamic Rules: ${dynamicRules.length}`);
    console.log(`   Session Rules: ${sessionRules.length}`);

    if (dynamicRules.length > 0) {
      console.log("   Dynamic Rules Details:");
      dynamicRules.forEach((rule) => {
        console.log(
          `     Rule ${rule.id}: ${rule.condition.urlFilter} -> ${rule.action.requestHeaders[0].value.substring(0, 50)}...`,
        );
      });
    }

    // Get stored stats
    const storage = await chrome.storage.local.get(["dnrStats", "dnrError"]);

    if (storage.dnrStats) {
      console.log("   Last Update:", new Date(storage.dnrStats.lastUpdate).toLocaleString());
      console.log("   Hostnames:", storage.dnrStats.hostnames);
    }

    if (storage.dnrError) {
      console.log("   Last Error:", new Date(storage.dnrError.timestamp).toLocaleString());
      console.log("   Error Message:", storage.dnrError.error);
    }

    return {
      dynamicRules,
      sessionRules,
      stats: storage.dnrStats,
      error: storage.dnrError,
    };
  } catch (error) {
    console.error("Error inspecting DNR rules:", error);
    return null;
  }
}

// Initialize when service worker starts
initPromise = init()
  .catch((error) => {
    console.error("Service worker initialization failed:", error);
  })
  .finally(() => {
    // Clear the promise once initialization is complete
    initPromise = null;
  });
