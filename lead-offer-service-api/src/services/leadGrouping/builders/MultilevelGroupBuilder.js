/**
 * Multilevel Group Builder
 * Builds nested grouping structures for multilevel lead grouping
 */

const { Lead, AssignLeads } = require('../../../models');
const { GROUPING_FIELDS } = require('../config/groupingFields');
const { generateNoneGroupId, formatValue, detectEntityContext } = require('../utils/groupHelpers');
const { executeLeadQuery } = require('../../leadService/queries');
const logger = require('../../../helpers/logger');

class MultilevelGroupBuilder {
  constructor(groupingLevels, user, options = {}) {
    this.groupingLevels = groupingLevels;
    this.user = user;
    this.options = options;
  }

  /**
   * Build nested multilevel groups
   * @param {Object} baseQuery - Base MongoDB query
   * @returns {Promise<Array>} - Nested group structure
   */
  async buildGroups(baseQuery) {
    try {
      // Check if we need special data for grouping
      const needsAssignments = this.groupingLevels.some((field) =>
        ['project', 'agent'].includes(field)
      );
      const needsTransfers = this.groupingLevels.some((field) => field === 'last_transfer');
      const needsContextDates = this._needsContextDates();
      
      // Check if we need fields that aren't in executeLeadQuery's default select
      const needsDirectFields = this.groupingLevels.some((field) => {
        const fieldConfig = GROUPING_FIELDS[field];
        // Fields that need to be explicitly selected (not in executeLeadQuery default select)
        const fieldsNeedingSelection = ['leadPrice', 'expected_revenue'];
        return fieldConfig && fieldsNeedingSelection.includes(field);
      });

      if (needsAssignments || needsTransfers || needsContextDates || needsDirectFields) {
        return await this._buildWithEnhancedData(baseQuery);
      } else {
        return await this._buildWithDirectFields(baseQuery);
      }
    } catch (error) {
      logger.error('MultilevelGroupBuilder error:', error);
      throw error;
    }
  }

  /**
   * Check if context-aware date handling is needed
   * @private
   */
  _needsContextDates() {
    return this.groupingLevels.some((field) => {
      const fieldConfig = GROUPING_FIELDS[field];
      const hasEntityContext =
        fieldConfig?.type === 'context_date' &&
        detectEntityContext(this.options.filters || []);
      return hasEntityContext;
    });
  }

  /**
   * Build groups with enhanced data (assignments, transfers, entity dates)
   * @private
   */
  async _buildWithEnhancedData(baseQuery) {
    const builderStartTime = Date.now();
    
    logger.info('MultilevelGroupBuilder: Building with enhanced data', {
      baseQueryKeys: Object.keys(baseQuery),
      baseQueryHasAnd: !!baseQuery.$and,
    });
    
    // OPTIMIZATION: Limit leads for deep nesting (3+ levels) to avoid slow recursive loops
    const MAX_LEADS_DEEP_NESTING = 20000; // Limit to 20k for 3+ levels
    const MAX_LEADS_SHALLOW = 50000; // Limit to 50k for 1-2 levels
    
    const maxLeads = this.groupingLevels.length >= 3 ? MAX_LEADS_DEEP_NESTING : MAX_LEADS_SHALLOW;
    
    // Get leads matching base query (with limit for performance)
    const leadsQuery = Lead.find(baseQuery)
      .select('_id stage status source_id source_agent source_project expected_revenue leadPrice lead_date assigned_date createdAt updatedAt active tags contact_name email_from phone')
      .populate('source_id', 'name price active color')
      .populate('source_agent', '_id login color_code')
      .populate('source_project', '_id name color_code')
      .sort({ createdAt: -1 }) // Most recent first
      .limit(maxLeads) // Always limit for performance
      .lean();
    
    const leads = await leadsQuery;
    
    const queryDuration = Date.now() - builderStartTime;
    logger.info('⚡ MultilevelGroupBuilder: Found leads (OPTIMIZED)', {
      leadsCount: leads.length,
      maxLeads,
      levels: this.groupingLevels.length,
      queryDuration: queryDuration + 'ms',
      improvement: 'Limited dataset for performance'
    });

    // Debug: Log leadPrice values for first few leads when grouping by leadPrice
    if (this.groupingLevels.includes('leadPrice') && leads.length > 0) {
      logger.debug('Sample leadPrice values:', {
        sample: leads.slice(0, 5).map(l => ({ 
          id: l._id.toString(), 
          leadPrice: l.leadPrice, 
          sourcePrice: l.source_id?.price 
        }))
      });
    }

    const leadIds = leads.map((l) => l._id);

    // Fetch and enhance leads with needed data
    const enhancedLeads = await this._enhanceLeadsWithData(leads, leadIds);

    // Build nested structure recursively
    return this._groupLeadsRecursively(enhancedLeads, 0);
  }

  /**
   * Build groups with direct fields only
   * @private
   */
  async _buildWithDirectFields(baseQuery) {
    logger.info('MultilevelGroupBuilder: Building with direct fields', {
      baseQueryKeys: Object.keys(baseQuery),
      baseQueryHasAnd: !!baseQuery.$and,
    });
    
    const allLeads = await executeLeadQuery(
      this.user,
      baseQuery,
      1,
      100000,
      true,
      null,
      this.options.has_todo || null,
      this.options.todo_scope || 'all',
      this.options.pending_todos || null,
      this.options.done_todos || null,
      'createdAt',
      'desc'
    );

    logger.info('MultilevelGroupBuilder: Found leads via executeLeadQuery', {
      leadsCount: allLeads.data.length,
      totalLeads: allLeads.meta.total,
    });

    return this._groupLeadsRecursively(allLeads.data, 0);
  }

  /**
   * Enhance leads with assignment, transfer, and entity date data
   * @private
   */
  async _enhanceLeadsWithData(leads, leadIds) {
    const assignments = await AssignLeads.find({
      lead_id: { $in: leadIds },
      status: 'active',
    })
      .populate('project_id', 'name color_code')
      .populate('agent_id', '_id login role active')
      .lean();

    const assignmentMap = new Map();
    for (const assignment of assignments) {
      assignmentMap.set(assignment.lead_id.toString(), assignment);
    }

    // Get transfer data if needed
    let transferMap = new Map();
    if (this.groupingLevels.includes('last_transfer')) {
      transferMap = await this._getTransferMap(leadIds);
    }

    // Get entity date maps if needed
    let entityDateMaps = {};
    if (this._needsContextDates()) {
      const entityContext = detectEntityContext(this.options.filters || []);
      if (entityContext) {
        const EntityDateHandler = require('../handlers/EntityDateHandler');
        const handler = new EntityDateHandler();
        entityDateMaps = await handler.getEntityDateMaps(leadIds, entityContext);
      }
    }

    // Enhance each lead
    return leads.map((lead) => {
      const leadIdStr = lead._id.toString();
      const assignment = assignmentMap.get(leadIdStr);
      const lastTransfer = transferMap.get(leadIdStr);

      // Add entity date fields
      const entityDateFields = {};
      Object.keys(entityDateMaps).forEach((dateField) => {
        const map = entityDateMaps[dateField];
        if (map && map.has(leadIdStr)) {
          entityDateFields[dateField] = map.get(leadIdStr);
        }
      });

      // Compute has_netto based on status field or Netto1/Netto2 records
      let has_netto = false;
      if (this.groupingLevels.includes('has_netto')) {
        // Status can be an object { name: "Netto1" } or a string "Netto1"
        const statusName = typeof lead.status === 'object' && lead.status !== null 
          ? lead.status.name 
          : lead.status;
        has_netto = statusName === 'Netto1' || statusName === 'Netto2';
        
        // If not found in status, we'll check Netto1/Netto2 records later if needed
        // For now, status check is sufficient for grouping
      }

      return {
        ...lead,
        project: assignment?.project_id || null,
        agent: assignment?.agent_id || null,
        last_transfer: lastTransfer || null,
        has_netto, // Add computed has_netto field
        ...entityDateFields,
      };
    });
  }

  /**
   * Get transfer map for leads
   * @private
   */
  async _getTransferMap(leadIds) {
    const LeadTransfer = require('../../../models/leadTransfer');
    
    const transfers = await LeadTransfer.find({
      lead_id: { $in: leadIds },
      transfer_status: 'completed',
    })
      .populate('from_agent_id', 'login name')
      .populate('to_agent_id', 'login name')
      .sort({ createdAt: -1 })
      .lean();

    const transferMap = new Map();
    for (const transfer of transfers) {
      const leadIdStr = transfer.lead_id.toString();
      if (!transferMap.has(leadIdStr)) {
        const fromAgent = transfer.from_agent_id?.login || transfer.from_agent_id?.name || 'Unknown';
        const toAgent = transfer.to_agent_id?.login || transfer.to_agent_id?.name || 'Unknown';
        const transferDate = new Date(transfer.createdAt).toLocaleDateString('en-GB').replace(/\//g, '-');
        transferMap.set(leadIdStr, `${fromAgent}→${toAgent}(${transferDate})`);
      }
    }

    return transferMap;
  }

  /**
   * Recursively group leads by multiple levels
   * @private
   */
  _groupLeadsRecursively(leads, currentLevel) {
    if (currentLevel >= this.groupingLevels.length) {
      return leads;
    }

    const currentField = this.groupingLevels[currentLevel];
    const groupConfig = GROUPING_FIELDS[currentField];

    if (!groupConfig) {
      logger.error('Invalid grouping field', { currentField });
      return [];
    }

    const groupMap = new Map();
    const nullGroup = {
      groupId: generateNoneGroupId(currentField, currentLevel),
      groupName: 'None',
      leads: [],
      count: 0,
    };

    // Group leads at current level
    for (const lead of leads) {
      const { groupKey, groupName, groupId } = this._extractGroupInfo(lead, currentField, currentLevel, groupConfig);

      if (groupKey === null || groupId === null) {
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
        group.leads.push(lead);
        group.count++;
      }
    }

    // Convert to array
    const groups = Array.from(groupMap.values());
    if (nullGroup.count > 0) {
      groups.push(nullGroup);
    }

    // If this is the last level, finalize
    if (currentLevel === this.groupingLevels.length - 1) {
      return this._finalizeLastLevel(groups);
    }

    // Recursively process subgroups
    for (const group of groups) {
      const subGroups = this._groupLeadsRecursively(group.leads, currentLevel + 1);
      group.subGroups = subGroups;
      delete group.leads;
    }

    return groups;
  }

  /**
   * Extract group information from lead
   * @private
   */
  _extractGroupInfo(lead, field, level, groupConfig) {
    let groupKey = null;
    let groupName = 'None';
    let groupId = null;

    switch (field) {
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
          groupName = lead.agent.login || 'Unknown Agent';
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

      case 'source_agent':
        // Handle both populated object and ObjectId
        const sourceAgent = lead.source_agent;
        if (sourceAgent) {
          const agentId = sourceAgent._id || sourceAgent;
          if (agentId) {
            groupKey = agentId.toString();
            groupName = sourceAgent.login || (typeof sourceAgent === 'object' ? 'Unknown Agent' : null);
            groupId = agentId;
          }
        }
        break;

      case 'source_project':
        // Handle both populated object and ObjectId
        const sourceProject = lead.source_project;
        if (sourceProject) {
          const projectId = sourceProject._id || sourceProject;
          if (projectId) {
            groupKey = projectId.toString();
            groupName = sourceProject.name || (typeof sourceProject === 'object' ? 'Unknown Project' : null);
            groupId = projectId;
          }
        }
        break;

      case 'stage':
      case 'status':
        const fieldValue = lead[field];
        if (fieldValue && typeof fieldValue === 'object') {
          if (fieldValue._id || fieldValue.id) {
            groupKey = (fieldValue._id || fieldValue.id).toString();
            groupName = fieldValue.name || 'Unknown';
            groupId = fieldValue._id || fieldValue.id;
          }
        } else if (fieldValue !== null && fieldValue !== undefined && fieldValue !== '') {
          const deterministicId = generateNoneGroupId(`${field}_${fieldValue}`, level);
          groupKey = deterministicId.toString();
          groupName = formatValue(fieldValue, groupConfig.type);
          groupId = deterministicId;
        }
        break;

      case 'last_transfer':
        if (lead.last_transfer) {
          groupKey = lead.last_transfer;
          groupName = lead.last_transfer;
          groupId = generateNoneGroupId(`transfer_${lead.last_transfer}`, level);
        }
        break;

      default:
        // Handle computed and direct fields
        if (groupConfig.type === 'computed') {
          let hasValue = lead[field] === true;
          
          // Special handling for has_netto: check status field if not already computed
          if (field === 'has_netto' && !hasValue) {
            // Status can be an object { name: "Netto1" } or a string "Netto1"
            const statusName = typeof lead.status === 'object' && lead.status !== null 
              ? lead.status.name 
              : lead.status;
            hasValue = statusName === 'Netto1' || statusName === 'Netto2';
          }
          
          groupKey = hasValue ? 'true' : 'false';
          groupName = hasValue ? 'true' : 'false';
          groupId = generateNoneGroupId(`${field}_${groupKey}`, level);
        } else if (groupConfig.type === 'context_date') {
          const entityContext = detectEntityContext(this.options.filters || []);
          const contextPrefix = entityContext ? `${entityContext}_` : '';
          const contextDateField = `${contextPrefix}${field}`;
          const value = lead[contextDateField] || lead[field];

          if (value !== null && value !== undefined && value !== '') {
            if (value instanceof Date) {
              const dateStr = value.toISOString().split('T')[0];
              groupKey = dateStr;
              groupName = dateStr;
              groupId = generateNoneGroupId(`${field}_${dateStr}`, level);
            } else if (typeof value === 'string' && value.length > 0) {
              groupKey = value;
              groupName = value;
              groupId = generateNoneGroupId(`${field}_${value}`, level);
            }
          }
        } else {
          let value = lead[field];
          
          // Special handling for leadPrice: fallback to source_id.price if leadPrice is missing (but not 0, as 0 is a valid price)
          if (field === 'leadPrice') {
            // Convert to number if it's a string
            if (typeof value === 'string' && value !== '') {
              value = Number(value);
            }
            // Fallback to source_id.price if leadPrice is null, undefined, or NaN (but not 0, as 0 is a valid price)
            if ((value === null || value === undefined || value === 0 || (typeof value === 'number' && isNaN(value))) &&
    lead.source_id && lead.source_id.price !== null && lead.source_id.price !== undefined) {
  value = lead.source_id.price;
}

          }
          
          // For number fields, 0 is a valid value, so check explicitly
          if (groupConfig.type === 'number') {
            // Ensure value is a number
            if (typeof value === 'string' && value !== '') {
              value = Number(value);
            }
            // Check if value is a valid number (including 0)
            if (value !== null && value !== undefined && value !== '' && !isNaN(value)) {
              groupKey = value.toString();
              groupName = formatValue(value, groupConfig.type);
              groupId = generateNoneGroupId(`${field}_${value.toString()}`, level);
            }
          } else if (value !== null && value !== undefined && value !== '') {
            if (groupConfig.type === 'date' && value instanceof Date) {
              const dateStr = value.toISOString().split('T')[0];
              groupKey = dateStr;
              groupName = dateStr;
              groupId = generateNoneGroupId(`${field}_${dateStr}`, level);
            } else {
              groupKey = value.toString();
              groupName = formatValue(value, groupConfig.type);
              groupId = generateNoneGroupId(`${field}_${value.toString()}`, level);
            }
          }
        }
    }

    return { groupKey, groupName, groupId };
  }

  /**
   * Finalize last level groups (handle includeLeads option)
   * @private
   */
  _finalizeLastLevel(groups) {
    for (const group of groups) {
      if (this.options.includeLeads) {
        // Keep leads array
      } else {
        // Just keep lead IDs
        group.leadIds = group.leads.map((lead) => lead._id);
        delete group.leads;
      }
    }
    return groups;
  }
}

module.exports = MultilevelGroupBuilder;