const mongoose = require('mongoose');

/**
 * Bank Schema
 * Financial institution information for offers and payments
 */
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
  
    bank_country_flag: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
    },
  
    bank_country_code:{
      type: String,
      index: true,
    }

  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance
BankSchema.index({ state: 1 });
BankSchema.index({ is_allow: 1 });
BankSchema.index({ name: 1 });
BankSchema.index({ nickName: 1 });
BankSchema.index({ projects: 1 });

/**
 * Check if bank is accessible by a specific agent
 * @param {ObjectId} agentId - Agent's user ID
 * @returns {Boolean}
 */
BankSchema.methods.isAccessibleBy = function (agentId) {
  // If not restricted, accessible by all
  if (!this.isRestricted) {
    return true;
  }

  // If restricted, check if agent is in allowed list
  if (!this.allowedAgents || this.allowedAgents.length === 0) {
    return false;
  }

  const agentIdStr = agentId.toString();
  return this.allowedAgents.some(id => id.toString() === agentIdStr);
};

/**
 * Check if bank is associated with a specific project
 * @param {ObjectId} projectId - Project ID
 * @returns {Boolean}
 */
BankSchema.methods.hasProject = function (projectId) {
  if (!this.projects || this.projects.length === 0) {
    return false;
  }

  const projectIdStr = projectId.toString();
  return this.projects.some(id => id.toString() === projectIdStr);
};

/**
 * Transform bank data for API response
 * Maps database field names to frontend-friendly names
 * @returns {Object} Formatted bank object
 */
BankSchema.methods.toResponse = function () {
  const obj = this.toObject();

  // Map bank_country_flag → country_flag for frontend consistency
  if (obj.bank_country_flag) {
    obj.country_flag = obj.bank_country_flag;
    delete obj.bank_country_flag;
  }

  return obj;
};

/**
 * Add project to bank's projects array
 * @param {ObjectId} projectId - Project ID to add
 */
BankSchema.methods.addProject = function (projectId) {
  if (!this.projects) {
    this.projects = [];
  }

  if (!this.hasProject(projectId)) {
    this.projects.push(projectId);
  }

  return this;
};

/**
 * Remove project from bank's projects array
 * @param {ObjectId} projectId - Project ID to remove
 */
BankSchema.methods.removeProject = function (projectId) {
  if (!this.projects) {
    return this;
  }

  const projectIdStr = projectId.toString();
  this.projects = this.projects.filter(id => id.toString() !== projectIdStr);

  return this;
};

module.exports = mongoose.model('Bank', BankSchema);

