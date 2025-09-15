/**
 * Background Sync Job - Device-Only Architecture
 * 
 * Privacy-First Background Processing:
 * - All processing happens locally on device
 * - No external services or cloud processing
 * - Syncs with Google APIs directly from device (when enabled)
 * - All data remains in local SQLite database
 */

import { Platform } from 'react-native';
import { GoogleAPIService } from '@/services/GoogleAPIService';
import { PersonRepository } from '@/repositories/PersonRepository';
import { InteractionRepository } from '@/repositories/InteractionRepository';
import { TaskRepository } from '@/repositories/TaskRepository';
import { PRIVACY_CONFIG } from '@/constants/privacy';

export interface SyncResult {
  success: boolean;
  contactsImported: number;
  interactionsDetected: number;
  tasksCreated: number;
  error?: string;
}

export class BackgroundSyncJob {
  private static instance: BackgroundSyncJob;
  private isRunning = false;
  private lastSyncTime: Date | null = null;

  private constructor() {}

  static getInstance(): BackgroundSyncJob {
    if (!BackgroundSyncJob.instance) {
      BackgroundSyncJob.instance = new BackgroundSyncJob();
    }
    return BackgroundSyncJob.instance;
  }

  /**
   * Run Background Sync - Device-Only Processing
   * 
   * Privacy Implementation:
   * - Only runs if user has explicitly enabled Google integration
   * - All API calls made directly from device to Google
   * - All data processing happens locally
   * - No external services involved in sync process
   */
  async runSync(): Promise<SyncResult> {
    if (this.isRunning) {
      console.log('[BackgroundSync] Sync already in progress, skipping...');
      return { success: false, contactsImported: 0, interactionsDetected: 0, tasksCreated: 0, error: 'Sync already running' };
    }

    console.log('[BackgroundSync] Starting device-only background sync...');
    this.isRunning = true;

    try {
      // Check if Google integration is enabled (privacy-first)
      if (!PRIVACY_CONFIG.googleAPI.enabled) {
        console.log('[BackgroundSync] Google API integration disabled - respecting privacy settings');
        return { success: true, contactsImported: 0, interactionsDetected: 0, tasksCreated: 0 };
      }

      const googleAPI = GoogleAPIService.getInstance();
      const isAuthenticated = await googleAPI.isAuthenticated();
      
      if (!isAuthenticated) {
        console.log('[BackgroundSync] Not authenticated with Google - skipping sync');
        return { success: true, contactsImported: 0, interactionsDetected: 0, tasksCreated: 0 };
      }

      let contactsImported = 0;
      let interactionsDetected = 0;
      let tasksCreated = 0;

      // Sync Contacts - Device-Only Import
      try {
        console.log('[BackgroundSync] Syncing contacts (device-only import)...');
        const contacts = await googleAPI.fetchContacts(100);
        contactsImported = await this.importContacts(contacts);
        console.log(`[BackgroundSync] Imported ${contactsImported} contacts locally`);
      } catch (error) {
        console.warn('[BackgroundSync] Contact sync failed:', error);
      }

      // Sync Gmail Interactions - Device-Only Processing
      try {
        console.log('[BackgroundSync] Detecting interactions from Gmail (device-only)...');
        const messages = await googleAPI.fetchGmailMessages(50);
        interactionsDetected = await this.processEmailInteractions(messages);
        console.log(`[BackgroundSync] Detected ${interactionsDetected} interactions locally`);
      } catch (error) {
        console.warn('[BackgroundSync] Gmail sync failed:', error);
      }

      // Sync Calendar Events - Device-Only Meeting Detection
      try {
        console.log('[BackgroundSync] Processing calendar events (device-only)...');
        const timeMin = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const timeMax = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        const events = await googleAPI.fetchCalendarEvents(timeMin, timeMax);
        const meetingTasks = await this.processCalendarEvents(events);
        tasksCreated += meetingTasks;
        console.log(`[BackgroundSync] Created ${meetingTasks} meeting tasks locally`);
      } catch (error) {
        console.warn('[BackgroundSync] Calendar sync failed:', error);
      }

      this.lastSyncTime = new Date();
      console.log('[BackgroundSync] Background sync completed successfully');
      
      return {
        success: true,
        contactsImported,
        interactionsDetected,
        tasksCreated
      };
    } catch (error) {
      console.error('[BackgroundSync] Background sync failed:', error);
      return {
        success: false,
        contactsImported: 0,
        interactionsDetected: 0,
        tasksCreated: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Import Contacts - Local Processing Only
   */
  private async importContacts(contacts: any[]): Promise<number> {
    const personRepo = new PersonRepository();
    let imported = 0;

    for (const contact of contacts) {
      try {
        // Check if contact already exists
        const existing = await personRepo.findByEmail(contact.email);
        if (existing) continue;

        // Create new person from contact data
        const [firstName, ...lastNameParts] = contact.name.split(' ');
        const lastName = lastNameParts.join(' ') || '';

        await personRepo.createPerson({
          firstName,
          lastName,
          email: contact.email,
          phone: contact.phone,
          relationship: 'acquaintance',
          tags: ['imported'],
          notes: 'Imported from Google Contacts'
        });

        imported++;
      } catch (error) {
        console.warn(`[BackgroundSync] Failed to import contact ${contact.name}:`, error);
      }
    }

    return imported;
  }

  /**
   * Process Email Interactions - Local Analysis Only
   */
  private async processEmailInteractions(messages: any[]): Promise<number> {
    const personRepo = new PersonRepository();
    const interactionRepo = new InteractionRepository();
    let detected = 0;

    for (const message of messages) {
      try {
        // Find person by email
        const person = await personRepo.findByEmail(message.from);
        if (!person) continue;

        // Check if interaction already exists
        const messageDate = new Date(message.date);
        const existing = await interactionRepo.findByPersonAndDate(person.id, messageDate);
        if (existing) continue;

        // Create interaction record
        await interactionRepo.createInteraction({
          personId: person.id,
          type: 'email',
          date: messageDate,
          notes: `Email: ${message.subject}`,
        });

        detected++;
      } catch (error) {
        console.warn(`[BackgroundSync] Failed to process email interaction:`, error);
      }
    }

    return detected;
  }

  /**
   * Process Calendar Events - Local Meeting Detection
   */
  private async processCalendarEvents(events: any[]): Promise<number> {
    const taskRepo = new TaskRepository();
    let created = 0;

    for (const event of events) {
      try {
        // Skip events without attendees
        if (!event.attendees || event.attendees.length === 0) continue;

        // Create follow-up task for meetings
        const eventDate = new Date(event.start.dateTime);
        const followUpDate = new Date(eventDate.getTime() + 24 * 60 * 60 * 1000); // Next day

        await taskRepo.createTask({
          title: `Follow up on: ${event.summary}`,
          description: `Follow up on meeting with ${event.attendees.map((a: any) => a.email).join(', ')}`,
          dueDate: followUpDate,
          completed: false,
          type: 'follow-up'
        });

        created++;
      } catch (error) {
        console.warn(`[BackgroundSync] Failed to process calendar event:`, error);
      }
    }

    return created;
  }

  /**
   * Get Last Sync Time
   */
  getLastSyncTime(): Date | null {
    return this.lastSyncTime;
  }

  /**
   * Check if Sync is Running
   */
  isSyncRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Schedule Background Sync (Platform-Specific)
   */
  async scheduleBackgroundSync(): Promise<void> {
    if (Platform.OS === 'web') {
      // Web: Use service worker or periodic sync (if available)
      console.log('[BackgroundSync] Web background sync not implemented');
      return;
    }

    // Mobile: Use expo-background-fetch or expo-task-manager
    console.log('[BackgroundSync] Mobile background sync scheduling not implemented');
    // Implementation would use expo-background-fetch for periodic sync
  }
}