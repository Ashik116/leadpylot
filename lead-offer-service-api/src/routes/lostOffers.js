const express = require('express');
const {
  createLostFromOffer,
  getAllLostRecords,
  getLostRecordById,
  revertLostRecord,
} = require('../controllers/lostController');
const { adminOnly, authenticate } = require('../middleware');
const { asyncHandler } = require('../helpers/errorHandler');
const { validateRequest } = require('../middleware/validation');
const { body, query, param } = require('express-validator');

const router = express.Router();

/**
 * @route POST /lost-offers
 * @access Private - Authenticated users with proper permissions
 * @body {string} offer_id - Offer ID to mark as lost
 * @body {string} [reason] - Reason for marking as lost
 * @body {string} [notes] - Optional notes
 */
router.post(
  '/',
  authenticate,
  validateRequest([
    body('offer_id')
      .isMongoId()
      .withMessage('Invalid offer ID format'),
    body('reason')
      .optional()
      .isString()
      .trim()
      .withMessage('Reason must be a string'),
    body('notes')
      .optional()
      .isString()
      .trim()
      .withMessage('Notes must be a string'),
  ]),
  createLostFromOffer
);

/**
 * @route GET /lost-offers
 * @access Private - Admin only
 * @desc Get all lost records
 */
router.get(
  '/',
  authenticate,
  adminOnly,
  validateRequest([
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
  ]),
  getAllLostRecords
);

/**
 * @route GET /lost-offers/:id
 * @access Private - Authenticated users with proper permissions
 * @desc Get lost record by ID
 */
router.get(
  '/:id',
  authenticate,
  validateRequest([
    param('id').isMongoId().withMessage('Invalid lost record ID format'),
  ]),
  getLostRecordById
);

/**
 * @route POST /lost-offers/:id/revert
 * @access Private - Admin only
 * @desc Revert lost record (restore offer from lost status)
 */
router.post(
  '/:id/revert',
  authenticate,
  adminOnly,
  validateRequest([
    param('id').isMongoId().withMessage('Invalid lost record ID format'),
    body('revert_reason')
      .optional()
      .isString()
      .trim()
      .withMessage('Revert reason must be a string'),
  ]),
  revertLostRecord
);

module.exports = router;
