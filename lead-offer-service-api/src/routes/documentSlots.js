/**
 * Document Slots Routes
 * API endpoints for managing document slots on Offers and last_email on Leads
 * 
 * Base path: /document-slots
 */

const express = require('express');
const router = express.Router();
const { param, body } = require('express-validator');

// Controller
const documentSlotController = require('../controllers/documentSlotController');

// Middleware
const { authenticate } = require('../middleware');
const { authorize, authorizeAny, adminOnly } = require('../middleware/authorize');
const { PERMISSIONS } = require('../middleware/roles/permissions');
const { validateRequest } = require('../middleware/validation');

// Valid slot names for validation
const VALID_SLOTS = [
  'offer_email',
  'offer_contract',
  'contract',
  'id_files',
  'contract_received_mail',
  'opening_contract_client_email',
  'bank_confirmation',
  'annahme',
  'confirmation_email',
  'swift',
  'swift_confirm_mail',
  'depot_update_mail',
  'depot_login',
  'load_mail',
];

// ============================================
// VALIDATION SCHEMAS
// ============================================

const offerIdValidation = [
  param('offerId').isMongoId().withMessage('Invalid offer ID'),
];

const slotNameValidation = [
  param('slotName')
    .isIn(VALID_SLOTS)
    .withMessage(`Invalid slot name. Valid slots: ${VALID_SLOTS.join(', ')}`),
];

const documentIdValidation = [
  param('documentId').isMongoId().withMessage('Invalid document ID'),
];

const emailIdValidation = [
  param('emailId').isMongoId().withMessage('Invalid email ID'),
];

const leadIdValidation = [
  param('leadId').isMongoId().withMessage('Invalid lead ID'),
];

const addDocumentBodyValidation = [
  body('document_id').isMongoId().withMessage('Invalid document_id'),
];

const addEmailBodyValidation = [
  body('email_id').isMongoId().withMessage('Invalid email_id'),
];

const addEmailToMultipleOffersBodyValidation = [
  body('offer_ids')
    .isArray({ min: 1 })
    .withMessage('offer_ids is required and must be a non-empty array'),
  body('offer_ids.*')
    .isMongoId()
    .withMessage('Each offer_id must be a valid MongoDB ID'),
  body('email_id').isMongoId().withMessage('Invalid email_id'),
];

const bulkAddBodyValidation = [
  body('document_ids')
    .optional()
    .isArray()
    .withMessage('document_ids must be an array'),
  body('document_ids.*')
    .optional()
    .isMongoId()
    .withMessage('Each document_id must be a valid MongoDB ID'),
  body('email_ids')
    .optional()
    .isArray()
    .withMessage('email_ids must be an array'),
  body('email_ids.*')
    .optional()
    .isMongoId()
    .withMessage('Each email_id must be a valid MongoDB ID'),
];

const bulkAddToMultipleOffersBodyValidation = [
  body('offer_ids')
    .isArray({ min: 1 })
    .withMessage('offer_ids is required and must be a non-empty array'),
  body('offer_ids.*')
    .isMongoId()
    .withMessage('Each offer_id must be a valid MongoDB ID'),
  body('document_ids')
    .optional()
    .isArray()
    .withMessage('document_ids must be an array'),
  body('document_ids.*')
    .optional()
    .isMongoId()
    .withMessage('Each document_id must be a valid MongoDB ID'),
  body('email_ids')
    .optional()
    .isArray()
    .withMessage('email_ids must be an array'),
  body('email_ids.*')
    .optional()
    .isMongoId()
    .withMessage('Each email_id must be a valid MongoDB ID'),
  body()
    .custom((value, { req }) => {
      const hasDocs = Array.isArray(req.body.document_ids) && req.body.document_ids.length > 0;
      const hasEmails = Array.isArray(req.body.email_ids) && req.body.email_ids.length > 0;
      if (!hasDocs && !hasEmails) {
        throw new Error('At least one of document_ids or email_ids must be provided and non-empty');
      }
      return true;
    }),
];

// ============================================
// METADATA ROUTES
// ============================================

/**
 * @route   GET /document-slots/metadata
 * @desc    Get all valid slot names and their metadata
 * @access  Authenticated
 */
router.get(
  '/metadata',
  authenticate,
  documentSlotController.getSlotsMetadata
);

// ============================================
// OFFER DOCUMENT SLOT ROUTES
// ============================================

/**
 * @route   POST /document-slots/offers/slots/:slotName/emails
 * @desc    Add an email to a slot for multiple offers (offer_ids in body)
 * @access  Admin only
 * @body    { offer_ids: string[], email_id: string }
 */
router.post(
  '/offers/slots/:slotName/emails',
  authenticate,
  adminOnly,
  validateRequest([...slotNameValidation, ...addEmailToMultipleOffersBodyValidation]),
  documentSlotController.addEmailToMultipleOffersSlot
);

/**
 * @route   POST /document-slots/offers/slots/:slotName/bulk
 * @desc    Bulk add documents and emails to a slot for multiple offers (offer_ids in body)
 * @access  Admin only
 * @body    { offer_ids: string[], document_ids: string[], email_ids: string[] }
 */
router.post(
  '/offers/slots/:slotName/bulk',
  authenticate,
  adminOnly,
  validateRequest([...slotNameValidation, ...bulkAddToMultipleOffersBodyValidation]),
  documentSlotController.bulkAddToMultipleOffersSlot
);

/**
 * @route   GET /document-slots/offers/:offerId
 * @desc    Get all document slots for an offer
 * @access  Authenticated + Offer Read Permission
 */
router.get(
  '/offers/:offerId',
  authenticate,
  authorizeAny([PERMISSIONS.OFFER_READ_OWN, PERMISSIONS.OFFER_READ_ALL]),
  validateRequest(offerIdValidation),
  documentSlotController.getOfferSlots
);

/**
 * @route   GET /document-slots/offers/:offerId/slots/:slotName
 * @desc    Get a specific slot for an offer
 * @access  Authenticated + Offer Read Permission
 */
router.get(
  '/offers/:offerId/slots/:slotName',
  authenticate,
  authorizeAny([PERMISSIONS.OFFER_READ_OWN, PERMISSIONS.OFFER_READ_ALL]),
  validateRequest([...offerIdValidation, ...slotNameValidation]),
  documentSlotController.getOfferSlot
);

/**
 * @route   POST /document-slots/offers/:offerId/slots/:slotName/documents
 * @desc    Add a document to an offer slot
 * @access  Admin only
 * @body    { document_id: string }
 */
router.post(
  '/offers/:offerId/slots/:slotName/documents',
  authenticate,
  adminOnly,
  validateRequest([...offerIdValidation, ...slotNameValidation, ...addDocumentBodyValidation]),
  documentSlotController.addDocumentToOfferSlot
);

/**
 * @route   DELETE /document-slots/offers/:offerId/slots/:slotName/documents/:documentId
 * @desc    Remove a document from an offer slot
 * @access  Admin only
 */
router.delete(
  '/offers/:offerId/slots/:slotName/documents/:documentId',
  authenticate,
  adminOnly,
  validateRequest([...offerIdValidation, ...slotNameValidation, ...documentIdValidation]),
  documentSlotController.removeDocumentFromOfferSlot
);

/**
 * @route   POST /document-slots/offers/:offerId/slots/:slotName/emails
 * @desc    Add an email to an offer slot
 * @access  Admin only
 * @body    { email_id: string }
 */
router.post(
  '/offers/:offerId/slots/:slotName/emails',
  authenticate,
  adminOnly,
  validateRequest([...offerIdValidation, ...slotNameValidation, ...addEmailBodyValidation]),
  documentSlotController.addEmailToOfferSlot
);

/**
 * @route   DELETE /document-slots/offers/:offerId/slots/:slotName/emails/:emailId
 * @desc    Remove an email from an offer slot
 * @access  Admin only
 */
router.delete(
  '/offers/:offerId/slots/:slotName/emails/:emailId',
  authenticate,
  adminOnly,
  validateRequest([...offerIdValidation, ...slotNameValidation, ...emailIdValidation]),
  documentSlotController.removeEmailFromOfferSlot
);

/**
 * @route   POST /document-slots/offers/:offerId/slots/:slotName/bulk
 * @desc    Bulk add documents and emails to an offer slot
 * @access  Admin only
 * @body    { document_ids: string[], email_ids: string[] }
 */
router.post(
  '/offers/:offerId/slots/:slotName/bulk',
  authenticate,
  adminOnly,
  validateRequest([...offerIdValidation, ...slotNameValidation, ...bulkAddBodyValidation]),
  documentSlotController.bulkAddToOfferSlot
);

/**
 * @route   DELETE /document-slots/offers/:offerId/slots/:slotName
 * @desc    Clear all items from an offer slot
 * @access  Admin only
 */
router.delete(
  '/offers/:offerId/slots/:slotName',
  authenticate,
  adminOnly,
  validateRequest([...offerIdValidation, ...slotNameValidation]),
  documentSlotController.clearOfferSlot
);

// ============================================
// LEAD LAST EMAIL ROUTES
// ============================================

/**
 * @route   GET /document-slots/leads/:leadId/last-email
 * @desc    Get last_email for a lead
 * @access  Authenticated + Lead Read Permission
 */
router.get(
  '/leads/:leadId/last-email',
  authenticate,
  authorizeAny([PERMISSIONS.LEAD_READ_ASSIGNED, PERMISSIONS.LEAD_READ_ALL]),
  validateRequest(leadIdValidation),
  documentSlotController.getLeadLastEmail
);

/**
 * @route   POST /document-slots/leads/:leadId/last-email/documents
 * @desc    Add a document to lead's last_email
 * @access  Admin only
 * @body    { document_id: string }
 */
router.post(
  '/leads/:leadId/last-email/documents',
  authenticate,
  adminOnly,
  validateRequest([...leadIdValidation, ...addDocumentBodyValidation]),
  documentSlotController.addDocumentToLeadLastEmail
);

/**
 * @route   DELETE /document-slots/leads/:leadId/last-email/documents/:documentId
 * @desc    Remove a document from lead's last_email
 * @access  Admin only
 */
router.delete(
  '/leads/:leadId/last-email/documents/:documentId',
  authenticate,
  adminOnly,
  validateRequest([...leadIdValidation, ...documentIdValidation]),
  documentSlotController.removeDocumentFromLeadLastEmail
);

/**
 * @route   POST /document-slots/leads/:leadId/last-email/emails
 * @desc    Add an email to lead's last_email
 * @access  Admin only
 * @body    { email_id: string }
 */
router.post(
  '/leads/:leadId/last-email/emails',
  authenticate,
  adminOnly,
  validateRequest([...leadIdValidation, ...addEmailBodyValidation]),
  documentSlotController.addEmailToLeadLastEmail
);

/**
 * @route   DELETE /document-slots/leads/:leadId/last-email/emails/:emailId
 * @desc    Remove an email from lead's last_email
 * @access  Admin only
 */
router.delete(
  '/leads/:leadId/last-email/emails/:emailId',
  authenticate,
  adminOnly,
  validateRequest([...leadIdValidation, ...emailIdValidation]),
  documentSlotController.removeEmailFromLeadLastEmail
);

/**
 * @route   DELETE /document-slots/leads/:leadId/last-email
 * @desc    Clear lead's last_email
 * @access  Admin only
 */
router.delete(
  '/leads/:leadId/last-email',
  authenticate,
  adminOnly,
  validateRequest(leadIdValidation),
  documentSlotController.clearLeadLastEmail
);

module.exports = router;
