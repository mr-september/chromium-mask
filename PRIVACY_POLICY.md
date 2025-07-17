# Privacy Policy for Chrome Mask for Opera

**Last Updated**: July 16, 2025

## Overview

Chrome Mask for Opera is committed to protecting your privacy. This privacy policy explains how our extension handles data and what information, if any, is collected during its use.

## Data Collection

### What We DO NOT Collect
- **Personal Information**: No personal data such as names, email addresses, or user identifiers
- **Browsing History**: No tracking of websites you visit or pages you view
- **Search Queries**: No recording of your search terms or browsing patterns
- **Login Credentials**: No access to usernames, passwords, or authentication data
- **Device Information**: No collection of device specs, installed software, or hardware details
- **Location Data**: No geolocation or IP address logging
- **Analytics**: No usage statistics, crash reports, or behavioral analytics

### What We DO Collect
**Nothing**. This extension operates entirely locally on your device.

## Data Storage

### Local Storage Only
- **Site Preferences**: Your enabled/disabled sites list is stored locally in your Opera browser
- **Settings**: Extension configuration is saved locally using Opera's built-in storage API
- **Cache**: Chrome version information is cached locally for performance
- **No Cloud Storage**: No data is uploaded to external servers or cloud services

### Data Persistence
- All data remains on your device
- Data is automatically removed if you uninstall the extension
- You can clear extension data through Opera's settings at any time

## Network Requests

### Chrome Version Updates
The extension makes a single daily network request to maintain up-to-date Chrome version spoofing:

- **Endpoint**: `chrome-mask-remote-storage.0b101010.services/current-chrome-major-version.txt`
- **Purpose**: Fetch the current Chrome major version number
- **Frequency**: Once every 24 hours (configurable via browser alarms)
- **Data Sent**: No user data or identifiers are transmitted
- **Data Received**: Only a plain text Chrome version number (e.g., "131")
- **Security**: All requests use HTTPS encryption

### Request Details
- **Method**: GET request
- **Headers**: Standard browser headers only, no custom tracking headers
- **Response**: Plain text version number only
- **Logging**: The remote service does not log requests or IP addresses
- **Infrastructure**: Hosted on Cloudflare R2 with no server-side logic

## Third-Party Services

### Cloudflare R2
- **Purpose**: Hosts the Chrome version update file
- **Data Processing**: No user data is processed or stored
- **Privacy**: Subject to Cloudflare's privacy policy for infrastructure only
- **No Tracking**: No analytics, cookies, or tracking mechanisms

## Permissions Explained

The extension requires certain permissions to function:

- **Storage**: Save your site preferences locally
- **Tabs**: Access current tab URL to enable per-site functionality
- **Host Permissions (`<all_urls>`)**: Modify request headers on sites you choose to enable
- **Scripting**: Inject JavaScript to spoof browser properties
- **Alarms**: Schedule automatic Chrome version updates
- **Declarative Net Request**: Modify User-Agent headers in network requests

**Important**: These permissions are used solely for the extension's functionality and never for data collection.

## Data Security

### Local Security
- All data is stored using Opera's secure storage APIs
- No data is transmitted to external parties
- Extension follows Opera's security guidelines and best practices

### Network Security
- Chrome version updates use HTTPS encryption
- No sensitive data is transmitted over the network
- Minimal attack surface due to limited network activity

## User Rights

### Data Control
- **Access**: View your enabled sites through the extension's options page
- **Modify**: Add or remove sites from the enabled list at any time
- **Delete**: Clear all extension data by uninstalling the extension
- **Export**: No data export needed as everything is stored locally

### Transparency
- Source code is available for inspection
- This privacy policy is included with the extension
- No hidden data collection or tracking mechanisms

## Changes to This Policy

### Updates
- Policy changes will be reflected in extension updates
- Users will be notified of significant privacy changes
- Version history maintained in the extension's changelog

### Notification
- Material changes will be highlighted in release notes
- Users can review changes before updating the extension

## Contact Information

For privacy-related questions or concerns:
- **GitHub Issues**: [Create an issue](https://github.com/mr-september/chrome-mask-for-opera/issues)
- **Email**: Contact through GitHub profile

## Compliance

This extension is designed to comply with:
- Opera Add-ons Store policies
- General Data Protection Regulation (GDPR) principles
- California Consumer Privacy Act (CCPA) guidelines
- Browser extension privacy best practices

## Children's Privacy

This extension does not knowingly collect information from children under 13. The extension's functionality is not directed toward children, and no age verification is performed.

## International Users

This extension operates the same way for all users regardless of location. No geographic data collection or region-specific data processing occurs.

---

**Summary**: Chrome Mask for Opera is designed with privacy-first principles. It collects no user data, operates locally, and only makes minimal network requests to maintain functionality. Your browsing habits, personal information, and privacy remain completely protected.
