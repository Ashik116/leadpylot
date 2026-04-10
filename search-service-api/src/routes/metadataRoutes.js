const express = require('express');
const router = express.Router();
const metadataController = require('../controllers/metadataController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { PERMISSIONS } = require('../middleware/roles/permissions');

/**
 * @route GET /api/metadata/models
 * @desc Get all available models
 * @access Private - Requires metadata:read permission
 */
router.get('/models', authenticate, authorize(PERMISSIONS.METADATA_READ), metadataController.getModels);

/**
 * @route GET /api/metadata/fields/:model
 * @desc Get all fields for a specific model
 * @access Private - Requires metadata:read permission
 */
router.get('/fields/:model', authenticate, authorize(PERMISSIONS.METADATA_READ), metadataController.getFields);

/**
 * @route GET /api/metadata/options/:model
 * @desc Get filter and grouping options for a model
 * @access Private - Requires metadata:read permission
 */
router.get('/options/:model', authenticate, authorize(PERMISSIONS.METADATA_READ), metadataController.getOptions);

module.exports = router;

