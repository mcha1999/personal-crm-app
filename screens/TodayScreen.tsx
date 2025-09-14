import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PersonRepository } from '@/repositories/PersonRepository';
import { TaskRepository } from '@/repositories/TaskRepository';
import { InteractionRepository } from '@/repositories/InteractionRepository';
import { TaskCard } from '@/components/TaskCard';
import { PersonCard } from '@/components/PersonCard';
import { Person } from '@/models/Person';
import { Task } from '@/models/Task';
import { PersonScore } from '@/models/PersonScore';
import { mockPersonScores } from '@/repositories/mockData';
import { GradientHeader } from '@/components/GradientHeader';
import { theme } from '@/constants/theme';

export const TodayScreen: React.FC = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([]);
  const [birthdayPeople, setBirthdayPeople] = useState<Person[]>([]);
  const [peopleToReachOut, setPeopleToReachOut] = useState<Person[]>([]);
  const [peopleMap, setPeopleMap] = useState<Map<string, Person>>(new Map());
  const fadeAnim = new Animated.Value(0);

  const personRepo = new PersonRepository();
  const taskRepo = new TaskRepository();

  const loadData = async () => {
    const [tasks, birthdays, allPeople] = await Promise.all([
      taskRepo.getUpcomingTasks(),
      personRepo.getPeopleWithUpcomingBirthdays(7),
      personRepo.getAllPeople(),
    ]);

    const personMap = new Map(allPeople.map(p => [p.id, p]));
    setPeopleMap(personMap);
    setUpcomingTasks(tasks.slice(0, 5));
    setBirthdayPeople(birthdays);

    // Find people we haven't interacted with recently
    const reachOut = allPeople
      .filter(p => {
        const score = mockPersonScores.find(s => s.personId === p.id);
        return score && score.lastInteractionDaysAgo > 14;
      })
      .slice(0, 3);
    setPeopleToReachOut(reachOut);
  };

  useEffect(() => {
    loadData();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <View style={styles.container}>
      <GradientHeader
        title={getGreeting()}
        subtitle={new Date().toLocaleDateString('en-US', { 
          weekday: 'long', 
          month: 'long', 
          day: 'numeric' 
        })}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >

        <Animated.View style={{ opacity: fadeAnim }}>
          {upcomingTasks.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tasks for Today</Text>
              {upcomingTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  person={task.personId ? peopleMap.get(task.personId) : undefined}
                />
              ))}
            </View>
          )}

          {birthdayPeople.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🎂 Upcoming Birthdays</Text>
              {birthdayPeople.map(person => (
                <PersonCard
                  key={person.id}
                  person={person}
                  score={mockPersonScores.find(s => s.personId === person.id)}
                />
              ))}
            </View>
          )}

          {peopleToReachOut.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Stay in Touch</Text>
              <Text style={styles.sectionSubtitle}>You haven't connected in a while</Text>
              {peopleToReachOut.map(person => (
                <PersonCard
                  key={person.id}
                  person={person}
                  score={mockPersonScores.find(s => s.personId === person.id)}
                />
              ))}
            </View>
          )}
        </Animated.View>

        {upcomingTasks.length === 0 && birthdayPeople.length === 0 && peopleToReachOut.length === 0 && (
          <LinearGradient
            colors={['rgba(99, 102, 241, 0.1)', 'rgba(236, 72, 153, 0.1)']}
            style={styles.emptyState}
          >
            <Text style={styles.emptyStateTitle}>All caught up!</Text>
            <Text style={styles.emptyStateText}>No tasks or reminders for today</Text>
          </LinearGradient>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  section: {
    marginTop: theme.spacing.lg,
  },
  sectionTitle: {
    ...theme.typography.title2,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  sectionSubtitle: {
    ...theme.typography.footnote,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    marginTop: -theme.spacing.sm,
  },
  emptyState: {
    margin: theme.spacing.lg,
    padding: theme.spacing.xxl,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
  },
  emptyStateTitle: {
    ...theme.typography.title2,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  emptyStateText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  bottomPadding: {
    height: 100,
  },
});