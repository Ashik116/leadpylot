const { globalSearch } = require('../services/searchService');
const logger = require('../utils/logger');

/**
 * Perform a global search across multiple collections
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @return {Object} JSON response with search results
 */
const performGlobalSearch = async (req, res) => {
  try {
    const { query, limit, page, entities } = req.query;

    if (!query || query.length < 2) {
      return res.status(400).json({
        status: 'error',
        message: 'Search query must be at least 2 characters',
      });
    }

    // Build search options
    const options = {
      limit: parseInt(limit, 10) || 10, // Default to 10 results per entity
      page: parseInt(page, 10) || 1, // Default to first page
    };

    // Handle entity filtering if provided
    if (entities) {
      try {
        if (typeof entities === 'string') {
          // Handle comma-separated string format: 'leads,projects'
          options.entities = entities
            .split(',')
            .map((e) => e.trim())
            .filter((e) => e);
        } else if (Array.isArray(entities)) {
          // Handle array format (from JSON body)
          options.entities = entities.filter((e) => typeof e === 'string');
        }
      } catch (err) {
        logger.warn('Error parsing entities parameter:', err);
        // Continue with default entities
      }
    }

    // Log search request with options
    logger.info(
      `Global search: "${query}" by user ${req.user.login || req.user._id} (${req.user.role})`,
      { limit: options.limit, page: options.page, entities: options.entities || 'all' }
    );

    // Get search results from service
    const results = await globalSearch(query, req.user, options);

    // Return the simplified response directly
    return res.json(results);
  } catch (error) {
    logger.error('Search controller error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Error performing search',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

module.exports = {
  performGlobalSearch,
};

