import { Task } from '@/models/Task';
import { TaskDAO } from '@/database/TaskDAO';

export class TaskRepository {
  private taskDAO: TaskDAO;

  constructor() {
    this.taskDAO = new TaskDAO();
  }

  async getUpcomingTasks(): Promise<Task[]> {
    try {
      return await this.taskDAO.getUpcoming(7);
    } catch (error) {
      console.error('Failed to get upcoming tasks:', error);
      return [];
    }
  }

  async getDueTasks(days: number = 7): Promise<Task[]> {
    try {
      return await this.taskDAO.getUpcoming(days);
    } catch (error) {
      console.error('Failed to get due tasks:', error);
      return [];
    }
  }

  async getTasksByPersonId(personId: string): Promise<Task[]> {
    try {
      return await this.taskDAO.getByPerson(personId);
    } catch (error) {
      console.error('Failed to get tasks by person:', error);
      return [];
    }
  }

  async getOverdueTasks(): Promise<Task[]> {
    try {
      return await this.taskDAO.getOverdue();
    } catch (error) {
      console.error('Failed to get overdue tasks:', error);
      return [];
    }
  }

  async createTask(taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    try {
      return await this.taskDAO.create(taskData);
    } catch (error) {
      console.error('Failed to create task:', error);
      throw error;
    }
  }
}