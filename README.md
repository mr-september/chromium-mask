```markdown
<div align="center">

# Chromium Mask

A powerful browser extension that makes your Chromium-based browser appear as mainstream Chrome to websites. Perfect for **Opera**, **Brave**, **Edge**, **Vivaldi**, **Arc**, and other Chromium browsers. Bypass sites that block or don't work properly with alternative browsers while maintaining your preferred browsing experience.

Available on the Chrome Web Store for all Chromium browsers!

[![GitHub release](https://img.shields.io/github/release/mr-september/chromium-mask.svg)](https://github.com/mr-september/chromium-mask/releases)
[![GitHub downloads](https://img.shields.io/github/downloads/mr-september/chromium-mask/total.svg)](https://github.com/mr-september/chromium-mask/releases)
[![Extension Version](https://img.shields.io/badge/Extension-v2.0.0-blue.svg)](https://github.com/mr-september/chromium-mask/releases)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-Coming%20Soon-orange.svg)](https://chromewebstore.google.com/)
[![Chromium Compatible](https://img.shields.io/badge/Chromium-Compatible-brightgreen.svg)](https://www.chromium.org/)
```

## 💖 Support FOSS Projects

**My work developing, contributing to, and maintaining open-source software is made possible solely by your donations. Your support is vital to the ongoing development of FOSS solutions.**

<p align="center">
<a href="https://www.paypal.com/donate/?hosted_button_id=WFXL2T42BBCRN">
  <img src="https://raw.githubusercontent.com/mr-september/central_automation_hub/refs/heads/main/bluePayPalbutton.svg" alt="PayPal" height="36">
</a>
<a href="https://ko-fi.com/Q5Q11I49GI">
  <img src="https://ko-fi.com/img/githubbutton_sm.svg" alt="Ko-fi" height="36">
</a>
<a href="https://liberapay.com/mr-september/donate">
  <img src="https://liberapay.com/assets/widgets/donate.svg" alt="Liberapay" height="36">
</a>
<a href="https://nowpayments.io/donation?api_key=5b5fabd5-2c33-4525-99a3-bf27f587780c" target="_blank" rel="noreferrer noopener">
  <img src="https://nowpayments.io/images/embeds/donation-button-black.svg" alt="Crypto donation button by NOWPayments" height="36">
</a>
</p>

### 🌟 Other Ways to Help

⭐ **Star the repository** to show your support  
🐦 **Share** to help others discover Chromium Mask  
📝 **Write reviews** and share your experience  
🎥 **Create content** - tutorials, guides, or showcase videos

</div>

## 🎭 Why Chromium Mask?

Even though browsers like **Opera**, **Brave**, **Edge**, **Vivaldi**, and **Arc** are all built on Chromium (the same foundation as Chrome), many websites still detect these browsers and either block them or provide degraded functionality. This extension solves that problem by making your browser appear as the latest mainstream Chrome.

**Perfect for:**

- 🎨 **AI-powered browsers**: Atlas, Comet, Arc, Sidekick, SigmaOS
- 🛡️ **Privacy-focused browsers**: Brave, DuckDuckGo Browser
- ⚡ **Performance browsers**: Opera, Vivaldi
- 💼 **Enterprise browsers**: Edge, Brave for Work
- 🌐 **Regional browsers**: Any Chromium-based browser

**Key advantages over generic user-agent spoofing extensions:**

- **Always Up-to-Date**: Automatically updates to the latest Chrome version every 24 hours by querying an official API
- **Smart OS Detection**: Automatically matches your operating system (Windows, macOS, Linux)
- **Linux Platform Flexibility**: On Linux, optionally spoof as Windows Chrome to bypass Linux-specific blocks
- **Complete Spoofing**: Modifies both HTTP headers and JavaScript properties for comprehensive masking
- **Modern Client Hints**: Supports Chrome's User-Agent Client Hints for advanced compatibility
- **Per-Site Control**: Enable/disable spoofing on a per-website basis
- **Lightweight**: Minimal performance impact using modern extension APIs
- **Universal Compatibility**: Works on any Chromium-based browser

## ✅ Release Status

**Current Version:** 2.0.0 (Rebranded & Cross-Browser Compatible)

The extension has been successfully rebranded and enhanced with cross-browser compatibility features:

- ✅ **Rebranding Complete**: Fully rebranded from "Chrome Mask for Opera" to "Chromium Mask"
- ✅ **Cross-Browser Features**: Intelligent browser detection for Opera, Brave, Edge, Vivaldi, Arc, and more
- ✅ **Build System**: Builds successfully with no errors, outputs `chromium-mask.zip`
- ✅ **Cross-Browser Testing**: Tested in Opera, Brave, Edge, Chrome, and Vivaldi - all working perfectly
- ✅ **Functional Testing**: All features verified on real websites
- ✅ **Localization**: All 14 languages tested and displaying correctly
- ✅ **Documentation**: Consolidated to single source of truth (`REMAINING_TASKS.md`)
- ✅ **Code Quality**: Formatted, linted, and ready for production

**Status**: 🚀 **Production-ready! v2.0.0 tagged and ready for Chrome Web Store submission.**

See `REMAINING_TASKS.md` for remaining pre-submission tasks (screenshots, store account setup).

---

## 🚀 Installation

### From Chrome Web Store (Recommended)

_Coming soon - extension is currently being prepared for submission_

Once published, install directly from the Chrome Web Store to get automatic updates.

### Manual Installation (Developer Mode)

Works on **any Chromium browser**: Opera, Brave, Edge, Vivaldi, Arc, and more!

1. Download and unzip the latest release from the [Releases page](https://github.com/mr-september/chromium-mask/releases)
2. Open your browser's extensions page:
   - **Opera**: `opera://extensions/`
   - **Brave**: `brave://extensions/`
   - **Edge**: `edge://extensions/`
   - **Vivaldi**: `vivaldi://extensions/`
   - **Chrome**: `chrome://extensions/`
3. Enable "Developer mode" (usually a toggle in the top right corner)
4. Click "Load unpacked" and select the unzipped extension folder

## 📖 How to Use

### Basic Usage

1. **Navigate to a website** that doesn't work well with your browser
2. **Click the extension icon** in the toolbar
3. **Toggle the switch** to enable Chrome masking for that site
4. **(Hard) Reload the page** (Ctrl+F5 or Cmd+Shift+R) to see the changes take effect

### Platform Configuration (Linux Users)

- **Access Platform Settings**: Right-click extension icon → "Options" → "Linux Platform Settings"
- **Windows Spoofing**: Toggle "Spoof as Windows instead of Linux" if sites block Linux browsers
- **Automatic Application**: Setting applies to all sites where masking is enabled
- **Immediate Effect**: Changes take effect after reloading affected pages

### Managing Sites

- **Popup Interface**: Quick toggle for the current site
- **Options Page**: Manage all enabled sites in one place
  - Access via right-click on extension icon → "Options"
  - Add/remove sites without visiting them
  - Bulk management for multiple domains
- **Linux Platform Settings**: Configure Windows vs Linux Chrome spoofing (Linux only)

### Status Indicators

- **Green badge**: Chrome masking is active on the current site
- **Gray badge**: Chrome masking is disabled on the current site
- **Tooltip**: Hover over the icon to see the current status

### Platform-Specific Features

- **Linux Users**: Option to spoof as Windows Chrome instead of Linux Chrome
  - Some websites specifically block Linux browsers
  - Toggle this setting in the Options page
  - Affects all sites where masking is enabled

## 🔧 Technical Details

### What Gets Spoofed

- **HTTP Headers**:
  - `User-Agent` header in all requests
  - Chrome User-Agent Client Hints (`sec-ch-ua-*` headers)
- **JavaScript Properties**:
  - `navigator.userAgent`
  - `navigator.userAgentData` (including high-entropy values)
  - `navigator.vendor` → "Google Inc."
  - `navigator.appVersion`
  - `window.chrome` object (comprehensive Chrome APIs structure)
- **Platform Detection**: Automatically adapts to your OS or optionally spoofs as Windows on Linux

### What This Extension Does NOT Do

- **Web Platform APIs**: Does not shim Chrome-specific APIs that don't exist in your browser
- **Canvas/WebGL**: Does not modify fingerprinting beyond basic navigator properties
- **Performance**: Does not affect page loading speed or your browser's performance

## 🛠️ Troubleshooting

### Common Issues

**Q: The extension icon shows as active but the site still detects my browser**

- **A**: Some sites use advanced detection methods. Try clearing your browser cache and cookies for that site. If issues persist, open an issue on GitHub and we'll investigate.

**Q: A website stopped working after enabling the mask**

- **A**: Some sites have Chrome-specific code that may not work in all Chromium browsers. Disable the mask for that site if issues persist, or try using actual Chrome for that specific site.

**Q: The extension doesn't work on certain pages**

- **A**: Extensions cannot run on internal browser pages (opera://, brave://, edge://, etc.) or certain restricted domains. This is a browser security limitation.

**Q: How do I know if it's working?**

- **A**: Visit [whatismybrowser.com](https://www.whatismybrowser.com/detect/what-is-my-user-agent) with the mask enabled to verify your user agent appears as Chrome.

**Q: Should I enable "Spoof as Windows" on Linux?**

- **A**: Enable this if you encounter sites that specifically block Linux browsers. Many streaming services and enterprise sites have better compatibility when appearing as Windows.

### Advanced Troubleshooting

1. **Check Console**: Open Developer Tools (F12) and look for any JavaScript errors
2. **Verify Headers**: Use the Network tab to confirm User-Agent headers are being modified
3. **Test Different Sites**: Try enabling the mask on a simple site first to verify basic functionality

## 🔒 Privacy & Security

### Data Collection

- **No Personal Data**: This extension does not collect or store any personal information
- **No Tracking**: No analytics, cookies, or user behavior tracking
- **Local Storage**: Site preferences are stored locally on your device only

### Network Requests

- **Version Updates**: Connects to `https://raw.githubusercontent.com/mr-september/central_automation_hub/main/current-chrome-version.txt` once daily to fetch current Chrome version
- **No User Data**: Only the Chrome version number is downloaded, no user data is sent
- **Secure Connection**: All requests use HTTPS encryption

### Permissions Explained

- **Storage**: Save your site preferences and platform settings locally
- **Tabs**: Access current tab information for per-site toggling
- **Host Permissions**: Modify headers and inject scripts on websites you choose
- **Declarative Net Request**: Efficiently modify HTTP headers for enabled sites
- **Scripting**: Inject JavaScript spoofing code into web pages
- **Alarms**: Schedule automatic Chrome version updates

## 🌍 Supported Languages

The extension interface is available in 14 languages:

- English
- Simplified Chinese (简体中文)
- Traditional Chinese (繁體中文)
- Hindi (हिन्दी)
- Russian (Русский)
- Japanese (日本語)
- French (Français)
- German (Deutsch)
- Malay (Bahasa Melayu)
- Turkish (Türkçe)
- Korean (한국어)
- Italian (Italiano)
- Tamil (தமிழ்)
- Polish (Polski)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues, feature requests, or pull requests.

### Development Setup

```bash
# Install dependencies
npm install

# Build for production/distribution
npm run build

# Run code formatting
npm run lint

# Check code formatting
npm run lint-check
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Credits

Based on the original ["Chrome Mask for Firefox" extension by Dennis Schubert](https://github.com/denschub/chrome-mask). Reworked from the ground up for Chromium browsers targeting Manifest V3 APIs and enhanced functionality.

---

**Note**: This extension is designed to help with website compatibility issues across all Chromium browsers. Use responsibly and respect websites' terms of service.

## Star History

<div align="center">
  <a href="https://www.star-history.com/#mr-september/chromium-mask&Date">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=mr-september/chromium-mask&type=Date&theme=dark" />
    <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=mr-september/chromium-mask&type=Date" />
    <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=mr-september/chromium-mask&type=Date" />
  </picture>
  </a>
</div>
````
