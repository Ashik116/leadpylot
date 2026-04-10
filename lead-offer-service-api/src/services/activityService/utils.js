/**
 * Activity Service Utilities
 * Utility functions for the activity service
 */

const mongoose = require('mongoose');
const { Settings } = require('../../models');
const logger = require('../../utils/logger');
const { generateAndSaveSummary, isEnabled: isLeadSummaryAIEnabled } = require('../leadSummaryService');

/**
 * Get a descriptive name for a subject based on its type and data
 * @param {Object} subject - The subject entity
 * @param {string} type - The subject type
 * @returns {string} - Descriptive name
 */
const getSubjectName = (subject, type) => {
  if (!subject) return 'Unknown';

  switch (type.toLowerCase()) {
    case 'lead':
      return subject.contact_name || subject.name || `Lead #${subject._id || subject.id}`;
    case 'offer':
      return `Offer #${subject.title}`;
    case 'user':
      return subject.login || `User #${subject._id}`;
    case 'team':
    case 'project':
      return subject.name || `Project #${subject._id}`;
    case 'bank':
      return subject.name || `Bank #${subject._id}`;
    case 'opening':
      return `Opening #${subject._id}`;
    case 'meeting':
      return subject.title || `Meeting #${subject._id}`;
    default:
      return `${type} #${subject._id || 'Unknown'}`;
  }
};

/**
 * Resolve a status ID to its human-readable name
 * Supports both: (1) multiple stage docs with info.statuses[_id,name], (2) single doc with data[].statuses[id,name]
 * @param {string} statusId - Status ID to resolve
 * @returns {Promise<string>} - Human-readable status name
 */
const resolveStatusName = async (statusId) => {
  if (!statusId) return 'none';

  try {
    // Check if the status is already in the format "Stage: stageName->statusName"
    if (typeof statusId === 'string' && statusId.startsWith('Stage: ')) {
      return statusId;
    }

    const statusIdStr = statusId.toString();

    // Structure used in this CRM: Settings.find({ type: 'stage' }) → each doc has info.statuses with _id, name
    const stageDocs = await Settings.find({ type: 'stage' }).lean();
    for (const stage of stageDocs) {
      if (!stage.info || !Array.isArray(stage.info.statuses)) continue;
      const status = stage.info.statuses.find(
        (s) =>
          (s._id && s._id.toString() === statusIdStr) ||
          (s.id && s.id.toString() === statusIdStr)
      );
      if (status && status.name) return status.name;
    }

    // Fallback: single document with data array (stage.data[].statuses with id, name)
    const singleStageSettings = await Settings.findOne({ type: 'stage' }).lean();
    if (singleStageSettings && singleStageSettings.data && Array.isArray(singleStageSettings.data)) {
      for (const stage of singleStageSettings.data) {
        if (!stage.statuses || !Array.isArray(stage.statuses)) continue;
        const statusMatch = stage.statuses.find((s) => {
          const sId = (s.id ?? s._id) ? (s.id || s._id).toString() : '';
          return sId === statusIdStr;
        });
        if (statusMatch && statusMatch.name) return statusMatch.name;
      }
    }

    return statusIdStr;
  } catch (error) {
    logger.error('Error resolving status name', { error, statusId });
    return statusId ? statusId.toString() : 'none';
  }
};

/**
 * Resolve a stage ID to its human-readable name
 * @param {string} stageId - Stage ID to resolve
 * @returns {Promise<string>} - Human-readable stage name
 */
const resolveStageName = async (stageId) => {
  if (!stageId) return 'none';

  try {
    const stageSettings = await Settings.findOne({ type: 'stage' }).lean();

    if (!stageSettings || !stageSettings.data) {
      return stageId.toString();
    }

    // Try to find the stage by ID
    const stageMatch = stageSettings.data.find((s) => {
      // Handle both string IDs and ObjectIds
      const sId = s.id ? s.id.toString() : '';
      const targetId = stageId ? stageId.toString() : '';
      return sId === targetId;
    });

    return stageMatch ? stageMatch.name : stageId.toString();
  } catch (error) {
    logger.error('Error resolving stage name', { error, stageId });
    return stageId ? stageId.toString() : 'none';
  }
};

/**
 * Resolve a user ID to their name or login
 * @param {string} userId - User ID to resolve
 * @returns {Promise<string>} - User name or login
 */
const resolveUserName = async (userId) => {
  if (!userId) return 'none';

  try {
    const User = mongoose.model('User');
    const user = await User.findById(userId).lean();

    if (!user) {
      return userId.toString();
    }

    // Return the most descriptive name available
    return user.first_name && user.last_name
      ? `${user.first_name} ${user.last_name}`
      : user.login || userId.toString();
  } catch (error) {
    logger.error('Error resolving user name', { error, userId });
    return userId ? userId.toString() : 'none';
  }
};

/**
 * Resolve a team/project ID to its name
 * @param {string} teamId - Team ID to resolve
 * @returns {Promise<string>} - Team name
 */
const resolveTeamName = async (teamId) => {
  if (!teamId) return 'none';

  try {
    const Project = mongoose.model('Project');
    const project = await Project.findById(teamId).lean();

    if (!project) {
      return teamId.toString();
    }

    return project.name || teamId.toString();
  } catch (error) {
    logger.error('Error resolving team name', { error, teamId });
    return teamId ? teamId.toString() : 'none';
  }
};

/**
 * Resolve lead_id from activity data for LeadAIContext tracking.
 * Used so AI context can include all activities for a lead.
 * @param {Object} data - Activity data (subject_type, _subject_id, details)
 * @returns {mongoose.Types.ObjectId|null} - Lead ID or null
 */
const resolveLeadIdFromActivityData = (data) => {
  if (!data) return null;
  const subjectType = (data.subject_type || '').toString().toLowerCase();
  if (subjectType === 'lead' && data._subject_id) {
    return mongoose.Types.ObjectId.isValid(data._subject_id) ? data._subject_id : null;
  }
  const leadId = data.details?.lead_id;
  if (leadId) {
    const id = leadId._id || leadId;
    return mongoose.Types.ObjectId.isValid(id) ? id : null;
  }
  return null;
};

/**
 * Archive the current lead summary to LeadAISummaryHistory before it gets overwritten.
 * Called when an activity triggers so we preserve the previous summary in history.
 * @param {Object} ctx - LeadAIContext document (with last_summary, last_summary_at, last_summary_model)
 * @param {string} trigger - Trigger type (e.g. 'activity_update')
 * @returns {Promise<mongoose.Types.ObjectId|null>} - Created history doc _id or null
 */
const archiveCurrentSummaryToHistory = async (ctx, trigger = 'activity_update') => {
  if (!ctx || !ctx.last_summary || typeof ctx.last_summary !== 'string' || ctx.last_summary.trim() === '') {
    return null;
  }
  try {
    const LeadAISummaryHistory = mongoose.model('LeadAISummaryHistory');
    const historyDoc = await LeadAISummaryHistory.create({
      lead_id: ctx.lead_id,
      summary: ctx.last_summary,
      model: ctx.last_summary_model || null,
      trigger,
      generated_at: ctx.last_summary_at || new Date(),
      ...(ctx.tenantId && { tenantId: ctx.tenantId }),
    });
    logger.debug('Archived lead summary to history', {
      leadId: ctx.lead_id?.toString(),
      historyId: historyDoc._id?.toString(),
      trigger,
    });
    return historyDoc._id;
  } catch (error) {
    logger.error('Failed to archive summary to LeadAISummaryHistory', {
      error: error.message,
      leadId: ctx?.lead_id?.toString(),
    });
    return null;
  }
};

/**
 * Append an activity to the lead's AI context (lead_activity_history) and mark pending_ai_update.
 * When the lead has an existing summary, archives it to LeadAISummaryHistory with trigger 'activity_update'
 * so the previous summary is preserved before a new one is generated.
 * Ensures LeadAIContext exists (upsert) so AI can be given full context for the lead.
 * @param {mongoose.Types.ObjectId} leadId - Lead ID
 * @param {mongoose.Types.ObjectId} activityId - Created activity ID
 * @returns {Promise<void>}
 */
const appendActivityToLeadAIContext = async (leadId, activityId) => {
  if (!leadId || !activityId || !mongoose.Types.ObjectId.isValid(leadId) || !mongoose.Types.ObjectId.isValid(activityId)) {
    return;
  }
  try {
    const LeadAIContext = mongoose.model('LeadAIContext');
    const ctx = await LeadAIContext.findOne({ lead_id: leadId }).lean();

    if (ctx && ctx.last_summary) {
      const historyId = await archiveCurrentSummaryToHistory(ctx, 'activity_update');
      if (historyId) {
        await LeadAIContext.updateOne(
          { lead_id: leadId },
          { $push: { lead_ai_summary_history: historyId } }
        );
      }
    }

    await LeadAIContext.findOneAndUpdate(
      { lead_id: leadId },
      {
        $push: { lead_activity_history: activityId },
        $set: { pending_ai_update: true },
        $setOnInsert: { lead_id: leadId },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    logger.debug('LeadAIContext updated with activity', {
      leadId: leadId.toString(),
      activityId: activityId.toString(),
    });

    if (isLeadSummaryAIEnabled()) {
      generateAndSaveSummary(leadId, {
        activityId,
        trigger: 'activity_update',
      }).catch((err) => {
        logger.error('Lead summary generation failed (non-blocking)', {
          leadId: leadId.toString(),
          error: err.message,
        });
      });
    }
  } catch (error) {
    logger.error('Failed to append activity to LeadAIContext', {
      error: error.message,
      leadId: leadId?.toString(),
      activityId: activityId?.toString(),
    });
    // Don't throw - LeadAIContext tracking should not break the main flow
  }
};

/**
 * Create a new activity log entry
 * @param {Object} data - Activity data
 * @returns {Promise<Object>} - Created activity
 */
const createActivity = async (data) => {
  try {
    const Activity = mongoose.model('Activity');

    // Set visibility based on user role
    if (!data.visibility) {
      // If the user is an admin, set visibility to admin by default
      const User = mongoose.model('User');
      const user = await User.findById(data._creator).lean();
      if (user && user.role === 'Admin') {
        data.visibility = 'admin';
      } else {
        // For all other users, set visibility to self
        data.visibility = 'self';
      }
    }

    const activity = new Activity(data);
    await activity.save();
    logger.info('✅ Activity logged successfully', {
      activityId: activity._id,
      creator: data._creator,
      subject: data._subject_id,
      action: data.action,
      type: data.type,
      visibility: data.visibility,
    });

    // Track activity in LeadAIContext so AI can receive full context for the lead
    const leadId = resolveLeadIdFromActivityData(data);
    if (leadId) {
      await appendActivityToLeadAIContext(leadId, activity._id);
    }

    return activity;
  } catch (error) {
    logger.error('❌ Error creating activity log', {
      error: error.message,
      errorName: error.name,
      validationErrors: error.errors,
      stack: error.stack,
      attemptedAction: data.action,
      attemptedData: {
        creator: data._creator,
        subject_id: data._subject_id,
        subject_type: data.subject_type,
        action: data.action,
      },
    });
    // Don't throw - activity logging should never break the main flow
    return null;
  }
};

module.exports = {
  getSubjectName,
  resolveStatusName,
  resolveStageName,
  resolveUserName,
  resolveTeamName,
  createActivity,
  resolveLeadIdFromActivityData,
  appendActivityToLeadAIContext,
  archiveCurrentSummaryToHistory,
};
