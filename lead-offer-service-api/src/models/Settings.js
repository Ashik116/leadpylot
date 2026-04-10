const mongoose = require('mongoose');

const SETTINGS_TYPES = {
  MAIL_SERVERS: 'mailservers',
  VOIP_SERVERS: 'voipservers',
  SYSTEM: 'system',
  EMAIL_TEMPLATES: 'email_templates',
  PAYMENT_TERMS: 'payment_terms',
  BONUS_AMOUNT: 'bonus_amount',
  STAGE: 'stage',
};

const settingsSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: Object.values(SETTINGS_TYPES),
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
  },
  {
    timestamps: true,
  }
);

// Add compound index for type and name for faster lookups
settingsSchema.index({ type: 1, name: 1 }, { unique: true });

const Settings = mongoose.model('Settings', settingsSchema);

module.exports = { Settings, SETTINGS_TYPES };
