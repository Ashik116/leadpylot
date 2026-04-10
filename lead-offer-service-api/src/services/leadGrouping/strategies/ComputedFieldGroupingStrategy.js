/**
 * Computed Field Grouping Strategy
 * Handles grouping by computed fields (has_offer, has_todo, is_favourite, etc.)
 */

const BaseGroupingStrategy = require('./BaseGroupingStrategy');
const { Lead } = require('../../../models');
const Offer = require('../../../models/Offer');
const Todo = require('../../../models/Todo');
const LeadTransfer = require('../../../models/leadTransfer');
const { generateNoneGroupId } = require('../utils/groupHelpers');
const logger = require('../../../helpers/logger');

class ComputedFieldGroupingStrategy extends BaseGroupingStrategy {
  getType() {
    return 'computed';
  }

  canHandle(groupConfig) {
    return groupConfig.type === 'computed';
  }

  async execute(groupConfig, baseQuery, user, options = {}) {
    const { field } = groupConfig;

    try {
      // Get all leads matching the base query
      const leads = await Lead.find(baseQuery)
        .select('_id source_id contact_name email_from phone lead_source_no stage status expected_revenue')
        .populate('source_id', 'name price active color')
        .lean();

      const leadIds = leads.map((l) => l._id);

      // Special handling for last_transfer (returns multiple groups)
      if (field === 'last_transfer') {
        return await this._groupByLastTransfer(leadIds, user, options);
      }

      // Get computed lead IDs for this field
      const computedLeadIds = await this._getComputedLeadIds(field, leadIds, user, options);

      // Create boolean groups (true/false)
      return this._createBooleanGroups(field, leadIds, computedLeadIds);
    } catch (error) {
      logger.error('ComputedFieldGroupingStrategy error:', {
        field,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get lead IDs that match the computed field criteria
   * @private
   */
  async _getComputedLeadIds(field, leadIds, user, options) {
    switch (field) {
      case 'has_offer':
        return await this._getOfferLeadIds(leadIds);
      case 'has_opening':
        return await this._getOpeningLeadIds(leadIds);
      case 'has_confirmation':
        return await this._getConfirmationLeadIds(leadIds);
      case 'has_payment':
        return await this._getPaymentLeadIds(leadIds);
      case 'has_netto':
        return await this._getNettoLeadIds(leadIds);
      case 'has_todo':
        return await this._getTodoLeadIds(leadIds, user);
      case 'has_extra_todo':
        return await this._getExtraTodoLeadIds(leadIds, user);
      case 'has_assigned_todo':
        return await this._getAssignedTodoLeadIds(leadIds, user);
      case 'is_favourite':
        return await this._getFavouriteLeadIds(leadIds, user);
      default:
        return [];
    }
  }

  /**
   * Get lead IDs with offers (no progress)
   * @private
   */
  async _getOfferLeadIds(leadIds) {
    const ProgressPipelineBuilder = require('../../offerService/builders/ProgressPipelineBuilder');

    const pipeline = new ProgressPipelineBuilder()
      .addMatch({
        lead_id: { $in: leadIds, $ne: null },
        active: true,
      })
      .addProgressLookups()
      .addProgressFields()
      .addNoProgressFilter()
      .build();

    pipeline.push({ $project: { lead_id: 1 } });

    const offers = await Offer.aggregate(pipeline);
    return [...new Set(offers.map((o) => o.lead_id.toString()))];
  }

  /**
   * Get lead IDs with openings
   * @private
   */
  async _getOpeningLeadIds(leadIds) {
    const ProgressPipelineBuilder = require('../../offerService/builders/ProgressPipelineBuilder');
    const { PROGRESS_FILTERS } = require('../../offerService/config/constants');

    const pipeline = new ProgressPipelineBuilder()
      .addMatch({ lead_id: { $in: leadIds, $ne: null }, active: true })
      .addProgressLookups()
      .addProgressFields()
      .addMatch(PROGRESS_FILTERS.opening)
      .build();

    pipeline.push({ $project: { lead_id: 1 } });

    const offers = await Offer.aggregate(pipeline);
    return [...new Set(offers.map((o) => o.lead_id.toString()))];
  }

  /**
   * Get lead IDs with confirmations
   * @private
   */
  async _getConfirmationLeadIds(leadIds) {
    const ProgressPipelineBuilder = require('../../offerService/builders/ProgressPipelineBuilder');
    const { PROGRESS_FILTERS } = require('../../offerService/config/constants');

    const pipeline = new ProgressPipelineBuilder()
      .addMatch({ lead_id: { $in: leadIds, $ne: null }, active: true })
      .addProgressLookups()
      .addProgressFields()
      .addMatch(PROGRESS_FILTERS.confirmation)
      .build();

    pipeline.push({ $project: { lead_id: 1 } });

    const offers = await Offer.aggregate(pipeline);
    return [...new Set(offers.map((o) => o.lead_id.toString()))];
  }

  /**
   * Get lead IDs with payments
   * @private
   */
  async _getPaymentLeadIds(leadIds) {
    const ProgressPipelineBuilder = require('../../offerService/builders/ProgressPipelineBuilder');
    const { PROGRESS_FILTERS } = require('../../offerService/config/constants');

    const pipeline = new ProgressPipelineBuilder()
      .addMatch({ lead_id: { $in: leadIds, $ne: null }, active: true })
      .addProgressLookups()
      .addProgressFields()
      .addMatch(PROGRESS_FILTERS.payment)
      .build();

    pipeline.push({ $project: { lead_id: 1 } });

    const offers = await Offer.aggregate(pipeline);
    return [...new Set(offers.map((o) => o.lead_id.toString()))];
  }

  /**
   * Get lead IDs with netto
   * @private
   */
  async _getNettoLeadIds(leadIds) {
    const { Lead } = require('../../../models');
    const ProgressPipelineBuilder = require('../../offerService/builders/ProgressPipelineBuilder');
    const { PROGRESS_FILTERS } = require('../../offerService/config/constants');

    // Get leads with Netto1/Netto2 status from lead.status field
    const leadsWithNettoStatus = await Lead.find({
      _id: { $in: leadIds },
      status: { $in: ['Netto1', 'Netto2'] },
    })
      .select('_id')
      .lean();
    
    const nettoStatusLeadIds = new Set(leadsWithNettoStatus.map((l) => l._id.toString()));

    // Also check for Netto1/Netto2 records via offers (existing logic)
    const pipeline = new ProgressPipelineBuilder()
      .addMatch({ lead_id: { $in: leadIds, $ne: null }, active: true })
      .addProgressLookups()
      .addProgressFields()
      .addMatch(PROGRESS_FILTERS.netto)
      .build();

    pipeline.push({ $project: { lead_id: 1 } });

    const offers = await Offer.aggregate(pipeline);
    const nettoRecordLeadIds = new Set(offers.map((o) => o.lead_id.toString()));

    // Combine both: leads with Netto status OR leads with Netto records
    const allNettoLeadIds = new Set([...nettoStatusLeadIds, ...nettoRecordLeadIds]);
    
    return Array.from(allNettoLeadIds);
  }

  /**
   * Get lead IDs with todos
   * @private
   */
  async _getTodoLeadIds(leadIds, user) {
    const { ROLES } = require('../../../auth/roles/roleDefinitions');
    const AssignLeads = require('../../../models/AssignLeads');

    let todoQuery = { active: true, isDone: false };

    if (user.role === ROLES.ADMIN) {
      const todos = await Todo.find(todoQuery).select('lead_id').lean();
      return [...new Set(todos.map((t) => t.lead_id.toString()))];
    } else if (user.role === ROLES.AGENT) {
      const assignments = await AssignLeads.find({
        agent_id: user._id,
        status: 'active',
      }).select('lead_id');
      const assignedLeadIds = assignments.map((a) => a.lead_id.toString());
      const accessibleLeadIds = leadIds.filter((id) => assignedLeadIds.includes(id.toString()));

      todoQuery.$or = [
        { lead_id: { $in: accessibleLeadIds } },
        { lead_id: { $in: leadIds }, assigned_to: user._id },
      ];

      const todos = await Todo.find(todoQuery).select('lead_id').lean();
      return [...new Set(todos.map((t) => t.lead_id.toString()))];
    }

    return [];
  }

  /**
   * Get lead IDs with extra todos (assigned TO user)
   * @private
   */
  async _getExtraTodoLeadIds(leadIds, user) {
    const { ROLES } = require('../../../auth/roles/roleDefinitions');
    const User = require('../../../models/User');
    const AssignLeads = require('../../../models/AssignLeads');

    let extraTodoQuery = { active: true, isDone: false };

    if (user.role === ROLES.ADMIN) {
      const adminUsers = await User.find({ role: ROLES.ADMIN }).select('_id');
      const adminIds = adminUsers.map((admin) => admin._id);
      extraTodoQuery.assigned_to = { $in: adminIds };

      const todos = await Todo.find(extraTodoQuery).select('lead_id').lean();
      return [...new Set(todos.map((t) => t.lead_id.toString()))];
    } else if (user.role === ROLES.AGENT) {
      const assignments = await AssignLeads.find({
        agent_id: user._id,
        status: 'active',
      }).select('lead_id');
      const assignedLeadIds = assignments.map((a) => a.lead_id.toString());
      const accessibleLeadIds = leadIds.filter((id) => assignedLeadIds.includes(id.toString()));

      extraTodoQuery.$or = [
        { lead_id: { $in: accessibleLeadIds }, assigned_to: user._id },
        { assigned_to: user._id },
      ];

      const todos = await Todo.find(extraTodoQuery).select('lead_id').lean();
      return [...new Set(todos.map((t) => t.lead_id.toString()))];
    }

    return [];
  }

  /**
   * Get lead IDs with assigned todos (assigned BY user to others)
   * @private
   */
  async _getAssignedTodoLeadIds(leadIds, user) {
    const { ROLES } = require('../../../auth/roles/roleDefinitions');
    const AssignLeads = require('../../../models/AssignLeads');

    if (user.role === ROLES.ADMIN) {
      const todos = await Todo.find({
        creator_id: user._id,
        assigned_to: { $ne: null, $ne: user._id },
        active: true,
      }).select('lead_id').lean();
      return [...new Set(todos.map((t) => t.lead_id.toString()))];
    } else if (user.role === ROLES.AGENT) {
      const assignments = await AssignLeads.find({
        agent_id: user._id,
        status: 'active',
      }).select('lead_id');
      const assignedLeadIds = assignments.map((a) => a.lead_id.toString());
      const accessibleLeadIds = leadIds.filter((id) => assignedLeadIds.includes(id.toString()));

      const todos = await Todo.find({
        lead_id: { $in: accessibleLeadIds },
        creator_id: user._id,
        assigned_to: { $ne: null, $ne: user._id },
        active: true,
      }).select('lead_id').lean();
      return [...new Set(todos.map((t) => t.lead_id.toString()))];
    }

    return [];
  }

  /**
   * Get lead IDs marked as favourite by user
   * @private
   */
  async _getFavouriteLeadIds(leadIds, user) {
    const Favourite = require('../../../models/Favourite');
    const favourites = await Favourite.find({
      lead_id: { $in: leadIds },
      user_id: user._id,
      active: true,
    }).select('lead_id').lean();
    return [...new Set(favourites.map((f) => f.lead_id.toString()))];
  }

  /**
   * Group leads by their last transfer information
   * @private
   */
  async _groupByLastTransfer(leadIds, user, options) {
    const transferGroups = new Map();

    const transfers = await LeadTransfer.find({
      lead_id: { $in: leadIds },
      transfer_status: 'completed',
    })
      .populate('from_agent_id', 'login name')
      .populate('to_agent_id', 'login name')
      .sort({ createdAt: -1 })
      .lean();

    // Get latest transfer per lead
    const latestTransferMap = new Map();
    for (const transfer of transfers) {
      const leadIdStr = transfer.lead_id.toString();
      if (!latestTransferMap.has(leadIdStr)) {
        latestTransferMap.set(leadIdStr, transfer);
      }
    }

    // Group by transfer pattern
    for (const leadId of leadIds) {
      const leadIdStr = leadId.toString();
      const transfer = latestTransferMap.get(leadIdStr);

      if (transfer) {
        const fromAgent = transfer.from_agent_id?.login || transfer.from_agent_id?.name || 'Unknown';
        const toAgent = transfer.to_agent_id?.login || transfer.to_agent_id?.name || 'Unknown';
        const transferDate = new Date(transfer.createdAt).toLocaleDateString('en-GB').replace(/\//g, '-');
        const groupKey = `${fromAgent}→${toAgent}(${transferDate})`;

        if (!transferGroups.has(groupKey)) {
          transferGroups.set(groupKey, []);
        }
        transferGroups.get(groupKey).push(leadId);
      }
    }

    const results = [];

    // Create groups for each transfer pattern
    for (const [groupKey, groupLeadIds] of transferGroups.entries()) {
      results.push({
        groupId: generateNoneGroupId(`transfer_${groupKey}`).toString(),
        groupName: groupKey,
        leadIds: groupLeadIds,
        count: groupLeadIds.length,
      });
    }

    // Add "No Transfer" group
    const leadsWithoutTransfer = leadIds.filter((leadId) => {
      return !latestTransferMap.has(leadId.toString());
    });

    if (leadsWithoutTransfer.length > 0) {
      results.push({
        groupId: generateNoneGroupId('transfer_none').toString(),
        groupName: 'No Transfer',
        leadIds: leadsWithoutTransfer,
        count: leadsWithoutTransfer.length,
      });
    }

    return results;
  }

  /**
   * Create boolean groups (true/false) for computed fields
   * @private
   */
  _createBooleanGroups(field, leadIds, computedLeadIds) {
    const hasGroup = {
      groupId: generateNoneGroupId(`${field}_true`).toString(),
      groupName: 'true',
      leadIds: leadIds.filter((id) => computedLeadIds.includes(id.toString())),
      count: 0,
    };
    hasGroup.count = hasGroup.leadIds.length;

    const hasNotGroup = {
      groupId: generateNoneGroupId(`${field}_false`).toString(),
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
}

module.exports = ComputedFieldGroupingStrategy;