/**
 * Authentication Middleware
 * Verifies JWT tokens and extracts user information
 */

const jwt = require('jsonwebtoken');
const { AuthenticationError } = require('../utils/errorHandler');
const logger = require('../utils/logger');

/**
 * Authenticate user via JWT token
 * NOTE: This service doesn't validate user in DB (Auth service owns User data)
 * It only verifies the JWT token signature and extracts user info
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Invalid authentication token' });
    }
    
    try {
      // Verify token
      const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
      const decoded = jwt.verify(token, jwtSecret);
      
      // Attach user to request
      // Trust the token payload (Auth service has already validated the user)
      req.user = {
        _id: decoded._id || decoded.id,
        id: decoded.id || decoded._id,
        login: decoded.login || decoded.username,
        email: decoded.email,
        role: decoded.role,
        sessionId: decoded.sessionId, // For potential session tracking
      };
      
      logger.debug('User authenticated', {
        userId: req.user._id,
        role: req.user.role,
      });
      
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired' });
      }
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Invalid token' });
      }
      throw error;
    }
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(500).json({ error: 'Internal server error during authentication' });
  }
};

/**
 * Admin only middleware
 * Ensures user is Admin or Super Admin (aligned with user-auth-service pattern)
 */
const adminOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  if (req.user.role !== 'Admin' && req.user.role !== 'Super Admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  next();
};

module.exports = {
  authenticate,
  adminOnly,
};

