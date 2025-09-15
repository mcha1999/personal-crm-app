import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Animated, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { RefreshCw } from 'lucide-react-native';
import { PersonDAO } from '@/database/PersonDAO';
import { TaskDAO } from '@/database/TaskDAO';
import { PersonScoreDAO } from '@/database/PersonScoreDAO';
import { TaskCard } from '@/components/TaskCard';
import { PersonCard } from '@/components/PersonCard';
import { Person } from '@/models/Person';
import { Task } from '@/models/Task';
import { PersonScore } from '@/models/PersonScore';
import { GradientHeader } from '@/components/GradientHeader';
import { theme } from '@/constants/theme';
import { ScoreJob } from '@/jobs/ScoreJob';
import { BackgroundTaskManager } from '@/services/BackgroundTaskManager';

export const TodayScreen: React.FC = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [manualRefreshing, setManualRefreshing] = useState(false);
  const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([]);
  const [birthdayPeople, setBirthdayPeople] = useState<Person[]>([]);
  const [peopleToReachOut, setPeopleToReachOut] = useState<Person[]>([]);
  const [peopleMap, setPeopleMap] = useState<Map<string, Person>>(new Map());
  const [scoresMap, setScoresMap] = useState<Map<string, PersonScore>>(new Map());
  const fadeAnim = new Animated.Value(0);

  const personDAO = new PersonDAO();
  const taskDAO = new TaskDAO();
  const personScoreDAO = new PersonScoreDAO();

  const loadData = async () => {
    try {
      // Run score computation first
      const scoreJob = ScoreJob.getInstance();
      await scoreJob.run();

      const [tasks, allPeople, allScores] = await Promise.all([
        taskDAO.findAll(),
        personDAO.findAll(),
        personScoreDAO.findAll(),
      ]);

      // Convert DB objects to model objects
      const peopleModels: Person[] = [];
      const tasksModels: Task[] = [];
      
      // Convert people (PersonDAO should return Person objects, not PersonDB)
      for (const person of allPeople) {
        peopleModels.push(person as unknown as Person);
      }
      
      // Convert tasks (TaskDAO should return Task objects, not TaskDB)
      for (const task of tasks) {
        tasksModels.push(task as unknown as Task);
      }

      const personMap = new Map(peopleModels.map(p => [p.id, p]));
      const scoreMap = new Map(allScores.map(s => [s.personId, s]));
      setPeopleMap(personMap);
      setScoresMap(scoreMap);

      // Filter tasks for today and upcoming
      const today = new Date();
      const todayTasks = tasksModels.filter(task => {
        if (!task.dueDate) return false;
        const dueDate = new Date(task.dueDate);
        const diffTime = dueDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 1; // Today and tomorrow
      }).slice(0, 5);
      setUpcomingTasks(todayTasks);

      // Find people with birthdays in next 7 days (simplified - would need birthday field)
      // For now, just show empty array
      setBirthdayPeople([]);

      // Find people we haven't interacted with recently based on scores
      const reachOut = peopleModels
        .filter(p => {
          const score = scoreMap.get(p.id);
          return score && score.lastInteractionDaysAgo > 14;
        })
        .sort((a, b) => {
          const scoreA = scoreMap.get(a.id);
          const scoreB = scoreMap.get(b.id);
          return (scoreB?.relationshipScore || 0) - (scoreA?.relationshipScore || 0);
        })
        .slice(0, 3);
      setPeopleToReachOut(reachOut);
    } catch (error) {
      console.error('[TodayScreen] Failed to load data:', error);
    }
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

  const onManualRefresh = async () => {
    if (manualRefreshing) return;
    
    setManualRefreshing(true);
    try {
      const taskManager = BackgroundTaskManager.getInstance();
      const result = await taskManager.manualRefresh();
      
      // Reload data after background tasks complete
      await loadData();
      
      // Show results
      const gmailSuccess = result.gmailResult.success;
      const scoreSuccess = result.scoreResult.success;
      
      if (gmailSuccess && scoreSuccess) {
        Alert.alert(
          'Refresh Complete',
          `Gmail sync: ${gmailSuccess ? 'Success' : 'Failed'}\nScoring: ${scoreSuccess ? `${result.scoreResult.scoresComputed} contacts updated` : 'Failed'}`,
          [{ text: 'OK' }]
        );
      } else {
        const errors = [];
        if (!gmailSuccess) errors.push(`Gmail: ${result.gmailResult.error || 'Unknown error'}`);
        if (!scoreSuccess) errors.push(`Scoring: ${result.scoreResult.error || 'Unknown error'}`);
        
        Alert.alert(
          'Refresh Completed with Issues',
          errors.join('\n'),
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Manual refresh failed:', error);
      Alert.alert('Refresh Failed', 'Could not complete manual refresh');
    } finally {
      setManualRefreshing(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <GradientHeader
          title={getGreeting()}
          subtitle={new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            month: 'long', 
            day: 'numeric' 
          })}
        />
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={onManualRefresh}
          disabled={manualRefreshing}
          activeOpacity={0.7}
        >
          <RefreshCw 
            size={20} 
            color={manualRefreshing ? '#95A5A6' : '#FFFFFF'} 
            style={[styles.refreshIcon, manualRefreshing && styles.refreshIconSpinning]}
          />
          <Text style={[styles.refreshText, manualRefreshing && styles.refreshTextDisabled]}>
            {manualRefreshing ? 'Refreshing...' : 'Refresh Now'}
          </Text>
        </TouchableOpacity>
      </View>
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

        <Animated.View style={styles.animatedContainer}>
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
                  score={scoresMap.get(person.id)}
                />
              ))}
            </View>
          )}

          {peopleToReachOut.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Stay in Touch</Text>
              <Text style={styles.sectionSubtitle}>You haven&apos;t connected in a while</Text>
              {peopleToReachOut.map(person => (
                <PersonCard
                  key={person.id}
                  person={person}
                  score={scoresMap.get(person.id)}
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
  headerContainer: {
    position: 'relative',
  },
  refreshButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  refreshIcon: {
    marginRight: 6,
  },
  refreshIconSpinning: {
    opacity: 0.6,
  },
  refreshText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  refreshTextDisabled: {
    color: '#95A5A6',
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
  animatedContainer: {
    opacity: 1,
  },
});