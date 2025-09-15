export interface Annotation {
  id: string;
  entityType: 'person' | 'company' | 'meeting' | 'task' | 'place' | 'interaction';
  entityId: string;
  type: 'note' | 'tag' | 'reminder' | 'highlight' | 'attachment' | 'tier' | 'how_we_met' | 'preferred_channel' | 'birthday' | 'do_not_disturb' | 'gift_ideas';
  content: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface PersonAnnotations {
  tags: Annotation[];
  notes: Annotation[];
  tier: Annotation | null;
  howWeMet: Annotation | null;
  preferredChannel: Annotation | null;
  birthday: Annotation | null;
  doNotDisturb: Annotation | null;
  giftIdeas: Annotation[];
}

export const ANNOTATION_TYPES = {
  NOTE: 'note' as const,
  TAG: 'tag' as const,
  TIER: 'tier' as const,
  HOW_WE_MET: 'how_we_met' as const,
  PREFERRED_CHANNEL: 'preferred_channel' as const,
  BIRTHDAY: 'birthday' as const,
  DO_NOT_DISTURB: 'do_not_disturb' as const,
  GIFT_IDEAS: 'gift_ideas' as const,
};

export const TIER_OPTIONS = [
  { value: 'inner_circle', label: 'Inner Circle', color: '#E74C3C' },
  { value: 'close_friend', label: 'Close Friend', color: '#F39C12' },
  { value: 'friend', label: 'Friend', color: '#27AE60' },
  { value: 'acquaintance', label: 'Acquaintance', color: '#3498DB' },
  { value: 'professional', label: 'Professional', color: '#9B59B6' },
];

export const CHANNEL_OPTIONS = [
  { value: 'text', label: 'Text Message', icon: 'MessageCircle' },
  { value: 'call', label: 'Phone Call', icon: 'Phone' },
  { value: 'email', label: 'Email', icon: 'Mail' },
  { value: 'video', label: 'Video Call', icon: 'Video' },
  { value: 'in_person', label: 'In Person', icon: 'Coffee' },
];

export function groupAnnotationsByType(annotations: Annotation[]): PersonAnnotations {
  const grouped: PersonAnnotations = {
    tags: [],
    notes: [],
    tier: null,
    howWeMet: null,
    preferredChannel: null,
    birthday: null,
    doNotDisturb: null,
    giftIdeas: [],
  };

  annotations.forEach(annotation => {
    switch (annotation.type) {
      case ANNOTATION_TYPES.TAG:
        grouped.tags.push(annotation);
        break;
      case ANNOTATION_TYPES.NOTE:
        grouped.notes.push(annotation);
        break;
      case ANNOTATION_TYPES.TIER:
        grouped.tier = annotation;
        break;
      case ANNOTATION_TYPES.HOW_WE_MET:
        grouped.howWeMet = annotation;
        break;
      case ANNOTATION_TYPES.PREFERRED_CHANNEL:
        grouped.preferredChannel = annotation;
        break;
      case ANNOTATION_TYPES.BIRTHDAY:
        grouped.birthday = annotation;
        break;
      case ANNOTATION_TYPES.DO_NOT_DISTURB:
        grouped.doNotDisturb = annotation;
        break;
      case ANNOTATION_TYPES.GIFT_IDEAS:
        grouped.giftIdeas.push(annotation);
        break;
    }
  });

  return grouped;
}