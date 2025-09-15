import { AIService } from './AIService';
import { TaskDAO } from '@/database/TaskDAO';
import { MessageDAO } from '@/database/MessageDAO';
import { ThreadDAO } from '@/database/ThreadDAO';
import { Task } from '@/models/Task';
import { Message } from '@/models/Message';
import { Thread } from '@/models/Thread';

export class FollowUpService {
  private static taskDAO = new TaskDAO();
  private static messageDAO = new MessageDAO();
  private static threadDAO = new ThreadDAO();

  static async processThreadsForFollowUps(): Promise<{
    tasksCreated: number;
    threadsProcessed: number;
  }> {
    console.log('[FollowUpService] Processing threads for follow-ups');
    
    try {
      const threads = await this.threadDAO.findAll();
      let tasksCreated = 0;
      
      for (const thread of threads) {
        const messages = await this.messageDAO.findByThread(thread.id);
        
        if (messages.length === 0) continue;
        
        // Only process threads with recent activity (last 7 days)
        const lastMessageDate = new Date(thread.lastMessageAt);
        const daysSinceLastMessage = Math.floor(
          (Date.now() - lastMessageDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        if (daysSinceLastMessage > 7) continue;
        
        const followUpResult = await AIService.followUpDetect(messages);
        
        if (followUpResult.hasFollowUp && followUpResult.priority !== 'low') {
          // Check if we already have a follow-up task for this thread
          const existingTasks = await this.taskDAO.getAllTasks();
          const hasExistingFollowUp = existingTasks.some(task => 
            task.type === 'follow-up' && 
            task.description?.includes(thread.id) &&
            !task.completed
          );
          
          if (!hasExistingFollowUp) {
            await this.createFollowUpTask(thread, messages, followUpResult);
            tasksCreated++;
          }
        }
      }
      
      console.log(`[FollowUpService] Created ${tasksCreated} follow-up tasks from ${threads.length} threads`);
      
      return {
        tasksCreated,
        threadsProcessed: threads.length,
      };
    } catch (error) {
      console.error('[FollowUpService] Error processing threads:', error);
      throw error;
    }
  }

  private static async createFollowUpTask(
    thread: Thread, 
    messages: Message[], 
    followUpResult: any
  ): Promise<Task> {
    const latestMessage = messages[messages.length - 1];
    const personId = thread.personIds.length > 0 ? thread.personIds[0] : undefined;
    
    // Set due date based on priority
    const dueDate = new Date();
    switch (followUpResult.priority) {
      case 'high':
        dueDate.setHours(dueDate.getHours() + 4); // 4 hours
        break;
      case 'medium':
        dueDate.setDate(dueDate.getDate() + 1); // 1 day
        break;
      default:
        dueDate.setDate(dueDate.getDate() + 3); // 3 days
    }
    
    const task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'> = {
      title: followUpResult.suggestedAction,
      description: `${followUpResult.followUpType}: ${latestMessage.content?.substring(0, 100)}... (Thread: ${thread.id})`,
      personId,
      dueDate,
      completed: false,
      type: 'follow-up',
    };
    
    return await this.taskDAO.create(task);
  }

  static async processRecentMessages(hours: number = 24): Promise<{
    tasksCreated: number;
    messagesProcessed: number;
  }> {
    console.log(`[FollowUpService] Processing messages from last ${hours} hours`);
    
    try {
      const cutoffDate = new Date(Date.now() - hours * 60 * 60 * 1000);
      const allMessages = await this.messageDAO.findAll();
      
      const recentMessages = allMessages.filter(message => 
        new Date(message.sentAt) > cutoffDate
      );
      
      // Group messages by thread
      const messagesByThread = new Map<string, Message[]>();
      for (const message of recentMessages) {
        const threadMessages = messagesByThread.get(message.threadId) || [];
        threadMessages.push(message);
        messagesByThread.set(message.threadId, threadMessages);
      }
      
      let tasksCreated = 0;
      
      for (const [threadId, messages] of messagesByThread) {
        if (messages.length === 0) continue;
        
        const followUpResult = await AIService.followUpDetect(messages);
        
        if (followUpResult.hasFollowUp && followUpResult.priority !== 'low') {
          const thread = await this.threadDAO.findById(threadId);
          if (thread) {
            // Check for existing tasks
            const existingTasks = await this.taskDAO.getAllTasks();
            const hasExistingFollowUp = existingTasks.some(task => 
              task.type === 'follow-up' && 
              task.description?.includes(threadId) &&
              !task.completed
            );
            
            if (!hasExistingFollowUp) {
              await this.createFollowUpTask(thread, messages, followUpResult);
              tasksCreated++;
            }
          }
        }
      }
      
      console.log(`[FollowUpService] Created ${tasksCreated} tasks from ${recentMessages.length} recent messages`);
      
      return {
        tasksCreated,
        messagesProcessed: recentMessages.length,
      };
    } catch (error) {
      console.error('[FollowUpService] Error processing recent messages:', error);
      throw error;
    }
  }

  static async getFollowUpTasks(): Promise<Task[]> {
    try {
      const allTasks = await this.taskDAO.getAllTasks();
      return allTasks.filter(task => task.type === 'follow-up' && !task.completed);
    } catch (error) {
      console.error('[FollowUpService] Error getting follow-up tasks:', error);
      return [];
    }
  }

  static async completeFollowUpTask(taskId: string): Promise<boolean> {
    try {
      const updatedTask = await this.taskDAO.toggleComplete(taskId);
      return updatedTask?.completed || false;
    } catch (error) {
      console.error('[FollowUpService] Error completing follow-up task:', error);
      return false;
    }
  }
}