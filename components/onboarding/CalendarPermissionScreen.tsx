import React, { useState } from 'react';
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
    completeStep('calendar');
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
          <Text style={styles.title}>Calendar Integration</Text>
          <Text style={styles.subtitle}>
            {isCompleted 
              ? 'Calendar connected successfully!'
              : 'Choose your calendar source for meeting insights'
            }
          </Text>
        </View>

        {!isCompleted && (
          <View style={styles.options}>
            <TouchableOpacity 
              style={[
                styles.optionCard,
                Platform.OS === 'web' && styles.optionCardDisabled,
                selectedSource === 'eventkit' && styles.optionCardSelected
              ]}
              onPress={() => handleSelectSource('eventkit')}
              disabled={Platform.OS === 'web' || isRequesting}
            >
              <View style={styles.optionHeader}>
                <Smartphone size={24} color={Platform.OS === 'web' ? '#CCC' : '#007AFF'} />
                <Text style={[styles.optionTitle, Platform.OS === 'web' && styles.optionTitleDisabled]}>
                  Device Calendar
                </Text>
              </View>
              <Text style={[styles.optionDescription, Platform.OS === 'web' && styles.optionDescriptionDisabled]}>
                Use your device's built-in calendar app (iOS Calendar, Google Calendar, etc.)
              </Text>
              {Platform.OS === 'web' && (
                <Text style={styles.notAvailable}>Not available on web</Text>
              )}
              {isRequesting && selectedSource === 'eventkit' && (
                <ActivityIndicator size="small" color="#007AFF" style={styles.optionLoader} />
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.optionCard,
                selectedSource === 'google' && styles.optionCardSelected
              ]}
              onPress={() => handleSelectSource('google')}
              disabled={isRequesting}
            >
              <View style={styles.optionHeader}>
                <Globe size={24} color="#007AFF" />
                <Text style={styles.optionTitle}>Google Calendar</Text>
              </View>
              <Text style={styles.optionDescription}>
                Connect directly to Google Calendar via OAuth (works on all platforms)
              </Text>
              {isRequesting && selectedSource === 'google' && (
                <ActivityIndicator size="small" color="#007AFF" style={styles.optionLoader} />
              )}
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.explanation}>
          <Text style={styles.explanationTitle}>Meeting Intelligence</Text>
          <Text style={styles.explanationText}>
            Calendar integration helps Kin understand your meeting patterns and 
            automatically track interactions with attendees.
          </Text>
          
          <View style={styles.bulletPoint}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>Identify meeting participants</Text>
          </View>
          <View style={styles.bulletPoint}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>Track meeting frequency with contacts</Text>
          </View>
          <View style={styles.bulletPoint}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.bulletText}>Analyze relationship patterns over time</Text>
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
  notAvailable: {
    fontSize: 12,
    color: '#FF3B30',
    fontStyle: 'italic',
    marginTop: 4,
  },
  optionLoader: {
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
  primaryButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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