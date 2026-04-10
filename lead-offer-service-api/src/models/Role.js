/**
 * Role Model (Read-Only)
 * Queries the shared roles collection managed by user-auth-service
 * Used for permission checking in this microservice
 */

const mongoose = require('mongoose');

const RoleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    permissions: [{
      type: String,
      trim: true,
      lowercase: true,
    }],
    parentRole: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role',
      default: null,
    },
    hierarchyLevel: {
      type: Number,
      default: 0,
    },
    isSystem: {
      type: Boolean,
      default: false,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
RoleSchema.index({ active: 1, name: 1 });

/**
 * Get all effective permissions for a role (including inherited from parent)
 */
RoleSchema.methods.getEffectivePermissions = async function () {
  const permissions = new Set(this.permissions);

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
 * Static method to get role by name
 */
RoleSchema.statics.getByName = async function (name) {
  return this.findOne({ name, active: true }).lean();
};

/**
 * Static method to get all active roles
 */
RoleSchema.statics.getAllActive = async function () {
  return this.find({ active: true }).lean();
};

const Role = mongoose.model('Role', RoleSchema);

module.exports = Role;
