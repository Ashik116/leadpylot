const mongoose = require('mongoose');

const OfferSchema = new mongoose.Schema(
  {
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
      ref: 'Team',
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
      required: false, // Allow legacy offers without this field
      comment: 'The user who created this offer (may be different from agent_id)',
    },
    bank_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bank',
      required: false, // Making it optional for existing offers
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
      comment: 'Banker rate percentage for Netto calculations',
    },
    agentRate: {
      type: Number,
      required: false,
      min: 0,
      max: 100,
      comment: 'Agent rate percentage for Netto calculations',
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
    load_and_opening: {
      type: String,
      required: false,
      trim: true,
      default: 'opening',
      comment: 'Load and opening field for offer data',
    },
    flex_option: {
      type: Boolean,
      required: false,
      default: false,
      comment: 'Indicates if this offer has flexible options based on document uploads',
    },
    active: {
      type: Boolean,
      default: true,
      comment: 'Soft deletion flag - false means offer is deleted/lost',
    },
    out: {
      type: Boolean,
      default: false,
      comment: 'Flag to mark offers as out',
    },
    // ============================================
    // CASHFLOW TRACKING
    // ============================================
    in_cashflow: {
      type: Boolean,
      default: false,
      index: true,
      comment: 'Flag to track if this offer has been sent to cashflow',
    },
    cashflow_entry_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CashflowEntry',
      comment: 'Reference to the cashflow entry for this offer',
    },
    cashflow_sent_at: {
      type: Date,
      comment: 'Timestamp when offer was sent to cashflow',
    },
    scheduled_date: {
      type: Date,
      required: false,
      comment: 'Scheduled follow-up date (defaults to 48 hours from creation if not provided)',
    },
    scheduled_time: {
      type: String,
      required: false,
      comment: 'Scheduled follow-up time in HH:MM format (defaults to 48 hours from creation)',
    },
    handover_notes: {
      type: String,
      required: false,
      trim: true,
      comment: 'Notes provided during offer creation (for handover or general notes)',
    },
    handover_metadata: {
      original_agent_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        comment: 'Original agent who created this offer (if different from agent_id)',
      },
      handover_at: {
        type: Date,
        comment: 'Timestamp when handover occurred',
      },
      handover_reason: {
        type: String,
        comment: 'Reason for handover',
      },
    },
    pending_transfer: {
      target_agent_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        comment: 'Agent to transfer lead to after PDF approval/rejection',
      },
      transfer_notes: {
        type: String,
        comment: 'Notes for the pending transfer',
      },
      scheduled_date: {
        type: Date,
        comment: 'Scheduled date for the transfer',
      },
      scheduled_time: {
        type: String,
        comment: 'Scheduled time for the transfer',
      },
      status: {
        type: String,
        enum: ['pending', 'completed', 'cancelled'],
        default: 'pending',
        comment: 'Status of the pending transfer',
      },
      created_at: {
        type: Date,
        default: Date.now,
        comment: 'When the pending transfer was created',
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
    // NEW PROGRESSION FIELDS (Consolidated Model)
    // ============================================
    current_stage: {
      type: String,
      enum: ['offer', 'call_1', 'call_2', 'call_3', 'call_4', 'opening', 'confirmation', 'payment', 'netto1', 'netto2', 'lost', 'out'],
      default: 'offer',
      index: true 
    },
    progression: {
      opening: {
        active: { type: Boolean, default: false },
        completed_at: { type: Date, default: null },
        completed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        createdAt: { type: Date, default: null, comment: 'Timestamp when this stage was entered' },
        updatedAt: { type: Date, default: null, comment: 'Timestamp when this stage was last updated' },
        files: [{
          document: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' }
        }],
        metadata: { type: mongoose.Schema.Types.Mixed }
      },
      confirmation: {
        active: { type: Boolean, default: false },
        completed_at: { type: Date, default: null },
        completed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        createdAt: { type: Date, default: null, comment: 'Timestamp when this stage was entered' },
        updatedAt: { type: Date, default: null, comment: 'Timestamp when this stage was last updated' },
        files: [{
          document: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' }
        }],
        metadata: { type: mongoose.Schema.Types.Mixed }
      },
      payment: {
        active: { type: Boolean, default: false },
        completed_at: { type: Date, default: null },
        completed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        createdAt: { type: Date, default: null, comment: 'Timestamp when this stage was entered' },
        updatedAt: { type: Date, default: null, comment: 'Timestamp when this stage was last updated' },
        files: [{
          document: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' }
        }],
        amount: { type: Number },
        metadata: { type: mongoose.Schema.Types.Mixed }
      },
      netto1: {
        active: { type: Boolean, default: false },
        completed_at: { type: Date, default: null },
        completed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        createdAt: { type: Date, default: null, comment: 'Timestamp when this stage was entered' },
        updatedAt: { type: Date, default: null, comment: 'Timestamp when this stage was last updated' },
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
        completed_at: { type: Date, default: null },
        completed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        createdAt: { type: Date, default: null, comment: 'Timestamp when this stage was entered' },
        updatedAt: { type: Date, default: null, comment: 'Timestamp when this stage was last updated' },
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
        marked_at: { type: Date, default: null },
        marked_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        createdAt: { type: Date, default: null, comment: 'Timestamp when this stage was entered' },
        updatedAt: { type: Date, default: null, comment: 'Timestamp when this stage was last updated' },
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
    migration_v1_consolidated: { type: Boolean, default: false },

    // ============================================
    // DOCUMENT SLOTS - Organized Document Storage
    // Each slot can store multiple documents and emails
    // ============================================
    document_slots: {
      // OFFER STAGE - Offer email communication
      offer_email: {
        documents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }],
        emails: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Email' }],
        updated_at: { type: Date },
        updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        comment: { type: String, default: 'Offer email communication with customer' }
      },
      // OFFER STAGE - Offer contract document
      offer_contract: {
        documents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }],
        emails: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Email' }],
        updated_at: { type: Date },
        updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        comment: { type: String, default: 'Offer contract document' }
      },
      // OPENING STAGE - Incoming from Customer
      contract: {
        documents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }],
        emails: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Email' }],
        updated_at: { type: Date },
        updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        comment: { type: String, default: 'Customer sends signed contract via mail' }
      },
      id_files: {
        documents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }],
        emails: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Email' }],
        updated_at: { type: Date },
        updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        comment: { type: String, default: 'Customer sends ID documents with contract' }
      },
      // OPENING STAGE - Outgoing to Customer
      contract_received_mail: {
        documents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }],
        emails: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Email' }],
        updated_at: { type: Date },
        updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        comment: { type: String, default: 'We confirm receipt of contract and ID' }
      },
      // OPENING STAGE - Opening contract email to client
      opening_contract_client_email: {
        documents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }],
        emails: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Email' }],
        updated_at: { type: Date },
        updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        comment: { type: String, default: 'Opening contract email sent to client' }
      },
      // CONFIRMATION STAGE - Outgoing to Customer
      bank_confirmation: {
        documents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }],
        emails: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Email' }],
        updated_at: { type: Date },
        updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        comment: { type: String, default: 'We confirm account opened with depot login' }
      },
      annahme: {
        documents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }],
        emails: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Email' }],
        updated_at: { type: Date },
        updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        comment: { type: String, default: 'We send bank details to customer' }
      },
      // CONFIRMATION STAGE - Confirmation email
      confirmation_email: {
        documents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }],
        emails: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Email' }],
        updated_at: { type: Date },
        updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        comment: { type: String, default: 'Confirmation email to customer' }
      },
      // PAYMENT STAGE - Incoming from Customer
      swift: {
        documents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }],
        emails: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Email' }],
        updated_at: { type: Date },
        updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        comment: { type: String, default: 'Customer sends payment voucher via mail' }
      },
      // PAYMENT STAGE - Outgoing to Customer
      swift_confirm_mail: {
        documents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }],
        emails: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Email' }],
        updated_at: { type: Date },
        updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        comment: { type: String, default: 'We confirm receipt of payment voucher' }
      },
      // POST-PAYMENT - Outgoing to Customer
      depot_update_mail: {
        documents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }],
        emails: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Email' }],
        updated_at: { type: Date },
        updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        comment: { type: String, default: 'We confirm amount updated in account' }
      },
      depot_login: {
        documents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }],
        emails: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Email' }],
        updated_at: { type: Date },
        updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        comment: { type: String, default: 'Depot login credentials' }
      },
      load_mail: {
        documents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }],
        emails: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Email' }],
        updated_at: { type: Date },
        updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        comment: { type: String, default: 'Follow-up mail with new offers (1-2 weeks later)' }
      },
    },

    // ============================================
    // FINANCIAL & COMMISSION TRACKING
    // ============================================
    financials: {
      // Investment details
      investment_total: {
        type: Number,
        default: 0,
        comment: 'Total investment amount (can differ from investment_volume)',
      },
      bonus_value: {
        type: Number,
        default: 0,
        comment: 'Actual bonus amount in currency (resolved from bonus_amount Settings)',
      },
      expected_from_customer: {
        type: Number,
        default: 0,
        comment: 'investment_total - bonus_value',
      },

      // Customer payments
      customer_payments: [{
        amount: { type: Number, required: true, min: 0 },
        payment_date: { type: Date, default: Date.now },
        payment_method: {
          type: String,
          enum: ['bank_transfer', 'cash', 'check', 'other'],
          default: 'bank_transfer',
        },
        reference: { type: String, trim: true },
        notes: { type: String, trim: true },
        recorded_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        created_at: { type: Date, default: Date.now },
      }],

      // Payment summary (calculated)
      payment_summary: {
        total_received: { type: Number, default: 0 },
        balance_due: { type: Number, default: 0 },
        overpayment: { type: Number, default: 0 },
        payment_status: {
          type: String,
          enum: ['pending', 'partial', 'complete', 'overpaid'],
          default: 'pending',
        },
        last_payment_date: { type: Date },
      },

      // Bank commission
      bank_commission: {
        percentage: { type: Number, default: 0, min: 0, max: 100 },
        is_overridden: { type: Boolean, default: false },
        original_percentage: { type: Number },
        expected_amount: { type: Number, default: 0 },
        actual_amount: { type: Number, default: 0 },
      },

      // Primary agent commission
      primary_agent_commission: {
        percentage: { type: Number, default: 0, min: 0, max: 100 },
        is_overridden: { type: Boolean, default: false },
        original_percentage: { type: Number },
        expected_amount: { type: Number, default: 0 },
        actual_amount: { type: Number, default: 0 },
        paid_amount: { type: Number, default: 0 },
        payment_status: {
          type: String,
          enum: ['pending', 'partial', 'paid'],
          default: 'pending',
        },
      },

      // Split agents (additional agents sharing commission)
      has_split: { type: Boolean, default: false },
      split_agents: [{
        agent_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        percentage: { type: Number, required: true, min: 0, max: 100 },
        is_overridden: { type: Boolean, default: false },
        original_percentage: { type: Number },
        expected_amount: { type: Number, default: 0 },
        actual_amount: { type: Number, default: 0 },
        paid_amount: { type: Number, default: 0 },
        payment_status: {
          type: String,
          enum: ['pending', 'partial', 'paid'],
          default: 'pending',
        },
        reason: { type: String, trim: true },
        added_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        added_at: { type: Date, default: Date.now },
      }],

      // Inbound agents (referral commission)
      has_inbound: { type: Boolean, default: false },
      inbound_agents: [{
        agent_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        percentage: { type: Number, required: true, min: 0, max: 100 },
        is_overridden: { type: Boolean, default: false },
        original_percentage: { type: Number },
        expected_amount: { type: Number, default: 0 },
        actual_amount: { type: Number, default: 0 },
        paid_amount: { type: Number, default: 0 },
        payment_status: {
          type: String,
          enum: ['pending', 'partial', 'paid'],
          default: 'pending',
        },
        reason: { type: String, trim: true },
        added_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        added_at: { type: Date, default: Date.now },
      }],

      // Net amounts (calculated)
      net_amounts: {
        total_expected_commissions: { type: Number, default: 0 },
        total_actual_commissions: { type: Number, default: 0 },
        expected_company_revenue: { type: Number, default: 0 },
        actual_company_revenue: { type: Number, default: 0 },
      },

      // Validation
      validation: {
        total_percentage: { type: Number, default: 0 },
        is_valid: { type: Boolean, default: true },
        validation_message: { type: String },
      },

      // Tracking
      last_calculated_at: { type: Date },
      financials_initialized: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
    // Add virtuals to JSON output
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ============================================
// VIRTUALS FOR FRONTEND COMPATIBILITY
// Maps new nested structure to flat fields expected by frontend
// ============================================

OfferSchema.virtual('has_opening').get(function() {
  return this.progression?.opening?.active || false;
});

OfferSchema.virtual('has_confirmation').get(function() {
  return this.progression?.confirmation?.active || false;
});

OfferSchema.virtual('has_payment_voucher').get(function() {
  return this.progression?.payment?.active || false;
});

OfferSchema.virtual('has_netto1').get(function() {
  return this.progression?.netto1?.active || false;
});

OfferSchema.virtual('has_netto2').get(function() {
  return this.progression?.netto2?.active || false;
});

OfferSchema.virtual('has_lost').get(function() {
  return this.progression?.lost?.active || false;
});

// Count virtuals (legacy support)
OfferSchema.virtual('opening_count').get(function() {
  return this.progression?.opening?.active ? 1 : 0;
});

OfferSchema.virtual('confirmation_count').get(function() {
  return this.progression?.confirmation?.active ? 1 : 0;
});

OfferSchema.virtual('payment_voucher_count').get(function() {
  return this.progression?.payment?.active ? 1 : 0;
});

OfferSchema.virtual('netto1_count').get(function() {
  return this.progression?.netto1?.active ? 1 : 0;
});

OfferSchema.virtual('netto2_count').get(function() {
  return this.progression?.netto2?.active ? 1 : 0;
});

// Financial virtuals
OfferSchema.virtual('financials_enabled').get(function() {
  return this.financials?.financials_initialized || false;
});

OfferSchema.virtual('is_fully_paid').get(function() {
  const status = this.financials?.payment_summary?.payment_status;
  return status === 'complete' || status === 'overpaid';
});

OfferSchema.virtual('total_commission_agents').get(function() {
  let count = 1; // Primary agent
  if (this.financials?.split_agents) count += this.financials.split_agents.length;
  if (this.financials?.inbound_agents) count += this.financials.inbound_agents.length;
  return count;
});

// ============================================
// EXISTING INDEXES (already in production)
// ============================================

// Create indexes for common queries
OfferSchema.index({ project_id: 1 });
OfferSchema.index({ lead_id: 1 });
OfferSchema.index({ agent_id: 1 });
OfferSchema.index({ status: 1 });

// Create indexes for sorting performance
OfferSchema.index({ title: 1 });
OfferSchema.index({ reference_no: 1 });
OfferSchema.index({ investment_volume: 1 });
OfferSchema.index({ interest_rate: 1 });
OfferSchema.index({ createdAt: -1 });
OfferSchema.index({ updatedAt: -1 });

// Compound indexes for common filter + sort combinations
OfferSchema.index({ status: 1, title: 1 });
OfferSchema.index({ status: 1, investment_volume: 1 });
OfferSchema.index({ status: 1, interest_rate: 1 });
OfferSchema.index({ status: 1, createdAt: -1 });
OfferSchema.index({ project_id: 1, createdAt: -1 });
OfferSchema.index({ agent_id: 1, createdAt: -1 });

// Indexes for new handover and scheduling features
OfferSchema.index({ created_by: 1, createdAt: -1 }); // For creator performance queries
OfferSchema.index({ 'handover_metadata.original_agent_id': 1 }); // For handover tracking
OfferSchema.index({ scheduled_date: 1 }); // For scheduling queries
OfferSchema.index({ lead_id: 1, agent_id: 1 }); // For lead-agent queries

// ============================================
// NEW INDEXES FOR DYNAMIC FILTERING SYSTEM
// Added: Will be created in BACKGROUND (non-blocking)
// Safe for production with millions of records
// ============================================

// Active flag for soft deletes (used in every query)
OfferSchema.index({ active: 1 });

// Compound indexes for dynamic filtering performance
OfferSchema.index({ current_stage: 1, project_id: 1 }); // Consolidated stage filtering
OfferSchema.index({ current_stage: 1, agent_id: 1 }); // Agent stage filtering
OfferSchema.index({ active: 1, status: 1, createdAt: -1 }); // Most common filter combo
OfferSchema.index({ active: 1, project_id: 1, status: 1 }); // Project + status filters
OfferSchema.index({ active: 1, agent_id: 1, status: 1 }); // Agent + status filters
OfferSchema.index({ active: 1, bank_id: 1 }); // Bank filtering
OfferSchema.index({ active: 1, created_by: 1 }); // Creator filtering

// Indexes for numeric range queries
OfferSchema.index({ active: 1, investment_volume: 1 }); // Volume filtering
OfferSchema.index({ active: 1, interest_rate: 1 }); // Interest rate filtering

// Text search indexes (for partial matching)
OfferSchema.index({ title: 'text', reference_no: 'text' }, { 
  name: 'offer_text_search',
  default_language: 'german',
  weights: { title: 10, reference_no: 5 }
});

// Date-based grouping indexes
OfferSchema.index({ active: 1, scheduled_date: 1, scheduled_time: 1 }); // Schedule filtering
OfferSchema.index({ active: 1, created_at: 1 }); // Ascending date (for grouping)

// Indexes for offer type and flex options
OfferSchema.index({ active: 1, offerType: 1 });
OfferSchema.index({ active: 1, flex_option: 1 });

// Indexes for progression stage sorting (sort by stage completion date)
OfferSchema.index({ current_stage: 1, 'progression.opening.completed_at': -1 });
OfferSchema.index({ current_stage: 1, 'progression.confirmation.completed_at': -1 });
OfferSchema.index({ current_stage: 1, 'progression.payment.completed_at': -1 });
OfferSchema.index({ current_stage: 1, 'progression.netto1.completed_at': -1 });
OfferSchema.index({ current_stage: 1, 'progression.netto2.completed_at': -1 });
OfferSchema.index({ current_stage: 1, 'progression.lost.marked_at': -1 });

// Indexes for progression stage createdAt/updatedAt filtering
OfferSchema.index({ current_stage: 1, 'progression.opening.createdAt': -1 });
OfferSchema.index({ current_stage: 1, 'progression.confirmation.createdAt': -1 });
OfferSchema.index({ current_stage: 1, 'progression.payment.createdAt': -1 });
OfferSchema.index({ current_stage: 1, 'progression.netto1.createdAt': -1 });
OfferSchema.index({ current_stage: 1, 'progression.netto2.createdAt': -1 });
OfferSchema.index({ current_stage: 1, 'progression.lost.createdAt': -1 });

// Financial tracking indexes
OfferSchema.index({ 'financials.financials_initialized': 1 });
OfferSchema.index({ 'financials.payment_summary.payment_status': 1 });
OfferSchema.index({ 'financials.has_split': 1 });
OfferSchema.index({ 'financials.has_inbound': 1 });
OfferSchema.index({ 'financials.split_agents.agent_id': 1 });
OfferSchema.index({ 'financials.inbound_agents.agent_id': 1 });
OfferSchema.index({ agent_id: 1, 'financials.financials_initialized': 1 });

// ============================================
// PRE-VALIDATE HOOK: Fix null/undefined values in pending_transfer.status
// Must run BEFORE validation (pre-save runs AFTER validation)
// ============================================
OfferSchema.pre('validate', function(next) {
  // Fix: If pending_transfer exists but status is null or undefined, set it to 'pending' (default)
  if (this.pending_transfer && (this.pending_transfer.status === null || this.pending_transfer.status === undefined)) {
    this.pending_transfer.status = 'pending';
  }
  next();
});

/**
 * Create a formatted response object for API
 */
OfferSchema.methods.toResponse = function () {
  return {
    _id: this._id,
    title: this.title,
    nametitle: this.nametitle,
    reference_no: this.reference_no,
    project_id: this.project_id,
    lead_id: this.lead_id,
    agent_id: this.agent_id,
    bank_id: this.bank_id,
    investment_volume: this.investment_volume,
    interest_rate: this.interest_rate,
    payment_terms: this.payment_terms,
    bonus_amount: this.bonus_amount,
    bankerRate: this.bankerRate,
    agentRate: this.agentRate,
    status: this.status,
    offerType: this.offerType,
    load_and_opening: this.load_and_opening,
    flex_option: this.flex_option,
    scheduled_date: this.scheduled_date,
    scheduled_time: this.scheduled_time,
    handover_notes: this.handover_notes,
    handover_metadata: this.handover_metadata,
    pending_transfer: this.pending_transfer,
    created_at: this.created_at,
    updated_at: this.updated_at,
    current_stage: this.current_stage,
    progression: this.progression,
    document_slots: this.document_slots,
    timeline: this.timeline,
    financials: this.financials,
    financials_enabled: this.financials_enabled,
    is_fully_paid: this.is_fully_paid,
    total_commission_agents: this.total_commission_agents,
    out: this.out,
  };
};

module.exports = mongoose.model('Offer', OfferSchema);
