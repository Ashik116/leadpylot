/**
 * Offer Service Query Utilities
 * Contains query normalization, sorting, and pagination utilities
 */

const { logger } = require('../config/dependencies');
const { ALLOWED_SORT_FIELDS, MAX_LIMIT, DEFAULT_PAGINATION } = require('../config/constants');

/**
 * Parse and validate sort parameters for offers
 * @param {string} sortBy - Field to sort by
 * @param {string} sortOrder - Order to sort (asc or desc)
 * @returns {Object} - MongoDB sort object
 */
const parseSortParameters = (sortBy = 'updatedAt', sortOrder = 'desc') => {
  // Validate sort field  
  const sortField = ALLOWED_SORT_FIELDS[sortBy] || 'updatedAt';

  // Validate sort order
  const order = sortOrder && sortOrder.toLowerCase() === 'asc' ? 1 : -1;

  const sortObject = {};
  sortObject[sortField] = order;

  logger.info(
    `Applying offer sort: ${sortBy} -> ${sortField} ${order === 1 ? 'ascending' : 'descending'}`
  );
  logger.debug(`Sort object: ${JSON.stringify(sortObject)}`);

  // Special debugging for interestMonth
  if (sortBy === 'interestMonth') {
    logger.info(`InterestMonth sorting detected: sortBy=${sortBy}, sortOrder=${sortOrder}`);
    logger.info(`Field path: ${sortField}`);
  }

  return sortObject;
};

/**
 * Normalize query parameters
 * @param {Object} query - Raw query parameters
 * @returns {Object} - Normalized query parameters
 */
const normalizeQuery = (query = {}) => {
  const {
    page = DEFAULT_PAGINATION.page,
    limit = DEFAULT_PAGINATION.limit,
    ...filters
  } = query;

  const parsedPage = Math.max(1, parseInt(page) || DEFAULT_PAGINATION.page);

  const requestedLimit = parseInt(limit);
  const hasAllGroupedProgress = (filters.has_progress || '').toString().toLowerCase() === 'all_grouped';

  let parsedLimit;
  if (hasAllGroupedProgress) {
    // 'all_grouped' uses a large limit for multi-table view
    parsedLimit = Math.max(1, requestedLimit || 999999);
  } else {
    // All other types (including 'all') use standard pagination
    parsedLimit = Math.min(
      MAX_LIMIT,
      Math.max(1, requestedLimit || DEFAULT_PAGINATION.limit)
    );
  }

  return {
    page: parsedPage,
    limit: parsedLimit,
    ...filters,
  };
};

/**
 * Get pagination metadata
 * @param {number} total - Total number of records
 * @param {number} page - Current page number
 * @param {number} limit - Records per page
 * @returns {Object} - Pagination metadata
 */
const getPaginationMeta = (total, page, limit) => ({
  total,
  page: parseInt(page),
  limit: parseInt(limit),
  pages: Math.ceil(total / parseInt(limit)),
});

module.exports = {
  parseSortParameters,
  normalizeQuery,
  getPaginationMeta,
};
