import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import {
  Plus,
  X,
  Tag,
  Star,
  MessageCircle,
  Phone,
  Mail,
  Video,
  Coffee,
  Calendar,
  Gift,
  Edit3,
} from 'lucide-react-native';
import {
  Annotation,
  PersonAnnotations,
  ANNOTATION_TYPES,
  TIER_OPTIONS,
  CHANNEL_OPTIONS,
  groupAnnotationsByType,
} from '@/models/Annotation';
import { AnnotationDAO } from '@/database/AnnotationDAO';
import { useDatabase } from '@/contexts/DatabaseContext';

interface AnnotationManagerProps {
  personId: string;
  annotations: Annotation[];
  onAnnotationsChange: (annotations: Annotation[]) => void;
}

export const AnnotationManager: React.FC<AnnotationManagerProps> = ({
  personId,
  annotations,
  onAnnotationsChange,
}) => {
  const [groupedAnnotations, setGroupedAnnotations] = useState<PersonAnnotations>(
    groupAnnotationsByType(annotations)
  );
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAnnotation, setEditingAnnotation] = useState<Annotation | null>(null);
  const [annotationType, setAnnotationType] = useState<string>('');
  const [content, setContent] = useState('');
  const { database } = useDatabase();

  useEffect(() => {
    setGroupedAnnotations(groupAnnotationsByType(annotations));
  }, [annotations]);

  const saveAnnotation = async () => {
    if (!database?.isAvailable() || !content.trim()) return;

    try {
      const annotationDAO = new AnnotationDAO();
      
      if (editingAnnotation) {
        const updated = await annotationDAO.update(editingAnnotation.id, {
          content: content.trim(),
        });
        if (updated) {
          const updatedAnnotations = annotations.map(a => 
            a.id === updated.id ? updated : a
          );
          onAnnotationsChange(updatedAnnotations);
        }
      } else {
        const newAnnotation = await annotationDAO.create({
          entityType: 'person',
          entityId: personId,
          type: annotationType as any,
          content: content.trim(),
        });
        onAnnotationsChange([...annotations, newAnnotation]);
      }
      
      closeModal();
    } catch (error) {
      console.error('Failed to save annotation:', error);
      Alert.alert('Error', 'Failed to save annotation');
    }
  };

  const deleteAnnotation = async (annotation: Annotation) => {
    if (!database?.isAvailable()) return;

    Alert.alert(
      'Delete Annotation',
      'Are you sure you want to delete this annotation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const annotationDAO = new AnnotationDAO();
              const success = await annotationDAO.delete(annotation.id);
              if (success) {
                const updatedAnnotations = annotations.filter(a => a.id !== annotation.id);
                onAnnotationsChange(updatedAnnotations);
              } else {
                Alert.alert('Error', 'Failed to delete annotation');
              }
            } catch (error) {
              console.error('Failed to delete annotation:', error);
              Alert.alert('Error', 'Failed to delete annotation');
            }
          },
        },
      ]
    );
  };

  const openModal = (type: string, annotation?: Annotation) => {
    setAnnotationType(type);
    setEditingAnnotation(annotation || null);
    setContent(annotation?.content || '');
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingAnnotation(null);
    setAnnotationType('');
    setContent('');
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'text': return <MessageCircle size={16} color="#45B7D1" />;
      case 'call': return <Phone size={16} color="#27AE60" />;
      case 'email': return <Mail size={16} color="#9B59B6" />;
      case 'video': return <Video size={16} color="#E74C3C" />;
      case 'in_person': return <Coffee size={16} color="#F39C12" />;
      default: return <MessageCircle size={16} color="#95A5A6" />;
    }
  };

  const getTierColor = (tier: string) => {
    const option = TIER_OPTIONS.find(t => t.value === tier);
    return option?.color || '#95A5A6';
  };

  return (
    <View style={styles.container}>
      {/* Tier */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Star size={20} color="#F39C12" />
          <Text style={styles.sectionTitle}>Relationship Tier</Text>
          <TouchableOpacity onPress={() => openModal(ANNOTATION_TYPES.TIER, groupedAnnotations.tier || undefined)}>
            <Edit3 size={16} color="#45B7D1" />
          </TouchableOpacity>
        </View>
        {groupedAnnotations.tier ? (
          <View style={[styles.tierBadge, { backgroundColor: getTierColor(groupedAnnotations.tier.content) }]}>
            <Text style={styles.tierText}>
              {TIER_OPTIONS.find(t => t.value === groupedAnnotations.tier?.content)?.label || groupedAnnotations.tier.content}
            </Text>
          </View>
        ) : (
          <TouchableOpacity 
            style={styles.addButton} 
            onPress={() => openModal(ANNOTATION_TYPES.TIER)}
          >
            <Plus size={16} color="#45B7D1" />
            <Text style={styles.addButtonText}>Set tier</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Preferred Channel */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MessageCircle size={20} color="#45B7D1" />
          <Text style={styles.sectionTitle}>Preferred Channel</Text>
          <TouchableOpacity onPress={() => openModal(ANNOTATION_TYPES.PREFERRED_CHANNEL, groupedAnnotations.preferredChannel || undefined)}>
            <Edit3 size={16} color="#45B7D1" />
          </TouchableOpacity>
        </View>
        {groupedAnnotations.preferredChannel ? (
          <View style={styles.channelRow}>
            {getChannelIcon(groupedAnnotations.preferredChannel.content)}
            <Text style={styles.channelText}>
              {CHANNEL_OPTIONS.find(c => c.value === groupedAnnotations.preferredChannel?.content)?.label || groupedAnnotations.preferredChannel.content}
            </Text>
          </View>
        ) : (
          <TouchableOpacity 
            style={styles.addButton} 
            onPress={() => openModal(ANNOTATION_TYPES.PREFERRED_CHANNEL)}
          >
            <Plus size={16} color="#45B7D1" />
            <Text style={styles.addButtonText}>Set preferred channel</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* How We Met */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Coffee size={20} color="#27AE60" />
          <Text style={styles.sectionTitle}>How We Met</Text>
          <TouchableOpacity onPress={() => openModal(ANNOTATION_TYPES.HOW_WE_MET, groupedAnnotations.howWeMet || undefined)}>
            <Edit3 size={16} color="#45B7D1" />
          </TouchableOpacity>
        </View>
        {groupedAnnotations.howWeMet ? (
          <Text style={styles.contentText}>{groupedAnnotations.howWeMet.content}</Text>
        ) : (
          <TouchableOpacity 
            style={styles.addButton} 
            onPress={() => openModal(ANNOTATION_TYPES.HOW_WE_MET)}
          >
            <Plus size={16} color="#45B7D1" />
            <Text style={styles.addButtonText}>Add how we met</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Birthday */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Calendar size={20} color="#E74C3C" />
          <Text style={styles.sectionTitle}>Birthday</Text>
          <TouchableOpacity onPress={() => openModal(ANNOTATION_TYPES.BIRTHDAY, groupedAnnotations.birthday || undefined)}>
            <Edit3 size={16} color="#45B7D1" />
          </TouchableOpacity>
        </View>
        {groupedAnnotations.birthday ? (
          <Text style={styles.contentText}>{groupedAnnotations.birthday.content}</Text>
        ) : (
          <TouchableOpacity 
            style={styles.addButton} 
            onPress={() => openModal(ANNOTATION_TYPES.BIRTHDAY)}
          >
            <Plus size={16} color="#45B7D1" />
            <Text style={styles.addButtonText}>Add birthday</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tags */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Tag size={20} color="#9B59B6" />
          <Text style={styles.sectionTitle}>Tags</Text>
          <TouchableOpacity onPress={() => openModal(ANNOTATION_TYPES.TAG)}>
            <Plus size={16} color="#45B7D1" />
          </TouchableOpacity>
        </View>
        <View style={styles.tagsContainer}>
          {groupedAnnotations.tags.map(tag => (
            <TouchableOpacity
              key={tag.id}
              style={styles.tag}
              onLongPress={() => deleteAnnotation(tag)}
            >
              <Text style={styles.tagText}>{tag.content}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Gift Ideas */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Gift size={20} color="#F39C12" />
          <Text style={styles.sectionTitle}>Gift Ideas</Text>
          <TouchableOpacity onPress={() => openModal(ANNOTATION_TYPES.GIFT_IDEAS)}>
            <Plus size={16} color="#45B7D1" />
          </TouchableOpacity>
        </View>
        {groupedAnnotations.giftIdeas.map(gift => (
          <View key={gift.id} style={styles.giftItem}>
            <Text style={styles.giftText}>{gift.content}</Text>
            <TouchableOpacity onPress={() => deleteAnnotation(gift)}>
              <X size={16} color="#95A5A6" />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Modal for editing */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeModal}>
              <X size={24} color="#2C3E50" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingAnnotation ? 'Edit' : 'Add'} {annotationType.replace('_', ' ')}
            </Text>
            <TouchableOpacity onPress={saveAnnotation}>
              <Text style={styles.saveButton}>Save</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            {annotationType === ANNOTATION_TYPES.TIER ? (
              <View>
                {TIER_OPTIONS.map(option => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.optionItem,
                      content === option.value && styles.optionItemSelected
                    ]}
                    onPress={() => setContent(option.value)}
                  >
                    <View style={[styles.tierDot, { backgroundColor: option.color }]} />
                    <Text style={styles.optionText}>{option.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : annotationType === ANNOTATION_TYPES.PREFERRED_CHANNEL ? (
              <View>
                {CHANNEL_OPTIONS.map(option => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.optionItem,
                      content === option.value && styles.optionItemSelected
                    ]}
                    onPress={() => setContent(option.value)}
                  >
                    {getChannelIcon(option.value)}
                    <Text style={styles.optionText}>{option.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <TextInput
                style={styles.textInput}
                value={content}
                onChangeText={setContent}
                placeholder={`Enter ${annotationType.replace('_', ' ')}...`}
                multiline={annotationType === ANNOTATION_TYPES.NOTE || annotationType === ANNOTATION_TYPES.GIFT_IDEAS}
                autoFocus
              />
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  section: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#2C3E50',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  addButtonText: {
    fontSize: 14,
    color: '#45B7D1',
  },
  tierBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tierText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: 'white',
  },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  channelText: {
    fontSize: 14,
    color: '#2C3E50',
  },
  contentText: {
    fontSize: 14,
    color: '#2C3E50',
    lineHeight: 20,
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
  giftItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F3F7',
  },
  giftText: {
    flex: 1,
    fontSize: 14,
    color: '#2C3E50',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F3F7',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#2C3E50',
    textTransform: 'capitalize',
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#45B7D1',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  textInput: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    color: '#2C3E50',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 8,
  },
  optionItemSelected: {
    backgroundColor: '#E8F4F8',
  },
  optionText: {
    fontSize: 16,
    color: '#2C3E50',
  },
  tierDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
});