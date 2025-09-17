import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, Lock, Palette, HelpCircle, Info, LogOut, ChevronRight, RefreshCw, Brain, Download, Camera, MapPin, Shield, Upload, FileText, Users, Calendar as CalendarIcon, Mail, Calculator, Cpu } from 'lucide-react-native';
import { BackgroundTaskManager } from '../services/BackgroundTaskManager';
import { ENABLE_GOOGLE_OAUTH } from '../src/flags';

let GoogleAPIService: any;
if (ENABLE_GOOGLE_OAUTH) {
  try {
    GoogleAPIService = require('../services/GoogleAPIService').GoogleAPIService;
  } catch (error) {
    console.warn('[SettingsScreen] GoogleAPIService not available:', error);
  }
}
import { LocalExport } from '../database/LocalExport';
import { Database } from '../database/Database';
import { PRIVACY_CONFIG, PRIVACY_SCOPES, PRIVACY_GUARANTEES } from '../constants/privacy';
import { useAuth } from '@/contexts/AuthContext';
import { useContacts } from '@/contexts/ContactsContext';
import { useDatabase } from '@/contexts/DatabaseContext';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { CalendarListener } from '../services/CalendarListener';
import { PersonDAO } from '../database/PersonDAO';
import { MeetingDAO } from '../database/MeetingDAO';
import { PlaceDAO } from '../database/PlaceDAO';
import { InteractionDAO } from '../database/InteractionDAO';

import { ScoreJob } from '../jobs/ScoreJob';
import * as LocalAuthentication from 'expo-local-authentication';

type SettingItem = 
  | { type: 'switch'; icon: React.ReactElement; label: string; value: boolean; onValueChange: (value: boolean) => void; subtitle?: string }
  | { type: 'navigation'; icon: React.ReactElement; label: string; subtitle?: string }
  | { type: 'action'; icon: React.ReactElement; label: string; subtitle?: string; onPress: () => void | Promise<void>; loading?: boolean };

type SettingSection = {
  title: string;
  items: SettingItem[];
};

export const SettingsScreen: React.FC = () => {
  const router = useRouter();
  const [notifications, setNotifications] = React.useState(true);
  const [reminders, setReminders] = React.useState(true);
  const [googleAPIEnabled, setGoogleAPIEnabled] = React.useState(false);
  const [isGoogleAuthenticated, setIsGoogleAuthenticated] = React.useState(false);
  const [taskStatus, setTaskStatus] = React.useState<any>(null);
  const [supportedAuthTypes, setSupportedAuthTypes] = React.useState<LocalAuthentication.AuthenticationType[]>([]);
  const [isCalendarImporting, setIsCalendarImporting] = React.useState(false);
  const [lastCalendarImport, setLastCalendarImport] = React.useState<Date | null>(null);

  const [healthTapCount, setHealthTapCount] = React.useState(0);
  
  const { isAuthEnabled, enableAuth, disableAuth, getSupportedAuthTypes } = useAuth();
  const { isImporting, lastImportResult, lastImportDate, error: contactsError, importContacts, clearError } = useContacts();
  const { database, isInitialized } = useDatabase();
  const { requestContactsPermission, requestCalendarPermission, syncPreferences, resetOnboarding, steps } = useOnboarding();

  const emailStep = steps.find(step => step.id === 'email');
  const emailConnectionError = emailStep?.error;
  const emailLinkIconColor = emailConnectionError ? '#FF3B30' : '#007AFF';
  const emailLinkSubtitle = emailConnectionError
    ? `Connection issue: ${emailConnectionError}`
    : 'Add Gmail, Outlook, iCloud, or custom IMAP';
  
  // Check permission states from sync preferences
  const isContactsEnabled = syncPreferences.contactsEnabled;
  const isCalendarEnabled = syncPreferences.calendarEnabled;


  useEffect(() => {
    const loadTaskStatus = async () => {
      const taskManager = BackgroundTaskManager.getInstance();
      const status = await taskManager.getTaskStatus();
      setTaskStatus(status);
    };
    
    loadTaskStatus();

    // Check Google API authentication status
    const checkGoogleAuth = async () => {
      if (!ENABLE_GOOGLE_OAUTH || !GoogleAPIService) {
        setIsGoogleAuthenticated(false);
        setGoogleAPIEnabled(false);
        return;
      }

      try {
        const googleAPI = GoogleAPIService.getInstance();
        const authenticated = await googleAPI.isAuthenticated();
        setIsGoogleAuthenticated(authenticated);
        setGoogleAPIEnabled(authenticated);
      } catch (error) {
        console.warn('[SettingsScreen] Error checking Google auth:', error);
        setIsGoogleAuthenticated(false);
        setGoogleAPIEnabled(false);
      }
    };
    

    
    // Check supported authentication types
    const checkAuthTypes = async () => {
      const types = await getSupportedAuthTypes();
      setSupportedAuthTypes(types);
    };
    
    checkGoogleAuth();
    checkAuthTypes();

    const interval = setInterval(() => {
      loadTaskStatus();
    }, 60000);

    return () => clearInterval(interval);
  }, [getSupportedAuthTypes]);

  const formatNextRunTime = (date: Date | null): string => {
    if (!date) return 'Not scheduled';
    
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    
    if (diff < 0) return 'Running...';
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `in ${days}d ${hours % 24}h`;
    }
    if (hours > 0) {
      return `in ${hours}h ${minutes % 60}m`;
    }
    return `in ${minutes}m`;
  };

  const formatLastRunTime = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}d ago`;
    }
    if (hours > 0) {
      return `${hours}h ago`;
    }
    if (minutes > 0) {
      return `${minutes}m ago`;
    }
    return 'Just now';
  };

  const handleGoogleAPIToggle = async (enabled: boolean) => {
    if (!ENABLE_GOOGLE_OAUTH || !GoogleAPIService) {
      Alert.alert('Feature Disabled', 'Google OAuth integration is disabled in this build.');
      return;
    }

    try {
      if (enabled) {
        // Enable Google API - authenticate
        const googleAPI = GoogleAPIService.getInstance();
        const success = await googleAPI.authenticate();
        if (success) {
          setGoogleAPIEnabled(true);
          setIsGoogleAuthenticated(true);
          Alert.alert('Google API Enabled', 'You can now sync with Gmail, Contacts, and Calendar. All processing happens locally on your device.');
        } else {
          Alert.alert('Authentication Failed', 'Could not authenticate with Google.');
        }
      } else {
        // Disable Google API - sign out
        Alert.alert(
          'Disable Google API',
          'This will remove Google authentication and disable sync features. Your local data will remain intact.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Disable',
              style: 'destructive',
              onPress: async () => {
                const googleAPI = GoogleAPIService.getInstance();
                await googleAPI.signOut();
                setGoogleAPIEnabled(false);
                setIsGoogleAuthenticated(false);
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('[SettingsScreen] Google API toggle error:', error);
      Alert.alert('Error', 'Failed to toggle Google API integration.');
    }
  };

  const handleManualSync = async () => {
    try {
      const taskManager = BackgroundTaskManager.getInstance();
      const result = await taskManager.runGmailDeltaSync();
      
      if (result.success) {
        Alert.alert('Success', 'Gmail sync completed (all processing local)');
      } else {
        Alert.alert('Gmail Sync Failed', result.error || 'Unknown error');
      }
      
      // Refresh task status
      const status = await taskManager.getTaskStatus();
      setTaskStatus(status);
    } catch (error) {
      Alert.alert('Error', 'Failed to sync Gmail');
    }
  };

  const handleManualScore = async () => {
    try {
      const taskManager = BackgroundTaskManager.getInstance();
      const result = await taskManager.runIndexAndScore();
      
      if (result.success) {
        Alert.alert('Success', `Scoring completed. Updated ${result.scoresComputed} contacts.`);
      } else {
        Alert.alert('Scoring Failed', result.error || 'Unknown error');
      }
      
      // Refresh task status
      const status = await taskManager.getTaskStatus();
      setTaskStatus(status);
    } catch (error) {
      Alert.alert('Error', 'Failed to update scores');
    }
  };

  const handleExport = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Not Available', 'Export is not available on web platform');
      return;
    }
    
    try {
      const exporter = new LocalExport();
      await exporter.exportToFiles();
      Alert.alert('Export Complete', 'Database exported successfully to Files app');
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Export Failed', 'Could not export database');
    }
  };

  const handleImport = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Not Available', 'Import is not available on web platform');
      return;
    }
    
    Alert.alert(
      'Import Data',
      'This will import data from a Kin export file. Existing data will be preserved.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Import',
          onPress: async () => {
            try {
              const exporter = new LocalExport();
              await exporter.importFromFiles();
              Alert.alert('Import Complete', 'Data imported successfully');
            } catch (error) {
              console.error('Import error:', error);
              Alert.alert('Import Failed', 'Could not import data');
            }
          }
        }
      ]
    );
  };

  const handleResetOnboarding = async () => {
    Alert.alert(
      'Reset Onboarding',
      'This will immediately show the welcome flow again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'default',
          onPress: async () => {
            try {
              console.log('[Settings] Starting onboarding reset...');
              await resetOnboarding();
              console.log('[Settings] Onboarding reset completed - flow should appear immediately');
              
              // Show success message
              Alert.alert(
                'Reset Complete',
                'Onboarding has been reset. The welcome flow will appear now.',
                [{ text: 'OK' }]
              );
            } catch (error) {
              console.error('[Settings] Reset onboarding error:', error);
              Alert.alert('Reset Failed', 'Could not reset onboarding. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleResetDatabase = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Not Available', 'Database reset is not available on web platform');
      return;
    }
    
    Alert.alert(
      'Reset Database',
      'This will delete all data and recreate the database. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              const db = Database.getInstance();
              await db.close();
              await db.init();
              
              Alert.alert('Success', 'Database has been reset. Please restart the app for changes to take effect.');
            } catch (error) {
              console.error('Reset error:', error);
              Alert.alert('Reset Failed', 'Could not reset database');
            }
          }
        }
      ]
    );
  };

  const handleImportContacts = async () => {
    if (isImporting) return;
    
    try {
      clearError();
      const result = await importContacts();
      if (result) {
        Alert.alert(
          'Contacts Import Complete',
          `Imported: ${result.imported}\nUpdated: ${result.updated}\nSkipped: ${result.skipped}`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to import contacts';
      Alert.alert('Import Failed', message);
    }
  };
  
  const handleEnableContacts = async () => {
    try {
      await requestContactsPermission();
      Alert.alert('Success', 'Contacts permission granted');
    } catch (error) {
      Alert.alert('Permission Denied', 'Could not enable contacts access');
    }
  };
  
  const handleEnableCalendar = async () => {
    try {
      await requestCalendarPermission('eventkit');
      Alert.alert('Success', 'Calendar permission granted');
    } catch (error) {
      Alert.alert('Permission Denied', 'Could not enable calendar access');
    }
  };


  const handleImportCalendar = async () => {
    if (isCalendarImporting || !isInitialized) return;
    
    try {
      setIsCalendarImporting(true);
      
      // Create DAO instances (they automatically connect to the database)
      const personDAO = new PersonDAO();
      const meetingDAO = new MeetingDAO();
      const placeDAO = new PlaceDAO();
      const interactionDAO = new InteractionDAO();
      
      const calendarListener = CalendarListener.getInstance(
        personDAO,
        meetingDAO,
        placeDAO,
        interactionDAO
      );
      
      // Check permissions first
      const hasPermission = await calendarListener.requestPermissions();
      if (!hasPermission) {
        Alert.alert('Permission Required', 'Calendar permission is required to import events.');
        return;
      }
      
      // Run manual sync with 180 days past, 60 days future
      await calendarListener.runManualSync({ pastDays: 180, futureDays: 60 });
      
      setLastCalendarImport(new Date());
      Alert.alert(
        'Calendar Import Complete',
        'Calendar events have been imported successfully. Meetings and interactions have been created.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Calendar import error:', error);
      const message = error instanceof Error ? error.message : 'Failed to import calendar';
      Alert.alert('Import Failed', message);
    } finally {
      setIsCalendarImporting(false);
    }
  };

  const getContactsImportSubtitle = (): string => {
    if (isImporting) return 'Importing contacts...';
    if (contactsError) return `Error: ${contactsError}`;
    if (lastImportResult && lastImportDate) {
      const timeAgo = Math.floor((Date.now() - lastImportDate.getTime()) / (1000 * 60));
      const timeStr = timeAgo < 60 ? `${timeAgo}m ago` : `${Math.floor(timeAgo / 60)}h ago`;
      return `Last: ${lastImportResult.imported + lastImportResult.updated} contacts (${timeStr})`;
    }
    return 'Import contacts from device';
  };

  const getCalendarImportSubtitle = (): string => {
    if (isCalendarImporting) return 'Importing calendar events...';
    if (lastCalendarImport) {
      const timeAgo = Math.floor((Date.now() - lastCalendarImport.getTime()) / (1000 * 60));
      const timeStr = timeAgo < 60 ? `${timeAgo}m ago` : `${Math.floor(timeAgo / 60)}h ago`;
      return `Last import: ${timeStr}`;
    }
    return 'Import events from calendar (180 days past, 60 days future)';
  };



  const handleAuthToggle = async (enabled: boolean) => {
    if (Platform.OS === 'web') {
      Alert.alert('Not Available', 'Biometric authentication is not available on web');
      return;
    }
    
    try {
      if (enabled) {
        await enableAuth();
        Alert.alert('App Lock Enabled', 'Kin will now require authentication when opened');
      } else {
        await disableAuth();
        Alert.alert('App Lock Disabled', 'Kin will no longer require authentication');
      }
    } catch (error) {
      console.error('Auth toggle error:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to change authentication setting');
    }
  };

  const getAuthTypeLabel = (): string => {
    if (Platform.OS === 'web') return 'Not available on web';
    if (supportedAuthTypes.length === 0) return 'Not available';
    
    const types = supportedAuthTypes.map(type => {
      switch (type) {
        case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
          return 'Face ID';
        case LocalAuthentication.AuthenticationType.FINGERPRINT:
          return 'Touch ID';
        case LocalAuthentication.AuthenticationType.IRIS:
          return 'Iris';
        default:
          return 'Biometric';
      }
    });
    
    return types.join(', ');
  };

  const showPrivacyInfo = () => {
    Alert.alert(
      'Privacy Information',
      `Device-Only Architecture:\n\n• ${PRIVACY_GUARANTEES.slice(0, 5).join('\n• ')}\n\nAll your personal data stays on your device and is never transmitted to external servers.`,
      [{ text: 'OK' }]
    );
  };

  const showGoogleScopeInfo = () => {
    const scopeInfo = Object.entries(PRIVACY_SCOPES)
      .map(([key, scope]) => `${key.toUpperCase()}:\n${scope.purpose}\nProcessing: ${scope.processing}`)
      .join('\n\n');
    
    Alert.alert(
      'Google API Scopes',
      `Required permissions (read-only):\n\n${scopeInfo}\n\nAll data processing happens locally on your device.`,
      [{ text: 'OK' }]
    );
  };

  const settingsSections: SettingSection[] = [
    {
      title: 'Data Sources',
      items: [
        ...(!isContactsEnabled ? [{
          icon: <Users size={20} color="#FF9500" />,
          label: 'Enable Contacts',
          subtitle: 'Grant permission to access contacts',
          type: 'action' as const,
          onPress: handleEnableContacts,
        }] : []),
        ...(!isCalendarEnabled ? [{
          icon: <CalendarIcon size={20} color="#FF9500" />,
          label: 'Enable Calendar',
          subtitle: 'Grant permission to access calendar',
          type: 'action' as const,
          onPress: handleEnableCalendar,
        }] : []),
        {
          icon: <Mail size={20} color={emailLinkIconColor} />,
          label: 'Link Email Account (IMAP)',
          subtitle: emailLinkSubtitle,
          type: 'action' as const,
          onPress: () => router.push('/email-setup'),
        },
      ],
    },
    {
      title: 'Privacy & Data',
      items: [
        {
          icon: <Shield size={20} color="#27AE60" />,
          label: 'Privacy Information',
          subtitle: 'Device-only architecture - no data transmission',
          type: 'action' as const,
          onPress: showPrivacyInfo,
        },
        {
          icon: <Download size={20} color="#27AE60" />,
          label: 'Export to Files',
          subtitle: 'Export all data to Files app',
          type: 'action' as const,
          onPress: handleExport,
        },
        {
          icon: <Upload size={20} color="#3498DB" />,
          label: 'Import from Files',
          subtitle: 'Import data from Files app',
          type: 'action' as const,
          onPress: handleImport,
        },
        {
          icon: <Users size={20} color={isImporting ? "#F39C12" : "#27AE60"} />,
          label: 'Import contacts now',
          subtitle: getContactsImportSubtitle(),
          type: 'action' as const,
          onPress: handleImportContacts,
        },
        {
          icon: <CalendarIcon size={20} color={isCalendarImporting ? "#F39C12" : "#3498DB"} />,
          label: 'Import calendar now',
          subtitle: getCalendarImportSubtitle(),
          type: 'action' as const,
          onPress: handleImportCalendar,
          loading: isCalendarImporting,
        },

        {
          icon: <RefreshCw size={20} color="#E74C3C" />,
          label: 'Reset Database',
          subtitle: 'Clear all data and start fresh',
          type: 'action' as const,
          onPress: handleResetDatabase,
        },
        {
          icon: <RefreshCw size={20} color="#FF9500" />,
          label: 'Reset Onboarding',
          subtitle: 'Show the welcome flow again',
          type: 'action' as const,
          onPress: handleResetOnboarding,
        },
      ],
    },

    {
      title: 'Preferences',
      items: [
        {
          icon: <Bell size={20} color="#45B7D1" />,
          label: 'Notifications',
          type: 'switch' as const,
          value: notifications,
          onValueChange: setNotifications,
        },
        {
          icon: <Bell size={20} color="#4ECDC4" />,
          label: 'Birthday Reminders',
          type: 'switch' as const,
          value: reminders,
          onValueChange: setReminders,
        },
        {
          icon: <Palette size={20} color="#FF6B6B" />,
          label: 'Appearance',
          type: 'navigation' as const,
        },
      ],
    },
    {
      title: 'Security',
      items: [
        {
          icon: <Lock size={20} color={isAuthEnabled ? "#27AE60" : "#95A5A6"} />,
          label: 'App Lock',
          subtitle: getAuthTypeLabel(),
          type: 'switch' as const,
          value: isAuthEnabled,
          onValueChange: handleAuthToggle,
        },
      ],
    },
    {
      title: 'AI Services (Beta)',
      items: [
        {
          icon: <Cpu size={20} color="#9B59B6" />,
          label: 'AI Service Demo',
          subtitle: 'Test thread summary, follow-up detection, and prep pack generation',
          type: 'action' as const,
          onPress: () => router.push('/ai-demo'),
        },
      ],
    },
    {
      title: 'Permissions',
      items: [
        {
          icon: <Shield size={20} color="#3498DB" />,
          label: 'App Permissions',
          subtitle: 'Manage privacy settings and permissions',
          type: 'action' as const,
          onPress: () => router.push('/permissions'),
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          icon: <HelpCircle size={20} color="#F39C12" />,
          label: 'Help & Support',
          type: 'navigation' as const,
        },
        {
          icon: <Info size={20} color="#3498DB" />,
          label: 'About',
          type: 'navigation' as const,
        },
      ],
    },
  ];

  const handleTitleTap = () => {
    setHealthTapCount(prev => prev + 1);
    if (healthTapCount === 6) {
      // Reset counter and navigate to health screen
      setHealthTapCount(0);
      router.push('/health');
    }
    // Reset counter after 2 seconds
    setTimeout(() => setHealthTapCount(0), 2000);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleTitleTap} activeOpacity={1}>
          <Text style={styles.title}>Settings</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {settingsSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionContent}>
              {section.items.map((item, itemIndex) => (
                <TouchableOpacity
                  key={itemIndex}
                  style={[
                    styles.settingItem,
                    itemIndex === section.items.length - 1 && styles.lastItem,
                  ]}
                  activeOpacity={item.type === 'navigation' || item.type === 'action' ? 0.7 : 1}
                  onPress={item.type === 'action' ? item.onPress : undefined}
                >
                  <View style={styles.settingLeft}>
                    <View style={styles.iconContainer}>{item.icon}</View>
                    <View style={styles.labelContainer}>
                      <Text style={styles.settingLabel}>{item.label}</Text>
                      {item.subtitle && (
                        <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
                      )}
                    </View>
                  </View>
                  {item.type === 'switch' ? (
                    <Switch
                      value={(item as Extract<SettingItem, { type: 'switch' }>).value}
                      onValueChange={(item as Extract<SettingItem, { type: 'switch' }>).onValueChange}
                      trackColor={{ false: '#E0E0E0', true: '#4ECDC4' }}
                      thumbColor="white"
                    />
                  ) : (
                    <ChevronRight size={20} color="#C0C0C0" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.logoutButton} activeOpacity={0.7}>
          <LogOut size={20} color="#E74C3C" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.version}>Kin v1.0.0 - Privacy-First CRM</Text>
          <Text style={styles.copyright}>Device-only architecture • No data transmission</Text>
          <Text style={styles.copyright}>Made with ❤️ for meaningful connections</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F3F7',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7F8C8D',
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  sectionContent: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    borderRadius: 12,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F3F7',
  },
  lastItem: {
    borderBottomWidth: 0,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  labelContainer: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    color: '#2C3E50',
  },
  settingSubtitle: {
    fontSize: 13,
    color: '#7F8C8D',
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 32,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    color: '#E74C3C',
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  version: {
    fontSize: 12,
    color: '#95A5A6',
    marginBottom: 4,
  },
  copyright: {
    fontSize: 12,
    color: '#95A5A6',
  },
});