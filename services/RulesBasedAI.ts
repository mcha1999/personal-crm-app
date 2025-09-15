import { Message } from '@/models/Message';
import { Person } from '@/models/Person';
import { Interaction } from '@/models/Interaction';
import { ThreadSummaryResult, FollowUpDetectResult, PrepPackResult } from './AITypes';

export class RulesBasedAI {
  static threadSummary(messages: Message[]): ThreadSummaryResult {
    if (messages.length === 0) {
      return {
        summary: 'Empty conversation',
        keyTopics: [],
        sentiment: 'neutral',
        urgency: 'low'
      };
    }

    const allText = messages.map(m => m.content || '').join(' ').toLowerCase();
    const wordCount = allText.split(' ').length;
    
    // Extract key topics using simple keyword matching
    const topicKeywords = {
      'meeting': ['meeting', 'call', 'zoom', 'conference', 'schedule'],
      'project': ['project', 'deadline', 'deliverable', 'milestone'],
      'travel': ['travel', 'trip', 'flight', 'hotel', 'vacation'],
      'business': ['business', 'deal', 'contract', 'proposal', 'client'],
      'personal': ['family', 'personal', 'weekend', 'holiday', 'birthday']
    };

    const keyTopics: string[] = [];
    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(keyword => allText.includes(keyword))) {
        keyTopics.push(topic);
      }
    }

    // Simple sentiment analysis
    const positiveWords = ['great', 'excellent', 'good', 'happy', 'thanks', 'perfect', 'awesome'];
    const negativeWords = ['problem', 'issue', 'urgent', 'error', 'failed', 'wrong', 'bad'];
    
    const positiveCount = positiveWords.filter(word => allText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => allText.includes(word)).length;
    
    let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
    if (positiveCount > negativeCount) sentiment = 'positive';
    else if (negativeCount > positiveCount) sentiment = 'negative';

    // Urgency detection
    const urgentWords = ['urgent', 'asap', 'immediately', 'emergency', 'critical'];
    const hasUrgentWords = urgentWords.some(word => allText.includes(word));
    const hasQuestionMarks = (allText.match(/\\?/g) || []).length > 2;
    
    let urgency: 'low' | 'medium' | 'high' = 'low';
    if (hasUrgentWords) urgency = 'high';
    else if (hasQuestionMarks || messages.length > 10) urgency = 'medium';

    // Generate summary
    const latestMessage = messages[messages.length - 1];
    const summary = wordCount > 50 
      ? `Conversation about ${keyTopics.join(', ') || 'general topics'}. Latest: ${(latestMessage.content || '').substring(0, 100)}...`
      : `Brief exchange${keyTopics.length > 0 ? ` about ${keyTopics[0]}` : ''}`;

    return {
      summary,
      keyTopics,
      sentiment,
      urgency
    };
  }

  static followUpDetect(messages: Message[]): FollowUpDetectResult {
    if (messages.length === 0) {
      return {
        hasFollowUp: false,
        followUpType: 'none',
        suggestedAction: 'No action needed',
        priority: 'low'
      };
    }

    const latestMessage = messages[messages.length - 1];
    const messageText = (latestMessage.content || '').toLowerCase();
    
    // Question detection
    const hasQuestion = messageText.includes('?') || 
                       messageText.includes('when') || 
                       messageText.includes('what') || 
                       messageText.includes('how') || 
                       messageText.includes('where') || 
                       messageText.includes('why');

    // Request detection
    const requestWords = ['please', 'can you', 'could you', 'would you', 'need', 'require'];
    const hasRequest = requestWords.some(word => messageText.includes(word));

    // Commitment detection
    const commitmentWords = ['will', 'promise', 'commit', 'deliver', 'by', 'deadline'];
    const hasCommitment = commitmentWords.some(word => messageText.includes(word));

    let followUpType: 'question' | 'request' | 'commitment' | 'none' = 'none';
    let suggestedAction = 'No action needed';
    let priority: 'low' | 'medium' | 'high' = 'low';

    if (hasQuestion) {
      followUpType = 'question';
      suggestedAction = 'Respond to the question';
      priority = 'medium';
    } else if (hasRequest) {
      followUpType = 'request';
      suggestedAction = 'Address the request';
      priority = 'medium';
    } else if (hasCommitment) {
      followUpType = 'commitment';
      suggestedAction = 'Track commitment progress';
      priority = 'high';
    }

    return {
      hasFollowUp: followUpType !== 'none',
      followUpType,
      suggestedAction,
      priority
    };
  }

  static prepPack(person: Person, interactions: Interaction[]): PrepPackResult {
    const recentInteractions = interactions
      .slice(0, 5)
      .map(i => `${i.type}: ${i.notes || 'No notes'}`);

    // Analyze interaction frequency for relationship status
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const recentCount = interactions.filter(i => new Date(i.date) > thirtyDaysAgo).length;
    const quarterCount = interactions.filter(i => new Date(i.date) > ninetyDaysAgo).length;

    let relationshipStatus: 'new' | 'warming' | 'active' | 'cooling' | 'dormant' = 'dormant';
    
    if (interactions.length === 0) {
      relationshipStatus = 'new';
    } else if (recentCount >= 3) {
      relationshipStatus = 'active';
    } else if (recentCount >= 1) {
      relationshipStatus = 'warming';
    } else if (quarterCount >= 1) {
      relationshipStatus = 'cooling';
    }

    // Generate context
    const fullName = `${person.firstName} ${person.lastName}`.trim();
    const personContext = `${fullName}. ${interactions.length} total interactions, ${recentCount} in last 30 days.`;

    // Suggest topics based on interaction history
    const suggestedTopics: string[] = [];
    const interactionTypes = [...new Set(interactions.map(i => i.type))];
    
    if (interactionTypes.includes('email')) suggestedTopics.push('Follow up on recent email');
    if (interactionTypes.includes('meeting')) suggestedTopics.push('Schedule next meeting');
    if (person.companyId) suggestedTopics.push('Ask about work updates');
    
    // Add generic topics if none found
    if (suggestedTopics.length === 0) {
      suggestedTopics.push('Check in', 'Share updates', 'Explore collaboration');
    }

    return {
      personContext,
      recentInteractions,
      suggestedTopics,
      relationshipStatus
    };
  }
}