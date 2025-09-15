import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  TextInput,
  Platform,
} from 'react-native';
import { ExternalLink, Copy, CheckCircle, AlertCircle, ChevronRight } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { ENABLE_GOOGLE_OAUTH } from '../src/flags';

let AuthSession: any;
if (ENABLE_GOOGLE_OAUTH) {
  AuthSession = require('expo-auth-session');
}

export function GmailSetupGuide() {
  const [clientId, setClientId] = useState('');
  const [isValidClientId, setIsValidClientId] = useState(false);
  const redirectUri = ENABLE_GOOGLE_OAUTH ? AuthSession.makeRedirectUri({ scheme: 'kin-app' }) : 'Feature disabled';

  if (!ENABLE_GOOGLE_OAUTH) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Gmail Integration Disabled</Text>
          <Text style={styles.subtitle}>
            Gmail integration is currently disabled in this build.
          </Text>
        </View>
      </View>
    );
  }

  const validateClientId = (id: string) => {
    setClientId(id);
    setIsValidClientId(id.includes('.apps.googleusercontent.com') && id.length > 30);
  };

  const copyToClipboard = async (text: string, label: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Copied!', `${label} copied to clipboard`);
  };

  const openLink = (url: string) => {
    Linking.openURL(url);
  };

  const steps = [
    {
      title: '1. Open Google Cloud Console',
      description: 'Go to the Google Cloud Console to set up OAuth',
      action: () => openLink('https://console.cloud.google.com'),
      actionLabel: 'Open Console',
    },
    {
      title: '2. Create or Select Project',
      description: 'Create a new project or select an existing one',
      info: 'Project name can be anything (e.g., "Kin App")',
    },
    {
      title: '3. Enable Gmail API',
      description: 'Search for "Gmail API" and enable it',
      action: () => openLink('https://console.cloud.google.com/apis/library/gmail.googleapis.com'),
      actionLabel: 'Go to Gmail API',
    },
    {
      title: '4. Create OAuth Credentials',
      description: 'Go to Credentials → Create Credentials → OAuth client ID',
      info: 'Choose "Web application" as the application type',
    },
    {
      title: '5. Configure OAuth Consent Screen',
      description: 'Set up the OAuth consent screen with your app information',
      info: 'For testing, you can use "External" user type and add test users',
    },
    {
      title: '6. Add Redirect URIs',
      description: 'Add the following redirect URI to your OAuth client:',
      copyText: redirectUri,
      info: Platform.OS === 'web' 
        ? 'For web development, also add: http://localhost:19006' 
        : 'This URI is required for the OAuth flow to work',
    },
    {
      title: '7. Copy Client ID',
      description: 'Copy your OAuth 2.0 Client ID from Google Cloud Console',
      info: 'It should look like: 123456789-abcdef.apps.googleusercontent.com',
    },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Gmail Integration Setup</Text>
        <Text style={styles.subtitle}>
          Follow these steps to enable Gmail sync in your app
        </Text>
      </View>

      <View style={styles.warningCard}>
        <AlertCircle size={20} color="#FF9500" />
        <Text style={styles.warningText}>
          Gmail integration requires a Google Cloud project with OAuth 2.0 credentials.
          This is free for development and testing.
        </Text>
      </View>

      <View style={styles.stepsContainer}>
        {steps.map((step, index) => (
          <View key={index} style={styles.stepCard}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepTitle}>{step.title}</Text>
              {step.action && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={step.action}
                >
                  <Text style={styles.actionButtonText}>{step.actionLabel}</Text>
                  <ExternalLink size={14} color="#007AFF" />
                </TouchableOpacity>
              )}
            </View>
            
            <Text style={styles.stepDescription}>{step.description}</Text>
            
            {step.info && (
              <Text style={styles.stepInfo}>{step.info}</Text>
            )}
            
            {step.copyText && (
              <TouchableOpacity
                style={styles.copyContainer}
                onPress={() => copyToClipboard(step.copyText, 'Redirect URI')}
              >
                <Text style={styles.copyText} numberOfLines={1}>
                  {step.copyText}
                </Text>
                <Copy size={16} color="#007AFF" />
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>

      <View style={styles.inputSection}>
        <Text style={styles.inputLabel}>Enter your Google Client ID:</Text>
        <TextInput
          style={[styles.input, isValidClientId && styles.inputValid]}
          value={clientId}
          onChangeText={validateClientId}
          placeholder="your-client-id.apps.googleusercontent.com"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {isValidClientId && (
          <View style={styles.validIndicator}>
            <CheckCircle size={16} color="#34C759" />
            <Text style={styles.validText}>Valid Client ID format</Text>
          </View>
        )}
      </View>

      {isValidClientId && (
        <View style={styles.nextStepsCard}>
          <Text style={styles.nextStepsTitle}>Next Steps:</Text>
          <Text style={styles.nextStepsText}>
            1. Create a .env file in your project root{'\n'}
            2. Add: EXPO_PUBLIC_GOOGLE_CLIENT_ID={clientId}{'\n'}
            3. Restart your development server{'\n'}
            4. Try connecting Gmail again
          </Text>
          <TouchableOpacity
            style={styles.copyEnvButton}
            onPress={() => copyToClipboard(`EXPO_PUBLIC_GOOGLE_CLIENT_ID=${clientId}`, '.env content')}
          >
            <Text style={styles.copyEnvButtonText}>Copy .env Content</Text>
            <Copy size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.helpSection}>
        <Text style={styles.helpTitle}>Need Help?</Text>
        <TouchableOpacity
          style={styles.helpLink}
          onPress={() => openLink('https://developers.google.com/gmail/api/quickstart/js')}
        >
          <Text style={styles.helpLinkText}>Gmail API Documentation</Text>
          <ChevronRight size={16} color="#007AFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.helpLink}
          onPress={() => openLink('https://docs.expo.dev/guides/authentication/#google')}
        >
          <Text style={styles.helpLinkText}>Expo Authentication Guide</Text>
          <ChevronRight size={16} color="#007AFF" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    padding: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  warningCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FFE066',
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginLeft: 12,
  },
  stepsContainer: {
    paddingHorizontal: 24,
  },
  stepCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    flex: 1,
  },
  stepDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  stepInfo: {
    fontSize: 13,
    color: '#999',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionButtonText: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '500',
    marginRight: 4,
  },
  copyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 6,
    padding: 10,
    marginTop: 8,
  },
  copyText: {
    flex: 1,
    fontSize: 12,
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  inputSection: {
    paddingHorizontal: 24,
    marginTop: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  inputValid: {
    borderColor: '#34C759',
  },
  validIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  validText: {
    fontSize: 13,
    color: '#34C759',
    marginLeft: 4,
  },
  nextStepsCard: {
    backgroundColor: '#E8F5E8',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 24,
    marginTop: 16,
  },
  nextStepsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  nextStepsText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 12,
  },
  copyEnvButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#34C759',
    borderRadius: 8,
    padding: 12,
  },
  copyEnvButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginRight: 6,
  },
  helpSection: {
    padding: 24,
    marginTop: 16,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  helpLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  helpLinkText: {
    fontSize: 14,
    color: '#007AFF',
  },
});