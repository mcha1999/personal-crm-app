export interface Thread {
  id: string;
  personIds: string[];
  subject?: string;
  lastMessageAt: Date;
  platform: 'sms' | 'whatsapp' | 'email' | 'messenger' | 'instagram' | 'other';
  unreadCount: number;
  createdAt: Date;
  updatedAt: Date;
}