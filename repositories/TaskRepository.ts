import { Task } from '@/models/Task';
import { mockTasks } from './mockData';

export class TaskRepository {
  async getUpcomingTasks(): Promise<Task[]> {
    const now = new Date();
    return mockTasks
      .filter(t => !t.completed && (!t.dueDate || t.dueDate >= now))
      .sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.getTime() - b.dueDate.getTime();
      });
  }

  async getDueTasks(days: number = 7): Promise<Task[]> {
    const now = new Date();
    const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    return mockTasks
      .filter(t => !t.completed && t.dueDate && t.dueDate >= now && t.dueDate <= futureDate)
      .sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.getTime() - b.dueDate.getTime();
      });
  }

  async getTasksByPersonId(personId: string): Promise<Task[]> {
    return mockTasks
      .filter(t => t.personId === personId)
      .sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.getTime() - b.dueDate.getTime();
      });
  }

  async getOverdueTasks(): Promise<Task[]> {
    const now = new Date();
    return mockTasks
      .filter(t => !t.completed && t.dueDate && t.dueDate < now)
      .sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.getTime() - b.dueDate.getTime();
      });
  }
}