import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { ChevronRight, Check } from 'lucide-react-native';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { PrivacyScreen } from './onboarding/PrivacyScreen';
import { ContactsPermissionScreen } from './onboarding/ContactsPermissionScreen';
import { CalendarPermissionScreen } from './onboarding/CalendarPermissionScreen';
import { EmailPermissionScreen } from './onboarding/EmailPermissionScreen';
import { SyncWindowScreen } from './onboarding/SyncWindowScreen';

export function OnboardingFlow() {
  const {
    currentStep,
    steps,
    completeOnboarding,
    completeStep,
  } = useOnboarding();
  
  const [localStep, setLocalStep] = useState(currentStep);
  
  useEffect(() => {
    setLocalStep(currentStep);
  }, [currentStep]);
  
  const handleNext = () => {
    const currentStepData = steps[localStep];
    if (currentStepData && !currentStepData.completed) {
      // Mark current step as skipped if not completed
      completeStep(currentStepData.id, true);
    }
    
    if (localStep < steps.length - 1) {
      setLocalStep(localStep + 1);
    } else {
      // Complete onboarding
      handleComplete();
    }
  };
  
  const handleComplete = async () => {
    try {
      await completeOnboarding();
    } catch (error) {
      console.error('[OnboardingFlow] Failed to complete onboarding:', error);
    }
  };
  
  const renderStep = () => {
    const step = steps[localStep];
    if (!step) return null;
    
    switch (step.id) {
      case 'privacy':
        return <PrivacyScreen />;
      case 'contacts':
        return <ContactsPermissionScreen />;
      case 'calendar':
        return <CalendarPermissionScreen />;
      case 'email':
        return <EmailPermissionScreen />;
      case 'sync-window':
        return <SyncWindowScreen />;
      default:
        return null;
    }
  };
  
  const isLastStep = localStep === steps.length - 1;
  const currentStepData = steps[localStep];
  const canContinue = currentStepData?.completed || currentStepData?.skipped;
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.progressContainer}>
          {steps.map((step, index) => (
            <View
              key={step.id}
              style={[
                styles.progressDot,
                index === localStep && styles.progressDotActive,
                (step.completed || step.skipped) && styles.progressDotCompleted,
              ]}
            />
          ))}
        </View>
        
        <Text style={styles.stepIndicator}>
          Step {localStep + 1} of {steps.length}
        </Text>
      </View>
      
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {renderStep()}
      </ScrollView>
      
      <View style={styles.footer}>
        {canContinue && (
          <TouchableOpacity
            style={styles.continueButton}
            onPress={isLastStep ? handleComplete : handleNext}
          >
            <Text style={styles.continueButtonText}>
              {isLastStep ? 'Get Started' : 'Continue'}
            </Text>
            {isLastStep ? (
              <Check size={20} color="#FFFFFF" />
            ) : (
              <ChevronRight size={20} color="#FFFFFF" />
            )}
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
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
    alignItems: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 4,
  },
  progressDotActive: {
    width: 24,
    backgroundColor: '#007AFF',
  },
  progressDotCompleted: {
    backgroundColor: '#34C759',
  },
  stepIndicator: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  continueButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  skipButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
});