/**
 * - user:create - Can create users
 * - user:read:all - Can read all users
 * - user:read:own - Can read own user data only
 */
const PERMISSIONS = {
  // User permissions
  USER_CREATE: 'user:create',
  USER_READ: 'user:read:own', // Read own user data
  USER_READ_ALL: 'user:read:all', // Read all users data
  USER_UPDATE: 'user:update:own', // Update own user data
  USER_UPDATE_ALL: 'user:update:all', // Update any user
  USER_DELETE: 'user:delete',

  // Project permissions
  PROJECT_CREATE: 'project:create',
  PROJECT_READ: 'project:read:assigned', // Read assigned projects
  PROJECT_READ_ALL: 'project:read:all', // Read all projects
  PROJECT_UPDATE: 'project:update:assigned', // Update assigned projects
  PROJECT_UPDATE_ALL: 'project:update:all', // Update any project
  PROJECT_DELETE: 'project:delete',
  PROJECT_ASSIGN_AGENT: 'project:assign:agent', // Assign agents to projects
  PROJECT_REMOVE_AGENT: 'project:remove:agent', // Remove agents from projects
  PROJECT_UPDATE_AGENT: 'project:update:agent', // Update agent details in projects

  // Lead permissions
  LEAD_CREATE: 'lead:create', // Create new leads
  LEAD_READ_ASSIGNED: 'lead:read:assigned', // Read only assigned leads
  LEAD_READ_ALL: 'lead:read:all', // Read all leads
  LEAD_UPDATE: 'lead:update', // Update any lead
  LEAD_DELETE: 'lead:delete', // Delete any lead
  LEAD_ASSIGN: 'lead:assign', // Assign leads to agents

  // Bank permissions
  BANK_CREATE: 'bank:create', // Create new banks
  BANK_READ_ASSIGNED: 'bank:read:assigned', // Read only assigned banks
  BANK_READ_ALL: 'bank:read:all', // Read all banks
  BANK_UPDATE: 'bank:update', // Update any bank
  BANK_DELETE: 'bank:delete', // Delete any bank
  BANK_ASSIGN: 'bank:assign', // Assign banks to agents

  // Assign Leads permissions
  ASSIGN_LEAD_CREATE: 'assign:create', // Create lead assignments
  ASSIGN_LEAD_READ_OWN: 'assign:read:own', // Read own lead assignments
  ASSIGN_LEAD_READ_PROJECT: 'assign:read:project', // Read project lead assignments
  ASSIGN_LEAD_READ_ALL: 'assign:read:all', // Read all lead assignments
  ASSIGN_LEAD_UPDATE: 'assign:update', // Update lead assignments
  ASSIGN_LEAD_DELETE: 'assign:delete', // Delete/archive lead assignments
  ASSIGN_LEAD_AGENT_UPDATE: 'assign:agent:update', // Update agent assigned to lead

  // Settings permissions
  SETTINGS_READ: 'settings:read',
  SETTINGS_UPDATE: 'settings:update',
  SETTINGS_DELETE: 'settings:delete',
  SETTINGS_BULK_DELETE: 'settings:bulk_delete',

  // Analytics permissions
  ANALYTICS_VIEW_OWN: 'analytics:view:own',
  ANALYTICS_VIEW_PROJECT: 'analytics:view:project',
  ANALYTICS_VIEW_ALL: 'analytics:view:all',

  // Offer permissions
  OFFER_CREATE: 'offer:create', // Create new offers
  OFFER_READ_OWN: 'offer:read:own', // Read only own offers
  OFFER_READ_ALL: 'offer:read:all', // Read all offers
  OFFER_UPDATE_OWN: 'offer:update:own', // Update own offers
  OFFER_UPDATE_ALL: 'offer:update:all', // Update any offer
  OFFER_DELETE_OWN: 'offer:delete:own', // Delete own offers
  OFFER_DELETE_ALL: 'offer:delete:all', // Delete any offer,

  // Opening permissions
  OPENING_CREATE: 'opening:create', // Create new openings
  OPENING_READ: 'opening:read', // Read openings
  OPENING_READ_ALL: 'opening:read:all', // Read all openings
  OPENING_UPDATE: 'opening:update', // Update openings
  OPENING_DELETE: 'opening:delete', // Delete openings

  // Confirmation permissions
  CONFIRMATION_CREATE: 'confirmation:create', // Create new confirmations
  CONFIRMATION_READ: 'confirmation:read', // Read confirmations
  CONFIRMATION_READ_ALL: 'confirmation:read:all', // Read all confirmations
  CONFIRMATION_UPDATE: 'confirmation:update', // Update confirmations
  CONFIRMATION_DELETE: 'confirmation:delete', // Delete confirmations

  // Payment Voucher permissions
  PAYMENT_VOUCHER_CREATE: 'payment_voucher:create', // Create new payment vouchers
  PAYMENT_VOUCHER_READ: 'payment_voucher:read', // Read payment vouchers
  PAYMENT_VOUCHER_READ_ALL: 'payment_voucher:read:all', // Read all payment vouchers
  PAYMENT_VOUCHER_UPDATE: 'payment_voucher:update', // Update payment vouchers
  PAYMENT_VOUCHER_DELETE: 'payment_voucher:delete', // Delete payment vouchers
  PAYMENT_VOUCHER_DELETE_ALL: 'payment_voucher:delete:all', // Delete all payment vouchers

  // Activity permissions
  ACTIVITY_READ_OWN: 'activity:read:own', // Read own activities
  ACTIVITY_READ_ALL: 'activity:read:all', // Read all activities

  // Source permissions
  SOURCE_CREATE: 'source:create', // Create new sources
  SOURCE_READ: 'source:read', // Read sources
  SOURCE_UPDATE: 'source:update', // Update sources
  SOURCE_DELETE: 'source:delete', // Delete sources

  // Email System permissions
  EMAIL_CREATE: 'email:create', // Create new emails (system use)
  EMAIL_SEND: 'email:send', // Send emails to leads (agents/admins)
  EMAIL_READ_OWN: 'email:read:own', // Read own emails (agents)
  EMAIL_READ_ALL: 'email:read:all', // Read all emails (admins)
  EMAIL_APPROVE: 'email:approve', // Approve emails (admins)
  EMAIL_REJECT: 'email:reject', // Reject emails (admins)
  EMAIL_ASSIGN: 'email:assign', // Assign emails to leads/agents (admins)
  EMAIL_DOWNLOAD_ATTACHMENTS: 'email:download:attachments', // Download approved attachments
  EMAIL_MANAGE_WORKFLOW: 'email:manage:workflow', // Manage email workflows (admins)
  EMAIL_VIEW_STATISTICS: 'email:view:statistics', // View email statistics (admins)
  EMAIL_TASK_CREATE: 'email:task:create', // Create email tasks (admin/agents)

  // Notification permissions
  NOTIFICATION_CREATE_OWN: 'notification:create:own', // Create own notifications
  NOTIFICATION_CREATE_ALL: 'notification:create:all', // Create notifications for any user
  NOTIFICATION_READ_OWN: 'notification:read:own', // Read own notifications
  NOTIFICATION_READ_ALL: 'notification:read:all', // Read all notifications
  NOTIFICATION_UPDATE_OWN: 'notification:update:own', // Update own notifications
  NOTIFICATION_UPDATE_ALL: 'notification:update:all', // Update any notification
  NOTIFICATION_DELETE_OWN: 'notification:delete:own', // Delete own notifications
  NOTIFICATION_DELETE_ALL: 'notification:delete:all', // Delete any notification
  ADMIN_ACCESS: 'admin:access', // Special permission for admin access
};

module.exports = {
  PERMISSIONS,
};
