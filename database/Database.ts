import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

export class Database {
  private static instance: Database;
  private db: SQLite.SQLiteDatabase | null = null;
  private isWebPlatform = Platform.OS === 'web';
  private encryptionKey: string | null = null;

  private constructor() {}

  static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  async init(): Promise<void> {
    if (this.db) return;
    
    try {
      if (!this.isWebPlatform) {
        await this.initializeEncryption();
        this.db = await SQLite.openDatabaseAsync('kin.db');
        await this.createTables();
        await this.seedInitialData();
      }
    } catch (error) {
      console.warn('SQLite initialization failed:', error);
      // Continue without database on web
    }
  }

  getDb(): SQLite.SQLiteDatabase | null {
    return this.db;
  }

  isAvailable(): boolean {
    return this.db !== null;
  }

  private async initializeEncryption(): Promise<void> {
    if (this.isWebPlatform) return;

    try {
      let key = await SecureStore.getItemAsync('kin_db_key');
      if (!key) {
        key = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          Math.random().toString(36) + Date.now().toString(36),
          { encoding: Crypto.CryptoEncoding.HEX }
        );
        await SecureStore.setItemAsync('kin_db_key', key);
      }
      this.encryptionKey = key;
    } catch (error) {
      console.warn('Encryption initialization failed:', error);
      this.encryptionKey = null;
    }
  }

  async encryptData(data: string): Promise<string> {
    if (!this.encryptionKey || this.isWebPlatform) return data;
    
    try {
      const hash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        this.encryptionKey + data,
        { encoding: Crypto.CryptoEncoding.BASE64 }
      );
      return hash;
    } catch (error) {
      console.warn('Encryption failed:', error);
      return data;
    }
  }

  getEncryptionKey(): string | null {
    return this.encryptionKey;
  }

  private async createTables(): Promise<void> {
    if (!this.db || this.isWebPlatform) return;

    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS persons (
        id TEXT PRIMARY KEY,
        firstName TEXT NOT NULL,
        lastName TEXT NOT NULL,
        nickname TEXT,
        email TEXT,
        phone TEXT,
        birthday TEXT,
        avatar TEXT,
        relationship TEXT NOT NULL,
        tags TEXT,
        notes TEXT,
        companyId TEXT,
        lastInteraction TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS companies (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        industry TEXT,
        website TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS meetings (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        date TEXT NOT NULL,
        location TEXT,
        notes TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS meeting_attendees (
        meetingId TEXT NOT NULL,
        personId TEXT NOT NULL,
        PRIMARY KEY (meetingId, personId),
        FOREIGN KEY (meetingId) REFERENCES meetings(id),
        FOREIGN KEY (personId) REFERENCES persons(id)
      );

      CREATE TABLE IF NOT EXISTS threads (
        id TEXT PRIMARY KEY,
        subject TEXT NOT NULL,
        lastMessageAt TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS thread_participants (
        threadId TEXT NOT NULL,
        personId TEXT NOT NULL,
        PRIMARY KEY (threadId, personId),
        FOREIGN KEY (threadId) REFERENCES threads(id),
        FOREIGN KEY (personId) REFERENCES persons(id)
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        threadId TEXT NOT NULL,
        senderId TEXT NOT NULL,
        content TEXT NOT NULL,
        sentAt TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (threadId) REFERENCES threads(id),
        FOREIGN KEY (senderId) REFERENCES persons(id)
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        dueDate TEXT,
        completed INTEGER DEFAULT 0,
        completedAt TEXT,
        type TEXT NOT NULL,
        personId TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (personId) REFERENCES persons(id)
      );

      CREATE TABLE IF NOT EXISTS places (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        address TEXT,
        latitude REAL,
        longitude REAL,
        category TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS interactions (
        id TEXT PRIMARY KEY,
        personId TEXT NOT NULL,
        type TEXT NOT NULL,
        date TEXT NOT NULL,
        notes TEXT,
        placeId TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (personId) REFERENCES persons(id),
        FOREIGN KEY (placeId) REFERENCES places(id)
      );

      CREATE TABLE IF NOT EXISTS person_scores (
        id TEXT PRIMARY KEY,
        personId TEXT NOT NULL,
        relationshipScore INTEGER NOT NULL,
        interactionFrequency INTEGER NOT NULL,
        lastInteractionDaysAgo INTEGER NOT NULL,
        totalInteractions INTEGER NOT NULL,
        averageResponseTime REAL,
        calculatedAt TEXT NOT NULL,
        FOREIGN KEY (personId) REFERENCES persons(id)
      );

      CREATE TABLE IF NOT EXISTS annotations (
        id TEXT PRIMARY KEY,
        entityType TEXT NOT NULL,
        entityId TEXT NOT NULL,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        metadata TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS meeting_places (
        meetingId TEXT NOT NULL,
        placeId TEXT NOT NULL,
        PRIMARY KEY (meetingId, placeId),
        FOREIGN KEY (meetingId) REFERENCES meetings(id),
        FOREIGN KEY (placeId) REFERENCES places(id)
      );

      CREATE INDEX IF NOT EXISTS idx_persons_company ON persons(companyId);
      CREATE INDEX IF NOT EXISTS idx_interactions_person ON interactions(personId);
      CREATE INDEX IF NOT EXISTS idx_interactions_date ON interactions(date);
      CREATE INDEX IF NOT EXISTS idx_tasks_person ON tasks(personId);
      CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(dueDate);
      CREATE INDEX IF NOT EXISTS idx_person_scores_person ON person_scores(personId);
      CREATE INDEX IF NOT EXISTS idx_person_scores_score ON person_scores(relationshipScore);
      CREATE INDEX IF NOT EXISTS idx_annotations_entity ON annotations(entityType, entityId);
      CREATE INDEX IF NOT EXISTS idx_annotations_type ON annotations(type);
    `);
  }

  private async seedInitialData(): Promise<void> {
    if (!this.db || this.isWebPlatform) return;

    const result = await this.db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM persons'
    );

    if (result && result.count > 0) return;

    const now = new Date().toISOString();

    await this.db.execAsync(`
      INSERT INTO companies (id, name, industry, website, createdAt, updatedAt) VALUES
      ('c1', 'TechCorp', 'Technology', 'https://techcorp.com', '${now}', '${now}'),
      ('c2', 'DesignStudio', 'Design', 'https://designstudio.com', '${now}', '${now}');

      INSERT INTO persons (id, firstName, lastName, nickname, email, phone, avatar, birthday, relationship, tags, notes, companyId, lastInteraction, createdAt, updatedAt) VALUES
      ('p1', 'Sarah', 'Johnson', null, 'sarah@example.com', '+1234567890', 'https://i.pravatar.cc/150?img=1', '1990-05-15', 'friend', '[\"college\",\"close\"]', 'Close friend from college', 'c1', '${new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()}', '${now}', '${now}'),
      ('p2', 'Mike', 'Chen', null, 'mike@example.com', '+1234567891', 'https://i.pravatar.cc/150?img=2', '1988-11-22', 'colleague', '[\"work\",\"design\"]', 'Former colleague', 'c2', '${new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()}', '${now}', '${now}'),
      ('p3', 'Emily', 'Davis', null, 'emily@example.com', '+1234567892', 'https://i.pravatar.cc/150?img=3', '1992-03-10', 'friend', '[\"yoga\",\"fitness\"]', 'Yoga class friend', null, '${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()}', '${now}', '${now}'),
      ('p4', 'Alex', 'Thompson', null, 'alex@example.com', '+1234567893', 'https://i.pravatar.cc/150?img=4', '1985-07-28', 'acquaintance', '[\"neighbor\"]', 'Neighbor', null, '${new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()}', '${now}', '${now}'),
      ('p5', 'Lisa', 'Wang', null, 'lisa@example.com', '+1234567894', 'https://i.pravatar.cc/150?img=5', '1991-12-05', 'friend', '[\"books\",\"reading\"]', 'Book club member', 'c1', '${new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()}', '${now}', '${now}');

      INSERT INTO places (id, name, address, latitude, longitude, category, createdAt, updatedAt) VALUES
      ('pl1', 'Central Coffee', '123 Main St', 37.7749, -122.4194, 'Coffee Shop', '${now}', '${now}'),
      ('pl2', 'Green Park', '456 Park Ave', 37.7751, -122.4180, 'Park', '${now}', '${now}'),
      ('pl3', 'The Italian Place', '789 Food St', 37.7740, -122.4200, 'Restaurant', '${now}', '${now}');

      INSERT INTO interactions (id, personId, type, date, notes, placeId, createdAt, updatedAt) VALUES
      ('i1', 'p1', 'meeting', '${new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()}', 'Coffee catch-up', 'pl1', '${now}', '${now}'),
      ('i2', 'p2', 'call', '${new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()}', 'Discussed project', null, '${now}', '${now}'),
      ('i3', 'p3', 'meeting', '${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()}', 'Lunch meeting', 'pl3', '${now}', '${now}'),
      ('i4', 'p4', 'message', '${new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()}', 'Quick chat', null, '${now}', '${now}'),
      ('i5', 'p5', 'meeting', '${new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()}', 'Book discussion', 'pl2', '${now}', '${now}');

      INSERT INTO tasks (id, title, description, dueDate, completed, completedAt, type, personId, createdAt, updatedAt) VALUES
      ('t1', 'Call Sarah for birthday', 'Wish her happy birthday', '${new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()}', 0, null, 'birthday', 'p1', '${now}', '${now}'),
      ('t2', 'Send Mike project files', 'Share the design files', '${new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString()}', 0, null, 'follow-up', 'p2', '${now}', '${now}'),
      ('t3', 'Coffee with Emily', 'Catch up at Central Coffee', '${new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()}', 0, null, 'reminder', 'p3', '${now}', '${now}');

      INSERT INTO person_scores (id, personId, relationshipScore, interactionFrequency, lastInteractionDaysAgo, totalInteractions, averageResponseTime, calculatedAt) VALUES
      ('ps1', 'p1', 95, 5, 2, 15, 2.5, '${now}'),
      ('ps2', 'p2', 80, 3, 5, 10, 4.0, '${now}'),
      ('ps3', 'p3', 75, 2, 7, 8, 6.0, '${now}'),
      ('ps4', 'p4', 70, 4, 1, 5, 1.5, '${now}'),
      ('ps5', 'p5', 65, 1, 10, 6, 8.0, '${now}');

      INSERT INTO meetings (id, title, date, location, notes, createdAt, updatedAt) VALUES
      ('m1', 'Team Sync', '${new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString()}', 'Office', 'Weekly sync meeting', '${now}', '${now}'),
      ('m2', 'Coffee Chat', '${new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()}', 'Central Coffee', 'Casual catch-up', '${now}', '${now}');

      INSERT INTO meeting_attendees (meetingId, personId) VALUES
      ('m1', 'p1'),
      ('m1', 'p2'),
      ('m2', 'p3');
    `);
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
    }
  }
}