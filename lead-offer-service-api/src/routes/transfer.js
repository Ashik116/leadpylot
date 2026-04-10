/**
 * Call Transfer Routes
 * Handles call transfer operations for admin users
 */

const express = require('express');
const router = express.Router();
const transferController = require('../controllers/transferController');
const { authenticate } = require('../middleware');

// All transfer routes require authentication
// In the future, you might want to add adminOnly middleware for additional security

/**
 * @route GET /api/transfer/available-agents
 * @desc Get list of available agents for transfer with online status
 * @access Private (Admin recommended)
 * @query project_id - Optional project filter
 */
router.get('/available-agents', authenticate, transferController.getAvailableAgents);

/**
 * @route GET /api/transfer/active-calls
 * @desc Get list of active calls that can be transferred
 * @access Private (Admin recommended)
 */
router.get('/active-calls', authenticate, transferController.getTransferableCalls);

/**
 * @route POST /api/transfer/blind
 * @desc Perform blind transfer (direct transfer without speaking to agent first)
 * @access Private (Admin recommended)
 * @body {string} channel - Channel of the call to transfer
 * @body {string} target_extension - Extension to transfer the call to
 */
router.post('/blind', authenticate, transferController.blindTransfer);

/**
 * @route POST /api/transfer/attended
 * @desc Initiate attended transfer (admin speaks with agent first)
 * @access Private (Admin recommended)
 * @body {string} channel - Channel of the call to transfer
 * @body {string} target_extension - Extension to transfer the call to
 * @body {string} admin_extension - Admin's extension for the bridge call
 */
router.post('/attended', authenticate, transferController.attendedTransfer);

/**
 * @route POST /api/transfer/attended/complete
 * @desc Complete attended transfer (connect customer to agent)
 * @access Private (Admin recommended)
 * @body {string} customer_channel - Customer's channel
 * @body {string} agent_channel - Agent's channel
 */
router.post('/attended/complete', authenticate, transferController.completeAttendedTransfer);

/**
 * @route POST /api/transfer/hold
 * @desc Put a call on hold
 * @access Private (Admin recommended)
 * @body {string} channel - Channel to put on hold
 */
router.post('/hold', authenticate, transferController.holdCall);

/**
 * @route POST /api/transfer/resume
 * @desc Resume a call from hold
 * @access Private (Admin recommended)
 * @body {string} channel - Channel to resume from hold
 */
router.post('/resume', authenticate, transferController.resumeCall);

module.exports = router;
