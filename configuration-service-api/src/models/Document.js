/**
 * Document Model (Stub for Reference)
 * Minimal schema for referencing documents from Document microservice
 * Full document functionality is handled by the Document microservice
 */

const mongoose = require('mongoose');

/**
 * Document Schema - Minimal version for references
 * This is just for mongoose population to work when banks reference logos
 * The actual document storage and management is in the Document microservice
 */
const DocumentSchema = new mongoose.Schema(
  {
    filetype: String,
    filename: String,
    path: String,
    size: Number,
    type: String,
    // Public URL for display (Cloudinary CDN, S3, or proxy URL)
    public_url: String,
    public_slug: String,
    uploader_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    active: {
      type: Boolean,
      default: true,
    },
    // Minimal fields needed for display
    metadata: {
      original_filename: String,
      file_hash: String,
      content_type: String,
    },
  },
  {
    timestamps: true,
  }
);

// This model is read-only in this microservice
// All document operations should go through the Document microservice
DocumentSchema.methods.toJSON = function () {
  const obj = this.toObject();
  return obj;
};

const Document = mongoose.model('Document', DocumentSchema);

module.exports = Document;

