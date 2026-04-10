const mongoose = require('mongoose');

/**
 * Telegram Bot Configuration Schema
 * Stores multiple Telegram bot configurations with active/inactive status
 */
const telegramBotSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      comment: 'Human-readable name for this bot configuration',
    },
    description: {
      type: String,
      trim: true,
      default: '',
      comment: 'Description of this bot configuration',
    },
    bot_token: {
      type: String,
      required: true,
      comment: 'Telegram bot token (plain text)',
    },
    bot_username: {
      type: String,
      required: true,
      trim: true,
      comment: 'Telegram bot username (e.g., @MyBot)',
    },
    bot_type: {
      type: String,
      enum: ['general', 'email_dedicated'],
      default: 'general',
      comment: 'general = all notifications; email_dedicated = email notifications only with interactive features',
    },
    is_active: {
      type: Boolean,
      default: false,
      comment: 'Whether this bot configuration is currently active',
    },
    webhook_url: {
      type: String,
      trim: true,
      default: null,
      comment: 'Webhook URL for this bot (optional)',
    },
    // For email_dedicated bots: Telegram group chat_id where emails are broadcast.
    // When set, email notifications are sent to this group instead of individual users.
    group_chat_id: {
      type: String,
      default: null,
      comment: 'Telegram group chat_id for broadcasting email notifications (email_dedicated bot only)',
    },

    // Configuration for this bot
    config: {
      allowed_roles: {
        type: [String],
        default: ['Admin', 'Agent'],
        comment: 'User roles that can link their account with this bot',
      },
      notification_types: {
        type: [String],
        default: ['lead_assigned', 'lead_updated'],
        comment: 'Types of notifications this bot sends',
      },
      rate_limit: {
        type: Number,
        default: 30,
        comment: 'Messages per minute limit',
      },
    },
    // Statistics
    stats: {
      total_notifications_sent: {
        type: Number,
        default: 0,
      },
      total_users_linked: {
        type: Number,
        default: 0,
      },
      last_used_at: {
        type: Date,
        default: null,
      },
    },
    // Tracking
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      comment: 'Admin user who created this bot configuration',
    },
    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      comment: 'Admin user who last updated this bot configuration',
    },
    company_id: {
      type: Number,
      comment: 'Company ID for multi-tenancy',
    },
    active: {
      type: Boolean,
      default: true,
      comment: 'Soft delete - whether this bot config is active',
    },
  },
  {
    timestamps: true,
    collection: 'telegram_bots',
  }
);

// Indexes
telegramBotSchema.index({ company_id: 1, active: 1 });
telegramBotSchema.index({ is_active: 1 });
telegramBotSchema.index({ bot_username: 1 });
telegramBotSchema.index({ bot_type: 1, is_active: 1 });

// Instance method to get the token
telegramBotSchema.methods.getDecryptedToken = function () {
  return this.bot_token;
};

// Static method to get active bots
telegramBotSchema.statics.getActiveBots = function (companyId = null) {
  const query = {
    active: true,
    is_active: true,
  };
  if (companyId) {
    query.company_id = companyId;
  }
  return this.find(query).lean();
};

const TelegramBot = mongoose.model('TelegramBot', telegramBotSchema);

module.exports = TelegramBot;
