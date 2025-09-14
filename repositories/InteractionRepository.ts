import { Interaction } from '@/models/Interaction';
import { Meeting } from '@/models/Meeting';
import { mockInteractions, mockMeetings } from './mockData';

export class InteractionRepository {
  async getRecentInteractions(limit: number = 10): Promise<Interaction[]> {
    return mockInteractions
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, limit);
  }

  async getInteractionsByPersonId(personId: string): Promise<Interaction[]> {
    return mockInteractions
      .filter(i => i.personId === personId)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }

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