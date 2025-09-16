import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
} from 'react-native';
import { Mail, Send, Inbox, X, Check, Calendar } from 'lucide-react-native';
import { InteractionDAO } from '@/database/InteractionDAO';
import { PersonDAO } from '@/database/PersonDAO';
import { EmailService, ManualEmailEntry } from '@/services/EmailService';

export function ManualEmailLogger() {
  const [isVisible, setIsVisible] = useState(false);
  const [emailType, setEmailType] = useState<'sent' | 'received'>('sent');
  const [contactEmail, setContactEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [summary, setSummary] = useState('');
  const [isLogging, setIsLogging] = useState(false);

  const interactionDAO = new InteractionDAO();
  const personDAO = new PersonDAO();
  const emailService = new EmailService(interactionDAO, personDAO);

  const handleLogEmail = async () => {
    if (!contactEmail.trim() || !subject.trim()) {
      console.log('Missing information: contact email or subject');
      return;
    }

    setIsLogging(true);
    try {
      const entry: ManualEmailEntry = {
        type: emailType,
        contactEmail: contactEmail.trim(),
        subject: subject.trim(),
        summary: summary.trim() || undefined,
        date: new Date(),
      };

      const interaction = await emailService.logEmailInteraction(entry);
      
      if (interaction) {
        console.log(`Successfully logged ${emailType} email with ${contactEmail}`);
        handleClose();
      } else {
        console.error('Failed to log email interaction');
      }
    } catch (error) {
      console.error('[ManualEmailLogger] Error logging email:', error);
    } finally {
      setIsLogging(false);
    }
  };

  const handleClose = () => {
    setContactEmail('');
    setSubject('');
    setSummary('');
    setIsVisible(false);
  };

  if (!isVisible) {
    return (
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => setIsVisible(true)}
      >
        <Mail size={24} color="#FFFFFF" />
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.overlay}>
      <View style={styles.modal}>
        <View style={styles.header}>
          <Text style={styles.title}>Log Email Interaction</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <X size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.typeSelector}>
            <TouchableOpacity
              style={[
                styles.typeButton,
                emailType === 'sent' && styles.typeButtonActive,
              ]}
              onPress={() => setEmailType('sent')}
            >
              <Send size={20} color={emailType === 'sent' ? '#FFFFFF' : '#666'} />
              <Text style={[
                styles.typeButtonText,
                emailType === 'sent' && styles.typeButtonTextActive,
              ]}>
                Sent
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.typeButton,
                emailType === 'received' && styles.typeButtonActive,
              ]}
              onPress={() => setEmailType('received')}
            >
              <Inbox size={20} color={emailType === 'received' ? '#FFFFFF' : '#666'} />
              <Text style={[
                styles.typeButtonText,
                emailType === 'received' && styles.typeButtonTextActive,
              ]}>
                Received
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Contact Email *</Text>
            <TextInput
              style={styles.input}
              value={contactEmail}
              onChangeText={setContactEmail}
              placeholder="Enter contact's email address"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Subject *</Text>
            <TextInput
              style={styles.input}
              value={subject}
              onChangeText={setSubject}
              placeholder="Email subject line"
              autoCapitalize="sentences"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Summary (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={summary}
              onChangeText={setSummary}
              placeholder="Brief summary of the email content or key points discussed"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.infoCard}>
            <Calendar size={16} color="#007AFF" />
            <Text style={styles.infoText}>
              This email will be logged with the current date and time
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleClose}
          >
            <Text style={styles.secondaryButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.primaryButton,
              (!contactEmail.trim() || !subject.trim() || isLogging) && styles.buttonDisabled,
            ]}
            onPress={handleLogEmail}
            disabled={!contactEmail.trim() || !subject.trim() || isLogging}
          >
            {isLogging ? (
              <Text style={styles.primaryButtonText}>Logging...</Text>
            ) : (
              <>
                <Check size={20} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>Log Email</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    margin: 20,
    maxHeight: '80%',
    width: '90%',
    maxWidth: 400,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  typeSelector: {
    flexDirection: 'row',
    marginBottom: 24,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 4,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 6,
  },
  typeButtonActive: {
    backgroundColor: '#007AFF',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginLeft: 8,
  },
  typeButtonTextActive: {
    color: '#FFFFFF',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1A1A1A',
  },
  textArea: {
    height: 80,
    paddingTop: 12,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#007AFF',
    marginLeft: 8,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});