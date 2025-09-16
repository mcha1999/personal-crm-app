import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { PersonRepository } from '@/repositories/PersonRepository';
import { InteractionRepository } from '@/repositories/InteractionRepository';
import { TaskRepository } from '@/repositories/TaskRepository';
import { Person } from '@/models/Person';
import { Interaction } from '@/models/Interaction';
import { Task } from '@/models/Task';
import { Annotation } from '@/models/Annotation';
import { AnnotationDAO } from '@/database/AnnotationDAO';
import { useDatabase } from '@/contexts/DatabaseContext';
import { AnnotationManager } from '@/components/AnnotationManager';
import { mockPersonScores, mockMeetings, mockThreads, mockMessages } from '@/repositories/mockData';
import { 
  ArrowLeft, 
  Phone, 
  Mail, 
  Calendar,
  MapPin,
  MessageCircle,
  Video,
  Coffee,
  Edit3,
  Plus,
  Clock,
  User,
} from 'lucide-react-native';

export default function ContactScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [person, setPerson] = useState<Person | null>(null);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [notes, setNotes] = useState('');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const { database } = useDatabase();

  const personRepo = new PersonRepository();
  const interactionRepo = new InteractionRepository();
  const taskRepo = new TaskRepository();

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    
    const [personData, interactionData, taskData] = await Promise.all([
      personRepo.getPersonById(id),
      interactionRepo.getInteractionsByPersonId(id),
      taskRepo.getTasksByPersonId(id),
    ]);

    if (personData) {
      setPerson(personData);
      setNotes(personData.notes || '');
    } else {
      // Person not found, navigate back
      router.back();
      return;
    }
    setInteractions(interactionData);
    setTasks(taskData.filter(t => !t.completed));
    
    // Load annotations
    if (database?.isAvailable()) {
      try {
        const annotationDAO = new AnnotationDAO();
        const personAnnotations = await annotationDAO.findByEntity('person', id);
        setAnnotations(personAnnotations);
      } catch (error) {
        console.error('Failed to load annotations:', error);
      }
    }
  };

  const getLastMetText = () => {
    if (!person?.lastInteraction) return 'Never';
    const lastInteraction = new Date(person.lastInteraction);
    const now = new Date();
    const diffTime = now.getTime() - lastInteraction.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  const getInteractionIcon = (type: string) => {
    switch (type) {
      case 'meeting': return <Coffee size={16} color="#45B7D1" />;
      case 'message': return <MessageCircle size={16} color="#3498DB" />;
      case 'call': return <Phone size={16} color="#27AE60" />;
      case 'email': return <Mail size={16} color="#9B59B6" />;
      case 'video': return <Video size={16} color="#E74C3C" />;
      default: return <Calendar size={16} color="#95A5A6" />;
    }
  };

  const formatInteractionDate = (date: Date) => {
    const d = new Date(date);
    const now = new Date();
    const diffTime = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }
    if (diffDays < 7) {
      return d.toLocaleDateString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' });
    }
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleSaveNotes = () => {
    // In a real app, this would save to backend
    console.log('Saving notes:', notes);
    setIsEditingNotes(false);
  };

  if (!person) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const score = mockPersonScores.find(s => s.personId === person.id);

  return (
    <>
      <Stack.Screen 
        options={{
          headerShown: true,
          headerTitle: '',
          headerTransparent: true,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color="#2C3E50" />
            </TouchableOpacity>
          ),
        }}
      />
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.avatarSection}>
              {person.avatar && person.avatar.trim() !== '' ? (
                <Image source={{ uri: person.avatar }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarText}>
                    {person.firstName[0]}{person.lastName[0]}
                  </Text>
                </View>
              )}
            </View>
            
            <Text style={styles.name}>
              {person.firstName} {person.lastName}
            </Text>
            {person.nickname && (
              <Text style={styles.nickname}>"{person.nickname}"</Text>
            )}
            
            <View style={styles.relationshipBadge}>
              <Text style={styles.relationshipText}>{person.relationship}</Text>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.actionButton}>
                <Phone size={20} color="#45B7D1" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <MessageCircle size={20} color="#45B7D1" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => router.push(`/email-compose?personId=${id}`)}
              >
                <Mail size={20} color="#45B7D1" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Video size={20} color="#45B7D1" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Last Met Card */}
          <View style={styles.lastMetCard}>
            <View style={styles.lastMetHeader}>
              <Clock size={20} color="#45B7D1" />
              <Text style={styles.lastMetTitle}>Last Met</Text>
            </View>
            <Text style={styles.lastMetText}>{getLastMetText()}</Text>
            {score && (
              <View style={styles.scoreRow}>
                <Text style={styles.scoreLabel}>Relationship Score:</Text>
                <Text style={styles.scoreValue}>{score.relationshipScore}</Text>
              </View>
            )}
          </View>

          {/* Timeline */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Timeline</Text>
            {interactions.length > 0 ? (
              <View style={styles.timeline}>
                {interactions.map((interaction, index) => {
                  const meeting = interaction.meetingId 
                    ? mockMeetings.find(m => m.id === interaction.meetingId)
                    : null;
                  const thread = interaction.threadId
                    ? mockThreads.find(t => t.id === interaction.threadId)
                    : null;
                  
                  return (
                    <View key={interaction.id} style={styles.timelineItem}>
                      <View style={styles.timelineDot}>
                        {getInteractionIcon(interaction.type)}
                      </View>
                      {index < interactions.length - 1 && (
                        <View style={styles.timelineLine} />
                      )}
                      <View style={styles.timelineContent}>
                        <Text style={styles.timelineTitle}>
                          {meeting?.title || interaction.type.charAt(0).toUpperCase() + interaction.type.slice(1)}
                        </Text>
                        <Text style={styles.timelineDate}>
                          {formatInteractionDate(interaction.date)}
                        </Text>
                        {interaction.notes && (
                          <Text style={styles.timelineNotes}>{interaction.notes}</Text>
                        )}
                        {interaction.duration && (
                          <Text style={styles.timelineDuration}>
                            Duration: {interaction.duration} min
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <Text style={styles.emptyText}>No interactions yet</Text>
            )}
          </View>

          {/* Tasks */}
          {tasks.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tasks</Text>
              {tasks.map(task => (
                <View key={task.id} style={styles.taskItem}>
                  <Text style={styles.taskTitle}>{task.title}</Text>
                  {task.dueDate && (
                    <Text style={styles.taskDue}>
                      Due: {new Date(task.dueDate).toLocaleDateString()}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Notes */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Notes</Text>
              <TouchableOpacity onPress={() => setIsEditingNotes(!isEditingNotes)}>
                <Edit3 size={20} color="#45B7D1" />
              </TouchableOpacity>
            </View>
            {isEditingNotes ? (
              <View>
                <TextInput
                  style={styles.notesInput}
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  placeholder="Add notes about this person..."
                  placeholderTextColor="#95A5A6"
                />
                <TouchableOpacity style={styles.saveButton} onPress={handleSaveNotes}>
                  <Text style={styles.saveButtonText}>Save Notes</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={styles.notesText}>
                {notes || 'No notes yet. Tap edit to add some.'}
              </Text>
            )}
          </View>

          {/* Annotations */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <User size={20} color="#45B7D1" />
              <Text style={styles.sectionTitle}>Personal Details</Text>
            </View>
            <AnnotationManager
              personId={id}
              annotations={annotations}
              onAnnotationsChange={setAnnotations}
            />
          </View>

          {/* Tags */}
          {person.tags.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Legacy Tags</Text>
              <View style={styles.tagsContainer}>
                {person.tags.map(tag => (
                  <View key={tag} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
  },
  header: {
    backgroundColor: 'white',
    paddingTop: 100,
    paddingBottom: 24,
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  avatarSection: {
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    backgroundColor: '#45B7D1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 36,
    fontWeight: '600' as const,
  },
  name: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#2C3E50',
    marginBottom: 4,
  },
  nickname: {
    fontSize: 16,
    color: '#7F8C8D',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  relationshipBadge: {
    backgroundColor: '#E8F4F8',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 20,
  },
  relationshipText: {
    color: '#45B7D1',
    fontSize: 14,
    fontWeight: '600' as const,
    textTransform: 'capitalize',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  actionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0F3F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lastMetCard: {
    backgroundColor: 'white',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  lastMetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  lastMetTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#2C3E50',
  },
  lastMetText: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#45B7D1',
    marginBottom: 8,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F3F7',
  },
  scoreLabel: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#27AE60',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: '#2C3E50',
    marginBottom: 12,
  },
  timeline: {
    position: 'relative',
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 20,
    position: 'relative',
  },
  timelineDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#E8F4F8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    zIndex: 1,
  },
  timelineLine: {
    position: 'absolute',
    left: 15,
    top: 32,
    bottom: -20,
    width: 2,
    backgroundColor: '#E8F4F8',
  },
  timelineContent: {
    flex: 1,
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#2C3E50',
    marginBottom: 4,
  },
  timelineDate: {
    fontSize: 14,
    color: '#95A5A6',
    marginBottom: 4,
  },
  timelineNotes: {
    fontSize: 14,
    color: '#7F8C8D',
    marginTop: 4,
  },
  timelineDuration: {
    fontSize: 12,
    color: '#95A5A6',
    marginTop: 4,
  },
  taskItem: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  taskTitle: {
    fontSize: 16,
    color: '#2C3E50',
    marginBottom: 4,
  },
  taskDue: {
    fontSize: 14,
    color: '#95A5A6',
  },
  notesInput: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    minHeight: 100,
    fontSize: 14,
    color: '#2C3E50',
    textAlignVertical: 'top',
  },
  notesText: {
    fontSize: 14,
    color: '#7F8C8D',
    lineHeight: 20,
  },
  saveButton: {
    backgroundColor: '#45B7D1',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#E8F4F8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 14,
    color: '#45B7D1',
  },
  emptyText: {
    fontSize: 14,
    color: '#95A5A6',
    fontStyle: 'italic',
  },
});