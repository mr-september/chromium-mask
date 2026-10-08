// Page-world half of the JavaScript identity spoof. Registered by the service worker for enabled
// sites only, in the MAIN world at document_start so it runs before any page script.
//
// This world has no chrome.* APIs, so the profile to present arrives from content-bridge.js via a
// DOM event. Until it does, values are derived from the real browser (its UA minus the vendor
// token), which is already almost right. No hardcoded Chrome version lives here.
(() => {
  "use strict";

  const EVENT_READY = "chromium-mask:ready";
  const EVENT_PROFILE = "chromium-mask:profile";
  const PROFILE_WAIT_MS = 2000;

  // Globals that identify a specific Chromium browser. Only existing ones are touched.
  const BROWSER_GLOBALS = [
    "opera",
    "opr",
    "operaVersion",
    "operaBuild",
    "operaPrefs",
    "operaAPI",
    "operaTouchAPI",
    "operaMailAPI",
    "operaMediaAPI",
    "operaHistory",
    "operaExtension",
    "brave",
    "braveSolana",
    "braveWallet",
    "vivaldi",
    "vivaldiPrivate",
    "yandex",
    "yandexBrowser",
  ];

  const VENDOR_TOKEN = /\s(?:OPR|Opera|Edg|EdgA|Vivaldi|YaBrowser|Brave|Arc)\/\S+/g;
  const isGreaseBrand = (brand) => /^Not.?A.?Brand$/i.test(brand);

  /** Removes `name` from `target`, falling back to shadowing it with undefined. */
  function removeProperty(target, name) {
    if (!(name in target)) return;
    try {
      if (delete target[name]) return;
    } catch {
      // fall through to shadowing
    }
    try {
      Object.defineProperty(target, name, { get: () => undefined, set() {}, configurable: true });
    } catch {
      // Non-configurable and non-deletable: nothing more can be done.
    }
  }

  /** Replaces an accessor with one that reads from the live profile, keeping it configurable. */
  function defineGetter(target, name, read) {
    const existing = Object.getOwnPropertyDescriptor(target, name);
    if (existing && !existing.configurable) return;
    const getter = () => read();
    Object.defineProperty(getter, "name", { value: `get ${name}` });
    Object.defineProperty(target, name, { get: getter, enumerable: existing?.enumerable ?? true, configurable: true });
  }

  function defineMethod(target, name, fn) {
    const existing = Object.getOwnPropertyDescriptor(target, name);
    if (existing && !existing.configurable) return;
    Object.defineProperty(fn, "name", { value: name });
    Object.defineProperty(target, name, { value: fn, writable: true, enumerable: true, configurable: true });
  }

  for (const name of BROWSER_GLOBALS) {
    removeProperty(window, name);
    removeProperty(navigator, name);
    removeProperty(Navigator.prototype, name);
  }

  const realUAData = navigator.userAgentData;
  const realPlatform = navigator.platform;

  function deriveFallbackProfile() {
    const userAgent = navigator.userAgent.replace(VENDOR_TOKEN, "");
    const chromium = realUAData?.brands.find((b) => b.brand === "Chromium");
    const major = chromium?.version ?? /Chrome\/(\d+)/.exec(userAgent)?.[1] ?? "0";
    const brands = [
      ...(realUAData?.brands ?? []).filter((b) => b.brand === "Chromium" || isGreaseBrand(b.brand)),
      { brand: "Google Chrome", version: major },
    ];
    return {
      userAgent,
      appVersion: userAgent.slice("Mozilla/".length),
      vendor: "Google Inc.",
      navigatorPlatform: realPlatform,
      mobile: realUAData?.mobile ?? false,
      platform: realUAData?.platform ?? "Windows",
      brands,
      highEntropy: null,
    };
  }

  let profile = deriveFallbackProfile();
  let signalReady;
  const profileReady = new Promise((resolve) => {
    signalReady = resolve;
    setTimeout(resolve, PROFILE_WAIT_MS);
  });

  const clone = (value) => structuredClone(value);

  const navigatorProto = Navigator.prototype;
  defineGetter(navigatorProto, "userAgent", () => profile.userAgent);
  defineGetter(navigatorProto, "appVersion", () => profile.appVersion);
  defineGetter(navigatorProto, "vendor", () => profile.vendor);
  defineGetter(navigatorProto, "platform", () => profile.navigatorPlatform);

  if (typeof NavigatorUAData === "function") {
    const uaDataProto = NavigatorUAData.prototype;
    defineGetter(uaDataProto, "brands", () => clone(profile.brands));
    defineGetter(uaDataProto, "mobile", () => profile.mobile);
    defineGetter(uaDataProto, "platform", () => profile.platform);

    defineMethod(uaDataProto, "getHighEntropyValues", function getHighEntropyValues(hints) {
      if (!Array.isArray(hints)) {
        return Promise.reject(
          new TypeError(
            "Failed to execute 'getHighEntropyValues' on 'NavigatorUAData': The provided value cannot be converted to a sequence.",
          ),
        );
      }
      return profileReady.then(() => {
        const result = { brands: clone(profile.brands), mobile: profile.mobile, platform: profile.platform };
        for (const hint of hints) {
          if (profile.highEntropy && hint in profile.highEntropy) result[hint] = clone(profile.highEntropy[hint]);
        }
        return result;
      });
    });

    defineMethod(uaDataProto, "toJSON", function toJSON() {
      return { brands: clone(profile.brands), mobile: profile.mobile, platform: profile.platform };
    });
  }

  // Genuine Chrome always exposes window.chrome; some Chromium builds omit it on ordinary pages.
  if (!window.chrome) {
    const now = () => Date.now() / 1000;
    Object.defineProperty(window, "chrome", {
      value: {
        loadTimes: () => ({ requestTime: now(), startLoadTime: now(), commitLoadTime: now(), navigationType: "Other" }),
        csi: () => ({ onloadT: Date.now(), pageT: Date.now(), startE: Date.now(), tran: 15 }),
      },
      writable: true,
      configurable: true,
      enumerable: true,
    });
  }

  document.addEventListener(EVENT_PROFILE, (event) => {
    try {
      profile = JSON.parse(event.detail);
      signalReady();
    } catch (ex) {
      console.debug("Chromium Mask: ignoring malformed profile", ex);
    }
  });
  document.dispatchEvent(new CustomEvent(EVENT_READY));
})();
