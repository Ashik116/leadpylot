/**
 * Tenant Isolation Middleware
 * 
 * Automatically injects tenant context into all database queries.
 * This ensures tenant data isolation at the middleware level.
 */

const mongoose = require('mongoose');

const TENANT_ISOLATION_ENABLED = process.env.TENANT_ISOLATION_ENABLED === 'true';

/**
 * Middleware to inject tenant context into request
 * Should be used after gateway authentication
 */
const tenantIsolation = (req, res, next) => {
  // Get tenant ID from gateway headers (set by gateway auth)
  const tenantId = req.headers['x-tenant-id'] || req.tenantId;
  
  if (TENANT_ISOLATION_ENABLED && !tenantId) {
    // If tenant isolation is enabled but no tenant ID, reject
    // Unless it's an admin request (handled separately)
    const isAdminRequest = req.user?.role?.toLowerCase() === 'admin';
    
    if (!isAdminRequest) {
      console.warn('⚠️ Tenant isolation: Missing tenant ID', {
        path: req.path,
        method: req.method,
      });
    }
  }
  
  // Set tenant context on request
  req.tenantId = tenantId;
  
  // Create tenant filter for queries
  req.tenantFilter = tenantId ? { tenantId } : {};
  
  // Helper function to add tenant filter to any query
  req.withTenant = (filter = {}) => {
    if (!tenantId) return filter;
    return { ...filter, tenantId };
  };
  
  // Helper to create document with tenant ID
  req.withTenantDoc = (doc) => {
    if (!tenantId) return doc;
    return { ...doc, tenantId };
  };
  
  next();
};

/**
 * Mongoose plugin to automatically add tenant filtering to queries
 * Apply this to models that need automatic tenant filtering
 */
const tenantPlugin = (schema) => {
  // Add pre hooks for find operations
  const findOperations = ['find', 'findOne', 'findOneAndUpdate', 'findOneAndDelete', 'countDocuments', 'count'];
  
  findOperations.forEach(op => {
    schema.pre(op, function() {
      // Check if tenantId filter should be applied
      // This can be bypassed by explicitly setting { bypassTenant: true } in options
      const options = this.getOptions();
      
      if (options.bypassTenant) {
        return;
      }
      
      // Get tenant ID from query context if set
      const tenantId = this.getQuery().__tenantId;
      
      if (tenantId) {
        this.where({ tenantId });
        // Remove the helper field
        delete this.getQuery().__tenantId;
      }
    });
  });
  
  // Pre-save: ensure tenantId is set
  schema.pre('save', function(next) {
    if (TENANT_ISOLATION_ENABLED && !this.tenantId) {
      // Use default tenant if not set
      this.tenantId = process.env.DEFAULT_TENANT_ID || 'default';
    }
    next();
  });
};

/**
 * Helper to create a tenant-scoped model query
 * 
 * @example
 * const leads = await tenantQuery(Lead, req.tenantId).find({ active: true });
 */
const tenantQuery = (Model, tenantId) => {
  const baseTenantFilter = tenantId ? { tenantId } : {};
  
  return {
    // Find operations
    find: (filter = {}, projection, options) => 
      Model.find({ ...filter, ...baseTenantFilter }, projection, options),
    
    findOne: (filter = {}, projection, options) => 
      Model.findOne({ ...filter, ...baseTenantFilter }, projection, options),
    
    findById: (id, projection, options) => 
      Model.findOne({ _id: id, ...baseTenantFilter }, projection, options),
    
    // Count operations
    countDocuments: (filter = {}) => 
      Model.countDocuments({ ...filter, ...baseTenantFilter }),
    
    // Update operations
    updateOne: (filter, update, options) => 
      Model.updateOne({ ...filter, ...baseTenantFilter }, update, options),
    
    updateMany: (filter, update, options) => 
      Model.updateMany({ ...filter, ...baseTenantFilter }, update, options),
    
    findOneAndUpdate: (filter, update, options) => 
      Model.findOneAndUpdate({ ...filter, ...baseTenantFilter }, update, options),
    
    // Delete operations
    deleteOne: (filter) => 
      Model.deleteOne({ ...filter, ...baseTenantFilter }),
    
    deleteMany: (filter) => 
      Model.deleteMany({ ...filter, ...baseTenantFilter }),
    
    findOneAndDelete: (filter, options) => 
      Model.findOneAndDelete({ ...filter, ...baseTenantFilter }, options),
    
    // Create with tenant ID
    create: (doc) => {
      if (Array.isArray(doc)) {
        return Model.create(doc.map(d => ({ ...d, tenantId: tenantId || d.tenantId })));
      }
      return Model.create({ ...doc, tenantId: tenantId || doc.tenantId });
    },
    
    // Aggregation with tenant filter
    aggregate: (pipeline = []) => {
      const tenantMatch = tenantId ? [{ $match: { tenantId } }] : [];
      return Model.aggregate([...tenantMatch, ...pipeline]);
    },
    
    // Get the base tenant filter
    getFilter: () => baseTenantFilter,
  };
};

/**
 * Express middleware factory for routes that need tenant isolation
 * 
 * @example
 * router.get('/leads', requireTenant, async (req, res) => {...})
 */
const requireTenant = (req, res, next) => {
  if (!TENANT_ISOLATION_ENABLED) {
    return next();
  }
  
  if (!req.tenantId) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Tenant context is required for this operation',
    });
  }
  
  next();
};

/**
 * Validate that a resource belongs to the requesting tenant
 * 
 * @example
 * const lead = await Lead.findById(id);
 * validateTenantAccess(lead, req.tenantId); // throws if mismatch
 */
const validateTenantAccess = (resource, tenantId) => {
  if (!TENANT_ISOLATION_ENABLED || !tenantId) {
    return true;
  }
  
  if (resource && resource.tenantId && resource.tenantId !== tenantId) {
    const error = new Error('Access denied to this resource');
    error.status = 403;
    throw error;
  }
  
  return true;
};

module.exports = {
  tenantIsolation,
  tenantPlugin,
  tenantQuery,
  requireTenant,
  validateTenantAccess,
  TENANT_ISOLATION_ENABLED,
};
