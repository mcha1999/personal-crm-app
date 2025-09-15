export interface Annotation {
  id: string;
  entityType: 'person' | 'company' | 'meeting' | 'task' | 'place' | 'interaction';
  entityId: string;
  type: 'note' | 'tag' | 'reminder' | 'highlight' | 'attachment';
  content: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}