export interface Meeting {
  id: string;
  title: string;
  personIds: string[];
  placeId?: string;
  date: Date;
  duration?: number; // in minutes
  notes?: string;
  type: 'in-person' | 'video' | 'phone';
  createdAt: Date;
  updatedAt: Date;
}