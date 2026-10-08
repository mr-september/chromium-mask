import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import { fakeStorage } from "./helpers.js";

const read = (file) => fs.readFileSync(new URL(`../src/${file}`, import.meta.url), "utf8");
const OPERA_UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36 OPR/120.0.0.0";

/** Boots the real service worker against recording stubs of the chrome.* APIs it uses. */
function bootServiceWorker(initialStorage, os = "linux") {
  const storage = fakeStorage({ storageVersion: 3, ...initialStorage });
  const listeners = {};
  const event = (name) => ({ addListener: (fn) => (listeners[name] = fn) });
  const calls = { dnr: null, registered: [], reloaded: [], unregistered: [] };
  let registeredScripts = [];

  const chrome = {
    runtime: { onInstalled: event("installed"), onStartup: event("startup"), getPlatformInfo: async () => ({ os }) },
    storage: { local: storage, sync: { get: async () => ({}) }, onChanged: event("storageChanged") },
    alarms: { onAlarm: event("alarm"), get: async () => undefined, create: async () => {} },
    tabs: {
      TAB_ID_NONE: -1,
      onUpdated: event("tabUpdated"),
      onActivated: event("tabActivated"),
      query: async ({ url } = {}) => (url ? [{ id: 7, url: "https://example.com/" }] : []),
      reload: async (id) => void calls.reloaded.push(id),
      get: async () => ({}),
    },
    action: { setIcon: async () => {}, setTitle: async () => {} },
    i18n: { getMessage: (key) => key },
    declarativeNetRequest: {
      getDynamicRules: async () => [{ id: 1000 }],
      updateDynamicRules: async (update) => void (calls.dnr = update),
    },
    scripting: {
      getRegisteredContentScripts: async () => registeredScripts,
      unregisterContentScripts: async ({ ids }) => {
        calls.unregistered.push(ids);
        registeredScripts = registeredScripts.filter((s) => !ids.includes(s.id));
      },
      registerContentScripts: async (scripts) => {
        calls.registered.push(scripts);
        registeredScripts = scripts;
      },
    },
  };

  const context = vm.createContext({
    chrome,
    console,
    fetch: async () => ({ ok: false, status: 500 }),
    AbortSignal,
    URL,
    self: { navigator: { userAgent: OPERA_UA } },
    importScripts: (...files) => files.forEach((file) => vm.runInContext(read(file), context)),
  });
  vm.runInContext(read("service-worker.js"), context);
  return { storage, listeners, calls };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 50));

test("startup applies one rule per hostname, www variant included, with the per-site platform", async () => {
  const { storage, listeners, calls } = bootServiceWorker({
    enabledHostnames: ["example.com", "legacy.test"],
    linuxWindowsSpoofHostnames: ["example.com"],
  });
  listeners.startup();
  await settle();

  const rules = calls.dnr.addRules;
  const byFilter = Object.fromEntries(
    rules.map((rule) => [
      rule.condition.urlFilter,
      rule.action.requestHeaders.find((h) => h.header === "User-Agent").value,
    ]),
  );

  assert.deepEqual(Object.keys(byFilter).sort(), [
    "*://example.com^",
    "*://legacy.test^",
    "*://www.example.com^",
    "*://www.legacy.test^",
  ]);
  // The www variant inherits the platform choice of the hostname that owns it.
  assert.match(byFilter["*://www.example.com^"], /Windows NT 10\.0/);
  assert.match(byFilter["*://legacy.test^"], /X11; Linux/);
  assert.deepEqual(calls.dnr.removeRuleIds, [1000]);
  assert.equal(new Set(rules.map((r) => r.id)).size, rules.length);

  const state = storage.data.spoofingState;
  assert.equal(state.hostProfiles["www.example.com"], "win");
  assert.equal(state.hostProfiles["legacy.test"], "linux");
  assert.equal(state.chromeMajor, 155);

  const [main, bridge] = calls.registered[0];
  assert.equal(main.world, "MAIN");
  assert.equal(bridge.world, "ISOLATED");
  assert.equal(main.matches.length, 4);
});

test("an explicitly configured www entry is not duplicated by the implicit variant", async () => {
  const { calls, listeners } = bootServiceWorker({ enabledHostnames: ["example.com", "www.example.com"] });
  listeners.startup();
  await settle();
  assert.equal(calls.dnr.addRules.length, 2);
});

test("enabling a site reloads its open tabs; content scripts are only re-registered on change", async () => {
  const { listeners, calls, storage } = bootServiceWorker({ enabledHostnames: ["example.com"] });
  listeners.startup();
  await settle();
  assert.equal(calls.registered.length, 1);

  // Same hostnames again: nothing to re-register.
  listeners.storageChanged({ linuxWindowsSpoofHostnames: { oldValue: [], newValue: [] } }, "local");
  await settle();
  assert.equal(calls.registered.length, 1);

  storage.data.enabledHostnames = ["example.com", "new.test"];
  listeners.storageChanged(
    { enabledHostnames: { oldValue: ["example.com"], newValue: ["example.com", "new.test"] } },
    "local",
  );
  await settle();
  assert.equal(calls.registered.length, 2);
  assert.deepEqual(calls.reloaded, [7]);
});

test("disabling every site removes rules and scripts without reloading anything", async () => {
  const { listeners, calls, storage } = bootServiceWorker({ enabledHostnames: ["example.com"] });
  listeners.startup();
  await settle();

  storage.data.enabledHostnames = [];
  listeners.storageChanged({ enabledHostnames: { oldValue: ["example.com"], newValue: [] } }, "local");
  await settle();

  assert.equal(calls.dnr.addRules.length, 0);
  assert.equal(calls.unregistered.length, 1);
  assert.deepEqual(calls.reloaded, []);
});
