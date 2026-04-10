/**
 * Context Date Grouping Strategy
 * Handles grouping by context-aware date fields (createdAt, updatedAt, assigned_date)
 * Detects entity context and uses appropriate entity dates
 */

const BaseGroupingStrategy = require('./BaseGroupingStrategy');
const { Lead, AssignLeads } = require('../../../models');
const Offer = require('../../../models/Offer');
const Opening = require('../../../models/Opening');
const { Confirmation, PaymentVoucher, Netto1, Netto2 } = require('../../../models');
const { detectEntityContext, getEntityDateField, generateNoneGroupId } = require('../utils/groupHelpers');
const logger = require('../../../helpers/logger');

class ContextDateGroupingStrategy extends BaseGroupingStrategy {
  getType() {
    return 'context_date';
  }

  canHandle(groupConfig) {
    return groupConfig.type === 'context_date';
  }

  async execute(groupConfig, baseQuery, user, options = {}) {
    const { field } = groupConfig;

    try {
      // Detect entity context from filters
      const entityContext = detectEntityContext(options.filters || []);
      const dateFieldMapping = getEntityDateField(field, entityContext);

      logger.info('Context-aware date grouping', {
        field,
        entityContext,
        dateFieldMapping,
      });

      if (!entityContext) {
        // Lead context - use lead date fields
        return await this._groupByLeadDate(field, baseQuery, user, options);
      } else {
        // Entity context - use entity-specific date fields
        return await this._groupByEntityDate(field, entityContext, baseQuery, user, options);
      }
    } catch (error) {
      logger.error('ContextDateGroupingStrategy error:', {
        field,
        error: error.message,
      });
      // Fallback to lead date grouping on error
      return await this._groupByLeadDate(field, baseQuery, user, options);
    }
  }

  /**
   * Group by lead date fields (default context)
   * @private
   */
  async _groupByLeadDate(dateField, baseQuery, user, options) {
    if (dateField === 'assigned_date') {
      return await this._groupByAssignedDate(baseQuery, user, options);
    }

    // Standard lead date grouping - filter out null dates
    const enhancedQuery = {
      ...baseQuery,
      [dateField]: { $ne: null, $exists: true },
    };

    const groupExpression = {
      $dateToString: {
        format: '%Y-%m-%d',
        date: `$${dateField}`,
        onNull: null,
      },
    };

    const pipeline = [
      { $match: enhancedQuery },
      {
        $group: {
          _id: groupExpression,
          leadIds: { $push: '$_id' },
          count: { $sum: 1 },
        },
      },
      { $match: { _id: { $ne: null } } },
    ];

    const results = await Lead.aggregate(pipeline);
    return this._formatDateGroupResults(results, dateField);
  }

  /**
   * Group by assigned_date from AssignLeads collection
   * @private
   */
  async _groupByAssignedDate(baseQuery, user, options) {
    const leads = await Lead.find(baseQuery).select('_id').lean();
    const leadIds = leads.map((l) => l._id);

    const pipeline = [
      {
        $match: {
          lead_id: { $in: leadIds },
          status: 'active',
          assigned_date: { $ne: null, $exists: true },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$assigned_date',
              onNull: null,
            },
          },
          leadIds: { $push: '$lead_id' },
          count: { $sum: 1 },
        },
      },
      { $match: { _id: { $ne: null } } },
    ];

    const results = await AssignLeads.aggregate(pipeline);
    return this._formatDateGroupResults(results, 'assigned_date');
  }

  /**
   * Group by entity-specific date fields
   * @private
   */
  async _groupByEntityDate(dateField, entityContext, baseQuery, user, options) {
    const leads = await Lead.find(baseQuery).select('_id').lean();
    const leadIds = leads.map((l) => l._id);

    if (!leadIds || leadIds.length === 0) {
      return [];
    }

    const dateFieldMapping = getEntityDateField(dateField, entityContext);

    switch (entityContext) {
      case 'offer':
        return await this._groupByOfferDate(leadIds, dateFieldMapping.field, dateField);
      case 'opening':
        return await this._groupByOpeningDate(leadIds, dateFieldMapping.field, dateField);
      case 'confirmation':
        return await this._groupByConfirmationDate(leadIds, dateFieldMapping.field, dateField);
      case 'payment':
        return await this._groupByPaymentDate(leadIds, dateFieldMapping.field, dateField);
      case 'netto':
        return await this._groupByNettoDate(leadIds, dateFieldMapping.field, dateField);
      default:
        return await this._groupByLeadDate(dateField, { _id: { $in: leadIds } }, user, options);
    }
  }

  /**
   * Group by offer dates
   * @private
   */
  async _groupByOfferDate(leadIds, entityDateField, originalDateField) {
    const pipeline = [
      {
        $match: {
          lead_id: { $in: leadIds, $ne: null },
          active: true,
          [entityDateField]: { $ne: null, $exists: true },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: `$${entityDateField}`,
              onNull: null,
            },
          },
          leadIds: { $push: '$lead_id' },
          count: { $sum: 1 },
        },
      },
      { $match: { _id: { $ne: null } } },
    ];

    const results = await Offer.aggregate(pipeline);
    return this._formatDateGroupResults(results, originalDateField);
  }

  /**
   * Group by opening dates
   * @private
   */
  async _groupByOpeningDate(leadIds, entityDateField, originalDateField) {
    const offers = await Offer.find({
      lead_id: { $in: leadIds },
      active: true,
    }).select('_id lead_id').lean();

    const offerIds = offers.map((o) => o._id);
    const offerLeadMap = new Map(offers.map((o) => [o._id.toString(), o.lead_id]));

    const pipeline = [
      { $match: { offer_id: { $in: offerIds }, active: true } },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: `$${entityDateField}`,
              onNull: null,
            },
          },
          offerIds: { $push: '$offer_id' },
          count: { $sum: 1 },
        },
      },
    ];

    const results = await Opening.aggregate(pipeline);
    return this._convertOfferIdsToLeadIds(results, offerLeadMap, originalDateField);
  }

  /**
   * Group by confirmation dates
   * @private
   */
  async _groupByConfirmationDate(leadIds, entityDateField, originalDateField) {
    const offers = await Offer.find({
      lead_id: { $in: leadIds },
      active: true,
    }).select('_id lead_id').lean();

    const offerIds = offers.map((o) => o._id);
    const offerLeadMap = new Map(offers.map((o) => [o._id.toString(), o.lead_id]));

    const pipeline = [
      { $match: { offer_id: { $in: offerIds }, active: true } },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: `$${entityDateField}`,
              onNull: null,
            },
          },
          offerIds: { $push: '$offer_id' },
          count: { $sum: 1 },
        },
      },
    ];

    const results = await Confirmation.aggregate(pipeline);
    return this._convertOfferIdsToLeadIds(results, offerLeadMap, originalDateField);
  }

  /**
   * Group by payment dates
   * @private
   */
  async _groupByPaymentDate(leadIds, entityDateField, originalDateField) {
    const offers = await Offer.find({
      lead_id: { $in: leadIds },
      active: true,
    }).select('_id lead_id').lean();

    const offerIds = offers.map((o) => o._id);
    const offerLeadMap = new Map(offers.map((o) => [o._id.toString(), o.lead_id]));

    const pipeline = [
      { $match: { offer_id: { $in: offerIds }, active: true } },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: `$${entityDateField}`,
              onNull: null,
            },
          },
          offerIds: { $push: '$offer_id' },
          count: { $sum: 1 },
        },
      },
    ];

    const results = await PaymentVoucher.aggregate(pipeline);
    return this._convertOfferIdsToLeadIds(results, offerLeadMap, originalDateField);
  }

  /**
   * Group by netto dates
   * @private
   */
  async _groupByNettoDate(leadIds, entityDateField, originalDateField) {
    const offers = await Offer.find({
      lead_id: { $in: leadIds },
      active: true,
    }).select('_id lead_id').lean();

    const offerIds = offers.map((o) => o._id);
    const offerLeadMap = new Map(offers.map((o) => [o._id.toString(), o.lead_id]));

    const netto1Pipeline = [
      { $match: { offer_id: { $in: offerIds }, active: true } },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: `$${entityDateField}`,
              onNull: null,
            },
          },
          offerIds: { $push: '$offer_id' },
          count: { $sum: 1 },
        },
      },
    ];

    const [netto1Results, netto2Results] = await Promise.all([
      Netto1.aggregate(netto1Pipeline),
      Netto2.aggregate(netto1Pipeline),
    ]);

    // Combine results from both collections
    const combinedResults = new Map();
    [...netto1Results, ...netto2Results].forEach((result) => {
      const dateKey = result._id;
      const leadIds = result.offerIds
        .map((offerId) => offerLeadMap.get(offerId.toString()))
        .filter(Boolean);

      if (combinedResults.has(dateKey)) {
        const existing = combinedResults.get(dateKey);
        existing.leadIds = [...new Set([...existing.leadIds, ...leadIds.map((id) => id.toString())])];
        existing.count = existing.leadIds.length;
      } else {
        combinedResults.set(dateKey, {
          _id: dateKey,
          leadIds: [...new Set(leadIds.map((id) => id.toString()))],
          count: leadIds.length,
        });
      }
    });

    return Array.from(combinedResults.values()).map((result) =>
      this._formatSingleDateGroupResult(result, originalDateField)
    );
  }

  /**
   * Convert offer IDs to lead IDs in results
   * @private
   */
  _convertOfferIdsToLeadIds(results, offerLeadMap, dateField) {
    return results
      .map((result) => {
        const leadIds = result.offerIds
          .map((offerId) => offerLeadMap.get(offerId.toString()))
          .filter(Boolean);

        return {
          ...result,
          leadIds: [...new Set(leadIds.map((id) => id.toString()))],
          count: leadIds.length,
        };
      })
      .map((result) => this._formatSingleDateGroupResult(result, dateField));
  }

  /**
   * Format date group results consistently
   * @private
   */
  _formatDateGroupResults(results, dateField) {
    return results.map((result) => this._formatSingleDateGroupResult(result, dateField));
  }

  /**
   * Format single date group result
   * @private
   */
  _formatSingleDateGroupResult(result, dateField) {
    if (!result) {
      return {
        groupId: generateNoneGroupId(`${dateField}_none`),
        groupName: 'No Date',
        leadIds: [],
        count: 0,
      };
    }

    const groupName = result._id || 'No Date';
    const groupId = result._id
      ? generateNoneGroupId(`${dateField}_${result._id}`)
      : generateNoneGroupId(`${dateField}_none`);

    return {
      groupId,
      groupName,
      leadIds: result.leadIds || [],
      count: result.count || 0,
    };
  }
}

module.exports = ContextDateGroupingStrategy;