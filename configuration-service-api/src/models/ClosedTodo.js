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
    // Fields for offer-based todos
    offer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Offer',
      required: false,
      index: true,
    },
    todo_type: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TodoType',
      required: false,
      index: true,
    },
    /**
     * Multiple todo types for a single todo/ticket.
     * Each todo type can be individually marked as done.
     */
    todoTypesids: [
      {
        todoTypeId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'TodoType',
          required: true,
        },
        isDone: {
          type: Boolean,
          default: false,
        },
      },
    ],
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
    /**
     * Related document IDs attached to this todo/ticket.
     */
    documents_ids: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document',
      },
    ],
    /**
     * Type of todo: "Todo" or "Ticket"
     * "Ticket" when assigned_to exists, "Todo" otherwise
     */
    type: {
      type: String,
      enum: ['Todo', 'Ticket'],
      default: 'Todo',
      index: true,
    },
    /**
     * Date when the todo was marked as done
     */
    dateOfDone: {
      type: Date,
      required: false,
      index: true,
    },
    /**
     * Human-readable duration from createdAt to dateOfDone
     */
    completion_duration: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
    collection: 'closedtodos', // Keep existing collection name for compatibility
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Create indexes for common queries
ClosedTodoSchema.index({ closed_lead_id: 1, isDone: 1 });
ClosedTodoSchema.index({ original_todo_id: 1 });
ClosedTodoSchema.index({ creator_id: 1, isDone: 1 });
ClosedTodoSchema.index({ offer_id: 1, active: 1 });
ClosedTodoSchema.index({ todo_type: 1, admin_only: 1 });
ClosedTodoSchema.index({ todo_type: 1, isDone: 1 });
ClosedTodoSchema.index({ admin_only: 1, active: 1 });
ClosedTodoSchema.index({ priority: 1, due_date: 1 });
ClosedTodoSchema.index({ type: 1, isDone: 1 });
ClosedTodoSchema.index({ type: 1, active: 1 });
ClosedTodoSchema.index({ dateOfDone: 1 });

module.exports = mongoose.model('ClosedTodo', ClosedTodoSchema);

