import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { Mail, CheckCircle, XCircle, AlertCircle, ExternalLink, HelpCircle } from 'lucide-react-native';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useRouter } from 'expo-router';

export function GmailConnectionScreen() {
  const { connectGmail, steps, completeStep } = useOnboarding();
  const [isConnecting, setIsConnecting] = useState(false);
  const router = useRouter();
  
  const currentStep = steps.find(step => step.id === 'gmail');
  const isCompleted = currentStep?.completed || false;
  const hasError = !!currentStep?.error;

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      await connectGmail();
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSkip = () => {
    completeStep('gmail', true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={[styles.iconContainer, isCompleted && styles.iconContainerSuccess]}>
            {isCompleted ? (
              <CheckCircle size={48} color="#34C759" />
            ) : hasError ? (
              <XCircle size={48} color="#FF3B30" />
            ) : (
              <Mail size={48} color="#007AFF" />
            )}
          </View>
          <Text style={styles.title}>Gmail Connection</Text>
          <Text style={styles.subtitle}>
            {isCompleted 
              ? 'Gmail connected successfully!'
              : 'Connect your Gmail account for email interaction tracking'
            }
          </Text>
        </View>

        <View style={styles.explanation}>
          <Text style={styles.explanationTitle}>Email Intelligence</Text>
          <Text style={styles.explanationText}>
            Gmail integration helps Kin track your email interactions and build 
            a complete picture of your professional relationships.
          </Text>
          
          <View style={styles.bulletPoint}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>Track email frequency with contacts</Text>
          </View>
          <View style={styles.bulletPoint}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>Identify important conversations</Text>
          </View>
          <View style={styles.bulletPoint}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>Analyze communication patterns</Text>
          </View>
        </View>

        <View style={styles.permissionsCard}>
          <Text style={styles.permissionsTitle}>Requested Permissions</Text>
          <Text style={styles.permissionsText}>
            Kin will request read-only access to your Gmail messages. We only 
            process metadata (sender, recipient, timestamp) and never store 
            email content on our servers.
          </Text>
          
          <View style={styles.scopeItem}>
            <ExternalLink size={16} color="#666" />
            <Text style={styles.scopeText}>gmail.readonly - Read Gmail messages</Text>
          </View>
        </View>

        {hasError && (
          <>
            <View style={styles.errorContainer}>
              <AlertCircle size={20} color="#FF3B30" />
              <Text style={styles.errorText}>{currentStep?.error}</Text>
            </View>
            
            <TouchableOpacity 
              style={styles.helpButton}
              onPress={() => router.push('/gmail-setup')}
            >
              <HelpCircle size={20} color="#007AFF" />
              <Text style={styles.helpButtonText}>View Setup Guide</Text>
            </TouchableOpacity>
          </>
        )}

        {currentStep?.inProgress && (
          <View style={styles.progressContainer}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.progressText}>Connecting to Gmail...</Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        {!isCompleted && (
          <>
            <TouchableOpacity 
              style={[styles.primaryButton, isConnecting && styles.buttonDisabled]} 
              onPress={handleConnect}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Connect Gmail</Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.secondaryButton} 
              onPress={handleSkip}
              disabled={isConnecting}
            >
              <Text style={styles.secondaryButtonText}>Skip for Now</Text>
            </TouchableOpacity>
          </>
        )}
        
        {isCompleted && (
          <TouchableOpacity style={styles.primaryButton} onPress={() => {}}>
            <Text style={styles.primaryButtonText}>Continue</Text>
          </TouchableOpacity>
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
    marginBottom: 24,
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
    marginBottom: 16,
  },
  bulletPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bullet: {
    fontSize: 14,
    color: '#007AFF',
    marginRight: 8,
    marginTop: 2,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  permissionsCard: {
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FFE066',
  },
  permissionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  permissionsText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  scopeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  scopeText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 8,
    fontFamily: 'monospace',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#FF3B30',
    marginLeft: 8,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
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
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  helpButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
    marginLeft: 6,
  },
});