import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles } from 'lucide-react-native';
import { useOnboarding } from '@/contexts/OnboardingContext';

export function WelcomeSplashScreen() {
  const { completeStep } = useOnboarding();
  const pulse = useRef(new Animated.Value(0)).current;
  const secondaryPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    const secondaryPulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(secondaryPulse, {
          toValue: 1,
          duration: 2600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(secondaryPulse, {
          toValue: 0,
          duration: 2600,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    pulseAnimation.start();
    secondaryPulseAnimation.start();

    return () => {
      pulseAnimation.stop();
      secondaryPulseAnimation.stop();
    };
  }, [pulse, secondaryPulse]);

  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1.05] });
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.85] });

  const secondaryPulseScale = secondaryPulse.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.1] });
  const secondaryPulseOpacity = secondaryPulse.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.6] });

  const handleStart = () => {
    completeStep('welcome');
  };

  return (
    <View style={styles.wrapper}>
      <LinearGradient
        colors={['#020617', '#0F172A', '#1E3A8A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      <Animated.View
        style={[
          styles.pulseOrb,
          {
            transform: [{ scale: pulseScale }],
            opacity: pulseOpacity,
          },
        ]}
      />

      <Animated.View
        style={[
          styles.pulseOrbSecondary,
          {
            transform: [{ scale: secondaryPulseScale }],
            opacity: secondaryPulseOpacity,
          },
        ]}
      />

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Sparkles size={40} color="#BFDBFE" />
        </View>
        <Text style={styles.tagline}>Welcome to Kin, your relationships in one place.</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={handleStart}>
          <Text style={styles.primaryButtonText}>Start setup</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseOrb: {
    position: 'absolute',
    top: -40,
    right: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: '#2563EB',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.45,
    shadowRadius: 40,
  },
  pulseOrbSecondary: {
    position: 'absolute',
    top: 180,
    left: -100,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#0EA5E9',
    shadowColor: '#22D3EE',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 32,
  },
  content: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(37, 99, 235, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagline: {
    color: '#F8FAFC',
    fontSize: 18,
    lineHeight: 26,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: '#2563EB',
    borderRadius: 14,
    paddingVertical: 18,
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
