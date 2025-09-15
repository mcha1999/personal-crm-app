import { useEffect, useState, useMemo } from 'react';
import { Platform } from 'react-native';
import createContextHook from '@nkzw/create-context-hook';
import { Database } from '@/database/Database';

export const [DatabaseProvider, useDatabase] = createContextHook(() => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initDatabase = async () => {
      try {
        console.log('[DatabaseContext] Initializing database...');
        const db = Database.getInstance();
        await db.init();
        setIsInitialized(true);
        console.log('[DatabaseContext] Database initialized successfully');
      } catch (err) {
        console.error('[DatabaseContext] Failed to initialize database:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize database');
        // On web, we still want to mark as initialized even if database fails
        // since the app should still work without database
        if (Platform.OS === 'web') {
          console.log('[DatabaseContext] Marking as initialized on web platform despite database error');
          setIsInitialized(true);
        }
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