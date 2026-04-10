const express = require('express');
const { authenticate } = require('../auth/middleware/authenticate');
const { authorize } = require('../auth/middleware/authorize');
const { PERMISSIONS } = require('../auth/roles/permissions');
const roleController = require('../controllers/roleController');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// ============================================
// PERMISSION ROUTES 
// ============================================

/**
 * @route   GET /roles/permissions
 * @desc    Get all permissions
 * @access  Admin (requires role:read permission)
 */
router.get('/', authorize(PERMISSIONS.ROLE_READ), roleController.getAllPermissions);

/**
 * @route   GET /roles/permissions/groups
 * @desc    Get permission groups with optional search
 * @query   {string} search - Optional search query (searches in group name, permission key, name, description)
 * @access  Admin (requires role:read permission)
 * @example GET /permissions/groups?search=email
 */
router.get('/groups', authorize(PERMISSIONS.ROLE_READ), roleController.getPermissionGroups);

/**
 * @route   POST /roles/permissions/seed
 * @desc    Seed permissions from static definitions
 * @access  Admin (requires permission:manage permission)
 */
router.post('/seed', authorize(PERMISSIONS.PERMISSION_MANAGE), roleController.seedPermissions);

/**
 * @route   POST /roles/permissions/validate
 * @desc    Validate permission keys
 * @access  Admin (requires role:read permission)
 */
router.post('/validate', authorize(PERMISSIONS.ROLE_READ), roleController.validatePermissions);


module.exports = router;