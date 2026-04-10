/**
 * Column Preference Routes
 * API routes for column preference management
 * Routes aligned with monolith backend/routes/columnRoutes.js
 * Mounted at /column-preference
 */

const express = require('express');
const router = express.Router();
const columnController = require('../controllers/columnController');
const { authenticate, adminOnly } = require('../middleware/authenticate');

/**
 * @route   PUT /column-preference/save
 * @desc    Save or update column preferences for a user
 * @access  Authenticated (can update own, Admin can update others)
 */
router.put('/save', authenticate, columnController.saveColumnPreference);

/**
 * @route   GET /column-preference/get-by-user
 * @desc    Get column preferences for current user
 * @query   table (optional) - specific table name
 * @access  Authenticated
 */
router.get('/get-by-user', authenticate, columnController.getColumnPreferencesForUser);

/**
 * @route   GET /column-preference/get-by-id/:id
 * @desc    Get column preference by document ID
 * @access  Authenticated
 */
router.get('/get-by-id/:id', authenticate, columnController.getColumnPreferenceById);

/**
 * @route   DELETE /column-preference/delete/:id
 * @desc    Delete column preference by ID
 * @access  Authenticated
 */
router.delete('/delete/:id', authenticate, columnController.deleteColumnPreference);

/**
 * @route   POST /column-preference/default
 * @desc    Create or update default column preference
 * @access  Admin only
 */
router.post('/default', authenticate, adminOnly, columnController.createDefaultColumnPreference);

/**
 * @route   PUT /column-preference/admin-update
 * @desc    Update user column preference by admin
 * @access  Admin only
 */
router.put('/admin-update', authenticate, adminOnly, columnController.updateUserColumnPreferenceByAdmin);

/**
 * @route   POST /column-preference/reset-to-default
 * @desc    Reset user column preference to default
 * @access  Authenticated
 */
router.post('/reset-to-default', authenticate, columnController.resetUserColumnPreferenceToDefault);

/**
 * @route   POST /column-preference/admin/get-multiple-users
 * @desc    Get column preferences for multiple users
 * @access  Admin only
 */
router.post('/admin/get-multiple-users', authenticate, adminOnly, columnController.getColumnPreferencesForMultipleUsers);

module.exports = router;

