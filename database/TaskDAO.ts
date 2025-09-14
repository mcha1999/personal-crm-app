import { BaseDAO } from './BaseDAO';
import { Task } from '../models/Task';

interface TaskDB {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  completed: number;
  completedAt: string | null;
  type: string;
  personId: string | null;
  createdAt: string;
  updatedAt: string;
}

export class TaskDAO extends BaseDAO<TaskDB> {
  constructor() {
    super('tasks');
  }

  private dbToTask(db: TaskDB): Task {
    return {
      id: db.id,
      title: db.title,
      description: db.description || undefined,
      dueDate: db.dueDate ? new Date(db.dueDate) : undefined,
      completed: db.completed === 1,
      completedAt: db.completedAt ? new Date(db.completedAt) : undefined,
      type: db.type as Task['type'],
      personId: db.personId || undefined,
      createdAt: new Date(db.createdAt),
      updatedAt: new Date(db.updatedAt),
    };
  }

  async create(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    if (!this.db || this.isWebPlatform) {
      throw new Error('Database not available');
    }
    const id = this.generateId();
    const now = this.getNow();
    
    await this.db.runAsync(
      `INSERT INTO tasks (id, title, description, dueDate, completed, completedAt, type, personId, createdAt, updatedAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        task.title,
        task.description || null,
        task.dueDate ? task.dueDate.toISOString() : null,
        task.completed ? 1 : 0,
        task.completedAt ? task.completedAt.toISOString() : null,
        task.type,
        task.personId || null,
        now,
        now
      ]
    );

    const created = await this.getTaskById(id);
    if (!created) throw new Error('Failed to create task');
    return created;
  }

  async update(id: string, task: Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Task | null> {
    if (!this.db || this.isWebPlatform) return null;
    const fields: string[] = [];
    const values: any[] = [];

    if (task.title !== undefined) {
      fields.push('title = ?');
      values.push(task.title);
    }
    if (task.description !== undefined) {
      fields.push('description = ?');
      values.push(task.description || null);
    }
    if (task.dueDate !== undefined) {
      fields.push('dueDate = ?');
      values.push(task.dueDate ? task.dueDate.toISOString() : null);
    }
    if (task.completed !== undefined) {
      fields.push('completed = ?');
      values.push(task.completed ? 1 : 0);
      if (task.completed) {
        fields.push('completedAt = ?');
        values.push(this.getNow());
      } else {
        fields.push('completedAt = ?');
        values.push(null);
      }
    }
    if (task.completedAt !== undefined) {
      fields.push('completedAt = ?');
      values.push(task.completedAt ? task.completedAt.toISOString() : null);
    }
    if (task.type !== undefined) {
      fields.push('type = ?');
      values.push(task.type);
    }
    if (task.personId !== undefined) {
      fields.push('personId = ?');
      values.push(task.personId || null);
    }

    if (fields.length === 0) return this.getTaskById(id);

    fields.push('updatedAt = ?');
    values.push(this.getNow());
    values.push(id);

    await this.db.runAsync(
      `UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return this.getTaskById(id);
  }

  async getTaskById(id: string): Promise<Task | null> {
    if (!this.db || this.isWebPlatform) return null;
    const result = await this.db.getFirstAsync<TaskDB>(
      `SELECT * FROM tasks WHERE id = ?`,
      [id]
    );
    return result ? this.dbToTask(result) : null;
  }

  async getAllTasks(): Promise<Task[]> {
    if (!this.db || this.isWebPlatform) return [];
    const results = await this.db.getAllAsync<TaskDB>(
      `SELECT * FROM tasks ORDER BY dueDate ASC, createdAt DESC`
    );
    return (results || []).map(r => this.dbToTask(r));
  }

  async getByPerson(personId: string): Promise<Task[]> {
    if (!this.db || this.isWebPlatform) return [];
    const results = await this.db.getAllAsync<TaskDB>(
      `SELECT * FROM tasks WHERE personId = ? ORDER BY dueDate ASC, createdAt DESC`,
      [personId]
    );
    return (results || []).map(r => this.dbToTask(r));
  }

  async getUpcoming(days: number = 7): Promise<Task[]> {
    if (!this.db || this.isWebPlatform) return [];
    const results = await this.db.getAllAsync<TaskDB>(
      `SELECT * FROM tasks 
       WHERE completed = 0 
       AND dueDate IS NOT NULL 
       AND date(dueDate) <= date('now', '+${days} days')
       ORDER BY dueDate ASC`,
      []
    );
    return (results || []).map(r => this.dbToTask(r));
  }

  async getOverdue(): Promise<Task[]> {
    if (!this.db || this.isWebPlatform) return [];
    const results = await this.db.getAllAsync<TaskDB>(
      `SELECT * FROM tasks 
       WHERE completed = 0 
       AND dueDate IS NOT NULL 
       AND date(dueDate) < date('now')
       ORDER BY dueDate ASC`,
      []
    );
    return (results || []).map(r => this.dbToTask(r));
  }

  async toggleComplete(id: string): Promise<Task | null> {
    const task = await this.getTaskById(id);
    if (!task) return null;
    
    return this.update(id, { completed: !task.completed });
  }
}