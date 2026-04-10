/**
 * Authentication Middleware
 * Verifies JWT tokens and sets user information in request object
 */

const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const { UserSession, SESSION_STATUS } = require('../../models/UserSession');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * Authenticate middleware - verifies JWT token and sets user in request
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Invalid authentication token' });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);

      // Get latest user data from database
      const currentUser = await User.findById(decoded._id);

      if (!currentUser) {
        return res.status(401).json({ error: 'User no longer exists' });
      }

      if (!currentUser.active) {
        return res.status(401).json({ error: 'User account is inactive' });
      }

      // Check if the session is still active
      if (decoded.sessionId) {
        const session = await UserSession.findOne({ 
          sessionId: decoded.sessionId,
          userId: decoded._id 
        });

        if (!session || session.status !== SESSION_STATUS.ACTIVE || session.expiresAt <= new Date()) {
          return res.status(401).json({ error: 'Session expired or terminated' });
        }

        // Update last activity
        await session.updateLastActivity(true);
      }

      req.user = {
        ...decoded,
        role: currentUser.role,
      };

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
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Internal server error during authentication' });
  }
};

module.exports = { authenticate };

