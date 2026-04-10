const mongoose = require('mongoose');
const { TRANSACTION_TYPES } = require('./transaction');

// Define constants for activity types
const ACTIVITY_TYPES = {
  LEAD: 'Lead',
  USER: 'User',
  TEAM: 'Team',
  // MEETING: 'Meeting', // DETACHED: Meeting functionality moved to detached-modules/meeting
  OFFER: 'Offer',
  BANK: 'Bank',
  OPENING: 'Opening',
  CONFIRMATION: 'Confirmation',
  PAYMENT_VOUCHER: 'Payment Voucher',
  PROJECT: 'Project',
  RECLAMATION: 'Reclamation',
  SETTINGS: 'Settings',
  MAIL_SERVERS: 'mailservers',
  VOIP_SERVERS: 'voipservers',
  SYSTEM: 'system',
  EMAIL_TEMPLATES: 'email_templates',
  PAYMENT_TERMS: 'payment_terms',
  BONUS_AMOUNT: 'bonus_amount',
  STAGE: 'stage',
  SOURCE: 'Source',
  TRANSACTION: 'Transaction',
  TODO: 'Todo',
  EMAIL: 'Email', // ⭐ Added for email activities
  TASK: 'Task', // ⭐ Added for task activities
};

// Define constants for activity actions
const ACTIVITY_ACTIONS = {
  CREATE: 'create',
  READ: 'read', // View/open (e.g. offer viewed)
  UPDATE: 'update',
  DELETE: 'delete',
  ASSIGN: 'assign',
  TRANSFER: 'transfer',  // ⭐ Added for lead transfers
  BULK_TRANSFER: 'bulk_transfer',  // ⭐ Added for bulk transfers
  STATUS_CHANGE: 'status_change',
  COMMENT: 'comment',
  APPROVE: 'approve',
  REJECT: 'reject',
  RESTORE: 'restore',  // ⭐ Added for restoring deleted items
  PERMANENT_DELETE: 'permanent_delete',  // ⭐ Added for permanent deletion
  PASSWORD_CHANGE: 'password_change',
  LOGIN: 'login',
  LOGOUT: 'logout',
  REGISTRATION: 'registration',
  PASSWORD_RESET: 'password_reset',
  RECEIVED: 'received', // ⭐ Added for incoming emails
  SENT: 'sent', // ⭐ Added for outgoing emails
  FORWARD: 'forward', // ⭐ Added for forwarded emails
  REPLY: 'reply', // ⭐ Added for email replies
  ARCHIVE: 'archive', // ⭐ Added for archiving
  UNARCHIVE: 'unarchive', // ⭐ Added for unarchiving
};

// Define constants for visibility
const VISIBILITY = {
  ADMIN: 'admin',
  SELF: 'self',
  ALL: 'all',
};

const ACTIVITY_TYPE_STATUS = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
};

const activitySchema = new mongoose.Schema(
  {
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      alias: '_creator', // For backward compatibility
    },
    subject_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      alias: '_subject_id', // For backward compatibility
    },
    subject_type: {
      type: String,
      enum: Object.values(ACTIVITY_TYPES),
      required: true,
    },
    action: {
      type: String,
      enum: Object.values(ACTIVITY_ACTIONS),
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: Object.values(ACTIVITY_TYPE_STATUS),
      default: 'info',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      alias: 'details', // For backward compatibility
    },
    // Flag to distinguish Kanban Task related activities from others (todo/ticket/offer/opening/etc.)
    // - true  => activity was created because of a Task action in todo-board-service (or task side-effects)
    // - false => everything else
    is_task: {
      type: Boolean,
      default: false,
      index: true,
    },
    visibility: {
      type: String,
      enum: Object.values(VISIBILITY),
      default: VISIBILITY.SELF,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for common queries
activitySchema.index({ creator: 1, createdAt: -1 });
activitySchema.index({ subject_id: 1, createdAt: -1 });
activitySchema.index({ subject_type: 1, createdAt: -1 });
activitySchema.index({ visibility: 1 });

// Export the model and constants
module.exports = {
  Activity: mongoose.model('Activity', activitySchema),
  ACTIVITY_TYPES,
  ACTIVITY_ACTIONS,
  VISIBILITY,
  ACTIVITY_TYPE_STATUS,
};
