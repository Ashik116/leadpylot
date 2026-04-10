/**
 * Authentication Middleware
 * Verifies JWT tokens and sets user information in request object
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { UserSession, SESSION_STATUS } = require('../models/userSession');
// INACTIVITY SYSTEM DISABLED - Import removed
// const { inactivityService } = require('../../services/inactivityService');

// JWT secret should be in environment variables in production
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * Authenticate middleware - verifies JWT token and sets user in request
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next function
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

    // Verify token
    try {
      const decoded = jwt.verify(token, JWT_SECRET);

      // Get latest user data from database to ensure role is up-to-date
      const currentUser = await User.findById(decoded._id).lean();

      if (!currentUser) {
        return res.status(401).json({ error: 'User no longer exists' });
      }

      if (!currentUser.active) {
        return res.status(401).json({ error: 'User account is inactive' });
      }

      // Check inactivity status - this enforces the "inescapable reason modal"
      // Only apply inactivity monitoring to Agents
      if (currentUser.role === 'Agent' && currentUser.inactivityStatus && currentUser.inactivityStatus !== 'active') {
        // Define routes that are allowed even when inactive
        const allowedInactiveRoutes = [
          '/inactivity/status',
          '/inactivity/submit-reason',
          '/inactivity/heartbeat',
          '/auth/me',        // Allow checking user status
          '/auth/logout'     // Allow logout functionality
        ];
        
        // Check both req.path and req.originalUrl to handle mounted routes
        const requestPath = req.originalUrl || req.path;
        const isAllowedRoute = allowedInactiveRoutes.some(route => 
          requestPath.includes(route)
        );

        if (!isAllowedRoute) {
          // User needs to provide reason or is pending approval
          const responseData = {
            error: 'Inactivity action required',
            inactivityStatus: currentUser.inactivityStatus,
            requiresAction: true
          };

          if (currentUser.inactivityStatus === 'pending_reason') {
            responseData.message = 'You must provide a reason for your inactivity before continuing.';
            responseData.action = 'submit_reason';
            responseData.incidentId = currentUser.currentInactivityId;
          } else if (currentUser.inactivityStatus === 'pending_approval') {
            responseData.message = 'Your inactivity reason is pending admin approval. You cannot access the system until approved.';
            responseData.action = 'wait_for_approval';
            
            // If user has incident details, include them
            if (currentUser.currentInactivityId) {
              try {
                const { UserInactivity } = require('../../models');
                const incident = await UserInactivity.findById(currentUser.currentInactivityId);
                if (incident) {
                  responseData.incident = {
                    submittedAt: incident.submittedAt,
                    reason: incident.reason,
                    status: incident.status,
                    reviewNotes: incident.reviewNotes
                  };
                }
              } catch (incidentError) {
                console.error('Error fetching incident details:', incidentError);
              }
            }
          }

          return res.status(423).json(responseData); // 423 Locked
        }
      }

      // Check if the session is still active (only if sessionId exists in token)
      if (decoded.sessionId) {
        const session = await UserSession.findOne({ 
          sessionId: decoded.sessionId,
          userId: decoded._id 
        });

        if (!session) {
          return res.status(401).json({ error: 'Session not found' });
        }

        if (session.status !== SESSION_STATUS.ACTIVE) {
          return res.status(401).json({ 
            error: 'Session expired or terminated',
            code: 1003 // Custom code for session termination
          });
        }

        if (session.expiresAt <= new Date()) {
          return res.status(401).json({ 
            error: 'Session expired',
            code: 1002 // Token expired code
          });
        }

        // SLIDING EXPIRATION: Check if session needs extending
        const extendWindowMinutes = process.env.SESSION_EXTEND_WINDOW_MINUTES || 30;
        const extendSessionWindow = extendWindowMinutes * 60 * 1000; // Convert minutes to milliseconds
        const timeUntilExpiry = session.expiresAt.getTime() - Date.now();
        const shouldExtendSession = timeUntilExpiry < extendSessionWindow;
        
        if (shouldExtendSession) {
          console.log(`🔄 Sliding expiration: Extending session for user ${decoded._id}`);
        }

        // Update last activity and potentially extend session
        await session.updateLastActivity(shouldExtendSession);
      }

      // Update token data with current user data
      req.user = {
        ...decoded,
        role: currentUser.role, // This ensures the role is the current one from the database
        unmask: currentUser.unmask, // Include unmask field for data privacy control
        view_type: currentUser.view_type, // Include view_type field for masking logic
        inactivityStatus: currentUser.inactivityStatus, // Include inactivity status
      };

      // INACTIVITY SYSTEM COMPLETELY DISABLED - NO ACTIVITY REGISTRATION
      // Register activity for monitoring (only for active agents)
      // if (currentUser.role === 'Agent' && currentUser.inactivityStatus === 'active') {
      //   // Register activity for meaningful requests (not just heartbeat)
      //   const isActivityRoute = req.path.includes('/heartbeat') || 
      //                         req.path.includes('/inactivity/') || 
      //                         req.method === 'POST' || 
      //                         req.method === 'PUT' || 
      //                         req.method === 'DELETE' ||
      //                         // Include important GET requests
      //                         req.path.includes('/dashboards') ||
      //                         req.path.includes('/leads') ||
      //                         req.path.includes('/users/me') ||
      //                         req.path.includes('/status');
      //   
      //   if (isActivityRoute) {
      //     try {
      //       const metadata = {
      //         ipAddress: req.ip || req.connection.remoteAddress,
      //         userAgent: req.headers['user-agent'],
      //         route: req.path,
      //         method: req.method,
      //         timestamp: new Date()
      //       };
      //       
      //       console.log(`🚀 AUTH MIDDLEWARE: Registering activity for ${currentUser.login} on ${req.method} ${req.path}`);
      //       
      //       await inactivityService.registerActivity(
      //         currentUser._id,
      //         decoded.sessionId,
      //         metadata
      //       );
      //     } catch (activityError) {
      //       // Don't fail authentication if activity registration fails
      //       console.error('Failed to register activity:', activityError);
      //     }
      //   }
      // }

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

/**
 * Optional authentication - attempts to authenticate but proceeds even if no token
 * Sets req.user if token is valid, otherwise leaves it undefined
 */
const optionalAuthenticate = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // Proceed without authentication
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return next(); // Proceed without authentication
    }

    // Verify token
    try {
      const decoded = jwt.verify(token, JWT_SECRET);

      // Get latest user data from database to ensure role is up-to-date
      const currentUser = await User.findById(decoded._id).lean();

      if (currentUser && currentUser.active) {
        req.user = {
          ...decoded,
          role: currentUser.role, // Use current role from database
          unmask: currentUser.unmask, // Include unmask field for data privacy control
          view_type: currentUser.view_type, // Include view_type field for masking logic
        };
      }
    } catch (error) {
      // Just proceed without setting user
    }

    next();
  } catch (error) {
    console.error('Optional authentication error:', error);
    next(); // Continue even if there's an error
  }
};

module.exports = {
  authenticate,
  optionalAuthenticate,
};
