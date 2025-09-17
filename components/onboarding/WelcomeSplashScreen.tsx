import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles } from 'lucide-react-native';
import { useOnboarding } from '@/contexts/OnboardingContext';

export function WelcomeSplashScreen() {
  const { completeStep } = useOnboarding();

  const handleStart = () => {
    completeStep('welcome');
  };

  return (
    <LinearGradient
      colors={['#020617', '#0F172A', '#1E3A8A']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.wrapper}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Sparkles size={40} color="#BFDBFE" />
        </View>
        <Text style={styles.tagline}>One friendly space to nurture every relationship.</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={handleStart}>
          <Text style={styles.primaryButtonText}>Start setup</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  content: {
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(37, 99, 235, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagline: {
    color: '#F8FAFC',
    fontSize: 20,
    lineHeight: 28,
    textAlign: 'center',
    fontWeight: '600',
  },
  primaryButton: {
    width: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#1E40AF',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
