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
  USER: {
    CREATED: 'user:created',
    UPDATED: 'user:updated',
    DELETED: 'user:deleted',
    BULK_DELETED: 'user:bulk_deleted',
  },
  OFFICE: {
    CREATED: 'office:created',
    MEMBER_ASSIGNED: 'office:member_assigned',
  },
};

module.exports = {
  eventEmitter,
  EVENT_TYPES,
};

