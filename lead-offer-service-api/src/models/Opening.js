const mongoose = require('mongoose');

/**
 * Opening Schema
 * Represents an opening with associated documents
 */
const openingSchema = new mongoose.Schema(
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
    load_and_opening: {
      type: String,
      required: false,
      trim: true,
      default: 'opening',
      comment: 'Optional load and opening field for opening data',
    },
  },
  { timestamps: true }
);

const Opening = mongoose.model('Opening', openingSchema);

module.exports = Opening;
