import { BaseDAO } from './BaseDAO';
import { Thread } from '../models/Thread';

interface ThreadRow {
  id: string;
  subject: string;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
}

export class ThreadDAO extends BaseDAO<Thread> {
  constructor() {
    super('threads');
  }

  private async mapRowToThread(row: ThreadRow): Promise<Thread> {
    const participants = await this.getParticipants(row.id);
    return {
      id: row.id,
      personIds: participants,
      subject: row.subject,
      lastMessageAt: new Date(row.lastMessageAt),
      platform: 'other' as const,
      unreadCount: 0,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }

  async findAll(): Promise<Thread[]> {
    if (!this.db || this.isWebPlatform) return [];
    const rows = await this.db.getAllAsync<ThreadRow>(
      `SELECT * FROM ${this.tableName} ORDER BY lastMessageAt DESC`
    );
    const threads: Thread[] = [];
    for (const row of rows) {
      threads.push(await this.mapRowToThread(row));
    }
    return threads;
  }

  async findById(id: string): Promise<Thread | null> {
    if (!this.db || this.isWebPlatform) return null;
    const row = await this.db.getFirstAsync<ThreadRow>(
      `SELECT * FROM ${this.tableName} WHERE id = ?`,
      [id]
    );
    return row ? await this.mapRowToThread(row) : null;
  }

  async findByParticipant(personId: string): Promise<Thread[]> {
    if (!this.db || this.isWebPlatform) return [];
    const rows = await this.db.getAllAsync<ThreadRow>(
      `SELECT t.* FROM ${this.tableName} t 
       JOIN thread_participants tp ON t.id = tp.threadId 
       WHERE tp.personId = ? 
       ORDER BY t.lastMessageAt DESC`,
      [personId]
    );
    const threads: Thread[] = [];
    for (const row of rows) {
      threads.push(await this.mapRowToThread(row));
    }
    return threads;
  }

  async create(thread: Omit<Thread, 'id' | 'createdAt' | 'updatedAt'>): Promise<Thread> {
    if (!this.db || this.isWebPlatform) {
      throw new Error('Database not available');
    }

    const now = this.getNow();
    const id = this.generateId();
    
    await this.db.runAsync(
      `INSERT INTO ${this.tableName} (id, subject, lastMessageAt, createdAt, updatedAt) 
       VALUES (?, ?, ?, ?, ?)`,
      [
        id,
        thread.subject || 'Thread',
        thread.lastMessageAt.toISOString(),
        now,
        now
      ]
    );

    return {
      ...thread,
      id,
      subject: thread.subject || 'Thread',
      createdAt: new Date(now),
      updatedAt: new Date(now),
    };
  }

  async update(id: string, updates: Partial<Omit<Thread, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Thread | null> {
    if (!this.db || this.isWebPlatform) return null;

    const existing = await this.findById(id);
    if (!existing) return null;

    const now = this.getNow();
    
    await this.db.runAsync(
      `UPDATE ${this.tableName} 
       SET subject = ?, lastMessageAt = ?, updatedAt = ?
       WHERE id = ?`,
      [
        updates.subject ?? existing.subject ?? 'Thread',
        (updates.lastMessageAt ?? existing.lastMessageAt).toISOString(),
        now,
        id
      ]
    );

    return await this.findById(id);
  }

  async addParticipant(threadId: string, personId: string): Promise<boolean> {
    if (!this.db || this.isWebPlatform) return false;
    
    try {
      await this.db.runAsync(
        'INSERT OR IGNORE INTO thread_participants (threadId, personId) VALUES (?, ?)',
        [threadId, personId]
      );
      return true;
    } catch {
      return false;
    }
  }

  async removeParticipant(threadId: string, personId: string): Promise<boolean> {
    if (!this.db || this.isWebPlatform) return false;
    
    const result = await this.db.runAsync(
      'DELETE FROM thread_participants WHERE threadId = ? AND personId = ?',
      [threadId, personId]
    );
    return result.changes > 0;
  }

  async getParticipants(threadId: string): Promise<string[]> {
    if (!this.db || this.isWebPlatform) return [];
    
    const rows = await this.db.getAllAsync<{ personId: string }>(
      'SELECT personId FROM thread_participants WHERE threadId = ?',
      [threadId]
    );
    return rows.map(row => row.personId);
  }
}