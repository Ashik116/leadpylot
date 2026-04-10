const { Settings, SETTINGS_TYPES } = require('../models/Settings');
const logger = require('../helpers/logger');

/**
 * Map status ObjectIds to { _id, name, stage, stage_id } using stage Settings (same as configuration-service).
 */
async function buildCurrentStatusMap(leads) {
  const statusIds = leads
    .filter((l) => l && l.current_status)
    .map((l) => l.current_status.toString());

  if (statusIds.length === 0) return {};

  try {
    const stages = await Settings.find({ type: SETTINGS_TYPES.STAGE }).lean();
    const map = {};
    for (const stage of stages) {
      if (!stage.info || !Array.isArray(stage.info.statuses)) continue;
      for (const status of stage.info.statuses) {
        const id = (status._id || status.id)?.toString();
        if (id && statusIds.includes(id)) {
          map[id] = {
            _id: id,
            name: status.name || '',
            stage: stage.name,
            stage_id: stage._id,
          };
        }
      }
    }
    return map;
  } catch (error) {
    logger.error('Error building status map for closed lead current_status', { error: error.message });
    return {};
  }
}

/**
 * Replace raw current_status ids on closed lead documents with enriched objects (or keep id if unknown).
 */
async function enrichClosedLeadsWithCurrentStatus(leads) {
  if (!Array.isArray(leads) || leads.length === 0) return leads;
  const statusMap = await buildCurrentStatusMap(leads);
  return leads.map((lead) => {
    if (!lead || !lead.current_status) return lead;
    const id = lead.current_status.toString();
    return {
      ...lead,
      current_status: statusMap[id] || lead.current_status,
    };
  });
}

/**
 * Add source_agent / source_project (same objects as source_user_id / source_team_id) for Lead-parity field names.
 */
function attachClosedLeadSourceAliases(leads) {
  if (!Array.isArray(leads) || leads.length === 0) return leads;
  return leads.map((doc) => {
    if (!doc || typeof doc !== 'object') return doc;
    const out = { ...doc };
    if (Object.prototype.hasOwnProperty.call(doc, 'source_user_id')) {
      out.source_agent = doc.source_user_id;
    }
    if (Object.prototype.hasOwnProperty.call(doc, 'source_team_id')) {
      out.source_project = doc.source_team_id;
    }
    return out;
  });
}

module.exports = {
  buildCurrentStatusMap,
  enrichClosedLeadsWithCurrentStatus,
  attachClosedLeadSourceAliases,
};
