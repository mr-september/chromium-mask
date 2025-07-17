const chromeUAStringManager = new ChromeUAStringManager();
const enabledHostnames = new EnabledHostnamesList();
let contentScriptHandle = null;

function matchPatternsForHostnames(hostnames) {
  return hostnames.map((n) => `*://${n}/*`);
}

async function contentScriptSetup() {
  const oldHostnames = new Set(enabledHostnames.get_values());

  await enabledHostnames.load();

  const hostsToAdd = new Set();
  const hostsToRemove = new Set(oldHostnames.keys());
  for (const hostname of enabledHostnames.get_values()) {
    if (oldHostnames.has(hostname)) {
      hostsToRemove.delete(hostname);
    } else {
      hostsToAdd.add(hostname);
    }
  }

  if (contentScriptHandle) {
    contentScriptHandle.unregister();
    contentScriptHandle = null;
  }

  if ([...enabledHostnames.get_values()].length > 0) {
    contentScriptHandle = await chrome.contentScripts.register({
      allFrames: true,
      js: [{ file: "content_script.js" }],
      matches: matchPatternsForHostnames([...enabledHostnames.get_values()]),
      runAt: "document_start",
    });
  }

  setupOnBeforeSendHeaders();

  const changedHostnames = [...hostsToAdd, ...hostsToRemove];
  const affectedTabs = await chrome.tabs.query({ url: matchPatternsForHostnames(changedHostnames), active: true });
  for (const tab of affectedTabs) {
    chrome.tabs.reload(tab.id, { bypassCache: true });
  }
}

function onBeforeSendHeadersHandler(details) {
  for (const header of details.requestHeaders) {
    if (header.name.toLowerCase() === "user-agent") {
      header.value = chromeUAStringManager.getUAString();
    }
  }

  return { requestHeaders: details.requestHeaders };
}

function setupOnBeforeSendHeaders() {
  if (chrome.webRequest.onBeforeSendHeaders.hasListener(onBeforeSendHeadersHandler)) {
    chrome.webRequest.onBeforeSendHeaders.removeListener(onBeforeSendHeadersHandler);
  }

  if ([...enabledHostnames.get_values()].length < 1) {
    return;
  }

  chrome.webRequest.onBeforeSendHeaders.addListener(
    onBeforeSendHeadersHandler,
    { urls: matchPatternsForHostnames([...enabledHostnames.get_values()]) },
    ["blocking", "requestHeaders"],
  );
}

function updateBadgeStatus(currentTab) {
  if (currentTab.id != chrome.tabs.TAB_ID_NONE) {
    const currentHostname = new URL(currentTab.url).hostname;
    const urls = [...enabledHostnames.get_values()];

    const isOn = urls.includes(currentHostname);
    chrome.browserAction.setIcon({
      tabId: currentTab.id,
      path: {
        16: `assets/badge-indicator-${isOn ? "on" : "off"}-16.png`,
        32: `assets/badge-indicator-${isOn ? "on" : "off"}-32.png`,
        48: `assets/badge-indicator-${isOn ? "on" : "off"}-48.png`,
        128: `assets/badge-indicator-${isOn ? "on" : "off"}-128.png`,
      },
    });
    chrome.browserAction.setTitle({
      tabId: currentTab.id,
      title: chrome.i18n.getMessage(`maskStatus${isOn ? "On" : "Off"}`),
    });
  }
}

async function init() {
  chrome.runtime.onMessage.addListener(async (msg) => {
    switch (msg.action) {
      case "enabled_hostnames_changed":
        await contentScriptSetup();
        break;
      default:
        throw new Error("unexpected message received", msg);
    }
  });

  chrome.tabs.onUpdated.addListener(async (tabId, _changeInfo, _tabInfo) => {
    const currentTab = await chrome.tabs.get(tabId);
    updateBadgeStatus(currentTab);
  });

  await chromeUAStringManager.init();
  await contentScriptSetup();
  setupOnBeforeSendHeaders();
}

init();
