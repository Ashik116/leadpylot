const express = require('express');
const multer = require('multer');
const path = require('path');
const {
  createPaymentVoucher,
  getAllPaymentVouchers,
  getPaymentVoucherById,
  updatePaymentVoucher,
  deletePaymentVoucher,
  restorePaymentVoucher,
  viewDocument,
  bulkDeletePaymentVouchers,
} = require('../controllers/paymentVoucherController.js');
const { adminOnly, authenticate } = require('../middleware');
const { authorize, authorizeAny } = require('../middleware/authorize');
const { PERMISSIONS } = require('../middleware/roles/permissions');
const { asyncHandler } = require('../helpers/errorHandler');
const storageConfig = require('../config/storageConfig');
const { validateRequest } = require('../middleware/validation');
const { body, query } = require('express-validator');

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
        file.documentType = index < documentTypes.length ? documentTypes[index] : 'payment_voucher';

        // Validate that the document type is one of the allowed values
        if (!['payment_voucher', 'extra'].includes(file.documentType)) {
          file.documentType = 'payment_voucher'; // Default to 'payment_voucher' if invalid type
        }
      });
    } else {
      // Fallback to the old behavior if documentTypes is not provided
      req.files.forEach((file) => {
        file.documentType = req.body.documentType || 'payment_voucher';
      });
    }
  }
  next();
});

/**
 * @route POST /payment-vouchers
 * @access Private - Admin only
 * @body {string} [confirmation_id] - Confirmation ID (for traditional flow)
 * @body {string} [offer_id] - Offer ID (for direct creation from offer)
 * @body {number} [amount] - Payment amount
 * @body {string} [notes] - Optional notes
 */
router.post(
  '/',
  authenticate,
  authorize(PERMISSIONS.PAYMENT_VOUCHER_CREATE),
  upload.array('files', 10), // Allow up to 10 files
  processDocumentType,
  validateRequest([
    body('confirmation_id')
      .optional()
      .isMongoId()
      .withMessage('Invalid confirmation ID format'),
    body('offer_id')
      .optional()
      .isMongoId()
      .withMessage('Invalid offer ID format'),
    body('amount')
      .optional()
      .isNumeric()
      .withMessage('Amount must be a number'),
    body('notes')
      .optional()
      .isString()
      .trim()
      .withMessage('Notes must be a string'),
  ]),
  validateRequest([
    body('confirmation_id')
      .optional()
      .isMongoId()
      .withMessage('Invalid confirmation ID format'),
    body('offer_id')
      .isMongoId()
      .withMessage('Invalid offer ID format'),
  ]),
  createPaymentVoucher
);

/**
 * @route GET /payment-vouchers
 * @access Private - Admin only
 */
router.get(
  '/',
  authenticate,
  authorizeAny([PERMISSIONS.PAYMENT_VOUCHER_READ, PERMISSIONS.PAYMENT_VOUCHER_READ_ALL]),
  validateRequest([
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1 }).withMessage('Limit must be a positive integer'),
    query('confirmation_id').optional().isMongoId().withMessage('Confirmation ID must be a valid MongoDB ID'),
    query('showInactive').optional().isBoolean().withMessage('Show inactive must be a boolean'),
    query('agent_id').optional().isMongoId().withMessage('Agent ID must be a valid MongoDB ID'),
    query('search').optional().isString().withMessage('Search must be a string'),
    query('stage').optional().isIn(['opening', 'confirmation', 'payment']).withMessage('Stage must be opening, confirmation, or payment'),
  ]),
  getAllPaymentVouchers);

/**
 * @route GET /payment-vouchers/:id
 * @access Private - Requires payment_voucher:read or payment_voucher:read:all permission
 */
router.get('/:id', authenticate, authorizeAny(['payment_voucher:read', 'payment_voucher:read:all']), getPaymentVoucherById);

/**
 * @route PUT /payment-vouchers/:id
 * @access Private - Requires payment_voucher:update permission
 */
router.put(
  '/:id',
  authenticate,
  authorize(PERMISSIONS.PAYMENT_VOUCHER_UPDATE),
  upload.array('files', 10), // Allow up to 10 files
  processDocumentType,
  updatePaymentVoucher
);

/**
 * @route DELETE /payment-vouchers/:id
 * @access Private - Requires payment_voucher:delete permission
 */
router.delete('/:id', authenticate, authorize(PERMISSIONS.PAYMENT_VOUCHER_DELETE), deletePaymentVoucher);

/**
 * @route DELETE /payment-vouchers
 * @access Private - Admin only
 */
router.delete(
  '/',
  authenticate,
  validateRequest([
    body('ids').isArray().withMessage('IDs must be an array'),
    body('ids.*').isMongoId().withMessage('All IDs must be valid MongoDB IDs'),
  ]),
  bulkDeletePaymentVouchers
);

/**
 * @route POST /payment-vouchers/:id/documents
 * @access Private - Admin and Agent
 * @description Add documents to existing payment voucher
 */
router.post(
  '/:id/documents',
  authenticate,
  upload.array('files', 10),
  processDocumentType,
  require('../controllers/paymentVoucherController').addDocumentsToPaymentVoucher
);

/**
 * @route POST /payment-vouchers/:id/restore
 * @access Private - Admin only
 */
router.post('/:id/restore', authenticate, restorePaymentVoucher);

/**
 * @route GET /payment-vouchers/documents/:documentId
 * @access Private - Admin and Agent only
 * @description View or download a document from a payment voucher
 */
router.get('/documents/:documentId', authenticate, viewDocument);

// Remove document from payment voucher
router.delete('/:paymentVoucherId/documents/:documentId', authenticate, asyncHandler(async (req, res) => {
  const { paymentVoucherId, documentId } = req.params;
  const { user } = req;
  const updatedPaymentVoucher = await require('../controllers/paymentVoucherController').removeDocumentFromPaymentVoucher(paymentVoucherId, documentId, user);
  res.json(updatedPaymentVoucher);
}));

module.exports = router; 