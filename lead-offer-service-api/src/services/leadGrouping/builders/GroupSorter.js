/**
 * Group Sorter
 * Handles sorting of grouped results with advanced sorting options
 */

const { Lead } = require('../../../models');
const { GROUPING_FIELDS, STAGE_PRIORITY } = require('../config/groupingFields');
const { compareValues, getDefaultValueForField } = require('../utils/groupHelpers');
const logger = require('../../../helpers/logger');

class GroupSorter {
  constructor(sortBy = 'count', sortOrder = 'desc', groupByField = null) {
    this.sortBy = sortBy;
    this.sortOrder = sortOrder;
    this.groupByField = groupByField;
  }

  /**
   * Sort groups with advanced sorting logic
   * @param {Array} groups - Array of groups to sort
   * @returns {Promise<Array>} - Sorted groups
   */
  async sortGroups(groups) {
    // Separate "None" groups from regular groups
    const noneGroups = groups.filter((group) => group.groupName === 'None');
    const regularGroups = groups.filter((group) => group.groupName !== 'None');

    // Special handling for status and stage grouping
    if (this.groupByField === 'status') {
      return await this._sortStatusGroups(regularGroups, noneGroups);
    }

    if (this.groupByField === 'stage') {
      return await this._sortStageGroups(regularGroups, noneGroups);
    }

    // Check if this is lead-specific sorting
    if (this._isLeadSpecificSort()) {
      return await this._sortByLeadField(regularGroups, noneGroups);
    }

    // Calculate metrics if needed for advanced sorting
    if (this._needsMetrics()) {
      await this._calculateMetricsForGroups(regularGroups);
      await this._calculateMetricsForGroups(noneGroups);
    }

    // Sort regular groups
    const sortedRegularGroups = await this._sortRegularGroups(regularGroups);

    // Sort "None" groups by count (largest first)
    const sortedNoneGroups = noneGroups.sort((a, b) => b.count - a.count);

    // Return regular groups first, then "None" groups
    return [...sortedRegularGroups, ...sortedNoneGroups];
  }

  /**
   * Check if sorting by lead-specific field
   * @private
   */
  _isLeadSpecificSort() {
    const leadSpecificFields = [
      'contact_name',
      'lead_source_no',
      'expected_revenue',
      'createdAt',
      'updatedAt',
      'lead_date',
      'email_from',
      'phone',
      'title',
      'investment_volume',
      'interest_rate',
      'payment_terms',
      'bonus_amount',
      'bank_name',
      'project_name',
      'agent',
      'offer_status',
      'current_stage',
    ];

    return leadSpecificFields.includes(this.sortBy);
  }

  /**
   * Check if metrics calculation is needed
   * @private
   */
  _needsMetrics() {
    return ['avg_revenue', 'total_revenue', 'latest_lead', 'oldest_lead'].includes(this.sortBy);
  }

  /**
   * Sort by lead-specific field
   * @private
   */
  async _sortByLeadField(regularGroups, noneGroups) {
    // Sort leads within each group first
    await this._sortLeadsWithinGroups(regularGroups);

    // Then sort groups by first lead's value
    const sortedRegularGroups = regularGroups.sort((a, b) => {
      let aValue = this._getFirstLeadValue(a);
      let bValue = this._getFirstLeadValue(b);

      if (aValue && aValue.needsResolution) {
        aValue = getDefaultValueForField(this.sortBy);
      }
      if (bValue && bValue.needsResolution) {
        bValue = getDefaultValueForField(this.sortBy);
      }

      return compareValues(aValue, bValue, this.sortOrder);
    });

    const sortedNoneGroups = noneGroups.sort((a, b) => b.count - a.count);
    return [...sortedRegularGroups, ...sortedNoneGroups];
  }

  /**
   * Sort leads within groups by lead-specific field
   * @private
   */
  async _sortLeadsWithinGroups(groups) {
    for (const group of groups) {
      if (group.leads && group.leads.length > 0) {
        group.leads.sort((a, b) => {
          const aValue = this._extractLeadFieldValue(a);
          const bValue = this._extractLeadFieldValue(b);
          return compareValues(aValue, bValue, this.sortOrder);
        });
      }
    }
  }

  /**
   * Extract field value from lead for sorting
   * @private
   */
  _extractLeadFieldValue(lead) {
    switch (this.sortBy) {
      case 'contact_name':
        return lead.contact_name || '';
      case 'lead_source_no':
        return lead.lead_source_no || '';
      case 'expected_revenue':
        return lead.expected_revenue || 0;
      case 'createdAt':
        return lead.createdAt || new Date(0);
      case 'updatedAt':
        return lead.updatedAt || new Date(0);
      case 'lead_date':
        return lead.lead_date || lead.createdAt || new Date(0);
      case 'email_from':
        return lead.email_from || '';
      case 'phone':
        return lead.phone || '';
      // Offer-related fields
      case 'title':
        return lead.offers?.[0]?.title || '';
      case 'investment_volume':
        return lead.offers?.[0]?.investment_volume || 0;
      case 'interest_rate':
        return lead.offers?.[0]?.interest_rate || 0;
      case 'payment_terms':
        return lead.offers?.[0]?.payment_terms?.name || lead.offers?.[0]?.payment_terms_details?.name || '';
      case 'bonus_amount':
        return lead.offers?.[0]?.bonus_amount?.info?.bonus_amount || lead.offers?.[0]?.bonus_amount_details?.info?.bonus_amount || 0;
      case 'bank_name':
        return lead.offers?.[0]?.bank_id?.name || lead.offers?.[0]?.bank_details?.name || '';
      case 'project_name':
        return lead.offers?.[0]?.project_id?.name || lead.offers?.[0]?.project_details?.name || '';
      case 'agent':
        return lead.offers?.[0]?.agent_id?.login || lead.offers?.[0]?.agent_details?.login || '';
      case 'offer_status':
        return lead.offers?.[0]?.status || '';
      case 'current_stage':
        return lead.offers?.[0]?.current_stage || 'offer';
      default:
        return '';
    }
  }

  /**
   * Get first lead's value for group sorting
   * @private
   */
  _getFirstLeadValue(group) {
    if (group.leads && group.leads.length > 0) {
      return this._extractLeadFieldValue(group.leads[0]);
    }

    if (group.leadIds && group.leadIds.length > 0) {
      return { needsResolution: true, leadId: group.leadIds[0], field: this.sortBy };
    }

    return getDefaultValueForField(this.sortBy);
  }

  /**
   * Calculate metrics for groups (avg_revenue, total_revenue, latest_lead, oldest_lead)
   * @private
   */
  async _calculateMetricsForGroups(groups) {
    for (const group of groups) {
      if (group.leadIds && group.leadIds.length > 0) {
        const metrics = await this._calculateGroupMetrics(group.leadIds);
        group.metrics = metrics;
      }
    }
  }

  /**
   * Calculate metrics for a group
   * @private
   */
  async _calculateGroupMetrics(leadIds) {
    if (!leadIds || leadIds.length === 0) {
      return {
        avgRevenue: 0,
        totalRevenue: 0,
        latestLeadDate: null,
        oldestLeadDate: null,
      };
    }

    const leads = await Lead.find({ _id: { $in: leadIds } })
      .select('expected_revenue lead_date createdAt')
      .lean();

    const revenues = leads.map((l) => l.expected_revenue || 0).filter((r) => r > 0);
    const dates = leads.map((l) => l.lead_date || l.createdAt).filter((d) => d);

    return {
      avgRevenue: revenues.length > 0 ? revenues.reduce((sum, r) => sum + r, 0) / revenues.length : 0,
      totalRevenue: revenues.reduce((sum, r) => sum + r, 0),
      latestLeadDate: dates.length > 0 ? new Date(Math.max(...dates.map((d) => new Date(d)))) : null,
      oldestLeadDate: dates.length > 0 ? new Date(Math.min(...dates.map((d) => new Date(d)))) : null,
    };
  }

  /**
   * Sort regular groups by standard criteria
   * @private
   */
  async _sortRegularGroups(groups) {
    return groups.sort((a, b) => {
      let aValue, bValue;

      switch (this.sortBy) {
        case 'count':
          aValue = a.count;
          bValue = b.count;
          break;
        case 'name':
          aValue = a.groupName;
          bValue = b.groupName;
          break;
        case 'avg_revenue':
          aValue = a.metrics?.avgRevenue || 0;
          bValue = b.metrics?.avgRevenue || 0;
          break;
        case 'total_revenue':
          aValue = a.metrics?.totalRevenue || 0;
          bValue = b.metrics?.totalRevenue || 0;
          break;
        case 'latest_lead':
          aValue = this._getLatestLeadValue(a);
          bValue = this._getLatestLeadValue(b);
          break;
        case 'oldest_lead':
          aValue = this._getOldestLeadValue(a);
          bValue = this._getOldestLeadValue(b);
          break;
        default:
          aValue = a.count;
          bValue = b.count;
      }

      return compareValues(aValue, bValue, this.sortOrder);
    });
  }

  /**
   * Get latest lead value for sorting
   * @private
   */
  _getLatestLeadValue(group) {
    const fieldConfig = GROUPING_FIELDS[this.groupByField];
    if (fieldConfig?.type === 'date' && group.groupName !== 'None') {
      return new Date(group.groupName + 'T00:00:00Z');
    }
    return group.metrics?.latestLeadDate || new Date(0);
  }

  /**
   * Get oldest lead value for sorting
   * @private
   */
  _getOldestLeadValue(group) {
    const fieldConfig = GROUPING_FIELDS[this.groupByField];
    if (fieldConfig?.type === 'date' && group.groupName !== 'None') {
      return new Date(group.groupName + 'T00:00:00Z');
    }
    return group.metrics?.oldestLeadDate || new Date();
  }

  /**
   * Sort status groups by stage priority
   * @private
   */
  async _sortStatusGroups(regularGroups, noneGroups) {
    try {
      const { getStageAndStatusMaps } = require('../../leadService/utils');
      const { stageMap, statusMap } = await getStageAndStatusMaps();

      // Enhance groups with stage priority
      for (const group of regularGroups) {
        const stageName = this._extractStageName(group, statusMap);
        group._sortingMetadata = {
          stageName,
          stagePriority: this._getStagePriority(stageName),
        };
      }

      // Sort by stage priority first, then by requested criteria
      const sortedRegularGroups = regularGroups.sort((a, b) => {
        const stageDiff = a._sortingMetadata.stagePriority - b._sortingMetadata.stagePriority;
        if (stageDiff !== 0) return stageDiff;

        return this._compareGroupsByCriteria(a, b);
      });

      // Clean up metadata
      sortedRegularGroups.forEach((group) => delete group._sortingMetadata);

      const sortedNoneGroups = noneGroups.sort((a, b) => b.count - a.count);
      return [...sortedRegularGroups, ...sortedNoneGroups];
    } catch (error) {
      logger.error('Error sorting status groups:', error);
      return [...regularGroups, ...noneGroups];
    }
  }

  /**
   * Sort stage groups by stage priority
   * @private
   */
  async _sortStageGroups(regularGroups, noneGroups) {
    try {
      // Enhance groups with stage priority
      for (const group of regularGroups) {
        const stageName = group.reference?.name || group.groupName || 'default';
        group._sortingMetadata = {
          stageName,
          stagePriority: this._getStagePriority(stageName),
        };
      }

      // Sort by stage priority first, then by requested criteria
      const sortedRegularGroups = regularGroups.sort((a, b) => {
        const stageDiff = a._sortingMetadata.stagePriority - b._sortingMetadata.stagePriority;
        if (stageDiff !== 0) return stageDiff;

        return this._compareGroupsByCriteria(a, b);
      });

      // Clean up metadata
      sortedRegularGroups.forEach((group) => delete group._sortingMetadata);

      const sortedNoneGroups = noneGroups.sort((a, b) => b.count - a.count);
      return [...sortedRegularGroups, ...sortedNoneGroups];
    } catch (error) {
      logger.error('Error sorting stage groups:', error);
      return [...regularGroups, ...noneGroups];
    }
  }

  /**
   * Extract stage name from status group
   * @private
   */
  _extractStageName(group, statusMap) {
    if (group.reference && group.reference.stageName) {
      return group.reference.stageName;
    }

    const statusInfo = statusMap[group.groupId] || statusMap[group.groupName];
    if (statusInfo && statusInfo.stageName) {
      return statusInfo.stageName;
    }

    return 'default';
  }

  /**
   * Get stage priority value
   * @private
   */
  _getStagePriority(stageName) {
    const matchingStage = Object.keys(STAGE_PRIORITY).find(
      (stage) => stage.toLowerCase() === stageName.toLowerCase()
    );
    return matchingStage ? STAGE_PRIORITY[matchingStage] : STAGE_PRIORITY.default;
  }

  /**
   * Compare groups by secondary criteria (within same stage)
   * @private
   */
  _compareGroupsByCriteria(a, b) {
    let aValue, bValue;

    switch (this.sortBy) {
      case 'count':
        aValue = a.count;
        bValue = b.count;
        break;
      case 'name':
        aValue = a.groupName;
        bValue = b.groupName;
        break;
      default:
        aValue = a.count;
        bValue = b.count;
    }

    return compareValues(aValue, bValue, this.sortOrder);
  }
}

module.exports = GroupSorter;