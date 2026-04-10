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
  // Settings Events
  SETTINGS: {
    CREATED: 'settings:created',
    UPDATED: 'settings:updated',
    DELETED: 'settings:deleted',
    BULK_DELETED: 'settings:bulk_deleted',
  },
  
  // Stage Events
  STAGE: {
    CREATED: 'stage:created',
    UPDATED: 'stage:updated',
    DELETED: 'stage:deleted',
    STATUS_CREATED: 'stage:status_created',
    STATUS_UPDATED: 'stage:status_updated',
    STATUS_DELETED: 'stage:status_deleted',
  },
  
  // Bank Events (Phase 2)
  BANK: {
    CREATED: 'bank:created',
    UPDATED: 'bank:updated',
    DELETED: 'bank:deleted',
    BULK_DELETED: 'bank:bulk_deleted',
    BULK_STATE_CHANGED: 'bank:bulk_state_changed',
  },
  
  // Project Events (Phase 3)
  PROJECT: {
    CREATED: 'project:created',
    UPDATED: 'project:updated',
    DELETED: 'project:deleted',
    BULK_DELETED: 'project:bulk_deleted',
    AGENT_ADDED: 'project:agent_added',
    AGENT_REMOVED: 'project:agent_removed',
    AGENT_UPDATED: 'project:agent_updated',
  },
  
  // Source Events (Phase 4)
  SOURCE: {
    CREATED: 'source:created',
    UPDATED: 'source:updated',
    DELETED: 'source:deleted',
    BULK_DELETED: 'source:bulk_deleted',
  },

  // Lead Form Events (WordPress form submissions)
  LEAD_FORM: {
    CREATED: 'lead_form:created',
  },
  
  // Column Preference Events (Phase 5)
  COLUMN_PREFERENCE: {
    CREATED: 'column_preference:created',
    UPDATED: 'column_preference:updated',
    DELETED: 'column_preference:deleted',
    DEFAULT_CREATED: 'column_preference:default_created',
    DEFAULT_UPDATED: 'column_preference:default_updated',
    RESET_TO_DEFAULT: 'column_preference:reset_to_default',
  },
};

module.exports = {
  eventEmitter,
  EVENT_TYPES,
};

