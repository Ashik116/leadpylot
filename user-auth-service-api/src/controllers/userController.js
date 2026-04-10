/**
 * User Controller
 * Handles all user-related API requests
 */
const userService = require('../services/userService');
const { hasPermission } = require('../auth/middleware/authorize');
const { PERMISSIONS } = require('../auth/roles/permissions');
const { asyncHandler, AuthorizationError } = require('../utils/errorHandler');

/**
 * Get all users with optional filters
 */
const getAllUsers = async (req, res) => {
  try {
    const { page, limit, role, showInactive, search, sortBy, sortOrder } = req.query;
    const { user } = req;

    // Check if user has permission to read all users
    if (!(await hasPermission(user.role, PERMISSIONS.USER_READ_ALL))) {
      return res.status(403).json({
        error: 'Access denied. You do not have permission to view all users.',
      });
    }

    const result = await userService.getAllUsers({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      role,
      showInactive: showInactive === 'true',
      search,
      sortBy,
      sortOrder,
    });

    res.status(200).json(result);
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get all active agents (for task assignment, etc.)
 */
const getAgents = async (req, res) => {
  try {
    const result = await userService.getAllUsers({
      page: 1,
      limit: 1000, // Get all agents
      role: 'agent',
      showInactive: false, // Only active agents
    });

    // Return simplified response
    res.status(200).json({
      status: 'success',
      data: result.data || [],
      meta: result.meta || {},
    });
  } catch (error) {
    console.error('Error getting agents:', error);
    res.status(500).json({ 
      status: 'error',
      error: 'Internal server error' 
    });
  }
};

/**
 * Get all active bankers
 */
const getBankers = async (req, res) => {
  try {
    const result = await userService.getAllUsers({
      page: 1,
      limit: 1000, // Get all bankers
      role: 'banker',
      showInactive: false, // Only active bankers
    });

    // Return simplified response
    res.status(200).json({
      status: 'success',
      data: result.data || [],
      meta: result.meta || {},
    });
  } catch (error) {
    console.error('Error getting bankers:', error);
    res.status(500).json({ 
      status: 'error',
      error: 'Internal server error' 
    });
  }
};

/**
 * Get users by role
 */
const getUsersByRole = async (req, res) => {
  try {
    const { role } = req.params;
    const { page, limit, showInactive } = req.query;
    const { user } = req;

    // Check if user has permission to read all users
    if (!(await hasPermission(user.role, PERMISSIONS.USER_READ_ALL))) {
      return res.status(403).json({
        error: 'Access denied. You do not have permission to view users by role.',
      });
    }

    const result = await userService.getAllUsers({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      role,
      showInactive: showInactive === 'true',
    });

    res.status(200).json(result);
  } catch (error) {
    console.error('Error getting users by role:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get user by ID
 */
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req;

    // Check if user can read all users or is requesting their own info
    const canReadAllUsers = await hasPermission(user.role, PERMISSIONS.USER_READ_ALL);
    const isOwnProfile = user._id.toString() === id;

    if (!canReadAllUsers && !isOwnProfile) {
      return res.status(403).json({
        error: 'Access denied. You can only access your own user information.',
      });
    }

    const { showInactive } = req.query;
    const includeInactive = showInactive === 'true';

    const userProfile = await userService.getUserById(id, includeInactive);
    res.status(200).json(userProfile);
  } catch (error) {
    console.error('Error getting user by ID:', error);

    if (error.message === 'User not found') {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Create new user
 */
const createUser = async (req, res) => {
  try {
    const userData = req.body;
    const { user } = req;

    // Check if user has permission to create users
    if (!(await hasPermission(user.role, PERMISSIONS.USER_CREATE))) {
      return res.status(403).json({
        error: 'Access denied. You do not have permission to create users.',
      });
    }

    // Add the creator information to userData
    userData.createdBy = req.user;

    const newUser = await userService.createUser(userData);
    res.status(201).json(newUser);
  } catch (error) {
    console.error('Error creating user:', error);

    if (error.message.includes('already exists')) {
      return res.status(409).json({ error: error.message });
    }

    if (error.message.includes('Invalid role')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Update user
 */
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const requestingUser = req.user;

    // Check if user can update all users or is updating their own profile
    const canUpdateAllUsers = await hasPermission(requestingUser.role, PERMISSIONS.USER_UPDATE_ALL);
    const isOwnProfile = requestingUser._id.toString() === id;
    const canUpdateOwnProfile = await hasPermission(requestingUser.role, PERMISSIONS.USER_UPDATE);

    if (!canUpdateAllUsers && !(isOwnProfile && canUpdateOwnProfile)) {
      return res.status(403).json({
        error: 'Access denied. You can only update your own user information.',
      });
    }

    const updatedUser = await userService.updateUser(id, updateData, requestingUser);
    res.status(200).json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);

    if (error.message === 'User not found') {
      return res.status(404).json({ error: 'User not found' });
    }

    if (error.message.includes('Invalid role') || error.message.includes('Only administrators')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Delete user
 */
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req;

    // Check if user has permission to delete users
    if (!(await hasPermission(user.role, PERMISSIONS.USER_DELETE))) {
      return res.status(403).json({
        error: 'Access denied. You do not have permission to delete users.',
      });
    }

    const result = await userService.deleteUser(id, req.user);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error deleting user:', error);

    if (error.message === 'User not found') {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Bulk delete users (soft delete)
 */
const bulkDeleteUsers = asyncHandler(async (req, res) => {
  const { ids } = req.body;
  const { user } = req;

  if (!(await hasPermission(user.role, PERMISSIONS.USER_DELETE))) {
    throw new AuthorizationError("You don't have permission to delete users");
  }

  const result = await userService.bulkDeleteUsers(ids, user);

  return res.status(200).json(result);
});

/**
 * Add or update bot credential for a user
 */
const addBotCredential = async (req, res) => {
  try {
    const { id } = req.params;
    const { platform_type, platform_name, chat_id, bot_enabled } = req.body;

    const result = await userService.addBotCredential(id, {
      platform_type,
      platform_name,
      chat_id,
      bot_enabled,
    });

    res.status(200).json(result);
  } catch (error) {
    console.error('Error adding bot credential:', error);

    if (error.message === 'User not found') {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(500).json({ error: 'Failed to add bot credential' });
  }
};

/**
 * Update bot credential (enable/disable notifications)
 */
const updateBotCredential = async (req, res) => {
  try {
    const { id, credentialId } = req.params;
    const { bot_enabled } = req.body;

    const result = await userService.updateBotCredential(id, credentialId, { bot_enabled });

    res.status(200).json(result);
  } catch (error) {
    console.error('Error updating bot credential:', error);

    if (error.message === 'User not found') {
      return res.status(404).json({ error: 'User not found' });
    }
    if (error.message === 'Credential not found') {
      return res.status(404).json({ error: 'Credential not found' });
    }

    res.status(500).json({ error: 'Failed to update bot credential' });
  }
};

/**
 * Remove bot credential
 */
const removeBotCredential = async (req, res) => {
  try {
    const { id, credentialId } = req.params;

    const result = await userService.removeBotCredential(id, credentialId);

    res.status(200).json(result);
  } catch (error) {
    console.error('Error removing bot credential:', error);

    if (error.message === 'User not found') {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(500).json({ error: 'Failed to remove bot credential' });
  }
};

/**
 * Link Telegram account via bot /start command
 * Called by notification service bot, no authentication required
 */
const linkTelegramAccount = async (req, res) => {
  try {
    const { identifier, password, chat_id, identifier_type, bot_id } = req.body;

    if (!identifier || !chat_id) {
      return res.status(400).json({ error: 'Identifier and chat_id are required' });
    }

    // Support legacy 'email' parameter for backward compatibility
    const finalIdentifier = identifier || req.body.email;
    const finalIdentifierType = identifier_type || 'email';

    const result = await userService.linkTelegramAccount(finalIdentifier, password, chat_id, finalIdentifierType, bot_id);

    res.status(200).json(result);
  } catch (error) {
    console.error('Error linking Telegram account:', error);

    if (error.message === 'User not found') {
      return res.status(404).json({ error: 'User not found' });
    }

    if (error.message === 'Invalid password') {
      return res.status(401).json({ error: 'Invalid password. Please check your credentials and try again.' });
    }

    if (error.message.includes('does not have a password set')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: 'Failed to link Telegram account' });
  }
};

/**
 * Unlink Telegram account via bot /stop command
 * Called by notification service bot, no authentication required
 */
const unlinkTelegramAccount = async (req, res) => {
  try {
    const { chat_id } = req.body;

    if (!chat_id) {
      return res.status(400).json({ error: 'chat_id is required' });
    }

    const result = await userService.unlinkTelegramAccount(chat_id);

    res.status(200).json(result);
  } catch (error) {
    console.error('Error unlinking Telegram account:', error);

    res.status(500).json({ error: 'Failed to unlink Telegram account' });
  }
};

/**
 * Get users with bot notifications enabled
 * Used by notification service to find users to notify
 */
const getUsersWithBotNotifications = async (req, res) => {
  try {
    const { role, platform_type } = req.query;

    const result = await userService.getUsersWithBotNotifications({ role, platform_type });

    res.status(200).json(result);
  } catch (error) {
    console.error('Error getting users with bot notifications:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
};

/**
 * Check Telegram credentials and auto-link user
 * Called by notification service when user sends /start
 * Checks if user exists by username or phone number, and links them if found
 */
const checkTelegramCredentials = async (req, res) => {
  try {
    const { username, phone_number, chat_id, bot_id } = req.body;

    if (!chat_id) {
      return res.status(400).json({
        success: false,
        error: 'chat_id is required'
      });
    }

    if (!username && !phone_number) {
      return res.status(400).json({
        success: false,
        error: 'Either username or phone_number is required'
      });
    }

    const User = require('../models/User');
    const logger = require('../utils/logger');

    // Build query to find user by telegram username or phone
    const query = {
      other_platform_credentials: {
        $elemMatch: {
          platform_type: 'telegram',
          $or: [
            username ? { telegram_username: username.toLowerCase().replace('@', '') } : null,
            phone_number ? { telegram_phone: phone_number } : null,
          ].filter(Boolean),
        },
      },
    };

    const linkedUser = await User.findOne(query);

    if (!linkedUser) {
      return res.status(200).json({
        success: true,
        found: false,
        message: 'No user found with these Telegram credentials'
      });
    }

    // User found - update their credentials with chat_id
    const telegramCred = linkedUser.other_platform_credentials.find(
      cred => cred.platform_type === 'telegram'
    );

    if (telegramCred) {
      const wasNotLinkedBefore = !telegramCred.chat_id;

      // Update chat_id and enable bot
      telegramCred.chat_id = chat_id.toString();
      telegramCred.bot_enabled = true;
      telegramCred.linked_at = new Date();
      if (bot_id) {
        telegramCred.bot_id = bot_id;
      }

      await linkedUser.save();

      logger.info(`Auto-linked Telegram user via /start`, {
        userId: linkedUser._id,
        userLogin: linkedUser.login,
        chat_id: chat_id,
        username,
        phone_number,
        wasNewlyLinked: wasNotLinkedBefore,
      });

      return res.status(200).json({
        success: true,
        found: true,
        linked: true,
        newlyLinked: wasNotLinkedBefore,
        user: {
          _id: linkedUser._id,
          login: linkedUser.login,
          info: linkedUser.info,
        },
        message: 'User successfully linked'
      });
    }

    return res.status(200).json({
      success: true,
      found: true,
      linked: false,
      message: 'User found but no Telegram credentials object exists'
    });

  } catch (error) {
    console.error('Error checking Telegram credentials:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check Telegram credentials'
    });
  }
};

/**
 * Get chat_id by Telegram username
 * Used by notification service to send messages by username
 */
const getChatIdByUsername = async (req, res) => {
  try {
    const { username, bot_id } = req.body;

    if (!username) {
      return res.status(400).json({
        success: false,
        error: 'username is required'
      });
    }

    const User = require('../models/User');

    const query = {
      other_platform_credentials: {
        $elemMatch: {
          platform_type: 'telegram',
          telegram_username: username,
          bot_enabled: true,
          chat_id: { $exists: true, $ne: null },
        },
      },
    };

    const user = await User.findOne(query);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'No user found with this Telegram username'
      });
    }

    const telegramCred = user.other_platform_credentials.find(
      cred => cred.platform_type === 'telegram'
    );

    return res.status(200).json({
      success: true,
      chat_id: telegramCred?.chat_id,
      user: {
        _id: user._id,
        login: user.login,
      }
    });

  } catch (error) {
    console.error('Error getting chat_id by username:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get chat_id'
    });
  }
};

/**
 * Get chat_id by Telegram phone number
 * Used by notification service to send messages by phone
 */
const getChatIdByPhone = async (req, res) => {
  try {
    const { phone, bot_id } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        error: 'phone is required'
      });
    }

    const User = require('../models/User');

    const query = {
      other_platform_credentials: {
        $elemMatch: {
          platform_type: 'telegram',
          telegram_phone: phone,
          bot_enabled: true,
          chat_id: { $exists: true, $ne: null },
        },
      },
    };

    const user = await User.findOne(query);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'No user found with this Telegram phone number'
      });
    }

    const telegramCred = user.other_platform_credentials.find(
      cred => cred.platform_type === 'telegram'
    );

    return res.status(200).json({
      success: true,
      chat_id: telegramCred?.chat_id,
      user: {
        _id: user._id,
        login: user.login,
      }
    });

  } catch (error) {
    console.error('Error getting chat_id by phone:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get chat_id'
    });
  }
};

module.exports = {
  getAllUsers,
  getUsersByRole,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  bulkDeleteUsers,
  getAgents,
  getBankers,
  addBotCredential,
  updateBotCredential,
  removeBotCredential,
  linkTelegramAccount,
  unlinkTelegramAccount,
  getUsersWithBotNotifications,
  checkTelegramCredentials,
  getChatIdByUsername,
  getChatIdByPhone,
};

