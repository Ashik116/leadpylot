/**
 * - user:create - Can create users
 * - user:read:all - Can read all users
 * - user:read:own - Can read own user data only
 */
const PERMISSIONS = {
  // User permissions
  USER_READ: 'user:read:own', // Read own user data
  USER_READ_ALL: 'user:read:all', // Read all users data

  // Search permissions
  SEARCH_EXECUTE: 'search:execute', // Execute search queries
  SEARCH_READ_OWN: 'search:read:own', // Read own search results
  SEARCH_READ_ALL: 'search:read:all', // Read all search results

  // Metadata permissions
  METADATA_READ: 'metadata:read', // Read metadata

  // Admin permissions
  ADMIN_ACCESS: 'admin:read:all', // Admin access
};

module.exports = {
  PERMISSIONS,
};
