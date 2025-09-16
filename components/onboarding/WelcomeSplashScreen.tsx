import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles, ShieldCheck, CalendarCheck, SlidersHorizontal } from 'lucide-react-native';
import { useOnboarding } from '@/contexts/OnboardingContext';

export function WelcomeSplashScreen() {
  const { completeStep, steps } = useOnboarding();
  const pulse = useRef(new Animated.Value(0)).current;
  const secondaryPulse = useRef(new Animated.Value(0)).current;
  const floatLeft = useRef(new Animated.Value(0)).current;
  const floatRight = useRef(new Animated.Value(0)).current;

  const featureData = useMemo(
    () => [
      {
        id: 'privacy',
        icon: ShieldCheck,
        title: 'Private by default',
        description: 'All relationship data lives in an on-device SQLite database — nothing syncs to our servers.',
      },
      {
        id: 'context',
        icon: CalendarCheck,
        title: 'Automatic context',
        description: 'Kin links contacts, meetings, and email metadata so you always know who you owe and why.',
      },
      {
        id: 'control',
        icon: SlidersHorizontal,
        title: 'You stay in control',
        description: 'Grant permissions step-by-step and adjust them later in Settings whenever you need to.',
      },
    ],
    []
  );

  const featureAnimations = useRef(featureData.map(() => new Animated.Value(0))).current;

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

    const floatLeftAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatLeft, {
          toValue: 1,
          duration: 2800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(floatLeft, {
          toValue: 0,
          duration: 2800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    const floatRightAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatRight, {
          toValue: 1,
          duration: 3200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(floatRight, {
          toValue: 0,
          duration: 3200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    pulseAnimation.start();
    secondaryPulseAnimation.start();
    floatLeftAnimation.start();
    floatRightAnimation.start();

    const featureFade = featureAnimations.map((animation) =>
      Animated.timing(animation, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      })
    );

    Animated.stagger(150, featureFade).start();

    return () => {
      pulseAnimation.stop();
      secondaryPulseAnimation.stop();
      floatLeftAnimation.stop();
      floatRightAnimation.stop();
    };
  }, [
    pulse,
    secondaryPulse,
    floatLeft,
    floatRight,
    featureAnimations,
  ]);

  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1.05] });
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.85] });

  const secondaryPulseScale = secondaryPulse.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.1] });
  const secondaryPulseOpacity = secondaryPulse.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.6] });

  const floatLeftTranslate = floatLeft.interpolate({ inputRange: [0, 1], outputRange: [-6, 6] });
  const floatRightTranslate = floatRight.interpolate({ inputRange: [0, 1], outputRange: [6, -6] });

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

      <Animated.View
        style={[
          styles.floatingCard,
          styles.floatingCardLeft,
          {
            transform: [{ translateY: floatLeftTranslate }],
          },
        ]}
      >
        <Text style={styles.floatingLabel}>Contacts ready</Text>
        <Text style={styles.floatingValue}>1,248 people</Text>
        <Text style={styles.floatingHint}>Matched automatically from your device</Text>
      </Animated.View>

      <Animated.View
        style={[
          styles.floatingCard,
          styles.floatingCardRight,
          {
            transform: [{ translateY: floatRightTranslate }],
          },
        ]}
      >
        <Text style={styles.floatingLabel}>Today&apos;s focus</Text>
        <Text style={styles.floatingValue}>3 follow-ups</Text>
        <Text style={styles.floatingHint}>Emails and meetings you shouldn&apos;t miss</Text>
      </Animated.View>

      <View style={styles.content}>
        <View style={styles.badge}>
          <Sparkles size={16} color="#BFDBFE" />
          <Text style={styles.badgeText}>New user setup • {steps.length} steps</Text>
        </View>

        <Text style={styles.title}>Welcome to Kin</Text>
        <Text style={styles.subtitle}>
          In a couple of minutes you&apos;ll connect contacts, calendar, email, and choose how much history to sync — all on your device.
        </Text>

        <View style={styles.featureList}>
          {featureData.map((feature, index) => {
            const IconComponent = feature.icon;
            const animation = featureAnimations[index];
            return (
              <Animated.View
                key={feature.id}
                style={{
                  opacity: animation,
                  transform: [
                    {
                      translateY: animation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [16, 0],
                      }),
                    },
                  ],
                }}
              >
                <View style={styles.featureItem}>
                  <View style={styles.featureIcon}>
                    <IconComponent size={20} color="#60A5FA" />
                  </View>
                  <View style={styles.featureCopy}>
                    <Text style={styles.featureTitle}>{feature.title}</Text>
                    <Text style={styles.featureDescription}>{feature.description}</Text>
                  </View>
                </View>
              </Animated.View>
            );
          })}
        </View>
      </View>

      <View style={styles.ctaContainer}>
        <TouchableOpacity style={styles.primaryButton} onPress={handleStart}>
          <Text style={styles.primaryButtonText}>Start setup</Text>
        </TouchableOpacity>
        <Text style={styles.helperText}>Takes about 2 minutes</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
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
  floatingCard: {
    position: 'absolute',
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.25)',
    padding: 16,
    borderRadius: 16,
    width: 200,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
  },
  floatingCardLeft: {
    top: 120,
    left: 0,
  },
  floatingCardRight: {
    top: 260,
    right: 0,
  },
  floatingLabel: {
    color: '#CBD5F5',
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  floatingValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  floatingHint: {
    color: 'rgba(226, 232, 240, 0.75)',
    fontSize: 12,
    lineHeight: 18,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    gap: 24,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(37, 99, 235, 0.25)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badgeText: {
    color: '#DBEAFE',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(226, 232, 240, 0.85)',
    lineHeight: 24,
  },
  featureList: {
    gap: 20,
  },
  featureItem: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'flex-start',
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(37, 99, 235, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureCopy: {
    flex: 1,
    gap: 4,
  },
  featureTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '600',
  },
  featureDescription: {
    color: 'rgba(226, 232, 240, 0.85)',
    fontSize: 14,
    lineHeight: 20,
  },
  ctaContainer: {
    gap: 12,
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
  helperText: {
    color: 'rgba(226, 232, 240, 0.65)',
    fontSize: 13,
    textAlign: 'center',
  },
});
