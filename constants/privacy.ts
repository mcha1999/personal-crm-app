/**
 * Privacy Configuration - Device-Only Architecture
 * 
 * This configuration enforces strict privacy compliance across the app
 */

export const PRIVACY_CONFIG = {
  // Core Privacy Principles
  architecture: 'device-only' as const,
  dataTransmission: 'none' as const,
  externalServices: 'none' as const,
  
  // Data Storage
  storage: {
    location: 'device-local',
    encryption: 'platform-secure',
    backup: 'none',
    sync: 'none'
  },
  
  // Google API Integration (Optional)
  googleAPI: {
    enabled: false, // User must explicitly enable
    scopes: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/contacts.readonly', 
      'https://www.googleapis.com/auth/calendar.readonly'
    ],
    tokenStorage: 'device-secure-store',
    dataProcessing: 'local-only',
    transmission: 'none'
  },
  
  // Analytics & Tracking
  analytics: {
    enabled: false,
    crashReporting: false,
    usageTracking: false,
    personalDataCollection: false
  },
  
  // Third-Party Services
  thirdParty: {
    ai: 'none',
    cloud: 'none',
    analytics: 'none',
    advertising: 'none'
  },
  
  // Compliance Information
  compliance: {
    gdpr: true,
    ccpa: true,
    coppa: true,
    privacyByDesign: true
  }
} as const;

export const PRIVACY_SCOPES = {
  gmail: {
    scope: 'https://www.googleapis.com/auth/gmail.readonly',
    purpose: 'Read email metadata to detect interactions with contacts',
    dataAccess: 'Email headers and metadata only',
    processing: 'Local analysis on device',
    storage: 'Interaction data stored locally in SQLite',
    transmission: 'No email content transmitted externally'
  },
  contacts: {
    scope: 'https://www.googleapis.com/auth/contacts.readonly',
    purpose: 'Import contact information for local CRM',
    dataAccess: 'Contact names, emails, phone numbers',
    processing: 'Local import and storage',
    storage: 'Contact data stored locally in SQLite',
    transmission: 'No contact data transmitted externally'
  },
  calendar: {
    scope: 'https://www.googleapis.com/auth/calendar.readonly',
    purpose: 'Detect meetings and events with contacts',
    dataAccess: 'Calendar event metadata and attendees',
    processing: 'Local analysis for interaction tracking',
    storage: 'Meeting data stored locally in SQLite',
    transmission: 'No calendar data transmitted externally'
  }
} as const;

export const PRIVACY_GUARANTEES = [
  'All personal data stays on your device',
  'No cloud storage or synchronization',
  'No external AI or machine learning services',
  'No analytics or usage tracking',
  'No advertising or tracking networks',
  'Direct Google API calls only (when enabled)',
  'OAuth tokens stored in device secure storage',
  'Complete data export available anytime',
  'Uninstalling removes all data permanently'
] as const;