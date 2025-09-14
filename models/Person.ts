export interface Person {
  id: string;
  firstName: string;
  lastName: string;
  nickname?: string;
  email?: string;
  phone?: string;
  birthday?: Date;
  avatar?: string;
  relationship: 'family' | 'friend' | 'colleague' | 'acquaintance';
  tags: string[];
  notes?: string;
  companyId?: string;
  lastInteraction?: Date;
  createdAt: Date;
  updatedAt: Date;
}