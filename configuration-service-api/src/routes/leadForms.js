const express = require('express');
const cors = require('cors');
const router = express.Router();
const leadFormController = require('../controllers/leadFormController');
const { authenticate, adminOnly } = require('../middleware/authenticate');
const { validateOrigin } = require('../middleware/validateOrigin');

const openCors = cors({ origin: true, credentials: true });

/**
 * @route   POST /lead-forms
 * @desc    Submit a lead from a WordPress site (no auth, origin-validated)
 * @access  Public (allowed sites only via validateOrigin)
 */
router.options('/', openCors);
router.post('/', openCors, validateOrigin, leadFormController.createLeadForm);

/**
 * @route   GET /lead-forms
 * @desc    Get all lead form submissions (excludes use_status: none and pending)
 * @access  Private (Admin only)
 */
router.get('/', authenticate, adminOnly, leadFormController.getAllLeadForms);

/**
 * @route   GET /lead-forms/:id
 * @desc    Get a lead form submission by ID
 * @access  Private (Admin only)
 */
router.get('/:id', authenticate, adminOnly, leadFormController.getLeadFormById);

/**
 * @route   PUT /lead-forms/:id
 * @desc    Update a lead form submission
 * @access  Private (Admin only)
 */
router.put('/:id', authenticate, adminOnly, leadFormController.updateLeadForm);

/**
 * @route   DELETE /lead-forms/:id
 * @desc    Delete a lead form submission
 * @access  Private (Admin only)
 */
router.delete('/:id', authenticate, adminOnly, leadFormController.deleteLeadForm);

/**
 * @route   DELETE /lead-forms
 * @desc    Bulk delete lead form submissions
 * @access  Private (Admin only)
 */
router.delete('/', authenticate, adminOnly, leadFormController.deleteLeadForm);

module.exports = router;
