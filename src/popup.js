const enabledHostnames = new EnabledHostnamesList();
const linuxWindowsSpoofList = new LinuxWindowsSpoofList();

/**
 * Gets the currently active tab in the current window
 * @returns {Promise<chrome.tabs.Tab>} The active tab object
 * @throws {Error} If no active tab is found
 */
async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tabs.length < 1) {
    throw new Error("could not get active tab");
  }

  return tabs[0];
}

/**
 * Parses the active tab's URL. Pages the extension cannot see (such as browser-internal ones)
 * have no URL at all, which is treated like an unsupported page.
 * @param {chrome.tabs.Tab} tab
 * @returns {URL|null}
 */
function parseTabUrl(tab) {
  try {
    return new URL(tab.url);
  } catch {
    return null;
  }
}

/**
 * Updates the popup UI based on current tab, platform, and extension state
 * Handles browser detection, platform-specific toggles, and status messages
 * @returns {Promise<void>}
 */
async function updateUiState() {
  const activeTab = await getActiveTab();
  const currentUrl = parseTabUrl(activeTab);
  const currentProtocol = currentUrl?.protocol ?? "";
  const currentHostname = currentUrl?.hostname ?? "";
  const maskStatus = document.getElementById("maskStatus");
  const fancyContainer = document.querySelector("section.fancy_toggle_container");
  const checkbox = document.getElementById("mask_enabled");
  const linuxPlatformInfo = document.getElementById("linuxPlatformInfo");
  const webcompatLink = document.createElement("a");
  const supportMessage = document.getElementById("supportMessage");
  const breakageWarning = document.getElementById("breakageWarning");
  const reportBrokenSite = document.getElementById("reportBrokenSite");

  const actualPlatform = await getActualPlatform();
  const browserInfo = BrowserDetector.detect();

  // Set browser-specific icon for the main toggle using CSS custom properties
  const browserIcon = BrowserDetector.iconFor(browserInfo.slug);
  document.documentElement.style.setProperty("--browser-icon", `url(assets/${browserIcon})`);

  // Get shared tooltip message from i18n
  const toggleDescription = chrome.i18n.getMessage("mainToggleDescription");

  // Show Linux platform info if on Linux
  if (actualPlatform === "linux") {
    linuxPlatformInfo.style.display = "block";

    const linuxToggleCheckbox = document.getElementById("linux_mask_enabled");
    const linuxToggleDescriptionText = document.getElementById("linuxToggleDescriptionText");

    // Set the state of the Linux/Windows toggle based on the spoof list.
    if (linuxToggleCheckbox) {
      linuxToggleCheckbox.checked = linuxWindowsSpoofList.contains(currentHostname);
    }

    // Set the tooltip text for the Linux toggle.
    if (linuxToggleDescriptionText) {
      linuxToggleDescriptionText.innerText = chrome.i18n.getMessage("linuxToggleDescription");
    }
  } else {
    linuxPlatformInfo.style.display = "none";
  }

  if (currentProtocol == "chrome-extension:" || currentHostname == "") {
    maskStatus.innerText = chrome.i18n.getMessage("maskStatusUnsupported");
    fancyContainer.style.display = "none";
  } else if (enabledHostnames.covers(currentHostname)) {
    maskStatus.innerText = chrome.i18n.getMessage("maskStatusOn");
    checkbox.checked = true;
  } else {
    // Dynamic message based on detected browser
    maskStatus.innerText = chrome.i18n.getMessage("maskStatusOff", [browserInfo.displayName]);
    checkbox.checked = false;
  }

  await showMaskProfile(currentHostname);

  // Update main toggle tooltip text
  const mainToggleDescriptionText = document.getElementById("mainToggleDescriptionText");
  if (mainToggleDescriptionText) {
    mainToggleDescriptionText.innerText = toggleDescription;
  }

  webcompatLink.href = linkWithSearch("https://webcompat.com/issues/new", [["url", activeTab.url ?? ""]]);
  webcompatLink.innerText = chrome.i18n.getMessage("webcompatLinkText");

  // Create support link
  const supportLink = document.createElement("a");
  supportLink.href = "https://github.com/mr-september/chromium-mask#readme";
  supportLink.innerText = "supporting its development";
  supportLink.target = "_blank";

  supportMessage.innerHTML = chrome.i18n.getMessage("supportMessage", [supportLink.outerHTML]);

  breakageWarning.innerText = chrome.i18n.getMessage("breakageWarning");

  reportBrokenSite.innerHTML = chrome.i18n.getMessage("reportBrokenSite", [webcompatLink.outerHTML]);

  // On Android, opening the options page programmatically has limitations,
  // so we display a fallback text for Android users.
  if (actualPlatform === "android") {
    document.getElementById("manageSites").style.display = "none";
    document.getElementById("manageSitesFallbackText").innerText = chrome.i18n.getMessage("manageSitesFallback");
    document.getElementById("manageSitesFallback").style.display = "block";
  } else {
    const manageSitesButton = document.getElementById("manageSitesButton");
    manageSitesButton.innerText = chrome.i18n.getMessage("manageSitesButton");
  }
}

/**
 * Shows which Chrome version and OS the mask presents on this site, as computed by the service
 * worker. Hidden when masking is off or the worker has not published the profile yet.
 * @param {string} hostname
 */
async function showMaskProfile(hostname) {
  const element = document.getElementById("maskProfile");
  const { spoofingState } = await chrome.storage.local.get("spoofingState");
  const profile = spoofingState?.profiles?.[spoofingState.hostProfiles?.[hostname]];

  element.hidden = !(profile && enabledHostnames.covers(hostname));
  if (!element.hidden) {
    element.innerText = chrome.i18n.getMessage("maskProfileDetail", [
      String(spoofingState.chromeMajor),
      profile.platform,
    ]);
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
  await linuxWindowsSpoofList.load();
  await updateUiState();

  // Remove loading class to enable transitions after initial state is set
  // Use requestAnimationFrame to ensure the browser has painted the initial state
  // before enabling transitions (prevents animation flash on rapid popup opens)
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.body.classList.remove("loading");
    });
  });

  document.getElementById("manageSitesButton").addEventListener("click", () => chrome.runtime.openOptionsPage());

  document.getElementById("mask_enabled").addEventListener("change", async (ev) => {
    const currentHostname = parseTabUrl(await getActiveTab())?.hostname;

    if (!currentHostname) {
      ev.target.checked = false;
      return;
    }

    if (ev.target.checked) {
      await enabledHostnames.add(currentHostname);
    } else {
      // The site may be masked through its parent entry (the implicit "www." variant).
      await enabledHostnames.load();
      await enabledHostnames.remove(enabledHostnames.resolve(currentHostname) ?? currentHostname);
    }

    // Enabling reloads the tab automatically; disabling does not, so say what the user must do.
    const reloadHint = document.getElementById("reloadHint");
    reloadHint.innerText = chrome.i18n.getMessage("reloadToApplyHint");
    reloadHint.hidden = ev.target.checked;

    await enabledHostnames.load();
    await updateUiState();
  });

  // Linux/Windows toggle event
  const linuxToggleCheckbox = document.getElementById("linux_mask_enabled");
  if (linuxToggleCheckbox) {
    linuxToggleCheckbox.addEventListener("change", async () => {
      const currentHostname = parseTabUrl(await getActiveTab())?.hostname;
      if (!currentHostname) return;

      if (linuxToggleCheckbox.checked) {
        await linuxWindowsSpoofList.add(currentHostname);
      } else {
        await linuxWindowsSpoofList.remove(currentHostname);
      }
      await linuxWindowsSpoofList.load();
      await updateUiState();
    });
  }

  // The service worker publishes the profile asynchronously after a toggle.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.spoofingState) updateUiState();
  });
});
