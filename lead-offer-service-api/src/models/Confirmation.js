const mongoose = require('mongoose');

/**
 * Confirmation Schema
 * Represents a confirmation with associated documents - can be linked directly to offer or through opening
 */
const confirmationSchema = new mongoose.Schema(
  {
    // Direct reference to offer (new flexible approach)
    offer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Offer',
      required: false, // Will be required when going directly from offer
    },
    // Reference to opening (legacy chain approach)
    opening_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Opening',
      required: false, // No longer always required
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

// Validation: Must have either offer_id or opening_id
confirmationSchema.pre('validate', function(next) {
  if (!this.offer_id && !this.opening_id) {
    next(new Error('Confirmation must have either offer_id or opening_id'));
  } else {
    next();
  }
});

const Confirmation = mongoose.model('Confirmation', confirmationSchema);

module.exports = Confirmation; 