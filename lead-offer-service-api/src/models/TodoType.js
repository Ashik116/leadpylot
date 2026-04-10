const mongoose = require('mongoose');

/**
 * TodoType Schema
 * Represents a todo type that can be assigned to todos
 */
const todoTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
      minlength: 1,
      maxlength: 100,
      comment: 'Name of the todo type (e.g., "manual", "offer_auto", "email_task")',
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true,
      comment: 'Status of the todo type - active or inactive',
    },
    description: {
      type: String,
      required: false,
      trim: true,
      maxlength: 500,
      comment: 'Optional description of the todo type',
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      comment: 'User who created this todo type',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Create indexes for common queries
todoTypeSchema.index({ status: 1, name: 1 });
todoTypeSchema.index({ name: 1 }, { unique: true });

// Virtual for creator information (populated)
todoTypeSchema.virtual('creator', {
  ref: 'User',
  localField: 'created_by',
  foreignField: '_id',
  justOne: true,
});

const TodoType = mongoose.model('TodoType', todoTypeSchema);

module.exports = TodoType;

