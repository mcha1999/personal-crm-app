import { Person } from '@/models/Person';
import { PersonScore } from '@/models/PersonScore';
import { PersonDAO } from '@/database/PersonDAO';
import { mockPersonScores } from './mockData';

export class PersonRepository {
  private personDAO: PersonDAO;

  constructor() {
    this.personDAO = new PersonDAO();
  }

  async getAllPeople(): Promise<Person[]> {
    try {
      return await this.personDAO.getAllPersons();
    } catch (error) {
      console.error('Failed to get all people:', error);
      return [];
    }
  }

  async getPersonById(id: string): Promise<Person | null> {
    try {
      return await this.personDAO.getPersonById(id);
    } catch (error) {
      console.error('Failed to get person by id:', error);
      return null;
    }
  }

  async searchPeople(query: string): Promise<Person[]> {
    try {
      return await this.personDAO.searchByName(query);
    } catch (error) {
      console.error('Failed to search people:', error);
      return [];
    }
  }

  async getPersonScore(personId: string): Promise<PersonScore | undefined> {
    // TODO: Implement PersonScoreDAO
    return mockPersonScores.find(ps => ps.personId === personId);
  }

  async getPeopleWithUpcomingBirthdays(days: number = 30): Promise<Person[]> {
    try {
      return await this.personDAO.getUpcomingBirthdays(days);
    } catch (error) {
      console.error('Failed to get upcoming birthdays:', error);
      return [];
    }
  }

  async getRecentContacts(limit: number = 10): Promise<Person[]> {
    try {
      return await this.personDAO.getRecentContacts(limit);
    } catch (error) {
      console.error('Failed to get recent contacts:', error);
      return [];
    }
  }

  async findByEmail(email: string): Promise<Person | null> {
    try {
      return await this.personDAO.findByEmail(email);
    } catch (error) {
      console.error('Failed to find person by email:', error);
      return null;
    }
  }

  async createPerson(personData: Omit<Person, 'id' | 'createdAt' | 'updatedAt'>): Promise<Person> {
    try {
      return await this.personDAO.create(personData);
    } catch (error) {
      console.error('Failed to create person:', error);
      throw error;
    }
  }
}