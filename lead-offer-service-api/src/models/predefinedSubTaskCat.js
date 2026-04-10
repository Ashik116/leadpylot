const mongoose = require('mongoose');

const predefinedSubTaskCatSchema = new mongoose.Schema(
  {
    taskCategoryTitle: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    taskCategoryDescription: {
      type: String,
      trim: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    isStandaloneEnabled: {
      type: Boolean,
      default: true,
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
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

predefinedSubTaskCatSchema.index({
  taskCategoryTitle: 'text',
  taskCategoryDescription: 'text',
  tags: 'text',
});

const PredefinedSubTaskCatModel = mongoose.model(
  'PredefinedSubTaskCat',
  predefinedSubTaskCatSchema
);

module.exports = PredefinedSubTaskCatModel;
