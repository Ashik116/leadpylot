const mongoose = require('mongoose');

/**
 * ClosedTodo Schema
 * Represents a todo item for closed leads
 * Preserves todo history for historical reference
 */
const ClosedTodoSchema = new mongoose.Schema(
  {
    // Original todo reference
    original_todo_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Todo',
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

    // === Original Todo Data (mirrored from Todo model) ===
    creator_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    lead_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      required: true,
      index: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    isDone: {
      type: Boolean,
      default: false,
      index: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
    assigned_to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      index: true,
    },
    // Fields for offer-based todos
    offer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Offer',
      required: false,
      index: true,
    },
    // Field for email-based todos
    email_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Email',
      required: false,
      index: true,
    },
    todo_type: {
      type: String,
      enum: ['manual', 'offer_auto', 'email_task'],
      default: 'manual',
      index: true,
    },
    template_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TodoTemplate',
      required: false,
    },
    priority: {
      type: Number,
      default: 1,
      min: 1,
      max: 5,
    },
    admin_only: {
      type: Boolean,
      default: false,
      index: true,
    },
    due_date: {
      type: Date,
      required: false,
      index: true,
    },
    attachments: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }],
      default: [],
      required: false,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Create indexes for common queries
ClosedTodoSchema.index({ closed_lead_id: 1, isDone: 1 });
ClosedTodoSchema.index({ original_todo_id: 1 });
ClosedTodoSchema.index({ creator_id: 1, isDone: 1 });

module.exports = mongoose.model('ClosedTodo', ClosedTodoSchema);
