const mongoose = require('mongoose');

/**
 * Task Schema
 * Represents a task in the Kanban board system
 * Cloned from todo-bord-service-api for local task management
 */

// Nested todo schema (subtask under subtask or custom field)
const nestedTodoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  isCompleted: {
    type: Boolean,
    default: false,
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium',
  },
  dueDate: {
    type: Date,
  },
  assigned: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'User',
    default: [],
  },
  isDelete: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, { _id: true });

const taskSchema = new mongoose.Schema({
  board_id: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'Board'
  },
  list_id: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'List'
  },

  note: {
    type: String,
  },
  task_type: {
    type: String,
    enum: ['lead','offer','opening','email','custom']
  },
  // Position of this task within its list
  // Used for drag-and-drop ordering within Kanban columns
  // Trello-style floating-point positions
  position: {
    type: Number,
    default: 0,
  },
  custom_fields: {
    type: [{
      title: {
        type: String,
        required: true,
      },
      description: {
        type: String,
      },
      value: {
        type: String,
      },
      field_type: {
        type: String,
        default: 'text',
      },
      options: {
        type: [String],
      },
      // Nested todos under custom field
      todo: {
        type: [nestedTodoSchema],
        default: [],
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
      updatedAt: {
        type: Date,
        default: Date.now,
      },
    }],
    default: [],
  },
  labels: {
    type: [{
      title: {
        type: String,
        required: true,
      },
      color: {
        type: String,
        trim: true,
        default: '#3b82f6',
      },
      isSelected: {
        type: Boolean,
        default: true,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
      updatedAt: {
        type: Date,
        default: Date.now,
      },
    }],
    default: [],
  },
  taskTitle: {
    type: String,
    required: true,
    trim: true,
  },
  taskDescription: {
    type: String,
    trim: true,
  },
  assigned: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'User',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  status: {
    type: String,
    trim: true,
  },
  lead_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead'
  },
  offer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Offer'
  },
  opening_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Opening'
  },
  email_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Email'
  },
  isCompleted: {
    type: Boolean,
    default: false,
  },
  subTask: {
    type: [{
      taskTitle: {
        type: String,
        required: true,
        trim: true,
      },
      taskDescription: {
        type: String,
        trim: true,
      },
      assigned: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      status: {
        type: String,
        trim: true,
      },
      priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium',
      },
      dueDate: {
        type: Date,
      },
      attachment: {
        type: [String],
        trim: true,
      },
      internalChat: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'InternalChat',
        },
      ],
      isCompleted: {
        type: Boolean,
        default: false,
      },
      // Predefined subtask tracking
      is_predefined: {
        type: Boolean,
        default: false,
      },
      predefined_subtask_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PredefinedSubTask',
      },
      // Nested todos under subtask (sub-subtasks)
      todo: {
        type: [nestedTodoSchema],
        default: [],
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
      updatedAt: {
        type: Date,
        default: Date.now,
      },
    }],
    required: false,
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium',
  },
  dueDate: {
    type: Date,
  },
  attachment: {
    type: [String],
    trim: true,
  },
  internalChat: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InternalChat',
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: false,
});

// Indexes for optimized queries
taskSchema.index({ createdBy: 1 }); // Optimize authorization checks
taskSchema.index({ assigned: 1 }); // Optimize authorization checks
taskSchema.index({ createdBy: 1, assigned: 1 }); // Compound index for chat authorization
taskSchema.index({ list_id: 1 }); // Single index for list filtering
taskSchema.index({ board_id: 1 }); // Single index for board filtering
taskSchema.index({ lead_id: 1 }); // Index for lead filtering
taskSchema.index({ offer_id: 1 }); // Index for offer filtering
taskSchema.index({ createdAt: -1 }); // Optimize sorting by creation date
// Index for position-based sorting within lists (Kanban drag-and-drop)
taskSchema.index({ list_id: 1, position: 1 }); // Efficient task ordering within a list

const Task = mongoose.model('Task', taskSchema);

module.exports = Task;
