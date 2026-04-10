const { ROLES } = require('../roles/roleDefinitions');

const AGENT_TELEGRAM_REQUIRED_MESSAGE =
  'Please contact support and your administrator to resolve your login issue. Your Telegram account must be linked to the system before you can sign in.';

/**
 * @param {string|undefined|null} role
 * @returns {boolean}
 */
const isAgentRole = (role) =>
  String(role ?? '')
    .trim()
    .toLowerCase() === String(ROLES.AGENT).toLowerCase();

/**
 * Agent is considered linked to Telegram when a telegram credential has a non-empty chat_id.
 * @param {import('mongoose').Document|{ other_platform_credentials?: Array<{ platform_type?: string, chat_id?: string|null }> }} user
 * @returns {boolean}
 */
const hasLinkedTelegramChat = (user) => {
  const creds = user?.other_platform_credentials;
  if (!Array.isArray(creds)) return false;
  return creds.some(
    (c) =>
      c &&
      c.platform_type === 'telegram' &&
      String(c.telegram_username ?? '').trim().length > 0
  );
};

module.exports = {
  AGENT_TELEGRAM_REQUIRED_MESSAGE,
  isAgentRole,
  hasLinkedTelegramChat,
};
