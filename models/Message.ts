export interface Message {
  id: string;
  threadId: string;
  senderId: string;
  content: string;
  sentAt: Date;
  isFromMe: boolean;
  createdAt: Date;
  updatedAt: Date;
}