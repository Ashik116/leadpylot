const mongoose = require('mongoose');

/**
 * QueueTop Model
 * Tracks leads that agents are actively working on (creating offers)
 * These leads appear at the top of the agent's queue until marked complete
 */
const QueueTopSchema = new mongoose.Schema(
  {
    lead_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: true,
    },
    agent_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    project_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: false,
    },
    is_on_top: {
      type: Boolean,
      default: true,
    },
    completed_at: {
      type: Date,
      default: null,
    },
    // Navigation tracking
    previous_lead_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      default: null,
    },
    viewed_at: {
      type: Date,
      default: Date.now,
    },
    view_count: {
      type: Number,
      default: 1,
    },
    // Auto-expire after 2 hours of inactivity (in case agent forgets to complete)
    expires_at: {
      type: Date,
      default: () => new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
      index: { expires: 0 }, // TTL index - MongoDB will auto-delete
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

// Compound index to ensure one lead per agent at a time (unique constraint)
QueueTopSchema.index({ lead_id: 1, agent_id: 1 }, { unique: true });

// Index for quick lookups
QueueTopSchema.index({ agent_id: 1, is_on_top: 1 });
QueueTopSchema.index({ lead_id: 1, is_on_top: 1 });

const QueueTop = mongoose.model('QueueTop', QueueTopSchema);

module.exports = QueueTop;

