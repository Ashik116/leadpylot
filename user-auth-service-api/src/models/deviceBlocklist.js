const mongoose = require('mongoose');

// Device block types
const DEVICE_BLOCK_TYPES = {
  AUTOMATIC: 'automatic',  // System-generated blocks
  MANUAL: 'manual',       // Admin-initiated blocks
  TEMPORARY: 'temporary', // Time-based blocks
  PERMANENT: 'permanent'  // Permanent blocks
};

// Device block reasons
const DEVICE_BLOCK_REASONS = {
  TOO_MANY_FAILED_ATTEMPTS: 'too_many_failed_attempts',
  SUSPICIOUS_ACTIVITY: 'suspicious_activity',
  BRUTE_FORCE_ATTACK: 'brute_force_attack',
  MALWARE_DETECTED: 'malware_detected',
  POLICY_VIOLATION: 'policy_violation',
  MANUAL_BLOCK: 'manual_block',
  SECURITY_BREACH: 'security_breach'
};

const deviceBlocklistSchema = new mongoose.Schema(
  {
    deviceFingerprint: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    blockReason: {
      type: String,
      required: true,
      enum: Object.values(DEVICE_BLOCK_REASONS),
    },
    blockType: {
      type: String,
      required: true,
      enum: Object.values(DEVICE_BLOCK_TYPES),
      default: DEVICE_BLOCK_TYPES.AUTOMATIC,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    blockedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    expiresAt: {
      type: Date,
      default: null, // null = permanent block
      index: true,
    },
    blockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // null for automatic blocks
    },
    // Device information for reference
    lastKnownUserAgent: {
      type: String,
      default: null,
    },
    lastKnownIpAddress: {
      type: String,
      default: null,
    },
    lastKnownGeolocation: {
      country: { type: String, default: null },
      city: { type: String, default: null },
    },
    // Block statistics
    blockCount: {
      type: Number,
      default: 1,
    },
    failedAttemptCount: {
      type: Number,
      default: 0,
    },
    // Metadata
    metadata: {
      unblockedAt: { type: Date, default: null },
      unblockedBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        default: null 
      },
      notes: { type: String, default: null },
    },
  },
  {
    timestamps: true,
    collection: 'device_blocklist',
  }
);

// Indexes for performance
deviceBlocklistSchema.index({ deviceFingerprint: 1, isActive: 1 });
deviceBlocklistSchema.index({ expiresAt: 1 }, { 
  expireAfterSeconds: 0,
  partialFilterExpression: { 
    expiresAt: { $ne: null },
    blockType: DEVICE_BLOCK_TYPES.TEMPORARY 
  }
});

// Instance methods
deviceBlocklistSchema.methods.unblock = function(unblockingUser = null) {
  this.isActive = false;
  this.metadata.unblockedAt = new Date();
  if (unblockingUser) {
    this.metadata.unblockedBy = unblockingUser;
  }
  return this.save();
};

deviceBlocklistSchema.methods.isBlocked = function() {
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
deviceBlocklistSchema.statics.isDeviceBlocked = async function(deviceFingerprint) {
  const block = await this.findOne({
    deviceFingerprint,
    isActive: true,
    $or: [
      { expiresAt: null }, // Permanent blocks
      { expiresAt: { $gt: new Date() } } // Non-expired temporary blocks
    ]
  });
  
  return block ? block.isBlocked() : false;
};

deviceBlocklistSchema.statics.addBlock = function(deviceFingerprint, reason, type = DEVICE_BLOCK_TYPES.AUTOMATIC, expirationHours = null, blockedBy = null, additionalData = {}) {
  const blockData = {
    deviceFingerprint,
    blockReason: reason,
    blockType: type,
    blockedBy,
    isActive: true,
    lastKnownUserAgent: additionalData.userAgent,
    lastKnownIpAddress: additionalData.ipAddress,
    lastKnownGeolocation: additionalData.geolocation,
  };
  
  if (expirationHours && type === DEVICE_BLOCK_TYPES.TEMPORARY) {
    blockData.expiresAt = new Date(Date.now() + expirationHours * 60 * 60 * 1000);
  }
  
  return this.findOneAndUpdate(
    { deviceFingerprint },
    { 
      $set: blockData,
      $inc: { blockCount: 1 }
    },
    { upsert: true, new: true }
  );
};

deviceBlocklistSchema.statics.getActiveBlocks = function(limit = 100, skip = 0) {
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

deviceBlocklistSchema.statics.cleanupExpiredBlocks = function() {
  return this.updateMany(
    {
      isActive: true,
      expiresAt: { $lte: new Date() }
    },
    { 
      $set: { isActive: false },
      $currentDate: { 'metadata.unblockedAt': true }
    }
  );
};

// Export model and constants
const DeviceBlocklist = mongoose.model('DeviceBlocklist', deviceBlocklistSchema);

module.exports = {
  DeviceBlocklist,
  DEVICE_BLOCK_TYPES,
  DEVICE_BLOCK_REASONS,
};
