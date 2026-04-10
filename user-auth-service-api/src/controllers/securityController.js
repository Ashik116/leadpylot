/**
 * Security Controller
 * Handles security-related API endpoints
 */

const {
  getSecurityDashboardData,
} = require('../services/securityService');

const { LoginAttempt, UserSession, IpBlocklist, ATTEMPT_TYPES, SESSION_STATUS, BLOCK_REASONS, BLOCK_TYPES } = require('../models');

/**
 * Get security dashboard data
 */
const getSecurityDashboard = async (req, res) => {
  try {
    const { timeframe = 24, limit = 100, skip = 0 } = req.query;
    
    const data = await getSecurityDashboardData({
      timeframe: parseInt(timeframe),
      limit: parseInt(limit),
      skip: parseInt(skip),
    });

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Get security dashboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get security dashboard data',
    });
  }
};

/**
 * Get failed login attempts
 */
const getFailedLoginAttempts = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      timeframe = 24,
      ipAddress,
      login 
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const timeAgo = new Date(Date.now() - parseInt(timeframe) * 60 * 60 * 1000);

    // Build query
    const query = {
      attemptType: ATTEMPT_TYPES.FAILED,
      createdAt: { $gte: timeAgo }
    };

    if (ipAddress) {
      query.ipAddress = { $regex: ipAddress, $options: 'i' };
    }

    if (login) {
      query.login = { $regex: login, $options: 'i' };
    }

    const [attempts, total] = await Promise.all([
      LoginAttempt.find(query)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip),
      LoginAttempt.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      data: {
        data: attempts, // Changed from "attempts" to "data" to match frontend interface
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error('Get failed login attempts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get failed login attempts',
    });
  }
};

/**
 * Get successful logins with geolocation
 */
const getSuccessfulLogins = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      timeframe = 24,
      userId 
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const timeAgo = new Date(Date.now() - parseInt(timeframe) * 60 * 60 * 1000);

    const query = {
      attemptType: ATTEMPT_TYPES.SUCCESS,
      createdAt: { $gte: timeAgo }
    };

    if (userId) {
      query.userId = userId;
    }

    const [attempts, total] = await Promise.all([
      LoginAttempt.find(query)
        .populate('userId', 'login role')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip),
      LoginAttempt.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      data: {
        data: attempts, // Changed from "attempts" to "data" to match frontend interface
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error('Get successful logins error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get successful logins',
    });
  }
};

/**
 * Get active user sessions (agent board)
 */
const getActiveSessions = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [sessions, total] = await Promise.all([
      UserSession.find({
        status: SESSION_STATUS.ACTIVE,
        expiresAt: { $gt: new Date() }
      })
        .populate('userId', 'login role active')
        .sort({ lastActivity: -1 })
        .limit(parseInt(limit))
        .skip(skip),
      UserSession.countDocuments({
        status: SESSION_STATUS.ACTIVE,
        expiresAt: { $gt: new Date() }
      })
    ]);

    res.status(200).json({
      success: true,
      data: {
        data: sessions, // Changed from "sessions" to "data" for consistency
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error('Get active sessions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get active sessions',
    });
  }
};

/**
 * Get blocked IPs
 */
const getBlockedIPs = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [blockedIPs, total] = await Promise.all([
      IpBlocklist.getActiveBlocks(parseInt(limit), skip),
      IpBlocklist.countDocuments({
        isActive: true,
        $or: [
          { expiresAt: null },
          { expiresAt: { $gt: new Date() } }
        ]
      })
    ]);

    res.status(200).json({
      success: true,
      data: {
        data: blockedIPs, // Changed from "blockedIPs" to "data" for consistency
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error('Get blocked IPs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get blocked IPs',
    });
  }
};

/**
 * Block an IP address manually
 */
const blockIP = async (req, res) => {
  try {
    const { ipAddress, reason, blockType = BLOCK_TYPES.MANUAL, expirationHours = null, notes = '' } = req.body;

    if (!ipAddress || !reason) {
      return res.status(400).json({
        success: false,
        error: 'IP address and reason are required',
      });
    }

    // Validate block reason
    if (!Object.values(BLOCK_REASONS).includes(reason)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid block reason',
      });
    }

    const block = await IpBlocklist.addBlock(
      ipAddress,
      reason,
      blockType,
      expirationHours,
      req.user._id
    );

    // Update notes if provided
    if (notes) {
      block.notes = notes;
      await block.save();
    }

    res.status(201).json({
      success: true,
      data: block,
      message: 'IP address blocked successfully',
    });
  } catch (error) {
    console.error('Block IP error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to block IP address',
    });
  }
};

/**
 * Unblock an IP address
 */
const unblockIP = async (req, res) => {
  try {
    const { id } = req.params;

    const block = await IpBlocklist.findById(id);
    if (!block) {
      return res.status(404).json({
        success: false,
        error: 'Blocked IP not found',
      });
    }

    await block.unblock(req.user._id);

    res.status(200).json({
      success: true,
      message: 'IP address unblocked successfully',
    });
  } catch (error) {
    console.error('Unblock IP error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to unblock IP address',
    });
  }
};

/**
 * Force logout a user session
 */
const forceLogoutSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await UserSession.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
      });
    }

    await session.logout(true); // forced logout

    res.status(200).json({
      success: true,
      message: 'Session terminated successfully',
    });
  } catch (error) {
    console.error('Force logout session error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to terminate session',
    });
  }
};

/**
 * Get security statistics
 */
const getSecurityStats = async (req, res) => {
  try {
    const { timeframe = 24 } = req.query;
    const timeAgo = new Date(Date.now() - parseInt(timeframe) * 60 * 60 * 1000);

    const stats = await Promise.all([
      // Total failed attempts
      LoginAttempt.countDocuments({
        attemptType: ATTEMPT_TYPES.FAILED,
        createdAt: { $gte: timeAgo }
      }),
      // Total successful logins
      LoginAttempt.countDocuments({
        attemptType: ATTEMPT_TYPES.SUCCESS,
        createdAt: { $gte: timeAgo }
      }),
      // Active sessions
      UserSession.countDocuments({
        status: SESSION_STATUS.ACTIVE,
        expiresAt: { $gt: new Date() }
      }),
      // Blocked IPs
      IpBlocklist.countDocuments({
        isActive: true,
        $or: [
          { expiresAt: null },
          { expiresAt: { $gt: new Date() } }
        ]
      }),
      // Unique IPs with failed attempts
      LoginAttempt.distinct('ipAddress', {
        attemptType: ATTEMPT_TYPES.FAILED,
        createdAt: { $gte: timeAgo }
      }),
      // Countries with most failed attempts
      LoginAttempt.aggregate([
        {
          $match: {
            attemptType: ATTEMPT_TYPES.FAILED,
            createdAt: { $gte: timeAgo },
            'geolocation.country': { $ne: null }
          }
        },
        {
          $group: {
            _id: '$geolocation.country',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ])
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalFailedAttempts: stats[0],
        totalSuccessfulLogins: stats[1],
        activeSessionsCount: stats[2],
        blockedIPsCount: stats[3],
        uniqueFailedIPs: stats[4].length,
        topFailedCountries: stats[5],
        timeframe: parseInt(timeframe),
      },
    });
  } catch (error) {
    console.error('Get security stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get security statistics',
    });
  }
};

module.exports = {
  getSecurityDashboard,
  getFailedLoginAttempts,
  getSuccessfulLogins,
  getActiveSessions,
  getBlockedIPs,
  blockIP,
  unblockIP,
  forceLogoutSession,
  getSecurityStats,
};
