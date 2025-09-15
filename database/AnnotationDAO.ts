import { BaseDAO } from './BaseDAO';
import { Annotation } from '../models/Annotation';

interface AnnotationRow {
  id: string;
  entityType: string;
  entityId: string;
  type: string;
  content: string;
  metadata: string | null;
  createdAt: string;
  updatedAt: string;
}

export class AnnotationDAO extends BaseDAO<Annotation> {
  constructor() {
    super('annotations');
  }

  private mapRowToAnnotation(row: AnnotationRow): Annotation {
    return {
      id: row.id,
      entityType: row.entityType as Annotation['entityType'],
      entityId: row.entityId,
      type: row.type as Annotation['type'],
      content: row.content,
      metadata: this.parseJsonField<Record<string, any>>(row.metadata) || undefined,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }

  async findAll(): Promise<Annotation[]> {
    if (!this.db || this.isWebPlatform) return [];
    const rows = await this.db.getAllAsync<AnnotationRow>(
      `SELECT * FROM ${this.tableName} ORDER BY createdAt DESC`
    );
    return rows.map(row => this.mapRowToAnnotation(row));
  }

  async findById(id: string): Promise<Annotation | null> {
    if (!this.db || this.isWebPlatform) return null;
    const row = await this.db.getFirstAsync<AnnotationRow>(
      `SELECT * FROM ${this.tableName} WHERE id = ?`,
      [id]
    );
    return row ? this.mapRowToAnnotation(row) : null;
  }

  async findByEntity(entityType: string, entityId: string): Promise<Annotation[]> {
    if (!this.db || this.isWebPlatform) return [];
    const rows = await this.db.getAllAsync<AnnotationRow>(
      `SELECT * FROM ${this.tableName} WHERE entityType = ? AND entityId = ? ORDER BY createdAt DESC`,
      [entityType, entityId]
    );
    return rows.map(row => this.mapRowToAnnotation(row));
  }

  async findByType(type: string): Promise<Annotation[]> {
    if (!this.db || this.isWebPlatform) return [];
    const rows = await this.db.getAllAsync<AnnotationRow>(
      `SELECT * FROM ${this.tableName} WHERE type = ? ORDER BY createdAt DESC`,
      [type]
    );
    return rows.map(row => this.mapRowToAnnotation(row));
  }

  async create(annotation: Omit<Annotation, 'id' | 'createdAt' | 'updatedAt'>): Promise<Annotation> {
    if (!this.db || this.isWebPlatform) {
      throw new Error('Database not available');
    }

    const now = this.getNow();
    const id = this.generateId();
    
    await this.db.runAsync(
      `INSERT INTO ${this.tableName} (id, entityType, entityId, type, content, metadata, createdAt, updatedAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        annotation.entityType,
        annotation.entityId,
        annotation.type,
        annotation.content,
        this.stringifyJsonField(annotation.metadata),
        now,
        now
      ]
    );

    return {
      ...annotation,
      id,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    };
  }

  async update(id: string, updates: Partial<Omit<Annotation, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Annotation | null> {
    if (!this.db || this.isWebPlatform) return null;

    const existing = await this.findById(id);
    if (!existing) return null;

    const now = this.getNow();
    
    await this.db.runAsync(
      `UPDATE ${this.tableName} 
       SET entityType = ?, entityId = ?, type = ?, content = ?, metadata = ?, updatedAt = ?
       WHERE id = ?`,
      [
        updates.entityType ?? existing.entityType,
        updates.entityId ?? existing.entityId,
        updates.type ?? existing.type,
        updates.content ?? existing.content,
        this.stringifyJsonField(updates.metadata ?? existing.metadata),
        now,
        id
      ]
    );

    return await this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    if (!this.db || this.isWebPlatform) return false;

    try {
      await this.db.runAsync(
        `DELETE FROM ${this.tableName} WHERE id = ?`,
        [id]
      );
      return true;
    } catch (error) {
      console.error('Failed to delete annotation:', error);
      return false;
    }
  }
}