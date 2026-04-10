/**
 * User Management Routes
 * Admin routes for managing users
 */

const express = require('express');
const {
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
} = require('../controllers/userController');
const { authorize } = require('../auth/middleware/authorize');
const { PERMISSIONS } = require('../auth/roles/permissions');
const { authenticate } = require('../auth/middleware/authenticate');

const router = express.Router();

/**
 * Allows a user to operate on their own resource, or an admin with USER_UPDATE_ALL.
 * Must be used after `authenticate`.
 */
const authorizeSelfOrAdmin = (req, res, next) => {
  const { PERMISSIONS: P } = require('../auth/roles/permissions');
  const { authorize: auth } = require('../auth/middleware/authorize');
  const requestedId = req.params.id || req.params.userId;
  const currentUserId = req.user?._id?.toString() || req.user?.id?.toString();
  if (currentUserId && requestedId && currentUserId === requestedId) {
    return next();
  }
  return auth(P.USER_UPDATE_ALL)(req, res, next);
};

/**
 * Middleware to validate microservice requests
 * Uses shared secret for service-to-service communication
 */
const validateMicroserviceAuth = (req, res, next) => {
  const secret = req.headers['x-microservice-secret'] || req.headers['x-gateway-secret'];
  const MICROSERVICE_SECRET = process.env.MICROSERVICE_SECRET || process.env.GATEWAY_SECRET;

  // In production, require a shared secret
  if (process.env.NODE_ENV === 'production' && (!secret || secret !== MICROSERVICE_SECRET)) {
    return res.status(403).json({ success: false, error: 'Invalid microservice credentials' });
  }

  // In development, allow requests without secret (remove this in production!)
  if (process.env.NODE_ENV !== 'production' && !secret) {
    console.warn('⚠️ Microservice request without secret in development mode');
  }

  next();
};

/**
 * @route GET /users
 * @desc Get all users with pagination and filters
 * @access Admin only
 * @query {number} page - Page number (default: 1)
 * @query {number} limit - Items per page (default: 20)
 * @query {string} role - Filter by role
 * @query {boolean} showInactive - Include inactive users (default: false)
 * @query {string} search - Search in login, name, email
 * @query {string} sortBy - Sort field: login, name, email, role, status, createdAt, updatedAt
 * @query {string} sortOrder - Sort direction: asc or desc (default: desc)
 */
router.get('/', authenticate, authorize(PERMISSIONS.USER_READ_ALL), getAllUsers);

/**
 * @route GET /users/agents
 * @access Private (authenticated users)
 * @desc Get all active agents for task assignment
 */
router.get('/agents', authenticate, authorize(PERMISSIONS.USER_READ_ALL), getAgents);

/**
 * @route GET /users/bankers
 * @access Private (authenticated users)
 * @desc Get all active bankers
 */
router.get('/bankers', authenticate, getBankers);

/**
 * @route GET /users/role/:role
 * @desc Get users by role
 * @access Admin only
 */
router.get('/role/:role', authenticate, authorize(PERMISSIONS.USER_READ_ALL), getUsersByRole);

/**
 * @route GET /users/:id
 * @desc Get user by ID
 * @access Admin or the user themselves
 */
router.get('/:id', authenticate, authorize(PERMISSIONS.USER_READ_ALL), getUserById);

/**
 * @route POST /users
 * @desc Create new user
 * @access Admin only
 */
router.post('/', authenticate, authorize(PERMISSIONS.USER_CREATE), createUser);

/**
 * @route PUT /users/:id
 * @desc Update user
 * @access Admin or the user themselves (with restrictions)
 */
router.put('/:id', authenticate, authorize(PERMISSIONS.USER_UPDATE), updateUser);

/**
 * @route DELETE /users/:id
 * @desc Soft delete user
 * @access Admin only
 */
router.delete('/:id', authenticate, authorize(PERMISSIONS.USER_DELETE), deleteUser);

/**
 * @route DELETE /users
 * @desc Bulk soft delete users
 * @access Admin only
 */
router.delete('/', authenticate, authorize(PERMISSIONS.USER_DELETE_ALL), bulkDeleteUsers);

/**
 * @route POST /users/:id/bot-credentials
 * @desc Add or update bot credential for a user
 * @access Own user or Admin
 */
router.post(
  '/:id/bot-credentials',
  authenticate,
  authorizeSelfOrAdmin,
  addBotCredential
);

/**
 * @route PUT /users/:id/bot-credentials/:credentialId
 * @desc Update bot credential (enable/disable notifications)
 * @access Own user or Admin
 */
router.put(
  '/:id/bot-credentials/:credentialId',
  authenticate,
  authorizeSelfOrAdmin,
  updateBotCredential
);

/**
 * @route DELETE /users/:id/bot-credentials/:credentialId
 * @desc Remove bot credential
 * @access Own user or Admin
 */
router.delete(
  '/:id/bot-credentials/:credentialId',
  authenticate,
  authorizeSelfOrAdmin,
  removeBotCredential
);

/**
 * @route POST /users/link-telegram
 * @desc Link Telegram account via bot /start command (no auth required - called by bot)
 * @access Public (called by notification service bot)
 */
router.post('/link-telegram', linkTelegramAccount);

/**
 * @route POST /users/unlink-telegram
 * @desc Unlink Telegram account via bot /stop command (no auth required)
 * @access Public (called by notification service bot)
 */
router.post('/unlink-telegram', unlinkTelegramAccount);

/**
 * @route GET /users/with-bot-notifications
 * @desc Get users with bot notifications enabled
 * @access Admin only
 * @query {string} role - Filter by role
 * @query {string} platform_type - Filter by platform type (telegram, discord, etc.)
 */
router.get(
  '/with-bot-notifications',
  authenticate,
  authorize(PERMISSIONS.USER_READ_ALL),
  getUsersWithBotNotifications
);

/**
 * @route POST /users/check-telegram-credentials
 * @desc Check if user exists by Telegram username/phone and auto-link them
 * @access Private (Microservice only - uses shared secret)
 * @note Called by notification service when user sends /start to bot
 */
router.post(
  '/check-telegram-credentials',
  validateMicroserviceAuth,
  checkTelegramCredentials
);

/**
 * @route POST /users/get-chat-id-by-username
 * @desc Get chat_id for a user by their Telegram username
 * @access Private (Microservice only - uses shared secret)
 * @note Used by notification service to send messages by username
 */
router.post(
  '/get-chat-id-by-username',
  validateMicroserviceAuth,
  getChatIdByUsername
);

/**
 * @route POST /users/get-chat-id-by-phone
 * @desc Get chat_id for a user by their Telegram phone number
 * @access Private (Microservice only - uses shared secret)
 * @note Used by notification service to send messages by phone number
 */
router.post(
  '/get-chat-id-by-phone',
  validateMicroserviceAuth,
  getChatIdByPhone
);

/**
 * @route POST /users/get-telegram-linked-users
 * @desc Get all users who have an active Telegram link (for /message command user picker)
 * @access Private (Microservice only)
 */
router.post(
  '/get-telegram-linked-users',
  validateMicroserviceAuth,
  async (req, res) => {
    try {
      const User = require('../models/User');
      const { exclude_chat_id } = req.body;

      const users = await User.find({
        active: true,
        other_platform_credentials: {
          $elemMatch: {
            platform_type: 'telegram',
            bot_enabled: true,
            chat_id: { $exists: true, $ne: null, $ne: '' },
          },
        },
      })
        .select('login info.name role other_platform_credentials')
        .lean();

      const result = users
        .map((u) => {
          const cred = u.other_platform_credentials.find(
            (c) => c.platform_type === 'telegram' && c.chat_id && c.bot_enabled
          );
          if (!cred) return null;
          if (exclude_chat_id && String(cred.chat_id) === String(exclude_chat_id)) return null;
          return {
            login: u.login,
            name: u.info?.name || u.login,
            role: u.role,
            chat_id: cred.chat_id,
          };
        })
        .filter(Boolean);

      res.json({ success: true, users: result });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

module.exports = router;

