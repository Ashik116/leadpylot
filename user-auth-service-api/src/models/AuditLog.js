/**
 * Audit Log Model
 * Tracks all changes to roles and permissions for compliance and debugging
 */

const mongoose = require('mongoose');

/**
 * Audit action types
 */
const AUDIT_ACTIONS = {
  // Role actions
  ROLE_CREATED: 'role:created',
  ROLE_UPDATED: 'role:updated',
  ROLE_DELETED: 'role:deleted',
  ROLE_CLONED: 'role:cloned',
  ROLE_ACTIVATED: 'role:activated',
  ROLE_DEACTIVATED: 'role:deactivated',

  // Permission actions
  PERMISSION_ADDED: 'permission:added',
  PERMISSION_REMOVED: 'permission:removed',
  PERMISSION_BULK_ADDED: 'permission:bulk_added',
  PERMISSION_BULK_REMOVED: 'permission:bulk_removed',

  // User-role actions
  USER_ROLE_ASSIGNED: 'user:role_assigned',
  USER_ROLE_CHANGED: 'user:role_changed',

  // System actions
  ROLES_SEEDED: 'system:roles_seeded',
  PERMISSIONS_SEEDED: 'system:permissions_seeded',
  CACHE_REFRESHED: 'system:cache_refreshed',
};

const AuditLogSchema = new mongoose.Schema(
  {
    // Action type
    action: {
      type: String,
      required: true,
      enum: Object.values(AUDIT_ACTIONS),
      index: true,
    },

    // Entity type (role, permission, user)
    entityType: {
      type: String,
      required: true,
      enum: ['role', 'permission', 'user', 'system'],
      index: true,
    },

    // Entity ID (role ID, permission key, user ID)
    entityId: {
      type: String,
      required: true,
      index: true,
    },

    // Entity name for display
    entityName: {
      type: String,
    },

    // User who performed the action
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },

    // Performer details snapshot (in case user is deleted)
    performerSnapshot: {
      userId: String,
      login: String,
      role: String,
    },

    // Previous state (for updates)
    previousState: {
      type: mongoose.Schema.Types.Mixed,
    },

    // New state (after change)
    newState: {
      type: mongoose.Schema.Types.Mixed,
    },

    // List of changes made
    changes: [{
      field: String,
      oldValue: mongoose.Schema.Types.Mixed,
      newValue: mongoose.Schema.Types.Mixed,
    }],

    // IP address of the request
    ipAddress: {
      type: String,
    },

    // User agent of the request
    userAgent: {
      type: String,
    },

    // Additional metadata
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },

    // Timestamp (created automatically but also indexed for queries)
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for common queries
AuditLogSchema.index({ entityType: 1, entityId: 1, timestamp: -1 });
AuditLogSchema.index({ performedBy: 1, timestamp: -1 });
AuditLogSchema.index({ action: 1, timestamp: -1 });

/**
 * Static method to create an audit log entry
 */
AuditLogSchema.statics.log = async function ({
  action,
  entityType,
  entityId,
  entityName,
  performedBy,
  performerSnapshot,
  previousState,
  newState,
  changes,
  ipAddress,
  userAgent,
  metadata,
}) {
  return this.create({
    action,
    entityType,
    entityId: entityId?.toString() || entityId,
    entityName,
    performedBy,
    performerSnapshot,
    previousState,
    newState,
    changes,
    ipAddress,
    userAgent,
    metadata,
    timestamp: new Date(),
  });
};

/**
 * Static method to get audit logs for an entity
 */
AuditLogSchema.statics.getForEntity = async function (entityType, entityId, options = {}) {
  const { page = 1, limit = 50 } = options;
  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    this.find({ entityType, entityId: entityId.toString() })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .populate('performedBy', 'login role')
      .lean(),
    this.countDocuments({ entityType, entityId: entityId.toString() }),
  ]);

  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Static method to get recent audit logs
 */
AuditLogSchema.statics.getRecent = async function (options = {}) {
  const { page = 1, limit = 50, action, entityType, performedBy } = options;
  const skip = (page - 1) * limit;

  const query = {};
  if (action) query.action = action;
  if (entityType) query.entityType = entityType;
  if (performedBy) query.performedBy = performedBy;

  const [logs, total] = await Promise.all([
    this.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .populate('performedBy', 'login role')
      .lean(),
    this.countDocuments(query),
  ]);

  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const AuditLog = mongoose.model('AuditLog', AuditLogSchema);

module.exports = {
  AuditLog,
  AUDIT_ACTIONS,
};



