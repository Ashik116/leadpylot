/**
 * Dynamic Filters Routes
 *
 * This module provides comprehensive filtering capabilities for leads and related entities
 * through a flexible, rule-based filtering system. It supports complex queries with
 * multiple sequential filters, advanced operators, and role-based access control.
 *
 * @module routes/dynamicFilters
 * @author LeadPylot System
 * @version 1.0.0
 * @since 2024
 */

const express = require('express');
const { body } = require('express-validator');
const { authenticate } = require('../middleware');
const { authorizeAny } = require('../middleware/authorize');
const { PERMISSIONS } = require('../middleware/roles/permissions');
const {
  applyDynamicFilters,
  getFilterOptions,
  validateFilters,
} = require('../controllers/dynamicFilterController');
const {
  filterRulesValidator,
  handleValidationErrors,
  sanitizeFilters,
  logFilterRequest,
} = require('../middleware/filterValidation');

const router = express.Router();

/**
 * @route POST /dynamic-filters/apply
 * @desc Apply dynamic filters to leads with advanced query capabilities
 * @access Private - Admin: all leads, Agent: only assigned leads
 *
 * @body {Array} filters - Array of filter rule objects
 * @body {number} [page=1] - Page number for pagination (minimum: 1)
 * @body {number} [limit=50] - Items per page (minimum: 1, maximum: 1000)
 * @body {string} [sortBy='createdAt'] - Field to sort by
 * @body {string} [sortOrder='desc'] - Sort order ('asc' or 'desc')
 *
 * @body {Object} filters[].field - Field name to filter on
 * @body {string} filters[].operator - Filter operator (equals, contains, greater_than, etc.)
 * @body {*} filters[].value - Filter value (string, number, boolean, array, or date)
 *
 * @returns {Object} Response object with filtered data and metadata
 * @returns {Array} data - Array of filtered lead objects
 * @returns {Object} meta - Pagination and filter metadata
 * @returns {Array} appliedFilters - Array of successfully applied filter rules
 * @returns {number} totalFiltered - Total count of leads matching all filters
 *
 * @example
 * POST /dynamic-filters/apply
 * {
 *   "filters": [
 *     { "field": "status", "operator": "equals", "value": "active" },
 *     { "field": "expected_revenue", "operator": "greater_than", "value": 10000 }
 *   ],
 *   "page": 1,
 *   "limit": 25,
 *   "sortBy": "expected_revenue",
 *   "sortOrder": "desc"
 * }
 *
 * @error 400 - Invalid filter rules or parameters
 * @error 401 - Unauthorized access
 * @error 403 - Insufficient permissions
 * @error 500 - Internal server error
 */
router.post(
  '/apply',
  authenticate,
  authorizeAny([PERMISSIONS.LEAD_READ_ASSIGNED, PERMISSIONS.LEAD_READ_ALL]),
  sanitizeFilters,
  ...filterRulesValidator,
  handleValidationErrors,
  logFilterRequest,
  applyDynamicFilters
);

/**
 * @route GET /dynamic-filters/options
 * @desc Get available filter fields, operators, and configuration
 * @access Private - All authenticated users
 *
 * @returns {Object} Response object with available filter options
 * @returns {Object} data - Filter configuration and available options
 * @returns {Object} data.fields - Available filter fields with types and operators
 * @returns {Array} data.operators - Available filter operators
 * @returns {Object} data.validation - Field validation rules and constraints
 * @returns {Array} data.examples - Example filter configurations
 *
 * @example
 * GET /dynamic-filters/options
 *
 * Response:
 * {
 *   "status": "success",
 *   "data": {
 *     "fields": {
 *       "contact_name": {
 *         "type": "string",
 *         "operators": ["equals", "contains", "starts_with"],
 *         "description": "Lead contact name"
 *       }
 *     },
 *     "operators": ["equals", "not_equals", "contains"],
 *     "examples": [
 *       { "field": "status", "operator": "equals", "value": "active" }
 *     ]
 *   }
 * }
 *
 * @error 401 - Unauthorized access
 * @error 500 - Internal server error
 */
router.get('/options', authenticate, authorizeAny(['lead:read:assigned', 'lead:read:all']), getFilterOptions);

/**
 * @route POST /dynamic-filters/validate
 * @desc Validate filter rules without executing them
 * @access Private - All authenticated users
 *
 * @body {Array} filters - Array of filter rule objects to validate
 * @body {Object} filters[].field - Field name to validate
 * @body {string} filters[].operator - Operator to validate
 * @body {*} filters[].value - Value to validate
 *
 * @returns {Object} Response object with validation results
 * @returns {Array} data - Array of validation results for each filter
 * @returns {number} data[].index - Index of the filter in the input array
 * @returns {string} data[].field - Field name that was validated
 * @returns {string} data[].operator - Operator that was validated
 * @returns {boolean} data[].valid - Whether the filter rule is valid
 * @returns {string|null} data[].error - Error message if validation failed
 *
 * @example
 * POST /dynamic-filters/validate
 * {
 *   "filters": [
 *     { "field": "invalid_field", "operator": "equals", "value": "test" },
 *     { "field": "status", "operator": "invalid_operator", "value": "active" }
 *   ]
 * }
 *
 * Response:
 * {
 *   "status": "success",
 *   "data": [
 *     {
 *       "index": 0,
 *       "field": "invalid_field",
 *       "operator": "equals",
 *       "valid": false,
 *       "error": "Field 'invalid_field' is not supported"
 *     },
 *     {
 *       "index": 1,
 *       "field": "status",
 *       "operator": "invalid_operator",
 *       "valid": false,
 *       "error": "Operator 'invalid_operator' is not supported for field 'status'"
 *     }
 *   ]
 * }
 *
 * @error 400 - Invalid request format
 * @error 401 - Unauthorized access
 * @error 500 - Internal server error
 */
router.post(
  '/validate',
  authenticate,
  authorizeAny([PERMISSIONS.LEAD_READ_ASSIGNED, PERMISSIONS.LEAD_READ_ALL]),
  body('filters')
    .isArray({ min: 1 })
    .withMessage('Filters must be an array with at least one filter rule'),
  handleValidationErrors,
  validateFilters
);

/**
 * @route GET /dynamic-filters/health
 * @desc Check the health and status of the dynamic filter system
 * @access Private - All authenticated users
 *
 * @returns {Object} Response object with system health information
 * @returns {string} status - System status ('healthy', 'degraded', or 'unhealthy')
 * @returns {Object} data - Health check details
 * @returns {string} data.version - Current API version
 * @returns {string} data.timestamp - Current server timestamp
 * @returns {Object} data.capabilities - Available filter capabilities
 * @returns {number} data.maxFilters - Maximum number of filters per request
 * @returns {number} data.maxComplexity - Maximum filter complexity level
 *
 * @example
 * GET /dynamic-filters/health
 *
 * Response:
 * {
 *   "status": "success",
 *   "data": {
 *     "status": "healthy",
 *     "version": "1.0.0",
 *     "timestamp": "2024-01-15T10:30:00Z",
 *     "capabilities": {
 *       "maxFilters": 50,
 *       "maxComplexity": 10,
 *       "supportedTypes": ["string", "number", "boolean", "date", "array"]
 *     }
 *   }
 * }
 *
 * @error 401 - Unauthorized access
 * @error 500 - Internal server error
 */
router.get('/health', authenticate, authorizeAny(['lead:read:assigned', 'lead:read:all']), (req, res) => {
  try {
    const healthInfo = {
      status: 'healthy',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      capabilities: {
        maxFilters: 50,
        maxComplexity: 10,
        supportedTypes: ['string', 'number', 'boolean', 'date', 'array'],
        supportedOperators: [
          'equals',
          'not_equals',
          'contains',
          'not_contains',
          'starts_with',
          'ends_with',
          'greater_than',
          'less_than',
          'greater_than_or_equal',
          'less_than_or_equal',
          'in',
          'not_in',
          'is_empty',
          'is_not_empty',
          'between',
          'not_between',
        ],
        maxPageSize: 1000,
        maxPageNumber: 10000,
      },
    };

    res.json({
      status: 'success',
      data: healthInfo,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

/**
 * @route GET /dynamic-filters/examples
 * @desc Get example filter configurations for common use cases
 * @access Private - All authenticated users
 *
 * @returns {Object} Response object with example filter configurations
 * @returns {Array} data - Array of example filter configurations
 * @returns {string} data[].name - Name/description of the example
 * @returns {string} data[].category - Category of the example (basic, advanced, business)
 * @returns {Array} data[].filters - Example filter rules
 * @returns {string} data[].description - Detailed description of the example
 *
 * @example
 * GET /dynamic-filters/examples
 *
 * Response:
 * {
 *   "status": "success",
 *   "data": [
 *     {
 *       "name": "High Value Leads",
 *       "category": "business",
 *       "description": "Find leads with expected revenue above threshold",
 *       "filters": [
 *         { "field": "expected_revenue", "operator": "greater_than", "value": 50000 }
 *       ]
 *     }
 *   ]
 * }
 *
 * @error 401 - Unauthorized access
 * @error 500 - Internal server error
 */
router.get('/examples', authenticate, authorizeAny(['lead:read:assigned', 'lead:read:all']), (req, res) => {
  try {
    const examples = [
      {
        name: 'Active High-Value Leads',
        category: 'business',
        description: 'Find active leads with expected revenue above 50,000',
        filters: [
          { field: 'active', operator: 'equals', value: true },
          { field: 'expected_revenue', operator: 'greater_than', value: 50000 },
        ],
      },
      {
        name: 'Recent Leads by Source',
        category: 'basic',
        description: 'Find leads created in the last 30 days from specific sources',
        filters: [
          {
            field: 'createdAt',
            operator: 'greater_than',
            value: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
          { field: 'source_id', operator: 'in', value: ['source1', 'source2'] },
        ],
      },
      {
        name: 'Leads with Pending Todos',
        category: 'advanced',
        description: 'Find leads that have pending todos assigned to current user',
        filters: [
          { field: 'has_extra_todo', operator: 'equals', value: true },
          { field: 'status', operator: 'not_equals', value: 'closed' },
        ],
      },
      {
        name: 'Leads by Stage and Revenue Range',
        category: 'advanced',
        description: 'Find leads in specific stages with revenue between ranges',
        filters: [
          { field: 'stage', operator: 'in', value: ['New', 'Qualified'] },
          { field: 'expected_revenue', operator: 'between', value: [10000, 100000] },
        ],
      },
    ];

    res.json({
      status: 'success',
      data: examples,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve examples',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

module.exports = router;
