<div align="center">

# Chrome Mask for Opera

A powerful Opera extension that provides a one-click toggle to make Opera appear as Chrome to websites. This extension helps bypass sites that block or don't work properly with Opera, while maintaining the same browsing experience you know and love.

This extension will be available on the Opera Add-ons store once submitted for review.

[![GitHub release](https://img.shields.io/github/release/mr-september/chrome-mask-for-opera.svg)](https://github.com/mr-september/chrome-mask-for-opera/releases)
[![GitHub downloads](https://img.shields.io/github/downloads/mr-september/chrome-mask-for-opera/total.svg)](https://github.com/mr-september/chrome-mask-for-opera/releases)
[![Extension Version](https://img.shields.io/badge/Extension-v1.0.1-blue.svg)](https://github.com/mr-september/chrome-mask-for-opera/releases)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Opera Store](https://img.shields.io/badge/Opera%20Store-Under%20Review-orange.svg)](https://addons.opera.com/)
[![Made for Opera](https://img.shields.io/badge/Made%20for-Opera-red.svg)](https://www.opera.com/)

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
🐦 **Share** to help others discover Chrome Mask for Opera  
📝 **Write reviews** and share your experience  
🎥 **Create content** - tutorials, guides, or showcase videos

</div>

## 🎭 Why Chrome Mask for Opera?

Even though Opera is built on Chromium (the same foundation as Chrome), many websites still detect Opera and either block it or provide degraded functionality. This extension solves that problem by making Opera appear as the latest Chrome browser.

**Key advantages over generic user-agent spoofing extensions:**

- **Always Up-to-Date**: Automatically updates to the latest Chrome version every 24 hours by querying an official API
- **Smart OS Detection**: Automatically matches your operating system (Windows, macOS, Linux)
- **Linux Platform Flexibility**: On Linux, optionally spoof as Windows Chrome to bypass Linux-specific blocks
- **Complete Spoofing**: Modifies both HTTP headers and JavaScript properties for comprehensive masking
- **Modern Client Hints**: Supports Chrome's User-Agent Client Hints for advanced compatibility
- **Per-Site Control**: Enable/disable spoofing on a per-website basis
- **Lightweight**: Minimal performance impact using Opera's modern extension APIs

## 🚀 Installation

### From Opera Add-ons Store (Recommended)

_Coming soon - extension is currently under review_

### Manual Installation (Developer Mode)

1. Download and unzip the latest release from the [Releases page](https://github.com/mr-september/chrome-mask-for-opera/releases)
2. Open Opera and go to `opera://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the unzipped extension folder

## 📖 How to Use

### Basic Usage

1. **Navigate to a website** that doesn't work well with Opera
2. **Click the extension icon** in the toolbar
3. **Toggle the switch** to enable Chrome masking for that site
4. **(Hard) Reload the page** (Ctrl+F5) to see the changes take effect

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

- **Web Platform APIs**: Does not shim Chrome-specific APIs that don't exist in Opera
- **Canvas/WebGL**: Does not modify fingerprinting beyond basic navigator properties
- **Performance**: Does not affect page loading speed or Opera's performance

## 🛠️ Troubleshooting

### Common Issues

**Q: The extension icon shows as active but the site still detects Opera**

- **A**: Some sites use advanced detection methods. If clearing your browser cache and cookies for that site doesn't work, try opening an issue here and we'll have a look.

**Q: A website stopped working after enabling the mask**

- **A**: Some sites have Chrome-specific code that may not work in Opera. Disable the mask for that site if issues persist, and fall back to using the actual Chrome browser.

**Q: The extension doesn't work on certain pages**

- **A**: Extensions cannot run on internal Opera pages (opera://) or certain restricted domains. This is a browser security limitation.

**Q: How do I know if it's working?**

- **A**: Visit [whatismybrowser.com](https://www.whatismybrowser.com/detect/what-is-my-user-agent) with the mask enabled to verify your user agent appears as Chrome.

**Q: Should I enable "Spoof as Windows" on Linux?**

- **A**: Enable this if you encounter sites that specifically block Linux browsers. Many streaming services and some enterprise sites have better Linux compatibility when appearing as Windows.

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

Based on the original ["Chrome Mask for Firefox" extension by Dennis Schubert](https://github.com/denschub/chrome-mask). Reworked from the ground up for Opera targetting Manifest V3 APIs and enhanced functionality.

---

**Note**: This extension is designed to help with website compatibility issues. Use responsibly and respect websites' terms of service.

## Star History

<div align="center">
  <a href="https://www.star-history.com/#mr-september/chrome-mask-for-opera&Date">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=mr-september/chrome-mask-for-opera&type=Date&theme=dark" />
    <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=mr-september/chrome-mask-for-opera&type=Date" />
    <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=mr-september/chrome-mask-for-opera&type=Date" />
  </picture>
  </a>
</div>
