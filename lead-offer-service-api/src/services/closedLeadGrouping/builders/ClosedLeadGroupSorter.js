const { CLOSED_LEAD_STAGE_PRIORITY } = require('../config/closedLeadGroupingFields');
const { compareValues } = require('../../leadGrouping/utils/groupHelpers');

class ClosedLeadGroupSorter {
  constructor(sortBy = 'count', sortOrder = 'desc', groupByField = null) {
    this.sortBy = sortBy;
    this.sortOrder = sortOrder;
    this.groupByField = groupByField;
  }

  async sortGroups(groups) {
    if (!groups || groups.length === 0) return [];
    const sorted = [...groups];
    sorted.sort((a, b) => this._compare(a, b));
    return sorted;
  }

  _compare(a, b) {
    const multiplier = this.sortOrder === 'asc' ? 1 : -1;

    if (this.sortBy === 'count') return multiplier * (a.count - b.count);
    if (this.sortBy === 'name') return multiplier * String(a.groupName || '').localeCompare(String(b.groupName || ''));
    if (this.sortBy === 'stage_priority') {
      const pA = CLOSED_LEAD_STAGE_PRIORITY[a.groupName] || CLOSED_LEAD_STAGE_PRIORITY.default;
      const pB = CLOSED_LEAD_STAGE_PRIORITY[b.groupName] || CLOSED_LEAD_STAGE_PRIORITY.default;
      return multiplier * (pA - pB);
    }

    const aVal = a[this.sortBy] || a.groupName || '';
    const bVal = b[this.sortBy] || b.groupName || '';
    return multiplier * compareValues(aVal, bVal);
  }
}

module.exports = ClosedLeadGroupSorter;
