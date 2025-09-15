import * as Contacts from 'expo-contacts';
import { Platform } from 'react-native';
import { ContactsIngest } from './ContactsIngest';
import { PersonDAO } from '@/database/PersonDAO';

export class ContactsListener {
  private static instance: ContactsListener | null = null;
  private isListening = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private lastContactsHash: string | null = null;
  private personDAO: PersonDAO;

  private constructor() {
    this.personDAO = new PersonDAO();
  }

  static getInstance(): ContactsListener {
    if (!ContactsListener.instance) {
      ContactsListener.instance = new ContactsListener();
    }
    return ContactsListener.instance;
  }

  async startListening(): Promise<void> {
    if (this.isListening || Platform.OS === 'web') {
      return;
    }

    console.log('ContactsListener: Starting to listen for contacts changes');

    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        console.log('ContactsListener: Contacts permission not granted');
        return;
      }

      this.isListening = true;
      this.lastContactsHash = await this.getContactsHash();

      // Check for changes every 30 seconds
      this.intervalId = setInterval(async () => {
        await this.checkForChanges();
      }, 30000);

      console.log('ContactsListener: Started listening for contacts changes');
    } catch (error) {
      console.error('ContactsListener: Failed to start listening:', error);
    }
  }

  stopListening(): void {
    if (!this.isListening) {
      return;
    }

    console.log('ContactsListener: Stopping contacts listener');

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isListening = false;
    this.lastContactsHash = null;
  }

  private async checkForChanges(): Promise<void> {
    if (!this.isListening) {
      return;
    }

    try {
      const currentHash = await this.getContactsHash();
      
      if (currentHash !== this.lastContactsHash) {
        console.log('ContactsListener: Contacts changed, triggering re-import');
        
        const contactsIngest = new ContactsIngest(this.personDAO);
        const result = await contactsIngest.run();
        
        console.log('ContactsListener: Re-import completed', result);
        this.lastContactsHash = currentHash;
      }
    } catch (error) {
      console.error('ContactsListener: Error checking for changes:', error);
    }
  }

  private async getContactsHash(): Promise<string> {
    try {
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Name, Contacts.Fields.Emails],
      });

      // Create a simple hash based on contact count and some basic info
      const contactInfo = data.map(contact => ({
        id: contact.id,
        name: contact.name,
        emailCount: contact.emails?.length || 0,
      }));

      return JSON.stringify(contactInfo);
    } catch (error) {
      console.error('ContactsListener: Error getting contacts hash:', error);
      return '';
    }
  }

  isCurrentlyListening(): boolean {
    return this.isListening;
  }
}