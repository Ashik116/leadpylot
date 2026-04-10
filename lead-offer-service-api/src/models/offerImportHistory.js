const mongoose = require('mongoose');

const OfferImportHistorySchema = new mongoose.Schema(
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

    // Import results
    total_rows: {
      type: Number,
      required: true,
    },
    success_count: {
      type: Number,
      required: true,
    },
    enhanced_count: {
      type: Number,
      default: 0,
    },
    failure_count: {
      type: Number,
      required: true,
    },

    // Status tracking
    status: {
      type: String,
      enum: ['processing', 'completed', 'failed'],
      default: 'processing',
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
      // Offer IDs created during this import
      created_offer_ids: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Offer'
      }],
      
      // Activity records created during this import
      created_activity_ids: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Activity'
      }],
      
      // Lead updates performed during this import
      lead_updates: [{
        lead_id: mongoose.Schema.Types.ObjectId,
        field_updates: {
          nametitle: {
            original_value: String,
            new_value: String,
            was_updated: Boolean
          },
          stage_status: {
            original_stage_id: mongoose.Schema.Types.ObjectId,
            original_status_id: mongoose.Schema.Types.ObjectId,
            original_stage_name: String,
            original_status_name: String,
            new_stage_id: mongoose.Schema.Types.ObjectId,
            new_status_id: mongoose.Schema.Types.ObjectId,
            new_stage_name: String,
            new_status_name: String,
            was_updated: Boolean
          }
        }
      }],

      // Enhanced offers during this import
      enhanced_offers: [{
        offer_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Offer'
        },
        original_values: mongoose.Schema.Types.Mixed,
        updated_fields: [String]
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
      offers_deleted: { type: Number, default: 0 },
      offers_enhanced_reverted: { type: Number, default: 0 },
      activities_deleted: { type: Number, default: 0 },
      lead_updates_reverted: { type: Number, default: 0 },
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
OfferImportHistorySchema.index({ user_id: 1, createdAt: -1 });
OfferImportHistorySchema.index({ status: 1 });
OfferImportHistorySchema.index({ createdAt: -1 });

// Virtual for generating download URLs
OfferImportHistorySchema.virtual('original_file_download_url').get(function () {
  if (this.stored_filename) {
    return `/offers/import/download/${this.stored_filename}`;
  }
  return null;
});

OfferImportHistorySchema.virtual('error_file_download_url').get(function () {
  if (this.error_filename) {
    return `/offers/import/download/${this.error_filename}`;
  }
  return null;
});

// Method to check if import can be reverted
OfferImportHistorySchema.methods.canRevert = function () {
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

  // Cannot revert if no successful offers were created
  if (this.success_count === 0) {
    return { 
      canRevert: false, 
      reason: 'No offers were successfully created to revert' 
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
OfferImportHistorySchema.methods.getRevertPreview = function () {
  if (!this.revert_data) {
    return null;
  }

  return {
    offers_to_delete: this.revert_data.created_offer_ids?.length || 0,
    offers_enhanced_to_revert: this.revert_data.enhanced_offers?.length || 0,
    activities_to_delete: this.revert_data.created_activity_ids?.length || 0,
    lead_updates_to_revert: this.revert_data.lead_updates?.length || 0,
  };
};

// Method to create a formatted response for API
OfferImportHistorySchema.methods.toResponse = function () {
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
      total_rows: this.total_rows,
      success_count: this.success_count,
      enhanced_count: this.enhanced_count,
      failure_count: this.failure_count,
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

module.exports = mongoose.model('OfferImportHistory', OfferImportHistorySchema, 'offer_imports'); 