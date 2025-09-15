export interface ThreadSummaryResult {
  summary: string;
  keyTopics: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  urgency: 'low' | 'medium' | 'high';
}

export interface FollowUpDetectResult {
  hasFollowUp: boolean;
  followUpType: 'question' | 'request' | 'commitment' | 'none';
  suggestedAction: string;
  priority: 'low' | 'medium' | 'high';
}

export interface PrepPackResult {
  personContext: string;
  recentInteractions: string[];
  suggestedTopics: string[];
  relationshipStatus: 'new' | 'warming' | 'active' | 'cooling' | 'dormant';
}