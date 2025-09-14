import { BaseDAO } from './BaseDAO';
import { Place } from '../models/Place';

interface PlaceDB {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  category: string | null;
  createdAt: string;
  updatedAt: string;
}

export class PlaceDAO extends BaseDAO<PlaceDB> {
  constructor() {
    super('places');
  }

  private dbToPlace(db: PlaceDB): Place {
    return {
      id: db.id,
      name: db.name,
      address: db.address || undefined,
      latitude: db.latitude || 0,
      longitude: db.longitude || 0,
      category: (db.category || 'other') as Place['category'],
      createdAt: new Date(db.createdAt),
      updatedAt: new Date(db.updatedAt),
    };
  }

  async create(place: Omit<Place, 'id' | 'createdAt' | 'updatedAt'>): Promise<Place> {
    if (!this.db || this.isWebPlatform) {
      throw new Error('Database not available');
    }
    const id = this.generateId();
    const now = this.getNow();
    
    await this.db.runAsync(
      `INSERT INTO places (id, name, address, latitude, longitude, category, createdAt, updatedAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        place.name,
        place.address || null,
        place.latitude || null,
        place.longitude || null,
        place.category || null,
        now,
        now
      ]
    );

    const created = await this.getPlaceById(id);
    if (!created) throw new Error('Failed to create place');
    return created;
  }

  async update(id: string, place: Partial<Omit<Place, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Place | null> {
    if (!this.db || this.isWebPlatform) return null;
    const fields: string[] = [];
    const values: any[] = [];

    if (place.name !== undefined) {
      fields.push('name = ?');
      values.push(place.name);
    }
    if (place.address !== undefined) {
      fields.push('address = ?');
      values.push(place.address || null);
    }
    if (place.latitude !== undefined) {
      fields.push('latitude = ?');
      values.push(place.latitude || null);
    }
    if (place.longitude !== undefined) {
      fields.push('longitude = ?');
      values.push(place.longitude || null);
    }
    if (place.category !== undefined) {
      fields.push('category = ?');
      values.push(place.category || null);
    }

    if (fields.length === 0) return this.getPlaceById(id);

    fields.push('updatedAt = ?');
    values.push(this.getNow());
    values.push(id);

    await this.db.runAsync(
      `UPDATE places SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return this.getPlaceById(id);
  }

  async getPlaceById(id: string): Promise<Place | null> {
    if (!this.db || this.isWebPlatform) return null;
    const result = await this.db.getFirstAsync<PlaceDB>(
      `SELECT * FROM places WHERE id = ?`,
      [id]
    );
    return result ? this.dbToPlace(result) : null;
  }

  async getAllPlaces(): Promise<Place[]> {
    if (!this.db || this.isWebPlatform) return [];
    const results = await this.db.getAllAsync<PlaceDB>(
      `SELECT * FROM places ORDER BY name`
    );
    return (results || []).map(r => this.dbToPlace(r));
  }

  async searchByName(query: string): Promise<Place[]> {
    if (!this.db || this.isWebPlatform) return [];
    const results = await this.db.getAllAsync<PlaceDB>(
      `SELECT * FROM places WHERE name LIKE ? ORDER BY name`,
      [`%${query}%`]
    );
    return (results || []).map(r => this.dbToPlace(r));
  }

  async getByCategory(category: string): Promise<Place[]> {
    if (!this.db || this.isWebPlatform) return [];
    const results = await this.db.getAllAsync<PlaceDB>(
      `SELECT * FROM places WHERE category = ? ORDER BY name`,
      [category]
    );
    return (results || []).map(r => this.dbToPlace(r));
  }

  async getFrequentPlaces(limit: number = 10): Promise<(Place & { visitCount: number; lastVisit: Date })[]> {
    if (!this.db || this.isWebPlatform) return [];
    const results = await this.db.getAllAsync<PlaceDB & { visitCount: number; lastVisit: string }>(
      `SELECT p.*, COUNT(i.id) as visitCount, MAX(i.date) as lastVisit
       FROM places p
       LEFT JOIN interactions i ON p.id = i.placeId
       GROUP BY p.id
       HAVING visitCount > 0
       ORDER BY visitCount DESC, lastVisit DESC
       LIMIT ?`,
      [limit]
    );
    
    return (results || []).map(r => ({
      ...this.dbToPlace(r),
      visitCount: r.visitCount,
      lastVisit: new Date(r.lastVisit)
    }));
  }
}