const express = require('express');
const router = express.Router();
const allowedSiteController = require('../controllers/allowedSiteController');
const { authenticate, adminOnly } = require('../middleware/authenticate');

/**
 * @route   GET /allowed-sites
 * @desc    Get all allowed sites
 * @access  Private (Admin only)
 */
router.get('/', authenticate, adminOnly, allowedSiteController.getAllSites);

/**
 * @route   GET /allowed-sites/:id
 * @desc    Get an allowed site by ID
 * @access  Private (Admin only)
 */
router.get('/:id', authenticate, adminOnly, allowedSiteController.getSiteById);

/**
 * @route   POST /allowed-sites
 * @desc    Add a new allowed site
 * @access  Private (Admin only)
 */
router.post('/', authenticate, adminOnly, allowedSiteController.createSite);

/**
 * @route   PUT /allowed-sites/:id
 * @desc    Update an allowed site
 * @access  Private (Admin only)
 */
router.put('/:id', authenticate, adminOnly, allowedSiteController.updateSite);

/**
 * @route   DELETE /allowed-sites/:id
 * @desc    Delete an allowed site
 * @access  Private (Admin only)
 */
router.delete('/:id', authenticate, adminOnly, allowedSiteController.deleteSite);

/**
 * @route   DELETE /allowed-sites
 * @desc    Bulk delete allowed sites
 * @access  Private (Admin only)
 */
router.delete('/', authenticate, adminOnly, allowedSiteController.deleteSite);

module.exports = router;
