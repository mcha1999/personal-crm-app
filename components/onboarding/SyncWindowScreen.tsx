import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Clock, CheckCircle } from 'lucide-react-native';
import { useOnboarding } from '@/contexts/OnboardingContext';

const SYNC_OPTIONS = [
  { days: 7, label: '1 Week', description: 'Recent interactions only' },
  { days: 30, label: '1 Month', description: 'Recommended for most users' },
  { days: 90, label: '3 Months', description: 'Comprehensive history' },
  { days: 365, label: '1 Year', description: 'Full annual view' },
];

export function SyncWindowScreen() {
  const { setSyncWindow, steps, syncPreferences } = useOnboarding();
  const [selectedDays, setSelectedDays] = useState<number>(syncPreferences.syncWindowDays);
  
  const currentStep = steps.find(step => step.id === 'sync-window');
  const isCompleted = currentStep?.completed || false;

  const handleSelectDays = async (days: number) => {
    setSelectedDays(days);
    await setSyncWindow(days);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={[styles.iconContainer, isCompleted && styles.iconContainerSuccess]}>
            {isCompleted ? (
              <CheckCircle size={48} color="#34C759" />
            ) : (
              <Clock size={48} color="#007AFF" />
            )}
          </View>
          <Text style={styles.title}>Sync Window</Text>
          <Text style={styles.subtitle}>
            {isCompleted 
              ? `Set to sync ${selectedDays} days of data`
              : 'Choose how much historical data to sync initially'
            }
          </Text>
        </View>

        {!isCompleted && (
          <View style={styles.options}>
            {SYNC_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.days}
                style={[
                  styles.optionCard,
                  selectedDays === option.days && styles.optionCardSelected
                ]}
                onPress={() => handleSelectDays(option.days)}
              >
                <View style={styles.optionHeader}>
                  <Text style={styles.optionLabel}>{option.label}</Text>
                  {option.days === 30 && (
                    <View style={styles.recommendedBadge}>
                      <Text style={styles.recommendedText}>Recommended</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.optionDescription}>{option.description}</Text>
                {selectedDays === option.days && (
                  <CheckCircle size={20} color="#007AFF" style={styles.checkIcon} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.explanation}>
          <Text style={styles.explanationTitle}>Why This Matters</Text>
          <Text style={styles.explanationText}>
            The sync window determines how far back Kin will look when importing 
            your data. You can always adjust this later in Settings.
          </Text>
          
          <View style={styles.bulletPoint}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>Shorter windows sync faster</Text>
          </View>
          <View style={styles.bulletPoint}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>Longer windows provide more context</Text>
          </View>
          <View style={styles.bulletPoint}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>All data stays on your device</Text>
          </View>
        </View>

        <View style={styles.performanceNote}>
          <Text style={styles.performanceTitle}>Performance Note</Text>
          <Text style={styles.performanceText}>
            Initial sync time varies based on your data volume. Larger sync 
            windows may take several minutes to complete.
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        {isCompleted && (
          <TouchableOpacity style={styles.primaryButton} onPress={() => {}}>
            <Text style={styles.primaryButtonText}>Continue</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainerSuccess: {
    backgroundColor: '#E8F5E8',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  options: {
    marginBottom: 32,
  },
  optionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  optionCardSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  optionLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  recommendedBadge: {
    backgroundColor: '#34C759',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  recommendedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  checkIcon: {
    position: 'absolute',
    top: 20,
    right: 20,
  },
  explanation: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  explanationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  explanationText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  bulletPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bullet: {
    fontSize: 14,
    color: '#007AFF',
    marginRight: 8,
    marginTop: 2,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  performanceNote: {
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FFE066',
  },
  performanceTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  performanceText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  footer: {
    padding: 24,
    paddingBottom: 32,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});