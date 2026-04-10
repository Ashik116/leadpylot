/**
 * Tenant Mixin for MongoDB Models
 * 
 * Provides tenant isolation fields and methods for multi-tenant architecture.
 * Add this mixin to all models that need tenant isolation.
 */

const mongoose = require('mongoose');

/**
 * Tenant fields to add to any schema
 */
const tenantFields = {
  // Unique identifier for the tenant
  tenantId: {
    type: String,
    required: function() {
      // Required only if TENANT_ISOLATION_ENABLED is true
      return process.env.TENANT_ISOLATION_ENABLED === 'true';
    },
    index: true,
    // Default to 'default' for existing data migration
    default: function() {
      return process.env.DEFAULT_TENANT_ID || 'default';
    },
    // Prevent tenant ID from being changed after creation
    immutable: true,
  },
};

/**
 * Add tenant fields to a schema
 * @param {mongoose.Schema} schema - The schema to add tenant fields to
 */
const addTenantFields = (schema) => {
  schema.add(tenantFields);
  
  // Add compound index for tenant + other common queries
  schema.index({ tenantId: 1, createdAt: -1 });
  schema.index({ tenantId: 1, active: 1 });
};

/**
 * Create pre-save middleware to ensure tenantId is set
 * @param {mongoose.Schema} schema - The schema to add middleware to
 */
const addTenantMiddleware = (schema) => {
  // Pre-save: Ensure tenantId is set
  schema.pre('save', function(next) {
    if (!this.tenantId && process.env.TENANT_ISOLATION_ENABLED === 'true') {
      return next(new Error('tenantId is required'));
    }
    next();
  });

  // Pre-find: Automatically filter by tenant (if tenant context exists)
  // This is applied at query time by the tenant isolation middleware
};

/**
 * Static method to find documents with tenant filter
 * @param {mongoose.Schema} schema - The schema to add static methods to
 */
const addTenantStatics = (schema) => {
  /**
   * Find with tenant filter
   * @param {Object} filter - Query filter
   * @param {string} tenantId - Tenant ID to filter by
   */
  schema.statics.findByTenant = function(filter, tenantId) {
    if (tenantId) {
      return this.find({ ...filter, tenantId });
    }
    return this.find(filter);
  };

  /**
   * Find one with tenant filter
   */
  schema.statics.findOneByTenant = function(filter, tenantId) {
    if (tenantId) {
      return this.findOne({ ...filter, tenantId });
    }
    return this.findOne(filter);
  };

  /**
   * Count with tenant filter
   */
  schema.statics.countByTenant = function(filter, tenantId) {
    if (tenantId) {
      return this.countDocuments({ ...filter, tenantId });
    }
    return this.countDocuments(filter);
  };
};

/**
 * Apply all tenant features to a schema
 * @param {mongoose.Schema} schema - The schema to apply tenant features to
 */
const applyTenantMixin = (schema) => {
  addTenantFields(schema);
  addTenantMiddleware(schema);
  addTenantStatics(schema);
};

/**
 * Create a tenant-aware query wrapper
 * Use this to wrap queries with automatic tenant filtering
 * 
 * @param {mongoose.Model} Model - The model to query
 * @param {string} tenantId - The tenant ID from request context
 * @returns {Object} - Query helpers with tenant filter
 */
const createTenantQuery = (Model, tenantId) => {
  const tenantFilter = tenantId ? { tenantId } : {};

  return {
    find: (filter = {}) => Model.find({ ...filter, ...tenantFilter }),
    findOne: (filter = {}) => Model.findOne({ ...filter, ...tenantFilter }),
    findById: (id) => Model.findOne({ _id: id, ...tenantFilter }),
    countDocuments: (filter = {}) => Model.countDocuments({ ...filter, ...tenantFilter }),
    aggregate: (pipeline = []) => {
      // Prepend $match stage for tenant filter
      if (tenantId) {
        return Model.aggregate([{ $match: tenantFilter }, ...pipeline]);
      }
      return Model.aggregate(pipeline);
    },
    create: (doc) => {
      const docWithTenant = { ...doc, tenantId: tenantId || doc.tenantId };
      return Model.create(docWithTenant);
    },
    updateOne: (filter, update) => Model.updateOne({ ...filter, ...tenantFilter }, update),
    updateMany: (filter, update) => Model.updateMany({ ...filter, ...tenantFilter }, update),
    deleteOne: (filter) => Model.deleteOne({ ...filter, ...tenantFilter }),
    deleteMany: (filter) => Model.deleteMany({ ...filter, ...tenantFilter }),
  };
};

module.exports = {
  tenantFields,
  addTenantFields,
  addTenantMiddleware,
  addTenantStatics,
  applyTenantMixin,
  createTenantQuery,
};
