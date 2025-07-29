const enabledHostnames = new EnabledHostnamesList();
const linuxWindowsSpoofList = new LinuxWindowsSpoofList();

// Helper function to set text from localization files
function localizePage() {
  // Localize text content
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = chrome.i18n.getMessage(el.dataset.i18n);
  });

  // Localize placeholder attributes
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.placeholder = chrome.i18n.getMessage(el.dataset.i18nPlaceholder);
  });
}

async function initUi() {
  // First, apply all translations to the static HTML
  localizePage();

  // Then, set up the dynamic parts of the UI
  await setupLinuxPlatformSection();
  setupAddForm();
  setupSiteList();
}

async function setupLinuxPlatformSection() {
  const response = await PlatformInfoHelper.getPlatformInfoWithRetry();
  if (!response) {
    console.error("Failed to get platform info - Linux platform section will not be available");
    return;
  }
  try {
    if (response.actualPlatform === "linux") {
      document.getElementById("linuxPlatformSection").style.display = "block";
      setupLinuxWindowsSpoofAddForm();
      setupLinuxWindowsSpoofSiteList();
    }
  } catch (error) {
    console.error("Error setting up Linux platform section:", error);
  }
}

function tryValidateHostname(input) {
  try {
    if (URL.canParse(input)) return new URL(input).hostname;
    if (URL.canParse(`https://${input}`)) return new URL(`https://${input}`).hostname;
  } catch (e) {
    // Catches cases like "http:// " which canParse but not construct
    return undefined;
  }
  return undefined;
}

function setupLinuxWindowsSpoofAddForm() {
  const inputEl = document.getElementById("add-linux-windows-site-input");
  document.getElementById("add-linux-windows-site-form").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const maybeHostname = tryValidateHostname(inputEl.value);
    if (!maybeHostname) {
      alert(chrome.i18n.getMessage("addSiteErrorInvalid"));
      return false;
    }
    if (linuxWindowsSpoofList.contains(maybeHostname)) {
      alert(chrome.i18n.getMessage("addSiteErrorAlreadySpoofing"));
      return false;
    }
    await linuxWindowsSpoofList.add(maybeHostname);
    inputEl.value = "";
  });
}

function setupLinuxWindowsSpoofSiteList() {
  const siteList = document.getElementById("linux-windows-spoof-sites");
  siteList.innerHTML = "";

  if (linuxWindowsSpoofList.size() < 1) {
    siteList.innerHTML = `<p class="empty-list-message">${chrome.i18n.getMessage("optionsLinuxSpoofEmpty")}</p>`;
    return;
  }

  [...linuxWindowsSpoofList.get_values()]
    .sort((a, b) => a.localeCompare(b))
    .forEach((hostname) => {
      const siteListItem = document.createElement("div");
      siteListItem.classList.add("list-item");

      const hostnameLabel = document.createElement("p");
      const spoofDetailText = chrome.i18n.getMessage("optionsSpoofingAsWindows");
      hostnameLabel.innerHTML = `${hostname} <span class="hostname-details">${spoofDetailText}</span>`;

      const deleteButton = document.createElement("button");
      deleteButton.textContent = chrome.i18n.getMessage("siteListRemoveButton");
      deleteButton.className = "button button-danger";
      deleteButton.addEventListener("click", async () => {
        await linuxWindowsSpoofList.remove(hostname);
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
  });
}

function setupSiteList() {
  const siteList = document.getElementById("masked-sites");
  siteList.innerHTML = "";

  if (enabledHostnames.size() < 1) {
    siteList.innerHTML = `<p class="empty-list-message">${chrome.i18n.getMessage("siteListEmpty")}</p>`;
    return;
  }

  [...enabledHostnames.get_values()]
    .sort((a, b) => a.localeCompare(b))
    .forEach((hostname) => {
      const siteListItem = document.createElement("div");
      siteListItem.classList.add("list-item");

      const hostnameLabel = document.createElement("p");
      hostnameLabel.textContent = hostname;

      const deleteButton = document.createElement("button");
      deleteButton.textContent = chrome.i18n.getMessage("siteListRemoveButton");
      deleteButton.className = "button button-danger";
      deleteButton.addEventListener("click", async () => {
        await enabledHostnames.remove(hostname);
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
        setupSiteList();
        setupLinuxWindowsSpoofSiteList();
        break;
      case "linux_windows_spoof_hostnames_changed":
        setupLinuxWindowsSpoofSiteList();
        break;
      default:
        console.warn("Unexpected message received in options.js:", msg);
    }
    return true;
  });
});
