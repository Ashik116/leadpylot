const mongoose = require('mongoose');

const AllowedSiteSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: [true, 'Site URL is required'],
      trim: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      trim: true,
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

AllowedSiteSchema.pre('save', function (next) {
  if (this.url) {
    this.url = this.url.replace(/\/+$/, '').toLowerCase();
  }
  next();
});

AllowedSiteSchema.methods.toResponse = function () {
  return {
    _id: this._id,
    id: this._id.toString(),
    url: this.url,
    name: this.name,
    active: this.active,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

module.exports = mongoose.model('AllowedSite', AllowedSiteSchema);
