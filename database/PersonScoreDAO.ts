import { BaseDAO } from './BaseDAO';
import { PersonScore } from '../models/PersonScore';

interface PersonScoreRow {
  id: string;
  personId: string;
  relationshipScore: number;
  interactionFrequency: number;
  lastInteractionDaysAgo: number;
  totalInteractions: number;
  averageResponseTime: number | null;
  calculatedAt: string;
}

export class PersonScoreDAO extends BaseDAO<PersonScore> {
  constructor() {
    super('person_scores');
  }

  private mapRowToPersonScore(row: PersonScoreRow): PersonScore {
    return {
      id: row.id,
      personId: row.personId,
      relationshipScore: row.relationshipScore,
      interactionFrequency: row.interactionFrequency,
      lastInteractionDaysAgo: row.lastInteractionDaysAgo,
      totalInteractions: row.totalInteractions,
      averageResponseTime: row.averageResponseTime || undefined,
      calculatedAt: new Date(row.calculatedAt),
    };
  }

  async findAll(): Promise<PersonScore[]> {
    const db = this.ensureDatabase();
    if (!db || this.isWebPlatform) return [];
    const rows = await db.getAllAsync<PersonScoreRow>(
      `SELECT * FROM ${this.tableName} ORDER BY relationshipScore DESC`
    );
    return rows.map(row => this.mapRowToPersonScore(row));
  }

  async findById(id: string): Promise<PersonScore | null> {
    const db = this.ensureDatabase();
    if (!db || this.isWebPlatform) return null;
    const row = await db.getFirstAsync<PersonScoreRow>(
      `SELECT * FROM ${this.tableName} WHERE id = ?`,
      [id]
    );
    return row ? this.mapRowToPersonScore(row) : null;
  }

  async findByPersonId(personId: string): Promise<PersonScore | null> {
    const db = this.ensureDatabase();
    if (!db || this.isWebPlatform) return null;
    const row = await db.getFirstAsync<PersonScoreRow>(
      `SELECT * FROM ${this.tableName} WHERE personId = ?`,
      [personId]
    );
    return row ? this.mapRowToPersonScore(row) : null;
  }

  async findTopScores(limit: number = 10): Promise<PersonScore[]> {
    const db = this.ensureDatabase();
    if (!db || this.isWebPlatform) return [];
    const rows = await db.getAllAsync<PersonScoreRow>(
      `SELECT * FROM ${this.tableName} ORDER BY relationshipScore DESC LIMIT ?`,
      [limit]
    );
    return rows.map(row => this.mapRowToPersonScore(row));
  }

  async create(personScore: Omit<PersonScore, 'id' | 'createdAt' | 'updatedAt'>): Promise<PersonScore> {
    const db = this.ensureDatabase();
    if (!db || this.isWebPlatform) {
      throw new Error('Database not available');
    }

    const now = this.getNow();
    const id = this.generateId();
    
    await db.runAsync(
      `INSERT INTO ${this.tableName} (id, personId, relationshipScore, interactionFrequency, lastInteractionDaysAgo, totalInteractions, averageResponseTime, calculatedAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        personScore.personId,
        personScore.relationshipScore,
        personScore.interactionFrequency,
        personScore.lastInteractionDaysAgo,
        personScore.totalInteractions,
        personScore.averageResponseTime || null,
        now
      ]
    );

    return {
      ...personScore,
      id,
      calculatedAt: new Date(now),
    };
  }

  async update(id: string, updates: Partial<Omit<PersonScore, 'id' | 'createdAt' | 'updatedAt'>>): Promise<PersonScore | null> {
    const db = this.ensureDatabase();
    if (!db || this.isWebPlatform) return null;

    const existing = await this.findById(id);
    if (!existing) return null;

    const now = this.getNow();
    
    await db.runAsync(
      `UPDATE ${this.tableName} 
       SET personId = ?, relationshipScore = ?, interactionFrequency = ?, lastInteractionDaysAgo = ?, totalInteractions = ?, averageResponseTime = ?, calculatedAt = ?
       WHERE id = ?`,
      [
        updates.personId ?? existing.personId,
        updates.relationshipScore ?? existing.relationshipScore,
        updates.interactionFrequency ?? existing.interactionFrequency,
        updates.lastInteractionDaysAgo ?? existing.lastInteractionDaysAgo,
        updates.totalInteractions ?? existing.totalInteractions,
        updates.averageResponseTime ?? existing.averageResponseTime ?? null,
        now,
        id
      ]
    );

    return await this.findById(id);
  }

  async updateScore(personId: string, scoreChange: number): Promise<PersonScore | null> {
    const db = this.ensureDatabase();
    if (!db || this.isWebPlatform) return null;

    let personScore = await this.findByPersonId(personId);
    
    if (!personScore) {
      personScore = await this.create({
        personId,
        relationshipScore: Math.max(0, scoreChange),
        interactionFrequency: 0,
        lastInteractionDaysAgo: 0,
        totalInteractions: 0,
        calculatedAt: new Date(),
      });
    } else {
      const newScore = Math.max(0, personScore.relationshipScore + scoreChange);
      personScore = await this.update(personScore.id, { relationshipScore: newScore });
    }

    return personScore;
  }

  async incrementInteractionCount(personId: string): Promise<PersonScore | null> {
    const db = this.ensureDatabase();
    if (!db || this.isWebPlatform) return null;

    let personScore = await this.findByPersonId(personId);
    
    if (!personScore) {
      personScore = await this.create({
        personId,
        relationshipScore: 10,
        interactionFrequency: 1,
        lastInteractionDaysAgo: 0,
        totalInteractions: 1,
        calculatedAt: new Date(),
      });
    } else {
      personScore = await this.update(personScore.id, {
        lastInteractionDaysAgo: 0,
        totalInteractions: personScore.totalInteractions + 1,
      });
    }

    return personScore;
  }
}