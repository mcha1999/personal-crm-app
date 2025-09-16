import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Shield, Lock, Database, SlidersHorizontal } from 'lucide-react-native';
import { useOnboarding } from '@/contexts/OnboardingContext';

export function PrivacyScreen() {
  const { completeStep } = useOnboarding();

  const handleContinue = () => {
    completeStep('privacy');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Shield size={48} color="#007AFF" />
          </View>
          <Text style={styles.title}>Privacy &amp; Security</Text>
          <Text style={styles.subtitle}>
            Kin is a device-only CRM. Nothing syncs to our servers.
          </Text>
        </View>

        <View style={styles.features}>
          <View style={styles.feature}>
            <Database size={24} color="#34C759" />
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Device-only CRM</Text>
              <Text style={styles.featureDescription}>
                Contacts, meetings, notes, and insights live in an on-device SQLite database — no cloud copies.
              </Text>
            </View>
          </View>

          <View style={styles.feature}>
            <Lock size={24} color="#34C759" />
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Secure keys and tokens</Text>
              <Text style={styles.featureDescription}>
                Kin generates a unique key per device and stores OAuth tokens in SecureStore. Delete the app and the keys go with it.
              </Text>
            </View>
          </View>

          <View style={styles.feature}>
            <SlidersHorizontal size={24} color="#34C759" />
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>You decide what connects</Text>
              <Text style={styles.featureDescription}>
                Enable Google integrations only when you need them. Reset or export everything from Settings in seconds.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.explanation}>
          <Text style={styles.explanationTitle}>How Kin syncs</Text>
          <Text style={styles.explanationText}>
            When you opt in, Kin talks directly to Google from your device. OAuth tokens stay in SecureStore, and metadata is pr
ocessed locally before being saved to SQLite. You can revoke access or wipe the database any time from Settings.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
          <Text style={styles.continueButtonText}>I Understand</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  features: {
    marginBottom: 32,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  featureText: {
    flex: 1,
    marginLeft: 16,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  explanation: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 32,
  },
  explanationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  explanationText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  footer: {
    padding: 24,
    paddingBottom: 32,
  },
  continueButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});