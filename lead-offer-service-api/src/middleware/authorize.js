/**
 * Authorization Middleware
 * Provides permission-based access control for protected routes
 * 
 * Uses database-driven RBAC with in-memory caching for performance
 */

const { ROLE_PERMISSIONS } = require('./roles/rolePermissions');
const { PERMISSIONS } = require('./roles/permissions');
const User = require('../models/User');
const { getCache, setCache, clearRbacCache, REDIS_KEYS } = require('../config/redis');

// Try to load Role model for DB-driven permissions
let Role = null;
try {
  Role = require('../models/Role');
} catch (e) {
  // Role model not available, will use static permissions
}

// Fallback permissions map (loaded on startup)
let fallbackPermissions = { ...ROLE_PERMISSIONS };

// In-memory cache for role permissions replaced by Redis
// const permissionsCache = new Map();
// const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Load role permissions from database
 */
const loadRolePermissionsFromDb = async () => {
  if (!Role) return fallbackPermissions;

  try {
    const roles = await Role.find({ active: true }).lean();
    const permMap = {};
    for (const role of roles) {
      permMap[role.name] = role.permissions;
      // Cache each role's permissions
      await setCache(REDIS_KEYS.ROLE_PERMISSIONS + role.name, role.permissions);
    }
    fallbackPermissions = { ...ROLE_PERMISSIONS, ...permMap };
    return permMap;
  } catch (error) {
    console.error('Failed to load role permissions from DB:', error.message);
    return fallbackPermissions;
  }
};

/**
 * Get permissions for a role (from cache, DB, or fallback)
 * @param {string} roleName - Role name
 * @returns {Promise<string[]>} - Array of permission keys
 */
const getRolePermissions = async (roleName) => {
  if (!roleName) return [];

  // Check Redis cache first
  const cachedPermissions = await getCache(REDIS_KEYS.ROLE_PERMISSIONS + roleName);
  if (cachedPermissions) {
    return cachedPermissions;
  }

  // Try database if Role model available
  if (Role) {
    try {
      const role = await Role.findOne({ name: roleName, active: true }).lean();
      if (role && role.permissions) {
        await setCache(REDIS_KEYS.ROLE_PERMISSIONS + roleName, role.permissions);
        return role.permissions;
      }
    } catch (error) {
      console.error(`Error loading role ${roleName} from DB:`, error.message);
    }
  }

  // Fallback to static permissions
  return  ROLE_PERMISSIONS[roleName] || [];
};

/**
 * Check if a role has a specific permission (async with caching)
 * @param {string} role - The user's role
 * @param {string} permission - The permission to check
 * @returns {Promise<boolean>} - Whether the role has the permission
 */
const hasPermission = async (role, permission) => {
  if (!role || !permission) return false;

  const permissions = await getRolePermissions(role);
  return permissions.includes(permission.toLowerCase()) || permissions.includes(permission);
};

/**
 * Synchronous permission check (uses fallback, for backward compatibility)
 * @param {string} role - The user's role
 * @param {string} permission - The permission to check
 * @returns {boolean} - Whether the role has the permission
 */
const hasPermissionSync = (role, permission) => {
  if (!role || !permission) return false;

  const permissions = fallbackPermissions[role] || ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission.toLowerCase()) || permissions.includes(permission);
};

/**
 * Permission-based authorization middleware
 * @param {string} requiredPermission - The permission required to access the route
 * @returns {function} - Express middleware function
 */
const authorize = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      // Check if user exists in request
      if (!req.user || !req.user._id) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Fetch the latest user info from database to ensure up-to-date role
      const latestUserInfo = await User.findById(req.user._id).lean();

      // If user not found in database, they may have been deleted
      if (!latestUserInfo) {
        return res.status(401).json({ error: 'User no longer exists' });
      }

      // Use the role from database, not from token
      const userRole = latestUserInfo.role;

      if (!userRole) {
        return res.status(401).json({ error: 'User role not found' });
      }

      // Add the latest user info to request for controllers to use
      req.user = {
        ...req.user,
        role: userRole,
        unmask: latestUserInfo.unmask,
        _fresh: latestUserInfo,
      };

      // Check if user's role has the required permission (async with caching)
      const permitted = await hasPermission(userRole, requiredPermission);
      if (!permitted) {
        return res.status(403).json({
          error: "Access denied. You don't have permission to access this resource.",
          requiredPermission,
        });
      }

      // User has required permission, proceed
      next();
    } catch (error) {
      console.error('Authorization error:', error);
      res.status(500).json({ error: 'Internal server error during authorization' });
    }
  };
};

/**
 * Middleware for requiring multiple permissions (ALL of them)
 * @param {string[]} requiredPermissions - Array of permissions required
 * @returns {function} - Express middleware function
 */
const authorizeAll = (requiredPermissions) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user._id) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const latestUserInfo = await User.findById(req.user._id).lean();

      if (!latestUserInfo) {
        return res.status(401).json({ error: 'User no longer exists' });
      }

      const userRole = latestUserInfo.role;

      if (!userRole) {
        return res.status(401).json({ error: 'User role not found' });
      }

      req.user = {
        ...req.user,
        role: userRole,
        unmask: latestUserInfo.unmask,
        _fresh: latestUserInfo,
      };

      // Admin has all permissions
      if (userRole === 'Admin') {
        return next();
      }

      // Check if user's role has ALL the required permissions
      const permissions = await getRolePermissions(userRole);
      const hasAll = requiredPermissions.every((p) =>
        permissions.includes(p.toLowerCase()) || permissions.includes(p)
      );

      if (!hasAll) {
        return res.status(403).json({
          error: "Access denied. You don't have sufficient permissions for this resource.",
          requiredPermissions,
        });
      }

      next();
    } catch (error) {
      console.error('Authorization error:', error);
      res.status(500).json({ error: 'Internal server error during authorization' });
    }
  };
};

/**
 * Middleware for requiring at least one of the specified permissions
 * @param {string[]} requiredPermissions - Array of permissions, at least one is required
 * @returns {function} - Express middleware function
 */
const authorizeAny = (requiredPermissions) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user._id) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const latestUserInfo = await User.findById(req.user._id).lean();

      if (!latestUserInfo) {
        return res.status(401).json({ error: 'User no longer exists' });
      }

      const userRole = latestUserInfo.role;

      if (!userRole) {
        return res.status(401).json({ error: 'User role not found' });
      }

      req.user = {
        ...req.user,
        role: userRole,
        unmask: latestUserInfo.unmask,
        _fresh: latestUserInfo,
      };

      // Admin has all permissions
      if (userRole === 'Admin') {
        return next();
      }

      // Check if user's role has ANY of the required permissions
      const permissions = await getRolePermissions(userRole);
      const hasAny = requiredPermissions.some((p) =>
        permissions.includes(p.toLowerCase()) || permissions.includes(p)
      );

      if (!hasAny) {
        return res.status(403).json({
          error: "Access denied. You don't have permission to access this resource.",
          requiredPermissions,
        });
      }

      next();
    } catch (error) {
      console.error('Authorization error:', error);
      res.status(500).json({ error: 'Internal server error during authorization' });
    }
  };
};

// Role-based shortcuts for common authorization patterns
const adminOnly = authorize(PERMISSIONS.ADMIN_ACCESS);

/**
 * Any authenticated user middleware - just checks if user is logged in
 */
const anyAuthenticated = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

/**
 * Update fallback permissions (called when roles are updated)
 */
const updateFallbackPermissions = (newPermissions) => {
  fallbackPermissions = { ...fallbackPermissions, ...newPermissions };
};

/**
 * Clear permissions cache (called when roles are updated)
 */
const clearPermissionsCache = async () => {
  await clearRbacCache();
};

module.exports = {
  authorize,
  authorizeAll,
  authorizeAny,
  hasPermission,
  hasPermissionSync,
  getRolePermissions,
  adminOnly,
  anyAuthenticated,
  loadRolePermissionsFromDb,
  updateFallbackPermissions,
  clearPermissionsCache,
  PERMISSIONS,
};
