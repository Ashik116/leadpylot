const mongoose = require('mongoose');

// Block reasons
const BLOCK_REASONS = {
  TOO_MANY_FAILED_ATTEMPTS: 'too_many_failed_attempts',
  SUSPICIOUS_ACTIVITY: 'suspicious_activity',
  MANUAL_BLOCK: 'manual_block',
  SECURITY_THREAT: 'security_threat',
  SPAM: 'spam',
};

// Block types
const BLOCK_TYPES = {
  TEMPORARY: 'temporary',
  PERMANENT: 'permanent',
  AUTOMATIC: 'automatic',
  MANUAL: 'manual',
};

const ipBlocklistSchema = new mongoose.Schema(
  {
    ipAddress: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    ipRange: {
      type: String,
      default: null, // For CIDR blocks like 192.168.1.0/24
      index: true,
    },
    blockType: {
      type: String,
      enum: Object.values(BLOCK_TYPES),
      required: true,
      index: true,
    },
    blockReason: {
      type: String,
      enum: Object.values(BLOCK_REASONS),
      required: true,
      index: true,
    },
    blockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // null for automatic blocks
    },
    blockedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    expiresAt: {
      type: Date,
      default: null, // null for permanent blocks
      index: true,
    },
    attemptCount: {
      type: Number,
      default: 0, // Number of failed attempts that led to this block
    },
    lastAttemptAt: {
      type: Date,
      default: null,
    },
    geolocation: {
      country: { type: String, default: null },
      countryCode: { type: String, default: null },
      region: { type: String, default: null },
      city: { type: String, default: null },
      isp: { type: String, default: null },
    },
    notes: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for performance
ipBlocklistSchema.index({ isActive: 1, expiresAt: 1 });
ipBlocklistSchema.index({ blockType: 1, isActive: 1 });
ipBlocklistSchema.index({ blockedAt: -1 });

// TTL index for temporary blocks
ipBlocklistSchema.index(
  { expiresAt: 1 },
  { 
    expireAfterSeconds: 0,
    partialFilterExpression: { 
      expiresAt: { $ne: null },
      blockType: BLOCK_TYPES.TEMPORARY 
    }
  }
);

// Instance methods
ipBlocklistSchema.methods.unblock = function(unblockingUser = null) {
  this.isActive = false;
  this.metadata.unblockedAt = new Date();
  if (unblockingUser) {
    this.metadata.unblockedBy = unblockingUser;
  }
  return this.save();
};

ipBlocklistSchema.methods.isBlocked = function() {
  if (!this.isActive) return false;
  
  // Check if temporary block has expired
  if (this.expiresAt && new Date() > this.expiresAt) {
    this.isActive = false;
    this.save();
    return false;
  }
  
  return true;
};

// Static methods
ipBlocklistSchema.statics.isIpBlocked = async function(ipAddress) {
  const block = await this.findOne({
    $or: [
      { ipAddress, isActive: true },
      { ipRange: { $regex: new RegExp(`^${ipAddress.split('.').slice(0, 3).join('\\.')}\\.`) }, isActive: true }
    ],
    $or: [
      { expiresAt: null }, // Permanent blocks
      { expiresAt: { $gt: new Date() } } // Non-expired temporary blocks
    ]
  });
  
  return block ? block.isBlocked() : false;
};

ipBlocklistSchema.statics.addBlock = function(ipAddress, reason, type = BLOCK_TYPES.AUTOMATIC, expirationHours = null, blockedBy = null) {
  const blockData = {
    ipAddress,
    blockReason: reason,
    blockType: type,
    blockedBy,
    isActive: true,
  };
  
  if (expirationHours && type === BLOCK_TYPES.TEMPORARY) {
    blockData.expiresAt = new Date(Date.now() + expirationHours * 60 * 60 * 1000);
  }
  
  return this.findOneAndUpdate(
    { ipAddress },
    blockData,
    { upsert: true, new: true }
  );
};

ipBlocklistSchema.statics.getActiveBlocks = function(limit = 100, skip = 0) {
  return this.find({
    isActive: true,
    $or: [
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } }
    ]
  })
  .populate('blockedBy', 'login role')
  .sort({ blockedAt: -1 })
  .limit(limit)
  .skip(skip);
};

ipBlocklistSchema.statics.cleanupExpiredBlocks = function() {
  return this.updateMany(
    {
      isActive: true,
      expiresAt: { $lt: new Date() },
      blockType: BLOCK_TYPES.TEMPORARY
    },
    { isActive: false }
  );
};

module.exports = {
  IpBlocklist: mongoose.model('IpBlocklist', ipBlocklistSchema),
  BLOCK_REASONS,
  BLOCK_TYPES,
};
