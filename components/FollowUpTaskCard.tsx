import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CheckCircle, ArrowRight } from 'lucide-react-native';
import { Task } from '@/models/Task';
import { Person } from '@/models/Person';
import { theme } from '@/constants/theme';

interface FollowUpTaskCardProps {
  task: Task;
  person?: Person;
  onPress?: () => void;
  onComplete?: (taskId: string) => void;
}

export const FollowUpTaskCard: React.FC<FollowUpTaskCardProps> = ({
  task,
  person,
  onPress,
  onComplete,
}) => {
  const handleComplete = () => {
    if (onComplete) {
      onComplete(task.id);
    }
  };

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
  const dueToday = task.dueDate && 
    new Date(task.dueDate).toDateString() === new Date().toDateString();

  return (
    <TouchableOpacity 
      style={[
        styles.container,
        task.completed && styles.completedContainer,
        isOverdue && !task.completed && styles.overdueContainer
      ]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.checkboxContainer}
          onPress={handleComplete}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <View style={[
            styles.checkbox,
            task.completed && styles.checkboxCompleted
          ]}>
            {task.completed && (
              <CheckCircle size={20} color="#10B981" />
            )}
          </View>
        </TouchableOpacity>
        
        <View style={styles.contentContainer}>
          <Text style={[
            styles.title,
            task.completed && styles.completedText
          ]}>
            {task.title}
          </Text>
          
          {task.description && (
            <Text style={[
              styles.description,
              task.completed && styles.completedText
            ]}>
              {task.description}
            </Text>
          )}
          
          {person && (
            <Text style={styles.personName}>
              For: {person.firstName} {person.lastName}
            </Text>
          )}
        </View>
        
        <ArrowRight size={16} color={theme.colors.textSecondary} />
      </View>
      
      <View style={styles.footer}>
        <View style={styles.typeContainer}>
          <View style={styles.typeBadge}>
            <Text style={styles.typeText}>Follow-up</Text>
          </View>
          {task.dueDate && (
            <View style={[
              styles.dueBadge,
              dueToday && styles.dueTodayBadge,
              isOverdue && !task.completed && styles.overdueBadge
            ]}>
              <Text style={[
                styles.dueText,
                dueToday && styles.dueTodayText,
                isOverdue && !task.completed && styles.overdueText
              ]}>
                {dueToday ? 'Due today' : 
                 isOverdue ? 'Overdue' : 
                 task.dueDate.toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>
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
  completedContainer: {
    opacity: 0.7,
    backgroundColor: theme.colors.background,
  },
  overdueContainer: {
    borderColor: '#EF4444',
    borderWidth: 1.5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkboxContainer: {
    marginRight: theme.spacing.sm,
    marginTop: 2,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxCompleted: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  contentContainer: {
    flex: 1,
  },
  title: {
    ...theme.typography.headline,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: theme.colors.textSecondary,
  },
  description: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  personName: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  footer: {
    marginTop: theme.spacing.sm,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeBadge: {
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    marginRight: theme.spacing.sm,
  },
  typeText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  dueBadge: {
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  dueTodayBadge: {
    backgroundColor: '#FEF3C7',
  },
  overdueBadge: {
    backgroundColor: '#FEE2E2',
  },
  dueText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  dueTodayText: {
    color: '#92400E',
    fontWeight: '600',
  },
  overdueText: {
    color: '#DC2626',
    fontWeight: '600',
  },
});