const mongoose = require('mongoose');

/**
 * Assignment Schema
 * Tracks lead assignments to projects and agents
 * Previously called "AssignLeads" in monolith
 */
const AssignmentSchema = new mongoose.Schema(
  {
    lead_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: true,
      index: true,
    },
    project_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    agent_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      index: true,
    },
    assigned_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assigned_at: {
      type: Date,
      default: Date.now,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'archived'],
      default: 'active',
      index: true,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
    collection: 'assignleads', // Keep existing collection name for compatibility
  }
);

// Compound index to ensure unique lead-project assignments
AssignmentSchema.index({ lead_id: 1, project_id: 1 }, { unique: true });

// Indexes for efficient querying
AssignmentSchema.index({ project_id: 1, status: 1 });
AssignmentSchema.index({ lead_id: 1, status: 1 });
AssignmentSchema.index({ agent_id: 1, status: 1 });
AssignmentSchema.index({ assigned_by: 1 });

/**
 * Check if assignment is active
 */
AssignmentSchema.methods.isActive = function () {
  return this.status === 'active';
};

/**
 * Archive this assignment
 */
AssignmentSchema.methods.archive = function () {
  this.status = 'archived';
  return this.save();
};

/**
 * Activate this assignment
 */
AssignmentSchema.methods.activate = function () {
  this.status = 'active';
  return this.save();
};

module.exports = mongoose.model('Assignment', AssignmentSchema);

