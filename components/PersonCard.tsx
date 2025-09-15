import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Animated } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Person } from '@/models/Person';
import { PersonScore } from '@/models/PersonScore';
import { theme } from '@/constants/theme';

interface PersonCardProps {
  person: Person;
  score?: PersonScore;
  onPress?: () => void;
}

export const PersonCard: React.FC<PersonCardProps> = ({ person, score, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
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
  const getRelationshipColor = () => {
    switch (person.relationship) {
      case 'family': return theme.colors.secondary;
      case 'friend': return theme.colors.accent;
      case 'colleague': return theme.colors.primary;
      default: return theme.colors.textSecondary;
    }
  };

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const formatLastInteraction = () => {
    if (!person.lastInteraction) return 'Never';
    const days = Math.floor((new Date().getTime() - person.lastInteraction.getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return `${Math.floor(days / 30)} months ago`;
  };

  const getCadenceProgress = () => {
    if (!person.cadence || !person.lastInteraction) return 0;
    const daysSinceInteraction = Math.floor(
      (new Date().getTime() - person.lastInteraction.getTime()) / (1000 * 60 * 60 * 24)
    );
    const progress = Math.max(0, Math.min(1, 1 - daysSinceInteraction / person.cadence));
    return progress;
  };

  const progress = getCadenceProgress();
  const strokeWidth = 3;
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <TouchableOpacity 
      onPress={onPress} 
      activeOpacity={1}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View style={[
        styles.container,
        { 
          transform: [{ scale: scaleAnim }, { translateY: slideAnim }],
          opacity: fadeAnim,
        }
      ]}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          {person.avatar && person.avatar.trim() !== '' ? (
            <Image 
              source={{ uri: person.avatar }} 
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarInitials}>
                {person.firstName.charAt(0).toUpperCase()}
                {person.lastName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          {person.cadence && (
            <Svg
              style={styles.progressRing}
              width={70}
              height={70}
            >
              <Circle
                cx="35"
                cy="35"
                r={radius}
                stroke={theme.colors.border}
                strokeWidth={strokeWidth}
                fill="none"
              />
              <Circle
                cx="35"
                cy="35"
                r={radius}
                stroke={progress > 0.3 ? theme.colors.success : theme.colors.error}
                strokeWidth={strokeWidth}
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                transform="rotate(-90 35 35)"
              />
            </Svg>
          )}
        </View>
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>
              {person.firstName} {person.lastName}
            </Text>
            {score && (
              <View style={[styles.scoreBadge, { opacity: score.relationshipScore / 100 }]}>
                <Text style={styles.scoreText}>{score.relationshipScore}</Text>
              </View>
            )}
          </View>
          {person.nickname && (
            <Text style={styles.nickname}>"{person.nickname}"</Text>
          )}
          <View style={styles.relationshipRow}>
            <View style={[styles.relationshipBadge, { backgroundColor: getRelationshipColor() }]}>
              <Text style={styles.relationshipText}>{person.relationship}</Text>
            </View>
            <Text style={styles.lastInteraction}>{formatLastInteraction()}</Text>
          </View>
        </View>
      </View>
      
      {person.tags.length > 0 && (
        <View style={styles.tags}>
          {person.tags.slice(0, 3).map((tag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>#{tag}</Text>
            </View>
          ))}
        </View>
      )}
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.md,
    marginHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.sm,
    ...theme.shadows.md,
    borderWidth: 1,
    borderColor: theme.colors.border + '20',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 70,
    height: 70,
    marginRight: theme.spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    position: 'absolute' as const,
  },
  avatarPlaceholder: {
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold' as const,
  },
  progressRing: {
    position: 'absolute' as const,
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    ...theme.typography.headline,
    color: theme.colors.text,
  },
  nickname: {
    ...theme.typography.footnote,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  relationshipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  relationshipBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 3,
    borderRadius: theme.borderRadius.full,
  },
  relationshipText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600' as const,
  },
  lastInteraction: {
    ...theme.typography.caption,
    color: theme.colors.textLight,
  },
  scoreBadge: {
    backgroundColor: theme.colors.accent,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold' as const,
  },
  tags: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 6,
  },
  tag: {
    backgroundColor: `${theme.colors.primary}15`,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
  },
  tagText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '500' as const,
  },
});