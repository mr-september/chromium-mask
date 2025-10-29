/**
 * Manages the list of hostnames where Chrome user-agent masking is enabled
 * Persists to chrome.storage.local and handles migration from sync storage
 */
class EnabledHostnamesList {
  #set = new Set();

  /**
   * Loads the enabled hostnames from storage and handles migration from V2 sync storage
   * @returns {Promise<void>}
   */
  async load() {
    const storage = await chrome.storage.local.get(["enabledHostnames", "storageVersion"]);
    if (storage?.enabledHostnames) {
      this.#set = new Set(storage.enabledHostnames);
      return;
    }

    // In V3, this addon switched from sync to local storage. Even if sync storage worked,
    // it would make no sense. The set of sites that need a Chrome spoof on Mobile is very
    // different from the set of sites on Desktop. This code migrates the old sync storage data.

    if (storage?.storageVersion >= 3) {
      return;
    }

    const syncStorage = await chrome.storage.sync.get();
    if (Object.keys(syncStorage).length > 0) {
      console.info("migrating old sync storage to local");

      await chrome.storage.local.set(syncStorage);
      await chrome.storage.sync.clear();

      if (syncStorage.enabledHostnames) {
        this.#set = new Set(syncStorage.enabledHostnames);
      }
    }

    await chrome.storage.local.set({ storageVersion: 3 });
  }

  /**
   * Persists the current set to storage and notifies other extension contexts
   * @private
   * @returns {Promise<void>}
   */
  async #persist() {
    const enabledHostnames = Array.from(this.#set.values());
    await chrome.storage.local.set({ enabledHostnames });

    try {
      await chrome.runtime.sendMessage({ action: "enabled_hostnames_changed" });
    } catch (ex) {
      console.error("Failed to send enabled_hostnames_changed message:", ex);
    }
  }

  /**
   * Adds a hostname to the enabled list
   * @param {string} hostname - The hostname to add (e.g., "www.example.com")
   * @returns {Promise<void>}
   */
  async add(hostname) {
    this.#set.add(hostname);
    await this.#persist();
  }

  /**
   * Removes a hostname from the enabled list
   * @param {string} hostname - The hostname to remove
   * @returns {Promise<void>}
   */
  async remove(hostname) {
    this.#set.delete(hostname);
    await this.#persist();
  }

  /**
   * Checks if a hostname is in the enabled list
   * @param {string} hostname - The hostname to check
   * @returns {boolean} True if hostname is enabled for masking
   */
  contains(hostname) {
    return this.#set.has(hostname);
  }

  /**
   * Returns an iterator of all enabled hostnames
   * @returns {IterableIterator<string>}
   */
  get_values() {
    return this.#set.values();
  }

  /**
   * Returns the count of enabled hostnames
   * @returns {number}
   */
  size() {
    return this.#set.size;
  }
}

// Linux Windows spoofing hostnames list - similar to EnabledHostnamesList but for platform-specific control
/**
 * Manages the list of hostnames where Linux users should be spoofed as Windows
 * Similar to EnabledHostnamesList but specifically for platform spoofing
 */
class LinuxWindowsSpoofList {
  #set = new Set();

  /**
   * Loads the Linux Windows spoof list from storage and handles migration from global setting
   * @returns {Promise<void>}
   */
  async load() {
    const storage = await chrome.storage.local.get([
      "linuxWindowsSpoofHostnames",
      "storageVersion",
      "linuxWindowsSpoofMigrated",
    ]);
    if (storage?.linuxWindowsSpoofHostnames) {
      this.#set = new Set(storage.linuxWindowsSpoofHostnames);
      return;
    }

    // Migration: if user had global linuxSpoofAsWindows enabled, migrate to per-site for all currently enabled sites
    // Only run this migration once using the linuxWindowsSpoofMigrated flag
    if (storage?.storageVersion >= 3 && !storage?.linuxWindowsSpoofMigrated) {
      const globalSetting = await chrome.storage.local.get("linuxSpoofAsWindows");
      if (globalSetting?.linuxSpoofAsWindows === true) {
        // Get currently enabled hostnames and add them to Linux Windows spoof list
        const enabledStorage = await chrome.storage.local.get("enabledHostnames");
        if (enabledStorage?.enabledHostnames) {
          this.#set = new Set(enabledStorage.enabledHostnames);
          await chrome.storage.local.set({
            linuxWindowsSpoofHostnames: Array.from(this.#set),
            linuxWindowsSpoofMigrated: true,
          });
          console.info("Migrated global Linux Windows spoofing to per-site for all enabled hostnames");
          return;
        }
      }
      // Mark migration as complete even if no migration was needed
      await chrome.storage.local.set({ linuxWindowsSpoofMigrated: true });
    }
  }

  /**
   * Persists the current set to storage and notifies other extension contexts
   * @private
   * @returns {Promise<void>}
   */
  async #persist() {
    const linuxWindowsSpoofHostnames = Array.from(this.#set.values());
    await chrome.storage.local.set({ linuxWindowsSpoofHostnames });

    try {
      await chrome.runtime.sendMessage({ action: "linux_windows_spoof_hostnames_changed" });
    } catch (ex) {
      console.error("Failed to send linux_windows_spoof_hostnames_changed message:", ex);
    }
  }

  /**
   * Adds a hostname to the Windows spoof list
   * @param {string} hostname - The hostname to add
   * @returns {Promise<void>}
   */
  async add(hostname) {
    this.#set.add(hostname);
    await this.#persist();
  }

  /**
   * Removes a hostname from the Windows spoof list
   * @param {string} hostname - The hostname to remove
   * @returns {Promise<void>}
   */
  async remove(hostname) {
    this.#set.delete(hostname);
    await this.#persist();
  }

  /**
   * Checks if a hostname is in the Windows spoof list
   * @param {string} hostname - The hostname to check
   * @returns {boolean} True if hostname should spoof Windows
   */
  contains(hostname) {
    return this.#set.has(hostname);
  }

  /**
   * Returns an iterator of all Windows spoof hostnames
   * @returns {IterableIterator<string>}
   */
  get_values() {
    return this.#set.values();
  }

  /**
   * Returns the count of Windows spoof hostnames
   * @returns {number}
   */
  size() {
    return this.#set.size;
  }
}

// Unified platform info helper to reduce code duplication
/**
 * Helper class for retrieving platform information with caching and retry logic
 * Reduces repeated expensive calls to the service worker
 */
class PlatformInfoHelper {
  static #cachedPlatformInfo = null;
  static #cacheTimestamp = 0;
  static #CACHE_DURATION_MS = 60000; // Cache for 60 seconds

  /**
   * Gets platform information with retry logic and caching
   * @param {number} maxRetries - Maximum number of retry attempts (default: 5)
   * @param {boolean} useCache - Whether to use cached results (default: true)
   * @returns {Promise<Object>} Platform info object with actualPlatform, linuxSpoofAsWindows, platformInfo
   */
  static async getPlatformInfoWithRetry(maxRetries = 5, useCache = true) {
    // Return cached result if still valid
    if (useCache && this.#cachedPlatformInfo && Date.now() - this.#cacheTimestamp < this.#CACHE_DURATION_MS) {
      return this.#cachedPlatformInfo;
    }

    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        console.log(`Attempting to get platform info (attempt ${retryCount + 1}/${maxRetries})`);

        const response = await Promise.race([
          chrome.runtime.sendMessage({ action: "get_platform_info" }),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 5000)),
        ]);

        console.log("Received platform info response:", response);

        if (response && response.success) {
          console.log("Successfully got platform info:", response.data);
          // Cache the successful result
          this.#cachedPlatformInfo = response.data;
          this.#cacheTimestamp = Date.now();
          return response.data;
        } else {
          console.warn(`Failed to get platform info (attempt ${retryCount + 1}/${maxRetries}) - response:`, response);
        }
      } catch (error) {
        console.error(`Failed to get platform info (attempt ${retryCount + 1}/${maxRetries}):`, error);
      }

      retryCount++;
      if (retryCount < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 200 * retryCount)); // Exponential backoff
      }
    }

    // Fallback logic
    console.warn("Using fallback platform info after all retries failed");
    try {
      const fallbackPlatformInfo = await chrome.runtime.getPlatformInfo();
      const fallbackData = {
        actualPlatform: fallbackPlatformInfo.os,
        linuxSpoofAsWindows: true,
        platformInfo: fallbackPlatformInfo,
      };
      // Cache fallback result too
      this.#cachedPlatformInfo = fallbackData;
      this.#cacheTimestamp = Date.now();
      return fallbackData;
    } catch (fallbackError) {
      console.error("Failed to get fallback platform info:", fallbackError);
      const errorData = {
        actualPlatform: "unknown",
        linuxSpoofAsWindows: true,
        platformInfo: null,
      };
      // Don't cache error results
      return errorData;
    }
  }

  /**
   * Clear the cached platform info (useful for testing or force refresh)
   * @returns {void}
   */
  static clearCache() {
    this.#cachedPlatformInfo = null;
    this.#cacheTimestamp = 0;
  }
}

// Browser Detection Helper - Identifies the actual Chromium browser being used
class BrowserDetector {
  static #browserInfo = null;

  /**
   * Detects the actual browser from the user agent string and browser APIs
   * Works in both browser context (window) and service worker context (self)
   * @returns {Object} Browser information: { name, version, displayName, slug, hasNativeAPI }
   */
  static detect() {
    if (this.#browserInfo) {
      return this.#browserInfo;
    }

    // Get navigator from current context (works in both window and service worker)
    const nav = typeof navigator !== "undefined" ? navigator : self.navigator;
    const ua = nav.userAgent;

    // Get global object (window in pages, self in service workers)
    const globalObj = typeof window !== "undefined" ? window : self;

    let name = "chromium";
    let version = "unknown";
    let displayName = "Chromium Browser";
    let slug = "chromium";
    let hasNativeAPI = false;

    // Detection order matters - check most specific patterns first

    // Opera / Opera GX
    if (ua.includes("OPR/") || ua.includes("Opera/")) {
      const match = ua.match(/(?:OPR|Opera)\/(\d+\.\d+\.\d+\.\d+)/);
      name = "opera";
      displayName = ua.includes("GX") ? "Opera GX" : "Opera";
      slug = "opera";
      version = match ? match[1] : "unknown";
      hasNativeAPI = globalObj.opr !== undefined || globalObj.opera !== undefined;
    }
    // Brave
    else if (ua.includes("Brave/") || nav.brave !== undefined) {
      const match = ua.match(/Brave\/(\d+\.\d+\.\d+\.\d+)/);
      name = "brave";
      displayName = "Brave";
      slug = "brave";
      version = match ? match[1] : "unknown";
      hasNativeAPI = nav.brave !== undefined;
    }
    // Microsoft Edge (Chromium-based)
    else if (ua.includes("Edg/")) {
      const match = ua.match(/Edg\/(\d+\.\d+\.\d+\.\d+)/);
      name = "edge";
      displayName = "Microsoft Edge";
      slug = "edge";
      version = match ? match[1] : "unknown";
      hasNativeAPI = globalObj.chrome !== undefined;
    }
    // Vivaldi
    else if (ua.includes("Vivaldi/")) {
      const match = ua.match(/Vivaldi\/(\d+\.\d+\.\d+\.\d+)/);
      name = "vivaldi";
      displayName = "Vivaldi";
      slug = "vivaldi";
      version = match ? match[1] : "unknown";
      hasNativeAPI = globalObj.vivaldi !== undefined;
    }
    // Arc Browser
    else if (ua.includes("Arc/")) {
      const match = ua.match(/Arc\/(\d+\.\d+\.\d+\.\d+)/);
      name = "arc";
      displayName = "Arc";
      slug = "arc";
      version = match ? match[1] : "unknown";
      hasNativeAPI = false; // Arc doesn't expose a unique API
    }
    // Yandex Browser
    else if (ua.includes("YaBrowser/")) {
      const match = ua.match(/YaBrowser\/(\d+\.\d+\.\d+\.\d+)/);
      name = "yandex";
      displayName = "Yandex Browser";
      slug = "yandex";
      version = match ? match[1] : "unknown";
      hasNativeAPI = globalObj.yandex !== undefined;
    }
    // Google Chrome (must be after Edge/Opera/etc checks)
    else if (ua.includes("Chrome/")) {
      const match = ua.match(/Chrome\/(\d+\.\d+\.\d+\.\d+)/);
      name = "chrome";
      displayName = "Google Chrome";
      slug = "chrome";
      version = match ? match[1] : "unknown";
      hasNativeAPI = globalObj.chrome !== undefined;
    }
    // Chromium (generic fallback)
    else if (ua.includes("Chromium/")) {
      const match = ua.match(/Chromium\/(\d+\.\d+\.\d+\.\d+)/);
      name = "chromium";
      displayName = "Chromium Browser";
      slug = "chromium";
      version = match ? match[1] : "unknown";
      hasNativeAPI = false;
    }

    this.#browserInfo = {
      name,
      version,
      displayName,
      slug,
      hasNativeAPI,
      userAgent: ua,
      detectedAt: Date.now(),
    };

    return this.#browserInfo;
  }

  /**
   * Get browser-specific API properties that should be blocked/hidden
   * @returns {Array<string>} Array of property names to block
   */
  static getBrowserSpecificAPIs() {
    const browser = this.detect();
    const commonAPIs = [];

    switch (browser.name) {
      case "opera":
        return [
          "opera",
          "opr",
          "operaVersion",
          "operaBuild",
          "operaPrefs",
          "operaAPI",
          "operaTouchAPI",
          "operaMailAPI",
          "operaMediaAPI",
          "operaHistory",
          "operaExtension",
        ];
      case "brave":
        return ["brave", "braveSolana", "braveWallet"];
      case "edge":
        return ["edge"]; // Edge uses standard Chrome APIs mostly
      case "vivaldi":
        return ["vivaldi", "vivaldiPrivate"];
      case "yandex":
        return ["yandex", "yandexBrowser"];
      case "arc":
        return ["arc"]; // Arc doesn't expose much
      default:
        return commonAPIs;
    }
  }

  /**
   * Get CSS vendor prefixes that should be hidden for this browser
   * @returns {Array<string>} Array of CSS prefix patterns
   */
  static getBrowserCSSPrefixes() {
    const browser = this.detect();

    switch (browser.name) {
      case "opera":
        return ["-o-", "opera-", "-webkit-opera-"];
      case "edge":
        return ["-ms-", "edge-"];
      default:
        return []; // Most Chromium browsers don't have unique prefixes
    }
  }

  /**
   * Get the icon filename for this browser
   * @returns {string} Icon filename (without path)
   */
  static getBrowserIcon() {
    const browser = this.detect();
    // Map to available icon files - each browser uses its specific icon
    const iconMap = {
      opera: "toggler-icon-opera.png",
      brave: "toggler-icon-brave.png",
      edge: "toggler-icon-edge.png",
      vivaldi: "toggler-icon-vivaldi.png",
      chrome: "toggler-icon-chrome.png",
      yandex: "toggler-icon-chromium.png", // No specific icon, use generic Chromium
      arc: "toggler-icon-chromium.png", // No specific icon, use generic Chromium
      chromium: "toggler-icon-chromium.png", // Generic Chromium fallback
    };

    return iconMap[browser.slug] || "toggler-icon-chromium.png";
  }

  /**
   * Store browser detection results in chrome.storage for global access
   */
  static async storeBrowserInfo() {
    const browserInfo = this.detect();
    await chrome.storage.local.set({ detectedBrowser: browserInfo });
    console.log("Browser detection stored:", browserInfo);
    return browserInfo;
  }

  /**
   * Retrieve stored browser info (faster than re-detecting)
   */
  static async getStoredBrowserInfo() {
    const stored = await chrome.storage.local.get("detectedBrowser");
    if (stored?.detectedBrowser) {
      return stored.detectedBrowser;
    }
    // Fallback to fresh detection
    return this.detect();
  }

  /**
   * Clear cached browser info (force re-detection)
   */
  static clearCache() {
    this.#browserInfo = null;
  }
}

class ChromeUAStringManager {
  // Your public repo with the Chrome version file
  #remoteUrl = "https://raw.githubusercontent.com/mr-september/central_automation_hub/main/current-chrome-version.txt";

  // This are just fallbacks in the case we somehow have to make a request before everything is loaded.
  #currentPlatform = "win";
  #currentUAString = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36`;
  #currentChromeVersion = "134";
  #linuxSpoofAsWindows = true;

  async init() {
    const platformInfo = await chrome.runtime.getPlatformInfo();
    this.#currentPlatform = platformInfo.os;

    // Load Linux spoofing preference
    const storage = await chrome.storage.local.get("linuxSpoofAsWindows");
    this.#linuxSpoofAsWindows = storage.linuxSpoofAsWindows !== false; // Default to true

    await this.buildUAStringFromStorage();

    // Set up periodic refresh using chrome.alarms instead of setInterval
    chrome.alarms.create("version-check", { periodInMinutes: 60 });

    await this.maybeRefreshRemote();
  }

  getUAString() {
    return this.#currentUAString;
  }

  getChromeVersion() {
    return this.#currentChromeVersion;
  }

  // Get the actual platform (before any spoofing logic)
  getActualPlatform() {
    return this.#currentPlatform;
  }

  // Get Linux spoofing preference
  getLinuxSpoofAsWindows() {
    return this.#linuxSpoofAsWindows;
  }

  // Set Linux spoofing preference
  async setLinuxSpoofAsWindows(enabled) {
    console.log("Setting Linux spoof as Windows to:", enabled);

    this.#linuxSpoofAsWindows = enabled;

    // Ensure the storage operation completes
    await chrome.storage.local.set({ linuxSpoofAsWindows: enabled });
    console.log("Linux spoof setting saved to storage");

    await this.buildUAStringFromStorage();
    console.log("UA string rebuilt after Linux spoof change");
  }

  // Generate Chrome-like appVersion string for navigator.appVersion spoofing
  getAppVersion() {
    const baseAppVersion = this.#currentUAString.replace("Mozilla/", "");
    return baseAppVersion;
  }

  // Generate Chrome-like vendor string
  getVendor() {
    return "Google Inc.";
  }

  // Generate Chrome-like userAgentData for modern browsers
  getUserAgentData(hostname = null) {
    const actualPlatform = this.#currentPlatform;
    const effectivePlatform = this.#getEffectivePlatform(actualPlatform, hostname);

    const platformName = effectivePlatform === "mac" ? "macOS" : effectivePlatform === "linux" ? "Linux" : "Windows";

    const platformVersion =
      effectivePlatform === "mac" ? "14.0.0" : effectivePlatform === "linux" ? "5.15.0" : "15.0.0";

    return {
      brands: [
        { brand: "Google Chrome", version: this.#currentChromeVersion },
        { brand: "Chromium", version: this.#currentChromeVersion },
        { brand: "Not_A Brand", version: "24" },
      ],
      mobile: false,
      platform: platformName,

      // High entropy values that getHighEntropyValues() method should return
      highEntropyValues: {
        architecture: "x86",
        bitness: "64",
        fullVersionList: [
          { brand: "Google Chrome", version: `${this.#currentChromeVersion}.0.0.0` },
          { brand: "Chromium", version: `${this.#currentChromeVersion}.0.0.0` },
          { brand: "Not_A Brand", version: "24.0.0.0" },
        ],
        model: "",
        platformVersion: platformVersion,
        uaFullVersion: `${this.#currentChromeVersion}.0.0.0`,
        wow64: false,
      },
    };
  }

  // Helper method to determine effective platform for a hostname
  #getEffectivePlatform(actualPlatform, hostname) {
    // Only apply Linux-to-Windows spoofing logic if we're on Linux
    if (actualPlatform !== "linux") {
      return actualPlatform;
    }

    // If hostname is provided, check per-site setting
    if (hostname && typeof self !== "undefined" && self.linuxWindowsSpoofList) {
      return self.linuxWindowsSpoofList.contains(hostname) ? "win" : "linux";
    }

    // Fallback to global setting for backward compatibility
    return this.#linuxSpoofAsWindows ? "win" : "linux";
  }

  // Get UA string for specific hostname (supports per-site platform spoofing)
  getUAStringForHostname(hostname) {
    const actualPlatform = this.#currentPlatform;
    const effectivePlatform = this.#getEffectivePlatform(actualPlatform, hostname);

    const ChromeUAStrings = {
      win: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${this.#currentChromeVersion}.0.0.0 Safari/537.36`,
      mac: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${this.#currentChromeVersion}.0.0.0 Safari/537.36`,
      linux: `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${this.#currentChromeVersion}.0.0.0 Safari/537.36`,
      android: `Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${this.#currentChromeVersion}.0.0.0 Mobile Safari/537.36`,
    };

    return ChromeUAStrings[effectivePlatform] || this.#currentUAString;
  }

  async buildUAStringFromStorage() {
    let currentChromeVersion = "134";

    const storedMajorVersion = (await chrome.storage.local.get("remoteStorageVersionNumber"))
      ?.remoteStorageVersionNumber?.version;
    if (storedMajorVersion) {
      currentChromeVersion = storedMajorVersion;
    }

    // Store the chrome version for other methods
    this.#currentChromeVersion = currentChromeVersion;

    let targetPlatform = this.#currentPlatform;

    // On Linux, we can optionally spoof as Chrome-on-Windows. Some sites block Linux
    // specifically, so this is one general way to get around that. This is now configurable.
    if (targetPlatform === "linux" && this.#linuxSpoofAsWindows) {
      targetPlatform = "win";
    }

    const ChromeUAStrings = {
      win: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${currentChromeVersion}.0.0.0 Safari/537.36`,
      mac: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${currentChromeVersion}.0.0.0 Safari/537.36`,
      linux: `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${currentChromeVersion}.0.0.0 Safari/537.36`,
      android: `Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${currentChromeVersion}.0.0.0 Mobile Safari/537.36`,
    };

    this.#currentUAString = ChromeUAStrings[targetPlatform];

    // Store spoofing data whenever UA string is rebuilt
    await this.storeSpoofingData();
  }

  async maybeRefreshRemote() {
    const updatedAt = (await chrome.storage.local.get("remoteStorageVersionNumber"))?.remoteStorageVersionNumber
      ?.updatedAt;

    if (updatedAt > Date.now() - 24 * 60 * 60 * 1000) {
      console.info("remote updated in the last 24h, bailing");
      return;
    }

    try {
      console.info("Fetching Chrome version from central automation hub");
      const remoteResponseRaw = await fetch(this.#remoteUrl);
      if (remoteResponseRaw.status !== 200) {
        console.error("failed to update remote, unexpected status code", remoteResponseRaw.status);
        return;
      }

      const remoteResponse = await remoteResponseRaw.text();

      await chrome.storage.local.set({
        remoteStorageVersionNumber: {
          version: remoteResponse.trim(),
          updatedAt: Date.now(),
        },
      });

      await this.buildUAStringFromStorage();
      console.info(`Successfully updated to Chrome version ${remoteResponse.trim()}`);
    } catch (ex) {
      console.error("failed to update remote", ex);
    }
  }

  // Store spoofing data for content script access
  async storeSpoofingData() {
    await chrome.storage.local.set({
      spoofingData: {
        userAgent: this.#currentUAString,
        appVersion: this.getAppVersion(),
        vendor: this.getVendor(),
        userAgentData: this.getUserAgentData(),
        chromeVersion: this.#currentChromeVersion,
        updatedAt: Date.now(),
      },
    });
  }
}
