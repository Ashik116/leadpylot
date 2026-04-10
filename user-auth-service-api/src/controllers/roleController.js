/**
 * Role Controller
 * Handles HTTP requests for role management
 */

const roleService = require('../services/roleService');
const permissionService = require('../services/permissionService');
const auditService = require('../services/auditService');
const { asyncHandler } = require('../utils/errorHandler');
const logger = require('../utils/logger');
const { ROLE_PERMISSIONS } = require('../auth/roles/rolePermissions');

/**
 * Get all roles
 * GET /roles
 */
const getAllRoles = asyncHandler(async (req, res) => {
  const { page, limit, includeInactive } = req.query;

  const result = await roleService.getAllRoles({
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 50,
    includeInactive: includeInactive === 'true',
  });

  res.json(result);
});

/**
 * Get role by ID
 * GET /roles/:id
 */
const getRoleById = asyncHandler(async (req, res) => {
  const role = await roleService.getRoleById(req.params.id);
  res.json(role);
});

/**
 * Create new role
 * POST /roles
 */
const createRole = asyncHandler(async (req, res) => {
  const { name, displayName, description, color, icon, permissions, parentRole } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Role name is required' });
  }

  const role = await roleService.createRole({
    name,
    displayName,
    description,
    color,
    icon,
    permissions,
    parentRole,
  }, req.user._id);

  res.status(201).json(role);
});

/**
 * Create role from template
 * POST /roles/from-template
 */
const createRoleFromTemplate = asyncHandler(async (req, res) => {
  const { templateKey, name, displayName } = req.body;

  if (!templateKey || !name) {
    return res.status(400).json({ error: 'Template key and role name are required' });
  }

  const role = await roleService.createRoleFromTemplate(templateKey, name, displayName, req.user._id);
  res.status(201).json(role);
});

/**
 * Update role
 * PUT /roles/:id
 */
const updateRole = asyncHandler(async (req, res) => {
  const { name, displayName, description, color, icon, permissions, parentRole, hierarchyLevel, reset_default } = req.body;

  const updateData = {
    name,
    displayName,
    description,
    color,
    icon,
    permissions,
    parentRole,
    hierarchyLevel,
  };

  // If reset_default is true, fetch the role and reset permissions to defaults
  if (reset_default === true) {
    const existingRole = await roleService.getRoleById(req.params.id);
    if (!existingRole) {
      return res.status(404).json({ error: 'Role not found' });
    }

    // Get default permissions for this role from ROLE_PERMISSIONS
    const defaultPermissions = ROLE_PERMISSIONS[existingRole.name];
    
    if (defaultPermissions && Array.isArray(defaultPermissions)) {
      // Normalize permissions to lowercase as expected by the model
      updateData.permissions = defaultPermissions.map(p => p.toLowerCase());
    } else {
      // If no default permissions found, set to empty array
      updateData.permissions = [];
    }
  }

  const role = await roleService.updateRole(req.params.id, updateData, req.user._id);

  res.json(role);
});

/**
 * Delete role
 * DELETE /roles/:id
 */
const deleteRole = asyncHandler(async (req, res) => {
  const result = await roleService.deleteRole(req.params.id, req.user._id);
  res.json(result);
});

/**
 * Clone role
 * POST /roles/:id/clone
 */
const cloneRole = asyncHandler(async (req, res) => {
  const { name } = req.body;
  const role = await roleService.cloneRole(req.params.id, name, req.user._id);
  res.status(201).json(role);
});

/**
 * Update role permissions
 * PUT /roles/:id/permissions
 */
const updateRolePermissions = asyncHandler(async (req, res) => {
  const { permissions } = req.body;

  if (!Array.isArray(permissions)) {
    return res.status(400).json({ error: 'Permissions must be an array' });
  }

  const role = await roleService.updateRolePermissions(req.params.id, permissions, req.user._id);
  res.json(role);
});

/**
 * Bulk add permissions to role
 * POST /roles/:id/permissions/bulk
 */
const bulkAddPermissions = asyncHandler(async (req, res) => {
  const { permissions } = req.body;

  if (!Array.isArray(permissions) || permissions.length === 0) {
    return res.status(400).json({ error: 'Permissions array is required' });
  }

  const role = await roleService.bulkAddPermissions(req.params.id, permissions, req.user._id);
  res.json(role);
});

/**
 * Bulk remove permissions from role
 * DELETE /roles/:id/permissions/bulk
 */
const bulkRemovePermissions = asyncHandler(async (req, res) => {
  const { permissions } = req.body;

  if (!Array.isArray(permissions) || permissions.length === 0) {
    return res.status(400).json({ error: 'Permissions array is required' });
  }

  const role = await roleService.bulkRemovePermissions(req.params.id, permissions, req.user._id);
  res.json(role);
});

/**
 * Get all permissions
 * GET /permissions
 */
const getAllPermissions = asyncHandler(async (req, res) => {
  const { grouped } = req.query;

  const permissions = await permissionService.getAllPermissions({
    grouped: grouped === 'true',
  });

  res.json(permissions);
});

/**
 * Get permission groups
 * GET /permissions/groups?search=query
 */
const getPermissionGroups = asyncHandler(async (req, res) => {
  const { search } = req.query;
  const groups = await permissionService.getPermissionGroups({ search });
  res.json(groups);
});

/**
 * Get permission templates
 * GET /permission-templates
 */
const getPermissionTemplates = asyncHandler(async (req, res) => {
  const templates = await permissionService.getPermissionTemplates();
  res.json(templates);
});

/**
 * Get template details
 * GET /permission-templates/:key
 */
const getTemplateDetails = asyncHandler(async (req, res) => {
  const template = await permissionService.getTemplateDetails(req.params.key);
  res.json(template);
});

/**
 * Get audit logs
 * GET /roles/audit-logs
 */
const getAuditLogs = asyncHandler(async (req, res) => {
  const { page, limit, entityType, entityId, action, performedBy, startDate, endDate } = req.query;

  const result = await auditService.getAuditLogs({
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 50,
    entityType,
    entityId,
    action,
    performedBy,
    startDate,
    endDate,
  });

  res.json(result);
});

/**
 * Get audit logs for a specific role
 * GET /roles/:id/audit-logs
 */
const getRoleAuditLogs = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;

  const result = await auditService.getRoleAuditLogs(req.params.id, {
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 50,
  });

  res.json(result);
});

/**
 * Refresh all role caches
 * POST /roles/refresh-cache
 */
const refreshCache = asyncHandler(async (req, res) => {
  const result = await roleService.refreshAllRoleCaches(req.user._id);
  res.json(result);
});

/**
 * Seed permissions
 * POST /permissions/seed
 */
const seedPermissions = asyncHandler(async (req, res) => {
  const result = await permissionService.seedPermissionsv2(req.user._id);

  if (result.created === 0) {
    return res.status(200).json({ status: 'success', message: 'No permissions were created', statusCode: 200 });
  }

  res.status(201).json({
    message: 'Permissions seeded successfully',
    data: result,
    status: 'success',
    statusCode: 201,
  });
});

/**
 * Validate permission keys
 * POST /permissions/validate
 */
const validatePermissions = asyncHandler(async (req, res) => {
  const { permissions } = req.body;

  if (!Array.isArray(permissions)) {
    return res.status(400).json({ error: 'Permissions must be an array' });
  }

  const result = await permissionService.validatePermissionKeys(permissions);
  res.json(result);
});

/**
 * Update include permissions for a child role
 * PUT /roles/:id/include-permissions
 */
const updateIncludePermissions = asyncHandler(async (req, res) => {
  const { permissions } = req.body;

  if (!Array.isArray(permissions)) {
    return res.status(400).json({ error: 'Permissions must be an array' });
  }

  const role = await roleService.updateChildIncludePermissions(req.params.id, permissions, req.user._id);
  res.json(role);
});

/**
 * Update exclude permissions for a child role
 * PUT /roles/:id/exclude-permissions
 */
const updateExcludePermissions = asyncHandler(async (req, res) => {
  const { permissions } = req.body;

  if (!Array.isArray(permissions)) {
    return res.status(400).json({ error: 'Permissions must be an array' });
  }

  const role = await roleService.updateChildExcludePermissions(req.params.id, permissions, req.user._id);
  res.json(role);
});

/**
 * Force recalculate permissions from source role
 * POST /roles/:id/recalculate
 */
const recalculatePermissions = asyncHandler(async (req, res) => {
  const role = await roleService.recalculateFromSource(req.params.id, req.user._id);
  res.json(role);
});

/**
 * Get all child roles of a role
 * GET /roles/:id/children
 */
const getChildRoles = asyncHandler(async (req, res) => {
  const children = await roleService.getChildRoles(req.params.id);
  res.json(children);
});

module.exports = {
  getAllRoles,
  getRoleById,
  createRole,
  createRoleFromTemplate,
  updateRole,
  deleteRole,
  cloneRole,
  updateRolePermissions,
  bulkAddPermissions,
  bulkRemovePermissions,
  getAllPermissions,
  getPermissionGroups,
  getPermissionTemplates,
  getTemplateDetails,
  getAuditLogs,
  getRoleAuditLogs,
  refreshCache,
  seedPermissions,
  validatePermissions,
  // Child role permission management
  updateIncludePermissions,
  updateExcludePermissions,
  recalculatePermissions,
  getChildRoles,
};
