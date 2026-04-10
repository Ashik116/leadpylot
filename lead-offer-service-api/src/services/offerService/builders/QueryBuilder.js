/**
 * Offer Query Builder
 * Contains static methods for building offer queries and projections
 */

const { mongoose } = require('../config/dependencies');
const { validateObjectId } = require('../utils/validators');

/**
 * Sanitize string for safe use in regex to prevent ReDoS attacks
 * @param {string} str - Input string
 * @returns {string} - Sanitized string
 */
const sanitizeRegexInput = (str) => {
  if (!str) return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

class OfferQueryBuilder {
  /**
   * Build base match conditions for offer queries
   * @param {Object} filters - Filter parameters
   * @param {Object} permissionFilter - Permission-based filters
   * @param {Function} hasPermissionFn - Permission checking function (async)
   * @param {Object} permissions - Permission constants
   * @returns {Promise<Object>} - Base match conditions
   */
  static async buildBaseMatch(filters, permissionFilter, hasPermissionFn, permissions) {
    const baseMatch = { 
      ...permissionFilter,
      active: true  // Only show active offers (soft deletion filter)
    };

    // Status filter
    if (filters.status) {
      baseMatch.status = filters.status;
    }

    // Project filter
    if (filters.project_id && validateObjectId(filters.project_id)) {
      baseMatch.project_id = new mongoose.Types.ObjectId(filters.project_id);
    }

    // Lead filter
    if (filters.lead_id && validateObjectId(filters.lead_id)) {
      baseMatch.lead_id = new mongoose.Types.ObjectId(filters.lead_id);
    }

    // Agent filter
    // - Admin can filter by any agent_id (has OFFER_READ_ALL)
    // - Agent must be filtered by their own agent_id (has OFFER_READ_OWN only)
    if (filters.agent_id && validateObjectId(filters.agent_id)) {
      const canReadAll = await hasPermissionFn(filters.user?.role, permissions.OFFER_READ_ALL);
      const canReadOwn = await hasPermissionFn(filters.user?.role, permissions.OFFER_READ_OWN);
      
      if (canReadAll) {
        // Admin can filter by any agent
        baseMatch.agent_id = new mongoose.Types.ObjectId(filters.agent_id);
      } else if (canReadOwn) {
        // Agent can only see their own offers - enforce their own agent_id
        baseMatch.agent_id = new mongoose.Types.ObjectId(filters.agent_id);
      }
    }

    return baseMatch;
  }

  /**
   * Get standard projection for offer queries
   * @returns {Object} - Standard projection object
   */
  static getStandardProjection() {
    return {
      _id: 1,
      title: 1,
      nametitle: 1,
      project_id: 1,
      lead_id: 1,
      agent_id: 1,
      bank_id: 1,
      investment_volume: 1,
      interest_rate: 1,
      payment_terms: 1,
      bonus_amount: 1,
      files: 1,
      status: 1,
      offerType: 1,
      created_at: 1,
      updated_at: 1,
      createdAt: 1,
      updatedAt: 1,
    };
  }

  /**
   * Get progress projection for offer queries with progress data
   * @returns {Object} - Progress projection object
   */
  static getProgressProjection() {
    return {
      _id: 1,
      title: 1,
      project_id: 1,
      lead_id: 1,
      agent_id: 1,
      investment_volume: 1,
      interest_rate: 1,
      status: 1,
      offerType: 1,
      createdAt: 1,
      updatedAt: 1,
      has_opening: 1,
      has_confirmation: 1,
      has_payment_voucher: 1,
      has_netto1: 1,
      has_netto2: 1,
      current_stage: 1,
      opening_count: 1,
      confirmation_count: 1,
      payment_voucher_count: 1,
      netto1_count: 1,
      netto2_count: 1,
    };
  }

  /**
   * Build search criteria for offer queries
   * Searches across offer title and reference number
   * Note: For searching related documents (lead name, project, etc.), 
   * use aggregation pipeline with $lookup instead
   * @param {string} search - Search term
   * @returns {Object} - MongoDB query object with $or conditions
   */
  static buildSearchCriteria(search) {
    if (!search || !search.trim()) {
      return {};
    }

    const sanitizedSearch = sanitizeRegexInput(search.trim());
    const searchRegex = { $regex: sanitizedSearch, $options: 'i' };

    return {
      $or: [
        { title: searchRegex },
        { nametitle: searchRegex },
        { reference_no: searchRegex },
      ],
    };
  }
}

module.exports = OfferQueryBuilder; 