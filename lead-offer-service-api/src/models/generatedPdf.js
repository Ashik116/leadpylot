const mongoose = require('mongoose');

/**
 * Generated PDF Schema
 * Tracks PDFs generated from templates for offers/leads
 */
const GeneratedPdfSchema = new mongoose.Schema(
  {
    // Template reference
    template_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PdfTemplate',
      required: true,
      index: true,
    },

    // Entity associations
    offer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Offer',
      default: null,
      index: true,
    },
    lead_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: true,
      index: true,
    },
    agent_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    project_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
      index: true,
    },

    // PDF information
    filename: {
      type: String,
      required: true,
    },
    storage_path: {
      type: String,
      required: true,
    },
    file_size: {
      type: Number,
      required: true,
    },
    file_hash: {
      type: String,
      required: true,
    },

    // Generation metadata
    generation_type: {
      type: String,
      enum: ['manual', 'automatic', 'batch'],
      default: 'manual',
    },
    generation_source: {
      type: String,
      enum: ['admin_panel', 'api', 'scheduled', 'email_trigger'],
      default: 'admin_panel',
    },

    // Data snapshot at generation time
    data_snapshot: {
      lead_data: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
      },
      offer_data: {
        type: mongoose.Schema.Types.Mixed,
        default: null,
      },
      bank_data: {
        type: mongoose.Schema.Types.Mixed,
        default: null,
      },
      agent_data: {
        type: mongoose.Schema.Types.Mixed,
        default: null,
      },
      computed_data: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
      },
    },

    // Field mappings used (snapshot for historical tracking)
    field_mappings_snapshot: [
      {
        pdf_field_name: String,
        data_source: String,
        data_field: String,
        final_value: String, // The actual value that was filled in the PDF
        transform_applied: mongoose.Schema.Types.Mixed,
      },
    ],

    // Generation status
    status: {
      type: String,
      enum: ['pending', 'generating', 'completed', 'failed', 'archived'],
      default: 'pending',
      index: true,
    },

    // Error tracking
    error_message: {
      type: String,
      default: null,
    },
    retry_count: {
      type: Number,
      default: 0,
    },

    // Processing metrics
    generation_time_ms: {
      type: Number,
      default: null,
    },
    started_at: {
      type: Date,
      default: null,
    },
    completed_at: {
      type: Date,
      default: null,
    },

    // Document actions tracking
    actions: [
      {
        action_type: {
          type: String,
          enum: [
            'generated',
            'downloaded',
            'previewed',
            'assigned',
            'emailed',
            'shared',
            'archived',
            'deleted',
          ],
          required: true,
        },
        performed_by: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        performed_at: {
          type: Date,
          default: Date.now,
        },
        metadata: {
          type: mongoose.Schema.Types.Mixed,
          default: {},
        }, // e.g., email recipients, download IP, etc.
      },
    ],

    // Email tracking
    email_status: {
      sent: { type: Boolean, default: false },
      sent_at: { type: Date, default: null },
      sent_to: [String], // Email addresses
      email_id: { type: String, default: null }, // External email system ID
    },

    // Version tracking
    version: {
      type: Number,
      default: 1,
    },
    previous_version_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GeneratedPdf',
      default: null,
    },

    // Access control
    visibility: {
      type: String,
      enum: ['private', 'team', 'project', 'public'],
      default: 'team',
    },
    password_protected: {
      type: Boolean,
      default: false,
    },
    access_password: {
      type: String,
      default: null,
    },

    // Expiration
    expires_at: {
      type: Date,
      default: null,
    },

    // Audit fields
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance
GeneratedPdfSchema.index({ template_id: 1, status: 1 });
GeneratedPdfSchema.index({ offer_id: 1, active: 1 });
GeneratedPdfSchema.index({ lead_id: 1, active: 1 });
GeneratedPdfSchema.index({ agent_id: 1, createdAt: -1 });
GeneratedPdfSchema.index({ project_id: 1, createdAt: -1 });
GeneratedPdfSchema.index({ status: 1, createdAt: -1 });
GeneratedPdfSchema.index({ expires_at: 1 }); // For cleanup jobs

// Virtual for download URL (if needed)
GeneratedPdfSchema.virtual('download_url').get(function () {
  return `/api/admin/generated-pdfs/${this._id}/download`;
});

// Virtual for file extension
GeneratedPdfSchema.virtual('file_extension').get(function () {
  return this.filename.split('.').pop().toLowerCase();
});

// Methods
GeneratedPdfSchema.methods.toResponse = function () {
  return {
    _id: this._id,
    template_id: this.template_id,
    offer_id: this.offer_id,
    lead_id: this.lead_id,
    agent_id: this.agent_id,
    project_id: this.project_id,
    filename: this.filename,
    file_size: this.file_size,
    generation_type: this.generation_type,
    status: this.status,
    email_status: this.email_status,
    version: this.version,
    visibility: this.visibility,
    expires_at: this.expires_at,
    download_url: this.download_url,
    generation_time_ms: this.generation_time_ms,
    completed_at: this.completed_at,
    created_by: this.created_by,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

// Method to add action
GeneratedPdfSchema.methods.addAction = function (actionType, performedBy, metadata = {}) {
  this.actions.push({
    action_type: actionType,
    performed_by: performedBy,
    performed_at: new Date(),
    metadata: metadata,
  });
  return this.save();
};

// Static method to find by offer
GeneratedPdfSchema.statics.findByOffer = function (offerId) {
  return this.find({ offer_id: offerId, active: true })
    .populate('template_id', 'name category')
    .populate('created_by', 'login')
    .sort({ createdAt: -1 });
};

// Static method to find by lead
GeneratedPdfSchema.statics.findByLead = function (leadId) {
  return this.find({ lead_id: leadId, active: true })
    .populate('template_id', 'name category')
    .populate('created_by', 'login')
    .sort({ createdAt: -1 });
};

// Pre-save middleware
GeneratedPdfSchema.pre('save', function (next) {
  if (this.isModified('status')) {
    if (this.status === 'generating' && !this.started_at) {
      this.started_at = new Date();
    } else if (['completed', 'failed'].includes(this.status) && !this.completed_at) {
      this.completed_at = new Date();
      if (this.started_at) {
        this.generation_time_ms = this.completed_at - this.started_at;
      }
    }
  }
  next();
});

module.exports = mongoose.model('GeneratedPdf', GeneratedPdfSchema);
