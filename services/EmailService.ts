import { Linking } from 'react-native';
import * as MailComposer from 'expo-mail-composer';
import { Person } from '@/models/Person';
import { Interaction } from '@/models/Interaction';
import { InteractionDAO } from '@/database/InteractionDAO';
import { PersonDAO } from '@/database/PersonDAO';

export interface EmailDraft {
  to: string[];
  subject: string;
  body: string;
  cc?: string[];
  bcc?: string[];
}

export interface ManualEmailEntry {
  type: 'sent' | 'received';
  contactEmail: string;
  subject: string;
  summary?: string;
  date?: Date;
}

export class EmailService {
  private interactionDAO: InteractionDAO;
  private personDAO: PersonDAO;

  constructor(interactionDAO: InteractionDAO, personDAO: PersonDAO) {
    this.interactionDAO = interactionDAO;
    this.personDAO = personDAO;
  }

  async composeEmail(draft: EmailDraft): Promise<boolean> {
    try {
      const isAvailable = await MailComposer.isAvailableAsync();
      
      if (!isAvailable) {
        // Fallback to mailto link
        const mailto = this.createMailtoLink(draft);
        return await Linking.openURL(mailto);
      }

      const result = await MailComposer.composeAsync({
        recipients: draft.to,
        ccRecipients: draft.cc,
        bccRecipients: draft.bcc,
        subject: draft.subject,
        body: draft.body,
      });

      return result.status === MailComposer.MailComposerStatus.SENT;
    } catch (error) {
      console.error('[EmailService] Failed to compose email:', error);
      return false;
    }
  }

  private createMailtoLink(draft: EmailDraft): string {
    const params = new URLSearchParams();
    if (draft.subject) params.append('subject', draft.subject);
    if (draft.body) params.append('body', draft.body);
    if (draft.cc?.length) params.append('cc', draft.cc.join(','));
    if (draft.bcc?.length) params.append('bcc', draft.bcc.join(','));
    
    const to = draft.to.join(',');
    const queryString = params.toString();
    return `mailto:${to}${queryString ? '?' + queryString : ''}`;
  }

  async logEmailInteraction(entry: ManualEmailEntry): Promise<Interaction | null> {
    try {
      // Find or create person
      let person = await this.personDAO.findByEmail(entry.contactEmail);
      
      if (!person) {
        // Extract name from email if possible
        const emailParts = entry.contactEmail.split('@')[0];
        const nameParts = emailParts.split(/[._-]/);
        const firstName = nameParts[0] || '';
        const lastName = nameParts[1] || '';
        
        person = await this.personDAO.create({
          firstName: firstName.charAt(0).toUpperCase() + firstName.slice(1),
          lastName: lastName.charAt(0).toUpperCase() + lastName.slice(1),
          email: entry.contactEmail,
          relationship: 'acquaintance',
          tags: [],
          lastInteraction: entry.date || new Date(),
        });
      }

      if (!person) return null;

      // Create interaction
      const interaction = await this.interactionDAO.create({
        personId: person.id!,
        type: 'email',
        date: entry.date || new Date(),
        notes: entry.summary || `${entry.type === 'sent' ? 'Sent' : 'Received'} email: ${entry.subject}`,
      });

      // Update last contacted date
      await this.personDAO.update(person.id!, {
        lastInteraction: entry.date || new Date(),
      });

      return interaction;
    } catch (error) {
      console.error('[EmailService] Failed to log email interaction:', error);
      return null;
    }
  }

  async getEmailTemplates(): Promise<EmailDraft[]> {
    return [
      {
        to: [],
        subject: 'Following up on our conversation',
        body: `Hi [Name],\n\nI wanted to follow up on our recent conversation about [topic].\n\n[Your message here]\n\nBest regards,\n[Your name]`,
      },
      {
        to: [],
        subject: 'Great meeting you!',
        body: `Hi [Name],\n\nIt was great meeting you at [event/location]. I really enjoyed our discussion about [topic].\n\n[Your message here]\n\nLooking forward to staying in touch!\n\nBest,\n[Your name]`,
      },
      {
        to: [],
        subject: 'Quick question',
        body: `Hi [Name],\n\nHope you're doing well! I had a quick question about [topic].\n\n[Your question here]\n\nThanks!\n[Your name]`,
      },
    ];
  }

  async suggestFollowUpEmail(person: Person, lastInteraction?: Interaction): Promise<EmailDraft> {
    const daysSinceContact = person.lastInteraction 
      ? Math.floor((Date.now() - person.lastInteraction.getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    let subject = 'Following up';
    let body = `Hi ${person.firstName},\n\n`;

    if (daysSinceContact > 90) {
      subject = 'Long time no talk!';
      body += `It's been a while since we last connected. I wanted to reach out and see how you've been.\n\n`;
      body += `[Add personal update or question]\n\n`;
    } else if (daysSinceContact > 30) {
      subject = 'Checking in';
      body += `Hope you've been well! I wanted to check in and see how things are going.\n\n`;
      body += `[Add specific question or update]\n\n`;
    } else if (lastInteraction?.notes) {
      subject = `Following up on our conversation`;
      body += `Following up on our recent conversation.\n\n`;
    } else {
      body += `Thanks for our recent conversation. I wanted to follow up on what we discussed.\n\n`;
      body += `[Add specific follow-up]\n\n`;
    }

    body += `Best regards,\n[Your name]`;

    return {
      to: [person.email || ''],
      subject,
      body,
    };
  }
}