import { BaseDAO } from './BaseDAO';
import { Message } from '../models/Message';

interface MessageRow {
  id: string;
  threadId: string;
  senderId: string;
  content: string;
  sentAt: string;
  createdAt: string;
  updatedAt: string;
}

export class MessageDAO extends BaseDAO<Message> {
  constructor() {
    super('messages');
  }

  private mapRowToMessage(row: MessageRow): Message {
    return {
      id: row.id,
      threadId: row.threadId,
      senderId: row.senderId,
      content: row.content,
      sentAt: new Date(row.sentAt),
      isFromMe: false,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }

  async findAll(): Promise<Message[]> {
    if (!this.db || this.isWebPlatform) return [];
    const rows = await this.db.getAllAsync<MessageRow>(
      `SELECT * FROM ${this.tableName} ORDER BY sentAt DESC`
    );
    return rows.map(row => this.mapRowToMessage(row));
  }

  async findById(id: string): Promise<Message | null> {
    if (!this.db || this.isWebPlatform) return null;
    const row = await this.db.getFirstAsync<MessageRow>(
      `SELECT * FROM ${this.tableName} WHERE id = ?`,
      [id]
    );
    return row ? this.mapRowToMessage(row) : null;
  }

  async findByThread(threadId: string): Promise<Message[]> {
    if (!this.db || this.isWebPlatform) return [];
    const rows = await this.db.getAllAsync<MessageRow>(
      `SELECT * FROM ${this.tableName} WHERE threadId = ? ORDER BY sentAt ASC`,
      [threadId]
    );
    return rows.map(row => this.mapRowToMessage(row));
  }

  async findBySender(senderId: string): Promise<Message[]> {
    if (!this.db || this.isWebPlatform) return [];
    const rows = await this.db.getAllAsync<MessageRow>(
      `SELECT * FROM ${this.tableName} WHERE senderId = ? ORDER BY sentAt DESC`,
      [senderId]
    );
    return rows.map(row => this.mapRowToMessage(row));
  }

  async create(message: Omit<Message, 'id' | 'createdAt' | 'updatedAt'>): Promise<Message> {
    if (!this.db || this.isWebPlatform) {
      throw new Error('Database not available');
    }

    const now = this.getNow();
    const id = this.generateId();
    
    const encryptedContent = await this.encryptSensitiveData(message.content);
    
    await this.db.runAsync(
      `INSERT INTO ${this.tableName} (id, threadId, senderId, content, sentAt, createdAt, updatedAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        message.threadId,
        message.senderId,
        encryptedContent,
        message.sentAt.toISOString(),
        now,
        now
      ]
    );

    return {
      ...message,
      id,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    };
  }

  async update(id: string, updates: Partial<Omit<Message, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Message | null> {
    if (!this.db || this.isWebPlatform) return null;

    const existing = await this.findById(id);
    if (!existing) return null;

    const now = this.getNow();
    const encryptedContent = updates.content ? await this.encryptSensitiveData(updates.content) : existing.content;
    
    await this.db.runAsync(
      `UPDATE ${this.tableName} 
       SET threadId = ?, senderId = ?, content = ?, sentAt = ?, updatedAt = ?
       WHERE id = ?`,
      [
        updates.threadId ?? existing.threadId,
        updates.senderId ?? existing.senderId,
        encryptedContent,
        (updates.sentAt ?? existing.sentAt).toISOString(),
        now,
        id
      ]
    );

    return await this.findById(id);
  }
}