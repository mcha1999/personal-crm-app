import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Task } from '@/models/Task';
import { Person } from '@/models/Person';
import { Clock, CheckCircle, AlertCircle, Gift, Bell } from 'lucide-react-native';
import { theme } from '@/constants/theme';

interface TaskCardProps {
  task: Task;
  person?: Person;
  onPress?: () => void;
  onComplete?: () => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, person, onPress, onComplete }) => {
  const scaleAnim = new Animated.Value(1);
  const getTaskIcon = () => {
    switch (task.type) {
      case 'birthday': return <Gift size={16} color={theme.colors.secondary} />;
      case 'follow-up': return <Bell size={16} color={theme.colors.primary} />;
      case 'reminder': return <Clock size={16} color={theme.colors.accent} />;
      default: return <AlertCircle size={16} color={theme.colors.textSecondary} />;
    }
  };

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const formatDueDate = () => {
    if (!task.dueDate) return null;
    const now = new Date();
    const due = new Date(task.dueDate);
    const days = Math.floor((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (days < 0) return { text: 'Overdue', color: theme.colors.error };
    if (days === 0) return { text: 'Today', color: theme.colors.warning };
    if (days === 1) return { text: 'Tomorrow', color: theme.colors.primary };
    if (days < 7) return { text: `${days} days`, color: theme.colors.primary };
    return { text: due.toLocaleDateString(), color: theme.colors.textSecondary };
  };

  const dueDate = formatDueDate();

  return (
    <TouchableOpacity 
      onPress={onPress}
      activeOpacity={1}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View style={[
        styles.container,
        task.completed && styles.completed,
        { transform: [{ scale: scaleAnim }] }
      ]}>
      <TouchableOpacity 
        style={styles.checkbox} 
        onPress={onComplete}
        activeOpacity={0.7}
      >
        {task.completed ? (
          <CheckCircle size={24} color={theme.colors.accent} />
        ) : (
          <View style={styles.unchecked} />
        )}
      </TouchableOpacity>
      
      <View style={styles.content}>
        <View style={styles.header}>
          {getTaskIcon()}
          <Text style={[styles.title, task.completed && styles.completedText]}>
            {task.title}
          </Text>
        </View>
        
        {person && (
          <Text style={styles.personName}>
            {person.firstName} {person.lastName}
          </Text>
        )}
        
        {task.description && (
          <Text style={styles.description}>{task.description}</Text>
        )}
        
        {dueDate && (
          <View style={styles.dueDateContainer}>
            <Clock size={12} color={dueDate.color} />
            <Text style={[styles.dueDate, { color: dueDate.color }]}>
              {dueDate.text}
            </Text>
          </View>
        )}
      </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginHorizontal: theme.spacing.md,
    marginVertical: theme.spacing.xs,
    ...theme.shadows.sm,
  },
  completed: {
    opacity: 0.6,
  },
  checkbox: {
    marginRight: 12,
    justifyContent: 'center',
  },
  unchecked: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    ...theme.typography.callout,
    fontWeight: '500' as const,
    color: theme.colors.text,
    flex: 1,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: theme.colors.textSecondary,
  },
  personName: {
    ...theme.typography.footnote,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  description: {
    ...theme.typography.footnote,
    color: theme.colors.textLight,
    marginTop: 4,
  },
  dueDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  dueDate: {
    ...theme.typography.caption,
    fontWeight: '500' as const,
  },
});