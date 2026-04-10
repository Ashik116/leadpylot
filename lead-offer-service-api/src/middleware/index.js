/**
 * Auth Middleware Index
 * Exports all authentication and authorization middleware
 */

const { authenticate } = require('./authenticate');
const { validateRequest } = require('./validation');
const {
  authorize,
  authorizeAll,
  authorizeAny,
  hasPermission,
  adminOnly: permissionAdminOnly,
  anyAuthenticated,
} = require('./authorize');
const {
  checkRole,
  adminOnly: roleAdminOnly,
  agentOnly,
  managerOnly,
  bankerOnly,
  clientOnly,
  providerOnly,
  adminOrProviderOnly,
  requireAuth,
} = require('./roleCheck');

module.exports = {
  // Authentication middleware
  authenticate,
  validateRequest,
  // Permission-based authorization
  authorize,
  authorizeAll,
  authorizeAny,
  hasPermission,

  // Role-based authorization (simpler approach)
  checkRole,

  // Common middleware shortcuts
  adminOnly: roleAdminOnly, // Use the role-based version instead of permission-based
  permissionAdminOnly, // Keep the permission-based version available if needed

  // Single role checks
  agentOnly,
  managerOnly,
  bankerOnly,
  clientOnly,
  providerOnly,
  adminOrProviderOnly,

  // Authentication check with role requirement
  requireAuth,
  anyAuthenticated,
};
