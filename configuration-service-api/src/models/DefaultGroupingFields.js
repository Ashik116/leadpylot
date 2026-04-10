const mongoose = require('mongoose');

const defaultGroupingFieldsSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    defaultGroupingFields: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    defaultFilter: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for faster lookups by user_id
defaultGroupingFieldsSchema.index({ user_id: 1 }, { unique: true });

const DefaultGroupingFields = mongoose.model('DefaultGroupingFields', defaultGroupingFieldsSchema);

module.exports = DefaultGroupingFields;


