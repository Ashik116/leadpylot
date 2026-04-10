/**
 * Audit Service
 * Handles audit log operations
 */

const { AuditLog, AUDIT_ACTIONS } = require('../models/AuditLog');
const logger = require('../utils/logger');

/**
 * Get audit logs with filtering
 */
const getAuditLogs = async (options = {}) => {
  const { 
    page = 1, 
    limit = 50, 
    entityType, 
    entityId, 
    action, 
    performedBy,
    startDate,
    endDate,
  } = options;
  
  const query = {};
  
  if (entityType) query.entityType = entityType;
  if (entityId) query.entityId = entityId;
  if (action) query.action = action;
  if (performedBy) query.performedBy = performedBy;
  
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }
  
  const skip = (page - 1) * limit;
  
  const [logs, total] = await Promise.all([
    AuditLog.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .populate('performedBy', 'login role')
      .lean(),
    AuditLog.countDocuments(query),
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
 * Get audit logs for a specific role
 */
const getRoleAuditLogs = async (roleId, options = {}) => {
  return getAuditLogs({
    ...options,
    entityType: 'role',
    entityId: roleId,
  });
};

/**
 * Get recent permission changes
 */
const getRecentPermissionChanges = async (options = {}) => {
  const { page = 1, limit = 50 } = options;
  const skip = (page - 1) * limit;
  
  const permissionActions = [
    AUDIT_ACTIONS.PERMISSION_ADDED,
    AUDIT_ACTIONS.PERMISSION_REMOVED,
    AUDIT_ACTIONS.PERMISSION_BULK_ADDED,
    AUDIT_ACTIONS.PERMISSION_BULK_REMOVED,
    AUDIT_ACTIONS.ROLE_UPDATED,
  ];
  
  const [logs, total] = await Promise.all([
    AuditLog.find({ action: { $in: permissionActions } })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .populate('performedBy', 'login role')
      .lean(),
    AuditLog.countDocuments({ action: { $in: permissionActions } }),
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
 * Get audit log by ID
 */
const getAuditLogById = async (id) => {
  return AuditLog.findById(id)
    .populate('performedBy', 'login role')
    .lean();
};

/**
 * Get audit statistics
 */
const getAuditStatistics = async (days = 30) => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const stats = await AuditLog.aggregate([
    {
      $match: {
        timestamp: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: '$action',
        count: { $sum: 1 },
      },
    },
    {
      $sort: { count: -1 },
    },
  ]);
  
  const totalChanges = stats.reduce((sum, s) => sum + s.count, 0);
  
  return {
    period: `${days} days`,
    totalChanges,
    byAction: stats.map(s => ({
      action: s._id,
      count: s.count,
      percentage: ((s.count / totalChanges) * 100).toFixed(1),
    })),
  };
};

/**
 * Create audit log entry
 */
const createAuditLog = async (data) => {
  return AuditLog.log(data);
};

module.exports = {
  getAuditLogs,
  getRoleAuditLogs,
  getRecentPermissionChanges,
  getAuditLogById,
  getAuditStatistics,
  createAuditLog,
  AUDIT_ACTIONS,
};
