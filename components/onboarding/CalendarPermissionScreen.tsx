import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Calendar, CheckCircle, XCircle, AlertCircle, Smartphone, Globe } from 'lucide-react-native';
import { useOnboarding } from '@/contexts/OnboardingContext';

export function CalendarPermissionScreen() {
  const { requestCalendarPermission, steps, completeStep } = useOnboarding();
  const [isRequesting, setIsRequesting] = useState(false);
  const [selectedSource, setSelectedSource] = useState<'eventkit' | 'google' | null>(null);

  const calendarOptions = useMemo(() => ([
    {
      id: 'eventkit' as const,
      title: 'Device Calendar',
      description: "Works with the native calendar app on this device (iOS or Android).",
      icon: Smartphone,
      disabled: Platform.OS === 'web' || isRequesting,
      note: Platform.OS === 'web' ? 'Not available on web' : 'Recommended',
      comingSoon: false,
    },
    {
      id: 'google' as const,
      title: 'Google Calendar',
      description: 'Direct OAuth connection. Coming soon—configure later from Settings.',
      icon: Globe,
      disabled: true,
      note: 'Coming Soon',
      comingSoon: true,
    },
  ]), [isRequesting]);
  
  const currentStep = steps.find(step => step.id === 'calendar');
  const isCompleted = currentStep?.completed || false;
  const hasError = !!currentStep?.error;

  const handleSelectSource = async (source: 'eventkit' | 'google') => {
    if (Platform.OS === 'web' && source === 'eventkit') {
      return;
    }
    
    setSelectedSource(source);
    setIsRequesting(true);
    
    try {
      await requestCalendarPermission(source);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleSkip = () => {
    completeStep('calendar', true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={[styles.iconContainer, isCompleted && styles.iconContainerSuccess]}>
            {isCompleted ? (
              <CheckCircle size={48} color="#34C759" />
            ) : hasError ? (
              <XCircle size={48} color="#FF3B30" />
            ) : (
              <Calendar size={48} color="#007AFF" />
            )}
          </View>
          <Text style={styles.title}>Calendar Connection</Text>
          <Text style={styles.subtitle}>
            {isCompleted
              ? 'Calendar connected — Kin will add meetings to your timeline.'
              : 'Connect a calendar so Kin can layer meetings onto your relationship history.'
            }
          </Text>
        </View>

        {!isCompleted && (
          <View style={styles.options}>
            {calendarOptions.map(option => {
              const IconComponent = option.icon;
              const isSelected = selectedSource === option.id;
              const disabled = option.disabled;

              return (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.optionCard,
                    disabled && styles.optionCardDisabled,
                    isSelected && styles.optionCardSelected,
                  ]}
                  onPress={() => {
                    if (option.comingSoon) return;
                    handleSelectSource(option.id);
                  }}
                  disabled={disabled}
                >
                  <View style={styles.optionHeader}>
                    <IconComponent size={24} color={disabled ? '#94A3B8' : '#007AFF'} />
                    <Text
                      style={[
                        styles.optionTitle,
                        disabled && styles.optionTitleDisabled,
                      ]}
                    >
                      {option.title}
                    </Text>
                    {option.comingSoon && (
                      <View style={styles.comingSoonBadge}>
                        <Text style={styles.comingSoonText}>{option.note}</Text>
                      </View>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.optionDescription,
                      disabled && styles.optionDescriptionDisabled,
                    ]}
                  >
                    {option.description}
                  </Text>
                  {!option.comingSoon && option.note && (
                    <Text
                      style={[
                        styles.optionNote,
                        option.note === 'Not available on web' && styles.optionNoteWarning,
                      ]}
                    >
                      {option.note}
                    </Text>
                  )}
                  {isRequesting && isSelected && (
                    <ActivityIndicator size="small" color="#007AFF" style={styles.optionLoader} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={styles.explanation}>
          <Text style={styles.explanationTitle}>Meeting intelligence</Text>
          <Text style={styles.explanationText}>
            Calendar access lets Kin understand who you meet with and how often.
            We only read event metadata and attendees — everything is stored locally.
          </Text>

          <View style={styles.bulletPoint}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>Identify meeting participants and link them to existing contacts</Text>
          </View>
          <View style={styles.bulletPoint}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>Track meeting frequency and follow-up needs automatically</Text>
          </View>
          <View style={styles.bulletPoint}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>Keep all data on-device with full control to revoke later</Text>
          </View>
        </View>

        {hasError && (
          <View style={styles.errorContainer}>
            <AlertCircle size={20} color="#FF3B30" />
            <Text style={styles.errorText}>{currentStep?.error}</Text>
          </View>
        )}

        {currentStep?.inProgress && (
          <View style={styles.progressContainer}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.progressText}>
              {selectedSource === 'eventkit' ? 'Requesting calendar permission...' : 'Connecting to Google Calendar...'}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        {!isCompleted && (
          <TouchableOpacity 
            style={styles.secondaryButton} 
            onPress={handleSkip}
            disabled={isRequesting}
          >
            <Text style={styles.secondaryButtonText}>Skip for Now</Text>
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
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionCardSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  optionCardDisabled: {
    backgroundColor: '#F5F5F5',
    opacity: 0.6,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginLeft: 12,
  },
  optionTitleDisabled: {
    color: '#999',
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  optionDescriptionDisabled: {
    color: '#999',
  },
  optionNote: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 8,
    fontWeight: '500',
  },
  optionNoteWarning: {
    color: '#FF3B30',
  },
  optionLoader: {
    position: 'absolute',
    top: 20,
    right: 20,
  },
  comingSoonBadge: {
    marginLeft: 8,
    backgroundColor: '#FFB020',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  comingSoonText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.4,
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
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#FF3B30',
    marginLeft: 8,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  footer: {
    padding: 24,
    paddingBottom: 32,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
});