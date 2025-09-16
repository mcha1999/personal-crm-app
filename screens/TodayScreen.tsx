import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Animated, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { RefreshCw } from 'lucide-react-native';
import { PersonDAO } from '@/database/PersonDAO';
import { TaskDAO } from '@/database/TaskDAO';
import { PersonScoreDAO } from '@/database/PersonScoreDAO';
import { ThreadDAO } from '@/database/ThreadDAO';
import { MessageDAO } from '@/database/MessageDAO';
import { MeetingDAO } from '@/database/MeetingDAO';
import { InteractionDAO } from '@/database/InteractionDAO';
import { TaskCard } from '@/components/TaskCard';
import { PersonCard } from '@/components/PersonCard';
import { ThreadSummaryCard } from '@/components/ThreadSummaryCard';
import { FollowUpTaskCard } from '@/components/FollowUpTaskCard';
import { MeetingPrepCard } from '@/components/MeetingPrepCard';
import { Person } from '@/models/Person';
import { Task } from '@/models/Task';
import { PersonScore } from '@/models/PersonScore';
import { Thread } from '@/models/Thread';
import { Message } from '@/models/Message';
import { Meeting } from '@/models/Meeting';
import { Interaction } from '@/models/Interaction';
import { GradientHeader } from '@/components/GradientHeader';
import { DataSourceBanner } from '@/components/DataSourceBanner';
import { theme } from '@/constants/theme';
import { ScoreJob } from '@/jobs/ScoreJob';
import { BackgroundTaskManager } from '@/services/BackgroundTaskManager';
import { FollowUpService } from '@/services/FollowUpService';

export const TodayScreen: React.FC = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [manualRefreshing, setManualRefreshing] = useState(false);
  const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([]);
  const [followUpTasks, setFollowUpTasks] = useState<Task[]>([]);
  const [birthdayPeople, setBirthdayPeople] = useState<Person[]>([]);
  const [peopleToReachOut, setPeopleToReachOut] = useState<Person[]>([]);
  const [recentThreads, setRecentThreads] = useState<Thread[]>([]);
  const [threadMessages, setThreadMessages] = useState<Map<string, Message[]>>(new Map());
  const [upcomingMeetings, setUpcomingMeetings] = useState<Meeting[]>([]);
  const [meetingAttendees, setMeetingAttendees] = useState<Map<string, Person[]>>(new Map());
  const [meetingInteractions, setMeetingInteractions] = useState<Map<string, Interaction[]>>(new Map());
  const [peopleMap, setPeopleMap] = useState<Map<string, Person>>(new Map());
  const [scoresMap, setScoresMap] = useState<Map<string, PersonScore>>(new Map());
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const personDAO = new PersonDAO();
  const taskDAO = new TaskDAO();
  const personScoreDAO = new PersonScoreDAO();
  const threadDAO = new ThreadDAO();
  const messageDAO = new MessageDAO();
  const meetingDAO = new MeetingDAO();
  const interactionDAO = new InteractionDAO();

  const loadData = async () => {
    try {
      console.log('[TodayScreen] Starting data load...');
      
      // Check if database is available
      if (!personDAO.isAvailable()) {
        console.log('[TodayScreen] Database not available, using empty data');
        setUpcomingTasks([]);
        setFollowUpTasks([]);
        setBirthdayPeople([]);
        setPeopleToReachOut([]);
        setRecentThreads([]);
        setUpcomingMeetings([]);
        return;
      }
      
      // Run score computation and follow-up detection
      try {
        const scoreJob = ScoreJob.getInstance();
        await scoreJob.run();
      } catch (scoreError) {
        console.log('[TodayScreen] Score job failed (non-critical):', scoreError);
      }
      
      // Process threads for follow-ups
      try {
        await FollowUpService.processRecentMessages(24);
      } catch (followUpError) {
        console.log('[TodayScreen] Follow-up processing failed (non-critical):', followUpError);
      }

      const [
        tasks, 
        allPeople, 
        allScores, 
        threads, 
        meetings, 
        interactions
      ] = await Promise.all([
        taskDAO.getAllTasks(),
        personDAO.findAllPersons(),
        personScoreDAO.findAll(),
        threadDAO.findAll(),
        meetingDAO.findUpcoming(),
        interactionDAO.findAll(),
      ]);

      // Convert DB objects to model objects
      const peopleModels: Person[] = [];
      const tasksModels: Task[] = [];
      
      // Convert people
      for (const person of allPeople) {
        peopleModels.push(person as unknown as Person);
      }
      
      // Convert tasks
      for (const task of tasks) {
        tasksModels.push(task as unknown as Task);
      }

      const personMap = new Map(peopleModels.map(p => [p.id, p]));
      const scoreMap = new Map(allScores.map(s => [s.personId, s]));
      setPeopleMap(personMap);
      setScoresMap(scoreMap);

      // Filter tasks for today and upcoming (excluding follow-ups)
      const today = new Date();
      const todayTasks = tasksModels.filter(task => {
        if (task.type === 'follow-up') return false;
        if (!task.dueDate) return false;
        const dueDate = new Date(task.dueDate);
        const diffTime = dueDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 1; // Today and tomorrow
      }).slice(0, 5);
      setUpcomingTasks(todayTasks);

      // Get follow-up tasks separately
      const followUps = await FollowUpService.getFollowUpTasks();
      setFollowUpTasks(followUps.slice(0, 3));

      // Get recent threads with messages
      const recentThreadsList = threads
        .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
        .slice(0, 3);
      setRecentThreads(recentThreadsList);
      
      // Load messages for recent threads
      const messagesMap = new Map<string, Message[]>();
      for (const thread of recentThreadsList) {
        const messages = await messageDAO.findByThread(thread.id);
        messagesMap.set(thread.id, messages);
      }
      setThreadMessages(messagesMap);

      // Get upcoming meetings (next 48 hours)
      const next48Hours = new Date(Date.now() + 48 * 60 * 60 * 1000);
      const upcomingMeetingsList = meetings.filter(meeting => 
        new Date(meeting.date) <= next48Hours
      ).slice(0, 2);
      setUpcomingMeetings(upcomingMeetingsList);
      
      // Load attendees and interactions for meetings
      const attendeesMap = new Map<string, Person[]>();
      const interactionsMap = new Map<string, Interaction[]>();
      
      for (const meeting of upcomingMeetingsList) {
        const attendeeIds = await meetingDAO.getAttendees(meeting.id);
        const attendeesList = attendeeIds
          .map(id => personMap.get(id))
          .filter(Boolean) as Person[];
        attendeesMap.set(meeting.id, attendeesList);
        
        const meetingInteractionsList = interactions
          .filter(interaction => attendeeIds.includes(interaction.personId))
          .map(interaction => interaction as unknown as Interaction);
        interactionsMap.set(meeting.id, meetingInteractionsList);
      }
      
      setMeetingAttendees(attendeesMap);
      setMeetingInteractions(interactionsMap);

      // Find people with birthdays in next 7 days (simplified - would need birthday field)
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
      // Set empty states on error
      setUpcomingTasks([]);
      setFollowUpTasks([]);
      setBirthdayPeople([]);
      setPeopleToReachOut([]);
      setRecentThreads([]);
      setUpcomingMeetings([]);
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
    
    // Start rotation animation
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    ).start();
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
      rotateAnim.stopAnimation();
      rotateAnim.setValue(0);
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
      <GradientHeader
        title={getGreeting()}
        subtitle={new Date().toLocaleDateString('en-US', { 
          weekday: 'long', 
          month: 'long', 
          day: 'numeric' 
        })}
        rightComponent={
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={onManualRefresh}
            disabled={manualRefreshing}
            activeOpacity={0.7}
          >
            <Animated.View
              style={{
                transform: [{
                  rotate: rotateAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '360deg'],
                  }),
                }],
              }}
            >
              <RefreshCw 
                size={20} 
                color={manualRefreshing ? '#95A5A6' : '#FFFFFF'} 
              />
            </Animated.View>
            <Text style={[styles.refreshText, manualRefreshing && styles.refreshTextDisabled]}>
              {manualRefreshing ? 'Syncing' : 'Refresh'}
            </Text>
          </TouchableOpacity>
        }
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
        <DataSourceBanner />
        
        <Animated.View style={styles.animatedContainer}>
          {upcomingMeetings.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Meeting Prep</Text>
              <Text style={styles.sectionSubtitle}>AI-powered insights for upcoming meetings</Text>
              {upcomingMeetings.map(meeting => (
                <MeetingPrepCard
                  key={meeting.id}
                  meeting={meeting}
                  attendees={meetingAttendees.get(meeting.id) || []}
                  interactions={meetingInteractions.get(meeting.id) || []}
                />
              ))}
            </View>
          )}

          {followUpTasks.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>AI Follow-ups</Text>
              <Text style={styles.sectionSubtitle}>Detected from recent conversations</Text>
              {followUpTasks.map(task => (
                <FollowUpTaskCard
                  key={task.id}
                  task={task}
                  person={task.personId ? peopleMap.get(task.personId) : undefined}
                  onComplete={async (taskId) => {
                    await FollowUpService.completeFollowUpTask(taskId);
                    loadData(); // Refresh data
                  }}
                />
              ))}
            </View>
          )}

          {recentThreads.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent Conversations</Text>
              <Text style={styles.sectionSubtitle}>AI summaries of your latest threads</Text>
              {recentThreads.map(thread => {
                const messages = threadMessages.get(thread.id) || [];
                return (
                  <ThreadSummaryCard
                    key={thread.id}
                    thread={thread}
                    messages={messages}
                  />
                );
              })}
            </View>
          )}

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
              <Text style={styles.sectionSubtitle}>You haven't connected in a while</Text>
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

        {upcomingTasks.length === 0 && birthdayPeople.length === 0 && peopleToReachOut.length === 0 && 
         followUpTasks.length === 0 && recentThreads.length === 0 && upcomingMeetings.length === 0 && (
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
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  refreshText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600' as const,
    marginLeft: 6,
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