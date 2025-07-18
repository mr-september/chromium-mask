// Test utility to add localhost for development/testing
// This should NOT be included in production builds

(async function addLocalhostForTesting() {
  try {
    // Check if we're in a development environment (localhost is being accessed)
    const tabs = await chrome.tabs.query({active: true, currentWindow: true});
    const currentTab = tabs[0];
    
    if (currentTab && currentTab.url && currentTab.url.includes('localhost')) {
      console.log('Development environment detected, adding localhost to enabled hostnames for testing...');
      
      // Get current storage
      const storage = await chrome.storage.local.get('enabledHostnames');
      const enabledHostnames = new Set(storage.enabledHostnames || []);
      
      // Add localhost if not already present
      if (!enabledHostnames.has('localhost')) {
        enabledHostnames.add('localhost');
        await chrome.storage.local.set({
          enabledHostnames: Array.from(enabledHostnames)
        });
        
        console.log('Added localhost to enabled hostnames for testing');
        
        // Trigger hostname change to update rules
        await chrome.runtime.sendMessage({ action: "enabled_hostnames_changed" });
      }
    }
  } catch (error) {
    console.error('Error in development localhost setup:', error);
  }
})();
