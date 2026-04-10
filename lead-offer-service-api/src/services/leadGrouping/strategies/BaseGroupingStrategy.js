/**
 * Base Grouping Strategy
 * Abstract base class for all grouping strategies
 */

const { generateNoneGroupId } = require('../utils/groupHelpers');

class BaseGroupingStrategy {
  /**
   * Execute grouping for this strategy
   * @param {Object} groupConfig - Field configuration
   * @param {Object} baseQuery - Base MongoDB query
   * @param {Object} user - User object for permissions
   * @param {Object} options - Additional options
   * @returns {Promise<Array>} - Grouped results
   */
  async execute(groupConfig, baseQuery, user, options = {}) {
    throw new Error('execute() must be implemented by subclass');
  }

  /**
   * Create a "None" group structure
   * @param {string} field - Field name
   * @param {number} level - Grouping level
   * @returns {Object} - None group structure
   */
  createNoneGroup(field, level = 0) {
    return {
      groupId: generateNoneGroupId(field, level),
      groupName: 'None',
      leadIds: [],
      count: 0,
    };
  }

  /**
   * Validate if this strategy can handle the field
   * @param {Object} groupConfig - Field configuration
   * @returns {boolean} - True if strategy can handle field
   */
  canHandle(groupConfig) {
    throw new Error('canHandle() must be implemented by subclass');
  }

  /**
   * Get the type this strategy handles
   * @returns {string} - Strategy type
   */
  getType() {
    throw new Error('getType() must be implemented by subclass');
  }
}

module.exports = BaseGroupingStrategy;