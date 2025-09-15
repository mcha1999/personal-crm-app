import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { ContactsIngest } from '@/services/ContactsIngest';
import { ContactsListener } from '@/services/ContactsListener';
import { PersonDAO } from '@/database/PersonDAO';
import { Database } from '@/database/Database';

interface ContactsState {
  isImporting: boolean;
  lastImportResult: { imported: number; updated: number; skipped: number } | null;
  lastImportDate: Date | null;
  error: string | null;
}

export const [ContactsProvider, useContacts] = createContextHook(() => {
  const database = Database.getInstance();
  const personDAO = useMemo(() => new PersonDAO(), []);
  const contactsListener = useMemo(() => ContactsListener.getInstance(), []);
  const [state, setState] = useState<ContactsState>({
    isImporting: false,
    lastImportResult: null,
    lastImportDate: null,
    error: null,
  });

  // Start listening for contacts changes when database is ready
  useEffect(() => {
    if (database.isAvailable()) {
      contactsListener.startListening();
      
      return () => {
        contactsListener.stopListening();
      };
    }
  }, [contactsListener, database]);

  const importContacts = useCallback(async () => {
    if (state.isImporting || !database.isAvailable()) return;

    console.log('ContactsContext: Starting contacts import');
    setState(prev => ({ ...prev, isImporting: true, error: null }));

    try {
      const contactsIngest = new ContactsIngest(personDAO);
      const result = await contactsIngest.run();
      
      setState(prev => ({
        ...prev,
        isImporting: false,
        lastImportResult: result,
        lastImportDate: new Date(),
        error: null,
      }));

      console.log('ContactsContext: Import completed successfully', result);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('ContactsContext: Import failed:', errorMessage);
      
      setState(prev => ({
        ...prev,
        isImporting: false,
        error: errorMessage,
      }));
      
      throw error;
    }
  }, [personDAO, state.isImporting, database]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return useMemo(() => ({
    ...state,
    importContacts,
    clearError,
    isListening: contactsListener.isCurrentlyListening(),
  }), [state, importContacts, clearError, contactsListener]);
});