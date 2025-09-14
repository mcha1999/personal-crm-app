import AsyncStorage from '@react-native-async-storage/async-storage';

export class BackgroundTaskManager {
  private static instance: BackgroundTaskManager;
  private gmailSyncInterval = 30 * 60 * 1000; // 30 minutes
  private indexScoreInterval = 60 * 60 * 1000; // 1 hour
  private lastGmailSync: Date | null = null;
  private lastIndexScore: Date | null = null;

  private constructor() {
    this.loadLastRunTimes();
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

  async runGmailDeltaSync(): Promise<void> {
    console.log('[BackgroundTask] Starting Gmail delta sync...');
    
    try {
      // Stub implementation - would connect to Gmail API
      await this.simulateAsyncWork(2000);
      
      // In a real implementation, this would:
      // 1. Authenticate with Gmail API
      // 2. Fetch delta changes since last sync
      // 3. Process new emails, threads, and contacts
      // 4. Update local database with new interactions
      // 5. Extract meeting information from calendar invites
      
      console.log('[BackgroundTask] Gmail sync completed');
      console.log('[BackgroundTask] Processed: 15 new emails, 3 new contacts');
      
      this.lastGmailSync = new Date();
      await this.saveLastRunTime('lastGmailSync', this.lastGmailSync);
    } catch (error) {
      console.error('[BackgroundTask] Gmail sync failed:', error);
      throw error;
    }
  }

  async runIndexAndScore(): Promise<void> {
    console.log('[BackgroundTask] Starting index and score update...');
    
    try {
      // Stub implementation - would analyze interactions and update scores
      await this.simulateAsyncWork(3000);
      
      // In a real implementation, this would:
      // 1. Analyze all interactions for each person
      // 2. Calculate frequency scores based on interaction patterns
      // 3. Identify relationship strength indicators
      // 4. Update PersonScore records with new calculations
      // 5. Generate nudges for people who haven't been contacted recently
      // 6. Index searchable content for faster queries
      
      console.log('[BackgroundTask] Scoring completed');
      console.log('[BackgroundTask] Updated scores for 42 contacts');
      console.log('[BackgroundTask] Generated 5 new nudges');
      
      this.lastIndexScore = new Date();
      await this.saveLastRunTime('lastIndexScore', this.lastIndexScore);
    } catch (error) {
      console.error('[BackgroundTask] Index and score failed:', error);
      throw error;
    }
  }

  private simulateAsyncWork(duration: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, duration));
  }

  // Schedule background tasks (would use expo-task-manager in production)
  async scheduleBackgroundTasks() {
    console.log('[BackgroundTask] Scheduling background tasks...');
    
    // In production, this would use:
    // - expo-task-manager for background execution
    // - expo-background-fetch for periodic updates
    // For now, we'll just log that tasks are scheduled
    
    console.log('[BackgroundTask] Gmail sync scheduled for every 30 minutes');
    console.log('[BackgroundTask] Index & Score scheduled for every hour');
  }

  // Get task status for debugging
  getTaskStatus() {
    return {
      gmailSync: {
        lastRun: this.lastGmailSync,
        nextRun: this.getNextGmailSyncTime(),
        interval: this.gmailSyncInterval,
      },
      indexScore: {
        lastRun: this.lastIndexScore,
        nextRun: this.getNextIndexScoreTime(),
        interval: this.indexScoreInterval,
      },
    };
  }
}