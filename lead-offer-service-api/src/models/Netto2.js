const mongoose = require('mongoose');

/**
 * Netto2 Schema
 * Represents a Netto2 stage with associated rates and documents
 */
const netto2Schema = new mongoose.Schema(
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
    bankerRate: {
      type: Number,
      min: 0,
      max: 100,
      required: false,
    },
    agentRate: {
      type: Number,
      min: 0,
      max: 100,
      required: false,
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

const Netto2 = mongoose.model('Netto2', netto2Schema);

module.exports = Netto2; 