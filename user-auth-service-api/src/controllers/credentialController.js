/**
 * Credential Controller
 * Handles API requests for viewing and managing platform credentials
 */

const User = require('../models/User');
const { CredentialAccessLog, ACCESS_ACTIONS } = require('../models/CredentialAccessLog');
const { hasPermission } = require('../auth/middleware/authorize');
const { PERMISSIONS } = require('../auth/roles/permissions');
const { asyncHandler, AuthorizationError, NotFoundError, ValidationError } = require('../utils/errorHandler');
const { 
  decryptPlatformCredentials, 
  decryptSingleCredential,
  decryptSingleCredentialById 
} = require('../utils/credentialEncryption');
const { verifyPassword } = require('../auth/services/passwordService');
const logger = require('../utils/logger');

/**
 * Helper function to get client IP address
 */
const getClientIp = (req) => {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.ip ||
    'unknown'
  );
};

/**
 * Helper function to create admin snapshot
 */
const createAdminSnapshot = (admin) => ({
  userId: admin._id.toString(),
  login: admin.login,
  role: admin.role,
  name: admin.info?.name || admin.info?.firstName || null,
  email: admin.info?.email || null,
});

/**
 * Helper function to create target user snapshot
 */
const createUserSnapshot = (user) => ({
  userId: user._id.toString(),
  login: user.login,
  role: user.role,
  name: user.info?.name || user.info?.firstName || null,
});

/**
 * Helper function to create request info
 */
const createRequestInfo = (req) => ({
  ipAddress: getClientIp(req),
  userAgent: req.headers['user-agent'] || 'unknown',
  method: req.method,
  path: req.originalUrl,
});

/**
 * Get all platform credentials for a user (passwords remain encrypted)
 * GET /credentials/user/:userId
 */
const getUserCredentials = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const admin = req.user;

  // Check admin permission
  if (!(await hasPermission(admin.role, PERMISSIONS.USER_READ_ALL))) {
    throw new AuthorizationError('You do not have permission to view user credentials');
  }

  // Get user with credentials
  const user = await User.findById(userId)
    .select('login role info other_platform_credentials')
    .lean();

  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Log the access
  await CredentialAccessLog.logAccess({
    action: ACCESS_ACTIONS.VIEW_ALL_CREDENTIALS,
    accessedBy: admin._id,
    adminSnapshot: createAdminSnapshot(admin),
    targetUser: user._id,
    targetUserSnapshot: createUserSnapshot(user),
    platformCredential: {
      index: -1, // -1 indicates all credentials
      platform_name: 'ALL',
    },
    requestInfo: createRequestInfo(req),
    sessionInfo: {
      sessionId: req.sessionID || null,
    },
    status: 'success',
  });

  // Return credentials with encrypted passwords
  res.status(200).json({
    status: 'success',
    data: {
      userId: user._id,
      login: user.login,
      credentials: (user.other_platform_credentials || []).map((cred) => ({
        _id: cred._id ? cred._id.toString() : null,
        platform_name: cred.platform_name,
        userName: cred.userName,
        userEmail: cred.userEmail,
        link: cred.link,
        hasPassword: !!cred.userPass,
        // Password is NOT returned here - must use the decrypt endpoint
      })),
      totalCredentials: (user.other_platform_credentials || []).length,
    },
  });
});

/**
 * Get decrypted password for a specific platform credential (OLD ENDPOINT - no password validation)
 * POST /credentials/user/:userId/decrypt/:credentialId
 */
const decryptCredentialPasswordOld = asyncHandler(async (req, res) => {
  const { userId, credentialId } = req.params;
  const admin = req.user;

  // Check admin permission - require special permission for viewing passwords
  if (!(await hasPermission(admin.role, PERMISSIONS.USER_READ_ALL))) {
    // Log failed access attempt
    await CredentialAccessLog.logAccess({
      action: ACCESS_ACTIONS.VIEW_DECRYPTED_PASSWORD,
      accessedBy: admin._id,
      adminSnapshot: createAdminSnapshot(admin),
      targetUser: userId,
      targetUserSnapshot: { userId, login: 'unknown', role: 'unknown' },
      platformCredential: { credentialId, platform_name: 'unknown' },
      requestInfo: createRequestInfo(req),
      status: 'denied',
      failureReason: 'Insufficient permissions',
    });

    throw new AuthorizationError('You do not have permission to view decrypted credentials');
  }

  // Check for suspicious activity
  const suspiciousCheck = await CredentialAccessLog.checkSuspiciousActivity(admin._id, 5, 20);
  if (suspiciousCheck.isSuspicious) {
    // Log the suspicious activity attempt
    await CredentialAccessLog.logAccess({
      action: ACCESS_ACTIONS.VIEW_DECRYPTED_PASSWORD,
      accessedBy: admin._id,
      adminSnapshot: createAdminSnapshot(admin),
      targetUser: userId,
      targetUserSnapshot: { userId, login: 'unknown', role: 'unknown' },
      platformCredential: { credentialId, platform_name: 'unknown' },
      requestInfo: createRequestInfo(req),
      status: 'denied',
      failureReason: `Suspicious activity detected: ${suspiciousCheck.accessCount} password views in ${suspiciousCheck.timeWindow}`,
      metadata: { suspiciousCheck },
    });

    return res.status(429).json({
      status: 'error',
      error: 'Too many credential access requests. Please wait before trying again.',
      details: {
        accessCount: suspiciousCheck.accessCount,
        timeWindow: suspiciousCheck.timeWindow,
        threshold: suspiciousCheck.threshold,
      },
    });
  }

  // Get user with credentials
  const user = await User.findById(userId)
    .select('login role info other_platform_credentials')
    .lean();

  if (!user) {
    await CredentialAccessLog.logAccess({
      action: ACCESS_ACTIONS.VIEW_DECRYPTED_PASSWORD,
      accessedBy: admin._id,
      adminSnapshot: createAdminSnapshot(admin),
      targetUser: userId,
      targetUserSnapshot: { userId, login: 'unknown', role: 'unknown' },
      platformCredential: { credentialId, platform_name: 'unknown' },
      requestInfo: createRequestInfo(req),
      status: 'failed',
      failureReason: 'User not found',
    });

    throw new NotFoundError('User not found');
  }

  // Find credential by ID
  const credential = user.other_platform_credentials?.find(
    cred => cred._id && cred._id.toString() === credentialId.toString()
  );

  if (!credential) {
    await CredentialAccessLog.logAccess({
      action: ACCESS_ACTIONS.VIEW_DECRYPTED_PASSWORD,
      accessedBy: admin._id,
      adminSnapshot: createAdminSnapshot(admin),
      targetUser: user._id,
      targetUserSnapshot: createUserSnapshot(user),
      platformCredential: { credentialId, platform_name: 'unknown' },
      requestInfo: createRequestInfo(req),
      status: 'failed',
      failureReason: 'Credential not found with the specified ID',
    });

    throw new NotFoundError('Credential not found with the specified ID');
  }

  // Decrypt the single credential by ID
  let decryptedCredential;
  try {
    decryptedCredential = decryptSingleCredentialById(user.other_platform_credentials, credentialId);
  } catch (error) {
    // Log the error if it's a bcrypt hash issue
    await CredentialAccessLog.logAccess({
      action: ACCESS_ACTIONS.VIEW_DECRYPTED_PASSWORD,
      accessedBy: admin._id,
      adminSnapshot: createAdminSnapshot(admin),
      targetUser: user._id,
      targetUserSnapshot: createUserSnapshot(user),
      platformCredential: {
        credentialId,
        platform_name: credential.platform_name || 'unknown',
        userName: credential.userName || null,
        userEmail: credential.userEmail || null,
        link: credential.link || null,
      },
      requestInfo: createRequestInfo(req),
      status: 'failed',
      failureReason: error.message,
    });

    return res.status(400).json({
      status: 'error',
      error: error.message,
      message: 'This credential was created with the old encryption method (bcrypt) which cannot be decrypted. Please update the credential with a new password.',
    });
  }

  // Log successful access
  await CredentialAccessLog.logAccess({
    action: ACCESS_ACTIONS.VIEW_DECRYPTED_PASSWORD,
    accessedBy: admin._id,
    adminSnapshot: createAdminSnapshot(admin),
    targetUser: user._id,
    targetUserSnapshot: createUserSnapshot(user),
    platformCredential: {
      credentialId,
      platform_name: credential.platform_name || 'unknown',
      userName: credential.userName || null,
      userEmail: credential.userEmail || null,
      link: credential.link || null,
    },
    requestInfo: createRequestInfo(req),
    sessionInfo: {
      sessionId: req.sessionID || null,
    },
    status: 'success',
  });

  res.status(200).json({
    status: 'success',
    data: {
      userId: user._id,
      userLogin: user.login,
      credential: {
        _id: decryptedCredential._id ? decryptedCredential._id.toString() : null,
        platform_name: decryptedCredential.platform_name,
        userName: decryptedCredential.userName,
        userEmail: decryptedCredential.userEmail,
        userPass: decryptedCredential.userPass, // Decrypted password
        link: decryptedCredential.link,
      },
    },
    message: 'This access has been logged for security purposes.',
  });
});

/**
 * Get decrypted password for a specific platform credential (NEW ENDPOINT - with password validation)
 * POST /credentials/user/:userId/decrypt/password/:credentialId
 */
const decryptCredentialPassword = asyncHandler(async (req, res) => {
  const { userId, credentialId } = req.params;
  const { adminPassword } = req.body;
  const admin = req.user;

  // Check if admin password is provided
  if (!adminPassword) {
    throw new ValidationError('Admin password is required');
  }

  // Check admin permission - require special permission for viewing passwords
  if (!(await hasPermission(admin.role, PERMISSIONS.USER_READ_ALL))) {
    // Log failed access attempt
    await CredentialAccessLog.logAccess({
      action: ACCESS_ACTIONS.VIEW_DECRYPTED_PASSWORD,
      accessedBy: admin._id,
      adminSnapshot: createAdminSnapshot(admin),
      targetUser: userId,
      targetUserSnapshot: { userId, login: 'unknown', role: 'unknown' },
      platformCredential: { credentialId, platform_name: 'unknown' },
      requestInfo: createRequestInfo(req),
      status: 'denied',
      failureReason: 'Insufficient permissions',
    });

    throw new AuthorizationError('You do not have permission to view decrypted credentials');
  }

  // Check for suspicious activity
  const suspiciousCheck = await CredentialAccessLog.checkSuspiciousActivity(admin._id, 5, 20);
  if (suspiciousCheck.isSuspicious) {
    // Log the suspicious activity attempt
    await CredentialAccessLog.logAccess({
      action: ACCESS_ACTIONS.VIEW_DECRYPTED_PASSWORD,
      accessedBy: admin._id,
      adminSnapshot: createAdminSnapshot(admin),
      targetUser: userId,
      targetUserSnapshot: { userId, login: 'unknown', role: 'unknown' },
      platformCredential: { credentialId, platform_name: 'unknown' },
      requestInfo: createRequestInfo(req),
      status: 'denied',
      failureReason: `Suspicious activity detected: ${suspiciousCheck.accessCount} password views in ${suspiciousCheck.timeWindow}`,
      metadata: { suspiciousCheck },
    });

    return res.status(429).json({
      status: 'error',
      error: 'Too many credential access requests. Please wait before trying again.',
      details: {
        accessCount: suspiciousCheck.accessCount,
        timeWindow: suspiciousCheck.timeWindow,
        threshold: suspiciousCheck.threshold,
      },
    });
  }

  // Get admin user with password field (needed for verification)
  const adminUser = await User.findById(admin._id).select('password login').lean();
  if (!adminUser) {
    await CredentialAccessLog.logAccess({
      action: ACCESS_ACTIONS.VIEW_DECRYPTED_PASSWORD,
      accessedBy: admin._id,
      adminSnapshot: createAdminSnapshot(admin),
      targetUser: userId,
      targetUserSnapshot: { userId, login: 'unknown', role: 'unknown' },
      platformCredential: { credentialId, platform_name: 'unknown' },
      requestInfo: createRequestInfo(req),
      status: 'failed',
      failureReason: 'Admin user not found',
    });
    throw new NotFoundError('Admin user not found');
  }

  // Verify admin password
  const trimmedPassword = adminPassword ? adminPassword.trim() : '';
  const isPasswordValid = await verifyPassword(trimmedPassword, adminUser.password);
  
  if (!isPasswordValid) {
    // Log failed password attempt
    await CredentialAccessLog.logAccess({
      action: ACCESS_ACTIONS.VIEW_DECRYPTED_PASSWORD,
      accessedBy: admin._id,
      adminSnapshot: createAdminSnapshot(admin),
      targetUser: userId,
      targetUserSnapshot: { userId, login: 'unknown', role: 'unknown' },
      platformCredential: { credentialId, platform_name: 'unknown' },
      requestInfo: createRequestInfo(req),
      status: 'denied',
      failureReason: 'Invalid admin password',
    });

    throw new AuthorizationError('Invalid admin password');
  }

  // Get user with credentials
  const user = await User.findById(userId)
    .select('login role info other_platform_credentials')
    .lean();

  if (!user) {
    await CredentialAccessLog.logAccess({
      action: ACCESS_ACTIONS.VIEW_DECRYPTED_PASSWORD,
      accessedBy: admin._id,
      adminSnapshot: createAdminSnapshot(admin),
      targetUser: userId,
      targetUserSnapshot: { userId, login: 'unknown', role: 'unknown' },
      platformCredential: { credentialId, platform_name: 'unknown' },
      requestInfo: createRequestInfo(req),
      status: 'failed',
      failureReason: 'User not found',
    });

    throw new NotFoundError('User not found');
  }

  // Find credential by ID
  const credential = user.other_platform_credentials?.find(
    cred => cred._id && cred._id.toString() === credentialId.toString()
  );

  if (!credential) {
    await CredentialAccessLog.logAccess({
      action: ACCESS_ACTIONS.VIEW_DECRYPTED_PASSWORD,
      accessedBy: admin._id,
      adminSnapshot: createAdminSnapshot(admin),
      targetUser: user._id,
      targetUserSnapshot: createUserSnapshot(user),
      platformCredential: { credentialId, platform_name: 'unknown' },
      requestInfo: createRequestInfo(req),
      status: 'failed',
      failureReason: 'Credential not found with the specified ID',
    });

    throw new NotFoundError('Credential not found with the specified ID');
  }

  // Decrypt the single credential by ID
  let decryptedCredential;
  try {
    decryptedCredential = decryptSingleCredentialById(user.other_platform_credentials, credentialId);
  } catch (error) {
    // Log the error if it's a bcrypt hash issue
    await CredentialAccessLog.logAccess({
      action: ACCESS_ACTIONS.VIEW_DECRYPTED_PASSWORD,
      accessedBy: admin._id,
      adminSnapshot: createAdminSnapshot(admin),
      targetUser: user._id,
      targetUserSnapshot: createUserSnapshot(user),
      platformCredential: {
        credentialId,
        platform_name: credential.platform_name || 'unknown',
        userName: credential.userName || null,
        userEmail: credential.userEmail || null,
        link: credential.link || null,
      },
      requestInfo: createRequestInfo(req),
      status: 'failed',
      failureReason: error.message,
    });

    return res.status(400).json({
      status: 'error',
      error: error.message,
      message: 'This credential was created with the old encryption method (bcrypt) which cannot be decrypted. Please update the credential with a new password.',
    });
  }

  // Log successful access
  await CredentialAccessLog.logAccess({
    action: ACCESS_ACTIONS.VIEW_DECRYPTED_PASSWORD,
    accessedBy: admin._id,
    adminSnapshot: createAdminSnapshot(admin),
    targetUser: user._id,
    targetUserSnapshot: createUserSnapshot(user),
    platformCredential: {
      credentialId,
      platform_name: credential.platform_name || 'unknown',
      userName: credential.userName || null,
      userEmail: credential.userEmail || null,
      link: credential.link || null,
    },
    requestInfo: createRequestInfo(req),
    sessionInfo: {
      sessionId: req.sessionID || null,
    },
    status: 'success',
  });

  res.status(200).json({
    status: 'success',
    data: {
      userId: user._id,
      userLogin: user.login,
      credential: {
        _id: decryptedCredential._id ? decryptedCredential._id.toString() : null,
        platform_name: decryptedCredential.platform_name,
        userName: decryptedCredential.userName,
        userEmail: decryptedCredential.userEmail,
        userPass: decryptedCredential.userPass, // Decrypted password
        link: decryptedCredential.link,
      },
    },
    message: 'This access has been logged for security purposes.',
  });
});

/**
 * Get credential access logs (admin audit)
 * GET /credentials/access-logs
 */
const getCredentialAccessLogs = asyncHandler(async (req, res) => {
  const admin = req.user;

  // Only super admins can view access logs
  if (!(await hasPermission(admin.role, PERMISSIONS.AUDIT_READ))) {
    throw new AuthorizationError('You do not have permission to view credential access logs');
  }

  const { 
    page = 1, 
    limit = 50, 
    accessedBy, 
    targetUser, 
    action,
    ipAddress,
    startDate, 
    endDate,
    status,
  } = req.query;

  const result = await CredentialAccessLog.getRecent({
    page: parseInt(page),
    limit: parseInt(limit),
    accessedBy,
    targetUser,
    action,
    ipAddress,
    startDate,
    endDate,
    status,
  });

  res.status(200).json({
    status: 'success',
    ...result,
  });
});

/**
 * Get credential access logs for a specific admin
 * GET /credentials/access-logs/admin/:adminId
 */
const getAdminAccessLogs = asyncHandler(async (req, res) => {
  const { adminId } = req.params;
  const admin = req.user;

  // Only super admins can view other admin's logs, or the admin viewing their own
  const isOwnLogs = admin._id.toString() === adminId;
  if (!isOwnLogs && !(await hasPermission(admin.role, PERMISSIONS.AUDIT_READ))) {
    throw new AuthorizationError('You do not have permission to view this admin\'s access logs');
  }

  const { page = 1, limit = 50, startDate, endDate } = req.query;

  const result = await CredentialAccessLog.getByAdmin(adminId, {
    page: parseInt(page),
    limit: parseInt(limit),
    startDate,
    endDate,
  });

  res.status(200).json({
    status: 'success',
    ...result,
  });
});

/**
 * Get credential access logs for a specific target user
 * GET /credentials/access-logs/user/:userId
 */
const getUserAccessLogs = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const admin = req.user;

  if (!(await hasPermission(admin.role, PERMISSIONS.AUDIT_READ))) {
    throw new AuthorizationError('You do not have permission to view user access logs');
  }

  const { page = 1, limit = 50, startDate, endDate } = req.query;

  const result = await CredentialAccessLog.getByTargetUser(userId, {
    page: parseInt(page),
    limit: parseInt(limit),
    startDate,
    endDate,
  });

  res.status(200).json({
    status: 'success',
    ...result,
  });
});

/**
 * Get credential access statistics
 * GET /credentials/access-logs/statistics
 */
const getAccessStatistics = asyncHandler(async (req, res) => {
  const admin = req.user;

  if (!(await hasPermission(admin.role, PERMISSIONS.AUDIT_READ))) {
    throw new AuthorizationError('You do not have permission to view access statistics');
  }

  const { days = 30 } = req.query;

  const statistics = await CredentialAccessLog.getStatistics(parseInt(days));

  res.status(200).json({
    status: 'success',
    data: statistics,
  });
});

module.exports = {
  getUserCredentials,
  decryptCredentialPasswordOld,
  decryptCredentialPassword,
  getCredentialAccessLogs,
  getAdminAccessLogs,
  getUserAccessLogs,
  getAccessStatistics,
};


