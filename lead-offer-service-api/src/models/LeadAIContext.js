const mongoose = require('mongoose');
const { applyTenantMixin } = require('./mixins/tenantMixin');

/**
 * LeadAIContext - One document per lead (1:1 anchor)
 *
 * Holds the lead snapshot, the current active AI summary, and change-tracking
 * metadata. Growing arrays (offers, emails, summary history) live in their own
 * collections to avoid hitting the MongoDB 16 MB document limit:
 *
 *   LeadAIOfferContext   - one doc per offer   (lead_id FK)
 *   LeadAIEmailContext   - one doc per email    (lead_id FK)
 *   LeadAISummaryHistory - one doc per summary  (lead_id FK)
 */
const LeadAIContextSchema = new mongoose.Schema(
  {
    lead_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: true,
      unique: true,
    },

    // ============================================
    // LEAD SNAPSHOT - Denormalized lead info for AI context
    // ============================================
    lead_snapshot: {
      contact_name: { type: String, trim: true },
      nametitle: { type: String, trim: true },
      email_from: { type: String, trim: true },
      secondary_email: { type: String, trim: true },
      phone: { type: String, trim: true },
      use_status: { type: String, trim: true },
      stage: { type: String, trim: true },
      status: { type: String, trim: true },
      notes: { type: String },
      tags: [String],
      expected_revenue: { type: Number },
      lead_date: { type: Date },
      assigned_date: { type: Date },
      team_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
      user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      source_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Source' },
      snapshot_at: { type: Date, default: Date.now },
    },

    lead_emails: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Email',
    }],

    lead_offers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Offer',
    }],

    lead_ai_summary_history: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LeadAISummaryHistory',
    }],

    lead_activity_history: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Activity',
    }],
    // ============================================
    // AI SUMMARY - Active output, regenerated on every lead/offer/email change
    // ============================================
    last_summary: {
      type: String,
      trim: true,
      default: '',
    },
    last_summary_at: { type: Date },
    last_summary_model: {
      type: String,
      trim: true,
      comment: 'AI model used to generate the summary (e.g. gpt-4, claude)',
    },

    pending_ai_update: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
LeadAIContextSchema.index({ lead_id: 1 }, { unique: true });
LeadAIContextSchema.index({ pending_ai_update: 1 });
LeadAIContextSchema.index({ 'lead_snapshot.user_id': 1 });
LeadAIContextSchema.index({ 'lead_snapshot.team_id': 1 });
LeadAIContextSchema.index({ last_summary_at: -1 });
LeadAIContextSchema.index({ updatedAt: -1 });

applyTenantMixin(LeadAIContextSchema);

LeadAIContextSchema.virtual('summary').get(function () {
  return this.last_summary || '';
});

LeadAIContextSchema.methods.toResponse = function () {
  return {
    _id: this._id,
    lead_id: this.lead_id,
    lead_snapshot: this.lead_snapshot,
    lead_offers: this.lead_offers,
    lead_emails: this.lead_emails,
    lead_ai_summary_history: this.lead_ai_summary_history,
    lead_activity_history: this.lead_activity_history,
    last_summary: this.last_summary,
    last_summary_at: this.last_summary_at,
    last_summary_model: this.last_summary_model,
    pending_ai_update: this.pending_ai_update,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

module.exports = mongoose.model('LeadAIContext', LeadAIContextSchema);
