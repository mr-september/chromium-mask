const enabledHostnames = new EnabledHostnamesList();
const linuxWindowsSpoofList = new LinuxWindowsSpoofList();

async function initUi() {
  [
    ["add-site-hostname-explanation", "addSiteHostnameExplanation"],
    ["add-site-title", "addSiteTitle"],
    ["masked-sites-title", "maskedSitesTitle"],
  ].forEach(([id, i18nKey]) => {
    document.getElementById(id).innerText = chrome.i18n.getMessage(i18nKey);
  });

  document.getElementById("add-site-button").value = chrome.i18n.getMessage("addSiteButton");

  // Setup Linux platform configuration if on Linux
  await setupLinuxPlatformSection();

  setupAddForm();
  setupSiteList();
}

async function setupLinuxPlatformSection() {
  // Use unified platform info helper - same as popup.js
  const response = await PlatformInfoHelper.getPlatformInfoWithRetry();

  if (!response) {
    console.error("Failed to get platform info after all retries - Linux platform section will not be available");
    return;
  }

  try {
    if (response.actualPlatform === "linux") {
      const linuxSection = document.getElementById("linuxPlatformSection");
      linuxSection.style.display = "block";

      // Update text content with localized strings (keeping existing for backward compatibility)
      document.getElementById("linuxPlatformTitle").innerText = "Linux Platform Settings";
      document.getElementById("linuxWindowsSpoofSitesTitle").innerText = "Sites Using Windows Spoofing";
      document.getElementById("linuxWindowsSpoofExplanation").innerText =
        "Choose which sites should appear as Windows Chrome instead of Linux Chrome. This only affects sites where Chrome masking is already enabled.";

      document.getElementById("add-linux-windows-site-button").value = "Add Site";
      document.getElementById("add-linux-windows-site-explanation").innerText =
        "Enter the hostname of a site that should use Windows spoofing";

      // Setup Linux Windows spoof sites management
      setupLinuxWindowsSpoofAddForm();
      setupLinuxWindowsSpoofSiteList();

      // Legacy global setting - keep for backward compatibility but mark as deprecated
      const linuxCheckbox = document.getElementById("linuxSpoofOption");
      linuxCheckbox.checked = response.linuxSpoofAsWindows;
      document.getElementById("linuxSpoofOptionText").innerText = "Apply Windows spoofing to all sites (deprecated)";
      document.getElementById("linuxSpoofOptionDescription").innerHTML =
        "<strong>Deprecated:</strong> Use the per-site list above instead. This global setting affects all sites where Chrome masking is enabled.";
      document.getElementById("linuxSpoofOptionNote").innerHTML =
        "<strong>Migration:</strong> Consider adding specific sites to the Windows spoofing list above for better control.";

      // Add event listener for legacy checkbox (still functional but deprecated)
      linuxCheckbox.addEventListener("change", async (ev) => {
        await ToggleHelper.handleToggleChange(
          ev.target,
          "set_linux_spoof",
          { enabled: ev.target.checked },
          { toggleName: "Linux spoof (legacy)" },
        );
      });
    } else {
      // This is expected behavior on non-Linux platforms
      console.log(`Platform is ${response.actualPlatform}, Linux platform section not needed`);
    }
  } catch (error) {
    console.error("Error setting up Linux platform section:", error);
  }
}

function tryValidateHostname(input) {
  if (URL.canParse(input)) {
    return URL.parse(input).hostname;
  }

  if (URL.canParse(`https://${input}`)) {
    return URL.parse(`https://${input}`).hostname;
  }

  return undefined;
}

function setupLinuxWindowsSpoofAddForm() {
  const inputEl = document.getElementById("add-linux-windows-site-input");
  document.getElementById("add-linux-windows-site-form").addEventListener("submit", async (ev) => {
    ev.preventDefault();

    const maybeHostname = tryValidateHostname(inputEl.value);
    if (!maybeHostname) {
      alert("Invalid hostname. Please enter a valid domain like 'example.com'");
      return false;
    }

    if (linuxWindowsSpoofList.contains(maybeHostname)) {
      alert("This site is already in the Windows spoofing list");
      return false;
    }

    await linuxWindowsSpoofList.add(maybeHostname);
    inputEl.value = "";

    // Refresh the display
    setupLinuxWindowsSpoofSiteList();
  });
}

function setupLinuxWindowsSpoofSiteList() {
  const siteList = document.getElementById("linux-windows-spoof-sites");
  siteList.innerHTML = "";

  if (linuxWindowsSpoofList.size() < 1) {
    const siteListItem = document.createElement("p");
    siteListItem.innerText =
      "No sites configured for Windows spoofing. All enabled sites will use Linux Chrome identity.";
    siteListItem.style.fontStyle = "italic";
    siteListItem.style.color = "#666";
    siteList.appendChild(siteListItem);
    return;
  }

  [...linuxWindowsSpoofList.get_values()]
    .sort((a, b) => a.localeCompare(b))
    .forEach((hostname) => {
      const siteListItem = document.createElement("div");
      siteListItem.classList.add("linux-windows-site-list-item");

      const hostnameLabel = document.createElement("p");
      hostnameLabel.textContent = hostname;

      // Add status indicator if this hostname is also in the main enabled list
      if (enabledHostnames.contains(hostname)) {
        hostnameLabel.innerHTML = `${hostname} <span style="color: green; font-size: 0.8em;">(✓ Chrome masking active)</span>`;
      } else {
        hostnameLabel.innerHTML = `${hostname} <span style="color: #888; font-size: 0.8em;">(waiting for Chrome masking)</span>`;
      }

      const deleteButton = document.createElement("button");
      deleteButton.textContent = "Remove";
      deleteButton.addEventListener("click", async () => {
        await linuxWindowsSpoofList.remove(hostname);
        setupLinuxWindowsSpoofSiteList();
      });

      siteListItem.append(hostnameLabel, deleteButton);
      siteList.appendChild(siteListItem);
    });
}

function setupAddForm() {
  const inputEl = document.getElementById("add-site-input");
  document.getElementById("add-site-form").addEventListener("submit", async (ev) => {
    ev.preventDefault();

    const maybeHostname = tryValidateHostname(inputEl.value);
    if (!maybeHostname) {
      alert(chrome.i18n.getMessage("addSiteErrorInvalid"));
      return false;
    }

    if (enabledHostnames.contains(maybeHostname)) {
      alert(chrome.i18n.getMessage("addSiteErrorAlreadyActive"));
      return false;
    }

    await enabledHostnames.add(maybeHostname);
    inputEl.value = "";
    window.location.reload();
  });
}

function setupSiteList() {
  const siteList = document.getElementById("masked-sites");
  siteList.innerHTML = "";

  if (enabledHostnames.size() < 1) {
    const siteListItem = document.createElement("p");
    siteListItem.innerText = chrome.i18n.getMessage("siteListEmpty");
    siteList.appendChild(siteListItem);
    return;
  }

  [...enabledHostnames.get_values()]
    .sort((a, b) => a.localeCompare(b))
    .forEach((hostname) => {
      const siteListItem = document.createElement("div");
      siteListItem.classList.add("site-list-item");

      const hostnameLabel = document.createElement("p");
      hostnameLabel.textContent = hostname;

      const deleteButton = document.createElement("button");
      deleteButton.textContent = chrome.i18n.getMessage("siteListRemoveButton");
      deleteButton.addEventListener("click", async () => {
        await enabledHostnames.remove(hostname);
        window.location.reload();
      });

      siteListItem.append(hostnameLabel, deleteButton);
      siteList.appendChild(siteListItem);
    });
}

document.addEventListener("DOMContentLoaded", async () => {
  await enabledHostnames.load();
  await linuxWindowsSpoofList.load();
  await initUi();

  chrome.runtime.onMessage.addListener(async (msg) => {
    switch (msg.action) {
      case "enabled_hostnames_changed":
        window.location.reload();
        break;
      case "linux_windows_spoof_hostnames_changed":
        // Refresh the Linux Windows spoof site list display
        setupLinuxWindowsSpoofSiteList();
        break;
      default:
        throw new Error("unexpected message received", msg);
    }
  });
});
