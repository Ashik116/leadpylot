const express = require('express');
const router = express.Router();

// Controllers
const leadsController = require('../controllers/leadsController');
const formImportController = require('../controllers/formImportController');

// Middleware
const { authenticate, adminOnly } = require('../middleware');
const { authorize, authorizeAny } = require('../middleware/authorize');
const { PERMISSIONS } = require('../middleware/roles/permissions');
const { validateRequest } = require('../middleware/validation');

// Import modular configurations
const { upload } = require('./leads/middleware');
const {
  getAllLeadsValidation,
  getMyLeadsValidation,
  getExtraLeadsValidation,
  getAssignedLeadsValidation,
  getArchivedLeadsValidation,
  getLeadByIdValidation,
  updateLeadValidation,
  generateSummaryValidation,
  bulkUpdateLeadsValidation,
  updateLeadStatusValidation,
  bulkUpdateLeadStatusValidation,
  searchByPartnerIdsValidation,
  getCurrentTopLeadValidation,
  navigateToLeadValidation,
  completeCurrentTopLeadValidation,
  deleteLeadValidation,
  revertLeadImportValidation,
  updateSecondaryEmailValidation,
  makePrimaryEmailValidation,
  updateOfferCallsValidation,
} = require('./leads/validations');

// ============================================================================
// QUERY ROUTES
// ============================================================================

/**
 * Get all leads with advanced filtering, pagination, and optional todos statistics
 * @route GET /leads
 * @access Private - Requires lead:read:assigned or lead:read:all permission
 * @see routes-documentation.md for detailed query parameters
 */
router.get('/', authenticate, authorizeAny([PERMISSIONS.LEAD_READ_ASSIGNED, PERMISSIONS.LEAD_READ_ALL]), validateRequest(getAllLeadsValidation), leadsController.getAllLeads);

/**
 * Get user's assigned leads
 * @route GET /leads/my-leads
 * @access Private - Requires lead:read:assigned or lead:read:all permission
 */
router.get(
  '/my-leads',
  authenticate,
  authorizeAny([PERMISSIONS.LEAD_READ_ASSIGNED, PERMISSIONS.LEAD_READ_ALL]),
  validateRequest(getMyLeadsValidation),
  leadsController.getMyLeads
);

/**
 * Get leads with todos assigned to the requesting user
 * @route GET /leads/extra
 * @access Private - Requires lead:read:assigned or lead:read:all permission
 */
router.get(
  '/extra',
  authenticate,
  authorizeAny([PERMISSIONS.LEAD_READ_ASSIGNED, PERMISSIONS.LEAD_READ_ALL]),
  validateRequest(getExtraLeadsValidation),
  leadsController.getExtraLeads
);

/**
 * Get leads where the requesting user has assigned todos to other users
 * @route GET /leads/assigned
 * @access Private - Requires lead:read:assigned or lead:read:all permission
 */
router.get(
  '/assigned',
  authenticate,
  authorizeAny([PERMISSIONS.LEAD_READ_ASSIGNED, PERMISSIONS.LEAD_READ_ALL]),
  validateRequest(getAssignedLeadsValidation),
  leadsController.getAssignedLeads
);

/**
 * Get all lead IDs as an array (admins get all, agents get only their assigned leads)
 * @route GET /leads/ids
 * @access Private - Requires lead:read:assigned or lead:read:all permission
 */
router.get('/ids', authenticate, authorizeAny([PERMISSIONS.LEAD_READ_ASSIGNED, PERMISSIONS.LEAD_READ_ALL]), leadsController.getLeadIds);

/**
 * Get archived leads (active: false) with advanced filtering, pagination, and optional todos statistics
 * @route GET /leads/archived
 * @access Private - Requires lead:read:assigned or lead:read:all permission
 */
router.get(
  '/archived',
  authenticate,
  authorizeAny([PERMISSIONS.LEAD_READ_ASSIGNED, PERMISSIONS.LEAD_READ_ALL]),
  validateRequest(getArchivedLeadsValidation),
  leadsController.getArchivedLeads
);

// ============================================================================
// IMPORT/EXPORT ROUTES (Must be before /:id route to avoid conflict)
// ============================================================================

/**
 * Get import history
 * @route GET /leads/import
 */
router.get('/import', adminOnly, leadsController.getImportHistory);

/**
 * Download import files with smart filename handling based on ImportHistory status
 * @route GET /leads/download/*
 */
router.get('/download/*', adminOnly, leadsController.downloadImportFile);

/**
 * Get lead by ID
 * @route GET /leads/:id
 * @access Private - Requires lead:read:assigned or lead:read:all permission
 */
router.get(
  '/:id',
  authenticate,
  authorizeAny([PERMISSIONS.LEAD_READ_ASSIGNED, PERMISSIONS.LEAD_READ_ALL]),
  validateRequest(getLeadByIdValidation),
  leadsController.getLeadById
);

/**
 * Generate and save lead summary using Leadbot conversation API
 * Body: { user_id, limit? }
 * @route POST /leads/:id/generate-summary
 */
router.post(
  '/:id/generate-summary',
  authenticate,
  authorizeAny([PERMISSIONS.LEAD_READ_ASSIGNED, PERMISSIONS.LEAD_READ_ALL]),
  validateRequest(generateSummaryValidation),
  leadsController.generateSummary
);

// ============================================================================
// QUEUE MANAGEMENT ROUTES
// ============================================================================

/**
 * Get the current top lead in the agent's queue with navigation tracking
 * @route GET /leads/queue/current-top
 * @access Private - Requires lead:read:assigned or lead:read:all permission
 */
router.get(
  '/queue/current-top',
  authenticate,
  authorizeAny([PERMISSIONS.LEAD_READ_ASSIGNED, PERMISSIONS.LEAD_READ_ALL]),
  validateRequest(getCurrentTopLeadValidation),
  leadsController.getCurrentTopLead
);

/**
 * Navigate to a specific lead in the queue with full navigation context
 * @route GET /leads/queue/navigate/:lead_id
 * @access Private - Requires lead:read:assigned or lead:read:all permission
 */
router.get(
  '/queue/navigate/:lead_id',
  authenticate,
  authorizeAny([PERMISSIONS.LEAD_READ_ASSIGNED, PERMISSIONS.LEAD_READ_ALL]),
  validateRequest(navigateToLeadValidation),
  leadsController.navigateToLead
);

/**
 * Mark current "on top" lead as completed (removes from top of queue)
 * @route POST /leads/currenttop-completed
 * @access Private - Requires lead:update permission
 */
router.post(
  '/currenttop-completed',
  authenticate,
  authorize(PERMISSIONS.LEAD_UPDATE),
  validateRequest(completeCurrentTopLeadValidation),
  leadsController.completeCurrentTopLead
);

// ============================================================================
// SEARCH ROUTES
// ============================================================================

/**
 * Search leads by partner IDs (lead_source_no values)
 * Returns ALL matching leads without pagination
 * @route POST /leads/search-by-partner-ids
 * @access Private - Requires lead:read:assigned or lead:read:all permission
 */
router.post(
  '/bulk-search',
  authenticate,
  authorizeAny([PERMISSIONS.LEAD_READ_ASSIGNED, PERMISSIONS.LEAD_READ_ALL]),
  validateRequest(searchByPartnerIdsValidation),
  leadsController.getLeadsByPartnerIds
);

/**
 * Import leads from Excel or CSV file
 * @route POST /leads/import
 */
router.post('/import', adminOnly, upload.single('file'), leadsController.importLeadsFromExcel);

/**
 * Import leads from WordPress form submissions
 * Accepts single lead object or array of leads
 * @route POST /leads/import-from-forms
 */
router.post(
  '/import-from-forms',
  authenticate,
  authorize(PERMISSIONS.LEAD_CREATE),
  formImportController.importFormLeads
);

/**
 * Revert a lead import - undoes all operations performed during the import
 * @route POST /leads/import/:id/revert
 */
router.post(
  '/import/:id/revert',
  adminOnly,
  validateRequest(revertLeadImportValidation),
  leadsController.revertLeadImport
);

/**
 * Get import progress (polling endpoint for real-time progress)
 * Used as fallback when WebSocket is not available
 * @route GET /leads/import/:id/progress
 */
router.get('/import/:id/progress', leadsController.getImportProgress);

// ============================================================================
// CREATE ROUTES
// ============================================================================

/**
 * Create new leads
 * @route POST /leads
 * @access Private - Requires lead:create permission
 */
router.post('/', authenticate, authorize(PERMISSIONS.LEAD_CREATE), leadsController.createLeads);

// ============================================================================
// UPDATE ROUTES
// ============================================================================

/**
 * Update multiple leads with the same data
 * @route PUT /leads/bulk-update
 */
router.put(
  '/bulk-update',
  adminOnly,
  validateRequest(bulkUpdateLeadsValidation),
  leadsController.bulkUpdateLeads
);

/**
 * Update status for multiple leads
 * @route PUT /leads/bulk-status-update
 * @access Private - Requires lead:update permission
 */
router.put(
  '/bulk-status-update',
  authenticate,
  authorize(PERMISSIONS.LEAD_UPDATE),
  validateRequest(bulkUpdateLeadStatusValidation),
  leadsController.bulkUpdateLeadStatus
);

/**
 * Update a single lead
 * @route PUT /leads/:id
 * @access Private - Requires lead:update or activity:create permission
 */
router.put('/:id', authenticate, authorizeAny([PERMISSIONS.LEAD_UPDATE, PERMISSIONS.ACTIVITY_CREATE]), validateRequest(updateLeadValidation), leadsController.updateLead);

/**
 * Update lead status by stage and status name or ID
 * @route PUT /leads/:id/status
 * @access Private - Requires lead:update permission
 */
router.put(
  '/:id/status',
  authenticate,
  authorize(PERMISSIONS.LEAD_UPDATE),
  validateRequest(updateLeadStatusValidation),
  leadsController.updateLeadStatus
);

// ============================================================================
// DELETE ROUTES
// ============================================================================

/**
 * Soft delete multiple leads
 * @route DELETE /leads
 */
router.delete('/', authenticate, authorize(PERMISSIONS.LEAD_DELETE), leadsController.deleteLead);

/**
 * Permanently delete multiple leads from the database
 * @route DELETE /leads/permanent-delete
 */
router.delete('/permanent-delete', adminOnly, leadsController.permanentlyDeleteLead);

/**
 * Permanently delete a single lead from the database
 * @route DELETE /leads/permanent-delete/:id
 */
router.delete(
  '/permanent-delete/:id',
  adminOnly,
  leadsController.permanentlyDeleteLead
);

/**
 * Soft delete a single lead
 * @route DELETE /leads/:id
 */
router.delete('/:id', authenticate, authorize(PERMISSIONS.LEAD_DELETE), validateRequest(deleteLeadValidation), leadsController.deleteLead);

/**
 * @route PUT /leads/:id/secondary-email
 * @desc Update secondary email for a lead
 * @access Private - Requires lead:update permission
 * @body {string} [secondary_email] - Secondary email address
 */
router.put(
  '/:id/secondary-email',
  authenticate,
  authorize(PERMISSIONS.LEAD_UPDATE),
  validateRequest(updateSecondaryEmailValidation),
  leadsController.updateSecondaryEmail
);

/**
 * @route PUT /leads/:id/make-primary-email
 * @desc Swap emails and set which email is primary by email address
 * @access Private - Requires lead:update permission
 * @body {string} email - The email address to make primary (must exist in email_from or secondary_email)
 */
router.put(
  '/:id/make-primary-email',
  authenticate,
  authorize(PERMISSIONS.LEAD_UPDATE),
  validateRequest(makePrimaryEmailValidation),
  leadsController.makePrimaryEmail
);

/**
 * @route PUT /leads/:id/offer_calls
 * @desc Update offer_calls field by increasing or decreasing the value
 * @access Private - Requires lead:update permission
 * @query {number} increase - Positive number to increase offer_calls (optional)
 * @query {number} decrease - Positive number to decrease offer_calls (optional)
 * @note Exactly one of increase or decrease must be provided
 */
router.put(
  '/:id/offer_calls',
  authenticate,
  authorize(PERMISSIONS.LEAD_UPDATE),
  validateRequest(updateOfferCallsValidation),
  leadsController.updateOfferCalls
);

module.exports = router;
