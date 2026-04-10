const mongoose = require('mongoose');

// Login attempt types
const ATTEMPT_TYPES = {
  SUCCESS: 'success',
  FAILED: 'failed',
  BLOCKED: 'blocked',
};

// Login attempt results
const ATTEMPT_RESULTS = {
  SUCCESS: 'success',
  INVALID_CREDENTIALS: 'invalid_credentials',
  ACCOUNT_DISABLED: 'account_disabled',
  IP_BLOCKED: 'ip_blocked',
  DEVICE_BLOCKED: 'device_blocked', // New: Device-based blocking
  TOO_MANY_ATTEMPTS: 'too_many_attempts',
  DATABASE_ERROR: 'database_error',
};

const loginAttemptSchema = new mongoose.Schema(
  {
    login: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // Can be null for failed attempts with invalid usernames
    },
    ipAddress: {
      type: String,
      required: true,
      index: true,
    },
    userAgent: {
      type: String,
      required: true,
    },
    deviceFingerprint: {
      type: String,
      default: null, // Will be calculated from user agent + other factors
    },
    geolocation: {
      country: { type: String, default: null },
      countryCode: { type: String, default: null },
      region: { type: String, default: null },
      city: { type: String, default: null },
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      timezone: { type: String, default: null },
      isp: { type: String, default: null },
    },
    attemptType: {
      type: String,
      enum: Object.values(ATTEMPT_TYPES),
      required: true,
      index: true,
    },
    attemptResult: {
      type: String,
      enum: Object.values(ATTEMPT_RESULTS),
      required: true,
      index: true,
    },
    sessionId: {
      type: String,
      default: null, // Only for successful logins
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
loginAttemptSchema.index({ createdAt: -1 });
loginAttemptSchema.index({ ipAddress: 1, createdAt: -1 });
loginAttemptSchema.index({ login: 1, createdAt: -1 });
loginAttemptSchema.index({ attemptType: 1, createdAt: -1 });
loginAttemptSchema.index({ userId: 1, createdAt: -1 });

// TTL index to automatically delete old login attempts (keep for 90 days)
loginAttemptSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

// Static methods
loginAttemptSchema.statics.getFailedAttemptsInTimeframe = function(ipOrLogin, timeframe = 15) {
  const timeAgo = new Date(Date.now() - timeframe * 60 * 1000);
  return this.countDocuments({
    $or: [
      { ipAddress: ipOrLogin },
      { login: ipOrLogin }
    ],
    attemptType: ATTEMPT_TYPES.FAILED,
    createdAt: { $gte: timeAgo }
  });
};

loginAttemptSchema.statics.getRecentSuccessfulLogins = function(userId, limit = 10) {
  return this.find({
    userId,
    attemptType: ATTEMPT_TYPES.SUCCESS
  })
  .sort({ createdAt: -1 })
  .limit(limit)
  .select('ipAddress geolocation userAgent deviceFingerprint createdAt');
};

module.exports = {
  LoginAttempt: mongoose.model('LoginAttempt', loginAttemptSchema),
  ATTEMPT_TYPES,
  ATTEMPT_RESULTS,
};
