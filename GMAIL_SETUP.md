# Gmail Integration Setup Guide

This guide will help you set up Gmail integration for the Kin app, allowing you to sync email interactions and track communication patterns with your contacts.

## Prerequisites

- A Google account
- Access to Google Cloud Console
- Your app running in development mode

## Setup Steps

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click "Select a project" → "New Project"
3. Enter a project name (e.g., "Kin App")
4. Click "Create"

### 2. Enable Gmail API

1. In the Google Cloud Console, go to "APIs & Services" → "Library"
2. Search for "Gmail API"
3. Click on Gmail API and press "Enable"

### 3. Configure OAuth Consent Screen

1. Go to "APIs & Services" → "OAuth consent screen"
2. Choose "External" user type (for testing)
3. Fill in the required information:
   - App name: Kin
   - User support email: Your email
   - Developer contact: Your email
4. Add scopes:
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/gmail.metadata`
   - `https://www.googleapis.com/auth/userinfo.email`
5. Add test users (your email address)
6. Save and continue

### 4. Create OAuth 2.0 Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Choose "Web application" as the application type
4. Name it "Kin OAuth Client"
5. Add Authorized redirect URIs:
   - For Expo Go: `https://auth.expo.io/@your-username/your-app-slug`
   - For web development: `http://localhost:19006`
   - For production: Your app's custom scheme (e.g., `kin-app://redirect`)
6. Click "Create"
7. Copy the Client ID (it looks like: `123456789-abcdef.apps.googleusercontent.com`)

### 5. Configure Your App

1. Create a `.env` file in your project root:
```bash
cp .env.example .env
```

2. Edit `.env` and add your Client ID:
```
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
```

3. Restart your development server:
```bash
npx expo start --clear
```

### 6. Test Gmail Integration

1. Open the app and go through the onboarding flow
2. When you reach the Gmail Connection step, click "Connect Gmail"
3. You'll be redirected to Google's OAuth consent screen
4. Sign in with your Google account
5. Grant the requested permissions
6. You'll be redirected back to the app

## Troubleshooting

### "Invalid Client ID" Error
- Make sure your Client ID is correctly copied from Google Cloud Console
- Ensure the `.env` file is in the project root
- Restart the development server after adding the Client ID

### "Authorization Error" 
- Check that Gmail API is enabled in your Google Cloud project
- Verify that the redirect URI in Google Cloud Console matches exactly
- For Expo Go, the redirect URI should be: `https://auth.expo.io/@your-expo-username/your-app-slug`

### "Redirect URI Mismatch"
- The redirect URI must match exactly what's configured in Google Cloud Console
- Check the console output for the actual redirect URI being used
- Add all necessary redirect URIs to your OAuth client configuration

### Testing in Expo Go
When using Expo Go, the redirect URI uses Expo's proxy service. Make sure to:
1. Use the correct Expo username in the redirect URI
2. Add the Expo proxy URI to your Google OAuth client

### Production Setup
For production apps:
1. Use a custom URL scheme instead of Expo's proxy
2. Update the redirect URI in Google Cloud Console
3. Set up proper app verification with Google
4. Consider implementing server-side token exchange for enhanced security

## Privacy & Security

- All Gmail data is processed locally on the device
- Only email metadata is accessed (sender, recipient, timestamp)
- Email content is never stored or transmitted
- OAuth tokens are stored securely using Expo SecureStore
- No data is sent to external servers

## Additional Resources

- [Gmail API Documentation](https://developers.google.com/gmail/api)
- [Expo Authentication Guide](https://docs.expo.dev/guides/authentication)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)

## Support

If you encounter issues not covered in this guide:
1. Check the app logs for detailed error messages
2. Verify all configuration steps are completed
3. Try the Gmail Setup Guide in the app (available when connection fails)
4. Clear app data and try again