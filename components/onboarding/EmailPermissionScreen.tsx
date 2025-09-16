import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Mail, CheckCircle, Zap, Server } from 'lucide-react-native';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { router } from 'expo-router';

export function EmailPermissionScreen() {
  const { setEmailMethod, steps } = useOnboarding();
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  
  const currentStep = steps.find(step => step.id === 'email');
  const isCompleted = currentStep?.completed || false;

  const emailMethods = [
    {
      id: 'imap',
      title: 'IMAP Connection',
      description: 'Connect your inbox securely with App Passwords.',
      icon: Server,
      details: 'Kin stores credentials in SecureStore and processes email headers locally. Works with Gmail, Outlook, iCloud, Yahoo, and more.',
      recommended: true,
      hasSetup: true,
    },
    {
      id: 'manual',
      title: 'Manual Logging',
      description: 'Manually log important email interactions.',
      icon: Mail,
      details: 'Perfect if you want to start private and only log key messages when they matter.',
    },
    {
      id: 'shortcuts',
      title: 'iOS Shortcuts Integration',
      description: 'Use iOS Shortcuts to extract email data automatically.',
      icon: Zap,
      details: 'Set up custom automations to capture email metadata on-device (templates coming soon).',
      comingSoon: true,
    },
  ];

  const handleMethodSelect = (methodId: string) => {
    setSelectedMethod(methodId);
    
    // If IMAP is selected, navigate to setup immediately
    if (methodId === 'imap') {
      router.push('/email-setup');
    }
  };

  const handleContinue = async () => {
    if (selectedMethod && (selectedMethod === 'manual' || selectedMethod === 'shortcuts' || selectedMethod === 'imap')) {
      await setEmailMethod(selectedMethod);
    }
  };

  const handleSkip = async () => {
    // Skip email tracking entirely
    await setEmailMethod('manual'); // Set to manual but mark as skipped in preferences
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={[styles.iconContainer, isCompleted && styles.iconContainerSuccess]}>
            {isCompleted ? (
              <CheckCircle size={48} color="#34C759" />
            ) : (
              <Mail size={48} color="#007AFF" />
            )}
          </View>
          <Text style={styles.title}>Email Intelligence</Text>
          <Text style={styles.subtitle}>
            {isCompleted
              ? 'Email tracking configured!'
              : 'Decide how Kin should learn from your email interactions.'
            }
          </Text>
        </View>

        <View style={styles.explanation}>
          <Text style={styles.explanationTitle}>On-device email intelligence</Text>
          <Text style={styles.explanationText}>
            Connect with secure App Passwords to let Kin analyze headers and metadata locally. Everything is processed on this device and saved to encrypted SQLite.
          </Text>
        </View>

        <View style={styles.privacyCard}>
          <CheckCircle size={20} color="#34C759" />
          <View style={styles.privacyContent}>
            <Text style={styles.privacyTitle}>Credentials stay in SecureStore</Text>
            <Text style={styles.privacyText}>
              IMAP settings and tokens are stored with SecureStore. Remove Kin and the credentials disappear with it.
            </Text>
          </View>
        </View>

        <View style={styles.methodsContainer}>
          <Text style={styles.methodsTitle}>Choose Your Method</Text>
          
          {emailMethods.map((method) => {
            const IconComponent = method.icon;
            const isSelected = selectedMethod === method.id;
            
            return (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.methodCard,
                  isSelected && styles.methodCardSelected,
                  method.comingSoon && styles.methodCardDisabled,
                ]}
                onPress={() => !method.comingSoon && handleMethodSelect(method.id)}
                disabled={method.comingSoon}
              >
                <View style={styles.methodHeader}>
                  <View style={styles.methodIconContainer}>
                    <IconComponent 
                      size={24} 
                      color={method.comingSoon ? '#999' : isSelected ? '#007AFF' : '#666'} 
                    />
                  </View>
                  <View style={styles.methodInfo}>
                    <View style={styles.methodTitleRow}>
                      <Text style={[
                        styles.methodTitle,
                        method.comingSoon && styles.methodTitleDisabled,
                        isSelected && styles.methodTitleSelected,
                      ]}>
                        {method.title}
                      </Text>
                      {method.recommended && (
                        <View style={styles.recommendedBadge}>
                          <Text style={styles.recommendedText}>Recommended</Text>
                        </View>
                      )}
                      {method.comingSoon && (
                        <View style={styles.comingSoonBadge}>
                          <Text style={styles.comingSoonText}>Coming Soon</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[
                      styles.methodDescription,
                      method.comingSoon && styles.methodDescriptionDisabled,
                    ]}>
                      {method.description}
                    </Text>
                    <Text style={[
                      styles.methodDetails,
                      method.comingSoon && styles.methodDetailsDisabled,
                    ]}>
                      {method.details}
                    </Text>
                  </View>
                </View>
                
                {isSelected && (
                  <View style={styles.selectedIndicator}>
                    <CheckCircle size={20} color="#007AFF" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {!isCompleted && (
          <>
            {selectedMethod !== 'imap' && (
              <TouchableOpacity 
                style={[
                  styles.primaryButton,
                  !selectedMethod && styles.buttonDisabled,
                ]} 
                onPress={handleContinue}
                disabled={!selectedMethod}
              >
                <Text style={styles.primaryButtonText}>Continue</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleSkip}
            >
              <Text style={styles.secondaryButtonText}>Skip for now (configure later)</Text>
            </TouchableOpacity>
          </>
        )}
        
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
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
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
  iconContainerSuccess: {
    backgroundColor: '#E8F5E8',
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
    paddingHorizontal: 16,
  },
  explanation: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
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
  privacyCard: {
    flexDirection: 'row',
    backgroundColor: '#E8F5E8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#B8E6B8',
  },
  privacyContent: {
    flex: 1,
    marginLeft: 12,
  },
  privacyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  privacyText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  methodsContainer: {
    marginBottom: 32,
  },
  methodsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  methodCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  methodCardSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  methodCardDisabled: {
    backgroundColor: '#F5F5F5',
    opacity: 0.6,
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  methodIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  methodInfo: {
    flex: 1,
  },
  methodTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  methodTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginRight: 8,
  },
  methodTitleSelected: {
    color: '#007AFF',
  },
  methodTitleDisabled: {
    color: '#999',
  },
  recommendedBadge: {
    backgroundColor: '#34C759',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  recommendedText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  comingSoonBadge: {
    backgroundColor: '#FF9500',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  comingSoonText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  methodDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  methodDescriptionDisabled: {
    color: '#999',
  },
  methodDetails: {
    fontSize: 12,
    color: '#888',
    lineHeight: 16,
  },
  methodDetailsDisabled: {
    color: '#BBB',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  footer: {
    padding: 24,
    paddingBottom: 32,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});