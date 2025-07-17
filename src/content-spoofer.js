// Chrome Mask for Opera - Content Script Spoofer
// This script implements robust JavaScript-level spoofing using Object.defineProperty()
// to make changes non-configurable and non-writable

// Chrome Mask for Opera - Content Script Spoofer
// This script implements robust JavaScript-level spoofing using Object.defineProperty()
// to make changes non-configurable and non-writable

(function () {
  "use strict";

  // Check if spoofing has already been applied to avoid double-spoofing
  if (window.__chromeMaskSpoofingApplied) {
    console.debug("Chrome Mask spoofing already applied, skipping");
    return;
  }

  // IMMEDIATE SPOOFING - before any other scripts can detect Opera
  // This must happen synchronously at document_start

  // Create a comprehensive Opera detection blocker
  const operaBlocked = Symbol("opera-blocked");

  // Immediately block access to common Opera detection methods
  const blockOperaAccess = (obj, properties) => {
    properties.forEach((prop) => {
      try {
        Object.defineProperty(obj, prop, {
          get: () => {
            console.debug(`Blocked access to ${obj.constructor.name}.${prop}`);
            return undefined;
          },
          set: () => {},
          configurable: false,
          enumerable: false,
        });
      } catch (e) {
        // If property already exists and is non-configurable, try to delete it
        try {
          delete obj[prop];
        } catch (e2) {
          // Last resort - set to undefined
          obj[prop] = undefined;
        }
      }
    });
  };

  // Block Opera properties immediately
  if (typeof window !== "undefined") {
    blockOperaAccess(window, ["opera", "opr", "operaVersion", "operaBuild", "operaAPI"]);
  }

  if (typeof navigator !== "undefined") {
    blockOperaAccess(navigator, ["opera", "opr", "operaVersion", "operaBuild"]);
  }

  // Execute immediately before any other scripts can run
  const originalUserAgent = navigator.userAgent;
  const isAlreadySpoofed =
    originalUserAgent.includes("Chrome/") &&
    !originalUserAgent.includes("OPR/") &&
    !originalUserAgent.includes("Opera/");

  // Don't spoof if already looks like Chrome (avoid double-spoofing)
  if (isAlreadySpoofed) {
    console.log("Chrome user agent already detected, skipping spoofing");
    return;
  }

  // CRITICAL: Immediately hide any traces of Opera/OPR in the user agent before other scripts can see it
  // Store original values before any spoofing
  const originalValues = {
    userAgent: navigator.userAgent,
    appVersion: navigator.appVersion,
    vendor: navigator.vendor,
    userAgentData: navigator.userAgentData,
  };

  if (originalUserAgent.includes("OPR/") || originalUserAgent.includes("Opera/")) {
    // Create a temporary Chrome-like user agent immediately
    const tempChromeUA =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36";
    try {
      // Only define if not already defined or if configurable
      const descriptor = Object.getOwnPropertyDescriptor(navigator, "userAgent");
      if (!descriptor || descriptor.configurable !== false) {
        Object.defineProperty(navigator, "userAgent", {
          get: function () {
            return tempChromeUA;
          },
          configurable: true, // Keep configurable so we can redefine later
          enumerable: true,
        });
      }
    } catch (e) {
      // Fallback if descriptor can't be set
      console.warn("Failed to immediately spoof user agent:", e);
    }
  }

  // Get spoofing data from storage (async)
  let spoofingData = null;
  const initPromise = (async () => {
    try {
      const storage = await chrome.storage.local.get("spoofingData");
      spoofingData = storage.spoofingData;

      // Check if data is recent (within 25 hours)
      if (spoofingData && spoofingData.updatedAt && Date.now() - spoofingData.updatedAt > 25 * 60 * 60 * 1000) {
        console.warn("Spoofing data is stale, using anyway");
      }
    } catch (error) {
      console.error("Failed to get spoofing data from storage:", error);
    }

    // Fallback values if storage is not available
    if (!spoofingData) {
      spoofingData = {
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
        appVersion:
          "5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
        vendor: "Google Inc.",
        userAgentData: {
          brands: [
            { brand: "Google Chrome", version: "134" },
            { brand: "Chromium", version: "134" },
            { brand: "Not_A Brand", version: "24" },
          ],
          mobile: false,
          platform: "Windows",
          highEntropyValues: {
            architecture: "x86",
            bitness: "64",
            fullVersionList: [
              { brand: "Google Chrome", version: "134.0.0.0" },
              { brand: "Chromium", version: "134.0.0.0" },
              { brand: "Not_A Brand", version: "24.0.0.0" },
            ],
            model: "",
            platformVersion: "15.0.0",
            uaFullVersion: "134.0.0.0",
            wow64: false,
          },
        },
        chromeVersion: "134",
      };
    }

    // Apply spoofing immediately
    applySpoofing();
  })();

  // Apply spoofing synchronously with fallback data
  applySpoofing();

  function applySpoofing() {
    // Skip if already applied
    if (window.__chromeMaskSpoofingApplied) {
      return;
    }
    // Use current spoofingData or fallback
    const currentData = spoofingData || {
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
      appVersion:
        "5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
      vendor: "Google Inc.",
      userAgentData: {
        brands: [
          { brand: "Google Chrome", version: "134" },
          { brand: "Chromium", version: "134" },
          { brand: "Not_A Brand", version: "24" },
        ],
        mobile: false,
        platform: "Windows",
        highEntropyValues: {
          architecture: "x86",
          bitness: "64",
          fullVersionList: [
            { brand: "Google Chrome", version: "134.0.0.0" },
            { brand: "Chromium", version: "134.0.0.0" },
            { brand: "Not_A Brand", version: "24.0.0.0" },
          ],
          model: "",
          platformVersion: "15.0.0",
          uaFullVersion: "134.0.0.0",
          wow64: false,
        },
      },
      chromeVersion: "134",
    };

    // Spoof navigator.userAgent
    try {
      const descriptor = Object.getOwnPropertyDescriptor(navigator, "userAgent");
      if (!descriptor || descriptor.configurable === true) {
        Object.defineProperty(navigator, "userAgent", {
          get: function () {
            return currentData.userAgent;
          },
          set: function () {},
          configurable: false,
          enumerable: true,
        });
      } // else: do nothing, property is non-configurable
    } catch (e) {
      // Only log if not a TypeError about non-configurable property
      if (!(e instanceof TypeError && /Cannot redefine property/.test(e.message))) {
        console.warn("Could not spoof navigator.userAgent:", e);
      }
    }

    // Spoof navigator.appVersion
    try {
      const descriptor = Object.getOwnPropertyDescriptor(navigator, "appVersion");
      if (!descriptor || descriptor.configurable === true) {
        Object.defineProperty(navigator, "appVersion", {
          get: function () {
            return currentData.appVersion;
          },
          set: function () {},
          configurable: false,
          enumerable: true,
        });
      }
    } catch (e) {
      if (!(e instanceof TypeError && /Cannot redefine property/.test(e.message))) {
        console.warn("Could not spoof navigator.appVersion:", e);
      }
    }

    // Spoof navigator.vendor
    try {
      const descriptor = Object.getOwnPropertyDescriptor(navigator, "vendor");
      if (!descriptor || descriptor.configurable === true) {
        Object.defineProperty(navigator, "vendor", {
          get: function () {
            return currentData.vendor;
          },
          set: function () {},
          configurable: false,
          enumerable: true,
        });
      }
    } catch (e) {
      if (!(e instanceof TypeError && /Cannot redefine property/.test(e.message))) {
        console.warn("Could not spoof navigator.vendor:", e);
      }
    }

    // Spoof navigator.userAgentData (for modern browsers)
    if (navigator.userAgentData) {
      try {
        const descriptor = Object.getOwnPropertyDescriptor(navigator, "userAgentData");
        if (!descriptor || descriptor.configurable === true) {
          // Create a more comprehensive userAgentData object that matches Chrome
          const fakeUserAgentData = {
            brands: currentData.userAgentData.brands || [
              { brand: "Google Chrome", version: "134" },
              { brand: "Chromium", version: "134" },
              { brand: "Not_A Brand", version: "24" },
            ],
            mobile: currentData.userAgentData.mobile || false,
            platform: currentData.userAgentData.platform || "Windows",

            // Add getHighEntropyValues method
            getHighEntropyValues: function (hints) {
              const highEntropyData = currentData.userAgentData.highEntropyValues || {
                architecture: "x86",
                bitness: "64",
                fullVersionList: [
                  { brand: "Google Chrome", version: "134.0.0.0" },
                  { brand: "Chromium", version: "134.0.0.0" },
                  { brand: "Not_A Brand", version: "24.0.0.0" },
                ],
                model: "",
                platformVersion: "15.0.0",
                uaFullVersion: "134.0.0.0",
                wow64: false,
              };

              // Return only the requested hints, or all if no hints specified
              const result = {
                brands: this.brands,
                mobile: this.mobile,
                platform: this.platform,
              };

              if (!hints || hints.length === 0) {
                return Promise.resolve(Object.assign(result, highEntropyData));
              }

              hints.forEach((hint) => {
                if (highEntropyData.hasOwnProperty(hint)) {
                  result[hint] = highEntropyData[hint];
                }
              });

              return Promise.resolve(result);
            },

            // Add toJSON method for serialization
            toJSON: function () {
              return {
                brands: this.brands,
                mobile: this.mobile,
                platform: this.platform,
              };
            },
          };

          Object.defineProperty(navigator, "userAgentData", {
            get: function () {
              return fakeUserAgentData;
            },
            set: function () {},
            configurable: false,
            enumerable: true,
          });
        }
      } catch (e) {
        if (!(e instanceof TypeError && /Cannot redefine property/.test(e.message))) {
          console.warn("Could not spoof navigator.userAgentData:", e);
        }
      }
    }

    // Create/enhance window.chrome object
    if (!window.chrome) {
      window.chrome = {};
    }

    // Define chrome object properties to make it look like genuine Chrome
    const chromeAPIs = {
      // Chrome CSI (Chrome Speed Index) API
      csi: function () {
        return {
          onloadT: Date.now(),
          pageT: Date.now(),
          startE: Date.now(),
          tran: 15,
        };
      },

      // Chrome Load Times API (deprecated but still used for detection)
      loadTimes: function () {
        return {
          requestTime: Date.now() / 1000,
          startLoadTime: Date.now() / 1000,
          commitLoadTime: Date.now() / 1000,
          finishDocumentLoadTime: Date.now() / 1000,
          finishLoadTime: Date.now() / 1000,
          firstPaintTime: Date.now() / 1000,
          firstPaintAfterLoadTime: 0,
          navigationType: "Other",
          wasFetchedViaSpdy: false,
          wasNpnNegotiated: false,
          npnNegotiatedProtocol: "",
          wasAlternateProtocolAvailable: false,
          connectionInfo: "unknown",
        };
      },

      // Chrome Runtime API (limited to what's safe to expose)
      runtime: {
        onConnect: {
          addListener: function () {},
          removeListener: function () {},
          hasListener: function () {
            return false;
          },
        },
        onMessage: {
          addListener: function () {},
          removeListener: function () {},
          hasListener: function () {
            return false;
          },
        },
      },

      // Chrome Web Store API
      webstore: {
        onInstallStageChanged: {
          addListener: function () {},
          removeListener: function () {},
          hasListener: function () {
            return false;
          },
        },
        onDownloadProgress: {
          addListener: function () {},
          removeListener: function () {},
          hasListener: function () {
            return false;
          },
        },
      },
    };

    // Add/enhance chrome APIs
    Object.assign(window.chrome, chromeAPIs);

    // Make chrome object non-configurable where possible
    try {
      Object.defineProperty(window, "chrome", {
        value: window.chrome,
        writable: false,
        configurable: false,
        enumerable: true,
      });
    } catch (e) {
      // If we can't make it non-configurable, at least ensure it exists
      window.chrome = Object.assign(window.chrome || {}, chromeAPIs);
    }

    // Remove Opera-specific properties and APIs
    const operaProperties = [
      "opera",
      "opr",
      "addons",
      "sidebar",
      "operaVersion",
      "operaBuild",
      "operaPrefs",
      "operaAPI",
      "operaTouchAPI",
      "operaMailAPI",
      "operaMediaAPI",
      "operaHistory",
      "operaExtension",
    ];

    operaProperties.forEach((prop) => {
      if (window[prop]) {
        try {
          delete window[prop];
        } catch (e) {
          // If we can't delete it, try to make it undefined
          try {
            Object.defineProperty(window, prop, {
              get: function () {
                return undefined;
              },
              set: function () {},
              configurable: false,
              enumerable: false,
            });
          } catch (e2) {
            // Last resort - just set to undefined
            window[prop] = undefined;
          }
        }
      }
    });

    // Also remove from navigator if present
    operaProperties.forEach((prop) => {
      if (navigator[prop]) {
        try {
          delete navigator[prop];
        } catch (e) {
          try {
            Object.defineProperty(navigator, prop, {
              get: function () {
                return undefined;
              },
              set: function () {},
              configurable: false,
              enumerable: false,
            });
          } catch (e2) {
            navigator[prop] = undefined;
          }
        }
      }
    });

    // Hide Opera-specific CSS features and capabilities
    try {
      // Override CSS supports to hide Opera-specific features
      const originalSupports = CSS.supports;
      CSS.supports = function (property, value) {
        // Hide Opera-specific CSS properties
        if (property && typeof property === "string") {
          const operaCSSFeatures = ["-o-", "opera-", "-webkit-opera-"];
          if (operaCSSFeatures.some((prefix) => property.toLowerCase().includes(prefix))) {
            return false;
          }
        }
        return originalSupports.apply(this, arguments);
      };
    } catch (e) {
      // CSS.supports might not be available
    }

    // Spoof console properties that might reveal Opera
    try {
      // Some Opera versions add console.profile methods or modify console behavior
      if (console.profile && console.profileEnd) {
        const originalProfile = console.profile;
        const originalProfileEnd = console.profileEnd;

        console.profile = function (...args) {
          // Make it behave like Chrome's console.profile
          return originalProfile.apply(this, args);
        };

        console.profileEnd = function (...args) {
          return originalProfileEnd.apply(this, args);
        };
      }
    } catch (e) {
      // Console manipulation might fail
    }

    // Spoof plugins if needed (though most modern browsers have limited plugin support)
    if (navigator.plugins && navigator.plugins.length === 0) {
      // Add some common Chrome plugins to make it look more authentic
      const fakePlugins = [
        {
          name: "Chrome PDF Plugin",
          filename: "internal-pdf-viewer",
          description: "Portable Document Format",
          length: 1,
        },
        {
          name: "Chrome PDF Viewer",
          filename: "mhjfbmdgcfjbbpaeojofohoefgiehjai",
          description: "",
          length: 1,
        },
        {
          name: "Native Client",
          filename: "internal-nacl-plugin",
          description: "",
          length: 2,
        },
      ];

      try {
        Object.defineProperty(navigator, "plugins", {
          get: function () {
            return fakePlugins;
          },
          configurable: false,
          enumerable: true,
        });
      } catch (e) {
        // If we can't redefine plugins, leave it as is
      }
    }

    // Additional spoofing for webRTC detection avoidance
    if (window.RTCPeerConnection) {
      const originalRTCPeerConnection = window.RTCPeerConnection;
      window.RTCPeerConnection = function (...args) {
        const pc = new originalRTCPeerConnection(...args);

        // Override getStats to avoid fingerprinting
        const originalGetStats = pc.getStats;
        pc.getStats = function (...args) {
          return originalGetStats.apply(this, args);
        };

        return pc;
      };
    }

    // Spoof fetch and XMLHttpRequest headers that might reveal Opera
    if (window.fetch) {
      const originalFetch = window.fetch;
      window.fetch = function (input, init) {
        // Ensure User-Agent header matches our spoofed version
        if (init && init.headers) {
          const headers = new Headers(init.headers);
          if (headers.has("User-Agent")) {
            headers.set("User-Agent", currentData.userAgent);
          }
          init.headers = headers;
        }
        return originalFetch.apply(this, arguments);
      };
    }

    // Override XMLHttpRequest setRequestHeader to ensure consistent User-Agent
    if (window.XMLHttpRequest) {
      const originalXHR = window.XMLHttpRequest;
      const originalSetRequestHeader = originalXHR.prototype.setRequestHeader;

      originalXHR.prototype.setRequestHeader = function (name, value) {
        if (name.toLowerCase() === "user-agent") {
          value = currentData.userAgent;
        }
        return originalSetRequestHeader.call(this, name, value);
      };
    }

    // Spoof Error stack traces that might reveal Opera in file paths
    try {
      const originalError = window.Error;
      window.Error = function (...args) {
        const error = new originalError(...args);
        if (error.stack) {
          // Replace any Opera-related paths in stack traces
          error.stack = error.stack
            .replace(/opera[\/\\]/gi, "chrome/")
            .replace(/opr[\/\\]/gi, "chrome/")
            .replace(/Opera[\/\\]/gi, "Chrome/");
        }
        return error;
      };

      // Copy properties from original Error
      Object.setPrototypeOf(window.Error, originalError);
      Object.setPrototypeOf(window.Error.prototype, originalError.prototype);
    } catch (e) {
      // Error override might fail
    }

    // Spoof screen properties to be more generic but platform-appropriate
    try {
      // Get the actual screen dimensions or use platform-appropriate defaults
      const originalWidth = screen.width;
      const originalHeight = screen.height;

      // Use actual screen dimensions if available, otherwise use common defaults
      const spoofedWidth =
        originalWidth || (currentData.userAgentData && currentData.userAgentData.platform === "macOS" ? 1440 : 1920);
      const spoofedHeight =
        originalHeight || (currentData.userAgentData && currentData.userAgentData.platform === "macOS" ? 900 : 1080);

      Object.defineProperty(screen, "availWidth", {
        get: function () {
          return spoofedWidth;
        },
        configurable: false,
        enumerable: true,
      });

      Object.defineProperty(screen, "availHeight", {
        get: function () {
          return spoofedHeight;
        },
        configurable: false,
        enumerable: true,
      });
    } catch (e) {
      // Screen properties might not be configurable
    }

    // JavaScript spoofing applied successfully

    // Mark that spoofing has been applied
    Object.defineProperty(window, "__chromeMaskSpoofingApplied", {
      value: true,
      writable: false,
      configurable: false,
      enumerable: false,
    });
  }

  // Execute spoofing when document loads if async data becomes available
  initPromise
    .then(() => {
      if (spoofingData && !window.__chromeMaskSpoofingApplied) {
        // Re-apply spoofing with updated data if needed
        applySpoofing();
      }
    })
    .catch(console.error);
})();
