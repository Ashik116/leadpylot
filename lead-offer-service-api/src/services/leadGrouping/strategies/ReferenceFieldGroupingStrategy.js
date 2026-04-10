/**
 * Reference Field Grouping Strategy
 * Handles grouping by reference fields (project, agent, source)
 */

const BaseGroupingStrategy = require('./BaseGroupingStrategy');
const { Lead, AssignLeads, Source, Team, User } = require('../../../models');
const { generateNoneGroupId, getDisplayName } = require('../utils/groupHelpers');
const logger = require('../../../helpers/logger');

class ReferenceFieldGroupingStrategy extends BaseGroupingStrategy {
  getType() {
    return 'reference';
  }

  canHandle(groupConfig) {
    return groupConfig.type === 'reference';
  }

  async execute(groupConfig, baseQuery, user, options = {}) {
    const { field, collection } = groupConfig;

    try {
      // Determine which sub-strategy to use
      if (field === 'project_id' || field === 'agent_id') {
        return await this._groupByAssignmentReference(groupConfig, baseQuery, user, options);
      } else {
        return await this._groupByDirectReference(groupConfig, baseQuery, user, options);
      }
    } catch (error) {
      logger.error('ReferenceFieldGroupingStrategy error:', {
        field,
        collection,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Group by assignment reference fields (project, agent)
   * Uses AssignLeads collection
   * @private
   */
  async _groupByAssignmentReference(groupConfig, baseQuery, user, options) {
    const { field, collection } = groupConfig;

    // Get all leads matching the base query
    const leads = await Lead.find(baseQuery)
      .select('_id source_id contact_name email_from phone lead_source_no stage status expected_revenue')
      .populate('source_id', 'name price active color')
      .lean();

    const leadIds = leads.map((l) => l._id);

    // Get assignments for these leads
    const assignments = await AssignLeads.find({
      lead_id: { $in: leadIds },
      status: 'active',
    })
      .select(`lead_id ${field}`)
      .lean();

    // Build groups from assignments
    const { groupMap, nullGroup, assignedLeadIds } = this._buildAssignmentGroups(
      assignments,
      field
    );

    // Add unassigned leads to null group
    this._addUnassignedLeads(leadIds, assignedLeadIds, nullGroup);

    // Populate reference data (names, etc.)
    await this._populateReferenceData(groupMap, collection);

    // Convert to array and include null group if it has leads
    const results = Array.from(groupMap.values());
    if (nullGroup.count > 0) {
      results.push(nullGroup);
    }

    return results;
  }

  /**
   * Group by direct reference fields (source, source_agent, source_project)
   * Uses direct field on Lead
   * @private
   */
  async _groupByDirectReference(groupConfig, baseQuery, user, options) {
    const { field, collection } = groupConfig;

    // Get all leads matching the base query
    const leads = await Lead.find(baseQuery)
      .select(`_id ${field}`)
      .populate(field, collection === 'User' ? '_id login' : '_id name')
      .lean();

    // Build groups from lead references
    const { groupMap, nullGroup } = this._buildDirectGroups(leads, field);

    // Populate reference data
    await this._populateReferenceData(groupMap, collection);

    // Convert to array and include null group if it has leads
    const results = Array.from(groupMap.values());
    if (nullGroup.count > 0) {
      results.push(nullGroup);
    }

    return results;
  }

  /**
   * Build groups from assignments
   * @private
   */
  _buildAssignmentGroups(assignments, field) {
    const groupMap = new Map();
    const nullGroup = this.createNoneGroup(field);
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

    return { groupMap, nullGroup, assignedLeadIds };
  }

  /**
   * Build groups from direct lead references
   * @private
   */
  _buildDirectGroups(leads, field) {
    const groupMap = new Map();
    const nullGroup = this.createNoneGroup(field);

    for (const lead of leads) {
      // Handle both ObjectId and populated object
      const refValue = lead[field];
      const refId = refValue && typeof refValue === 'object' ? refValue._id : refValue;

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

    return { groupMap, nullGroup };
  }

  /**
   * Add unassigned leads to null group
   * @private
   */
  _addUnassignedLeads(leadIds, assignedLeadIds, nullGroup) {
    for (const leadId of leadIds) {
      if (!assignedLeadIds.has(leadId.toString())) {
        nullGroup.leadIds.push(leadId);
        nullGroup.count++;
      }
    }
  }

  /**
   * Populate reference data (fetch names from referenced collections)
   * @private
   */
  async _populateReferenceData(groupMap, collection) {
    const referenceIds = Array.from(groupMap.keys());

    if (referenceIds.length === 0) {
      return;
    }

    // Get the appropriate model
    const Model = this._getModel(collection);

    // Select appropriate fields based on collection
    const selectFields = collection === 'User' 
      ? '_id login' 
      : collection === 'Team'
      ? '_id name'
      : '_id name login first_name last_name active';

    // Fetch reference documents
    const referenceData = await Model.find({
      _id: { $in: referenceIds },
    })
      .select(selectFields)
      .lean();

    // Update group names with reference data
    for (const ref of referenceData) {
      const key = ref._id.toString();
      if (groupMap.has(key)) {
        const group = groupMap.get(key);
        group.groupName = getDisplayName(ref, collection);
        group.reference = ref;
      }
    }
  }

  /**
   * Get the appropriate Mongoose model for collection
   * @private
   */
  _getModel(collection) {
    switch (collection) {
      case 'User':
        return User;
      case 'Team':
        return Team;
      case 'Source':
        return Source;
      default:
        throw new Error(`Unknown collection: ${collection}`);
    }
  }
}

module.exports = ReferenceFieldGroupingStrategy;