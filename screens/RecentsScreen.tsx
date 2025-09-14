import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  RefreshControl,
  TouchableOpacity,
  Animated,
  PanResponder,
  Dimensions,
  Image,
} from 'react-native';
import { PersonRepository } from '@/repositories/PersonRepository';
import { InteractionRepository } from '@/repositories/InteractionRepository';
import { Person } from '@/models/Person';
import { PersonScore } from '@/models/PersonScore';
import { mockPersonScores } from '@/repositories/mockData';
import { Clock, CheckCircle, Bell } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { GradientHeader } from '@/components/GradientHeader';
import { ConfettiAnimation } from '@/components/ConfettiAnimation';
import { theme } from '@/constants/theme';

const { width: screenWidth } = Dimensions.get('window');

interface RankedPerson {
  person: Person;
  score: PersonScore;
  lastInteractionText: string;
}

interface SwipeablePersonRowProps {
  person: Person;
  score: PersonScore;
  lastInteractionText: string;
  isTouched: boolean;
  onPress: () => void;
  onMarkTouched: () => void;
  onSnooze: () => void;
}

const SwipeablePersonRow: React.FC<SwipeablePersonRowProps> = ({
  person,
  score,
  lastInteractionText,
  isTouched,
  onPress,
  onMarkTouched,
  onSnooze,
}) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < 0) {
          translateX.setValue(Math.max(gestureState.dx, -200));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -100) {
          // Swipe left - show actions
          Animated.spring(translateX, {
            toValue: -160,
            useNativeDriver: true,
          }).start();
        } else {
          // Reset position
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const handleMarkTouched = () => {
    Animated.timing(translateX, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onMarkTouched();
    });
  };

  const handleSnooze = () => {
    Animated.timing(translateX, {
      toValue: -screenWidth,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onSnooze();
    });
  };

  return (
    <View style={styles.swipeContainer}>
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.touchedButton]}
          onPress={handleMarkTouched}
        >
          <CheckCircle size={24} color="white" />
          <Text style={styles.actionText}>Touched</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.snoozeButton]}
          onPress={handleSnooze}
        >
          <Bell size={24} color="white" />
          <Text style={styles.actionText}>Snooze</Text>
        </TouchableOpacity>
      </View>
      
      <Animated.View
        style={[
          styles.personRow,
          { transform: [{ translateX }] },
          isTouched && styles.touchedRow,
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          style={styles.personContent}
          onPress={onPress}
          activeOpacity={0.7}
        >
          <View style={styles.avatarContainer}>
            {person.avatar ? (
              <Image source={{ uri: person.avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>
                  {person.firstName[0]}{person.lastName[0]}
                </Text>
              </View>
            )}
            {isTouched && (
              <View style={styles.touchedBadge}>
                <CheckCircle size={16} color="white" />
              </View>
            )}
          </View>
          
          <View style={styles.personInfo}>
            <Text style={styles.personName}>
              {person.firstName} {person.lastName}
            </Text>
            <View style={styles.metaRow}>
              <Clock size={14} color="#95A5A6" />
              <Text style={styles.lastInteraction}>{lastInteractionText}</Text>
              <Text style={styles.score}>Score: {score.relationshipScore}</Text>
            </View>
            {person.tags.length > 0 && (
              <View style={styles.tagsRow}>
                {person.tags.slice(0, 3).map(tag => (
                  <View key={tag} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

export const RecentsScreen: React.FC = () => {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [rankedPeople, setRankedPeople] = useState<RankedPerson[]>([]);
  const [markedTouched, setMarkedTouched] = useState<Set<string>>(new Set());
  const [snoozed, setSnoozed] = useState<Set<string>>(new Set());
  const [showConfetti, setShowConfetti] = useState(false);

  const personRepo = new PersonRepository();
  const interactionRepo = new InteractionRepository();

  const loadData = async () => {
    const people = await personRepo.getAllPeople();
    
    // Rank people by interaction score and recency
    const ranked = people
      .map(person => {
        const score = mockPersonScores.find(s => s.personId === person.id);
        if (!score) return null;
        
        const daysAgo = score.lastInteractionDaysAgo;
        let lastInteractionText = '';
        
        if (daysAgo === 0) {
          lastInteractionText = 'Today';
        } else if (daysAgo === 1) {
          lastInteractionText = 'Yesterday';
        } else if (daysAgo < 7) {
          lastInteractionText = `${daysAgo} days ago`;
        } else if (daysAgo < 30) {
          const weeks = Math.floor(daysAgo / 7);
          lastInteractionText = `${weeks} week${weeks > 1 ? 's' : ''} ago`;
        } else {
          const months = Math.floor(daysAgo / 30);
          lastInteractionText = `${months} month${months > 1 ? 's' : ''} ago`;
        }
        
        return {
          person,
          score,
          lastInteractionText,
        };
      })
      .filter((item): item is RankedPerson => item !== null)
      .sort((a, b) => {
        // Sort by days since last interaction (ascending) and relationship score (descending)
        const daysDiff = a.score.lastInteractionDaysAgo - b.score.lastInteractionDaysAgo;
        if (Math.abs(daysDiff) > 3) return daysDiff;
        return b.score.relationshipScore - a.score.relationshipScore;
      });
    
    setRankedPeople(ranked);
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleMarkTouched = (personId: string) => {
    setMarkedTouched(prev => new Set(prev).add(personId));
    setShowConfetti(true);
    // In a real app, this would update the backend
    console.log(`Marked ${personId} as touched`);
  };

  const handleSnooze = (personId: string) => {
    setSnoozed(prev => new Set(prev).add(personId));
    // In a real app, this would update the backend
    console.log(`Snoozed ${personId}`);
  };

  const handlePersonPress = (personId: string) => {
    router.push(`/contact/${personId}`);
  };

  const renderPerson = ({ item }: { item: RankedPerson }) => {
    const { person, score, lastInteractionText } = item;
    const isTouched = markedTouched.has(person.id);
    const isSnoozed = snoozed.has(person.id);
    
    if (isSnoozed) return null;
    
    return (
      <SwipeablePersonRow
        person={person}
        score={score}
        lastInteractionText={lastInteractionText}
        isTouched={isTouched}
        onPress={() => handlePersonPress(person.id)}
        onMarkTouched={() => handleMarkTouched(person.id)}
        onSnooze={() => handleSnooze(person.id)}
      />
    );
  };

  const filteredPeople = rankedPeople.filter(p => !snoozed.has(p.person.id));

  return (
    <View style={styles.container}>
      <GradientHeader
        title="Recents"
        subtitle="Stay connected with everyone"
      />

      <FlatList
        data={filteredPeople}
        renderItem={renderPerson}
        keyExtractor={item => item.person.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No recent contacts</Text>
          </View>
        }
      />
      <ConfettiAnimation 
        isVisible={showConfetti} 
        onComplete={() => setShowConfetti(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  swipeContainer: {
    marginBottom: 1,
    backgroundColor: theme.colors.border,
  },
  actionsContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
  },
  actionButton: {
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  touchedButton: {
    backgroundColor: theme.colors.success,
  },
  snoozeButton: {
    backgroundColor: theme.colors.warning,
  },
  actionText: {
    color: 'white',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600' as const,
  },
  personRow: {
    backgroundColor: theme.colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
  },
  touchedRow: {
    opacity: 0.7,
  },
  personContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600' as const,
  },
  touchedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: theme.colors.success,
    borderRadius: 10,
    padding: 2,
  },
  personInfo: {
    flex: 1,
  },
  personName: {
    ...theme.typography.headline,
    color: theme.colors.text,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  lastInteraction: {
    ...theme.typography.footnote,
    color: theme.colors.textSecondary,
  },
  score: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    marginLeft: 'auto',
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  tag: {
    backgroundColor: `${theme.colors.primary}10`,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
  },
  tagText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
  },
});