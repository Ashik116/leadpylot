/**
 * Centralized Lead Grouping Service
 * Handles grouping of leads by any field from the dynamicFilterService
 */

const mongoose = require('mongoose');
const crypto = require('crypto');
const { Lead, AssignLeads, Source, Team, User, LeadTransfer } = require('../models');
const Offer = require('../models/Offer');
const Opening = require('../models/Opening');
const { Confirmation, PaymentVoucher, Netto1, Netto2 } = require('../models');
const Todo = require('../models/Todo');
const { FILTER_FIELDS } = require('./dynamicFilterService');
const { executeLeadQuery } = require('./leadService/queries');
const logger = require('../helpers/logger');

class LeadGroupingService {
  /**
   * Generate a deterministic ObjectId for "None" groups
   * @param {string} field - The grouping field name
   * @param {number} level - The grouping level (optional, for multilevel grouping)
   * @returns {mongoose.Types.ObjectId} - Deterministic ObjectId
   */
  static _generateNoneGroupId(field, level = 0) {
    // Create a deterministic seed based on field and level
    const seed = `none_${field}_level_${level}`;

    // Generate a hash and take first 24 characters for ObjectId
    const hash = crypto.createHash('md5').update(seed).digest('hex');
    const objectIdHex = hash.substring(0, 24);

    try {
      return new mongoose.Types.ObjectId(objectIdHex);
    } catch (error) {
      // Fallback to a simple deterministic approach if hex is invalid
      const fallbackSeed = `${field}_${level}`.padEnd(24, '0').substring(0, 24);
      return new mongoose.Types.ObjectId(fallbackSeed);
    }
  }

  /**
   * Detect entity context from filters to determine which entity's dates to use
   * @param {Array} filters - Array of filter objects
   * @returns {string|null} - Entity type or null for lead context
   */
  static _detectEntityContext(filters) {
    if (!filters || !Array.isArray(filters)) return null;

    // Priority order for entity detection
    const entityPriority = [
      { entity: 'offer', pattern: 'has_offer' },
      { entity: 'opening', pattern: 'has_opening' },
      { entity: 'confirmation', pattern: 'has_confirmation' },
      { entity: 'payment', pattern: 'has_payment' },
      { entity: 'netto', pattern: 'has_netto' },
    ];

    for (const { entity, pattern } of entityPriority) {
      const hasEntityFilter = filters.some(
        (filter) => filter && filter.field === pattern && filter.value === true
      );

      if (hasEntityFilter) {
        return entity;
      }
    }

    return null; // Default to lead context
  }

  /**
   * Get entity-specific date field mapping
   * @param {string} dateField - Original date field (createdAt, updatedAt, assigned_date)
   * @param {string} entityContext - Entity context (offer, opening, confirmation, payment, netto)
   * @returns {Object} - Field mapping with entity-specific details
   */
  static _getEntityDateField(dateField, entityContext) {
    if (!entityContext) {
      // Default lead context
      return {
        entityType: 'lead',
        field: dateField,
        collection: 'Lead',
        requiresJoin: dateField === 'assigned_date', // assigned_date comes from AssignLeads
      };
    }

    // Entity-specific date field mappings
    const entityDateMappings = {
      offer: {
        entityType: 'offer',
        collection: 'Offer',
        fields: {
          createdAt: 'createdAt',
          updatedAt: 'updatedAt',
          assigned_date: 'createdAt', // For offers, use creation date as "assigned" date
        },
      },
      opening: {
        entityType: 'opening',
        collection: 'Opening',
        fields: {
          createdAt: 'createdAt',
          updatedAt: 'updatedAt',
          assigned_date: 'createdAt',
        },
      },
      confirmation: {
        entityType: 'confirmation',
        collection: 'Confirmation',
        fields: {
          createdAt: 'createdAt',
          updatedAt: 'updatedAt',
          assigned_date: 'createdAt',
        },
      },
      payment: {
        entityType: 'payment',
        collection: 'PaymentVoucher',
        fields: {
          createdAt: 'createdAt',
          updatedAt: 'updatedAt',
          assigned_date: 'createdAt',
        },
      },
      netto: {
        entityType: 'netto',
        collection: 'Netto1', // Primary netto collection
        fields: {
          createdAt: 'createdAt',
          updatedAt: 'updatedAt',
          assigned_date: 'createdAt',
        },
      },
    };

    const mapping = entityDateMappings[entityContext];
    if (!mapping) {
      // Fallback to lead context
      return this._getEntityDateField(dateField, null);
    }

    return {
      entityType: mapping.entityType,
      field: mapping.fields[dateField] || dateField,
      collection: mapping.collection,
      requiresJoin: true, // All entity contexts require joins
    };
  }

  /**
   * Available grouping fields based on dynamic filter service
   */
  static GROUPING_FIELDS = {
    // Direct lead fields
    contact_name: { type: 'string', field: 'contact_name' },
    email_from: { type: 'string', field: 'email_from' },
    phone: { type: 'string', field: 'phone' },
    status: { type: 'string', field: 'status' },
    stage: { type: 'string', field: 'stage' },
    use_status: { type: 'string', field: 'use_status' },
    duplicate_status: { type: 'number', field: 'duplicate_status' },
    active: { type: 'boolean', field: 'active' },
    lead_date: { type: 'date', field: 'lead_date' },
    assigned_date: { type: 'context_date', field: 'assigned_date' }, // Context-aware date
    createdAt: { type: 'context_date', field: 'createdAt' }, // Context-aware date
    updatedAt: { type: 'context_date', field: 'updatedAt' }, // Context-aware date
    expected_revenue: { type: 'number', field: 'expected_revenue' },
    leadPrice: { type: 'number', field: 'leadPrice' },
    partner: { type: 'string', field: 'lead_source_no' }, // NEW: Partner ID grouping (for bulk search)
    // Reference fields
    project: { type: 'reference', field: 'project_id', collection: 'Team' },
    agent: { type: 'reference', field: 'agent_id', collection: 'User' },
    source: { type: 'reference', field: 'source_id', collection: 'Source' },

    // Computed fields
    has_offer: { type: 'computed', field: 'has_offer' },
    has_opening: { type: 'computed', field: 'has_opening' },
    has_confirmation: { type: 'computed', field: 'has_confirmation' },
    has_payment: { type: 'computed', field: 'has_payment' },
    has_netto: { type: 'computed', field: 'has_netto' },
    has_todo: { type: 'computed', field: 'has_todo' },
    has_extra_todo: { type: 'computed', field: 'has_extra_todo' },
    has_assigned_todo: { type: 'computed', field: 'has_assigned_todo' },
    is_favourite: { type: 'computed', field: 'is_favourite' },
    last_transfer: { type: 'computed', field: 'last_transfer' },
  };

  /**
   * Group leads by a specific field
   * @param {string} groupByField - Field to group by
   * @param {Object} user - User object for permissions
   * @param {Object} options - Additional options
   * @returns {Promise<Array>} - Grouped results
   */
  async groupLeads(groupByField, user, options = {}) {
    const startTime = Date.now();

    try {
      // Validate grouping field
      if (!LeadGroupingService.GROUPING_FIELDS[groupByField]) {
        throw new Error(`Invalid grouping field: ${groupByField}`);
      }

      const {
        page = 1,
        limit = 50,
        filters = [],
        sortBy = 'count',
        sortOrder = 'desc',
        includeLeads = true,
        maxLeadsPerGroup = null, // Remove pagination limit - get all leads
        search = null, // Search parameter for contact_name, email, phone, partner_id
      } = options;

      // Check if user is explicitly filtering by 'active' field
      const hasActiveFilter = filters.some((filter) => filter && filter.field === 'active');

      // Apply dynamic filters first if provided - only add active: true if user isn't explicitly filtering by active
      let baseQuery = hasActiveFilter ? {} : { active: true };

      // Apply user permissions
      if (user.role !== 'Admin') {
        const assignments = await AssignLeads.find({
          agent_id: user._id,
          status: 'active',
        }).select('lead_id');
        const assignedLeadIds = assignments.map((a) => a.lead_id);
        baseQuery._id = { $in: assignedLeadIds };
      }

      // Apply search filter if provided
      if (search && search.trim()) {
        const searchRegex = new RegExp(search.trim(), 'i'); // Case-insensitive search
        const searchQuery = {
          $or: [
            { contact_name: searchRegex },
            { email_from: searchRegex },
            { phone: searchRegex },
            { lead_source_no: searchRegex }, // partner_id field
          ],
        };

        if (baseQuery.$and) {
          baseQuery.$and.push(searchQuery);
        } else {
          baseQuery = { $and: [baseQuery, searchQuery] };
        }
      }

      // Apply additional filters if provided
      if (filters && filters.length > 0) {
        // Sanitize filters for multilevel grouping:
        // If any of the following are present, ignore has_todo to avoid conflicting intersections
        const shouldIgnoreHasTodo = (filters || []).some(
          (f) =>
            f &&
            ['done_todos', 'pending_todos', 'has_extra_todo', 'has_assigned_todo'].includes(
              f.field
            ) &&
            (f.value === true || f.value === 'true')
        );

        const sanitizedFilters = shouldIgnoreHasTodo
          ? (filters || []).filter((f) => !(f && f.field === 'has_todo'))
          : filters;

        const { applyDynamicFilters } = require('./dynamicFilterService');
        const { query } = await applyDynamicFilters(sanitizedFilters, user);

        if (baseQuery.$and) {
          baseQuery.$and.push(query);
        } else {
          baseQuery = { $and: [baseQuery, query] };
        }
      }

      // Get the grouping configuration
      const groupConfig = LeadGroupingService.GROUPING_FIELDS[groupByField];

      // Execute grouping based on field type
      let groupedResults;
      const groupingOptions = { ...options, filters }; // Pass filters for context detection

      switch (groupConfig.type) {
        case 'reference':
          groupedResults = await this._groupByReference(
            groupConfig,
            baseQuery,
            user,
            groupingOptions
          );
          break;
        case 'computed':
          groupedResults = await this._groupByComputed(
            groupConfig,
            baseQuery,
            user,
            groupingOptions
          );
          break;
        default:
          groupedResults = await this._groupByDirect(groupConfig, baseQuery, user, groupingOptions);
      }

      // Sort results
      groupedResults = await this._sortGroups(groupedResults, sortBy, sortOrder, groupByField);

      // Apply pagination to groups
      const total = groupedResults.length;
      const paginatedResults = groupedResults.slice((page - 1) * limit, page * limit);

      // Fetch detailed lead data if requested
      if (includeLeads) {
        for (const group of paginatedResults) {
          if (group.leadIds && group.leadIds.length > 0) {
            const leadQuery = {
              _id: { $in: group.leadIds }, // Get all leads without slicing
            };

            // Detect todo-related grouping to include appropriate todos
            const todoFilters = {
              has_todo: groupByField === 'has_todo',
              has_extra_todo: groupByField === 'has_extra_todo',
              has_assigned_todo: groupByField === 'has_assigned_todo',
            };

            const leadResult = await executeLeadQuery(
              user,
              leadQuery,
              1,
              group.leadIds.length, // Use actual count as limit to get all leads
              true, // includeOffers
              null, // state
              options.has_todo || todoFilters.has_todo, // has_todo (from options or todo filters)
              options.todo_scope || 'all', // todo_scope (from options)
              options.pending_todos || null, // pending_todos (from options)
              options.done_todos || null, // done_todos (from options)
              'createdAt', // sortBy
              'desc' // sortOrder
            );

            // Add specific filtered todos if grouping by todo-related fields
            if (todoFilters.has_extra_todo || todoFilters.has_assigned_todo) {
              const { addFilteredTodosToResults } = require('./dynamicFilterService');
              group.leads = await addFilteredTodosToResults(leadResult.data, user, todoFilters);
            } else {
              group.leads = leadResult.data;
            }
            // Remove hasMore since we're getting all leads
          }
        }
      }

      const executionTime = Date.now() - startTime;

      // Log performance metrics for monitoring
      logger.info('Lead grouping performance', {
        groupByField,
        totalGroups: total,
        totalLeads: groupedResults.reduce((sum, group) => sum + group.count, 0),
        includeLeads,
        executionTime,
        userRole: user.role,
        performance: executionTime < 500 ? 'fast' : executionTime < 2000 ? 'moderate' : 'slow',
      });

      return {
        data: paginatedResults,
        meta: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
          groupByField,
          totalLeads: groupedResults.reduce((sum, group) => sum + group.count, 0),
          executionTime,
          includeLeads, // Include this for debugging
          performanceLevel:
            executionTime < 500 ? 'fast' : executionTime < 2000 ? 'moderate' : 'slow',
        },
      };
    } catch (error) {
      logger.error('Lead grouping error:', error);
      throw error;
    }
  }

  /**
   * Group by reference fields (project, agent, source)
   */
  async _groupByReference(groupConfig, baseQuery, user, options) {
    const { field, collection } = groupConfig;

    // Handle different reference types
    if (field === 'project_id' || field === 'agent_id') {
      // For project and agent, we need to use AssignLeads table
      return await this._groupByAssignmentReference(groupConfig, baseQuery, user, options);
    } else {
      // For source, we can use the direct field on Lead
      return await this._groupByDirectReference(groupConfig, baseQuery, user, options);
    }
  }

  /**
   * Group by assignment reference fields (project, agent)
   */
  async _groupByAssignmentReference(groupConfig, baseQuery, user, options) {
    const { field, collection } = groupConfig;

    // Get all leads matching the base query
    const leads = await Lead.find(baseQuery)
      .select(
        '_id source_id contact_name email_from phone lead_source_no stage status expected_revenue'
      ) // Include source_id and other needed fields
      .populate('source_id', 'name price active color') // Add source population
      .lean();
    const leadIds = leads.map((l) => l._id);

    // Get assignments for these leads
    const assignments = await AssignLeads.find({
      lead_id: { $in: leadIds },
      status: 'active',
    })
      .select(`lead_id ${field}`)
      .lean();

    // Group by reference field
    const groupMap = new Map();
    const nullGroup = {
      groupId: LeadGroupingService._generateNoneGroupId(field),
      groupName: 'None',
      leadIds: [],
      count: 0,
    };
    const assignedLeadIds = new Set();

    for (const assignment of assignments) {
      assignedLeadIds.add(assignment.lead_id.toString());
      const refId = assignment[field];

      if (!refId) {
        nullGroup.leadIds.push(assignment.lead_id);
        nullGroup.count++;
      } else {
        const key = refId.toString();
        if (!groupMap.has(key)) {
          groupMap.set(key, {
            groupId: refId,
            groupName: null, // Will be populated later
            leadIds: [],
            count: 0,
          });
        }
        groupMap.get(key).leadIds.push(assignment.lead_id);
        groupMap.get(key).count++;
      }
    }

    // Add unassigned leads to null group
    for (const leadId of leadIds) {
      if (!assignedLeadIds.has(leadId.toString())) {
        nullGroup.leadIds.push(leadId);
        nullGroup.count++;
      }
    }

    // Populate reference data
    const referenceIds = Array.from(groupMap.keys());
    let referenceData = [];

    if (referenceIds.length > 0) {
      let Model;
      switch (collection) {
        case 'User':
          Model = User;
          break;
        case 'Team':
          Model = Team;
          break;
        case 'Source':
          Model = Source;
          break;
        default:
          throw new Error(`Unknown collection: ${collection}`);
      }

      referenceData = await Model.find({
        _id: { $in: referenceIds },
      })
        .select('_id name login first_name last_name active')
        .lean();
    }

    // Update group names with reference data
    for (const ref of referenceData) {
      const key = ref._id.toString();
      if (groupMap.has(key)) {
        const group = groupMap.get(key);
        group.groupName = this._getDisplayName(ref, collection);
        group.reference = ref;
      }
    }

    // Convert to array and include null group if it has leads
    const results = Array.from(groupMap.values());
    if (nullGroup.count > 0) {
      results.push(nullGroup);
    }

    return results;
  }

  /**
   * Group by direct reference fields (source)
   */
  async _groupByDirectReference(groupConfig, baseQuery, user, options) {
    const { field, collection } = groupConfig;

    // Get all leads matching the base query
    const leads = await Lead.find(baseQuery)
      .select(`_id ${field}`)
      .populate('source_id', 'name price active color') // Add source population
      .lean();

    // Group by reference field
    const groupMap = new Map();
    const nullGroup = {
      groupId: LeadGroupingService._generateNoneGroupId(field),
      groupName: 'None',
      leadIds: [],
      count: 0,
    };

    for (const lead of leads) {
      const refId = lead[field];
      if (!refId) {
        nullGroup.leadIds.push(lead._id);
        nullGroup.count++;
      } else {
        const key = refId.toString();
        if (!groupMap.has(key)) {
          groupMap.set(key, {
            groupId: refId,
            groupName: null, // Will be populated later
            leadIds: [],
            count: 0,
          });
        }
        groupMap.get(key).leadIds.push(lead._id);
        groupMap.get(key).count++;
      }
    }

    // Populate reference data
    const referenceIds = Array.from(groupMap.keys());
    let referenceData = [];

    if (referenceIds.length > 0) {
      let Model;
      switch (collection) {
        case 'User':
          Model = User;
          break;
        case 'Team':
          Model = Team;
          break;
        case 'Source':
          Model = Source;
          break;
        default:
          throw new Error(`Unknown collection: ${collection}`);
      }

      referenceData = await Model.find({
        _id: { $in: referenceIds },
      })
        .select('_id name login first_name last_name active')
        .lean();
    }

    // Update group names with reference data
    for (const ref of referenceData) {
      const key = ref._id.toString();
      if (groupMap.has(key)) {
        const group = groupMap.get(key);
        group.groupName = this._getDisplayName(ref, collection);
        group.reference = ref;
      }
    }

    // Convert to array and include null group if it has leads
    const results = Array.from(groupMap.values());
    if (nullGroup.count > 0) {
      results.push(nullGroup);
    }

    return results;
  }

  /**
   * Group by computed fields (has_offer, has_opening, etc.)
   */
  async _groupByComputed(groupConfig, baseQuery, user, options) {
    const { field } = groupConfig;

    // Get all leads matching the base query
    const leads = await Lead.find(baseQuery)
      .select(
        '_id source_id contact_name email_from phone lead_source_no stage status expected_revenue'
      ) // Include source_id and other needed fields
      .populate('source_id', 'name price active color') // Add source population
      .lean();
    const leadIds = leads.map((l) => l._id);

    // Special handling for complex computed fields that return multiple groups
    if (field === 'last_transfer') {
      return await this._groupByLastTransfer(leadIds, user, options);
    }

    let computedLeadIds = [];

    // Get leads with the computed field
    switch (field) {
      case 'has_offer':
        // Use aggregation pipeline to match offers endpoint behavior (no progress filter)
        const ProgressPipelineBuilder = require('./offerService/builders/ProgressPipelineBuilder');

        const pipeline = new ProgressPipelineBuilder()
          .addMatch({
            lead_id: { $in: leadIds, $ne: null }, // Include only leads in the list AND exclude null leads
            active: true,
          })
          .addProgressLookups() // Add progress lookups to check for progress
          .addProgressFields() // Add progress fields calculation
          .addNoProgressFilter() // Filter out offers with any progress (match offers endpoint)
          .build();

        // Add projection to get only lead_id
        pipeline.push({ $project: { lead_id: 1 } });

        const offersWithNoProgress = await Offer.aggregate(pipeline);
        computedLeadIds = [...new Set(offersWithNoProgress.map((o) => o.lead_id.toString()))];
        break;
      case 'has_opening':
        // Use the exact same logic as offerService PROGRESS_FILTERS.opening
        const { PROGRESS_FILTERS } = require('./offerService/config/constants');
        const openingsPipeline = new ProgressPipelineBuilder()
          .addMatch({
            lead_id: { $in: leadIds, $ne: null },
            active: true,
          })
          .addProgressLookups()
          .addProgressFields()
          .addMatch(PROGRESS_FILTERS.opening)
          .build();

        openingsPipeline.push({ $project: { lead_id: 1 } });
        const offersWithOpeningProgress = await Offer.aggregate(openingsPipeline);
        computedLeadIds = [...new Set(offersWithOpeningProgress.map((o) => o.lead_id.toString()))];
        break;
      case 'has_confirmation':
        const confirmations = await Confirmation.find({ lead_id: { $in: leadIds } })
          .select('lead_id')
          .lean();
        computedLeadIds = [...new Set(confirmations.map((c) => c.lead_id.toString()))];
        break;
      case 'has_payment':
        // Include leads that have payment, netto1, or netto2 (progressive logic)
        const {
          PROGRESS_FILTERS: PAYMENT_PROGRESS_FILTERS,
        } = require('./offerService/config/constants');
        const paymentPipeline = new ProgressPipelineBuilder()
          .addMatch({
            lead_id: { $in: leadIds, $ne: null },
            active: true,
          })
          .addProgressLookups()
          .addProgressFields()
          .addMatch({
            $or: [
              PAYMENT_PROGRESS_FILTERS.payment,
              PAYMENT_PROGRESS_FILTERS.netto1,
              PAYMENT_PROGRESS_FILTERS.netto2,
            ],
          })
          .build();

        paymentPipeline.push({ $project: { lead_id: 1 } });
        const offersWithPaymentProgress = await Offer.aggregate(paymentPipeline);
        computedLeadIds = [...new Set(offersWithPaymentProgress.map((o) => o.lead_id.toString()))];
        break;
      case 'has_netto':
        // Include leads that have netto1 or netto2 (progressive logic)
        const {
          PROGRESS_FILTERS: NETTO_PROGRESS_FILTERS,
        } = require('./offerService/config/constants');
        const nettoPipeline = new ProgressPipelineBuilder()
          .addMatch({
            lead_id: { $in: leadIds, $ne: null },
            active: true,
          })
          .addProgressLookups()
          .addProgressFields()
          .addMatch(NETTO_PROGRESS_FILTERS.netto)
          .build();

        nettoPipeline.push({ $project: { lead_id: 1 } });
        const offersWithNettoProgress = await Offer.aggregate(nettoPipeline);
        computedLeadIds = [...new Set(offersWithNettoProgress.map((o) => o.lead_id.toString()))];
        break;
      case 'has_lost':
        // Use the exact same logic as offerService PROGRESS_FILTERS.lost
        const {
          PROGRESS_FILTERS: LOST_PROGRESS_FILTERS,
        } = require('./offerService/config/constants');
        const lostPipeline = new ProgressPipelineBuilder()
          .addMatch({
            lead_id: { $in: leadIds, $ne: null },
            active: true,
          })
          .addProgressLookups()
          .addProgressFields()
          .addMatch(LOST_PROGRESS_FILTERS.lost)
          .build();

        lostPipeline.push({ $project: { lead_id: 1 } });
        const offersWithLostProgress = await Offer.aggregate(lostPipeline);
        computedLeadIds = [...new Set(offersWithLostProgress.map((o) => o.lead_id.toString()))];
        break;
      case 'has_todo':
        // Standard todo filtering - any active todos, respecting user permissions
        let todoQuery = {
          lead_id: { $in: leadIds },
          active: true,
          isDone: false,
        };
        const { ROLES: TODO_ROLES } = require('../auth/roles/roleDefinitions');

        if (user.role === TODO_ROLES.ADMIN) {
          // Admin can see all todos for these leads
          const todos = await Todo.find(todoQuery).select('lead_id').lean();
          computedLeadIds = [...new Set(todos.map((t) => t.lead_id.toString()))];
        } else if (user.role === TODO_ROLES.AGENT) {
          // Agent can see todos for their assigned leads OR todos assigned to them
          const { AssignLeads } = require('../models');
          const assignments = await AssignLeads.find({
            agent_id: user._id,
            status: 'active',
          }).select('lead_id');
          const assignedLeadIds = assignments.map((assignment) => assignment.lead_id.toString());

          // Filter leadIds to only include leads the agent has access to
          const accessibleLeadIds = leadIds.filter((id) => assignedLeadIds.includes(id.toString()));

          todoQuery.$or = [
            { lead_id: { $in: accessibleLeadIds } }, // Todos for their assigned leads
            {
              lead_id: { $in: leadIds },
              assigned_to: user._id,
            }, // Todos assigned to them for any of the leads in scope
          ];

          const todos = await Todo.find(todoQuery).select('lead_id').lean();
          computedLeadIds = [...new Set(todos.map((t) => t.lead_id.toString()))];
        } else {
          // Other roles have no access to todos
          computedLeadIds = [];
        }
        break;
      case 'has_extra_todo':
        // Todos assigned TO the current user, respecting user permissions
        let extraTodoQuery = {
          lead_id: { $in: leadIds },
          active: true,
          isDone: false,
        };
        const { ROLES } = require('../auth/roles/roleDefinitions');
        const { User, AssignLeads } = require('../models');

        if (user.role === ROLES.ADMIN) {
          // Admin sees todos assigned to any admin
          const adminUsers = await User.find({ role: ROLES.ADMIN }).select('_id');
          const adminIds = adminUsers.map((admin) => admin._id);
          extraTodoQuery.assigned_to = { $in: adminIds };

          const extraTodos = await Todo.find(extraTodoQuery).select('lead_id').lean();
          computedLeadIds = [...new Set(extraTodos.map((t) => t.lead_id.toString()))];
        } else if (user.role === ROLES.AGENT) {
          // Agent sees only todos assigned to them for their assigned leads OR any todo assigned to them
          const assignments = await AssignLeads.find({
            agent_id: user._id,
            status: 'active',
          }).select('lead_id');
          const assignedLeadIds = assignments.map((assignment) => assignment.lead_id.toString());

          // Filter leadIds to only include leads the agent has access to
          const accessibleLeadIds = leadIds.filter((id) => assignedLeadIds.includes(id.toString()));

          extraTodoQuery.$or = [
            {
              lead_id: { $in: accessibleLeadIds },
              assigned_to: user._id,
            }, // Todos assigned to them for their assigned leads
            {
              lead_id: { $in: leadIds },
              assigned_to: user._id,
            }, // Any todos assigned to them for leads in scope
          ];

          const extraTodos = await Todo.find(extraTodoQuery).select('lead_id').lean();
          computedLeadIds = [...new Set(extraTodos.map((t) => t.lead_id.toString()))];
        } else {
          // Other roles have no access
          computedLeadIds = [];
        }
        break;
      case 'has_assigned_todo':
        // Todos assigned BY the current user to others, respecting user permissions
        const { ROLES: ASSIGNED_TODO_ROLES } = require('../auth/roles/roleDefinitions');
        const { AssignLeads: AssignLeadsForAssigned } = require('../models');

        if (user.role === ASSIGNED_TODO_ROLES.ADMIN) {
          // Admin can see todos assigned by them to others (including completed ones)
          const assignedTodos = await Todo.find({
            lead_id: { $in: leadIds },
            creator_id: user._id,
            assigned_to: { $ne: null, $ne: user._id },
            active: true,
            // Removed isDone: false to include completed assigned todos
          })
            .select('lead_id')
            .lean();
          computedLeadIds = [...new Set(assignedTodos.map((t) => t.lead_id.toString()))];
        } else if (user.role === ASSIGNED_TODO_ROLES.AGENT) {
          // Agent can see todos they assigned to others, but only for their assigned leads (including completed ones)
          const assignments = await AssignLeadsForAssigned.find({
            agent_id: user._id,
            status: 'active',
          }).select('lead_id');
          const assignedLeadIds = assignments.map((assignment) => assignment.lead_id.toString());

          // Filter leadIds to only include leads the agent has access to
          const accessibleLeadIds = leadIds.filter((id) => assignedLeadIds.includes(id.toString()));

          const assignedTodos = await Todo.find({
            lead_id: { $in: accessibleLeadIds },
            creator_id: user._id,
            assigned_to: { $ne: null, $ne: user._id },
            active: true,
            // Removed isDone: false to include completed assigned todos
          })
            .select('lead_id')
            .lean();
          computedLeadIds = [...new Set(assignedTodos.map((t) => t.lead_id.toString()))];
        } else {
          // Other roles have no access
          computedLeadIds = [];
        }
        break;
      case 'is_favourite':
        const Favourite = require('../models/Favourite');
        const favourites = await Favourite.find({
          lead_id: { $in: leadIds },
          user_id: user._id,
          active: true,
        })
          .select('lead_id')
          .lean();
        computedLeadIds = [...new Set(favourites.map((f) => f.lead_id.toString()))];
        break;
    }

    // Create groups with deterministic ObjectIds
    const hasGroup = {
      groupId: LeadGroupingService._generateNoneGroupId(`${field}_true`).toString(),
      groupName: 'true',
      leadIds: leadIds.filter((id) => computedLeadIds.includes(id.toString())),
      count: 0,
    };
    hasGroup.count = hasGroup.leadIds.length;

    const hasNotGroup = {
      groupId: LeadGroupingService._generateNoneGroupId(`${field}_false`).toString(),
      groupName: 'false',
      leadIds: leadIds.filter((id) => !computedLeadIds.includes(id.toString())),
      count: 0,
    };
    hasNotGroup.count = hasNotGroup.leadIds.length;

    const results = [];
    if (hasGroup.count > 0) results.push(hasGroup);
    if (hasNotGroup.count > 0) results.push(hasNotGroup);

    return results;
  }

  /**
   * Group leads by their last transfer information
   * @param {Array} leadIds - Array of lead IDs to group
   * @param {Object} user - User object for permissions
   * @param {Object} options - Additional options
   * @returns {Promise<Array>} - Grouped results
   */
  async _groupByLastTransfer(leadIds, user, options) {
    try {
      const transferGroups = new Map();

      // Get the latest transfer for each lead
      const transfers = await LeadTransfer.find({
        lead_id: { $in: leadIds },
        transfer_status: 'completed',
      })
        .populate('from_agent_id', 'login name')
        .populate('to_agent_id', 'login name')
        .sort({ createdAt: -1 })
        .lean();

      // Create a map to store only the latest transfer per lead
      const latestTransferMap = new Map();
      for (const transfer of transfers) {
        const leadIdStr = transfer.lead_id.toString();
        if (!latestTransferMap.has(leadIdStr)) {
          latestTransferMap.set(leadIdStr, transfer);
        }
      }

      // Group leads by transfer information
      for (const leadId of leadIds) {
        const leadIdStr = leadId.toString();
        const transfer = latestTransferMap.get(leadIdStr);

        if (transfer) {
          const fromAgent =
            transfer.from_agent_id?.login || transfer.from_agent_id?.name || 'Unknown';
          const toAgent = transfer.to_agent_id?.login || transfer.to_agent_id?.name || 'Unknown';
          const transferDate = new Date(transfer.createdAt)
            .toLocaleDateString('en-GB')
            .replace(/\//g, '-');

          const groupKey = `${fromAgent}→${toAgent}(${transferDate})`;

          if (!transferGroups.has(groupKey)) {
            transferGroups.set(groupKey, []);
          }
          transferGroups.get(groupKey).push(leadId);
        }
      }

      const transferResults = [];

      // Create groups for each transfer pattern
      for (const [groupKey, groupLeadIds] of transferGroups.entries()) {
        transferResults.push({
          groupId: LeadGroupingService._generateNoneGroupId(`transfer_${groupKey}`).toString(),
          groupName: groupKey,
          leadIds: groupLeadIds,
          count: groupLeadIds.length,
        });
      }

      // Add "No Transfer" group for leads without transfers
      const leadsWithoutTransfer = leadIds.filter((leadId) => {
        return !latestTransferMap.has(leadId.toString());
      });

      if (leadsWithoutTransfer.length > 0) {
        transferResults.push({
          groupId: LeadGroupingService._generateNoneGroupId('transfer_none').toString(),
          groupName: 'No Transfer',
          leadIds: leadsWithoutTransfer,
          count: leadsWithoutTransfer.length,
        });
      }

      return transferResults;
    } catch (error) {
      logger.error('Error grouping by last transfer:', error);
      // Return empty result on error
      return [];
    }
  }

  /**
   * Group by context-aware date fields
   * @param {string} dateField - Date field name (createdAt, updatedAt, assigned_date)
   * @param {Object} baseQuery - Base MongoDB query
   * @param {Object} user - User object
   * @param {Object} options - Additional options including filters
   * @returns {Promise<Array>} - Grouped results
   */
  async _groupByContextDate(dateField, baseQuery, user, options) {
    try {
      // Detect entity context from filters
      const entityContext = LeadGroupingService._detectEntityContext(options.filters || []);
      const dateFieldMapping = LeadGroupingService._getEntityDateField(dateField, entityContext);

      logger.info('Context-aware date grouping', {
        dateField,
        entityContext,
        dateFieldMapping,
        userRole: user.role,
        baseQueryKeys: Object.keys(baseQuery),
        filtersCount: (options.filters || []).length,
      });

      if (!entityContext) {
        // Lead context - use lead fields or AssignLeads for assigned_date
        return await this._groupByLeadDate(dateField, baseQuery, user, options);
      } else {
        // Entity context - use entity-specific date fields
        return await this._groupByEntityDate(dateField, entityContext, baseQuery, user, options);
      }
    } catch (error) {
      logger.error('Error in context-aware date grouping:', error);
      // Fallback to lead date grouping
      return await this._groupByLeadDate(dateField, baseQuery, user, options);
    }
  }

  /**
   * Group by lead date fields (default context)
   */
  async _groupByLeadDate(dateField, baseQuery, user, options) {
    if (dateField === 'assigned_date') {
      // Special handling for assigned_date from AssignLeads collection
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
      {
        $match: {
          _id: { $ne: null }, // Filter out groups with null dates
        },
      },
    ];

    const results = await Lead.aggregate(pipeline);
    return this._formatDateGroupResults(results, dateField);
  }

  /**
   * Group by assigned_date from AssignLeads collection
   */
  async _groupByAssignedDate(baseQuery, user, options) {
    // Get leads matching base query
    const leads = await Lead.find(baseQuery).select('_id').lean();
    const leadIds = leads.map((l) => l._id);

    // Group by assigned_date from AssignLeads
    const pipeline = [
      {
        $match: {
          lead_id: { $in: leadIds },
          status: 'active',
          assigned_date: { $ne: null, $exists: true }, // Filter out null assigned dates
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
      {
        $match: {
          _id: { $ne: null }, // Filter out groups with null dates
        },
      },
    ];

    const results = await AssignLeads.aggregate(pipeline);
    return this._formatDateGroupResults(results, 'assigned_date');
  }

  /**
   * Group by entity-specific date fields
   */
  async _groupByEntityDate(dateField, entityContext, baseQuery, user, options) {
    // Get leads matching base query
    const leads = await Lead.find(baseQuery).select('_id').lean();
    const leadIds = leads.map((l) => l._id);

    // Handle empty leadIds
    if (!leadIds || leadIds.length === 0) {
      logger.info('No leads found for entity date grouping', { dateField, entityContext });
      return [];
    }

    const dateFieldMapping = LeadGroupingService._getEntityDateField(dateField, entityContext);

    logger.info('Entity date grouping', {
      dateField,
      entityContext,
      dateFieldMapping,
      leadCount: leadIds.length,
    });

    // Get entity-specific dates based on entity type
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
        // Fallback to lead date
        return await this._groupByLeadDate(dateField, { _id: { $in: leadIds } }, user, options);
    }
  }

  /**
   * Group by offer dates
   */
  async _groupByOfferDate(leadIds, entityDateField, originalDateField) {
    // Handle empty leadIds array
    if (!leadIds || leadIds.length === 0) {
      logger.info('No lead IDs provided for offer date grouping');
      return [];
    }

    try {
      const pipeline = [
        {
          $match: {
            lead_id: { $in: leadIds, $ne: null },
            active: true,
            [entityDateField]: { $ne: null, $exists: true }, // Filter out null dates
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
        {
          $match: {
            _id: { $ne: null }, // Filter out groups with null dates
          },
        },
      ];

      const results = await Offer.aggregate(pipeline);

      logger.info('Offer date grouping results', {
        entityDateField,
        originalDateField,
        inputLeadCount: leadIds.length,
        resultGroupCount: results.length,
        resultSample: results.slice(0, 3),
      });

      return this._formatDateGroupResults(results, originalDateField);
    } catch (error) {
      logger.error('Error in offer date grouping:', error);
      return [];
    }
  }

  /**
   * Group by opening dates
   */
  async _groupByOpeningDate(leadIds, entityDateField, originalDateField) {
    // First get offers for the leads
    const offers = await Offer.find({
      lead_id: { $in: leadIds },
      active: true,
    })
      .select('_id lead_id')
      .lean();

    const offerIds = offers.map((o) => o._id);
    const offerLeadMap = new Map(offers.map((o) => [o._id.toString(), o.lead_id]));

    const pipeline = [
      {
        $match: {
          offer_id: { $in: offerIds },
          active: true,
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
          offerIds: { $push: '$offer_id' },
          count: { $sum: 1 },
        },
      },
    ];

    const results = await Opening.aggregate(pipeline);

    // Convert offer IDs back to lead IDs
    return results
      .map((result) => {
        const leadIds = result.offerIds
          .map((offerId) => offerLeadMap.get(offerId.toString()))
          .filter(Boolean);

        return {
          ...result,
          leadIds: [...new Set(leadIds.map((id) => id.toString()))], // Deduplicate
          count: leadIds.length,
        };
      })
      .map((result) => this._formatSingleDateGroupResult(result, originalDateField));
  }

  /**
   * Group by confirmation dates
   */
  async _groupByConfirmationDate(leadIds, entityDateField, originalDateField) {
    // Get confirmations linked to offers from these leads
    const offers = await Offer.find({
      lead_id: { $in: leadIds },
      active: true,
    })
      .select('_id lead_id')
      .lean();

    const offerIds = offers.map((o) => o._id);
    const offerLeadMap = new Map(offers.map((o) => [o._id.toString(), o.lead_id]));

    const pipeline = [
      {
        $match: {
          offer_id: { $in: offerIds },
          active: true,
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
          offerIds: { $push: '$offer_id' },
          count: { $sum: 1 },
        },
      },
    ];

    const results = await Confirmation.aggregate(pipeline);

    // Convert offer IDs back to lead IDs
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
      .map((result) => this._formatSingleDateGroupResult(result, originalDateField));
  }

  /**
   * Group by payment dates
   */
  async _groupByPaymentDate(leadIds, entityDateField, originalDateField) {
    // Get payments linked to offers from these leads
    const offers = await Offer.find({
      lead_id: { $in: leadIds },
      active: true,
    })
      .select('_id lead_id')
      .lean();

    const offerIds = offers.map((o) => o._id);
    const offerLeadMap = new Map(offers.map((o) => [o._id.toString(), o.lead_id]));

    const pipeline = [
      {
        $match: {
          offer_id: { $in: offerIds },
          active: true,
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
          offerIds: { $push: '$offer_id' },
          count: { $sum: 1 },
        },
      },
    ];

    const results = await PaymentVoucher.aggregate(pipeline);

    // Convert offer IDs back to lead IDs
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
      .map((result) => this._formatSingleDateGroupResult(result, originalDateField));
  }

  /**
   * Group by netto dates
   */
  async _groupByNettoDate(leadIds, entityDateField, originalDateField) {
    // Get netto records linked to offers from these leads
    const offers = await Offer.find({
      lead_id: { $in: leadIds },
      active: true,
    })
      .select('_id lead_id')
      .lean();

    const offerIds = offers.map((o) => o._id);
    const offerLeadMap = new Map(offers.map((o) => [o._id.toString(), o.lead_id]));

    // Check both Netto1 and Netto2 collections
    const netto1Pipeline = [
      {
        $match: {
          offer_id: { $in: offerIds },
          active: true,
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
          offerIds: { $push: '$offer_id' },
          count: { $sum: 1 },
        },
      },
    ];

    const netto2Pipeline = [...netto1Pipeline]; // Same pipeline structure

    const [netto1Results, netto2Results] = await Promise.all([
      Netto1.aggregate(netto1Pipeline),
      Netto2.aggregate(netto2Pipeline),
    ]);

    // Combine results from both netto collections
    const combinedResults = new Map();

    [...netto1Results, ...netto2Results].forEach((result) => {
      const dateKey = result._id;
      const leadIds = result.offerIds
        .map((offerId) => offerLeadMap.get(offerId.toString()))
        .filter(Boolean);

      if (combinedResults.has(dateKey)) {
        const existing = combinedResults.get(dateKey);
        existing.leadIds = [
          ...new Set([...existing.leadIds, ...leadIds.map((id) => id.toString())]),
        ];
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
   * Format date group results consistently
   */
  _formatDateGroupResults(results, dateField) {
    return results.map((result) => this._formatSingleDateGroupResult(result, dateField));
  }

  /**
   * Format single date group result
   */
  _formatSingleDateGroupResult(result, dateField) {
    // Handle null or undefined results
    if (!result) {
      return {
        groupId: LeadGroupingService._generateNoneGroupId(`${dateField}_none`),
        groupName: 'No Date',
        leadIds: [],
        count: 0,
      };
    }

    const groupName = result._id || 'No Date';
    const groupId = result._id
      ? LeadGroupingService._generateNoneGroupId(`${dateField}_${result._id}`)
      : LeadGroupingService._generateNoneGroupId(`${dateField}_none`);

    return {
      groupId,
      groupName,
      leadIds: result.leadIds || [],
      count: result.count || 0,
    };
  }

  /**
   * Group by direct fields (string, number, boolean, date)
   */
  async _groupByDirect(groupConfig, baseQuery, user, options) {
    const { field, type } = groupConfig;

    // Handle context-aware date fields
    if (type === 'context_date') {
      return await this._groupByContextDate(field, baseQuery, user, options);
    }

    // Special handling for date fields to group by date only (without time)
    let groupExpression = `$${field}`;
    if (type === 'date') {
      // Group by date only (YYYY-MM-DD) instead of full timestamp
      groupExpression = {
        $dateToString: {
          format: '%Y-%m-%d',
          date: `$${field}`,
          onNull: null, // Handle null dates
        },
      };
    } else if (field === 'stage' || field === 'status') {
      // Use conditional expression to extract ID from object or use string value
      groupExpression = {
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

    // Build aggregation pipeline
    const pipeline = [
      { $match: baseQuery },
      {
        $group: {
          _id: groupExpression,
          leadIds: { $push: '$_id' },
          count: { $sum: 1 },
          // For stage/status, also capture the original field for name extraction
          ...(field === 'stage' || field === 'status'
            ? {
                sampleField: { $first: `$${field}` },
              }
            : {}),
        },
      },
      // Remove hardcoded sorting - let the _sortGroups function handle it
    ];

    const results = await Lead.aggregate(pipeline);

    return results.map((result) => {
      let groupId = result._id;
      let groupName = 'None';

      if (result._id === null) {
        groupId = LeadGroupingService._generateNoneGroupId(field);
        groupName = 'None';
      } else if (field === 'stage' || field === 'status') {
        // For stage/status, extract name from sampleField if it's an object
        if (result.sampleField && typeof result.sampleField === 'object') {
          groupName = result.sampleField.name || result._id;
        } else {
          // If it's a string value, generate deterministic ID to avoid conflicts
          if (typeof result._id === 'string') {
            groupId = LeadGroupingService._generateNoneGroupId(`${field}_${result._id}`);
          }
          groupName = result._id;
        }
      } else {
        // Special handling for date fields that were converted to strings
        if (type === 'date' && typeof result._id === 'string') {
          groupName = result._id; // Already formatted as YYYY-MM-DD
          groupId = LeadGroupingService._generateNoneGroupId(`${field}_${result._id}`);
        } else {
          groupName = this._formatValue(result._id, type);
          // Generate deterministic ObjectId for all non-null primitive values to ensure consistent navigation
          if (
            typeof result._id === 'string' ||
            typeof result._id === 'number' ||
            typeof result._id === 'boolean'
          ) {
            groupId = LeadGroupingService._generateNoneGroupId(`${field}_${result._id}`);
          }
        }
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
   * Get display name for reference objects
   */
  _getDisplayName(ref, collection) {
    switch (collection) {
      case 'User':
        return ref.login || `${ref.first_name} ${ref.last_name}`.trim() || 'Unknown User';
      case 'Team':
        return ref.name || 'Unknown Project';
      case 'Source':
        return ref.name || 'Unknown Source';
      default:
        return ref.name || ref.login || 'Unknown';
    }
  }

  /**
   * Format value for display
   */
  _formatValue(value, type) {
    if (value === null || value === undefined) return 'None';

    switch (type) {
      case 'boolean':
        return value ? 'Yes' : 'No';
      case 'number':
        return value.toLocaleString();
      case 'date':
        return new Date(value).toLocaleDateString();
      default:
        return value.toString();
    }
  }

  /**
   * Sort leads within groups by lead-specific fields
   * @param {Array} groups - Array of groups with leads
   * @param {string} sortBy - Sort field
   * @param {string} sortOrder - Sort order
   */
  async _sortLeadsWithinGroups(groups, sortBy, sortOrder) {
    for (const group of groups) {
      if (group.leads && group.leads.length > 0) {
        // Sort leads within the group
        group.leads.sort((a, b) => {
          const aValue = this._extractLeadFieldValue(a, sortBy);
          const bValue = this._extractLeadFieldValue(b, sortBy);
          return this._compareValues(aValue, bValue, sortOrder);
        });
      }
    }
  }

  /**
   * Extract field value from lead object for sorting
   * @param {Object} lead - Lead object
   * @param {string} field - Field name
   * @returns {*} - Field value
   */
  _extractLeadFieldValue(lead, field) {
    switch (field) {
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
      // Offer-related fields (from populated offers)
      case 'title':
        return lead.offers?.[0]?.title || '';
      case 'investment_volume':
        return lead.offers?.[0]?.investment_volume || 0;
      case 'interest_rate':
        return lead.offers?.[0]?.interest_rate || 0;
      case 'payment_terms':
        return (
          lead.offers?.[0]?.payment_terms?.name ||
          lead.offers?.[0]?.payment_terms_details?.name ||
          ''
        );
      case 'bonus_amount':
        return (
          lead.offers?.[0]?.bonus_amount?.info?.bonus_amount ||
          lead.offers?.[0]?.bonus_amount_details?.info?.bonus_amount ||
          0
        );
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
   * Get the first lead's value for a specific field (for group sorting)
   * @param {Object} group - Group object
   * @param {string} field - Field name
   * @returns {*} - Field value from first lead
   */
  _getFirstLeadValue(group, field) {
    if (group.leads && group.leads.length > 0) {
      return this._extractLeadFieldValue(group.leads[0], field);
    }

    // If leads are not populated, we need to fetch the first lead to get its value
    // This is a fallback for when includeLeads is false
    if (group.leadIds && group.leadIds.length > 0) {
      // Return a placeholder that will be resolved during sorting
      return { needsResolution: true, leadId: group.leadIds[0], field };
    }

    return this._getDefaultValueForField(field);
  }

  /**
   * Get default value for a field when no leads are available
   * @param {string} field - Field name
   * @returns {*} - Default value
   */
  _getDefaultValueForField(field) {
    switch (field) {
      case 'contact_name':
      case 'lead_source_no':
      case 'email_from':
      case 'phone':
      case 'title':
      case 'payment_terms':
      case 'bank_name':
      case 'project_name':
      case 'agent':
      case 'offer_status':
      case 'current_stage':
        return '';
      case 'expected_revenue':
      case 'investment_volume':
      case 'interest_rate':
      case 'bonus_amount':
        return 0;
      case 'createdAt':
      case 'updatedAt':
      case 'lead_date':
        return new Date(0);
      default:
        return '';
    }
  }

  /**
   * Compare two values for sorting
   * @param {*} a - First value
   * @param {*} b - Second value
   * @param {string} sortOrder - Sort order (asc/desc)
   * @returns {number} - Comparison result
   */
  _compareValues(a, b, sortOrder) {
    // Handle null/undefined values
    if (a === null || a === undefined) a = '';
    if (b === null || b === undefined) b = '';

    // Handle string comparison
    if (typeof a === 'string' && typeof b === 'string') {
      if (sortOrder === 'desc') {
        return b.localeCompare(a);
      } else {
        return a.localeCompare(b);
      }
    }

    // Handle numeric/date comparison
    if (sortOrder === 'desc') {
      return b > a ? 1 : b < a ? -1 : 0;
    } else {
      return a > b ? 1 : a < b ? -1 : 0;
    }
  }

  /**
   * Available sorting options for grouping results
   */
  static GROUPING_SORT_OPTIONS = {
    // Group-level sorting (for grouping results)
    count: { description: 'Sort by number of leads in group', type: 'number' },
    name: { description: 'Sort by group name alphabetically', type: 'string' },
    avg_revenue: { description: 'Sort by average expected revenue', type: 'number' },
    total_revenue: { description: 'Sort by total expected revenue', type: 'number' },
    latest_lead: { description: 'Sort by most recent lead date', type: 'date' },
    oldest_lead: { description: 'Sort by oldest lead date', type: 'date' },

    // Lead-specific sorting (consistent with leads.js)
    contact_name: { description: 'Sort by contact name', type: 'string' },
    lead_source_no: { description: 'Sort by lead source number', type: 'string' },
    expected_revenue: { description: 'Sort by expected revenue', type: 'number' },
    createdAt: { description: 'Sort by creation date', type: 'date' },
    updatedAt: { description: 'Sort by last update date', type: 'date' },
    lead_date: { description: 'Sort by lead date', type: 'date' },
    email_from: { description: 'Sort by email address', type: 'string' },
    phone: { description: 'Sort by phone number', type: 'string' },

    // Offer-specific sorting (for progress-related groupings)
    title: { description: 'Sort by offer title', type: 'string' },
    investment_volume: { description: 'Sort by investment volume', type: 'number' },
    interest_rate: { description: 'Sort by interest rate', type: 'number' },
    payment_terms: { description: 'Sort by payment terms', type: 'string' },
    bonus_amount: { description: 'Sort by bonus amount', type: 'number' },
    bank_name: { description: 'Sort by bank name', type: 'string' },
    project_name: { description: 'Sort by project name', type: 'string' },
    agent: { description: 'Sort by agent', type: 'string' },
    offer_status: { description: 'Sort by offer status', type: 'string' },
    current_stage: { description: 'Sort by current progress stage', type: 'string' },
  };

  /**
   * Calculate advanced metrics for a group
   * @param {Array} leadIds - Array of lead IDs in the group
   * @returns {Promise<Object>} - Calculated metrics
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

    const leads = await Lead.find({
      _id: { $in: leadIds },
    })
      .select('expected_revenue lead_date createdAt')
      .lean();

    const revenues = leads.map((l) => l.expected_revenue || 0).filter((r) => r > 0);
    const dates = leads.map((l) => l.lead_date || l.createdAt).filter((d) => d);

    return {
      avgRevenue:
        revenues.length > 0 ? revenues.reduce((sum, r) => sum + r, 0) / revenues.length : 0,
      totalRevenue: revenues.reduce((sum, r) => sum + r, 0),
      latestLeadDate:
        dates.length > 0 ? new Date(Math.max(...dates.map((d) => new Date(d)))) : null,
      oldestLeadDate:
        dates.length > 0 ? new Date(Math.min(...dates.map((d) => new Date(d)))) : null,
    };
  }

  /**
   * Sort grouped results with advanced sorting options - "None" groups always appear last
   */
  async _sortGroups(groups, sortBy, sortOrder, groupByField = null) {
    // Separate "None" groups from others
    const noneGroups = groups.filter((group) => group.groupName === 'None');

    const regularGroups = groups.filter((group) => group.groupName !== 'None');

    // Special handling for status and stage grouping with custom stage priority
    if (groupByField === 'status') {
      return await this._sortStatusGroups(regularGroups, noneGroups, sortBy, sortOrder);
    }

    if (groupByField === 'stage') {
      return await this._sortStageGroups(regularGroups, noneGroups, sortBy, sortOrder);
    }

    // Check if this is a lead-specific sorting field
    const isLeadSpecificSort = [
      'contact_name',
      'lead_source_no',
      'expected_revenue',
      'createdAt',
      'updatedAt',
      'lead_date',
      'email_from',
      'phone',
      // Offer-specific fields
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
    ].includes(sortBy);

    if (isLeadSpecificSort) {
      // For lead-specific sorting, we need to sort leads within each group first
      await this._sortLeadsWithinGroups(regularGroups, sortBy, sortOrder);

      // Then sort groups by the first lead's value in that field
      const sortedRegularGroups = regularGroups.sort((a, b) => {
        const aValue = this._getFirstLeadValue(a, sortBy);
        const bValue = this._getFirstLeadValue(b, sortBy);

        // Handle placeholder values that need resolution
        if (aValue && aValue.needsResolution) {
          aValue = this._getDefaultValueForField(sortBy);
        }
        if (bValue && bValue.needsResolution) {
          bValue = this._getDefaultValueForField(sortBy);
        }

        return this._compareValues(aValue, bValue, sortOrder);
      });

      // Sort "None" groups by count (largest first) if there are multiple
      const sortedNoneGroups = noneGroups.sort((a, b) => b.count - a.count);

      // Return regular groups first, then "None" groups
      return [...sortedRegularGroups, ...sortedNoneGroups];
    }

    // Calculate metrics for advanced sorting if needed
    if (['avg_revenue', 'total_revenue', 'latest_lead', 'oldest_lead'].includes(sortBy)) {
      for (const group of regularGroups) {
        const metrics = await this._calculateGroupMetrics(group.leadIds);
        group.metrics = metrics;
      }

      // Also calculate for none groups
      for (const group of noneGroups) {
        const metrics = await this._calculateGroupMetrics(group.leadIds);
        group.metrics = metrics;
      }
    }

    // Sort regular groups normally
    const sortedRegularGroups = regularGroups.sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
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
          // Special handling for date-based grouping fields
          if (groupByField && LeadGroupingService.GROUPING_FIELDS[groupByField]?.type === 'date') {
            // For date groups, sort by the group date itself (YYYY-MM-DD format)
            aValue = a.groupName !== 'None' ? new Date(a.groupName + 'T00:00:00Z') : new Date(0);
            bValue = b.groupName !== 'None' ? new Date(b.groupName + 'T00:00:00Z') : new Date(0);
          } else {
            // For non-date groups, use the latest lead date within the group
            aValue = a.metrics?.latestLeadDate || new Date(0);
            bValue = b.metrics?.latestLeadDate || new Date(0);
          }
          break;
        case 'oldest_lead':
          // Special handling for date-based grouping fields
          if (groupByField && LeadGroupingService.GROUPING_FIELDS[groupByField]?.type === 'date') {
            // For date groups, sort by the group date itself (YYYY-MM-DD format)
            aValue = a.groupName !== 'None' ? new Date(a.groupName + 'T00:00:00Z') : new Date(0);
            bValue = b.groupName !== 'None' ? new Date(b.groupName + 'T00:00:00Z') : new Date(0);
          } else {
            // For non-date groups, use the oldest lead date within the group
            aValue = a.metrics?.oldestLeadDate || new Date();
            bValue = b.metrics?.oldestLeadDate || new Date();
          }
          break;
        default:
          aValue = a.count;
          bValue = b.count;
      }

      return this._compareValues(aValue, bValue, sortOrder);
    });

    // Sort "None" groups by count (largest first) if there are multiple
    const sortedNoneGroups = noneGroups.sort((a, b) => b.count - a.count);

    // Return regular groups first, then "None" groups
    return [...sortedRegularGroups, ...sortedNoneGroups];
  }

  /**
   * Sort status groups by custom stage priority order
   */
  async _sortStatusGroups(regularGroups, noneGroups, sortBy, sortOrder) {
    try {
      // Get stage and status maps
      const { getStageAndStatusMaps } = require('./leadService/utils');
      const { stageMap, statusMap } = await getStageAndStatusMaps();

      // Define stage priority order (lower number = higher priority)
      const stagePriority = {
        New: 1,
        Positiv: 2, // Positive stage
        Opening: 3,
        Negative: 4,
        Negativ: 4, // Alternative spelling
        Neg: 4, // Short form
        default: 999, // Any other stages go to the end
      };

      // Enhance each group with stage information
      for (const group of regularGroups) {
        let stageName = 'default';
        let stagePriorityValue = stagePriority.default;

        // If group has reference (populated status object), use its stage info
        if (group.reference && group.reference.stageName) {
          stageName = group.reference.stageName;
        } else {
          // Try to find stage info by group ID or name
          const statusInfo = statusMap[group.groupId] || statusMap[group.groupName];
          if (statusInfo && statusInfo.stageName) {
            stageName = statusInfo.stageName;
          }
        }

        // Get priority value (case-insensitive matching)
        const matchingStage = Object.keys(stagePriority).find(
          (stage) => stage.toLowerCase() === stageName.toLowerCase()
        );
        if (matchingStage) {
          stagePriorityValue = stagePriority[matchingStage];
        }

        // Add sorting metadata to group
        group._sortingMetadata = {
          stageName,
          stagePriority: stagePriorityValue,
        };
      }

      // Sort groups by stage priority first, then by the requested sortBy criteria
      const sortedRegularGroups = regularGroups.sort((a, b) => {
        // Primary sort: by stage priority
        const stageDiff = a._sortingMetadata.stagePriority - b._sortingMetadata.stagePriority;
        if (stageDiff !== 0) {
          return stageDiff;
        }

        // Secondary sort: by the requested criteria within the same stage
        let aValue, bValue;

        switch (sortBy) {
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

        // Handle string comparison
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          if (sortOrder === 'desc') {
            return bValue.localeCompare(aValue);
          } else {
            return aValue.localeCompare(bValue);
          }
        }

        // Handle numeric comparison
        if (sortOrder === 'desc') {
          return bValue > aValue ? 1 : bValue < aValue ? -1 : 0;
        } else {
          return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
        }
      });

      // Clean up sorting metadata
      for (const group of sortedRegularGroups) {
        delete group._sortingMetadata;
      }

      // Sort "None" groups by count (largest first) if there are multiple
      const sortedNoneGroups = noneGroups.sort((a, b) => b.count - a.count);

      // Return regular groups first, then "None" groups
      return [...sortedRegularGroups, ...sortedNoneGroups];
    } catch (error) {
      logger.error('Error sorting status groups by stage priority:', error);
      // Fallback to default sorting if there's an error
      return [...regularGroups, ...noneGroups];
    }
  }

  /**
   * Sort stage groups by custom stage priority order
   */
  async _sortStageGroups(regularGroups, noneGroups, sortBy, sortOrder) {
    try {
      // Define stage priority order (lower number = higher priority)
      const stagePriority = {
        New: 1,
        Positiv: 2, // Positive stage (German)
        Positive: 2, // English variant
        Opening: 3,
        Negative: 4,
        Negativ: 4, // Alternative spelling
        Neg: 4, // Short form
        default: 999, // Any other stages go to the end
      };

      // Enhance each group with stage priority information
      for (const group of regularGroups) {
        let stageName = group.groupName || 'default';
        let stagePriorityValue = stagePriority.default;

        // If group has reference (populated stage object), use its name
        if (group.reference && group.reference.name) {
          stageName = group.reference.name;
        }

        // Get priority value (case-insensitive matching)
        const matchingStage = Object.keys(stagePriority).find(
          (stage) => stage.toLowerCase() === stageName.toLowerCase()
        );
        if (matchingStage) {
          stagePriorityValue = stagePriority[matchingStage];
        }

        // Add sorting metadata to group
        group._sortingMetadata = {
          stageName,
          stagePriority: stagePriorityValue,
        };
      }

      // Sort groups by stage priority first, then by the requested sortBy criteria
      const sortedRegularGroups = regularGroups.sort((a, b) => {
        // Primary sort: by stage priority
        const stageDiff = a._sortingMetadata.stagePriority - b._sortingMetadata.stagePriority;
        if (stageDiff !== 0) {
          return stageDiff;
        }

        // Secondary sort: by the requested criteria within the same stage
        let aValue, bValue;

        switch (sortBy) {
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

        // Handle string comparison
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          if (sortOrder === 'desc') {
            return bValue.localeCompare(aValue);
          } else {
            return aValue.localeCompare(bValue);
          }
        }

        // Handle numeric comparison
        if (sortOrder === 'desc') {
          return bValue > aValue ? 1 : bValue < aValue ? -1 : 0;
        } else {
          return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
        }
      });

      // Clean up sorting metadata
      for (const group of sortedRegularGroups) {
        delete group._sortingMetadata;
      }

      // Sort "None" groups by count (largest first) if there are multiple
      const sortedNoneGroups = noneGroups.sort((a, b) => b.count - a.count);

      // Return regular groups first, then "None" groups
      return [...sortedRegularGroups, ...sortedNoneGroups];
    } catch (error) {
      logger.error('Error sorting stage groups by stage priority:', error);
      // Fallback to default sorting if there's an error
      return [...regularGroups, ...noneGroups];
    }
  }

  /**
   * Get available grouping options in prioritized order
   * @param {Object} user - User object for role-based filtering
   */
  getAvailableGroupings(user = null) {
    // Get all available fields
    const allFields = Object.keys(LeadGroupingService.GROUPING_FIELDS);

    // Fields to hide from agents (only agent field for privacy)
    const agentHiddenFields = [
      'agent', // Hide agent grouping to prevent seeing other agents' information
    ];

    // Entity relationship fields to hide from grouping options (they have special handling)
    const entityRelationshipFields = [
      'has_offer',
      'has_opening',
      'has_confirmation',
      'has_payment',
      'has_todo',
      'has_extra_todo',
      'has_assigned_todo',
    ];

    // Fields that conflict with agent grouping
    const agentConflictFields = [
      'last_transfer', // Exclude last_transfer when agent grouping is used
    ];

    // Admin priority order (includes all fields)
    const adminPriorityOrder = ['project', 'agent', 'stage', 'status', 'source', 'lead_date'];

    // Agent priority order (focused on their workflow, excluding agent field)
    const agentPriorityOrder = ['project', 'stage', 'status', 'source', 'lead_date'];

    let availableFields;
    let priorityOrder;

    // Filter fields based on user role
    if (user && user.role !== 'Admin') {
      // Agent or non-admin user - hide agent fields and entity relationship fields
      availableFields = allFields.filter(
        (key) => !agentHiddenFields.includes(key) && !entityRelationshipFields.includes(key)
      );
      priorityOrder = agentPriorityOrder;
    } else {
      // Admin user - hide only entity relationship fields (they can see agent field)
      availableFields = allFields.filter((key) => !entityRelationshipFields.includes(key));
      priorityOrder = adminPriorityOrder;
    }

    // Get priority fields first
    const priorityFields = priorityOrder.filter((key) => availableFields.includes(key));

    // Get remaining fields (excluding priority ones)
    const remainingFields = availableFields.filter((key) => !priorityOrder.includes(key));

    // Combine in the specified order
    const orderedFields = [...priorityFields, ...remainingFields];

    return orderedFields.map((key) => ({
      key,
      label: key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      type: LeadGroupingService.GROUPING_FIELDS[key].type,
      ...(user &&
        user.role !== 'Admin' && {
          // Add helpful descriptions for agent fields
          description: this._getFieldDescription(key),
        }),
    }));
  }

  /**
   * Get helpful descriptions for grouping fields (especially for agents)
   * @param {string} field - Field name
   * @returns {string} - Field description
   */
  _getFieldDescription(field) {
    const descriptions = {
      stage: 'Group leads by their current stage in the sales process',
      status: 'Group leads by their current status',
      source: 'Group leads by where they came from',
      lead_date: 'Group leads by the date they were created',
      lead_date_month: 'Group leads by month',
      lead_date_year: 'Group leads by year',
      lead_date_week: 'Group leads by week',
      has_offer: 'Group leads by whether they have an offer',
      has_opening: 'Group leads by whether they have an opening',
      has_confirmation: 'Group leads by whether they have confirmation',
      has_payment: 'Group leads by whether they have payment',
      has_todo: 'Group leads by whether they have pending tasks',
      has_extra_todo: 'Group leads by whether they have todos assigned to them',
      has_assigned_todo: 'Group leads by whether they have assigned todos to others',
      is_favourite: 'Group leads by whether they are marked as favourite',
      last_transfer: 'Group leads by their last transfer history (FromAgent→ToAgent(date))',
      contact_name: 'Group leads by contact name',
      email_from: 'Group leads by email address',
      phone: 'Group leads by phone number',
      use_status: 'Group leads by usage status',
    };

    return descriptions[field] || '';
  }

  /**
   * Group leads by multiple fields in a nested structure
   * @param {Array} groupingLevels - Array of field names to group by (e.g., ['project', 'agent', 'stage'])
   * @param {Object} user - User object for permissions
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Nested grouped results
   */
  async groupLeadsMultilevel(groupingLevels, user, options = {}) {
    const startTime = Date.now();

    try {
      logger.info('Starting multilevel lead grouping', {
        groupingLevels,
        userRole: user?.role,
        filterCount: (options.filters || []).length,
        hasBaseQuery: !!options.baseQuery,
      });

      // Validate grouping levels
      if (!Array.isArray(groupingLevels) || groupingLevels.length === 0) {
        throw new Error('Grouping levels must be a non-empty array');
      }

      if (groupingLevels.length > 5) {
        throw new Error('Maximum 5 grouping levels allowed for performance reasons');
      }

      // Validate each grouping field
      for (const field of groupingLevels) {
        if (!LeadGroupingService.GROUPING_FIELDS[field]) {
          throw new Error(`Invalid grouping field: ${field}`);
        }
      }

      // Validate field combinations - last_transfer cannot be combined with agent
      if (groupingLevels.includes('last_transfer') && groupingLevels.includes('agent')) {
        throw new Error('last_transfer grouping cannot be combined with agent grouping');
      }

      const {
        page = 1,
        limit = 50,
        filters = [],
        sortBy = 'count',
        sortOrder = 'desc',
        includeLeads = false, // Default to false for performance, like single-level grouping
        maxLeadsPerGroup = null,
        search = null,
      } = options;

      // Check if baseQuery is provided in options (for optimized details endpoint)
      let baseQuery = options.baseQuery;

      if (!baseQuery) {
        // Build baseQuery from scratch if not provided
        // Check if user is explicitly filtering by 'active' field
        const hasActiveFilter = filters.some((filter) => filter && filter.field === 'active');

        // Apply dynamic filters first if provided - only add active: true if user isn't explicitly filtering by active
        baseQuery = hasActiveFilter ? {} : { active: true };

        // Apply user permissions
        if (user.role !== 'Admin') {
          const assignments = await AssignLeads.find({
            agent_id: user._id,
            status: 'active',
          }).select('lead_id');
          const assignedLeadIds = assignments.map((a) => a.lead_id);
          baseQuery._id = { $in: assignedLeadIds };
        }
      } else {
        // Merge with existing baseQuery if provided
        // If baseQuery already has _id filter and user is not Admin, merge them
        if (user.role !== 'Admin') {
          const assignments = await AssignLeads.find({
            agent_id: user._id,
            status: 'active',
          }).select('lead_id');
          const assignedLeadIds = assignments.map((a) => a.lead_id);
          
          if (baseQuery._id && baseQuery._id.$in) {
            // Intersect with existing lead IDs
            const existingIds = new Set(baseQuery._id.$in.map((id) => id.toString()));
            const newIds = new Set(assignedLeadIds.map((id) => id.toString()));
            const intersection = Array.from(existingIds).filter((id) => newIds.has(id));
            baseQuery._id = { $in: intersection.map((id) => new mongoose.Types.ObjectId(id)) };
          } else {
            baseQuery._id = { $in: assignedLeadIds };
          }
        }
      }

      // Apply search filter if provided
      if (search && search.trim()) {
        const searchRegex = new RegExp(search.trim(), 'i');
        const searchQuery = {
          $or: [
            { contact_name: searchRegex },
            { email_from: searchRegex },
            { phone: searchRegex },
            { lead_source_no: searchRegex },
          ],
        };

        if (baseQuery.$and) {
          baseQuery.$and.push(searchQuery);
        } else {
          baseQuery = { $and: [baseQuery, searchQuery] };
        }
      }

      // NEW: Apply bulk search by partner IDs if provided
      const { partner_ids } = options;
      if (partner_ids && Array.isArray(partner_ids) && partner_ids.length > 0) {
        const bulkSearchQuery = {
          lead_source_no: { $in: partner_ids },
        };

        if (baseQuery.$and) {
          baseQuery.$and.push(bulkSearchQuery);
        } else {
          baseQuery = { $and: [baseQuery, bulkSearchQuery] };
        }

        logger.info('Applied bulk search by partner IDs', {
          partnerIdsCount: partner_ids.length,
          partnerIds: partner_ids.slice(0, 5), // Log first 5 for debugging
        });
      }

      // Apply additional filters if provided
      if (filters && filters.length > 0) {
        // Sanitize filters for multilevel grouping:
        // If any of the following are present, ignore has_todo to avoid conflicting intersections
        const shouldIgnoreHasTodo = (filters || []).some(
          (f) =>
            f &&
            ['done_todos', 'pending_todos', 'has_extra_todo', 'has_assigned_todo'].includes(
              f.field
            ) &&
            (f.value === true || f.value === 'true')
        );

        const sanitizedFilters = shouldIgnoreHasTodo
          ? (filters || []).filter((f) => !(f && f.field === 'has_todo'))
          : filters;

        const { applyDynamicFilters } = require('./dynamicFilterService');
        const { query } = await applyDynamicFilters(sanitizedFilters, user);

        logger.info('Multilevel grouping: Applied dynamic filters', {
          originalFilterCount: filters.length,
          sanitizedFilterCount: sanitizedFilters.length,
          shouldIgnoreHasTodo,
          originalFilters: filters.map((f) => ({ field: f.field, value: f.value })),
          sanitizedFilters: sanitizedFilters.map((f) => ({ field: f.field, value: f.value })),
        });

        if (baseQuery.$and) {
          baseQuery.$and.push(query);
        } else {
          baseQuery = { $and: [baseQuery, query] };
        }
      }

      // Build the nested grouping structure
      logger.info('Building multilevel groups', {
        groupingLevels,
        hasBaseQuery: !!baseQuery,
        baseQueryKeys: Object.keys(baseQuery || {}),
        optionsKeys: Object.keys(options || {}),
      });

      // Derive todo-related flags from filters to keep behavior consistent with /leads
      const derivedTodoFlags = {
        has_todo: (filters || []).some(
          (f) => f && f.field === 'has_todo' && (f.value === true || f.value === 'true')
        ),
        has_extra_todo: (filters || []).some(
          (f) => f && f.field === 'has_extra_todo' && (f.value === true || f.value === 'true')
        ),
        has_assigned_todo: (filters || []).some(
          (f) => f && f.field === 'has_assigned_todo' && (f.value === true || f.value === 'true')
        ),
        pending_todos: (filters || []).some(
          (f) => f && f.field === 'pending_todos' && (f.value === true || f.value === 'true')
        ),
        done_todos: (filters || []).some(
          (f) => f && f.field === 'done_todos' && (f.value === true || f.value === 'true')
        ),
      };

      // IMPORTANT: If done_todos/pending_todos/has_extra_todo/has_assigned_todo are in filters,
      // applyDynamicFilters already handled them, so don't pass conflicting has_todo to executeLeadQuery
      const shouldSuppressHasTodoInQuery =
        derivedTodoFlags.done_todos ||
        derivedTodoFlags.pending_todos ||
        derivedTodoFlags.has_extra_todo ||
        derivedTodoFlags.has_assigned_todo;

      const mergedOptions = {
        ...options,
        includeLeads,
        // Only override when not explicitly provided in options (query params)
        // Suppress has_todo if conflicting filters are present (they're already applied)
        has_todo:
          options.has_todo ||
          (shouldSuppressHasTodoInQuery ? false : derivedTodoFlags.has_todo) ||
          null,
        pending_todos:
          options.pending_todos !== undefined && options.pending_todos !== null
            ? options.pending_todos
            : derivedTodoFlags.pending_todos || null,
        done_todos:
          options.done_todos !== undefined && options.done_todos !== null
            ? options.done_todos
            : derivedTodoFlags.done_todos || null,
        // Pass-through flags used for adding todos to results when needed
        has_extra_todo: options.has_extra_todo || derivedTodoFlags.has_extra_todo || false,
        has_assigned_todo: options.has_assigned_todo || derivedTodoFlags.has_assigned_todo || false,
      };

      const nestedResults = await this._buildMultilevelGroups(
        groupingLevels,
        baseQuery,
        user,
        mergedOptions
      );

      logger.info('Multilevel groups built successfully', {
        resultCount: nestedResults.length,
        hasResults: nestedResults.length > 0,
      });

      // Sort and paginate the top-level groups
      const sortedResults = await this._sortMultilevelGroups(
        nestedResults,
        sortBy,
        sortOrder,
        groupingLevels[0]
      );
      const total = sortedResults.length;
      const paginatedResults = sortedResults.slice((page - 1) * limit, page * limit);

      const executionTime = Date.now() - startTime;

      // Calculate total leads across all groups
      const totalLeads = this._countLeadsInNestedStructure(nestedResults);

      logger.info('Multilevel lead grouping performance', {
        groupingLevels,
        totalGroups: total,
        totalLeads,
        includeLeads,
        executionTime,
        userRole: user.role,
        performance: executionTime < 1000 ? 'fast' : executionTime < 3000 ? 'moderate' : 'slow',
      });

      // NEW: Build bulk search metadata if partner_ids were provided
      const bulkSearchMeta = {};
      if (partner_ids && partner_ids.length > 0) {
        // Find which partner IDs actually have leads
        const foundPartnerIds = await Lead.find(baseQuery).distinct('lead_source_no');
        const missedPartnerIds = partner_ids.filter((id) => !foundPartnerIds.includes(id));

        bulkSearchMeta.isBulkSearch = true;
        bulkSearchMeta.bulkSearch = {
          searchedPartnerIds: partner_ids,
          totalSearched: partner_ids.length,
          foundPartnerIds,
          totalFound: foundPartnerIds.length,
          missedPartnerIds,
          totalMissed: missedPartnerIds.length,
          message: `Grouped ${totalLeads} leads from ${foundPartnerIds.length}/${partner_ids.length} partner IDs`,
        };
      } else {
        bulkSearchMeta.isBulkSearch = false;
      }

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
          performanceLevel:
            executionTime < 1000 ? 'fast' : executionTime < 3000 ? 'moderate' : 'slow',
          ...bulkSearchMeta, // Spread bulk search metadata if present
        },
      };
    } catch (error) {
      logger.error('Multilevel lead grouping error:', error);
      throw error;
    }
  }

  /**
   * Build nested grouping structure using MongoDB aggregation
   * @param {Array} groupingLevels - Array of field names to group by
   * @param {Object} baseQuery - Base MongoDB query
   * @param {Object} user - User object
   * @param {Object} options - Additional options
   * @returns {Promise<Array>} - Nested grouped results
   */
  async _buildMultilevelGroups(groupingLevels, baseQuery, user, options) {
    // Check if we need assignment data (for project/agent grouping)
    const needsAssignments = groupingLevels.some((field) => ['project', 'agent'].includes(field));

    // Check if we need transfer data (for last_transfer grouping)
    const needsTransfers = groupingLevels.some((field) => field === 'last_transfer');

    // Check if we need context-aware date handling (for context_date fields with entity filters)
    const needsContextDates = groupingLevels.some((field) => {
      const fieldConfig = LeadGroupingService.GROUPING_FIELDS[field];
      const hasEntityContext =
        fieldConfig?.type === 'context_date' &&
        LeadGroupingService._detectEntityContext(options.filters || []);
      return hasEntityContext;
    });

    if (needsAssignments || needsTransfers || needsContextDates) {
      // For project/agent/last_transfer/context-aware date grouping, we need to use enhanced approach
      return await this._buildMultilevelGroupsWithAssignments(
        groupingLevels,
        baseQuery,
        user,
        options
      );
    } else {
      // For direct fields, use the simpler approach
      return await this._buildMultilevelGroupsWithDirectFields(
        groupingLevels,
        baseQuery,
        user,
        options
      );
    }
  }

  /**
   * Get entity-specific date field maps for leads
   * @param {Array} leadIds - Array of lead IDs
   * @param {string} entityContext - Entity context (offer, opening, confirmation, payment, netto)
   * @returns {Promise<Object>} - Maps of lead IDs to entity-specific dates
   */
  async _getEntityDateMaps(leadIds, entityContext) {
    const dateMaps = {};

    try {
      logger.info('Getting entity date maps', {
        entityContext,
        leadCount: leadIds.length,
      });

      switch (entityContext) {
        case 'offer':
          const offers = await Offer.find({
            lead_id: { $in: leadIds, $ne: null },
            active: true,
            createdAt: { $ne: null, $exists: true }, // Filter out null dates
          })
            .select('lead_id createdAt updatedAt')
            .lean();

          logger.info('Found offers for date mapping', {
            offerCount: offers.length,
            leadCount: leadIds.length,
          });

          dateMaps.offer_createdAt = new Map();
          dateMaps.offer_updatedAt = new Map();
          dateMaps.offer_assigned_date = new Map(); // Use createdAt as assigned_date

          offers.forEach((offer, index) => {
            try {
              if (!offer || typeof offer !== 'object') {
                logger.warn('Invalid offer object in date mapping', { index, offer });
                return;
              }

              const leadIdStr = offer.lead_id?.toString();
              if (leadIdStr && offer.createdAt) {
                dateMaps.offer_createdAt.set(leadIdStr, offer.createdAt);
                dateMaps.offer_updatedAt.set(leadIdStr, offer.updatedAt || offer.createdAt);
                dateMaps.offer_assigned_date.set(leadIdStr, offer.createdAt);
              } else {
                logger.warn('Offer missing required fields', {
                  index,
                  offerId: offer._id,
                  hasLeadId: !!offer.lead_id,
                  hasCreatedAt: !!offer.createdAt,
                });
              }
            } catch (offerError) {
              logger.error('Error processing offer in date mapping', {
                index,
                error: offerError.message,
                offer: offer ? { _id: offer._id, lead_id: offer.lead_id } : 'null',
              });
            }
          });
          break;

        case 'opening':
          const offersForOpenings = await Offer.find({
            lead_id: { $in: leadIds, $ne: null },
            active: true,
          })
            .select('_id lead_id')
            .lean();

          const offerIds = offersForOpenings.map((o) => o._id);
          const offerLeadMap = new Map(offersForOpenings.map((o) => [o._id.toString(), o.lead_id]));

          const openings = await Opening.find({
            offer_id: { $in: offerIds },
            active: true,
          })
            .select('offer_id createdAt updatedAt')
            .lean();

          dateMaps.opening_createdAt = new Map();
          dateMaps.opening_updatedAt = new Map();
          dateMaps.opening_assigned_date = new Map();

          openings.forEach((opening) => {
            const leadId = offerLeadMap.get(opening.offer_id.toString());
            if (leadId) {
              const leadIdStr = leadId.toString();
              dateMaps.opening_createdAt.set(leadIdStr, opening.createdAt);
              dateMaps.opening_updatedAt.set(leadIdStr, opening.updatedAt);
              dateMaps.opening_assigned_date.set(leadIdStr, opening.createdAt);
            }
          });
          break;

        case 'confirmation':
          // Similar pattern for confirmations
          const offersForConfirmations = await Offer.find({
            lead_id: { $in: leadIds, $ne: null },
            active: true,
          })
            .select('_id lead_id')
            .lean();

          const confirmationOfferIds = offersForConfirmations.map((o) => o._id);
          const confirmationOfferLeadMap = new Map(
            offersForConfirmations.map((o) => [o._id.toString(), o.lead_id])
          );

          const confirmations = await Confirmation.find({
            offer_id: { $in: confirmationOfferIds },
            active: true,
          })
            .select('offer_id createdAt updatedAt')
            .lean();

          dateMaps.confirmation_createdAt = new Map();
          dateMaps.confirmation_updatedAt = new Map();
          dateMaps.confirmation_assigned_date = new Map();

          confirmations.forEach((confirmation) => {
            const leadId = confirmationOfferLeadMap.get(confirmation.offer_id.toString());
            if (leadId) {
              const leadIdStr = leadId.toString();
              dateMaps.confirmation_createdAt.set(leadIdStr, confirmation.createdAt);
              dateMaps.confirmation_updatedAt.set(leadIdStr, confirmation.updatedAt);
              dateMaps.confirmation_assigned_date.set(leadIdStr, confirmation.createdAt);
            }
          });
          break;

        case 'payment':
          // Similar pattern for payments
          const offersForPayments = await Offer.find({
            lead_id: { $in: leadIds, $ne: null },
            active: true,
          })
            .select('_id lead_id')
            .lean();

          const paymentOfferIds = offersForPayments.map((o) => o._id);
          const paymentOfferLeadMap = new Map(
            offersForPayments.map((o) => [o._id.toString(), o.lead_id])
          );

          const payments = await PaymentVoucher.find({
            offer_id: { $in: paymentOfferIds },
            active: true,
          })
            .select('offer_id createdAt updatedAt')
            .lean();

          dateMaps.payment_createdAt = new Map();
          dateMaps.payment_updatedAt = new Map();
          dateMaps.payment_assigned_date = new Map();

          payments.forEach((payment) => {
            const leadId = paymentOfferLeadMap.get(payment.offer_id.toString());
            if (leadId) {
              const leadIdStr = leadId.toString();
              dateMaps.payment_createdAt.set(leadIdStr, payment.createdAt);
              dateMaps.payment_updatedAt.set(leadIdStr, payment.updatedAt);
              dateMaps.payment_assigned_date.set(leadIdStr, payment.createdAt);
            }
          });
          break;

        case 'netto':
          // Similar pattern for netto records
          const offersForNetto = await Offer.find({
            lead_id: { $in: leadIds, $ne: null },
            active: true,
          })
            .select('_id lead_id')
            .lean();

          const nettoOfferIds = offersForNetto.map((o) => o._id);
          const nettoOfferLeadMap = new Map(
            offersForNetto.map((o) => [o._id.toString(), o.lead_id])
          );

          const [netto1Records, netto2Records] = await Promise.all([
            Netto1.find({
              offer_id: { $in: nettoOfferIds },
              active: true,
            })
              .select('offer_id createdAt updatedAt')
              .lean(),
            Netto2.find({
              offer_id: { $in: nettoOfferIds },
              active: true,
            })
              .select('offer_id createdAt updatedAt')
              .lean(),
          ]);

          dateMaps.netto_createdAt = new Map();
          dateMaps.netto_updatedAt = new Map();
          dateMaps.netto_assigned_date = new Map();

          [...netto1Records, ...netto2Records].forEach((netto) => {
            const leadId = nettoOfferLeadMap.get(netto.offer_id.toString());
            if (leadId) {
              const leadIdStr = leadId.toString();
              // Use the latest date if multiple netto records exist for the same lead
              if (
                !dateMaps.netto_createdAt.has(leadIdStr) ||
                netto.createdAt > dateMaps.netto_createdAt.get(leadIdStr)
              ) {
                dateMaps.netto_createdAt.set(leadIdStr, netto.createdAt);
                dateMaps.netto_updatedAt.set(leadIdStr, netto.updatedAt);
                dateMaps.netto_assigned_date.set(leadIdStr, netto.createdAt);
              }
            }
          });
          break;
      }
    } catch (error) {
      logger.error('Error getting entity date maps:', error);
    }

    return dateMaps;
  }

  /**
   * Build multilevel groups using assignment data (for project/agent fields)
   */
  async _buildMultilevelGroupsWithAssignments(groupingLevels, baseQuery, user, options) {
    // First, get all leads that match the base query
    const leads = await Lead.find(baseQuery)
      .select(
        '_id stage status source_id expected_revenue leadPrice lead_date assigned_date createdAt updatedAt active tags contact_name email_from phone'
      )
      .populate('source_id', 'name price active color') // Add source population
      .lean();
    const leadIds = leads.map((l) => l._id);

    // Get assignments for these leads
    const assignments = await AssignLeads.find({
      lead_id: { $in: leadIds },
      status: 'active',
    })
      .populate('project_id', '_id name')
      .populate('agent_id', '_id login first_name last_name')
      .select('lead_id project_id agent_id')
      .lean();

    // Create a map of lead_id to assignment data
    const assignmentMap = new Map();
    for (const assignment of assignments) {
      assignmentMap.set(assignment.lead_id.toString(), assignment);
    }

    // Get source data if needed
    let sourceMap = new Map();
    if (groupingLevels.includes('source')) {
      const sourceIds = leads.map((l) => l.source_id).filter((id) => id);
      const sources = await Source.find({ _id: { $in: sourceIds } })
        .select('_id name price active color')
        .lean();
      for (const source of sources) {
        sourceMap.set(source._id.toString(), source);
      }
    }

    // Get transfer data if needed
    let transferMap = new Map();
    if (groupingLevels.includes('last_transfer')) {
      const transfers = await LeadTransfer.find({
        lead_id: { $in: leadIds },
        transfer_status: 'completed',
      })
        .populate('from_agent_id', 'login name')
        .populate('to_agent_id', 'login name')
        .sort({ createdAt: -1 })
        .lean();

      // Create a map to store only the latest transfer per lead
      for (const transfer of transfers) {
        const leadIdStr = transfer.lead_id.toString();
        if (!transferMap.has(leadIdStr)) {
          const fromAgent =
            transfer.from_agent_id?.login || transfer.from_agent_id?.name || 'Unknown';
          const toAgent = transfer.to_agent_id?.login || transfer.to_agent_id?.name || 'Unknown';
          const transferDate = new Date(transfer.createdAt)
            .toLocaleDateString('en-GB')
            .replace(/\//g, '-');
          const transferKey = `${fromAgent}→${toAgent}(${transferDate})`;

          transferMap.set(leadIdStr, transferKey);
        }
      }
    }

    // Get entity-specific date data if needed for context-aware dates
    let entityDateMaps = {};
    const needsEntityDates = groupingLevels.some(
      (field) => LeadGroupingService.GROUPING_FIELDS[field]?.type === 'context_date'
    );

    logger.info('Checking for entity dates need', {
      needsEntityDates,
      groupingLevels,
      contextDateFields: groupingLevels.filter(
        (field) => LeadGroupingService.GROUPING_FIELDS[field]?.type === 'context_date'
      ),
    });

    if (needsEntityDates) {
      try {
        const entityContext = LeadGroupingService._detectEntityContext(options.filters || []);
        logger.info('Entity context detected', {
          entityContext,
          filterCount: (options.filters || []).length,
        });

        if (entityContext) {
          entityDateMaps = await this._getEntityDateMaps(leadIds, entityContext);
          logger.info('Entity date maps created', {
            entityContext,
            mapKeys: Object.keys(entityDateMaps),
            totalMappings: Object.values(entityDateMaps).reduce((sum, map) => sum + map.size, 0),
          });
        }
      } catch (entityError) {
        logger.error('Error in entity date mapping setup', {
          error: entityError.message,
          stack: entityError.stack,
        });
        entityDateMaps = {}; // Fallback to empty maps
      }
    }

    // Enhance leads with assignment, reference, transfer, and entity date data
    const enhancedLeads = leads
      .map((lead, index) => {
        try {
          // Defensive null checking
          if (!lead || typeof lead !== 'object' || !lead._id) {
            logger.warn('Invalid lead object in enhancement', {
              index,
              lead: lead ? Object.keys(lead) : 'null',
              leadId: lead?._id,
            });
            return null;
          }

          const leadIdStr = lead._id.toString();
          const assignment = assignmentMap.get(leadIdStr);
          const source = sourceMap.get(lead.source_id?.toString());
          const lastTransfer = transferMap.get(leadIdStr);

          // Add entity-specific date fields if available
          const entityDateFields = {};
          Object.keys(entityDateMaps).forEach((dateField) => {
            try {
              const entityDateMap = entityDateMaps[dateField];
              if (entityDateMap && entityDateMap.has(leadIdStr)) {
                const dateValue = entityDateMap.get(leadIdStr);
                if (dateValue) {
                  entityDateFields[dateField] = dateValue;
                }
              }
            } catch (dateError) {
              logger.error('Error adding entity date field', {
                dateField,
                leadId: leadIdStr,
                error: dateError.message,
              });
            }
          });

          return {
            ...lead,
            project: assignment?.project_id || null,
            agent: assignment?.agent_id || null,
            source: source || null,
            last_transfer: lastTransfer || null,
            ...entityDateFields, // Add entity-specific date fields
          };
        } catch (error) {
          logger.error('Error enhancing lead', {
            index,
            leadId: lead?._id,
            error: error.message,
            stack: error.stack,
          });
          return null;
        }
      })
      .filter(Boolean); // Remove null entries

    logger.info('Lead enhancement completed', {
      originalCount: leads.length,
      enhancedCount: enhancedLeads.length,
      entityDateFieldsCount: Object.keys(entityDateMaps).length,
    });

    // Build the nested structure recursively
    return this._groupLeadsRecursively(enhancedLeads, groupingLevels, 0, user, options);
  }

  /**
   * Build multilevel groups using direct fields only (no assignments needed)
   */
  async _buildMultilevelGroupsWithDirectFields(groupingLevels, baseQuery, user, options) {
    // Get all leads that match the base query with populated references
    const { executeLeadQuery } = require('./leadService/queries');
    const allLeads = await executeLeadQuery(
      user,
      baseQuery,
      1,
      100000, // Get a large number to avoid pagination issues
      true, // includeOffers
      null, // state
      options.has_todo || null, // has_todo (from options)
      options.todo_scope || 'all', // todo_scope (from options)
      options.pending_todos || null, // pending_todos (from options)
      options.done_todos || null, // done_todos (from options)
      'createdAt', // sortBy
      'desc' // sortOrder
    );

    const leads = allLeads.data;

    // Build the nested structure recursively
    return this._groupLeadsRecursively(leads, groupingLevels, 0, user, options);
  }

  /**
   * Recursively group leads by multiple levels
   * @param {Array} leads - Array of lead objects
   * @param {Array} groupingLevels - Array of field names to group by
   * @param {number} currentLevel - Current grouping level (0-based)
   * @param {Object} user - User object
   * @param {Object} options - Additional options
   * @returns {Array} - Grouped results for current level
   */
  async _groupLeadsRecursively(leads, groupingLevels, currentLevel, user, options) {
    try {
      if (currentLevel >= groupingLevels.length) {
        return leads; // Base case: return leads if we've processed all levels
      }

      const currentField = groupingLevels[currentLevel];
      const groupConfig = LeadGroupingService.GROUPING_FIELDS[currentField];

      logger.info('Multilevel recursive grouping', {
        currentField,
        currentLevel,
        fieldType: groupConfig?.type,
        leadCount: leads.length,
        totalLevels: groupingLevels.length,
      });

      if (!groupConfig) {
        logger.error('Invalid grouping field configuration', { currentField });
        return [];
      }

      // Group leads by the current field
      const groupMap = new Map();
      const nullGroup = {
        groupId: LeadGroupingService._generateNoneGroupId(currentField, currentLevel),
        groupName: 'None',
        leads: [],
        count: 0,
      };

      for (let i = 0; i < leads.length; i++) {
        const lead = leads[i];
        let groupKey = null;
        let groupName = 'None';
        let groupId = null;

        try {
          // Defensive null checking for lead object
          if (!lead || typeof lead !== 'object') {
            logger.warn('Invalid lead object in recursive grouping', {
              index: i,
              currentField,
              currentLevel,
              lead: lead ? 'non-object' : 'null',
            });
            nullGroup.leads.push(lead);
            nullGroup.count++;
            continue;
          }

          // Only log in development or if specifically requested
          if (process.env.NODE_ENV === 'development' || options.debugLogging) {
            logger.debug('Processing lead in recursive grouping', {
              index: i,
              leadId: lead._id,
              currentField,
              currentLevel,
              fieldType: groupConfig?.type,
            });
          }

          // Extract group key based on field type
          switch (currentField) {
            case 'project':
              if (lead.project && lead.project._id) {
                groupKey = lead.project._id.toString();
                groupName = lead.project.name || 'Unknown Project';
                groupId = lead.project._id;
              }
              break;
            case 'agent':
              if (lead.agent && lead.agent._id) {
                groupKey = lead.agent._id.toString();
                groupName =
                  lead.agent.login ||
                  `${lead.agent.first_name} ${lead.agent.last_name}`.trim() ||
                  'Unknown Agent';
                groupId = lead.agent._id;
              }
              break;
            case 'source':
              if (lead.source_id && lead.source_id._id) {
                groupKey = lead.source_id._id.toString();
                groupName = lead.source_id.name || 'Unknown Source';
                groupId = lead.source_id._id;
              }
              break;
            case 'stage':
            case 'status':
              // Handle object fields like stage: {id, name, isWonStage}
              const fieldValue = lead[currentField];
              if (fieldValue && typeof fieldValue === 'object') {
                if (fieldValue._id || fieldValue.id) {
                  groupKey = (fieldValue._id || fieldValue.id).toString();
                  groupName = fieldValue.name || 'Unknown';
                  groupId = fieldValue._id || fieldValue.id;
                }
              } else if (fieldValue !== null && fieldValue !== undefined && fieldValue !== '') {
                // For string values (legacy data), generate deterministic ObjectId to avoid name conflicts
                const deterministicId = LeadGroupingService._generateNoneGroupId(
                  `${currentField}_${fieldValue}`,
                  currentLevel
                );
                groupKey = deterministicId.toString();
                groupName = this._formatValue(fieldValue, groupConfig.type);
                groupId = deterministicId;
              }
              break;
            default:
              // Check if this is a computed field
              if (groupConfig.type === 'computed') {
                // Handle computed fields
                switch (currentField) {
                  case 'is_favourite':
                    // Use the is_favourite field that should be added to the lead object
                    const isFav = lead.is_favourite === true;
                    groupKey = isFav ? 'true' : 'false';
                    groupName = isFav ? 'true' : 'false';
                    groupId = LeadGroupingService._generateNoneGroupId(
                      `${currentField}_${groupKey}`,
                      currentLevel
                    );
                    break;
                  case 'last_transfer':
                    // Use the last_transfer field that should be populated in the lead object
                    if (lead.last_transfer) {
                      groupKey = lead.last_transfer;
                      groupName = lead.last_transfer;
                      groupId = LeadGroupingService._generateNoneGroupId(
                        `transfer_${lead.last_transfer}`,
                        currentLevel
                      );
                    }
                    break;
                  case 'has_offer':
                  case 'has_opening':
                  case 'has_confirmation':
                  case 'has_payment':
                  case 'has_lost':
                  case 'has_todo':
                  case 'has_extra_todo':
                  case 'has_assigned_todo':
                    // For other computed boolean fields
                    const hasValue = lead[currentField] === true;
                    groupKey = hasValue ? 'true' : 'false';
                    groupName = hasValue ? 'true' : 'false';
                    groupId = LeadGroupingService._generateNoneGroupId(
                      `${currentField}_${groupKey}`,
                      currentLevel
                    );
                    break;
                }
              } else if (groupConfig.type === 'context_date') {
                // Handle context-aware date fields
                // For multilevel grouping, we'll use the context-specific date field from the lead object
                try {
                  const entityContext = LeadGroupingService._detectEntityContext(
                    options.filters || []
                  );
                  const contextPrefix = entityContext ? `${entityContext}_` : 'lead_';
                  const contextDateField = `${contextPrefix}${currentField}`;

                  // Safely access the date value
                  const contextValue =
                    lead && typeof lead === 'object' ? lead[contextDateField] : null;
                  const fallbackValue =
                    lead && typeof lead === 'object' ? lead[currentField] : null;
                  const value = contextValue || fallbackValue;

                  if (value !== null && value !== undefined && value !== '') {
                    if (value instanceof Date) {
                      const dateStr = value.toISOString().split('T')[0]; // Extract YYYY-MM-DD
                      groupKey = dateStr;
                      groupName = dateStr;
                      groupId = LeadGroupingService._generateNoneGroupId(
                        `${currentField}_${dateStr}`,
                        currentLevel
                      );
                    } else if (typeof value === 'string' && value.length > 0) {
                      groupKey = value;
                      groupName = value;
                      groupId = LeadGroupingService._generateNoneGroupId(
                        `${currentField}_${value}`,
                        currentLevel
                      );
                    }
                  }
                } catch (error) {
                  logger.error('Error in multilevel context_date grouping:', {
                    error: error.message,
                    currentField,
                    leadId: lead?._id,
                    currentLevel,
                  });
                }
              } else {
                // Direct field access for non-computed fields
                const value = lead[currentField];
                if (value !== null && value !== undefined && value !== '') {
                  // Handle object fields for any other object-type fields
                  if (typeof value === 'object' && (value._id || value.id)) {
                    groupKey = (value._id || value.id).toString();
                    groupName = value.name || this._formatValue(value, groupConfig.type);
                    groupId = value._id || value.id;
                  } else {
                    // Special handling for date fields to group by date only (YYYY-MM-DD)
                    if (groupConfig.type === 'date' && value instanceof Date) {
                      const dateStr = value.toISOString().split('T')[0]; // Extract YYYY-MM-DD
                      groupKey = dateStr;
                      groupName = dateStr;
                      groupId = LeadGroupingService._generateNoneGroupId(
                        `${currentField}_${dateStr}`,
                        currentLevel
                      );
                    } else {
                      groupKey = value.toString();
                      groupName = this._formatValue(value, groupConfig.type);
                      // Generate deterministic ObjectId for string/primitive values to ensure consistent navigation
                      groupId = LeadGroupingService._generateNoneGroupId(
                        `${currentField}_${value.toString()}`,
                        currentLevel
                      );
                    }
                  }
                }
              }
          }

          if (groupKey === null || groupId === null) {
            // logger.debug('Lead assigned to null group', {
            //   index: i,
            //   leadId: lead._id,
            //   currentField,
            //   groupKey,
            //   groupId
            // });
            nullGroup.leads.push(lead);
            nullGroup.count++;
          } else {
            if (!groupMap.has(groupKey)) {
              groupMap.set(groupKey, {
                groupId,
                groupName,
                leads: [],
                count: 0,
              });
            }
            const group = groupMap.get(groupKey);
            if (group) {
              group.leads.push(lead);
              group.count++;
            } else {
              logger.error('Failed to get group from map', { groupKey, currentField });
              nullGroup.leads.push(lead);
              nullGroup.count++;
            }
          }
        } catch (leadError) {
          logger.error('Error processing individual lead in recursive grouping', {
            index: i,
            leadId: lead?._id,
            currentField,
            currentLevel,
            error: leadError.message,
            stack: leadError.stack,
          });
          // Add to null group on error
          nullGroup.leads.push(lead);
          nullGroup.count++;
        }
      }

      // Convert map to array and include null group if it has leads
      const groups = Array.from(groupMap.values());
      if (nullGroup.count > 0) {
        groups.push(nullGroup);
      }

      // If this is the last level, finalize the groups
      if (currentLevel === groupingLevels.length - 1) {
        // This is the final level - prepare the lead data
        for (const group of groups) {
          if (options.includeLeads) {
            // Keep the leads array as is
          } else {
            // Just keep the lead IDs
            group.leadIds = group.leads.map((lead) => lead._id);
            delete group.leads;
          }
        }
        return groups;
      }

      // Recursively process subgroups for next level
      for (const group of groups) {
        const subGroups = await this._groupLeadsRecursively(
          group.leads,
          groupingLevels,
          currentLevel + 1,
          user,
          options
        );

        group.subGroups = subGroups;

        // Remove leads array from intermediate levels (unless it's the final level)
        if (!options.includeLeads || currentLevel < groupingLevels.length - 1) {
          delete group.leads;
        }
      }

      return groups;
    } catch (error) {
      logger.error('Error in multilevel recursive grouping:', {
        error: error.message,
        stack: error.stack,
        currentField: groupingLevels[currentLevel],
        currentLevel,
        leadCount: leads.length,
      });

      // Return empty groups on error to prevent complete failure
      return [];
    }
  }

  /**
   * Sort multilevel grouped results with advanced sorting
   * @param {Array} groups - Grouped results
   * @param {string} sortBy - Sort criteria
   * @param {string} sortOrder - Sort order
   * @returns {Promise<Array>} - Sorted groups
   */
  async _sortMultilevelGroups(groups, sortBy, sortOrder, groupByField = null) {
    // Special handling for status and stage grouping at the top level
    if (groupByField === 'status') {
      const noneGroups = groups.filter((group) => group.groupName === 'None');
      const regularGroups = groups.filter((group) => group.groupName !== 'None');
      const sortedGroups = await this._sortStatusGroups(
        regularGroups,
        noneGroups,
        sortBy,
        sortOrder
      );

      // Recursively sort subgroups
      for (const group of sortedGroups) {
        if (group.subGroups) {
          group.subGroups = await this._sortMultilevelGroups(
            group.subGroups,
            sortBy,
            sortOrder,
            groupByField
          );
        }
      }

      return sortedGroups;
    }

    if (groupByField === 'stage') {
      const noneGroups = groups.filter((group) => group.groupName === 'None');
      const regularGroups = groups.filter((group) => group.groupName !== 'None');
      const sortedGroups = await this._sortStageGroups(
        regularGroups,
        noneGroups,
        sortBy,
        sortOrder
      );

      // Recursively sort subgroups
      for (const group of sortedGroups) {
        if (group.subGroups) {
          group.subGroups = await this._sortMultilevelGroups(
            group.subGroups,
            sortBy,
            sortOrder,
            groupByField
          );
        }
      }

      return sortedGroups;
    }

    // Check if this is a lead-specific sorting field
    const isLeadSpecificSort = [
      'contact_name',
      'lead_source_no',
      'expected_revenue',
      'createdAt',
      'updatedAt',
      'lead_date',
      'email_from',
      'phone',
      // Offer-specific fields
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
    ].includes(sortBy);

    if (isLeadSpecificSort) {
      // For lead-specific sorting, we need to sort leads within each group first
      await this._sortLeadsWithinGroups(groups, sortBy, sortOrder);

      // Then sort groups by the first lead's value in that field
      const sortedGroups = groups.sort((a, b) => {
        let aValue = this._getFirstLeadValue(a, sortBy);
        let bValue = this._getFirstLeadValue(b, sortBy);

        // Handle placeholder values that need resolution
        if (aValue && aValue.needsResolution) {
          aValue = this._getDefaultValueForField(sortBy);
        }
        if (bValue && bValue.needsResolution) {
          bValue = this._getDefaultValueForField(sortBy);
        }

        return this._compareValues(aValue, bValue, sortOrder);
      });

      // Recursively sort subgroups
      for (const group of sortedGroups) {
        if (group.subGroups) {
          group.subGroups = await this._sortMultilevelGroups(
            group.subGroups,
            sortBy,
            sortOrder,
            groupByField
          );
        }
      }

      return sortedGroups;
    }

    // Calculate metrics for advanced sorting if needed
    if (['avg_revenue', 'total_revenue', 'latest_lead', 'oldest_lead'].includes(sortBy)) {
      for (const group of groups) {
        const metrics = await this._calculateGroupMetrics(group.leadIds || []);
        group.metrics = metrics;
      }
    }

    const sortFn = (a, b) => {
      let aValue, bValue;

      switch (sortBy) {
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
          // Special handling for date-based grouping fields
          if (groupByField && LeadGroupingService.GROUPING_FIELDS[groupByField]?.type === 'date') {
            // For date groups, sort by the group date itself (YYYY-MM-DD format)
            aValue = a.groupName !== 'None' ? new Date(a.groupName + 'T00:00:00Z') : new Date(0);
            bValue = b.groupName !== 'None' ? new Date(b.groupName + 'T00:00:00Z') : new Date(0);
          } else {
            // For non-date groups, use the latest lead date within the group
            aValue = a.metrics?.latestLeadDate || new Date(0);
            bValue = b.metrics?.latestLeadDate || new Date(0);
          }
          break;
        case 'oldest_lead':
          // Special handling for date-based grouping fields
          if (groupByField && LeadGroupingService.GROUPING_FIELDS[groupByField]?.type === 'date') {
            // For date groups, sort by the group date itself (YYYY-MM-DD format)
            aValue = a.groupName !== 'None' ? new Date(a.groupName + 'T00:00:00Z') : new Date(0);
            bValue = b.groupName !== 'None' ? new Date(b.groupName + 'T00:00:00Z') : new Date(0);
          } else {
            // For non-date groups, use the oldest lead date within the group
            aValue = a.metrics?.oldestLeadDate || new Date();
            bValue = b.metrics?.oldestLeadDate || new Date();
          }
          break;
        default:
          aValue = a.count;
          bValue = b.count;
      }

      // Handle "None" groups - always put them last
      if (a.groupName === 'None' && b.groupName !== 'None') return 1;
      if (b.groupName === 'None' && a.groupName !== 'None') return -1;

      return this._compareValues(aValue, bValue, sortOrder);
    };

    // Sort current level
    const sortedGroups = groups.sort(sortFn);

    // Recursively sort subgroups
    for (const group of sortedGroups) {
      if (group.subGroups) {
        group.subGroups = await this._sortMultilevelGroups(
          group.subGroups,
          sortBy,
          sortOrder,
          groupByField
        );
      }
    }

    return sortedGroups;
  }

  /**
   * Get available sorting options for lead grouping
   * @param {Object} user - User object for role-based filtering
   * @returns {Object} - Available sorting options
   */
  getAvailableGroupingSorts(user = null) {
    const availableOptions = { ...LeadGroupingService.GROUPING_SORT_OPTIONS };

    // Role-based filtering (if needed in the future)
    if (user && user.role !== 'Admin') {
      // Agent users might have restricted sorting options in the future
      // For now, all options are available to all users
    }

    return {
      options: availableOptions,
      orders: ['asc', 'desc'],
      defaultSort: { field: 'count', order: 'desc' },
      examples: {
        basic: { sortBy: 'count', sortOrder: 'desc' },
        alphabetical: { sortBy: 'name', sortOrder: 'asc' },
        revenue: { sortBy: 'total_revenue', sortOrder: 'desc' },
        activity: { sortBy: 'latest_lead', sortOrder: 'desc' },
        // Lead-specific sorting examples
        contactName: { sortBy: 'contact_name', sortOrder: 'asc' },
        revenue: { sortBy: 'expected_revenue', sortOrder: 'desc' },
        dateCreated: { sortBy: 'createdAt', sortOrder: 'desc' },
        email: { sortBy: 'email_from', sortOrder: 'asc' },
      },
      categories: {
        groupLevel: ['count', 'name', 'avg_revenue', 'total_revenue', 'latest_lead', 'oldest_lead'],
        leadSpecific: [
          'contact_name',
          'lead_source_no',
          'expected_revenue',
          'createdAt',
          'updatedAt',
          'lead_date',
          'email_from',
          'phone',
        ],
        offerSpecific: [
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
        ],
      },
    };
  }

  /**
   * Count total leads in nested structure
   * @param {Array} groups - Nested group structure
   * @returns {number} - Total lead count
   */
  _countLeadsInNestedStructure(groups) {
    let total = 0;

    for (const group of groups) {
      if (group.subGroups) {
        total += this._countLeadsInNestedStructure(group.subGroups);
      } else {
        total += group.count;
      }
    }

    return total;
  }

  /**
   * Build a MongoDB query directly from group path (optimized for details endpoint)
   * Uses aggregation pipelines and batch queries for better performance
   * @param {Array} groupingLevels - Array of field names to group by
   * @param {Array} groupIds - Array of group IDs in the path
   * @param {Object} user - User object for permissions
   * @param {Object} baseQuery - Base query with filters, search, etc.
   * @returns {Promise<Object>} - Query object and group metadata
   */
  async _buildQueryFromGroupPath(groupingLevels, groupIds, user, baseQuery) {
    const query = { ...baseQuery };
    const groupMetadata = [];
    
    // Batch metadata lookups
    const metadataPromises = [];
    const metadataIndices = [];

    // Process each level in the path
    for (let i = 0; i < groupIds.length; i++) {
      const field = groupingLevels[i];
      const groupId = groupIds[i];
      const fieldConfig = LeadGroupingService.GROUPING_FIELDS[field];

      if (!fieldConfig) {
        throw new Error(`Invalid grouping field: ${field}`);
      }

      // Handle "None" group (null values)
      const isNoneGroup = groupId === 'null' || groupId === null;

      switch (fieldConfig.type) {
        case 'reference':
          // Reference fields like project, agent, source
          if (field === 'project') {
            if (!isNoneGroup) {
              const projectId = mongoose.Types.ObjectId.isValid(groupId)
                ? new mongoose.Types.ObjectId(groupId)
                : groupId;
              
              // Use aggregation to get lead IDs efficiently
              const leadIds = await AssignLeads.aggregate([
                {
                  $match: {
                    project_id: projectId,
                    status: 'active',
                  },
                },
                {
                  $group: {
                    _id: '$lead_id',
                  },
                },
                {
                  $project: {
                    _id: 0,
                    lead_id: '$_id',
                  },
                },
              ]);
              
              const leadIdArray = leadIds.map((item) => item.lead_id);
              
              if (query._id && query._id.$in) {
                // Intersect with existing lead IDs using Set for O(1) lookup
                const existingIds = new Set(query._id.$in.map((id) => id.toString()));
                const newIds = new Set(leadIdArray.map((id) => id.toString()));
                const intersection = Array.from(existingIds).filter((id) => newIds.has(id));
                query._id = intersection.length > 0 
                  ? { $in: intersection.map((id) => new mongoose.Types.ObjectId(id)) }
                  : { $in: [] };
              } else {
                query._id = { $in: leadIdArray };
              }

              // Batch metadata lookup
              metadataIndices.push(i);
              metadataPromises.push(Team.findById(groupId).select('name').lean());
            } else {
              // None group: leads without project assignment
              if (query._id && query._id.$in) {
                // Use aggregation to find which leads have assignments
                const assignedLeadIds = await AssignLeads.distinct('lead_id', {
                  lead_id: { $in: query._id.$in },
                  status: 'active',
                });
                const assignedSet = new Set(assignedLeadIds.map((id) => id.toString()));
                const unassigned = query._id.$in.filter(
                  (id) => !assignedSet.has(id.toString())
                );
                query._id = unassigned.length > 0 ? { $in: unassigned } : { $in: [] };
              } else {
                // Use aggregation to get unassigned leads
                const allAssignedLeadIds = await AssignLeads.distinct('lead_id', {
                  status: 'active',
                });
                const assignedSet = new Set(allAssignedLeadIds.map((id) => id.toString()));
                const unassignedLeads = await Lead.aggregate([
                  { $match: baseQuery },
                  { $project: { _id: 1 } },
                ]);
                const unassigned = unassignedLeads
                  .filter((l) => !assignedSet.has(l._id.toString()))
                  .map((l) => l._id);
                query._id = unassigned.length > 0 ? { $in: unassigned } : { $in: [] };
              }

              groupMetadata.push({
                groupId: LeadGroupingService._generateNoneGroupId(field, i),
                groupName: 'None',
                field,
              });
            }
          } else if (field === 'agent') {
            if (!isNoneGroup) {
              const agentId = mongoose.Types.ObjectId.isValid(groupId)
                ? new mongoose.Types.ObjectId(groupId)
                : groupId;
              
              // Use aggregation to get lead IDs efficiently
              const leadIds = await AssignLeads.aggregate([
                {
                  $match: {
                    agent_id: agentId,
                    status: 'active',
                  },
                },
                {
                  $group: {
                    _id: '$lead_id',
                  },
                },
                {
                  $project: {
                    _id: 0,
                    lead_id: '$_id',
                  },
                },
              ]);
              
              const leadIdArray = leadIds.map((item) => item.lead_id);
              
              if (query._id && query._id.$in) {
                const existingIds = new Set(query._id.$in.map((id) => id.toString()));
                const newIds = new Set(leadIdArray.map((id) => id.toString()));
                const intersection = Array.from(existingIds).filter((id) => newIds.has(id));
                query._id = intersection.length > 0
                  ? { $in: intersection.map((id) => new mongoose.Types.ObjectId(id)) }
                  : { $in: [] };
              } else {
                query._id = { $in: leadIdArray };
              }

              // Batch metadata lookup
              metadataIndices.push(i);
              metadataPromises.push(User.findById(groupId).select('login first_name last_name').lean());
            } else {
              // None group: leads without agent assignment
              if (query._id && query._id.$in) {
                const assignedLeadIds = await AssignLeads.distinct('lead_id', {
                  lead_id: { $in: query._id.$in },
                  status: 'active',
                });
                const assignedSet = new Set(assignedLeadIds.map((id) => id.toString()));
                const unassigned = query._id.$in.filter(
                  (id) => !assignedSet.has(id.toString())
                );
                query._id = unassigned.length > 0 ? { $in: unassigned } : { $in: [] };
              } else {
                const allAssignedLeadIds = await AssignLeads.distinct('lead_id', {
                  status: 'active',
                });
                const assignedSet = new Set(allAssignedLeadIds.map((id) => id.toString()));
                const unassignedLeads = await Lead.aggregate([
                  { $match: query },
                  { $project: { _id: 1 } },
                ]);
                const unassigned = unassignedLeads
                  .filter((l) => !assignedSet.has(l._id.toString()))
                  .map((l) => l._id);
                query._id = unassigned.length > 0 ? { $in: unassigned } : { $in: [] };
              }

              groupMetadata.push({
                groupId: LeadGroupingService._generateNoneGroupId(field, i),
                groupName: 'None',
                field,
              });
            }
          } else if (field === 'source') {
            if (!isNoneGroup) {
              const sourceId = mongoose.Types.ObjectId.isValid(groupId)
                ? new mongoose.Types.ObjectId(groupId)
                : groupId;
              query.source_id = sourceId;
            } else {
              query.source_id = null;
            }

            // Batch metadata lookup
            if (!isNoneGroup) {
              metadataIndices.push(i);
              metadataPromises.push(Source.findById(groupId).select('name').lean());
            } else {
              groupMetadata.push({
                groupId: LeadGroupingService._generateNoneGroupId(field, i),
                groupName: 'None',
                field,
              });
            }
          }
          break;

        case 'string':
        case 'number':
        case 'boolean':
          // Direct field filtering
          if (isNoneGroup) {
            query[fieldConfig.field] = null;
          } else {
            // Try to parse as number if field is number type
            if (fieldConfig.type === 'number') {
              query[fieldConfig.field] = parseFloat(groupId) || groupId;
            } else if (fieldConfig.type === 'boolean') {
              query[fieldConfig.field] = groupId === 'true';
            } else {
              query[fieldConfig.field] = groupId;
            }
          }
          groupMetadata.push({
            groupId: isNoneGroup ? LeadGroupingService._generateNoneGroupId(field, i) : groupId,
            groupName: isNoneGroup ? 'None' : groupId,
            field,
          });
          break;

        case 'computed':
          // Computed fields like has_offer, has_opening, etc.
          // These need special handling - for now, we'll handle them in the main query
          // For details endpoint, we can filter leads after fetching
          groupMetadata.push({
            groupId: groupId,
            groupName: groupId === 'true' ? 'Yes' : groupId === 'false' ? 'No' : groupId,
            field,
          });
          break;

        default:
          // For other types, store metadata but don't modify query
          groupMetadata.push({
            groupId: isNoneGroup ? LeadGroupingService._generateNoneGroupId(field, i) : groupId,
            groupName: isNoneGroup ? 'None' : groupId,
            field,
          });
      }
    }

    // Execute all metadata lookups in parallel
    if (metadataPromises.length > 0) {
      const metadataResults = await Promise.all(metadataPromises);
      
      // Map results back to their indices
      for (let j = 0; j < metadataIndices.length; j++) {
        const index = metadataIndices[j];
        const field = groupingLevels[index];
        const groupId = groupIds[index];
        const result = metadataResults[j];
        
        if (field === 'project' && result) {
          groupMetadata[index] = {
            groupId: groupId,
            groupName: result.name || groupId,
            field,
          };
        } else if (field === 'agent' && result) {
          const agentName = result.first_name || result.last_name
            ? `${result.first_name || ''} ${result.last_name || ''}`.trim()
            : result.login;
          groupMetadata[index] = {
            groupId: groupId,
            groupName: agentName || groupId,
            field,
          };
        } else if (field === 'source' && result) {
          groupMetadata[index] = {
            groupId: groupId,
            groupName: result.name || groupId,
            field,
          };
        }
      }
    }

    return { query, groupMetadata };
  }

  /**
   * Get specific multilevel group details by path
   * @param {Array} groupingLevels - Array of field names to group by
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
        throw new Error(
          `Group IDs path cannot be longer than grouping levels. Got ${groupIds.length} group IDs but only ${groupingLevels.length} grouping levels. GroupIds: [${groupIds.join(', ')}], Levels: [${groupingLevels.join(', ')}]`
        );
      }

      // Validate each grouping field
      for (const field of groupingLevels) {
        if (!LeadGroupingService.GROUPING_FIELDS[field]) {
          throw new Error(`Invalid grouping field: ${field}`);
        }
      }

      const {
        page = 1,
        limit = 50,
        filters = [],
        sortBy = 'createdAt',
        sortOrder = 'desc',
        search = null,
        partner_ids = null,
      } = options;

      // Separate navigation filters from entity filters
      const entityType = this._detectEntityType(filters);
      const navigationFilters = entityType
        ? filters.filter((f) => !this._isEntityFilter(f.field))
        : filters;

      // Build base query with filters, search, and permissions
      const hasActiveFilter = filters.some((filter) => filter && filter.field === 'active');
      let baseQuery = hasActiveFilter ? {} : { active: true };

      // Apply user permissions
      if (user.role !== 'Admin') {
        const assignments = await AssignLeads.find({
          agent_id: user._id,
          status: 'active',
        }).select('lead_id');
        const assignedLeadIds = assignments.map((a) => a.lead_id);
        baseQuery._id = { $in: assignedLeadIds };
      }

      // Apply search filter
      if (search && search.trim()) {
        const searchRegex = new RegExp(search.trim(), 'i');
        const searchQuery = {
          $or: [
            { contact_name: searchRegex },
            { email_from: searchRegex },
            { phone: searchRegex },
            { lead_source_no: searchRegex },
          ],
        };
        if (baseQuery.$and) {
          baseQuery.$and.push(searchQuery);
        } else {
          baseQuery = { $and: [baseQuery, searchQuery] };
        }
      }

      // Apply bulk search by partner IDs
      if (partner_ids && Array.isArray(partner_ids) && partner_ids.length > 0) {
        const bulkSearchQuery = {
          lead_source_no: { $in: partner_ids },
        };
        if (baseQuery.$and) {
          baseQuery.$and.push(bulkSearchQuery);
        } else {
          baseQuery = { $and: [baseQuery, bulkSearchQuery] };
        }
      }

      // Apply navigation filters
      if (navigationFilters && navigationFilters.length > 0) {
        const { applyDynamicFilters } = require('./dynamicFilterService');
        const { query: filterQuery } = await applyDynamicFilters(navigationFilters, user);
        if (baseQuery.$and) {
          baseQuery.$and.push(filterQuery);
        } else {
          baseQuery = { $and: [baseQuery, filterQuery] };
        }
      }

      const currentLevelIndex = groupIds.length;
      const isLastLevel = currentLevelIndex === groupingLevels.length;

      // OPTIMIZATION: For last level, directly build query and fetch leads (no grouping needed)
      if (isLastLevel) {
        logger.info('Optimized path: Last level - building direct query', {
          groupingLevels,
          groupIds,
        });

        // Build query from group path
        const { query: directQuery, groupMetadata } = await this._buildQueryFromGroupPath(
          groupingLevels,
          groupIds,
          user,
          baseQuery
        );

        // Get the current group metadata
        const currentGroupMeta = groupMetadata[groupMetadata.length - 1] || {
          groupId: groupIds[groupIds.length - 1],
          groupName: groupIds[groupIds.length - 1],
          field: groupingLevels[groupingLevels.length - 1],
        };

        // Handle computed fields (like has_offer, status, etc.) that need special filtering
        const lastField = groupingLevels[groupingLevels.length - 1];
        const lastFieldConfig = LeadGroupingService.GROUPING_FIELDS[lastField];
        const lastGroupId = groupIds[groupIds.length - 1];

        if (lastFieldConfig?.type === 'computed') {
          // For computed fields, use aggregation for efficient filtering
          // First, get lead IDs that match the query up to this point
          const matchingLeadIds = await Lead.find(directQuery).select('_id').lean();
          const leadIdArray = matchingLeadIds.map((l) => l._id);
          
          if (leadIdArray.length === 0) {
            directQuery._id = { $in: [] };
          } else {
            let filteredLeadIds = [];

            // Use single aggregation pipeline per computed field type
            if (lastField === 'has_offer') {
              const leadIdsWithOffers = await Offer.distinct('lead_id', {
                lead_id: { $in: leadIdArray },
                active: true,
              });
              const leadIdsSet = new Set(leadIdsWithOffers.map((id) => id.toString()));
              
              if (lastGroupId === 'true') {
                filteredLeadIds = leadIdArray.filter((id) => leadIdsSet.has(id.toString()));
              } else if (lastGroupId === 'false') {
                filteredLeadIds = leadIdArray.filter((id) => !leadIdsSet.has(id.toString()));
              }
            } else if (lastField === 'has_opening') {
              // Use aggregation to find leads with openings
              const leadsWithOpenings = await Offer.aggregate([
                {
                  $match: {
                    lead_id: { $in: leadIdArray },
                    active: true,
                  },
                },
                {
                  $lookup: {
                    from: 'openings',
                    localField: '_id',
                    foreignField: 'offer_id',
                    as: 'openings',
                    pipeline: [{ $match: { active: true } }],
                  },
                },
                {
                  $match: {
                    'openings.0': { $exists: true },
                  },
                },
                {
                  $group: {
                    _id: '$lead_id',
                  },
                },
              ]);
              
              const leadIdsSet = new Set(leadsWithOpenings.map((item) => item._id.toString()));
              
              if (lastGroupId === 'true') {
                filteredLeadIds = leadIdArray.filter((id) => leadIdsSet.has(id.toString()));
              } else if (lastGroupId === 'false') {
                filteredLeadIds = leadIdArray.filter((id) => !leadIdsSet.has(id.toString()));
              }
            } else if (lastField === 'has_confirmation') {
              const leadsWithConfirmations = await Offer.aggregate([
                {
                  $match: {
                    lead_id: { $in: leadIdArray },
                    active: true,
                  },
                },
                {
                  $lookup: {
                    from: 'confirmations',
                    localField: '_id',
                    foreignField: 'offer_id',
                    as: 'confirmations',
                    pipeline: [{ $match: { active: true } }],
                  },
                },
                {
                  $match: {
                    'confirmations.0': { $exists: true },
                  },
                },
                {
                  $group: {
                    _id: '$lead_id',
                  },
                },
              ]);
              
              const leadIdsSet = new Set(leadsWithConfirmations.map((item) => item._id.toString()));
              
              if (lastGroupId === 'true') {
                filteredLeadIds = leadIdArray.filter((id) => leadIdsSet.has(id.toString()));
              } else if (lastGroupId === 'false') {
                filteredLeadIds = leadIdArray.filter((id) => !leadIdsSet.has(id.toString()));
              }
            } else if (lastField === 'has_payment') {
              const leadsWithPayments = await Offer.aggregate([
                {
                  $match: {
                    lead_id: { $in: leadIdArray },
                    active: true,
                  },
                },
                {
                  $lookup: {
                    from: 'paymentvouchers',
                    localField: '_id',
                    foreignField: 'offer_id',
                    as: 'payments',
                    pipeline: [{ $match: { active: true } }],
                  },
                },
                {
                  $match: {
                    'payments.0': { $exists: true },
                  },
                },
                {
                  $group: {
                    _id: '$lead_id',
                  },
                },
              ]);
              
              const leadIdsSet = new Set(leadsWithPayments.map((item) => item._id.toString()));
              
              if (lastGroupId === 'true') {
                filteredLeadIds = leadIdArray.filter((id) => leadIdsSet.has(id.toString()));
              } else if (lastGroupId === 'false') {
                filteredLeadIds = leadIdArray.filter((id) => !leadIdsSet.has(id.toString()));
              }
            }

            // Update query with filtered lead IDs
            directQuery._id = filteredLeadIds.length > 0 ? { $in: filteredLeadIds } : { $in: [] };
          }
        }

        // Apply entity filters if present
        if (filters.length > navigationFilters.length) {
          const entityFilters = filters.filter((f) => this._isEntityFilter(f.field));
          if (entityFilters.length > 0) {
            const { applyDynamicFilters } = require('./dynamicFilterService');
            const entityFilterQuery = await applyDynamicFilters(entityFilters, user);
            const matchingLeads = await Lead.find({
              $and: [directQuery, entityFilterQuery.query],
            })
              .select('_id')
              .lean();
            directQuery._id = { $in: matchingLeads.map((lead) => lead._id) };
          }
        }

        // Entity response or lead response
        if (entityType && entityType !== 'lead') {
          const entityResults = await this._getEntityResponse(
            entityType,
            directQuery._id.$in || [],
            user,
            parseInt(page),
            parseInt(limit),
            options
          );

          const responseKey =
            entityType === 'offer'
              ? 'offers'
              : entityType === 'opening'
                ? 'openings'
                : entityType === 'confirmation'
                  ? 'confirmations'
                  : entityType === 'payment'
                    ? 'payments'
                    : entityType === 'netto'
                      ? 'nettos'
                      : 'offers';

          const executionTime = Date.now() - startTime;
          return {
            data: {
              group: {
                groupId: currentGroupMeta.groupId,
                groupName: currentGroupMeta.groupName,
                count: entityResults.meta.total,
                reference: currentGroupMeta.reference,
                path: groupIds,
                level: currentLevelIndex,
              },
              [responseKey]: entityResults.data,
            },
            meta: {
              ...entityResults.meta,
              groupingLevels,
              groupPath: groupIds,
              currentLevel: currentLevelIndex,
              isLastLevel: true,
              executionTime,
              entityType,
            },
          };
        }

        // Default: return leads
        // OPTIMIZATION: For large datasets, use optimized query path
        const hasTodoFilters = (filters || []).some(
          (f) => f && ['has_todo', 'has_extra_todo', 'has_assigned_todo', 'pending_todos', 'done_todos'].includes(f.field)
        );

        // If no todo filters and large limit, use optimized direct query
        if (!hasTodoFilters && parseInt(limit) >= 1000) {
          // Use optimized aggregation pipeline for large datasets
          const pipeline = [
            { $match: directQuery },
            { $sort: { [sortBy]: sortOrder === 'asc' ? 1 : -1 } },
            { $skip: (parseInt(page) - 1) * parseInt(limit) },
            { $limit: parseInt(limit) },
          ];

          const [totalResult, leads] = await Promise.all([
            Lead.countDocuments(directQuery),
            Lead.aggregate(pipeline),
          ]);

          // Fetch minimal related data in parallel
          const leadIds = leads.map((l) => l._id);
          
          const [assignments, offers, favourites] = await Promise.all([
            // Minimal assignment data
            AssignLeads.find({
              lead_id: { $in: leadIds },
              status: 'active',
            })
              .populate('project_id', 'name color_code')
              .populate('agent_id', 'login first_name last_name')
              .lean(),
            // Minimal offer data
            Offer.find({ lead_id: { $in: leadIds }, active: true })
              .select('lead_id status createdAt')
              .lean(),
            // Favourites
            user._id ? require('../models/Favourite').find({
              lead_id: { $in: leadIds },
              user_id: user._id,
              active: true,
            }).select('lead_id').lean() : Promise.resolve([]),
          ]);

          // Create lookup maps
          const assignmentMap = new Map();
          assignments.forEach((a) => {
            const leadId = a.lead_id.toString();
            if (!assignmentMap.has(leadId)) {
              assignmentMap.set(leadId, []);
            }
            assignmentMap.get(leadId).push({
              project: a.project_id ? { _id: a.project_id._id, name: a.project_id.name } : null,
              agent: a.agent_id ? {
                _id: a.agent_id._id,
                login: a.agent_id.login,
                name: `${a.agent_id.first_name || ''} ${a.agent_id.last_name || ''}`.trim() || a.agent_id.login,
              } : null,
              assigned_at: a.assigned_at,
            });
          });

          const offerMap = new Map();
          offers.forEach((o) => {
            const leadId = o.lead_id.toString();
            if (!offerMap.has(leadId)) {
              offerMap.set(leadId, []);
            }
            offerMap.get(leadId).push({
              _id: o._id,
              status: o.status,
              createdAt: o.createdAt,
            });
          });

          const favouriteSet = new Set(favourites.map((f) => f.lead_id.toString()));

          // Process leads with minimal data
          const finalLeads = leads.map((lead) => {
            const leadIdStr = lead._id.toString();
            return {
              ...lead,
              assignments: assignmentMap.get(leadIdStr) || [],
              offers: offerMap.get(leadIdStr) || [],
              is_favourite: favouriteSet.has(leadIdStr),
              todoCount: 0, // Skip todo count for performance
            };
          });

          const leadResult = {
            data: finalLeads,
            meta: {
              total: totalResult,
              page: parseInt(page),
              limit: parseInt(limit),
              pages: Math.ceil(totalResult / parseInt(limit)),
            },
          };
        } else {
          // Use standard executeLeadQuery for smaller datasets or when todo filters are present
          const { executeLeadQuery } = require('./leadService/queries');

          // Detect todo-related filters
          const rawTodoFilters = {
            has_todo: (filters || []).some(
              (f) => f && f.field === 'has_todo' && (f.value === true || f.value === 'true')
            ),
            has_extra_todo: (filters || []).some(
              (f) => f && f.field === 'has_extra_todo' && (f.value === true || f.value === 'true')
            ),
            has_assigned_todo: (filters || []).some(
              (f) => f && f.field === 'has_assigned_todo' && (f.value === true || f.value === 'true')
            ),
            pending_todos: (filters || []).some(
              (f) => f && f.field === 'pending_todos' && (f.value === true || f.value === 'true')
            ),
            done_todos: (filters || []).some(
              (f) => f && f.field === 'done_todos' && (f.value === true || f.value === 'true')
            ),
          };

          const suppressHasTodo =
            rawTodoFilters.pending_todos ||
            rawTodoFilters.done_todos ||
            rawTodoFilters.has_extra_todo ||
            rawTodoFilters.has_assigned_todo;

          const todoFilters = {
            ...rawTodoFilters,
            has_todo: suppressHasTodo ? false : rawTodoFilters.has_todo,
          };

          const leadResult = await executeLeadQuery(
            user,
            directQuery,
            parseInt(page),
            parseInt(limit),
            true,
            null,
            options.has_todo || todoFilters.has_todo || null,
            options.todo_scope || 'all',
            options.pending_todos !== undefined && options.pending_todos !== null
              ? options.pending_todos
              : todoFilters.pending_todos || null,
            options.done_todos !== undefined && options.done_todos !== null
              ? options.done_todos
              : todoFilters.done_todos || null,
            sortBy,
            sortOrder
          );

          let finalLeads;
          if (todoFilters.has_extra_todo || todoFilters.has_assigned_todo) {
            const { addFilteredTodosToResults } = require('./dynamicFilterService');
            finalLeads = await addFilteredTodosToResults(leadResult.data, user, todoFilters);
          } else {
            finalLeads = leadResult.data;
          }

          leadResult = {
            data: finalLeads,
            meta: leadResult.meta,
          };
        }

        const executionTime = Date.now() - startTime;

        return {
          data: {
            group: {
              groupId: currentGroupMeta.groupId,
              groupName: currentGroupMeta.groupName,
              count: leadResult.meta.total,
              reference: currentGroupMeta.reference,
              path: groupIds,
              level: currentLevelIndex,
            },
            leads: finalLeads,
          },
          meta: {
            ...leadResult.meta,
            groupingLevels,
            groupPath: groupIds,
            currentLevel: currentLevelIndex,
            isLastLevel: true,
            executionTime,
          },
        };
      }

      // For intermediate levels, we still need minimal grouping but optimized
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
      const nextLevelField = groupingLevels[currentLevelIndex];
      const remainingLevels = groupingLevels.slice(currentLevelIndex);

      // Use optimized grouping for just the remaining levels
      const subGroupsResult = await this.groupLeadsMultilevel(remainingLevels, user, {
        page: 1,
        limit: 10000,
        filters: navigationFilters,
        search,
        partner_ids,
        includeLeads: false,
        baseQuery: pathQuery, // Use the path query as base
      });

      const subGroups = subGroupsResult.data || [];

      // Sort subgroups by the requested criteria
      const sortedSubGroups = await this._sortMultilevelGroups(
        subGroups,
        sortBy,
        sortOrder,
        groupingLevels[currentLevelIndex]
      );

      // Apply pagination to sorted subgroups
      const total = sortedSubGroups.length;
      const paginatedSubGroups = sortedSubGroups.slice((page - 1) * limit, page * limit);

      // Calculate total count from subgroups
      const totalCount = this._countLeadsInNestedStructure(sortedSubGroups);

      const executionTime = Date.now() - startTime;

      return {
        data: {
          group: {
            groupId: currentGroupMeta.groupId,
            groupName: currentGroupMeta.groupName,
            count: totalCount,
            reference: currentGroupMeta.reference,
            path: groupIds,
            level: currentLevelIndex,
          },
          subGroups: paginatedSubGroups,
        },
        meta: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / limit),
          groupingLevels,
          groupPath: groupIds,
          currentLevel: currentLevelIndex,
          nextLevel: groupingLevels[currentLevelIndex],
          isLastLevel: false,
          executionTime,
        },
      };
    } catch (error) {
      logger.error('Multilevel group details error:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        fullError: error,
        toString: error.toString(),
      });
      throw error;
    }
  }

  /**
   * Detect the primary entity type based on filters
   * @param {Array} filters - Array of filter objects
   * @returns {string|null} - Entity type or null if lead-based
   */
  _detectEntityType(filters) {
    if (!filters || !Array.isArray(filters)) return null;

    // Check for entity-specific filters in order of priority
    const entityFilters = [
      { entities: ['payment', 'paymentVoucher'], patterns: ['has_payment', 'payment_'] },
      { entities: ['confirmation'], patterns: ['has_confirmation', 'confirmation_'] },
      { entities: ['opening'], patterns: ['has_opening', 'opening_'] },
      { entities: ['offer'], patterns: ['has_offer', 'offer_'] },
    ];

    for (const entityFilter of entityFilters) {
      for (const filter of filters) {
        if (filter && filter.field) {
          const matches = entityFilter.patterns.some(
            (pattern) =>
              filter.field.includes(pattern) ||
              (pattern === 'has_offer' && filter.field === 'has_offer' && filter.value === true) ||
              (pattern === 'has_opening' &&
                filter.field === 'has_opening' &&
                filter.value === true) ||
              (pattern === 'has_confirmation' &&
                filter.field === 'has_confirmation' &&
                filter.value === true) ||
              (pattern === 'has_payment' && filter.field === 'has_payment' && filter.value === true)
          );

          if (matches) {
            return entityFilter.entities[0]; // Return the first entity type
          }
        }
      }
    }

    return null; // Default to lead-based response
  }

  /**
   * Check if a filter field is entity-specific (should not affect group navigation)
   * @param {string} field - Filter field name
   * @returns {boolean} - True if field is entity-specific
   */
  _isEntityFilter(field) {
    const entityFields = [
      'has_offer',
      'has_opening',
      'has_confirmation',
      'has_payment',
      'offer_',
      'opening_',
      'confirmation_',
      'payment_',
    ];

    return entityFields.some(
      (entityField) => field === entityField || field.startsWith(entityField)
    );
  }

  /**
   * Get entity-specific response with proper population
   * @param {string} entityType - The entity type (offer, opening, confirmation, payment)
   * @param {Array} leadIds - Array of lead IDs to filter by
   * @param {Object} user - User object
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @param {Object} options - Additional options
   * @returns {Object} - Entity response with data and meta
   */
  async _getEntityResponse(entityType, leadIds, user, page, limit, options = {}) {
    const {
      Offer,
      Opening,
      Confirmation,
      PaymentVoucher,
      Document,
      Netto1,
      Netto2,
    } = require('../models');

    let entityQuery, EntityModel, populateConfig;

    switch (entityType) {
      case 'offer':
        EntityModel = Offer;
        entityQuery = {
          lead_id: { $in: leadIds, $ne: null },
          active: true, // Match offers endpoint filtering
        };
        populateConfig = [
          { path: 'project_id', model: 'Team', select: 'name' },
          {
            path: 'lead_id',
            select:
              'contact_name lead_source_no status stage current_month email_from phone email partner_id source_id',
            populate: {
              path: 'source_id',
              select: 'name price active color',
            },
          },
          { path: 'agent_id', select: 'login role' },
          { path: 'payment_terms', select: 'name info' },
          { path: 'bonus_amount', select: 'name info' },
          { path: 'bank_id', select: 'bank_id name' },
        ];
        break;

      case 'opening':
        EntityModel = Opening;
        // First get offers for the leads, then get openings for those offers
        const offers = await Offer.find({ lead_id: { $in: leadIds } }).select('_id');
        const offerIds = offers.map((o) => o._id);
        entityQuery = { offer_id: { $in: offerIds }, active: true };
        populateConfig = [
          {
            path: 'offer_id',
            populate: [
              { path: 'project_id', select: 'name color_code' },
              {
                path: 'lead_id',
                select:
                  'contact_name lead_source_no status stage current_month email_from phone email partner_id source_id',
                populate: {
                  path: 'source_id',
                  select: 'name price active color',
                },
              },
              { path: 'agent_id', select: 'login role' },
              { path: 'payment_terms', select: 'name info' },
              { path: 'bonus_amount', select: 'name info' },
              { path: 'bank_id', select: 'bank_id name' },
            ],
          },
          { path: 'creator_id', select: 'login role name email' },
        ];
        break;

      case 'confirmation':
        EntityModel = Confirmation;
        // Get confirmations linked to offers from these leads
        const offersForConfirmations = await Offer.find({ lead_id: { $in: leadIds } }).select(
          '_id'
        );
        const offerIdsForConfirmations = offersForConfirmations.map((o) => o._id);
        entityQuery = {
          $or: [
            { offer_id: { $in: offerIdsForConfirmations } },
            {
              opening_id: {
                $in: await Opening.find({ offer_id: { $in: offerIdsForConfirmations } }).distinct(
                  '_id'
                ),
              },
            },
          ],
          active: true,
        };
        populateConfig = [
          {
            path: 'offer_id',
            populate: [
              { path: 'project_id', select: 'name color_code' },
              {
                path: 'lead_id',
                select:
                  'contact_name lead_source_no status stage current_month email_from phone email partner_id source_id',
                populate: {
                  path: 'source_id',
                  select: 'name price active color',
                },
              },
              { path: 'agent_id', select: 'login role' },
              { path: 'payment_terms', select: 'name info' },
              { path: 'bonus_amount', select: 'name info' },
              { path: 'bank_id', select: 'bank_id name' },
            ],
          },
          { path: 'opening_id' },
          { path: 'creator_id', select: 'login role name email' },
        ];
        break;

      case 'payment':
        EntityModel = PaymentVoucher;
        // Get payment vouchers linked to offers/confirmations from these leads
        const offersForPayments = await Offer.find({ lead_id: { $in: leadIds } }).select('_id');
        const offerIdsForPayments = offersForPayments.map((o) => o._id);
        const confirmationIds = await Confirmation.find({
          offer_id: { $in: offerIdsForPayments },
        }).distinct('_id');

        entityQuery = {
          $or: [
            { offer_id: { $in: offerIdsForPayments } },
            { confirmation_id: { $in: confirmationIds } },
          ],
          active: true,
        };
        populateConfig = [
          {
            path: 'offer_id',
            populate: [
              { path: 'project_id', select: 'name color_code' },
              {
                path: 'lead_id',
                select:
                  'contact_name lead_source_no status stage current_month email_from phone email partner_id source_id',
                populate: {
                  path: 'source_id',
                  select: 'name price active color',
                },
              },
              { path: 'agent_id', select: 'login role' },
              { path: 'payment_terms', select: 'name info' },
              { path: 'bonus_amount', select: 'name info' },
              { path: 'bank_id', select: 'bank_id name' },
            ],
          },
          { path: 'confirmation_id' },
          { path: 'creator_id', select: 'login role name email' },
        ];
        break;

      case 'netto':
        // For netto entity type, return unique offers that have netto1 or netto2 records (like offers endpoint)
        EntityModel = Offer;

        // Get offers for the leads that have netto1 or netto2 records
        const offersForNetto = await Offer.find({ lead_id: { $in: leadIds } }).select('_id');
        const offerIdsForNetto = offersForNetto.map((o) => o._id);

        // Find offers that have netto1 or netto2 records
        const netto1Offers = await Netto1.find({
          offer_id: { $in: offerIdsForNetto },
          active: true,
        }).distinct('offer_id');

        const netto2Offers = await Netto2.find({
          offer_id: { $in: offerIdsForNetto },
          active: true,
        }).distinct('offer_id');

        const offersWithNetto = [...new Set([...netto1Offers, ...netto2Offers])];

        // Query for unique offers that have netto records
        entityQuery = {
          _id: { $in: offersWithNetto },
          lead_id: { $in: leadIds, $ne: null },
          active: true,
        };
        populateConfig = [
          { path: 'project_id', model: 'Team', select: 'name color_code' },
          {
            path: 'lead_id',
            select: 'contact_name lead_source_no status stage current_month source_id',
            populate: {
              path: 'source_id',
              select: 'name price active color',
            },
          },
          { path: 'agent_id', select: 'login role' },
          { path: 'payment_terms', select: 'name info' },
          { path: 'bonus_amount', select: 'name info' },
          { path: 'bank_id', select: 'bank_id name' },
        ];
        break;

      default:
        throw new Error(`Unsupported entity type: ${entityType}`);
    }

    let total, entities;

    if (entityType === 'offer') {
      // For offers, use aggregation pipeline to match offers endpoint behavior (no progress filter)
      const ProgressPipelineBuilder = require('./offerService/builders/ProgressPipelineBuilder');

      const pipeline = new ProgressPipelineBuilder()
        .addMatch(entityQuery)
        .addProgressLookups() // Add progress lookups to check for progress
        .addProgressFields() // Add progress fields calculation
        .addNoProgressFilter() // Filter out offers with any progress (match offers endpoint)
        .addSort({ createdAt: -1 })
        .addPagination(page, limit, { _id: 1 })
        .build();

      const [result] = await EntityModel.aggregate(pipeline);
      const offerIds = result?.data || [];
      total = result.totalCount?.[0]?.count || 0;

      if (offerIds.length > 0) {
        // Get full offer data with populations
        entities = await EntityModel.find({
          _id: { $in: offerIds.map((o) => o._id) },
        })
          .populate(populateConfig)
          .sort({ createdAt: -1 })
          .lean();
      } else {
        entities = [];
      }
    } else {
      // For other entities, use regular query
      total = await EntityModel.countDocuments(entityQuery);

      entities = await EntityModel.find(entityQuery)
        .populate(populateConfig)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .lean();
    }

    // Apply entity-specific transformations
    let transformedEntities = entities;

    if (entityType === 'offer') {
      // Apply the same document population that offerService uses (HYBRID SYSTEM)
      for (const entity of transformedEntities) {
        await this._populateOfferDocuments(entity);
      }
    } else {
      // For other entity types, apply document population to the nested offer_id
      for (const entity of transformedEntities) {
        if (entity.offer_id) {
          await this._populateOfferDocuments(entity.offer_id);
        }
      }
    }

    return {
      data: transformedEntities,
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Populate offer documents using hybrid system (REVERSE + FORWARD references)
   * Same logic as in offerService.js
   * @param {Object} offer - Offer object to populate documents for
   * @returns {Object} - Offer with populated files array
   */
  async _populateOfferDocuments(offer) {
    const { Document } = require('../models');

    if (!offer || !offer._id) return offer;

    // 1. REVERSE REFERENCES: Get documents with assignments pointing to this offer
    const assignedDocuments = await Document.find({
      'assignments.entity_type': 'offer',
      'assignments.entity_id': offer._id,
      'assignments.active': true,
      active: true,
    })
      .select('_id filename filetype size type assignments')
      .lean();

    // 2. FORWARD REFERENCES: Get documents referenced in offer.files array (legacy)
    let legacyDocuments = [];
    if (offer.files && offer.files.length > 0) {
      const legacyDocIds = offer.files
        .filter((file) => file.document) // Only files with document references
        .map((file) => file.document);

      if (legacyDocIds.length > 0) {
        legacyDocuments = await Document.find({
          _id: { $in: legacyDocIds },
          active: true,
        })
          .select('_id filename filetype size type assignments')
          .lean();
      }
    }

    // 3. MERGE AND DEDUPLICATE: Build final files array
    const documentMap = new Map();

    // Add reverse reference documents (priority for assigned_at timestamp)
    assignedDocuments.forEach((doc) => {
      doc.assignments.forEach((assignment) => {
        if (
          assignment.entity_type === 'offer' &&
          assignment.entity_id.toString() === offer._id.toString() &&
          assignment.active
        ) {
          documentMap.set(doc._id.toString(), {
            _id: doc._id,
            filename: doc.filename,
            filetype: doc.filetype,
            size: doc.size,
            type: doc.type,
            assigned_at: assignment.assigned_at,
            source: 'reverse_reference',
          });
        }
      });
    });

    // Add legacy documents (only if not already added by reverse reference)
    legacyDocuments.forEach((doc) => {
      const docId = doc._id.toString();
      if (!documentMap.has(docId)) {
        // Find the legacy reference to get any metadata
        const legacyRef = offer.files.find(
          (file) => file.document && file.document.toString() === docId
        );

        documentMap.set(docId, {
          _id: doc._id,
          filename: doc.filename,
          filetype: doc.filetype,
          size: doc.size,
          type: doc.type,
          assigned_at: legacyRef?.assigned_at || doc.createdAt || new Date(),
          source: 'forward_reference',
        });
      }
    });

    // Convert map to array and sort by assigned_at
    offer.files = Array.from(documentMap.values()).sort(
      (a, b) => new Date(b.assigned_at) - new Date(a.assigned_at)
    );

    return offer;
  }
}

module.exports = new LeadGroupingService();
