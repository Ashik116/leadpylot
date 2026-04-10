const mongoose = require('mongoose');
const { applyTenantMixin } = require('./mixins/tenantMixin');

/**
 * LeadAISummaryHistory - One document per AI summary generation per lead (1:many off LeadAIContext)
 *
 * Extracted from the old unbounded `lastSummaries` embedded array. Each time the AI
 * regenerates a summary the previous one is written here, providing a full audit trail
 * and rollback capability without bloating the parent document.
 *
 * TTL: Documents expire after 365 days to prevent unbounded growth.
 * Override LEAD_AI_SUMMARY_HISTORY_TTL_DAYS via env to adjust retention.
 */
const LeadAISummaryHistorySchema = new mongoose.Schema(
  {
    lead_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: true,
      index: true,
    },

    summary: { type: String, required: true },
    model: { type: String, trim: true },
    trigger: {
      type: String,
      enum: ['lead_update', 'offer_update', 'email_update', 'activity_update', 'manual', 'initial'],
      required: true,
    },

    // Explicit timestamp rather than relying on createdAt so it can be set by the caller
    generated_at: { type: Date, default: Date.now, required: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Audit queries: all summaries for a lead, newest first
LeadAISummaryHistorySchema.index({ lead_id: 1, generated_at: -1 });

// TTL index — documents are removed 365 days after generated_at
// Change retention by setting LEAD_AI_SUMMARY_HISTORY_TTL_DAYS in env (applied at startup)
const TTL_SECONDS = parseInt(process.env.LEAD_AI_SUMMARY_HISTORY_TTL_DAYS || '365', 10) * 86400;
LeadAISummaryHistorySchema.index({ generated_at: 1 }, { expireAfterSeconds: TTL_SECONDS });

applyTenantMixin(LeadAISummaryHistorySchema);

LeadAISummaryHistorySchema.methods.toResponse = function () {
  return {
    _id: this._id,
    lead_id: this.lead_id,
    summary: this.summary,
    model: this.model,
    trigger: this.trigger,
    generated_at: this.generated_at,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('LeadAISummaryHistory', LeadAISummaryHistorySchema);
