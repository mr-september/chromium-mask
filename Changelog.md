# Changelog - Chrome Mask for Opera

## 1.5.0 (Per-Site Linux Platform Control) - July 2025

**🚀 Major Feature: Per-Site Linux Platform Spoofing**

Added comprehensive per-site control for Linux users to choose which sites use Windows Chrome spoofing vs Linux Chrome spoofing, replacing the global all-or-nothing approach.

### 🌟 New Features

- **Per-Site Platform Lists**: Linux users can now manage which sites should use Windows spoofing on a site-by-site basis
- **Enhanced Options Page**: New "Linux Platform Settings" section with add/remove site functionality
- **Smart Platform Display**: Popup shows current site's platform identity ("Windows Chrome (spoofed)" vs "Linux Chrome (native)")
- **Visual Status Indicators**: Options page shows which sites have Chrome masking active vs waiting
- **Automatic Migration**: Users with global Linux Windows spoofing enabled get all sites automatically added to the per-site list

### 🎯 Use Case Benefits

- **Streaming Services**: Add Netflix/Hulu to Windows spoofing while keeping YouTube as Linux
- **Development Tools**: Keep GitHub/VS Code Web as Linux for better development experience
- **Banking/Enterprise**: Add banking sites to Windows spoofing while keeping AWS Console as Linux
- **Granular Control**: Choose optimal platform identity per site instead of global all-or-nothing

### 🛠️ Technical Architecture

- **`LinuxWindowsSpoofList`**: New class following established `EnabledHostnamesList` patterns
- **Per-hostname DNR rules**: Each site gets appropriate platform-specific headers dynamically
- **Smart reloading**: Only affected sites reload when platform settings change
- **Backward compatibility**: Legacy global setting still works but marked as deprecated
- **Code unification**: Reuses existing infrastructure and patterns for efficiency

### 📋 Migration & Compatibility

- **Seamless upgrade**: Existing users get identical behavior with new per-site control
- **Legacy support**: Global toggle remains functional but deprecated
- **Zero breaking changes**: All existing functionality preserved
- **Future-ready**: Foundation for additional platform-specific features

## 1.4.1 (Linux Toggle Fix) - July 2025

**🐧 Critical Linux Bug Fix**

Fixed a Linux-specific bug where the Chrome/Opera toggle in the popup would not stay activated, reverting to deactivated state immediately after clicking.

### 🔧 Bug Fixes

- **Fixed Linux Toggle Race Condition**: Resolved timing issues that caused the Linux platform toggle to revert after activation
- **Enhanced UI State Management**: Linux toggle now properly refreshes UI state after changes (consistent with main toggle)
- **Improved Storage Operations**: Added proper sequencing and logging for Linux spoof setting changes
- **Better Error Handling**: Enhanced error recovery and state reversion for failed toggle operations

### 🛠️ Technical Improvements

- Added comprehensive logging for Linux toggle operations
- Implemented small delay to ensure service worker completes processing before UI refresh
- Enhanced service worker message handling with better error responses
- Improved storage operation sequencing in ChromeUAStringManager

### 📋 Affected Platforms

- **Linux**: Primary fix for toggle persistence issue
- **Windows/macOS**: No functional changes, but improved logging and error handling

---

## 1.4.0 (Smart Tab Reload Optimization) - July 2025

**🚀 Performance & User Experience Enhancement**

Implemented intelligent tab reload system that significantly reduces unnecessary tab refreshes while maintaining full spoofing functionality.

### ✨ Key Improvements

- **Smart Tab Reload**: Only reloads specific sites being toggled, not all masked sites
- **Immediate Spoofing Effect**: Sites being enabled get reloaded so spoofing takes effect instantly
- **Graceful Disabling**: Sites being disabled continue without disruption
- **Optimized Linux Spoof**: Platform changes apply to new requests without disrupting current tabs
- **Configurable Reload Behavior**: Advanced users can control when tabs get reloaded
- **Legacy Mode Option**: Advanced users can enable `forceLegacyTabReload` in storage for original behavior if needed

### 🔧 Technical Details

- **Adding Sites**: Automatically reloads only the newly added site so headers update immediately
- **Removing Sites**: No reload needed - sites continue normally without spoofing
- **Linux Platform Toggle**: Headers updated immediately, optional reload via `linuxSpoofReloadAllTabs` setting
- **UA String Changes**: Smart reload only when User-Agent actually changes (version updates)
- **Fallback Behavior**: Maintains legacy reload functionality for critical scenarios
- **Enhanced Logging**: Better debugging information for reload decisions

### 🎯 Benefits

- **Instant Effect**: Toggling a site on immediately applies spoofing (no manual refresh needed)
- **No More Disruption**: Other sites remain untouched when toggling unrelated sites
- **Faster Operations**: Only affected sites reload, others continue uninterrupted
- **Same Functionality**: All spoofing capabilities remain fully intact

### 🔄 Behavior Comparison

| Action                | Old Behavior            | New Behavior                             |
| --------------------- | ----------------------- | ---------------------------------------- |
| Enable site A         | Reload ALL masked sites | Reload only site A                       |
| Disable site A        | Reload ALL masked sites | No reload (graceful)                     |
| Linux spoof toggle    | Reload ALL sites        | No reload (headers update immediately)\* |
| Chrome version update | Always reload           | Reload only if UA changed                |

\*_Set `linuxSpoofReloadAllTabs: true` in storage for immediate reload if needed_

## 1.3.0 (Robust Enhancement) - July 2025

**🚀 Enhanced Robustness & Performance**

Major improvements to extension stability and reliability with comprehensive error handling and enhanced spoofing mechanisms.

### ✨ New Features

- **Enhanced Robustness**: Improved extension stability and error handling
- **Performance Optimizations**: Better resource management and efficiency
- **Comprehensive Testing**: Extensive testing to ensure reliable operation

### 🔧 Improvements

- **Better Error Recovery**: Enhanced error handling throughout the extension
- **Improved Reliability**: More robust spoofing mechanisms
- **Stability Enhancements**: Better handling of edge cases and error conditions

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

## 1.2.0 (Opera Detection Enhancement) - July 2025

**🔒 Enhanced Browser Detection Blocking**

Improved Opera detection blocking for better Chrome masking using Manifest V3 capabilities.

### ✨ New Features

- **Enhanced Opera Detection Blocking**: Improved mechanisms to prevent websites from detecting Opera browser
- **Manifest V3 Optimizations**: Better utilization of Manifest V3 APIs for enhanced blocking
- **Improved Site Compatibility**: Better Chrome masking for sites with advanced browser detection

### 🔧 Technical Improvements

- Enhanced declarative net request rules for Opera detection blocking
- Improved header modification strategies
- Better integration with Manifest V3 service worker architecture

## 1.1.1 (Build System Fix) - July 2025

**🔧 Build & Release Fixes**

Critical fixes to the build system and release process to prevent duplicate files and improve reliability.

### 🐛 Bug Fixes

- **Fixed Duplicate ZIP Files**: Resolved issue causing duplicate ZIP files in releases
- **Improved Build Process**: Enhanced build script reliability and consistency
- **Release Cleanup**: Better management of release artifacts

### 🛠️ Technical Improvements

- Streamlined build pipeline
- Better file management during build process
- Improved release artifact handling

## 1.1.0 (Enhanced Spoofing & Build) - July 2025

**🚀 Major Spoofing Enhancements**

Significant improvements to spoofing capabilities with deep injection, comprehensive headers, and multi-world coverage.

### ✨ New Features

- **Deep Injection Spoofing**: Enhanced spoofing mechanisms with deeper browser integration
- **Comprehensive Header Masking**: More thorough header modification for better Chrome compatibility
- **Multi-World Coverage**: Improved spoofing across different execution contexts
- **Enhanced Build System**: Better build script with version handling and GitHub release integration

### 🔧 Improvements

- **Robust Spoofing Engine**: More comprehensive navigator object masking
- **Enhanced Version Management**: Build script now includes version in filename
- **GitHub Release Integration**: Improved release process with proper version preservation
- **Documentation Updates**: Updated README with enhanced feature descriptions

### 🛠️ Technical Improvements

- Enhanced content script injection strategies
- Improved navigator property spoofing coverage
- Better handling of multiple execution contexts
- Streamlined build and release workflow

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
