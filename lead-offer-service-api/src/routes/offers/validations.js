const { body, param, query } = require('express-validator');

/**
 * Sortable fields for offers
 */
const SORTABLE_FIELDS = [
  'title',
  'investment_volume',
  'interest_rate',
  'status',
  'createdAt',
  'updatedAt',
  'created_at',
  'updated_at',
  'leadName',
  'leadEmail',
  'contactName',
  'partnerId',
  'agent',
  'interestMonth',
  'bankName',
  'projectName',
  'bonusAmount',
];

/**
 * Valid offer statuses
 */
const OFFER_STATUSES = ['pending', 'sent'];

/**
 * Valid offer stages
 */
const OFFER_STAGES = ['opening', 'confirmation', 'payment'];

/**
 * Valid progress types
 */
const PROGRESS_TYPES = ['opening', 'confirmation', 'payment', 'netto1', 'netto2', 'netto', 'any', 'lost', 'all'];

/**
 * Valid revert stages
 */
const REVERT_STAGES = ['opening', 'confirmation', 'payment', 'netto1', 'netto2', 'lost'];

/**
 * Valid document types for uploads
 * NEW: Simplified document slot types aligned with offer workflow
 */
const DOCUMENT_TYPES = [
  // Primary document slot types (new)
  'offer_email',           // Offer email communication with customer (Offer stage)
  'offer_contract',        // Offer contract document (Offer stage)
  'contract',              // Customer sends signed contract (Opening - Incoming)
  'id_files',              // Customer sends ID documents (Opening - Incoming)
  'contract_received_mail', // We confirm receipt of contract + ID (Opening - Outgoing)
  'opening_contract_client_email', // Opening contract email to client (Opening - Outgoing)
  'bank_confirmation',     // We confirm account opened + depot login (Confirmation - Outgoing)
  'annahme',               // We send bank details (Confirmation - Outgoing)
  'confirmation_email',    // Confirmation email to customer (Confirmation - Outgoing)
  'swift',                 // Customer sends payment voucher (Payment - Incoming)
  'swift_confirm_mail',    // We confirm receipt of payment (Payment - Outgoing)
  'depot_update_mail',     // We confirm amount updated (Post-Payment - Outgoing)
  'depot_login',           // Depot login credentials (Post-Payment - Outgoing)
  'load_mail',             // Follow-up with new offers (Post-Payment - Outgoing)
  'last_email',            // Most recent email communication (Lead level)
  
  // Legacy types (backward compatibility)
  'offer-contract',
  'offer-extra',
  'offer-email',
  'opening-contract',
  'opening-id',
  'opening-extra',
  'opening-email',
  'opening-mail',
  'confirmation-contract',
  'confirmation-extra',
  'confirmation-email',
  'confirmation-mail',
  'payment-contract',
  'payment-extra',
  'payment-email',
  'payment-mail',
  'netto1-mail',
  'netto2-mail',
  'extra',
];

/**
 * Valid offer types
 */
const OFFER_TYPES = ['Tagesgeld', 'Festgeld', 'ETF'];

/**
 * Common pagination and search validations
 */
const paginationValidation = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1 }).toInt(),
];

const searchValidation = [
  query('search')
    .optional()
    .isString()
    .trim()
    .withMessage('Search must be a valid string')
    .isLength({ max: 100 })
    .withMessage('Search term must be between 1 and 100 characters'),
];

const sortValidation = [
  query('sortBy')
    .optional()
    .trim()
    .isIn(SORTABLE_FIELDS)
    .withMessage(
      `Invalid sort field. Allowed fields: ${SORTABLE_FIELDS.join(', ')}`
    ),
  query('sortOrder')
    .optional()
    .trim()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be either "asc" or "desc"'),
];

/**
 * Common filter validations
 */
const filterValidation = [
  query('status').optional().isIn(OFFER_STATUSES),
  query('project_id').optional().isMongoId(),
  query('lead_id').optional().isMongoId(),
  query('agent_id').optional().isMongoId(),
  query('active')
    .optional()
    .isBoolean()
    .toBoolean()
    .withMessage('Active must be a boolean value (true or false)'),
  query('stage')
    .optional()
    .isIn(OFFER_STAGES)
    .withMessage(`Stage must be one of: ${OFFER_STAGES.join(', ')}`),
  query('has_progress')
    .optional()
    .isIn(PROGRESS_TYPES)
    .withMessage(
      `Has progress must be one of: ${PROGRESS_TYPES.join(', ')}`
    ),
  query('out')
    .optional()
    .isBoolean()
    .toBoolean()
    .withMessage('Out must be a boolean value (true or false)'),
];

/**
 * Validation for GET /offers
 */
const getAllOffersValidation = [
  ...paginationValidation,
  ...searchValidation,
  ...filterValidation,
  ...sortValidation,
];

/**
 * Validation for GET /offers/progress
 */
const getOffersWithProgressValidation = [
  ...paginationValidation,
  ...searchValidation,
  ...filterValidation,
  ...sortValidation,
];

/**
 * Validation for GET /offers/:id
 */
const getOfferByIdValidation = [
  param('id').isMongoId().withMessage('Invalid offer ID format'),
  query('generatePdf').optional().isBoolean().toBoolean(),
  query('returnPdf').optional().isBoolean().toBoolean(),
  query('templateId').optional().isMongoId().withMessage('Invalid template ID format'),
  query('templatePath').optional().isString(),
  query('mappingPath').optional().isString(),
];

/**
 * Validation for GET /offers/:id/pdf
 */
const downloadOfferPdfValidation = [
  param('id').isMongoId().withMessage('Invalid offer ID format'),
  query('templateId').optional().isMongoId().withMessage('Invalid template ID format'),
];

/**
 * Validation for POST /offers
 */
const createOfferValidation = [
    body('project_id').isMongoId().withMessage('Valid project ID is required'),
    body('lead_id').isMongoId().withMessage('Valid lead ID is required'),
    body('agent_id').optional().isMongoId().withMessage('Invalid agent ID format'),
    body('bank_id').optional().isMongoId().withMessage('Invalid bank ID format'),
    body('investment_volume').isNumeric().withMessage('Investment volume must be a number'),
    body('nametitle').optional().isString().withMessage('Nametitle must be a string'),
    body('offer_type')
      .optional()
      .isIn(['Tagesgeld', 'Festgeld', 'ETF'])
      .withMessage('Offer type must be Tagesgeld, Festgeld, or ETF'),
    body('interest_rate').isNumeric().withMessage('Interest rate must be a number'),
    body('payment_terms').isMongoId().withMessage('Valid payment terms ID is required'),
    body('bonus_amount').isMongoId().withMessage('Valid bonus amount ID is required'),
    body('flex_option').optional().isBoolean().withMessage('Flex option must be a boolean'),
    body('status').optional().isIn(['pending', 'sent']),
    body('scheduled_date')
      .optional()
      .isISO8601()
      .withMessage('Scheduled date must be a valid ISO date'),
    body('scheduled_time')
      .optional()
      .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage('Scheduled time must be in HH:MM format'),
    body('selected_agent_id')
      .optional()
      .isMongoId()
      .withMessage('Selected agent ID must be valid'),
    body('notes')
      .optional()
      .isString()
      .trim()
      .withMessage('Notes must be a string'),
    query('returnPdf').optional().isBoolean().toBoolean(),
    query('templateId').optional().isMongoId().withMessage('Invalid template ID format'),
    query('templatePath').optional().isString(),
    query('mappingPath').optional().isString(),
];

/**
 * Validation for PUT /offers/:id
 */
const updateOfferValidation = [
  param('id').isMongoId().withMessage('Invalid offer ID format'),
  body('title').optional().isString().trim().withMessage('Title must be a string'),
  body('nametitle').optional().isString().trim().withMessage('Nametitle must be a string'),
  body('reference_no').optional().isString().trim().withMessage('Reference number must be a string'),
  body('project_id').optional().isMongoId().withMessage('Invalid project ID format'),
  body('lead_id').optional().isMongoId().withMessage('Invalid lead ID format'),
  body('agent_id').optional().isMongoId().withMessage('Invalid agent ID format'),
  body('bank_id').optional().isMongoId().withMessage('Invalid bank ID format'),
  body('investment_volume')
    .optional()
    .isNumeric()
    .withMessage('Investment volume must be a number'),
  body('interest_rate').optional().isNumeric().withMessage('Interest rate must be a number'),
  body('payment_terms').optional().isMongoId().withMessage('Valid payment terms ID is required'),
  body('bonus_amount').optional().isMongoId().withMessage('Valid bonus amount ID is required'),
  body('bankerRate')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Banker rate must be a number between 0 and 100'),
  body('agentRate')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Agent rate must be a number between 0 and 100'),
  body('flex_option').optional().isBoolean().withMessage('Flex option must be a boolean'),
  body('status').optional().isIn(OFFER_STATUSES),
  body('offerType')
    .optional()
    .isIn(OFFER_TYPES)
    .withMessage(`Offer type must be one of: ${OFFER_TYPES.join(', ')}`),
  body('scheduled_date')
    .optional()
    .isISO8601()
    .withMessage('Scheduled date must be a valid ISO date'),
  body('scheduled_time')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Scheduled time must be in HH:MM format'),
  body('handover_notes')
    .optional()
    .isString()
    .trim()
    .withMessage('Handover notes must be a string'),
  body('load_and_opening')
    .optional()
    .isString()
    .trim()
    .isIn(['load', 'opening'])
    .withMessage('Load and opening must be either "load" or "opening"'),
  query('returnPdf').optional().isBoolean().toBoolean(),
  query('templateId').optional().isMongoId().withMessage('Invalid template ID format'),
  query('templatePath').optional().isString(),
  query('mappingPath').optional().isString(),
];

/**
 * Validation for DELETE /offers/:id
 */
const deleteOfferValidation = [
  param('id').isMongoId().withMessage('Invalid offer ID format'),
];

/**
 * Validation for POST /offers/:id/restore
 */
const restoreOfferValidation = [
  param('id').isMongoId().withMessage('Invalid offer ID format'),
];

/**
 * Validation for DELETE /offers (bulk delete)
 */
const bulkDeleteOffersValidation = [
  body('ids').isArray().withMessage('IDs must be an array'),
  body('ids.*').isMongoId().withMessage('All IDs must be valid MongoDB IDs'),
];

/**
 * Validation middleware for PUT /offers/out (bulk update with array body)
 * Validates that req.body is an array of valid MongoDB IDs
 */
const bulkDeleteOffersArrayValidation = (req, res, next) => {
  const { ValidationError } = require('../../utils/errorHandler');
  const mongoose = require('mongoose');
  
  // Check if body is an array
  if (!Array.isArray(req.body)) {
    return next(new ValidationError('Body must be an array of offer IDs', {
      body: 'Body must be an array'
    }));
  }
  
  // Check if array is not empty
  if (req.body.length === 0) {
    return next(new ValidationError('Array cannot be empty', {
      body: 'At least one offer ID is required'
    }));
  }
  
  // Validate each ID
  const invalidIds = [];
  req.body.forEach((id, index) => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      invalidIds.push({ index, id, message: 'Invalid MongoDB ID format' });
    }
  });
  
  if (invalidIds.length > 0) {
    return next(new ValidationError('Invalid offer IDs found', {
      invalidIds: invalidIds.map(item => `Index ${item.index}: ${item.id}`)
    }));
  }
  
  next();
};

/**
 * Validation middleware for PUT /offers/out and PUT /offers/revert-from-out
 * Validates that req.body contains an array of valid MongoDB IDs or a single id field
 */
const singleOfferIdValidation = (req, res, next) => {
  const { ValidationError } = require('../../utils/errorHandler');
  const mongoose = require('mongoose');
  
  // Check if body has ids array or id field
  if (!req.body) {
    return next(new ValidationError('Body is required', {
      body: 'Missing request body'
    }));
  }
  
  // Support both array format and object with ids array
  let idsToValidate = [];
  
  if (Array.isArray(req.body)) {
    // Direct array format: ["id1", "id2"]
    idsToValidate = req.body;
  } else if (req.body.ids && Array.isArray(req.body.ids)) {
    // Object with ids array: { ids: ["id1", "id2"] }
    idsToValidate = req.body.ids;
  } else if (req.body.id) {
    // Single ID format: { id: "id1" } - convert to array
    idsToValidate = [req.body.id];
  } else {
    return next(new ValidationError('Body must contain an array of IDs (ids) or a single id field', {
      body: 'Missing required field: ids (array) or id (string)'
    }));
  }
  
  // Check if array is not empty
  if (idsToValidate.length === 0) {
    return next(new ValidationError('At least one offer ID is required', {
      ids: 'Array cannot be empty'
    }));
  }
  
  // Validate each ID
  const invalidIds = [];
  idsToValidate.forEach((id, index) => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      invalidIds.push({ index, id, message: 'Invalid MongoDB ID format' });
    }
  });
  
  if (invalidIds.length > 0) {
    return next(new ValidationError('Invalid offer IDs found', {
      invalidIds: invalidIds.map(item => `Index ${item.index}: ${item.id}`)
    }));
  }
  
  // Attach normalized IDs to request for use in controllers
  req.normalizedOfferIds = idsToValidate;
  
  next();
};

/**
 * Validation for POST /offers/:offerId/documents
 */
const addDocumentsValidation = [
  param('offerId').isMongoId().withMessage('Invalid offer ID format'),
  body('documentTypes')
    .optional()
    .isIn(DOCUMENT_TYPES)
    .withMessage(
      `Invalid document type. Allowed types: ${DOCUMENT_TYPES.join(', ')}`
    ),
];

/**
 * Validation for GET /offers/lead/:leadId
 */
const getOffersByLeadIdValidation = [
  param('leadId').isMongoId().withMessage('Invalid lead ID format'),
  ...sortValidation,
];

/**
 * Validation for GET /offers/project/:projectId
 */
const getOffersByProjectIdValidation = [
  param('projectId').isMongoId().withMessage('Invalid project ID format'),
  ...sortValidation,
];

/**
 * Validation for POST /offers/:offerId/netto1
 */
const createNetto1Validation = [
  param('offerId').isMongoId().withMessage('Invalid offer ID format'),
  body('bankerRate')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Banker rate must be a number between 0 and 100'),
  body('agentRate')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Agent rate must be a number between 0 and 100'),
];

/**
 * Validation for POST /offers/:offerId/netto2
 */
const createNetto2Validation = [
  param('offerId').isMongoId().withMessage('Invalid offer ID format'),
  body('bankerRate')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Banker rate must be a number between 0 and 100'),
  body('agentRate')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Agent rate must be a number between 0 and 100'),
];

/**
 * Validation for GET /offers/:offerId/revert-options
 */
const getRevertOptionsValidation = [
  param('offerId').isMongoId().withMessage('Invalid offer ID'),
];

/**
 * Validation for POST /offers/:offerId/revert/:stage
 */
const revertStageValidation = [
  param('offerId').isMongoId().withMessage('Invalid offer ID'),
  param('stage')
    .isIn(REVERT_STAGES)
    .withMessage(`Invalid stage. Valid stages are: ${REVERT_STAGES.join(', ')}`),
  body('reason').optional().isString().trim().withMessage('Reason must be a string'),
];

/**
 * Validation for POST /offers/:offerId/revert-batch
 */
const revertBatchValidation = [
  param('offerId').isMongoId().withMessage('Invalid offer ID'),
  body('stages').isArray({ min: 1 }).withMessage('Stages must be a non-empty array'),
  body('stages.*')
    .isIn(REVERT_STAGES)
    .withMessage(`Invalid stage in array. Valid stages are: ${REVERT_STAGES.join(', ')}`),
  body('reason').optional().isString().trim().withMessage('Reason must be a string'),
];

module.exports = {
  // Constants
  SORTABLE_FIELDS,
  OFFER_STATUSES,
  OFFER_STAGES,
  PROGRESS_TYPES,
  REVERT_STAGES,
  DOCUMENT_TYPES,
  OFFER_TYPES,
  
  // Validation schemas
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
};

