const mongoose = require('mongoose');

/**
 * PDF Field Group Schema
 * For handling character-box fields like IBAN where each character goes to a separate PDF field
 */
const PdfFieldGroupSchema = new mongoose.Schema(
  {
    logical_name: {
      type: String,
      required: true,
      trim: true,
    }, // e.g., "IBAN", "PHONE_NUMBER"
    field_names: [
      {
        type: String,
        required: true,
      },
    ], // e.g., ["IBAN_1", "IBAN_2", "IBAN_3", ...]
    field_type: {
      type: String,
      enum: ['text', 'checkbox', 'radio', 'dropdown'],
      default: 'text',
    },
    max_length: {
      type: Number,
      default: null,
    }, // Total max length for the combined value
    pattern: {
      type: String,
      default: null,
    }, // Regex pattern for validation
  },
  { _id: true }
);

/**
 * PDF Field Mapping Schema
 * Maps PDF fields to data fields (lead/offer/bank data)
 */
const PdfFieldMappingSchema = new mongoose.Schema(
  {
    pdf_field_name: {
      type: String,
      required: true,
      trim: true,
    }, // Original PDF field name
    pdf_field_type: {
      type: String,
      enum: ['text', 'checkbox', 'radio', 'dropdown'],
      required: true,
    },

    // Field grouping for character-box fields
    field_group_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    }, // Reference to field group if this field is part of a group
    group_position: {
      type: Number,
      default: null,
    }, // Position in the group (0, 1, 2, ...)

    // Data source mapping
    data_source: {
      type: String,
      enum: ['lead', 'offer', 'bank', 'agent', 'computed', 'static'],
      required: true,
    },
    data_field: {
      type: String,
      required: true,
      trim: true,
    }, // e.g., "contact_name", "investment_volume", "iban"

    // Transformation rules
    transform_rules: {
      uppercase: { type: Boolean, default: false },
      lowercase: { type: Boolean, default: false },
      format_pattern: { type: String, default: null }, // e.g., currency formatting
      default_value: { type: String, default: null },
      prefix: { type: String, default: null },
      suffix: { type: String, default: null },
      // Font settings
      font_family: { type: String, default: null }, // Custom font family
      font_size: { type: Number, default: null }, // Custom font size (overrides auto-sizing)
      text_color: { type: String, default: null }, // Text color in hex format (e.g., "#0000FF" for blue)
    },

    // Validation rules
    validation: {
      required: { type: Boolean, default: false },
      min_length: { type: Number, default: null },
      max_length: { type: Number, default: null },
      pattern: { type: String, default: null },
    },

    // Conditional mapping (future feature)
    conditions: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    active: {
      type: Boolean,
      default: true,
    },
  },
  { _id: true }
);

/**
 * PDF Template Schema
 * Main schema for PDF templates
 */
const PdfTemplateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },

    // File storage information
    original_filename: {
      type: String,
      required: true,
    },
    storage_path: {
      type: String,
      required: true,
    }, // Path in cloud storage
    preview_path: {
      type: String,
      default: null,
    }, // Path to field-named version for mapping interface
    file_size: {
      type: Number,
      required: true,
    },
    file_hash: {
      type: String,
      required: true,
    }, // MD5 hash for deduplication

    // PDF metadata
    pdf_version: {
      type: String,
      default: null,
    },
    page_count: {
      type: Number,
      default: 1,
    },
    form_fields_count: {
      type: Number,
      default: 0,
    },

    // Field information
    extracted_fields: [
      {
        name: { type: String, required: true },
        type: { type: String, required: true },
        page: { type: Number, default: 1 },
        position: {
          x: Number,
          y: Number,
          width: Number,
          height: Number,
        },
        options: [String], // For dropdown/radio fields
      },
    ],

    // Field groupings for character-box fields
    field_groups: [PdfFieldGroupSchema],

    // Field mappings
    field_mappings: [PdfFieldMappingSchema],

    // Project association (Team/Project)
    team_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      default: null,
    },

    // Template categorization
    category: {
      type: String,
      enum: ['offer', 'contract', 'application', 'other'],
      default: 'offer',
    },
    // Offer subtype - required only when category is 'offer'
    offer_type: {
      type: String,
      enum: ['festgeld', 'tagesgeld', 'etf', null],
      default: null,
    },
    // Lead sources - references to Source model, used to match templates based on lead source
    lead_source: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Source',
    }],
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],

    // Template status
    status: {
      type: String,
      enum: ['draft', 'mapping', 'active', 'archived'],
      default: 'draft',
    },

    // Usage tracking
    usage_count: {
      type: Number,
      default: 0,
    },
    last_used: {
      type: Date,
      default: null,
    },

    // Template settings
    settings: {
      auto_flatten: { type: Boolean, default: true }, // Flatten form after filling
      allow_editing: { type: Boolean, default: false }, // Allow editing after generation
      watermark: { type: String, default: null },
      password_protect: { type: Boolean, default: false },
      password: { type: String, default: null },
      // Font settings
      default_font: { type: String, default: 'Helvetica' }, // Default font for all fields
      default_font_size: { type: Number, default: 12, min: 6, max: 72 }, // Default font size for all fields
      custom_fonts: [
        {
          name: { type: String, required: true }, // Font display name
          file_path: { type: String, required: true }, // Path to font file
          font_family: { type: String, required: true }, // Font family identifier
          active: { type: Boolean, default: true },
        },
      ],
    },

    // Audit information
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
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
PdfTemplateSchema.index({ team_id: 1 });
PdfTemplateSchema.index({ status: 1, active: 1 });
PdfTemplateSchema.index({ category: 1 });
PdfTemplateSchema.index({ created_by: 1 });
PdfTemplateSchema.index({ tags: 1 });
PdfTemplateSchema.index({ name: 'text', description: 'text' });

// Virtual for mapping completion percentage
PdfTemplateSchema.virtual('mapping_completion').get(function () {
  if (!this.extracted_fields || this.extracted_fields.length === 0) return 0;
  if (!this.field_mappings) return 0;
  const mappedFields = this.field_mappings.filter((m) => m.active).length;
  return Math.round((mappedFields / this.extracted_fields.length) * 100);
});

// Methods
PdfTemplateSchema.methods.toResponse = function () {
  return {
    _id: this._id,
    name: this.name,
    description: this.description,
    team_id: this.team_id,
    original_filename: this.original_filename,
    category: this.category,
    offer_type: this.offer_type,
    status: this.status,
    form_fields_count: this.form_fields_count,
    mapping_completion: this.mapping_completion,
    usage_count: this.usage_count,
    last_used: this.last_used,
    tags: this.tags,
    created_by: this.created_by,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

// Pre-save middleware
PdfTemplateSchema.pre('save', function (next) {
  if (this.isModified('field_mappings') || this.isNew) {
    // Update status based on mapping completion
    const completion = this.mapping_completion;
    if (completion === 0 && this.status === 'draft') {
      this.status = 'draft';
    } else if (completion > 0 && completion < 100 && this.status === 'draft') {
      this.status = 'mapping';
    } else if (completion === 100 && this.status !== 'archived') {
      // Don't auto-activate, let admin manually activate
    }
  }
  next();
});

module.exports = mongoose.model('PdfTemplate', PdfTemplateSchema);
