const express = require('express');
const multer = require('multer');
const path = require('path');
const {
  createConfirmation,
  getAllConfirmations,
  getConfirmationById,
  updateConfirmation,
  deleteConfirmation,
  bulkDeleteConfirmations,
  restoreConfirmation,
  viewDocument,
} = require('../controllers/confirmationController.js');
const { adminOnly, authenticate } = require('../middleware');
const { authorize, authorizeAny } = require('../middleware/authorize');
const { PERMISSIONS } = require('../middleware/roles/permissions');
const { asyncHandler } = require('../helpers/errorHandler.js');
const { validateRequest } = require('../middleware/validation');
const { body, query } = require('express-validator');
const storageConfig = require('../config/storageConfig');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Use centralized storage configuration for temp uploads
    const tempUploadsDir = storageConfig.getFilePath('', 'temp');
    cb(null, tempUploadsDir);
  },
  filename: function (req, file, cb) {
    // Use a timestamp prefix to avoid filename collisions
    cb(null, Date.now() + '-' + file.originalname);
  },
});

// Set up file filter to allow only certain file types if needed
const fileFilter = (req, file, cb) => {
  // Accept all files for now - filtering can be added if needed
  cb(null, true);
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Process document type from request
const processDocumentType = asyncHandler(async (req, res, next) => {
  if (req.files && req.files.length > 0) {
    // Check if documentTypes is provided as an array
    if (req.body.documentTypes && Array.isArray(JSON.parse(req.body.documentTypes))) {
      const documentTypes = JSON.parse(req.body.documentTypes);

      // Assign document type to each file based on the array index
      req.files.forEach((file, index) => {
        // If there's a document type specified for this index, use it; otherwise use default
        file.documentType = index < documentTypes.length ? documentTypes[index] : 'confirmation';

        // Validate that the document type is one of the allowed values
        if (!['confirmation', 'extra'].includes(file.documentType)) {
          file.documentType = 'confirmation'; // Default to 'confirmation' if invalid type
        }
      });
    } else {
      // Fallback to the old behavior if documentTypes is not provided
      req.files.forEach((file) => {
        file.documentType = req.body.documentType || 'confirmation';
      });
    }
  }
  next();
});

/**
 * @route POST /confirmations
 * @access Private - Admin only
 * @body {string} [opening_id] - Opening ID (for traditional flow)
 * @body {string} offer_id - Offer ID (for direct creation from offer)
 * @body {string} [reference_no] - Reference number (optional in route, but required by service) - will be saved to the offer
 * @body {string} [notes] - Optional notes
 */
router.post(
  '/',
  authenticate,
  authorize(PERMISSIONS.CONFIRMATION_CREATE),
  upload.array('files', 10), // Allow up to 10 files
  processDocumentType,
  validateRequest([
    body('opening_id')
      .optional()
      .isMongoId()
      .withMessage('Invalid opening ID format'),
    body('offer_id')
      .isMongoId()
      .withMessage('Invalid offer ID format'),
    body('reference_no')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Reference number must be between 1-100 characters when provided'),
    body('notes')
      .optional()
      .isString()
      .trim()
      .withMessage('Notes must be a string'),
  ]),
  createConfirmation
);

/**
 * @route GET /confirmations
 * @access Private - Admin only
 * 
 * All query parameters work independently and can be combined:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - search: Search across offer title and lead contact name (case-insensitive)
 * - showInactive: Include inactive/deleted confirmations (default: false)
 * - opening_id: Filter by specific opening ID
 * - agent_id: Filter by agent ID (shows confirmations for agent's assigned leads)
 * 
 * Examples:
 * GET /confirmations?search=john&agent_id=123&page=2
 * GET /confirmations?opening_id=456&showInactive=true
 * GET /confirmations?search=contract&limit=50
 */
router.get(
  '/', 
  authenticate,
  authorizeAny([PERMISSIONS.CONFIRMATION_READ, PERMISSIONS.CONFIRMATION_READ_ALL]),
  validateRequest([
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1}).toInt(),
    query('search')
      .optional()
      .isString()
      .trim()
      .withMessage('Search must be a valid string')
      .isLength({ max: 100 })
      .withMessage('Search term must be maximum 100 characters'),
    query('showInactive').optional().isBoolean().toBoolean(),
    query('opening_id').optional().isMongoId(),
    query('agent_id').optional().isMongoId(),
    query('stage').optional().isIn(['opening', 'confirmation', 'payment']).withMessage('Stage must be opening, confirmation, or payment'),
  ]),
  getAllConfirmations
);

/**
 * @route GET /confirmations/:id
 * @access Private - Requires confirmation:read:own or confirmation:read:all permission
 */
router.get('/:id', authenticate, authorizeAny([PERMISSIONS.CONFIRMATION_READ, PERMISSIONS.CONFIRMATION_READ_ALL]), getConfirmationById);

/**
 * @route PUT /confirmations/:id
 * @access Private - Requires confirmation:update permission
 */
router.put(
  '/:id',
  authenticate,
  authorize(PERMISSIONS.CONFIRMATION_UPDATE),
  upload.array('files', 10), // Allow up to 10 files
  processDocumentType,
  validateRequest([
    body('opening_id').optional().isMongoId().withMessage('Invalid opening ID'),
    body('reference_no')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Reference number must be between 1-100 characters'),
    body('notes').optional().isString().withMessage('Notes must be a string'),
    body('documentType')
    .optional().isIn(['confirmation', 'extra']).default('extra').withMessage('Invalid document type'),
  ]),
  updateConfirmation
);

/**
 * @route DELETE /confirmations/:id
 * @access Private - Requires confirmation:delete:own or confirmation:delete:all permission
 */
router.delete('/:id', authenticate, authorizeAny([PERMISSIONS.CONFIRMATION_DELETE, PERMISSIONS.CONFIRMATION_DELETE_ALL]), deleteConfirmation);

/**
 * @route DELETE /confirmations
 * @access Private - Admin only
 * @description Bulk delete confirmations
 */
router.delete(
  '/',
  authenticate,
  validateRequest([
    body('ids').isArray().withMessage('IDs must be an array'),
    body('ids.*').isMongoId().withMessage('All IDs must be valid MongoDB IDs'),
  ]),
  bulkDeleteConfirmations
);

/**
 * @route POST /confirmations/:id/documents
 * @access Private - Admin and Agent
 * @description Add documents to existing confirmation
 */
router.post(
  '/:id/documents',
  authenticate,
  upload.array('files', 10),
  processDocumentType,
  require('../controllers/confirmationController').addDocumentsToConfirmation
);

/**
 * @route POST /confirmations/:id/restore
 * @access Private - Admin only
 */
router.post('/:id/restore', authenticate, restoreConfirmation);

/**
 * @route GET /confirmations/documents/:documentId
 * @access Private - Admin and Agent only
 * @description View or download a document from a confirmation
 */
router.get('/documents/:documentId', authenticate, viewDocument);

/**
 * @route DELETE /confirmations/:confirmationId/documents/:documentId
 * @access Private - Admin and Agent only
 * @description Remove a document from a confirmation
 */
router.delete('/:confirmationId/documents/:documentId', authenticate, asyncHandler(async (req, res) => {
  const { confirmationId, documentId } = req.params;
  const { user } = req;
  const updatedConfirmation = await require('../controllers/confirmationController').removeDocumentFromConfirmation(confirmationId, documentId, user);
  res.json(updatedConfirmation);
}));

module.exports = router; 