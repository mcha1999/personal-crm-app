import { useEffect, useState, useMemo } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { Database } from '@/database/Database';

export const [DatabaseProvider, useDatabase] = createContextHook(() => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initDatabase = async () => {
      try {
        console.log('Initializing database...');
        const db = Database.getInstance();
        await db.init();
        setIsInitialized(true);
        console.log('Database initialized successfully');
      } catch (err) {
        console.error('Failed to initialize database:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize database');
      }
    };

    initDatabase();
  }, []);

  return useMemo(() => ({
    isInitialized,
    error,
    database: Database.getInstance(),
  }), [isInitialized, error]);
});