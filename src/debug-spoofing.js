// Debug spoofing functionality
function setRowStatus(rowId, status) {
  const row = document.getElementById(rowId);
  if (row) {
    if (status === "chrome") {
      row.className = "chrome-detected";
    } else if (status === "opera") {
      row.className = "opera-detected";
    }
  }
}

function updateStatus(elementId, text, status) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = text;
    if (status === "good") {
      element.style.color = "#155724";
      element.style.fontWeight = "bold";
    } else if (status === "bad") {
      element.style.color = "#721c24";
      element.style.fontWeight = "bold";
    } else if (status === "warning") {
      element.style.color = "#856404";
      element.style.fontWeight = "bold";
    }
  }
}

function analyzeUserAgent() {
  const ua = navigator.userAgent;
  document.getElementById("user-agent-value").textContent = ua;

  const hasOpera = ua.includes("Opera") || ua.includes("OPR");
  const hasChrome = ua.includes("Chrome");

  if (hasOpera) {
    updateStatus("user-agent-status", "❌ Opera detected", "bad");
    setRowStatus("user-agent-row", "opera");
  } else if (hasChrome) {
    updateStatus("user-agent-status", "✅ Chrome detected", "good");
    setRowStatus("user-agent-row", "chrome");
  } else {
    updateStatus("user-agent-status", "⚠️ Unknown browser", "warning");
  }
}

function analyzeVendor() {
  const vendor = navigator.vendor;
  document.getElementById("vendor-value").textContent = vendor || "undefined";

  if (vendor === "Google Inc.") {
    updateStatus("vendor-status", "✅ Google vendor", "good");
    setRowStatus("vendor-row", "chrome");
  } else {
    updateStatus("vendor-status", "❌ Not Google vendor", "bad");
    setRowStatus("vendor-row", "opera");
  }
}

function analyzeAppVersion() {
  const appVersion = navigator.appVersion;
  document.getElementById("app-version-value").textContent = appVersion;

  const hasOpera = appVersion.includes("Opera") || appVersion.includes("OPR");
  const hasChrome = appVersion.includes("Chrome");

  if (hasOpera) {
    updateStatus("app-version-status", "❌ Opera detected", "bad");
    setRowStatus("app-version-row", "opera");
  } else if (hasChrome) {
    updateStatus("app-version-status", "✅ Chrome detected", "good");
    setRowStatus("app-version-row", "chrome");
  } else {
    updateStatus("app-version-status", "⚠️ Unknown browser", "warning");
  }
}

function analyzeUserAgentData() {
  if (!navigator.userAgentData) {
    document.getElementById("ua-brands-value").textContent = "Not supported";
    document.getElementById("ua-platform-value").textContent = "Not supported";
    document.getElementById("ua-mobile-value").textContent = "Not supported";
    updateStatus("ua-brands-status", "N/A", "warning");
    updateStatus("ua-platform-status", "N/A", "warning");
    updateStatus("ua-mobile-status", "N/A", "warning");
    return;
  }

  // Brands
  const brands = navigator.userAgentData.brands;
  document.getElementById("ua-brands-value").textContent = JSON.stringify(brands);

  const hasOperaBrand = brands.some((b) => b.brand.includes("Opera") || b.brand.includes("OPR"));
  const hasChromeBrand = brands.some((b) => b.brand.includes("Chrome"));

  if (hasOperaBrand) {
    updateStatus("ua-brands-status", "❌ Opera brand detected", "bad");
    setRowStatus("ua-brands-row", "opera");
  } else if (hasChromeBrand) {
    updateStatus("ua-brands-status", "✅ Chrome brand detected", "good");
    setRowStatus("ua-brands-row", "chrome");
  } else {
    updateStatus("ua-brands-status", "⚠️ Unknown brands", "warning");
  }

  // Platform
  const platform = navigator.userAgentData.platform;
  document.getElementById("ua-platform-value").textContent = platform;
  updateStatus("ua-platform-status", "✅ Platform available", "good");
  setRowStatus("ua-platform-row", "chrome");

  // Mobile
  const mobile = navigator.userAgentData.mobile;
  document.getElementById("ua-mobile-value").textContent = mobile.toString();
  updateStatus("ua-mobile-status", "✅ Mobile flag available", "good");
  setRowStatus("ua-mobile-row", "chrome");
}

function analyzeOperaDetection() {
  // window.opera
  const hasWindowOpera = typeof window.opera !== "undefined";
  document.getElementById("window-opera-value").textContent = hasWindowOpera ? "Yes" : "No";
  if (hasWindowOpera) {
    updateStatus("window-opera-status", "❌ Opera object found", "bad");
    setRowStatus("window-opera-row", "opera");
  } else {
    updateStatus("window-opera-status", "✅ Opera object blocked", "good");
    setRowStatus("window-opera-row", "chrome");
  }

  // window.opr
  const hasWindowOpr = typeof window.opr !== "undefined";
  document.getElementById("window-opr-value").textContent = hasWindowOpr ? "Yes" : "No";
  if (hasWindowOpr) {
    updateStatus("window-opr-status", "❌ OPR object found", "bad");
    setRowStatus("window-opr-row", "opera");
  } else {
    updateStatus("window-opr-status", "✅ OPR object blocked", "good");
    setRowStatus("window-opr-row", "chrome");
  }

  // User agent Opera/OPR
  const ua = navigator.userAgent;
  const hasOperaUA = ua.includes("Opera") || ua.includes("OPR");
  document.getElementById("ua-opera-value").textContent = hasOperaUA ? "Yes" : "No";
  if (hasOperaUA) {
    updateStatus("ua-opera-status", "❌ Opera in User Agent", "bad");
    setRowStatus("ua-opera-row", "opera");
  } else {
    updateStatus("ua-opera-status", "✅ Opera not in User Agent", "good");
    setRowStatus("ua-opera-row", "chrome");
  }
}

function analyzeChromeDetection() {
  // window.chrome
  const hasWindowChrome = typeof window.chrome !== "undefined" && window.chrome !== null;
  document.getElementById("window-chrome-value").textContent = hasWindowChrome ? "Yes" : "No";
  if (hasWindowChrome) {
    updateStatus("window-chrome-status", "✅ Chrome object found", "good");
    setRowStatus("window-chrome-row", "chrome");
  } else {
    updateStatus("window-chrome-status", "❌ Chrome object missing", "bad");
    setRowStatus("window-chrome-row", "opera");
  }

  // User agent Chrome
  const ua = navigator.userAgent;
  const hasChromeUA = ua.includes("Chrome");
  document.getElementById("ua-chrome-value").textContent = hasChromeUA ? "Yes" : "No";
  if (hasChromeUA) {
    updateStatus("ua-chrome-status", "✅ Chrome in User Agent", "good");
    setRowStatus("ua-chrome-row", "chrome");
  } else {
    updateStatus("ua-chrome-status", "❌ Chrome not in User Agent", "bad");
    setRowStatus("ua-chrome-row", "opera");
  }

  // Google vendor
  const isGoogleVendor = navigator.vendor === "Google Inc.";
  document.getElementById("vendor-google-value").textContent = isGoogleVendor ? "Yes" : "No";
  if (isGoogleVendor) {
    updateStatus("vendor-google-status", "✅ Google vendor set", "good");
    setRowStatus("vendor-google-row", "chrome");
  } else {
    updateStatus("vendor-google-status", "❌ Not Google vendor", "bad");
    setRowStatus("vendor-google-row", "opera");
  }
}

function analyzeSpoofingStatus() {
  const ua = navigator.userAgent;
  const vendor = navigator.vendor;
  const hasOperaUA = ua.includes("Opera") || ua.includes("OPR");
  const hasChromeUA = ua.includes("Chrome");
  const isGoogleVendor = vendor === "Google Inc.";
  const hasWindowOpera = typeof window.opera !== "undefined";
  const hasWindowOpr = typeof window.opr !== "undefined";
  const hasWindowChrome = typeof window.chrome !== "undefined" && window.chrome !== null;

  const statusElement = document.getElementById("spoofing-status");
  const resultElement = document.getElementById("spoofing-result");

  if (hasOperaUA || hasWindowOpera || hasWindowOpr || !isGoogleVendor) {
    statusElement.className = "test-result error";
    resultElement.innerHTML =
      "❌ <strong>Spoofing FAILED</strong><br>Opera is still detectable. The Chrome Mask extension may not be working properly.";
  } else if (hasChromeUA && isGoogleVendor && hasWindowChrome) {
    statusElement.className = "test-result success";
    resultElement.innerHTML =
      "✅ <strong>Spoofing SUCCESSFUL</strong><br>Browser appears as Chrome. Opera detection is blocked.";
  } else {
    statusElement.className = "test-result warning";
    resultElement.innerHTML =
      "⚠️ <strong>Spoofing PARTIAL</strong><br>Some aspects are working but others may need attention.";
  }
}

// Run all tests
document.addEventListener("DOMContentLoaded", function () {
  console.log("🔍 Starting Chrome Mask spoofing analysis...");
  console.log("Current User Agent:", navigator.userAgent);
  console.log("Current Vendor:", navigator.vendor);
  console.log("Window chrome exists:", typeof window.chrome !== "undefined");
  console.log("Window opera exists:", typeof window.opera !== "undefined");

  analyzeUserAgent();
  analyzeVendor();
  analyzeAppVersion();
  analyzeUserAgentData();
  analyzeOperaDetection();
  analyzeChromeDetection();
  analyzeSpoofingStatus();
});

// Add localhost enable functionality
document.addEventListener("DOMContentLoaded", function () {
  const enableBtn = document.getElementById("enable-localhost-btn");
  if (enableBtn) {
    enableBtn.addEventListener("click", async function () {
      try {
        const resultDiv = document.getElementById("enable-result");
        resultDiv.innerHTML = '<span style="color: blue;">Enabling localhost...</span>';

        // Get current enabled hostnames
        const storage = await chrome.storage.local.get("enabledHostnames");
        const enabledHostnames = new Set(storage.enabledHostnames || []);

        if (!enabledHostnames.has("localhost")) {
          enabledHostnames.add("localhost");
          await chrome.storage.local.set({
            enabledHostnames: Array.from(enabledHostnames),
          });

          // Trigger hostname change to update rules
          await chrome.runtime.sendMessage({ action: "enabled_hostnames_changed" });

          resultDiv.innerHTML =
            '<span style="color: green;">✅ localhost enabled! Refreshing page in 2 seconds...</span>';

          setTimeout(() => {
            window.location.reload();
          }, 2000);
        } else {
          resultDiv.innerHTML =
            '<span style="color: orange;">⚠️ localhost is already enabled. Try refreshing the page (Ctrl+F5)</span>';
        }
      } catch (error) {
        console.error("Error enabling localhost:", error);
        document.getElementById("enable-result").innerHTML =
          '<span style="color: red;">❌ Error: ' + error.message + "</span>";
      }
    });
  }
});
