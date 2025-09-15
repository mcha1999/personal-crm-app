import { BaseDAO } from './BaseDAO';
import { Meeting } from '../models/Meeting';

interface MeetingRow {
  id: string;
  title: string;
  date: string;
  location: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export class MeetingDAO extends BaseDAO<Meeting> {
  constructor() {
    super('meetings');
  }

  private mapRowToMeeting(row: MeetingRow): Meeting {
    return {
      id: row.id,
      title: row.title,
      date: new Date(row.date),
      personIds: [],
      placeId: undefined,
      duration: undefined,
      notes: row.notes || undefined,
      type: 'in-person' as const,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }

  async findAll(): Promise<Meeting[]> {
    if (!this.db || this.isWebPlatform) return [];
    const rows = await this.db.getAllAsync<MeetingRow>(
      `SELECT * FROM ${this.tableName} ORDER BY date DESC`
    );
    return rows.map(row => this.mapRowToMeeting(row));
  }

  async findById(id: string): Promise<Meeting | null> {
    if (!this.db || this.isWebPlatform) return null;
    const row = await this.db.getFirstAsync<MeetingRow>(
      `SELECT * FROM ${this.tableName} WHERE id = ?`,
      [id]
    );
    return row ? this.mapRowToMeeting(row) : null;
  }

  async findUpcoming(): Promise<Meeting[]> {
    if (!this.db || this.isWebPlatform) return [];
    const now = new Date().toISOString();
    const rows = await this.db.getAllAsync<MeetingRow>(
      `SELECT * FROM ${this.tableName} WHERE date >= ? ORDER BY date ASC`,
      [now]
    );
    return rows.map(row => this.mapRowToMeeting(row));
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<Meeting[]> {
    if (!this.db || this.isWebPlatform) return [];
    const rows = await this.db.getAllAsync<MeetingRow>(
      `SELECT * FROM ${this.tableName} WHERE date BETWEEN ? AND ? ORDER BY date ASC`,
      [startDate.toISOString(), endDate.toISOString()]
    );
    return rows.map(row => this.mapRowToMeeting(row));
  }

  async create(meeting: Omit<Meeting, 'id' | 'createdAt' | 'updatedAt'>): Promise<Meeting> {
    if (!this.db || this.isWebPlatform) {
      throw new Error('Database not available');
    }

    const now = this.getNow();
    const id = this.generateId();
    
    await this.db.runAsync(
      `INSERT INTO ${this.tableName} (id, title, date, location, notes, createdAt, updatedAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        meeting.title,
        meeting.date.toISOString(),
        null,
        meeting.notes || null,
        now,
        now
      ]
    );

    return {
      ...meeting,
      id,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    };
  }

  async update(id: string, updates: Partial<Omit<Meeting, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Meeting | null> {
    if (!this.db || this.isWebPlatform) return null;

    const existing = await this.findById(id);
    if (!existing) return null;

    const now = this.getNow();
    
    await this.db.runAsync(
      `UPDATE ${this.tableName} 
       SET title = ?, date = ?, location = ?, notes = ?, updatedAt = ?
       WHERE id = ?`,
      [
        updates.title ?? existing.title,
        (updates.date ?? existing.date).toISOString(),
        null,
        updates.notes ?? existing.notes ?? null,
        now,
        id
      ]
    );

    return await this.findById(id);
  }

  async addAttendee(meetingId: string, personId: string): Promise<boolean> {
    if (!this.db || this.isWebPlatform) return false;
    
    try {
      await this.db.runAsync(
        'INSERT OR IGNORE INTO meeting_attendees (meetingId, personId) VALUES (?, ?)',
        [meetingId, personId]
      );
      return true;
    } catch {
      return false;
    }
  }

  async removeAttendee(meetingId: string, personId: string): Promise<boolean> {
    if (!this.db || this.isWebPlatform) return false;
    
    const result = await this.db.runAsync(
      'DELETE FROM meeting_attendees WHERE meetingId = ? AND personId = ?',
      [meetingId, personId]
    );
    return result.changes > 0;
  }

  async getAttendees(meetingId: string): Promise<string[]> {
    if (!this.db || this.isWebPlatform) return [];
    
    const rows = await this.db.getAllAsync<{ personId: string }>(
      'SELECT personId FROM meeting_attendees WHERE meetingId = ?',
      [meetingId]
    );
    return rows.map(row => row.personId);
  }

  async addPlace(meetingId: string, placeId: string): Promise<boolean> {
    if (!this.db || this.isWebPlatform) return false;
    
    try {
      await this.db.runAsync(
        'INSERT OR IGNORE INTO meeting_places (meetingId, placeId) VALUES (?, ?)',
        [meetingId, placeId]
      );
      return true;
    } catch {
      return false;
    }
  }

  async removePlace(meetingId: string, placeId: string): Promise<boolean> {
    if (!this.db || this.isWebPlatform) return false;
    
    const result = await this.db.runAsync(
      'DELETE FROM meeting_places WHERE meetingId = ? AND placeId = ?',
      [meetingId, placeId]
    );
    return result.changes > 0;
  }

  async getPlaces(meetingId: string): Promise<string[]> {
    if (!this.db || this.isWebPlatform) return [];
    
    const rows = await this.db.getAllAsync<{ placeId: string }>(
      'SELECT placeId FROM meeting_places WHERE meetingId = ?',
      [meetingId]
    );
    return rows.map(row => row.placeId);
  }
}