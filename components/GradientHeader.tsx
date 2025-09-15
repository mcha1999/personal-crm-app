import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ViewStyle, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';

interface GradientHeaderProps {
  title: string;
  subtitle?: string;
  rightComponent?: React.ReactNode;
  style?: ViewStyle;
  colors?: string[];
}

export const GradientHeader: React.FC<GradientHeaderProps> = ({
  title,
  subtitle,
  rightComponent,
  style,
  colors,
}) => {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const gradientColors = colors && colors.length >= 2 
    ? colors 
    : [theme.colors.gradientStart, theme.colors.gradientEnd];

  return (
    <LinearGradient
      colors={gradientColors as [string, string, ...string[]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, { paddingTop: insets.top + theme.spacing.md }, style]}
    >
      <View style={styles.content}>
        <Animated.View
          style={[
            styles.textContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </Animated.View>
        {rightComponent && <View style={styles.rightContainer}>{rightComponent}</View>}
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    ...theme.typography.largeTitle,
    color: 'white',
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    ...theme.typography.subheadline,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  rightContainer: {
    marginLeft: theme.spacing.md,
  },
});