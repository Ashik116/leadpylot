/**
 * Role-Permission Mappings
 * This file maps each role to its allowed permissions
 */

const { ROLES } = require('./roleDefinitions');
const { PERMISSIONS } = require('./permissions');

/**
 * Map each role to its allowed permissions
 * @type {Object}
 */
const ROLE_PERMISSIONS = {
  // Admin role has full access to all permissions
  [ROLES.ADMIN]: [
    // Admins have all permissions
    ...Object.values(PERMISSIONS),
  ],

  // Agent role has limited permissions
  [ROLES.AGENT]: [
    // Agents can only read/update their own user info
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_UPDATE,

    // Read assigned projects only
    PERMISSIONS.PROJECT_READ,

    // For leads, agents can view their assigned leads and update them
    PERMISSIONS.LEAD_READ_ASSIGNED,
    PERMISSIONS.LEAD_UPDATE,

    // For lead assignments, agents can only view their own assignments
    PERMISSIONS.ASSIGN_LEAD_READ_OWN,

    // View own analytics
    PERMISSIONS.ANALYTICS_VIEW_OWN,

    // For offers, agents have full access to their own offers
    PERMISSIONS.OFFER_CREATE,
    PERMISSIONS.OFFER_READ_OWN,
    PERMISSIONS.OFFER_UPDATE_OWN,
    PERMISSIONS.OFFER_DELETE_OWN,

    // For openings, agents can create and read their own openings
    PERMISSIONS.OPENING_CREATE,
    PERMISSIONS.OPENING_READ,

    // For confirmations, agents can only read their own confirmations
    PERMISSIONS.CONFIRMATION_READ,

    // For payment vouchers, agents can only read their own payment vouchers
    PERMISSIONS.PAYMENT_VOUCHER_READ,

    // For settings, agents can read all settings
    PERMISSIONS.SETTINGS_READ,
    // For banks, agents can read banks
    PERMISSIONS.BANK_READ_ALL,

    // For activities, agents can view their own activities
    PERMISSIONS.ACTIVITY_READ_OWN,

    // For notifications, agents can manage their own notifications
    PERMISSIONS.NOTIFICATION_CREATE_OWN,
    PERMISSIONS.NOTIFICATION_READ_OWN,
    PERMISSIONS.NOTIFICATION_UPDATE_OWN,
    PERMISSIONS.NOTIFICATION_DELETE_OWN,

    // For email system, agents can send emails and view approved emails assigned to them
    PERMISSIONS.EMAIL_SEND,
    PERMISSIONS.EMAIL_READ_OWN,
    PERMISSIONS.EMAIL_DOWNLOAD_ATTACHMENTS,

    // For email system, agents can create email tasks
    PERMISSIONS.EMAIL_TASK_CREATE,
  ],

  // Manager role
  [ROLES.MANAGER]: [
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_READ_ALL,
    PERMISSIONS.PROJECT_READ,
    PERMISSIONS.PROJECT_READ_ALL,
    PERMISSIONS.LEAD_READ_ASSIGNED,
    PERMISSIONS.LEAD_READ_ALL,
    PERMISSIONS.ASSIGN_LEAD_READ_OWN,
    PERMISSIONS.ASSIGN_LEAD_READ_PROJECT,
    PERMISSIONS.ANALYTICS_VIEW_OWN,
    PERMISSIONS.ANALYTICS_VIEW_PROJECT,
    PERMISSIONS.OFFER_CREATE,
    PERMISSIONS.OFFER_READ_OWN,
    PERMISSIONS.OFFER_READ_ALL,
    PERMISSIONS.OFFER_UPDATE_OWN,
    PERMISSIONS.OFFER_DELETE_OWN,
    PERMISSIONS.OPENING_READ,
    PERMISSIONS.OPENING_READ_ALL,
    PERMISSIONS.CONFIRMATION_READ,
    PERMISSIONS.CONFIRMATION_READ_ALL,
    PERMISSIONS.PAYMENT_VOUCHER_READ,
    PERMISSIONS.PAYMENT_VOUCHER_READ_ALL,
    PERMISSIONS.SETTINGS_READ,
    PERMISSIONS.BANK_READ_ALL,
    PERMISSIONS.ACTIVITY_READ_OWN,
    PERMISSIONS.ACTIVITY_READ_ALL,
    PERMISSIONS.NOTIFICATION_CREATE_OWN,
    PERMISSIONS.NOTIFICATION_READ_OWN,
    PERMISSIONS.NOTIFICATION_READ_ALL,
    PERMISSIONS.NOTIFICATION_UPDATE_OWN,
    PERMISSIONS.NOTIFICATION_DELETE_OWN,
    PERMISSIONS.EMAIL_SEND,
    PERMISSIONS.EMAIL_READ_OWN,
    PERMISSIONS.EMAIL_READ_ALL,
    PERMISSIONS.EMAIL_DOWNLOAD_ATTACHMENTS,
  ],

  // Banker role
  [ROLES.BANKER]: [
    PERMISSIONS.USER_READ,
    PERMISSIONS.BANK_READ_ALL,
    PERMISSIONS.OFFER_READ_ALL,
    PERMISSIONS.CONFIRMATION_READ_ALL,
    PERMISSIONS.PAYMENT_VOUCHER_READ_ALL,
    PERMISSIONS.SETTINGS_READ,
  ],

  // Client role
  [ROLES.CLIENT]: [
    PERMISSIONS.USER_READ,
    PERMISSIONS.LEAD_READ_ASSIGNED,
    PERMISSIONS.OFFER_READ_OWN,
    PERMISSIONS.SETTINGS_READ,
  ],

  // Provider role
  [ROLES.PROVIDER]: [
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_READ_ALL,
    PERMISSIONS.PROJECT_READ_ALL,
    PERMISSIONS.LEAD_READ_ALL,
    PERMISSIONS.OFFER_READ_ALL,
    PERMISSIONS.SETTINGS_READ,
    PERMISSIONS.ANALYTICS_VIEW_ALL,
  ],
};

module.exports = {
  ROLE_PERMISSIONS,
};
