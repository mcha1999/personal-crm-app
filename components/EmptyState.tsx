import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Lottie from 'lottie-react-native';
import { theme } from '@/constants/theme';

interface EmptyStateProps {
  title: string;
  subtitle?: string;
  animationSource?: any;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ 
  title, 
  subtitle,
  animationSource 
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Default animation - inbox empty
  const defaultAnimation = {
    v: "5.5.7",
    fr: 30,
    ip: 0,
    op: 60,
    w: 200,
    h: 200,
    nm: "Empty",
    ddd: 0,
    assets: [],
    layers: [{
      ddd: 0,
      ind: 1,
      ty: 4,
      nm: "Circle",
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: { a: 0, k: 0 },
        p: { a: 0, k: [100, 100, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: { 
          a: 1, 
          k: [
            { t: 0, s: [0, 0, 100], e: [100, 100, 100] },
            { t: 30, s: [100, 100, 100], e: [95, 95, 100] },
            { t: 45, s: [95, 95, 100], e: [100, 100, 100] },
            { t: 60, s: [100, 100, 100] }
          ]
        }
      },
      ao: 0,
      shapes: [{
        ty: "el",
        s: { a: 0, k: [80, 80] },
        p: { a: 0, k: [0, 0] },
        nm: "Ellipse Path 1",
        mn: "ADBE Vector Shape - Ellipse"
      }, {
        ty: "st",
        c: { a: 0, k: [0.4, 0.45, 0.9, 1] },
        o: { a: 0, k: 100 },
        w: { a: 0, k: 3 },
        lc: 2,
        lj: 1,
        ml: 4,
        nm: "Stroke 1",
        mn: "ADBE Vector Graphic - Stroke"
      }],
      ip: 0,
      op: 60,
      st: 0,
      bm: 0
    }]
  };

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <Lottie
        source={animationSource || defaultAnimation}
        autoPlay
        loop
        style={styles.animation}
      />
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  animation: {
    width: 200,
    height: 200,
    marginBottom: theme.spacing.lg,
  },
  title: {
    ...theme.typography.title2,
    color: theme.colors.textSecondary,
    textAlign: 'center' as const,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textLight,
    textAlign: 'center' as const,
    maxWidth: 280,
  },
});