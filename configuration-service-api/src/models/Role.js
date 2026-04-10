/**
 * Role Model (Read-Only)
 * Queries the shared roles collection managed by user-auth-service
 */

const mongoose = require('mongoose');

const RoleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true, index: true },
    displayName: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    permissions: [{ type: String, trim: true, lowercase: true }],
    parentRole: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', default: null },
    hierarchyLevel: { type: Number, default: 0 },
    isSystem: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

RoleSchema.index({ active: 1, name: 1 });

RoleSchema.statics.getByName = async function (name) {
  return this.findOne({ name, active: true }).lean();
};

RoleSchema.statics.getAllActive = async function () {
  return this.find({ active: true }).lean();
};

const Role = mongoose.model('Role', RoleSchema);
module.exports = Role;
