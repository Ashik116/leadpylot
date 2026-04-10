const mongoose = require('mongoose');

const leadTransferSchema = new mongoose.Schema(
  {
    // Basic transfer information
    lead_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: true,
      index: true,
    },
    
    // Transfer direction
    from_project_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: false, // Can be null for initial assignments
    },
    from_agent_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false, // Can be null for initial assignments
    },
    to_project_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
      index: true,
    },
    to_agent_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    
    // Transfer metadata
    transferred_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    transfer_reason: {
      type: String,
      default: '',
      trim: true,
    },
    transfer_notes: {
      type: String,
      default: '',
      trim: true,
    },
    
    // Fresh transfer flag - determines if lead should be reset
    is_fresh_transfer: {
      type: Boolean,
      default: false,
      index: true,
    },
    
    // Transfer type
    transfer_type: {
      type: String,
      enum: ['manual', 'bulk', 'automatic', 'rebalance'],
      default: 'manual',
      index: true,
    },
    
    // Lead state before transfer (for audit purposes)
    previous_state: {
      stage_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Stage',
      },
      status_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Status',
      },
      stage_name: String,
      status_name: String,
      use_status: String,
      last_activity_date: Date,
    },
    
    // Lead state after transfer
    new_state: {
      stage_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Stage',
      },
      status_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Status',
      },
      stage_name: String,
      status_name: String,
      use_status: String,
    },
    
    // What was transferred or reset
    transfer_details: {
      // Entities that were made accessible to new agent
      transferred_entities: {
        offers_count: { type: Number, default: 0 },
        documents_count: { type: Number, default: 0 },
        openings_count: { type: Number, default: 0 },
        confirmations_count: { type: Number, default: 0 },
        payment_vouchers_count: { type: Number, default: 0 },
        emails_count: { type: Number, default: 0 },
      },
      
      // Entities that were hidden/reset for fresh transfers
      reset_entities: {
        offers_hidden: { type: Number, default: 0 },
        documents_hidden: { type: Number, default: 0 },
        openings_hidden: { type: Number, default: 0 },
        confirmations_hidden: { type: Number, default: 0 },
        payment_vouchers_hidden: { type: Number, default: 0 },
        emails_hidden: { type: Number, default: 0 },
        stage_status_reset: { type: Boolean, default: false },
      },
    },
    
    // Transfer status
    transfer_status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'failed', 'partially_completed'],
      default: 'completed',
      index: true,
    },
    
    // Error information (if any)
    error_details: {
      error_message: String,
      failed_operations: [String],
      partial_failures: [{
        operation: String,
        entity_id: mongoose.Schema.Types.ObjectId,
        error: String,
      }],
    },
    
    // Timing information
    transfer_started_at: {
      type: Date,
      default: Date.now,
    },
    transfer_completed_at: {
      type: Date,
    },
    processing_time_ms: {
      type: Number,
    },
    
    // Reversal information (if transfer is ever reversed)
    is_reversed: {
      type: Boolean,
      default: false,
    },
    reversed_at: {
      type: Date,
    },
    reversed_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reversal_reason: {
      type: String,
      trim: true,
    },
    
    // Activity tracking
    activity_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Activity',
    },
    
    // Additional metadata
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for transfer duration
leadTransferSchema.virtual('transfer_duration').get(function() {
  if (this.transfer_completed_at && this.transfer_started_at) {
    return this.transfer_completed_at.getTime() - this.transfer_started_at.getTime();
  }
  return null;
});

// Virtual for readable transfer description
leadTransferSchema.virtual('transfer_description').get(function() {
  const freshText = this.is_fresh_transfer ? ' (Fresh Start)' : '';
  return `Lead transferred from ${this.from_project_name || 'Unassigned'} to ${this.to_project_name || 'Unknown'}${freshText}`;
});

// Indexes for efficient querying
leadTransferSchema.index({ lead_id: 1, createdAt: -1 });
leadTransferSchema.index({ from_agent_id: 1, createdAt: -1 });
leadTransferSchema.index({ to_agent_id: 1, createdAt: -1 });
leadTransferSchema.index({ transferred_by: 1, createdAt: -1 });
leadTransferSchema.index({ transfer_type: 1, is_fresh_transfer: 1 });
leadTransferSchema.index({ transfer_status: 1, createdAt: -1 });

// Instance methods
leadTransferSchema.methods.markCompleted = function(processingTimeMs = null) {
  this.transfer_status = 'completed';
  this.transfer_completed_at = new Date();
  if (processingTimeMs) {
    this.processing_time_ms = processingTimeMs;
  }
  return this.save();
};

leadTransferSchema.methods.markFailed = function(errorMessage, failedOperations = []) {
  this.transfer_status = 'failed';
  this.transfer_completed_at = new Date();
  this.error_details = {
    error_message: errorMessage,
    failed_operations: failedOperations,
  };
  return this.save();
};

leadTransferSchema.methods.addPartialFailure = function(operation, entityId, error) {
  if (!this.error_details) {
    this.error_details = { partial_failures: [] };
  }
  if (!this.error_details.partial_failures) {
    this.error_details.partial_failures = [];
  }
  
  this.error_details.partial_failures.push({
    operation,
    entity_id: entityId,
    error,
  });
  
  if (this.transfer_status === 'completed') {
    this.transfer_status = 'partially_completed';
  }
  
  return this.save();
};

// Static methods
leadTransferSchema.statics.getTransferHistory = function(leadId, options = {}) {
  const { limit = 50, skip = 0, includeReversed = false } = options;
  
  const query = { lead_id: leadId };
  if (!includeReversed) {
    query.is_reversed = { $ne: true };
  }
  
  return this.find(query)
    .populate('from_project_id', 'name')
    .populate('to_project_id', 'name')
    .populate('from_agent_id', 'login name')
    .populate('to_agent_id', 'login name')
    .populate('transferred_by', 'login name')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .lean();
};

leadTransferSchema.statics.getAgentTransferStats = function(agentId, dateRange = {}) {
  const { startDate, endDate } = dateRange;
  
  const matchStage = {
    $or: [
      { from_agent_id: agentId },
      { to_agent_id: agentId }
    ]
  };
  
  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = new Date(startDate);
    if (endDate) matchStage.createdAt.$lte = new Date(endDate);
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        total_transfers: { $sum: 1 },
        received_transfers: {
          $sum: { $cond: [{ $eq: ['$to_agent_id', agentId] }, 1, 0] }
        },
        sent_transfers: {
          $sum: { $cond: [{ $eq: ['$from_agent_id', agentId] }, 1, 0] }
        },
        fresh_transfers_received: {
          $sum: {
            $cond: [
              { $and: [{ $eq: ['$to_agent_id', agentId] }, { $eq: ['$is_fresh_transfer', true] }] },
              1,
              0
            ]
          }
        },
        regular_transfers_received: {
          $sum: {
            $cond: [
              { $and: [{ $eq: ['$to_agent_id', agentId] }, { $eq: ['$is_fresh_transfer', false] }] },
              1,
              0
            ]
          }
        }
      }
    }
  ]);
};

const LeadTransfer = mongoose.model('LeadTransfer', leadTransferSchema);

module.exports = LeadTransfer;
