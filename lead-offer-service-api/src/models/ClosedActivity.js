const mongoose = require('mongoose');

// Reuse activity constants from original model
const ACTIVITY_TYPES = {
  LEAD: 'Lead',
  USER: 'User',
  TEAM: 'Team',
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
};

const ACTIVITY_ACTIONS = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  ASSIGN: 'assign',
  STATUS_CHANGE: 'status_change',
  COMMENT: 'comment',
  APPROVE: 'approve',
  REJECT: 'reject',
  PASSWORD_CHANGE: 'password_change',
  LOGIN: 'login',
  LOGOUT: 'logout',
  REGISTRATION: 'registration',
  PASSWORD_RESET: 'password_reset',
};

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

/**
 * ClosedActivity Schema
 * Represents an activity log entry for closed leads
 * Preserves activity history for historical reference
 */
const ClosedActivitySchema = new mongoose.Schema(
  {
    // Original activity reference
    original_activity_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Activity',
      required: false,
      index: true,
    },

    // Closed lead reference
    closed_lead_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClosedLead',
      required: false,
      index: true,
    },

    // === Original Activity Data (mirrored from Activity model) ===
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      alias: '_creator',
    },
    subject_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      alias: '_subject_id',
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
      alias: 'details',
    },
    visibility: {
      type: String,
      enum: Object.values(VISIBILITY),
      default: VISIBILITY.SELF,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Create indexes for common queries
ClosedActivitySchema.index({ closed_lead_id: 1, createdAt: -1 });
ClosedActivitySchema.index({ original_activity_id: 1 });
ClosedActivitySchema.index({ creator: 1, createdAt: -1 });
ClosedActivitySchema.index({ subject_id: 1, createdAt: -1 });

module.exports = mongoose.model('ClosedActivity', ClosedActivitySchema);
