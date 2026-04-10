/**
 * Email Template Category Model
 * Stub model to reference categories from email-service-api
 */

const mongoose = require('mongoose');

const emailTemplateCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
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
  },
  {
    timestamps: true,
    // Uses default collection name 'emailtemplatecategories' (same as email-service-api when shared DB)
  }
);

// Index for performance
emailTemplateCategorySchema.index({ name: 1 });

const EmailTemplateCategory = mongoose.model('EmailTemplateCategory', emailTemplateCategorySchema);

module.exports = EmailTemplateCategory;
