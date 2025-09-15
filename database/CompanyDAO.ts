import { BaseDAO } from './BaseDAO';
import { Company } from '../models/Company';

interface CompanyRow {
  id: string;
  name: string;
  industry: string | null;
  website: string | null;
  createdAt: string;
  updatedAt: string;
}

export class CompanyDAO extends BaseDAO<Company> {
  constructor() {
    super('companies');
  }

  private mapRowToCompany(row: CompanyRow): Company {
    return {
      id: row.id,
      name: row.name,
      industry: row.industry || undefined,
      website: row.website || undefined,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }

  async findAll(): Promise<Company[]> {
    if (!this.db || this.isWebPlatform) return [];
    const rows = await this.db.getAllAsync<CompanyRow>(
      `SELECT * FROM ${this.tableName} ORDER BY name ASC`
    );
    return rows.map(row => this.mapRowToCompany(row));
  }

  async findById(id: string): Promise<Company | null> {
    if (!this.db || this.isWebPlatform) return null;
    const row = await this.db.getFirstAsync<CompanyRow>(
      `SELECT * FROM ${this.tableName} WHERE id = ?`,
      [id]
    );
    return row ? this.mapRowToCompany(row) : null;
  }

  async findByName(name: string): Promise<Company[]> {
    if (!this.db || this.isWebPlatform) return [];
    const rows = await this.db.getAllAsync<CompanyRow>(
      `SELECT * FROM ${this.tableName} WHERE name LIKE ? ORDER BY name ASC`,
      [`%${name}%`]
    );
    return rows.map(row => this.mapRowToCompany(row));
  }

  async create(company: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>): Promise<Company> {
    if (!this.db || this.isWebPlatform) {
      throw new Error('Database not available');
    }

    const now = this.getNow();
    const id = this.generateId();
    
    await this.db.runAsync(
      `INSERT INTO ${this.tableName} (id, name, industry, website, createdAt, updatedAt) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        company.name,
        company.industry || null,
        company.website || null,
        now,
        now
      ]
    );

    return {
      ...company,
      id,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    };
  }

  async update(id: string, updates: Partial<Omit<Company, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Company | null> {
    if (!this.db || this.isWebPlatform) return null;

    const existing = await this.findById(id);
    if (!existing) return null;

    const now = this.getNow();
    
    await this.db.runAsync(
      `UPDATE ${this.tableName} 
       SET name = ?, industry = ?, website = ?, updatedAt = ?
       WHERE id = ?`,
      [
        updates.name ?? existing.name,
        updates.industry ?? existing.industry ?? null,
        updates.website ?? existing.website ?? null,
        now,
        id
      ]
    );

    return await this.findById(id);
  }
}