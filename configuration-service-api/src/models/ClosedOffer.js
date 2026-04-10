const mongoose = require('mongoose');

/**
 * ClosedOffer Schema
 * Represents an offer for closed leads
 * Preserves offer history with progression tracking
 */
const ClosedOfferSchema = new mongoose.Schema(
  {
    // Original offer reference
    original_offer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Offer',
      required: false,
      index: true,
    },

    // Closed lead reference
    closed_lead_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClosedLead',
      required: true,
      index: true,
    },

    // === Original Offer Data (from Offer model) ===
    title: {
      type: String,
      required: true,
      trim: true,
    },
    nametitle: {
      type: String,
      required: false,
      trim: true,
    },
    reference_no: {
      type: String,
      required: false,
      trim: true,
    },
    project_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    lead_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: true,
    },
    agent_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    bank_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bank',
      required: false,
    },
    investment_volume: {
      type: Number,
      required: true,
    },
    interest_rate: {
      type: Number,
      required: true,
    },
    payment_terms: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Settings',
      required: true,
    },
    bonus_amount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Settings',
      required: true,
    },
    bankerRate: {
      type: Number,
      required: false,
      min: 0,
      max: 100,
    },
    agentRate: {
      type: Number,
      required: false,
      min: 0,
      max: 100,
    },
    files: [
      {
        document: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Document',
        },
      },
    ],
    status: {
      type: String,
      enum: ['pending', 'sent'],
      default: 'pending',
    },
    offerType: {
      type: String,
      required: false,
      trim: true,
    },
    flex_option: {
      type: Boolean,
      required: false,
      default: false,
    },
    active: {
      type: Boolean,
      default: true,
    },
    scheduled_date: {
      type: Date,
      required: false,
    },
    scheduled_time: {
      type: String,
      required: false,
    },
    handover_notes: {
      type: String,
      required: false,
      trim: true,
    },
    handover_metadata: {
      original_agent_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      handover_at: {
        type: Date,
      },
      handover_reason: {
        type: String,
      },
    },
    pending_transfer: {
      target_agent_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      transfer_notes: {
        type: String,
      },
      scheduled_date: {
        type: Date,
      },
      scheduled_time: {
        type: String,
      },
      status: {
        type: String,
        enum: ['pending', 'completed', 'cancelled'],
        default: 'pending',
      },
      created_at: {
        type: Date,
        default: Date.now,
      },
    },
    created_at: {
      type: Date,
      default: Date.now,
    },
    updated_at: {
      type: Date,
      default: Date.now,
    },
    
    // ============================================
    // PROGRESSION FIELDS (Consolidated Model)
    // ============================================
    current_stage: {
      type: String,
      enum: ['offer', 'opening', 'confirmation', 'payment', 'netto1', 'netto2', 'lost'],
      default: 'offer',
      index: true 
    },
    progression: {
      opening: {
        active: { type: Boolean, default: false },
        completed_at: { type: Date },
        completed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        files: [{
          document: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' }
        }],
        metadata: { type: mongoose.Schema.Types.Mixed }
      },
      confirmation: {
        active: { type: Boolean, default: false },
        completed_at: { type: Date },
        completed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        files: [{
          document: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' }
        }],
        metadata: { type: mongoose.Schema.Types.Mixed }
      },
      payment: {
        active: { type: Boolean, default: false },
        completed_at: { type: Date },
        completed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        files: [{
          document: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' }
        }],
        amount: { type: Number },
        metadata: { type: mongoose.Schema.Types.Mixed }
      },
      netto1: {
        active: { type: Boolean, default: false },
        completed_at: { type: Date },
        completed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        files: [{
          document: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' }
        }],
        amount: { type: Number },
        bankerRate: { type: Number },
        agentRate: { type: Number },
        metadata: { type: mongoose.Schema.Types.Mixed }
      },
      netto2: {
        active: { type: Boolean, default: false },
        completed_at: { type: Date },
        completed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        files: [{
          document: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' }
        }],
        amount: { type: Number },
        bankerRate: { type: Number },
        agentRate: { type: Number },
        metadata: { type: mongoose.Schema.Types.Mixed }
      },
      lost: {
        active: { type: Boolean, default: false },
        reason: { type: String },
        marked_at: { type: Date },
        marked_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        metadata: { type: mongoose.Schema.Types.Mixed }
      }
    },
    timeline: [{
      action: { type: String, enum: ['create', 'progress', 'revert', 'update'] },
      from_stage: String,
      to_stage: String,
      timestamp: { type: Date, default: Date.now },
      user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      reason: String,
      metadata: { type: mongoose.Schema.Types.Mixed }
    }],
    migration_v1_consolidated: { type: Boolean, default: false }
  },
  {
    timestamps: true,
    collection: 'closedoffers',
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ============================================
// VIRTUALS FOR FRONTEND COMPATIBILITY
// ============================================

ClosedOfferSchema.virtual('has_opening').get(function() {
  return this.progression?.opening?.active || false;
});

ClosedOfferSchema.virtual('has_confirmation').get(function() {
  return this.progression?.confirmation?.active || false;
});

ClosedOfferSchema.virtual('has_payment_voucher').get(function() {
  return this.progression?.payment?.active || false;
});

ClosedOfferSchema.virtual('has_netto1').get(function() {
  return this.progression?.netto1?.active || false;
});

ClosedOfferSchema.virtual('has_netto2').get(function() {
  return this.progression?.netto2?.active || false;
});

ClosedOfferSchema.virtual('has_lost').get(function() {
  return this.progression?.lost?.active || false;
});

// Count virtuals (legacy support)
ClosedOfferSchema.virtual('opening_count').get(function() {
  return this.progression?.opening?.active ? 1 : 0;
});

ClosedOfferSchema.virtual('confirmation_count').get(function() {
  return this.progression?.confirmation?.active ? 1 : 0;
});

ClosedOfferSchema.virtual('payment_voucher_count').get(function() {
  return this.progression?.payment?.active ? 1 : 0;
});

ClosedOfferSchema.virtual('netto1_count').get(function() {
  return this.progression?.netto1?.active ? 1 : 0;
});

ClosedOfferSchema.virtual('netto2_count').get(function() {
  return this.progression?.netto2?.active ? 1 : 0;
});

// Create indexes for common queries
ClosedOfferSchema.index({ closed_lead_id: 1, createdAt: -1 });
ClosedOfferSchema.index({ original_offer_id: 1 });
ClosedOfferSchema.index({ project_id: 1 });
ClosedOfferSchema.index({ lead_id: 1 });
ClosedOfferSchema.index({ agent_id: 1 });
ClosedOfferSchema.index({ current_stage: 1 });
ClosedOfferSchema.index({ status: 1 });
ClosedOfferSchema.index({ active: 1 });

module.exports = mongoose.model('ClosedOffer', ClosedOfferSchema);

