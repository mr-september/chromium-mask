// Check if extension context is available
if (!chrome || !chrome.runtime) {
  // This check is a fallback. The main logic is now in the DOMContentLoaded listener.
  // The listener won't fire if the script is blocked, but this provides a clear message
  // if the script somehow runs in a non-extension context.
  document.body.innerHTML =
    '<div class="container"><h1>❌ Extension Context Required</h1><p>This test page must be opened from within the Chrome Mask for Opera extension context. Please install the extension and access this page through the extension.</p></div>';
}

function showResult(elementId, message, type = "info") {
  const element = document.getElementById(elementId);
  element.textContent = message;
  element.className = `result ${type}`;
  element.style.display = "block";
}

async function testDNRRules() {
  try {
    showResult("dnr-result", "Testing DNR rules update...", "info");

    const response = await chrome.runtime.sendMessage({ action: "force_dnr_update" });

    if (response && response.success) {
      showResult("dnr-result", "✅ DNR rules updated successfully!\n" + response.message, "success");
    } else {
      showResult("dnr-result", "❌ DNR rules update failed:\n" + (response?.error || "Unknown error"), "error");
    }
  } catch (error) {
    showResult("dnr-result", "❌ Error testing DNR rules:\n" + error.message, "error");
  }
}

async function forceDNRUpdate() {
  try {
    showResult("dnr-result", "Forcing DNR update...", "info");

    const response = await chrome.runtime.sendMessage({ action: "force_dnr_update" });

    if (response && response.success) {
      showResult("dnr-result", "✅ Force DNR update completed!", "success");
    } else {
      showResult("dnr-result", "❌ Force DNR update failed:\n" + (response?.error || "Unknown error"), "error");
    }
  } catch (error) {
    showResult("dnr-result", "❌ Error forcing DNR update:\n" + error.message, "error");
  }
}

async function inspectDNRRules() {
  try {
    showResult("dnr-result", "Inspecting current DNR rules...", "info");

    const response = await chrome.runtime.sendMessage({ action: "inspect_dnr_rules" });

    if (response && response.success) {
      const data = response.data;
      let message = `📊 DNR Rules Inspection:\n\n`;
      message += `Dynamic Rules: ${data.dynamicRules.length}\n`;
      message += `Session Rules: ${data.sessionRules.length}\n\n`;

      if (data.stats) {
        message += `Last Update: ${new Date(data.stats.lastUpdate).toLocaleString()}\n`;
        message += `Rules Count: ${data.stats.rulesCount}\n`;
        message += `Hostnames: ${data.stats.hostnames.join(", ")}\n\n`;
      }

      if (data.error) {
        message += `❌ Last Error: ${new Date(data.error.timestamp).toLocaleString()}\n`;
        message += `Error Message: ${data.error.error}\n`;
      }

      showResult("dnr-result", message, data.error ? "warning" : "success");
    } else {
      showResult("dnr-result", "❌ Failed to inspect DNR rules:\n" + (response?.error || "Unknown error"), "error");
    }
  } catch (error) {
    showResult("dnr-result", "❌ Error inspecting DNR rules:\n" + error.message, "error");
  }
}

async function testContentScripts() {
  try {
    showResult("cs-result", "Testing content script registration...", "info");

    // Trigger content script update by simulating hostname change
    const response = await chrome.runtime.sendMessage({ action: "enabled_hostnames_changed" });

    if (response && response.success !== false) {
      showResult("cs-result", "✅ Content script registration test completed successfully!", "success");
    } else {
      showResult("cs-result", "❌ Content script test failed:\n" + (response?.error || "Unknown error"), "error");
    }
  } catch (error) {
    showResult("cs-result", "❌ Error testing content scripts:\n" + error.message, "error");
  }
}

async function testServiceWorker() {
  try {
    showResult("sw-result", "Testing service worker communication...", "info");

    const response = await chrome.runtime.sendMessage({ action: "test" });

    if (response && response.success) {
      showResult(
        "sw-result",
        `✅ Service worker is responding!\n\nMessage: ${response.message}\nTimestamp: ${response.timestamp}\nExtension ID: ${response.extensionId}`,
        "success",
      );
    } else {
      showResult("sw-result", "❌ Service worker test failed:\n" + (response?.error || "No response"), "error");
    }
  } catch (error) {
    showResult("sw-result", "❌ Error testing service worker:\n" + error.message, "error");
  }
}

async function getDNRStats() {
  try {
    showResult("sw-result", "Getting DNR statistics...", "info");

    const response = await chrome.runtime.sendMessage({ action: "get_dnr_stats" });

    if (response && response.success) {
      const data = response.data;
      let message = "📈 DNR Statistics:\n\n";

      if (data.dnrStats) {
        message += `Last Update: ${new Date(data.dnrStats.lastUpdate).toLocaleString()}\n`;
        message += `Rules Count: ${data.dnrStats.rulesCount}\n`;
        message += `Hostnames: ${data.dnrStats.hostnames.join(", ") || "None"}\n`;
        message += `UA String: ${data.dnrStats.uaString.substring(0, 80)}...\n\n`;
      } else {
        message += "No DNR stats available\n\n";
      }

      if (data.dnrError) {
        message += `❌ Last Error: ${new Date(data.dnrError.timestamp).toLocaleString()}\n`;
        message += `Error: ${data.dnrError.error}`;
      }

      showResult("sw-result", message, data.dnrError ? "warning" : "success");
    } else {
      showResult("sw-result", "❌ Failed to get DNR stats:\n" + (response?.error || "Unknown error"), "error");
    }
  } catch (error) {
    showResult("sw-result", "❌ Error getting DNR stats:\n" + error.message, "error");
  }
}

async function testRaceCondition() {
  try {
    showResult("race-result", "Testing DNR race condition protection...", "info");

    // Fire multiple concurrent requests to test race condition protection
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(chrome.runtime.sendMessage({ action: "force_dnr_update" }));
    }

    const results = await Promise.allSettled(promises);

    let successCount = 0;
    let message = "DNR race condition test results:\n\n";

    results.forEach((result, index) => {
      if (result.status === "fulfilled" && result.value?.success) {
        successCount++;
        message += `Request ${index + 1}: ✅ Success\n`;
      } else {
        message += `Request ${index + 1}: ❌ ${result.reason || result.value?.error || "Failed"}\n`;
      }
    });

    message += `\n${successCount}/${results.length} requests succeeded`;

    if (successCount > 0) {
      showResult("race-result", message, "success");
    } else {
      showResult("race-result", message, "error");
    }
  } catch (error) {
    showResult("race-result", "❌ Error testing DNR race condition:\n" + error.message, "error");
  }
}

async function testContentScriptRaceCondition() {
  try {
    showResult("cs-race-result", "Testing content script race condition protection...", "info");

    // Fire multiple concurrent requests to test race condition protection
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(chrome.runtime.sendMessage({ action: "enabled_hostnames_changed" }));
    }

    const results = await Promise.allSettled(promises);

    let successCount = 0;
    let message = "Content script race condition test results:\n\n";

    results.forEach((result, index) => {
      if (result.status === "fulfilled" && result.value?.success !== false) {
        successCount++;
        message += `Request ${index + 1}: ✅ Success\n`;
      } else {
        message += `Request ${index + 1}: ❌ ${result.reason || result.value?.error || "Failed"}\n`;
      }
    });

    message += `\n${successCount}/${results.length} requests succeeded`;

    if (successCount > 0) {
      showResult("cs-race-result", message, "success");
    } else {
      showResult("cs-race-result", message, "error");
    }
  } catch (error) {
    showResult("cs-race-result", "❌ Error testing content script race condition:\n" + error.message, "error");
  }
}

async function runAllTests() {
  try {
    showResult("dnr-result", "Running all tests, please wait...", "info");
    showResult("cs-result", "", "info");
    showResult("sw-result", "", "info");
    showResult("race-result", "", "info");
    showResult("cs-race-result", "", "info");

    // Run each test sequentially
    await testDNRRules();
    await testContentScripts();
    await testServiceWorker();
    await testRaceCondition();
    await testContentScriptRaceCondition();

    showResult("dnr-result", "All tests completed!", "success");
  } catch (error) {
    showResult("dnr-result", "❌ Error running tests:\n" + error.message, "error");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (!chrome || !chrome.runtime) {
    document.body.innerHTML =
      '<div class="container"><h1>❌ Extension Context Required</h1><p>This test page must be opened from within the Chrome Mask for Opera extension context. Please install the extension and access this page through the extension.</p></div>';
    return;
  }

  document.getElementById("test-dnr-rules-btn").addEventListener("click", testDNRRules);
  document.getElementById("force-dnr-update-btn").addEventListener("click", forceDNRUpdate);
  document.getElementById("inspect-dnr-rules-btn").addEventListener("click", inspectDNRRules);
  document.getElementById("test-content-scripts-btn").addEventListener("click", testContentScripts);
  document.getElementById("test-service-worker-btn").addEventListener("click", testServiceWorker);
  document.getElementById("get-dnr-stats-btn").addEventListener("click", getDNRStats);
  document.getElementById("test-dnr-race-btn").addEventListener("click", testRaceCondition);
  document.getElementById("test-cs-race-btn").addEventListener("click", testContentScriptRaceCondition);
  document.getElementById("run-all-tests-btn").addEventListener("click", runAllTests);

  // Auto-run service worker test on page load
  setTimeout(testServiceWorker, 1000);
});
