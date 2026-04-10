const mongoose = require('mongoose');

// Session status types
const SESSION_STATUS = {
  ACTIVE: 'active',
  EXPIRED: 'expired',
  LOGGED_OUT: 'logged_out',
  FORCED_LOGOUT: 'forced_logout',
};

const userSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true, // Store hash of JWT token for revocation
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
      required: true,
      index: true,
    },
    deviceInfo: {
      browser: { type: String, default: null },
      browserVersion: { type: String, default: null },
      os: { type: String, default: null },
      osVersion: { type: String, default: null },
      device: { type: String, default: null },
      deviceType: { type: String, default: null }, // mobile, desktop, tablet
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
    status: {
      type: String,
      enum: Object.values(SESSION_STATUS),
      default: SESSION_STATUS.ACTIVE,
      index: true,
    },
    loginTime: {
      type: Date,
      default: Date.now,
      index: true,
    },
    lastActivity: {
      type: Date,
      default: Date.now,
      index: true,
    },
    logoutTime: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
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

// Create compound indexes for performance
userSessionSchema.index({ userId: 1, status: 1, lastActivity: -1 });
userSessionSchema.index({ status: 1, expiresAt: 1 });
userSessionSchema.index({ deviceFingerprint: 1, userId: 1 });

// TTL index to automatically clean up expired sessions
userSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Instance methods
userSessionSchema.methods.updateLastActivity = function(extendSession = false) {
  this.lastActivity = new Date();
  
  // SLIDING EXPIRATION: Extend session if requested
  if (extendSession) {
    const SESSION_DURATION_HOURS = process.env.SESSION_DURATION_HOURS || 24;
    this.expiresAt = new Date(Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000);
  }
  
  return this.save();
};

userSessionSchema.methods.logout = function(forced = false) {
  this.status = forced ? SESSION_STATUS.FORCED_LOGOUT : SESSION_STATUS.LOGGED_OUT;
  this.logoutTime = new Date();
  return this.save();
};

// Static methods
userSessionSchema.statics.getActiveSessions = function(userId) {
  return this.find({
    userId,
    status: SESSION_STATUS.ACTIVE,
    expiresAt: { $gt: new Date() }
  }).sort({ lastActivity: -1 });
};

userSessionSchema.statics.revokeUserSessions = function(userId, exceptSessionId = null) {
  const query = {
    userId,
    status: SESSION_STATUS.ACTIVE
  };
  
  if (exceptSessionId) {
    query.sessionId = { $ne: exceptSessionId };
  }
  
  return this.updateMany(query, {
    status: SESSION_STATUS.FORCED_LOGOUT,
    logoutTime: new Date()
  });
};

userSessionSchema.statics.cleanupExpiredSessions = function() {
  return this.updateMany(
    {
      status: SESSION_STATUS.ACTIVE,
      expiresAt: { $lt: new Date() }
    },
    {
      status: SESSION_STATUS.EXPIRED,
      logoutTime: new Date()
    }
  );
};

module.exports = {
  UserSession: mongoose.model('UserSession', userSessionSchema),
  SESSION_STATUS,
};
