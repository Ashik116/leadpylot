/**
 * Role-Based Middleware
 * Simple middleware for checking user roles without the full permission system
 * This provides backward compatibility with the existing role-based system
 */

const { ROLES } = require('./roles/roleDefinitions');
const User = require('../models/User');

/**
 * Middleware to verify if the user has the required role
 * @param {string} requiredRole - The role required to access the route
 * @returns {function} - Express middleware function
 */
const checkRole = (requiredRole) => {
  return async (req, res, next) => {
    try {
      // Check if user exists in request
      if (!req.user || !req.user._id) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Fetch latest user data to ensure up-to-date role
      const latestUserInfo = await User.findById(req.user._id).lean();

      // If user not found in database, they may have been deleted
      if (!latestUserInfo) {
        return res.status(401).json({ error: 'User no longer exists' });
      }

      // Update the user info in the request
      req.user = {
        ...req.user,
        role: latestUserInfo.role,
        unmask: latestUserInfo.unmask, // Include unmask field for data privacy control
        _fresh: latestUserInfo,
      };

      // Check if user has a role
      if (!req.user.role) {
        return res.status(403).json({
          error: 'Access denied. User role not defined.',
        });
      }

      // Check if user has the required role - using strict equality
      if (req.user.role !== requiredRole) {
        console.log(
          `Access denied: User role "${req.user.role}" does not match required role "${requiredRole}"`
        );
        console.log('User role type:', typeof req.user.role);
        console.log('Required role type:', typeof requiredRole);
        console.log('Role comparison:', req.user.role === requiredRole);
        return res.status(403).json({
          error: `Access denied. This resource requires ${requiredRole} role. Your role: ${req.user.role}`,
        });
      }

      // User has required role, proceed
      next();
    } catch (error) {
      console.error('Role check error:', error);
      res.status(500).json({ error: 'Internal server error during role check' });
    }
  };
};

/**
 * Role-based middleware shortcuts
 */
const adminOnly = checkRole(ROLES.ADMIN);
const agentOnly = checkRole(ROLES.AGENT);
const managerOnly = checkRole(ROLES.MANAGER);
const bankerOnly = checkRole(ROLES.BANKER);
const clientOnly = checkRole(ROLES.CLIENT);
const providerOnly = checkRole(ROLES.PROVIDER);

/**
 * Check if user is either admin or provider
 */
const adminOrProviderOnly = async (req, res, next) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Fetch latest user data
    const latestUserInfo = await User.findById(req.user._id).lean();

    if (!latestUserInfo) {
      return res.status(401).json({ error: 'User no longer exists' });
    }

    // Update the user info in the request
    req.user = {
      ...req.user,
      role: latestUserInfo.role,
      unmask: latestUserInfo.unmask, // Include unmask field for data privacy control
      _fresh: latestUserInfo,
    };

    if (!req.user.role) {
      return res.status(403).json({ error: 'User role not defined' });
    }

    // Check if user is admin or provider
    if (req.user.role !== ROLES.ADMIN && req.user.role !== ROLES.PROVIDER) {
      return res.status(403).json({
        error: `Access denied. This resource requires Admin or Provider role. Your role: ${req.user.role}`,
      });
    }

    next();
  } catch (error) {
    console.error('Role check error:', error);
    res.status(500).json({ error: 'Internal server error during role check' });
  }
};

/**
 * Middleware to ensure the user is authenticated and has a valid role
 * Now also fetches latest user data from the database
 */
const requireAuth = async (req, res, next) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Fetch latest user data to ensure up-to-date role
    const latestUserInfo = await User.findById(req.user._id).lean();

    // If user not found in database, they may have been deleted
    if (!latestUserInfo) {
      return res.status(401).json({ error: 'User no longer exists' });
    }

    // Update the user info in the request
    req.user = {
      ...req.user,
      role: latestUserInfo.role,
      unmask: latestUserInfo.unmask, // Include unmask field for data privacy control
      _fresh: latestUserInfo,
    };

    if (!req.user.role) {
      return res.status(403).json({ error: 'User role not defined' });
    }

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Internal server error during authentication' });
  }
};

module.exports = {
  checkRole,
  adminOnly,
  agentOnly,
  managerOnly,
  bankerOnly,
  clientOnly,
  providerOnly,
  adminOrProviderOnly,
  requireAuth,
};
