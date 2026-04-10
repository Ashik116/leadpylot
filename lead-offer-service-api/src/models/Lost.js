const mongoose = require('mongoose');

/**
 * Lost Schema
 * Represents a lost offer record with associated documents
 * Tracks when an offer is marked as lost independently of lead status changes
 */
const lostSchema = new mongoose.Schema(
  {
    offer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Offer',
      required: true,
    },
    files: [
      {
        document: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Document',
        },
      },
    ],
    creator_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reason: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
    // Revert tracking fields
    revert_reason: {
      type: String,
      trim: true,
    },
    reverted_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reverted_at: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Add indexes for better query performance
lostSchema.index({ offer_id: 1, active: 1 });
lostSchema.index({ creator_id: 1 });
lostSchema.index({ createdAt: -1 });

const Lost = mongoose.model('Lost', lostSchema);

module.exports = Lost;
