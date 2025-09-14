export interface PersonScore {
  id: string;
  personId: string;
  relationshipScore: number; // 0-100
  interactionFrequency: number; // interactions per month
  lastInteractionDaysAgo: number;
  totalInteractions: number;
  averageResponseTime?: number; // in hours
  calculatedAt: Date;
}