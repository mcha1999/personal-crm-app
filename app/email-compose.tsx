import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { Send, X, User, Mail as MailIcon, FileText, Calendar, ChevronDown } from 'lucide-react-native';
import { EmailService, EmailDraft, ManualEmailEntry } from '@/services/EmailService';
import { PersonDAO } from '@/database/PersonDAO';
import { InteractionDAO } from '@/database/InteractionDAO';
import { Person } from '@/models/Person';

export default function EmailComposeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const personId = params.personId as string | undefined;
  
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [person, setPerson] = useState<Person | null>(null);
  const [emailService, setEmailService] = useState<EmailService | null>(null);
  const [templates, setTemplates] = useState<EmailDraft[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [isManualLog, setIsManualLog] = useState(false);
  const [logType, setLogType] = useState<'sent' | 'received'>('sent');
  
  useEffect(() => {
    const initService = async () => {
      const personDAO = new PersonDAO();
      const interactionDAO = new InteractionDAO();
      const service = new EmailService(interactionDAO, personDAO);
      setEmailService(service);
      
      // Load templates
      const emailTemplates = await service.getEmailTemplates();
      setTemplates(emailTemplates);
      
      // Load person if ID provided
      if (personId) {
        const loadedPerson = await personDAO.getPersonById(personId);
        if (loadedPerson) {
          setPerson(loadedPerson);
          setTo(loadedPerson.email || '');
          
          // Get last interaction for context
          const interactions = await interactionDAO.getByPerson(personId);
          const lastInteraction = interactions[0];
          
          // Suggest follow-up email
          const suggestion = await service.suggestFollowUpEmail(loadedPerson, lastInteraction);
          setSubject(suggestion.subject);
          setBody(suggestion.body);
        }
      }
    };
    
    initService();
  }, [personId]);
  
  const handleSend = async () => {
    if (!emailService) return;
    
    if (!to.trim()) {
      Alert.alert('Error', 'Please enter a recipient email address');
      return;
    }
    
    if (!subject.trim()) {
      Alert.alert('Error', 'Please enter a subject');
      return;
    }
    
    const draft: EmailDraft = {
      to: [to],
      subject,
      body,
    };
    
    const success = await emailService.composeEmail(draft);
    
    if (success) {
      // Optionally log the interaction
      Alert.alert(
        'Email Sent',
        'Would you like to log this interaction?',
        [
          { text: 'No', style: 'cancel', onPress: () => router.back() },
          {
            text: 'Yes',
            onPress: async () => {
              await emailService.logEmailInteraction({
                type: 'sent',
                contactEmail: to,
                subject,
                summary: body.substring(0, 200),
                date: new Date(),
              });
              router.back();
            },
          },
        ]
      );
    }
  };
  
  const handleManualLog = async () => {
    if (!emailService) return;
    
    if (!to.trim()) {
      Alert.alert('Error', 'Please enter the contact email address');
      return;
    }
    
    if (!subject.trim()) {
      Alert.alert('Error', 'Please enter the email subject');
      return;
    }
    
    const entry: ManualEmailEntry = {
      type: logType,
      contactEmail: to,
      subject,
      summary: body.trim() || undefined,
      date: new Date(),
    };
    
    const interaction = await emailService.logEmailInteraction(entry);
    
    if (interaction) {
      Alert.alert('Success', 'Email interaction logged successfully');
      router.back();
    } else {
      Alert.alert('Error', 'Failed to log email interaction');
    }
  };
  
  const applyTemplate = (template: EmailDraft) => {
    setSubject(template.subject);
    setBody(template.body);
    setShowTemplates(false);
  };
  
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: isManualLog ? 'Log Email' : 'Compose Email',
          headerRight: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <X size={24} color="#007AFF" />
            </TouchableOpacity>
          ),
        }}
      />
      
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.content}>
          {/* Mode Toggle */}
          <View style={styles.modeToggle}>
            <TouchableOpacity
              style={[styles.modeButton, !isManualLog && styles.modeButtonActive]}
              onPress={() => setIsManualLog(false)}
            >
              <Send size={16} color={!isManualLog ? '#fff' : '#007AFF'} />
              <Text style={[styles.modeButtonText, !isManualLog && styles.modeButtonTextActive]}>
                Compose
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeButton, isManualLog && styles.modeButtonActive]}
              onPress={() => setIsManualLog(true)}
            >
              <FileText size={16} color={isManualLog ? '#fff' : '#007AFF'} />
              <Text style={[styles.modeButtonText, isManualLog && styles.modeButtonTextActive]}>
                Log Email
              </Text>
            </TouchableOpacity>
          </View>
          
          {isManualLog && (
            <View style={styles.logTypeContainer}>
              <Text style={styles.label}>Email Type</Text>
              <View style={styles.logTypeButtons}>
                <TouchableOpacity
                  style={[styles.logTypeButton, logType === 'sent' && styles.logTypeButtonActive]}
                  onPress={() => setLogType('sent')}
                >
                  <Text style={[styles.logTypeText, logType === 'sent' && styles.logTypeTextActive]}>
                    Sent
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.logTypeButton, logType === 'received' && styles.logTypeButtonActive]}
                  onPress={() => setLogType('received')}
                >
                  <Text style={[styles.logTypeText, logType === 'received' && styles.logTypeTextActive]}>
                    Received
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          
          {/* To Field */}
          <View style={styles.field}>
            <View style={styles.fieldHeader}>
              <MailIcon size={16} color="#8E8E93" />
              <Text style={styles.label}>To</Text>
            </View>
            <TextInput
              style={styles.input}
              value={to}
              onChangeText={setTo}
              placeholder={isManualLog ? "Contact email address" : "recipient@example.com"}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          
          {/* Subject Field */}
          <View style={styles.field}>
            <View style={styles.fieldHeader}>
              <FileText size={16} color="#8E8E93" />
              <Text style={styles.label}>Subject</Text>
            </View>
            <TextInput
              style={styles.input}
              value={subject}
              onChangeText={setSubject}
              placeholder="Email subject"
            />
          </View>
          
          {/* Templates (only for compose mode) */}
          {!isManualLog && (
            <TouchableOpacity
              style={styles.templatesButton}
              onPress={() => setShowTemplates(!showTemplates)}
            >
              <Text style={styles.templatesButtonText}>Use Template</Text>
              <ChevronDown size={16} color="#007AFF" />
            </TouchableOpacity>
          )}
          
          {showTemplates && !isManualLog && (
            <View style={styles.templatesList}>
              {templates.map((template, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.templateItem}
                  onPress={() => applyTemplate(template)}
                >
                  <Text style={styles.templateSubject}>{template.subject}</Text>
                  <Text style={styles.templatePreview} numberOfLines={2}>
                    {template.body}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          
          {/* Body Field */}
          <View style={styles.field}>
            <View style={styles.fieldHeader}>
              <FileText size={16} color="#8E8E93" />
              <Text style={styles.label}>{isManualLog ? 'Summary (optional)' : 'Message'}</Text>
            </View>
            <TextInput
              style={[styles.input, styles.bodyInput]}
              value={body}
              onChangeText={setBody}
              placeholder={isManualLog ? "Brief summary of the email..." : "Type your message here..."}
              multiline
              textAlignVertical="top"
            />
          </View>
          
          {/* Person Info */}
          {person && (
            <View style={styles.personInfo}>
              <User size={16} color="#8E8E93" />
              <Text style={styles.personName}>
                {person.firstName} {person.lastName}
              </Text>
              {person.lastInteraction && (
                <Text style={styles.lastContact}>
                  Last contact: {new Date(person.lastInteraction).toLocaleDateString()}
                </Text>
              )}
            </View>
          )}
        </ScrollView>
        
        {/* Action Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.sendButton}
            onPress={isManualLog ? handleManualLog : handleSend}
          >
            {isManualLog ? (
              <>
                <Calendar size={20} color="#fff" />
                <Text style={styles.sendButtonText}>Log Interaction</Text>
              </>
            ) : (
              <>
                <Send size={20} color="#fff" />
                <Text style={styles.sendButtonText}>Send Email</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: '#E5E5EA',
    borderRadius: 8,
    padding: 2,
    marginBottom: 16,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
  },
  modeButtonActive: {
    backgroundColor: '#007AFF',
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  modeButtonTextActive: {
    color: '#fff',
  },
  logTypeContainer: {
    marginBottom: 16,
  },
  logTypeButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  logTypeButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C6C6C8',
    alignItems: 'center',
  },
  logTypeButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  logTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  logTypeTextActive: {
    color: '#fff',
  },
  field: {
    marginBottom: 16,
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  bodyInput: {
    minHeight: 150,
    maxHeight: 300,
  },
  templatesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  templatesButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
  templatesList: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  templateItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  templateSubject: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  templatePreview: {
    fontSize: 12,
    color: '#8E8E93',
  },
  personInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  personName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
  lastContact: {
    fontSize: 12,
    color: '#8E8E93',
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});