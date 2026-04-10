/**
 * Presence & Collision Types
 * For real-time collaboration awareness
 */

export interface PresenceUser {
  _id: string;
  name: string;
  login: string;
  avatar?: string;
  email?: string;
}

export interface EmailPresence {
  email_id: string;
  viewing: PresenceUser[];
  composing: PresenceUser[];
  updated_at: string;
}

export interface PresenceEvent {
  type: 'view_start' | 'view_end' | 'compose_start' | 'compose_end';
  email_id: string;
  user: PresenceUser;
  timestamp: string;
}

export interface CollisionWarning {
  email_id: string;
  composing_users: PresenceUser[];
  message: string;
  severity: 'info' | 'warning' | 'danger';
}

export interface PresenceState {
  // Email ID -> presence data
  emailPresence: Map<string, EmailPresence>;
  
  // Current user's presence
  currentUserPresence: {
    viewing_email_id: string | null;
    composing_email_id: string | null;
  };
}

