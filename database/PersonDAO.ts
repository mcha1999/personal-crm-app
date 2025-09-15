import { BaseDAO } from './BaseDAO';
import { Person } from '../models/Person';

interface PersonDB {
  id: string;
  firstName: string;
  lastName: string;
  nickname: string | null;
  email: string | null;
  phone: string | null;
  birthday: string | null;
  avatar: string | null;
  relationship: string;
  tags: string | null;
  notes: string | null;
  companyId: string | null;
  lastInteraction: string | null;
  createdAt: string;
  updatedAt: string;
}

export class PersonDAO extends BaseDAO<PersonDB> {
  constructor() {
    super('persons');
  }

  private dbToPerson(db: PersonDB): Person {
    let parsedTags: string[] = [];
    if (db.tags) {
      try {
        // Check if tags is already an array (shouldn't happen but defensive)
        if (Array.isArray(db.tags)) {
          parsedTags = db.tags;
        } else if (typeof db.tags === 'string') {
          parsedTags = JSON.parse(db.tags);
        }
      } catch (err) {
        console.error('Failed to parse tags for person', db.id, ':', err);
        parsedTags = [];
      }
    }

    return {
      ...db,
      nickname: db.nickname || undefined,
      email: db.email || undefined,
      phone: db.phone || undefined,
      birthday: db.birthday ? new Date(db.birthday) : undefined,
      avatar: db.avatar || undefined,
      relationship: db.relationship as Person['relationship'],
      tags: parsedTags,
      notes: db.notes || undefined,
      companyId: db.companyId || undefined,
      lastInteraction: db.lastInteraction ? new Date(db.lastInteraction) : undefined,
      createdAt: new Date(db.createdAt),
      updatedAt: new Date(db.updatedAt),
    };
  }

  private personToDb(person: Partial<Person>): Partial<PersonDB> {
    const db: Partial<PersonDB> = {};
    
    if (person.firstName !== undefined) db.firstName = person.firstName;
    if (person.lastName !== undefined) db.lastName = person.lastName;
    if (person.nickname !== undefined) db.nickname = person.nickname || null;
    if (person.email !== undefined) db.email = person.email || null;
    if (person.phone !== undefined) db.phone = person.phone || null;
    if (person.birthday !== undefined) db.birthday = person.birthday ? person.birthday.toISOString() : null;
    if (person.avatar !== undefined) db.avatar = person.avatar || null;
    if (person.relationship !== undefined) db.relationship = person.relationship;
    if (person.tags !== undefined) db.tags = JSON.stringify(person.tags);
    if (person.notes !== undefined) db.notes = person.notes || null;
    if (person.companyId !== undefined) db.companyId = person.companyId || null;
    if (person.lastInteraction !== undefined) db.lastInteraction = person.lastInteraction ? person.lastInteraction.toISOString() : null;
    
    return db;
  }

  async create(person: Omit<Person, 'id' | 'createdAt' | 'updatedAt'>): Promise<Person> {
    if (!this.db || this.isWebPlatform) {
      throw new Error('Database not available');
    }
    const id = this.generateId();
    const now = this.getNow();
    const dbPerson = this.personToDb(person);
    
    await this.db.runAsync(
      `INSERT INTO persons (id, firstName, lastName, nickname, email, phone, avatar, birthday, relationship, tags, notes, companyId, lastInteraction, createdAt, updatedAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, 
        dbPerson.firstName || '', 
        dbPerson.lastName || '', 
        dbPerson.nickname || null,
        dbPerson.email || null, 
        dbPerson.phone || null, 
        dbPerson.avatar || null, 
        dbPerson.birthday || null, 
        dbPerson.relationship || 'acquaintance',
        dbPerson.tags || '[]',
        dbPerson.notes || null, 
        dbPerson.companyId || null,
        dbPerson.lastInteraction || null,
        now, 
        now
      ]
    );

    const created = await this.getPersonById(id);
    if (!created) throw new Error('Failed to create person');
    return created;
  }

  async update(id: string, person: Partial<Omit<Person, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Person | null> {
    if (!this.db || this.isWebPlatform) return null;
    const dbPerson = this.personToDb(person);
    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(dbPerson).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) {
      const existing = await this.getPersonById(id);
      return existing;
    }

    fields.push('updatedAt = ?');
    values.push(this.getNow());
    values.push(id);

    await this.db.runAsync(
      `UPDATE persons SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return this.getPersonById(id);
  }

  async getPersonById(id: string): Promise<Person | null> {
    if (!this.db || this.isWebPlatform) return null;
    const result = await this.db.getFirstAsync<PersonDB>(
      `SELECT * FROM persons WHERE id = ?`,
      [id]
    );
    return result ? this.dbToPerson(result) : null;
  }

  async getAllPersons(): Promise<Person[]> {
    if (!this.db || this.isWebPlatform) return [];
    const results = await this.db.getAllAsync<PersonDB>(
      `SELECT * FROM persons ORDER BY firstName, lastName`
    );
    return (results || []).map(r => this.dbToPerson(r));
  }

  async findByCompany(companyId: string): Promise<Person[]> {
    if (!this.db || this.isWebPlatform) return [];
    const results = await this.db.getAllAsync<PersonDB>(
      `SELECT * FROM persons WHERE companyId = ? ORDER BY firstName, lastName`,
      [companyId]
    );
    return (results || []).map(r => this.dbToPerson(r));
  }

  async searchByName(query: string): Promise<Person[]> {
    if (!this.db || this.isWebPlatform) return [];
    const results = await this.db.getAllAsync<PersonDB>(
      `SELECT * FROM persons 
       WHERE firstName LIKE ? OR lastName LIKE ? OR nickname LIKE ?
       ORDER BY firstName, lastName`,
      [`%${query}%`, `%${query}%`, `%${query}%`]
    );
    return (results || []).map(r => this.dbToPerson(r));
  }

  async getUpcomingBirthdays(days: number = 30): Promise<Person[]> {
    if (!this.db || this.isWebPlatform) return [];
    const results = await this.db.getAllAsync<PersonDB>(
      `SELECT * FROM persons 
       WHERE birthday IS NOT NULL 
       AND strftime('%m-%d', birthday) >= strftime('%m-%d', 'now')
       AND strftime('%m-%d', birthday) <= strftime('%m-%d', 'now', '+${days} days')
       ORDER BY strftime('%m-%d', birthday)`,
      []
    );
    return (results || []).map(r => this.dbToPerson(r));
  }

  async getRecentContacts(limit: number = 10): Promise<Person[]> {
    if (!this.db || this.isWebPlatform) return [];
    const results = await this.db.getAllAsync<PersonDB>(
      `SELECT * FROM persons 
       WHERE lastInteraction IS NOT NULL
       ORDER BY lastInteraction DESC
       LIMIT ?`,
      [limit]
    );
    return (results || []).map(r => this.dbToPerson(r));
  }

  async findByEmail(email: string): Promise<Person | null> {
    if (!this.db || this.isWebPlatform) return null;
    const result = await this.db.getFirstAsync<PersonDB>(
      `SELECT * FROM persons WHERE email = ?`,
      [email]
    );
    return result ? this.dbToPerson(result) : null;
  }

  async getAll(): Promise<Person[]> {
    return this.getAllPersons();
  }
}