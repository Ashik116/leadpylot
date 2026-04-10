const { body, param, query, validationResult } = require('express-validator');
const logger = require('../utils/logger');

// Define valid operators for different field types
const OPERATORS = {
  STRING: [
    'equals',
    'not_equals',
    'contains',
    'not_contains',
    'starts_with',
    'ends_with',
    'is_empty',
    'is_not_empty',
    'in',
    'not_in',
  ],
  NUMBER: [
    'equals',
    'not_equals',
    'greater_than',
    'less_than',
    'greater_than_or_equal',
    'less_than_or_equal',
    'is_empty',
    'is_not_empty',
    'between',
    'not_between',
    'in',
    'not_in',
  ],
  DATE: [
    'equals',
    'not_equals',
    'greater_than',
    'less_than',
    'greater_than_or_equal',
    'less_than_or_equal',
    'is_empty',
    'is_not_empty',
    'between',
    'not_between',
  ],
  BOOLEAN: ['equals', 'not_equals', 'is_empty', 'is_not_empty'],
  ARRAY: ['contains', 'not_contains', 'is_empty', 'is_not_empty', 'in', 'not_in'],
};

// Define field types for validation
const FIELD_TYPES = {
  // Lead fields
  contact_name: 'STRING',
  email_from: 'STRING',
  phone: 'STRING',
  notes: 'STRING',
  tags: 'ARRAY',
  status: 'STRING',
  stage: 'STRING',
  use_status: 'STRING',
  expected_revenue: 'NUMBER',
  lead_date: 'DATE',
  createdAt: 'DATE',
  updatedAt: 'DATE',
  active: 'BOOLEAN',
  duplicate_status: 'NUMBER',
  lead_source_no: 'STRING',
  system_id: 'STRING',
  nametitle: 'STRING',
  leadPrice: 'NUMBER',
  assigned_date: 'DATE',
  source_month: 'DATE',
  prev_month: 'DATE',
  current_month: 'DATE',
  checked: 'BOOLEAN',
  reclamation_status: 'STRING',

  // Project fields
  project: 'STRING',
  project_name: 'STRING',
  project_id: 'STRING',

  // Agent fields
  agent: 'STRING',
  agent_name: 'STRING',
  agent_id: 'STRING',
  assigned_agent_name: 'STRING',

  // Source fields
  source: 'STRING',
  source_name: 'STRING',
  source_id: 'STRING',

  // Bank fields
  bank_name: 'STRING',
  bank_id: 'STRING',

  // Custom fields
  'custom_fields.bank_name': 'STRING',
  'custom_fields.property_address': 'STRING',

  // Offer fields
  investment_volume: 'NUMBER',
  interest_rate: 'NUMBER',

  // Todo fields
  has_todo: 'BOOLEAN',
  has_extra_todo: 'BOOLEAN',
  has_assigned_todo: 'BOOLEAN',
  todo_status: 'STRING',

  // Entity relationship fields
  has_offer: 'BOOLEAN',
  has_opening: 'BOOLEAN',
  has_confirmation: 'BOOLEAN',
  has_payment: 'BOOLEAN',
  is_favourite: 'BOOLEAN',

  // Entity status fields
  offer_status: 'STRING',
  opening_status: 'STRING',
  confirmation_status: 'STRING',
  payment_status: 'STRING',

  // State fields
  state: 'STRING',

  // Settings fields
  bonus_amount: 'STRING',
  payment_terms: 'STRING',

  // Partner fields
  partner_id: 'STRING',
};

// Operators that don't require a value
const VALUE_OPTIONAL_OPERATORS = ['is_empty', 'is_not_empty'];

// Operators that require array values
const ARRAY_VALUE_OPERATORS = ['in', 'not_in'];

// Operators that require two values (for between operations)
const DUAL_VALUE_OPERATORS = ['between', 'not_between'];

/**
 * Validate a single filter rule
 * @param {Object} filter - The filter rule to validate
 * @param {number} index - The index of the filter in the array
 * @returns {Array} - Array of validation errors
 */
const validateSingleFilter = (filter, index) => {
  const errors = [];

  if (!filter || typeof filter !== 'object') {
    errors.push(`Filter at index ${index} must be an object`);
    return errors;
  }

  // Validate field
  if (!filter.field || typeof filter.field !== 'string') {
    errors.push(`Filter at index ${index} must have a valid field name`);
  } else if (!FIELD_TYPES[filter.field]) {
    errors.push(`Filter at index ${index} has unknown field: ${filter.field}`);
  }

  // Validate operator
  if (!filter.operator || typeof filter.operator !== 'string') {
    errors.push(`Filter at index ${index} must have a valid operator`);
  } else {
    const fieldType = FIELD_TYPES[filter.field];
    const validOperators = OPERATORS[fieldType] || [];

    if (!validOperators.includes(filter.operator)) {
      errors.push(
        `Filter at index ${index} has invalid operator '${filter.operator}' for field type '${fieldType}'`
      );
    }
  }

  // Validate value based on operator
  if (filter.operator && !VALUE_OPTIONAL_OPERATORS.includes(filter.operator)) {
    if (filter.value === undefined || filter.value === null) {
      errors.push(`Filter at index ${index} with operator '${filter.operator}' requires a value`);
    } else {
      // Validate value type based on field type
      const fieldType = FIELD_TYPES[filter.field];
      const value = filter.value;

      if (DUAL_VALUE_OPERATORS.includes(filter.operator)) {
        if (!Array.isArray(value) || value.length !== 2) {
          errors.push(
            `Filter at index ${index} with operator '${filter.operator}' requires exactly 2 values`
          );
        }
      } else if (ARRAY_VALUE_OPERATORS.includes(filter.operator)) {
        if (!Array.isArray(value)) {
          errors.push(
            `Filter at index ${index} with operator '${filter.operator}' requires an array of values`
          );
        }
      } else {
        // Validate single value type
        if (fieldType === 'NUMBER' && isNaN(Number(value))) {
          errors.push(
            `Filter at index ${index} requires a numeric value for field '${filter.field}'`
          );
        } else if (fieldType === 'BOOLEAN' && typeof value !== 'boolean') {
          errors.push(
            `Filter at index ${index} requires a boolean value for field '${filter.field}'`
          );
        } else if (fieldType === 'DATE' && isNaN(Date.parse(value))) {
          errors.push(`Filter at index ${index} requires a valid date for field '${filter.field}'`);
        }
      }
    }
  }

  return errors;
};

/**
 * Validate filter rules array
 * @param {Array} filters - Array of filter rules
 * @returns {Array} - Array of validation errors
 */
const validateFilterRules = (filters) => {
  const errors = [];

  if (!Array.isArray(filters)) {
    errors.push('Filters must be an array');
    return errors;
  }

  // Note: Empty array is now allowed after sanitization removes filters without values
  // The controller will handle empty filter arrays appropriately

  if (filters.length > 20) {
    errors.push('Maximum 20 filter rules allowed');
  }

  filters.forEach((filter, index) => {
    const filterErrors = validateSingleFilter(filter, index);
    errors.push(...filterErrors);
  });

  return errors;
};

/**
 * Express validator middleware for filter rules
 */
const filterRulesValidator = [
  body('filters').custom((filters) => {
    const errors = validateFilterRules(filters);
    if (errors.length > 0) {
      throw new Error(errors.join('; '));
    }
    return true;
  }),
  body('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  body('limit')
    .optional()
    .isInt({ min: 1 })
    .default(50)
    .withMessage('Limit must be a positive integer'),
];

/**
 * Middleware to handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Filter validation failed', {
      errors: errors.array(),
      body: req.body,
      user: req.user?._id,
    });

    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: errors.array(),
    });
  }
  next();
};

/**
 * Map short operator aliases to full operator names
 */
const OPERATOR_ALIASES = {
  '=': 'equals',
  '!=': 'not_equals',
  '>': 'greater_than',
  '<': 'less_than',
  '>=': 'greater_than_or_equal',
  '<=': 'less_than_or_equal',
  '==': 'equals',
  '!==': 'not_equals',
};

/**
 * Normalize operator to full name if it's an alias
 */
const normalizeOperator = (operator) => {
  if (!operator) return operator;
  const trimmed = String(operator).trim();
  return OPERATOR_ALIASES[trimmed] || trimmed;
};

/**
 * Sanitize filter rules to prevent injection attacks
 */
const sanitizeFilters = (req, res, next) => {
  if (req.body.filters && Array.isArray(req.body.filters)) {
    req.body.filters = req.body.filters
      .map((filter) => {
        const operator = String(filter.operator || '').trim();
        return {
          field: String(filter.field || '').trim(),
          operator: normalizeOperator(operator),
          value: filter.value,
          // Remove any additional properties that might be injected
        };
      })
      .filter((filter) => {
        // Keep filters that:
        // 1. Have a value, OR
        // 2. Use operators that don't require a value (is_empty, is_not_empty)
        const hasValue = filter.value !== undefined && filter.value !== null && filter.value !== '';
        const isValueOptionalOperator = VALUE_OPTIONAL_OPERATORS.includes(filter.operator);

        return hasValue || isValueOptionalOperator;
      });
  }
  next();
};

/**
 * Log filter requests for monitoring
 */
const logFilterRequest = (req, res, next) => {
  const { filters, page, limit } = req.body;
  const user = req.user;

  logger.info('Dynamic filter request', {
    userId: user?._id,
    userRole: user?.role,
    filtersCount: filters?.length || 0,
    page,
    limit,
    filters: filters?.map((f) => ({
      field: f.field,
      operator: f.operator,
      hasValue: f.value !== undefined && f.value !== null,
    })),
  });

  next();
};

module.exports = {
  validateFilterRules,
  validateSingleFilter,
  filterRulesValidator,
  handleValidationErrors,
  sanitizeFilters,
  logFilterRequest,
  OPERATORS,
  FIELD_TYPES,
  VALUE_OPTIONAL_OPERATORS,
  ARRAY_VALUE_OPERATORS,
  DUAL_VALUE_OPERATORS,
};
