/**
 * Dynamic Filter Controller
 *
 * This controller handles dynamic filtering operations for leads and related entities.
 * It provides comprehensive filtering capabilities with advanced query operators,
 * role-based access control, and extensive validation.
 *
 * @module controllers/dynamicFilterController
 * @author LeadPylot System
 * @version 1.0.0
 * @since 2024
 */

const {
  executeDynamicFilter,
  getAvailableFilters,
  validateFilterRule,
} = require('../services/dynamicFilterService');
const { hasPermission } = require('../middleware');
const { PERMISSIONS } = require('../middleware/roles/permissions');
const logger = require('../utils/logger');

/**
 * Apply dynamic filters to leads with advanced query capabilities
 *
 * This endpoint allows users to apply complex, multi-rule filters to leads.
 * Filters are applied sequentially using AND logic, and results are paginated.
 * The system automatically handles user permissions and role-based access control.
 *
 * @async
 * @function applyDynamicFilters
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {Array} req.body.filters - Array of filter rule objects
 * @param {number} [req.body.page=1] - Page number for pagination (minimum: 1)
 * @param {number} [req.body.limit=50] - Items per page (minimum: 1, maximum: 1000)
 * @param {string} [req.body.sortBy='createdAt'] - Field to sort by
 * @param {string} [req.body.sortOrder='desc'] - Sort order ('asc' or 'desc')
 * @param {Object} req.user - Authenticated user object
 * @param {Object} res - Express response object
 *
 * @returns {Object} JSON response with filtered data and metadata
 *
 * @example
 * // Request body example
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
 * @throws {400} Bad Request - Invalid filter rules or parameters
 * @throws {401} Unauthorized - User not authenticated
 * @throws {403} Forbidden - Insufficient permissions
 * @throws {500} Internal Server Error - Server-side error
 */
const applyDynamicFilters = async (req, res) => {
  const startTime = Date.now();

  try {
    const { filters, page = 1, limit = 50, sortBy, sortOrder } = req.body;
    const user = req.user;

    // Enhanced validation with detailed error messages
    if (!filters || !Array.isArray(filters)) {
      return res.status(400).json({
        status: 'error',
        message: 'Filters array is required and must be an array',
        code: 'MISSING_FILTERS',
        details: {
          received: typeof filters,
          expected: 'array',
        },
      });
    }

    // Validate pagination parameters
    const validatedPage = Math.max(1, parseInt(page) || 1);
    const validatedLimit = Math.min(1000, Math.max(1, parseInt(limit) || 50));

    // Check permissions with detailed logging
    const canReadAllLeads = await hasPermission(user.role, PERMISSIONS.LEAD_READ_ALL);

    // After sanitization, if all filters were removed (no values), return empty result
    if (filters.length === 0) {
      logger.info('No valid filters provided after sanitization', {
        userId: user._id,
        userRole: user.role,
      });

      return res.json({
        status: 'success',
        data: [],
        meta: {
          pagination: {
            total: 0,
            page: validatedPage,
            limit: validatedLimit,
            totalPages: 0,
            hasNextPage: false,
            hasPrevPage: false,
            currentPageSize: 0,
          },
          filters: {
            applied: 0,
            count: 0,
            totalFiltered: 0,
          },
          performance: {
            executionTime: 0,
            performanceLevel: 'fast',
          },
          user: {
            role: user.role,
            permissions: {
              canReadAllLeads,
              canReadAssignedLeads: await hasPermission(user.role, PERMISSIONS.LEAD_READ_ASSIGNED),
            },
          },
          message: 'No valid filters with values provided',
        },
        appliedFilters: [],
        totalFiltered: 0,
        executionTime: 0,
      });
    }

    logger.info('Dynamic filter request initiated', {
      userId: user._id,
      userRole: user.role,
      filterCount: filters.length,
      page: validatedPage,
      limit: validatedLimit,
      sortBy,
      sortOrder,
      canReadAllLeads,
      timestamp: new Date().toISOString(),
    });

    // Apply filters using the service
    const result = await executeDynamicFilter(filters, user, {
      page: validatedPage,
      limit: validatedLimit,
      sortBy,
      sortOrder,
      canReadAllLeads,
    });

    const executionTime = Date.now() - startTime;

    // Enhanced response with comprehensive metadata
    const response = {
      status: 'success',
      data: result.data,
      meta: {
        pagination: {
          total: result.pagination.total,
          page: result.pagination.page,
          limit: result.pagination.limit,
          totalPages: result.pagination.pages,
          hasNextPage: result.pagination.page < result.pagination.pages,
          hasPrevPage: result.pagination.page > 1,
          currentPageSize: result.data.length,
        },
        filters: {
          applied: result.appliedRules,
          count: filters.length,
          totalFiltered: result.totalFiltered,
        },
        performance: {
          executionTime,
          performanceLevel:
            executionTime < 500 ? 'fast' : executionTime < 2000 ? 'moderate' : 'slow',
        },
        user: {
          role: user.role,
          permissions: {
            canReadAllLeads,
            canReadAssignedLeads: await hasPermission(user.role, PERMISSIONS.LEAD_READ_ASSIGNED),
          },
        },
      },
      appliedFilters: result.appliedRules,
      totalFiltered: result.totalFiltered,
      executionTime,
    };

    // Log successful execution
    logger.info('Dynamic filter request completed successfully', {
      userId: user._id,
      filterCount: filters.length,
      resultCount: result.data.length,
      totalFiltered: result.totalFiltered,
      executionTime,
      performanceLevel: response.meta.performance.performanceLevel,
    });

    res.json(response);
  } catch (error) {
    const executionTime = Date.now() - startTime;

    logger.error('Dynamic filter error occurred', {
      userId: req.user?._id,
      userRole: req.user?.role,
      error: error.message,
      stack: error.stack,
      executionTime,
      timestamp: new Date().toISOString(),
    });

    // Enhanced error response with more context
    const errorResponse = {
      status: 'error',
      message: 'Error applying dynamic filters',
      code: 'FILTER_EXECUTION_ERROR',
      timestamp: new Date().toISOString(),
      executionTime,
    };

    // Include error details in development mode
    if (process.env.NODE_ENV === 'development') {
      errorResponse.error = {
        message: error.message,
        stack: error.stack,
        name: error.name,
      };
    }

    res.status(500).json(errorResponse);
  }
};

/**
 * Get available filter fields, operators, and configuration
 *
 * This endpoint provides comprehensive information about available filter options,
 * including field types, supported operators, validation rules, and examples.
 * The response is tailored based on user permissions and role.
 *
 * @async
 * @function getFilterOptions
 * @param {Object} req - Express request object
 * @param {Object} req.user - Authenticated user object
 * @param {Object} res - Express response object
 *
 * @returns {Object} JSON response with available filter options
 *
 * @throws {401} Unauthorized - User not authenticated
 * @throws {500} Internal Server Error - Server-side error
 */
const getFilterOptions = async (req, res) => {
  try {
    const user = req.user;
    const canReadAllLeads = await hasPermission(user.role, PERMISSIONS.LEAD_READ_ALL);
    const canReadAssignedLeads = await hasPermission(user.role, PERMISSIONS.LEAD_READ_ASSIGNED);

    logger.info('Filter options request', {
      userId: user._id,
      userRole: user.role,
      canReadAllLeads,
      canReadAssignedLeads,
      timestamp: new Date().toISOString(),
    });

    const options = await getAvailableFilters(user, canReadAllLeads);

    // Enhance response with user-specific information
    const response = {
      status: 'success',
      data: {
        ...options,
        userCapabilities: {
          role: user.role,
          permissions: {
            canReadAllLeads,
            canReadAssignedLeads,
          },
          maxFilters: 50,
          maxComplexity: 10,
        },
        metadata: {
          lastUpdated: new Date().toISOString(),
          version: '1.0.0',
          totalFields: Object.keys(options.fields || {}).length,
          totalOperators: (options.operators || []).length,
        },
      },
    };

    res.json(response);
  } catch (error) {
    logger.error('Get filter options error', {
      userId: req.user?._id,
      userRole: req.user?.role,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

    res.status(500).json({
      status: 'error',
      message: 'Error retrieving filter options',
      code: 'OPTIONS_RETRIEVAL_ERROR',
      timestamp: new Date().toISOString(),
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Validate filter rules without executing them
 *
 * This endpoint allows users to validate filter configurations before applying them.
 * It checks field validity, operator compatibility, and value format without
 * executing the actual database queries.
 *
 * @async
 * @function validateFilters
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {Array} req.body.filters - Array of filter rule objects to validate
 * @param {Object} res - Express response object
 *
 * @returns {Object} JSON response with validation results for each filter
 *
 * @throws {400} Bad Request - Invalid request format
 * @throws {401} Unauthorized - User not authenticated
 * @throws {500} Internal Server Error - Server-side error
 */
const validateFilters = async (req, res) => {
  try {
    const { filters } = req.body;

    logger.info('Filter validation request', {
      filterCount: filters.length,
      timestamp: new Date().toISOString(),
    });

    // Enhanced validation with detailed results
    const validation = filters.map((filter, index) => {
      const result = validateFilterRule(filter);

      return {
        index,
        field: filter.field,
        operator: filter.operator,
        value: filter.value,
        valid: result.valid,
        error: result.error || null,
        suggestions: result.suggestions || null,
        fieldType: result.fieldType || null,
        supportedOperators: result.supportedOperators || null,
      };
    });

    // Calculate validation summary
    const validCount = validation.filter((v) => v.valid).length;
    const invalidCount = validation.filter((v) => !v.valid).length;

    const response = {
      status: 'success',
      data: validation,
      summary: {
        total: filters.length,
        valid: validCount,
        invalid: invalidCount,
        successRate: Math.round((validCount / filters.length) * 100),
      },
      metadata: {
        timestamp: new Date().toISOString(),
        validationVersion: '1.0.0',
      },
    };

    // Log validation results
    logger.info('Filter validation completed', {
      totalFilters: filters.length,
      validCount,
      invalidCount,
      successRate: response.summary.successRate,
      timestamp: new Date().toISOString(),
    });

    res.json(response);
  } catch (error) {
    logger.error('Filter validation error', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

    res.status(500).json({
      status: 'error',
      message: 'Error validating filters',
      code: 'VALIDATION_ERROR',
      timestamp: new Date().toISOString(),
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

module.exports = {
  applyDynamicFilters,
  getFilterOptions,
  validateFilters,
};
