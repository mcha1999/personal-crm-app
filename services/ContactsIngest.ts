import * as Contacts from 'expo-contacts';
import { PersonDAO } from '@/database/PersonDAO';
import { Person } from '@/models/Person';

interface ContactData {
  id: string;
  name: string;
  emails: string[];
  phones: string[];
}

export class ContactsIngest {
  private personDAO: PersonDAO;

  constructor(personDAO: PersonDAO) {
    this.personDAO = personDAO;
  }

  async run(): Promise<{ imported: number; updated: number; skipped: number }> {
    console.log('ContactsIngest: Starting contacts import');
    
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        console.log('ContactsIngest: Permission denied');
        throw new Error('Contacts permission denied');
      }

      const { data } = await Contacts.getContactsAsync({
        fields: [
          Contacts.Fields.Name,
          Contacts.Fields.Emails,
          Contacts.Fields.PhoneNumbers,
        ],
      });

      console.log(`ContactsIngest: Found ${data.length} contacts`);

      const contactsData = this.extractContactData(data);
      const deduplicatedContacts = this.deduplicateContacts(contactsData);
      
      console.log(`ContactsIngest: After deduplication: ${deduplicatedContacts.length} contacts`);

      const existingPersons = await this.personDAO.getAll();
      const results = await this.mergeContacts(deduplicatedContacts, existingPersons);

      console.log('ContactsIngest: Import completed', results);
      return results;
    } catch (error) {
      console.error('ContactsIngest: Error during import:', error);
      throw error;
    }
  }

  private extractContactData(contacts: Contacts.Contact[]): ContactData[] {
    return contacts
      .filter(contact => contact.name || (contact.emails && contact.emails.length > 0))
      .map(contact => ({
        id: contact.id || '',
        name: contact.name || '',
        emails: contact.emails?.map(email => email.email?.toLowerCase() || '').filter(Boolean) || [],
        phones: contact.phoneNumbers?.map(phone => this.normalizePhone(phone.number || '')).filter(Boolean) || [],
      }));
  }

  private normalizePhone(phone: string): string {
    return phone.replace(/[^\d+]/g, '');
  }

  private deduplicateContacts(contacts: ContactData[]): ContactData[] {
    const emailMap = new Map<string, ContactData>();
    const nameMap = new Map<string, ContactData>();
    const result: ContactData[] = [];

    for (const contact of contacts) {
      let isDuplicate = false;

      // Check for email duplicates
      for (const email of contact.emails) {
        if (emailMap.has(email)) {
          const existing = emailMap.get(email)!;
          this.mergeContactData(existing, contact);
          isDuplicate = true;
          break;
        }
      }

      if (!isDuplicate && contact.name) {
        // Check for fuzzy name matches
        const normalizedName = this.normalizeName(contact.name);
        for (const [existingName, existingContact] of nameMap.entries()) {
          if (this.isFuzzyNameMatch(normalizedName, existingName)) {
            this.mergeContactData(existingContact, contact);
            isDuplicate = true;
            break;
          }
        }
      }

      if (!isDuplicate) {
        result.push(contact);
        
        // Add to maps for future deduplication
        for (const email of contact.emails) {
          emailMap.set(email, contact);
        }
        if (contact.name) {
          nameMap.set(this.normalizeName(contact.name), contact);
        }
      }
    }

    return result;
  }

  private normalizeName(name: string): string {
    return name.toLowerCase().trim().replace(/\s+/g, ' ');
  }

  private isFuzzyNameMatch(name1: string, name2: string): boolean {
    if (name1 === name2) return true;
    
    // Split names into parts
    const parts1 = name1.split(' ').filter(Boolean);
    const parts2 = name2.split(' ').filter(Boolean);
    
    // If both have at least 2 parts, check if first and last match
    if (parts1.length >= 2 && parts2.length >= 2) {
      const first1 = parts1[0];
      const last1 = parts1[parts1.length - 1];
      const first2 = parts2[0];
      const last2 = parts2[parts2.length - 1];
      
      return (first1 === first2 && last1 === last2);
    }
    
    // For single names, use Levenshtein distance
    return this.levenshteinDistance(name1, name2) <= 2;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  private mergeContactData(existing: ContactData, newContact: ContactData): void {
    // Merge emails
    for (const email of newContact.emails) {
      if (!existing.emails.includes(email)) {
        existing.emails.push(email);
      }
    }
    
    // Merge phones
    for (const phone of newContact.phones) {
      if (!existing.phones.includes(phone)) {
        existing.phones.push(phone);
      }
    }
    
    // Use longer name if available
    if (newContact.name.length > existing.name.length) {
      existing.name = newContact.name;
    }
  }

  private async mergeContacts(
    contacts: ContactData[], 
    existingPersons: Person[]
  ): Promise<{ imported: number; updated: number; skipped: number }> {
    let imported = 0;
    let updated = 0;
    let skipped = 0;

    for (const contact of contacts) {
      try {
        // Find existing person by email or name
        let existingPerson = this.findExistingPerson(contact, existingPersons);
        
        if (existingPerson) {
          // Update existing person
          const wasUpdated = await this.updateExistingPerson(existingPerson, contact);
          if (wasUpdated) {
            updated++;
          } else {
            skipped++;
          }
        } else {
          // Create new person
          await this.createNewPerson(contact);
          imported++;
        }
      } catch (error) {
        console.error('ContactsIngest: Error processing contact:', contact.name, error);
        skipped++;
      }
    }

    return { imported, updated, skipped };
  }

  private findExistingPerson(contact: ContactData, existingPersons: Person[]): Person | null {
    // First try to match by email
    for (const email of contact.emails) {
      const person = existingPersons.find(p => 
        p.email?.toLowerCase() === email
      );
      if (person) return person;
    }

    // Then try to match by name
    if (contact.name) {
      const normalizedContactName = this.normalizeName(contact.name);
      return existingPersons.find(p => {
        const fullName = `${p.firstName} ${p.lastName}`.trim();
        if (!fullName) return false;
        const normalizedPersonName = this.normalizeName(fullName);
        return this.isFuzzyNameMatch(normalizedContactName, normalizedPersonName);
      }) || null;
    }

    return null;
  }

  private async updateExistingPerson(person: Person, contact: ContactData): Promise<boolean> {
    let hasChanges = false;
    const updates: Partial<Person> = {};

    // Parse contact name into first/last
    const nameParts = contact.name.trim().split(' ');
    const contactFirstName = nameParts[0] || '';
    const contactLastName = nameParts.slice(1).join(' ') || '';
    const currentFullName = `${person.firstName} ${person.lastName}`.trim();

    // Update name if contact has a longer/better name
    if (contact.name && contact.name.length > currentFullName.length) {
      updates.firstName = contactFirstName;
      updates.lastName = contactLastName;
      hasChanges = true;
    }

    // Update primary email if not set
    if (!person.email && contact.emails.length > 0) {
      updates.email = contact.emails[0];
      hasChanges = true;
    }

    // Update phone if not set
    if (!person.phone && contact.phones.length > 0) {
      updates.phone = contact.phones[0];
      hasChanges = true;
    }

    if (hasChanges) {
      await this.personDAO.update(person.id, updates);
      console.log(`ContactsIngest: Updated person ${person.firstName} ${person.lastName}`);
    }

    return hasChanges;
  }

  private async createNewPerson(contact: ContactData): Promise<void> {
    // Parse contact name into first/last
    const nameParts = contact.name.trim().split(' ');
    const firstName = nameParts[0] || 'Unknown';
    const lastName = nameParts.slice(1).join(' ') || '';

    const person: Omit<Person, 'id' | 'createdAt' | 'updatedAt'> = {
      firstName,
      lastName,
      email: contact.emails[0] || undefined,
      phone: contact.phones[0] || undefined,
      relationship: 'acquaintance',
      tags: ['imported-from-contacts'],
    };

    await this.personDAO.create(person);
    console.log(`ContactsIngest: Created new person ${firstName} ${lastName}`);
  }
}