export interface Interaction {
  id: string;
  personId: string;
  type: 'meeting' | 'message' | 'call' | 'email' | 'social' | 'other';
  date: Date;
  duration?: number; // in minutes
  notes?: string;
  placeId?: string;
  meetingId?: string;
  threadId?: string;
  createdAt: Date;
  updatedAt: Date;
}