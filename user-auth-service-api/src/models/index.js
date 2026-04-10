/**
 * Models Index
 * Exports all models for the User Auth service
 */

const User = require('./User'); // Required for Source.provider_id population
const { LoginAttempt, ATTEMPT_TYPES, ATTEMPT_RESULTS } = require('./loginAttempt');
const { UserSession, SESSION_STATUS } = require('./UserSession');
const { IpBlocklist, BLOCK_REASONS, BLOCK_TYPES } = require('./ipBlocklist');
const { DeviceBlocklist, DEVICE_BLOCK_TYPES, DEVICE_BLOCK_REASONS } = require('./deviceBlocklist');
const Todo = require('./todo'); // For pending todos count in getCurrentUser

// RBAC Models
const Role = require('./Role');
const { Permission, PERMISSION_GROUPS, PERMISSION_ACTIONS } = require('./Permission');
const { AuditLog, AUDIT_ACTIONS } = require('./AuditLog');
const Office = require('./Office.model');

module.exports = {
  User, // Export User model for reference population
  Office,
  Todo, // Export Todo model for todos count
  LoginAttempt,
  UserSession,
  IpBlocklist,
  DeviceBlocklist,
  DEVICE_BLOCK_TYPES,
  DEVICE_BLOCK_REASONS,
  ATTEMPT_TYPES,
  ATTEMPT_RESULTS,
  SESSION_STATUS,
  BLOCK_REASONS,
  BLOCK_TYPES,
  // RBAC exports
  Role,
  Permission,
  AuditLog,
  PERMISSION_GROUPS,
  PERMISSION_ACTIONS,
  AUDIT_ACTIONS,
};


