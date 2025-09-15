import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { AIService } from '@/services/AIService';
import { Message } from '@/models/Message';
import { Person } from '@/models/Person';
import { Interaction } from '@/models/Interaction';
import { ThreadSummaryResult, FollowUpDetectResult, PrepPackResult } from '@/services/AITypes';

interface AIServiceDemoProps {
  testId?: string;
}

export function AIServiceDemo({ testId }: AIServiceDemoProps) {
  const [threadSummary, setThreadSummary] = useState<ThreadSummaryResult | null>(null);
  const [followUpResult, setFollowUpResult] = useState<FollowUpDetectResult | null>(null);
  const [prepPackResult, setPrepPackResult] = useState<PrepPackResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Sample data for testing
  const sampleMessages: Message[] = [
    {
      id: '1',
      threadId: 'thread1',
      senderId: 'user1',
      content: 'Hey, can we schedule a meeting for next week?',
      sentAt: new Date(),
      isFromMe: false,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '2',
      threadId: 'thread1',
      senderId: 'me',
      content: 'Sure! What time works best for you?',
      sentAt: new Date(),
      isFromMe: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '3',
      threadId: 'thread1',
      senderId: 'user1',
      content: 'How about Tuesday at 2 PM? We need to discuss the project deadline.',
      sentAt: new Date(),
      isFromMe: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const samplePerson: Person = {
    id: 'person1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    relationship: 'colleague',
    tags: ['work', 'project'],
    companyId: 'company1',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const sampleInteractions: Interaction[] = [
    {
      id: 'int1',
      personId: 'person1',
      type: 'email',
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      notes: 'Discussed project timeline',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'int2',
      personId: 'person1',
      type: 'meeting',
      date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
      duration: 60,
      notes: 'Weekly standup meeting',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const testThreadSummary = async () => {
    setIsLoading(true);
    try {
      console.log('[AIServiceDemo] Testing thread summary');
      const result = await AIService.threadSummary(sampleMessages);
      setThreadSummary(result);
      console.log('[AIServiceDemo] Thread summary result:', result);
    } catch (error) {
      console.error('[AIServiceDemo] Error in thread summary:', error);
      Alert.alert('Error', 'Failed to generate thread summary');
    } finally {
      setIsLoading(false);
    }
  };

  const testFollowUpDetect = async () => {
    setIsLoading(true);
    try {
      console.log('[AIServiceDemo] Testing follow-up detection');
      const result = await AIService.followUpDetect(sampleMessages);
      setFollowUpResult(result);
      console.log('[AIServiceDemo] Follow-up detection result:', result);
    } catch (error) {
      console.error('[AIServiceDemo] Error in follow-up detection:', error);
      Alert.alert('Error', 'Failed to detect follow-ups');
    } finally {
      setIsLoading(false);
    }
  };

  const testPrepPack = async () => {
    setIsLoading(true);
    try {
      console.log('[AIServiceDemo] Testing prep pack generation');
      const result = await AIService.prepPack(samplePerson, sampleInteractions);
      setPrepPackResult(result);
      console.log('[AIServiceDemo] Prep pack result:', result);
    } catch (error) {
      console.error('[AIServiceDemo] Error in prep pack generation:', error);
      Alert.alert('Error', 'Failed to generate prep pack');
    } finally {
      setIsLoading(false);
    }
  };

  const checkBackend = async () => {
    try {
      const backend = await AIService.getCurrentBackend();
      Alert.alert('AI Backend', `Currently using: ${backend}`);
    } catch (error) {
      console.error('[AIServiceDemo] Error checking backend:', error);
      Alert.alert('Error', 'Failed to check AI backend');
    }
  };

  return (
    <ScrollView style={styles.container} testID={testId}>
      <Text style={styles.title}>AI Service Demo</Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, isLoading && styles.buttonDisabled]} 
          onPress={testThreadSummary}
          disabled={isLoading}
          testID="thread-summary-button"
        >
          <Text style={styles.buttonText}>Test Thread Summary</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, isLoading && styles.buttonDisabled]} 
          onPress={testFollowUpDetect}
          disabled={isLoading}
          testID="follow-up-button"
        >
          <Text style={styles.buttonText}>Test Follow-up Detection</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, isLoading && styles.buttonDisabled]} 
          onPress={testPrepPack}
          disabled={isLoading}
          testID="prep-pack-button"
        >
          <Text style={styles.buttonText}>Test Prep Pack</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.secondaryButton]} 
          onPress={checkBackend}
          testID="check-backend-button"
        >
          <Text style={[styles.buttonText, styles.secondaryButtonText]}>Check AI Backend</Text>
        </TouchableOpacity>
      </View>

      {threadSummary && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultTitle}>Thread Summary</Text>
          <Text style={styles.resultText}>Summary: {threadSummary.summary}</Text>
          <Text style={styles.resultText}>Topics: {threadSummary.keyTopics.join(', ')}</Text>
          <Text style={styles.resultText}>Sentiment: {threadSummary.sentiment}</Text>
          <Text style={styles.resultText}>Urgency: {threadSummary.urgency}</Text>
        </View>
      )}

      {followUpResult && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultTitle}>Follow-up Detection</Text>
          <Text style={styles.resultText}>Has Follow-up: {followUpResult.hasFollowUp ? 'Yes' : 'No'}</Text>
          <Text style={styles.resultText}>Type: {followUpResult.followUpType}</Text>
          <Text style={styles.resultText}>Action: {followUpResult.suggestedAction}</Text>
          <Text style={styles.resultText}>Priority: {followUpResult.priority}</Text>
        </View>
      )}

      {prepPackResult && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultTitle}>Prep Pack</Text>
          <Text style={styles.resultText}>Context: {prepPackResult.personContext}</Text>
          <Text style={styles.resultText}>Status: {prepPackResult.relationshipStatus}</Text>
          <Text style={styles.resultText}>Recent Interactions:</Text>
          {prepPackResult.recentInteractions.map((interaction, index) => (
            <Text key={index} style={styles.subText}>• {interaction}</Text>
          ))}
          <Text style={styles.resultText}>Suggested Topics:</Text>
          {prepPackResult.suggestedTopics.map((topic, index) => (
            <Text key={index} style={styles.subText}>• {topic}</Text>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  buttonContainer: {
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#007AFF',
  },
  resultContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  resultText: {
    fontSize: 14,
    marginBottom: 5,
    color: '#666',
  },
  subText: {
    fontSize: 12,
    marginLeft: 10,
    marginBottom: 3,
    color: '#888',
  },
});