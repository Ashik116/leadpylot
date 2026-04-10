const mongoose = require('mongoose');

/**
 * Source Schema
 * Represents a lead source in the system
 */
const SourceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Source name is required'],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: 0,
    },
    provider_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      // Optional field - not required
    },
    lead_count: {
      type: Number,
      default: 0,
      min: 0,
    },
    active: {
      type: Boolean,
      default: true,
    },
    color: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
    // Add virtuals to JSON output
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Create indexes for common queries
SourceSchema.index({ provider_id: 1 });
SourceSchema.index({ active: 1 });

/**
 * Virtual for provider - allows for populating provider directly
 */
SourceSchema.virtual('provider', {
  ref: 'User',
  localField: 'provider_id',
  foreignField: '_id',
  justOne: true,
});

/**
 * Create a formatted response object for API
 */
SourceSchema.methods.toResponse = function () {
  // Format the provider data if it exists
  let provider = null;
  if (this.populated('provider_id') && this.provider_id) {
    const providerData = this.provider_id;
    provider = {
      _id: providerData._id,
      name: providerData.info?.name,
      email: providerData.info?.email,
      login: providerData.login,
      role: providerData.role,
    };
  } else if (this.provider_id) {
    provider = this.provider_id;
  }

  return {
    _id: this._id,
    name: this.name,
    price: this.price,
    color: this.color ?? null,
    provider: provider,
    lead_count: this.lead_count,
    active: this.active,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

module.exports = mongoose.model('Source', SourceSchema);
