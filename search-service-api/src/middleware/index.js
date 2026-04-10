/**
 * Middleware Index
 * Exports all middleware functions
 */

const { authenticate } = require('./auth');
const {
  authorize,
  authorizeAll,
  authorizeAny,
  hasPermission,
  hasPermissionSync,
  getRolePermissions,
  adminOnly,
  loadRolePermissionsFromDb,
  updateFallbackPermissions,
  clearPermissionsCache,
  PERMISSIONS,
} = require('./authorize');

module.exports = {
  // Authentication
  authenticate,
  
  // Authorization
  authorize,
  authorizeAll,
  authorizeAny,
  hasPermission,
  hasPermissionSync,
  getRolePermissions,
  adminOnly,
  
  // Permission management
  loadRolePermissionsFromDb,
  updateFallbackPermissions,
  clearPermissionsCache,
  
  // Constants
  PERMISSIONS,
};
