const mongoose = require('mongoose');

/**
 * Telegram Message Model
 * Stores all updates/messages received by Telegram bots
 * Used for monitoring and linking users to the system
 */
const telegramMessageSchema = new mongoose.Schema({
  // Unique update identifier from Telegram
  update_id: {
    type: Number,
    required: true,
    unique: true,
    index: true,
  },

  // Bot that received this message
  bot_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TelegramBot',
    required: true,
    index: true,
  },

  // Message content (if present)
  message: {
    message_id: Number,
    from: {
      id: Number,
      is_bot: Boolean,
      first_name: String,
      last_name: String,
      username: String,
      language_code: String,
      phone_number: String, // Available if user shared phone number
    },
    chat: {
      id: Number,
      type: { type: String, enum: ['private', 'group', 'supergroup', 'channel'] },
      title: String,
      username: String,
      first_name: String,
      last_name: String,
    },
    date: Number,
    text: String,
    entities: [{
      type: String,
      offset: Number,
      length: Number,
    }],
    // Add other message fields as needed
    photo: Array,
    document: mongoose.Schema.Types.Mixed,
    sticker: mongoose.Schema.Types.Mixed,
    voice: mongoose.Schema.Types.Mixed,
    video: mongoose.Schema.Types.Mixed,
  },

  // Callback query (for button interactions)
  callback_query: {
    id: String,
    from: {
      id: Number,
      is_bot: Boolean,
      first_name: String,
      last_name: String,
      username: String,
      language_code: String,
    },
    message: {
      message_id: Number,
      from: mongoose.Schema.Types.Mixed,
      chat: mongoose.Schema.Types.Mixed,
      date: Number,
      text: String,
    },
    data: String,
  },

  // Processing status
  processed: {
    type: Boolean,
    default: false,
    index: true,
  },

  // If this message was linked to a user
  linked_user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },

  // Timestamp when received
  created_at: {
    type: Date,
    default: Date.now,
    index: true,
  },
}, {
  timestamps: true,
});

// Compound index for efficient queries
telegramMessageSchema.index({ bot_id: 1, created_at: -1 });
telegramMessageSchema.index({ 'message.from.id': 1, bot_id: 1 });
telegramMessageSchema.index({ 'message.chat.id': 1, bot_id: 1 });

// Static method to find messages by Telegram user ID
telegramMessageSchema.statics.findByTelegramUserId = function(telegramUserId, botId) {
  return this.find({
    'message.from.id': telegramUserId,
    bot_id: botId,
  }).sort({ created_at: -1 });
};

// Static method to find messages by chat ID
telegramMessageSchema.statics.findByChatId = function(chatId, botId) {
  return this.find({
    'message.chat.id': chatId,
    bot_id: botId,
  }).sort({ created_at: -1 });
};

// Static method to find user by username
telegramMessageSchema.statics.findByUsername = function(username, botId) {
  return this.find({
    'message.from.username': username.toLowerCase().replace('@', ''),
    bot_id: botId,
  }).sort({ created_at: -1 });
};

// Static method to get stats
telegramMessageSchema.statics.getStats = async function(botId) {
  const stats = await this.aggregate([
    { $match: { bot_id: mongoose.Types.ObjectId(botId) } },
    {
      $group: {
        _id: null,
        total_messages: { $sum: 1 },
        unique_users: { $addToSet: '$message.from.id' },
        unique_chats: { $addToSet: '$message.chat.id' },
      },
    },
    {
      $project: {
        _id: 0,
        total_messages: 1,
        unique_users: { $size: '$unique_users' },
        unique_chats: { $size: '$unique_chats' },
      },
    },
  ]);

  return stats[0] || { total_messages: 0, unique_users: 0, unique_chats: 0 };
};

module.exports = mongoose.model('TelegramMessage', telegramMessageSchema);
