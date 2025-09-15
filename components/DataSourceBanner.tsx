import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AlertCircle, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useOnboarding } from '@/contexts/OnboardingContext';

export const DataSourceBanner: React.FC = () => {
  const router = useRouter();
  const { steps } = useOnboarding();
  
  // Check which data sources are disabled
  const contactsStep = steps.find(s => s.id === 'contacts');
  const calendarStep = steps.find(s => s.id === 'calendar');
  const gmailStep = steps.find(s => s.id === 'gmail');
  
  const isContactsEnabled = contactsStep?.completed && !contactsStep?.error;
  const isCalendarEnabled = calendarStep?.completed && !calendarStep?.error;
  const isGmailEnabled = gmailStep?.completed && !gmailStep?.error;
  
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
      onPress={() => router.push('/settings')}
      activeOpacity={0.8}
    >
      <View style={styles.content}>
        <AlertCircle size={18} color="#FF9500" />
        <Text style={styles.message}>{getMessage()}</Text>
      </View>
      <ChevronRight size={18} color="#FF9500" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#FFF5E6',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  message: {
    fontSize: 14,
    color: '#FF9500',
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
});