// Chrome identity construction. Loaded by the service worker only.
//
// Everything the extension presents to a site (User-Agent, client hints, navigator.*) is derived
// from one "profile" object built here, so the HTTP headers and the JavaScript-visible values can
// never drift apart.

const REMOTE_VERSION_URL =
  "https://raw.githubusercontent.com/mr-september/central_automation_hub/main/current-chrome-version.txt";
const VERSION_STORAGE_KEY = "remoteStorageVersionNumber";
const VERSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const VERSION_RETRY_MS = 60 * 60 * 1000;
const FALLBACK_CHROME_MAJOR = 155;

const PLATFORMS = {
  win: {
    uaToken: "Windows NT 10.0; Win64; x64",
    navigatorPlatform: "Win32",
    name: "Windows",
    version: "15.0.0",
    architecture: "x86",
    bitness: "64",
    mobile: false,
  },
  mac: {
    uaToken: "Macintosh; Intel Mac OS X 10_15_7",
    navigatorPlatform: "MacIntel",
    name: "macOS",
    version: "14.0.0",
    architecture: "arm",
    bitness: "64",
    mobile: false,
  },
  linux: {
    uaToken: "X11; Linux x86_64",
    navigatorPlatform: "Linux x86_64",
    name: "Linux",
    version: "5.15.0",
    architecture: "x86",
    bitness: "64",
    mobile: false,
  },
  android: {
    uaToken: "Linux; Android 10; K",
    navigatorPlatform: "Linux armv81",
    name: "Android",
    version: "10.0.0",
    architecture: "",
    bitness: "",
    mobile: true,
  },
};

/**
 * Maps chrome.runtime.PlatformOs (plus the per-site Linux override) to a PLATFORMS key.
 * @param {string} os - chrome.runtime.PlatformOs value
 * @param {boolean} linuxAsWindows - whether this site is configured to present Linux as Windows
 * @returns {"win"|"mac"|"linux"|"android"}
 */
function resolvePlatformKey(os, linuxAsWindows) {
  if (os === "linux") return linuxAsWindows ? "win" : "linux";
  if (os === "mac" || os === "android") return os;
  return "win";
}

// Chrome derives its "GREASE" brand from the major version. Reproducing the algorithm keeps the
// brand list identical to what a real Chrome of that version sends.
const GREASE_CHARS = [" ", "(", ":", "-", ".", "/", ")", ";", "=", "?", "_"];
const GREASE_VERSIONS = ["8", "99", "24"];
const BRAND_ORDERS = [
  [0, 1, 2],
  [0, 2, 1],
  [1, 0, 2],
  [1, 2, 0],
  [2, 0, 1],
  [2, 1, 0],
];

/**
 * @param {number} major - Chrome major version
 * @param {boolean} full - emit full-version-list style versions ("155.0.0.0") instead of majors
 * @returns {{brand: string, version: string}[]}
 */
function buildBrands(major, full) {
  const grease = `Not${GREASE_CHARS[major % 11]}A${GREASE_CHARS[(major + 1) % 11]}Brand`;
  const entries = [
    [grease, GREASE_VERSIONS[major % 3]],
    ["Chromium", String(major)],
    ["Google Chrome", String(major)],
  ];
  const order = BRAND_ORDERS[major % 6];
  const brands = [];
  entries.forEach(([brand, version], i) => {
    brands[order[i]] = { brand, version: full ? `${version}.0.0.0` : version };
  });
  return brands;
}

/**
 * Builds the complete, JSON-serialisable identity for one platform and Chrome major version.
 * @param {"win"|"mac"|"linux"|"android"} platformKey
 * @param {number} major
 */
function createProfile(platformKey, major) {
  const p = PLATFORMS[platformKey];
  const fullVersion = `${major}.0.0.0`;
  const userAgent = `Mozilla/5.0 (${p.uaToken}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${fullVersion}${
    p.mobile ? " Mobile" : ""
  } Safari/537.36`;

  return {
    userAgent,
    appVersion: userAgent.slice("Mozilla/".length),
    vendor: "Google Inc.",
    navigatorPlatform: p.navigatorPlatform,
    mobile: p.mobile,
    platform: p.name,
    brands: buildBrands(major, false),
    highEntropy: {
      architecture: p.architecture,
      bitness: p.bitness,
      formFactors: [p.mobile ? "Mobile" : "Desktop"],
      fullVersionList: buildBrands(major, true),
      model: p.mobile ? "K" : "",
      platformVersion: p.version,
      uaFullVersion: fullVersion,
      wow64: false,
    },
  };
}

const formatBrandList = (brands) => brands.map((b) => `"${b.brand}";v="${b.version}"`).join(", ");
const quoted = (value) => `"${value}"`;
const boolHeader = (value) => (value ? "?1" : "?0");

/**
 * DNR requestHeaders operations that make the network-level identity match the profile.
 * @param {ReturnType<typeof createProfile>} profile
 */
function createHeaderOperations(profile) {
  const he = profile.highEntropy;
  const set = (header, value) => ({ header, operation: "set", value });
  return [
    set("User-Agent", profile.userAgent),
    set("sec-ch-ua", formatBrandList(profile.brands)),
    set("sec-ch-ua-mobile", boolHeader(profile.mobile)),
    set("sec-ch-ua-platform", quoted(profile.platform)),
    set("sec-ch-ua-platform-version", quoted(he.platformVersion)),
    set("sec-ch-ua-model", quoted(he.model)),
    set("sec-ch-ua-full-version-list", formatBrandList(he.fullVersionList)),
    set("sec-ch-ua-arch", quoted(he.architecture)),
    set("sec-ch-ua-bitness", quoted(he.bitness)),
    set("sec-ch-ua-wow64", boolHeader(he.wow64)),
    // Opera Mini request headers that would otherwise identify the browser
    { header: "x-opera-mini-mode", operation: "remove" },
    { header: "x-opera-info", operation: "remove" },
    { header: "x-forwarded-for-opera-mini", operation: "remove" },
  ];
}

/**
 * Tracks the current stable Chrome major version, published daily by the central automation hub.
 * Storage layout (kept stable across releases): { version, updatedAt, attemptedAt }.
 */
const ChromeVersion = {
  /** Major version of the Chromium engine this browser actually runs, or 0 if unknown. */
  ownMajor() {
    const match = /Chrome\/(\d+)/.exec(self.navigator.userAgent);
    return match ? Number(match[1]) : 0;
  },

  /**
   * Best known Chrome major. Never reports a version older than the host engine's own, since a
   * "Chrome 150" claim from a Chromium 155 engine is inconsistent with its feature set.
   * @returns {Promise<number>}
   */
  async getMajor() {
    const stored = (await chrome.storage.local.get(VERSION_STORAGE_KEY))[VERSION_STORAGE_KEY];
    const remote = Number(stored?.version);
    const candidates = [this.ownMajor(), Number.isInteger(remote) ? remote : 0];
    return Math.max(...candidates) || FALLBACK_CHROME_MAJOR;
  },

  /**
   * Fetches the published version if the cached one is stale.
   * @returns {Promise<boolean>} true if the stored major version changed
   */
  async refresh() {
    const stored = (await chrome.storage.local.get(VERSION_STORAGE_KEY))[VERSION_STORAGE_KEY];
    const now = Date.now();
    if (stored?.updatedAt > now - VERSION_MAX_AGE_MS || stored?.attemptedAt > now - VERSION_RETRY_MS) {
      return false;
    }

    // Record the attempt first so a failing endpoint is not hammered on every wake-up.
    await chrome.storage.local.set({ [VERSION_STORAGE_KEY]: { ...stored, attemptedAt: now } });

    try {
      const response = await fetch(REMOTE_VERSION_URL, { cache: "no-cache", signal: AbortSignal.timeout(10000) });
      if (!response.ok) {
        console.error("Chrome version fetch failed with status", response.status);
        return false;
      }

      const version = (await response.text()).trim();
      if (!/^\d{2,3}$/.test(version)) {
        console.error("Ignoring malformed Chrome version from remote:", version.slice(0, 32));
        return false;
      }

      await chrome.storage.local.set({ [VERSION_STORAGE_KEY]: { version, updatedAt: now, attemptedAt: now } });
      return version !== stored?.version;
    } catch (ex) {
      console.error("Chrome version fetch failed:", ex);
      return false;
    }
  },
};
