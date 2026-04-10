const telegramBotService = require('../services/telegramBotService');
const logger = require('../utils/logger');
const TelegramMessage = require('../models/TelegramMessage');
const User = require('../models/User');
const axios = require('axios');

const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Get all Telegram bot configurations
 */
const getAllTelegramBots = async (req, res) => {
  try {
    const { company_id, include_inactive, is_active } = req.query;

    const filters = {
      company_id: company_id ? parseInt(company_id) : null,
      include_inactive: include_inactive === 'true',
      is_active: is_active !== undefined ? is_active === 'true' : undefined,
    };

    const bots = await telegramBotService.getAllTelegramBots(filters);

    res.json({
      success: true,
      data: bots,
      meta: {
        total: bots.length,
      },
    });
  } catch (error) {
    logger.error('Error getting Telegram bots:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get Telegram bot configurations',
    });
  }
};

/**
 * Get Telegram bot by ID
 */
const getTelegramBotById = async (req, res) => {
  try {
    const { id } = req.params;

    const bot = await telegramBotService.getTelegramBotById(id);

    // Hide token in response
    const responseBot = {
      ...bot,
      bot_token: '***hidden***',
    };

    res.json({
      success: true,
      data: responseBot,
    });
  } catch (error) {
    logger.error('Error getting Telegram bot:', error);
    res.status(404).json({
      success: false,
      error: error.message || 'Telegram bot configuration not found',
    });
  }
};

/**
 * Create new Telegram bot configuration
 */
const createTelegramBot = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const botData = req.body;

    // Validate required fields
    if (!botData.name || !botData.bot_token || !botData.bot_username) {
      return res.status(400).json({
        success: false,
        error: 'Name, bot token, and bot username are required',
      });
    }

    // Add company_id from user if available
    if (req.user?.company_id && !botData.company_id) {
      botData.company_id = req.user.company_id;
    }

    const bot = await telegramBotService.createTelegramBot(botData, userId);

    // Hide token in response
    const responseBot = {
      ...bot,
      bot_token: '***hidden***',
    };

    res.status(201).json({
      success: true,
      data: responseBot,
      message: 'Telegram bot configuration created successfully',
    });
  } catch (error) {
    logger.error('Error creating Telegram bot:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to create Telegram bot configuration',
    });
  }
};

/**
 * Update Telegram bot configuration
 */
const updateTelegramBot = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?._id;
    const botData = req.body;

    const bot = await telegramBotService.updateTelegramBot(id, botData, userId);

    // Hide token in response
    const responseBot = {
      ...bot,
      bot_token: '***hidden***',
    };

    res.json({
      success: true,
      data: responseBot,
      message: 'Telegram bot configuration updated successfully',
    });
  } catch (error) {
    logger.error('Error updating Telegram bot:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to update Telegram bot configuration',
    });
  }
};

/**
 * Delete Telegram bot configuration
 */
const deleteTelegramBot = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await telegramBotService.deleteTelegramBot(id);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error('Error deleting Telegram bot:', error);
    res.status(404).json({
      success: false,
      error: error.message || 'Failed to delete Telegram bot configuration',
    });
  }
};

/**
 * Toggle Telegram bot active status
 */
const toggleTelegramBot = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;
    const userId = req.user?.id || req.user?._id;

    if (typeof is_active !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'is_active must be a boolean value',
      });
    }

    const bot = await telegramBotService.toggleTelegramBot(id, is_active, userId);

    // Hide token in response
    const responseBot = {
      ...bot,
      bot_token: '***hidden***',
    };

    res.json({
      success: true,
      data: responseBot,
      message: `Telegram bot ${is_active ? 'activated' : 'deactivated'} successfully`,
    });
  } catch (error) {
    logger.error('Error toggling Telegram bot:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to toggle Telegram bot status',
    });
  }
};

/**
 * Test bot connection
 */
const testBotConnection = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await telegramBotService.testBotConnection(id);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error('Error testing bot connection:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to test bot connection',
    });
  }
};

/**
 * Get bot statistics
 */
const getBotStats = async (req, res) => {
  try {
    const { id } = req.params;

    const bot = await telegramBotService.getTelegramBotById(id);

    res.json({
      success: true,
      data: {
        total_notifications_sent: bot.stats?.total_notifications_sent || 0,
        total_users_linked: bot.stats?.total_users_linked || 0,
        last_used_at: bot.stats?.last_used_at || null,
        created_at: bot.created_at,
        updated_at: bot.updated_at,
      },
    });
  } catch (error) {
    logger.error('Error getting bot stats:', error);
    res.status(404).json({
      success: false,
      error: error.message || 'Failed to get bot statistics',
    });
  }
};

/**
 * Get decrypted bot token (for notification service use)
 */
const getBotToken = async (req, res) => {
  try {
    const { id } = req.params;

    const token = await telegramBotService.getBotToken(id);

    res.json({
      success: true,
      token,
    });
  } catch (error) {
    logger.error('Error getting bot token:', error);
    res.status(404).json({
      success: false,
      error: error.message || 'Failed to get bot token',
    });
  }
};

/**
 * Get Telegram bot updates
 * Fetches recent updates from Telegram API for monitoring
 */
const getBotUpdates = async (req, res) => {
  try {
    const { bot_id, limit = 100 } = req.query;
    const TelegramBot = require('../models/TelegramBot');

    // Get the bot - use specific bot_id or first active bot
    let bot;
    if (bot_id) {
      bot = await TelegramBot.findOne({
        _id: bot_id,
        active: true,
      });
    } else {
      bot = await TelegramBot.findOne({
        active: true,
        is_active: true,
      });
    }

    if (!bot) {
      return res.status(404).json({ success: false, error: 'No active Telegram bot found' });
    }

    // Get decrypted token
    const encryptedToken = bot.bot_token.replace('encrypted:', '');
    const { decryptCredential } = require('../utils/credentialEncryption');
    const botToken = decryptCredential(encryptedToken);

    // Fetch updates from Telegram API

    // Delete webhook first to allow getUpdates (avoid 409 Conflict error)
    try {
      await axios.post(`https://api.telegram.org/bot${botToken}/deleteWebhook`, {
        drop_pending_updates: false
      });
    } catch (error) {
      logger.warn('Failed to delete webhook before getUpdates:', error.message);
    }

    const response = await axios.get(`https://api.telegram.org/bot${botToken}/getUpdates`, {
      params: { limit },
      timeout: 10000,
    });

    if (response.data.ok) {
      const updates = response.data.result;

      // Save each update to database and try to link users
      const savedUpdates = await Promise.all(updates.map(async (update) => {
        try {
          // Check if update already exists
          let existingMessage = await TelegramMessage.findOne({ update_id: update.update_id });

          if (existingMessage) {
            return existingMessage;
          }

          // Create new message record
          const telegramMessage = new TelegramMessage({
            update_id: update.update_id,
            bot_id: bot._id,
            message: update.message || null,
            callback_query: update.callback_query || null,
          });

          // Try to link user by Telegram username (phone is not used for matching)
          if (update.message && update.message.from) {
            const { username } = update.message.from;

            if (username) {
              const linkedUser = await User.findOne({
                'other_platform_credentials': {
                  $elemMatch: {
                    platform_type: 'telegram',
                    telegram_username: {
                      $regex: `^${escapeRegex(username)}$`,
                      $options: 'i',
                    },
                  },
                },
              });

              if (linkedUser) {
                telegramMessage.linked_user_id = linkedUser._id;

                // Update user's platform credentials with chat_id
                const telegramCred = linkedUser.other_platform_credentials.find(
                  cred => cred.platform_type === 'telegram'
                );

                if (telegramCred) {
                  const chatId = update.message.chat.id;
                  const wasNotLinkedBefore = !telegramCred.chat_id;

                  // Update chat_id if not set or different
                  if (!telegramCred.chat_id || telegramCred.chat_id !== chatId.toString()) {
                    telegramCred.chat_id = chatId.toString();
                    telegramCred.bot_enabled = true;
                    telegramCred.linked_at = new Date();
                    telegramCred.bot_id = bot._id;

                    await linkedUser.save();

                    logger.info(`Updated user's Telegram credentials with chat_id`, {
                      userId: linkedUser._id,
                      userLogin: linkedUser.login,
                      chat_id: chatId,
                      username,
                      wasNewlyLinked: wasNotLinkedBefore,
                    });

                    // Send welcome message if this is a new link
                    if (wasNotLinkedBefore) {
                      try {
                        const botToken = await telegramBotService.getBotToken(bot._id);
                        const greetingMessage = `🎉 *Welcome to CRM Bot!* \n\n` +
                          `Hi ${linkedUser.info?.name || linkedUser.login}! \n\n` +
                          `Your Telegram account has been successfully linked to our CRM system. \n\n` +
                          `You'll now receive notifications and updates directly here. \n\n` +
                          `Chat ID: ${chatId} \n\n` +
                          `Thank you for connecting! 🚀`;

                        await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                          chat_id: chatId,
                          text: greetingMessage,
                          parse_mode: 'Markdown',
                        });

                        logger.info(`Welcome message sent to user ${linkedUser.login}`, {
                          chat_id: chatId,
                        });
                      } catch (error) {
                        logger.error('Failed to send welcome message:', error.message);
                      }
                    }
                  }
                }
              }
            }
          }

          await telegramMessage.save();
          return telegramMessage;
        } catch (error) {
          logger.error('Error saving Telegram message:', error);
          return null;
        }
      }));

      // Filter out null values from failed saves
      const validUpdates = savedUpdates.filter(u => u !== null);

      res.json({
        success: true,
        bot_info: {
          id: bot._id,
          name: bot.name,
          bot_username: bot.bot_username,
        },
        updates: validUpdates,
        total: validUpdates.length,
      });
    } else {
      throw new Error(response.data.description || 'Failed to fetch updates');
    }
  } catch (error) {
    logger.error('Error fetching bot updates:', error);
    res.status(500).json({
      success: false,
      error: error.response?.data?.description || error.message || 'Failed to fetch bot updates',
    });
  }
};

/**
 * Get stored Telegram messages with filtering and pagination
 */
const getStoredMessages = async (req, res) => {
  try {
    const {
      bot_id,
      limit = 50,
      skip = 0,
      start_date,
      end_date,
      chat_id,
      telegram_username,
      linked_user_id,
    } = req.query;

    const TelegramBot = require('../models/TelegramBot');

    // Build query
    const query = {};

    // Filter by bot
    if (bot_id) {
      query.bot_id = bot_id;
    } else {
      // If no bot specified, get first active bot
      const activeBot = await TelegramBot.findOne({
        active: true,
        is_active: true,
      });
      if (activeBot) {
        query.bot_id = activeBot._id;
      }
    }

    // Filter by date range
    if (start_date || end_date) {
      query.created_at = {};
      if (start_date) query.created_at.$gte = new Date(start_date);
      if (end_date) query.created_at.$lte = new Date(end_date);
    }

    // Filter by chat ID
    if (chat_id) {
      query['message.chat.id'] = parseInt(chat_id);
    }

    // Filter by Telegram username
    if (telegram_username) {
      query['message.from.username'] = telegram_username.toLowerCase().replace('@', '');
    }

    // Filter by linked user
    if (linked_user_id) {
      query.linked_user_id = linked_user_id;
    }

    // Execute query with pagination
    const [messages, total] = await Promise.all([
      TelegramMessage.find(query)
        .sort({ created_at: -1 })
        .limit(parseInt(limit))
        .skip(parseInt(skip))
        .lean(),
      TelegramMessage.countDocuments(query),
    ]);

    // Get stats
    const stats = await TelegramMessage.getStats(query.bot_id);

    res.json({
      success: true,
      data: messages,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        has_more: skip + messages.length < total,
      },
      stats,
    });
  } catch (error) {
    logger.error('Error getting stored messages:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get stored messages',
    });
  }
};

/**
 * Link existing Telegram messages to users
 * Scans unlinked messages and tries to match them with users by Telegram username
 */
const linkExistingMessages = async (req, res) => {
  try {
    const { bot_id } = req.query;
    const TelegramBot = require('../models/TelegramBot');

    // Get the bot
    let bot;
    if (bot_id) {
      bot = await TelegramBot.findOne({
        _id: bot_id,
        active: true,
      });
    } else {
      bot = await TelegramBot.findOne({
        active: true,
        is_active: true,
      });
    }

    if (!bot) {
      return res.status(404).json({ success: false, error: 'No active Telegram bot found' });
    }

    // Find all unlinked messages for this bot
    const unlinkedMessages = await TelegramMessage.find({
      bot_id: bot._id,
      linked_user_id: null,
      'message.from': { $exists: true },
    }).sort({ created_at: -1 }).limit(100);

    let linkedCount = 0;
    const results = [];

    for (const message of unlinkedMessages) {
      if (!message.message || !message.message.from) continue;

      const { username } = message.message.from;
      const chatId = message.message.chat.id;

      if (!username) continue;

      const linkedUser = await User.findOne({
        'other_platform_credentials': {
          $elemMatch: {
            platform_type: 'telegram',
            telegram_username: {
              $regex: `^${escapeRegex(username)}$`,
              $options: 'i',
            },
          },
        },
      });

      if (linkedUser) {
        // Update message with linked user
        message.linked_user_id = linkedUser._id;

        // Update user's platform credentials with chat_id
        const telegramCred = linkedUser.other_platform_credentials.find(
          cred => cred.platform_type === 'telegram'
        );

        if (telegramCred) {
          const wasNotLinkedBefore = !telegramCred.chat_id;

          telegramCred.chat_id = chatId.toString();
          telegramCred.bot_enabled = true;
          telegramCred.linked_at = new Date();
          telegramCred.bot_id = bot._id;

          await linkedUser.save();
          await message.save();

          linkedCount++;

          results.push({
            messageId: message.update_id,
            userId: linkedUser._id,
            userLogin: linkedUser.login,
            chat_id: chatId,
            username,
            newlyLinked: wasNotLinkedBefore,
          });

          logger.info(`Linked existing Telegram message to user`, {
            messageId: message.update_id,
            userId: linkedUser._id,
            userLogin: linkedUser.login,
            chat_id: chatId,
          });
        }
      }
    }

    res.json({
      success: true,
      message: `Successfully linked ${linkedCount} message(s) to users`,
      linked_count: linkedCount,
      total_unlinked: unlinkedMessages.length,
      results,
    });
  } catch (error) {
    logger.error('Error linking existing messages:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to link existing messages',
    });
  }
};

/**
 * Get bot initialization status
 * Checks if there is an active Telegram bot configured
 */
const getBotStatus = async (req, res) => {
  try {
    const TelegramBot = require('../models/TelegramBot');

    const bot = await TelegramBot.findOne({
      active: true,
      is_active: true,
    }).lean();

    const initialized = !!bot;

    res.json({
      success: true,
      data: {
        initialized,
        bot_info: initialized ? {
          id: bot._id,
          name: bot.name,
          bot_username: bot.bot_username,
        } : null,
      },
    });
  } catch (error) {
    logger.error('Error getting bot status:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get bot status',
    });
  }
};

/**
 * Get ALL Telegram bot updates from database with pagination and filters
 * This allows viewing complete chat history
 */
const getAllBotUpdates = async (req, res) => {
  try {
    const {
      bot_id,
      limit = 50,
      skip = 0,
      start_date,
      end_date,
      chat_id,
      search_text,
    } = req.query;

    const TelegramBot = require('../models/TelegramBot');

    // Get the bot
    let bot;
    if (bot_id) {
      bot = await TelegramBot.findById(bot_id);
    } else {
      // Get first active bot if no bot_id specified
      bot = await TelegramBot.findOne({
        active: true,
        is_active: true,
      });
    }

    if (!bot) {
      return res.status(404).json({ success: false, error: 'No Telegram bot found' });
    }

    // Build query
    const query = { bot_id: bot._id };

    // Filter by date range
    if (start_date || end_date) {
      query.created_at = {};
      if (start_date) query.created_at.$gte = new Date(start_date);
      if (end_date) query.created_at.$lte = new Date(end_date);
    }

    // Filter by chat ID
    if (chat_id) {
      query['message.chat.id'] = parseInt(chat_id);
    }

    // Search in message text
    if (search_text) {
      query['message.text'] = { $regex: search_text, $options: 'i' };
    }

    // Execute query with pagination
    const [messages, total] = await Promise.all([
      TelegramMessage.find(query)
        .sort({ created_at: -1 })
        .limit(parseInt(limit))
        .skip(parseInt(skip))
        .lean(),
      TelegramMessage.countDocuments(query),
    ]);

    res.json({
      success: true,
      bot_info: {
        id: bot._id,
        name: bot.name,
        bot_username: bot.bot_username,
      },
      data: messages,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        has_more: skip + messages.length < total,
      },
    });
  } catch (error) {
    logger.error('Error getting all bot updates:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get bot updates',
    });
  }
};

/**
 * Trigger bot configuration reload
 * This endpoint can be called to reload bot configuration after changes
 */
const reloadBot = async (req, res) => {
  try {
    const { action } = req.body;

    if (action !== 'reload') {
      return res.status(400).json({
        success: false,
        error: 'Invalid action. Expected "reload"',
      });
    }

    // Here you could trigger a webhook to notification-service
    // or implement any reload logic needed
    // For now, just return success
    logger.info('Bot reload requested');

    res.json({
      success: true,
      message: 'Bot configuration reload triggered',
    });
  } catch (error) {
    logger.error('Error reloading bot:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to reload bot',
    });
  }
};

module.exports = {
  getAllTelegramBots,
  getTelegramBotById,
  getBotStats,
  createTelegramBot,
  updateTelegramBot,
  deleteTelegramBot,
  toggleTelegramBot,
  testBotConnection,
  getBotToken,
  getBotUpdates,
  getStoredMessages,
  linkExistingMessages,
  getBotStatus,
  getAllBotUpdates,
  reloadBot,
};
