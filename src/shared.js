// Code shared by the service worker, popup and options page.
// Each context keeps no authoritative state of its own: chrome.storage.local is the single source
// of truth, and every mutation re-reads it first so concurrent contexts cannot overwrite each other.

/**
 * A persisted set of hostnames. Subclasses supply the storage key and an optional one-off
 * migration that runs when the key has never been written.
 */
class HostnameList {
  #storageKey;
  #set = new Set();

  /** @param {string} storageKey - chrome.storage.local key holding the hostname array */
  constructor(storageKey) {
    this.#storageKey = storageKey;
  }

  /**
   * Hook for subclasses: produce the initial list when nothing has been stored yet.
   * @returns {Promise<string[]|undefined>}
   */
  async migrate() {
    return undefined;
  }

  /** Replaces the in-memory set with the stored one. */
  async load() {
    let stored = (await chrome.storage.local.get(this.#storageKey))[this.#storageKey];
    if (!Array.isArray(stored)) {
      stored = await this.migrate();
    }
    this.#set = new Set(stored ?? []);
  }

  async #persist() {
    await chrome.storage.local.set({ [this.#storageKey]: [...this.#set] });
  }

  /** @param {string} hostname */
  async add(hostname) {
    await this.load();
    this.#set.add(hostname);
    await this.#persist();
  }

  /** @param {string} hostname */
  async remove(hostname) {
    await this.load();
    this.#set.delete(hostname);
    await this.#persist();
  }

  /** @param {string} hostname */
  contains(hostname) {
    return this.#set.has(hostname);
  }

  /** @returns {string[]} */
  values() {
    return [...this.#set];
  }

  get size() {
    return this.#set.size;
  }
}

/** Hostnames where Chrome masking is enabled. */
class EnabledHostnamesList extends HostnameList {
  constructor() {
    super("enabledHostnames");
  }

  /**
   * Returns the configured entry that masks `hostname`: the hostname itself, or its parent when
   * `hostname` is the implicit "www." variant that every entry also covers.
   * @param {string} hostname
   * @returns {string|undefined}
   */
  resolve(hostname) {
    if (this.contains(hostname)) return hostname;
    if (hostname.startsWith("www.") && this.contains(hostname.slice(4))) return hostname.slice(4);
    return undefined;
  }

  /** @param {string} hostname */
  covers(hostname) {
    return this.resolve(hostname) !== undefined;
  }

  // Version 3 of the extension moved from sync to local storage: the set of sites that need a
  // Chrome spoof differs per device, so syncing it made no sense. Carry old data across once.
  async migrate() {
    const { storageVersion } = await chrome.storage.local.get("storageVersion");
    if (storageVersion >= 3) return undefined;

    const syncStorage = await chrome.storage.sync.get();
    if (Object.keys(syncStorage).length > 0) {
      console.info("migrating old sync storage to local");
      await chrome.storage.local.set(syncStorage);
      await chrome.storage.sync.clear();
    }
    await chrome.storage.local.set({ storageVersion: 3 });
    return syncStorage.enabledHostnames;
  }
}

/** Hostnames where a Linux user should be presented as Windows. */
class LinuxWindowsSpoofList extends HostnameList {
  constructor() {
    super("linuxWindowsSpoofHostnames");
  }

  // Older releases had one global "linuxSpoofAsWindows" switch. Convert it once into a per-site
  // list covering every site that was enabled at the time.
  async migrate() {
    const state = await chrome.storage.local.get(["storageVersion", "linuxWindowsSpoofMigrated"]);
    if (!(state.storageVersion >= 3) || state.linuxWindowsSpoofMigrated) return undefined;

    await chrome.storage.local.set({ linuxWindowsSpoofMigrated: true });
    const legacy = await chrome.storage.local.get(["linuxSpoofAsWindows", "enabledHostnames"]);
    if (legacy.linuxSpoofAsWindows === true && Array.isArray(legacy.enabledHostnames)) {
      await chrome.storage.local.set({ linuxWindowsSpoofHostnames: legacy.enabledHostnames });
      console.info("Migrated global Linux Windows spoofing to per-site for all enabled hostnames");
      return legacy.enabledHostnames;
    }
    return undefined;
  }
}

/**
 * The OS the browser really runs on, as reported by chrome.runtime.PlatformOs.
 * @returns {Promise<string>}
 */
async function getActualPlatform() {
  return (await chrome.runtime.getPlatformInfo()).os;
}

/** Identifies which Chromium browser is running, from its real (unspoofed) user agent. */
class BrowserDetector {
  static #info = null;

  // Order matters: most specific first, because every Chromium UA also contains "Chrome/".
  static #RULES = [
    { slug: "opera", displayName: "Opera", pattern: /(?:OPR|Opera)\/([\d.]+)/ },
    { slug: "brave", displayName: "Brave", pattern: /Brave\/([\d.]+)/ },
    { slug: "edge", displayName: "Microsoft Edge", pattern: /Edg\/([\d.]+)/ },
    { slug: "vivaldi", displayName: "Vivaldi", pattern: /Vivaldi\/([\d.]+)/ },
    { slug: "arc", displayName: "Arc", pattern: /Arc\/([\d.]+)/ },
    { slug: "yandex", displayName: "Yandex Browser", pattern: /YaBrowser\/([\d.]+)/ },
    { slug: "chrome", displayName: "Google Chrome", pattern: /Chrome\/([\d.]+)/ },
    { slug: "chromium", displayName: "Chromium Browser", pattern: /Chromium\/([\d.]+)/ },
  ];

  static #ICONS = {
    opera: "toggler-icon-opera.png",
    brave: "toggler-icon-brave.png",
    edge: "toggler-icon-edge.png",
    vivaldi: "toggler-icon-vivaldi.png",
    chrome: "toggler-icon-chrome.png",
  };

  /**
   * @returns {{slug: string, displayName: string, version: string}}
   */
  static detect() {
    if (this.#info) return this.#info;

    const nav = self.navigator;
    const ua = nav.userAgent;
    let rule = this.#RULES.find((r) => r.pattern.test(ua));
    // Brave deliberately omits its name from the UA, but exposes navigator.brave.
    if (nav.brave !== undefined && rule?.slug !== "brave") {
      rule = this.#RULES.find((r) => r.slug === "brave");
    }
    rule ??= this.#RULES[this.#RULES.length - 1];

    let displayName = rule.displayName;
    if (rule.slug === "opera" && ua.includes("GX")) displayName = "Opera GX";

    this.#info = { slug: rule.slug, displayName, version: ua.match(rule.pattern)?.[1] ?? "unknown" };
    return this.#info;
  }

  /**
   * @param {string} slug
   * @returns {string} icon filename inside assets/
   */
  static iconFor(slug) {
    return this.#ICONS[slug] ?? "toggler-icon-chromium.png";
  }
}
