const mongoose = require('mongoose');

/**
 * Tracks each agent's current position in their queue
 * Used to detect when the current top lead changes
 */
const AgentQueuePositionSchema = new mongoose.Schema(
  {
    agent_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // One record per agent
    },
    current_lead_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: true,
    },
    last_viewed_at: {
      type: Date,
      default: Date.now,
    },
    // Filters used when viewing this lead (to detect filter changes)
    filters: {
      project_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team',
        default: null,
      },
      project_name: {
        type: String,
        default: null,
      },
      source: {
        type: String,
        default: null,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Index for fast lookups by agent
AgentQueuePositionSchema.index({ agent_id: 1 });

const AgentQueuePosition = mongoose.model('AgentQueuePosition', AgentQueuePositionSchema);

module.exports = AgentQueuePosition;

