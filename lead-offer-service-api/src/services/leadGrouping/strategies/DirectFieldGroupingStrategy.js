/**
 * Direct Field Grouping Strategy
 * Handles grouping by direct lead fields (string, number, boolean, date)
 */

const BaseGroupingStrategy = require('./BaseGroupingStrategy');
const { Lead } = require('../../../models');
const { generateNoneGroupId, formatValue } = require('../utils/groupHelpers');
const logger = require('../../../helpers/logger');

class DirectFieldGroupingStrategy extends BaseGroupingStrategy {
  getType() {
    return 'direct';
  }

  canHandle(groupConfig) {
    return ['string', 'number', 'boolean', 'date'].includes(groupConfig.type);
  }

  async execute(groupConfig, baseQuery, user, options = {}) {
    const { field, type } = groupConfig;

    try {
      // Build group expression based on field type
      const groupExpression = this._buildGroupExpression(field, type);

      // Build aggregation pipeline
      const pipeline = [
        { $match: baseQuery },
        {
          $group: {
            _id: groupExpression,
            leadIds: { $push: '$_id' },
            count: { $sum: 1 },
            // For stage/status, capture the original field for name extraction
            ...(field === 'stage' || field === 'status'
              ? { sampleField: { $first: `$${field}` } }
              : {}),
          },
        },
      ];

      const results = await Lead.aggregate(pipeline);

      // Transform results to standard group format
      return this._transformResults(results, field, type);
    } catch (error) {
      logger.error('DirectFieldGroupingStrategy error:', {
        field,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Build MongoDB group expression based on field type
   * @private
   */
  _buildGroupExpression(field, type) {
    // Special handling for date fields - group by date only (YYYY-MM-DD)
    if (type === 'date') {
      return {
        $dateToString: {
          format: '%Y-%m-%d',
          date: `$${field}`,
          onNull: null,
        },
      };
    }

    // Special handling for stage/status fields (can be objects or strings)
    if (field === 'stage' || field === 'status') {
      return {
        $cond: {
          if: { $eq: [{ $type: `$${field}` }, 'object'] },
          then: {
            $cond: {
              if: { $ne: [`$${field}.id`, null] },
              then: `$${field}.id`,
              else: `$${field}._id`,
            },
          },
          else: `$${field}`,
        },
      };
    }

    // Default: group by field value directly
    return `$${field}`;
  }

  /**
   * Transform aggregation results to standard group format
   * @private
   */
  _transformResults(results, field, type) {
    return results.map((result) => {
      let groupId = result._id;
      let groupName = 'None';

      if (result._id === null) {
        // Null group
        groupId = generateNoneGroupId(field);
        groupName = 'None';
      } else if (field === 'stage' || field === 'status') {
        // Extract name from stage/status object or use ID as name
        groupName = this._extractStageStatusName(result, field);
        groupId = this._generateStageStatusId(result._id, field);
      } else if (type === 'date' && typeof result._id === 'string') {
        // Date field - already formatted as YYYY-MM-DD
        groupName = result._id;
        groupId = generateNoneGroupId(`${field}_${result._id}`);
      } else {
        // Other primitive types
        groupName = formatValue(result._id, type);
        groupId = this._generatePrimitiveId(result._id, field);
      }

      return {
        groupId,
        groupName,
        leadIds: result.leadIds,
        count: result.count,
      };
    });
  }

  /**
   * Extract display name from stage/status object
   * @private
   */
  _extractStageStatusName(result, field) {
    if (result.sampleField && typeof result.sampleField === 'object') {
      return result.sampleField.name || result._id;
    }
    return result._id;
  }

  /**
   * Generate deterministic ID for stage/status fields
   * @private
   */
  _generateStageStatusId(value, field) {
    if (typeof value === 'string') {
      return generateNoneGroupId(`${field}_${value}`);
    }
    return value;
  }

  /**
   * Generate deterministic ID for primitive values
   * @private
   */
  _generatePrimitiveId(value, field) {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return generateNoneGroupId(`${field}_${value}`);
    }
    return value;
  }
}

module.exports = DirectFieldGroupingStrategy;