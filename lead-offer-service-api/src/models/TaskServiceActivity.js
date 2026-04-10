const mongoose = require('mongoose');

/**
 * TaskServiceActivity Schema
 * Mirrors the todo-bord-service-api activity model for dual logging
 * Activities are logged to both 'activities' (for todos) and 'taskserviceactivities' (for tasks)
 */

// Activity Types - What entity the activity is about
const TASK_ACTIVITY_TYPES = {
  TASK: 'Task',
  LIST: 'List',
  BOARD: 'Board',
  USER: 'User',
  SYSTEM: 'System',
};

// Activity Actions - What action was performed
const TASK_ACTIVITY_ACTIONS = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  ASSIGN: 'assign',
  UNASSIGN: 'unassign',
  TRANSFER: 'transfer',
  MOVE: 'move',
  STATUS_CHANGE: 'status_change',
  PRIORITY_CHANGE: 'priority_change',
  COMMENT: 'comment',
  ARCHIVE: 'archive',
  RESTORE: 'restore',
  COMPLETE: 'complete',
  INCOMPLETE: 'incomplete',
};

// Visibility levels for activities
const TASK_VISIBILITY = {
  ADMIN: 'admin',
  SELF: 'self',
  ALL: 'all',
};

// Activity type status (info, warning, error)
const TASK_ACTIVITY_TYPE_STATUS = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
};

const taskServiceActivitySchema = new mongoose.Schema(
  {
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    subject_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    subject_type: {
      type: String,
      enum: Object.values(TASK_ACTIVITY_TYPES),
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: Object.values(TASK_ACTIVITY_ACTIONS),
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: Object.values(TASK_ACTIVITY_TYPE_STATUS),
      default: TASK_ACTIVITY_TYPE_STATUS.INFO,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    visibility: {
      type: String,
      enum: Object.values(TASK_VISIBILITY),
      default: TASK_VISIBILITY.ALL,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for common queries
taskServiceActivitySchema.index({ creator: 1, createdAt: -1 });
taskServiceActivitySchema.index({ subject_id: 1, createdAt: -1 });
taskServiceActivitySchema.index({ subject_type: 1, createdAt: -1 });
taskServiceActivitySchema.index({ subject_id: 1, subject_type: 1, createdAt: -1 });
taskServiceActivitySchema.index({ action: 1, createdAt: -1 });

// Export model and constants
module.exports = {
  TaskServiceActivity: mongoose.model('TaskServiceActivity', taskServiceActivitySchema),
  TASK_ACTIVITY_TYPES,
  TASK_ACTIVITY_ACTIONS,
  TASK_VISIBILITY,
  TASK_ACTIVITY_TYPE_STATUS,
};
