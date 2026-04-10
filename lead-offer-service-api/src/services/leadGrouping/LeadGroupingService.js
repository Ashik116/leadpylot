/**
 * Lead Grouping Service (Refactored)
 * Main orchestrator for lead grouping operations using Strategy Pattern
 */

const mongoose = require('mongoose');
const { Lead, AssignLeads, Team, User, Source, Offer, Opening, Confirmation, PaymentVoucher } = require('../../models');
const { GROUPING_FIELDS, SORTING_OPTIONS, PAGINATION_LIMITS, PERFORMANCE_THRESHOLDS, AGENT_HIDDEN_FIELDS, ENTITY_RELATIONSHIP_FIELDS } = require('./config/groupingFields');
const { countLeadsInNestedStructure, getFieldDescription } = require('./utils/groupHelpers');
const { executeLeadQuery } = require('../leadService/queries');

// Strategies
const DirectFieldGroupingStrategy = require('./strategies/DirectFieldGroupingStrategy');
const ReferenceFieldGroupingStrategy = require('./strategies/ReferenceFieldGroupingStrategy');
const ComputedFieldGroupingStrategy = require('./strategies/ComputedFieldGroupingStrategy');
const ContextDateGroupingStrategy = require('./strategies/ContextDateGroupingStrategy');

// Builders
const GroupQueryBuilder = require('./builders/GroupQueryBuilder');
const GroupSorter = require('./builders/GroupSorter');
const MultilevelGroupBuilder = require('./builders/MultilevelGroupBuilder');

// Handlers
const EntityResponseHandler = require('./handlers/EntityResponseHandler');
const TodoFilterHandler = require('./handlers/TodoFilterHandler');

const logger = require('../../helpers/logger');

class LeadGroupingService {
  constructor() {
    this.strategies = new Map();
    this._registerStrategies();
    this.entityResponseHandler = new EntityResponseHandler();
  }

  /**
   * Register all grouping strategies
   * @private
   */
  _registerStrategies() {
    this.strategies.set('direct', new DirectFieldGroupingStrategy());
    this.strategies.set('reference', new ReferenceFieldGroupingStrategy());
    this.strategies.set('computed', new ComputedFieldGroupingStrategy());
    this.strategies.set('context_date', new ContextDateGroupingStrategy());
  }

  /**
   * Get appropriate strategy for field type
   * @private
   */
  _getStrategy(groupConfig) {
    for (const [type, strategy] of this.strategies) {
      if (strategy.canHandle(groupConfig)) {
        return strategy;
      }
    }
    throw new Error(`No strategy found for field type: ${groupConfig.type}`);
  }

  /**
   * Group leads by a specific field
   * @param {string} groupByField - Field to group by
   * @param {Object} user - User object for permissions
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Grouped results with metadata
   */
  async groupLeads(groupByField, user, options = {}) {
    const startTime = Date.now();

    try {
      // Validate grouping field
      if (!GROUPING_FIELDS[groupByField]) {
        throw new Error(`Invalid grouping field: ${groupByField}`);
      }

      const {
        page = PAGINATION_LIMITS.DEFAULT_PAGE,
        limit = PAGINATION_LIMITS.DEFAULT_LIMIT,
        filters = [],
        sortBy = 'count',
        sortOrder = 'desc',
        includeLeads = true,
        search = null,
      } = options;

      // Build base query using GroupQueryBuilder
      const queryBuilder = new GroupQueryBuilder(user);
      queryBuilder.withActiveFilter(filters);
      await queryBuilder.withUserPermissions(filters);
      queryBuilder.withSearchFilter(search);
      await queryBuilder.withDynamicFilters(filters);
      const baseQuery = queryBuilder.build();

      // Get grouping configuration and strategy
      const groupConfig = GROUPING_FIELDS[groupByField];
      const strategy = this._getStrategy(groupConfig);

      // Execute grouping strategy
      const groupedResults = await strategy.execute(groupConfig, baseQuery, user, options);

      // Sort results
      const sorter = new GroupSorter(sortBy, sortOrder, groupByField);
      const sortedResults = await sorter.sortGroups(groupedResults);

      // Apply pagination to groups
      const total = sortedResults.length;
      const paginatedResults = sortedResults.slice((page - 1) * limit, page * limit);

      // Fetch detailed lead data if requested
      if (includeLeads) {
        await this._attachLeadsToGroups(paginatedResults, user, options);
      }

      const executionTime = Date.now() - startTime;

      // Log performance metrics
      logger.info('Lead grouping performance', {
        groupByField,
        totalGroups: total,
        totalLeads: sortedResults.reduce((sum, group) => sum + group.count, 0),
        includeLeads,
        executionTime,
        userRole: user.role,
        performance: this._getPerformanceLevel(executionTime),
      });

      return {
        data: paginatedResults,
        meta: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
          groupByField,
          totalLeads: sortedResults.reduce((sum, group) => sum + group.count, 0),
          executionTime,
          includeLeads,
          performanceLevel: this._getPerformanceLevel(executionTime),
        },
      };
    } catch (error) {
      logger.error('Lead grouping error:', error);
      throw error;
    }
  }

  /**
   * Attach detailed lead data to groups
   * @private
   */
  async _attachLeadsToGroups(groups, user, options) {
    for (const group of groups) {
      if (group.leadIds && group.leadIds.length > 0) {
        const leadQuery = { _id: { $in: group.leadIds } };

        // Detect todo-related grouping
        const todoFilters = {
          has_todo: options.groupByField === 'has_todo',
          has_extra_todo: options.groupByField === 'has_extra_todo',
          has_assigned_todo: options.groupByField === 'has_assigned_todo',
        };

        const leadResult = await executeLeadQuery(
          user,
          leadQuery,
          1,
          group.leadIds.length,
          true,
          null,
          options.has_todo || todoFilters.has_todo,
          options.todo_scope || 'all',
          options.pending_todos || null,
          options.done_todos || null,
          'createdAt',
          'desc'
        );

        // Add filtered todos if needed
        if (todoFilters.has_extra_todo || todoFilters.has_assigned_todo) {
          const todoHandler = new TodoFilterHandler(user);
          group.leads = await todoHandler.addTodosToResults(leadResult.data, todoFilters);
        } else {
          group.leads = leadResult.data;
        }
      }
    }
  }

  /**
   * Get performance level based on execution time
   * @private
   */
  _getPerformanceLevel(executionTime) {
    if (executionTime < PERFORMANCE_THRESHOLDS.FAST) return 'fast';
    if (executionTime < PERFORMANCE_THRESHOLDS.MODERATE) return 'moderate';
    return 'slow';
  }

  /**
   * Group leads by multiple fields in a nested structure
   * @param {Array} groupingLevels - Array of field names to group by
   * @param {Object} user - User object for permissions
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Nested grouped results with metadata
   */
  async groupLeadsMultilevel(groupingLevels, user, options = {}) {
    const startTime = Date.now();

    try {
      // Validate grouping levels
      if (!Array.isArray(groupingLevels) || groupingLevels.length === 0) {
        throw new Error('Grouping levels must be a non-empty array');
      }

      if (groupingLevels.length > PAGINATION_LIMITS.MAX_GROUPING_LEVELS) {
        throw new Error(`Maximum ${PAGINATION_LIMITS.MAX_GROUPING_LEVELS} grouping levels allowed`);
      }

      // Validate each grouping field
      for (const field of groupingLevels) {
        if (!GROUPING_FIELDS[field]) {
          throw new Error(`Invalid grouping field: ${field}`);
        }
      }

      // Validate field combinations
      if (groupingLevels.includes('last_transfer') && groupingLevels.includes('agent')) {
        throw new Error('last_transfer grouping cannot be combined with agent grouping');
      }

      const {
        page = PAGINATION_LIMITS.DEFAULT_PAGE,
        limit = PAGINATION_LIMITS.DEFAULT_LIMIT,
        filters = [],
        sortBy = 'count',
        sortOrder = 'desc',
        includeLeads = false,
        search = null,
        partner_ids = null,
        baseQuery: providedBaseQuery = null, // Support for pre-built base query
      } = options;

      // Use provided baseQuery or build new one
      let baseQuery = providedBaseQuery;
      
      if (!baseQuery) {
        // Build base query using GroupQueryBuilder
        const queryBuilder = new GroupQueryBuilder(user);
        queryBuilder.withActiveFilter(filters);
        await queryBuilder.withUserPermissions(filters);
        queryBuilder.withSearchFilter(search);
        queryBuilder.withPartnerIds(partner_ids);
        await queryBuilder.withDynamicFilters(filters);
        baseQuery = queryBuilder.build();
      } else {
        // Merge user permissions with provided baseQuery if user is not Admin
        // EXCEPT when filtering by has_transferred_offer (agents should see transferred leads they don't own)
        const hasTransferredOfferFilter = filters.some(
          (filter) => filter && filter.field === 'has_transferred_offer' && (filter.value === true || filter.value === 'true')
        );
        
        if (user.role !== 'Admin' && !hasTransferredOfferFilter) {
          // Use aggregation to get assigned lead IDs
          const assignedResult = await AssignLeads.aggregate([
            { $match: { agent_id: user._id, status: 'active' } },
            { $group: { _id: '$lead_id' } },
            { $project: { _id: 1, lead_id: '$_id' } },
          ]);
          const assignedLeadIds = assignedResult.map((a) => a.lead_id);
          
          if (baseQuery._id && baseQuery._id.$in) {
            // Use aggregation to find intersection
            const intersectionResult = await Lead.aggregate([
              { $match: { _id: { $in: baseQuery._id.$in } } },
              { $match: { _id: { $in: assignedLeadIds } } },
              { $group: { _id: '$_id' } },
              { $project: { _id: 1 } },
            ]);
            baseQuery._id = intersectionResult.length > 0
              ? { $in: intersectionResult.map((item) => item._id) }
              : { $in: [] };
          } else {
            baseQuery._id = { $in: assignedLeadIds };
          }
        }
      }

      // Derive todo flags from filters
      const todoHandler = new TodoFilterHandler(user);
      const todoFlags = todoHandler.deriveTodoFlags(filters);

      // Detect entity type for count updates
      const entityType = this.entityResponseHandler.detectEntityType(filters);

      const mergedOptions = {
        ...options,
        includeLeads,
        ...todoFlags,
        filters, // Ensure filters are passed to MultilevelGroupBuilder
      };

      // Build multilevel groups
      const builder = new MultilevelGroupBuilder(groupingLevels, user, mergedOptions);
      const nestedResults = await builder.buildGroups(baseQuery);

      // Update counts based on entity type if entity context is detected
      // This ensures counts reflect actual entities (offers) not just leads
      if (entityType && entityType !== 'lead') {
        await this._updateGroupCountsForEntityType(nestedResults, entityType, user, filters, mergedOptions);
        // Filter out groups with 0 count after updating entity counts
        this._filterZeroCountGroups(nestedResults);
      }

      // Sort groups at ALL levels recursively (not just top level)
      const sortedResults = await this._sortNestedGroupsRecursively(
        nestedResults, 
        groupingLevels, 
        sortBy, 
        sortOrder
      );

      // Apply pagination
      const total = sortedResults.length;
      const paginatedResults = sortedResults.slice((page - 1) * limit, page * limit);

      const executionTime = Date.now() - startTime;
      const totalLeads = countLeadsInNestedStructure(nestedResults);

      logger.info('Multilevel lead grouping performance', {
        groupingLevels,
        totalGroups: total,
        totalLeads,
        includeLeads,
        executionTime,
        userRole: user.role,
        performance: this._getPerformanceLevel(executionTime),
      });

      // Build bulk search metadata if partner_ids were provided
      const bulkSearchMeta = partner_ids && partner_ids.length > 0
        ? await this._buildBulkSearchMetadata(baseQuery, partner_ids, totalLeads)
        : { isBulkSearch: false };

      return {
        data: paginatedResults,
        meta: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
          groupingLevels,
          totalLeads,
          executionTime,
          includeLeads,
          performanceLevel: this._getPerformanceLevel(executionTime),
          ...bulkSearchMeta,
        },
      };
    } catch (error) {
      logger.error('Multilevel lead grouping error:', error);
      throw error;
    }
  }

  /**
   * Build bulk search metadata
   * @private
   */
  async _buildBulkSearchMetadata(baseQuery, partner_ids, totalLeads) {
    // Use aggregation to get distinct partner IDs
    const foundPartnerResult = await Lead.aggregate([
      { $match: baseQuery },
      { $group: { _id: '$lead_source_no' } },
      { $project: { _id: 0, lead_source_no: '$_id' } },
    ]);
    const foundPartnerIds = foundPartnerResult.map((item) => item.lead_source_no);
    const missedPartnerIds = partner_ids.filter((id) => !foundPartnerIds.includes(id));

    return {
      isBulkSearch: true,
      bulkSearch: {
        searchedPartnerIds: partner_ids,
        totalSearched: partner_ids.length,
        foundPartnerIds,
        totalFound: foundPartnerIds.length,
        missedPartnerIds,
        totalMissed: missedPartnerIds.length,
        message: `Grouped ${totalLeads} leads from ${foundPartnerIds.length}/${partner_ids.length} partner IDs`,
      },
    };
  }

  /**
   * Get specific multilevel group details by path (drill-down)
   * OPTIMIZED: Uses direct query building instead of full grouping for better performance
   * @param {Array} groupingLevels - Array of field names
   * @param {Array} groupIds - Array of group IDs to drill down into
   * @param {Object} user - User object for permissions
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Specific group details with subgroups or leads
   */
  async getMultilevelGroupDetails(groupingLevels, groupIds, user, options = {}) {
    const startTime = Date.now();

    try {
      // Validate inputs
      if (!Array.isArray(groupingLevels) || groupingLevels.length === 0) {
        throw new Error('Grouping levels must be a non-empty array');
      }

      if (!Array.isArray(groupIds)) {
        throw new Error('Group IDs must be an array');
      }

      if (groupIds.length > groupingLevels.length) {
        throw new Error(`Group IDs path cannot be longer than grouping levels`);
      }

      // Validate each grouping field
      for (const field of groupingLevels) {
        if (!GROUPING_FIELDS[field]) {
          throw new Error(`Invalid grouping field: ${field}`);
        }
      }

      const {
        page = PAGINATION_LIMITS.DEFAULT_PAGE,
        limit = PAGINATION_LIMITS.DEFAULT_LIMIT,
        filters = [],
        sortBy = 'createdAt',
        sortOrder = 'desc',
        search = null,
        partner_ids = null,
      } = options;

      // Separate navigation filters from entity filters
      const entityType = this.entityResponseHandler.detectEntityType(filters);
      const navigationFilters = entityType
        ? filters.filter((f) => !this.entityResponseHandler.isEntityFilter(f.field))
        : filters;

      // OPTIMIZATION: Build base query first
      const queryBuilder = new GroupQueryBuilder(user);
      queryBuilder.withActiveFilter(filters);
      await queryBuilder.withUserPermissions(filters);
      queryBuilder.withSearchFilter(search);
      queryBuilder.withPartnerIds(partner_ids);
      await queryBuilder.withDynamicFilters(navigationFilters);
      const baseQuery = queryBuilder.build();

      const currentLevelIndex = groupIds.length;
      const isLastLevel = currentLevelIndex === groupingLevels.length;

      // OPTIMIZATION: For last level, build direct query instead of full grouping
      if (isLastLevel) {
        logger.info('Optimized path: Last level - building direct query', {
          groupingLevels,
          groupIds,
        });

        // Build query directly from group path
        const { query: directQuery, groupMetadata } = await this._buildQueryFromGroupPath(
          groupingLevels,
          groupIds,
          user,
          baseQuery
        );

        logger.info('Direct query built from group path:', {
          directQuery: JSON.stringify(directQuery, null, 2),
          directQueryKeys: Object.keys(directQuery),
          groupingLevels,
          groupIds,
          leadPriceCondition: directQuery.leadPrice,
        });
        
        // Verify the query can find leads
        let verifyCount = await Lead.countDocuments(directQuery);
        logger.info('Direct query verification:', {
          verifyCount,
          query: JSON.stringify(directQuery, null, 2),
        });
        
        // If count is 0, check if there's a leadPrice condition and try to fix it
        if (verifyCount === 0 && directQuery.leadPrice) {
          logger.warn('Direct query returned 0 leads but has leadPrice condition - attempting format fixes', {
            leadPriceCondition: directQuery.leadPrice,
            leadPriceType: typeof directQuery.leadPrice,
            fullQuery: JSON.stringify(directQuery, null, 2),
          });
          
          // Try to find a lead that matches baseQuery to see its leadPrice format
          const baseQueryCopy = { ...baseQuery };
          delete baseQueryCopy.leadPrice;
          const sampleLeadWithBaseQuery = await Lead.findOne(baseQueryCopy)
            .select('leadPrice')
            .lean();
          
          if (sampleLeadWithBaseQuery) {
            logger.info('Sample lead from baseQuery:', {
              leadPrice: sampleLeadWithBaseQuery.leadPrice,
              leadPriceType: typeof sampleLeadWithBaseQuery.leadPrice,
            });
          }
          
          // Try different formats for leadPrice
          const leadPriceValue = directQuery.leadPrice;
          const formatAttempts = [];
          
          // If it's an $in query, extract the values
          if (leadPriceValue && typeof leadPriceValue === 'object' && leadPriceValue.$in) {
            formatAttempts.push(...leadPriceValue.$in);
          } else {
            formatAttempts.push(leadPriceValue);
          }
          
          // Try all possible formats
          for (const attempt of formatAttempts) {
            // Try as string
            const strAttempt = String(attempt);
            const queryWithStr = { ...directQuery, leadPrice: strAttempt };
            const strCount = await Lead.countDocuments(queryWithStr);
            if (strCount > 0) {
              logger.info('Fixed query with string format:', {
                original: leadPriceValue,
                fixed: strAttempt,
                count: strCount,
              });
              directQuery.leadPrice = strAttempt;
              verifyCount = strCount;
              break;
            }
            
            // Try as number
            const numAttempt = Number(attempt);
            if (!isNaN(numAttempt)) {
              const queryWithNum = { ...directQuery, leadPrice: numAttempt };
              const numCount = await Lead.countDocuments(queryWithNum);
              if (numCount > 0) {
                logger.info('Fixed query with number format:', {
                  original: leadPriceValue,
                  fixed: numAttempt,
                  count: numCount,
                });
                directQuery.leadPrice = numAttempt;
                verifyCount = numCount;
                break;
              }
            }
          }
          
          // If still 0, try $in with all formats
          if (verifyCount === 0) {
            const allFormats = new Set();
            formatAttempts.forEach(v => {
              allFormats.add(v);
              allFormats.add(String(v));
              const num = Number(v);
              if (!isNaN(num)) allFormats.add(num);
            });
            
            const queryWithIn = { ...directQuery, leadPrice: { $in: Array.from(allFormats) } };
            const inCount = await Lead.countDocuments(queryWithIn);
            if (inCount > 0) {
              logger.info('Fixed query with $in all formats:', {
                original: leadPriceValue,
                fixed: { $in: Array.from(allFormats) },
                count: inCount,
              });
              directQuery.leadPrice = { $in: Array.from(allFormats) };
              verifyCount = inCount;
            }
          }
        }

        // Get current group metadata
        const currentGroupMeta = groupMetadata[groupMetadata.length - 1] || {
          groupId: groupIds[groupIds.length - 1],
          groupName: groupIds[groupIds.length - 1],
          field: groupingLevels[groupingLevels.length - 1],
        };

        // FALLBACK: If optimized query returns 0 leads, fall back to navigation approach
        // This handles cases where query building fails (e.g., format mismatches)
        if (verifyCount === 0) {
          logger.warn('Optimized query returned 0 leads, falling back to navigation approach', {
            groupingLevels,
            groupIds,
            directQuery: JSON.stringify(directQuery, null, 2),
          });
          
          // Use the old service approach: navigate through groups and use leadIds directly
          const fullResult = await this.groupLeadsMultilevel(groupingLevels, user, {
            page: 1,
            limit: 10000,
            filters: navigationFilters,
            search,
            partner_ids,
            includeLeads: false,
          });
          
          // Navigate to the specific group
          let currentLevel = fullResult.data;
          let currentGroup = null;
          
          for (let i = 0; i < groupIds.length; i++) {
            const groupId = groupIds[i];
            currentGroup = currentLevel.find((g) => {
              const gId = g.groupId ? g.groupId.toString() : g.groupId;
              return (
                gId === groupId ||
                g.groupName === groupId ||
                (groupId === 'null' && g.groupName === 'None')
              );
            });
            
            if (!currentGroup) {
              logger.error('Group not found in fallback navigation', {
                requestedGroupId: groupId,
                level: i + 1,
              });
              break;
            }
            
            if (i < groupIds.length - 1) {
              if (!currentGroup.subGroups) {
                logger.error('No subgroups found in fallback navigation', {
                  groupId,
                  level: i + 1,
                });
                break;
              }
              currentLevel = currentGroup.subGroups;
            }
          }
          
          // If we found the group with leadIds, use them directly
          if (currentGroup && currentGroup.leadIds && currentGroup.leadIds.length > 0) {
            logger.info('Fallback navigation successful, using leadIds directly', {
              leadIdsCount: currentGroup.leadIds.length,
              groupName: currentGroup.groupName,
            });
            
            // Use the leadIds directly instead of the query
            directQuery._id = { $in: currentGroup.leadIds };
            // Update metadata
            currentGroupMeta.groupId = currentGroup.groupId;
            currentGroupMeta.groupName = currentGroup.groupName;
            currentGroupMeta.reference = currentGroup.reference || null;
            
            // Update verifyCount
            verifyCount = currentGroup.leadIds.length;
          }
        }

        // Handle computed fields
        // Note: Computed field filters are already applied in _buildQueryFromGroupPath
        // So we don't need to apply them again here
        // The directQuery already has the correct _id filter from _buildQueryFromGroupPath

        // Apply entity filters if present
        if (filters.length > navigationFilters.length) {
          const entityFilters = filters.filter((f) => this.entityResponseHandler.isEntityFilter(f.field));
          if (entityFilters.length > 0) {
            const { applyDynamicFilters } = require('../dynamicFilterService');
            const entityFilterQuery = await applyDynamicFilters(entityFilters, user);
            const matchingLeads = await Lead.aggregate([
              { $match: { $and: [directQuery, entityFilterQuery.query] } },
              { $project: { _id: 1 } },
            ]);
            directQuery._id = { $in: matchingLeads.map((lead) => lead._id) };
          }
        }

        // Return final level data using optimized query
        return await this._getFinalLevelDataOptimized(
          directQuery,
          currentGroupMeta,
          entityType,
          groupingLevels,
          groupIds,
          user,
          options,
          filters,
          page,
          limit,
          sortBy,
          sortOrder,
          startTime
        );
      }

      // For intermediate levels, still need grouping but optimized
      // Build query up to current level
      const { query: pathQuery, groupMetadata } = await this._buildQueryFromGroupPath(
        groupingLevels.slice(0, currentLevelIndex),
        groupIds,
        user,
        baseQuery
      );

      const currentGroupMeta = groupMetadata[groupMetadata.length - 1] || {
        groupId: groupIds[groupIds.length - 1],
        groupName: groupIds[groupIds.length - 1],
        field: groupingLevels[currentLevelIndex - 1],
      };

      // Get only the next level grouping for this specific path
      const remainingLevels = groupingLevels.slice(currentLevelIndex);
      const subGroupsResult = await this.groupLeadsMultilevel(remainingLevels, user, {
        page: 1,
        limit: 10000,
        filters: navigationFilters,
        search,
        partner_ids,
        includeLeads: false,
        baseQuery: pathQuery,
      });

      const subGroups = subGroupsResult.data || [];

      // Sort subgroups
      const sorter = new GroupSorter(sortBy, sortOrder, groupingLevels[currentLevelIndex]);
      const sortedSubGroups = await sorter.sortGroups(subGroups);

      // Apply pagination
      const total = sortedSubGroups.length;
      const paginatedSubGroups = sortedSubGroups.slice((page - 1) * limit, page * limit);

      return {
        data: {
          group: this._formatGroupInfo(currentGroupMeta, groupIds, currentLevelIndex),
          subGroups: paginatedSubGroups,
        },
        meta: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
          groupingLevels,
          groupPath: groupIds,
          currentLevel: currentLevelIndex,
          nextLevel: groupingLevels[currentLevelIndex],
          isLastLevel: false,
          executionTime: Date.now() - startTime,
        },
      };
    } catch (error) {
      logger.error('Multilevel group details error:', error);
      throw error;
    }
  }

  /**
   * Navigate to specific group by path
   * @private
   */
  _navigateToGroup(groups, groupIds) {
    let currentLevel = groups;
    let currentGroup = null;

    for (let i = 0; i < groupIds.length; i++) {
      const groupId = groupIds[i];

      currentGroup = currentLevel.find((g) => {
        const gId = g.groupId ? g.groupId.toString() : g.groupId;
        return (
          gId === groupId ||
          g.groupName === groupId ||
          (groupId === 'null' && g.groupName === 'None')
        );
      });

      if (!currentGroup) {
        const availableGroups = currentLevel.map((g) => ({
          id: g.groupId ? g.groupId.toString() : g.groupId,
          name: g.groupName,
        }));
        throw new Error(
          `Group not found at level ${i + 1}: ${groupId}. Available: ${availableGroups.map((g) => g.name).join(', ')}`
        );
      }

      if (i < groupIds.length - 1) {
        if (!currentGroup.subGroups) {
          throw new Error(`No subgroups found for group ${groupId} at level ${i + 1}`);
        }
        currentLevel = currentGroup.subGroups;
      }
    }

    return currentGroup;
  }

  /**
   * Get final level data (leads or entities)
   * @private
   */
  async _getFinalLevelData(
    currentGroup,
    entityType,
    groupingLevels,
    groupIds,
    user,
    options,
    filters,
    page,
    limit,
    sortBy,
    sortOrder,
    startTime
  ) {
    let filteredLeadIds = currentGroup.leadIds || [];

    // Apply entity filters if present
    if (entityType && filters.length > 0) {
      const entityFilters = filters.filter((f) => this.entityResponseHandler.isEntityFilter(f.field));
      if (entityFilters.length > 0) {
        const { applyDynamicFilters } = require('../dynamicFilterService');
        const entityFilterQuery = await applyDynamicFilters(entityFilters, user);

        const matchingLeads = await Lead.find({
          $and: [{ _id: { $in: filteredLeadIds } }, entityFilterQuery.query],
        }).select('_id').lean();

        filteredLeadIds = matchingLeads.map((lead) => lead._id);
      }
    }

    // Return entity-specific response if applicable
    if (entityType && entityType !== 'lead') {
      const entityResults = await this.entityResponseHandler.getEntityResponse(
        entityType,
        filteredLeadIds,
        user,
        page,
        limit,
        options
      );

      const responseKey =
        entityType === 'offer' ? 'offers' :
        entityType === 'opening' ? 'openings' :
        entityType === 'confirmation' ? 'confirmations' :
        entityType === 'payment' ? 'payments' :
        entityType === 'netto' ? 'nettos' : 'offers';

      return {
        data: {
          group: this._formatGroupInfo(currentGroup, groupIds, groupIds.length),
          [responseKey]: entityResults.data,
        },
        meta: {
          ...entityResults.meta,
          groupingLevels,
          groupPath: groupIds,
          currentLevel: groupIds.length,
          isLastLevel: true,
          executionTime: Date.now() - startTime,
          entityType,
        },
      };
    }

    // Default: return leads
    const leadQuery = { _id: { $in: filteredLeadIds } };
    const todoHandler = new TodoFilterHandler(user);
    const todoFilters = todoHandler.deriveTodoFlags(filters);

    const leadResult = await executeLeadQuery(
      user,
      leadQuery,
      page,
      limit,
      true,
      null,
      options.has_todo || todoFilters.has_todo || null,
      options.todo_scope || 'all',
      options.pending_todos || todoFilters.pending_todos || null,
      options.done_todos || todoFilters.done_todos || null,
      sortBy,
      sortOrder
    );

    let finalLeads = leadResult.data;
    if (todoFilters.has_extra_todo || todoFilters.has_assigned_todo) {
      finalLeads = await todoHandler.addTodosToResults(leadResult.data, todoFilters);
    }

    return {
      data: {
        group: this._formatGroupInfo(currentGroup, groupIds, groupIds.length),
        leads: finalLeads,
      },
      meta: {
        ...leadResult.meta,
        groupingLevels,
        groupPath: groupIds,
        currentLevel: groupIds.length,
        isLastLevel: true,
        executionTime: Date.now() - startTime,
      },
    };
  }

  /**
   * Get subgroups data
   * @private
   */
  async _getSubGroupsData(
    currentGroup,
    groupingLevels,
    groupIds,
    page,
    limit,
    sortBy,
    sortOrder,
    startTime
  ) {
    const subGroups = currentGroup.subGroups || [];
    const currentLevelIndex = groupIds.length;

    // Sort subgroups
    const sorter = new GroupSorter(sortBy, sortOrder, groupingLevels[currentLevelIndex]);
    const sortedSubGroups = await sorter.sortGroups(subGroups);

    // Apply pagination
    const total = sortedSubGroups.length;
    const paginatedSubGroups = sortedSubGroups.slice((page - 1) * limit, page * limit);

    return {
      data: {
        group: this._formatGroupInfo(currentGroup, groupIds, currentLevelIndex),
        subGroups: paginatedSubGroups,
      },
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
        groupingLevels,
        groupPath: groupIds,
        currentLevel: currentLevelIndex,
        nextLevel: groupingLevels[currentLevelIndex],
        isLastLevel: false,
        executionTime: Date.now() - startTime,
      },
    };
  }

  /**
   * Format group info for response
   * @private
   */
  _formatGroupInfo(group, groupIds, level) {
    return {
      groupId: group.groupId,
      groupName: group.groupName,
      count: group.count,
      reference: group.reference,
      path: groupIds,
      level,
    };
  }

  /**
   * Build a MongoDB query directly from group path (optimized for details endpoint)
   * Uses aggregation pipelines and batch queries for better performance
   * @private
   */
  async _buildQueryFromGroupPath(groupingLevels, groupIds, user, baseQuery) {
    const query = { ...baseQuery };
    const groupMetadata = [];
    const metadataPromises = [];
    const metadataIndices = [];

    // Process each level in the path
    for (let i = 0; i < groupIds.length; i++) {
      const field = groupingLevels[i];
      const groupId = groupIds[i];
      const fieldConfig = GROUPING_FIELDS[field];

      if (!fieldConfig) {
        throw new Error(`Invalid grouping field: ${field}`);
      }

      const isNoneGroup = groupId === 'null' || groupId === null;

      switch (fieldConfig.type) {
        case 'reference':
          if (field === 'project') {
            if (!isNoneGroup) {
              const projectId = mongoose.Types.ObjectId.isValid(groupId)
                ? new mongoose.Types.ObjectId(groupId)
                : groupId;
              
              const leadIds = await AssignLeads.aggregate([
                { $match: { project_id: projectId, status: 'active' } },
                { $group: { _id: '$lead_id' } },
                { $project: { _id: 0, lead_id: '$_id' } },
              ]);
              
              const leadIdArray = leadIds.map((item) => item.lead_id);
              
              if (query._id && query._id.$in) {
                // Use aggregation to find intersection
                const intersectionResult = await Lead.aggregate([
                  { $match: { _id: { $in: query._id.$in } } },
                  { $match: { _id: { $in: leadIdArray } } },
                  { $group: { _id: '$_id' } },
                  { $project: { _id: 1 } },
                ]);
                query._id = intersectionResult.length > 0
                  ? { $in: intersectionResult.map((item) => item._id) }
                  : { $in: [] };
              } else {
                // **FIX: Check if there are other query constraints (e.g., source_id) before setting _id**
                // If there are other filters, apply them first to get matching lead IDs, then intersect
                const hasOtherFilters = Object.keys(query).length > 0 && !query._id;
                
                if (hasOtherFilters) {
                  // Apply existing query constraints first
                  const filteredLeads = await Lead.find(query).select('_id').lean();
                  const filteredLeadIds = filteredLeads.map((l) => l._id);
                  
                  // Now intersect with project lead IDs
                  const intersectionResult = await Lead.aggregate([
                    { $match: { _id: { $in: filteredLeadIds } } },
                    { $match: { _id: { $in: leadIdArray } } },
                    { $group: { _id: '$_id' } },
                    { $project: { _id: 1 } },
                  ]);
                  query._id = intersectionResult.length > 0
                    ? { $in: intersectionResult.map((item) => item._id) }
                    : { $in: [] };
                  
                  // Remove other filters since we've already applied them via _id
                  const keysToRemove = Object.keys(query).filter((k) => k !== '_id');
                  keysToRemove.forEach((k) => delete query[k]);
                } else {
                  query._id = { $in: leadIdArray };
                }
              }

              metadataIndices.push(i);
              metadataPromises.push(Team.findById(groupId).select('name').lean());
            } else {
              if (query._id && query._id.$in) {
                // Use aggregation to find unassigned leads
                const unassignedResult = await AssignLeads.aggregate([
                  { $match: { lead_id: { $in: query._id.$in }, status: 'active' } },
                  { $group: { _id: '$lead_id' } },
                  { $project: { _id: 1, lead_id: '$_id' } },
                ]);
                const assignedSet = new Set(unassignedResult.map((item) => item.lead_id.toString()));
                const unassigned = query._id.$in.filter((id) => !assignedSet.has(id.toString()));
                query._id = unassigned.length > 0 ? { $in: unassigned } : { $in: [] };
              }
              groupMetadata.push({ groupId: this._generateNoneGroupId(field, i), groupName: 'None', field });
            }
          } else if (field === 'agent') {
            if (!isNoneGroup) {
              const agentId = mongoose.Types.ObjectId.isValid(groupId)
                ? new mongoose.Types.ObjectId(groupId)
                : groupId;
              
              const leadIds = await AssignLeads.aggregate([
                { $match: { agent_id: agentId, status: 'active' } },
                { $group: { _id: '$lead_id' } },
                { $project: { _id: 0, lead_id: '$_id' } },
              ]);
              
              const leadIdArray = leadIds.map((item) => item.lead_id);
              
              if (query._id && query._id.$in) {
                // Use aggregation to find intersection
                const intersectionResult = await Lead.aggregate([
                  { $match: { _id: { $in: query._id.$in } } },
                  { $match: { _id: { $in: leadIdArray } } },
                  { $group: { _id: '$_id' } },
                  { $project: { _id: 1 } },
                ]);
                query._id = intersectionResult.length > 0
                  ? { $in: intersectionResult.map((item) => item._id) }
                  : { $in: [] };
              } else {
                // **FIX: Check if there are other query constraints (e.g., source_id) before setting _id**
                // If there are other filters, apply them first to get matching lead IDs, then intersect
                const hasOtherFilters = Object.keys(query).length > 0 && !query._id;
                
                if (hasOtherFilters) {
                  // Apply existing query constraints first
                  const filteredLeads = await Lead.find(query).select('_id').lean();
                  const filteredLeadIds = filteredLeads.map((l) => l._id);
                  
                  // Now intersect with agent lead IDs
                  const intersectionResult = await Lead.aggregate([
                    { $match: { _id: { $in: filteredLeadIds } } },
                    { $match: { _id: { $in: leadIdArray } } },
                    { $group: { _id: '$_id' } },
                    { $project: { _id: 1 } },
                  ]);
                  query._id = intersectionResult.length > 0
                    ? { $in: intersectionResult.map((item) => item._id) }
                    : { $in: [] };
                  
                  // Remove other filters since we've already applied them via _id
                  const keysToRemove = Object.keys(query).filter((k) => k !== '_id');
                  keysToRemove.forEach((k) => delete query[k]);
                } else {
                  query._id = { $in: leadIdArray };
                }
              }

              metadataIndices.push(i);
              metadataPromises.push(User.findById(groupId).select('login first_name last_name').lean());
            } else {
              if (query._id && query._id.$in) {
                // Use aggregation to find unassigned leads
                const unassignedResult = await AssignLeads.aggregate([
                  { $match: { lead_id: { $in: query._id.$in }, status: 'active' } },
                  { $group: { _id: '$lead_id' } },
                  { $project: { _id: 1, lead_id: '$_id' } },
                ]);
                const assignedSet = new Set(unassignedResult.map((item) => item.lead_id.toString()));
                const unassigned = query._id.$in.filter((id) => !assignedSet.has(id.toString()));
                query._id = unassigned.length > 0 ? { $in: unassigned } : { $in: [] };
              }
              groupMetadata.push({ groupId: this._generateNoneGroupId(field, i), groupName: 'None', field });
            }
          } else if (field === 'source') {
            if (!isNoneGroup) {
              const sourceId = mongoose.Types.ObjectId.isValid(groupId)
                ? new mongoose.Types.ObjectId(groupId)
                : groupId;
              
              // **FIX: If query._id is already set (e.g., from project filtering), 
              // we need to filter those IDs by source_id instead of just setting source_id**
              if (query._id && query._id.$in) {
                // Filter existing lead IDs by source
                const sourceFilteredLeads = await Lead.find({
                  _id: { $in: query._id.$in },
                  source_id: sourceId
                }).select('_id').lean();
                
                query._id = sourceFilteredLeads.length > 0
                  ? { $in: sourceFilteredLeads.map((l) => l._id) }
                  : { $in: [] };
              } else {
                // No existing _id filter, so just set source_id
                query.source_id = sourceId;
              }
            } else {
              // Handle null/none source
              if (query._id && query._id.$in) {
                // Filter existing lead IDs by null source
                const sourceFilteredLeads = await Lead.find({
                  _id: { $in: query._id.$in },
                  source_id: null
                }).select('_id').lean();
                
                query._id = sourceFilteredLeads.length > 0
                  ? { $in: sourceFilteredLeads.map((l) => l._id) }
                  : { $in: [] };
              } else {
                query.source_id = null;
              }
            }

            if (!isNoneGroup) {
              metadataIndices.push(i);
              metadataPromises.push(Source.findById(groupId).select('name').lean());
            } else {
              groupMetadata.push({ groupId: this._generateNoneGroupId(field, i), groupName: 'None', field });
            }
          }
          break;

        case 'string':
        case 'number':
        case 'boolean':
          if (isNoneGroup) {
            query[fieldConfig.field] = null;
            // Also handle status_id for status field
            if (field === 'status') {
              query.status_id = null;
            } else if (field === 'stage') {
              query.stage_id = null;
            }
          } else {
            if (fieldConfig.type === 'number') {
              if (mongoose.Types.ObjectId.isValid(groupId) && groupId.length === 24) {
                // This is a generated ID, not the raw number. Reverse-lookup.
                const { generateNoneGroupId, formatValue } = require('./utils/groupHelpers');
            
                // Fetch distinct numeric values for this field from DB
                // First try with baseQuery (respecting filters), then try without filters if needed
                const lookupQuery = { ...baseQuery };
                delete lookupQuery[fieldConfig.field];
                
                let distinctValues = await Lead.distinct(fieldConfig.field, lookupQuery);
                
                // If no distinct values found (maybe filters are too restrictive), try with minimal filters
                if (distinctValues.length === 0) {
                  logger.debug(`[leadPrice reverse lookup] No distinct values with baseQuery, trying with active filter only`, {
                    baseQuery: JSON.stringify(baseQuery),
                  });
                  distinctValues = await Lead.distinct(fieldConfig.field, { active: true });
                }
                logger.debug(`[leadPrice reverse lookup] Found ${distinctValues.length} distinct values for ${field}`, {
                  groupId,
                  field,
                  level: i,
                  distinctSample: distinctValues.slice(0, 10),
                });
                
                let matchedValue = null;
                let sampleLeads = []; // Initialize for logging purposes
                
                // Try different level values (0, i) since grouping might use level 0
                const levelsToTry = [0, i].filter((l, idx, arr) => arr.indexOf(l) === idx);
            
                for (const level of levelsToTry) {
                  for (const val of distinctValues) {
                    if (val == null) continue;
              
                    // Convert both string and numeric representations
                    const valStr = val.toString();
                    const seedStr = `${field}_${valStr}`;
                    const seedNum = `${field}_${parseFloat(valStr)}`;
                    const idFromStr = generateNoneGroupId(seedStr, level);
                    const idFromNum = generateNoneGroupId(seedNum, level);
              
                    if (
                      idFromStr.toString() === groupId ||
                      idFromNum.toString() === groupId
                    ) {
                      matchedValue = val;
                      logger.info(`[leadPrice reverse lookup] Found match at level ${level}:`, {
                        value: val,
                        type: typeof val,
                        seedStr,
                        seedNum,
                        idFromStr: idFromStr.toString(),
                        idFromNum: idFromNum.toString(),
                        targetGroupId: groupId,
                      });
                      break;
                    }
                  }
                  if (matchedValue != null) break;
                }
                
                // Log first few attempts if no match found
                if (matchedValue == null && distinctValues.length > 0) {
                  logger.debug(`[leadPrice reverse lookup] No match found, sample attempts:`, {
                    groupId,
                    sampleValues: distinctValues.slice(0, 3).map(v => {
                      const vStr = v.toString();
                      const idStr = generateNoneGroupId(`${field}_${vStr}`, levelsToTry[0]);
                      const idNum = generateNoneGroupId(`${field}_${parseFloat(vStr)}`, levelsToTry[0]);
                      return {
                        value: v,
                        type: typeof v,
                        idFromStr: idStr.toString(),
                        idFromNum: idNum.toString(),
                      };
                    }),
                  });
                }
                
                // If not found in distinct, query actual leads
                if (matchedValue == null) {
                  logger.warn(`[leadPrice reverse lookup] Not found in distinct, querying leads`, {
                    distinctCount: distinctValues.length,
                    groupId,
                    field,
                  });
                  
                  sampleLeads = await Lead.find(lookupQuery)
                    .select(fieldConfig.field)
                    .lean()
                    .limit(10000);
                  
                  const testedValues = new Set();
                  for (const lead of sampleLeads) {
                    const val = lead[fieldConfig.field];
                    if (val == null || val === '') continue;
                    
                    const valKey = `${typeof val}_${val}`;
                    if (testedValues.has(valKey)) continue;
                    testedValues.add(valKey);
                    
                    for (const level of levelsToTry) {
                      const valStr = val.toString();
                      const idFromStr = generateNoneGroupId(`${field}_${valStr}`, level);
                      const idFromNum = generateNoneGroupId(`${field}_${parseFloat(valStr)}`, level);
                      
                      if (
                        idFromStr.toString() === groupId ||
                        idFromNum.toString() === groupId
                      ) {
                        matchedValue = val;
                        logger.debug(`[leadPrice reverse lookup] Found match in leads at level ${level}:`, {
                          value: val,
                          type: typeof val,
                        });
                        break;
                      }
                    }
                    if (matchedValue != null) break;
                  }
                }
            
                if (matchedValue != null) {
                  // Support both string and numeric stored formats
                  // Preserve the exact type found in database, but also include conversions
                  const queryValues = [];
                  
                  // Add the original value (preserves exact type - string or number)
                  queryValues.push(matchedValue);
                  
                  // Add string representation (if different)
                  const strValue = String(matchedValue);
                  if (strValue !== matchedValue) {
                    queryValues.push(strValue);
                  }
                  
                  // Add parsed number if it's a valid number (if different)
                  const numValue = typeof matchedValue === 'number' ? matchedValue : Number(matchedValue);
                  if (!isNaN(numValue) && isFinite(numValue)) {
                    if (numValue !== matchedValue && String(numValue) !== strValue) {
                      queryValues.push(numValue);
                    }
                    // Also add stringified number (if different from strValue)
                    const numStr = String(numValue);
                    if (numStr !== strValue && numStr !== String(matchedValue)) {
                      queryValues.push(numStr);
                    }
                  }
                  
                  // Remove duplicates by converting to Set and back, but preserve types
                  const uniqueValues = [];
                  const seen = new Set();
                  for (const val of queryValues) {
                    const key = `${typeof val}_${val}`;
                    if (!seen.has(key)) {
                      seen.add(key);
                      uniqueValues.push(val);
                    }
                  }
                  
                  // Try multiple query strategies to ensure we match the data
                  let bestQuery = null;
                  let bestCount = 0;
                  
                  // Strategy 1: Exact matched value with baseQuery
                  const simpleQuery = { ...baseQuery };
                  delete simpleQuery[fieldConfig.field];
                  simpleQuery[fieldConfig.field] = matchedValue;
                  const simpleCount = await Lead.countDocuments(simpleQuery);
                  
                  if (simpleCount > bestCount) {
                    bestCount = simpleCount;
                    bestQuery = matchedValue;
                  }
                  
                  logger.info(`[leadPrice fix] Strategy 1 - Exact match with baseQuery:`, {
                    simpleCount,
                    matchedValue,
                    matchedValueType: typeof matchedValue,
                    simpleQuery: JSON.stringify(simpleQuery, null, 2),
                  });
                  
                  // Strategy 2: $in with all formats and baseQuery
                  const inQuery = { ...baseQuery };
                  delete inQuery[fieldConfig.field];
                  inQuery[fieldConfig.field] = { $in: uniqueValues };
                  const inCount = await Lead.countDocuments(inQuery);
                  
                  if (inCount > bestCount) {
                    bestCount = inCount;
                    bestQuery = { $in: uniqueValues };
                  }
                  
                  logger.info(`[leadPrice fix] Strategy 2 - $in with baseQuery:`, {
                    inCount,
                    uniqueValues,
                    valueTypes: uniqueValues.map(v => typeof v),
                    inQuery: JSON.stringify(inQuery, null, 2),
                  });
                  
                  // Strategy 3: Try without baseQuery filters (just active and the field)
                  // This helps if baseQuery filters are too restrictive
                  const noBaseQuery = { active: true, [fieldConfig.field]: matchedValue };
                  const noBaseCount = await Lead.countDocuments(noBaseQuery);
                  
                  if (noBaseCount > bestCount) {
                    logger.warn(`[leadPrice fix] Strategy 3 found more leads without baseQuery filters:`, {
                      noBaseCount,
                      matchedValue,
                      matchedValueType: typeof matchedValue,
                    });
                  }
                  
                  // Strategy 4: Query a sample lead to see actual stored format
                  // This helps identify format mismatches
                  if (bestCount === 0 && noBaseCount > 0) {
                    const sampleLead = await Lead.findOne(noBaseQuery)
                      .select(fieldConfig.field)
                      .lean();
                    
                    if (sampleLead && sampleLead[fieldConfig.field] !== undefined) {
                      const actualStoredValue = sampleLead[fieldConfig.field];
                      const actualStoredType = typeof actualStoredValue;
                      
                      logger.info(`[leadPrice fix] Strategy 4 - Found sample lead with actual format:`, {
                        actualStoredValue,
                        actualStoredType,
                        matchedValue,
                        matchedValueType: typeof matchedValue,
                        valuesMatch: actualStoredValue == matchedValue, // Loose equality
                        valuesStrictMatch: actualStoredValue === matchedValue, // Strict equality
                      });
                      
                      // Try querying with the actual stored format
                      const actualFormatQuery = { ...baseQuery };
                      delete actualFormatQuery[fieldConfig.field];
                      actualFormatQuery[fieldConfig.field] = actualStoredValue;
                      const actualFormatCount = await Lead.countDocuments(actualFormatQuery);
                      
                      if (actualFormatCount > bestCount) {
                        bestCount = actualFormatCount;
                        bestQuery = actualStoredValue;
                        logger.info(`[leadPrice fix] Strategy 4 found ${actualFormatCount} leads with actual stored format`);
                      }
                    }
                  }
                  
                  // Use the best query strategy
                  if (bestQuery !== null) {
                    query[fieldConfig.field] = bestQuery;
                    logger.info(`[leadPrice fix] Using best query strategy (${bestCount} leads found):`, {
                      queryValue: query[fieldConfig.field],
                      bestCount,
                    });
                  } else {
                    // Fallback: use $in
                    query[fieldConfig.field] = { $in: uniqueValues };
                    logger.warn(`[leadPrice fix] All strategies returned 0, using $in as fallback:`, {
                      uniqueValues,
                    });
                  }
                  
                  // Additional diagnostic: If still no results, check actual format
                  const finalTestQuery = { ...baseQuery };
                  delete finalTestQuery[fieldConfig.field];
                  finalTestQuery[fieldConfig.field] = query[fieldConfig.field];
                  const finalTestCount = await Lead.countDocuments(finalTestQuery);
                  
                  if (finalTestCount === 0) {
                    // Try to find one lead with this leadPrice value to see how it's stored
                    const sampleQuery = { active: true, [fieldConfig.field]: { $exists: true } };
                    const sampleLead = await Lead.findOne(sampleQuery)
                      .select(fieldConfig.field)
                      .lean();
                    
                    if (sampleLead) {
                      logger.warn(`[leadPrice fix] Sample lead found but final query returned 0`, {
                        sampleLeadPrice: sampleLead[fieldConfig.field],
                        sampleLeadPriceType: typeof sampleLead[fieldConfig.field],
                        uniqueValues: uniqueValues,
                        matchedValue: matchedValue,
                        matchedValueType: typeof matchedValue,
                        finalQuery: JSON.stringify(finalTestQuery, null, 2),
                      });
                      
                      // Try with exact match to see what works
                      const exactMatchQuery = { ...baseQuery };
                      delete exactMatchQuery[fieldConfig.field];
                      exactMatchQuery[fieldConfig.field] = sampleLead[fieldConfig.field];
                      const exactMatchCount = await Lead.countDocuments(exactMatchQuery);
                      logger.info(`[leadPrice fix] Exact match test with sample lead value:`, {
                        exactMatchCount,
                        exactMatchValue: sampleLead[fieldConfig.field],
                        exactMatchType: typeof sampleLead[fieldConfig.field],
                        exactMatchQuery: JSON.stringify(exactMatchQuery, null, 2),
                      });
                    }
                  }
                  
                  groupMetadata[i] = {
                    groupId,
                    groupName: formatValue(matchedValue, 'number'),
                    field,
                  };
                } else {
                  // Last resort: query all active leads without baseQuery filters
                  logger.warn(`[leadPrice reverse lookup] Trying unfiltered query as last resort`, {
                    distinctCount: distinctValues.length,
                    sampleCount: sampleLeads?.length || 0,
                    groupId,
                    field,
                  });
                  
                  const unfilteredLeads = await Lead.find({ active: true })
                    .select(fieldConfig.field)
                    .lean()
                    .limit(20000);
                  
                  const testedValues = new Set();
                  for (const lead of unfilteredLeads) {
                    const val = lead[fieldConfig.field];
                    if (val == null || val === '') continue;
                    
                    const valKey = `${typeof val}_${val}`;
                    if (testedValues.has(valKey)) continue;
                    testedValues.add(valKey);
                    
                    for (const level of levelsToTry) {
                      const valStr = val.toString();
                      const idFromStr = generateNoneGroupId(`${field}_${valStr}`, level);
                      const idFromNum = generateNoneGroupId(`${field}_${parseFloat(valStr)}`, level);
                      
                      if (
                        idFromStr.toString() === groupId ||
                        idFromNum.toString() === groupId
                      ) {
                        matchedValue = val;
                        logger.info(`[leadPrice reverse lookup] Found match in unfiltered query at level ${level}:`, {
                          value: val,
                          type: typeof val,
                        });
                        break;
                      }
                    }
                    if (matchedValue != null) break;
                  }
                  
                  if (matchedValue != null) {
                    // Support both string and numeric stored formats
                    const queryValuesSet = new Set();
                    queryValuesSet.add(matchedValue);
                    queryValuesSet.add(String(matchedValue));
                    const numValue = typeof matchedValue === 'number' ? matchedValue : Number(matchedValue);
                    if (!isNaN(numValue) && isFinite(numValue)) {
                      queryValuesSet.add(numValue);
                      queryValuesSet.add(String(numValue));
                    }
                    
                    const queryValues = Array.from(queryValuesSet);
                    query[fieldConfig.field] = { $in: queryValues };
                    
                    logger.info(`[leadPrice fix] matched groupId=${groupId} -> value=${matchedValue} (type: ${typeof matchedValue})`, {
                      queryValues,
                      field: fieldConfig.field,
                    });
                    
                    const testQuery = { ...baseQuery };
                    delete testQuery[fieldConfig.field];
                    testQuery[fieldConfig.field] = query[fieldConfig.field];
                    
                    const testCount = await Lead.countDocuments(testQuery);
                    logger.info(`[leadPrice fix] Test query count with baseQuery:`, {
                      testCount,
                      testQuery: JSON.stringify(testQuery, null, 2),
                      baseQueryKeys: Object.keys(baseQuery),
                    });
                    
                    groupMetadata[i] = {
                      groupId,
                      groupName: formatValue(matchedValue, 'number'),
                      field,
                    };
                  } else {
                    logger.error(`[leadPrice fix] Could not decode groupId ${groupId} for field ${field}`, {
                      distinctValuesCount: distinctValues.length,
                      unfilteredCount: unfilteredLeads.length,
                      distinctSample: distinctValues.slice(0, 5),
                    });
                    throw new Error(`Cannot determine numeric value from groupId ${groupId} for field ${field}. Tried ${distinctValues.length} distinct values and ${unfilteredLeads.length} leads.`);
                  }
                }
              } else {
                // The groupId itself is numeric — simple case
                const parsed = parseFloat(groupId);
                if (!isNaN(parsed)) {
                  query[fieldConfig.field] = { $in: [parsed, parsed.toString()] };
                  const { formatValue } = require('./utils/groupHelpers');
                  groupMetadata[i] = { groupId, groupName: formatValue(parsed, 'number'), field };
                } else {
                  query[fieldConfig.field] = groupId;
                  groupMetadata[i] = { groupId, groupName: groupId, field };
                }
              }
            }
            
             else if (fieldConfig.type === 'boolean') {
              query[fieldConfig.field] = groupId === 'true';
            } else {
              // For status/stage, handle both ObjectId (status_id) and string (status) formats
              if (field === 'status' || field === 'stage') {
                const idField = field === 'status' ? 'status_id' : 'stage_id';
                
                // Check if groupId is a valid ObjectId
                if (mongoose.Types.ObjectId.isValid(groupId)) {
                  // CRITICAL FIX: First, try to reverse-engineer if this is a deterministic ID from a string value
                  // Many leads have status/stage stored as strings (e.g., "Angebot", "Positiv")
                  // These generate deterministic IDs that look like ObjectIds
                  const { generateNoneGroupId } = require('./utils/groupHelpers');
                  
                  // Get distinct status/stage values from the database
                  const lookupQuery = { ...baseQuery };
                  delete lookupQuery[fieldConfig.field];
                  delete lookupQuery[idField];
                  
                  let distinctValues = await Lead.distinct(fieldConfig.field, lookupQuery);
                  
                  logger.info(`_buildQueryFromGroupPath: Attempting reverse-engineering for ${field}`, {
                    groupId,
                    distinctValuesCount: distinctValues.length,
                    distinctSample: distinctValues.slice(0, 10),
                  });
                  
                  // Try to match the groupId with generated IDs from distinct values
                  let matchedValue = null;
                  for (const value of distinctValues) {
                    if (value !== null && value !== undefined && value !== '' && typeof value === 'string') {
                      // Try different levels (0, i, 1, 2) since grouping might use different levels
                      for (const level of [0, i, 1, 2]) {
                        const generatedId = generateNoneGroupId(`${field}_${value}`, level);
                        if (generatedId.toString() === groupId) {
                          matchedValue = value;
                          logger.info(`_buildQueryFromGroupPath: ✅ Reverse-engineered ${field} groupId`, {
                            groupId,
                            matchedValue,
                            level,
                            field,
                          });
                          break;
                        }
                      }
                      if (matchedValue) break;
                    }
                  }
                  
                  // If we found a matching string value, use it
                  if (matchedValue) {
                    if (Object.keys(query).length > 0 && !query.$and) {
                      const existingConditions = Object.keys(query).map(key => ({ [key]: query[key] }));
                      query.$and = [...existingConditions, { [fieldConfig.field]: matchedValue }];
                      Object.keys(query).forEach(key => {
                        if (key !== '$and') delete query[key];
                      });
                    } else if (query.$and) {
                      query.$and.push({ [fieldConfig.field]: matchedValue });
                    } else {
                      query[fieldConfig.field] = matchedValue;
                    }
                    groupMetadata.push({
                      groupId: groupId,
                      groupName: matchedValue,
                      field,
                    });
                    break; // Exit the switch case - we're done with this field
                  }
                  
                  // Not a string-based deterministic ID, treat as real ObjectId from Settings
                  logger.info(`_buildQueryFromGroupPath: No string match found, treating as ObjectId from Settings`, {
                    groupId,
                    field,
                  });
                  
                  const statusId = new mongoose.Types.ObjectId(groupId);
                  
                  // Try to find status name from Settings using aggregation pipeline
                  let statusName = null;
                  try {
                    const Settings = require('../../models/Settings');
                    
                    if (field === 'stage') {
                      // For stage, use aggregation with $match
                      const stageResult = await Settings.aggregate([
                        { $match: { _id: statusId } },
                        { $project: { name: 1 } },
                      ]);
                      if (stageResult.length > 0) {
                        statusName = stageResult[0].name;
                      }
                    } else {
                      // For status, use aggregation with $unwind to find status in nested array
                      const statusResult = await Settings.aggregate([
                        { $match: { type: 'stage' } },
                        { $unwind: { path: '$info.statuses', preserveNullAndEmptyArrays: false } },
                        { $match: {
                          $or: [
                            { 'info.statuses._id': statusId },
                            { 'info.statuses.id': statusId.toString() },
                          ],
                        }},
                        { $project: { statusName: '$info.statuses.name' } },
                        { $limit: 1 },
                      ]);
                      if (statusResult.length > 0) {
                        statusName = statusResult[0].statusName;
                      }
                    }
                    
                    if (statusName) {
                      // Found status name - query by both status_id and status name
                      const statusConditions = [
                        { [idField]: statusId },
                        { [fieldConfig.field]: statusName },
                      ];
                      
                      // Merge with existing query properly
                      const statusQuery = { $or: statusConditions };
                      
                      if (Object.keys(query).length > 0 && !query.$and) {
                        // Convert existing query to $and format
                        const existingConditions = Object.keys(query).map(key => ({ [key]: query[key] }));
                        query.$and = [...existingConditions, statusQuery];
                        Object.keys(query).forEach(key => {
                          if (key !== '$and') delete query[key];
                        });
                      } else if (query.$and) {
                        query.$and.push(statusQuery);
                      } else {
                        query.$and = [statusQuery];
                      }
                      
                      groupMetadata.push({
                        groupId: groupId,
                        groupName: statusName,
                        field,
                      });
                    } else {
                      // Not found - query by status_id directly
                      if (Object.keys(query).length > 0 && !query.$and) {
                        const existingConditions = Object.keys(query).map(key => ({ [key]: query[key] }));
                        query.$and = [...existingConditions, { [idField]: statusId }];
                        Object.keys(query).forEach(key => {
                          if (key !== '$and') delete query[key];
                        });
                      } else if (query.$and) {
                        query.$and.push({ [idField]: statusId });
                      } else {
                        query[idField] = statusId;
                      }
                      groupMetadata.push({
                        groupId: groupId,
                        groupName: groupId,
                        field,
                      });
                    }
                  } catch (error) {
                    // Error finding status - just query by status_id
                    logger.warn('Error finding status name', { error: error.message, field, groupId });
                    if (Object.keys(query).length > 0 && !query.$and) {
                      const existingConditions = Object.keys(query).map(key => ({ [key]: query[key] }));
                      query.$and = [...existingConditions, { [idField]: statusId }];
                      Object.keys(query).forEach(key => {
                        if (key !== '$and') delete query[key];
                      });
                    } else if (query.$and) {
                      query.$and.push({ [idField]: statusId });
                    } else {
                      query[idField] = statusId;
                    }
                    groupMetadata.push({
                      groupId: groupId,
                      groupName: groupId,
                      field,
                    });
                  }
                } else {
                  // Not an ObjectId, treat as string value (status name)
                  if (Object.keys(query).length > 0 && !query.$and) {
                    const existingConditions = Object.keys(query).map(key => ({ [key]: query[key] }));
                    query.$and = [...existingConditions, { [fieldConfig.field]: groupId }];
                    Object.keys(query).forEach(key => {
                      if (key !== '$and') delete query[key];
                    });
                  } else if (query.$and) {
                    query.$and.push({ [fieldConfig.field]: groupId });
                  } else {
                    query[fieldConfig.field] = groupId;
                  }
                  groupMetadata.push({
                    groupId: groupId,
                    groupName: groupId,
                    field,
                  });
                }
              } else {
                // Regular string field - also needs reverse-engineering for deterministic IDs
                // Check if groupId looks like a deterministic ID (24 char hex) vs actual string value
                if (mongoose.Types.ObjectId.isValid(groupId) && groupId.length === 24) {
                  // Might be a deterministic ID, try reverse-engineering
                  const { generateNoneGroupId } = require('./utils/groupHelpers');
                  
                  const lookupQuery = { ...baseQuery };
                  delete lookupQuery[fieldConfig.field];
                  
                  let distinctValues = await Lead.distinct(fieldConfig.field, lookupQuery);
                  
                  logger.info(`_buildQueryFromGroupPath: Attempting reverse-engineering for string field ${field}`, {
                    groupId,
                    distinctValuesCount: distinctValues.length,
                    distinctSample: distinctValues.slice(0, 10),
                  });
                  
                  let matchedValue = null;
                  for (const value of distinctValues) {
                    if (value !== null && value !== undefined && value !== '') {
                      const valueStr = String(value);
                      // Try different levels (0, i, 1, 2)
                      for (const level of [0, i, 1, 2]) {
                        const generatedId = generateNoneGroupId(`${field}_${valueStr}`, level);
                        if (generatedId.toString() === groupId) {
                          matchedValue = valueStr;
                          logger.info(`_buildQueryFromGroupPath: ✅ Reverse-engineered string field ${field}`, {
                            groupId,
                            matchedValue,
                            level,
                          });
                          break;
                        }
                      }
                      if (matchedValue) break;
                    }
                  }
                  
                  if (matchedValue) {
                    // Found the original value
                    if (Object.keys(query).length > 0 && !query.$and) {
                      const existingConditions = Object.keys(query).map(key => ({ [key]: query[key] }));
                      query.$and = [...existingConditions, { [fieldConfig.field]: matchedValue }];
                      Object.keys(query).forEach(key => {
                        if (key !== '$and') delete query[key];
                      });
                    } else if (query.$and) {
                      query.$and.push({ [fieldConfig.field]: matchedValue });
                    } else {
                      query[fieldConfig.field] = matchedValue;
                    }
                    groupMetadata.push({
                      groupId: groupId,
                      groupName: matchedValue,
                      field,
                    });
                    break; // Exit switch case
                  }
                  
                  // If no match found, treat groupId as literal value
                  logger.warn(`_buildQueryFromGroupPath: Could not reverse-engineer ${field}, using groupId as literal`, {
                    groupId,
                    field,
                  });
                }
                
                // Use groupId as literal string value
                if (Object.keys(query).length > 0 && !query.$and) {
                  const existingConditions = Object.keys(query).map(key => ({ [key]: query[key] }));
                  query.$and = [...existingConditions, { [fieldConfig.field]: groupId }];
                  Object.keys(query).forEach(key => {
                    if (key !== '$and') delete query[key];
                  });
                } else if (query.$and) {
                  query.$and.push({ [fieldConfig.field]: groupId });
                } else {
                  query[fieldConfig.field] = groupId;
                }
                groupMetadata.push({
                  groupId: groupId,
                  groupName: groupId,
                  field,
                });
              }
            }
          }
          break;

        case 'date':
        case 'context_date':
          // Date fields use deterministic IDs based on date strings (YYYY-MM-DD format)
          // Need to reverse-engineer the groupId back to the date value
          if (!isNoneGroup) {
            const { generateNoneGroupId } = require('./utils/groupHelpers');
            
            // Get distinct date values for this field
            const lookupQuery = { ...baseQuery };
            delete lookupQuery[fieldConfig.field];
            
            let distinctDates = await Lead.distinct(fieldConfig.field, lookupQuery);
            
            logger.info(`_buildQueryFromGroupPath: Attempting reverse-engineering for date field ${field}`, {
              groupId,
              distinctDatesCount: distinctDates.length,
              distinctSample: distinctDates.slice(0, 10).map(d => d ? new Date(d).toISOString() : null),
            });
            
            let matchedDate = null;
            for (const dateValue of distinctDates) {
              if (dateValue) {
                // Convert date to YYYY-MM-DD format
                const dateStr = new Date(dateValue).toISOString().split('T')[0];
                
                // Try different levels (0, i, 1, 2)
                for (const level of [0, i, 1, 2]) {
                  const generatedId = generateNoneGroupId(`${field}_${dateStr}`, level);
                  if (generatedId.toString() === groupId) {
                    matchedDate = dateStr;
                    logger.info(`_buildQueryFromGroupPath: ✅ Reverse-engineered date field ${field}`, {
                      groupId,
                      matchedDate,
                      level,
                    });
                    break;
                  }
                }
                if (matchedDate) break;
              }
            }
            
            if (matchedDate) {
              // Build query to match all dates on that day (regardless of time)
              const startOfDay = new Date(matchedDate);
              startOfDay.setUTCHours(0, 0, 0, 0);
              const endOfDay = new Date(matchedDate);
              endOfDay.setUTCHours(23, 59, 59, 999);
              
              const dateQuery = {
                [fieldConfig.field]: {
                  $gte: startOfDay,
                  $lte: endOfDay,
                },
              };
              
              // Apply the date filter
              if (Object.keys(query).length > 0 && !query.$and) {
                const existingConditions = Object.keys(query).map(key => ({ [key]: query[key] }));
                query.$and = [...existingConditions, dateQuery];
                Object.keys(query).forEach(key => {
                  if (key !== '$and') delete query[key];
                });
              } else if (query.$and) {
                query.$and.push(dateQuery);
              } else {
                Object.assign(query, dateQuery);
              }
              
              groupMetadata.push({
                groupId: groupId,
                groupName: matchedDate,
                field,
              });
            } else {
              logger.warn(`_buildQueryFromGroupPath: Could not reverse-engineer date field ${field}`, {
                groupId,
                distinctDatesCount: distinctDates.length,
              });
              // Set empty result if we can't match
              query._id = { $in: [] };
              groupMetadata.push({
                groupId: groupId,
                groupName: 'Unknown Date',
                field,
              });
            }
          } else {
            // Handle null/none dates
            query[fieldConfig.field] = null;
            groupMetadata.push({
              groupId: this._generateNoneGroupId(field, i),
              groupName: 'None',
              field,
            });
          }
          break;

        case 'computed':
          // Reverse-lookup the groupId to determine if it's "true" or "false"
          // The groupId is generated from `${field}_true` or `${field}_false`
          const { generateNoneGroupId } = require('./utils/groupHelpers');
          let computedValue = null;
          
          // Try different levels (0, i) since grouping might use level 0
          const levelsToTry = [0, i].filter((l, idx, arr) => arr.indexOf(l) === idx);
          
          for (const level of levelsToTry) {
            const idForTrue = generateNoneGroupId(`${field}_true`, level);
            const idForFalse = generateNoneGroupId(`${field}_false`, level);
            
            if (idForTrue.toString() === groupId) {
              computedValue = 'true';
              break;
            } else if (idForFalse.toString() === groupId) {
              computedValue = 'false';
              break;
            }
          }
          
          if (computedValue !== null) {
            logger.info('_buildQueryFromGroupPath: Applying computed field filter', {
              field,
              computedValue,
              groupId,
              queryBefore: JSON.stringify(query, null, 2),
            });
            
            // Apply the computed field filter
            await this._applyComputedFieldFilter(query, field, computedValue);
            
            logger.info('_buildQueryFromGroupPath: After computed field filter', {
              field,
              computedValue,
              queryAfter: JSON.stringify(query, null, 2),
              leadCount: query._id?.$in ? query._id.$in.length : 0,
            });
            
            groupMetadata.push({
              groupId: groupId,
              groupName: computedValue === 'true' ? 'Yes' : 'No',
              field,
            });
          } else {
            logger.warn(`Could not reverse-lookup computed field groupId for ${field}`, {
              groupId,
              field,
              levelsTried: levelsToTry,
            });
            // Fallback: try to apply filter with groupId as-is (might be "true" or "false" string)
            if (groupId === 'true' || groupId === 'false') {
              await this._applyComputedFieldFilter(query, field, groupId);
              groupMetadata.push({
                groupId: groupId,
                groupName: groupId === 'true' ? 'Yes' : 'No',
                field,
              });
            } else {
              // If we can't determine, set empty result
              query._id = { $in: [] };
              groupMetadata.push({
                groupId: groupId,
                groupName: 'Unknown',
                field,
              });
            }
          }
          break;

        default:
          groupMetadata.push({
            groupId: isNoneGroup ? this._generateNoneGroupId(field, i) : groupId,
            groupName: isNoneGroup ? 'None' : groupId,
            field,
          });
      }
    }

    // **POST-PROCESSING FIX: If query._id is set AND there are other field filters,
    // apply those filters to the _id array to get the final intersection**
    // This handles cases like project→source, project→stage, etc.
    if (query._id && query._id.$in) {
      const otherFilters = Object.keys(query).filter(k => k !== '_id');
      
      if (otherFilters.length > 0) {
        // Build a filter query with all non-_id fields
        const filterQuery = { _id: { $in: query._id.$in } };
        otherFilters.forEach(key => {
          filterQuery[key] = query[key];
        });
        
        // Apply the combined filter
        const filteredLeads = await Lead.find(filterQuery).select('_id').lean();
        query._id = filteredLeads.length > 0
          ? { $in: filteredLeads.map((l) => l._id) }
          : { $in: [] };
        
        // Remove the other filters since they're now applied via _id
        otherFilters.forEach(key => delete query[key]);
        
        logger.info('_buildQueryFromGroupPath: Applied post-processing filter intersection', {
          otherFiltersApplied: otherFilters,
          finalLeadCount: filteredLeads.length,
        });
      }
    }

    // Execute all metadata lookups in parallel
    if (metadataPromises.length > 0) {
      const metadataResults = await Promise.all(metadataPromises);
      
      for (let j = 0; j < metadataIndices.length; j++) {
        const index = metadataIndices[j];
        const field = groupingLevels[index];
        const groupId = groupIds[index];
        const result = metadataResults[j];
        
        if (field === 'project' && result) {
          groupMetadata[index] = { groupId: groupId, groupName: result.name || groupId, field };
        } else if (field === 'agent' && result) {
          const agentName = result.first_name || result.last_name
            ? `${result.first_name || ''} ${result.last_name || ''}`.trim()
            : result.login;
          groupMetadata[index] = { groupId: groupId, groupName: agentName || groupId, field };
        } else if (field === 'source' && result) {
          groupMetadata[index] = { groupId: groupId, groupName: result.name || groupId, field };
        }
      }
    }

    return { query, groupMetadata };
  }

  /**
   * Apply computed field filter (has_offer, has_opening, etc.)
   * @private
   */
  async _applyComputedFieldFilter(query, field, groupId) {
    logger.debug('_applyComputedFieldFilter called', {
      field,
      groupId,
      queryKeys: Object.keys(query),
      queryHasId: !!query._id,
      queryIdIn: query._id?.$in ? query._id.$in.length : 0,
    });
    
    // For computed fields, we need to work with the base query without _id filter
    // The _id filter will be set at the end based on the computed field results
    const baseQuery = { ...query };
    delete baseQuery._id;
    
    logger.debug('_applyComputedFieldFilter: baseQuery without _id', {
      field,
      groupId,
      baseQueryKeys: Object.keys(baseQuery),
      baseQuery: JSON.stringify(baseQuery, null, 2),
    });
    
    // Get lead IDs using aggregation with baseQuery (without _id filter)
    const matchingLeads = await Lead.aggregate([
      { $match: baseQuery },
      { $project: { _id: 1 } },
    ]);
    
    const leadIdArray = matchingLeads.map((l) => l._id);
    
    logger.debug('_applyComputedFieldFilter: matching leads found', {
      field,
      groupId,
      matchingCount: leadIdArray.length,
      sampleIds: leadIdArray.slice(0, 5).map(id => id.toString()),
    });
    
    if (leadIdArray.length === 0) {
      query._id = { $in: [] };
      logger.warn('_applyComputedFieldFilter: No matching leads found', {
        field,
        groupId,
        originalQuery: JSON.stringify(query, null, 2),
      });
      return;
    }

    let filteredLeadIds = [];

    if (field === 'has_offer') {
      // Use aggregation to find leads with offers
      const leadIdsWithOffers = await Offer.aggregate([
        { $match: { lead_id: { $in: leadIdArray }, active: true } },
        { $group: { _id: '$lead_id' } },
        { $project: { _id: 1, lead_id: '$_id' } },
      ]);
      
      if (groupId === 'true') {
        filteredLeadIds = leadIdsWithOffers.map((item) => item.lead_id);
      } else if (groupId === 'false') {
        // Find leads without offers using aggregation
        const leadsWithoutOffers = await Lead.aggregate([
          { $match: { _id: { $in: leadIdArray } } },
          { $lookup: {
            from: 'offers',
            let: { leadId: '$_id' },
            pipeline: [
              { $match: { $expr: { $and: [{ $eq: ['$lead_id', '$$leadId'] }, { $eq: ['$active', true] }] } } },
            ],
            as: 'offers',
          }},
          { $match: { offers: { $size: 0 } } },
          { $project: { _id: 1 } },
        ]);
        filteredLeadIds = leadsWithoutOffers.map((item) => item._id);
      }
    } else if (field === 'has_opening') {
      // Use aggregation with $lookup to find leads with openings
      const leadsWithOpenings = await Offer.aggregate([
        { $match: { lead_id: { $in: leadIdArray }, active: true } },
        { $lookup: {
          from: 'openings',
          localField: '_id',
          foreignField: 'offer_id',
          as: 'openings',
          pipeline: [{ $match: { active: true } }],
        }},
        { $match: { 'openings.0': { $exists: true } } },
        { $group: { _id: '$lead_id' } },
        { $project: { _id: 1, lead_id: '$_id' } },
      ]);
      
      if (groupId === 'true') {
        filteredLeadIds = leadsWithOpenings.map((item) => item.lead_id);
      } else if (groupId === 'false') {
        // Find leads without openings
        const allLeadIdsSet = new Set(leadIdArray.map((id) => id.toString()));
        const withOpeningsSet = new Set(leadsWithOpenings.map((item) => item.lead_id.toString()));
        filteredLeadIds = leadIdArray.filter((id) => !withOpeningsSet.has(id.toString()));
      }
    } else if (field === 'has_netto') {
      // Get leads with Netto1/Netto2 status from lead.status field
      // Status is stored as a string in the database
      const leadsWithNettoStatus = await Lead.find({
        _id: { $in: leadIdArray },
        status: { $in: ['Netto1', 'Netto2'] },
      })
        .select('_id')
        .lean();
      
      const nettoStatusLeadIds = new Set(leadsWithNettoStatus.map((l) => l._id.toString()));

      // Also check for Netto1/Netto2 records via offers (existing logic)
      const ProgressPipelineBuilder = require('../offerService/builders/ProgressPipelineBuilder');
      const { PROGRESS_FILTERS } = require('../offerService/config/constants');
      
      const pipeline = new ProgressPipelineBuilder()
        .addMatch({ lead_id: { $in: leadIdArray, $ne: null }, active: true })
        .addProgressLookups()
        .addProgressFields()
        .addMatch(PROGRESS_FILTERS.netto)
        .build();

      pipeline.push({ $project: { lead_id: 1 } });

      const offers = await Offer.aggregate(pipeline);
      const nettoRecordLeadIds = new Set(offers.map((o) => o.lead_id.toString()));

      // Combine both: leads with Netto status OR leads with Netto records
      const allNettoLeadIds = new Set([...nettoStatusLeadIds, ...nettoRecordLeadIds]);
      
      logger.debug('_applyComputedFieldFilter has_netto: results', {
        groupId,
        nettoStatusCount: nettoStatusLeadIds.size,
        nettoRecordCount: nettoRecordLeadIds.size,
        allNettoCount: allNettoLeadIds.size,
        totalInputLeads: leadIdArray.length,
      });
      
      if (groupId === 'true') {
        filteredLeadIds = Array.from(allNettoLeadIds).map((id) => new mongoose.Types.ObjectId(id));
        logger.info('_applyComputedFieldFilter has_netto=true: filtered leads', {
          count: filteredLeadIds.length,
          sampleIds: filteredLeadIds.slice(0, 5).map(id => id.toString()),
        });
      } else if (groupId === 'false') {
        // Find leads without netto
        const allLeadIdsSet = new Set(leadIdArray.map((id) => id.toString()));
        filteredLeadIds = leadIdArray.filter((id) => !allNettoLeadIds.has(id.toString()));
        logger.info('_applyComputedFieldFilter has_netto=false: filtered leads', {
          count: filteredLeadIds.length,
        });
      }
    }

    query._id = filteredLeadIds.length > 0 ? { $in: filteredLeadIds } : { $in: [] };
    
    logger.debug('_applyComputedFieldFilter: final query', {
      field,
      groupId,
      finalLeadCount: filteredLeadIds.length,
      queryIdIn: query._id.$in ? query._id.$in.length : 0,
    });
  }

  /**
   * Get final level data using optimized query (for large datasets)
   * @private
   */
  async _getFinalLevelDataOptimized(
    directQuery,
    currentGroupMeta,
    entityType,
    groupingLevels,
    groupIds,
    user,
    options,
    filters,
    page,
    limit,
    sortBy,
    sortOrder,
    startTime
  ) {
    // Check if we should use optimized path
    const hasTodoFilters = (filters || []).some(
      (f) => f && ['has_todo', 'has_extra_todo', 'has_assigned_todo', 'pending_todos', 'done_todos'].includes(f.field)
    );

    // Handle entity responses first
    if (entityType && entityType !== 'lead') {
      let leadIds = [];
      
      // Extract leadIds from directQuery
      if (directQuery._id && directQuery._id.$in) {
        leadIds = Array.isArray(directQuery._id.$in) ? directQuery._id.$in : [];
      }
      
      // If no leadIds from directQuery, try to get them by querying leads
      // This can happen when has_transferred_offer is used and the query structure is different
      if (leadIds.length === 0 && directQuery && Object.keys(directQuery).length > 0) {
        
        logger.debug('_getFinalLevelDataOptimized: Querying leads with directQuery', {
          directQuery: JSON.stringify(directQuery),
          directQueryKeys: Object.keys(directQuery),
        });
        const matchingLeads = await Lead.find(directQuery).select('_id').lean();
        leadIds = matchingLeads.map(l => l._id);
        logger.info('_getFinalLevelDataOptimized: Extracted leadIds from directQuery', {
          leadIdsCount: leadIds.length,
          directQueryKeys: Object.keys(directQuery),
          sampleQuery: JSON.stringify(directQuery),
        });
      }
      
      logger.info('_getFinalLevelDataOptimized: Entity response', {
        entityType,
        leadIdsCount: leadIds.length,
        hasDirectQueryId: !!(directQuery._id && directQuery._id.$in),
        directQueryKeys: Object.keys(directQuery),
      });
      
      // Pass filters and userId in options for entity response (needed for has_transferred_offer)
      const entityOptions = {
        ...options,
        filters,
        userId: user._id,
      };
      
      const entityResults = await this.entityResponseHandler.getEntityResponse(
        entityType,
        leadIds,
        user,
        page,
        limit,
        entityOptions
      );

      const responseKey =
        entityType === 'offer' ? 'offers' :
        entityType === 'opening' ? 'openings' :
        entityType === 'confirmation' ? 'confirmations' :
        entityType === 'payment' ? 'payments' :
        entityType === 'netto' ? 'nettos' : 'offers';

      const groupInfo = {
        groupId: currentGroupMeta.groupId,
        groupName: currentGroupMeta.groupName,
        count: entityResults.meta.total,
        reference: currentGroupMeta.reference || null,
        path: groupIds,
        level: groupIds.length,
      };

      return {
        data: {
          group: groupInfo,
          [responseKey]: entityResults.data,
        },
        meta: {
          ...entityResults.meta,
          groupingLevels,
          groupPath: groupIds,
          currentLevel: groupIds.length,
          isLastLevel: true,
          executionTime: Date.now() - startTime,
          entityType,
        },
      };
    }

    // Use optimized path for large datasets without todo filters
    if (!hasTodoFilters && parseInt(limit) >= 1000) {
      logger.debug('_getFinalLevelDataOptimized: Using aggregation pipeline', {
        directQuery: JSON.stringify(directQuery),
        directQueryKeys: Object.keys(directQuery),
      });
      
      const pipeline = [
        { $match: directQuery },
        { $sort: { [sortBy]: sortOrder === 'asc' ? 1 : -1 } },
        { $skip: (parseInt(page) - 1) * parseInt(limit) },
        { $limit: parseInt(limit) },
      ];

      // Test the query first
      const testCount = await Lead.countDocuments(directQuery);
      logger.info('_getFinalLevelDataOptimized: Query test before aggregation', {
        testCount,
        directQuery: JSON.stringify(directQuery, null, 2),
        pipelineMatch: JSON.stringify(pipeline[0].$match, null, 2),
      });
      
      const [totalResult, leads] = await Promise.all([
        Lead.countDocuments(directQuery),
        Lead.aggregate(pipeline),
      ]);
      
      logger.info('_getFinalLevelDataOptimized: Aggregation results', {
        totalResult,
        leadsCount: leads.length,
        directQuery: JSON.stringify(directQuery, null, 2),
      });

      const leadIds = leads.map((l) => l._id);
      
      const Favourite = require('../../models/Favourite');
      
      // Use aggregation with $lookup instead of populate for better performance
      const [assignmentsResult, offersResult, favouritesResult] = await Promise.all([
        AssignLeads.aggregate([
          { $match: { lead_id: { $in: leadIds }, status: 'active' } },
          {
            $lookup: {
              from: 'teams',
              localField: 'project_id',
              foreignField: '_id',
              as: 'project',
              pipeline: [{ $project: { _id: 1, name: 1 } }],
            },
          },
          {
            $lookup: {
              from: 'users',
              localField: 'agent_id',
              foreignField: '_id',
              as: 'agent',
              pipeline: [{ $project: { _id: 1, login: 1, first_name: 1, last_name: 1 } }],
            },
          },
          {
            $project: {
              lead_id: 1,
              project: { $arrayElemAt: ['$project', 0] },
              agent: { $arrayElemAt: ['$agent', 0] },
              assigned_at: 1,
            },
          },
        ]),
        Offer.aggregate([
          { $match: { lead_id: { $in: leadIds }, active: true } },
          { $project: { lead_id: 1, status: 1, createdAt: 1 } },
        ]),
        user._id ? Favourite.aggregate([
          { $match: { lead_id: { $in: leadIds }, user_id: user._id, active: true } },
          { $project: { lead_id: 1 } },
        ]) : Promise.resolve([]),
      ]);

      // Build maps using aggregation $group results
      const assignmentMap = new Map();
      assignmentsResult.forEach((a) => {
        const leadId = a.lead_id.toString();
        if (!assignmentMap.has(leadId)) assignmentMap.set(leadId, []);
        assignmentMap.get(leadId).push({
          project: a.project ? { _id: a.project._id, name: a.project.name } : null,
          agent: a.agent ? {
            _id: a.agent._id,
            login: a.agent.login,
            name: `${a.agent.first_name || ''} ${a.agent.last_name || ''}`.trim() || a.agent.login,
          } : null,
          assigned_at: a.assigned_at,
        });
      });

      const offerMap = new Map();
      offersResult.forEach((o) => {
        const leadId = o.lead_id.toString();
        if (!offerMap.has(leadId)) offerMap.set(leadId, []);
        offerMap.get(leadId).push({ _id: o._id, status: o.status, createdAt: o.createdAt });
      });

      const favouriteSet = new Set(favouritesResult.map((f) => f.lead_id.toString()));

      const finalLeads = leads.map((lead) => {
        const leadIdStr = lead._id.toString();
        return {
          ...lead,
          assignments: assignmentMap.get(leadIdStr) || [],
          offers: offerMap.get(leadIdStr) || [],
          is_favourite: favouriteSet.has(leadIdStr),
          todoCount: 0,
        };
      });

      // Format group info - ensure count is included
      const groupInfo = {
        groupId: currentGroupMeta.groupId,
        groupName: currentGroupMeta.groupName,
        count: totalResult,
        reference: currentGroupMeta.reference || null,
        path: groupIds,
        level: groupIds.length,
      };

      return {
        data: {
          group: groupInfo,
          leads: finalLeads,
        },
        meta: {
          total: totalResult,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(totalResult / parseInt(limit)),
          groupingLevels,
          groupPath: groupIds,
          currentLevel: groupIds.length,
          isLastLevel: true,
          executionTime: Date.now() - startTime,
        },
      };
    }

    // Fallback to standard path for smaller datasets or when todo filters are present
    const leadQuery = directQuery._id && directQuery._id.$in ? { _id: directQuery._id } : directQuery;
    const todoHandler = new TodoFilterHandler(user);
    const todoFilters = todoHandler.deriveTodoFlags(filters);

    const leadResult = await executeLeadQuery(
      user,
      leadQuery,
      page,
      limit,
      true,
      null,
      options.has_todo || todoFilters.has_todo || null,
      options.todo_scope || 'all',
      options.pending_todos || todoFilters.pending_todos || null,
      options.done_todos || todoFilters.done_todos || null,
      sortBy,
      sortOrder
    );

    let finalLeads = leadResult.data;
    if (todoFilters.has_extra_todo || todoFilters.has_assigned_todo) {
      finalLeads = await todoHandler.addTodosToResults(leadResult.data, todoFilters);
    }

    // Format group info - ensure count is included
    const groupInfo = {
      groupId: currentGroupMeta.groupId,
      groupName: currentGroupMeta.groupName,
      count: leadResult.meta.total,
      reference: currentGroupMeta.reference || null,
      path: groupIds,
      level: groupIds.length,
    };

    return {
      data: {
        group: groupInfo,
        leads: finalLeads,
      },
      meta: {
        ...leadResult.meta,
        groupingLevels,
        groupPath: groupIds,
        currentLevel: groupIds.length,
        isLastLevel: true,
        executionTime: Date.now() - startTime,
      },
    };
  }

  /**
   * Update group counts to reflect actual entity counts instead of lead counts
   * @private
   */
  async _updateGroupCountsForEntityType(groups, entityType, user, filters, options) {
    for (const group of groups) {
      if (group.subGroups) {
        // Recursively update subgroups
        await this._updateGroupCountsForEntityType(group.subGroups, entityType, user, filters, options);
        // Update parent count to sum of subgroup counts
        group.count = group.subGroups.reduce((sum, subGroup) => sum + (subGroup.count || 0), 0);
      } else {
        // Last level - count actual entities
        const leadIds = group.leadIds || (group.leads ? group.leads.map(l => l._id) : []);
        
        if (leadIds.length > 0) {
          const entityOptions = {
            ...options,
            filters,
            userId: user._id,
          };
          
          try {
            const entityResults = await this.entityResponseHandler.getEntityResponse(
              entityType,
              leadIds,
              user,
              1,
              1, // Just need count, not data
              entityOptions
            );
            
            // Update count to reflect actual entity count
            group.count = entityResults.meta.total || 0;
          } catch (error) {
            logger.error('Error updating group count for entity type', {
              entityType,
              groupId: group.groupId,
              error: error.message,
            });
            // If counting fails, set to 0 to avoid showing incorrect count
            group.count = 0;
          }
        } else {
          group.count = 0;
        }
      }
    }
  }

  /**
   * Filter out groups with 0 count (recursive)
   * @private
   */
  _filterZeroCountGroups(groups) {
    const filtered = [];
    
    for (const group of groups) {
      if (group.subGroups) {
        // Recursively filter subgroups
        this._filterZeroCountGroups(group.subGroups);
        // Recalculate count after filtering subgroups
        group.count = group.subGroups.reduce((sum, subGroup) => sum + (subGroup.count || 0), 0);
        
        // Only include if count > 0 or has subgroups
        if (group.count > 0 || (group.subGroups && group.subGroups.length > 0)) {
          filtered.push(group);
        }
      } else {
        // Last level - only include if count > 0
        if (group.count > 0) {
          filtered.push(group);
        }
      }
    }
    
    // Replace original array with filtered results
    groups.length = 0;
    groups.push(...filtered);
  }

  /**
   * Generate deterministic ObjectId for "None" groups
   * @private
   */
  _generateNoneGroupId(field, level = 0) {
    const crypto = require('crypto');
    const seed = `none_${field}_level_${level}`;
    const hash = crypto.createHash('md5').update(seed).digest('hex');
    const objectIdHex = hash.substring(0, 24);
    try {
      return new mongoose.Types.ObjectId(objectIdHex);
    } catch (error) {
      const fallbackSeed = `${field}_${level}`.padEnd(24, '0').substring(0, 24);
      return new mongoose.Types.ObjectId(fallbackSeed);
    }
  }

  /**
   * Get available grouping options
   * @param {Object} user - User object for role-based filtering
   * @returns {Array} - Available grouping options
   */
  getAvailableGroupings(user = null) {
    let availableFields = Object.keys(GROUPING_FIELDS);

    // Filter fields based on user role
    if (user && user.role !== 'Admin') {
      availableFields = availableFields.filter(
        (key) => !AGENT_HIDDEN_FIELDS.includes(key) && !ENTITY_RELATIONSHIP_FIELDS.includes(key)
      );
    } else {
      availableFields = availableFields.filter((key) => !ENTITY_RELATIONSHIP_FIELDS.includes(key));
    }

    // Priority order
    const priorityOrder = user && user.role !== 'Admin'
      ? ['project', 'stage', 'status', 'source', 'source_agent', 'source_project', 'lead_date']
      : ['project', 'agent', 'stage', 'status', 'source', 'source_agent', 'source_project', 'lead_date'];

    const priorityFields = priorityOrder.filter((key) => availableFields.includes(key));
    const remainingFields = availableFields.filter((key) => !priorityOrder.includes(key));
    const orderedFields = [...priorityFields, ...remainingFields];

    return orderedFields.map((key) => {
      // Custom labels for specific fields
      const customLabels = {
        'source_agent': 'Source Agent',
        'source_project': 'Source Project',
      };
      
      const label = customLabels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
      
      return {
        key,
        label,
        type: GROUPING_FIELDS[key].type,
        ...(user && user.role !== 'Admin' && { description: getFieldDescription(key) }),
      };
    });
  }

  /**
   * Get available sorting options
   * @param {Object} user - User object for role-based filtering
   * @returns {Object} - Available sorting options
   */
  getAvailableGroupingSorts(user = null) {
    return {
      options: SORTING_OPTIONS,
      orders: ['asc', 'desc'],
      defaultSort: { field: 'count', order: 'desc' },
      examples: {
        basic: { sortBy: 'count', sortOrder: 'desc' },
        alphabetical: { sortBy: 'name', sortOrder: 'asc' },
        revenue: { sortBy: 'total_revenue', sortOrder: 'desc' },
        activity: { sortBy: 'latest_lead', sortOrder: 'desc' },
        contactName: { sortBy: 'contact_name', sortOrder: 'asc' },
        dateCreated: { sortBy: 'createdAt', sortOrder: 'desc' },
      },
      categories: {
        groupLevel: ['count', 'name', 'avg_revenue', 'total_revenue', 'latest_lead', 'oldest_lead'],
        leadSpecific: ['contact_name', 'lead_source_no', 'expected_revenue', 'createdAt', 'updatedAt', 'lead_date', 'email_from', 'phone'],
        offerSpecific: ['title', 'investment_volume', 'interest_rate', 'payment_terms', 'bonus_amount', 'bank_name', 'project_name', 'agent', 'offer_status', 'current_stage'],
      },
    };
  }

  /**
   * Recursively sort nested groups at all levels
   * Applies the same sorting criteria to every level of the nested structure
   * @param {Array} groups - Array of groups (may contain subGroups)
   * @param {Array} groupingLevels - Array of field names for each level
   * @param {string} sortBy - Sort field (count, name, etc.)
   * @param {string} sortOrder - Sort order (asc/desc)
   * @param {number} currentLevel - Current nesting level (0-indexed)
   * @returns {Promise<Array>} - Sorted groups with sorted subGroups
   * @private
   */
  async _sortNestedGroupsRecursively(groups, groupingLevels, sortBy, sortOrder, currentLevel = 0) {
    if (!groups || groups.length === 0) {
      return groups;
    }

    // Sort groups at current level
    const currentField = groupingLevels[currentLevel] || groupingLevels[0];
    const sorter = new GroupSorter(sortBy, sortOrder, currentField);
    const sortedGroups = await sorter.sortGroups(groups);

    // Recursively sort subGroups if they exist
    for (const group of sortedGroups) {
      if (group.subGroups && Array.isArray(group.subGroups) && group.subGroups.length > 0) {
        group.subGroups = await this._sortNestedGroupsRecursively(
          group.subGroups,
          groupingLevels,
          sortBy,
          sortOrder,
          currentLevel + 1
        );
      }
    }

    return sortedGroups;
  }
}

module.exports = new LeadGroupingService();