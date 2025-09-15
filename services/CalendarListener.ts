import { CalendarIngest, CalendarIngestWindow } from './CalendarIngest';
import { PersonDAO } from '../database/PersonDAO';
import { MeetingDAO } from '../database/MeetingDAO';
import { PlaceDAO } from '../database/PlaceDAO';
import { InteractionDAO } from '../database/InteractionDAO';
import { Platform } from 'react-native';

export class CalendarListener {
  private static instance: CalendarListener;
  private calendarIngest: CalendarIngest;
  private isActive = false;
  private currentWindow: CalendarIngestWindow | null = null;

  constructor(
    personDAO: PersonDAO,
    meetingDAO: MeetingDAO,
    placeDAO: PlaceDAO,
    interactionDAO: InteractionDAO
  ) {
    this.calendarIngest = CalendarIngest.getInstance(
      personDAO,
      meetingDAO,
      placeDAO,
      interactionDAO
    );
  }

  static getInstance(
    personDAO: PersonDAO,
    meetingDAO: MeetingDAO,
    placeDAO: PlaceDAO,
    interactionDAO: InteractionDAO
  ): CalendarListener {
    if (!CalendarListener.instance) {
      CalendarListener.instance = new CalendarListener(
        personDAO,
        meetingDAO,
        placeDAO,
        interactionDAO
      );
    }
    return CalendarListener.instance;
  }

  async startListening(window: CalendarIngestWindow): Promise<void> {
    if (this.isActive || Platform.OS === 'web') {
      console.log('Calendar listener already active or web platform');
      return;
    }

    try {
      console.log('Starting calendar listener with window:', window);
      this.currentWindow = window;
      
      // Start the calendar ingest listener
      await this.calendarIngest.startListening(window);
      
      this.isActive = true;
      console.log('Calendar listener started successfully');
    } catch (error) {
      console.error('Failed to start calendar listener:', error);
      throw error;
    }
  }

  async stopListening(): Promise<void> {
    if (!this.isActive) {
      return;
    }

    try {
      console.log('Stopping calendar listener');
      
      await this.calendarIngest.stopListening();
      
      this.isActive = false;
      this.currentWindow = null;
      console.log('Calendar listener stopped successfully');
    } catch (error) {
      console.error('Failed to stop calendar listener:', error);
      throw error;
    }
  }

  async runManualSync(window: CalendarIngestWindow): Promise<void> {
    try {
      console.log('Running manual calendar sync');
      await this.calendarIngest.runWindow(window);
      console.log('Manual calendar sync completed');
    } catch (error) {
      console.error('Manual calendar sync failed:', error);
      throw error;
    }
  }

  isListening(): boolean {
    return this.isActive;
  }

  getCurrentWindow(): CalendarIngestWindow | null {
    return this.currentWindow;
  }

  async requestPermissions(): Promise<boolean> {
    return await this.calendarIngest.requestPermissions();
  }
}

export default CalendarListener;