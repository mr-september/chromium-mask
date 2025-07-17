// Chromium/Opera content script for spoofing navigator properties
// This uses standard JavaScript to modify navigator properties

// Define spoofed navigator properties
Object.defineProperty(navigator, "appVersion", {
  get: function () {
    return navigator.userAgent.replace("Mozilla/", "");
  },
  set: function () {},
  configurable: false,
  enumerable: true,
});

Object.defineProperty(navigator, "vendor", {
  get: function () {
    return "Google Inc.";
  },
  set: function () {},
  configurable: false,
  enumerable: true,
});

// Add chrome object to window if it doesn't exist or enhance it
if (!window.chrome) {
  window.chrome = {};
}

// Ensure chrome object has the expected structure
Object.assign(window.chrome, {
  csi: window.chrome.csi || {},
  loadTimes:
    window.chrome.loadTimes ||
    function () {
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
  runtime: window.chrome.runtime || {},
  webstore: window.chrome.webstore || {},
});

// Remove Opera-specific properties that might reveal identity
if (window.opera) {
  delete window.opera;
}

// Spoof userAgentData if it exists (for newer browsers)
if (navigator.userAgentData) {
  Object.defineProperty(navigator, "userAgentData", {
    get: function () {
      return {
        brands: [
          { brand: "Google Chrome", version: "131" },
          { brand: "Chromium", version: "131" },
          { brand: "Not_A Brand", version: "24" },
        ],
        mobile: false,
        platform: "Windows",
      };
    },
    configurable: false,
    enumerable: true,
  });
}
