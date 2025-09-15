import { Interaction } from '@/models/Interaction';
import { Meeting } from '@/models/Meeting';
import { InteractionDAO } from '@/database/InteractionDAO';
import { mockMeetings } from './mockData';

export class InteractionRepository {
  private interactionDAO: InteractionDAO;

  constructor() {
    this.interactionDAO = new InteractionDAO();
  }

  async getRecentInteractions(limit: number = 10): Promise<Interaction[]> {
    try {
      return await this.interactionDAO.getRecent(limit);
    } catch (error) {
      console.error('Failed to get recent interactions:', error);
      return [];
    }
  }

  async getInteractionsByPersonId(personId: string): Promise<Interaction[]> {
    try {
      return await this.interactionDAO.getByPerson(personId);
    } catch (error) {
      console.error('Failed to get interactions by person:', error);
      return [];
    }
  }

  async findByPersonAndDate(personId: string, date: Date): Promise<Interaction | null> {
    try {
      return await this.interactionDAO.findByPersonAndDate(personId, date);
    } catch (error) {
      console.error('Failed to find interaction by person and date:', error);
      return null;
    }
  }

  async createInteraction(interactionData: Omit<Interaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<Interaction> {
    try {
      return await this.interactionDAO.create(interactionData);
    } catch (error) {
      console.error('Failed to create interaction:', error);
      throw error;
    }
  }

  // Meeting methods - using mock data for now
  async getRecentMeetings(limit: number = 5): Promise<Meeting[]> {
    return mockMeetings
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, limit);
  }

  async getMeetingById(id: string): Promise<Meeting | undefined> {
    return mockMeetings.find(m => m.id === id);
  }

  async getUpcomingMeetings(days: number = 7): Promise<Meeting[]> {
    const now = new Date();
    const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    return mockMeetings
      .filter(m => m.date >= now && m.date <= futureDate)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }
}