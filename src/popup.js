const enabledHostnames = new EnabledHostnamesList();

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tabs.length < 1) {
    throw new Error("could not get active tab");
  }

  return tabs[0];
}

async function updateUiState() {
  const activeTab = await getActiveTab();
  const currentUrl = new URL(activeTab.url);
  const currentProtocol = currentUrl.protocol;
  const currentHostname = currentUrl.hostname;
  const maskStatus = document.getElementById("maskStatus");
  const fancyContainer = document.querySelector("section.fancy_toggle_container");
  const checkbox = document.getElementById("mask_enabled");
  const linuxToggleContainer = document.getElementById("linuxToggleContainer");
  const linuxCheckbox = document.getElementById("linux_spoof_enabled");
  const webcompatLink = document.createElement("a");
  const supportMessage = document.getElementById("supportMessage");
  const breakageWarning = document.getElementById("breakageWarning");
  const reportBrokenSite = document.getElementById("reportBrokenSite");

  // Get platform information with retry mechanism
  let platformInfo = null;
  const maxRetries = 5;
  let retryCount = 0;
  
  while (retryCount < maxRetries && !platformInfo) {
    try {
      console.log(`Attempting to get platform info (attempt ${retryCount + 1}/${maxRetries})`);
      
      // Add a timeout to the message sending
      const response = await Promise.race([
        chrome.runtime.sendMessage({ action: "get_platform_info" }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Timeout")), 5000)
        )
      ]);
      
      console.log("Received response:", response);
      
      if (response && response.success) {
        platformInfo = response.data;
        console.log("Successfully got platform info:", platformInfo);
        break;
      } else {
        console.warn(`Failed to get platform info (attempt ${retryCount + 1}/${maxRetries}) - response:`, response);
        retryCount++;
        if (retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 200 * retryCount)); // Exponential backoff
        }
      }
    } catch (error) {
      console.error(`Failed to get platform info (attempt ${retryCount + 1}/${maxRetries}):`, error);
      retryCount++;
      if (retryCount < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 200 * retryCount)); // Exponential backoff
      }
    }
  }
  
  // If we still don't have platform info, use fallback
  if (!platformInfo) {
    console.warn("Using fallback platform info");
    try {
      const fallbackPlatformInfo = await chrome.runtime.getPlatformInfo();
      platformInfo = {
        actualPlatform: fallbackPlatformInfo.os,
        linuxSpoofAsWindows: true,
        platformInfo: fallbackPlatformInfo
      };
    } catch (fallbackError) {
      console.error("Failed to get fallback platform info:", fallbackError);
      // Hide Linux toggle if we can't determine platform
      platformInfo = {
        actualPlatform: "unknown",
        linuxSpoofAsWindows: true,
        platformInfo: null
      };
    }
  }

  // Show/hide Linux toggle based on actual platform
  if (platformInfo && platformInfo.actualPlatform === "linux") {
    linuxToggleContainer.style.display = "flex";
    linuxCheckbox.checked = platformInfo.linuxSpoofAsWindows;
    
    // Update the toggle text with localized message
    const linuxToggleText = document.getElementById("linuxToggleText");
    linuxToggleText.innerText = chrome.i18n.getMessage("linuxSpoofToggle");
    
    // Update tooltip and description with localized message
    const linuxInfoIcon = document.getElementById("linuxInfoIcon");
    const linuxDescriptionText = document.getElementById("linuxDescriptionText");
    const description = chrome.i18n.getMessage("linuxSpoofToggleDescription");
    
    linuxInfoIcon.title = description;
    linuxDescriptionText.innerText = description;
  } else {
    linuxToggleContainer.style.display = "none";
  }

  if (currentProtocol == "chrome-extension:" || currentHostname == "") {
    maskStatus.innerText = chrome.i18n.getMessage("maskStatusUnsupported");
    fancyContainer.style.display = "none";
  } else if (enabledHostnames.contains(currentHostname)) {
    maskStatus.innerText = chrome.i18n.getMessage("maskStatusOn");
    checkbox.checked = true;
  } else {
    maskStatus.innerText = chrome.i18n.getMessage("maskStatusOff");
    checkbox.checked = false;
  }

  // Update main toggle tooltip
  const mainToggleInfo = document.getElementById("mainToggleInfo");
  const mainToggleDescriptionText = document.getElementById("mainToggleDescriptionText");
  const mainToggleDescription = chrome.i18n.getMessage("mainToggleDescription");
  
  if (mainToggleInfo && mainToggleDescriptionText) {
    mainToggleInfo.title = mainToggleDescription;
    mainToggleDescriptionText.innerText = mainToggleDescription;
  }

  webcompatLink.href = linkWithSearch("https://webcompat.com/issues/new", [["url", activeTab.url]]);
  webcompatLink.innerText = chrome.i18n.getMessage("webcompatLinkText");

  // Create support link
  const supportLink = document.createElement("a");
  supportLink.href = "https://github.com/mr-september/chrome-mask-for-opera#readme";
  supportLink.innerText = "supporting its development";
  supportLink.target = "_blank";

  supportMessage.innerHTML = chrome.i18n.getMessage("supportMessage", [
    supportLink.outerHTML,
  ]);

  breakageWarning.innerText = chrome.i18n.getMessage("breakageWarning");

  reportBrokenSite.innerHTML = chrome.i18n.getMessage("reportBrokenSite", [
    webcompatLink.outerHTML,
  ]);

  // On Android, opening the options page programmatically has limitations,
  // so we display a fallback text for Android users.
  const platformInfoRuntime = await chrome.runtime.getPlatformInfo();
  if (platformInfoRuntime.os == "android") {
    document.getElementById("manageSites").style.display = "none";
    document.getElementById("manageSitesFallbackText").innerText = chrome.i18n.getMessage("manageSitesFallback");
    document.getElementById("manageSitesFallback").style.display = "block";
  } else {
    const manageSitesButton = document.getElementById("manageSitesButton");
    manageSitesButton.innerText = chrome.i18n.getMessage("manageSitesButton");
    manageSitesButton.addEventListener("click", async () => {
      await chrome.runtime.openOptionsPage();
    });
  }
}

function linkWithSearch(base, searchParamsInit) {
  const url = new URL(base);
  const searchParams = new URLSearchParams(searchParamsInit);
  url.search = searchParams.toString();
  return url.toString();
}

document.addEventListener("DOMContentLoaded", async () => {
  await enabledHostnames.load();
  await updateUiState();

  document.getElementById("mask_enabled").addEventListener("change", async (ev) => {
    const activeTab = await getActiveTab();
    const currentHostname = new URL(activeTab.url).hostname;

    if (!currentHostname) {
      ev.target.checked = false;
      return;
    }

    if (ev.target.checked) {
      await enabledHostnames.add(currentHostname);
    } else {
      await enabledHostnames.remove(currentHostname);
    }

    await updateUiState();
  });

  // Linux spoof toggle event listener
  document.getElementById("linux_spoof_enabled").addEventListener("change", async (ev) => {
    try {
      const response = await chrome.runtime.sendMessage({ 
        action: "set_linux_spoof", 
        enabled: ev.target.checked 
      });
      
      if (!response || !response.success) {
        console.error("Failed to update Linux spoof setting - response:", response);
        // Revert the checkbox state
        ev.target.checked = !ev.target.checked;
      }
    } catch (error) {
      console.error("Error updating Linux spoof setting:", error);
      // Revert the checkbox state
      ev.target.checked = !ev.target.checked;
    }
  });

  // Linux info icon now uses hover instead of click
  // No click handler needed - tooltip shows on hover via CSS

  // Main toggle info icon now uses hover instead of click
  // No click handler needed - tooltip shows on hover via CSS
});
