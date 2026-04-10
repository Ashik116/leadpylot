const express = require('express');
const router = express.Router();

// Controllers
const offersController = require('../controllers/offersController');
const revertController = require('../controllers/revertController');
const commissionController = require('../controllers/commissionController');

// Middleware
const { authenticate, adminOnly } = require('../middleware');
const { authorize, authorizeAny } = require('../middleware/authorize');
const { PERMISSIONS } = require('../middleware/roles/permissions');
const { validateRequest } = require('../middleware/validation');
const { query, param, body } = require('express-validator');
const { asyncHandler } = require('../utils/errorHandler');

// Import modular configurations
const { upload, processDocumentType } = require('./offers/middleware');
const {
  getAllOffersValidation,
  getOffersWithProgressValidation,
  getOfferByIdValidation,
  downloadOfferPdfValidation,
  createOfferValidation,
  updateOfferValidation,
  deleteOfferValidation,
  restoreOfferValidation,
  bulkDeleteOffersValidation,
  bulkDeleteOffersArrayValidation,
  singleOfferIdValidation,
  addDocumentsValidation,
  getOffersByLeadIdValidation,
  getOffersByProjectIdValidation,
  createNetto1Validation,
  createNetto2Validation,
  getRevertOptionsValidation,
  revertStageValidation,
  revertBatchValidation,
} = require('./offers/validations');

// ============================================================================
// QUERY ROUTES
// ============================================================================

/**
 * Get all offers with pagination and filtering
 * @route GET /offers
 * @see routes-documentation.md for detailed query parameters
 */
router.get(
  '/',
  authenticate,
  authorizeAny([PERMISSIONS.OFFER_READ_OWN, PERMISSIONS.OFFER_READ_ALL]),
  validateRequest(getAllOffersValidation),
  offersController.getAllOffers
);

/**
 * Get offers with progress
 * @route GET /offers/progress
 * @see routes-documentation.md for detailed query parameters
 */
router.get(
  '/progress',
  authenticate,
  authorizeAny([PERMISSIONS.OFFER_READ_OWN, PERMISSIONS.OFFER_READ_ALL]),
  validateRequest(getOffersWithProgressValidation),
  offersController.getOffersWithProgress
);

/**
 * Get single offer with progress by ID
 * @route GET /offers/progress/:id
 * @param {string} id - Offer ID
 * @returns {Object} Single offer with the same structure as getOffersWithProgress
 */
router.get(
  '/progress/:id',
  authenticate,
  validateRequest([
    param('id').isMongoId().withMessage('Invalid offer ID'),
  ]),
  offersController.getOfferWithProgressById
);

/**
 * Get offers with tickets (for Offer Tickets dashboard)
 * Returns offers that have associated tickets, in offer-centric format
 * @route GET /offers/tickets
 * @query {number} page - Page number (default: 1)
 * @query {number} limit - Items per page (default: 50)
 * @query {string} search - Search term for offer title
 * @query {string} ticket_status - Filter by ticket status: 'pending' | 'done'
 * @query {string} ownership - Filter by ownership: 'for_me' | 'from_me' | 'all' (admin only)
 * @query {string} project_id - Filter by project
 * @query {string} agent_id - Filter by agent (admin only)
 * @query {string} sortBy - Sort field (default: 'createdAt')
 * @query {string} sortOrder - Sort order: 'asc' | 'desc' (default: 'desc')
 */
router.get(
  '/tickets',
  authenticate,
  authorizeAny([PERMISSIONS.OFFER_READ_OWN, PERMISSIONS.OFFER_READ_ALL]),
  offersController.getOfferTickets
);

/**
 * Get offer by ID (with optional PDF generation)
 * @route GET /offers/:id
 */
router.get(
  '/:id',
  authenticate,
  authorizeAny([PERMISSIONS.OFFER_READ_OWN, PERMISSIONS.OFFER_READ_ALL]),
  validateRequest(getOfferByIdValidation),
  offersController.getOfferById
);

/**
 * Download PDF for offer
 * @route GET /offers/:id/pdf
 */
router.get(
  '/:id/pdf',
  authenticate,
  authorizeAny([PERMISSIONS.OFFER_READ_OWN, PERMISSIONS.OFFER_READ_ALL]),
  validateRequest(downloadOfferPdfValidation),
  offersController.downloadOfferPdf
);

/**
 * Get offers by lead ID
 * @route GET /offers/lead/:leadId
 */
router.get(
  '/lead/:leadId',
  authenticate,
  authorizeAny([PERMISSIONS.OFFER_READ_OWN, PERMISSIONS.OFFER_READ_ALL]),
  validateRequest(getOffersByLeadIdValidation),
  offersController.getOffersByLeadId
);

/**
 * Get offers by project ID
 * @route GET /offers/project/:projectId
 */
router.get(
  '/project/:projectId',
  authenticate,
  authorizeAny([PERMISSIONS.OFFER_READ_OWN, PERMISSIONS.OFFER_READ_ALL]),
  validateRequest(getOffersByProjectIdValidation),
  offersController.getOffersByProjectId
);

// ============================================================================
// CREATE ROUTES
// ============================================================================

/**
 * Create a new offer
 * @route POST /offers
 */
router.post(
  '/',
  authenticate,
  authorize(PERMISSIONS.OFFER_CREATE),
  upload.array('files', 10),
  processDocumentType,
  validateRequest(createOfferValidation),
  offersController.createOffer
);

// ============================================================================
// UPDATE ROUTES
// ============================================================================

/**
 * Update single offer to set current_stage to 'out'
 * @route PUT /offers/out
 * @body {id: string} Single offer ID
 * NOTE: This route must be placed BEFORE /:id to avoid route conflicts
 */
router.put(
  '/out',
  authenticate,
  singleOfferIdValidation,
  offersController.updateOfferToOut
);

/**
 * Revert single offer from 'out' stage back to 'offer' stage
 * @route PUT /offers/revert-from-out
 * @body {id: string} Single offer ID
 * NOTE: This route must be placed BEFORE /:id to avoid route conflicts
 */
router.put(
  '/revert-from-out',
  authenticate,
  singleOfferIdValidation,
  offersController.revertOfferFromOut
);

/**
 * Update an offer (with optional PDF regeneration)
 * @route PUT /offers/:id
 */
router.put(
  '/:id',
  authenticate,
  authorizeAny([PERMISSIONS.OFFER_UPDATE_OWN, PERMISSIONS.OFFER_UPDATE_ALL]),
  upload.array('files', 10),
  processDocumentType,
  validateRequest(updateOfferValidation),
  offersController.updateOffer
);

// ============================================================================
// DELETE ROUTES
// ============================================================================

/**
 * Bulk delete offers
 * @route DELETE /offers
 */
router.delete(
  '/',
  authenticate,
  validateRequest(bulkDeleteOffersValidation),
  offersController.deleteOffers
);

/**
 * Delete a single offer
 * @route DELETE /offers/:id
 */
router.delete(
  '/:id',
  authenticate,
  authorizeAny([PERMISSIONS.OFFER_DELETE_OWN, PERMISSIONS.OFFER_DELETE_ALL]),
  validateRequest(deleteOfferValidation),
  offersController.deleteOffers
);

/**
 * Bulk delete offers
 * @route DELETE /offers
 * @access Private - Requires offer:delete:own or offer:delete:all permission
 */
router.delete(
  '/',
  authenticate,
  authorizeAny([PERMISSIONS.OFFER_DELETE_OWN, PERMISSIONS.OFFER_DELETE_ALL]),
  validateRequest(bulkDeleteOffersValidation),
  offersController.deleteOffers
);

/**
 * Restore a previously soft-deleted offer
 * @route POST /offers/:id/restore
 * @access Private - Requires offer:update:own or offer:update:all permission
 */
router.post(
  '/:id/restore',
  authenticate,
  authorizeAny([PERMISSIONS.OFFER_UPDATE_OWN, PERMISSIONS.OFFER_UPDATE_ALL]),
  validateRequest(restoreOfferValidation),
  offersController.restoreOffer
);

// ============================================================================
// DOCUMENT MANAGEMENT ROUTES
// ============================================================================

/**
 * Remove document from offer
 * @route DELETE /offers/:offerId/documents/:documentId
 */
router.delete(
  '/:offerId/documents/:documentId',
  authenticate,
  authorizeAny([PERMISSIONS.OFFER_UPDATE_OWN, PERMISSIONS.OFFER_UPDATE_ALL]),
  offersController.removeDocumentFromOffer
);

/**
 * Add documents to offer
 * @route POST /offers/:offerId/documents
 * @see routes-documentation.md for supported document types
 */
router.post(
  '/:offerId/documents',
  authenticate,
  authorizeAny([PERMISSIONS.OFFER_UPDATE_OWN, PERMISSIONS.OFFER_UPDATE_ALL]),
  upload.array('files', 10),
  validateRequest(addDocumentsValidation),
  offersController.addDocumentsToOffer
);

/**
 * View/download a document from an offer
 * @route GET /offers/documents/:documentId
 * @access Private - Admin and Agent only
 * @description View or download a document from an offer
 */
router.get(
  '/documents/:documentId',
  authenticate,
  authorizeAny([PERMISSIONS.OFFER_READ_OWN, PERMISSIONS.OFFER_READ_ALL]),
  validateRequest([
    param('documentId').isMongoId().withMessage('Invalid document ID'),
  ]),
  offersController.viewDocument
);

// ============================================================================
// NETTO SYSTEM INTEGRATION ROUTES
// ============================================================================

/**
 * Send offer to Netto1 system
 * @route POST /offers/:offerId/netto1
 */
router.post(
  '/:offerId/netto1',
  authenticate,
  authorizeAny([PERMISSIONS.OFFER_UPDATE_OWN, PERMISSIONS.OFFER_UPDATE_ALL]),
  validateRequest(createNetto1Validation),
  offersController.createNetto1FromOffer
);

/**
 * Send offer to Netto2 system
 * @route POST /offers/:offerId/netto2
 */
router.post(
  '/:offerId/netto2',
  authenticate,
  authorizeAny([PERMISSIONS.OFFER_UPDATE_OWN, PERMISSIONS.OFFER_UPDATE_ALL]),
  validateRequest(createNetto2Validation),
  offersController.createNetto2FromOffer
);

// ============================================================================
// REVERT OPERATIONS ROUTES
// ============================================================================

/**
 * Get available revert options for an offer
 * @route GET /offers/:offerId/revert-options
 * @access Private - Requires offer:read:own or offer:read:all permission
 */
router.get(
  '/:offerId/revert-options',
  authenticate,
  authorizeAny([PERMISSIONS.OFFER_READ_OWN, PERMISSIONS.OFFER_READ_ALL]),
  validateRequest(getRevertOptionsValidation),
  asyncHandler(revertController.getRevertOptions)
);

/**
 * Revert a specific stage for an offer
 * @route POST /offers/:offerId/revert/:stage
 * @access Private - Requires offer:update:own or offer:update:all permission
 */
router.post(
  '/:offerId/revert/:stage',
  authenticate,
  authorizeAny([PERMISSIONS.OFFER_UPDATE_OWN, PERMISSIONS.OFFER_UPDATE_ALL]),
  validateRequest(revertStageValidation),
  asyncHandler(revertController.revertStage)
);

/**
 * Revert multiple stages for an offer in one operation
 * @route POST /offers/:offerId/revert-batch
 * @access Private - Requires offer:update:own or offer:update:all permission
 */
router.post(
  '/:offerId/revert-batch',
  authenticate,
  authorizeAny([PERMISSIONS.OFFER_UPDATE_OWN, PERMISSIONS.OFFER_UPDATE_ALL]),
  validateRequest(revertBatchValidation),
  asyncHandler(revertController.revertBatch)
);

// ============================================================================
// FINANCIAL & COMMISSION ROUTES
// All financial tracking is embedded in the Offer model
// ============================================================================

/**
 * Get offer financials
 * @route GET /offers/:offerId/financials
 * @access Private
 */
router.get(
  '/:offerId/financials',
  authenticate,
  validateRequest([
    param('offerId').isMongoId().withMessage('Invalid offer ID'),
  ]),
  asyncHandler(commissionController.getOfferFinancials)
);

/**
 * Initialize financials for an offer
 * @route POST /offers/:offerId/financials/initialize
 * @access Private - Admin only
 */
router.post(
  '/:offerId/financials/initialize',
  authenticate,
  adminOnly,
  validateRequest([
    param('offerId').isMongoId().withMessage('Invalid offer ID'),
    body('investment_total').optional().isFloat({ min: 0 }),
    body('bonus_value').optional().isFloat({ min: 0 }),
    body('bank_percentage').optional().isFloat({ min: 0, max: 100 }),
    body('agent_percentage').optional().isFloat({ min: 0, max: 100 }),
  ]),
  asyncHandler(commissionController.initializeFinancials)
);

/**
 * Update investment amounts
 * @route PUT /offers/:offerId/financials/investment
 * @access Private - Admin only
 */
router.put(
  '/:offerId/financials/investment',
  authenticate,
  adminOnly,
  validateRequest([
    param('offerId').isMongoId().withMessage('Invalid offer ID'),
    body('investment_total').optional().isFloat({ min: 0 }),
    body('bonus_value').optional().isFloat({ min: 0 }),
  ]),
  asyncHandler(commissionController.updateInvestmentAmounts)
);

/**
 * Add customer payment
 * @route POST /offers/:offerId/financials/payments
 * @access Private - Admin only
 */
router.post(
  '/:offerId/financials/payments',
  authenticate,
  adminOnly,
  validateRequest([
    param('offerId').isMongoId().withMessage('Invalid offer ID'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount is required'),
    body('payment_date').optional().isISO8601(),
    body('payment_method').optional().isIn(['bank_transfer', 'cash', 'check', 'other']),
    body('reference').optional().trim(),
    body('notes').optional().trim(),
  ]),
  asyncHandler(commissionController.addCustomerPayment)
);

/**
 * Update customer payment
 * @route PUT /offers/:offerId/financials/payments/:paymentId
 * @access Private - Admin only
 */
router.put(
  '/:offerId/financials/payments/:paymentId',
  authenticate,
  adminOnly,
  validateRequest([
    param('offerId').isMongoId().withMessage('Invalid offer ID'),
    param('paymentId').isMongoId().withMessage('Invalid payment ID'),
    body('amount').optional().isFloat({ min: 0.01 }).withMessage('Amount must be positive'),
    body('payment_date').optional().isISO8601(),
    body('payment_method').optional().isIn(['bank_transfer', 'cash', 'check', 'other']),
    body('reference').optional().trim(),
    body('notes').optional().trim(),
  ]),
  asyncHandler(commissionController.updateCustomerPayment)
);

/**
 * Delete customer payment
 * @route DELETE /offers/:offerId/financials/payments/:paymentId
 * @access Private - Admin only
 */
router.delete(
  '/:offerId/financials/payments/:paymentId',
  authenticate,
  adminOnly,
  validateRequest([
    param('offerId').isMongoId().withMessage('Invalid offer ID'),
    param('paymentId').isMongoId().withMessage('Invalid payment ID'),
  ]),
  asyncHandler(commissionController.deleteCustomerPayment)
);

/**
 * Override primary agent commission percentage
 * @route PUT /offers/:offerId/financials/primary-agent/percentage
 * @access Private - Admin only
 */
router.put(
  '/:offerId/financials/primary-agent/percentage',
  authenticate,
  adminOnly,
  validateRequest([
    param('offerId').isMongoId().withMessage('Invalid offer ID'),
    body('percentage').isFloat({ min: 0, max: 100 }).withMessage('Percentage must be 0-100'),
  ]),
  asyncHandler(commissionController.overridePrimaryAgentPercentage)
);

/**
 * Override bank commission percentage
 * @route PUT /offers/:offerId/financials/bank/percentage
 * @access Private - Admin only
 */
router.put(
  '/:offerId/financials/bank/percentage',
  authenticate,
  adminOnly,
  validateRequest([
    param('offerId').isMongoId().withMessage('Invalid offer ID'),
    body('percentage').isFloat({ min: 0, max: 100 }).withMessage('Percentage must be 0-100'),
  ]),
  asyncHandler(commissionController.overrideBankPercentage)
);

/**
 * Add split agent
 * @route POST /offers/:offerId/financials/split-agents
 * @access Private - Admin only
 */
router.post(
  '/:offerId/financials/split-agents',
  authenticate,
  adminOnly,
  validateRequest([
    param('offerId').isMongoId().withMessage('Invalid offer ID'),
    body('agent_id').isMongoId().withMessage('Agent ID is required'),
    body('percentage').isFloat({ min: 0, max: 100 }).withMessage('Percentage must be 0-100'),
    body('reason').optional().trim(),
  ]),
  asyncHandler(commissionController.addSplitAgent)
);

/**
 * Remove split agent
 * @route DELETE /offers/:offerId/financials/split-agents/:agentId
 * @access Private - Admin only
 */
router.delete(
  '/:offerId/financials/split-agents/:agentId',
  authenticate,
  adminOnly,
  validateRequest([
    param('offerId').isMongoId().withMessage('Invalid offer ID'),
    param('agentId').isMongoId().withMessage('Invalid agent ID'),
  ]),
  asyncHandler(commissionController.removeSplitAgent)
);

/**
 * Add inbound agent
 * @route POST /offers/:offerId/financials/inbound-agents
 * @access Private - Admin only
 */
router.post(
  '/:offerId/financials/inbound-agents',
  authenticate,
  adminOnly,
  validateRequest([
    param('offerId').isMongoId().withMessage('Invalid offer ID'),
    body('agent_id').isMongoId().withMessage('Agent ID is required'),
    body('percentage').isFloat({ min: 0, max: 100 }).withMessage('Percentage must be 0-100'),
    body('reason').optional().trim(),
  ]),
  asyncHandler(commissionController.addInboundAgent)
);

/**
 * Remove inbound agent
 * @route DELETE /offers/:offerId/financials/inbound-agents/:agentId
 * @access Private - Admin only
 */
router.delete(
  '/:offerId/financials/inbound-agents/:agentId',
  authenticate,
  adminOnly,
  validateRequest([
    param('offerId').isMongoId().withMessage('Invalid offer ID'),
    param('agentId').isMongoId().withMessage('Invalid agent ID'),
  ]),
  asyncHandler(commissionController.removeInboundAgent)
);

/**
 * Update split/inbound agent percentage
 * @route PUT /offers/:offerId/financials/:agentType/:agentId/percentage
 * @access Private - Admin only
 */
router.put(
  '/:offerId/financials/:agentType/:agentId/percentage',
  authenticate,
  adminOnly,
  validateRequest([
    param('offerId').isMongoId().withMessage('Invalid offer ID'),
    param('agentType').isIn(['split-agents', 'inbound-agents']),
    param('agentId').isMongoId().withMessage('Invalid agent ID'),
    body('percentage').isFloat({ min: 0, max: 100 }).withMessage('Percentage must be 0-100'),
  ]),
  asyncHandler(commissionController.updateAgentPercentage)
);

/**
 * Force recalculation of offer financials
 * @route POST /offers/:offerId/financials/recalculate
 * @access Private - Admin only
 */
router.post(
  '/:offerId/financials/recalculate',
  authenticate,
  adminOnly,
  validateRequest([
    param('offerId').isMongoId().withMessage('Invalid offer ID'),
  ]),
  asyncHandler(commissionController.recalculateOfferFinancials)
);

/**
 * Record payment to an agent
 * @route POST /offers/:offerId/financials/agent-payments
 * @access Private - Admin only
 */
router.post(
  '/:offerId/financials/agent-payments',
  authenticate,
  adminOnly,
  validateRequest([
    param('offerId').isMongoId().withMessage('Invalid offer ID'),
    body('agent_type').isIn(['primary', 'split', 'inbound']).withMessage('Invalid agent type'),
    body('agent_id').optional().isMongoId(),
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount is required'),
  ]),
  asyncHandler(commissionController.recordAgentPayment)
);

module.exports = router;
