/**
 * Leads Routes Validation Rules
 * Comprehensive validation schemas for all lead endpoints
 */

const { query, body, param } = require('express-validator');

/**
 * Common validation rules reused across endpoints
 */
const commonLeadQueryValidation = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1 }).toInt(),
  query('status').optional().isString(),
  query('search').optional().isString(),
  query('showInactive').optional().isBoolean().toBoolean(),
  query('use_status').optional().isString(),
  query('project_name').optional().isString(),
  query('project_id')
    .optional()
    .custom((value) => {
      // Allow empty string (from query params like ?project_id=)
      if (value === '' || value === null || value === undefined) {
        return true;
      }
      // If it's a valid MongoDB ObjectId, that's fine
      if (typeof value === 'string' && /^[0-9a-fA-F]{24}$/.test(value)) {
        return true;
      }
      // If it's a string (like project name), also allow it
      if (typeof value === 'string') {
        return true;
      }
      return false;
    })
    .withMessage('Project ID must be a valid MongoDB ID or string'),
  query('sortBy')
    .optional()
    .isIn([
      'contact_name',
      'lead_source_no',
      'expected_revenue',
      'createdAt',
      'updatedAt',
      'lead_date',
      'assigned_date',
      'email_from',
      'phone',
      'status',
      'stage',
      'use_status',
      'duplicate_status',
      'active',
      'agent',
      'project_name',
      'prev_project',
      'prev_agent',
      'leadPrice',
      'source_month',
      'prev_month',
      'current_month',
      'prev_stage',
      'prev_status',
    ])
    .isString(),
  query('sortOrder').optional().isIn(['asc', 'desc']).isString(),
];

const todoFilterValidation = [
  query('has_ticket').optional().isBoolean().toBoolean(),
  query('has_todo').optional().isBoolean().toBoolean(),
  query('todo_scope')
    .optional()
    .isIn(['all', 'assigned_to_me', 'assigned_by_me'])
    .withMessage('todo_scope must be one of all, assigned_to_me, assigned_by_me'),
  query('pending_todos').optional().isBoolean().toBoolean(),
  query('pending').optional().isBoolean().toBoolean(), // Alias for pending_todos
  query('done_todos').optional().isBoolean().toBoolean(),
];

const commonLeadBodyValidation = [
  body('status_id').optional().isString(),
  body('stage_id').optional().isString(),
  body('use_status').optional().isString(),
  body('contact_name').optional().isString(),
  body('email_from').optional().isEmail(),
  body('phone').optional().isString(),
  body('expected_revenue').optional().isString(),
  body('lead_date').optional().isString(),
  body('lead_source_no').optional().isString(),
  body('source_id').optional().isMongoId(),
  body('usable').optional().isBoolean().toBoolean(),
  body('duplicate_status').optional().isString(),
];

/**
 * GET /leads - Get all leads with filtering and pagination
 */
const getAllLeadsValidation = [
  ...commonLeadQueryValidation,
  query('has_opening').optional().isBoolean().toBoolean(),
  ...todoFilterValidation,
  query('investment_volume').optional().isString(),
  query('agent_name').optional().isString(),
  query('duplicate').optional().isString(),
  query('state').optional().isIn(['offer', 'opening', 'confirmation', 'payment']),
  query('source').optional().isString(),
  query('leadIds')
    .optional()
    .custom((value) => {
      if (value === '' || value === null || value === undefined) return true;
      if (Array.isArray(value)) return value.every(v => !v || /^[0-9a-fA-F]{24}$/.test(String(v)));
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed.startsWith('[')) {
          try {
            const arr = JSON.parse(trimmed);
            return Array.isArray(arr) && arr.every(v => !v || /^[0-9a-fA-F]{24}$/.test(String(v)));
          } catch { return false; }
        }
        return trimmed.split(',').every(s => !s.trim() || /^[0-9a-fA-F]{24}$/.test(s.trim()));
      }
      return false;
    })
    .withMessage('leadIds must be a JSON array of MongoDB IDs or comma-separated IDs'),
  query('values')
    .optional()
    .custom((value) => {
      if (value === '' || value === null || value === undefined) return true;
      if (Array.isArray(value)) return value.every(v => typeof v === 'string' && v.trim().length > 0);
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed.startsWith('[')) {
          try {
            const arr = JSON.parse(trimmed);
            return Array.isArray(arr) && arr.every(v => typeof v === 'string' && v.trim().length > 0);
          } catch { return false; }
        }
        return trimmed.split(',').some(s => s.trim().length > 0);
      }
      return false;
    })
    .withMessage('values must be a JSON array of partner IDs/emails/phones (same as bulk-search)'),
];

/**
 * GET /leads/my-leads - Get user's assigned leads
 */
const getMyLeadsValidation = [
  ...commonLeadQueryValidation,
  ...todoFilterValidation,
  query('state').optional().isIn(['offer', 'opening', 'confirmation', 'payment']),
  query('source').optional().isString(),
];

/**
 * GET /leads/extra - Get leads with todos assigned to user
 */
const getExtraLeadsValidation = [
  ...commonLeadQueryValidation,
  query('has_todo').optional().isBoolean().toBoolean(),
];

/**
 * GET /leads/assigned - Get leads where user assigned todos to others
 */
const getAssignedLeadsValidation = [
  ...commonLeadQueryValidation,
  query('has_todo').optional().isBoolean().toBoolean(),
];

/**
 * GET /leads/archived - Get archived leads (active: false)
 */
const getArchivedLeadsValidation = [
  ...commonLeadQueryValidation,
  ...todoFilterValidation,
  query('has_opening').optional().isBoolean().toBoolean(),
  query('investment_volume').optional().isString(),
  query('agent_name').optional().isString(),
  query('duplicate').optional().isString(),
  query('state').optional().isIn(['offer', 'opening', 'confirmation', 'payment']),
  query('source').optional().isString(),
];

/**
 * GET /leads/:id - Get lead by ID
 */
const getLeadByIdValidation = [
  param('id').isMongoId().withMessage('Valid lead ID is required'),
];

/**
 * PUT /leads/:id - Update lead
 */
const updateLeadValidation = [
  param('id').isMongoId().withMessage('Valid lead ID is required'),
  ...commonLeadBodyValidation,
];

/**
 * PUT /leads/bulk-update - Bulk update leads
 */
const bulkUpdateLeadsValidation = [...commonLeadBodyValidation];

/**
 * PUT /leads/:id/status - Update lead status
 */
const updateLeadStatusValidation = [
  param('id').isMongoId().withMessage('Valid lead ID is required'),
  body('stage_name').optional().isString(),
  body('status_name').optional().isString(),
  body('stage_id').optional().isMongoId(),
  body('status_id').optional().isMongoId(),
];

/**
 * PUT /leads/bulk-status-update - Bulk update lead status
 */
const bulkUpdateLeadStatusValidation = [
  body('leadIds').optional().isArray().withMessage('Lead IDs must be an array'),
  body('leadIds.*').optional().isMongoId().withMessage('Each lead ID must be a valid MongoDB ID'),
  body('stage_name').optional().isString(),
  body('status_name').optional().isString(),
  body('stage_id').optional().isMongoId(),
  body('status_id').optional().isMongoId(),
  body('project_id').optional().isMongoId(),
  body('source_id').optional().isMongoId(),
];

/**
 * POST /leads/search-by-partner-ids - Search leads by values (partner IDs, emails, or phone numbers)
 */
const searchByPartnerIdsValidation = [
  body('values')
    .isArray({ min: 1 })
    .withMessage('values is required and must be a non-empty array'),
  body('values.*')
    .notEmpty()
    .withMessage('Each value in the array must be non-empty'),
  query('showInactive').optional().isBoolean().toBoolean(),
  query('sortBy')
    .optional()
    .isIn([
      'contact_name',
      'lead_source_no',
      'expected_revenue',
      'createdAt',
      'updatedAt',
      'lead_date',
      'assigned_date',
      'email_from',
      'phone',
      'status',
      'stage',
      'use_status',
      'duplicate_status',
      'active',
      'agent',
      'project_name',
    ])
    .isString(),
  query('sortOrder').optional().isIn(['asc', 'desc']).isString(),
];

/**
 * GET /leads/queue/current-top - Get current top lead in queue
 */
const getCurrentTopLeadValidation = [
  query('project_id').optional().isMongoId().withMessage('Project ID must be a valid MongoDB ID'),
  query('project_name').optional().isString(),
  query('source').optional().isString(),
  query('exclude_recent').optional().isInt({ min: 0, max: 72 }).toInt(),
];

/**
 * GET /leads/queue/navigate/:lead_id - Navigate to specific lead in queue
 */
const navigateToLeadValidation = [
  param('lead_id').isMongoId().withMessage('Valid lead_id is required'),
  query('project_id')
    .optional()
    .custom((value) => {
      if (value === '' || value === null || value === undefined) return true;
      if (typeof value === 'string' && /^[0-9a-fA-F]{24}$/.test(value)) return true;
      if (typeof value === 'string') return true;
      return false;
    })
    .withMessage('Project ID must be a valid MongoDB ID or string'),
  query('project_name').optional().isString(),
  query('source').optional().isString(),
];

/**
 * POST /leads/currenttop-completed - Mark current top lead as completed
 */
const completeCurrentTopLeadValidation = [
  body('lead_id').isMongoId().withMessage('Valid lead_id is required'),
];

/**
 * DELETE /leads/:id - Delete lead
 */
const deleteLeadValidation = [
  param('id').optional().isMongoId().withMessage('Valid lead ID is required'),
];

/**
 * POST /leads/import/:id/revert - Revert lead import
 */
const revertLeadImportValidation = [
  param('id').isMongoId().withMessage('Valid import ID is required'),
];

/**
 * PUT /leads/:id/secondary-email - Update secondary email for a lead
 */
const updateSecondaryEmailValidation = [
  param('id').isMongoId().withMessage('Valid lead ID is required'),
  body('secondary_email')
    .optional()
    .isString()
    .isEmail()
    .withMessage('secondary_email must be a valid email address')
    .normalizeEmail(),
];

/**
 * PUT /leads/:id/make-primary-email - Swap emails and set which email is primary
 */
const makePrimaryEmailValidation = [
  param('id').isMongoId().withMessage('Valid lead ID is required'),
  body('email')
    .isString()
    .isEmail()
    .withMessage('email is required and must be a valid email address'),
];

/**
 * PUT /leads/:id/offer_calls - Update offer_calls field
 */
const updateOfferCallsValidation = [
  param('id').isMongoId().withMessage('Valid lead ID is required'),
  query('increase')
    .optional()
    .custom((value, { req }) => {
      // If increase is provided, validate it's a positive number
      if (value !== undefined && value !== null && value !== '') {
        const numValue = Number(value);
        if (isNaN(numValue) || numValue <= 0) {
          throw new Error('increase must be a positive number');
        }
      }
      
      // Check that exactly one of increase or decrease is provided
      const hasIncrease = req.query.increase !== undefined && req.query.increase !== null && req.query.increase !== '';
      const hasDecrease = req.query.decrease !== undefined && req.query.decrease !== null && req.query.decrease !== '';
      
      if (!hasIncrease && !hasDecrease) {
        throw new Error('Either increase or decrease query parameter must be provided');
      }
      if (hasIncrease && hasDecrease) {
        throw new Error('Cannot provide both increase and decrease parameters');
      }
      
      return true;
    }),
  query('decrease')
    .optional()
    .custom((value) => {
      // If decrease is provided, validate it's a positive number
      if (value !== undefined && value !== null && value !== '') {
        const numValue = Number(value);
        if (isNaN(numValue) || numValue <= 0) {
          throw new Error('decrease must be a positive number');
        }
      }
      return true;
    }),
];

const generateSummaryValidation = [
  param('id').isMongoId().withMessage('Valid lead ID is required'),
  body('user_id').isMongoId().withMessage('user_id is required and must be a valid MongoDB ObjectId'),
  body('limit').optional().isInt({ min: 1, max: 100 }).toInt().withMessage('limit must be between 1 and 100'),
];

module.exports = {
  getAllLeadsValidation,
  getMyLeadsValidation,
  getExtraLeadsValidation,
  getAssignedLeadsValidation,
  getArchivedLeadsValidation,
  getLeadByIdValidation,
  updateLeadValidation,
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
  generateSummaryValidation,
};

