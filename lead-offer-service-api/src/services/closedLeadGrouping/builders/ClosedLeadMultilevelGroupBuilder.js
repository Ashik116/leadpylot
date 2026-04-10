const mongoose = require('mongoose');
const ClosedLead = require('../../../models/ClosedLead');
const { CLOSED_LEAD_GROUPING_FIELDS } = require('../config/closedLeadGroupingFields');
const ClosedLeadDirectFieldStrategy = require('../strategies/ClosedLeadDirectFieldStrategy');
const ClosedLeadReferenceFieldStrategy = require('../strategies/ClosedLeadReferenceFieldStrategy');
const ClosedLeadGroupSorter = require('./ClosedLeadGroupSorter');
const { generateNoneGroupId } = require('../../leadGrouping/utils/groupHelpers');
const logger = require('../../../helpers/logger') || console;

class ClosedLeadMultilevelGroupBuilder {
  constructor() {
    this.directStrategy = new ClosedLeadDirectFieldStrategy();
    this.referenceStrategy = new ClosedLeadReferenceFieldStrategy();
  }

  async buildMultilevelGroups(fields, baseQuery, options = {}) {
    if (!fields || fields.length === 0) return [];
    const { sortBy = 'count', sortOrder = 'desc' } = options;
    const firstField = fields[0];
    const groupConfig = CLOSED_LEAD_GROUPING_FIELDS[firstField];
    if (!groupConfig) throw new Error(`Invalid closed lead grouping field: ${firstField}`);

    const strategy = groupConfig.type === 'reference' ? this.referenceStrategy : this.directStrategy;
    const groups = await strategy.execute(groupConfig, baseQuery);
    const sorter = new ClosedLeadGroupSorter(sortBy, sortOrder, firstField);
    const sortedGroups = await sorter.sortGroups(groups);

    if (fields.length > 1) {
      const remainingFields = fields.slice(1);
      for (const group of sortedGroups) {
        if (group.leadIds && group.leadIds.length > 0) {
          const subQuery = { ...baseQuery, _id: { $in: group.leadIds } };
          group.subGroups = await this.buildMultilevelGroups(remainingFields, subQuery, options);
        } else {
          group.subGroups = [];
        }
      }
    }

    return sortedGroups;
  }
}

module.exports = ClosedLeadMultilevelGroupBuilder;
