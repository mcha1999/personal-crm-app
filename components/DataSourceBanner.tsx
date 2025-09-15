import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AlertCircle, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { theme } from '@/constants/theme';

export const DataSourceBanner: React.FC = () => {
  const router = useRouter();
  const { syncPreferences } = useOnboarding();
  
  // Check which data sources are disabled from sync preferences
  const isContactsEnabled = syncPreferences.contactsEnabled;
  const isCalendarEnabled = syncPreferences.calendarEnabled;
  const isGmailEnabled = syncPreferences.gmailEnabled;
  
  // Count disabled sources
  const disabledSources: string[] = [];
  if (!isContactsEnabled) disabledSources.push('Contacts');
  if (!isCalendarEnabled) disabledSources.push('Calendar');
  if (!isGmailEnabled) disabledSources.push('Gmail');
  
  // Don't show banner if all sources are enabled
  if (disabledSources.length === 0) return null;
  
  const getMessage = () => {
    if (disabledSources.length === 3) {
      return 'Enable data sources for full functionality';
    } else if (disabledSources.length === 2) {
      return `${disabledSources.join(' and ')} are disabled`;
    } else {
      return `${disabledSources[0]} is disabled`;
    }
  };
  
  return (
    <TouchableOpacity 
      style={styles.banner} 
      onPress={() => router.push('/(tabs)/settings')}
      activeOpacity={0.8}
    >
      <View style={styles.content}>
        <AlertCircle size={18} color={theme.colors.warning} />
        <Text style={styles.message}>{getMessage()}</Text>
      </View>
      <ChevronRight size={18} color={theme.colors.warning} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: theme.colors.warningBackground,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: theme.colors.warningBorder,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  message: {
    ...theme.typography.footnote,
    color: theme.colors.warning,
    fontWeight: '500' as const,
    marginLeft: theme.spacing.sm,
    flex: 1,
  },
});