/**
 * Authentication Service
 * Handles user authentication operations: login, registration, etc.
 *
 * NOTE: This is a simplified version for the microservice.
 * Security features (IP blocking, device fingerprinting) will be added later
 * or handled by API Gateway.
 */

const User = require('../../models/User');
const { generateToken } = require('./tokenService');
const { hashPassword, verifyPassword } = require('./passwordService');
const { ROLES } = require('../roles/roleDefinitions');
const {
  AGENT_TELEGRAM_REQUIRED_MESSAGE,
  isAgentRole,
  hasLinkedTelegramChat,
} = require('../utils/agentTelegramGate');
const { eventEmitter, EVENT_TYPES } = require('../../utils/events');
const { UserSession, SESSION_STATUS } = require('../../models/UserSession');
const crypto = require('crypto');

/**
 * Login a user with username and password
 * @param {string} login - Username
 * @param {string} password - Password
 * @param {Object} metadata - Additional metadata like IP address and user agent
 * @returns {Promise<Object>} - User object and token, or error
 */
const loginUser = async (login, password, metadata = {}) => {
  const ipAddress = metadata?.ipAddress || 'unknown';
  const userAgent = metadata?.userAgent || 'unknown';

  try {
    // Check if credentials are provided
    if (!login || !password) {
      return { success: false, error: 'Login and password are required' };
    }

    // Check MongoDB connection status before querying
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      console.log('MongoDB connection not ready, state:', mongoose.connection.readyState);
      return {
        success: false,
        error: 'Database temporarily unavailable. Please try again in a moment.',
      };
    }

    // Find user by login with increased timeout (15 seconds)
    const user = await Promise.race([
      User.findOne({ login }).populate('image_id'),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Database query timeout - please try again')), 15000)
      ),
    ]);

    if (!user) {
      return { success: false, error: 'Invalid login credentials' };
    }

    // Check if user is active
    if (!user.active) {
      return { success: false, error: 'Account is disabled' };
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password);

    if (!isPasswordValid) {
      return { success: false, error: 'Invalid login credentials' };
    }

    if (isAgentRole(user.role) && !hasLinkedTelegramChat(user)) {
      return { success: false, error: AGENT_TELEGRAM_REQUIRED_MESSAGE };
    }

    // Generate session ID first, then token with sessionId
    const sessionId = crypto.randomUUID();
    const token = generateToken(user, sessionId);
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Create user session
    try {
      // SLIDING EXPIRATION: 24 hours from login
      const SESSION_DURATION_HOURS = process.env.SESSION_DURATION_HOURS || 24;

      await UserSession.create({
        userId: user._id,
        sessionId,
        tokenHash,
        ipAddress,
        userAgent,
        deviceFingerprint: 'placeholder', // TODO: Implement device fingerprinting
        expiresAt: new Date(Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000),
      });
    } catch (sessionError) {
      console.error('Failed to create session:', sessionError);
      // Don't fail login if session creation fails
    }

    // Emit login event for activity logging (don't let this fail the login)
    try {
      eventEmitter.emit(EVENT_TYPES.AUTH.LOGIN, {
        user: {
          _id: user._id,
          login: user.login,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        ipAddress,
        userAgent,
        sessionId,
      });
    } catch (eventError) {
      console.error('Login event emission failed (but login continues):', eventError);
    }

    return {
      success: true,
      data: {
        user: {
          _id: user._id,
          login: user.login,
          role: user.role,
          view_type: (user.view_type && user.view_type.trim()) || 'listView',
          color_code: user.color_code,
          image_id: user.image_id,
          voip_extension: user.voip_extension || null,
          voip_password: user.voip_password || null,
          voip_enabled: user.voip_enabled || false,
        },
        token,
        sessionId,
      },
    };
  } catch (error) {
    console.error('Login error:', {
      message: error.message,
      name: error.name,
      mongoConnectionState: require('mongoose').connection.readyState,
      code: error.code,
    });

    // Handle specific timeout errors
    if (error.message.includes('timeout')) {
      return { success: false, error: 'Database response is slow. Please try again in a moment.' };
    }

    // Handle MongoDB connection errors
    if (
      error.name === 'MongoTimeoutError' ||
      error.name === 'MongoError' ||
      error.name === 'MongoServerError'
    ) {
      return { success: false, error: 'Database connection issue. Please try again later.' };
    }

    // Handle network errors
    if (
      error.code === 'ECONNRESET' ||
      error.code === 'ENOTFOUND' ||
      error.code === 'ECONNREFUSED'
    ) {
      return { success: false, error: 'Network connectivity issue. Please try again.' };
    }

    return {
      success: false,
      error: 'Authentication service temporarily unavailable. Please try again.',
    };
  }
};

/**
 * Register a new user
 * @param {Object} userData - User data (login, password, role)
 * @param {Object|null} requestingUser - User making the request (if any)
 * @returns {Promise<Object>} - Created user and token, or error
 */
const registerUser = async (userData, requestingUser = null) => {
  try {
    const { login, password, role = ROLES.AGENT } = userData;

    // Validate required fields
    if (!login || !password) {
      return { success: false, error: 'Login and password are required' };
    }

    // Check if user already exists
    const existingUser = await User.findOne({ login });
    if (existingUser) {
      return { success: false, error: 'User with this login already exists' };
    }

    // Validate role
    if (!Object.values(ROLES).includes(role)) {
      return { success: false, error: 'Invalid role' };
    }

    // For the first user, allow creating an admin
    // For subsequent users, require admin authorization to create admin users
    const userCount = await User.countDocuments();

    if (userCount > 0 && role === ROLES.ADMIN) {
      // Check if the request has admin authorization
      if (!requestingUser || requestingUser.role !== ROLES.ADMIN) {
        return {
          success: false,
          error: 'Access denied. Only administrators can create admin users',
        };
      }
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create the new user
    const userDefaults = User.getDefaults ? User.getDefaults() : {};
    const newUser = new User({
      ...userDefaults,
      login,
      password: hashedPassword,
      role,
      active: true,
      create_date: new Date(),
      write_date: new Date(),
    });

    const savedUser = await newUser.save();

    // Generate token
    const sessionId = crypto.randomUUID();
    const token = generateToken(savedUser, sessionId);

    // Emit registration event for activity logging
    eventEmitter.emit(EVENT_TYPES.AUTH.REGISTRATION, {
      user: {
        _id: savedUser._id,
        login: savedUser.login,
        name: savedUser.name,
        email: savedUser.email,
        role: savedUser.role,
      },
      creator: requestingUser,
      ipAddress: userData.ipAddress || 'unknown',
    });

    return {
      success: true,
      data: {
        user: {
          _id: savedUser._id,
          login: savedUser.login,
          role: savedUser.role,
        },
        token,
      },
    };
  } catch (error) {
    console.error('Registration error:', error);
    return { success: false, error: 'Internal server error during registration' };
  }
};

/**
 * Get current user information
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - User object or error
 */
const getCurrentUser = async (userId) => {
  try {
    const user = await User.findById(userId)
      .populate('image_id')
      .populate('offices', 'name')
      .populate('primary_office', 'name');

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Get pending todos count for the user
    let pendingTodosCount = 0;
    try {
      // Get Todo model (access shared MongoDB database)
      const Todo = require('../../models/todo');

      // Count pending todos based on user role
      if (user.role === ROLES.ADMIN) {
        // Admin sees all pending todos with active leads
        const adminTodos = await Todo.aggregate([
          {
            $match: {
              $or: [{ isDone: false }, { isDone: { $ne: true } }],
              active: true,
              lead_id: { $exists: true, $ne: null },
            },
          },
          {
            $lookup: {
              from: 'leads',
              localField: 'lead_id',
              foreignField: '_id',
              as: 'lead',
            },
          },
          {
            $match: {
              'lead.active': true,
            },
          },
          {
            $count: 'total',
          },
        ]);
        pendingTodosCount = adminTodos.length > 0 ? adminTodos[0].total : 0;
        console.log('🟠 Admin pendingTodosCount:', pendingTodosCount, 'adminTodos:', adminTodos);
      } else {
        // Agent sees only todos assigned to them with active leads
        const agentTodos = await Todo.aggregate([
          {
            $match: {
              assigned_to: user._id,
              $or: [{ isDone: false }, { isDone: { $ne: true } }],
              active: true,
              lead_id: { $exists: true, $ne: null },
            },
          },
          {
            $lookup: {
              from: 'leads',
              localField: 'lead_id',
              foreignField: '_id',
              as: 'lead',
            },
          },
          {
            $match: {
              'lead.active': true,
            },
          },
          {
            $count: 'total',
          },
        ]);
        pendingTodosCount = agentTodos.length > 0 ? agentTodos[0].total : 0;
        console.log('🟠 Agent pendingTodosCount:', pendingTodosCount, 'agentTodos:', agentTodos);
      }
    } catch (todoError) {
      // Don't let todo counting fail the user fetch
      console.error('❌ Failed to count pending todos during user fetch:', todoError);
      pendingTodosCount = 0;
    }

    console.log('✅ Final pendingTodosCount for user', user.login, ':', pendingTodosCount);

    const officeNames =
      Array.isArray(user.offices) && user.offices.length
        ? user.offices
            .filter((office) => office && office.name)
            .map((office) => office.name)
        : [];

    const allPlatformCredentials = Array.isArray(user.other_platform_credentials)
      ? user.other_platform_credentials
      : [];

    const telegram = allPlatformCredentials.filter((cred) => cred?.platform_type === 'telegram');
    const other_platform_credentials = allPlatformCredentials.filter(
      (cred) => cred?.platform_type !== 'telegram'
    );

    const userData = {
      _id: user._id,
      login: user.login,
      role: user.role,
      active: user.active,
      create_date: user.create_date,
      color_code: user.color_code,
      image_id: user.image_id,
      view_type: (user.view_type && user.view_type.trim()) || 'listView',
      pendingTodosCount,
      telegram,
      other_platform_credentials,
      office_name:
        officeNames.length > 0
          ? officeNames[0]
          : user.primary_office && user.primary_office.name
          ? user.primary_office.name
          : null,
      office_names: officeNames,
      voip_extension: user.voip_extension || null,
      voip_password: user.voip_password || null,
      voip_enabled: user.voip_enabled || false,
    };

    console.log('✅ Returning user data:', userData);

    return {
      success: true,
      data: userData,
    };
  } catch (error) {
    console.error('Get current user error:', error);
    return { success: false, error: 'Internal server error' };
  }
};

/**
 * Update user password
 * @param {string} targetUserId - ID of user whose password is being changed
 * @param {string} currentPassword - Current password (may be null for admin)
 * @param {string} newPassword - New password
 * @param {Object} requestingUser - User making the request
 * @returns {Promise<Object>} - Success or error message
 */
const updatePassword = async (targetUserId, currentPassword, newPassword, requestingUser) => {
  try {
    // Find target user
    const targetUser = await User.findById(targetUserId);

    if (!targetUser) {
      return { success: false, error: 'User not found' };
    }

    // Different behavior based on who is making the request
    const isAdmin = requestingUser.role === ROLES.ADMIN;
    const isSelfUpdate = targetUserId.toString() === requestingUser._id.toString();

    // If not admin and not self, deny access
    if (!isAdmin && !isSelfUpdate) {
      return { success: false, error: "You do not have permission to change this user's password" };
    }

    // If self-update (not admin), verify current password
    if (!isAdmin && isSelfUpdate) {
      if (!currentPassword) {
        return { success: false, error: 'Current password is required' };
      }

      const isPasswordValid = await verifyPassword(currentPassword, targetUser.password);

      if (!isPasswordValid) {
        return { success: false, error: 'Current password is incorrect' };
      }
    }
    // If admin changing own password, verify current password
    else if (isAdmin && isSelfUpdate) {
      if (!currentPassword) {
        return { success: false, error: 'Current password is required' };
      }

      const isPasswordValid = await verifyPassword(currentPassword, targetUser.password);

      if (!isPasswordValid) {
        return { success: false, error: 'Current password is incorrect' };
      }
    }
    // Admin changing someone else's password doesn't need verification

    // Validate new password (minimum length of 3 characters)
    if (newPassword.length < 3) {
      return { success: false, error: 'New password must be at least 3 characters long' };
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password using findByIdAndUpdate to avoid validation issues with other fields
    await User.findByIdAndUpdate(
      targetUserId,
      {
        password: hashedPassword,
        write_date: new Date(),
        lastModified: new Date(),
      },
      { runValidators: false }
    );

    // Emit password change event for activity logging
    eventEmitter.emit(EVENT_TYPES.AUTH.PASSWORD_CHANGED, {
      user: {
        _id: targetUser._id,
        login: targetUser.login,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
      },
      changedBy: requestingUser && targetUserId !== requestingUser._id ? requestingUser : null,
      ipAddress: requestingUser?.ipAddress || 'unknown',
    });

    return {
      success: true,
      message: 'Password updated successfully',
      user: {
        _id: targetUser._id,
        login: targetUser.login,
      },
    };
  } catch (error) {
    console.error('Update password error:', error);
    return { success: false, error: 'Internal server error' };
  }
};

/**
 * Log user logout for activity tracking AND terminate session
 * @param {Object} user - User object
 * @param {Object} metadata - Additional metadata like IP address
 * @returns {Promise<Object>} - Success message
 */
const logoutUser = async (user, metadata = {}) => {
  try {
    // Find and terminate ALL active sessions for this user
    const activeSessions = await UserSession.find({
      userId: user._id,
      status: SESSION_STATUS.ACTIVE,
      expiresAt: { $gt: new Date() },
    });

    console.log(`Found ${activeSessions.length} active sessions for user ${user.login}`);

    if (activeSessions.length > 0) {
      // Terminate all active sessions for this user
      for (const session of activeSessions) {
        try {
          await session.logout(false); // false = not forced logout
          console.log(`✅ Session ${session.sessionId} terminated for user ${user.login}`);
        } catch (sessionError) {
          console.error(`❌ Failed to terminate session ${session.sessionId}:`, sessionError);
        }
      }
      console.log(`🔐 All ${activeSessions.length} sessions terminated for user ${user.login}`);
    } else {
      console.log(`⚠️ No active sessions found for user ${user.login}`);
    }

    // Emit logout event for activity logging
    eventEmitter.emit(EVENT_TYPES.AUTH.LOGOUT, {
      user: {
        _id: user._id,
        login: user.login,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      ipAddress: metadata?.ipAddress || 'unknown',
      userAgent: metadata?.userAgent || 'unknown',
    });

    return {
      success: true,
      message: 'Logout successful',
    };
  } catch (error) {
    console.error('Logout error:', error);
    return { success: false, error: 'Error during logout process' };
  }
};

module.exports = {
  loginUser,
  registerUser,
  getCurrentUser,
  updatePassword,
  logoutUser,
};
