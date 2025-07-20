class EnabledHostnamesList {
  #set = new Set();

  async load() {
    const storage = await chrome.storage.local.get(["enabledHostnames", "storageVersion"]);
    if (storage?.enabledHostnames) {
      this.#set = new Set(storage.enabledHostnames);
      return;
    }

    // In V3, this addon switched from sync to local storage. Even if sync storage worked,
    // it would make no sense. The set of sites that need a Chrome spoof on Mobile is very
    // different from the set of sites on Desktop. This code migrates the old sync storage data.

    if (storage?.storageVersion >= 3) {
      return;
    }

    const syncStorage = await chrome.storage.sync.get();
    if (Object.keys(syncStorage).length > 0) {
      console.info("migrating old sync storage to local");

      await chrome.storage.local.set(syncStorage);
      await chrome.storage.sync.clear();

      if (syncStorage.enabledHostnames) {
        this.#set = new Set(syncStorage.enabledHostnames);
      }
    }

    await chrome.storage.local.set({ storageVersion: 3 });
  }

  async #persist() {
    const enabledHostnames = Array.from(this.#set.values());
    await chrome.storage.local.set({ enabledHostnames });

    try {
      await chrome.runtime.sendMessage({ action: "enabled_hostnames_changed" });
    } catch (ex) {
      console.error("Failed to send enabled_hostnames_changed message:", ex);
    }
  }

  async add(hostname) {
    this.#set.add(hostname);
    await this.#persist();
  }

  async remove(hostname) {
    this.#set.delete(hostname);
    await this.#persist();
  }

  contains(hostname) {
    return this.#set.has(hostname);
  }

  get_values() {
    return this.#set.values();
  }

  size() {
    return this.#set.size;
  }
}

// Linux Windows spoofing hostnames list - similar to EnabledHostnamesList but for platform-specific control
class LinuxWindowsSpoofList {
  #set = new Set();

  async load() {
    const storage = await chrome.storage.local.get(["linuxWindowsSpoofHostnames", "storageVersion"]);
    if (storage?.linuxWindowsSpoofHostnames) {
      this.#set = new Set(storage.linuxWindowsSpoofHostnames);
      return;
    }

    // Migration: if user had global linuxSpoofAsWindows enabled, migrate to per-site for all currently enabled sites
    if (storage?.storageVersion >= 3) {
      const globalSetting = await chrome.storage.local.get("linuxSpoofAsWindows");
      if (globalSetting?.linuxSpoofAsWindows === true) {
        // Get currently enabled hostnames and add them to Linux Windows spoof list
        const enabledStorage = await chrome.storage.local.get("enabledHostnames");
        if (enabledStorage?.enabledHostnames) {
          this.#set = new Set(enabledStorage.enabledHostnames);
          await this.#persist();
          console.info("Migrated global Linux Windows spoofing to per-site for all enabled hostnames");
        }
      }
      return;
    }

    await chrome.storage.local.set({ storageVersion: 3 });
  }

  async #persist() {
    const linuxWindowsSpoofHostnames = Array.from(this.#set.values());
    await chrome.storage.local.set({ linuxWindowsSpoofHostnames });

    try {
      await chrome.runtime.sendMessage({ action: "linux_windows_spoof_hostnames_changed" });
    } catch (ex) {
      console.error("Failed to send linux_windows_spoof_hostnames_changed message:", ex);
    }
  }

  async add(hostname) {
    this.#set.add(hostname);
    await this.#persist();
  }

  async remove(hostname) {
    this.#set.delete(hostname);
    await this.#persist();
  }

  contains(hostname) {
    return this.#set.has(hostname);
  }

  get_values() {
    return this.#set.values();
  }

  size() {
    return this.#set.size;
  }
}

// Unified platform info helper to reduce code duplication
class PlatformInfoHelper {
  static async getPlatformInfoWithRetry(maxRetries = 5) {
    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        console.log(`Attempting to get platform info (attempt ${retryCount + 1}/${maxRetries})`);

        const response = await Promise.race([
          chrome.runtime.sendMessage({ action: "get_platform_info" }),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 5000)),
        ]);

        console.log("Received platform info response:", response);

        if (response && response.success) {
          console.log("Successfully got platform info:", response.data);
          return response.data;
        } else {
          console.warn(`Failed to get platform info (attempt ${retryCount + 1}/${maxRetries}) - response:`, response);
        }
      } catch (error) {
        console.error(`Failed to get platform info (attempt ${retryCount + 1}/${maxRetries}):`, error);
      }

      retryCount++;
      if (retryCount < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 200 * retryCount)); // Exponential backoff
      }
    }

    // Fallback logic
    console.warn("Using fallback platform info after all retries failed");
    try {
      const fallbackPlatformInfo = await chrome.runtime.getPlatformInfo();
      return {
        actualPlatform: fallbackPlatformInfo.os,
        linuxSpoofAsWindows: true,
        platformInfo: fallbackPlatformInfo,
      };
    } catch (fallbackError) {
      console.error("Failed to get fallback platform info:", fallbackError);
      return {
        actualPlatform: "unknown",
        linuxSpoofAsWindows: true,
        platformInfo: null,
      };
    }
  }
}

// Unified toggle helper to reduce code duplication between different toggle types
class ToggleHelper {
  static async handleToggleChange(checkboxElement, action, actionData, options = {}) {
    const originalState = checkboxElement.checked;
    const toggleName = options.toggleName || "setting";

    try {
      console.log(`${toggleName} toggle changed to:`, originalState);

      const response = await chrome.runtime.sendMessage({
        action: action,
        ...actionData,
      });

      if (!response || !response.success) {
        console.error(`Failed to update ${toggleName} setting - response:`, response);
        // Revert the checkbox state
        checkboxElement.checked = !originalState;
        return false;
      }

      console.log(`${toggleName} setting updated successfully`);

      // Call optional post-success callback (e.g., refreshing UI state)
      if (options.onSuccess) {
        await options.onSuccess();
      }

      return true;
    } catch (error) {
      console.error(`Error updating ${toggleName} setting:`, error);
      // Revert the checkbox state
      checkboxElement.checked = !originalState;
      return false;
    }
  }
}

class ChromeUAStringManager {
  // Your public repo with the Chrome version file
  #remoteUrl = "https://raw.githubusercontent.com/mr-september/central_automation_hub/main/current-chrome-version.txt";

  // This are just fallbacks in the case we somehow have to make a request before everything is loaded.
  #currentPlatform = "win";
  #currentUAString = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36`;
  #currentChromeVersion = "134";
  #linuxSpoofAsWindows = true;

  async init() {
    const platformInfo = await chrome.runtime.getPlatformInfo();
    this.#currentPlatform = platformInfo.os;

    // Load Linux spoofing preference
    const storage = await chrome.storage.local.get("linuxSpoofAsWindows");
    this.#linuxSpoofAsWindows = storage.linuxSpoofAsWindows !== false; // Default to true

    await this.buildUAStringFromStorage();

    // Set up periodic refresh using chrome.alarms instead of setInterval
    chrome.alarms.create("version-check", { periodInMinutes: 60 });

    await this.maybeRefreshRemote();
  }

  getUAString() {
    return this.#currentUAString;
  }

  getChromeVersion() {
    return this.#currentChromeVersion;
  }

  // Get the actual platform (before any spoofing logic)
  getActualPlatform() {
    return this.#currentPlatform;
  }

  // Get Linux spoofing preference
  getLinuxSpoofAsWindows() {
    return this.#linuxSpoofAsWindows;
  }

  // Set Linux spoofing preference
  async setLinuxSpoofAsWindows(enabled) {
    console.log("Setting Linux spoof as Windows to:", enabled);

    this.#linuxSpoofAsWindows = enabled;

    // Ensure the storage operation completes
    await chrome.storage.local.set({ linuxSpoofAsWindows: enabled });
    console.log("Linux spoof setting saved to storage");

    await this.buildUAStringFromStorage();
    console.log("UA string rebuilt after Linux spoof change");
  }

  // Generate Chrome-like appVersion string for navigator.appVersion spoofing
  getAppVersion() {
    const baseAppVersion = this.#currentUAString.replace("Mozilla/", "");
    return baseAppVersion;
  }

  // Generate Chrome-like vendor string
  getVendor() {
    return "Google Inc.";
  }

  // Generate Chrome-like userAgentData for modern browsers
  getUserAgentData(hostname = null) {
    const actualPlatform = this.#currentPlatform;
    const effectivePlatform = this.#getEffectivePlatform(actualPlatform, hostname);

    const platformName = effectivePlatform === "mac" ? "macOS" : effectivePlatform === "linux" ? "Linux" : "Windows";

    const platformVersion =
      effectivePlatform === "mac" ? "14.0.0" : effectivePlatform === "linux" ? "5.15.0" : "15.0.0";

    return {
      brands: [
        { brand: "Google Chrome", version: this.#currentChromeVersion },
        { brand: "Chromium", version: this.#currentChromeVersion },
        { brand: "Not_A Brand", version: "24" },
      ],
      mobile: false,
      platform: platformName,

      // High entropy values that getHighEntropyValues() method should return
      highEntropyValues: {
        architecture: "x86",
        bitness: "64",
        fullVersionList: [
          { brand: "Google Chrome", version: `${this.#currentChromeVersion}.0.0.0` },
          { brand: "Chromium", version: `${this.#currentChromeVersion}.0.0.0` },
          { brand: "Not_A Brand", version: "24.0.0.0" },
        ],
        model: "",
        platformVersion: platformVersion,
        uaFullVersion: `${this.#currentChromeVersion}.0.0.0`,
        wow64: false,
      },
    };
  }

  // Helper method to determine effective platform for a hostname
  #getEffectivePlatform(actualPlatform, hostname) {
    // Only apply Linux-to-Windows spoofing logic if we're on Linux
    if (actualPlatform !== "linux") {
      return actualPlatform;
    }

    // If hostname is provided, check per-site setting
    if (hostname && typeof self !== "undefined" && self.linuxWindowsSpoofList) {
      return self.linuxWindowsSpoofList.contains(hostname) ? "win" : "linux";
    }

    // Fallback to global setting for backward compatibility
    return this.#linuxSpoofAsWindows ? "win" : "linux";
  }

  // Get UA string for specific hostname (supports per-site platform spoofing)
  getUAStringForHostname(hostname) {
    const actualPlatform = this.#currentPlatform;
    const effectivePlatform = this.#getEffectivePlatform(actualPlatform, hostname);

    const ChromeUAStrings = {
      win: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${this.#currentChromeVersion}.0.0.0 Safari/537.36`,
      mac: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${this.#currentChromeVersion}.0.0.0 Safari/537.36`,
      linux: `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${this.#currentChromeVersion}.0.0.0 Safari/537.36`,
      android: `Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${this.#currentChromeVersion}.0.0.0 Mobile Safari/537.36`,
    };

    return ChromeUAStrings[effectivePlatform] || this.#currentUAString;
  }

  async buildUAStringFromStorage() {
    let currentChromeVersion = "134";

    const storedMajorVersion = (await chrome.storage.local.get("remoteStorageVersionNumber"))
      ?.remoteStorageVersionNumber?.version;
    if (storedMajorVersion) {
      currentChromeVersion = storedMajorVersion;
    }

    // Store the chrome version for other methods
    this.#currentChromeVersion = currentChromeVersion;

    let targetPlatform = this.#currentPlatform;

    // On Linux, we can optionally spoof as Chrome-on-Windows. Some sites block Linux
    // specifically, so this is one general way to get around that. This is now configurable.
    if (targetPlatform === "linux" && this.#linuxSpoofAsWindows) {
      targetPlatform = "win";
    }

    const ChromeUAStrings = {
      win: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${currentChromeVersion}.0.0.0 Safari/537.36`,
      mac: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${currentChromeVersion}.0.0.0 Safari/537.36`,
      linux: `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${currentChromeVersion}.0.0.0 Safari/537.36`,
      android: `Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${currentChromeVersion}.0.0.0 Mobile Safari/537.36`,
    };

    this.#currentUAString = ChromeUAStrings[targetPlatform];

    // Store spoofing data whenever UA string is rebuilt
    await this.storeSpoofingData();
  }

  async maybeRefreshRemote() {
    const updatedAt = (await chrome.storage.local.get("remoteStorageVersionNumber"))?.remoteStorageVersionNumber
      ?.updatedAt;

    if (updatedAt > Date.now() - 24 * 60 * 60 * 1000) {
      console.info("remote updated in the last 24h, bailing");
      return;
    }

    try {
      console.info("Fetching Chrome version from central automation hub");
      const remoteResponseRaw = await fetch(this.#remoteUrl);
      if (remoteResponseRaw.status !== 200) {
        console.error("failed to update remote, unexpected status code", remoteResponseRaw.status);
        return;
      }

      const remoteResponse = await remoteResponseRaw.text();

      await chrome.storage.local.set({
        remoteStorageVersionNumber: {
          version: remoteResponse.trim(),
          updatedAt: Date.now(),
        },
      });

      await this.buildUAStringFromStorage();
      console.info(`Successfully updated to Chrome version ${remoteResponse.trim()}`);
    } catch (ex) {
      console.error("failed to update remote", ex);
    }
  }

  // Store spoofing data for content script access
  async storeSpoofingData() {
    await chrome.storage.local.set({
      spoofingData: {
        userAgent: this.#currentUAString,
        appVersion: this.getAppVersion(),
        vendor: this.getVendor(),
        userAgentData: this.getUserAgentData(),
        chromeVersion: this.#currentChromeVersion,
        updatedAt: Date.now(),
      },
    });
  }
}
