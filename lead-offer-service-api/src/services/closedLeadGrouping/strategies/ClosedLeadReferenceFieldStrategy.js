const ClosedLead = require('../../../models/ClosedLead');
const { Team, User, Source } = require('../../../models');
const { Settings, SETTINGS_TYPES } = require('../../../models/Settings');
const { generateNoneGroupId, getDisplayName } = require('../../leadGrouping/utils/groupHelpers');
const logger = require('../../../helpers/logger') || console;

class ClosedLeadReferenceFieldStrategy {
  canHandle(groupConfig) {
    return groupConfig.type === 'reference';
  }

  async execute(groupConfig, baseQuery) {
    const { field, collection } = groupConfig;
    try {
      if (collection === 'Settings') {
        return this._executeSettingsGrouping(field, baseQuery);
      }
      const selectFields = collection === 'User' ? '_id login' : '_id name';
      const leads = await ClosedLead.find(baseQuery).select(`_id ${field}`).populate(field, selectFields).lean();
      const { groupMap, nullGroup } = this._buildGroups(leads, field);
      await this._populateNames(groupMap, collection);
      const results = Array.from(groupMap.values());
      if (nullGroup.count > 0) results.push(nullGroup);
      return results;
    } catch (error) {
      logger.error('ClosedLeadReferenceFieldStrategy error:', { field, collection, error: error.message });
      throw error;
    }
  }

  async _executeSettingsGrouping(field, baseQuery) {
    const leads = await ClosedLead.find(baseQuery).select(`_id ${field}`).lean();
    const { groupMap, nullGroup } = this._buildGroups(leads, field);
    await this._populateStatusNames(groupMap);
    const results = Array.from(groupMap.values());
    if (nullGroup.count > 0) results.push(nullGroup);
    return results;
  }

  _buildGroups(leads, field) {
    const groupMap = new Map();
    const nullGroup = { groupId: generateNoneGroupId(field), groupName: 'None', leadIds: [], count: 0 };
    for (const lead of leads) {
      const refValue = lead[field];
      const refId = refValue && typeof refValue === 'object' ? refValue._id : refValue;
      if (!refId) { nullGroup.leadIds.push(lead._id); nullGroup.count++; }
      else {
        const key = refId.toString();
        if (!groupMap.has(key)) groupMap.set(key, { groupId: refId, groupName: null, leadIds: [], count: 0 });
        groupMap.get(key).leadIds.push(lead._id);
        groupMap.get(key).count++;
      }
    }
    return { groupMap, nullGroup };
  }

  async _populateNames(groupMap, collection) {
    const ids = Array.from(groupMap.keys());
    if (ids.length === 0) return;
    const Model = collection === 'User' ? User : collection === 'Team' ? Team : Source;
    const sel = collection === 'User' ? '_id login' : '_id name';
    const docs = await Model.find({ _id: { $in: ids } }).select(sel).lean();
    for (const doc of docs) {
      const key = doc._id.toString();
      if (groupMap.has(key)) {
        const g = groupMap.get(key);
        g.groupName = getDisplayName(doc, collection);
        g.reference = doc;
      }
    }
  }

  async _populateStatusNames(groupMap) {
    const ids = Array.from(groupMap.keys());
    if (ids.length === 0) return;
    try {
      const stages = await Settings.find({ type: SETTINGS_TYPES.STAGE }).lean();
      for (const stage of stages) {
        if (!stage.info || !Array.isArray(stage.info.statuses)) continue;
        for (const status of stage.info.statuses) {
          const id = (status._id || status.id)?.toString();
          if (id && groupMap.has(id)) {
            const g = groupMap.get(id);
            g.groupName = `${status.name || 'Unknown'} (${stage.name})`;
            g.reference = { _id: id, name: status.name, stage: stage.name, stage_id: stage._id };
          }
        }
      }
    } catch (error) {
      logger.error('Error populating status names for current_status grouping:', { error: error.message });
    }
  }
}

module.exports = ClosedLeadReferenceFieldStrategy;
