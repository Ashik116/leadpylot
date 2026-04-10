const {
  loginUser,
  registerUser,
  getCurrentUser,
  updatePassword,
  logoutUser,
} = require('../auth/services/authService')
const User = require('../models/User')
const { ROLE_PERMISSIONS } = require('../auth/roles/rolePermissions')
const {
  getCache,
  setCache,
  deleteCache,
  REDIS_KEYS,
} = require('../config/redis')
const Role = require('../models/Role')
const { getActiveBotForNotification, getBotToken } = require('../services/telegramBotService')
const logger = require('../utils/logger')
const axios = require('axios')

const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Normalize Telegram body fields (trim; treat empty as null for DB). Username only for linking.
 */
const normalizeTelegramCredentialInput = (body) => {
  const rawUser = body.telegram_username
  const telegram_username =
    rawUser != null && String(rawUser).trim() !== '' ? String(rawUser).trim() : null
  return { telegram_username }
}

/**
 * Resolve the user's private chat_id by scanning messages already received by the bot.
 * Works when the user has pressed Start or messaged the bot (or tapped an inline button).
 *
 * @returns {Promise<number|null>} Telegram chat id or null
 */
async function resolveTelegramChatIdFromMessages(
  TelegramMessage,
  activeBotId,
  telegram_username
) {
  const normalizedUsername = telegram_username
    ? String(telegram_username).toLowerCase().replace(/^@/, '').trim()
    : null

  const usernameMatches = (fromUsername) =>
    Boolean(fromUsername && fromUsername.toLowerCase() === normalizedUsername)

  const bot_id = activeBotId

  // --- Username: Incoming messages
  if (normalizedUsername) {
    const doc = await TelegramMessage.findOne({
      bot_id,
      'message.from.username': {
        $regex: `^${escapeRegex(normalizedUsername)}$`,
        $options: 'i',
      },
    })
      .sort({ created_at: -1 })
      .lean()

    if (
      doc?.message?.from?.username &&
      usernameMatches(doc.message.from.username) &&
      doc.message?.chat?.id
    ) {
      return doc.message.chat.id
    }

    // --- Username: Callback queries (buttons)
    const cbDoc = await TelegramMessage.findOne({
      bot_id,
      'callback_query.from.username': {
        $regex: `^${escapeRegex(normalizedUsername)}$`,
        $options: 'i',
      },
    })
      .sort({ created_at: -1 })
      .lean()

    const cbFrom = cbDoc?.callback_query?.from
    if (cbFrom?.username && usernameMatches(cbFrom.username)) {
      const cid = cbDoc.callback_query?.message?.chat?.id
      if (cid) return cid
    }
  }

  return null
}

/**
 * Optional: Telegram Bot API getChat by @username (works for some public targets; private users usually need a prior /start).
 */
async function tryResolveChatIdViaGetChat(botToken, telegram_username) {
  if (!botToken || !telegram_username) return null
  const u = String(telegram_username).replace(/^@/, '').trim()
  if (!u || u.length < 5 || u.length > 32 || !/^[a-zA-Z0-9_]+$/i.test(u)) return null

  try {
    const { data } = await axios.get(`https://api.telegram.org/bot${botToken}/getChat`, {
      params: { chat_id: `@${u}` },
      timeout: 6000,
    })
    if (data?.ok && data.result?.id != null) {
      return data.result.id
    }
  } catch (e) {
    logger.debug('getChat by @username skipped or failed', { message: e.message })
  }
  return null
}

/**
 * Handle user login
 */
const login = async (req, res) => {
  try {
    const { login, password } = req.body

    const metadata = {
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
    }

    const result = await loginUser(login, password, metadata)

    if (!result.success) {
      return res.status(401).json({ error: result.error })
    }

    res.status(200).json(result.data)
  } catch (error) {
    console.error('Login controller error:', error)
    res.status(500).json({ error: 'Internal server error during login' })
  }
}

/**
 * Handle user registration
 */
const register = async (req, res) => {
  try {
    const userData = req.body
    const requestingUser = req.user

    userData.ipAddress = req.ip || req.connection.remoteAddress
    userData.userAgent = req.headers['user-agent']

    const result = await registerUser(userData, requestingUser)

    if (!result.success) {
      const statusCode = result.error.includes('Access denied') ? 403 : 400
      return res.status(statusCode).json({ error: result.error })
    }

    res.status(201).json(result.data)
  } catch (error) {
    console.error('Registration controller error:', error)
    res.status(500).json({ error: 'Internal server error during registration' })
  }
}

/**
 * Get current logged-in user info
 */
const me = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const result = await getCurrentUser(req.user._id)

    if (!result.success) {
      return res.status(404).json({ error: result.error })
    }

    res.status(200).json(result.data)
  } catch (error) {
    console.error('Get current user controller error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

/**
 * Change user password
 */
const changePassword = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const targetUserId = req.params.id || req.user._id
    const { currentPassword, newPassword } = req.body

    if (!newPassword) {
      return res.status(400).json({ error: 'New password is required' })
    }

    req.user.ipAddress = req.ip || req.connection.remoteAddress

    const result = await updatePassword(
      targetUserId,
      currentPassword,
      newPassword,
      req.user
    )

    if (!result.success) {
      return res.status(400).json({ error: result.error })
    }

    res.status(200).json({
      message: result.message,
      user: result.user,
    })
  } catch (error) {
    console.error('Change password controller error:', error)
    res.status(500).json({ error: 'Internal server error: ' + error.message })
  }
}

/**
 * Handle user logout
 */
const logout = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const metadata = {
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
    }

    const result = await logoutUser(req.user, metadata)

    if (!result.success) {
      return res.status(500).json({ error: result.error })
    }

    res.status(200).json({ message: 'Logout successful' })
  } catch (error) {
    console.error('Logout controller error:', error)
    res.status(500).json({ error: 'Internal server error during logout' })
  }
}

/**
 * Get current user's actual permissions from database (Dynamic RBAC)
 * Supports per-user dynamic overrides and role-based permissions
 * Uses Redis caching for high performance
 */
const myPermissions = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const userId = req.user._id
    const userRole = req.user.role || 'Agent'

    // User-specific cache key for final effective permissions
    const userCacheKey = `rbac:user-permissions:${userId}`

    // 1. Try to get fully resolved permissions from Redis (FASTEST)
    const cachedPermissions = await getCache(userCacheKey)
    if (cachedPermissions) {
      console.log(
        `[Cache HIT] Fully resolved permissions for user ${userId} from Redis`
      )
      return res.status(200).json({
        role: userRole,
        permissions: cachedPermissions,
        _cached: true,
      })
    }

    // 2. Cache MISS - Build permissions from DB
    console.log(`[Cache MISS] Building permissions for user ${userId}`)

    // Get user document to check for individual overrides
    const result = await getCurrentUser(userId)
    if (!result.success) {
      return res.status(404).json({ error: result.error })
    }
    const user = result.data

    // A. Get Role Permissions (from Redis if possible, else DB)
    const roleCacheKey = `${REDIS_KEYS.ROLE_PERMISSIONS}${userRole}`
    let rolePermissions = await getCache(roleCacheKey)

    if (!rolePermissions) {
      const roleDoc = await Role.findOne({ name: userRole, active: true })
      if (roleDoc) {
        rolePermissions = await roleDoc.getEffectivePermissions()
        await setCache(roleCacheKey, rolePermissions)
        console.log(`[DB] Fetched and cached role "${userRole}" permissions`)
      } else {
        // Fallback to static definitions
        rolePermissions = ROLE_PERMISSIONS[userRole] || []
        console.warn(
          `[Fallback] Role "${userRole}" not in DB, using static definitions`
        )
      }
    }

    // B. Get User Specific Overrides
    const userOverrides = user.permissions || []

    // C. Merge Role Permissions and User Overrides
    // Using a Set to ensure unique permissions
    const finalPermissionsSet = new Set([...rolePermissions, ...userOverrides])
    const finalPermissions = Array.from(finalPermissionsSet)

    // 3. Cache the fully resolved permissions for this user
    await setCache(userCacheKey, finalPermissions)
    console.log(
      `[Cache SET] Fully resolved permissions for user ${userId} cached`
    )

    res.status(200).json({
      role: userRole,
      permissions: finalPermissions,
      _cached: false,
    })
  } catch (error) {
    console.error('Get user permissions controller error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

/**
 * Update user's Telegram credentials
 * Stores/updates telegram username in other_platform_credentials (phone is cleared; not used for linking)
 * Automatically links with bot and sends greeting message
 */
const updateTelegramCredentials = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const { telegram_username } = normalizeTelegramCredentialInput(req.body)

    if (!telegram_username) {
      return res.status(400).json({ error: 'Telegram username is required' })
    }

    // Find the user
    const user = await User.findById(req.user._id)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Get active bot for auto-linking
    const activeBot = await getActiveBotForNotification()
    if (!activeBot) {
      return res.status(400).json({ error: 'No active Telegram bot found. Please contact administrator.' })
    }

    // Link to bot: resolve chat_id from stored updates, then optional Telegram getChat by @username
    let chatId = null
    try {
      const TelegramMessage = require('../models/TelegramMessage')

      chatId = await resolveTelegramChatIdFromMessages(
        TelegramMessage,
        activeBot._id,
        telegram_username
      )

      if (!chatId && telegram_username) {
        let botToken
        try {
          botToken = await getBotToken(activeBot._id)
        } catch (e) {
          logger.warn('Could not load bot token for getChat fallback:', e.message)
        }
        if (botToken) {
          chatId = await tryResolveChatIdViaGetChat(botToken, telegram_username)
        }
      }

      if (chatId) {
        logger.info(`Linked Telegram chat_id for user ${user.login}: ${chatId}`, {
          userId: user._id,
          telegram_username,
          chat_id: chatId,
        })
      }
    } catch (error) {
      logger.warn('Failed to resolve Telegram chat_id:', error.message)
      // Continue without chat_id - user will need to start a conversation manually
    }

    // Initialize other_platform_credentials if it doesn't exist
    if (!user.other_platform_credentials) {
      user.other_platform_credentials = []
    }

    // Find existing Telegram credential or create new one
    let telegramCred = user.other_platform_credentials.find(
      cred => cred.platform_type === 'telegram'
    )

    if (telegramCred) {
      // Update existing Telegram credentials (phone not used; clear stored phone)
      if (telegram_username) telegramCred.telegram_username = telegram_username
      telegramCred.telegram_phone = null
      if (chatId) telegramCred.chat_id = chatId.toString()
      telegramCred.bot_enabled = !!chatId // Enable bot if chat_id found
      telegramCred.linked_at = new Date()
      telegramCred.bot_id = activeBot._id
    } else {
      // Add new Telegram credentials
      user.other_platform_credentials.push({
        platform_type: 'telegram',
        telegram_username: telegram_username || null,
        telegram_phone: null,
        chat_id: chatId ? chatId.toString() : null,
        bot_enabled: !!chatId, // Enable bot if chat_id found
        linked_at: new Date(),
        bot_id: activeBot._id,
      })
    }

    await user.save({ validateModifiedOnly: true })

    // Send welcome message via notification service (covers ALL initialized bots)
    if (chatId) {
      const notificationUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:4004';
      const welcomeEndpoint = `${notificationUrl}/api/telegram-bot/send-welcome`;
      try {
        const MICROSERVICE_SECRET = process.env.MICROSERVICE_SECRET || process.env.GATEWAY_SECRET;
        const headers = {};
        if (MICROSERVICE_SECRET) {
          headers['x-microservice-secret'] = MICROSERVICE_SECRET;
          headers['x-gateway-secret'] = MICROSERVICE_SECRET;
        }
        await axios.post(
          welcomeEndpoint,
          {
            chat_id: chatId.toString(),
            user: { name: user.info?.name, login: user.login, role: user.role },
          },
          { headers, timeout: 8000 }
        );
        logger.info(`Welcome message triggered for user ${user.login}`, { userId: user._id, chat_id: chatId });
      } catch (error) {
        logger.error('Failed to send welcome message via notification service', {
          message: error.message,
          status: error.response?.status,
          responseData: error.response?.data,
          code: error.code,
          url: welcomeEndpoint,
        });
      }
    }

    const savedTelegramCred = user.other_platform_credentials.find(c => c.platform_type === 'telegram');
    res.status(200).json({
      success: true,
      needs_bot_start: !chatId,
      message: chatId
        ? '✅ Telegram linked! Welcome messages sent to all bots.'
        : '⚠️ Credentials saved. Open the bot(s) in Telegram and press Start to complete linking.',
      data: {
        telegram_username: savedTelegramCred?.telegram_username || null,
        telegram_phone: savedTelegramCred?.telegram_phone || null,
        chat_id: chatId ? chatId.toString() : null,
        bot_enabled: !!chatId,
      }
    })
  } catch (error) {
    console.error('Update Telegram credentials controller error:', error)
    res.status(500).json({ error: 'Internal server error: ' + error.message })
  }
}

module.exports = {
  login,
  register,
  me,
  changePassword,
  logout,
  myPermissions,
  updateTelegramCredentials,
}
