# Changelog - Chrome Mask for Opera

## 1.2.1 (Property Redefinition Fix) - July 2025

**🔧 Critical Bug Fixes**

Fixed navigator property redefinition errors that were causing console spam and potential spoofing failures.

### 🐛 Bug Fixes

- **Fixed Property Redefinition Errors**: Resolved "Cannot redefine property" TypeError messages for `userAgent`, `appVersion`, `vendor`, and `userAgentData`
- **Improved Double-Spoofing Protection**: Enhanced checks to prevent multiple spoofing attempts on the same page
- **Better Error Handling**: Suppressed harmless redefinition warnings while preserving legitimate error reporting
- **Property Descriptor Validation**: Added strict validation before attempting to redefine non-configurable navigator properties

### 🛠️ Technical Improvements

- Enhanced property configurability checks using `Object.getOwnPropertyDescriptor()`
- Improved spoofing state management with `__chromeMaskSpoofingApplied` flag
- More robust error filtering to reduce console noise
- Better handling of already-defined navigator properties

## 1.0.1 (Language Pack Update) - July 2025

**🌍 Extended Language Support**

Enhanced international accessibility with 8 new language localizations.

### ✨ New Features

- **Extended Language Support**: Added 8 new languages (Korean, Japanese, Traditional Chinese, Hindi, Tamil, Malay, Russian, Italian)
- **Total Language Count**: Now supports 14 languages total

### 🌐 New Localizations

- **Korean** (한국어) - Complete UI translation
- **Japanese** (日本語) - Complete UI translation
- **Traditional Chinese** (繁體中文) - Complete UI translation
- **Hindi** (हिन्दी) - Complete UI translation
- **Tamil** (தமிழ்) - Complete UI translation
- **Malay** (Bahasa Melayu) - Complete UI translation
- **Russian** (Русский) - Complete UI translation
- **Italian** (Italiano) - Complete UI translation

### 📝 Updated Documentation

- Updated README.md with new language list
- Updated Opera store listing with expanded language support
- Revised changelog to reflect new language count

## 1.0.0 (Initial Opera Release) - July 2025

**🎉 First Official Release for Opera**

This is the initial stable release of Chrome Mask for Opera, providing seamless Chrome compatibility for Opera users.

### ✨ Key Features

- **Opera Native Support**: Built specifically for Opera using Manifest V3 APIs
- **Per-Site Control**: Toggle Chrome masking on individual websites
- **Automatic Updates**: Stay current with the latest Chrome version strings
- **Multi-Language Support**: Available in 14 languages (EN, DE, FR, PL, TR, ZH-CN, ZH-TW, KO, JA, HI, TA, MS, RU, IT)
- **Privacy-First**: No data collection, works entirely offline
- **Cross-Platform**: Windows, Linux, and macOS compatibility

### 🔧 Technical Implementation

- **Manifest V3**: Modern extension architecture with service workers
- **Declarative Net Request**: Efficient header modification
- **JavaScript Spoofing**: Comprehensive navigator object masking
- **Alarm-based Updates**: Reliable background Chrome version synchronization

### 🛠️ Core Functionality

- User-Agent header spoofing for enabled sites
- JavaScript navigator properties modification
- Automatic Chrome version updates via secure API
- Site-specific enable/disable controls
- Visual status indicators
