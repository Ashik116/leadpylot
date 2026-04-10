/**
 * Token Service
 * Handles JWT token generation and validation
 */

const jwt = require('jsonwebtoken');

// JWT secret key should be in environment variables in production
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '24h'; // Token expiration time

/**
 * Generate JWT token for a user
 * @param {Object} user - User object
 * @param {string} sessionId - Optional session ID to include in token
 * @returns {string} JWT token
 */
const generateToken = (user, sessionId = null) => {
  const payload = {
    _id: user._id,
    login: user.login,
    role: user.role,
  };

  // Include sessionId in token if provided
  if (sessionId) {
    payload.sessionId = sessionId;
  }

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

/**
 * Verify and decode a JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object|null} - Decoded token payload or null if invalid
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

/**
 * Extract token from authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} - Token or null if not found
 */
const extractTokenFromHeader = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.split(' ')[1] || null;
};

module.exports = {
  generateToken,
  verifyToken,
  extractTokenFromHeader,
  JWT_SECRET, // Export for other modules that might need it
  JWT_EXPIRES_IN,
};

