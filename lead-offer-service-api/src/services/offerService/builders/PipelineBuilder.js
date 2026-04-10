/**
 * Base Pipeline Builder
 * Provides base functionality for building MongoDB aggregation pipelines
 */

const { sanitizeRegexInput } = require('../utils/validators');

class PipelineBuilder {
  constructor() {
    this.pipeline = [];
  }

  /**
   * Add match stage to pipeline
   * @param {Object} matchConditions - Conditions to match
   * @returns {PipelineBuilder} - This instance for chaining
   */
  addMatch(matchConditions) {
    if (Object.keys(matchConditions).length > 0) {
      this.pipeline.push({ $match: matchConditions });
    }
    return this;
  }

  /**
   * Add lead lookup stage to pipeline
   * @returns {PipelineBuilder} - This instance for chaining
   */
  addLeadLookup() {
    this.pipeline.push({
      $lookup: {
        from: 'leads',
        localField: 'lead_id',
        foreignField: '_id',
        as: 'lead_details',
      },
    });
    this.pipeline.push({
      $unwind: {
        path: '$lead_details',
        preserveNullAndEmptyArrays: true,
      },
    });
    return this;
  }

  /**
   * Add project lookup stage to pipeline
   * @returns {PipelineBuilder} - This instance for chaining
   */
  addProjectLookup() {
    this.pipeline.push({
      $lookup: {
        from: 'teams',
        localField: 'project_id',
        foreignField: '_id',
        as: 'project_details',
      },
    });
    this.pipeline.push({
      $unwind: {
        path: '$project_details',
        preserveNullAndEmptyArrays: true,
      },
    });
    return this;
  }

  /**
   * Add bank lookup stage to pipeline
   * @returns {PipelineBuilder} - This instance for chaining
   */
  addBankLookup() {
    this.pipeline.push({
      $lookup: {
        from: 'banks',
        localField: 'bank_id',
        foreignField: '_id',
        as: 'bank_details',
      },
    });
    this.pipeline.push({
      $unwind: {
        path: '$bank_details',
        preserveNullAndEmptyArrays: true,
      },
    });
    return this;
  }

  /**
   * Add agent lookup stage to pipeline
   * @returns {PipelineBuilder} - This instance for chaining
   */
  addAgentLookup() {
    this.pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'agent_id',
        foreignField: '_id',
        as: 'agent_details',
      },
    });
    this.pipeline.push({
      $unwind: {
        path: '$agent_details',
        preserveNullAndEmptyArrays: true,
      },
    });
    return this;
  }

  /**
   * Add payment terms lookup stage to pipeline
   * @returns {PipelineBuilder} - This instance for chaining
   */
  addPaymentTermsLookup() {
    this.pipeline.push({
      $lookup: {
        from: 'settings',
        localField: 'payment_terms',
        foreignField: '_id',
        as: 'payment_terms_details',
      },
    });
    this.pipeline.push({
      $unwind: {
        path: '$payment_terms_details',
        preserveNullAndEmptyArrays: true,
      },
    });
    return this;
  }

  /**
   * Add bonus amount lookup stage to pipeline
   * @returns {PipelineBuilder} - This instance for chaining
   */
  addBonusAmountLookup() {
    this.pipeline.push({
      $lookup: {
        from: 'settings',
        localField: 'bonus_amount',
        foreignField: '_id',
        as: 'bonus_amount_details',
      },
    });
    this.pipeline.push({
      $unwind: {
        path: '$bonus_amount_details',
        preserveNullAndEmptyArrays: true,
      },
    });
    return this;
  }

  /**
   * Add search filter stage to pipeline
   * @param {string} search - Search term
   * @returns {PipelineBuilder} - This instance for chaining
   */
  addSearchFilter(search) {
    if (search && search.trim()) {
      const sanitizedSearch = sanitizeRegexInput(search);
      const searchRegex = new RegExp(sanitizedSearch, 'i');
      this.pipeline.push({
        $match: {
          $or: [
            // Search in offer fields
            { title: { $regex: searchRegex } },
            // Search in aggregation joined fields (after $lookup and $unwind)
            { 'lead_details.contact_name': { $regex: searchRegex } },
            { 'project_details.name': { $regex: searchRegex } },
            { 'lead_details.email_from': { $regex: searchRegex } },
            { 'lead_details.phone': { $regex: searchRegex } },
            { 'lead_details.lead_source_no': { $regex: searchRegex } },
            { 'bank_details.name': { $regex: searchRegex } },
            // Search in payment terms (for month-based searches)
            { 'payment_terms_details.name': { $regex: searchRegex } },
          ],
        },
      });
    }
    return this;
  }

  /**
   * Add sort stage to pipeline
   * @param {Object} sortOptions - Sort options (default: { createdAt: -1 })
   * @returns {PipelineBuilder} - This instance for chaining
   */
  addSort(sortOptions = { createdAt: -1 }) {
    this.pipeline.push({ $sort: sortOptions });
    return this;
  }

  /**
   * Add pagination stage to pipeline
   * @param {number} page - Page number
   * @param {number} limit - Limit per page
   * @param {Object} projection - Optional projection object
   * @returns {PipelineBuilder} - This instance for chaining
   */
  addPagination(page, limit, projection = null) {
    const skip = (page - 1) * limit;

    const facetStage = {
      data: [{ $skip: skip }, { $limit: parseInt(limit) }],
      totalCount: [{ $count: 'count' }],
    };

    if (projection) {
      facetStage.data.push({ $project: projection });
    }

    this.pipeline.push({ $facet: facetStage });
    return this;
  }

  /**
   * Build and return the pipeline
   * @returns {Array} - MongoDB aggregation pipeline
   */
  build() {
    return this.pipeline;
  }
}

module.exports = PipelineBuilder;
