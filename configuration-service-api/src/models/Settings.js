const mongoose = require('mongoose');

const SETTINGS_TYPES = {
  // Configuration Service manages these:
  VOIP_SERVERS: 'voipservers',
  PAYMENT_TERMS: 'payment_terms',
  BONUS_AMOUNT: 'bonus_amount',
  STAGE: 'stage',
  SYSTEM: 'system',
  EMAIL_TEMPLATES: 'email_templates',
  };

const settingsSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ['payment_terms', 'bonus_amount', 'stage', 'system', 'mailservers', 'voipservers', 'email_templates'],
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    info: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    gender_type: {
      type: String,
      enum: ['male', 'female', null],
      default: null,
    },
    projects: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Add compound index for type and name for faster lookups
settingsSchema.index({ type: 1, name: 1 }, { unique: true });
settingsSchema.index({ projects: 1 });

const Settings = mongoose.model('Settings', settingsSchema);

module.exports = { Settings, SETTINGS_TYPES };
