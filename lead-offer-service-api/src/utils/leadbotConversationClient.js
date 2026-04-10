/**
 * Leadbot Conversation API Client
 * Fetches conversation data from leadbot AI service for lead summary generation.
 * API: GET /api/conversation?user_id=...&lead_id=...&limit=20
 */

const axios = require('axios');
const logger = require('./logger');

const LEADBOT_CONVERSATION_URL = process.env.LEADBOT_CONVERSATION_URL || 'http://localhost:8000';
const LEADBOT_CONVERSATION_TIMEOUT = parseInt(process.env.LEADBOT_CONVERSATION_TIMEOUT, 10) || 30000;

/**
 * Check if leadbot conversation API is enabled
 */
function isEnabled() {
  return Boolean(LEADBOT_CONVERSATION_URL);
}

/**
 * Fetch conversation from leadbot API
 * @param {string} userId - User ID
 * @param {string} leadId - Lead ID
 * @param {number} [limit=20] - Max messages to fetch
 * @returns {Promise<{summary?: string, messages?: Array, raw?: object}|null>}
 */
async function getConversation(userId, leadId, limit = 20) {
  if (!userId || !leadId) {
    logger.warn('Leadbot conversation: missing user_id or lead_id');
    return null;
  }

  const url = `${LEADBOT_CONVERSATION_URL.replace(/\/$/, '')}/api/conversation`;
  const params = { user_id: userId, lead_id: leadId, limit };

  try {
    const response = await axios.get(url, {
      params,
      timeout: LEADBOT_CONVERSATION_TIMEOUT,
    });

    const data = response.data;
    if (!data) {
      logger.warn('Leadbot conversation: empty response');
      return null;
    }

    // Extract summary from various possible response shapes
    let summary = null;
    let messages = null;

    if (typeof data.summary === 'string' && data.summary.trim()) {
      summary = data.summary.trim();
    } else if (typeof data.data === 'string' && data.data.trim()) {
      summary = data.data.trim();
    } else if (typeof data.content === 'string' && data.content.trim()) {
      summary = data.content.trim();
    } else if (Array.isArray(data.messages) && data.messages.length > 0) {
      messages = data.messages;
      // Build summary from messages if no explicit summary
      const parts = messages
        .filter((m) => m.content || m.text || m.message)
        .map((m) => m.content || m.text || m.message);
      if (parts.length) {
        summary = parts.join('\n').trim();
      }
    } else if (Array.isArray(data) && data.length > 0) {
      messages = data;
      const parts = data
        .filter((m) => m && (m.content || m.text || m.message))
        .map((m) => m.content || m.text || m.message);
      if (parts.length) {
        summary = parts.join('\n').trim();
      }
    }

    return {
      summary: summary || null,
      messages: messages || null,
      raw: data,
    };
  } catch (error) {
    logger.error('Leadbot conversation API failed', {
      error: error.message,
      status: error.response?.status,
      userId,
      leadId,
    });
    return null;
  }
}

module.exports = {
  isEnabled,
  getConversation,
};
