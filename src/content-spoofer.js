// Chrome Mask for Opera - Content Script Spoofer
// This script implements robust JavaScript-level spoofing using Object.defineProperty()
// to make changes non-configurable and non-writable

(async function() {
  'use strict';

  // Get spoofing data from storage
  let spoofingData = null;
  try {
    const storage = await chrome.storage.local.get('spoofingData');
    spoofingData = storage.spoofingData;
    
    // Check if data is recent (within 25 hours)
    if (spoofingData && spoofingData.updatedAt && 
        Date.now() - spoofingData.updatedAt > 25 * 60 * 60 * 1000) {
      console.warn('Spoofing data is stale, using anyway');
    }
  } catch (error) {
    console.error('Failed to get spoofing data from storage:', error);
  }

  // Fallback values if storage is not available
  if (!spoofingData) {
    spoofingData = {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
      appVersion: '5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
      vendor: 'Google Inc.',
      userAgentData: {
        brands: [
          { brand: "Google Chrome", version: "134" },
          { brand: "Chromium", version: "134" },
          { brand: "Not_A Brand", version: "24" }
        ],
        mobile: false,
        platform: "Windows"
      },
      chromeVersion: '134'
    };
  }

  // Spoof navigator.userAgent
  Object.defineProperty(navigator, 'userAgent', {
    get: function() {
      return spoofingData.userAgent;
    },
    set: function() {
      // Silently ignore attempts to set userAgent
    },
    configurable: false,
    enumerable: true
  });

  // Spoof navigator.appVersion
  Object.defineProperty(navigator, 'appVersion', {
    get: function() {
      return spoofingData.appVersion;
    },
    set: function() {
      // Silently ignore attempts to set appVersion
    },
    configurable: false,
    enumerable: true
  });

  // Spoof navigator.vendor
  Object.defineProperty(navigator, 'vendor', {
    get: function() {
      return spoofingData.vendor;
    },
    set: function() {
      // Silently ignore attempts to set vendor
    },
    configurable: false,
    enumerable: true
  });

  // Spoof navigator.userAgentData (for modern browsers)
  if (navigator.userAgentData) {
    // Create a more comprehensive userAgentData object that matches Chrome
    const fakeUserAgentData = {
      brands: spoofingData.userAgentData.brands || [
        { brand: "Google Chrome", version: "134" },
        { brand: "Chromium", version: "134" },
        { brand: "Not_A Brand", version: "24" }
      ],
      mobile: spoofingData.userAgentData.mobile || false,
      platform: spoofingData.userAgentData.platform || "Windows",
      
      // Add getHighEntropyValues method
      getHighEntropyValues: function(hints) {
        const highEntropyData = spoofingData.userAgentData.highEntropyValues || {
          architecture: "x86",
          bitness: "64",
          fullVersionList: [
            { brand: "Google Chrome", version: "134.0.0.0" },
            { brand: "Chromium", version: "134.0.0.0" },
            { brand: "Not_A Brand", version: "24.0.0.0" }
          ],
          model: "",
          platformVersion: "15.0.0",
          uaFullVersion: "134.0.0.0",
          wow64: false
        };
        
        // Return only the requested hints, or all if no hints specified
        const result = {
          brands: this.brands,
          mobile: this.mobile,
          platform: this.platform
        };
        
        if (!hints || hints.length === 0) {
          return Promise.resolve(Object.assign(result, highEntropyData));
        }
        
        hints.forEach(hint => {
          if (highEntropyData.hasOwnProperty(hint)) {
            result[hint] = highEntropyData[hint];
          }
        });
        
        return Promise.resolve(result);
      },
      
      // Add toJSON method for serialization
      toJSON: function() {
        return {
          brands: this.brands,
          mobile: this.mobile,
          platform: this.platform
        };
      }
    };
    
    Object.defineProperty(navigator, 'userAgentData', {
      get: function() {
        return fakeUserAgentData;
      },
      set: function() {
        // Silently ignore attempts to set userAgentData
      },
      configurable: false,
      enumerable: true
    });
  }

  // Create/enhance window.chrome object
  if (!window.chrome) {
    window.chrome = {};
  }

  // Define chrome object properties to make it look like genuine Chrome
  const chromeAPIs = {
    // Chrome CSI (Chrome Speed Index) API
    csi: function() {
      return {
        onloadT: Date.now(),
        pageT: Date.now(),
        startE: Date.now(),
        tran: 15
      };
    },
    
    // Chrome Load Times API (deprecated but still used for detection)
    loadTimes: function() {
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
        connectionInfo: "unknown"
      };
    },

    // Chrome Runtime API (limited to what's safe to expose)
    runtime: {
      onConnect: {
        addListener: function() {},
        removeListener: function() {},
        hasListener: function() { return false; }
      },
      onMessage: {
        addListener: function() {},
        removeListener: function() {},
        hasListener: function() { return false; }
      }
    },

    // Chrome Web Store API
    webstore: {
      onInstallStageChanged: {
        addListener: function() {},
        removeListener: function() {},
        hasListener: function() { return false; }
      },
      onDownloadProgress: {
        addListener: function() {},
        removeListener: function() {},
        hasListener: function() { return false; }
      }
    }
  };

  // Add/enhance chrome APIs
  Object.assign(window.chrome, chromeAPIs);

  // Make chrome object non-configurable where possible
  try {
    Object.defineProperty(window, 'chrome', {
      value: window.chrome,
      writable: false,
      configurable: false,
      enumerable: true
    });
  } catch (e) {
    // If we can't make it non-configurable, at least ensure it exists
    window.chrome = Object.assign(window.chrome || {}, chromeAPIs);
  }

  // Remove Opera-specific properties and APIs
  const operaProperties = [
    'opera',
    'opr',
    'addons',
    'sidebar'
  ];

  operaProperties.forEach(prop => {
    if (window[prop]) {
      try {
        delete window[prop];
      } catch (e) {
        // If we can't delete it, try to make it undefined
        try {
          Object.defineProperty(window, prop, {
            get: function() { return undefined; },
            set: function() {},
            configurable: false,
            enumerable: false
          });
        } catch (e2) {
          // Last resort - just set to undefined
          window[prop] = undefined;
        }
      }
    }
  });

  // Spoof plugins if needed (though most modern browsers have limited plugin support)
  if (navigator.plugins && navigator.plugins.length === 0) {
    // Add some common Chrome plugins to make it look more authentic
    const fakePlugins = [
      {
        name: "Chrome PDF Plugin",
        filename: "internal-pdf-viewer",
        description: "Portable Document Format",
        length: 1
      },
      {
        name: "Chrome PDF Viewer",
        filename: "mhjfbmdgcfjbbpaeojofohoefgiehjai",
        description: "",
        length: 1
      },
      {
        name: "Native Client",
        filename: "internal-nacl-plugin",
        description: "",
        length: 2
      }
    ];

    try {
      Object.defineProperty(navigator, 'plugins', {
        get: function() {
          return fakePlugins;
        },
        configurable: false,
        enumerable: true
      });
    } catch (e) {
      // If we can't redefine plugins, leave it as is
    }
  }

  // Additional spoofing for webRTC detection avoidance
  if (window.RTCPeerConnection) {
    const originalRTCPeerConnection = window.RTCPeerConnection;
    window.RTCPeerConnection = function(...args) {
      const pc = new originalRTCPeerConnection(...args);
      
      // Override getStats to avoid fingerprinting
      const originalGetStats = pc.getStats;
      pc.getStats = function(...args) {
        return originalGetStats.apply(this, args);
      };
      
      return pc;
    };
  }

  // Spoof screen properties to be more generic but platform-appropriate
  try {
    // Get the actual screen dimensions or use platform-appropriate defaults
    const originalWidth = screen.width;
    const originalHeight = screen.height;
    
    // Use actual screen dimensions if available, otherwise use common defaults
    const spoofedWidth = originalWidth || (spoofingData.userAgentData && spoofingData.userAgentData.platform === "macOS" ? 1440 : 1920);
    const spoofedHeight = originalHeight || (spoofingData.userAgentData && spoofingData.userAgentData.platform === "macOS" ? 900 : 1080);
    
    Object.defineProperty(screen, 'availWidth', {
      get: function() { return spoofedWidth; },
      configurable: false,
      enumerable: true
    });
    
    Object.defineProperty(screen, 'availHeight', {
      get: function() { return spoofedHeight; },
      configurable: false,
      enumerable: true
    });
  } catch (e) {
    // Screen properties might not be configurable
  }

  // JavaScript spoofing applied successfully
})();
