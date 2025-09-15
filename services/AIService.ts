import { Message } from '@/models/Message';
import { Person } from '@/models/Person';
import { Interaction } from '@/models/Interaction';
import { ThreadSummaryResult, FollowUpDetectResult, PrepPackResult } from './AITypes';
import { RulesBasedAI } from './RulesBasedAI';
import { FEATURES } from '@/constants/features';

export class AIService {
  private static async useOnDeviceLLM(): Promise<boolean> {
    return FEATURES.useAppleOnDeviceLLM;
  }

  static async threadSummary(messages: Message[]): Promise<ThreadSummaryResult> {
    console.log('[AIService] Computing thread summary for', messages.length, 'messages');
    
    if (await this.useOnDeviceLLM()) {
      // TODO: Implement Apple's on-device LLM integration
      console.log('[AIService] Using on-device LLM for thread summary');
      return this.onDeviceThreadSummary(messages);
    } else {
      console.log('[AIService] Using rules-based fallback for thread summary');
      return RulesBasedAI.threadSummary(messages);
    }
  }

  static async followUpDetect(messages: Message[]): Promise<FollowUpDetectResult> {
    console.log('[AIService] Detecting follow-ups for', messages.length, 'messages');
    
    if (await this.useOnDeviceLLM()) {
      // TODO: Implement Apple's on-device LLM integration
      console.log('[AIService] Using on-device LLM for follow-up detection');
      return this.onDeviceFollowUpDetect(messages);
    } else {
      console.log('[AIService] Using rules-based fallback for follow-up detection');
      return RulesBasedAI.followUpDetect(messages);
    }
  }

  static async prepPack(person: Person, interactions: Interaction[]): Promise<PrepPackResult> {
    console.log('[AIService] Generating prep pack for', person.firstName, person.lastName, 'with', interactions.length, 'interactions');
    
    if (await this.useOnDeviceLLM()) {
      // TODO: Implement Apple's on-device LLM integration
      console.log('[AIService] Using on-device LLM for prep pack');
      return this.onDevicePrepPack(person, interactions);
    } else {
      console.log('[AIService] Using rules-based fallback for prep pack');
      return RulesBasedAI.prepPack(person, interactions);
    }
  }

  // Placeholder methods for future on-device LLM integration
  private static async onDeviceThreadSummary(messages: Message[]): Promise<ThreadSummaryResult> {
    // TODO: Integrate with Apple's on-device LLM
    // For now, fall back to rules-based approach
    console.log('[AIService] On-device LLM not yet implemented, falling back to rules');
    return RulesBasedAI.threadSummary(messages);
  }

  private static async onDeviceFollowUpDetect(messages: Message[]): Promise<FollowUpDetectResult> {
    // TODO: Integrate with Apple's on-device LLM
    // For now, fall back to rules-based approach
    console.log('[AIService] On-device LLM not yet implemented, falling back to rules');
    return RulesBasedAI.followUpDetect(messages);
  }

  private static async onDevicePrepPack(person: Person, interactions: Interaction[]): Promise<PrepPackResult> {
    // TODO: Integrate with Apple's on-device LLM
    // For now, fall back to rules-based approach
    console.log('[AIService] On-device LLM not yet implemented, falling back to rules');
    return RulesBasedAI.prepPack(person, interactions);
  }

  // Utility method to toggle the feature flag (for testing/settings)
  static setOnDeviceLLMEnabled(enabled: boolean): void {
    console.log('[AIService] Setting on-device LLM enabled:', enabled);
    // Note: In a real implementation, this would update persistent settings
    // For now, we just log the change since FEATURES is a const
  }

  // Method to check current AI backend being used
  static async getCurrentBackend(): Promise<'on-device' | 'rules-based'> {
    return (await this.useOnDeviceLLM()) ? 'on-device' : 'rules-based';
  }
}