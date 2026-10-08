const enabledHostnames = new EnabledHostnamesList();
const linuxWindowsSpoofList = new LinuxWindowsSpoofList();

/**
 * Localizes the options page by replacing i18n placeholders with translated text
 * @returns {Promise<void>}
 */
async function localizePage() {
  // Get detected browser for dynamic messaging
  const browserName = BrowserDetector.detect().displayName;

  // Localize text content
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const messageKey = el.dataset.i18n;
    const message = chrome.i18n.getMessage(messageKey, [browserName]);
    el.textContent = message;
  });

  // Localize placeholder attributes
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.placeholder = chrome.i18n.getMessage(el.dataset.i18nPlaceholder);
  });
}

/**
 * Initializes the options page UI by applying translations and setting up interactive elements
 * @returns {Promise<void>}
 */
async function initUi() {
  // First, apply all translations to the static HTML
  localizePage();

  // Then, set up the dynamic parts of the UI
  await setupLinuxPlatformSection();
  setupAddForm();
  setupSiteList();
}

/**
 * Sets up the Linux-specific platform section if user is on Linux
 * @returns {Promise<void>}
 */
async function setupLinuxPlatformSection() {
  if ((await getActualPlatform()) === "linux") {
    document.getElementById("linuxPlatformSection").style.display = "block";
    setupLinuxWindowsSpoofAddForm();
    setupLinuxWindowsSpoofSiteList();
  }
}

/**
 * Validates a hostname input
 * @param {string} input - The hostname to validate
 * @returns {boolean} True if valid hostname
 */
function tryValidateHostname(input) {
  const value = input.trim();
  for (const candidate of [value, `https://${value}`]) {
    if (URL.canParse(candidate)) {
      const { hostname } = new URL(candidate);
      if (hostname) return hostname;
    }
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

  if (linuxWindowsSpoofList.size < 1) {
    siteList.innerHTML = `<p class="empty-list-message">${chrome.i18n.getMessage("optionsLinuxSpoofEmpty")}</p>`;
    return;
  }

  linuxWindowsSpoofList
    .values()
    .sort((a, b) => a.localeCompare(b))
    .forEach((hostname) => {
      const siteListItem = document.createElement("div");
      siteListItem.classList.add("list-item");

      const hostnameLabel = document.createElement("p");
      const spoofDetail = document.createElement("span");
      spoofDetail.className = "hostname-details";
      spoofDetail.textContent = chrome.i18n.getMessage("optionsSpoofingAsWindows");
      hostnameLabel.append(`${hostname} `, spoofDetail);

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

  if (enabledHostnames.size < 1) {
    siteList.innerHTML = `<p class="empty-list-message">${chrome.i18n.getMessage("siteListEmpty")}</p>`;
    return;
  }

  enabledHostnames
    .values()
    .sort((a, b) => a.localeCompare(b))
    .forEach((hostname) => {
      const siteListItem = document.createElement("div");
      siteListItem.classList.add("list-item");

      const hostnameLabel = document.createElement("p");
      hostnameLabel.textContent = hostname;
      if (!hostname.startsWith("www.")) {
        const wwwNote = document.createElement("span");
        wwwNote.className = "hostname-details";
        wwwNote.textContent = chrome.i18n.getMessage("optionsIncludesWww");
        hostnameLabel.append(wwwNote);
      }

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

  // The service worker reacts to the same storage changes; this keeps the lists on screen in sync
  // with edits made here and from the popup.
  chrome.storage.onChanged.addListener(async (changes, area) => {
    if (area !== "local") return;
    if (changes.enabledHostnames) {
      await enabledHostnames.load();
      setupSiteList();
    }
    if (changes.linuxWindowsSpoofHostnames) {
      await linuxWindowsSpoofList.load();
      setupLinuxWindowsSpoofSiteList();
    }
  });
});
