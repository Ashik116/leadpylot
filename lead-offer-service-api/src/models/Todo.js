const mongoose = require('mongoose');

/**
 * Todo Schema
 * Represents a todo item for a lead
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
    /**
     * User who assigned this ticket to assigned_to.
     * Tracks assignment history for accountability.
     */
    assigned_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      index: true,
      comment: 'User who assigned this ticket (for tracking who made the assignment)',
    },
    /**
     * Date when the ticket was last assigned
     */
    assigned_at: {
      type: Date,
      required: false,
      index: true,
      comment: 'Date when the ticket was last assigned',
    },
    // New fields for offer-based todos
    offer_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Offer',
      required: false,
      index: true,
      comment: 'Associated offer ID for offer-generated todos',
    },
    todo_type: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PredefinedSubTask',
      required: false,
      index: true,
      comment: 'Reference to PredefinedSubTask model (previously TodoType)',
    },
    /**
     * Multiple todo types for a single todo/ticket.
     * Each todo type can be individually marked as done.
     * API passes these as an array of objects with todoTypeId and isDone.
     * Now references PredefinedSubTask instead of TodoType
     */
    todoTypesids: [
      {
        todoTypeId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'PredefinedSubTask',
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
      comment: 'Reference to the template used to create this todo (for auto todos)',
    },
    priority: {
      type: Number,
      default: 1,
      min: 1,
      max: 5,
      comment: 'Priority level (1 = lowest, 5 = highest) - inherited from template for auto todos',
    },
    admin_only: {
      type: Boolean,
      default: false,
      index: true,
      comment: 'If true, only visible to admins (used for offer-auto todos initially)',
    },
    due_date: {
      type: Date,
      required: false,
      index: true,
      comment: 'Optional due date for the todo',
    },
    /**
     * Related document IDs attached to this todo/ticket.
     * API passes these as an array of string IDs (documents_ids).
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
      comment: 'Type of todo - Ticket when assigned, Todo when not assigned',
    },
    /**
     * Date when the todo was marked as done
     */
    dateOfDone: {
      type: Date,
      required: false,
      index: true,
      comment: 'Date when the todo was marked as done',
    },
    /**
     * Human-readable duration from createdAt to dateOfDone
     * Format: "2 days 3 hours 15 minutes" or "5 hours 30 minutes" etc.
     */
    completion_duration: {
      type: String,
      required: false,
      comment: 'Human-readable duration from creation to completion',
    },
    /**
     * Ticket status for tracking workflow:
     * - pending: Created but not assigned to anyone
     * - in_progress: Assigned to someone but not completed
     * - done: Marked as completed
     */
    ticket_status: {
      type: String,
      enum: ['pending', 'in_progress', 'done'],
      default: 'pending',
      index: true,
      comment: 'Workflow status: pending (unassigned), in_progress (assigned), done (completed)',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Create compound indexes for common queries
todoSchema.index({ lead_id: 1, isDone: 1 });
todoSchema.index({ creator_id: 1, isDone: 1 });
todoSchema.index({ lead_id: 1, active: 1 });
todoSchema.index({ assigned_to: 1, isDone: 1 });
todoSchema.index({ assigned_to: 1, active: 1 });
todoSchema.index({ assigned_by: 1, active: 1 });
todoSchema.index({ assigned_at: 1 });

// New indexes for offer-based todos
todoSchema.index({ offer_id: 1, active: 1 });
todoSchema.index({ todo_type: 1, admin_only: 1 });
todoSchema.index({ todo_type: 1, isDone: 1 });
todoSchema.index({ admin_only: 1, active: 1 });
todoSchema.index({ priority: 1, due_date: 1 });
todoSchema.index({ offer_id: 1, todo_type: 1 });
todoSchema.index({ template_id: 1 });
todoSchema.index({ type: 1, isDone: 1 });
todoSchema.index({ type: 1, active: 1 });
todoSchema.index({ dateOfDone: 1 });
todoSchema.index({ ticket_status: 1, active: 1 });
todoSchema.index({ ticket_status: 1, offer_id: 1 });

// Virtual for creator name (populated)
todoSchema.virtual('creator', {
  ref: 'User',
  localField: 'creator_id',
  foreignField: '_id',
  justOne: true,
});

// Virtual for lead information (populated)
todoSchema.virtual('lead', {
  ref: 'Lead',
  localField: 'lead_id',
  foreignField: '_id',
  justOne: true,
});

// Virtual for assigned user (populated)
todoSchema.virtual('assignedTo', {
  ref: 'User',
  localField: 'assigned_to',
  foreignField: '_id',
  justOne: true,
});

// Virtual for user who assigned (populated)
todoSchema.virtual('assignedBy', {
  ref: 'User',
  localField: 'assigned_by',
  foreignField: '_id',
  justOne: true,
});

// Virtual for offer information (populated)
todoSchema.virtual('offer', {
  ref: 'Offer',
  localField: 'offer_id',
  foreignField: '_id',
  justOne: true,
});

// Virtual for template information (populated)
todoSchema.virtual('template', {
  ref: 'TodoTemplate',
  localField: 'template_id',
  foreignField: '_id',
  justOne: true,
});

// Virtual for todo type information (populated)
// Now references PredefinedSubTask instead of TodoType
todoSchema.virtual('todoType', {
  ref: 'PredefinedSubTask',
  localField: 'todo_type',
  foreignField: '_id',
  justOne: true,
});

// Pre-save hook to automatically set type and ticket_status
todoSchema.pre('save', function (next) {
  // Set type to "Ticket" if:
  // 1. It's an offer ticket (has offer_id) - offer tickets are always tickets
  // 2. It's assigned to someone (has assigned_to)
  // Otherwise, it's a "Todo"
  if (this.offer_id || this.assigned_to) {
    this.type = 'Ticket';
  } else {
    this.type = 'Todo';
  }

  // Compute ticket_status based on isDone and assigned_to:
  // - done: if isDone is true
  // - in_progress: if assigned to someone but not done
  // - pending: not assigned and not done
  if (this.isDone) {
    this.ticket_status = 'done';
  } else if (this.assigned_to) {
    this.ticket_status = 'in_progress';
  } else {
    this.ticket_status = 'pending';
  }

  next();
});

const Todo = mongoose.model('Todo', todoSchema);

module.exports = Todo; 