/**
 * Default Grouping Fields Routes
 * API routes for default grouping fields management
 */

const express = require('express');
const router = express.Router();
const defaultGroupingFieldsController = require('../controllers/defaultGroupingFieldsController');
const { authenticate } = require('../middleware/authenticate');

/**
 * @route   PUT /default-grouping-fields
 * @desc    Create or update default grouping fields for a user
 * @access  Authenticated (can update own, Admin can update others)
 * @body    { user_id?: string, defaultGroupingFields: object, defaultFilter?: object }
 */
router.put('/', authenticate, defaultGroupingFieldsController.createOrUpdateDefaultGroupingFields);

/**
 * @route   GET /default-grouping-fields?page=lead
 * @desc    Get all default grouping fields by model name (page)
 * @query   page - Model name (e.g., "lead", "offer")
 * @access  Admin only
 */
router.get('/', authenticate, defaultGroupingFieldsController.getDefaultGroupingFieldsByPage);

/**
 * @route   GET /default-grouping-fields/:user_id
 * @desc    Get default grouping fields for a specific user
 * @access  Authenticated (can view own, Admin can view others)
 */
router.get('/:user_id', authenticate, defaultGroupingFieldsController.getDefaultGroupingFields);

module.exports = router;
