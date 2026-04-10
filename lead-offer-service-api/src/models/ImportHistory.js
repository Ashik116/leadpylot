const mongoose = require('mongoose');

const ImportHistorySchema = new mongoose.Schema(
  {
    // User who performed the import
    user_id: {
      type: mongoose.Schema.Types.Mixed, // Allow both String (ObjectId) and Number
      required: true,
    },
    user_name: {
      type: String,
      required: true,
    },
    user_email: {
      type: String,
      required: true,
    },

    // Import details
    original_filename: {
      type: String,
      required: true,
    },
    stored_filename: {
      type: String,
      required: true,
    },
    file_size: {
      type: Number,
      required: true,
    },

    // Import parameters
    source_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Source',
    },
    lead_price: {
      type: Number,
      default: 0,
    },

    // Import results
    total_rows: {
      type: Number,
      required: true,
    },
    success_count: {
      type: Number,
      required: true,
    },
    failure_count: {
      type: Number,
      required: true,
    },
    enhanced_count: {
      type: Number,
      default: 0,
    },
    auto_assigned_count: {
      type: Number,
      default: 0,
    },
    stage_assigned_count: {
      type: Number,
      default: 0,
    },
    reclamation_created_count: {
      type: Number,
      default: 0,
    },
    reclamation_errors_count: {
      type: Number,
      default: 0,
    },

    // Status tracking
    status: {
      type: String,
      enum: ['queued', 'processing', 'completed', 'failed'],
      default: 'queued',
    },

    // Real-time progress tracking for large imports
    progress: {
      current_phase: {
        type: String,
        enum: [
          'queued',
          'uploading',
          'validating',
          'enhancement_check',
          'stage_assignment',
          'agent_assignment',
          'duplicate_check',
          'lookup_resolution',
          'database_insertion',
          'post_processing',
          'completed',
          'failed'
        ],
        default: 'queued'
      },
      phase_description: {
        type: String,
        default: 'Waiting to start'
      },
      processed_count: {
        type: Number,
        default: 0
      },
      percentage: {
        type: Number,
        default: 0
      },
      current_batch: {
        type: Number,
        default: 0
      },
      total_batches: {
        type: Number,
        default: 0
      },
      estimated_time_remaining_ms: {
        type: Number,
        default: null
      },
      started_at: {
        type: Date,
        default: null
      },
      last_updated: {
        type: Date,
        default: Date.now
      }
    },

    // Files
    original_file_path: {
      type: String,
      required: true,
    },
    error_file_path: {
      type: String,
    },
    error_filename: {
      type: String,
    },

    // Detailed results
    duplicate_status_summary: {
      new: {
        type: Number,
        default: 0,
      },
      oldDuplicate: {
        type: Number,
        default: 0,
      },
      duplicate: {
        type: Number,
        default: 0,
      },
    },

    // Error details for failed imports
    error_message: {
      type: String,
    },

    // Processing time
    processing_time_ms: {
      type: Number,
    },

    // Import completion timestamp
    completed_at: {
      type: Date,
    },

    // === REVERT TRACKING FIELDS ===
    // Tracks all operations performed during import for potential revert
    revert_data: {
      // Lead IDs created during this import
      created_lead_ids: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lead'
      }],
      
      // Assignment records created during this import
      created_assignment_ids: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AssignLeads'
      }],
      
      // Transaction records created during this import
      created_transaction_ids: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transaction'
      }],
      
      // Reclamation records created during this import
      created_reclamation_ids: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Reclamation'
      }],
      
      // Activity records created during this import
      created_activity_ids: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Activity'
      }],
      
      // VOIP extensions assigned during this import
      assigned_voip_extensions: [{
        extension: String,
        lead_id: mongoose.Schema.Types.ObjectId
      }],
      
      // FreePBX records created during this import
      freepbx_records: [{
        extension: String,
        lead_id: mongoose.Schema.Types.ObjectId,
        miscdest_id: Number,
        miscapps_id: Number,
        featurecode_id: Number
      }],
      
      // Source statistics changes
      source_updates: [{
        source_id: mongoose.Schema.Types.ObjectId,
        lead_count_increment: Number
      }],
      
      // Enhanced leads (existing leads that were updated)
      enhanced_leads: [{
        lead_id: mongoose.Schema.Types.ObjectId,
        original_values: mongoose.Schema.Types.Mixed,
        updated_fields: [String]
      }],
      
      // Stage and status records created during import
      created_stages: [{
        stage_id: mongoose.Schema.Types.ObjectId,
        stage_name: String
      }],
      
      created_statuses: [{
        status_id: mongoose.Schema.Types.ObjectId,
        status_name: String,
        stage_id: mongoose.Schema.Types.ObjectId
      }]
    },

    // Revert status tracking
    is_reverted: {
      type: Boolean,
      default: false
    },
    
    reverted_at: {
      type: Date
    },
    
    reverted_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    
    revert_reason: {
      type: String,
      trim: true
    },
    
    // Revert results
    revert_summary: {
      leads_deleted: { type: Number, default: 0 },
      assignments_deleted: { type: Number, default: 0 },
      transactions_deleted: { type: Number, default: 0 },
      reclamations_deleted: { type: Number, default: 0 },
      activities_deleted: { type: Number, default: 0 },
      voip_extensions_freed: { type: Number, default: 0 },
      freepbx_records_deleted: { type: Number, default: 0 },
      source_counts_reverted: { type: Number, default: 0 },
      enhanced_leads_reverted: { type: Number, default: 0 },
      errors: [String]
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Create indexes for common queries
ImportHistorySchema.index({ user_id: 1, createdAt: -1 });
ImportHistorySchema.index({ status: 1 });
ImportHistorySchema.index({ createdAt: -1 });

// Virtual for generating download URLs
ImportHistorySchema.virtual('original_file_download_url').get(function () {
  if (this.stored_filename) {
    return `/leads/download/imports/${this.stored_filename}`;
  }
  return null;
});

ImportHistorySchema.virtual('error_file_download_url').get(function () {
  if (this.error_filename) {
    return `/leads/download/${this.error_filename}`;
  }
  return null;
});

// Method to check if import can be reverted
ImportHistorySchema.methods.canRevert = function () {
  // Cannot revert if already reverted
  if (this.is_reverted) {
    return { 
      canRevert: false, 
      reason: 'This import has already been reverted' 
    };
  }

  // Cannot revert if import failed
  if (this.status !== 'completed') {
    return { 
      canRevert: false, 
      reason: 'Only completed imports can be reverted' 
    };
  }

  // Cannot revert if no successful leads were created
  if (this.success_count === 0) {
    return { 
      canRevert: false, 
      reason: 'No leads were successfully created to revert' 
    };
  }

  // Time-based restriction: Cannot revert imports older than 7 days
  const maxRevertAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
  const importAge = Date.now() - this.createdAt.getTime();
  
  if (importAge > maxRevertAge) {
    return { 
      canRevert: false, 
      reason: 'Cannot revert imports older than 7 days' 
    };
  }

  return { 
    canRevert: true, 
    reason: null 
  };
};

// Method to get revert preview information
ImportHistorySchema.methods.getRevertPreview = function () {
  if (!this.revert_data) {
    return null;
  }

  return {
    leads_to_delete: this.revert_data.created_lead_ids?.length || 0,
    assignments_to_delete: this.revert_data.created_assignment_ids?.length || 0,
    transactions_to_delete: this.revert_data.created_transaction_ids?.length || 0,
    reclamations_to_delete: this.revert_data.created_reclamation_ids?.length || 0,
    voip_extensions_to_free: this.revert_data.assigned_voip_extensions?.length || 0,
    freepbx_records_to_delete: this.revert_data.freepbx_records?.length || 0,
    source_counts_to_revert: this.revert_data.source_updates?.length || 0,
    enhanced_leads_to_revert: this.revert_data.enhanced_leads?.length || 0,
  };
};

// Method to create a formatted response for API
ImportHistorySchema.methods.toResponse = function () {
  const revertInfo = this.canRevert();
  
  return {
    _id: this._id,
    user: {
      id: this.user_id,
      name: this.user_name,
      email: this.user_email,
    },
    file: {
      original_filename: this.original_filename,
      file_size: this.file_size,
      download_url: this.original_file_download_url,
    },
    import_details: {
      source_id: this.source_id,
      lead_price: this.lead_price,
      total_rows: this.total_rows,
      success_count: this.success_count,
      failure_count: this.failure_count,
      enhanced_count: this.enhanced_count || 0,
      auto_assigned_count: this.auto_assigned_count || 0,
      stage_assigned_count: this.stage_assigned_count || 0,
      reclamation_created_count: this.reclamation_created_count || 0,
      reclamation_errors_count: this.reclamation_errors_count || 0,
      duplicate_status_summary: this.duplicate_status_summary,
    },
    error_file: this.error_filename
      ? {
          filename: this.error_filename,
          download_url: this.error_file_download_url,
        }
      : null,
    status: this.status,
    processing_time_ms: this.processing_time_ms,
    error_message: this.error_message,
    created_at: this.createdAt,
    completed_at: this.completed_at,
    
    // Revert information
    revert_info: {
      is_reverted: this.is_reverted,
      can_revert: revertInfo.canRevert,
      revert_reason_blocked: revertInfo.reason,
      reverted_at: this.reverted_at,
      reverted_by: this.reverted_by,
      revert_reason: this.revert_reason,
      revert_preview: this.getRevertPreview(),
      revert_summary: this.revert_summary,
    },
  };
};

module.exports = mongoose.model('ImportHistory', ImportHistorySchema, 'imports');
