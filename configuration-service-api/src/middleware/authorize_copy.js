/**
 * Authorization Middleware
 * Role-based access control with database-driven RBAC
 */

const { AuthorizationError } = require('../utils/errorHandler');
const { hasPermission } = require('./roles/rolePermissions');
const logger = require('../utils/logger');

/**
 * Authorize user based on required permission
 */
const authorize = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        throw new AuthorizationError('User not authenticated');
      }
      
      // Check if user has required permission (now async)
      const permitted = await hasPermission(req.user.role, requiredPermission);
      if (!permitted) {
        logger.warn('Authorization failed', {
          userId: req.user._id,
          userRole: req.user.role,
          requiredPermission,
        });
        
        throw new AuthorizationError(
          `You don't have permission to ${requiredPermission.replace(':', ' ')}`
        );
      }
      
      req.userPermission = requiredPermission;
      req.userRole = req.user.role;
      next();
    } catch (error) {
      if (error instanceof AuthorizationError) {
        return res.status(403).json({
          success: false,
          error: error.message,
        });
      }
      
      logger.error('Authorization error', { error: error.message });
      return res.status(500).json({
        success: false,
        error: 'Authorization check failed',
      });
    }
  };
};

module.exports = { authorize };
