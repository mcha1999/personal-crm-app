import * as SQLite from 'expo-sqlite';
import { Database } from './Database';
import { Platform } from 'react-native';

export abstract class BaseDAO<T> {
  protected db: SQLite.SQLiteDatabase | null;
  protected tableName: string;
  protected isWebPlatform = Platform.OS === 'web';

  constructor(tableName: string) {
    this.tableName = tableName;
    this.db = Database.getInstance().getDb();
  }

  protected generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  protected getNow(): string {
    return new Date().toISOString();
  }

  async findAll(): Promise<T[]> {
    if (!this.db || this.isWebPlatform) return [];
    const result = await this.db.getAllAsync<T>(
      `SELECT * FROM ${this.tableName} ORDER BY createdAt DESC`
    );
    return result || [];
  }

  async findById(id: string): Promise<T | null> {
    if (!this.db || this.isWebPlatform) return null;
    const result = await this.db.getFirstAsync<T>(
      `SELECT * FROM ${this.tableName} WHERE id = ?`,
      [id]
    );
    return result || null;
  }

  async deleteById(id: string): Promise<boolean> {
    if (!this.db || this.isWebPlatform) return false;
    const result = await this.db.runAsync(
      `DELETE FROM ${this.tableName} WHERE id = ?`,
      [id]
    );
    return result.changes > 0;
  }

  async count(): Promise<number> {
    if (!this.db || this.isWebPlatform) return 0;
    const result = await this.db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${this.tableName}`
    );
    return result?.count || 0;
  }
}