const mongoose = require('mongoose');

/**
 * List Schema
 * Represents a list/column in a Kanban board
 * Cloned from todo-bord-service-api for local list management
 */

const listSchema = new mongoose.Schema({
  types: {
    type: String,
    enum: ['todo', 'in_progress', 'completed', 'cancelled'],
    default: 'todo',
  },
  listTitle: {
    type: String,
    required: true,
    trim: true,
  },
  is_system: {
    type: Boolean,
    default: false,
  },
  board_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Board'
  },
  // Position of this list within its parent board
  // Used for drag-and-drop ordering of columns
  // Trello-style floating-point positions
  position: {
    type: Number,
    default: 0,
    index: true, // Index for efficient sorting
  },
  tasks: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
    },
  ],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
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

listSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// Optimized index for fetching lists by board
listSchema.index({ board_id: 1 });

// Compound index for board + position sorting (Kanban column ordering)
listSchema.index({ board_id: 1, position: 1 });

const List = mongoose.model('List', listSchema);

module.exports = List;
