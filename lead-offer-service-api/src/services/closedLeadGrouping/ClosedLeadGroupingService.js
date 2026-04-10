const mongoose = require('mongoose');
const ClosedLead = require('../../models/ClosedLead');
const {
  CLOSED_LEAD_GROUPING_FIELDS,
  CLOSED_LEAD_SORTING_OPTIONS,
  CLOSED_LEAD_PAGINATION_LIMITS,
  CLOSED_LEAD_PERFORMANCE_THRESHOLDS,
} = require('./config/closedLeadGroupingFields');
const { countLeadsInNestedStructure, getFieldDescription } = require('../leadGrouping/utils/groupHelpers');

const ClosedLeadDirectFieldStrategy = require('./strategies/ClosedLeadDirectFieldStrategy');
const ClosedLeadReferenceFieldStrategy = require('./strategies/ClosedLeadReferenceFieldStrategy');

const ClosedLeadQueryBuilder = require('./builders/ClosedLeadQueryBuilder');
const ClosedLeadGroupSorter = require('./builders/ClosedLeadGroupSorter');
const ClosedLeadMultilevelGroupBuilder = require('./builders/ClosedLeadMultilevelGroupBuilder');

const logger = require('../../helpers/logger') || console;

class ClosedLeadGroupingService {
  constructor() {
    this.strategies = new Map();
    this._registerStrategies();
  }

  _registerStrategies() {
    this.strategies.set('direct', new ClosedLeadDirectFieldStrategy());
    this.strategies.set('reference', new ClosedLeadReferenceFieldStrategy());
  }

  _getStrategy(groupConfig) {
    for (const [, strategy] of this.strategies) {
      if (strategy.canHandle(groupConfig)) return strategy;
    }
    throw new Error(`No strategy found for field type: ${groupConfig.type}`);
  }

  _buildBaseQuery(user, filters, search) {
    const builder = new ClosedLeadQueryBuilder(user, filters, search);
    return builder.build();
  }

  async groupClosedLeads(groupByField, user, options = {}) {
    const startTime = Date.now();
    try {
      if (!CLOSED_LEAD_GROUPING_FIELDS[groupByField]) {
        throw new Error(`Invalid closed lead grouping field: ${groupByField}`);
      }

      const {
        page = CLOSED_LEAD_PAGINATION_LIMITS.DEFAULT_PAGE,
        limit = CLOSED_LEAD_PAGINATION_LIMITS.DEFAULT_LIMIT,
        filters = [],
        sortBy = 'count',
        sortOrder = 'desc',
        search = '',
        includeLeads = false,
        leadsPage = 1,
        leadsLimit = 20,
      } = options;

      const baseQuery = this._buildBaseQuery(user, filters, search);
      const groupConfig = CLOSED_LEAD_GROUPING_FIELDS[groupByField];
      const strategy = this._getStrategy(groupConfig);
      const groupedResults = await strategy.execute(groupConfig, baseQuery);

      const sorter = new ClosedLeadGroupSorter(sortBy, sortOrder, groupByField);
      const sortedResults = await sorter.sortGroups(groupedResults);

      const totalGroups = sortedResults.length;
      const startIdx = (page - 1) * limit;
      const paginatedResults = sortedResults.slice(startIdx, startIdx + limit);

      if (includeLeads) {
        await this._attachLeadsToGroups(paginatedResults, leadsPage, leadsLimit);
      }

      const duration = Date.now() - startTime;
      this._logPerformance('groupClosedLeads', groupByField, duration, totalGroups);

      return {
        data: paginatedResults,
        meta: {
          groupBy: groupByField,
          totalGroups,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(totalGroups / limit),
          sortBy,
          sortOrder,
          duration,
        },
      };
    } catch (error) {
      logger.error('ClosedLeadGroupingService.groupClosedLeads error:', { groupByField, error: error.message });
      throw error;
    }
  }

  async getGroupDetails(groupByField, groupId, user, options = {}) {
    try {
      if (!CLOSED_LEAD_GROUPING_FIELDS[groupByField]) {
        throw new Error(`Invalid closed lead grouping field: ${groupByField}`);
      }

      const {
        page = 1,
        limit = 20,
        filters = [],
        search = '',
        sortBy = 'closed_at',
        sortOrder = 'desc',
      } = options;

      const baseQuery = this._buildBaseQuery(user, filters, search);
      const groupConfig = CLOSED_LEAD_GROUPING_FIELDS[groupByField];
      const strategy = this._getStrategy(groupConfig);
      const groups = await strategy.execute(groupConfig, baseQuery);

      const group = groups.find((g) => g.groupId && g.groupId.toString() === groupId.toString());
      if (!group) return { data: [], meta: { total: 0, page, limit } };

      const skip = (page - 1) * limit;
      const sortObj = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

      const leads = await ClosedLead.find({ _id: { $in: group.leadIds } })
        .populate('team_id', '_id name')
        .populate('user_id', '_id login role')
        .populate('source_id', '_id name price active color')
        .populate('closed_project_id', '_id name')
        .populate('closed_by_user_id', '_id login')
        .sort(sortObj)
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      return {
        data: leads,
        meta: {
          groupBy: groupByField,
          groupId,
          groupName: group.groupName,
          total: group.count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(group.count / limit),
        },
      };
    } catch (error) {
      logger.error('ClosedLeadGroupingService.getGroupDetails error:', { groupByField, groupId, error: error.message });
      throw error;
    }
  }

  async groupClosedLeadsMultilevel(fields, user, options = {}) {
    const startTime = Date.now();
    try {
      const validFields = fields.filter((f) => CLOSED_LEAD_GROUPING_FIELDS[f]);
      if (validFields.length === 0) throw new Error('No valid grouping fields provided');
      if (validFields.length > CLOSED_LEAD_PAGINATION_LIMITS.MAX_GROUPING_LEVELS) {
        throw new Error(`Maximum ${CLOSED_LEAD_PAGINATION_LIMITS.MAX_GROUPING_LEVELS} grouping levels allowed`);
      }

      const baseQuery = this._buildBaseQuery(user, options.filters, options.search);
      const builder = new ClosedLeadMultilevelGroupBuilder();
      const groups = await builder.buildMultilevelGroups(validFields, baseQuery, options);

      const duration = Date.now() - startTime;
      this._logPerformance('groupClosedLeadsMultilevel', validFields.join('/'), duration, groups.length);

      return {
        data: groups,
        meta: { groupBy: validFields, totalTopLevelGroups: groups.length, levels: validFields.length, duration },
      };
    } catch (error) {
      logger.error('ClosedLeadGroupingService.groupClosedLeadsMultilevel error:', { fields, error: error.message });
      throw error;
    }
  }

  async _attachLeadsToGroups(groups, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    for (const group of groups) {
      if (group.leadIds && group.leadIds.length > 0) {
        const leads = await ClosedLead.find({ _id: { $in: group.leadIds } })
          .populate('team_id', '_id name')
          .populate('user_id', '_id login role')
          .populate('source_id', '_id name price active color')
          .populate('closed_project_id', '_id name')
          .populate('closed_by_user_id', '_id login')
          .sort({ closed_at: -1 })
          .skip(skip)
          .limit(limit)
          .lean();
        group.leads = leads;
        group.leadsMeta = { page, limit, total: group.count, totalPages: Math.ceil(group.count / limit) };
      }
    }
  }

  getGroupingOptions(user) {
    const fields = { ...CLOSED_LEAD_GROUPING_FIELDS };
    if (user && user.role === 'agent') {
      delete fields.agent;
    }
    return Object.entries(fields).map(([key, config]) => ({
      field: key,
      label: getFieldDescription(key) || key,
      type: config.type,
    }));
  }

  getGroupingSummary() {
    return Object.entries(CLOSED_LEAD_GROUPING_FIELDS).map(([key, config]) => ({
      field: key,
      type: config.type,
      collection: config.collection || null,
    }));
  }

  getSortingOptions() {
    return Object.entries(CLOSED_LEAD_SORTING_OPTIONS).map(([key, config]) => ({
      field: key,
      description: config.description,
      type: config.type,
    }));
  }

  _logPerformance(method, context, duration, resultCount) {
    const level =
      duration < CLOSED_LEAD_PERFORMANCE_THRESHOLDS.FAST ? 'info' :
      duration < CLOSED_LEAD_PERFORMANCE_THRESHOLDS.MODERATE ? 'info' :
      duration < CLOSED_LEAD_PERFORMANCE_THRESHOLDS.SLOW ? 'warn' : 'error';
    logger[level](`[ClosedLeadGrouping] ${method} [${context}]: ${duration}ms, ${resultCount} results`);
  }
}

module.exports = new ClosedLeadGroupingService();
