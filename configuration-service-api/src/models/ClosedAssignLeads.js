const mongoose = require('mongoose');

/**
 * ClosedAssignLeads Schema
 * Represents assignment records for closed leads
 * Preserves assignment history for tracking and preventing duplicate assignments
 */
const ClosedAssignLeadsSchema = new mongoose.Schema(
  {
    // Original assignment reference
    original_assignment_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AssignLeads',
      required: false,
      index: true,
    },

    // Closed lead reference
    closed_lead_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClosedLead',
      required: true,
      index: true,
    },

    // === Original AssignLeads Data (mirrored from AssignLeads model) ===
    lead_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: true,
    },
    project_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    agent_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    assigned_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assigned_at: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['active', 'archived'],
      default: 'archived', // Closed assignments are archived by default
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
    collection: 'closedassignleads', // Keep existing collection name for compatibility
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Create indexes for common queries
ClosedAssignLeadsSchema.index({ closed_lead_id: 1 });
ClosedAssignLeadsSchema.index({ original_assignment_id: 1 });
ClosedAssignLeadsSchema.index({ project_id: 1, status: 1 });
ClosedAssignLeadsSchema.index({ lead_id: 1, status: 1 });
ClosedAssignLeadsSchema.index({ agent_id: 1, status: 1 });

// Compound index to track agent-lead assignment history
ClosedAssignLeadsSchema.index({ agent_id: 1, lead_id: 1 });

module.exports = mongoose.model('ClosedAssignLeads', ClosedAssignLeadsSchema);

