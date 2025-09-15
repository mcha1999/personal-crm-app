import { BaseDAO } from './BaseDAO';
import { Interaction } from '../models/Interaction';

interface InteractionDB {
  id: string;
  personId: string;
  type: string;
  date: string;
  notes: string | null;
  placeId: string | null;
  createdAt: string;
  updatedAt: string;
}

export class InteractionDAO extends BaseDAO<InteractionDB> {
  constructor() {
    super('interactions');
  }

  private dbToInteraction(db: InteractionDB): Interaction {
    return {
      id: db.id,
      personId: db.personId,
      type: db.type as Interaction['type'],
      date: new Date(db.date),
      notes: db.notes || undefined,
      placeId: db.placeId || undefined,
      createdAt: new Date(db.createdAt),
      updatedAt: new Date(db.updatedAt),
    };
  }

  async create(interaction: Omit<Interaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<Interaction> {
    const db = this.ensureDatabase();
    if (!db || this.isWebPlatform) {
      throw new Error('Database not available');
    }
    const id = this.generateId();
    const now = this.getNow();
    
    await db.runAsync(
      `INSERT INTO interactions (id, personId, type, date, notes, placeId, createdAt, updatedAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        interaction.personId,
        interaction.type,
        interaction.date.toISOString(),
        interaction.notes || null,
        interaction.placeId || null,
        now,
        now
      ]
    );

    const created = await this.getInteractionById(id);
    if (!created) throw new Error('Failed to create interaction');
    return created;
  }

  async getInteractionById(id: string): Promise<Interaction | null> {
    const db = this.ensureDatabase();
    if (!db || this.isWebPlatform) return null;
    const result = await db.getFirstAsync<InteractionDB>(
      `SELECT * FROM interactions WHERE id = ?`,
      [id]
    );
    return result ? this.dbToInteraction(result) : null;
  }

  async getByPerson(personId: string, limit?: number): Promise<Interaction[]> {
    const db = this.ensureDatabase();
    if (!db || this.isWebPlatform) return [];
    const query = limit 
      ? `SELECT * FROM interactions WHERE personId = ? ORDER BY date DESC LIMIT ?`
      : `SELECT * FROM interactions WHERE personId = ? ORDER BY date DESC`;
    
    const params = limit ? [personId, limit] : [personId];
    
    const results = await db.getAllAsync<InteractionDB>(query, params);
    return (results || []).map(r => this.dbToInteraction(r));
  }

  async getByPlace(placeId: string): Promise<Interaction[]> {
    const db = this.ensureDatabase();
    if (!db || this.isWebPlatform) return [];
    const results = await db.getAllAsync<InteractionDB>(
      `SELECT * FROM interactions WHERE placeId = ? ORDER BY date DESC`,
      [placeId]
    );
    return (results || []).map(r => this.dbToInteraction(r));
  }

  async getRecent(limit: number = 20): Promise<Interaction[]> {
    const db = this.ensureDatabase();
    if (!db || this.isWebPlatform) return [];
    const results = await db.getAllAsync<InteractionDB>(
      `SELECT * FROM interactions ORDER BY date DESC LIMIT ?`,
      [limit]
    );
    return (results || []).map(r => this.dbToInteraction(r));
  }

  async markPersonTouched(personId: string, type: Interaction['type'] = 'message', notes?: string): Promise<Interaction> {
    const interaction = await this.create({
      personId,
      type,
      date: new Date(),
      notes
    });

    const db = this.ensureDatabase();
    if (db && !this.isWebPlatform) {
      await db.runAsync(
      `UPDATE persons SET lastInteraction = ? WHERE id = ?`,
        [new Date().toISOString(), personId]
      );
    }

    return interaction;
  }

  async findByPersonAndDate(personId: string, date: Date): Promise<Interaction | null> {
    const db = this.ensureDatabase();
    if (!db || this.isWebPlatform) return null;
    const dateStr = date.toISOString().split('T')[0]; // Get date part only
    const result = await db.getFirstAsync<InteractionDB>(
      `SELECT * FROM interactions 
       WHERE personId = ? AND date(date) = date(?)
       ORDER BY date DESC LIMIT 1`,
      [personId, dateStr]
    );
    return result ? this.dbToInteraction(result) : null;
  }
}