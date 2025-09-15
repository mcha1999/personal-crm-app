import * as SQLite from 'expo-sqlite';
import { Database } from './Database';
import { Platform } from 'react-native';

export abstract class BaseDAO<T> {
  protected db: SQLite.SQLiteDatabase | null;
  protected database: Database;
  protected tableName: string;
  protected isWebPlatform = Platform.OS === 'web';

  constructor(tableName: string) {
    this.tableName = tableName;
    this.database = Database.getInstance();
    this.db = this.database.getDb();
  }

  protected ensureDatabase(): SQLite.SQLiteDatabase | null {
    if (!this.db) {
      this.db = this.database.getDb();
    }
    return this.db;
  }

  protected generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  protected getNow(): string {
    return new Date().toISOString();
  }

  protected async encryptSensitiveData(data: string): Promise<string> {
    return await this.database.encryptData(data);
  }

  protected parseJsonField<T>(field: string | null): T | null {
    if (!field) return null;
    try {
      return JSON.parse(field) as T;
    } catch {
      return null;
    }
  }

  protected stringifyJsonField(data: any): string {
    return JSON.stringify(data || null);
  }

  async findAll(): Promise<T[]> {
    const db = this.ensureDatabase();
    if (!db || this.isWebPlatform) return [];
    const result = await db.getAllAsync<T>(
      `SELECT * FROM ${this.tableName} ORDER BY createdAt DESC`
    );
    return result || [];
  }

  async findById(id: string): Promise<T | null> {
    const db = this.ensureDatabase();
    if (!db || this.isWebPlatform) return null;
    const result = await db.getFirstAsync<T>(
      `SELECT * FROM ${this.tableName} WHERE id = ?`,
      [id]
    );
    return result || null;
  }

  async deleteById(id: string): Promise<boolean> {
    const db = this.ensureDatabase();
    if (!db || this.isWebPlatform) return false;
    const result = await db.runAsync(
      `DELETE FROM ${this.tableName} WHERE id = ?`,
      [id]
    );
    return result.changes > 0;
  }

  async count(): Promise<number> {
    const db = this.ensureDatabase();
    if (!db || this.isWebPlatform) return 0;
    const result = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${this.tableName}`
    );
    return result?.count || 0;
  }
}