import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Calendar, Users, Lightbulb, MessageSquare, Clock } from 'lucide-react-native';
import { Meeting } from '@/models/Meeting';
import { Person } from '@/models/Person';
import { Interaction } from '@/models/Interaction';
import { PrepPackResult } from '@/services/AITypes';
import { AIService } from '@/services/AIService';
import { theme } from '@/constants/theme';

interface MeetingPrepCardProps {
  meeting: Meeting;
  attendees: Person[];
  interactions: Interaction[];
  onPress?: () => void;
}

export const MeetingPrepCard: React.FC<MeetingPrepCardProps> = ({
  meeting,
  attendees,
  interactions,
  onPress,
}) => {
  const [prepPacks, setPrepPacks] = useState<Map<string, PrepPackResult>>(new Map());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (attendees.length > 0) {
      generatePrepPacks();
    }
  }, [attendees, interactions]);

  const generatePrepPacks = async () => {
    if (loading || attendees.length === 0) return;
    
    setLoading(true);
    try {
      const packs = new Map<string, PrepPackResult>();
      
      for (const attendee of attendees) {
        const attendeeInteractions = interactions.filter(i => 
          i.personId === attendee.id
        );
        
        const prepPack = await AIService.prepPack(attendee, attendeeInteractions);
        packs.set(attendee.id, prepPack);
      }
      
      setPrepPacks(packs);
    } catch (error) {
      console.error('[MeetingPrepCard] Failed to generate prep packs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRelationshipColor = (status: string) => {
    switch (status) {
      case 'active': return '#10B981';
      case 'warming': return '#F59E0B';
      case 'cooling': return '#EF4444';
      case 'new': return '#6366F1';
      default: return theme.colors.textSecondary;
    }
  };

  const formatMeetingTime = (date: Date) => {
    const now = new Date();
    const diffHours = Math.abs(date.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (diffHours < 24) {
      return `${diffHours < 1 ? 'In ' + Math.round(diffHours * 60) + ' min' : 
              'In ' + Math.round(diffHours) + ' hours'}`;
    } else {
      return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Calendar size={20} color={theme.colors.primary} />
          <Text style={styles.title}>Preparing meeting insights...</Text>
        </View>
      </View>
    );
  }

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <Calendar size={20} color={theme.colors.primary} />
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{meeting.title}</Text>
          <View style={styles.timeContainer}>
            <Clock size={14} color={theme.colors.textSecondary} />
            <Text style={styles.timeText}>{formatMeetingTime(meeting.date)}</Text>
          </View>
        </View>
      </View>

      {attendees.length > 0 && (
        <View style={styles.attendeesSection}>
          <View style={styles.sectionHeader}>
            <Users size={16} color={theme.colors.textSecondary} />
            <Text style={styles.sectionTitle}>Attendees ({attendees.length})</Text>
          </View>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.attendeesScroll}
          >
            {attendees.map((attendee) => {
              const prepPack = prepPacks.get(attendee.id);
              return (
                <View key={attendee.id} style={styles.attendeeCard}>
                  <Text style={styles.attendeeName}>
                    {attendee.firstName} {attendee.lastName}
                  </Text>
                  {prepPack && (
                    <>
                      <View style={styles.relationshipBadge}>
                        <View 
                          style={[
                            styles.relationshipDot, 
                            { backgroundColor: getRelationshipColor(prepPack.relationshipStatus) }
                          ]} 
                        />
                        <Text style={styles.relationshipText}>
                          {prepPack.relationshipStatus}
                        </Text>
                      </View>
                      
                      {prepPack.suggestedTopics.length > 0 && (
                        <View style={styles.topicsContainer}>
                          <Lightbulb size={12} color={theme.colors.warning} />
                          <Text style={styles.topicText}>
                            {prepPack.suggestedTopics[0]}
                          </Text>
                        </View>
                      )}
                      
                      {prepPack.recentInteractions.length > 0 && (
                        <View style={styles.interactionContainer}>
                          <MessageSquare size={12} color={theme.colors.textSecondary} />
                          <Text style={styles.interactionText}>
                            {prepPack.recentInteractions.length} recent interaction{prepPack.recentInteractions.length !== 1 ? 's' : ''}
                          </Text>
                        </View>
                      )}
                    </>
                  )}
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      {prepPacks.size > 0 && (
        <View style={styles.insightsSection}>
          <Text style={styles.insightsTitle}>Key Insights</Text>
          <View style={styles.insightsList}>
            {Array.from(prepPacks.values()).slice(0, 3).map((pack, index) => (
              <View key={`insight-${index}`} style={styles.insightItem}>
                <View style={styles.insightBullet} />
                <Text style={styles.insightText}>
                  {pack.suggestedTopics[0] || 'Check in on recent activities'}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginHorizontal: theme.spacing.lg,
    marginVertical: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  titleContainer: {
    flex: 1,
    marginLeft: theme.spacing.sm,
  },
  title: {
    ...theme.typography.headline,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.xs,
  },
  attendeesSection: {
    marginBottom: theme.spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    ...theme.typography.subheadline,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.xs,
    fontWeight: '600',
  },
  attendeesScroll: {
    flexDirection: 'row',
  },
  attendeeCard: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm,
    marginRight: theme.spacing.sm,
    minWidth: 140,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  attendeeName: {
    ...theme.typography.footnote,
    color: theme.colors.text,
    fontWeight: '600',
    marginBottom: theme.spacing.xs,
  },
  relationshipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  relationshipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: theme.spacing.xs,
  },
  relationshipText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textTransform: 'capitalize',
  },
  topicsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  topicText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.xs,
    flex: 1,
  },
  interactionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  interactionText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.xs,
  },
  insightsSection: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.md,
  },
  insightsTitle: {
    ...theme.typography.subheadline,
    color: theme.colors.text,
    fontWeight: '600',
    marginBottom: theme.spacing.sm,
  },
  insightsList: {
    gap: theme.spacing.xs,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  insightBullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.primary,
    marginTop: 6,
    marginRight: theme.spacing.sm,
  },
  insightText: {
    ...theme.typography.footnote,
    color: theme.colors.textSecondary,
    flex: 1,
    lineHeight: 16,
  },
});