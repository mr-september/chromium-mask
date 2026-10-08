import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

const read = (file) => fs.readFileSync(new URL(`../src/${file}`, import.meta.url), "utf8");

const OPERA_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36 OPR/120.0.0.0";

/** A page whose navigator behaves like Opera's: vendor globals present, brands include "Opera". */
function createPage() {
  class NavigatorUAData {
    get brands() {
      return [
        { brand: "Opera", version: "120" },
        { brand: "Chromium", version: "157" },
        { brand: "Not)A;Brand", version: "8" },
      ];
    }
    get mobile() {
      return false;
    }
    get platform() {
      return "Windows";
    }
    getHighEntropyValues() {
      return Promise.resolve({});
    }
    toJSON() {
      return {};
    }
  }
  const uaData = new NavigatorUAData();
  class Navigator {
    get userAgent() {
      return OPERA_UA;
    }
    get appVersion() {
      return OPERA_UA.slice("Mozilla/".length);
    }
    get vendor() {
      return "Google Inc.";
    }
    get platform() {
      return "Win32";
    }
    get brave() {
      return {};
    }
  }
  Object.defineProperty(Navigator.prototype, "userAgentData", { get: () => uaData, configurable: true });

  const page = {
    Navigator,
    NavigatorUAData,
    navigator: new Navigator(),
    document: new EventTarget(),
    opr: {},
    opera: {},
    structuredClone,
    setTimeout,
    CustomEvent,
    console,
  };
  page.window = page;
  return vm.createContext(page);
}

const evaluate = (page, code) => vm.runInContext(code, page);

const macProfile = {
  userAgent: "MAC-UA",
  appVersion: "5.0 mac",
  vendor: "Google Inc.",
  navigatorPlatform: "MacIntel",
  mobile: false,
  platform: "macOS",
  brands: [{ brand: "Google Chrome", version: "155" }],
  highEntropy: { architecture: "arm", platformVersion: "14.0.0" },
};

function runBridge(page, state, hostname = "example.com") {
  const context = vm.createContext({
    document: page.document,
    location: { hostname },
    CustomEvent,
    console,
    chrome: { storage: { local: { get: async () => ({ spoofingState: state }) } } },
  });
  vm.runInContext(read("content-bridge.js"), context);
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

test("before a profile arrives, values are derived from the real browser", () => {
  const page = createPage();
  vm.runInContext(read("content-main.js"), page);

  assert.equal(evaluate(page, "navigator.userAgent"), OPERA_UA.replace(" OPR/120.0.0.0", ""));
  assert.equal(
    evaluate(page, "navigator.userAgentData.brands.map((b) => b.brand).join()"),
    "Chromium,Not)A;Brand,Google Chrome",
  );
});

test("vendor-specific globals are removed", () => {
  const page = createPage();
  vm.runInContext(read("content-main.js"), page);
  assert.equal(evaluate(page, "'opr' in window || 'opera' in window"), false);
  assert.equal(evaluate(page, "'brave' in navigator"), false);
});

test("the bridge delivers the stored profile for the page's hostname", async () => {
  const page = createPage();
  vm.runInContext(read("content-main.js"), page);
  runBridge(page, { hostProfiles: { "example.com": "mac" }, profiles: { mac: macProfile } });
  await settle();

  assert.equal(evaluate(page, "navigator.userAgent"), "MAC-UA");
  assert.equal(evaluate(page, "navigator.platform"), "MacIntel");
  assert.equal(evaluate(page, "navigator.userAgentData.platform"), "macOS");

  const values = await evaluate(page, "navigator.userAgentData.getHighEntropyValues(['architecture', 'bogus'])");
  assert.equal(values.architecture, "arm");
  assert.equal(values.platform, "macOS");
  assert.equal("bogus" in values, false);
});

test("the exchange works when the bridge runs before the main script", async () => {
  const page = createPage();
  runBridge(page, { hostProfiles: { "example.com": "mac" }, profiles: { mac: macProfile } });
  await settle();
  vm.runInContext(read("content-main.js"), page);
  await settle();
  assert.equal(evaluate(page, "navigator.userAgent"), "MAC-UA");
});

test("the bridge stays silent for hostnames without a profile", async () => {
  const page = createPage();
  vm.runInContext(read("content-main.js"), page);
  runBridge(page, { hostProfiles: {}, profiles: {} }, "other.example");
  await settle();
  assert.notEqual(evaluate(page, "navigator.userAgent"), "MAC-UA");
});

test("getHighEntropyValues rejects non-sequences like the native method", async () => {
  const page = createPage();
  vm.runInContext(read("content-main.js"), page);
  await assert.rejects(evaluate(page, "navigator.userAgentData.getHighEntropyValues('x')"), { name: "TypeError" });
});
