/**
 * Score Job - Device-Only Scoring Algorithm
 * 
 * Privacy-First Scoring:
 * - All scoring computations happen locally on device
 * - No external services or cloud processing
 * - Uses local SQLite data for all calculations
 * - Implements exponential decay for connectivity scoring
 */

import { PersonDAO } from '@/database/PersonDAO';
import { InteractionDAO } from '@/database/InteractionDAO';
import { PersonScoreDAO } from '@/database/PersonScoreDAO';
import { Interaction } from '@/models/Interaction';
import { Database } from '@/database/Database';

export interface ScoreMetrics {
  emails_90d: number;
  meetings_90d: number;
  notes_90d: number;
  reply_latency_median: number | null;
  days_since_last_touch: number;
  reciprocity: number;
  connectivity: number;
}

export class ScoreJob {
  private static instance: ScoreJob;
  private isRunning = false;

  private constructor() {}

  static getInstance(): ScoreJob {
    if (!ScoreJob.instance) {
      ScoreJob.instance = new ScoreJob();
    }
    return ScoreJob.instance;
  }

  /**
   * Run Score Computation - Device-Only Processing
   * 
   * Privacy Implementation:
   * - All scoring happens locally on device
   * - Uses only local SQLite database
   * - No external API calls or cloud processing
   * - Implements exponential decay algorithm locally
   */
  async run(): Promise<{ success: boolean; scoresComputed: number; error?: string }> {
    if (this.isRunning) {
      console.log('[ScoreJob] Score computation already in progress, skipping...');
      return { success: false, scoresComputed: 0, error: 'Score job already running' };
    }

    console.log('[ScoreJob] Starting device-only score computation...');
    this.isRunning = true;

    try {
      const database = Database.getInstance();
      
      // Ensure database is initialized
      if (!database.isAvailable()) {
        console.log('[ScoreJob] Database not available');
        throw new Error('Database not available');
      }

      // Create DAOs after ensuring database is available
      const personDAO = new PersonDAO();
      const interactionDAO = new InteractionDAO();
      // const messageDAO = new MessageDAO();
      // const meetingDAO = new MeetingDAO();
      const personScoreDAO = new PersonScoreDAO();

      // Get all people
      const people = await personDAO.findAll();
      console.log(`[ScoreJob] Computing scores for ${people.length} people...`);

      let scoresComputed = 0;
      const now = new Date();
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

      for (const person of people) {
        try {
          const metrics = await this.computePersonMetrics(person.id, {
            interactionDAO,
            now,
            ninetyDaysAgo
          });

          const relationshipScore = this.calculateRelationshipScore(metrics);
          const interactionFrequency = this.calculateInteractionFrequency(metrics);

          // Create or update person score
          const existingScore = await personScoreDAO.findByPersonId(person.id);
          
          if (existingScore) {
            await personScoreDAO.update(existingScore.id, {
              relationshipScore,
              interactionFrequency,
              lastInteractionDaysAgo: metrics.days_since_last_touch,
              totalInteractions: metrics.emails_90d + metrics.meetings_90d + metrics.notes_90d,
              averageResponseTime: metrics.reply_latency_median || undefined,
              calculatedAt: now,
            });
          } else {
            await personScoreDAO.create({
              personId: person.id,
              relationshipScore,
              interactionFrequency,
              lastInteractionDaysAgo: metrics.days_since_last_touch,
              totalInteractions: metrics.emails_90d + metrics.meetings_90d + metrics.notes_90d,
              averageResponseTime: metrics.reply_latency_median || undefined,
              calculatedAt: now,
            });
          }

          scoresComputed++;
          console.log(`[ScoreJob] Computed score for ${person.firstName} ${person.lastName}: ${relationshipScore}`);
        } catch (error) {
          console.warn(`[ScoreJob] Failed to compute score for person ${person.id}:`, error);
        }
      }

      console.log(`[ScoreJob] Score computation completed. Computed ${scoresComputed} scores.`);
      return { success: true, scoresComputed };
    } catch (error) {
      console.error('[ScoreJob] Score computation failed:', error);
      return {
        success: false,
        scoresComputed: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Compute Person Metrics - Local Data Analysis
   */
  private async computePersonMetrics(
    personId: string,
    daos: {
      interactionDAO: InteractionDAO;
      now: Date;
      ninetyDaysAgo: Date;
    }
  ): Promise<ScoreMetrics> {
    const { interactionDAO, now, ninetyDaysAgo } = daos;

    // Get interactions in the last 90 days
    const interactions = await interactionDAO.getByPerson(personId);
    const recentInteractions = interactions.filter((i: Interaction) => i.date >= ninetyDaysAgo);

    // Count emails in last 90 days
    const emailInteractions = recentInteractions.filter((i: Interaction) => i.type === 'email');
    const emails_90d = emailInteractions.length;

    // Count meetings in last 90 days
    const meetingInteractions = recentInteractions.filter((i: Interaction) => i.type === 'meeting');
    const meetings_90d = meetingInteractions.length;

    // Count notes/calls in last 90 days
    const noteInteractions = recentInteractions.filter((i: Interaction) => 
      i.type === 'message' || i.type === 'call' || i.type === 'social' || i.type === 'other'
    );
    const notes_90d = noteInteractions.length;

    // Calculate days since last touch
    const lastInteraction = interactions
      .sort((a: Interaction, b: Interaction) => b.date.getTime() - a.date.getTime())[0];
    const days_since_last_touch = lastInteraction
      ? Math.floor((now.getTime() - lastInteraction.date.getTime()) / (24 * 60 * 60 * 1000))
      : 999;

    // Calculate reply latency median (simplified - would need message threading in real app)
    const reply_latency_median = this.calculateReplyLatency(emailInteractions);

    // Calculate reciprocity (simplified - ratio of sent vs received)
    const reciprocity = this.calculateReciprocity(recentInteractions);

    // Calculate connectivity with exponential decay
    const connectivity = this.calculateConnectivity(interactions, now);

    return {
      emails_90d,
      meetings_90d,
      notes_90d,
      reply_latency_median,
      days_since_last_touch,
      reciprocity,
      connectivity
    };
  }

  /**
   * Calculate Reply Latency - Simplified Implementation
   */
  private calculateReplyLatency(emailInteractions: Interaction[]): number | null {
    if (emailInteractions.length < 2) return null;
    
    // Simplified: average time between consecutive email interactions
    const latencies: number[] = [];
    for (let i = 1; i < emailInteractions.length; i++) {
      const timeDiff = emailInteractions[i-1].date.getTime() - emailInteractions[i].date.getTime();
      const hours = timeDiff / (1000 * 60 * 60);
      if (hours > 0 && hours < 168) { // Within a week
        latencies.push(hours);
      }
    }
    
    if (latencies.length === 0) return null;
    
    latencies.sort((a, b) => a - b);
    const median = latencies.length % 2 === 0
      ? (latencies[latencies.length / 2 - 1] + latencies[latencies.length / 2]) / 2
      : latencies[Math.floor(latencies.length / 2)];
    
    return median;
  }

  /**
   * Calculate Reciprocity - Interaction Balance
   */
  private calculateReciprocity(interactions: Interaction[]): number {
    if (interactions.length === 0) return 0;
    
    // Simplified: assume 50% reciprocity for now
    // In real implementation, would track who initiated each interaction
    return 0.5;
  }

  /**
   * Calculate Connectivity with Exponential Decay
   */
  private calculateConnectivity(interactions: Interaction[], now: Date): number {
    if (interactions.length === 0) return 0;
    
    let connectivity = 0;
    const decayRate = 0.1; // Decay rate per day
    
    for (const interaction of interactions) {
      const daysAgo = (now.getTime() - interaction.date.getTime()) / (24 * 60 * 60 * 1000);
      const weight = Math.exp(-decayRate * daysAgo);
      
      // Weight different interaction types
      let interactionValue = 1;
      switch (interaction.type) {
        case 'meeting':
          interactionValue = 3;
          break;
        case 'call':
          interactionValue = 2;
          break;
        case 'email':
          interactionValue = 1;
          break;
        case 'message':
          interactionValue = 0.8;
          break;
        case 'social':
          interactionValue = 0.5;
          break;
        default:
          interactionValue = 1;
      }
      
      connectivity += interactionValue * weight;
    }
    
    return Math.min(connectivity, 100); // Cap at 100
  }

  /**
   * Calculate Relationship Score
   */
  private calculateRelationshipScore(metrics: ScoreMetrics): number {
    let score = 0;
    
    // Base score from recent interactions
    score += metrics.emails_90d * 2;
    score += metrics.meetings_90d * 5;
    score += metrics.notes_90d * 3;
    
    // Connectivity bonus
    score += metrics.connectivity * 0.5;
    
    // Recency penalty
    if (metrics.days_since_last_touch > 30) {
      score *= 0.7;
    } else if (metrics.days_since_last_touch > 14) {
      score *= 0.85;
    } else if (metrics.days_since_last_touch > 7) {
      score *= 0.95;
    }
    
    // Reply latency bonus (faster replies = higher score)
    if (metrics.reply_latency_median && metrics.reply_latency_median < 24) {
      score *= 1.1;
    }
    
    // Reciprocity bonus
    score *= (0.5 + metrics.reciprocity);
    
    return Math.min(Math.round(score), 100);
  }

  /**
   * Calculate Interaction Frequency (interactions per month)
   */
  private calculateInteractionFrequency(metrics: ScoreMetrics): number {
    const totalInteractions = metrics.emails_90d + metrics.meetings_90d + metrics.notes_90d;
    return Math.round((totalInteractions / 90) * 30 * 10) / 10; // Per month, rounded to 1 decimal
  }

  /**
   * Check if Score Job is Running
   */
  isScoreJobRunning(): boolean {
    return this.isRunning;
  }
}