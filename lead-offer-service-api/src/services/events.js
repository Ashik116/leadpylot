/**
 * Events Module
 * Provides a centralized event system for the application
 */

const EventEmitter = require('events');

// Create a singleton event emitter
const eventEmitter = new EventEmitter();

// Increase the maximum number of listeners to prevent memory leak warnings
eventEmitter.setMaxListeners(20);

// Define standard event types
const EVENT_TYPES = {
  AUTH: {
    LOGIN: 'auth:login',
    LOGOUT: 'auth:logout',
    REGISTRATION: 'auth:registration',
    PASSWORD_CHANGED: 'auth:password_changed',
    PASSWORD_RESET: 'auth:password_reset',
  },
  LEAD: {
    CREATED: 'lead:created',
    UPDATED: 'lead:updated',
    DELETED: 'lead:deleted',
    ASSIGNED: 'lead:assigned',
    TRANSFERRED: 'lead:transferred',
    BULK_TRANSFERRED: 'lead:bulk_transferred',
    STATUS_CHANGED: 'lead:status_changed',
    RESTORED: 'lead:restored',
    PERMANENTLY_DELETED: 'lead:permanently_deleted',
  },
  OFFER: {
    CREATED: 'offer:created',
    UPDATED: 'offer:updated',
    DELETED: 'offer:deleted',
    RESTORED: 'offer:restored',
    NETTO1_SENT: 'offer:netto1_sent',
    NETTO2_SENT: 'offer:netto2_sent',
    NETTO1_REVERTED: 'offer:netto1_reverted',
    NETTO2_REVERTED: 'offer:netto2_reverted',
    LOST: 'offer:lost',
    LOST_REVERTED: 'offer:lost_reverted',
    PAYMENT_REVERTED: 'offer:payment_reverted',
    CONFIRMATION_REVERTED: 'offer:confirmation_reverted',
    OPENING_REVERTED: 'offer:opening_reverted',
    BULK_DELETED: 'offer:bulk_deleted',
  },
  APPOINTMENT: {
    CREATED: 'appointment:created',
    UPDATED: 'appointment:updated',
    DELETED: 'appointment:deleted',
  },
  // MEETING: { // DETACHED: Meeting functionality moved to detached-modules/meeting
  //   CREATED: 'meeting:created',
  //   UPDATED: 'meeting:updated',
  //   DELETED: 'meeting:deleted',
  // },
  USER: {
    CREATED: 'user:created',
    UPDATED: 'user:updated',
    DELETED: 'user:deleted',
  },
  TEAM: {
    CREATED: 'team:created',
    UPDATED: 'team:updated',
    DELETED: 'team:deleted',
    MEMBER_ADDED: 'team:member_added',
    MEMBER_REMOVED: 'team:member_removed',
  },
  BANK: {
    CREATED: 'bank:created',
    UPDATED: 'bank:updated',
    DELETED: 'bank:deleted',
  },
  OPENING: {
    CREATED: 'opening:created',
    UPDATED: 'opening:updated',
    DELETED: 'opening:deleted',
    BULK_DELETED: 'opening:bulk_deleted',
  },
  CONFIRMATION: {
    CREATED: 'confirmation:created',
    UPDATED: 'confirmation:updated',
    DELETED: 'confirmation:deleted',
    RESTORED: 'confirmation:restored',
    BULK_DELETED: 'confirmation:bulk_deleted',
  },
  PAYMENT_VOUCHER: {
    CREATED: 'payment_voucher:created',
    UPDATED: 'payment_voucher:updated',
    DELETED: 'payment_voucher:deleted',
    RESTORED: 'payment_voucher:restored',
  },
  SETTINGS: {
    CREATED: 'settings:created',
    UPDATED: 'settings:updated',
    DELETED: 'settings:deleted',
    BULK_DELETED: 'settings:bulk_deleted',
  },
  STAGE: {
    CREATED: 'stage:created',
    UPDATED: 'stage:updated',
    DELETED: 'stage:deleted',
    STATUS_CREATED: 'stage:status_created',
    STATUS_UPDATED: 'stage:status_updated',
    STATUS_DELETED: 'stage:status_deleted',
  },
  PROJECT: {
    CREATED: 'project:created',
    UPDATED: 'project:updated',
    DELETED: 'project:deleted',
    BULK_DELETED: 'project:bulk_deleted',
    CLOSED: 'project:closed',
    AGENT_ADDED: 'project:agent_added',
    AGENT_REMOVED: 'project:agent_removed',
    AGENT_UPDATED: 'project:agent_updated',
  },
  RECLAMATION: {
    CREATED: 'reclamation:created',
    UPDATED: 'reclamation:updated',
    APPROVED: 'reclamation:approved',
    REJECTED: 'reclamation:rejected',
  },
  TRANSACTION: {
    CREATED: 'transaction:created',
    UPDATED: 'transaction:updated',
    DELETED: 'transaction:deleted',
  },
  EMAIL: {
    CREATED: 'email:created',
    UPDATED: 'email:updated',
    DELETED: 'email:deleted',
    RECEIVED: 'email:received',
  },
  EMAIL_SYSTEM: {
    RECEIVED: 'email_system:received',
    SENT: 'email_system:sent',
    EMAIL_APPROVED: 'email_system:email_approved',
    EMAIL_REJECTED: 'email_system:email_rejected',
    ATTACHMENT_APPROVED: 'email_system:attachment_approved',
    LEAD_ASSIGNED: 'email_system:lead_assigned',
    AGENT_ASSIGNED: 'email_system:agent_assigned',
    VIEWED_BY_AGENT: 'email_system:viewed_by_agent',
  },
  SOURCE: {
    CREATED: 'source:created',
    UPDATED: 'source:updated',
    DELETED: 'source:deleted',
  },
  TODO: {
    CREATED: 'todo:created',
    UPDATED: 'todo:updated',
    DELETED: 'todo:deleted',
    ASSIGNED: 'todo:assigned',
    UNASSIGNED: 'todo:unassigned',
    REASSIGNED: 'todo:reassigned',
    COMPLETED: 'todo:completed',
  },
  CALL: {
    INITIATED: 'call:initiated',
    RINGING: 'call:ringing',
    CONNECTED: 'call:connected',
    ENDED: 'call:ended',
    DIAL_END: 'call:dial_end',
  },
  AGENT: {
    STATUS_CHANGED: 'agent:status_changed',
    EXTENSION_UPDATED: 'agent:extension_updated',
  },
  SOCKET: {
    EMIT: 'socket:emit',
    BROADCAST: 'socket:broadcast',
  },
  // General event types for call monitoring
  CALL_STATUS_CHANGED: 'call_status_changed',
  SOCKET_EMIT: 'socket_emit',
};

module.exports = {
  eventEmitter,
  EVENT_TYPES,
};
