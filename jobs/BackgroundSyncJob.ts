/**
 * Background Sync Job - Coordinated Background Processing
 * 
 * Privacy-First Implementation:
 * - Coordinates Gmail sync and scoring jobs
 * - All processing happens locally on device
 * - No external service calls during background execution
 * - Maintains device-only data processing architecture
 */

import { BackgroundTaskManager } from '@/services/BackgroundTaskManager';
import { GmailSync } from '@/services/GmailSync';
import { ScoreJob } from './ScoreJob';



export class BackgroundSyncJob {
  private static instance: BackgroundSyncJob;
  private isRunning = false;

  private constructor() {}

  static getInstance(): BackgroundSyncJob {
    if (!BackgroundSyncJob.instance) {
      BackgroundSyncJob.instance = new BackgroundSyncJob();
    }
    return BackgroundSyncJob.instance;
  }

  /**
   * Run Complete Background Sync
   * 
   * Coordinates both Gmail sync and scoring in the correct order:
   * 1. Gmail delta sync (fetch new emails)
   * 2. Score computation (update relationship scores)
   */
  async runCompleteSync(): Promise<{
    success: boolean;
    gmailResult?: any;
    scoreResult?: any;
    error?: string;
  }> {
    if (this.isRunning) {
      console.log('[BackgroundSyncJob] Sync already in progress, skipping...');
      return { success: false, error: 'Sync already running' };
    }

    console.log('[BackgroundSyncJob] Starting complete background sync...');
    this.isRunning = true;

    try {
      const taskManager = BackgroundTaskManager.getInstance();
      
      // Run Gmail sync first
      console.log('[BackgroundSyncJob] Step 1: Gmail delta sync');
      const gmailResult = await taskManager.runGmailDeltaSync();
      
      // Run scoring after Gmail sync
      console.log('[BackgroundSyncJob] Step 2: Score computation');
      const scoreResult = await taskManager.runIndexAndScore();
      
      const success = gmailResult.success && scoreResult.success;
      
      console.log(`[BackgroundSyncJob] Complete sync finished - Success: ${success}`);
      
      return {
        success,
        gmailResult,
        scoreResult,
        error: success ? undefined : 'One or more sync steps failed'
      };
    } catch (error) {
      console.error('[BackgroundSyncJob] Complete sync failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Run Quick Sync (Gmail only)
   * 
   * For frequent background updates - just sync new emails
   */
  async runQuickSync(): Promise<{ success: boolean; error?: string }> {
    if (this.isRunning) {
      console.log('[BackgroundSyncJob] Quick sync skipped - sync in progress');
      return { success: false, error: 'Sync already running' };
    }

    console.log('[BackgroundSyncJob] Starting quick Gmail sync...');
    this.isRunning = true;

    try {
      const taskManager = BackgroundTaskManager.getInstance();
      const result = await taskManager.runGmailDeltaSync();
      
      console.log(`[BackgroundSyncJob] Quick sync finished - Success: ${result.success}`);
      return result;
    } catch (error) {
      console.error('[BackgroundSyncJob] Quick sync failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Check if any sync is currently running
   */
  isSyncRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Get sync status with timing information
   */
  async getSyncStatus() {
    const taskManager = BackgroundTaskManager.getInstance();
    const taskStatus = await taskManager.getTaskStatus();
    
    return {
      isRunning: this.isRunning,
      lastGmailSync: taskStatus.gmailSync.lastRun,
      lastScoreUpdate: taskStatus.indexScore.lastRun,
      nextGmailSync: taskStatus.gmailSync.nextRun,
      nextScoreUpdate: taskStatus.indexScore.nextRun,
      gmailRegistered: taskStatus.gmailSync.isRegistered,
      scoreRegistered: taskStatus.indexScore.isRegistered,
    };
  }
}