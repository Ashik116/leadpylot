/**
 * Role Routes
 * API endpoints for role and permission management
 * 
 * IMPORTANT: Specific routes MUST be defined BEFORE dynamic :id routes
 */

const express = require('express');
const router = express.Router();
const roleController = require('../controllers/roleController');
const { authenticate } = require('../auth/middleware/authenticate');
const { authorize } = require('../auth/middleware/authorize');
const { PERMISSIONS } = require('../auth/roles/permissions');

// All routes require authentication
router.use(authenticate);


// ============================================
// TEMPLATE ROUTES (MUST be before :id routes)
// ============================================

/**
 * @route   GET /roles/permission-templates
 * @desc    Get all permission templates
 * @access  Admin (requires role:read permission)
 */
router.get('/permission-templates', authorize(PERMISSIONS.ROLE_READ), roleController.getPermissionTemplates);

/**
 * @route   GET /roles/permission-templates/:key
 * @desc    Get template details
 * @access  Admin (requires role:read permission)
 */
router.get('/permission-templates/:key', authorize(PERMISSIONS.ROLE_READ), roleController.getTemplateDetails);

// ============================================
// STATIC ROLE ROUTES (before :id routes)
// ============================================

/**
 * @route   GET /roles
 * @desc    Get all roles
 * @access  Admin (requires role:read permission)
 */
router.get('/', authorize(PERMISSIONS.ROLE_READ), roleController.getAllRoles);

/**
 * @route   POST /roles
 * @desc    Create new role
 * @access  Admin (requires role:create permission)
 */
router.post('/', authorize(PERMISSIONS.ROLE_CREATE), roleController.createRole);

/**
 * @route   GET /roles/audit-logs
 * @desc    Get all audit logs for roles
 * @access  Admin (requires role:read permission)
 */
router.get('/audit-logs', authorize(PERMISSIONS.ROLE_READ), roleController.getAuditLogs);

/**
 * @route   POST /roles/refresh-cache
 * @desc    Refresh all role caches
 * @access  Admin (requires permission:manage permission)
 */
router.post('/refresh-cache', authorize(PERMISSIONS.PERMISSION_MANAGE), roleController.refreshCache);

/**
 * @route   POST /roles/from-template
 * @desc    Create role from template
 * @access  Admin (requires role:create permission)
 */
router.post('/from-template', authorize(PERMISSIONS.ROLE_CREATE), roleController.createRoleFromTemplate);

// ============================================
// DYNAMIC ROLE ROUTES (with :id parameter - MUST be LAST)
// ============================================

/**
 * @route   GET /roles/:id
 * @desc    Get role by ID
 * @access  Admin (requires role:read permission)
 */
router.get('/:id', authorize(PERMISSIONS.ROLE_READ), roleController.getRoleById);

/**
 * @route   PUT /roles/:id
 * @desc    Update role
 * @access  Admin (requires role:update permission)
 */
router.put('/:id', authorize(PERMISSIONS.ROLE_UPDATE), roleController.updateRole);

/**
 * @route   DELETE /roles/:id
 * @desc    Delete role
 * @access  Admin (requires role:delete permission)
 */
router.delete('/:id', authorize(PERMISSIONS.ROLE_DELETE), roleController.deleteRole);

/**
 * @route   POST /roles/:id/clone
 * @desc    Clone role
 * @access  Admin (requires role:create permission)
 */
router.post('/:id/clone', authorize(PERMISSIONS.ROLE_CREATE), roleController.cloneRole);

/**
 * @route   PUT /roles/:id/permissions
 * @desc    Update role permissions
 * @access  Admin (requires permission:manage permission)
 */
router.put('/:id/permissions', authorize(PERMISSIONS.PERMISSION_MANAGE), roleController.updateRolePermissions);

/**
 * @route   POST /roles/:id/permissions/bulk
 * @desc    Bulk add permissions to role
 * @access  Admin (requires permission:manage permission)
 */
router.post('/:id/permissions/bulk', authorize(PERMISSIONS.PERMISSION_MANAGE), roleController.bulkAddPermissions);

/**
 * @route   DELETE /roles/:id/permissions/bulk
 * @desc    Bulk remove permissions from role
 * @access  Admin (requires permission:manage permission)
 */
router.delete('/:id/permissions/bulk', authorize(PERMISSIONS.PERMISSION_MANAGE), roleController.bulkRemovePermissions);

/**
 * @route   GET /roles/:id/audit-logs
 * @desc    Get audit logs for a specific role
 * @access  Admin (requires role:read permission)
 */
router.get('/:id/audit-logs', authorize(PERMISSIONS.ROLE_READ), roleController.getRoleAuditLogs);

// ============================================
// CHILD ROLE PERMISSION MANAGEMENT
// ============================================

/**
 * @route   PUT /roles/:id/include-permissions
 * @desc    Update include permissions for a child role (adds to source permissions)
 * @access  Admin (requires permission:manage permission)
 */
router.put('/:id/include-permissions', authorize(PERMISSIONS.PERMISSION_MANAGE), roleController.updateIncludePermissions);

/**
 * @route   PUT /roles/:id/exclude-permissions
 * @desc    Update exclude permissions for a child role (removes from source permissions)
 * @access  Admin (requires permission:manage permission)
 */
router.put('/:id/exclude-permissions', authorize(PERMISSIONS.PERMISSION_MANAGE), roleController.updateExcludePermissions);

/**
 * @route   POST /roles/:id/recalculate
 * @desc    Force recalculate permissions from source role
 * @access  Admin (requires permission:manage permission)
 */
router.post('/:id/recalculate', authorize(PERMISSIONS.PERMISSION_MANAGE), roleController.recalculatePermissions);

/**
 * @route   GET /roles/:id/children
 * @desc    Get all child roles of a role
 * @access  Admin (requires role:read permission)
 */
router.get('/:id/children', authorize(PERMISSIONS.ROLE_READ), roleController.getChildRoles);

module.exports = router;
