/**
 * Permission Service
 * Handles permission-related business logic
 */

const { Permission, PERMISSION_GROUPS } = require('../models/Permission');
const { AuditLog, AUDIT_ACTIONS } = require('../models/AuditLog');
const { PERMISSIONS } = require('../auth/roles/permissions');
const { ROLE_PERMISSIONS } = require('../auth/roles/rolePermissions');
const logger = require('../utils/logger');

// Permission metadata for seeding
const PERMISSION_METADATA = {
  // User Management
  [PERMISSIONS.USER_CREATE]: { name: 'Create Users', resource: 'user', action: 'create', scope: null, group: 'User Management' },
  [PERMISSIONS.USER_READ]: { name: 'Read Own User', resource: 'user', action: 'read', scope: 'own', group: 'User Management' },
  [PERMISSIONS.USER_READ_ALL]: { name: 'Read All Users', resource: 'user', action: 'read', scope: 'all', group: 'User Management' },
  [PERMISSIONS.USER_UPDATE]: { name: 'Update Own User', resource: 'user', action: 'update', scope: 'own', group: 'User Management' },
  [PERMISSIONS.USER_UPDATE_ALL]: { name: 'Update All Users', resource: 'user', action: 'update', scope: 'all', group: 'User Management' },
  [PERMISSIONS.USER_DELETE]: { name: 'Delete Own User', resource: 'user', action: 'delete', scope: 'own', group: 'User Management' },
  [PERMISSIONS.USER_DELETE_ALL]: { name: 'Delete Any User', resource: 'user', action: 'delete', scope: 'all', group: 'User Management' },

  // Lead Management
  [PERMISSIONS.LEAD_CREATE]: { name: 'Create Leads', resource: 'lead', action: 'create', scope: null, group: 'Lead Management' },
  [PERMISSIONS.LEAD_READ_ASSIGNED]: { name: 'Read Assigned Leads', resource: 'lead', action: 'read', scope: 'assigned', group: 'Lead Management' },
  [PERMISSIONS.LEAD_READ_ALL]: { name: 'Read All Leads', resource: 'lead', action: 'read', scope: 'all', group: 'Lead Management' },
  [PERMISSIONS.LEAD_UPDATE]: { name: 'Update Leads', resource: 'lead', action: 'update', scope: null, group: 'Lead Management' },
  [PERMISSIONS.LEAD_DELETE]: { name: 'Delete Assigned Leads', resource: 'lead', action: 'delete', scope: 'assigned', group: 'Lead Management' },
  [PERMISSIONS.LEAD_DELETE_ALL]: { name: 'Delete Any Lead', resource: 'lead', action: 'delete', scope: 'all', group: 'Lead Management' },
  [PERMISSIONS.LEAD_ASSIGN]: { name: 'Assign Leads', resource: 'lead', action: 'assign', scope: null, group: 'Lead Management' },

  // Assign Leads (Assignment Management)
  [PERMISSIONS.ASSIGN_LEAD_CREATE]: { name: 'Create Assignments', resource: 'assign', action: 'create', scope: null, group: 'Assignment Management' },
  [PERMISSIONS.ASSIGN_LEAD_READ_OWN]: { name: 'Read Own Assignments', resource: 'assign', action: 'read', scope: 'own', group: 'Assignment Management' },
  [PERMISSIONS.ASSIGN_LEAD_READ_PROJECT]: { name: 'Read Project Assignments', resource: 'assign', action: 'read', scope: 'project', group: 'Assignment Management' },
  [PERMISSIONS.ASSIGN_LEAD_READ_ALL]: { name: 'Read All Assignments', resource: 'assign', action: 'read', scope: 'all', group: 'Assignment Management' },
  [PERMISSIONS.ASSIGN_LEAD_UPDATE]: { name: 'Update Assignments', resource: 'assign', action: 'update', scope: null, group: 'Assignment Management' },
  [PERMISSIONS.ASSIGN_LEAD_DELETE]: { name: 'Delete Own Assignments', resource: 'assign', action: 'delete', scope: 'own', group: 'Assignment Management' },
  [PERMISSIONS.ASSIGN_LEAD_DELETE_ALL]: { name: 'Delete All Assignments', resource: 'assign', action: 'delete', scope: 'all', group: 'Assignment Management' },
  [PERMISSIONS.ASSIGN_LEAD_AGENT_UPDATE]: { name: 'Update Assigned Agent', resource: 'assign', action: 'agent_update', scope: null, group: 'Assignment Management' },

  // Offer Management
  [PERMISSIONS.OFFER_CREATE]: { name: 'Create Offers', resource: 'offer', action: 'create', scope: null, group: 'Offer Management' },
  [PERMISSIONS.OFFER_READ_OWN]: { name: 'Read Own Offers', resource: 'offer', action: 'read', scope: 'own', group: 'Offer Management' },
  [PERMISSIONS.OFFER_READ_ALL]: { name: 'Read All Offers', resource: 'offer', action: 'read', scope: 'all', group: 'Offer Management' },
  [PERMISSIONS.OFFER_UPDATE_OWN]: { name: 'Update Own Offers', resource: 'offer', action: 'update', scope: 'own', group: 'Offer Management' },
  [PERMISSIONS.OFFER_UPDATE_ALL]: { name: 'Update All Offers', resource: 'offer', action: 'update', scope: 'all', group: 'Offer Management' },
  [PERMISSIONS.OFFER_DELETE_OWN]: { name: 'Delete Own Offers', resource: 'offer', action: 'delete', scope: 'own', group: 'Offer Management' },
  [PERMISSIONS.OFFER_DELETE_ALL]: { name: 'Delete All Offers', resource: 'offer', action: 'delete', scope: 'all', group: 'Offer Management' },

  // Project Management
  [PERMISSIONS.PROJECT_CREATE]: { name: 'Create Projects', resource: 'project', action: 'create', scope: null, group: 'Project Management' },
  [PERMISSIONS.PROJECT_READ]: { name: 'Read Assigned Projects', resource: 'project', action: 'read', scope: 'assigned', group: 'Project Management' },
  [PERMISSIONS.PROJECT_READ_ALL]: { name: 'Read All Projects', resource: 'project', action: 'read', scope: 'all', group: 'Project Management' },
  [PERMISSIONS.PROJECT_UPDATE]: { name: 'Update Assigned Projects', resource: 'project', action: 'update', scope: 'assigned', group: 'Project Management' },
  [PERMISSIONS.PROJECT_UPDATE_ALL]: { name: 'Update All Projects', resource: 'project', action: 'update', scope: 'all', group: 'Project Management' },
  [PERMISSIONS.PROJECT_DELETE]: { name: 'Delete Assigned Projects', resource: 'project', action: 'delete', scope: 'assigned', group: 'Project Management' },
  [PERMISSIONS.PROJECT_DELETE_ALL]: { name: 'Delete All Projects', resource: 'project', action: 'delete', scope: 'all', group: 'Project Management' },
  [PERMISSIONS.PROJECT_ASSIGN_AGENT]: { name: 'Assign Agents', resource: 'project', action: 'assign', scope: 'agent', group: 'Project Management' },
  [PERMISSIONS.PROJECT_REMOVE_AGENT]: { name: 'Remove Agents', resource: 'project', action: 'remove', scope: 'agent', group: 'Project Management' },
  [PERMISSIONS.PROJECT_UPDATE_AGENT]: { name: 'Update Agents', resource: 'project', action: 'update', scope: 'agent', group: 'Project Management' },

  // Bank Management
  [PERMISSIONS.BANK_CREATE]: { name: 'Create Banks', resource: 'bank', action: 'create', scope: null, group: 'Bank Management' },
  [PERMISSIONS.BANK_READ_ASSIGNED]: { name: 'Read Assigned Banks', resource: 'bank', action: 'read', scope: 'assigned', group: 'Bank Management' },
  [PERMISSIONS.BANK_READ_ALL]: { name: 'Read All Banks', resource: 'bank', action: 'read', scope: 'all', group: 'Bank Management' },
  [PERMISSIONS.BANK_UPDATE]: { name: 'Update Banks', resource: 'bank', action: 'update', scope: null, group: 'Bank Management' },
  [PERMISSIONS.BANK_DELETE]: { name: 'Delete Assigned Banks', resource: 'bank', action: 'delete', scope: 'assigned', group: 'Bank Management' },
  [PERMISSIONS.BANK_DELETE_ALL]: { name: 'Delete All Banks', resource: 'bank', action: 'delete', scope: 'all', group: 'Bank Management' },
  [PERMISSIONS.BANK_ASSIGN]: { name: 'Assign Banks', resource: 'bank', action: 'assign', scope: null, group: 'Bank Management' },

  // Opening Management
  [PERMISSIONS.OPENING_CREATE]: { name: 'Create Openings', resource: 'opening', action: 'create', scope: null, group: 'Opening Management' },
  [PERMISSIONS.OPENING_READ]: { name: 'Read Own Openings', resource: 'opening', action: 'read', scope: 'own', group: 'Opening Management' },
  [PERMISSIONS.OPENING_READ_ALL]: { name: 'Read All Openings', resource: 'opening', action: 'read', scope: 'all', group: 'Opening Management' },
  [PERMISSIONS.OPENING_UPDATE]: { name: 'Update Openings', resource: 'opening', action: 'update', scope: null, group: 'Opening Management' },
  [PERMISSIONS.OPENING_DELETE]: { name: 'Delete Own Openings', resource: 'opening', action: 'delete', scope: 'own', group: 'Opening Management' },
  [PERMISSIONS.OPENING_DELETE_ALL]: { name: 'Delete All Openings', resource: 'opening', action: 'delete', scope: 'all', group: 'Opening Management' },

  // Confirmation Management
  [PERMISSIONS.CONFIRMATION_CREATE]: { name: 'Create Confirmations', resource: 'confirmation', action: 'create', scope: null, group: 'Confirmation Management' },
  [PERMISSIONS.CONFIRMATION_READ]: { name: 'Read Own Confirmations', resource: 'confirmation', action: 'read', scope: 'own', group: 'Confirmation Management' },
  [PERMISSIONS.CONFIRMATION_READ_ALL]: { name: 'Read All Confirmations', resource: 'confirmation', action: 'read', scope: 'all', group: 'Confirmation Management' },
  [PERMISSIONS.CONFIRMATION_UPDATE]: { name: 'Update Confirmations', resource: 'confirmation', action: 'update', scope: null, group: 'Confirmation Management' },
  [PERMISSIONS.CONFIRMATION_DELETE]: { name: 'Delete Own Confirmations', resource: 'confirmation', action: 'delete', scope: 'own', group: 'Confirmation Management' },
  [PERMISSIONS.CONFIRMATION_DELETE_ALL]: { name: 'Delete All Confirmations', resource: 'confirmation', action: 'delete', scope: 'all', group: 'Confirmation Management' },

  // Payment Voucher Management
  [PERMISSIONS.PAYMENT_VOUCHER_CREATE]: { name: 'Create Vouchers', resource: 'payment_voucher', action: 'create', scope: null, group: 'Payment Voucher Management' },
  [PERMISSIONS.PAYMENT_VOUCHER_READ]: { name: 'Read Own Vouchers', resource: 'payment_voucher', action: 'read', scope: 'own', group: 'Payment Voucher Management' },
  [PERMISSIONS.PAYMENT_VOUCHER_READ_ALL]: { name: 'Read All Vouchers', resource: 'payment_voucher', action: 'read', scope: 'all', group: 'Payment Voucher Management' },
  [PERMISSIONS.PAYMENT_VOUCHER_UPDATE]: { name: 'Update Vouchers', resource: 'payment_voucher', action: 'update', scope: null, group: 'Payment Voucher Management' },
  [PERMISSIONS.PAYMENT_VOUCHER_DELETE]: { name: 'Delete Own Vouchers', resource: 'payment_voucher', action: 'delete', scope: 'own', group: 'Payment Voucher Management' },
  [PERMISSIONS.PAYMENT_VOUCHER_DELETE_ALL]: { name: 'Delete All Vouchers', resource: 'payment_voucher', action: 'delete', scope: 'all', group: 'Payment Voucher Management' },

  // Activity Management
  [PERMISSIONS.ACTIVITY_CREATE]: { name: 'Create Activity', resource: 'activity', action: 'create', scope: null, group: 'Activity Management' },
  [PERMISSIONS.ACTIVITY_READ_OWN]: { name: 'Read Own Activity', resource: 'activity', action: 'read', scope: 'own', group: 'Activity Management' },
  [PERMISSIONS.ACTIVITY_READ_ALL]: { name: 'Read All Activity', resource: 'activity', action: 'read', scope: 'all', group: 'Activity Management' },
  [PERMISSIONS.ACTIVITY_UPDATE]: { name: 'Update Activity', resource: 'activity', action: 'update', scope: null, group: 'Activity Management' },
  [PERMISSIONS.ACTIVITY_DELETE]: { name: 'Delete Own Activity', resource: 'activity', action: 'delete', scope: 'own', group: 'Activity Management' },
  [PERMISSIONS.ACTIVITY_DELETE_ALL]: { name: 'Delete All Activity', resource: 'activity', action: 'delete', scope: 'all', group: 'Activity Management' },

  // Source Management
  [PERMISSIONS.SOURCE_CREATE]: { name: 'Create Sources', resource: 'source', action: 'create', scope: null, group: 'Source Management' },
  [PERMISSIONS.SOURCE_READ]: { name: 'Read All Sources', resource: 'source', action: 'read', scope: 'all', group: 'Source Management' },
  [PERMISSIONS.SOURCE_UPDATE]: { name: 'Update Sources', resource: 'source', action: 'update', scope: null, group: 'Source Management' },
  [PERMISSIONS.SOURCE_DELETE]: { name: 'Delete Sources', resource: 'source', action: 'delete', scope: 'all', group: 'Source Management' },

  // Settings Management
  [PERMISSIONS.SETTINGS_CREATE]: { name: 'Create Settings', resource: 'settings', action: 'create', scope: null, group: 'Settings Management' },
  [PERMISSIONS.SETTINGS_READ]: { name: 'Read All Settings', resource: 'settings', action: 'read', scope: 'all', group: 'Settings Management' },
  [PERMISSIONS.SETTINGS_UPDATE]: { name: 'Update Settings', resource: 'settings', action: 'update', scope: null, group: 'Settings Management' },
  [PERMISSIONS.SETTINGS_DELETE]: { name: 'Delete Settings', resource: 'settings', action: 'delete', scope: 'all', group: 'Settings Management' },
  [PERMISSIONS.SETTINGS_BULK_DELETE]: { name: 'Bulk Delete Settings', resource: 'settings', action: 'bulk_delete', scope: null, group: 'Settings Management' },

  // Analytics Management
  [PERMISSIONS.ANALYTICS_CREATE]: { name: 'Create Analytics', resource: 'analytics', action: 'create', scope: null, group: 'Analytics' },
  [PERMISSIONS.ANALYTICS_VIEW_OWN]: { name: 'View Own Analytics', resource: 'analytics', action: 'read', scope: 'own', group: 'Analytics' },
  [PERMISSIONS.ANALYTICS_VIEW_PROJECT]: { name: 'View Project Analytics', resource: 'analytics', action: 'read', scope: 'project', group: 'Analytics' },
  [PERMISSIONS.ANALYTICS_VIEW_ALL]: { name: 'View All Analytics', resource: 'analytics', action: 'read', scope: 'all', group: 'Analytics' },
  [PERMISSIONS.ANALYTICS_UPDATE]: { name: 'Update Analytics', resource: 'analytics', action: 'update', scope: null, group: 'Analytics' },
  [PERMISSIONS.ANALYTICS_DELETE]: { name: 'Delete Analytics', resource: 'analytics', action: 'delete', scope: 'all', group: 'Analytics' },

  // Role Management
  [PERMISSIONS.ROLE_CREATE]: { name: 'Create Roles', resource: 'role', action: 'create', scope: null, group: 'Role Management' },
  [PERMISSIONS.ROLE_READ]: { name: 'Read Roles', resource: 'role', action: 'read', scope: 'all', group: 'Role Management' },
  [PERMISSIONS.ROLE_UPDATE]: { name: 'Update Roles', resource: 'role', action: 'update', scope: null, group: 'Role Management' },
  [PERMISSIONS.ROLE_DELETE]: { name: 'Delete Roles', resource: 'role', action: 'delete', scope: 'all', group: 'Role Management' },
  [PERMISSIONS.ROLE_ASSIGN]: { name: 'Assign Roles', resource: 'role', action: 'assign', scope: null, group: 'Role Management' },

  // Permission Management
  [PERMISSIONS.PERMISSION_CREATE]: { name: 'Create Permissions', resource: 'permission', action: 'create', scope: null, group: 'Role Management' },
  [PERMISSIONS.PERMISSION_READ]: { name: 'Read Permissions', resource: 'permission', action: 'read', scope: 'all', group: 'Role Management' },
  [PERMISSIONS.PERMISSION_UPDATE]: { name: 'Update Permissions', resource: 'permission', action: 'update', scope: null, group: 'Role Management' },
  [PERMISSIONS.PERMISSION_DELETE]: { name: 'Delete Permissions', resource: 'permission', action: 'delete', scope: 'all', group: 'Role Management' },
  [PERMISSIONS.PERMISSION_MANAGE]: { name: 'Manage Permissions', resource: 'permission', action: 'manage', scope: null, group: 'Role Management' },

  // Administration
  [PERMISSIONS.ADMIN_CREATE]: { name: 'Create Admins', resource: 'admin', action: 'create', scope: null, group: 'Administration' },
  [PERMISSIONS.ADMIN_ACCESS]: { name: 'Admin Access', resource: 'admin', action: 'read', scope: 'all', group: 'Administration' },
  [PERMISSIONS.ADMIN_UPDATE]: { name: 'Update Admins', resource: 'admin', action: 'update', scope: null, group: 'Administration' },
  [PERMISSIONS.ADMIN_DELETE]: { name: 'Delete Admins', resource: 'admin', action: 'delete', scope: 'all', group: 'Administration' },

  // Email System
  [PERMISSIONS.EMAIL_CREATE]: { name: 'Create Emails', resource: 'email', action: 'create', scope: null, group: 'Email System' },
  [PERMISSIONS.EMAIL_SEND]: { name: 'Send Emails', resource: 'email', action: 'send', scope: null, group: 'Email System' },
  [PERMISSIONS.EMAIL_READ_OWN]: { name: 'Read Own Emails', resource: 'email', action: 'read', scope: 'own', group: 'Email System' },
  [PERMISSIONS.EMAIL_READ_ALL]: { name: 'Read All Emails', resource: 'email', action: 'read', scope: 'all', group: 'Email System' },
  [PERMISSIONS.EMAIL_UPDATE]: { name: 'Update Emails', resource: 'email', action: 'update', scope: null, group: 'Email System' },
  [PERMISSIONS.EMAIL_DELETE]: { name: 'Delete Own Emails', resource: 'email', action: 'delete', scope: 'own', group: 'Email System' },
  [PERMISSIONS.EMAIL_DELETE_ALL]: { name: 'Delete All Emails', resource: 'email', action: 'delete', scope: 'all', group: 'Email System' },
  [PERMISSIONS.EMAIL_APPROVE]: { name: 'Approve Emails', resource: 'email', action: 'approve', scope: null, group: 'Email System' },
  [PERMISSIONS.EMAIL_REJECT]: { name: 'Reject Emails', resource: 'email', action: 'reject', scope: null, group: 'Email System' },
  [PERMISSIONS.EMAIL_ASSIGN]: { name: 'Assign Emails', resource: 'email', action: 'assign', scope: null, group: 'Email System' },
  [PERMISSIONS.EMAIL_DOWNLOAD_ATTACHMENTS]: { name: 'Download Attachments', resource: 'email', action: 'download', scope: 'attachments', group: 'Email System' },
  [PERMISSIONS.EMAIL_MANAGE_WORKFLOW]: { name: 'Manage Workflows', resource: 'email', action: 'manage', scope: 'workflow', group: 'Email System' },
  [PERMISSIONS.EMAIL_VIEW_STATISTICS]: { name: 'View Statistics', resource: 'email', action: 'view', scope: 'statistics', group: 'Email System' },
  [PERMISSIONS.EMAIL_TASK_CREATE]: { name: 'Create Email Tasks', resource: 'email', action: 'create', scope: 'task', group: 'Email System' },
  
  [PERMISSIONS.EMAIL_INTERNAL_COMMENT_READ]: { name: 'Read Internal Comments', resource: 'email', action: 'read', scope: 'internal_comment', group: 'Email System' },
  [PERMISSIONS.EMAIL_INTERNAL_COMMENT_UPDATE]: { name: 'Update Internal Comments', resource: 'email', action: 'update', scope: 'internal_comment', group: 'Email System' },
  [PERMISSIONS.EMAIL_INTERNAL_COMMENT_DELETE]: { name: 'Delete Internal Comments', resource: 'email', action: 'delete', scope: 'internal_comment', group: 'Email System' },
  [PERMISSIONS.EMAIL_INTERNAL_COMMENT_READ_ALL]: { name: 'Read All Internal Comments', resource: 'email', action: 'read', scope: 'all', group: 'Email System' },
  [PERMISSIONS.EMAIL_INTERNAL_COMMENT_DELETE_ALL]: { name: 'Delete All Internal Comments', resource: 'email', action: 'delete', scope: 'all', group: 'Email System' },
  [PERMISSIONS.EMAIL_INTERNAL_COMMENT_UPDATE_ALL]: { name: 'Update All Internal Comments', resource: 'email', action: 'update', scope: 'all', group: 'Email System' },
  [PERMISSIONS.EMAIL_INTERNAL_COMMENT_CREATE_ALL]: { name: 'Create All Internal Comments', resource: 'email', action: 'create', scope: 'all', group: 'Email System' },
  [PERMISSIONS.EMAIL_INTERNAL_COMMENT_CREATE]: { name: 'Create Internal Comments', resource: 'email', action: 'create', scope: 'internal_comment', group: 'Email System' },
  
  [PERMISSIONS.EMAIL_CANNED_RESPONSE_READ]: { name: 'Read Canned Responses', resource: 'email', action: 'read', scope: 'canned_response', group: 'Email System' },
  [PERMISSIONS.EMAIL_CANNED_RESPONSE_CREATE]: { name: 'Create Canned Responses', resource: 'email', action: 'create', scope: 'canned_response', group: 'Email System' },
  [PERMISSIONS.EMAIL_CANNED_RESPONSE_UPDATE]: { name: 'Update Canned Responses', resource: 'email', action: 'update', scope: 'canned_response', group: 'Email System' },
  [PERMISSIONS.EMAIL_CANNED_RESPONSE_DELETE]: { name: 'Delete Canned Responses', resource: 'email', action: 'delete', scope: 'canned_response', group: 'Email System' },
  [PERMISSIONS.EMAIL_CANNED_RESPONSE_READ_ALL]: { name: 'Read All Canned Responses', resource: 'email', action: 'read', scope: 'all', group: 'Email System' },
  [PERMISSIONS.EMAIL_CANNED_RESPONSE_DELETE_ALL]: { name: 'Delete All Canned Responses', resource: 'email', action: 'delete', scope: 'all', group: 'Email System' },
  [PERMISSIONS.EMAIL_CANNED_RESPONSE_UPDATE_ALL]: { name: 'Update All Canned Responses', resource: 'email', action: 'update', scope: 'all', group: 'Email System' },
  [PERMISSIONS.EMAIL_CANNED_RESPONSE_CREATE_ALL]: { name: 'Create All Canned Responses', resource: 'email', action: 'create', scope: 'all', group: 'Email System' },
  
  [PERMISSIONS.EMAIL_DRAFT_CREATE]: { name: 'Create Drafts', resource: 'email', action: 'create', scope: 'draft', group: 'Email System' },
  [PERMISSIONS.EMAIL_DRAFT_READ]: { name: 'Read Drafts', resource: 'email', action: 'read', scope: 'all', group: 'Email System' },
  [PERMISSIONS.EMAIL_DRAFT_UPDATE]: { name: 'Update Drafts', resource: 'email', action: 'update', scope: 'draft', group: 'Email System' },
  [PERMISSIONS.EMAIL_DRAFT_DELETE]: { name: 'Delete Drafts', resource: 'email', action: 'delete', scope: 'all', group: 'Email System' },
  [PERMISSIONS.EMAIL_DRAFT_SYNC]: { name: 'Sync Drafts', resource: 'email', action: 'sync', scope: null, group: 'Email System' },
  [PERMISSIONS.EMAIL_DRAFT_SEND]: { name: 'Send Drafts', resource: 'email', action: 'send', scope: null, group: 'Email System' },
  
  // Notification System
  [PERMISSIONS.NOTIFICATION_CREATE_OWN]: { name: 'Create Own Notification', resource: 'notification', action: 'create', scope: 'own', group: 'Notifications' },
  [PERMISSIONS.NOTIFICATION_CREATE_ALL]: { name: 'Create Any Notification', resource: 'notification', action: 'create', scope: 'all', group: 'Notifications' },
  [PERMISSIONS.NOTIFICATION_READ_OWN]: { name: 'Read Own Notifications', resource: 'notification', action: 'read', scope: 'own', group: 'Notifications' },
  [PERMISSIONS.NOTIFICATION_READ_ALL]: { name: 'Read All Notifications', resource: 'notification', action: 'read', scope: 'all', group: 'Notifications' },
  [PERMISSIONS.NOTIFICATION_UPDATE_OWN]: { name: 'Update Own Notification', resource: 'notification', action: 'update', scope: 'own', group: 'Notifications' },
  [PERMISSIONS.NOTIFICATION_UPDATE_ALL]: { name: 'Update Any Notification', resource: 'notification', action: 'update', scope: 'all', group: 'Notifications' },
  [PERMISSIONS.NOTIFICATION_DELETE_OWN]: { name: 'Delete Own Notification', resource: 'notification', action: 'delete', scope: 'own', group: 'Notifications' },
  [PERMISSIONS.NOTIFICATION_DELETE_ALL]: { name: 'Delete Any Notification', resource: 'notification', action: 'delete', scope: 'all', group: 'Notifications' },

  // Device Security
  [PERMISSIONS.DEVICE_SECURITY_STATS]: { name: 'View Device Security Statistics', resource: 'device_security', action: 'read', scope: 'stats', group: 'Device Security' },
  [PERMISSIONS.DEVICE_SECURITY_CONSTANTS]: { name: 'View Device Security Constants', resource: 'device_security', action: 'read', scope: 'constants', group: 'Device Security' },
  [PERMISSIONS.DEVICE_SECURITY_BLOCK_CREATE]: { name: 'Create Device Block', resource: 'device_security', action: 'create', scope: null, group: 'Device Security' },
  [PERMISSIONS.DEVICE_SECURITY_UNBLOCK_CREATE]: { name: 'Create Device Unblock', resource: 'device_security', action: 'create', scope: null, group: 'Device Security' },
  [PERMISSIONS.DEVICE_SECURITY_BLOCK_READ]: { name: 'Read Device Block', resource: 'device_security', action: 'read', scope: null, group: 'Device Security' },
  [PERMISSIONS.DEVICE_SECURITY_UNBLOCK]: { name: 'Unblock Device', resource: 'device_security', action: 'update', scope: null, group: 'Device Security' },
  [PERMISSIONS.DEVICE_SECURITY_BLOCK_DELETE]: { name: 'Delete Device Block', resource: 'device_security', action: 'delete', scope: null, group: 'Device Security' },

  // Admin Management
  [PERMISSIONS.ADMIN_CREATE]: { name: 'Create Admin', resource: 'admin', action: 'create', scope: null, group: 'Admin Management' },
  [PERMISSIONS.ADMIN_ACCESS]: { name: 'Admin Access', resource: 'admin', action: 'read', scope: 'all', group: 'Admin Management' },
  [PERMISSIONS.ADMIN_UPDATE]: { name: 'Update Admin', resource: 'admin', action: 'update', scope: null, group: 'Admin Management' },
  [PERMISSIONS.ADMIN_DELETE]: { name: 'Delete Admin', resource: 'admin', action: 'delete', scope: 'all', group: 'Admin Management' },

  // Role Management
  [PERMISSIONS.ROLE_CREATE]: { name: 'Create Role', resource: 'role', action: 'create', scope: null, group: 'Role Management' },
  [PERMISSIONS.ROLE_READ]: { name: 'Read All Roles', resource: 'role', action: 'read', scope: 'all', group: 'Role Management' },
  [PERMISSIONS.ROLE_UPDATE]: { name: 'Update Role', resource: 'role', action: 'update', scope: null, group: 'Role Management' },
  [PERMISSIONS.ROLE_DELETE]: { name: 'Delete Role', resource: 'role', action: 'delete', scope: 'all', group: 'Role Management' },
  [PERMISSIONS.ROLE_ASSIGN]: { name: 'Update Role Assignments', resource: 'role', action: 'update', scope: 'assignments', group: 'Role Management' },

  // Permission Management
  [PERMISSIONS.PERMISSION_CREATE]: { name: 'Create Permission', resource: 'permission', action: 'create', scope: null, group: 'Permission Management' },
  [PERMISSIONS.PERMISSION_READ]: { name: 'Read Permission', resource: 'permission', action: 'read', scope: 'all', group: 'Permission Management' },
  [PERMISSIONS.PERMISSION_UPDATE]: { name: 'Update Permission', resource: 'permission', action: 'update', scope: null, group: 'Permission Management' },
  [PERMISSIONS.PERMISSION_DELETE]: { name: 'Delete Permission', resource: 'permission', action: 'delete', scope: 'all', group: 'Permission Management' },
  [PERMISSIONS.PERMISSION_MANAGE]: { name: 'Manage Permission', resource: 'permission', action: 'update', scope: null, group: 'Permission Management' },

  // User Password Change
  [PERMISSIONS.USER_PASSWORD_CHANGE]: { name: 'Change User Password', resource: 'user', action: 'update', scope: null, group: 'User Password Change' },
  [PERMISSIONS.USER_PASSWORD_CHANGE_ALL]: { name: 'Change Any User Password', resource: 'user', action: 'update', scope: 'all', group: 'User Password Change' },
  [PERMISSIONS.USER_PASSWORD_CHANGE_OWN]: { name: 'Change Own User Password', resource: 'user', action: 'update', scope: 'own', group: 'User Password Change' },

  // Document Library
  [PERMISSIONS.DOCUMENT_LIBRARY_READ]: { name: 'Read Document Library', resource: 'document_library', action: 'read', scope: 'all', group: 'Document Library' },
  [PERMISSIONS.DOCUMENT_LIBRARY_UPLOAD]: { name: 'Upload to Document Library', resource: 'document_library', action: 'create', scope: null, group: 'Document Library' },
  [PERMISSIONS.ATTACHMENT_VIEW]: { name: 'View Attachment', resource: 'attachment', action: 'read', scope: null, group: 'Document Library' },
  [PERMISSIONS.ATTACHMENT_DOWNLOAD]: { name: 'Download Attachment', resource: 'attachment', action: 'write', scope: null, group: 'Document Library' },
  [PERMISSIONS.ATTACHMENT_READ]: { name: 'Read Attachment', resource: 'attachment', action: 'read', scope: 'all', group: 'Document Library' },
  [PERMISSIONS.ATTACHMENT_DELETE]: { name: 'Delete Attachment', resource: 'attachment', action: 'delete', scope: 'all', group: 'Document Library' },
  [PERMISSIONS.ATTACHMENT_BULK_DELETE]: { name: 'Bulk Delete Attachments', resource: 'attachment', action: 'delete', scope: null, group: 'Document Library' },


  // PDF Service
  [PERMISSIONS.FONT_MANAGEMENT_READ]: { name: 'Read Font Management', resource: 'pdf_service', action: 'read', scope: null, group: 'PDF Service' },
  [PERMISSIONS.FONT_MANAGEMENT_CREATE]: { name: 'Create Font Management', resource: 'pdf_service', action: 'create', scope: null, group: 'PDF Service' },
  [PERMISSIONS.FONT_MANAGEMENT_UPDATE]: { name: 'Update Font Management', resource: 'pdf_service', action: 'update', scope: null, group: 'PDF Service' },
  [PERMISSIONS.FONT_MANAGEMENT_DELETE]: { name: 'Delete Font Management', resource: 'pdf_service', action: 'delete', scope: null, group: 'PDF Service' },

  [PERMISSIONS.PDF_GENERATION_READ]: { name: 'Read PDF Generation', resource: 'pdf_service', action: 'read', scope: null, group: 'PDF Service' },
  [PERMISSIONS.PDF_GENERATION_CREATE]: { name: 'Create PDF Generation', resource: 'pdf_service', action: 'create', scope: null, group: 'PDF Service' },
  [PERMISSIONS.PDF_GENERATION_UPDATE]: { name: 'Update PDF Generation', resource: 'pdf_service', action: 'update', scope: null, group: 'PDF Service' },
  [PERMISSIONS.PDF_GENERATION_DELETE]: { name: 'Delete PDF Generation', resource: 'pdf_service', action: 'delete', scope: null, group: 'PDF Service' },

  [PERMISSIONS.PDF_TEMPLATE_READ]: { name: 'Read PDF Template', resource: 'pdf_service', action: 'read', scope: null, group: 'PDF Service' },
  [PERMISSIONS.PDF_TEMPLATE_CREATE]: { name: 'Create PDF Template', resource: 'pdf_service', action: 'create', scope: null, group: 'PDF Service' },
  [PERMISSIONS.PDF_TEMPLATE_UPDATE]: { name: 'Update PDF Template', resource: 'pdf_service', action: 'update', scope: null, group: 'PDF Service' },
  [PERMISSIONS.PDF_TEMPLATE_DELETE]: { name: 'Delete PDF Template', resource: 'pdf_service', action: 'delete', scope: null, group: 'PDF Service' },

  // Reporting Services
  [PERMISSIONS.REPORTINGS_READ_ALL]: { name: 'Read All Reportings', resource: 'reportings', action: 'read', scope: 'all', group: 'Reporting Services' },
  [PERMISSIONS.REPORTINGS_READ_SINGLE]: { name: 'Read Single Reporting', resource: 'reportings', action: 'read', scope: 'single', group: 'Reporting Services' },
  [PERMISSIONS.REPORTINGS_CREATE]: { name: 'Create Reporting', resource: 'reportings', action: 'create', scope: null, group: 'Reporting Services' },

  // Unified Security
  [PERMISSIONS.UNIFIED_SECURITY_DASHBOARD_READ]: { name: 'Read Unified Security Dashboard', resource: 'unified_security', action: 'read', scope: null, group: 'Unified Security' },
  [PERMISSIONS.UNIFIED_SECURITY_BLOCK_READ]: { name: 'Read Unified Security Blocks', resource: 'unified_security', action: 'read', scope: null, group: 'Unified Security' },
  [PERMISSIONS.UNIFIED_SECURITY_BLOCK_IP_CREATE]: { name: 'Create Unified Security Blocked IP Address', resource: 'unified_security', action: 'create', scope: null, group: 'Unified Security' },
  [PERMISSIONS.UNIFIED_SECURITY_BLOCK_DEVICE_CREATE]: { name: 'Create Unified Security Blocked Device', resource: 'unified_security', action: 'create', scope: null, group: 'Unified Security' },
  [PERMISSIONS.UNIFIED_SECURITY_UNBLOCK_CREATE]: { name: 'Create Unified Security Unblocked Device', resource: 'unified_security', action: 'create', scope: null, group: 'Unified Security' },
  [PERMISSIONS.UNIFIED_SECURITY_CONSTANTS_READ]: { name: 'Read Unified Security Constants', resource: 'unified_security', action: 'read', scope: 'constants', group: 'Unified Security' },
  [PERMISSIONS.UNIFIED_SECURITY_BLOCK_DELETE]: { name: 'Delete Unified Security Blocked Device', resource: 'unified_security', action: 'delete', scope: null, group: 'Unified Security' },

  
  // Security
  [PERMISSIONS.SECURITY_DASHBOARD_READ]: { name: 'Read Security Dashboard', resource: 'security', action: 'read', scope: null, group: 'Security' },
  [PERMISSIONS.SECURITY_STATS_READ]: { name: 'Read Security Statistics', resource: 'security', action: 'read', scope: 'stats', group: 'Security' },
  [PERMISSIONS.SECURITY_FAILED_LOGINS_READ]: { name: 'Read Failed Login Attempts', resource: 'security', action: 'read', scope: 'failed_logins', group: 'Security' },
  [PERMISSIONS.SECURITY_SUCCESSFUL_LOGINS_READ]: { name: 'Read Successful Login Attempts', resource: 'security', action: 'read', scope: 'successful_logins', group: 'Security' },
  [PERMISSIONS.SECURITY_ACTIVE_SESSIONS_READ]: { name: 'Read Active User Sessions', resource: 'security', action: 'read', scope: 'active_sessions', group: 'Security' },
  [PERMISSIONS.SECURITY_BLOCKED_IPS_READ]: { name: 'Read Blocked IP Addresses', resource: 'security', action: 'read', scope: 'blocked_ips', group: 'Security' },
  [PERMISSIONS.SECURITY_BLOCK_IP_CREATE]: { name: 'Create Blocked IP Address', resource: 'security', action: 'create', scope: null, group: 'Security' },
  [PERMISSIONS.SECURITY_BLOCK_IP_DELETE]: { name: 'Delete Blocked IP Address', resource: 'security', action: 'delete', scope: null, group: 'Security' },
  [PERMISSIONS.SECURITY_FORCE_LOGOUT_CREATE]: { name: 'Force Logout User Session', resource: 'security', action: 'create', scope: null, group: 'Security' },

  // Search Service
  [PERMISSIONS.SEARCH_EXECUTE]: { name: 'Execute Search Queries', resource: 'search', action: 'execute', scope: null, group: 'Search Service' },
  [PERMISSIONS.SEARCH_READ_OWN]: { name: 'Read Own Search Results', resource: 'search', action: 'read', scope: 'own', group: 'Search Service' },
  [PERMISSIONS.SEARCH_READ_ALL]: { name: 'Read All Search Results', resource: 'search', action: 'read', scope: 'all', group: 'Search Service' },
  [PERMISSIONS.METADATA_READ]: { name: 'Read Metadata', resource: 'metadata', action: 'read', scope: null, group: 'Search Service' },

  // Kanban Board
  [PERMISSIONS.KANBAN_BOARD_READ_OWN]: { name: 'Read Own Kanban Board', resource: 'kanban', action: 'read', scope: 'own', group: 'Kanban Board' },
  [PERMISSIONS.KANBAN_BOARD_READ_ASSIGNED]: { name: 'Read Assigned Kanban Board', resource: 'kanban', action: 'read', scope: 'assigned', group: 'Kanban Board' },
  [PERMISSIONS.KANBAN_BOARD_CREATE]: { name: 'Create Kanban Board', resource: 'kanban', action: 'create', scope: null, group: 'Kanban Board' },
  [PERMISSIONS.KANBAN_BOARD_UPDATE]: { name: 'Update Kanban Board', resource: 'kanban', action: 'update', scope: null, group: 'Kanban Board' },
  [PERMISSIONS.KANBAN_BOARD_UPDATE_OWN]: { name: 'Update Own Kanban Board', resource: 'kanban', action: 'update', scope: 'own', group: 'Kanban Board' },
  [PERMISSIONS.KANBAN_BOARD_UPDATE_ASSIGNED]: { name: 'Update Assigned Kanban Board', resource: 'kanban', action: 'update', scope: 'assigned', group: 'Kanban Board' },
  [PERMISSIONS.KANBAN_BOARD_DELETE_OWN]: { name: 'Delete Own Kanban Board', resource: 'kanban', action: 'delete', scope: 'own', group: 'Kanban Board' },
  [PERMISSIONS.KANBAN_BOARD_DELETE_ASSIGNED]: { name: 'Delete Assigned Kanban Board', resource: 'kanban', action: 'delete', scope: 'assigned', group: 'Kanban Board' },
  [PERMISSIONS.KANBAN_BOARD_DELETE_ALL]: { name: 'Delete All Kanban Boards', resource: 'kanban', action: 'delete', scope: 'all', group: 'Kanban Board' },
  [PERMISSIONS.KANBAN_BOARD_READ_ALL]: { name: 'Read All Kanban Boards', resource: 'kanban', action: 'read', scope: 'all', group: 'Kanban Board' },
  [PERMISSIONS.KANBAN_BOARD_CREATE_ALL]: { name: 'Create All Kanban Boards', resource: 'kanban', action: 'create', scope: 'all', group: 'Kanban Board' },
  [PERMISSIONS.KANBAN_BOARD_UPDATE_ALL]: { name: 'Update All Kanban Boards', resource: 'kanban', action: 'update', scope: 'all', group: 'Kanban Board' },
  [PERMISSIONS.KANBAN_BOARD_DELETE_ALL]: { name: 'Delete All Kanban Boards', resource: 'kanban', action: 'delete', scope: 'all', group: 'Kanban Board' },

  // Kanban Task
  [PERMISSIONS.KANBAN_TASK_READ_OWN]: { name: 'Read Own Kanban Task', resource: 'kanban', action: 'read', scope: 'own', group: 'Kanban Board' },
  [PERMISSIONS.KANBAN_TASK_READ_ASSIGNED]: { name: 'Read Assigned Kanban Task', resource: 'kanban', action: 'read', scope: 'assigned', group: 'Kanban Board' },
  [PERMISSIONS.KANBAN_TASK_CREATE]: { name: 'Create Kanban Task', resource: 'kanban', action: 'create', scope: null, group: 'Kanban Board' },
  [PERMISSIONS.KANBAN_TASK_UPDATE]: { name: 'Update Kanban Task', resource: 'kanban', action: 'update', scope: null, group: 'Kanban Board' },
  [PERMISSIONS.KANBAN_TASK_DELETE]: { name: 'Delete Kanban Task', resource: 'kanban', action: 'delete', scope: null, group: 'Kanban Board' },
  [PERMISSIONS.KANBAN_TASK_DELETE_OWN]: { name: 'Delete Own Kanban Task', resource: 'kanban', action: 'delete', scope: 'own', group: 'Kanban Board' },
  [PERMISSIONS.KANBAN_TASK_READ_ALL]: { name: 'Read All Kanban Tasks', resource: 'kanban', action: 'read', scope: 'all', group: 'Kanban Board' },
  [PERMISSIONS.KANBAN_TASK_CREATE_ALL]: { name: 'Create All Kanban Tasks', resource: 'kanban', action: 'create', scope: 'all', group: 'Kanban Board' },
  [PERMISSIONS.KANBAN_TASK_UPDATE_ALL]: { name: 'Update All Kanban Tasks', resource: 'kanban', action: 'update', scope: 'all', group: 'Kanban Board' },
  [PERMISSIONS.KANBAN_TASK_DELETE_ALL]: { name: 'Delete All Kanban Tasks', resource: 'kanban', action: 'delete', scope: 'all', group: 'Kanban Board' },

  // Kanban list
  [PERMISSIONS.KANBAN_LIST_CREATE]: { name: 'Create Kanban List', resource: 'kanban', action: 'create', scope: null, group: 'Kanban Board' },
  [PERMISSIONS.KANBAN_LIST_UPDATE]: { name: 'Update Kanban List', resource: 'kanban', action: 'update', scope: null, group: 'Kanban Board' },
  [PERMISSIONS.KANBAN_LIST_DELETE]: { name: 'Delete Kanban List', resource: 'kanban', action: 'delete', scope: null, group: 'Kanban Board' },
  [PERMISSIONS.KANBAN_LIST_CREATE_OWN]: { name: 'Create Own Kanban List', resource: 'kanban', action: 'create', scope: 'own', group: 'Kanban Board' },
  [PERMISSIONS.KANBAN_LIST_CREATE_ASSIGNED]: { name: 'Create Assigned Kanban List', resource: 'kanban', action: 'create', scope: 'assigned', group: 'Kanban Board' },
  [PERMISSIONS.KANBAN_LIST_CREATE_ALL]: { name: 'Create All Kanban Lists', resource: 'kanban', action: 'create', scope: 'all', group: 'Kanban Board' },
  [PERMISSIONS.KANBAN_LIST_UPDATE_OWN]: { name: 'Update Own Kanban List', resource: 'kanban', action: 'update', scope: 'own', group: 'Kanban Board' },
  [PERMISSIONS.KANBAN_LIST_UPDATE_ASSIGNED]: { name: 'Update Assigned Kanban List', resource: 'kanban', action: 'update', scope: 'assigned', group: 'Kanban Board' },
  [PERMISSIONS.KANBAN_LIST_UPDATE_ALL]: { name: 'Update All Kanban Lists', resource: 'kanban', action: 'update', scope: 'all', group: 'Kanban Board' },
  [PERMISSIONS.KANBAN_LIST_DELETE_OWN]: { name: 'Delete Own Kanban List', resource: 'kanban', action: 'delete', scope: 'own', group: 'Kanban Board' },
  [PERMISSIONS.KANBAN_LIST_DELETE_ASSIGNED]: { name: 'Delete Assigned Kanban List', resource: 'kanban', action: 'delete', scope: 'assigned', group: 'Kanban Board' },
  [PERMISSIONS.KANBAN_LIST_DELETE_ALL]: { name: 'Delete All Kanban Lists', resource: 'kanban', action: 'delete', scope: 'all', group: 'Kanban Board' },

  // Office
  [PERMISSIONS.OFFICE_READ_ASSIGNED]: { name: 'Read Assigned Office', resource: 'office', action: 'read', scope: 'assigned', group: 'Office Management' },
  [PERMISSIONS.OFFICE_ASSIGN_EMPLOYEE]: { name: 'Assign Employee to Office', resource: 'office', action: 'update', scope: 'employees', group: 'Office Management' },
  [PERMISSIONS.OFFICE_READ_ALL]: { name: 'Read All Offices', resource: 'office', action: 'read', scope: 'all', group: 'Office Management' },
  [PERMISSIONS.OFFICE_CREATE]: { name: 'Create Office', resource: 'office', action: 'create', scope: null, group: 'Office Management' },
  [PERMISSIONS.OFFICE_UPDATE]: { name: 'Update Office', resource: 'office', action: 'update', scope: null, group: 'Office Management' },
  [PERMISSIONS.OFFICE_DELETE]: { name: 'Delete Office', resource: 'office', action: 'delete', scope: 'all', group: 'Office Management' },
  [PERMISSIONS.OFFICE_MANAGE_EMPLOYEES]: { name: 'Manage Employees in Office', resource: 'office', action: 'update', scope: 'employees', group: 'Office Management' },
  [PERMISSIONS.OFFICE_MANAGE_WORKING_HOURS]: { name: 'Manage Working Hours in Office', resource: 'office', action: 'update', scope: 'working_hours', group: 'Office Management' },
  [PERMISSIONS.OFFICE_READ]: { name: 'Read Office', resource: 'office', action: 'read', scope: null, group: 'Office Management' },
};

// Permission templates for quick role creation
const PERMISSION_TEMPLATES = {
  FULL_ADMIN: {
    name: 'Full Admin',
    description: 'All permissions - full system access',
    permissions: Object.values(PERMISSIONS),
  },
  SALES_AGENT: {
    name: 'Sales Agent',
    description: 'Lead and offer management for sales team',
    permissions: ROLE_PERMISSIONS['Agent'] || [],
  },
  MANAGER: {
    name: 'Manager',
    description: 'Read all with limited update capabilities',
    permissions: ROLE_PERMISSIONS['Manager'] || [],
  },
  READ_ONLY: {
    name: 'Read Only',
    description: 'View only access to all resources',
    permissions: [
      PERMISSIONS.USER_READ,
      PERMISSIONS.PROJECT_READ,
      PERMISSIONS.LEAD_READ_ASSIGNED,
      PERMISSIONS.OFFER_READ_OWN,
      PERMISSIONS.SETTINGS_READ,
    ],
  },
  CUSTOM: {
    name: 'Custom',
    description: 'Start from scratch',
    permissions: [],
  },
};

/**
 * Get all permissions
 */
const getAllPermissions = async (options = {}) => {
  const { grouped = false, activeOnly = true } = options;

  const query = activeOnly ? { active: true } : {};
  const permissions = await Permission.find(query)
    .sort({ group: 1, displayOrder: 1, name: 1 })
    .lean();

  if (!grouped) {
    return permissions;
  }

  // Group permissions by category
  const grouped_permissions = {};
  for (const permission of permissions) {
    const group = permission.group || 'Other';
    if (!grouped_permissions[group]) {
      grouped_permissions[group] = [];
    }
    grouped_permissions[group].push(permission);
  }

  return grouped_permissions;
};

/**
 * Get permission groups with optional search
 * @param {Object} options - Search options
 * @param {string} options.search - Search query (searches in group name, permission key, name, description)
 * @returns {Promise<Array>} - Array of permission groups
 */
const getPermissionGroups = async (options = {}) => {
  const { search } = options;

  // Build query for filtering permissions
  const query = { active: true };

  // If search query provided, filter permissions
  if (search && search.trim()) {
    const searchRegex = new RegExp(search.trim(), 'i');
    query.$or = [
      { key: searchRegex },
      { name: searchRegex },
      { description: searchRegex },
      { group: searchRegex },
    ];
  }

  // Use aggregation pipeline for better performance
  const pipeline = [
    // Match active permissions (and search filter if provided)
    { $match: query },
    // Sort by group and display order
    { $sort: { group: 1, displayOrder: 1, name: 1 } },
    // Group by group name
    {
      $group: {
        _id: '$group',
        permissions: {
          $push: {
            key: '$key',
            name: '$name',
            description: '$description',
          },
        },
        count: { $sum: 1 },
      },
    },
    // Transform to final format
    {
      $project: {
        _id: 0,
        name: '$_id',
        permissions: 1,
        count: 1,
      },
    },
    // Sort groups alphabetically
    { $sort: { name: 1 } },
  ];

  const groups = await Permission.aggregate(pipeline);

  // If search was provided, also filter groups that match the search term
  // (in case group name matches but no permissions in that group match)
  if (search && search.trim()) {
    const searchLower = search.trim().toLowerCase();
    return groups.filter((group) => {
      // Include group if group name matches
      if (group.name.toLowerCase().includes(searchLower)) {
        return true;
      }
      // Include group if any permission matches
      return group.permissions.some(
        (perm) =>
          perm.key.toLowerCase().includes(searchLower) ||
          perm.name.toLowerCase().includes(searchLower) ||
          (perm.description && perm.description.toLowerCase().includes(searchLower))
      );
    });
  }

  return groups;
};

/**
 * Get permission by key
 */
const getPermissionByKey = async (key) => {
  return Permission.findOne({ key: key.toLowerCase(), active: true }).lean();
};

/**
 * Get multiple permissions by keys
 */
const getPermissionsByKeys = async (keys) => {
  const normalizedKeys = keys.map(k => k.toLowerCase());
  return Permission.find({ key: { $in: normalizedKeys }, active: true }).lean();
};

/**
 * Seed permissions from static definitions
 */
const seedPermissions = async (userId) => {
  const operations = [];
  let order = 0;

  for (const [key, value] of Object.entries(PERMISSIONS)) {
    const permKey = value.toLowerCase();
    const metadata = PERMISSION_METADATA[value] || {};

    operations.push({
      updateOne: {
        filter: { key: permKey },
        update: {
          $set: {
            name: metadata.name || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            description: metadata.description || `Permission for ${key.toLowerCase().replace(/_/g, ' ')}`,
            resource: metadata.resource || permKey.split(':')[0],
            action: metadata.action || permKey.split(':')[1] || 'access',
            scope: metadata.scope || null,
            group: metadata.group || 'Other',
            isSystem: true,
            displayOrder: order++,
            active: true
          }
        },
        upsert: true
      }
    });
  }

  if (operations.length > 0) {
    await Permission.bulkWrite(operations);

    // Audit log
    if (userId) {
      await AuditLog.log({
        action: AUDIT_ACTIONS.PERMISSIONS_SEEDED,
        entityType: 'system',
        entityId: 'permissions',
        entityName: 'Permissions Seed',
        performedBy: userId,
        metadata: { count: operations.length },
      });
    }

    logger.info(`Seeded/Updated ${operations.length} permissions`);
  }

  return {
    created: operations.length,
    existing: 0,
    total: operations.length,
  };
};

const seedPermissionsv2 = async (userId) => {

  try {
    const existingPermissions = await Permission.find({}).lean();

    if (existingPermissions.length > 0) {
      let order = existingPermissions.length;
      let existingPermissionsCount = 0;
      let createdPermissionsCount = 0;

      // check if the permission is already exists, if not insert id in db
      for (const [key, value] of Object.entries(PERMISSIONS)) {
        const metadata = PERMISSION_METADATA[value] || {};
        const permKey = value.toLowerCase();

        const existingPermission = existingPermissions.find(p => p.key === permKey);
        if (!existingPermission) {
          const newPermission = await Permission.create({
            key: permKey,
            name: metadata.name || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            description: metadata.description || `Permission for ${key.toLowerCase().replace(/_/g, ' ')}`,
            resource: metadata.resource || permKey.split(':')[0],
            action: metadata.action || permKey.split(':')[1] || 'access',
            scope: metadata.scope || null,
            group: metadata.group || 'Other',
            isSystem: true,
            displayOrder: order++,
            active: true
          });
          if (newPermission) {
            createdPermissionsCount++;
          }
        } else {
          existingPermissionsCount++;
        }

      }

      logger.info(`Seeded/Updated ${createdPermissionsCount} permissions`);
      logger.info(`Existing permissions: ${existingPermissionsCount}`);
      logger.info(`Total permissions: ${order}`);

      if (userId) {
        await AuditLog.log({
          action: AUDIT_ACTIONS.PERMISSIONS_SEEDED,
          entityType: 'system',
          entityId: 'permissions',
          entityName: 'Permissions Seed',
          performedBy: userId,
          metadata: { created: createdPermissionsCount, existing: existingPermissionsCount, total: order },
        });
      }

      return {
        created: createdPermissionsCount,
        existing: existingPermissionsCount,
        total: order,
      }

    }
    else {
      const newPermission = await seedPermissions(userId);
      return newPermission;
    }
  } catch (error) {
    throw new Error(`Error seeding permissions: ${error.message}`);
  }
}
/**
 * Get permission templates
 */
const getPermissionTemplates = async () => {
  return Object.entries(PERMISSION_TEMPLATES).map(([key, template]) => ({
    key,
    name: template.name,
    description: template.description,
    permissionCount: template.permissions.length,
  }));
};

/**
 * Get template details with permissions
 */
const getTemplateDetails = async (templateKey) => {
  const template = PERMISSION_TEMPLATES[templateKey];
  if (!template) {
    throw new Error(`Template "${templateKey}" not found`);
  }

  // Get permission details
  const permissions = await getPermissionsByKeys(template.permissions);

  return {
    key: templateKey,
    ...template,
    permissions: permissions,
  };
};

/**
 * Validate permission keys exist
 */
const validatePermissionKeys = async (keys) => {
  const normalizedKeys = keys.map(k => k.toLowerCase());
  const validPermissions = await Permission.find({
    key: { $in: normalizedKeys },
    active: true
  }).select('key').lean();

  const validKeys = new Set(validPermissions.map(p => p.key));
  const invalidKeys = normalizedKeys.filter(k => !validKeys.has(k));

  return {
    valid: invalidKeys.length === 0,
    validKeys: Array.from(validKeys),
    invalidKeys,
  };
};

module.exports = {
  getAllPermissions,
  getPermissionGroups,
  getPermissionByKey,
  getPermissionsByKeys,
  seedPermissions,
  getPermissionTemplates,
  getTemplateDetails,
  validatePermissionKeys,
  PERMISSION_GROUPS,
  seedPermissionsv2,
  PERMISSION_METADATA,
};
