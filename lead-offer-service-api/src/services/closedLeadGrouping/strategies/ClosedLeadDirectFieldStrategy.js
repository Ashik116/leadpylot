const ClosedLead = require('../../../models/ClosedLead');
const { generateNoneGroupId, formatValue } = require('../../leadGrouping/utils/groupHelpers');
const logger = require('../../../helpers/logger') || console;

class ClosedLeadDirectFieldStrategy {
  canHandle(groupConfig) {
    return ['string', 'number', 'boolean', 'date'].includes(groupConfig.type);
  }

  async execute(groupConfig, baseQuery) {
    const { field, type } = groupConfig;
    try {
      const groupExpression = this._buildGroupExpression(field, type);
      const pipeline = [
        { $match: baseQuery },
        {
          $group: {
            _id: groupExpression,
            leadIds: { $push: '$_id' },
            count: { $sum: 1 },
            ...(field === 'stage' || field === 'status' ? { sampleField: { $first: `$${field}` } } : {}),
          },
        },
      ];
      const results = await ClosedLead.aggregate(pipeline);
      return this._transformResults(results, field, type);
    } catch (error) {
      logger.error('ClosedLeadDirectFieldStrategy error:', { field, error: error.message });
      throw error;
    }
  }

  _buildGroupExpression(field, type) {
    if (type === 'date') {
      return { $dateToString: { format: '%Y-%m-%d', date: `$${field}`, onNull: null } };
    }
    if (field === 'stage' || field === 'status') {
      return {
        $cond: {
          if: { $eq: [{ $type: `$${field}` }, 'object'] },
          then: { $cond: { if: { $ne: [`$${field}.id`, null] }, then: `$${field}.id`, else: `$${field}._id` } },
          else: `$${field}`,
        },
      };
    }
    return `$${field}`;
  }

  _transformResults(results, field, type) {
    return results.map((result) => {
      let groupId = result._id;
      let groupName = 'None';
      if (result._id === null) {
        groupId = generateNoneGroupId(field);
      } else if (field === 'stage' || field === 'status') {
        groupName = result.sampleField && typeof result.sampleField === 'object'
          ? result.sampleField.name || result._id : result._id;
        groupId = typeof result._id === 'string' ? generateNoneGroupId(`${field}_${result._id}`) : result._id;
      } else if (type === 'date' && typeof result._id === 'string') {
        groupName = result._id;
        groupId = generateNoneGroupId(`${field}_${result._id}`);
      } else {
        groupName = formatValue(result._id, type);
        groupId = generateNoneGroupId(`${field}_${result._id}`);
      }
      return { groupId, groupName, leadIds: result.leadIds, count: result.count };
    });
  }
}

module.exports = ClosedLeadDirectFieldStrategy;
