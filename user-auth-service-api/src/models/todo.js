const mongoose = require('mongoose');

/**
 * Todo Schema (Simplified for Auth Service)
 * Used only for counting pending todos for navigation badge
 */
const todoSchema = new mongoose.Schema(
  {
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
    assigned_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      index: true,
    },
    assigned_at: {
      type: Date,
      required: false,
      index: true,
    },
    type: {
      type: String,
      enum: ['Todo', 'Ticket'],
      default: 'Todo',
      index: true,
    },
    offer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Offer',
      required: false,
      index: true,
    },
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
    collection: 'todos', // Explicitly set collection name
  }
);

// Create compound indexes for common queries
todoSchema.index({ lead_id: 1, isDone: 1 });
todoSchema.index({ creator_id: 1, isDone: 1 });
todoSchema.index({ assigned_to: 1, isDone: 1 });
todoSchema.index({ active: 1, isDone: 1 });

// Only create the model if it doesn't exist
const Todo = mongoose.models.Todo || mongoose.model('Todo', todoSchema);

module.exports = Todo;

