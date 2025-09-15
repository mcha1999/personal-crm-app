import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Contacts from 'expo-contacts';
import * as Calendar from 'expo-calendar';
import * as AuthSession from 'expo-auth-session';
import { Platform } from 'react-native';
import createContextHook from '@nkzw/create-context-hook';

const ONBOARDING_COMPLETED_KEY = 'kin_onboarding_completed';
const SYNC_PREFERENCES_KEY = 'kin_sync_preferences';

export interface SyncPreferences {
  contactsEnabled: boolean;
  calendarEnabled: boolean;
  calendarSource: 'eventkit' | 'google' | null;
  gmailEnabled: boolean;
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
}

const defaultSyncPreferences: SyncPreferences = {
  contactsEnabled: false,
  calendarEnabled: false,
  calendarSource: null,
  gmailEnabled: false,
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
      id: 'gmail',
      title: 'Gmail Connection',
      description: 'Connect Gmail for email interaction tracking',
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
      const preferences = preferencesStr ? JSON.parse(preferencesStr) : defaultSyncPreferences;
      
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

  const completeStep = useCallback((stepId: string): void => {
    updateStepStatus(stepId, { completed: true, inProgress: false, error: undefined });
    
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
        setSyncPreferences(prev => ({ ...prev, contactsEnabled: false }));
        completeStep('contacts');
        return false;
      }

      const { status } = await Contacts.requestPermissionsAsync();
      const granted = status === 'granted';
      
      console.log('[Onboarding] Contacts permission:', status);
      
      setSyncPreferences(prev => ({ ...prev, contactsEnabled: granted }));
      
      if (granted) {
        completeStep('contacts');
      } else {
        setStepError('contacts', 'Contacts permission denied. You can enable this later in Settings.');
      }
      
      return granted;
    } catch (error) {
      console.error('[Onboarding] Error requesting contacts permission:', error);
      setStepError('contacts', 'Failed to request contacts permission');
      return false;
    }
  }, [completeStep, setStepInProgress, setStepError]);

  const requestCalendarPermission = useCallback(async (source: 'eventkit' | 'google'): Promise<boolean> => {
    try {
      console.log('[Onboarding] Requesting calendar permission for:', source);
      setStepInProgress('calendar');
      
      if (Platform.OS === 'web' && source === 'eventkit') {
        console.log('[Onboarding] EventKit not available on web');
        setStepError('calendar', 'EventKit is not available on web. Please choose Google Calendar.');
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
          completeStep('calendar');
        } else {
          setStepError('calendar', 'Calendar permission denied. You can enable this later in Settings.');
        }
        
        return granted;
      } else {
        // Google Calendar will be handled via OAuth in Gmail step
        setSyncPreferences(prev => ({ 
          ...prev, 
          calendarEnabled: true,
          calendarSource: 'google'
        }));
        completeStep('calendar');
        return true;
      }
    } catch (error) {
      console.error('[Onboarding] Error requesting calendar permission:', error);
      setStepError('calendar', 'Failed to request calendar permission');
      return false;
    }
  }, [completeStep, setStepInProgress, setStepError]);

  const connectGmail = useCallback(async (): Promise<boolean> => {
    try {
      console.log('[Onboarding] Connecting to Gmail...');
      setStepInProgress('gmail');
      
      // For now, we'll simulate the OAuth flow
      // In a real implementation, you would use expo-auth-session with Google OAuth
      
      // Simulate OAuth delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // For demo purposes, we'll mark as connected
      setSyncPreferences(prev => ({ 
        ...prev, 
        gmailEnabled: true,
        gmailAccessToken: 'demo_access_token',
        gmailRefreshToken: 'demo_refresh_token'
      }));
      
      completeStep('gmail');
      return true;
    } catch (error) {
      console.error('[Onboarding] Error connecting Gmail:', error);
      setStepError('gmail', 'Failed to connect Gmail. You can set this up later in Settings.');
      return false;
    }
  }, [completeStep, setStepInProgress, setStepError]);

  const setSyncWindow = useCallback(async (days: number): Promise<void> => {
    try {
      console.log('[Onboarding] Setting sync window to', days, 'days');
      
      setSyncPreferences(prev => ({ ...prev, syncWindowDays: days }));
      completeStep('sync-window');
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
    connectGmail,
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
    connectGmail,
    setSyncWindow,
    completeOnboarding,
    resetOnboarding,
    completeStep,
    setStepInProgress,
    setStepError,
  ]);
});