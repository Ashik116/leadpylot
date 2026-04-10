/**
 * Credential Access Log Model
 * Tracks when administrators view user platform credentials
 * This is a security audit log for compliance and monitoring
 */

const mongoose = require('mongoose');

/**
 * Access action types
 */
const ACCESS_ACTIONS = {
  VIEW_ALL_CREDENTIALS: 'credentials:view_all',
  VIEW_SINGLE_CREDENTIAL: 'credentials:view_single',
  VIEW_DECRYPTED_PASSWORD: 'credentials:view_password',
};

const CredentialAccessLogSchema = new mongoose.Schema(
  {
    // Action type
    action: {
      type: String,
      required: true,
      enum: Object.values(ACCESS_ACTIONS),
      index: true,
    },

    // Admin who accessed the credentials
    accessedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Snapshot of admin details (in case admin is deleted later)
    adminSnapshot: {
      userId: {
        type: String,
        required: true,
      },
      login: {
        type: String,
        required: true,
      },
      role: {
        type: String,
        required: true,
      },
      name: String,
      email: String,
    },

    // User whose credentials were accessed
    targetUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Snapshot of target user details
    targetUserSnapshot: {
      userId: {
        type: String,
        required: true,
      },
      login: {
        type: String,
        required: true,
      },
      role: String,
      name: String,
    },

    // Platform credential details that were accessed
    platformCredential: {
      credentialId: String, // MongoDB ObjectId of the credential
      index: Number, // Legacy field for backward compatibility
      platform_name: String,
      userName: String,
      userEmail: String,
      link: String,
      // Note: We never store the actual password in the log
    },

    // Request information
    requestInfo: {
      ipAddress: {
        type: String,
        required: true,
      },
      userAgent: String,
      method: String,
      path: String,
      // Geolocation (if available)
      location: {
        country: String,
        city: String,
        region: String,
      },
    },

    // Session information
    sessionInfo: {
      sessionId: String,
      deviceInfo: String,
    },

    // Additional metadata
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },

    // Timestamp
    accessedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    // Status of the access attempt
    status: {
      type: String,
      enum: ['success', 'failed', 'denied'],
      default: 'success',
      index: true,
    },

    // Reason for failure/denial (if applicable)
    failureReason: String,
  },
  {
    timestamps: true,
  }
);

// Compound indexes for common queries
CredentialAccessLogSchema.index({ accessedBy: 1, accessedAt: -1 });
CredentialAccessLogSchema.index({ targetUser: 1, accessedAt: -1 });
CredentialAccessLogSchema.index({ 'requestInfo.ipAddress': 1, accessedAt: -1 });
CredentialAccessLogSchema.index({ action: 1, accessedAt: -1 });

/**
 * Static method to log a credential access
 */
CredentialAccessLogSchema.statics.logAccess = async function ({
  action,
  accessedBy,
  adminSnapshot,
  targetUser,
  targetUserSnapshot,
  platformCredential,
  requestInfo,
  sessionInfo,
  metadata,
  status = 'success',
  failureReason,
}) {
  return this.create({
    action,
    accessedBy,
    adminSnapshot,
    targetUser,
    targetUserSnapshot,
    platformCredential,
    requestInfo,
    sessionInfo,
    metadata,
    status,
    failureReason,
    accessedAt: new Date(),
  });
};

/**
 * Static method to get access logs for an admin
 */
CredentialAccessLogSchema.statics.getByAdmin = async function (adminId, options = {}) {
  const { page = 1, limit = 50, startDate, endDate } = options;
  const skip = (page - 1) * limit;

  const query = { accessedBy: adminId };
  
  if (startDate || endDate) {
    query.accessedAt = {};
    if (startDate) query.accessedAt.$gte = new Date(startDate);
    if (endDate) query.accessedAt.$lte = new Date(endDate);
  }

  const [logs, total] = await Promise.all([
    this.find(query)
      .sort({ accessedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('accessedBy', 'login role')
      .populate('targetUser', 'login role')
      .lean(),
    this.countDocuments(query),
  ]);

  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Static method to get access logs for a target user
 */
CredentialAccessLogSchema.statics.getByTargetUser = async function (userId, options = {}) {
  const { page = 1, limit = 50, startDate, endDate } = options;
  const skip = (page - 1) * limit;

  const query = { targetUser: userId };
  
  if (startDate || endDate) {
    query.accessedAt = {};
    if (startDate) query.accessedAt.$gte = new Date(startDate);
    if (endDate) query.accessedAt.$lte = new Date(endDate);
  }

  const [logs, total] = await Promise.all([
    this.find(query)
      .sort({ accessedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('accessedBy', 'login role')
      .populate('targetUser', 'login role')
      .lean(),
    this.countDocuments(query),
  ]);

  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Static method to get recent access logs
 */
CredentialAccessLogSchema.statics.getRecent = async function (options = {}) {
  const { 
    page = 1, 
    limit = 50, 
    action, 
    accessedBy, 
    targetUser,
    ipAddress,
    startDate, 
    endDate,
    status,
  } = options;
  const skip = (page - 1) * limit;

  const query = {};
  if (action) query.action = action;
  if (accessedBy) query.accessedBy = accessedBy;
  if (targetUser) query.targetUser = targetUser;
  if (ipAddress) query['requestInfo.ipAddress'] = ipAddress;
  if (status) query.status = status;
  
  if (startDate || endDate) {
    query.accessedAt = {};
    if (startDate) query.accessedAt.$gte = new Date(startDate);
    if (endDate) query.accessedAt.$lte = new Date(endDate);
  }

  const [logs, total] = await Promise.all([
    this.find(query)
      .sort({ accessedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('accessedBy', 'login role')
      .populate('targetUser', 'login role')
      .lean(),
    this.countDocuments(query),
  ]);

  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Static method to get access statistics
 */
CredentialAccessLogSchema.statics.getStatistics = async function (days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const stats = await this.aggregate([
    {
      $match: {
        accessedAt: { $gte: startDate },
      },
    },
    {
      $facet: {
        byAction: [
          { $group: { _id: '$action', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ],
        byAdmin: [
          { 
            $group: { 
              _id: '$accessedBy', 
              count: { $sum: 1 },
              adminLogin: { $first: '$adminSnapshot.login' },
            } 
          },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ],
        byStatus: [
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ],
        byDay: [
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$accessedAt' } },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: -1 } },
          { $limit: 30 },
        ],
        total: [
          { $count: 'count' },
        ],
      },
    },
  ]);

  const result = stats[0];
  
  return {
    period: `${days} days`,
    totalAccesses: result.total[0]?.count || 0,
    byAction: result.byAction,
    topAdmins: result.byAdmin,
    byStatus: result.byStatus,
    byDay: result.byDay,
  };
};

/**
 * Static method to check for suspicious activity
 * (e.g., same admin viewing many credentials in short time)
 */
CredentialAccessLogSchema.statics.checkSuspiciousActivity = async function (adminId, minutes = 5, threshold = 10) {
  const since = new Date(Date.now() - minutes * 60 * 1000);
  
  const count = await this.countDocuments({
    accessedBy: adminId,
    accessedAt: { $gte: since },
    action: ACCESS_ACTIONS.VIEW_DECRYPTED_PASSWORD,
  });
  
  return {
    isSuspicious: count >= threshold,
    accessCount: count,
    timeWindow: `${minutes} minutes`,
    threshold,
  };
};

const CredentialAccessLog = mongoose.model('CredentialAccessLog', CredentialAccessLogSchema);

module.exports = {
  CredentialAccessLog,
  ACCESS_ACTIONS,
};


