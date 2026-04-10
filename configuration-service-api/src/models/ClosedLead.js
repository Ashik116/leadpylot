const mongoose = require('mongoose');

/**
 * ClosedLead Schema
 * Represents a lead that was closed when its project was closed
 * Preserves all lead data for historical reference and potential revert
 */
const ClosedLeadSchema = new mongoose.Schema(
  {
    // Original lead reference
    original_lead_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: false, // Might not exist if lead was deleted
      index: true,
    },

    // Closure metadata
    closed_project_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    closed_at: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    closed_by_user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    closure_reason: {
      type: String,
      default: 'project_closure',
    },

    // Revert tracking
    is_reverted: {
      type: Boolean,
      default: false,
      index: true,
    },
    reverted_at: {
      type: Date,
      default: null,
    },
    reverted_by_user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reverted_lead_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      default: null,
      index: true,
    },
    reverted_to_project_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      default: null,
    },
    revert_reason: {
      type: String,
      default: null,
    },
    
    // Assignment tracking
    closeLeadStatus: {
      type: String,
      enum: ['fresh', 'revert', 'assigned'],
      default: 'fresh',
      lowercase: true,
      index: true,
    },
    assigned_lead_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      default: null,
      index: true,
    },
    assigned_project_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      default: null,
    },
    assigned_agent_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    assigned_at: {
      type: Date,
      default: null,
    },
    assigned_by_user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    assign_reason: {
      type: String,
      default: null,
    },
    lead_price: {
      type: Number,
      default: null,
    },

    // === References to related data (instead of duplicating) ===
    offer_ids: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Offer',
    }],
    document_ids: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
    }],

    // === Original Lead Data (mirrored from Lead model) ===
    id: Number,
    use_status: {
      type: String,
      enum: ['new', 'in_use', 'pending', 'reusable', 'reclamation'],
      default: 'new',
    },
    reclamation_status: {
      type: String,
      enum: ['none', 'pending', 'accepted', 'rejected'],
      default: 'none',
    },
    usable: String,
    duplicate_status: Number,
    checked: {
      type: Boolean,
      default: false,
    },
    lead_source_no: String,
    system_id: String,

    // Contact information
    contact_name: String,
    nametitle: {
      type: String,
      required: false,
      trim: true,
    },
    email_from: {
      type: String,
      trim: true,
      lowercase: true,
    },
    secondary_email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    phone: String,

    // Lead details
    expected_revenue: Number,
    leadPrice: {
      type: Number,
      default: 0,
    },
    lead_date: {
      type: Date,
      default: Date.now,
    },
    assigned_date: Date,
    source_month: Date,
    prev_month: Date,
    current_month: Date,

    // References to other models (preserved from original)
    source_team_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
    },
    source_user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    prev_team_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
    },
    prev_user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    source_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Source',
    },
    transaction_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
    },
    team_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // System fields
    instance_id: Number,
    stage_id: mongoose.Schema.Types.ObjectId,
    status_id: mongoose.Schema.Types.ObjectId,
    stage: String,
    status: String,
    write_date: {
      type: Date,
      default: Date.now,
    },
    active: {
      type: Boolean,
      default: true,
    },

    // Additional fields for enhanced lead management
    notes: String,
    tags: [String],
    custom_fields: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },
    voip_extension: String,

    // Project closure tracking fields (from original lead)
    project_closed_date: {
      type: Date,
      default: null,
    },
    original_closure_reason: {
      type: String,
      default: null,
    },
    original_closed_by_user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    // Status ID passed at closure time (optional override for the lead's target status)
    current_status: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'closedleads', // Keep existing collection name for compatibility
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Pre-save hook to ensure closeLeadStatus is lowercase
ClosedLeadSchema.pre('save', function (next) {
  if (this.closeLeadStatus && typeof this.closeLeadStatus === 'string') {
    this.closeLeadStatus = this.closeLeadStatus.toLowerCase();
  }
  next();
});

// Pre-update hook to ensure closeLeadStatus is lowercase in updates
ClosedLeadSchema.pre(['updateOne', 'findOneAndUpdate', 'updateMany'], function (next) {
  const update = this.getUpdate();
  if (update && update.$set && update.$set.closeLeadStatus && typeof update.$set.closeLeadStatus === 'string') {
    update.$set.closeLeadStatus = update.$set.closeLeadStatus.toLowerCase();
  }
  next();
});

// Create indexes for common queries
ClosedLeadSchema.index({ closed_project_id: 1, is_reverted: 1 });
ClosedLeadSchema.index({ closed_at: -1 });
ClosedLeadSchema.index({ contact_name: 1 });
ClosedLeadSchema.index({ email_from: 1 });
ClosedLeadSchema.index({ closed_by_user_id: 1 });

/**
 * Virtual for activities
 */
ClosedLeadSchema.virtual('activities', {
  ref: 'ClosedActivity',
  localField: '_id',
  foreignField: 'closed_lead_id',
});

/**
 * Virtual for todos
 */
ClosedLeadSchema.virtual('todos', {
  ref: 'ClosedTodo',
  localField: '_id',
  foreignField: 'closed_lead_id',
});

/**
 * Virtual for assignments
 */
ClosedLeadSchema.virtual('assignments', {
  ref: 'ClosedAssignLeads',
  localField: '_id',
  foreignField: 'closed_lead_id',
});

module.exports = mongoose.model('ClosedLead', ClosedLeadSchema);

