const mongoose = require('mongoose');

const columnPreferenceSchema = new mongoose.Schema(
  {
    user_id: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: function () {
          return !this.isDefault;
        },
        index: true,
      },
    ],

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    data: {
      columnOrders: {
        type: Map,
        of: [String],
        default: {},
      },
      columnVisibility: {
        type: Map,
        of: Map,
        default: {},
      },
      isDragModeEnabled: { type: Boolean, default: false },
      hasHydrated: { type: Boolean, default: false },
    },
    
    version: { type: Number, default: 0 },
    isDefault: { type: Boolean, default: false },
  },
  {
    timestamps: true, // adds createdAt and updatedAt automatically
  }
);

// Automatically update updatedAt
columnPreferenceSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// Index for faster lookups
columnPreferenceSchema.index({ user_id: 1 });
columnPreferenceSchema.index({ isDefault: 1 });

const ColumnPreference = mongoose.model('ColumnPreference', columnPreferenceSchema);

module.exports = ColumnPreference;

