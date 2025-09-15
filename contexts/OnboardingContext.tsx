import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Contacts from 'expo-contacts';
import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';
import createContextHook from '@nkzw/create-context-hook';
// import { GmailSync } from '@/services/GmailSync'; // Disabled for now

const ONBOARDING_COMPLETED_KEY = 'kin_onboarding_completed';
const SYNC_PREFERENCES_KEY = 'kin_sync_preferences';

export interface SyncPreferences {
  contactsEnabled: boolean;
  calendarEnabled: boolean;
  calendarSource: 'eventkit' | 'google' | null;
  emailEnabled: boolean;
  emailMethod: 'manual' | 'shortcuts' | 'forward' | 'imap' | null;
  syncWindowDays: number;
  gmailAccessToken?: string;
  gmailRefreshToken?: string;
}

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  inProgress: boolean;
  error?: string;
  skipped?: boolean;
}

const defaultSyncPreferences: SyncPreferences = {
  contactsEnabled: false,
  calendarEnabled: false,
  calendarSource: null,
  emailEnabled: false,
  emailMethod: null,
  syncWindowDays: 30,
};

export const [OnboardingProvider, useOnboarding] = createContextHook(() => {
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [syncPreferences, setSyncPreferences] = useState<SyncPreferences>(defaultSyncPreferences);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [steps, setSteps] = useState<OnboardingStep[]>([
    {
      id: 'privacy',
      title: 'Privacy First',
      description: 'Learn about our device-only approach to your data',
      completed: false,
      inProgress: false,
    },
    {
      id: 'contacts',
      title: 'Contacts Access',
      description: 'Allow access to your contacts for relationship tracking',
      completed: false,
      inProgress: false,
    },
    {
      id: 'calendar',
      title: 'Calendar Integration',
      description: 'Choose your calendar source for meeting insights',
      completed: false,
      inProgress: false,
    },
    {
      id: 'email',
      title: 'Email Intelligence',
      description: 'Choose how to track email interactions',
      completed: false,
      inProgress: false,
    },
    {
      id: 'sync-window',
      title: 'Sync Settings',
      description: 'Configure how much data to sync initially',
      completed: false,
      inProgress: false,
    },
  ]);

  const checkOnboardingStatus = useCallback(async (): Promise<void> => {
    try {
      console.log('[Onboarding] Checking onboarding status...');
      
      const completedStr = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
      const completed = completedStr === 'true';
      
      const preferencesStr = await AsyncStorage.getItem(SYNC_PREFERENCES_KEY);
      let preferences = defaultSyncPreferences;
      if (preferencesStr) {
        try {
          preferences = JSON.parse(preferencesStr);
        } catch (parseError) {
          console.error('[Onboarding] Failed to parse sync preferences, using defaults:', parseError);
          // Clear corrupted data
          await AsyncStorage.removeItem(SYNC_PREFERENCES_KEY);
        }
      }
      
      console.log('[Onboarding] Status:', { completed, preferences });
      
      setIsOnboardingCompleted(completed);
      setSyncPreferences(preferences);
      setIsLoading(false);
    } catch (error) {
      console.error('[Onboarding] Error checking status:', error);
      setIsOnboardingCompleted(false);
      setSyncPreferences(defaultSyncPreferences);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkOnboardingStatus();
  }, [checkOnboardingStatus]);

  const updateStepStatus = useCallback((stepId: string, updates: Partial<OnboardingStep>): void => {
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, ...updates } : step
    ));
  }, []);

  const completeStep = useCallback((stepId: string, skipped: boolean = false): void => {
    updateStepStatus(stepId, { completed: true, inProgress: false, error: undefined, skipped });
    
    const stepIndex = steps.findIndex(step => step.id === stepId);
    if (stepIndex < steps.length - 1) {
      setCurrentStep(stepIndex + 1);
    }
  }, [steps, updateStepStatus]);

  const setStepInProgress = useCallback((stepId: string, inProgress: boolean = true): void => {
    updateStepStatus(stepId, { inProgress, error: undefined });
  }, [updateStepStatus]);

  const setStepError = useCallback((stepId: string, error: string): void => {
    updateStepStatus(stepId, { inProgress: false, error });
  }, [updateStepStatus]);

  const requestContactsPermission = useCallback(async (): Promise<boolean> => {
    try {
      console.log('[Onboarding] Requesting contacts permission...');
      setStepInProgress('contacts');
      
      if (Platform.OS === 'web') {
        console.log('[Onboarding] Contacts not available on web');
        setStepError('contacts', 'Contacts access is not available on web. Please use the mobile app.');
        setSyncPreferences(prev => ({ ...prev, contactsEnabled: false }));
        return false;
      }

      const { status } = await Contacts.requestPermissionsAsync();
      const granted = status === 'granted';
      
      console.log('[Onboarding] Contacts permission:', status);
      
      setSyncPreferences(prev => ({ ...prev, contactsEnabled: granted }));
      
      if (granted) {
        completeStep('contacts', false);
        // Try to get contacts count for feedback
        try {
          const { data } = await Contacts.getContactsAsync({ pageSize: 1 });
          console.log('[Onboarding] Contacts access verified, can access contacts');
        } catch (err) {
          console.log('[Onboarding] Contacts permission granted but unable to access contacts');
        }
      } else if (status === 'denied') {
        setStepError('contacts', 'Permission denied. You can enable this later in Settings.');
      } else {
        // Mark as completed but skipped
        completeStep('contacts', true);
      }
      
      return granted;
    } catch (error) {
      console.error('[Onboarding] Error requesting contacts permission:', error);
      setStepError('contacts', 'Failed to request contacts permission. Please try again.');
      return false;
    }
  }, [completeStep, setStepInProgress, setStepError]);

  const requestCalendarPermission = useCallback(async (source: 'eventkit' | 'google'): Promise<boolean> => {
    try {
      console.log('[Onboarding] Requesting calendar permission for:', source);
      setStepInProgress('calendar');
      
      if (Platform.OS === 'web' && source === 'eventkit') {
        console.log('[Onboarding] EventKit not available on web');
        setStepError('calendar', 'Device calendar is not available on web. Please choose Google Calendar.');
        return false;
      }

      if (source === 'eventkit') {
        const { status } = await Calendar.requestCalendarPermissionsAsync();
        const granted = status === 'granted';
        
        console.log('[Onboarding] Calendar permission:', status);
        
        setSyncPreferences(prev => ({ 
          ...prev, 
          calendarEnabled: granted,
          calendarSource: granted ? 'eventkit' : null
        }));
        
        if (granted) {
          completeStep('calendar', false);
          // Try to get calendars for verification
          try {
            const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
            console.log(`[Onboarding] Calendar access verified, found ${calendars.length} calendars`);
          } catch (err) {
            console.log('[Onboarding] Calendar permission granted but unable to access calendars');
          }
        } else if (status === 'denied') {
          setStepError('calendar', 'Permission denied. You can enable this later in Settings.');
        } else {
          // Mark as completed but skipped
          completeStep('calendar', true);
        }
        
        return granted;
      } else {
        // Google Calendar OAuth flow would go here
        // For now, we'll mark it as pending proper OAuth implementation
        console.warn('[Onboarding] Google Calendar requires OAuth implementation');
        setSyncPreferences(prev => ({ 
          ...prev, 
          calendarEnabled: false,
          calendarSource: 'google'
        }));
        setStepError('calendar', 'Google Calendar integration requires additional setup. You can configure this later in Settings.');
        return false;
      }
    } catch (error) {
      console.error('[Onboarding] Error requesting calendar permission:', error);
      setStepError('calendar', 'Failed to request calendar permission. Please try again.');
      return false;
    }
  }, [completeStep, setStepInProgress, setStepError]);

  const setEmailMethod = useCallback(async (method: 'manual' | 'shortcuts' | 'forward' | 'imap'): Promise<void> => {
    try {
      console.log('[Onboarding] Setting email method to:', method);
      
      setSyncPreferences(prev => ({ 
        ...prev, 
        emailEnabled: true,
        emailMethod: method
      }));
      
      completeStep('email', false);
    } catch (error) {
      console.error('[Onboarding] Error setting email method:', error);
      setStepError('email', 'Failed to configure email tracking');
    }
  }, [completeStep, setStepError]);

  const setSyncWindow = useCallback(async (days: number): Promise<void> => {
    try {
      console.log('[Onboarding] Setting sync window to', days, 'days');
      
      setSyncPreferences(prev => ({ ...prev, syncWindowDays: days }));
      completeStep('sync-window', false);
    } catch (error) {
      console.error('[Onboarding] Error setting sync window:', error);
      setStepError('sync-window', 'Failed to set sync window');
    }
  }, [completeStep, setStepError]);

  const completeOnboarding = useCallback(async (): Promise<void> => {
    try {
      console.log('[Onboarding] Completing onboarding...');
      
      // Save preferences
      await AsyncStorage.setItem(SYNC_PREFERENCES_KEY, JSON.stringify(syncPreferences));
      
      // Mark onboarding as completed
      await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
      
      setIsOnboardingCompleted(true);
      
      console.log('[Onboarding] Onboarding completed successfully');
    } catch (error) {
      console.error('[Onboarding] Error completing onboarding:', error);
      throw error;
    }
  }, [syncPreferences]);

  const resetOnboarding = useCallback(async (): Promise<void> => {
    try {
      console.log('[Onboarding] Resetting onboarding...');
      
      await AsyncStorage.removeItem(ONBOARDING_COMPLETED_KEY);
      await AsyncStorage.removeItem(SYNC_PREFERENCES_KEY);
      
      setIsOnboardingCompleted(false);
      setSyncPreferences(defaultSyncPreferences);
      setCurrentStep(0);
      setSteps(prev => prev.map(step => ({ 
        ...step, 
        completed: false, 
        inProgress: false, 
        error: undefined 
      })));
      
      console.log('[Onboarding] Onboarding reset successfully');
    } catch (error) {
      console.error('[Onboarding] Error resetting onboarding:', error);
      throw error;
    }
  }, []);

  return useMemo(() => ({
    isOnboardingCompleted,
    isLoading,
    currentStep,
    steps,
    syncPreferences,
    requestContactsPermission,
    requestCalendarPermission,
    setEmailMethod,
    setSyncWindow,
    completeOnboarding,
    resetOnboarding,
    completeStep,
    setStepInProgress,
    setStepError,
  }), [
    isOnboardingCompleted,
    isLoading,
    currentStep,
    steps,
    syncPreferences,
    requestContactsPermission,
    requestCalendarPermission,
    setEmailMethod,
    setSyncWindow,
    completeOnboarding,
    resetOnboarding,
    completeStep,
    setStepInProgress,
    setStepError,
  ]);
});