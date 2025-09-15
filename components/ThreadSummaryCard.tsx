import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MessageCircle, TrendingUp, AlertTriangle, Clock } from 'lucide-react-native';
import { Thread } from '@/models/Thread';
import { Message } from '@/models/Message';
import { ThreadSummaryResult } from '@/services/AITypes';
import { AIService } from '@/services/AIService';
import { theme } from '@/constants/theme';

interface ThreadSummaryCardProps {
  thread: Thread;
  messages: Message[];
  onPress?: () => void;
}

export const ThreadSummaryCard: React.FC<ThreadSummaryCardProps> = ({
  thread,
  messages,
  onPress,
}) => {
  const [summary, setSummary] = useState<ThreadSummaryResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (messages.length > 0) {
      generateSummary();
    }
  }, [messages]);

  const generateSummary = async () => {
    if (loading || messages.length === 0) return;
    
    setLoading(true);
    try {
      const result = await AIService.threadSummary(messages);
      setSummary(result);
    } catch (error) {
      console.error('[ThreadSummaryCard] Failed to generate summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return '#10B981';
      case 'negative': return '#EF4444';
      default: return theme.colors.textSecondary;
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'high': return <AlertTriangle size={16} color="#EF4444" />;
      case 'medium': return <Clock size={16} color="#F59E0B" />;
      default: return <TrendingUp size={16} color={theme.colors.textSecondary} />;
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <MessageCircle size={20} color={theme.colors.primary} />
          <Text style={styles.title}>Analyzing conversation...</Text>
        </View>
      </View>
    );
  }

  if (!summary) {
    return null;
  }

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <MessageCircle size={20} color={theme.colors.primary} />
        <Text style={styles.title}>Thread Summary</Text>
        <View style={styles.urgencyBadge}>
          {getUrgencyIcon(summary.urgency)}
        </View>
      </View>
      
      <Text style={styles.summary}>{summary.summary}</Text>
      
      {summary.keyTopics.length > 0 && (
        <View style={styles.topicsContainer}>
          {summary.keyTopics.slice(0, 3).map((topic, index) => (
            <View key={index} style={styles.topicTag}>
              <Text style={styles.topicText}>{topic}</Text>
            </View>
          ))}
        </View>
      )}
      
      <View style={styles.footer}>
        <View style={styles.sentimentContainer}>
          <View 
            style={[
              styles.sentimentDot, 
              { backgroundColor: getSentimentColor(summary.sentiment) }
            ]} 
          />
          <Text style={styles.sentimentText}>
            {summary.sentiment.charAt(0).toUpperCase() + summary.sentiment.slice(1)} tone
          </Text>
        </View>
        <Text style={styles.messageCount}>
          {messages.length} message{messages.length !== 1 ? 's' : ''}
        </Text>
      </View>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  title: {
    ...theme.typography.headline,
    color: theme.colors.text,
    marginLeft: theme.spacing.sm,
    flex: 1,
  },
  urgencyBadge: {
    padding: theme.spacing.xs,
  },
  summary: {
    ...theme.typography.body,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    lineHeight: 20,
  },
  topicsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: theme.spacing.md,
  },
  topicTag: {
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    marginRight: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  topicText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sentimentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sentimentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: theme.spacing.xs,
  },
  sentimentText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  messageCount: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
});