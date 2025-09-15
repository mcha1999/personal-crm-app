import AsyncStorage from '@react-native-async-storage/async-storage';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { GmailSync } from './GmailSync';
import { ScoreJob } from '@/jobs/ScoreJob';
import { FollowUpService } from './FollowUpService';

// Task names
const GMAIL_DELTA_SYNC_TASK = 'gmailDeltaSync';
const INDEX_AND_SCORE_TASK = 'indexAndScore';

/**
 * BackgroundTaskManager - Device-Only Architecture
 * 
 * This service manages background tasks while maintaining strict privacy:
 * - All data processing happens locally on the device
 * - No data is sent to external servers or cloud services
 * - Google API calls are made directly from the device only
 * - All analysis and scoring is performed locally
 * 
 * Privacy Compliance:
 * - Gmail API: Read-only access for interaction detection (local processing)
 * - Contacts API: Import contacts for local storage only
 * - Calendar API: Detect meetings for local interaction tracking
 */
export class BackgroundTaskManager {
  private static instance: BackgroundTaskManager;
  private gmailSyncInterval = 4 * 60 * 60 * 1000; // 4 hours (few times per day)
  private indexScoreInterval = 24 * 60 * 60 * 1000; // 24 hours (nightly)
  private lastGmailSync: Date | null = null;
  private lastIndexScore: Date | null = null;
  private isInitialized = false;

  private constructor() {
    this.loadLastRunTimes();
    this.initializeBackgroundTasks();
  }

  static getInstance(): BackgroundTaskManager {
    if (!BackgroundTaskManager.instance) {
      BackgroundTaskManager.instance = new BackgroundTaskManager();
    }
    return BackgroundTaskManager.instance;
  }

  private async loadLastRunTimes() {
    try {
      const gmailSyncTime = await AsyncStorage.getItem('lastGmailSync');
      const indexScoreTime = await AsyncStorage.getItem('lastIndexScore');
      
      if (gmailSyncTime) {
        this.lastGmailSync = new Date(gmailSyncTime);
      }
      if (indexScoreTime) {
        this.lastIndexScore = new Date(indexScoreTime);
      }
    } catch (error) {
      console.error('Failed to load last run times:', error);
    }
  }

  private async saveLastRunTime(key: string, date: Date) {
    try {
      await AsyncStorage.setItem(key, date.toISOString());
    } catch (error) {
      console.error(`Failed to save ${key}:`, error);
    }
  }

  getNextGmailSyncTime(): Date | null {
    if (!this.lastGmailSync) {
      return new Date(Date.now() + this.gmailSyncInterval);
    }
    return new Date(this.lastGmailSync.getTime() + this.gmailSyncInterval);
  }

  getNextIndexScoreTime(): Date | null {
    if (!this.lastIndexScore) {
      return new Date(Date.now() + this.indexScoreInterval);
    }
    return new Date(this.lastIndexScore.getTime() + this.indexScoreInterval);
  }

  /**
   * Initialize Background Tasks
   */
  private async initializeBackgroundTasks(): Promise<void> {
    if (this.isInitialized || Platform.OS === 'web') {
      return;
    }

    try {
      // Define Gmail Delta Sync Task
      TaskManager.defineTask(GMAIL_DELTA_SYNC_TASK, async () => {
        console.log('[BackgroundTask] Gmail delta sync task started');
        try {
          await this.runGmailDeltaSync();
          return BackgroundFetch.BackgroundFetchResult.NewData;
        } catch (error) {
          console.error('[BackgroundTask] Gmail sync task failed:', error);
          return BackgroundFetch.BackgroundFetchResult.Failed;
        }
      });

      // Define Index and Score Task
      TaskManager.defineTask(INDEX_AND_SCORE_TASK, async () => {
        console.log('[BackgroundTask] Index and score task started');
        try {
          await this.runIndexAndScore();
          return BackgroundFetch.BackgroundFetchResult.NewData;
        } catch (error) {
          console.error('[BackgroundTask] Index and score task failed:', error);
          return BackgroundFetch.BackgroundFetchResult.Failed;
        }
      });

      this.isInitialized = true;
      console.log('[BackgroundTask] Background tasks initialized');
    } catch (error) {
      console.error('[BackgroundTask] Failed to initialize background tasks:', error);
    }
  }

  /**
   * Gmail Delta Sync - Device-Only Processing
   * 
   * Privacy-First Implementation:
   * - Calls Gmail API directly from device (no proxy servers)
   * - Processes email metadata locally to detect interactions
   * - Never sends email content to external services
   * - Stores results only in local SQLite database
   * 
   * Required Scopes:
   * - gmail.readonly: Read email metadata for interaction detection
   */
  async runGmailDeltaSync(): Promise<{ success: boolean; error?: string }> {
    console.log('[BackgroundTask] Starting Gmail delta sync (device-only)...');
    
    try {
      const gmailSync = GmailSync.getInstance();
      
      // Check if authenticated
      const isAuthenticated = await gmailSync.isAuthenticated();
      if (!isAuthenticated) {
        console.log('[BackgroundTask] Gmail not authenticated, skipping sync');
        return { success: false, error: 'Not authenticated' };
      }

      // Run delta sync
      const result = await gmailSync.delta();
      
      console.log('[BackgroundTask] Gmail sync completed (all processing local)');
      console.log(`[BackgroundTask] Processed: ${result.messages.length} messages, ${result.threads.length} threads, ${result.interactions.length} interactions`);
      
      this.lastGmailSync = new Date();
      await this.saveLastRunTime('lastGmailSync', this.lastGmailSync);
      
      return { success: true };
    } catch (error) {
      console.error('[BackgroundTask] Gmail sync failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Index and Score Update - Local Processing Only
   * 
   * Privacy-First Implementation:
   * - All analysis performed locally using device CPU
   * - No external AI/ML services or cloud processing
   * - Relationship scoring based on local interaction patterns
   * - Search indexing using local SQLite FTS
   * - AI follow-up detection from recent conversations
   * 
   * Local Processing:
   * - Interaction frequency analysis
   * - Relationship strength calculation
   * - Contact engagement scoring
   * - Search index optimization
   * - Follow-up task generation from AI analysis
   */
  async runIndexAndScore(): Promise<{ success: boolean; scoresComputed: number; followUpTasks: number; error?: string }> {
    console.log('[BackgroundTask] Starting local index and score update...');
    
    try {
      // Ensure database is initialized before running jobs
      const Database = (await import('@/database/Database')).Database;
      const database = Database.getInstance();
      
      if (!database.isAvailable()) {
        console.log('[BackgroundTask] Database not initialized, initializing now...');
        await database.init();
        
        if (!database.isAvailable()) {
          throw new Error('Database initialization failed');
        }
      }
      
      // Run scoring job
      const scoreJob = ScoreJob.getInstance();
      const scoreResult = await scoreJob.run();
      
      // Process follow-ups from recent conversations
      const followUpResult = await FollowUpService.processThreadsForFollowUps();
      
      console.log('[BackgroundTask] Local scoring and AI follow-up detection completed');
      console.log(`[BackgroundTask] Updated scores for ${scoreResult.scoresComputed} contacts (locally)`);
      console.log(`[BackgroundTask] Created ${followUpResult.tasksCreated} follow-up tasks from AI analysis`);
      
      this.lastIndexScore = new Date();
      await this.saveLastRunTime('lastIndexScore', this.lastIndexScore);
      
      return {
        success: scoreResult.success,
        scoresComputed: scoreResult.scoresComputed,
        followUpTasks: followUpResult.tasksCreated,
        error: scoreResult.error
      };
    } catch (error) {
      console.error('[BackgroundTask] Index and score failed:', error);
      return {
        success: false,
        scoresComputed: 0,
        followUpTasks: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Register Background Tasks
   */
  async registerBackgroundTasks(): Promise<void> {
    if (Platform.OS === 'web') {
      console.log('[BackgroundTask] Background tasks not supported on web');
      return;
    }

    try {
      await this.initializeBackgroundTasks();

      // Check if background fetch is available
      let status;
      try {
        status = await BackgroundFetch.getStatusAsync();
      } catch (error) {
        console.log('[BackgroundTask] Background fetch not available in this environment (Expo Go)');
        return;
      }
      
      if (status === BackgroundFetch.BackgroundFetchStatus.Restricted) {
        console.warn('[BackgroundTask] Background fetch is restricted by the system');
        return;
      }
      
      if (status === BackgroundFetch.BackgroundFetchStatus.Denied) {
        console.warn('[BackgroundTask] Background fetch permission denied by user');
        return;
      }

      // Only register if available
      if (status === BackgroundFetch.BackgroundFetchStatus.Available) {
        // Register Gmail Delta Sync (quick poll a few times per day)
        try {
          await BackgroundFetch.registerTaskAsync(GMAIL_DELTA_SYNC_TASK, {
            minimumInterval: 4 * 60 * 60, // 4 hours
            stopOnTerminate: false,
            startOnBoot: true,
          });
          console.log('[BackgroundTask] Gmail delta sync registered (4 hour interval)');
        } catch (error) {
          console.warn('[BackgroundTask] Could not register Gmail sync task:', error);
        }

        // Register Index and Score (heavier nightly job)
        try {
          await BackgroundFetch.registerTaskAsync(INDEX_AND_SCORE_TASK, {
            minimumInterval: 24 * 60 * 60, // 24 hours
            stopOnTerminate: false,
            startOnBoot: true,
          });
          console.log('[BackgroundTask] Index and score registered (24 hour interval)');
        } catch (error) {
          console.warn('[BackgroundTask] Could not register index/score task:', error);
        }
      } else {
        console.warn('[BackgroundTask] Background fetch not available on this device');
      }
    } catch (error) {
      // Log as warning instead of error since this is not critical for app functionality
      console.warn('[BackgroundTask] Background task registration not available:', error);
    }
  }

  /**
   * Unregister Background Tasks
   */
  async unregisterBackgroundTasks(): Promise<void> {
    if (Platform.OS === 'web') {
      return;
    }

    try {
      await BackgroundFetch.unregisterTaskAsync(GMAIL_DELTA_SYNC_TASK);
      await BackgroundFetch.unregisterTaskAsync(INDEX_AND_SCORE_TASK);
      console.log('[BackgroundTask] Background tasks unregistered');
    } catch (error) {
      console.error('[BackgroundTask] Failed to unregister background tasks:', error);
    }
  }

  /**
   * Check if background tasks are registered
   */
  async isTaskRegistered(taskName: string): Promise<boolean> {
    if (Platform.OS === 'web') {
      return false;
    }

    try {
      return await TaskManager.isTaskRegisteredAsync(taskName);
    } catch (error) {
      console.error(`[BackgroundTask] Failed to check task registration for ${taskName}:`, error);
      return false;
    }
  }

  /**
   * Schedule Background Tasks - Privacy-Compliant
   * 
   * All background processing maintains device-only architecture:
   * - Uses expo-task-manager for local background execution
   * - No data transmitted during background operations
   * - All processing happens on device even when app is backgrounded
   */
  async scheduleBackgroundTasks(): Promise<void> {
    console.log('[BackgroundTask] Attempting to schedule background tasks...');
    
    try {
      await this.registerBackgroundTasks();
      
      // Check if tasks were actually registered
      const gmailRegistered = await this.isTaskRegistered(GMAIL_DELTA_SYNC_TASK);
      const scoreRegistered = await this.isTaskRegistered(INDEX_AND_SCORE_TASK);
      
      if (gmailRegistered) {
        console.log('[BackgroundTask] Gmail sync scheduled (device-only, every 4 hours)');
      }
      if (scoreRegistered) {
        console.log('[BackgroundTask] Index & Score scheduled (local processing, every 24 hours)');
      }
      if (!gmailRegistered && !scoreRegistered) {
        console.log('[BackgroundTask] Background tasks not available in Expo Go - will work in production builds');
      }
    } catch (error) {
      // This is expected in Expo Go
      console.log('[BackgroundTask] Background tasks not available in current environment (expected in Expo Go)');
    }
  }

  /**
   * Get Task Status - Privacy Information Included
   * 
   * Returns task status with privacy compliance indicators
   */
  async getTaskStatus() {
    const gmailRegistered = await this.isTaskRegistered(GMAIL_DELTA_SYNC_TASK);
    const scoreRegistered = await this.isTaskRegistered(INDEX_AND_SCORE_TASK);

    return {
      gmailSync: {
        lastRun: this.lastGmailSync,
        nextRun: this.getNextGmailSyncTime(),
        interval: this.gmailSyncInterval,
        isRegistered: gmailRegistered,
        taskName: GMAIL_DELTA_SYNC_TASK,
        privacyMode: 'device-only',
        dataTransmission: 'none',
      },
      indexScore: {
        lastRun: this.lastIndexScore,
        nextRun: this.getNextIndexScoreTime(),
        interval: this.indexScoreInterval,
        isRegistered: scoreRegistered,
        taskName: INDEX_AND_SCORE_TASK,
        privacyMode: 'local-processing',
        dataTransmission: 'none',
      },
    };
  }

  /**
   * Manual Refresh - Run both tasks immediately
   * Includes AI follow-up detection from recent messages
   */
  async manualRefresh(): Promise<{ gmailResult: any; scoreResult: any }> {
    console.log('[BackgroundTask] Starting manual refresh with AI follow-up detection...');
    
    const [gmailResult, scoreResult] = await Promise.allSettled([
      this.runGmailDeltaSync(),
      this.runIndexAndScore()
    ]);

    return {
      gmailResult: gmailResult.status === 'fulfilled' ? gmailResult.value : { success: false, error: gmailResult.reason },
      scoreResult: scoreResult.status === 'fulfilled' ? scoreResult.value : { success: false, error: scoreResult.reason }
    };
  }
}