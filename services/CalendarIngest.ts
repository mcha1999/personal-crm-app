import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';
import { PersonDAO } from '../database/PersonDAO';
import { MeetingDAO } from '../database/MeetingDAO';
import { PlaceDAO } from '../database/PlaceDAO';
import { InteractionDAO } from '../database/InteractionDAO';
import { Meeting } from '../models/Meeting';
import { Place } from '../models/Place';
import { Interaction } from '../models/Interaction';
import { Person } from '../models/Person';

export interface CalendarIngestWindow {
  pastDays: number;
  futureDays: number;
}

export class CalendarIngest {
  private static instance: CalendarIngest;
  private personDAO: PersonDAO;
  private meetingDAO: MeetingDAO;
  private placeDAO: PlaceDAO;
  private interactionDAO: InteractionDAO;
  private isListening = false;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(
    personDAO: PersonDAO,
    meetingDAO: MeetingDAO,
    placeDAO: PlaceDAO,
    interactionDAO: InteractionDAO
  ) {
    this.personDAO = personDAO;
    this.meetingDAO = meetingDAO;
    this.placeDAO = placeDAO;
    this.interactionDAO = interactionDAO;
  }

  static getInstance(
    personDAO: PersonDAO,
    meetingDAO: MeetingDAO,
    placeDAO: PlaceDAO,
    interactionDAO: InteractionDAO
  ): CalendarIngest {
    if (!CalendarIngest.instance) {
      CalendarIngest.instance = new CalendarIngest(personDAO, meetingDAO, placeDAO, interactionDAO);
    }
    return CalendarIngest.instance;
  }

  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting calendar permissions:', error);
      return false;
    }
  }

  async runWindow(window: CalendarIngestWindow): Promise<void> {
    if (!window || typeof window.pastDays !== 'number' || typeof window.futureDays !== 'number') {
      throw new Error('Invalid window parameters');
    }
    
    console.log('Starting calendar ingest with window:', window);
    
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      throw new Error('Calendar permission not granted');
    }

    const now = new Date();
    const startDate = new Date(now.getTime() - (window.pastDays * 24 * 60 * 60 * 1000));
    const endDate = new Date(now.getTime() + (window.futureDays * 24 * 60 * 60 * 1000));

    try {
      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      console.log(`Found ${calendars.length} calendars`);

      let totalEvents = 0;
      for (const calendar of calendars) {
        const events = await Calendar.getEventsAsync(
          [calendar.id],
          startDate,
          endDate
        );
        
        console.log(`Processing ${events.length} events from calendar: ${calendar.title}`);
        totalEvents += events.length;

        for (const event of events) {
          await this.processEvent(event);
        }
      }

      console.log(`Calendar ingest completed. Processed ${totalEvents} events.`);
    } catch (error) {
      console.error('Error during calendar ingest:', error);
      throw error;
    }
  }

  private async processEvent(event: Calendar.Event): Promise<void> {
    try {
      // Check for existing meeting by calendar event ID
      const existingMeetings = await this.meetingDAO.findAll();
      const eventStartDate = typeof event.startDate === 'string' ? new Date(event.startDate) : event.startDate;
      const existingMeeting = existingMeetings.find(m => 
        m.title === (event.title || 'Untitled Event') &&
        Math.abs(m.date.getTime() - eventStartDate.getTime()) < 60000 // Within 1 minute
      );

      if (existingMeeting) {
        console.log(`Meeting already exists: ${event.title}`);
        return;
      }

      // Create meeting based on the Meeting model structure
      const eventEndDate = event.endDate ? (typeof event.endDate === 'string' ? new Date(event.endDate) : event.endDate) : null;
      const meeting: Omit<Meeting, 'id' | 'createdAt' | 'updatedAt'> = {
        title: event.title || 'Untitled Event',
        date: eventStartDate,
        personIds: [],
        placeId: undefined,
        duration: eventEndDate ? Math.round((eventEndDate.getTime() - eventStartDate.getTime()) / (1000 * 60)) : undefined,
        notes: event.notes || undefined,
        type: 'in-person' as const
      };

      const createdMeeting = await this.meetingDAO.create(meeting);
      console.log(`Created meeting: ${meeting.title}`);

      // Process location if available
      if (event.location) {
        await this.processLocation(event.location, createdMeeting.id);
      }

      // Note: expo-calendar Event type doesn't have attendees property
      // This would need to be handled differently or through a different API
    } catch (error) {
      console.error('Error processing event:', event.title, error);
    }
  }

  private async processLocation(locationString: string, meetingId: string): Promise<void> {
    if (!locationString || !locationString.trim()) {
      return;
    }
    
    const sanitizedLocation = locationString.trim();
    if (sanitizedLocation.length > 500) {
      console.warn('Location string too long, truncating');
      return;
    }
    
    try {
      const normalizedLocation = this.normalizeLocation(sanitizedLocation);
      
      // Check if place already exists
      const existingPlaces = await this.placeDAO.getAllPlaces();
      let place = existingPlaces.find(p => 
        this.normalizeLocation(p.name) === normalizedLocation ||
        (p.address && this.normalizeLocation(p.address) === normalizedLocation)
      );

      if (!place) {
        // Create new place based on Place model
        const newPlace: Omit<Place, 'id' | 'createdAt' | 'updatedAt'> = {
          name: sanitizedLocation,
          address: sanitizedLocation,
          latitude: 0,
          longitude: 0,
          category: 'other' as const,
          notes: undefined
        };
        
        const createdPlace = await this.placeDAO.create(newPlace);
        place = createdPlace;
        console.log(`Created new place: ${sanitizedLocation}`);
      }

      // Link meeting to place using the addPlace method
      if (place) {
        await this.meetingDAO.addPlace(meetingId, place.id);
      }
    } catch (error) {
      console.error('Error processing location:', sanitizedLocation, error);
    }
  }

  // Note: expo-calendar doesn't provide attendee information in the Event type
  // This method is kept for future enhancement when attendee data becomes available
  private async processAttendees(
    attendeeEmails: string[],
    meetingId: string,
    meetingDate: Date
  ): Promise<void> {
    try {
      for (const email of attendeeEmails) {
        if (!email || !email.trim()) continue;
        
        const sanitizedEmail = email.trim().toLowerCase();
        if (sanitizedEmail.length > 100) continue;

        // Find person by email
        let person = await this.personDAO.findByEmail(sanitizedEmail);

        if (!person) {
          // Create new person from email
          const newPerson: Omit<Person, 'id' | 'createdAt' | 'updatedAt'> = {
            firstName: sanitizedEmail.split('@')[0] || 'Unknown',
            lastName: '',
            nickname: undefined,
            email: sanitizedEmail,
            phone: undefined,
            birthday: undefined,
            avatar: undefined,
            relationship: 'colleague' as const,
            tags: [],
            notes: undefined,
            companyId: undefined,
            lastInteraction: undefined
          };
          
          person = await this.personDAO.create(newPerson);
          console.log(`Created new person from email: ${sanitizedEmail}`);
        }

        // Add person as attendee to meeting
        await this.meetingDAO.addAttendee(meetingId, person.id);

        // Create interaction
        const interaction: Omit<Interaction, 'id' | 'createdAt' | 'updatedAt'> = {
          personId: person.id,
          type: 'meeting',
          date: meetingDate,
          notes: 'Calendar meeting',
          meetingId: meetingId
        };

        await this.interactionDAO.create(interaction);
        console.log(`Created interaction for person: ${person.firstName} ${person.lastName}`);
      }
    } catch (error) {
      console.error('Error processing attendees:', error);
    }
  }

  private normalizeLocation(location: string): string {
    return location
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ');
  }

  async startListening(window: CalendarIngestWindow): Promise<void> {
    if (this.isListening || Platform.OS === 'web') {
      return;
    }

    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        throw new Error('Calendar permission not granted');
      }

      // Since expo-calendar doesn't have a direct event listener,
      // we'll use polling to check for changes periodically
      this.intervalId = setInterval(() => {
        console.log('Checking for calendar changes...');
        this.runWindow(window).catch((error: any) => {
          if (error && typeof error === 'object' && 'message' in error) {
            console.error('Error re-ingesting calendar after change:', error.message);
          } else {
            console.error('Error re-ingesting calendar after change:', error);
          }
        });
      }, 5 * 60 * 1000) as any; // Check every 5 minutes

      this.isListening = true;
      console.log('Calendar change listener started (polling mode)');
    } catch (error) {
      console.error('Error starting calendar listener:', error);
      throw error;
    }
  }

  async stopListening(): Promise<void> {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isListening = false;
    console.log('Calendar change listener stopped');
  }

  isCurrentlyListening(): boolean {
    return this.isListening;
  }
}

export default CalendarIngest;