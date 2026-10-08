importScripts("shared.js", "ua-profile.js");

// The worker keeps no state between wake-ups. Everything it applies (DNR rules, registered content
// scripts, the profile data read by content scripts) is derived from chrome.storage.local by
// reconcile(), which is idempotent and is re-run whenever an input changes.

const DEBUG = false;
const log = (...args) => DEBUG && console.log("[Chromium Mask]", ...args);
const logError = (...args) => console.error("[Chromium Mask]", ...args);

const VERSION_ALARM = "version-check";
const CONTENT_SCRIPT_IDS = { main: "chromium-mask-main", bridge: "chromium-mask-bridge" };
const RESOURCE_TYPES = [
  "main_frame",
  "sub_frame",
  "stylesheet",
  "script",
  "image",
  "font",
  "object",
  "xmlhttprequest",
  "ping",
  "csp_report",
  "media",
  "websocket",
  "other",
];
// Storage written by earlier releases that is no longer used.
const OBSOLETE_STORAGE_KEYS = ["spoofingData", "dnrStats", "dnrError", "detectedBrowser"];

// Serialises reconciliation so overlapping triggers cannot interleave their DNR/script updates.
let queue = Promise.resolve();
function enqueue(task) {
  const run = queue.then(task);
  queue = run.catch(() => {});
  return run;
}

/**
 * Every configured hostname also masks its "www." variant unless that is configured separately.
 * @param {string[]} hostnames
 * @returns {Map<string, string>} request hostname -> configured hostname that owns it
 */
function buildHostMap(hostnames) {
  const map = new Map(hostnames.map((h) => [h, h]));
  for (const host of hostnames) {
    if (!host.startsWith("www.") && !map.has(`www.${host}`)) {
      map.set(`www.${host}`, host);
    }
  }
  return map;
}

/** @param {string[]} hostnames */
function variantsOf(hostnames) {
  return [...buildHostMap(hostnames).keys()];
}

async function loadLists() {
  const enabled = new EnabledHostnamesList();
  const linux = new LinuxWindowsSpoofList();
  // Sequential on purpose: the first load of each list may run a storage migration that the
  // other depends on.
  await enabled.load();
  await linux.load();
  return { enabled, linux };
}

/**
 * Recomputes everything the extension applies from storage.
 * @returns {Promise<void>}
 */
async function reconcile() {
  const { enabled, linux } = await loadLists();
  const os = await getActualPlatform();
  const major = await ChromeVersion.getMajor();

  const profiles = {};
  const hostProfiles = {};
  for (const [hostname, owner] of buildHostMap(enabled.values())) {
    const key = resolvePlatformKey(os, linux.contains(owner));
    profiles[key] ??= createProfile(key, major);
    hostProfiles[hostname] = key;
  }

  // Content scripts read this, so write it before they can be injected anywhere new.
  await chrome.storage.local.set({ spoofingState: { profiles, hostProfiles, chromeMajor: major } });
  await syncDnrRules(profiles, hostProfiles);
  await syncContentScripts(Object.keys(hostProfiles));
  log(`Applied ${Object.keys(hostProfiles).length} hostnames at Chrome ${major}`);
}

async function syncDnrRules(profiles, hostProfiles) {
  const operations = {};
  for (const [key, profile] of Object.entries(profiles)) {
    operations[key] = createHeaderOperations(profile);
  }

  const addRules = Object.entries(hostProfiles).map(([hostname, key], index) => ({
    id: index + 1,
    priority: 1,
    action: { type: "modifyHeaders", requestHeaders: operations[key] },
    condition: { urlFilter: `*://${hostname}^`, resourceTypes: RESOURCE_TYPES },
  }));

  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existing.map((rule) => rule.id),
    addRules,
  });
}

async function syncContentScripts(hostnames) {
  const matches = hostnames.map((hostname) => `*://${hostname}/*`).sort();
  const registered = await chrome.scripting.getRegisteredContentScripts();

  const upToDate =
    registered.length === 2 &&
    registered.every((script) => {
      const current = [...script.matches].sort();
      return current.length === matches.length && current.every((m, i) => m === matches[i]);
    });
  if (upToDate && matches.length > 0) return;

  if (registered.length > 0) {
    await chrome.scripting.unregisterContentScripts({ ids: registered.map((script) => script.id) });
  }
  if (matches.length === 0) return;

  const common = { matches, runAt: "document_start", allFrames: true };
  await chrome.scripting.registerContentScripts([
    // Rewrites the page-visible browser identity; must live in the page's own JS world.
    { ...common, id: CONTENT_SCRIPT_IDS.main, js: ["content-main.js"], world: "MAIN" },
    // MAIN cannot reach chrome.storage, so this relays the stored profile into it.
    { ...common, id: CONTENT_SCRIPT_IDS.bridge, js: ["content-bridge.js"], world: "ISOLATED" },
  ]);
}

/**
 * Reloads open tabs of the given hostnames (and their www variants) so a change applies at once.
 * @param {string[]} hostnames
 */
async function reloadTabsFor(hostnames) {
  if (hostnames.length === 0) return;
  const tabs = await chrome.tabs.query({ url: variantsOf(hostnames).map((h) => `*://${h}/*`) });
  await Promise.all(
    tabs
      .filter((tab) => tab.id !== chrome.tabs.TAB_ID_NONE)
      .map((tab) => chrome.tabs.reload(tab.id, { bypassCache: true })),
  );
  log(`Reloaded ${tabs.length} tabs`);
}

const difference = (a, b) => a.filter((x) => !b.includes(x));

async function handleStorageChange(changes) {
  const enabledChange = changes.enabledHostnames;
  const linuxChange = changes.linuxWindowsSpoofHostnames;
  const enabledBefore = enabledChange?.oldValue ?? [];
  const enabledAfter = enabledChange?.newValue ?? [];

  await reconcile();

  // Newly enabled sites reload so masking takes effect immediately. Disabled sites are left alone.
  const toReload = difference(enabledAfter, enabledBefore);
  if (linuxChange) {
    const before = linuxChange.oldValue ?? [];
    const after = linuxChange.newValue ?? [];
    const current = enabledChange ? enabledAfter : (await loadLists()).enabled.values();
    const changed = [...difference(after, before), ...difference(before, after)];
    toReload.push(...changed.filter((host) => current.includes(host)));
  }
  await reloadTabsFor([...new Set(toReload)]);
  await refreshAllBadges();
}

async function updateBadge(tab, enabled) {
  if (!tab.url || tab.id === chrome.tabs.TAB_ID_NONE) return;

  let hostname;
  try {
    hostname = new URL(tab.url).hostname;
  } catch {
    return;
  }

  const state = enabled.covers(hostname) ? "on" : "off";
  const sizes = [16, 32, 48, 128];
  await chrome.action.setIcon({
    tabId: tab.id,
    path: Object.fromEntries(sizes.map((size) => [size, `assets/badge-indicator-${state}-${size}.png`])),
  });
  await chrome.action.setTitle({
    tabId: tab.id,
    title: chrome.i18n.getMessage(`maskStatus${state === "on" ? "On" : "Off"}`, [BrowserDetector.detect().displayName]),
  });
}

async function refreshBadges(tabs) {
  const { enabled } = await loadLists();
  // A tab can close between the query and the update, so failures here are expected and harmless.
  await Promise.allSettled(tabs.map((tab) => updateBadge(tab, enabled)));
}

const refreshAllBadges = async () => refreshBadges(await chrome.tabs.query({}));

async function initialize() {
  await chrome.storage.local.remove(OBSOLETE_STORAGE_KEYS);
  // Apply with the cached version first so a slow or offline network never delays masking.
  await reconcile();
  await refreshAllBadges();
  if (await ChromeVersion.refresh()) await reconcile();
  // Only create the alarm if missing; re-creating on every wake-up would keep postponing it.
  if (!(await chrome.alarms.get(VERSION_ALARM))) {
    await chrome.alarms.create(VERSION_ALARM, { periodInMinutes: 60 });
  }
}

chrome.runtime.onInstalled.addListener(() => enqueue(initialize).catch(logError));
chrome.runtime.onStartup.addListener(() => enqueue(initialize).catch(logError));

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== VERSION_ALARM) return;
  enqueue(async () => {
    // New requests pick up the new headers by themselves; open pages keep the old JS values until
    // their next navigation, which avoids reloading the user's tabs on every Chrome release.
    if (await ChromeVersion.refresh()) await reconcile();
  }).catch(logError);
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !(changes.enabledHostnames || changes.linuxWindowsSpoofHostnames)) return;
  enqueue(() => handleStorageChange(changes)).catch(logError);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url || changeInfo.status === "complete") refreshBadges([tab]).catch(logError);
});

chrome.tabs.onActivated.addListener(({ tabId }) => {
  chrome.tabs
    .get(tabId)
    .then((tab) => refreshBadges([tab]))
    .catch(logError);
});
