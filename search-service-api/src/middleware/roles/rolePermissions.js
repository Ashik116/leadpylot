/**
 * Role-Permission Mappings
 * This file maps each role to its allowed permissions
 */

const { ROLES } = require('./roleDefinitions');
const { PERMISSIONS } = require('./permissions');

/**
 * Map each role to its allowed permissions
 * @type {Object}
 */
const ROLE_PERMISSIONS = {
  // Admin role has full access to all permissions
  [ROLES.ADMIN]: [
    // Admins have all permissions
    ...Object.values(PERMISSIONS),
  ],

  // Agent role has limited permissions
  [ROLES.AGENT]: [
    PERMISSIONS.USER_READ,
    PERMISSIONS.SEARCH_EXECUTE,
    PERMISSIONS.SEARCH_READ_OWN,
    PERMISSIONS.METADATA_READ,
  ],

  // Manager role
  [ROLES.MANAGER]: [
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_READ_ALL,
    PERMISSIONS.SEARCH_EXECUTE,
    PERMISSIONS.SEARCH_READ_OWN,
    PERMISSIONS.SEARCH_READ_ALL,
    PERMISSIONS.METADATA_READ,
  ],

  // Banker role
  [ROLES.BANKER]: [
    PERMISSIONS.USER_READ,
    PERMISSIONS.SEARCH_EXECUTE,
    PERMISSIONS.SEARCH_READ_OWN,
    PERMISSIONS.METADATA_READ,
  ],

  // Client role
  [ROLES.CLIENT]: [
    PERMISSIONS.USER_READ,
    PERMISSIONS.SEARCH_EXECUTE,
    PERMISSIONS.SEARCH_READ_OWN,
    PERMISSIONS.METADATA_READ,
  ],

  // Provider role
  [ROLES.PROVIDER]: [
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_READ_ALL,
    PERMISSIONS.SEARCH_EXECUTE,
    PERMISSIONS.SEARCH_READ_ALL,
    PERMISSIONS.METADATA_READ,
  ],
};

module.exports = {
  ROLE_PERMISSIONS,
};
