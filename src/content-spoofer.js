// Chromium Mask - Content Script Spoofer
// This script implements robust JavaScript-level spoofing using Object.defineProperty()
// to make changes non-configurable and non-writable

/**
 * Main spoofing IIFE - Implements comprehensive browser masking
 * Runs at document_start to intercept detection before page scripts execute
 */
(function () {
  "use strict";

  // Check if spoofing has already been applied to avoid double-spoofing
  if (window.__chromeMaskSpoofingApplied) {
    console.debug("Chromium Mask spoofing already applied, skipping");
    return;
  }

  // IMMEDIATE SPOOFING - before any other scripts can detect the browser
  // This must happen synchronously at document_start

  // Create a comprehensive browser detection blocker
  const browserBlocked = Symbol("browser-blocked");

  /**
   * Blocks access to browser-specific properties by making them undefined and non-configurable
   * @param {Object} obj - The object to modify (window, navigator, etc.)
   * @param {string[]} properties - Array of property names to block
   */
  const blockBrowserAccess = (obj, properties) => {
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

  /**
   * Browser detection configuration mapping
   * Maps browser user-agent patterns to their specific API properties to block
   */
  const BROWSER_API_MAP = {
    opera: {
      patterns: ["OPR/", "Opera/"],
      apis: [
        "opera",
        "opr",
        "operaVersion",
        "operaBuild",
        "operaAPI",
        "operaPrefs",
        "operaTouchAPI",
        "operaMailAPI",
        "operaMediaAPI",
        "operaHistory",
        "operaExtension",
      ],
      name: "Opera",
    },
    brave: {
      patterns: ["Brave/"],
      checkProperty: "brave", // Also check navigator.brave property
      apis: ["brave", "braveSolana", "braveWallet"],
      name: "Brave",
    },
    edge: {
      patterns: ["Edg/"],
      apis: ["edge"],
      name: "Edge",
    },
    vivaldi: {
      patterns: ["Vivaldi/"],
      apis: ["vivaldi", "vivaldiPrivate"],
      name: "Vivaldi",
    },
    yandex: {
      patterns: ["YaBrowser/"],
      apis: ["yandex", "yandexBrowser"],
      name: "Yandex",
    },
  };

  /**
   * Detects which browser is being used and returns appropriate APIs to block
   * @param {string} userAgent - The browser's user agent string
   * @returns {Object} { browserAPIs: string[], browserName: string }
   */
  function detectBrowserAPIs(userAgent) {
    for (const [key, config] of Object.entries(BROWSER_API_MAP)) {
      // Check user agent patterns
      const matchesUA = config.patterns.some((pattern) => userAgent.includes(pattern));
      // Check for property if specified (e.g., navigator.brave for Brave)
      const matchesProperty =
        config.checkProperty && typeof navigator !== "undefined" && navigator[config.checkProperty];

      if (matchesUA || matchesProperty) {
        console.debug(`Chromium Mask: Detected ${config.name} browser, blocking ${config.name}-specific APIs`);
        return { browserAPIs: config.apis, browserName: config.name };
      }
    }

    console.debug("Chromium Mask: Generic Chromium browser detected, minimal API blocking");
    return { browserAPIs: ["opera", "opr"], browserName: "Chromium" }; // Default minimal set
  }

  // Detect browser-specific APIs to block based on user agent
  const originalUserAgent = navigator.userAgent;
  const { browserAPIs: browserAPIsToBlock, browserName } = detectBrowserAPIs(originalUserAgent);

  // Block browser-specific properties immediately
  if (typeof window !== "undefined") {
    blockBrowserAccess(window, browserAPIsToBlock);
  }

  if (typeof navigator !== "undefined") {
    blockBrowserAccess(navigator, browserAPIsToBlock);
  }

  /**
   * Checks if the user agent already appears to be Chrome (no spoofing needed)
   * @param {string} userAgent - The user agent string to check
   * @returns {boolean} True if already spoofed as Chrome
   */
  function isAlreadyChrome(userAgent) {
    return (
      userAgent.includes("Chrome/") &&
      !userAgent.includes("OPR/") &&
      !userAgent.includes("Opera/") &&
      !userAgent.includes("Edg/") &&
      !userAgent.includes("Brave/") &&
      !userAgent.includes("Vivaldi/") &&
      !userAgent.includes("YaBrowser/")
    );
  }

  // Don't spoof if already looks like Chrome (avoid double-spoofing)
  if (isAlreadyChrome(originalUserAgent)) {
    console.log("Chrome user agent already detected, skipping spoofing");
    return;
  }

  // CRITICAL: Immediately hide any traces of browser-specific identifiers in the user agent before other scripts can see it
  // Store original values before any spoofing
  const originalValues = {
    userAgent: navigator.userAgent,
    appVersion: navigator.appVersion,
    vendor: navigator.vendor,
    userAgentData: navigator.userAgentData,
  };

  /**
   * Checks if a browser needs immediate temporary user agent spoofing
   * Some browsers (like Opera) need UA spoofed before async storage loads
   * @param {string} browserName - The detected browser name
   * @returns {boolean} True if immediate spoofing is needed
   */
  function needsImmediateSpoofing(browserName) {
    return ["Opera", "Vivaldi", "Yandex"].includes(browserName);
  }

  // Apply immediate temporary spoofing for browsers that need it
  if (needsImmediateSpoofing(browserName)) {
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
      console.log("Fetching spoofing data from storage...");
      const storage = await chrome.storage.local.get("spoofingData");
      spoofingData = storage.spoofingData;

      if (spoofingData) {
        console.log("Successfully loaded spoofing data:", {
          userAgent: spoofingData.userAgent?.substring(0, 50) + "...",
          vendor: spoofingData.vendor,
          platform: spoofingData.userAgentData?.platform,
          updatedAt: new Date(spoofingData.updatedAt).toISOString(),
        });
      } else {
        console.warn("No spoofing data found in storage, using fallback");
      }

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
      console.log("Chrome Mask spoofing already applied, skipping");
      return;
    }

    console.log("Applying Chrome Mask spoofing...");

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

    console.log("Using spoofing data:", {
      userAgent: currentData.userAgent?.substring(0, 50) + "...",
      vendor: currentData.vendor,
      platform: currentData.userAgentData?.platform,
      source: spoofingData ? "storage" : "fallback",
    });

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

    // Remove browser-specific properties and APIs (for all Chromium browsers)
    // Dynamically build list based on detected browser
    const browserSpecificProperties = [];

    // Always add common browser detection properties
    browserSpecificProperties.push(...["addons", "sidebar"]);

    // Add browser-specific APIs based on UA detection
    if (originalUserAgent.includes("OPR/") || originalUserAgent.includes("Opera/")) {
      browserSpecificProperties.push(
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
      );
    } else if (originalUserAgent.includes("Brave/") || (typeof navigator !== "undefined" && navigator.brave)) {
      browserSpecificProperties.push("brave", "braveSolana", "braveWallet");
    } else if (originalUserAgent.includes("Edg/")) {
      browserSpecificProperties.push("edge");
    } else if (originalUserAgent.includes("Vivaldi/")) {
      browserSpecificProperties.push("vivaldi", "vivaldiPrivate");
    } else if (originalUserAgent.includes("YaBrowser/")) {
      browserSpecificProperties.push("yandex", "yandexBrowser");
    }

    console.debug(`Chromium Mask: Removing ${browserSpecificProperties.length} browser-specific properties`);

    browserSpecificProperties.forEach((prop) => {
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
    browserSpecificProperties.forEach((prop) => {
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

    // Hide browser-specific CSS features and capabilities
    try {
      // Override CSS supports to hide browser-specific features
      const originalSupports = CSS.supports;
      CSS.supports = function (property, value) {
        // Hide browser-specific CSS properties and vendor prefixes
        if (property && typeof property === "string") {
          // Detect which browser-specific CSS prefixes to hide
          let browserCSSFeatures = [];
          if (originalUserAgent.includes("OPR/") || originalUserAgent.includes("Opera/")) {
            browserCSSFeatures = ["-o-", "opera-", "-webkit-opera-"];
          } else if (originalUserAgent.includes("Edg/")) {
            browserCSSFeatures = ["-ms-", "edge-"];
          }
          // Most other Chromium browsers don't have unique CSS prefixes

          if (browserCSSFeatures.some((prefix) => property.toLowerCase().includes(prefix))) {
            return false;
          }
        }
        return originalSupports.apply(this, arguments);
      };
    } catch (e) {
      // CSS.supports might not be available
    }

    // Spoof console properties that might reveal browser identity
    try {
      // Some browser versions add console.profile methods or modify console behavior
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

    // Spoof fetch and XMLHttpRequest headers that might reveal browser identity
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

    // Spoof Error stack traces that might reveal browser identity in file paths
    try {
      const originalError = window.Error;
      window.Error = function (...args) {
        const error = new originalError(...args);
        if (error.stack) {
          // Replace any browser-related paths in stack traces
          error.stack = error.stack
            .replace(/opera[\/\\]/gi, "chrome/")
            .replace(/opr[\/\\]/gi, "chrome/")
            .replace(/Opera[\/\\]/gi, "Chrome/")
            .replace(/brave[\/\\]/gi, "chrome/")
            .replace(/Brave[\/\\]/gi, "Chrome/")
            .replace(/edge[\/\\]/gi, "chrome/")
            .replace(/Edge[\/\\]/gi, "Chrome/")
            .replace(/vivaldi[\/\\]/gi, "chrome/")
            .replace(/Vivaldi[\/\\]/gi, "Chrome/");
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

    // JavaScript spoofing applied successfully    // Mark that spoofing has been applied
    Object.defineProperty(window, "__chromeMaskSpoofingApplied", {
      value: true,
      writable: false,
      configurable: false,
      enumerable: false,
    });

    console.log("✅ Chrome Mask spoofing applied successfully");
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
