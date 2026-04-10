const mongoose = require('mongoose');
const { applyTenantMixin } = require('./mixins/tenantMixin');

const LeadSchema = new mongoose.Schema(
  {
    id: Number,
    partner_id: String,
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
    reclamation_reason: String,
    usable: String,
    duplicate_status: Number,
    checked: {
      type: Boolean,
      default: false,
    },
    lead_source_no: String,
    system_id: String,

    // Import source: excel_import takes priority over form_import
    import_source: {
      type: String,
      enum: ['excel_import', 'form_import'],
      default: 'excel_import',
    },

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
      match: [/^\S+@\S+\.\S+$/, 'Please fill a valid email address'],
    },
    secondary_email: {
      type: String,
      trim: true,
      lowercase: true,
      required: false,
      match: [/^\S+@\S+\.\S+$/, 'Please fill a valid email address'],
    },
    phone: String,

    // Lead details
    expected_revenue: Number,
    leadPrice: {
      type: Number,
      default: 0,
    },
    offer_calls: {
      type: Number,
      default: 0,
    },
    lead_date: {
      type: Date,
      required: false,
    },
    assigned_date: Date,
    source_month: Date,
    prev_month: Date,
    current_month: Date,

    // References to other models
    // Snapshot of the very first assignment (denormalized for fast reads)
    source_project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      default: null,
    },
    source_agent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    prev_team_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
    },
    prev_user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    source_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Source',
      // Reference to the Source model
    },
    transaction_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
      // Reference to the Transaction model
    },
    team_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // System fields
    instance_id: Number,
    stage_id: mongoose.Schema.Types.ObjectId,
    status_id: mongoose.Schema.Types.ObjectId, // Changed from String to ObjectId
    stage: String,
    status: String,
    prev_stage_id: mongoose.Schema.Types.ObjectId,
    prev_status_id: mongoose.Schema.Types.ObjectId,
    prev_stage: String,
    prev_status: String,
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
    voip_extension: {
      type: String,
      unique: true,
      sparse: true, // Allows null values to not trigger uniqueness constraint
    },

    // Project closure tracking fields
    project_closed_date: {
      type: Date,
      default: null,
    },
    closure_reason: {
      type: String,
      default: null,
    },
    closed_by_user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    /**
     * Temporary access agents
     * List of agent User IDs that currently have temporary, read-only access
     * to this lead (e.g. granted via todo ticket assignment).
     */
    temporary_access_agents: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
      default: [],
    },

    // ============================================
    // LAST EMAIL - Lead Level Document Storage
    // Stores the most recent email communication with the lead
    // ============================================
    last_email: {
      documents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }],
      emails: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Email' }],
      updated_at: { type: Date },
      updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      comment: { type: String, default: 'Most recent email communication with lead' }
    },
  },
  {
    timestamps: true,
    // Add virtuals to JSON output
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Create indexes for common queries
LeadSchema.index({ use_status: 1 });
LeadSchema.index({ active: 1 });
LeadSchema.index({ email_from: 1 });
LeadSchema.index({ secondary_email: 1 });
LeadSchema.index({ lead_date: 1 });
LeadSchema.index({ team_id: 1, active: 1 });
LeadSchema.index({ source_agent: 1 });
LeadSchema.index({ source_project: 1 });

// Create indexes for sorting performance
LeadSchema.index({ contact_name: 1 });
LeadSchema.index({ lead_source_no: 1 });
LeadSchema.index({ import_source: 1 });
LeadSchema.index({ expected_revenue: 1 });
LeadSchema.index({ phone: 1 });

// Optional index to quickly find leads by temporary access agents
LeadSchema.index({ temporary_access_agents: 1 });

// Compound indexes for common filter + sort combinations
LeadSchema.index({ active: 1, contact_name: 1 });
LeadSchema.index({ active: 1, lead_source_no: 1 });
LeadSchema.index({ active: 1, expected_revenue: 1 });
LeadSchema.index({ active: 1, createdAt: -1 });

/**
 * Virtual for assignments - allows for populating lead assignments directly
 */
LeadSchema.virtual('assignments', {
  ref: 'AssignLeads',
  localField: '_id',
  foreignField: 'lead_id',
});

/**
 * Create a formatted response object for API
 */
LeadSchema.methods.toResponse = function () {
  return {
    _id: this._id,
    id: this.id || this._id,
    contact_name: this.contact_name,
    nametitle: this.nametitle,
    email_from: this.email_from,
    secondary_email: this.secondary_email,
    phone: this.phone,
    status: this.use_status,
    lead_date: this.lead_date,
    active: this.active,
    expected_revenue: this.expected_revenue,
    notes: this.notes,
    tags: this.tags,
    last_email: this.last_email,
    // Don't include assignments here as they will be populated separately
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

// Apply tenant mixin for multi-tenant isolation
applyTenantMixin(LeadSchema);

module.exports = mongoose.model('Lead', LeadSchema);
