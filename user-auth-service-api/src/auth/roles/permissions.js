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
  USER_UPDATE: 'user:update', // Update own user data
  USER_UPDATE_ALL: 'user:update:all', // Update any user
  USER_DELETE: 'user:delete:own', // Delete own user
  USER_DELETE_ALL: 'user:delete:all', // Delete any user

  // Project permissions
  PROJECT_CREATE: 'project:create',
  PROJECT_READ: 'project:read:assigned', // Read assigned projects
  PROJECT_READ_ALL: 'project:read:all', // Read all projects
  PROJECT_UPDATE: 'project:update:assigned', // Update assigned projects
  PROJECT_UPDATE_ALL: 'project:update:all', // Update any project
  PROJECT_DELETE: 'project:delete:assigned', // Delete assigned projects
  PROJECT_DELETE_ALL: 'project:delete:all', // Delete any project
  PROJECT_ASSIGN_AGENT: 'project:assign:agent', // Assign agents to projects
  PROJECT_REMOVE_AGENT: 'project:remove:agent', // Remove agents from projects
  PROJECT_UPDATE_AGENT: 'project:update:agent', // Update agent details in projects

  // Lead permissions
  LEAD_CREATE: 'lead:create', // Create new leads
  LEAD_READ_ASSIGNED: 'lead:read:assigned', // Read only assigned leads
  LEAD_READ_ALL: 'lead:read:all', // Read all leads
  LEAD_UPDATE: 'lead:update', // Update any lead
  LEAD_DELETE: 'lead:delete:assigned', // Delete assigned lead
  LEAD_DELETE_ALL: 'lead:delete:all', // Delete any lead
  LEAD_ASSIGN: 'lead:assign', // Assign leads to agents

  // Bank permissions
  BANK_CREATE: 'bank:create', // Create new banks
  BANK_READ_ASSIGNED: 'bank:read:assigned', // Read only assigned banks
  BANK_READ_ALL: 'bank:read:all', // Read all banks
  BANK_UPDATE: 'bank:update', // Update any bank
  BANK_DELETE: 'bank:delete:assigned', // Delete assigned bank
  BANK_DELETE_ALL: 'bank:delete:all', // Delete any bank
  BANK_ASSIGN: 'bank:assign', // Assign banks to agents

  // Assign Leads permissions
  ASSIGN_LEAD_CREATE: 'assign:create', // Create lead assignments
  ASSIGN_LEAD_READ_OWN: 'assign:read:own', // Read own lead assignments
  ASSIGN_LEAD_READ_PROJECT: 'assign:read:project', // Read project lead assignments
  ASSIGN_LEAD_READ_ALL: 'assign:read:all', // Read all lead assignments
  ASSIGN_LEAD_UPDATE: 'assign:update', // Update lead assignments
  ASSIGN_LEAD_DELETE: 'assign:delete:own', // Delete/archive own assignments
  ASSIGN_LEAD_DELETE_ALL: 'assign:delete:all', // Delete/archive all assignments
  ASSIGN_LEAD_AGENT_UPDATE: 'assign:agent:update', // Update agent assigned to lead

  // Settings permissions
  SETTINGS_CREATE: 'settings:create', // Create settings
  SETTINGS_READ: 'settings:read:all', // Read all settings
  SETTINGS_UPDATE: 'settings:update', // Update settings
  SETTINGS_DELETE: 'settings:delete:all', // Delete settings
  SETTINGS_BULK_DELETE: 'settings:bulk_delete',

  // Analytics permissions
  ANALYTICS_CREATE: 'analytics:create', // Create analytics reports
  ANALYTICS_VIEW_OWN: 'analytics:read:own', // View/Read own analytics
  ANALYTICS_VIEW_PROJECT: 'analytics:read:project', // View/Read project analytics
  ANALYTICS_VIEW_ALL: 'analytics:read:all', // View/Read all analytics
  ANALYTICS_UPDATE: 'analytics:update', // Update analytics
  ANALYTICS_DELETE: 'analytics:delete:all', // Delete analytics

  // Offer permissions
  OFFER_CREATE: 'offer:create', // Create new offers
  OFFER_READ_OWN: 'offer:read:own', // Read only own offers
  OFFER_READ_ALL: 'offer:read:all', // Read all offers
  OFFER_UPDATE_OWN: 'offer:update:own', // Update own offers
  OFFER_UPDATE_ALL: 'offer:update:all', // Update any offer
  OFFER_DELETE_OWN: 'offer:delete:own', // Delete own offers
  OFFER_DELETE_ALL: 'offer:delete:all', // Delete any offer

  // Opening permissions
  OPENING_CREATE: 'opening:create', // Create new openings
  OPENING_READ: 'opening:read:own', // Read own openings
  OPENING_READ_ALL: 'opening:read:all', // Read all openings
  OPENING_UPDATE: 'opening:update', // Update openings
  OPENING_DELETE: 'opening:delete:own', // Delete own openings
  OPENING_DELETE_ALL: 'opening:delete:all', // Delete all openings

  // Confirmation permissions
  CONFIRMATION_CREATE: 'confirmation:create', // Create new confirmations
  CONFIRMATION_READ: 'confirmation:read:own', // Read own confirmations
  CONFIRMATION_READ_ALL: 'confirmation:read:all', // Read all confirmations
  CONFIRMATION_UPDATE: 'confirmation:update', // Update confirmations
  CONFIRMATION_DELETE: 'confirmation:delete:own', // Delete own confirmations
  CONFIRMATION_DELETE_ALL: 'confirmation:delete:all', // Delete all confirmations

  // Payment Voucher permissions
  PAYMENT_VOUCHER_CREATE: 'payment_voucher:create', // Create new payment vouchers
  PAYMENT_VOUCHER_READ: 'payment_voucher:read:own', // Read own payment vouchers
  PAYMENT_VOUCHER_READ_ALL: 'payment_voucher:read:all', // Read all payment vouchers
  PAYMENT_VOUCHER_UPDATE: 'payment_voucher:update', // Update payment vouchers
  PAYMENT_VOUCHER_DELETE: 'payment_voucher:delete:own', // Delete own payment vouchers
  PAYMENT_VOUCHER_DELETE_ALL: 'payment_voucher:delete:all', // Delete all payment vouchers

  // Activity permissions
  ACTIVITY_CREATE: 'activity:create', // Create activity
  ACTIVITY_READ_OWN: 'activity:read:own', // Read own activities
  ACTIVITY_READ_ALL: 'activity:read:all', // Read all activities
  ACTIVITY_UPDATE: 'activity:update', // Update activity
  ACTIVITY_DELETE: 'activity:delete:own', // Delete own activity
  ACTIVITY_DELETE_ALL: 'activity:delete:all', // Delete all activities

  // Source permissions
  SOURCE_CREATE: 'source:create', // Create new sources
  SOURCE_READ: 'source:read:all', // Read sources
  SOURCE_UPDATE: 'source:update', // Update sources
  SOURCE_DELETE: 'source:delete:all', // Delete sources

  // Email System permissions
  EMAIL_CREATE: 'email:create', // Create new emails (system use)
  EMAIL_SEND: 'email:send', // Send emails to leads (agents/admins)
  EMAIL_READ_OWN: 'email:read:own', // Read own emails (agents)
  EMAIL_READ_ALL: 'email:read:all', // Read all emails (admins)
  EMAIL_UPDATE: 'email:update', // Update emails
  EMAIL_DELETE: 'email:delete:own', // Delete own emails
  EMAIL_DELETE_ALL: 'email:delete:all', // Delete all emails
  EMAIL_APPROVE: 'email:approve', // Approve emails (admins)
  EMAIL_REJECT: 'email:reject', // Reject emails (admins)
  EMAIL_ASSIGN: 'email:assign', // Assign emails to leads/agents (admins)
  EMAIL_DOWNLOAD_ATTACHMENTS: 'email:download:attachments', // Download approved attachments
  EMAIL_MANAGE_WORKFLOW: 'email:manage:workflow', // Manage email workflows (admins)
  EMAIL_VIEW_STATISTICS: 'email:view:statistics', // View email statistics (admins)
  EMAIL_TASK_CREATE: 'email:task:create', // Create email tasks (admin/agents)

  EMAIL_INTERNAL_COMMENT_CREATE: 'email:internal:comment:create', // Create internal comments
  EMAIL_INTERNAL_COMMENT_READ: 'email:internal:comment:read', // Read internal comments
  EMAIL_INTERNAL_COMMENT_UPDATE: 'email:internal:comment:update', // Update internal comments
  EMAIL_INTERNAL_COMMENT_DELETE: 'email:internal:comment:delete', // Delete internal comments
  EMAIL_INTERNAL_COMMENT_READ_ALL: 'email:internal:comment:read:all', // Read all internal comments
  EMAIL_INTERNAL_COMMENT_DELETE_ALL: 'email:internal:comment:delete:all', // Delete all internal comments
  EMAIL_INTERNAL_COMMENT_UPDATE_ALL: 'email:internal:comment:update:all', // Update all internal comments
  EMAIL_INTERNAL_COMMENT_CREATE_ALL: 'email:internal:comment:create:all', // Create all internal comments

  EMAIL_CANNED_RESPONSE_READ: 'email:canned:response:read', // Read canned responses
  EMAIL_CANNED_RESPONSE_CREATE: 'email:canned:response:create', // Create canned responses
  EMAIL_CANNED_RESPONSE_UPDATE: 'email:canned:response:update', // Update canned responses
  EMAIL_CANNED_RESPONSE_DELETE: 'email:canned:response:delete', // Delete canned responses
  EMAIL_CANNED_RESPONSE_READ_ALL: 'email:canned:response:read:all', // Read all canned responses
  EMAIL_CANNED_RESPONSE_DELETE_ALL: 'email:canned:response:delete:all', // Delete all canned responses
  EMAIL_CANNED_RESPONSE_UPDATE_ALL: 'email:canned:response:update:all', // Update all canned responses
  EMAIL_CANNED_RESPONSE_CREATE_ALL: 'email:canned:response:create:all', // Create all canned responses

  EMAIL_DRAFT_CREATE: 'email:draft:create', // Create a new email draft
  EMAIL_DRAFT_READ: 'email:draft:read:all', // Read all email drafts
  EMAIL_DRAFT_UPDATE: 'email:draft:update', // Update an email draft
  EMAIL_DRAFT_DELETE: 'email:draft:delete:all', // Delete an email draft
  EMAIL_DRAFT_SYNC: 'email:draft:sync', // Sync email drafts
  EMAIL_DRAFT_SEND: 'email:draft:send', // Send an email draft

  // Notification permissions
  NOTIFICATION_CREATE_OWN: 'notification:create:own', // Create own notifications
  NOTIFICATION_CREATE_ALL: 'notification:create:all', // Create notifications for any user
  NOTIFICATION_READ_OWN: 'notification:read:own', // Read own notifications
  NOTIFICATION_READ_ALL: 'notification:read:all', // Read all notifications
  NOTIFICATION_UPDATE_OWN: 'notification:update:own', // Update own notifications
  NOTIFICATION_UPDATE_ALL: 'notification:update:all', // Update any notification
  NOTIFICATION_DELETE_OWN: 'notification:delete:own', // Delete own notifications
  NOTIFICATION_DELETE_ALL: 'notification:delete:all', // Delete any notification


  // Document Library permissions
  DOCUMENT_LIBRARY_READ: 'document:library:read:all', // Read all document library
  DOCUMENT_LIBRARY_UPLOAD: 'document:library:upload', // Upload to document library
  ATTACHMENT_VIEW: 'attachment:view', // View attachment
  ATTACHMENT_DOWNLOAD: 'attachment:download', // Download attachment
  ATTACHMENT_READ: 'attachment:read:all', // Read all attachments
  ATTACHMENT_DELETE: 'attachment:delete:all', // Delete all attachments
  ATTACHMENT_BULK_DELETE: 'attachment:bulk:delete', // Bulk delete attachments

  // PDF Service Starts
  // Font Management permissions
  FONT_MANAGEMENT_READ: 'font:management:read', // Read font management
  FONT_MANAGEMENT_CREATE: 'font:management:create', // Create font management
  FONT_MANAGEMENT_UPDATE: 'font:management:update', // Update font management
  FONT_MANAGEMENT_DELETE: 'font:management:delete', // Delete font management

  // PDF Generation permissions
  PDF_GENERATION_READ: 'pdf:generation:read', // Read PDF generation
  PDF_GENERATION_CREATE: 'pdf:generation:create', // Create PDF generation
  PDF_GENERATION_UPDATE: 'pdf:generation:update', // Update PDF generation
  PDF_GENERATION_DELETE: 'pdf:generation:delete', // Delete PDF generation


  // PDF Template permissions
  PDF_TEMPLATE_READ: 'pdf:template:read', // Read PDF template
  PDF_TEMPLATE_CREATE: 'pdf:template:create', // Create PDF template
  PDF_TEMPLATE_UPDATE: 'pdf:template:update', // Update PDF template
  PDF_TEMPLATE_DELETE: 'pdf:template:delete', // Delete PDF template

  // PDF Service Ends

  //  Reporting Services Permissions
  REPORTINGS_READ_ALL: 'reportings:read:all', // Read all reportings
  REPORTINGS_READ_SINGLE: 'reportings:read:single', // Read single reporting
  REPORTINGS_CREATE: 'reportings:create', // Create reporting

  // Device Security permissions
  DEVICE_SECURITY_STATS: 'device:security:stats', // Read device security statistics
  DEVICE_SECURITY_CONSTANTS: 'device:security:constants', // Read device security constants
  DEVICE_SECURITY_BLOCK_CREATE: 'device:security:block:create', // Create a device block
  DEVICE_SECURITY_UNBLOCK_CREATE: 'device:security:unblock:create', // Create a device block
  DEVICE_SECURITY_BLOCK_READ: 'device:security:block:read', // Read a device block
  DEVICE_SECURITY_UNBLOCK: 'device:security:unblock', // Unblock a device
  DEVICE_SECURITY_BLOCK_DELETE: 'device:security:block:delete', // Delete a device block

  // Admin permissions (Expanded for Matrix)
  ADMIN_CREATE: 'admin:create',
  ADMIN_ACCESS: 'admin:read:all', // Mapped to read:all for matrix visibility
  ADMIN_UPDATE: 'admin:update',
  ADMIN_DELETE: 'admin:delete:all',


  // Role Management permissions (for RBAC)
  ROLE_CREATE: 'role:create',
  ROLE_READ: 'role:read:all', // Changed to read:all for matrix
  ROLE_UPDATE: 'role:update',
  ROLE_DELETE: 'role:delete:all',
  ROLE_ASSIGN: 'role:assign',

  // Permission Management
  PERMISSION_CREATE: 'permission:create',
  PERMISSION_READ: 'permission:read:all',
  PERMISSION_UPDATE: 'permission:update',
  PERMISSION_DELETE: 'permission:delete:all',
  PERMISSION_MANAGE: 'permission:manage',

  // User Password Change permissions (for RBAC)
  USER_PASSWORD_CHANGE: 'user:update:password', // Change user password
  USER_PASSWORD_CHANGE_ALL: 'user:update:password:all', // Change any user password
  USER_PASSWORD_CHANGE_OWN: 'user:update:password:own', // Change own user password


  // Unified Security permissions
  UNIFIED_SECURITY_DASHBOARD_READ: 'unified:security:dashboard:read', // Read unified security dashboard
  UNIFIED_SECURITY_BLOCK_READ: 'unified:security:block:read', // Read unified security blocks
  UNIFIED_SECURITY_BLOCK_IP_CREATE: 'unified:security:block:ip:create', // Create a unified security blocked IP address
  UNIFIED_SECURITY_BLOCK_DEVICE_CREATE: 'unified:security:block:device:create', // Create a unified security blocked device
  UNIFIED_SECURITY_UNBLOCK_CREATE: 'unified:security:unblock:create', // Create a unified security unblocked device
  UNIFIED_SECURITY_CONSTANTS_READ: 'unified:security:constants:read', // Read unified security constants
  UNIFIED_SECURITY_BLOCK_DELETE: 'unified:security:block:delete', // Delete a unified security blocked device

  // Security permissions
  SECURITY_DASHBOARD_READ: 'security:dashboard:read', // Read security dashboard
  SECURITY_STATS_READ: 'security:stats:read', // Read security statistics
  SECURITY_FAILED_LOGINS_READ: 'security:failed:logins:read', // Read failed login attempts
  SECURITY_SUCCESSFUL_LOGINS_READ: 'security:successful:logins:read', // Read successful login attempts
  SECURITY_ACTIVE_SESSIONS_READ: 'security:active:sessions:read', // Read active user sessions
  SECURITY_BLOCKED_IPS_READ: 'security:blocked:ips:read', // Read blocked IP addresses
  SECURITY_BLOCK_IP_CREATE: 'security:block:ip:create', // Create a blocked IP address
  SECURITY_BLOCK_IP_DELETE: 'security:block:ip:delete', // Delete a blocked IP address
  SECURITY_FORCE_LOGOUT_CREATE: 'security:force:logout:create', // Force logout a user session

  // Search Service permissions
  SEARCH_EXECUTE: 'search:execute', // Execute search queries
  SEARCH_READ_OWN: 'search:read:own', // Read own search results
  SEARCH_READ_ALL: 'search:read:all', // Read all search results
  METADATA_READ: 'metadata:read', // Read metadata

  // Audit permissions
  AUDIT_READ: 'audit:read:all', // Read all audit logs
  AUDIT_CREATE: 'audit:create', // Create audit entries
  AUDIT_DELETE: 'audit:delete:all', // Delete audit entries

  // Credential Access permissions
  CREDENTIAL_VIEW: 'credential:view', // View user platform credentials
  CREDENTIAL_DECRYPT: 'credential:decrypt', // Decrypt and view passwords
  CREDENTIAL_ACCESS_LOG_READ: 'credential:access:log:read', // Read credential access logs

  // Office permissions
  OFFICE_CREATE: 'office:create',
  OFFICE_READ: 'office:read',
  OFFICE_READ_ALL: 'office:read:all',
  OFFICE_READ_ASSIGNED: 'office:read:assigned',
  OFFICE_UPDATE: 'office:update',
  OFFICE_DELETE: 'office:delete',
  OFFICE_DELETE_ALL: 'office:delete:all',
  OFFICE_ASSIGN_EMPLOYEE: 'office:assign:employee',
  OFFICE_MANAGE_EMPLOYEES: 'office:manage:employees',
  OFFICE_MANAGE_WORKING_HOURS: 'office:manage:working_hours',

  // Kanban board permissions
  KANBAN_BOARD_READ_OWN: 'kanban:board:read:own', // Read own kanban board
  KANBAN_BOARD_READ_ASSIGNED: 'kanban:board:read:assigned', // Read assigned kanban board
  KANBAN_BOARD_CREATE: 'kanban:board:create', // Create kanban board
  KANBAN_BOARD_UPDATE: 'kanban:board:update', // Update kanban board
  KANBAN_BOARD_DELETE: 'kanban:board:delete', // Delete kanban board
  KANBAN_BOARD_UPDATE_OWN: 'kanban:board:update:own', // Update own kanban board
  KANBAN_BOARD_UPDATE_ASSIGNED: 'kanban:board:update:assigned', // Update assigned kanban board
  KANBAN_BOARD_DELETE_OWN: 'kanban:board:delete:own', // Delete own kanban board
  KANBAN_BOARD_DELETE_ASSIGNED: 'kanban:board:delete:assigned', // Delete assigned kanban board
  KANBAN_BOARD_READ_ALL: 'kanban:board:read:all', // Read all kanban boards
  KANBAN_BOARD_CREATE_ALL: 'kanban:board:create:all', // Create all kanban boards
  KANBAN_BOARD_UPDATE_ALL: 'kanban:board:update:all', // Update all kanban boards
  KANBAN_BOARD_DELETE_ALL: 'kanban:board:delete:all', // Delete all kanban boards

  // kanban task permissions
  KANBAN_TASK_READ_OWN: 'kanban:task:read:own', // Read own kanban task
  KANBAN_TASK_READ_ASSIGNED: 'kanban:task:read:assigned', // Read assigned kanban task
  KANBAN_TASK_CREATE: 'kanban:task:create', // Create kanban task
  KANBAN_TASK_UPDATE: 'kanban:task:update', // Update kanban task
  KANBAN_TASK_DELETE: 'kanban:task:delete', // Delete kanban task
  KANBAN_TASK_READ_ALL: 'kanban:task:read:all', // Read all kanban tasks
  KANBAN_TASK_CREATE_ALL: 'kanban:task:create:all', // Create all kanban tasks
  KANBAN_TASK_UPDATE_ALL: 'kanban:task:update:all', // Update all kanban tasks
  KANBAN_TASK_DELETE_ALL: 'kanban:task:delete:all', // Delete all kanban tasks

  // kanban list permissions
  KANBAN_LIST_CREATE: 'kanban:list:create', // Create kanban list
  KANBAN_LIST_UPDATE: 'kanban:list:update', // Update kanban list
  KANBAN_LIST_DELETE: 'kanban:list:delete', // Delete kanban list
  KANBAN_LIST_CREATE_OWN: 'kanban:list:create:own', // Create own kanban list
  KANBAN_LIST_CREATE_ASSIGNED: 'kanban:list:create:assigned', // Create assigned kanban list
  KANBAN_LIST_CREATE_ALL: 'kanban:list:create:all', // Create all kanban lists
  KANBAN_LIST_UPDATE_OWN: 'kanban:list:update:own', // Update own kanban list
  KANBAN_LIST_UPDATE_ASSIGNED: 'kanban:list:update:assigned', // Update assigned kanban list
  KANBAN_LIST_UPDATE_ALL: 'kanban:list:update:all', // Update all kanban lists
  KANBAN_LIST_DELETE_OWN: 'kanban:list:delete:own', // Delete own kanban list
  KANBAN_LIST_DELETE_ASSIGNED: 'kanban:list:delete:assigned', // Delete assigned kanban list
  KANBAN_LIST_DELETE_ALL: 'kanban:list:delete:all', // Delete all kanban lists
  
};

module.exports = {
  PERMISSIONS,
};
