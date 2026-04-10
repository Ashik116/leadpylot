/**
 * Role Definitions
 * This file defines all possible roles in the system and their hierarchy
 */

/**
 * All available roles in the system
 * @type {Object}
 */
const ROLES = {
  ADMIN: 'Admin',
  AGENT: 'Agent',
  MANAGER: 'Manager',
  BANKER: 'Banker',
  CLIENT: 'Client',
  PROVIDER: 'Provider',
};

/**
 * Role hierarchy (optional)
 * Each role is mapped to an array of roles that inherit from it
 * This does NOT mean a role inherits permissions from roles in its array
 * @type {Object}
 */
const ROLE_HIERARCHY = {
  [ROLES.ADMIN]: [], // Admin doesn't inherit from any roles
  [ROLES.MANAGER]: [], // Manager doesn't inherit from any roles
  [ROLES.BANKER]: [], // Banker doesn't inherit from any roles
  [ROLES.AGENT]: [], // Agent doesn't inherit from any roles
  [ROLES.CLIENT]: [], // Client doesn't inherit from any roles
  [ROLES.PROVIDER]: [], // Provider doesn't inherit from any roles
};

module.exports = {
  ROLES,
  ROLE_HIERARCHY,
};

