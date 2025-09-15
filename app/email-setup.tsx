import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Mail, Server, Lock, HelpCircle, X } from 'lucide-react-native';

interface EmailProvider {
  name: string;
  host: string;
  port: number;
  tls: boolean;
  icon: string;
}

const EMAIL_PROVIDERS: EmailProvider[] = [
  { name: 'Gmail', host: 'imap.gmail.com', port: 993, tls: true, icon: '📧' },
  { name: 'Outlook', host: 'outlook.office365.com', port: 993, tls: true, icon: '📮' },
  { name: 'iCloud', host: 'imap.mail.me.com', port: 993, tls: true, icon: '☁️' },
  { name: 'Yahoo', host: 'imap.mail.yahoo.com', port: 993, tls: true, icon: '💌' },
  { name: 'Custom', host: '', port: 993, tls: true, icon: '⚙️' },
];

export default function EmailAccountSetupScreen() {
  const [selectedProvider, setSelectedProvider] = useState<EmailProvider | null>(null);
  const [email, setEmail] = useState<string>('');
  const [appPassword, setAppPassword] = useState<string>('');
  const [host, setHost] = useState<string>('');
  const [port, setPort] = useState<string>('993');
  const [tls, setTls] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleProviderSelect = (provider: EmailProvider) => {
    setSelectedProvider(provider);
    setHost(provider.host);
    setPort(provider.port.toString());
    setTls(provider.tls);
  };

  const handleSave = async () => {
    if (!email || !appPassword || !host || !port) {
      Alert.alert('Missing Information', 'Please fill in all required fields.');
      return;
    }

    setIsLoading(true);
    try {
      const emailConfig = {
        email,
        appPassword,
        host,
        port: parseInt(port),
        tls,
        provider: selectedProvider?.name || 'Custom',
        createdAt: new Date().toISOString(),
      };

      await SecureStore.setItemAsync('email_config', JSON.stringify(emailConfig));
      
      Alert.alert(
        'Account Saved',
        'Account saved locally. IMAP sync will run in background.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Failed to save email config:', error);
      Alert.alert('Error', 'Failed to save email configuration. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const showAppPasswordHelp = () => {
    Alert.alert(
      'What is an App Password?',
      'An App Password is a special password that allows third-party apps to access your email account securely. It\'s different from your regular login password.\n\n• Gmail: Go to Google Account settings > Security > 2-Step Verification > App passwords\n• Outlook: Go to Microsoft Account > Security > Advanced security options > App passwords\n• iCloud: Go to Apple ID settings > Sign-In and Security > App-Specific Passwords',
      [{ text: 'Got it' }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <X size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Email Setup</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Choose Email Provider</Text>
        <View style={styles.providersContainer}>
          {EMAIL_PROVIDERS.map((provider) => (
            <TouchableOpacity
              key={provider.name}
              style={[
                styles.providerCard,
                selectedProvider?.name === provider.name && styles.selectedProvider,
              ]}
              onPress={() => handleProviderSelect(provider)}
            >
              <Text style={styles.providerIcon}>{provider.icon}</Text>
              <Text style={styles.providerName}>{provider.name}</Text>
              {provider.host && (
                <Text style={styles.providerHint}>
                  {provider.host}:{provider.port}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {selectedProvider && (
          <View style={styles.formContainer}>
            <Text style={styles.sectionTitle}>Account Details</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <View style={styles.inputContainer}>
                <Mail size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="your.email@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.inputLabel}>App Password</Text>
                <TouchableOpacity onPress={showAppPasswordHelp}>
                  <HelpCircle size={16} color="#007AFF" />
                </TouchableOpacity>
              </View>
              <View style={styles.inputContainer}>
                <Lock size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  value={appPassword}
                  onChangeText={setAppPassword}
                  placeholder="App-specific password"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>IMAP Host</Text>
              <View style={styles.inputContainer}>
                <Server size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  value={host}
                  onChangeText={setHost}
                  placeholder="imap.example.com"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.portInput]}>
                <Text style={styles.inputLabel}>Port</Text>
                <TextInput
                  style={styles.portTextInput}
                  value={port}
                  onChangeText={setPort}
                  placeholder="993"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.switchGroup}>
                <Text style={styles.inputLabel}>TLS/SSL</Text>
                <Switch
                  value={tls}
                  onValueChange={setTls}
                  trackColor={{ false: '#E5E5E7', true: '#007AFF' }}
                  thumbColor={tls ? '#FFFFFF' : '#F4F3F4'}
                />
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {selectedProvider && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, styles.testButton]}
            disabled
          >
            <Text style={styles.testButtonText}>Test Connection</Text>
            <Text style={styles.comingSoonText}>(Coming Soon)</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.saveButton]}
            onPress={handleSave}
            disabled={isLoading}
          >
            <Text style={styles.saveButtonText}>
              {isLoading ? 'Saving...' : 'Save Account'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
    marginTop: 24,
    marginBottom: 16,
  },
  providersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  providerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    minWidth: 100,
    flex: 1,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedProvider: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  providerIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  providerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  providerHint: {
    fontSize: 11,
    color: '#666666',
    textAlign: 'center',
  },
  formContainer: {
    marginTop: 8,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E7',
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000000',
  },
  row: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'flex-end',
  },
  portInput: {
    flex: 1,
  },
  portTextInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E7',
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000000',
  },
  switchGroup: {
    alignItems: 'center',
    gap: 8,
  },
  footer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E7',
    gap: 12,
  },
  button: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  testButton: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E5E5E7',
  },
  testButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#999999',
  },
  comingSoonText: {
    fontSize: 12,
    color: '#999999',
    marginTop: 2,
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});