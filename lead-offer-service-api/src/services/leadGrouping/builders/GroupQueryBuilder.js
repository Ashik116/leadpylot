/**
 * Group Query Builder
 * Builds MongoDB queries for lead grouping with filters and permissions
 */

const { AssignLeads } = require('../../../models');
const { sanitizeTodoFilters } = require('../utils/groupHelpers');
const logger = require('../../../helpers/logger');

class GroupQueryBuilder {
  constructor(user) {
    this.user = user;
    this.query = {};
  }

  /**
   * Add active filter
   * @param {Array} filters - Filter array to check for explicit active filter
   * @returns {GroupQueryBuilder} - For chaining
   */
  withActiveFilter(filters = []) {
    // Check if user is explicitly filtering by 'active' field
    const hasActiveFilter = filters.some((filter) => filter && filter.field === 'active');

    // Only add active: true if user isn't explicitly filtering by active
    if (!hasActiveFilter) {
      this.query.active = true;
    }

    return this;
  }

  /**
   * Apply user permissions (agents see only assigned leads)
   * @param {Array} filters - Optional filters array to check for has_transferred_offer
   * @returns {GroupQueryBuilder} - For chaining
   */
  async withUserPermissions(filters = []) {
    // Check if has_transferred_offer filter is present
    // When this filter is active, agents should see transferred leads they created but don't own
    const hasTransferredOfferFilter = filters.some(
      (filter) => filter && filter.field === 'has_transferred_offer' && (filter.value === true || filter.value === 'true')
    );

    // Skip user permissions when has_transferred_offer filter is present
    // (agents should see transferred leads they don't own)
    if (this.user.role !== 'Admin' && !hasTransferredOfferFilter) {
      const assignments = await AssignLeads.find({
        agent_id: this.user._id,
        status: 'active',
      }).select('lead_id');

      const assignedLeadIds = assignments.map((a) => a.lead_id);
      this.query._id = { $in: assignedLeadIds };
    }

    return this;
  }

  /**
   * Add search filter (contact_name, email, phone, partner_id)
   * @param {string} search - Search term
   * @returns {GroupQueryBuilder} - For chaining
   */
  withSearchFilter(search) {
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      const searchQuery = {
        $or: [
          { contact_name: searchRegex },
          { email_from: searchRegex },
          { phone: searchRegex },
          { lead_source_no: searchRegex },
        ],
      };

      if (this.query.$and) {
        this.query.$and.push(searchQuery);
      } else {
        this.query = { $and: [this.query, searchQuery] };
      }
    }

    return this;
  }

  /**
   * Add bulk partner IDs filter
   * @param {Array} partnerIds - Array of partner IDs
   * @returns {GroupQueryBuilder} - For chaining
   */
  withPartnerIds(partnerIds) {
    if (partnerIds && Array.isArray(partnerIds) && partnerIds.length > 0) {
      const bulkSearchQuery = {
        lead_source_no: { $in: partnerIds },
      };

      if (this.query.$and) {
        this.query.$and.push(bulkSearchQuery);
      } else {
        this.query = { $and: [this.query, bulkSearchQuery] };
      }

      logger.info('Applied bulk search by partner IDs', {
        partnerIdsCount: partnerIds.length,
      });
    }

    return this;
  }

  /**
   * Apply dynamic filters from dynamicFilterService
   * @param {Array} filters - Array of filter objects
   * @returns {GroupQueryBuilder} - For chaining
   */
  async withDynamicFilters(filters) {
    if (filters && filters.length > 0) {
      // Sanitize filters for multilevel grouping
      const sanitizedFilters = sanitizeTodoFilters(filters);

      const { applyDynamicFilters } = require('../../dynamicFilterService');
      const { query } = await applyDynamicFilters(sanitizedFilters, this.user);

      logger.info('Applied dynamic filters in GroupQueryBuilder', {
        originalFilterCount: filters.length,
        sanitizedFilterCount: sanitizedFilters.length,
        queryKeys: Object.keys(query),
        queryHasAnd: !!query.$and,
        queryAndLength: query.$and ? query.$and.length : 0,
        currentQueryKeys: Object.keys(this.query),
        currentQueryHasAnd: !!this.query.$and,
      });

      // If there's an existing query (search, partner_ids), merge it with dynamic filters
      if (Object.keys(this.query).length > 0) {
        if (this.query.$and) {
          this.query.$and.push(query);
        } else {
          this.query = { $and: [this.query, query] };
        }
      } else {
        // No existing query, just use the dynamic filter query
        this.query = query;
      }
    }

    return this;
  }

  /**
   * Build and return the final query
   * @returns {Object} - MongoDB query object
   */
  build() {
    return this.query;
  }

  /**
   * Reset the builder to start fresh
   * @returns {GroupQueryBuilder} - For chaining
   */
  reset() {
    this.query = {};
    return this;
  }
}

module.exports = GroupQueryBuilder;