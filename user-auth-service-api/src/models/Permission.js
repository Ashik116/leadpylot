  /**
   * Permission Model
   * Defines granular permissions for the RBAC system
   */

  const mongoose = require('mongoose');

  /**
   * Permission groups for UI organization
   */
  const PERMISSION_GROUPS = {
    USER: 'User Management',
    PROJECT: 'Project Management',
    LEAD: 'Lead Management',
    BANK: 'Bank Management',
    ASSIGNMENT: 'Lead Assignment',
    ASSIGNMENT_MANAGEMENT: 'Assignment Management',
    SETTINGS: 'Settings',
    SETTINGS_MANAGEMENT: 'Settings Management',
    ANALYTICS: 'Analytics',
    OFFER: 'Offer Management',
    OPENING: 'Opening Management',
    CONFIRMATION: 'Confirmation Management',
    PAYMENT_VOUCHER: 'Payment Voucher',
    ACTIVITY: 'Activity',
    SOURCE: 'Source Management',
    EMAIL: 'Email System',
    NOTIFICATION: 'Notifications',
    ADMIN: 'Administration',
    ADMIN_MANAGEMENT: 'Admin Management',
    ROLE: 'Role Management',
    PERMISSION_MANAGEMENT: 'Permission Management',
    USER_PASSWORD_CHANGE: 'User Password Change',
    DOCUMENT: 'Document Management',
    DOCUMENT_LIBRARY: 'Document Library',
    CALL: 'Call Management',
    TODO: 'Todo Management',
    REPORT: 'Reports',
    PDF_SERVICE: 'PDF Service',
    DEVICE_SECURITY: 'Device Security',
    UNIFIED_SECURITY: 'Unified Security',
    SECURITY: 'Security',
    SEARCH_SERVICE: 'Search Service',
    OTHER: 'Other',
    PAYMENT_VOUCHER_MANAGEMENT: 'Payment Voucher Management',
    ACTIVITY_MANAGEMENT: 'Activity Management',
    REPORTING_SERVICES: 'Reporting Services',
    KANBAN_BOARD: 'Kanban Board',
    OFFICE_MANAGEMENT: 'Office Management',
  };

  /**
   * Permission actions
   */
  const PERMISSION_ACTIONS = {
    CREATE: 'create',
    READ: 'read',
    UPDATE: 'update',
    DELETE: 'delete',
    ASSIGN: 'assign',
    APPROVE: 'approve',
    REJECT: 'reject',
    MANAGE: 'manage',
    VIEW: 'view',
    SEND: 'send',
    DOWNLOAD: 'download',
  };

  const PermissionSchema = new mongoose.Schema(
    {
      // Unique permission key (e.g., 'user:create', 'lead:read:all')
      key: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        index: true,
      },

      // Human-readable name
      name: {
        type: String,
        required: true,
        trim: true,
      },

      // Description of what this permission allows
      description: {
        type: String,
        trim: true,
      },

      // Resource this permission applies to (e.g., 'user', 'lead', 'offer')
      resource: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        index: true,
      },

      // Action type (e.g., 'create', 'read', 'update', 'delete')
      action: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
      },

      // Scope of the permission (e.g., 'all', 'own', 'assigned')
      scope: {
        type: String,
        enum: [
          'all', 'own', 'assigned', 'project',
          'stats', 'constants', 'agent', 'attachments', 'workflow', 'document', 'library',
          'pdf', 'font', 'generation', 'template', 'security', 'device', 'notification', 'email',
          'draft', 'sync', 'send',
          'statistics', 'task', 'assignments', 'failed_logins',
          'successful_logins', 'active_sessions', 'blocked_ips',
          'internal_comment', 'canned_response', 'reportings', 'single', 'read', 'create',
          'employees', 'working_hours',
          null
        ],
        default: null,
      },

      // Group for UI organization
      group: {
        type: String,
        enum: Object.values(PERMISSION_GROUPS),
        required: true,
      },

      // System permissions cannot be deleted
      isSystem: {
        type: Boolean,
        default: true,
      },

      // Whether the permission is active
      active: {
        type: Boolean,
        default: true,
      },

      // Display order within group
      displayOrder: {
        type: Number,
        default: 0,
      },
    },
    {
      timestamps: true,
    }
  );

  // Compound index for faster lookups
  PermissionSchema.index({ resource: 1, action: 1, scope: 1 });
  PermissionSchema.index({ group: 1, displayOrder: 1 });
  // Text index for search functionality (searches in key, name, description, group)
  PermissionSchema.index({ key: 'text', name: 'text', description: 'text', group: 'text' });

  /**
   * Static method to get all permissions grouped by category
   */
  PermissionSchema.statics.getGroupedPermissions = async function () {
    const permissions = await this.find({ active: true })
      .sort({ group: 1, displayOrder: 1, name: 1 })
      .lean();

    const grouped = {};
    for (const permission of permissions) {
      if (!grouped[permission.group]) {
        grouped[permission.group] = [];
      }
      grouped[permission.group].push(permission);
    }

    return grouped;
  };

  /**
   * Static method to get permission by key
   */
  PermissionSchema.statics.getByKey = async function (key) {
    return this.findOne({ key: key.toLowerCase(), active: true }).lean();
  };

  /**
   * Static method to get multiple permissions by keys
   */
  PermissionSchema.statics.getByKeys = async function (keys) {
    const normalizedKeys = keys.map((k) => k.toLowerCase());
    return this.find({ key: { $in: normalizedKeys }, active: true }).lean();
  };

  const Permission = mongoose.model('Permission', PermissionSchema);

  module.exports = {
    Permission,
    PERMISSION_GROUPS,
    PERMISSION_ACTIONS,
  };



