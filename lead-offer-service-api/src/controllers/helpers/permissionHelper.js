const { AuthorizationError } = require('../../utils/errorHandler');

/**
 * Check if user has permission to read offers
 * @param {Object} user - User object
 * @param {Function} hasPermission - Permission checking function (async)
 * @param {Object} PERMISSIONS - Permissions constants
 * @returns {Promise<Object>} - { canReadAll, canReadOwn }
 */
const checkReadPermission = async (user, hasPermission, PERMISSIONS) => {
  const canReadAll = await hasPermission(user.role, PERMISSIONS.OFFER_READ_ALL);
  const canReadOwn = await hasPermission(user.role, PERMISSIONS.OFFER_READ_OWN);

  if (!canReadAll && !canReadOwn) {
    throw new AuthorizationError("You don't have permission to view offers");
  }

  return { canReadAll, canReadOwn };
};

/**
 * Check if user has permission to update offers
 * @param {Object} user - User object
 * @param {Function} hasPermission - Permission checking function (async)
 * @param {Object} PERMISSIONS - Permissions constants
 * @returns {Promise<Object>} - { canUpdateAll, canUpdateOwn }
 */
const checkUpdatePermission = async (user, hasPermission, PERMISSIONS) => {
  const canUpdateAll = await hasPermission(user.role, PERMISSIONS.OFFER_UPDATE_ALL);
  const canUpdateOwn = await hasPermission(user.role, PERMISSIONS.OFFER_UPDATE_OWN);

  if (!canUpdateAll && !canUpdateOwn) {
    throw new AuthorizationError("You don't have permission to update offers");
  }

  return { canUpdateAll, canUpdateOwn };
};

/**
 * Apply agent filter if user can only access own offers
 * @param {Object} options - Query options
 * @param {Object} user - User object
 * @param {Boolean} canAccessAll - Whether user can access all offers
 * @returns {Object} - Modified options with agent_id filter if needed
 */
const applyAgentFilter = (options, user, canAccessAll) => {
  if (!canAccessAll) {
    return {
      ...options,
      agent_id: user._id,
    };
  }
  return options;
};

/**
 * Validate user access to specific offer (for users who can only access own offers)
 * @param {String} offerId - Offer ID
 * @param {Object} user - User object
 * @param {Boolean} canAccessAll - Whether user can access all offers
 * @param {Function} getOfferById - Service function to get offer
 * @param {Function} hasPermission - Permission checking function
 * @param {Object} PERMISSIONS - Permissions constants
 */
const validateOfferAccess = async (
  offerId,
  user,
  canAccessAll,
  getOfferById,
  hasPermission,
  PERMISSIONS
) => {
  if (!canAccessAll) {
    // This will throw if the user isn't allowed to access this offer
    await getOfferById(offerId, user, hasPermission, PERMISSIONS);
  }
};

/**
 * Parse pagination options from query
 * @param {Object} query - Request query object
 * @returns {Object} - Parsed pagination options
 */
const parsePaginationOptions = (query) => {
  return {
    page: parseInt(query.page) || 1,
    limit: parseInt(query.limit) || 20,
  };
};

/**
 * Build filter options from query parameters
 * @param {Object} query - Request query object
 * @param {Object} defaults - Default values for options
 * @returns {Object} - Filter options
 */
const buildFilterOptions = (query, defaults = {}) => {
  return {
    page: parseInt(query.page) || defaults.page || 1,
    limit: parseInt(query.limit) || defaults.limit || 20,
    search: query.search || defaults.search || null,
    status: query.status || defaults.status || null,
    project_id: query.project_id || defaults.project_id || null,
    lead_id: query.lead_id || defaults.lead_id || null,
    agent_id: query.agent_id || defaults.agent_id || null,
    stage: query.stage || defaults.stage || null,
    has_progress: query.has_progress || defaults.has_progress || null,
    sortBy: query.sortBy || defaults.sortBy || null,
    sortOrder: query.sortOrder || defaults.sortOrder || null,
  };
};

module.exports = {
  checkReadPermission,
  checkUpdatePermission,
  applyAgentFilter,
  validateOfferAccess,
  parsePaginationOptions,
  buildFilterOptions,
};

