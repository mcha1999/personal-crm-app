import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Animated } from 'react-native';
import { Person } from '@/models/Person';
import { PersonScore } from '@/models/PersonScore';
import { theme } from '@/constants/theme';

interface PersonCardProps {
  person: Person;
  score?: PersonScore;
  onPress?: () => void;
}

export const PersonCard: React.FC<PersonCardProps> = ({ person, score, onPress }) => {
  const scaleAnim = new Animated.Value(1);
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

  return (
    <TouchableOpacity 
      onPress={onPress} 
      activeOpacity={1}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View style={[
        styles.container,
        { transform: [{ scale: scaleAnim }] }
      ]}>
      <View style={styles.header}>
        <Image 
          source={{ uri: person.avatar || 'https://via.placeholder.com/100' }} 
          style={styles.avatar}
        />
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
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.sm,
    ...theme.shadows.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: theme.spacing.md,
    borderWidth: 2,
    borderColor: theme.colors.border,
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