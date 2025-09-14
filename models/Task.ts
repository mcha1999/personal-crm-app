export interface Task {
  id: string;
  title: string;
  description?: string;
  personId?: string;
  dueDate?: Date;
  completed: boolean;
  completedAt?: Date;
  type: 'follow-up' | 'birthday' | 'reminder' | 'other';
  createdAt: Date;
  updatedAt: Date;
}