import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, Lock, Palette, HelpCircle, Info, LogOut, ChevronRight, RefreshCw, Brain, Download, Camera, MapPin, Shield } from 'lucide-react-native';
import { BackgroundTaskManager } from '../services/BackgroundTaskManager';
import { LocalExport } from '../database/LocalExport';

type SettingItem = 
  | { type: 'switch'; icon: React.ReactElement; label: string; value: boolean; onValueChange: (value: boolean) => void; subtitle?: string }
  | { type: 'navigation'; icon: React.ReactElement; label: string; subtitle?: string }
  | { type: 'action'; icon: React.ReactElement; label: string; subtitle?: string; onPress: () => void | Promise<void> };

type SettingSection = {
  title: string;
  items: SettingItem[];
};

export const SettingsScreen: React.FC = () => {
  const [notifications, setNotifications] = React.useState(true);
  const [reminders, setReminders] = React.useState(true);
  const [faceIdEnabled, setFaceIdEnabled] = React.useState(false);
  const [nextSyncTime, setNextSyncTime] = React.useState<Date | null>(null);
  const [nextScoreTime, setNextScoreTime] = React.useState<Date | null>(null);

  useEffect(() => {
    const taskManager = BackgroundTaskManager.getInstance();
    setNextSyncTime(taskManager.getNextGmailSyncTime());
    setNextScoreTime(taskManager.getNextIndexScoreTime());

    const interval = setInterval(() => {
      setNextSyncTime(taskManager.getNextGmailSyncTime());
      setNextScoreTime(taskManager.getNextIndexScoreTime());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

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

  const handleManualSync = async () => {
    try {
      const taskManager = BackgroundTaskManager.getInstance();
      await taskManager.runGmailDeltaSync();
      Alert.alert('Success', 'Gmail sync completed');
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
    try {
      const exporter = new LocalExport();
      await exporter.exportData();
      Alert.alert('Export Complete', 'Database exported successfully');
    } catch (error) {
      Alert.alert('Export Failed', 'Could not export database');
    }
  };

  const settingsSections: SettingSection[] = [
    {
      title: 'Background Tasks',
      items: [
        {
          icon: <RefreshCw size={20} color="#007AFF" />,
          label: 'Gmail Delta Sync',
          subtitle: `Next run: ${formatNextRunTime(nextSyncTime)}`,
          type: 'action',
          onPress: handleManualSync,
        },
        {
          icon: <Brain size={20} color="#9B59B6" />,
          label: 'Index & Score',
          subtitle: `Next run: ${formatNextRunTime(nextScoreTime)}`,
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
      title: 'Privacy & Security',
      items: [
        {
          icon: <Shield size={20} color="#27AE60" />,
          label: 'Privacy: On-device only',
          subtitle: 'All data stays on your device',
          type: 'navigation',
        },
        {
          icon: <Lock size={20} color="#E74C3C" />,
          label: 'Face ID App Lock',
          type: 'switch',
          value: faceIdEnabled,
          onValueChange: setFaceIdEnabled,
        },
        {
          icon: <Lock size={20} color="#95A5A6" />,
          label: 'Privacy Settings',
          type: 'navigation',
        },
      ],
    },
    {
      title: 'Data',
      items: [
        {
          icon: <Download size={20} color="#27AE60" />,
          label: 'Export Database',
          type: 'action',
          onPress: handleExport,
        },
      ],
    },
    {
      title: 'Permissions',
      items: [
        {
          icon: <Camera size={20} color="#3498DB" />,
          label: 'Camera',
          subtitle: 'Allowed',
          type: 'navigation',
        },
        {
          icon: <MapPin size={20} color="#E67E22" />,
          label: 'Location',
          subtitle: 'While Using App',
          type: 'navigation',
        },
        {
          icon: <Bell size={20} color="#45B7D1" />,
          label: 'Notifications',
          subtitle: 'Enabled',
          type: 'navigation',
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
          <Text style={styles.version}>Kin v1.0.0</Text>
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