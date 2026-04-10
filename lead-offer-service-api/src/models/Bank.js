const mongoose = require('mongoose');

const BankSchema = new mongoose.Schema(
  {
    // Legacy fields
    id: Number,
    code: String,

    // Bank account information
    account_number: String,
    iban: String,
    swift_code: String,
    account: String,
    Ref: String,
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // Contact information
    phone: String,
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },

    // Bank details
    name: {
      type: String,
      index: true,
    },
    nickName: {
      type: String,
      index: true,
    },
    country: String,
    address: String,
    lei_code: String,
    note: String,

    // Bank status and configuration
    is_default: {
      type: Boolean,
      default: false,
    },
    is_allow: {
      type: Boolean,
      default: true,
      index: true,
    },
    state: {
      type: String,
      enum: ['active', 'blocked', 'stop', 'new'],
      default: 'new',
      index: true,
    },

    // Limits
    min_limit: Number,
    max_limit: Number,

    // Commission percentage (what the bank takes from customer payment)
    commission_percentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
      comment: 'Bank commission percentage deducted from customer payments',
    },

    // Features
    multi_iban: {
      type: Boolean,
      default: false,
    },

    // Associated projects (teams)
    projects: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
      },
    ],

    // Bank logo
    logo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
    },

    // Agent access control
    isRestricted: {
      type: Boolean,
      default: false,
      comment: 'Enable/disable agent access restriction for this bank',
    },
    allowedAgents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        comment: 'Array of user IDs that can see this bank (when isRestricted is true)',
      },
    ],

    // Bank country display
    bank_country_flag: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      comment: 'Reference to country flag image document',
    },
    bank_country_code: {
      type: String,
      index: true,
      comment: 'ISO country code for the bank (e.g. US, DE)',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Create indexes for common queries
BankSchema.index({ state: 1 });
BankSchema.index({ is_allow: 1 });
BankSchema.index({ name: 1 });
BankSchema.index({ nickName: 1 });
BankSchema.index({ projects: 1 });

BankSchema.methods.toResponse = function () {
  return {
    _id: this._id,
    id: this.id || this._id,
    name: this.name,
    nickName: this.nickName,
    iban: this.iban,
    Ref: this.Ref,
    provider: this.provider,
    is_allow: this.is_allow,
    is_default: this.is_default,
    multi_iban: this.multi_iban,
    lei_code: this.lei_code,
    country: this.country,
    address: this.address,
    min_limit: this.min_limit,
    max_limit: this.max_limit,
    commission_percentage: this.commission_percentage,
    state: this.state,
    note: this.note,
    logo: this.logo,
    isRestricted: this.isRestricted,
    allowedAgents: this.allowedAgents,
    bank_country_flag: this.bank_country_flag,
    bank_country_code: this.bank_country_code,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

module.exports = mongoose.model('Bank', BankSchema);
