const mongoose = require('mongoose');

/**
 * Board Schema
 * Represents a Kanban board
 * Cloned from todo-bord-service-api for local board management
 */

const BoardSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  is_system: {
    type: Boolean,
    default: false,
  },
  description: {
    type: String,
    default: "",
  },
  board_type: {
    type: String,
    required: true,
  },
  lists: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'List',
    default: [],
  },
  members: {
    type: [{
      user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      joined_at: {
        type: Date,
        default: Date.now,
      },
    }],
    required: false,
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  updated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  is_archived: {
    type: Boolean,
    default: false,
  },
  is_deleted: {
    type: Boolean,
    default: false,
  },
  deleted_at: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

// Unique index for system board types - ensures each system board type is unique
BoardSchema.index({ board_type: 1, is_system: 1 }, {
  unique: true,
  partialFilterExpression: { is_system: true }
});

// Unique index for board names - ensures each board name is unique
BoardSchema.index({ name: 1 }, { unique: true });

const Board = mongoose.model('Board', BoardSchema);

module.exports = Board;
