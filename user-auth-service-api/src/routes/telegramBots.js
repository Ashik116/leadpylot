const express = require('express');
const router = express.Router();
const telegramBotController = require('../controllers/telegramBotController');
const { authenticate } = require('../auth/middleware/authenticate');
const { authorize } = require('../auth/middleware/authorize');
const { PERMISSIONS } = require('../auth/roles/permissions');

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
 * @route   GET /telegram-bots/active
 * @desc    Get all active Telegram bot configurations (for microservices)
 * @access  Private (Microservice only - uses shared secret)
 */
router.get(
  '/active',
  validateMicroserviceAuth,
  telegramBotController.getAllTelegramBots
);

/**
 * @route   GET /telegram-bots/for-user
 * @desc    Get active bot names + usernames for any authenticated user (used by profile popover)
 * @access  Private (any authenticated user)
 */
router.get(
  '/for-user',
  authenticate,
  async (req, res) => {
    try {
      const TelegramBot = require('../models/TelegramBot');
      const bots = await TelegramBot.find({ is_active: true, active: true })
        .select('name bot_username bot_type')
        .lean();
      res.json({ success: true, data: bots });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

/**
 * @route   GET /api/telegram-bots
 * @desc    Get all Telegram bot configurations
 * @access  Private (Admin only)
 */
router.get(
  '/',
  authenticate,
  authorize(PERMISSIONS.USER_READ_ALL),
  telegramBotController.getAllTelegramBots
);

/**
 * @route   GET /api/telegram-bots/updates
 * @desc    Get Telegram bot updates from API
 * @access  Private (Admin only)
 * @note    MUST be defined before /:id to avoid "updates" being captured as an ID
 */
router.get(
  '/updates',
  authenticate,
  authorize(PERMISSIONS.USER_READ_ALL),
  telegramBotController.getBotUpdates
);

/**
 * @route   GET /api/telegram-bots/messages
 * @desc    Get stored Telegram messages with filtering and pagination
 * @access  Private (Admin only)
 * @note    MUST be defined before /:id to avoid "messages" being captured as an ID
 */
router.get(
  '/messages',
  authenticate,
  authorize(PERMISSIONS.USER_READ_ALL),
  telegramBotController.getStoredMessages
);

/**
 * @route   POST /api/telegram-bots/link-messages
 * @desc    Link existing Telegram messages to users based on username/phone
 * @access  Private (Admin only)
 * @note    Scans unlinked messages and updates user credentials with chat_id
 */
router.post(
  '/link-messages',
  authenticate,
  authorize(PERMISSIONS.USER_READ_ALL),
  telegramBotController.linkExistingMessages
);

/**
 * @route   GET /telegram-bots/bot-status
 * @desc    Get Telegram bot initialization status
 * @access  Private (Admin only)
 * @note    MUST be defined before /:id to avoid "bot-status" being captured as an ID
 */
router.get(
  '/bot-status',
  authenticate,
  authorize(PERMISSIONS.USER_READ_ALL),
  telegramBotController.getBotStatus
);

/**
 * @route   GET /telegram-bots/updates/all
 * @desc    Get ALL Telegram bot updates from database with pagination and filters
 * @access  Private (Admin only)
 * @note    MUST be defined before /:id to avoid "updates/all" being captured as an ID
 */
router.get(
  '/updates/all',
  authenticate,
  authorize(PERMISSIONS.USER_READ_ALL),
  telegramBotController.getAllBotUpdates
);

/**
 * @route   POST /telegram-bots/reload
 * @desc    Trigger bot configuration reload
 * @access  Private (Admin only)
 * @note    MUST be defined before /:id to avoid "reload" being captured as an ID
 */
router.post(
  '/reload',
  authenticate,
  authorize(PERMISSIONS.USER_UPDATE_ALL),
  telegramBotController.reloadBot
);

/**
 * @route   GET /api/telegram-bots/:id/stats
 * @desc    Get Telegram bot statistics
 * @access  Private (Admin only)
 * @note    MUST be defined before /:id to be matched correctly
 */
router.get(
  '/:id/stats',
  authenticate,
  authorize(PERMISSIONS.USER_READ_ALL),
  telegramBotController.getBotStats
);

/**
 * @route   GET /api/telegram-bots/:id
 * @desc    Get Telegram bot by ID
 * @access  Private (Admin only)
 * @note    MUST be defined after more specific routes like /updates and /:id/stats
 */
router.get(
  '/:id',
  authenticate,
  authorize(PERMISSIONS.USER_READ_ALL),
  telegramBotController.getTelegramBotById
);

/**
 * @route   POST /api/telegram-bots
 * @desc    Create new Telegram bot configuration
 * @access  Private (Admin only)
 */
router.post(
  '/',
  authenticate,
  authorize(PERMISSIONS.USER_UPDATE_ALL),
  telegramBotController.createTelegramBot
);

/**
 * @route   PUT /api/telegram-bots/:id
 * @desc    Update Telegram bot configuration
 * @access  Private (Admin only)
 */
router.put(
  '/:id',
  authenticate,
  authorize(PERMISSIONS.USER_UPDATE_ALL),
  telegramBotController.updateTelegramBot
);

/**
 * @route   DELETE /api/telegram-bots/:id
 * @desc    Delete Telegram bot configuration
 * @access  Private (Admin only)
 */
router.delete(
  '/:id',
  authenticate,
  authorize(PERMISSIONS.USER_UPDATE_ALL),
  telegramBotController.deleteTelegramBot
);

/**
 * @route   PATCH /api/telegram-bots/:id/toggle
 * @desc    Toggle Telegram bot active status
 * @access  Private (Admin only)
 */
router.patch(
  '/:id/toggle',
  authenticate,
  authorize(PERMISSIONS.USER_UPDATE_ALL),
  telegramBotController.toggleTelegramBot
);

/**
 * @route   POST /api/telegram-bots/:id/test
 * @desc    Test Telegram bot connection
 * @access  Private (Admin only)
 */
router.post(
  '/:id/test',
  authenticate,
  authorize(PERMISSIONS.USER_UPDATE_ALL),
  telegramBotController.testBotConnection
);

/**
 * @route   GET /telegram-bots/:id/token
 * @desc    Get decrypted bot token (for notification service - microservice endpoint)
 * @access  Private (Microservice only - uses shared secret)
 */
router.get(
  '/:id/token',
  validateMicroserviceAuth,
  telegramBotController.getBotToken
);

/**
 * @route   GET /api/telegram-bots/:id/token
 * @desc    Get decrypted bot token (for notification service)
 * @access  Private (Admin only)
 */
router.get(
  '/api/:id/token',
  authenticate,
  authorize(PERMISSIONS.USER_UPDATE_ALL),
  telegramBotController.getBotToken
);

/**
 * @route   POST /telegram-bots/:id/set-group
 * @desc    Save a Telegram group chat_id for the email_dedicated bot.
 *          Called by the notification service after /register_group is used in a group.
 * @access  Private (Microservice only)
 */
router.post(
  '/:id/set-group',
  validateMicroserviceAuth,
  async (req, res) => {
    try {
      const TelegramBot = require('../models/TelegramBot');
      const { group_chat_id } = req.body;
      if (!group_chat_id) {
        return res.status(400).json({ success: false, error: 'group_chat_id is required' });
      }
      const bot = await TelegramBot.findByIdAndUpdate(
        req.params.id,
        { group_chat_id: String(group_chat_id) },
        { new: true }
      ).select('name bot_username bot_type group_chat_id');
      if (!bot) {
        return res.status(404).json({ success: false, error: 'Bot not found' });
      }
      res.json({ success: true, data: bot });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

module.exports = router;
