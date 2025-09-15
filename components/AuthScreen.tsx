import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Shield, Fingerprint } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';

export function AuthScreen() {
  const { authenticate, isLoading } = useAuth();

  const handleAuthenticate = async () => {
    try {
      const success = await authenticate();
      if (!success) {
        Alert.alert(
          'Authentication Failed',
          'Please try again or use your device passcode.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('[AuthScreen] Authentication error:', error);
      Alert.alert(
        'Authentication Error',
        'An error occurred during authentication. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Shield size={80} color="#007AFF" />
        </View>
        
        <Text style={styles.title}>Kin is Locked</Text>
        <Text style={styles.subtitle}>
          Use Face ID, Touch ID, or your device passcode to unlock
        </Text>
        
        <TouchableOpacity
          style={styles.authenticateButton}
          onPress={handleAuthenticate}
          disabled={isLoading}
        >
          <Fingerprint size={24} color="#FFFFFF" />
          <Text style={styles.authenticateButtonText}>
            {isLoading ? 'Authenticating...' : 'Unlock Kin'}
          </Text>
        </TouchableOpacity>
        
        <Text style={styles.privacyNote}>
          Your data stays secure on this device
        </Text>
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    marginBottom: 32,
    padding: 20,
    backgroundColor: '#E3F2FD',
    borderRadius: 50,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 48,
    lineHeight: 22,
  },
  authenticateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 8,
  },
  authenticateButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  privacyNote: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});