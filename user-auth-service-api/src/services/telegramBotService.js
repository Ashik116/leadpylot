const TelegramBot = require('../models/TelegramBot');
const logger = require('../utils/logger');
const axios = require('axios');

/**
 * Trigger notification service webhook to reload bot configurations
 */
const triggerNotificationServiceWebhook = async (action, botId = null) => {
  try {
    const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:4004';
    const WEBHOOK_SECRET = process.env.TELEGRAM_BOT_WEBHOOK_SECRET || process.env.MICROSERVICE_SECRET;

    const webhookUrl = `${NOTIFICATION_SERVICE_URL}/webhook/bot-config-changed`;

    const payload = {
      action,
      bot_id: botId,
      timestamp: new Date().toISOString(),
    };

    const headers = {};
    if (WEBHOOK_SECRET) {
      headers['x-webhook-secret'] = WEBHOOK_SECRET;
    }

    await axios.post(webhookUrl, payload, {
      headers,
      timeout: 5000,
    });

    logger.info(`Webhook triggered: action=${action}, bot_id=${botId || 'all'}`);
  } catch (error) {
    // Don't throw error - webhook failure should not block bot configuration operations
    logger.warn('Failed to trigger notification service webhook:', error.message);
  }
};

// Export the webhook function so it can be used for initialization
exports.triggerNotificationServiceWebhook = triggerNotificationServiceWebhook;

/**
 * Get all Telegram bot configurations
 */
exports.getAllTelegramBots = async (filters = {}) => {
  const { company_id, include_inactive = false, is_active } = filters;

  const query = {};

  if (!include_inactive) {
    query.active = true;
  }

  if (company_id) {
    query.company_id = company_id;
  }

  if (is_active !== undefined) {
    query.is_active = is_active;
  }

  const bots = await TelegramBot.find(query)
    .populate('created_by', 'login info.name')
    .populate('updated_by', 'login info.name')
    .sort({ created_at: -1 })
    .lean();

  // Remove sensitive data (decrypted tokens should never be sent in list)
  return bots.map((bot) => ({
    ...bot,
    bot_token: '***hidden***',
    decrypted_token: undefined,
  }));
};

/**
 * Get Telegram bot by ID
 */
exports.getTelegramBotById = async (botId) => {
  const bot = await TelegramBot.findOne({
    _id: botId,
    active: true,
  })
    .populate('created_by', 'login info.name')
    .populate('updated_by', 'login info.name')
    .lean();

  if (!bot) {
    throw new Error('Telegram bot configuration not found');
  }

  return bot;
};

/**
 * Create new Telegram bot configuration
 */
exports.createTelegramBot = async (botData, userId) => {
  const { name, description, bot_token, bot_username, webhook_url, config, company_id, bot_type } = botData;

  // Check if bot username already exists
  const existingBot = await TelegramBot.findOne({
    bot_username,
    active: true,
  });

  if (existingBot) {
    throw new Error('A bot with this username already exists');
  }

  // For email_dedicated bots, auto-set appropriate notification types if not provided
  const resolvedConfig = config || {};
  if (bot_type === 'email_dedicated' && !resolvedConfig.notification_types) {
    resolvedConfig.notification_types = ['email_received', 'email_approved', 'email_agent_assigned'];
  }

  // Create new bot configuration
  const newBot = new TelegramBot({
    name,
    description: description || '',
    bot_token,
    bot_username,
    bot_type: bot_type || 'general',
    webhook_url: webhook_url || null,
    config: resolvedConfig,
    company_id,
    created_by: userId,
    updated_by: userId,
  });

  await newBot.save();

  logger.info(`Telegram bot configuration created: ${newBot.name} (${newBot._id})`, {
    botId: newBot._id,
    userId,
  });

  // Trigger notification service webhook to reload bot configurations
  await triggerNotificationServiceWebhook('create', newBot._id);

  return this.getTelegramBotById(newBot._id);
};

/**
 * Update Telegram bot configuration
 */
exports.updateTelegramBot = async (botId, botData, userId) => {
  const bot = await TelegramBot.findOne({
    _id: botId,
    active: true,
  });

  if (!bot) {
    throw new Error('Telegram bot configuration not found');
  }

  const { name, description, bot_token, bot_username, webhook_url, config, is_active, bot_type } = botData;

  // Check if new username conflicts with another bot
  if (bot_username && bot_username !== bot.bot_username) {
    const existingBot = await TelegramBot.findOne({
      bot_username,
      active: true,
      _id: { $ne: botId },
    });

    if (existingBot) {
      throw new Error('A bot with this username already exists');
    }
  }

  // Update fields
  if (name) bot.name = name;
  if (description !== undefined) bot.description = description;
  if (bot_token) bot.bot_token = bot_token;
  if (bot_username) bot.bot_username = bot_username;
  if (bot_type) bot.bot_type = bot_type;
  if (webhook_url !== undefined) bot.webhook_url = webhook_url;
  if (config) bot.config = { ...bot.config, ...config };
  if (is_active !== undefined) bot.is_active = is_active;

  bot.updated_by = userId;
  bot.updated_at = new Date();

  await bot.save();

  logger.info(`Telegram bot configuration updated: ${bot.name} (${bot._id})`, {
    botId: bot._id,
    userId,
  });

  // Trigger notification service webhook to reload bot configurations
  await triggerNotificationServiceWebhook('update', bot._id);

  return this.getTelegramBotById(botId);
};

/**
 * Delete Telegram bot configuration (soft delete)
 */
exports.deleteTelegramBot = async (botId) => {
  const bot = await TelegramBot.findOne({
    _id: botId,
    active: true,
  });

  if (!bot) {
    throw new Error('Telegram bot configuration not found');
  }

  bot.active = false;
  bot.is_active = false;
  await bot.save();

  logger.info(`Telegram bot configuration deleted: ${bot.name} (${bot._id})`, {
    botId: bot._id,
  });

  // Trigger notification service webhook to reload bot configurations
  await triggerNotificationServiceWebhook('delete', bot._id);

  return { success: true, message: 'Telegram bot configuration deleted successfully' };
};

/**
 * Toggle Telegram bot active status
 */
exports.toggleTelegramBot = async (botId, is_active, userId) => {
  const bot = await TelegramBot.findOne({
    _id: botId,
    active: true,
  });

  if (!bot) {
    throw new Error('Telegram bot configuration not found');
  }

  bot.is_active = is_active;
  bot.updated_by = userId;
  await bot.save();

  logger.info(`Telegram bot ${is_active ? 'activated' : 'deactivated'}: ${bot.name} (${bot._id})`, {
    botId: bot._id,
    userId,
  });

  // Trigger notification service webhook to reload bot configurations
  await triggerNotificationServiceWebhook(is_active ? 'create' : 'deactivate', bot._id);

  return this.getTelegramBotById(botId);
};

/**
 * Get decrypted token for a bot (for service use)
 */
exports.getBotToken = async (botId) => {
  const bot = await TelegramBot.findOne({
    _id: botId,
    active: true,
    is_active: true,
  }).lean();

  if (!bot) {
    throw new Error('Active Telegram bot configuration not found');
  }

  return bot.bot_token;
};

/**
 * Get active bot for notifications (returns first active bot)
 */
exports.getActiveBotForNotification = async (companyId = null) => {
  const query = {
    active: true,
    is_active: true,
  };

  if (companyId) {
    query.company_id = companyId;
  }

  const bot = await TelegramBot.findOne(query).lean();

  if (!bot) {
    return null;
  }

  return bot;
};

/**
 * Update bot statistics
 */
exports.updateBotStats = async (botId, statsUpdate) => {
  const bot = await TelegramBot.findOne({
    _id: botId,
    active: true,
  });

  if (!bot) {
    return;
  }

  if (statsUpdate.notification_sent) {
    bot.stats.total_notifications_sent += 1;
  }

  if (statsUpdate.user_linked) {
    if (typeof statsUpdate.user_linked === 'number') {
      bot.stats.total_users_linked += statsUpdate.user_linked;
    } else {
      bot.stats.total_users_linked += 1;
    }
    // Never go below 0
    bot.stats.total_users_linked = Math.max(0, bot.stats.total_users_linked);
  }

  if (statsUpdate.last_used) {
    bot.stats.last_used_at = new Date();
  }

  await bot.save();
};

/**
 * Test bot connection
 */
exports.testBotConnection = async (botId) => {
  const bot = await TelegramBot.findOne({
    _id: botId,
    active: true,
  }).lean();

  if (!bot) {
    throw new Error('Telegram bot configuration not found');
  }

  const botToken = bot.bot_token;

  // Test the bot by calling Telegram API
  const axios = require('axios');
  try {
    const response = await axios.get(`https://api.telegram.org/bot${botToken}/getMe`);

    if (response.data.ok) {
      const botInfo = response.data.result;
      return {
        success: true,
        message: 'Bot connection successful',
        bot_info: {
          id: botInfo.id,
          username: botInfo.username,
          first_name: botInfo.first_name,
          can_join_groups: botInfo.can_join_groups,
          can_read_all_group_messages: botInfo.can_read_all_group_messages,
        },
      };
    } else {
      throw new Error(response.data.description || 'Bot connection failed');
    }
  } catch (error) {
    logger.error(`Telegram bot connection test failed for bot ${botId}:`, error);
    throw new Error(`Bot connection failed: ${error.message}`);
  }
};
