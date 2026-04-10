/**
 * Role Model
 * Defines roles and their associated permissions for the RBAC system
 */

const mongoose = require('mongoose');

const RoleSchema = new mongoose.Schema(
  {
    // Role name (unique identifier)
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    // Human-readable display name
    displayName: {
      type: String,
      required: true,
      trim: true,
    },

    // Description of the role
    description: {
      type: String,
      trim: true,
    },

    // Color for UI display (hex code)
    color: {
      type: String,
      default: '#6366f1',
      trim: true,
    },

    // Icon for UI display
    icon: {
      type: String,
      default: 'user',
      trim: true,
    },

    // Permissions assigned to this role (array of permission keys)
    permissions: [{
      type: String,
      trim: true,
      lowercase: true,
    }],

    // Parent role for hierarchy (inherits parent's permissions)
    parentRole: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role',
      default: null,
    },

    // Hierarchy level (0 = top level, higher = lower in hierarchy)
    hierarchyLevel: {
      type: Number,
      default: 0,
    },

    // System roles cannot be deleted (Admin, Agent, etc.)
    isSystem: {
      type: Boolean,
      default: false,
    },

    // Whether the role is active
    active: {
      type: Boolean,
      default: true,
    },

    // Role created from template
    templateId: {
      type: String,
      default: null,
    },

    // Source role this was cloned from (for permission inheritance/propagation)
    sourceRole: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role',
      default: null,
    },

    // Permissions explicitly added to this role (beyond source role's permissions)
    includePermissions: [{
      type: String,
      trim: true,
      lowercase: true,
    }],

    // Permissions explicitly excluded from this role (from source role's permissions)
    excludePermissions: [{
      type: String,
      trim: true,
      lowercase: true,
    }],

    // User who created this role
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // User who last modified this role
    modifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
RoleSchema.index({ active: 1, name: 1 });
RoleSchema.index({ parentRole: 1 });
RoleSchema.index({ sourceRole: 1 });

/**
 * Get all effective permissions for a role (including inherited from parent)
 */
RoleSchema.methods.getEffectivePermissions = async function () {
  const permissions = new Set(this.permissions);

  // If there's a parent role, recursively get its permissions
  if (this.parentRole) {
    const Role = mongoose.model('Role');
    const parent = await Role.findById(this.parentRole);
    if (parent && parent.active) {
      const parentPermissions = await parent.getEffectivePermissions();
      parentPermissions.forEach((p) => permissions.add(p));
    }
  }

  return Array.from(permissions);
};

/**
 * Check if role has a specific permission
 */
RoleSchema.methods.hasPermission = async function (permissionKey) {
  const effectivePermissions = await this.getEffectivePermissions();
  return effectivePermissions.includes(permissionKey.toLowerCase());
};

/**
 * Static method to get role with all permissions populated
 */
RoleSchema.statics.getByName = async function (name) {
  return this.findOne({ name, active: true }).lean();
};

/**
 * Static method to get role by ID with effective permissions
 */
RoleSchema.statics.getByIdWithPermissions = async function (id) {
  const role = await this.findById(id);
  if (!role || !role.active) return null;

  const effectivePermissions = await role.getEffectivePermissions();
  return {
    ...role.toObject(),
    effectivePermissions,
  };
};

/**
 * Static method to get all active roles
 */
RoleSchema.statics.getAllActive = async function () {
  return this.find({ active: true })
    .sort({ hierarchyLevel: 1, name: 1 })
    .lean();
};

/**
 * Static method to check if a role name exists
 */
RoleSchema.statics.nameExists = async function (name, excludeId = null) {
  const query = { name: { $regex: new RegExp(`^${name}$`, 'i') } };
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  const existing = await this.findOne(query);
  return !!existing;
};

/**
 * Static method to find all child roles (direct children only)
 * @param {ObjectId} roleId - The parent role ID
 * @returns {Promise<Array>} - Array of child role documents
 */
RoleSchema.statics.findChildren = async function (roleId) {
  return this.find({ sourceRole: roleId, active: true });
};

/**
 * Static method to check if a role has any child roles
 * @param {ObjectId} roleId - The role ID to check
 * @returns {Promise<boolean>} - True if role has children
 */
RoleSchema.statics.hasChildren = async function (roleId) {
  const count = await this.countDocuments({ sourceRole: roleId, active: true });
  return count > 0;
};

/**
 * Static method to find all descendants (children, grandchildren, etc.)
 * @param {ObjectId} roleId - The root role ID
 * @returns {Promise<Array>} - Array of all descendant role documents
 */
RoleSchema.statics.findDescendants = async function (roleId) {
  const descendants = [];
  const queue = [roleId];

  while (queue.length > 0) {
    const currentId = queue.shift();
    const children = await this.find({ sourceRole: currentId, active: true });
    for (const child of children) {
      descendants.push(child);
      queue.push(child._id);
    }
  }

  return descendants;
};

/**
 * Pre-save hook to normalize permissions
 */
RoleSchema.pre('save', function (next) {
  // Ensure permissions are lowercase
  if (this.permissions) {
    this.permissions = this.permissions.map((p) => p.toLowerCase());
  }
  // Ensure includePermissions are lowercase
  if (this.includePermissions) {
    this.includePermissions = this.includePermissions.map((p) => p.toLowerCase());
  }
  // Ensure excludePermissions are lowercase
  if (this.excludePermissions) {
    this.excludePermissions = this.excludePermissions.map((p) => p.toLowerCase());
  }
  next();
});

const Role = mongoose.model('Role', RoleSchema);

module.exports = Role;



