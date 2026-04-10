/**
 * Socket.IO Authentication Middleware
 * Handles JWT authentication for Socket.IO connections
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * Socket.IO authentication middleware
 * Verifies JWT token and attaches user information to socket
 * @param {Object} socket - Socket.IO socket instance
 * @param {Function} next - Next middleware function
 */
const authenticateSocket = async (socket, next) => {
  try {
    // Get token from auth or query parameters
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;

    if (!token) {
      logger.warn('Socket connection attempted without token', {
        socketId: socket.id,
        ip: socket.handshake.address
      });
      return next(new Error('Authentication token required'));
    }

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Handle system connections (like IMAP processors)
    if (decoded.role === 'System' && decoded.type === 'system') {
      const systemProcessors = {
        'system-imap-processor': 'IMAP-Processor',
        'system-enhanced-imap-processor': 'Enhanced-IMAP-Processor'
      };

      if (systemProcessors[decoded._id]) {
        socket.userId = decoded._id;
        socket.userRole = 'System';
        socket.userLogin = systemProcessors[decoded._id];
        
        logger.info('System processor connected via Socket.IO', {
          socketId: socket.id,
          userId: socket.userId,
          userRole: socket.userRole,
          userLogin: socket.userLogin,
          service: decoded.service
        });
        
        return next();
      }
    }

    // Get user from database to ensure they still exist and are active
    const user = await User.findById(decoded._id);

    if (!user) {
      logger.warn('Socket connection attempted with invalid user', {
        socketId: socket.id,
        userId: decoded._id
      });
      return next(new Error('User not found'));
    }

    if (!user.active) {
      logger.warn('Socket connection attempted by inactive user', {
        socketId: socket.id,
        userId: user._id,
        login: user.login
      });
      return next(new Error('User account is inactive'));
    }

    // Attach user information to socket
    socket.userId = user._id.toString();
    socket.userRole = user.role;
    socket.userLogin = user.login;

    logger.info('Socket authenticated successfully', {
      socketId: socket.id,
      userId: socket.userId,
      userRole: socket.userRole,
      login: socket.userLogin
    });

    next();
  } catch (error) {
    logger.error('Socket authentication failed', {
      socketId: socket.id,
      error: error.message,
      ip: socket.handshake.address
    });

    if (error.name === 'TokenExpiredError') {
      return next(new Error('Token expired'));
    }

    if (error.name === 'JsonWebTokenError') {
      return next(new Error('Invalid token'));
    }

    next(new Error('Authentication failed'));
  }
};

/**
 * Check if socket user has required role
 * @param {Object} socket - Socket.IO socket instance
 * @param {String|Array} requiredRole - Required role(s)
 * @returns {Boolean} - Whether user has required role
 */
const hasRole = (socket, requiredRole) => {
  if (Array.isArray(requiredRole)) {
    return requiredRole.includes(socket.userRole);
  }
  return socket.userRole === requiredRole;
};

/**
 * Middleware to require specific role for socket event
 * @param {String|Array} requiredRole - Required role(s)
 * @returns {Function} - Middleware function
 */
const requireRole = (requiredRole) => {
  return (socket, next) => {
    if (!hasRole(socket, requiredRole)) {
      logger.warn('Socket access denied - insufficient role', {
        socketId: socket.id,
        userId: socket.userId,
        userRole: socket.userRole,
        requiredRole
      });
      return next(new Error('Insufficient permissions'));
    }
    next();
  };
};

module.exports = {
  authenticateSocket,
  hasRole,
  requireRole,
}; 