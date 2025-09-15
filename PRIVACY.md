# Privacy Policy - Kin Personal CRM

## Device-Only Architecture

Kin Personal CRM is built with privacy as a core principle. **All your personal data stays on your device.** We do not use hosted AI services, cloud backends, or third-party analytics that could access your personal information.

## Data Storage

- **Local Only**: All contacts, interactions, tasks, and personal information are stored locally on your device using SQLite
- **No Cloud Storage**: We do not sync your data to any cloud services or remote servers
- **No Analytics**: We do not collect usage analytics or telemetry data
- **No Tracking**: We do not use tracking pixels, cookies, or other tracking mechanisms

## Google API Integration (Optional)

If you choose to enable Google integration, the app will:

### Gmail API Access
- **Scope**: `https://www.googleapis.com/auth/gmail.readonly`
- **Purpose**: Read email metadata to automatically detect interactions with your contacts
- **Data Processing**: All email analysis happens locally on your device
- **No Data Transmission**: Email content is never sent to external servers

### Google Contacts API Access
- **Scope**: `https://www.googleapis.com/auth/contacts.readonly`
- **Purpose**: Import contact information to populate your local CRM
- **Data Processing**: Contact data is processed and stored locally only
- **No Data Transmission**: Contact information is never sent to external servers

### Google Calendar API Access
- **Scope**: `https://www.googleapis.com/auth/calendar.readonly`
- **Purpose**: Detect meetings and events with your contacts
- **Data Processing**: Calendar data is analyzed locally to identify interactions
- **No Data Transmission**: Calendar information is never sent to external servers

## Authentication

- **OAuth 2.0**: We use Google's OAuth 2.0 for secure authentication
- **Token Storage**: Authentication tokens are stored securely on your device using Expo SecureStore
- **No Server Storage**: We do not store your authentication credentials on any server
- **Revocable Access**: You can revoke access at any time through your Google Account settings

## Data Export

- **Full Control**: You can export all your data at any time in standard formats (JSON, CSV)
- **No Lock-in**: Your data remains accessible even if you stop using the app
- **Local Backup**: All exports are generated locally and saved to your device

## Third-Party Services

**We do not use any third-party services that could access your personal data, including:**
- No hosted AI or machine learning services
- No cloud analytics platforms
- No crash reporting services that transmit personal data
- No advertising networks or tracking services

## Data Deletion

- **Complete Removal**: Uninstalling the app removes all local data
- **Selective Deletion**: You can delete specific contacts, interactions, or data categories at any time
- **No Residual Data**: No personal data remains on external servers after deletion

## Security

- **Local Encryption**: Sensitive data is encrypted using device-level security features
- **Secure Storage**: Authentication tokens use platform-specific secure storage (Keychain on iOS, Keystore on Android)
- **No Network Transmission**: Personal data never leaves your device except for Google API calls you explicitly authorize

## Updates to This Policy

This privacy policy may be updated to reflect changes in the app's functionality. Any changes will:
- Maintain the core principle of device-only data processing
- Be clearly communicated through app updates
- Never compromise your data privacy without explicit consent

## Contact

If you have questions about this privacy policy or data handling practices, please contact us through the app's settings or support channels.

---

**Last Updated**: September 15, 2025
**Version**: 1.0.0

*This privacy policy reflects our commitment to keeping your personal data private and secure on your device.*