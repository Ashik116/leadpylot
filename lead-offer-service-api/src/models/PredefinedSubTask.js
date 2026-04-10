const mongoose = require('mongoose');

/**
 * PredefinedSubTask Schema
 * Represents a reusable subtask template
 * Cloned from todo-bord-service-api for local predefined subtask management
 */

// Nested todo schema (subtask under subtask)
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
  isDeleted: {
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

const predefinedSubTaskSchema = new mongoose.Schema({
  taskTitle: {
    type: String,
    required: true,
    trim: true,
  },
  taskDescription: {
    type: String,
    trim: true,
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium',
  },
  estimatedDuration: {
    type: Number, // in minutes
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PredefinedSubTaskCat',
    trim: true,
  },
  tags: {
    type: [String],
    default: [],
  },
  // Nested todos under predefined subtask
  todo: {
    type: [nestedTodoSchema],
    default: [],
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// Index for searching predefined subtasks
predefinedSubTaskSchema.index({ taskTitle: 'text', taskDescription: 'text' });
predefinedSubTaskSchema.index({ category: 1 });
predefinedSubTaskSchema.index({ isActive: 1 });
predefinedSubTaskSchema.index({ createdBy: 1 });

const PredefinedSubTask = mongoose.model('PredefinedSubTask', predefinedSubTaskSchema);

module.exports = PredefinedSubTask;
