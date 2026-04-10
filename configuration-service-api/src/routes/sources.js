/**
 * Source Routes
 * API endpoints for source (UTM source) management
 */

const express = require('express');
const router = express.Router();
const sourceController = require('../controllers/sourceController');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { PERMISSIONS } = require('../middleware/roles/permissions');

/**
 * @route   GET /api/config/sources
 * @desc    Get all sources
 * @access  Private
 */
router.get('/', authenticate, sourceController.getAllSources);

/**
 * @route   GET /api/config/sources/:id
 * @desc    Get source by ID
 * @access  Private
 */
router.get('/:id', authenticate, sourceController.getSourceById);

/**
 * @route   POST /api/config/sources
 * @desc    Create new source
 * @access  Private (Admin/Supervisor only)
 */
router.post(
  '/',
  authenticate,
  authorize(PERMISSIONS.SOURCE_CREATE),
  sourceController.createSource
);

/**
 * @route   PUT /api/config/sources/:id
 * @desc    Update source
 * @access  Private (Admin/Supervisor only)
 */
router.put(
  '/:id',
  authenticate,
  authorize(PERMISSIONS.SOURCE_UPDATE),
  sourceController.updateSource
);

/**
 * @route   DELETE /api/config/sources/:id
 * @desc    Delete source
 * @access  Private (Admin only)
 */
router.delete(
  '/:id',
  authenticate,
  authorize(PERMISSIONS.SOURCE_DELETE),
  sourceController.deleteSource
);

/**
 * @route   DELETE /api/config/sources
 * @desc    Bulk delete sources
 * @access  Private (Admin only)
 */
router.delete(
  '/',
  authenticate,
  authorize(PERMISSIONS.SOURCE_DELETE),
  sourceController.deleteSource
);

/**
 * @route   POST /api/config/sources/:id/increment
 * @desc    Increment lead count for a source
 * @access  Private (Internal use - should be called by Lead Service)
 */
router.post(
  '/:id/increment',
  authenticate,
  authorize(PERMISSIONS.SOURCE_UPDATE),
  sourceController.incrementLeadCount
);

/**
 * @route   POST /api/config/sources/:id/decrement
 * @desc    Decrement lead count for a source
 * @access  Private (Internal use - should be called by Lead Service)
 */
router.post(
  '/:id/decrement',
  authenticate,
  authorize(PERMISSIONS.SOURCE_UPDATE),
  sourceController.decrementLeadCount
);

module.exports = router;

