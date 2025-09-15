import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, Lock, Palette, HelpCircle, Info, LogOut, ChevronRight, RefreshCw, Brain, Download, Camera, MapPin, Shield, Upload, FileText, Users, Calendar as CalendarIcon, Mail, Calculator } from 'lucide-react-native';
import { BackgroundTaskManager } from '../services/BackgroundTaskManager';
import { GoogleAPIService } from '../services/GoogleAPIService';
import { LocalExport } from '../database/LocalExport';
import { PRIVACY_CONFIG, PRIVACY_SCOPES, PRIVACY_GUARANTEES } from '../constants/privacy';
import { useAuth } from '@/contexts/AuthContext';
import { useContacts } from '@/contexts/ContactsContext';
import { useDatabase } from '@/contexts/DatabaseContext';
import { CalendarListener } from '../services/CalendarListener';
import { PersonDAO } from '../database/PersonDAO';
import { MeetingDAO } from '../database/MeetingDAO';
import { PlaceDAO } from '../database/PlaceDAO';
import { InteractionDAO } from '../database/InteractionDAO';
import { GmailSync } from '../services/GmailSync';
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
  const [notifications, setNotifications] = React.useState(true);
  const [reminders, setReminders] = React.useState(true);
  const [googleAPIEnabled, setGoogleAPIEnabled] = React.useState(false);
  const [isGoogleAuthenticated, setIsGoogleAuthenticated] = React.useState(false);
  const [nextSyncTime, setNextSyncTime] = React.useState<Date | null>(null);
  const [nextScoreTime, setNextScoreTime] = React.useState<Date | null>(null);
  const [supportedAuthTypes, setSupportedAuthTypes] = React.useState<LocalAuthentication.AuthenticationType[]>([]);
  const [isCalendarImporting, setIsCalendarImporting] = React.useState(false);
  const [lastCalendarImport, setLastCalendarImport] = React.useState<Date | null>(null);
  const [isGmailSyncing, setIsGmailSyncing] = React.useState<boolean>(false);
  const [lastGmailSync, setLastGmailSync] = React.useState<Date | null>(null);
  const [isGmailAuthenticated, setIsGmailAuthenticated] = React.useState<boolean>(false);
  
  const { isAuthEnabled, enableAuth, disableAuth, getSupportedAuthTypes } = useAuth();
  const { isImporting, lastImportResult, lastImportDate, error: contactsError, importContacts, clearError } = useContacts();
  const { database, isInitialized } = useDatabase();

  useEffect(() => {
    const taskManager = BackgroundTaskManager.getInstance();
    setNextSyncTime(taskManager.getNextGmailSyncTime());
    setNextScoreTime(taskManager.getNextIndexScoreTime());

    // Check Google API authentication status
    const checkGoogleAuth = async () => {
      const googleAPI = GoogleAPIService.getInstance();
      const authenticated = await googleAPI.isAuthenticated();
      setIsGoogleAuthenticated(authenticated);
      setGoogleAPIEnabled(authenticated);
    };
    
    // Check Gmail authentication status
    const checkGmailAuth = async () => {
      try {
        const gmailSync = GmailSync.getInstance();
        const authenticated = await gmailSync.isAuthenticated();
        setIsGmailAuthenticated(authenticated);
      } catch (error) {
        console.error('Error checking Gmail auth:', error);
        setIsGmailAuthenticated(false);
      }
    };
    
    // Check supported authentication types
    const checkAuthTypes = async () => {
      const types = await getSupportedAuthTypes();
      setSupportedAuthTypes(types);
    };
    
    checkGoogleAuth();
    checkGmailAuth();
    checkAuthTypes();

    const interval = setInterval(() => {
      setNextSyncTime(taskManager.getNextGmailSyncTime());
      setNextScoreTime(taskManager.getNextIndexScoreTime());
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
    
    if (hours > 0) {
      return `in ${hours}h ${minutes % 60}m`;
    }
    return `in ${minutes}m`;
  };

  const handleGoogleAPIToggle = async (enabled: boolean) => {
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
  };

  const handleManualSync = async () => {
    if (!googleAPIEnabled) {
      Alert.alert('Google API Disabled', 'Please enable Google API integration first.');
      return;
    }
    
    try {
      const taskManager = BackgroundTaskManager.getInstance();
      await taskManager.runGmailDeltaSync();
      Alert.alert('Success', 'Gmail sync completed (all processing local)');
      setNextSyncTime(taskManager.getNextGmailSyncTime());
    } catch (error) {
      Alert.alert('Error', 'Failed to sync Gmail');
    }
  };

  const handleManualScore = async () => {
    try {
      const taskManager = BackgroundTaskManager.getInstance();
      await taskManager.runIndexAndScore();
      Alert.alert('Success', 'Scoring completed');
      setNextScoreTime(taskManager.getNextIndexScoreTime());
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

  const handleGmailAuth = async () => {
    try {
      const gmailSync = GmailSync.getInstance();
      const success = await gmailSync.authenticate();
      
      if (success) {
        setIsGmailAuthenticated(true);
        Alert.alert('Gmail Connected', 'Gmail has been connected successfully. You can now sync your email data.');
      } else {
        Alert.alert('Authentication Failed', 'Gmail authentication was cancelled or failed.');
      }
    } catch (error) {
      console.error('Gmail auth error:', error);
      Alert.alert('Error', 'Failed to authenticate with Gmail');
    }
  };

  const handleGmailSync = async () => {
    if (isGmailSyncing || !isGmailAuthenticated) return;
    
    try {
      setIsGmailSyncing(true);
      
      const googleAPI = GoogleAPIService.getInstance();
      const result = await googleAPI.syncGmail(100);
      
      setLastGmailSync(new Date());
      Alert.alert(
        'Gmail Sync Complete',
        `Synced: ${result.messages.length} messages, ${result.threads.length} threads, ${result.interactions.length} interactions`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Gmail sync error:', error);
      const message = error instanceof Error ? error.message : 'Failed to sync Gmail';
      Alert.alert('Sync Failed', message);
    } finally {
      setIsGmailSyncing(false);
    }
  };

  const handleGmailSignOut = async () => {
    try {
      const gmailSync = GmailSync.getInstance();
      await gmailSync.signOut();
      setIsGmailAuthenticated(false);
      setLastGmailSync(null);
      Alert.alert('Gmail Disconnected', 'Gmail has been disconnected successfully.');
    } catch (error) {
      console.error('Gmail sign out error:', error);
      Alert.alert('Error', 'Failed to disconnect Gmail');
    }
  };

  const getGmailSyncSubtitle = (): string => {
    if (!isGmailAuthenticated) return 'Connect Gmail to sync email data';
    if (isGmailSyncing) return 'Syncing Gmail data...';
    if (lastGmailSync) {
      const timeAgo = Math.floor((Date.now() - lastGmailSync.getTime()) / (1000 * 60));
      const timeStr = timeAgo < 60 ? `${timeAgo}m ago` : `${Math.floor(timeAgo / 60)}h ago`;
      return `Last sync: ${timeStr}`;
    }
    return 'Sync email interactions and threads';
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
      title: 'Privacy & Data',
      items: [
        {
          icon: <Shield size={20} color="#27AE60" />,
          label: 'Privacy Information',
          subtitle: 'Device-only architecture - no data transmission',
          type: 'action',
          onPress: showPrivacyInfo,
        },
        {
          icon: <Download size={20} color="#27AE60" />,
          label: 'Export to Files',
          subtitle: 'Export all data to Files app',
          type: 'action',
          onPress: handleExport,
        },
        {
          icon: <Upload size={20} color="#3498DB" />,
          label: 'Import from Files',
          subtitle: 'Import data from Files app',
          type: 'action',
          onPress: handleImport,
        },
        {
          icon: <Users size={20} color={isImporting ? "#F39C12" : "#27AE60"} />,
          label: 'Import contacts now',
          subtitle: getContactsImportSubtitle(),
          type: 'action',
          onPress: handleImportContacts,
        },
        {
          icon: <CalendarIcon size={20} color={isCalendarImporting ? "#F39C12" : "#3498DB"} />,
          label: 'Import calendar now',
          subtitle: getCalendarImportSubtitle(),
          type: 'action',
          onPress: handleImportCalendar,
          loading: isCalendarImporting,
        },
        {
          icon: <Mail size={20} color={isGmailAuthenticated ? (isGmailSyncing ? "#F39C12" : "#E74C3C") : "#95A5A6"} />,
          label: isGmailAuthenticated ? 'Sync Gmail' : 'Connect Gmail',
          subtitle: getGmailSyncSubtitle(),
          type: 'action',
          onPress: isGmailAuthenticated ? handleGmailSync : handleGmailAuth,
          loading: isGmailSyncing,
        },
        ...(isGmailAuthenticated ? [{
          icon: <Mail size={20} color="#95A5A6" />,
          label: 'Disconnect Gmail',
          subtitle: 'Remove Gmail connection and clear tokens',
          type: 'action' as const,
          onPress: handleGmailSignOut,
        }] : []),
      ],
    },
    {
      title: 'Google API Integration (Optional)',
      items: [
        {
          icon: <RefreshCw size={20} color={googleAPIEnabled ? "#007AFF" : "#95A5A6"} />,
          label: 'Enable Google Sync',
          subtitle: googleAPIEnabled ? 'Enabled (device-only processing)' : 'Disabled',
          type: 'switch',
          value: googleAPIEnabled,
          onValueChange: handleGoogleAPIToggle,
        },
        {
          icon: <Info size={20} color={googleAPIEnabled ? "#3498DB" : "#95A5A6"} />,
          label: 'API Scopes & Permissions',
          subtitle: googleAPIEnabled ? 'View required permissions' : 'Enable Google API first',
          type: 'action',
          onPress: googleAPIEnabled ? showGoogleScopeInfo : () => {},
        },
        {
          icon: <RefreshCw size={20} color={googleAPIEnabled ? "#007AFF" : "#95A5A6"} />,
          label: 'Gmail Sync',
          subtitle: googleAPIEnabled ? `Next run: ${formatNextRunTime(nextSyncTime)}` : 'Requires Google API',
          type: 'action',
          onPress: handleManualSync,
        },
        {
          icon: <Brain size={20} color="#9B59B6" />,
          label: 'Index & Score',
          subtitle: `Next run: ${formatNextRunTime(nextScoreTime)} (local processing)`,
          type: 'action',
          onPress: handleManualScore,
        },
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          icon: <Bell size={20} color="#45B7D1" />,
          label: 'Notifications',
          type: 'switch',
          value: notifications,
          onValueChange: setNotifications,
        },
        {
          icon: <Bell size={20} color="#4ECDC4" />,
          label: 'Birthday Reminders',
          type: 'switch',
          value: reminders,
          onValueChange: setReminders,
        },
        {
          icon: <Palette size={20} color="#FF6B6B" />,
          label: 'Appearance',
          type: 'navigation',
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
          type: 'switch',
          value: isAuthEnabled,
          onValueChange: handleAuthToggle,
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
          type: 'action',
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
          type: 'navigation',
        },
        {
          icon: <Info size={20} color="#3498DB" />,
          label: 'About',
          type: 'navigation',
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
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