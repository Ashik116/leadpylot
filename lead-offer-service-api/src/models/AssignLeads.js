const mongoose = require('mongoose');

const assignLeadsSchema = new mongoose.Schema(
  {
    lead_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: true,
    },
    project_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
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
      default: 'active',
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure unique lead-project assignments
assignLeadsSchema.index({ lead_id: 1, project_id: 1 }, { unique: true });

// Indexes for efficient querying
assignLeadsSchema.index({ project_id: 1, status: 1 });
assignLeadsSchema.index({ lead_id: 1, status: 1 });
assignLeadsSchema.index({ agent_id: 1, status: 1 });

const AssignLeads = mongoose.model('AssignLeads', assignLeadsSchema);

module.exports = AssignLeads;
