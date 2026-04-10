const express = require('express');
const multer = require('multer');
const path = require('path');
const {
  createOpening,
  getAllOpenings,
  getOpeningById,
  updateOpening,
  deleteOpening,
  bulkDeleteOpenings,
  restoreOpening,
  viewDocument,
  addDocumentsToOpening,
  removeDocumentFromOpening,
} = require('../controllers/openingController');
const { adminOnly, authenticate } = require('../middleware');
const { authorize, authorizeAny } = require('../middleware/authorize');
const { PERMISSIONS } = require('../middleware/roles/permissions');
const { asyncHandler } = require('../utils/errorHandler');
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
  console.log({ file })
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'application/pdf', 'text/plain'];
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error('Invalid file type'));
  }
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
        file.documentType = index < documentTypes.length ? documentTypes[index] : 'extra';

        // Validate that the document type is one of the allowed values
        if (!['contract', 'id', 'extra'].includes(file.documentType)) {
          file.documentType = 'extra'; // Default to 'extra' if invalid type
        }
      });
    } else {
      // Fallback to the old behavior if documentTypes is not provided
      req.files.forEach((file) => {
        file.documentType = req.body.documentType || 'extra';
      });
    }
  }
  next();
});

/**
 * @route POST /openings
 * @access Private - Requires opening:create permission
 */
router.post(
  '/',
  authenticate,
  authorize(PERMISSIONS.OPENING_CREATE),
  upload.array('files', 10), // Allow up to 10 files
  processDocumentType,
  validateRequest([
    body('offer_id').optional().isMongoId().withMessage('Invalid offer ID'),
    body('documentType')
      .optional().isIn(['contract', 'id', 'extra']).default('extra').withMessage('Invalid document type'),
  ]),
  createOpening
);

/**
 * @route GET /openings
 * @access Private - Admin only
 * 
 * All query parameters work independently and can be combined:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100) 
 * - search: Search across offer title and lead contact name (case-insensitive)
 * - showInactive: Include inactive/deleted openings (default: false)
 * - offer_id: Filter by specific offer ID
 * - agent_id: Filter by agent ID (shows openings for agent's assigned leads)
 * 
 * Examples:
 * GET /openings?search=john&agent_id=123&page=2
 * GET /openings?offer_id=456&showInactive=true
 * GET /openings?search=contract&limit=50
 */
router.get(
  '/',
  authenticate,
  authorizeAny([PERMISSIONS.OPENING_READ, PERMISSIONS.OPENING_READ_ALL]),
  validateRequest([
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1 }).toInt(),
    query('search')
      .optional()
      .isString()
      .trim()
      .withMessage('Search must be a valid string')
      .isLength({ max: 100 })
      .withMessage('Search term must be maximum 100 characters'),
    query('showInactive').optional().isBoolean().toBoolean(),
    query('offer_id').optional().isMongoId(),
    query('agent_id').optional().isMongoId(),
    query('stage').optional().isIn(['opening', 'confirmation', 'payment']).withMessage('Stage must be opening, confirmation, or payment'),
  ]),
  getAllOpenings
);

/**
 * @route GET /openings/:id
 * @access Private - Requires opening:read or opening:read:all permission
 */
router.get('/:id', authenticate, authorizeAny([PERMISSIONS.OPENING_READ, PERMISSIONS.OPENING_READ_ALL]), getOpeningById);

/**
 * @route PUT /openings/:id
 * @access Private - Requires opening:update permission
 */
router.put(
  '/:id',
  authenticate,
  authorize(PERMISSIONS.OPENING_UPDATE),
  upload.array('files', 10), // Allow up to 10 files
  processDocumentType,
  validateRequest([
    body('offer_id').optional().isMongoId().withMessage('Invalid offer ID'),
    body('documentType')
      .optional().isIn(['contract', 'id', 'extra']).default('extra').withMessage('Invalid document type'),
  ]),
  updateOpening
);

/**
 * @route DELETE /openings/:id
 * @access Private - Requires opening:delete:own or opening:delete:all permission
 */
router.delete('/:id', authenticate, authorizeAny([PERMISSIONS.OPENING_DELETE, PERMISSIONS.OPENING_DELETE_ALL]), deleteOpening);

/**
 * @route DELETE /openings
 * @access Private - Admin only
 * @description Bulk delete openings
 */
router.delete(
  '/',
  authenticate,
  validateRequest([
    body('ids').isArray().withMessage('IDs must be an array'),
    body('ids.*').isMongoId().withMessage('All IDs must be valid MongoDB IDs'),
  ]),
  bulkDeleteOpenings
);

/**
 * @route POST /openings/:id/documents
 * @access Private - Admin and Agent
 * @description Add documents to existing opening
 */
router.post(
  '/:id/documents',
  authenticate,
  upload.array('files', 10),
  processDocumentType,
  addDocumentsToOpening
);

/**
 * @route POST /openings/:id/restore
 * @access Private - Admin only
 */
router.post('/:id/restore', authenticate, restoreOpening);

/**
 * @route GET /openings/documents/:documentId
 * @access Private - Admin and Agent only
 * @description View or download a document from an opening
 */
router.get('/documents/:documentId', authenticate, viewDocument);

/**
 * @route DELETE /openings/:openingId/documents/:documentId
 * @access Private - Admin and Agent only
 * @description Remove a document from an opening
 */
router.delete('/:openingId/documents/:documentId', authenticate, removeDocumentFromOpening);

module.exports = router;
