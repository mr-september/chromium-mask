const enabledHostnames = new EnabledHostnamesList();

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
  const maxRetries = 5;
  let retryCount = 0;
  let response = null;

  while (retryCount < maxRetries && !response) {
    try {
      console.log(`Attempting to get platform info (attempt ${retryCount + 1}/${maxRetries})`);
      response = await chrome.runtime.sendMessage({ action: "get_platform_info" });
      console.log("Received platform info response:", response);

      if (response && response.success) {
        break;
      } else {
        console.warn(`Failed to get platform info (attempt ${retryCount + 1}/${maxRetries}) - response:`, response);
        retryCount++;
        if (retryCount < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 200 * retryCount)); // Exponential backoff
        }
        response = null;
      }
    } catch (error) {
      console.error(`Failed to get platform info (attempt ${retryCount + 1}/${maxRetries}):`, error);
      retryCount++;
      if (retryCount < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 200 * retryCount)); // Exponential backoff
      }
      response = null;
    }
  }

  if (!response || !response.success) {
    console.error("Failed to get platform info after all retries - Linux platform section will not be available");
    return;
  }

  try {
    if (response.data.actualPlatform === "linux") {
      const linuxSection = document.getElementById("linuxPlatformSection");
      linuxSection.style.display = "block";

      // Update text content with localized strings
      document.getElementById("linuxPlatformTitle").innerText = chrome.i18n.getMessage("linuxPlatformTitle");
      document.getElementById("linuxSpoofOptionText").innerText = chrome.i18n.getMessage("linuxSpoofToggle");
      document.getElementById("linuxSpoofOptionDescription").innerText =
        chrome.i18n.getMessage("linuxSpoofToggleDescription");
      document.getElementById("linuxSpoofOptionNote").innerHTML =
        `<strong>Note:</strong> ${chrome.i18n.getMessage("linuxSpoofOptionNote")}`;

      // Set checkbox state
      const linuxCheckbox = document.getElementById("linuxSpoofOption");
      linuxCheckbox.checked = response.data.linuxSpoofAsWindows;

      // Add event listener for checkbox changes
      linuxCheckbox.addEventListener("change", async (ev) => {
        try {
          const updateResponse = await chrome.runtime.sendMessage({
            action: "set_linux_spoof",
            enabled: ev.target.checked,
          });

          if (!updateResponse || !updateResponse.success) {
            console.error("Failed to update Linux spoof setting - response:", updateResponse);
            // Revert the checkbox state
            ev.target.checked = !ev.target.checked;
          }
        } catch (error) {
          console.error("Error updating Linux spoof setting:", error);
          // Revert the checkbox state
          ev.target.checked = !ev.target.checked;
        }
      });
    } else {
      // This is expected behavior on non-Linux platforms
      console.log(`Platform is ${response.data.actualPlatform}, Linux platform section not needed`);
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
  await initUi();

  chrome.runtime.onMessage.addListener(async (msg) => {
    switch (msg.action) {
      case "enabled_hostnames_changed":
        window.location.reload();
        break;
      default:
        throw new Error("unexpected message received", msg);
    }
  });
});
