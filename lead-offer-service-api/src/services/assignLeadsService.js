const AssignLeads = require('../models/AssignLeads');
const LeadTransfer = require('../models/leadTransfer');
const { Team, Offer, Lead, User, Opening, Confirmation, PaymentVoucher, Document, Settings, Email } = require('../models');
const offerService = require('./offerService');
const { eventEmitter, EVENT_TYPES } = require('./events');
const { maskEmail } = require('./leadService/queries');
const logger = require('../helpers/logger');
const mongoose = require('mongoose');

/**
 * Professional AssignLeadsService class
 * Handles lead assignment operations with privacy controls and role-based access
 */
class AssignLeadsService {
  // Constants for better maintainability
  static STATUSES = {
    ACTIVE: 'active',
    ARCHIVED: 'archived',
  };

  static ROLES = {
    ADMIN: 'Admin',
    AGENT: 'Agent',
  };

  static DEFAULT_PAGINATION = {
    PAGE: 1,
    LIMIT: 50,
  };

  /**
   * Normalize arbitrary values into Mongo ObjectIds (or null when invalid)
   * This protects write operations from "Invalid ID format" errors.
   * @param {string|Object|mongoose.Types.ObjectId|null|undefined} value
   * @returns {mongoose.Types.ObjectId|null}
   */
  _normalizeObjectId(value) {
    if (!value) {
      return null;
    }

    if (mongoose.Types.ObjectId.isValid(value)) {
      return typeof value === 'string' ? new mongoose.Types.ObjectId(value) : value;
    }

    if (value._id && mongoose.Types.ObjectId.isValid(value._id)) {
      return typeof value._id === 'string' ? new mongoose.Types.ObjectId(value._id) : value._id;
    }

    return null;
  }

  /**
   * Common population configuration for lead assignments
   */
  static POPULATION_CONFIG = {
    BASIC: {
      PROJECT: { path: 'project_id', select: 'name color_code' },
      LEAD: { path: 'lead_id' },
      AGENT: { path: 'agent_id', select: 'login role' },
    },
    DETAILED: {
      LEAD: {
        path: 'lead_id',
        select: 'name email phone company_id system_id source status',
      },
      PROJECT: {
        path: 'project_id',
        select: 'name project_alias project_email project_phone',
      },
      ASSIGNED_BY: {
        path: 'assigned_by',
        select: 'login role',
      },
    },
  };

  /**
   * Helper method to sync lead's user_id with AssignLeads agent_id
   * @param {string|ObjectId} leadId - Lead ID
   * @param {string|ObjectId} agentId - Agent ID from assignment
   * @returns {Promise<boolean>} - True if sync was successful
   */
  async _syncLeadUserIdWithAssignment(leadId, agentId) {
    try {
      if (!leadId || !agentId) {
        logger.warn('Cannot sync lead user_id - missing leadId or agentId', {
          leadId: leadId?.toString(),
          agentId: agentId?.toString()
        });
        return false;
      }

      const leadObjectId = mongoose.Types.ObjectId.isValid(leadId) 
        ? (typeof leadId === 'string' ? new mongoose.Types.ObjectId(leadId) : leadId)
        : leadId;
      const agentObjectId = mongoose.Types.ObjectId.isValid(agentId) 
        ? (typeof agentId === 'string' ? new mongoose.Types.ObjectId(agentId) : agentId)
        : agentId;

      const leadUpdateResult = await Lead.findByIdAndUpdate(
        leadObjectId,
        { $set: { user_id: agentObjectId } },
        { new: true, runValidators: true }
      ).lean();

      if (!leadUpdateResult) {
        logger.warn('Failed to sync lead user_id - lead not found', {
          leadId: leadObjectId.toString(),
          agentId: agentObjectId.toString()
        });
        return false;
      }

      const updatedUserId = leadUpdateResult.user_id?.toString();
      const expectedAgentId = agentObjectId.toString();

      if (updatedUserId !== expectedAgentId) {
        logger.error('Lead user_id sync failed - values do not match', {
          leadId: leadObjectId.toString(),
          expectedAgentId,
          actualUserId: updatedUserId
        });
        return false;
      }

      logger.debug('Lead user_id synced with assignment agent_id', {
        leadId: leadObjectId.toString(),
        userId: updatedUserId
      });

      return true;
    } catch (error) {
      logger.error('Error syncing lead user_id with assignment', {
        error: error.message,
        leadId: leadId?.toString(),
        agentId: agentId?.toString()
      });
      return false;
    }
  }

  /**
   * Assign multiple leads to a project and agent
   * @param {Array} leadIds - Array of lead IDs to assign
   * @param {string} projectId - Project ID
   * @param {string} assignedBy - ID of user assigning the leads
   * @param {string} agentId - ID of agent to assign leads to
   * @param {string} notes - Optional notes for the assignment
   * @param {number} leadPrice - Optional price to set for the leads
   * @returns {Promise<Object>} - Assignment result with statistics
   */
  async assignLeadsToProject(leadIds, projectId, assignedBy, agentId, notes = '', leadPrice = null) {
    try {
      // Input validation
      if (!agentId) {
        throw new Error('Agent ID is required. Leads must be assigned to an agent.');
      }

      if (!Array.isArray(leadIds) || leadIds.length === 0) {
        throw new Error('Lead IDs array is required and cannot be empty.');
      }

      // Basic validation - check if project and agent exist
      const team = await Team.findById(projectId);
      if (!team) {
        throw new Error('Project not found');
      }

      const targetAgent = await User.findById(agentId);
      if (!targetAgent) {
        throw new Error('Agent not found');
      }

      // No restrictions - allow free assignment to any project/agent
      const newLeadIds = leadIds;

      // Prepare assignment documents - allow duplicate assignments
      const assignments = newLeadIds.map((leadId) => ({
        lead_id: leadId,
        project_id: projectId,
        agent_id: agentId,
        assigned_by: assignedBy,
        notes,
        status: AssignLeadsService.STATUSES.ACTIVE,
      }));

      // Handle lead assignments with proper transfer logic
      let savedAssignments = [];
      
      for (const assignment of assignments) {
        // **FIX: Archive ALL existing active assignments for this lead**
        // This ensures the lead only appears in ONE project/agent at a time
        // Previously only archived different projects, but same project with different agent also caused duplicates
        await AssignLeads.updateMany(
          { 
            lead_id: assignment.lead_id, 
            status: AssignLeadsService.STATUSES.ACTIVE 
          },
          { 
            $set: { 
              status: AssignLeadsService.STATUSES.ARCHIVED,
              archived_at: new Date(),
              archived_reason: `Lead reassigned to project ${team.name} (${projectId}), agent ${targetAgent.login}`,
              archived_by: assignedBy
            } 
          }
        );

        // Now handle the assignment for the current project
        const existing = await AssignLeads.findOneAndUpdate(
          { lead_id: assignment.lead_id, project_id: assignment.project_id },
          {
            $set: {
              agent_id: assignment.agent_id,
              assigned_by: assignment.assigned_by,
              notes: assignment.notes,
              status: AssignLeadsService.STATUSES.ACTIVE,
              assigned_at: new Date()
            }
          },
          { new: true, upsert: true }
        );
        savedAssignments.push(existing);
      }

      // Update lead status and assignment data for all assigned leads
      const updateData = {
        use_status: 'in_use',
        assigned_date: new Date(),
        team_id: projectId,
        user_id: agentId,
      };
      
      // Add leadPrice to update if provided
      if (leadPrice !== null && leadPrice !== undefined) {
        updateData.leadPrice = leadPrice;
      }
      
      await Lead.updateMany(
        { _id: { $in: newLeadIds } },
        { $set: updateData }
      );

      // Persist first-assignment snapshots so downstream APIs can avoid expensive history lookups
      await Lead.updateMany(
        {
          _id: { $in: newLeadIds },
          $or: [{ source_agent: { $exists: false } }, { source_agent: null }],
        },
        { $set: { source_agent: agentId } }
      );
      await Lead.updateMany(
        {
          _id: { $in: newLeadIds },
          $or: [{ source_project: { $exists: false } }, { source_project: null }],
        },
        { $set: { source_project: projectId } }
      );

      const result = {
        success: true,
        assigned: savedAssignments.length,
        assignments: savedAssignments,
        message: `Successfully assigned ${savedAssignments.length} leads to the project.`,
      };

      // Fetch lead data for activity logging
      const leads = await Lead.find({ _id: { $in: newLeadIds } }).lean();
      const agentData = await User.findById(agentId).lean();
      const project = await Team.findById(projectId).lean();
      const assigningUser = await User.findById(assignedBy).lean();

      // Emit events for activity logging for each newly assigned lead
      const totalLeads = leads.length;
      const isMultiple = totalLeads > 1;
      
      for (let i = 0; i < leads.length; i++) {
        const lead = leads[i];
        eventEmitter.emit(EVENT_TYPES.LEAD.ASSIGNED, {
          lead,
          creator: assigningUser,
          agent: agentData,
          project,
          batchInfo: {
            isMultiple,
            totalCount: totalLeads,
            currentIndex: i + 1
          }
        });
      }

      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Transfer a lead from one project/agent to another project/agent
   * This completely removes the lead from the current project and assigns it to the new project
   * @param {string} leadId - Lead ID to transfer
   * @param {string} toProjectId - Target project ID
   * @param {string} toAgentUserId - Target agent user ID
   * @param {string} transferredBy - ID of user performing the transfer
   * @param {string} notes - Optional notes for the transfer
   * @param {boolean} isFreshTransfer - Whether to make this a fresh transfer (hide previous data)
   * @param {string} transferReason - Reason for the transfer
   * @returns {Promise<Object>} - Transfer result with statistics
   */
  async replaceLeadToProject(leadId, toProjectId, toAgentUserId, transferredBy, notes = '', isFreshTransfer = false, transferReason = '', isRestore = false) {
    try {
      // Basic validation - check if target project and agent exist
      const targetTeam = await Team.findById(toProjectId);
      if (!targetTeam) {
        throw new Error('Target project not found');
      }

      const targetAgent = await User.findById(toAgentUserId);
      if (!targetAgent) {
        throw new Error('Target agent not found');
      }

      // Check if lead exists and get current state
      const lead = await Lead.findById(leadId).populate('stage_id').populate('status_id');
      if (!lead) {
        throw new Error('Lead not found');
      }

      // No restrictions - allow free assignment to any project/agent
      // Find any existing assignment for this lead (if any)
      const currentAssignment = await AssignLeads.findOne({
        lead_id: leadId,
        status: AssignLeadsService.STATUSES.ACTIVE,
      }).populate('lead_id', 'name contact_name').populate('agent_id', 'login').populate('project_id', 'name color_code');

      // Store original assignment data for activity logging
      const originalAssignment = {
        lead: currentAssignment?.lead_id || lead,
        fromProject: currentAssignment?.project_id,
        fromAgent: currentAssignment?.agent_id,
        toProject: targetTeam,
        toAgent: targetAgent,
        transferredBy: await User.findById(transferredBy).lean(),
      };

      // Create transfer record
      const transferRecord = new LeadTransfer({
        lead_id: leadId,
        from_project_id: currentAssignment?.project_id?._id,
        from_agent_id: currentAssignment?.agent_id?._id,
        to_project_id: toProjectId,
        to_agent_id: toAgentUserId,
        transferred_by: transferredBy,
        transfer_reason: transferReason,
        transfer_notes: notes,
        is_fresh_transfer: isFreshTransfer,
        transfer_type: 'manual',
        transfer_status: 'in_progress',
        previous_state: {
          stage_id: lead.stage_id?._id,
          status_id: lead.status_id?._id,
          stage_name: lead.stage_id?.name,
          status_name: lead.status_id?.name,
          use_status: lead.use_status,
          last_activity_date: lead.last_activity || lead.updatedAt,
        },
      });

      const transferStartTime = Date.now();

      // **FIX: Archive all existing active assignments for this lead BEFORE creating new one**
      // This prevents the lead from appearing in multiple projects/agents simultaneously
      const archiveResult = await AssignLeads.updateMany(
        { 
          lead_id: leadId, 
          status: AssignLeadsService.STATUSES.ACTIVE 
        },
        { 
          $set: { 
            status: AssignLeadsService.STATUSES.ARCHIVED,
            archived_at: new Date(),
            archived_reason: `Lead transferred to project ${targetTeam.name} (${toProjectId})`,
            archived_by: transferredBy
          } 
        }
      );

      logger.info('Archived existing assignments for lead transfer', {
        leadId,
        archivedCount: archiveResult.modifiedCount,
        toProject: targetTeam.name,
        toAgent: targetAgent.login
      });

      // Create or update assignment in target project (upsert approach)
      const savedAssignment = await AssignLeads.findOneAndUpdate(
        { lead_id: leadId, project_id: toProjectId },
        {
          $set: {
            agent_id: toAgentUserId,
            assigned_by: transferredBy,
            notes: notes || `Assigned to ${targetTeam.name} - ${targetAgent.login}`,
            status: AssignLeadsService.STATUSES.ACTIVE,
            assigned_at: new Date()
          }
        },
        { new: true, upsert: true }
      );

      // Handle fresh transfer - reset stage and status if requested
      let newStageId = lead.stage_id?._id;
      let newStatusId = lead.status_id?._id;
      let newStage = null;
      
      if (isFreshTransfer) {
        // For fresh transfers, get the "New" stage and status from Settings collection
        newStage = await Settings.findOne({ 
          type: 'stage', 
          name: 'New' 
        });
        
        if (newStage && newStage.info && newStage.info.statuses && newStage.info.statuses.length > 0) {
          newStageId = newStage._id;
          // Find the "New" status or use the first one
          const newStatus = newStage.info.statuses.find(status => status.name === 'New') || newStage.info.statuses[0];
          newStatusId = newStatus._id;
        } else {
          console.warn('Fresh transfer: Could not find "New" stage in Settings collection');
          // Fallback to null if not found
          newStageId = null;
          newStatusId = null;
        }
      }

      // Update lead status and assignment data
      const leadUpdateData = {
        use_status: 'in_use',
        assigned_date: new Date(),
        team_id: toProjectId,
        user_id: toAgentUserId,
      };

      const previousTeamId = this._normalizeObjectId(lead.team_id);
      const previousUserId = this._normalizeObjectId(lead.user_id);
      leadUpdateData.prev_team_id = previousTeamId;
      leadUpdateData.prev_user_id = previousUserId;
      
      if (isFreshTransfer && newStageId && newStatusId) {
        leadUpdateData.stage_id = newStageId;
        leadUpdateData.status_id = newStatusId;
        const newStatusName = newStage?.info?.statuses?.find(s => s._id.toString() === newStatusId?.toString())?.name || 'New';
        leadUpdateData.stage = newStage?.name || 'New';
        leadUpdateData.status = newStatusName;
      }

      if (isRestore && isFreshTransfer) {
        leadUpdateData.active = true;
      }

      if (isRestore && !isFreshTransfer) {
        leadUpdateData.active = true;

        if (lead.prev_stage_id && lead.prev_status_id) {
          leadUpdateData.stage_id = lead.prev_stage_id;
          leadUpdateData.status_id = lead.prev_status_id;
          leadUpdateData.stage = lead.prev_stage || '';
          leadUpdateData.status = lead.prev_status || '';
        }

        await Offer.updateMany(
          { lead_id: leadId, out: true },
          { $set: { out: false, updatedAt: new Date() } }
        );
      }
      
      await Lead.findByIdAndUpdate(leadId, { $set: leadUpdateData });
      
      // Update transfer record with new state
      transferRecord.new_state = {
        stage_id: leadUpdateData.stage_id || newStageId,
        status_id: leadUpdateData.status_id || newStatusId,
        stage_name: leadUpdateData.stage || (isFreshTransfer ? (newStage?.name || null) : lead.stage_id?.name),
        status_name: leadUpdateData.status || (isFreshTransfer ? (newStage?.info?.statuses?.find(s => s._id.toString() === newStatusId?.toString())?.name || null) : lead.status_id?.name),
        use_status: 'in_use',
      };

      // Update email visibility for the transferred lead (only if not fresh transfer)
      if (!isFreshTransfer) {
        // Add the new agent to visible_to_agents for all emails related to this lead
        // Keep previous agents in the list to maintain email history access
        await this._updateEmailVisibilityForLeadTransfer(leadId, toAgentUserId);
      }

      // Sync email projects when lead is transferred to new project
      try {
        const emailSystemService = require('../../../services/emailSystemService');
        const emailSyncResult = await emailSystemService.updateEmailProjectsForLeadChange(
          leadId,
          toProjectId,
          transferredBy,
          `Lead transferred from project ${originalAssignment.project.name} to project ${targetProject.name}. Transfer reason: ${transferReason || 'Manual transfer'}`
        );

        logger.info('📧 Email projects synced for lead transfer', {
          leadId: leadId,
          leadName: lead.contact_name || lead.display_name,
          fromProject: originalAssignment.project.name,
          toProject: targetProject.name,
          emailsUpdated: emailSyncResult.emailsUpdated,
          emailsFound: emailSyncResult.emailsFound,
          processingTime: emailSyncResult.processingTime
        });
      } catch (emailSyncError) {
        logger.error('❌ Failed to sync email projects for lead transfer', {
          error: emailSyncError.message,
          leadId: leadId,
          leadName: lead.contact_name || lead.display_name,
          fromProjectId: originalAssignment.project._id,
          toProjectId: toProjectId,
          stack: emailSyncError.stack
        });
        // Don't throw - email sync failure shouldn't block lead transfers
      }

      // Transfer all related entities (offers, openings, confirmations, payment vouchers)
      const transferStats = await this._transferLeadRelatedEntities(
        leadId, 
        toProjectId, 
        toAgentUserId, 
        transferredBy,
        isFreshTransfer
      );
      
      // Update transfer record with statistics
      transferRecord.transfer_details = {
        transferred_entities: transferStats.transferred || {},
        reset_entities: transferStats.reset || {},
      };
      transferRecord.transfer_details.reset_entities.stage_status_reset = isFreshTransfer;

      // Complete transfer record
      const processingTime = Date.now() - transferStartTime;
      await transferRecord.markCompleted(processingTime);

      // Emit event for activity logging
      eventEmitter.emit(EVENT_TYPES.LEAD.TRANSFERRED, {
        lead: originalAssignment.lead,
        creator: originalAssignment.transferredBy,
        fromProject: originalAssignment.fromProject,
        fromAgent: originalAssignment.fromAgent,
        toProject: originalAssignment.toProject,
        toAgent: originalAssignment.toAgent,
        assignment: savedAssignment,
        transferRecord: transferRecord,
        isFreshTransfer: isFreshTransfer,
        transferStats: transferStats,
      });

      const result = {
        success: true,
        transferred: true,
        assignment: savedAssignment,
        message: existingTargetAssignment 
          ? `Successfully updated lead agent assignment in project "${originalAssignment.toProject?.name || toProjectId}"`
          : `Successfully transferred lead from project "${originalAssignment.fromProject?.name || fromProjectId}" to project "${originalAssignment.toProject?.name || toProjectId}"`,
        details: {
          leadId,
          fromProject: {
            id: currentAssignment?.project_id?._id,
            name: originalAssignment.fromProject?.name,
          },
          toProject: {
            id: toProjectId,
            name: originalAssignment.toProject?.name,
          },
          fromAgent: {
            id: originalAssignment.fromAgent?._id || originalAssignment.fromAgent,
            login: originalAssignment.fromAgent?.login,
          },
          toAgent: {
            id: originalAssignment.toAgent?._id || originalAssignment.toAgent,
            login: originalAssignment.toAgent?.login,
          },
          transferRecord: transferRecord._id,
          isFreshTransfer: isFreshTransfer,
          transferStats: transferStats,
        },
      };

      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Bulk transfer multiple leads from one project/agent to another project/agent
   * This completely removes the leads from the current project and assigns them to the new project
   * @param {Array} leadIds - Array of lead IDs to transfer
   * @param {string} toProjectId - Target project ID
   * @param {string} toAgentUserId - Target agent user ID
   * @param {string} transferredBy - ID of user performing the transfer
   * @param {string} notes - Optional notes for the transfer
   * @param {boolean} isFreshTransfer - Whether to make this a fresh transfer (hide previous data)
   * @param {string} transferReason - Reason for the transfer
   * @returns {Promise<Object>} - Transfer result with statistics
   */
  async bulkReplaceLeadsToProject(leadIds, toProjectId, toAgentUserId, transferredBy, notes = '', isFreshTransfer = false, transferReason = '', isRestore = false) {
    try {
      // Basic validation - check if target project and agent exist
      const targetTeam = await Team.findById(toProjectId);
      if (!targetTeam) {
        throw new Error('Target project not found');
      }

      const targetAgent = await User.findById(toAgentUserId);
      if (!targetAgent) {
        throw new Error('Target agent not found');
      }

      const results = {
        successful: [],
        failed: [],
        totalProcessed: 0,
        successCount: 0,
        failureCount: 0,
        sourceProjects: new Map(), // Track source projects and their counts
        transferredFrom: null, // Will be set to most common source project
      };

      // Pre-fetch "New" stage for fresh transfers to avoid repeated queries
      let newStageForFreshTransfer = null;
      if (isFreshTransfer) {
        newStageForFreshTransfer = await Settings.findOne({ 
          type: 'stage', 
          name: 'New' 
        });
        
        if (!newStageForFreshTransfer || !newStageForFreshTransfer.info || !newStageForFreshTransfer.info.statuses || newStageForFreshTransfer.info.statuses.length === 0) {
          console.warn('Fresh transfer: Could not find "New" stage in Settings collection for bulk transfer');
        }
      }

      // Process each lead individually to handle errors gracefully
      for (const leadId of leadIds) {
        try {
          // Check if lead exists and get current state
          const lead = await Lead.findById(leadId).populate('stage_id').populate('status_id');
          if (!lead) {
            results.failed.push({
              leadId,
              error: 'Lead not found',
            });
            continue;
          }

          // No restrictions - allow free assignment to any project/agent
          // Find any existing assignment for this lead (if any)
          const currentAssignment = await AssignLeads.findOne({
            lead_id: leadId,
            status: AssignLeadsService.STATUSES.ACTIVE,
          }).populate('lead_id', 'name contact_name').populate('agent_id', 'login').populate('project_id', 'name color_code');

          // Store original assignment data for activity logging
          const originalAssignment = {
            lead: currentAssignment?.lead_id || lead,
            fromProject: currentAssignment?.project_id,
            fromAgent: currentAssignment?.agent_id,
            toProject: targetTeam,
            toAgent: targetAgent,
            transferredBy: await User.findById(transferredBy).lean(),
          };

          // Create transfer record
          const transferRecord = new LeadTransfer({
            lead_id: leadId,
            from_project_id: currentAssignment?.project_id?._id,
            from_agent_id: currentAssignment?.agent_id?._id,
            to_project_id: toProjectId,
            to_agent_id: toAgentUserId,
            transferred_by: transferredBy,
            transfer_reason: transferReason,
            transfer_notes: notes,
            is_fresh_transfer: isFreshTransfer,
            transfer_type: 'bulk',
            transfer_status: 'in_progress',
            previous_state: {
              stage_id: lead.stage_id?._id,
              status_id: lead.status_id?._id,
              stage_name: lead.stage_id?.name,
              status_name: lead.status_id?.name,
              use_status: lead.use_status,
              last_activity_date: lead.last_activity || lead.updatedAt,
            },
          });

          const transferStartTime = Date.now();

          // **FIX: Archive all existing active assignments for this lead BEFORE creating new one**
          // This prevents the lead from appearing in multiple projects/agents simultaneously
          await AssignLeads.updateMany(
            { 
              lead_id: leadId, 
              status: AssignLeadsService.STATUSES.ACTIVE 
            },
            { 
              $set: { 
                status: AssignLeadsService.STATUSES.ARCHIVED,
                archived_at: new Date(),
                archived_reason: `Lead bulk transferred to project ${targetTeam.name} (${toProjectId})`,
                archived_by: transferredBy
              } 
            }
          );

          // Create or update assignment in target project (upsert approach)
          const savedAssignment = await AssignLeads.findOneAndUpdate(
            { lead_id: leadId, project_id: toProjectId },
            {
              $set: {
                agent_id: toAgentUserId,
                assigned_by: transferredBy,
                notes: notes || `Assigned to ${targetTeam.name} - ${targetAgent.login}`,
                status: AssignLeadsService.STATUSES.ACTIVE,
                assigned_at: new Date()
              }
            },
            { new: true, upsert: true }
          );

          // Handle fresh transfer - reset stage and status if requested
          let newStageId = lead.stage_id?._id;
          let newStatusId = lead.status_id?._id;
          let newStage = null;
          
          if (isFreshTransfer) {
            // Use pre-fetched "New" stage for fresh transfers
            newStage = newStageForFreshTransfer;
            
            if (newStage && newStage.info && newStage.info.statuses && newStage.info.statuses.length > 0) {
              newStageId = newStage._id;
              // Find the "New" status or use the first one
              const newStatus = newStage.info.statuses.find(status => status.name === 'New') || newStage.info.statuses[0];
              newStatusId = newStatus._id;
            } else {
              // Fallback to null if not found
              newStageId = null;
              newStatusId = null;
            }
          }

          // Update lead status and assignment data
          const leadUpdateData = {
            use_status: 'in_use',
            assigned_date: new Date(),
            team_id: toProjectId,
            user_id: toAgentUserId,
          };

          const previousTeamId = this._normalizeObjectId(lead.team_id);
          const previousUserId = this._normalizeObjectId(lead.user_id);
          leadUpdateData.prev_team_id = previousTeamId;
          leadUpdateData.prev_user_id = previousUserId;
          
          if (isFreshTransfer && newStageId && newStatusId) {
            leadUpdateData.stage_id = newStageId;
            leadUpdateData.status_id = newStatusId;
            const newStatusName = newStage?.info?.statuses?.find(s => s._id.toString() === newStatusId?.toString())?.name || 'New';
            leadUpdateData.stage = newStage?.name || 'New';
            leadUpdateData.status = newStatusName;
          }

          if (isRestore && isFreshTransfer) {
            leadUpdateData.active = true;
          }

          if (isRestore && !isFreshTransfer) {
            leadUpdateData.active = true;

            if (lead.prev_stage_id && lead.prev_status_id) {
              leadUpdateData.stage_id = lead.prev_stage_id;
              leadUpdateData.status_id = lead.prev_status_id;
              leadUpdateData.stage = lead.prev_stage || '';
              leadUpdateData.status = lead.prev_status || '';
            }

            await Offer.updateMany(
              { lead_id: leadId, out: true },
              { $set: { out: false, updatedAt: new Date() } }
            );
          }
          
          await Lead.findByIdAndUpdate(leadId, { $set: leadUpdateData });
          
          // Update transfer record with new state
          transferRecord.new_state = {
            stage_id: leadUpdateData.stage_id || newStageId,
            status_id: leadUpdateData.status_id || newStatusId,
            stage_name: leadUpdateData.stage || (isFreshTransfer ? (newStage?.name || null) : lead.stage_id?.name),
            status_name: leadUpdateData.status || (isFreshTransfer ? (newStage?.info?.statuses?.find(s => s._id.toString() === newStatusId?.toString())?.name || null) : lead.status_id?.name),
            use_status: 'in_use',
          };

          // Update email visibility for the transferred lead (only if not fresh transfer)
          if (!isFreshTransfer) {
            // Add the new agent to visible_to_agents for all emails related to this lead
            // Keep previous agents in the list to maintain email history access
            await this._updateEmailVisibilityForLeadTransfer(leadId, toAgentUserId);
          }

          // Transfer all related entities (offers, openings, confirmations, payment vouchers)
          const transferStats = await this._transferLeadRelatedEntities(
            leadId, 
            toProjectId, 
            toAgentUserId, 
            transferredBy,
            isFreshTransfer
          );
          
          // Update transfer record with statistics
          transferRecord.transfer_details = {
            transferred_entities: transferStats.transferred || {},
            reset_entities: transferStats.reset || {},
          };
          transferRecord.transfer_details.reset_entities.stage_status_reset = isFreshTransfer;

          // Complete transfer record
          const processingTime = Date.now() - transferStartTime;
          await transferRecord.markCompleted(processingTime);

          // Note: Individual LEAD.TRANSFERRED events are NOT emitted during bulk operations
          // to avoid spam notifications. Only the LEAD.BULK_TRANSFERRED event is emitted at the end.

          // Track source project for notification
          if (originalAssignment.fromProject) {
            const sourceProjectId = originalAssignment.fromProject._id.toString();
            const currentCount = results.sourceProjects.get(sourceProjectId) || 0;
            results.sourceProjects.set(sourceProjectId, currentCount + 1);
          }

          results.successful.push({
            leadId,
            assignment: savedAssignment,
            leadName: originalAssignment.lead?.contact_name || originalAssignment.lead?.name || `Lead #${leadId}`,
            transferRecord: transferRecord._id,
            isFreshTransfer: isFreshTransfer,
            transferStats: transferStats,
            fromProject: originalAssignment.fromProject, // Include source project info
            fromAgent: originalAssignment.fromAgent, // Include source agent info
          });

        } catch (error) {
          results.failed.push({
            leadId,
            error: error.message,
          });
        }
      }

      // Update counters
      results.totalProcessed = leadIds.length;
      results.successCount = results.successful.length;
      results.failureCount = results.failed.length;

      // Calculate aggregate transfer statistics for all successfully transferred leads
      const aggregateStats = {
        offers: { updated: 0, failed: 0 },
        openings: { updated: 0, failed: 0 },
        confirmations: { updated: 0, failed: 0 },
        paymentVouchers: { updated: 0, failed: 0 },
        documents: { updated: 0, failed: 0 }
      };

      results.successful.forEach(result => {
        if (result.transferStats) {
          Object.keys(aggregateStats).forEach(key => {
            aggregateStats[key].updated += result.transferStats[key]?.updated || 0;
            aggregateStats[key].failed += result.transferStats[key]?.failed || 0;
          });
        }
      });

      results.relatedEntitiesTransferred = aggregateStats;

      // Determine the most common source project and agent for notifications
      let mostCommonSourceProject = null;
      let mostCommonFromAgent = null;
      let maxCount = 0;
      
      // Track fromAgents as well
      const fromAgents = new Map();
      
      if (results.sourceProjects.size > 0) {
        for (const [projectId, count] of results.sourceProjects) {
          if (count > maxCount) {
            maxCount = count;
            // Find the project info from successful results
            const projectInfo = results.successful.find(r => 
              r.fromProject && r.fromProject._id.toString() === projectId
            )?.fromProject;
            mostCommonSourceProject = projectInfo;
          }
        }
      }

      // Find most common fromAgent
      results.successful.forEach(result => {
        if (result.fromAgent) {
          const fromAgentId = result.fromAgent._id.toString();
          const currentCount = fromAgents.get(fromAgentId) || 0;
          fromAgents.set(fromAgentId, currentCount + 1);
          
          if (currentCount + 1 > (fromAgents.get(mostCommonFromAgent?._id?.toString()) || 0)) {
            mostCommonFromAgent = result.fromAgent;
          }
        }
      });

      // Emit bulk transfer event for activity logging and notifications
      if (results.successCount > 0) {
        const eventData = {
          leadIds: results.successful.map(r => r.leadId),
          toProjectId,
          toAgentUserId,
          successCount: results.successCount,
          failureCount: results.failureCount,
          relatedEntitiesTransferred: aggregateStats,
          transferredBy, // Include transferredBy for notifications
          user: await User.findById(transferredBy).lean(),
          // Add source project and agent information for better notifications
          fromProject: mostCommonSourceProject, // Most common source project
          fromAgent: mostCommonFromAgent, // Most common source agent
          isFreshTransfer, // Include fresh transfer flag for notifications
          sourceProjectsMap: Object.fromEntries(
            Array.from(results.sourceProjects).map(([projectId, count]) => {
              const projectInfo = results.successful.find(r => 
                r.fromProject && r.fromProject._id.toString() === projectId
              )?.fromProject;
              return [projectId, { project: projectInfo, count }];
            })
          ),
          results: results, // Include full results for detailed analysis
        };
        
        logger.info('🔥 Bulk transfer event emitting for notifications and activity logging', {
          successCount: results.successCount,
          toProjectId,
          toAgentUserId,
          transferredBy,
          fromProject: mostCommonSourceProject?.name || 'Mixed Projects',
          fromAgent: mostCommonFromAgent?.login || 'Unknown Agent',
          sourceProjectCount: results.sourceProjects.size,
          eventType: EVENT_TYPES.LEAD.BULK_TRANSFERRED,
          listenerCount: eventEmitter.listenerCount(EVENT_TYPES.LEAD.BULK_TRANSFERRED)
        });
        
        eventEmitter.emit(EVENT_TYPES.LEAD.BULK_TRANSFERRED, eventData);
        
        logger.info('✅ Bulk transfer event emitted', {
          eventType: EVENT_TYPES.LEAD.BULK_TRANSFERRED
        });
      }

      // Build response message
      let message = `Bulk transfer completed. ${results.successCount} leads transferred, ${results.failureCount} failed.`;

      const result = {
        success: true,
        transferred: results.successCount > 0,
        message,
        results,
        details: {
          toProject: {
            id: toProjectId,
            name: targetTeam.name,
          },
          toAgent: {
            id: toAgentUserId,
            login: (await User.findById(toAgentUserId).lean())?.login,
          },
        },
      };

      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get leads assigned to a specific project
   */
  async getProjectLeads(projectId, options = {}) {
    try {
      const {
        status = AssignLeadsService.STATUSES.ACTIVE,
        page = AssignLeadsService.DEFAULT_PAGINATION.PAGE,
        limit = AssignLeadsService.DEFAULT_PAGINATION.LIMIT,
        agentId = null,
      } = options;

      const skip = (page - 1) * limit;
      const query = { project_id: projectId, status };

      // Filter by agent if specified
      if (agentId) {
        query.agent_id = agentId;
      }

      const [assignments, total] = await Promise.all([
        this._fetchAssignments(query, { skip, limit, sort: { assigned_at: -1 } }, 'detailed'),
        AssignLeads.countDocuments(query),
      ]);

      // Filter assignments to only include active leads (not closed/refreshed)
      const activeAssignments = await this._filterActiveAssignments(assignments);

      return {
        data: activeAssignments,
        meta: this._buildPaginationMeta(activeAssignments.length, page, limit),
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get projects a lead is assigned to
   */
  async getLeadProjects(leadId, options = {}) {
    try {
      const { status = AssignLeadsService.STATUSES.ACTIVE } = options;

      const assignments = await this._fetchAssignments(
        { lead_id: leadId, status },
        { sort: { assigned_at: -1 } }
      );

      return assignments;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update the status of a lead assignment
   */
  async updateAssignmentStatus(leadId, projectId, status) {
    try {
      const assignment = await AssignLeads.findOneAndUpdate(
        { lead_id: leadId, project_id: projectId },
        { $set: { status } },
        { new: true }
      )
        .populate('lead_id', 'contact_name name')
        .populate('project_id', 'name')
        .lean();

      if (!assignment) {
        throw new Error('Assignment not found');
      }

      // Create activity log
      try {
        const { createActivity } = require('./activityService/utils');
        const lead = assignment.lead_id;
        const project = assignment.project_id;
        const leadName = lead?.contact_name || lead?.name || `Lead #${leadId}`;
        const projectName = project?.name || `Project #${projectId}`;

        await createActivity({
          _creator: assignment.assigned_by || assignment.updated_by || assignment._id, // Use available user ID
          _subject_id: leadId,
          subject_type: 'Lead',
          action: 'status_change',
          message: `Assignment status changed to ${status} for ${leadName} in ${projectName}`,
          type: 'info',
          details: {
            action_type: 'assignment_status_updated',
            lead_id: leadId,
            lead_name: leadName,
            project_id: projectId,
            project_name: projectName,
            new_status: status,
          },
        });
      } catch (activityError) {
        logger.warn('Failed to log assignment status update activity (non-blocking)', {
          error: activityError.message,
          leadId,
          projectId,
        });
      }

      return assignment;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update the agent assigned to a lead in a project
   * @param {string} leadId - Lead ID
   * @param {string} projectId - Project ID
   * @param {string} agentId - Agent ID (fallback if selected_agent_id not provided)
   * @param {string} selected_agent_id - Selected agent ID (takes priority over agentId)
   */
  async updateAssignmentAgent(leadId, projectId, agentId, selected_agent_id = null) {
    try {
      // ✅ Determine final agent ID (prioritize selected_agent_id over agent_id)
      // Similar to offer creation logic: selected_agent_id > agent_id
      const finalAgentId = selected_agent_id || agentId;
      
      if (!finalAgentId) {
        throw new Error('Agent ID is required');
      }

      // Validate that the agent belongs to the project
      const team = await Team.findById(projectId);
      if (!team) {
        throw new Error('Project not found');
      }

      const agentInProject = this._isUserAgentInProject(team, finalAgentId);
      if (!agentInProject) {
        throw new Error('The specified agent does not belong to this project');
      }

      // Convert leadId and projectId to ObjectId for query
      const leadObjectId = mongoose.Types.ObjectId.isValid(leadId) 
        ? (typeof leadId === 'string' ? new mongoose.Types.ObjectId(leadId) : leadId)
        : leadId;
      const projectObjectId = mongoose.Types.ObjectId.isValid(projectId) 
        ? (typeof projectId === 'string' ? new mongoose.Types.ObjectId(projectId) : projectId)
        : projectId;

      // Get the original assignment to know the previous agent
      const originalAssignment = await AssignLeads.findOne({
        lead_id: leadObjectId,
        project_id: projectObjectId,
      }).lean();

      if (!originalAssignment) {
        throw new Error('Assignment not found');
      }

      // Convert finalAgentId to ObjectId if it's a string (for history check)
      const agentObjectIdForCheck = mongoose.Types.ObjectId.isValid(finalAgentId) 
        ? (typeof finalAgentId === 'string' ? new mongoose.Types.ObjectId(finalAgentId) : finalAgentId)
        : finalAgentId;

      // Check if the new agent has ever been assigned to this lead before
      // This prevents reassigning to an agent who was previously assigned this lead
      // NOTE: We check ALL assignments (active AND archived) to maintain permanent history
      const agentLeadHistory = await AssignLeads.find({
        lead_id: leadObjectId,
        agent_id: agentObjectIdForCheck,
        // No status filter - checks both active and archived assignments for permanent history
      })
        .populate('lead_id', 'name contact_name')
        .populate('project_id', 'name color_code')
        .lean();

      if (agentLeadHistory.length > 0) {
        const existingAssignment = agentLeadHistory[0];
        const leadName = existingAssignment.lead_id?.contact_name || existingAssignment.lead_id?.name || `Lead #${existingAssignment.lead_id?._id}`;
        
        throw new Error(`Lead ${leadName} has been previously assigned to this agent`);
      }

      // Use the same agentObjectId from the check above
      const agentObjectId = agentObjectIdForCheck;

      logger.info('Updating assignment agent', {
        leadId: leadObjectId.toString(),
        projectId: projectObjectId.toString(),
        previousAgentId: originalAssignment.agent_id?.toString(),
        newAgentId: agentObjectId.toString(),
        selected_agent_id: selected_agent_id?.toString(),
        agentId: agentId?.toString(),
        finalAgentId: finalAgentId.toString(),
        agentIdType: typeof finalAgentId
      });

      // Update the assignment with the new agent
      const assignment = await AssignLeads.findOneAndUpdate(
        { lead_id: leadObjectId, project_id: projectObjectId },
        { 
          $set: { 
            agent_id: agentObjectId,
            updatedAt: new Date()
          } 
        },
        { new: true, runValidators: true }
      ).lean();

      if (!assignment) {
        throw new Error('Failed to update assignment');
      }

      // Verify the update actually changed the agent_id
      const updatedAgentIdStr = assignment.agent_id?.toString();
      const previousAgentIdStr = originalAssignment.agent_id?.toString();
      const newAgentIdStr = agentObjectId.toString();
      
      if (updatedAgentIdStr === previousAgentIdStr && previousAgentIdStr !== newAgentIdStr) {
        logger.error('Assignment agent_id did not update', {
          leadId,
          projectId,
          previousAgentId: previousAgentIdStr,
          expectedNewAgentId: newAgentIdStr,
          actualAgentId: updatedAgentIdStr
        });
        throw new Error('Failed to update agent_id - value did not change');
      }

      logger.info('Assignment updated successfully', {
        leadId,
        projectId,
        previousAgentId: previousAgentIdStr,
        updatedAgentId: updatedAgentIdStr,
        assignmentId: assignment._id?.toString()
      });

      // ✅ Update lead's user_id to match AssignLeads.agent_id (use the actual value from assignment)
      // This ensures they're always in sync - CRITICAL: Must update lead.user_id to match assignment.agent_id
      const assignmentAgentId = assignment.agent_id;
      
      if (!assignmentAgentId) {
        logger.error('Assignment agent_id is missing', {
          leadId: leadObjectId.toString(),
          assignmentId: assignment._id?.toString(),
          assignment: JSON.stringify(assignment)
        });
        throw new Error('Assignment agent_id is missing - cannot update lead user_id');
      }

      logger.info('Attempting to update lead user_id to match AssignLeads agent_id', {
        leadId: leadObjectId.toString(),
        assignmentAgentId: assignmentAgentId.toString(),
        assignmentId: assignment._id?.toString()
      });

      // Direct update - ensure it always happens
      try {
        const leadUpdateResult = await Lead.findByIdAndUpdate(
          leadObjectId,
          { $set: { user_id: assignmentAgentId } },
          { new: true, runValidators: false } // Disable validators to ensure update happens
        ).lean();

        if (!leadUpdateResult) {
          logger.error('Lead not found when trying to update user_id', {
            leadId: leadObjectId.toString(),
            agentId: assignmentAgentId.toString()
          });
          throw new Error('Lead not found when trying to update user_id');
        }

        // Verify the update
        const updatedUserId = leadUpdateResult.user_id?.toString();
        const expectedAgentId = assignmentAgentId.toString();

        if (updatedUserId !== expectedAgentId) {
          logger.error('Lead user_id update verification failed', {
            leadId: leadObjectId.toString(),
            expectedAgentId,
            actualUserId: updatedUserId,
            assignmentAgentId: assignmentAgentId.toString()
          });
          
          // Try one more time with force update
          const retryResult = await Lead.updateOne(
            { _id: leadObjectId },
            { $set: { user_id: assignmentAgentId } }
          );
          
          logger.info('Retry update result', {
            leadId: leadObjectId.toString(),
            matchedCount: retryResult.matchedCount,
            modifiedCount: retryResult.modifiedCount,
            agentId: assignmentAgentId.toString()
          });

          if (retryResult.modifiedCount === 0) {
            throw new Error(`Failed to update lead user_id - retry also failed. Expected: ${expectedAgentId}, Got: ${updatedUserId}`);
          }
        }

        logger.info('Lead user_id successfully updated to match AssignLeads agent_id', {
          leadId: leadObjectId.toString(),
          leadUserId: updatedUserId || assignmentAgentId.toString(),
          assignLeadsAgentId: expectedAgentId,
          match: (updatedUserId || assignmentAgentId.toString()) === expectedAgentId
        });
      } catch (syncError) {
        logger.error('CRITICAL: Error updating lead user_id - this will cause data inconsistency', {
          error: syncError.message,
          stack: syncError.stack,
          leadId: leadObjectId.toString(),
          agentId: assignmentAgentId.toString(),
          assignmentAgentIdType: typeof assignmentAgentId,
          assignmentAgentIdValue: assignmentAgentId?.toString()
        });
        // Throw the error so the caller knows the sync failed
        // The assignment was already updated, but lead.user_id is out of sync
        throw new Error(`Failed to sync lead user_id with assignment agent_id: ${syncError.message}`);
      }

      // Get the lead, new agent, and project details for activity logging
      const lead = await Lead.findById(leadObjectId).lean();
      
      // Final verification that lead.user_id matches assignment.agent_id
      const finalLeadUserId = lead?.user_id?.toString();
      const finalAssignmentAgentId = assignment.agent_id?.toString();
      
      if (finalLeadUserId !== finalAssignmentAgentId) {
        logger.error('FINAL VERIFICATION FAILED: Lead user_id does not match AssignLeads agent_id', {
          leadId: leadObjectId.toString(),
          leadUserId: finalLeadUserId,
          assignLeadsAgentId: finalAssignmentAgentId,
          assignmentId: assignment._id?.toString()
        });
        
        // One final attempt to fix it
        await Lead.updateOne(
          { _id: leadObjectId },
          { $set: { user_id: assignment.agent_id } }
        );
        
        logger.warn('Attempted final fix for lead user_id mismatch', {
          leadId: leadObjectId.toString(),
          agentId: finalAssignmentAgentId
        });
      } else {
        logger.info('Final verification passed: Lead user_id matches AssignLeads agent_id', {
          leadId: leadObjectId.toString(),
          userId: finalLeadUserId
        });
      }
      
      const newAgent = await User.findById(agentObjectId).lean();
      const project = team;

      // Get the previous agent details
      const previousAgentId = originalAssignment.agent_id;
      const previousAgent = await User.findById(previousAgentId).lean();

      // Emit event for activity logging
      eventEmitter.emit(EVENT_TYPES.LEAD.ASSIGNED, {
        lead,
        creator: { _id: assignment.assigned_by }, // Use the original assigner as the creator
        agent: newAgent,
        project,
        previousAgent,
      });

      return assignment;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Remove a lead from a project (archive the assignment)
   * Also resets the lead's use_status to 'new' so it can be reassigned
   * @param {string} leadId - Lead ID
   * @param {string} projectId - Project ID
   * @returns {Promise<Object>} - Archived assignment
   */
  async removeLeadFromProject(leadId, projectId) {
    try {
      const assignment = await AssignLeads.findOneAndUpdate(
        { lead_id: leadId, project_id: projectId },
        { $set: { status: AssignLeadsService.STATUSES.ARCHIVED } },
        { new: true }
      ).lean();

      if (!assignment) {
        throw new Error('Assignment not found');
      }

      // Create activity log for removal
      try {
        const { createActivity } = require('./activityService/utils');
        const lead = await Lead.findById(leadId).lean();
        const project = await Team.findById(projectId).lean();
        const leadName = lead?.contact_name || lead?.name || `Lead #${leadId}`;
        const projectName = project?.name || `Project #${projectId}`;

        await createActivity({
          _creator: assignment.assigned_by || assignment._id, // Use available user ID
          _subject_id: leadId,
          subject_type: 'Lead',
          action: 'update',
          message: `Removed from ${projectName}`,
          type: 'info',
          details: {
            action_type: 'lead_removed_from_project',
            lead_id: leadId,
            lead_name: leadName,
            project_id: projectId,
            project_name: projectName,
          },
        });
      } catch (activityError) {
        logger.warn('Failed to log lead removal activity (non-blocking)', {
          error: activityError.message,
          leadId,
          projectId,
        });
      }

      // Check if this lead is assigned to any other active projects
      const otherActiveAssignments = await AssignLeads.countDocuments({
        lead_id: leadId,
        status: AssignLeadsService.STATUSES.ACTIVE,
        project_id: { $ne: projectId },
      });

      // If no other active assignments exist, reset the lead's use_status to 'new'
      if (otherActiveAssignments === 0) {
        await Lead.findByIdAndUpdate(leadId, {
          $set: {
            use_status: 'new',
            assigned_date: null,
          },
        });
      }

      // Emit event for activity logging
      eventEmitter.emit(EVENT_TYPES.LEAD.UNASSIGNED, {
        leadId,
        projectId,
        assignment,
      });

      return assignment;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get leads assigned to a specific agent
   */
  async getAgentLeads(agentId, options = {}) {
    try {
      const {
        status = AssignLeadsService.STATUSES.ACTIVE,
        page = AssignLeadsService.DEFAULT_PAGINATION.PAGE,
        limit = AssignLeadsService.DEFAULT_PAGINATION.LIMIT,
      } = options;

      const skip = (page - 1) * limit;
      const query = { agent_id: agentId, status };

      const [assignments, total] = await Promise.all([
        this._fetchAssignments(query, { skip, limit, sort: { assigned_at: -1 } }, 'detailed'),
        AssignLeads.countDocuments(query),
      ]);

      // Filter assignments to only include active leads (not closed/refreshed)
      const activeAssignments = await this._filterActiveAssignments(assignments);

      return {
        data: activeAssignments,
        meta: this._buildPaginationMeta(activeAssignments.length, page, limit),
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Common method to fetch assignments with configurable population
   * @param {Object} query - MongoDB query object
   * @param {Object} options - Query options (sort, limit, skip, etc.)
   * @param {string} populationType - Type of population ('basic' or 'detailed')
   * @returns {Promise<Array>} - Array of populated assignments
   */
  async _fetchAssignments(query, options = {}, populationType = 'basic') {
    const { sort = { assigned_at: -1 }, skip = 0, limit = null, lean = true } = options;

    const populationConfig =
      populationType === 'detailed'
        ? AssignLeadsService.POPULATION_CONFIG.DETAILED
        : AssignLeadsService.POPULATION_CONFIG.BASIC;

    let queryBuilder = AssignLeads.find(query)
      .populate(populationConfig.PROJECT)
      .populate(populationConfig.LEAD)
      .populate(populationConfig.AGENT);

    if (populationConfig.ASSIGNED_BY) {
      queryBuilder = queryBuilder.populate(populationConfig.ASSIGNED_BY);
    }

    if (sort) queryBuilder = queryBuilder.sort(sort);
    if (skip) queryBuilder = queryBuilder.skip(skip);
    if (limit) queryBuilder = queryBuilder.limit(limit);
    if (lean) queryBuilder = queryBuilder.lean();

    return await queryBuilder;
  }

  /**
   * Common method to build pagination metadata
   * @param {number} total - Total count of items
   * @param {number} page - Current page
   * @param {number} limit - Items per page
   * @returns {Object} - Pagination metadata
   */
  _buildPaginationMeta(total, page, limit) {
    return {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Utility method to mask lead data for agent view
   * @param {Object} lead - Lead object
   * @returns {Object} - Lead object with masked sensitive data
   */
  maskLeadDataForAgent(lead) {
    if (!lead) return lead;

    const maskedLead = { ...lead };

    // Mask email
    if (maskedLead.email_from) {
      maskedLead.email_from = maskEmail(maskedLead.email_from);
    }

    // Replace phone with VoIP extension or hide it
    if (maskedLead.voip_extension) {
      maskedLead.phone = maskedLead.voip_extension;
    } else {
      maskedLead.phone = undefined;
    }

    return maskedLead;
  }

  /**
   * Common method to fetch and organize offer statistics by project
   * @param {Array} projectIds - Array of project IDs
   * @returns {Promise<Object>} - Object with offer statistics by project
   */
  async _fetchOfferStatsByProject(projectIds) {
    if (!projectIds || projectIds.length === 0) {
      return {};
    }

    const { Offer, Opening, Confirmation, PaymentVoucher } = require('../models');
    const mongoose = require('mongoose');
    
    const offerStats = {};

    for (const projectId of projectIds) {
      if (!projectId) continue;
      
      // Use aggregation to get offers with their progression status
      const pipeline = [
        {
          $match: {
            project_id: new mongoose.Types.ObjectId(projectId)
          }
        },
        {
          $lookup: {
            from: 'openings',
            localField: '_id',
            foreignField: 'offer_id',
            as: 'openings',
            pipeline: [{ $match: { active: true } }]
          }
        },
        {
          $lookup: {
            from: 'confirmations',
            let: { 
              offerId: '$_id',
              openingIds: '$openings._id'
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$active', true] },
                      {
                        $or: [
                          { $eq: ['$offer_id', '$$offerId'] },
                          { $in: ['$opening_id', '$$openingIds'] }
                        ]
                      }
                    ]
                  }
                }
              }
            ],
            as: 'confirmations'
          }
        },
        {
          $lookup: {
            from: 'paymentvouchers',
            let: { 
              offerId: '$_id',
              confirmationIds: '$confirmations._id'
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$active', true] },
                      { $in: ['$confirmation_id', '$$confirmationIds'] }
                    ]
                  }
                }
              }
            ],
            as: 'payment_vouchers'
          }
        },
        {
          $addFields: {
            has_opening: { $gt: [{ $size: '$openings' }, 0] },
            has_confirmation: { $gt: [{ $size: '$confirmations' }, 0] },
            has_payment_voucher: { $gt: [{ $size: '$payment_vouchers' }, 0] },
            progression_status: {
              $cond: {
                if: { $gt: [{ $size: '$payment_vouchers' }, 0] },
                then: 'accepted', // Payment voucher exists = accepted
                else: {
                  $cond: {
                    if: { $gt: [{ $size: '$confirmations' }, 0] },
                    then: 'accepted', // Confirmation exists = accepted 
                    else: {
                      $cond: {
                        if: { $gt: [{ $size: '$openings' }, 0] },
                        then: 'accepted', // Opening exists = accepted
                        else: {
                          $cond: {
                            if: { $eq: ['$status', 'sent'] },
                            then: 'pending', // Sent but no progression = pending
                            else: 'pending' // Default to pending
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      ];

      const offers = await Offer.aggregate(pipeline);

      const stats = {
        total: offers.length,
        pending: 0,
        accepted: 0,
        rejected: 0, // We don't track explicit rejections, so this stays 0
        expired: 0,  // We don't track explicit expirations, so this stays 0  
        details: offers
      };

      // Count by progression status
      offers.forEach((offer) => {
        if (offer.progression_status === 'pending') {
          stats.pending++;
        } else if (offer.progression_status === 'accepted') {
          stats.accepted++;
        }
        // rejected and expired remain 0 as we don't explicitly track these states
      });

      offerStats[projectId.toString()] = stats;
    }

    return offerStats;
  }

  /**
   * Common method to get agent counts by project
   * @param {Array} projectIds - Array of project IDs
   * @returns {Promise<Object>} - Object with agent counts by project
   */
  async _getAgentCountsByProject(projectIds) {
    const agentCounts = {};

    const teams = await Team.find({ _id: { $in: projectIds } })
      .select('_id agents')
      .lean();

    teams.forEach((team) => {
      agentCounts[team._id.toString()] = team.agents ? team.agents.length : 0;
    });

    return agentCounts;
  }

  /**
   * Core method to process leads grouping by project
   * @param {Array} assignments - Array of assignment documents
   * @param {Object} options - Processing options
   * @returns {Promise<Array>} - Array of projects with grouped leads
   */
  async _processLeadsByProject(assignments, options = {}) {
    const { maskLeadData = false, includeOfferStats = true, includeAgentCounts = true } = options;

    // Filter out assignments with null populated references (can happen with auto-assigned leads)
    const validAssignments = assignments.filter(assignment => {
      const hasValidProject = assignment.project_id && assignment.project_id._id;
      const hasValidLead = assignment.lead_id;
      const hasValidAgent = assignment.agent_id && assignment.agent_id._id;
      
      if (!hasValidProject || !hasValidLead || !hasValidAgent) {
        console.warn('Skipping assignment with null populated references:', {
          assignmentId: assignment._id,
          hasValidProject,
          hasValidLead,
          hasValidAgent
        });
        return false;
      }
      
      return true;
    });

    // Extract unique project IDs from valid assignments
    const projectIds = [
      ...new Set(
        validAssignments.map((a) => a.project_id._id.toString())
      ),
    ];

    // Fetch offer statistics and agent counts in parallel if needed
    const [offerStats, agentCounts] = await Promise.all([
      includeOfferStats ? this._fetchOfferStatsByProject(projectIds) : Promise.resolve({}),
      includeAgentCounts ? this._getAgentCountsByProject(projectIds) : Promise.resolve({}),
    ]);

    // Group assignments by project
    const leadsByProject = validAssignments.reduce((acc, assignment) => {
      const projectName = assignment.project_id?.name || 'Unassigned';
      const projectId = assignment.project_id?._id || null;
      const projectIdStr = projectId ? projectId.toString() : 'null';

      if (!acc[projectIdStr]) {
        acc[projectIdStr] = {
          projectId,
          projectName,
          totalAgents: agentCounts[projectIdStr] || 0,
          leads: [],
          offers: offerStats[projectIdStr] || {
            total: 0,
            pending: 0,
            accepted: 0,
            rejected: 0,
            expired: 0,
            details: [],
          },
        };
      }

      // Process lead data based on role
      let leadData = assignment.lead_id;
      if (maskLeadData && leadData) {
        leadData = this.maskLeadDataForAgent(leadData);
      }

      acc[projectIdStr].leads.push({
        lead: leadData,
        assignment: {
          agent: assignment.agent_id,
          assignedAt: assignment.assigned_at,
          assignedBy: assignment.assigned_by,
          notes: assignment.notes,
        },
      });

      return acc;
    }, {});

    // Convert to array and add total leads count
    return Object.values(leadsByProject).map((project) => ({
      ...project,
      totalLeads: project.leads.length,
    }));
  }

  /**
   * Get all leads grouped by projects (Admin view)
   * @returns {Promise<Array>} - Array of projects with their leads
   */
  async getAllLeadsByProjects() {
    try {
      const assignments = await this._fetchAssignments(
        { status: AssignLeadsService.STATUSES.ACTIVE },
        { sort: { 'project_id.name': 1 } }
      );

      return await this._processLeadsByProject(assignments, {
        maskLeadData: false,
        includeOfferStats: true,
        includeAgentCounts: true,
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get agent-specific leads grouped by projects (Agent view)
   * @param {string} userId - User ID of the agent
   * @returns {Promise<Array>} - Array of projects with assigned leads (privacy-controlled)
   */
  async getAgentLeadsByProjects(userId) {
    try {
      // For agents, only show leads that are actively assigned (team_id and user_id not null)
      const assignments = await this._fetchAssignments(
        {
          agent_id: userId,
          status: AssignLeadsService.STATUSES.ACTIVE,
        },
        { sort: { 'project_id.name': 1 } }
      );

      // Filter assignments to only include leads with active assignment (not closed/refreshed)
      const activeAssignments = await this._filterActiveAssignments(assignments);

      return await this._processLeadsByProject(activeAssignments, {
        maskLeadData: true,
        includeOfferStats: true,
        includeAgentCounts: true,
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check if a user is an agent in a project
   * @param {Object} team - Team document
   * @param {String} userId - User ID
   * @returns {Boolean} - True if user is an agent in the project
   */
  _isUserAgentInProject(team, userId) {
    if (!team.agents || team.agents.length === 0) return false;

    return team.agents.some(
      (agent) =>
        (agent.user && agent.user._id && agent.user._id.toString() === userId) ||
        (agent.user && agent.user.toString() === userId) ||
        (agent.user_id && agent.user_id.toString() === userId)
    );
  }

  /**
   * Helper method to check if an agent belongs to a project
   * @param {Object} team - Team/Project document
   * @param {string} agentId - Agent ID to check
   * @returns {boolean} - True if agent belongs to the project
   */
  _isAgentInProject(team, agentId) {
    return (
      team.agents &&
      team.agents.some((agent) => {
        return agent._id.toString() === agentId.toString();
      })
    );
  }

  /**
   * Check if a user is an agent in a specific assignment
   * @param {Object} assignment - Assignment document
   * @param {string} userId - User ID to check
   * @returns {boolean} - True if user is the agent
   */
  _isUserAssignmentAgent(assignment, userId) {
    const agent = assignment.agent || assignment.agent_id;
    return (
      agent &&
      ((agent._id && agent._id.toString() === userId) ||
        (agent.user_id && agent.user_id.toString() === userId))
    );
  }

  /**
   * Filter assignments to only include leads with active assignment (not closed/refreshed)
   * @param {Array} assignments - Array of assignment documents
   * @returns {Promise<Array>} - Array of filtered assignments
   */
  async _filterActiveAssignments(assignments) {
    const { Lead } = require('../models');
    
    if (!assignments || assignments.length === 0) {
      return [];
    }

    // Filter out assignments with null lead_id first (can happen with auto-assigned leads)
    const validAssignments = assignments.filter(assignment => {
      const hasValidLead = assignment.lead_id && (assignment.lead_id._id || assignment.lead_id);
      if (!hasValidLead) {
        console.warn('Skipping assignment with null lead_id:', {
          assignmentId: assignment._id,
          lead_id: assignment.lead_id
        });
        return false;
      }
      return true;
    });

    if (validAssignments.length === 0) {
      return [];
    }

    const leadIds = validAssignments.map(assignment => assignment.lead_id._id || assignment.lead_id);
    
    // Get leads that are actively assigned (team_id and user_id not null)
    const activeLeads = await Lead.find({
      _id: { $in: leadIds },
      team_id: { $ne: null },
      user_id: { $ne: null },
      use_status: { $ne: 'reusable' } // Exclude reusable leads
    }).select('_id');

    const activeLeadIds = activeLeads.map(lead => lead._id.toString());

    // Filter assignments to only include active leads
    return validAssignments.filter(assignment => {
      const leadId = assignment.lead_id._id || assignment.lead_id;
      return activeLeadIds.includes(leadId.toString());
    });
  }

  /**
   * Enhanced assignment check function that considers refreshed leads
   * @param {Array} leadIds - Array of lead IDs to check
   * @param {string} agentId - Agent ID to check against
   * @param {string} projectId - Project ID for assignment
   * @returns {Promise<Array>} - Array of conflicting assignments
   */
  async _checkAssignmentConflicts(leadIds, agentId, projectId) {
    // No restrictions - allow all assignments
    return [];
  }

  /**
   * Check if a lead can be assigned to a specific agent
   * @param {string} leadId - Lead ID
   * @param {string} agentId - Agent ID
   * @param {string} projectId - Project ID
   * @param {string} useStatus - Current use status of the lead
   * @returns {Promise<Object>} - Object with allowed flag and reason
   */
  async _canAssignLead(leadId, agentId, projectId, useStatus) {
    try {
      // Rule 1: Check current assignment (should not be assigned to same agent)
      const currentAssignment = await AssignLeads.findOne({
        lead_id: leadId,
        agent_id: agentId,
        status: 'active'
      });

      if (currentAssignment) {
        return {
          allowed: false,
          reason: 'Lead is already assigned to this agent',
          conflict_type: 'current_assignment'
        };
      }

      // Rule 2: Project-based restriction (applies to ALL leads - regular and refreshed)
      const projectAssignment = await AssignLeads.findOne({
        lead_id: leadId,
        project_id: projectId,
        status: 'active'
      });

      if (projectAssignment) {
        return {
          allowed: false,
          reason: 'Lead is already assigned to this project',
          conflict_type: 'project_assignment'
        };
      }

      // Rule 3: Agent history check (permanent restriction for ALL leads)
      // An agent can NEVER be assigned the same lead twice, regardless of lead status
      const agentHistory = await AssignLeads.find({
        lead_id: leadId,
        agent_id: agentId
        // Check both active and archived assignments for permanent history
      });

      if (agentHistory.length > 0) {
        return {
          allowed: false,
          reason: 'Agent was previously assigned to this lead',
          conflict_type: 'agent_history'
        };
      }

      return {
        allowed: true,
        reason: 'Assignment allowed',
        conflict_type: null
      };
    } catch (error) {
      throw new Error(`Error checking assignment conflicts: ${error.message}`);
    }
  }

  /**
   * Update email visibility for lead transfer
   * Adds the new agent to visible_to_agents array for all emails related to the lead
   * Preserves previous agents in the list to maintain email history access
   */
  async _updateEmailVisibilityForLeadTransfer(leadId, newAgentId) {
    try {
      const { Email } = require('../models');
      
      // Update all emails related to this lead
      // For both incoming and outgoing emails, add the new agent to visible_to_agents
      // Don't remove previous agents to maintain email history access
      const updateResult = await Email.updateMany(
        { 
          lead_id: leadId,
          is_active: true,
          visible_to_agents: { $ne: newAgentId } // Only update if agent not already in the list
        },
        {
          $addToSet: { visible_to_agents: newAgentId } // Use $addToSet to avoid duplicates
        }
      );
      
      return updateResult;
    } catch (error) {
      console.error(`Error updating email visibility for lead transfer:`, error);
      // Don't throw error to avoid breaking the lead transfer process
      // Email visibility is supplementary functionality
    }
  }

  /**
   * Transfer all related entities (offers, openings, confirmations, payment vouchers, documents)
   * when a lead is transferred to a new project and agent
   * @param {string} leadId - Lead ID
   * @param {string} toProjectId - Target project ID
   * @param {string} toAgentUserId - Target agent user ID
   * @param {string} transferredBy - ID of user performing the transfer
   * @param {boolean} isFreshTransfer - Whether to hide previous data from new agent
   * @returns {Promise<Object>} - Transfer statistics
   */
  async _transferLeadRelatedEntities(leadId, toProjectId, toAgentUserId, transferredBy, isFreshTransfer = false) {
    const stats = {
      transferred: {
        offers_count: 0,
        openings_count: 0,
        confirmations_count: 0,
        payment_vouchers_count: 0,
        documents_count: 0,
        emails_count: 0
      },
      reset: {
        offers_hidden: 0,
        openings_hidden: 0,
        confirmations_hidden: 0,
        payment_vouchers_hidden: 0,
        documents_hidden: 0,
        emails_hidden: 0
      },
      errors: {
        offers: 0,
        openings: 0,
        confirmations: 0,
        payment_vouchers: 0,
        documents: 0,
        emails: 0
      }
    };

    try {
      if (isFreshTransfer) {
        // Fresh transfer: Hide previous data from new agent
        await this._hidePreviousDataFromAgent(leadId, toAgentUserId, transferredBy, stats);
      } else {
        // Regular transfer: Transfer all data to new agent
        await this._transferDataToAgent(leadId, toProjectId, toAgentUserId, transferredBy, stats);
      }

      console.log(`Successfully ${isFreshTransfer ? 'reset' : 'transferred'} related entities for lead ${leadId}:`, stats);
      return stats;

    } catch (error) {
      console.error(`Error transferring related entities for lead ${leadId}:`, error);
      // Return the stats we managed to collect, even if there was an error
      return stats;
    }
  }

  /**
   * Hide previous data from new agent in fresh transfers
   * @param {string} leadId - Lead ID
   * @param {string} toAgentUserId - Target agent user ID
   * @param {string} transferredBy - ID of user performing the transfer
   * @param {Object} stats - Statistics object to update
   */
  async _hidePreviousDataFromAgent(leadId, toAgentUserId, transferredBy, stats) {
    try {
      // Get all entities related to this lead
      const offers = await Offer.find({ lead_id: leadId }).select('_id').lean();
      const offerIds = offers.map(offer => offer._id);
      stats.reset.offers_hidden = offers.length;

      if (offers.length > 0) {
        await Offer.updateMany(
          { lead_id: leadId },
          {
            $set: {
              out: true,
              updatedAt: new Date()
            }
          }
        );
      }

      if (offerIds.length > 0) {
        // Get related openings
        const openings = await Opening.find({ offer_id: { $in: offerIds } }).select('_id').lean();
        const openingIds = openings.map(opening => opening._id);
        stats.reset.openings_hidden = openings.length;

        if (openingIds.length > 0) {
          // Get related confirmations
          const confirmations = await Confirmation.find({ opening_id: { $in: openingIds } }).select('_id').lean();
          const confirmationIds = confirmations.map(confirmation => confirmation._id);
          stats.reset.confirmations_hidden = confirmations.length;

          // Get related payment vouchers
          const paymentVoucherQueries = [];
          if (offerIds.length > 0) {
            paymentVoucherQueries.push({ offer_id: { $in: offerIds } });
          }
          if (confirmationIds.length > 0) {
            paymentVoucherQueries.push({ confirmation_id: { $in: confirmationIds } });
          }

          if (paymentVoucherQueries.length > 0) {
            const paymentVouchers = await PaymentVoucher.find({ $or: paymentVoucherQueries }).select('_id').lean();
            stats.reset.payment_vouchers_hidden = paymentVouchers.length;
          }
        }

        // For fresh transfers, we mark entities as "hidden" from the new agent
        // This can be implemented by adding a visibility field or similar mechanism
        // For now, we'll just log the counts as they should not be visible to the new agent
        
        // Hide documents by not granting access to the new agent
        const entityIds = [leadId, ...offerIds, ...(openingIds || []), ...(confirmationIds || [])];
        const documents = await Document.find({
          'assignments.entity_id': { $in: entityIds },
          'assignments.active': true,
          active: true
        }).select('_id').lean();
        stats.reset.documents_hidden = documents.length;

        // Hide emails by not adding the agent to visible_to_agents
        const { Email } = require('../models');
        const emails = await Email.find({
          lead_id: leadId,
          is_active: true
        }).select('_id').lean();
        stats.reset.emails_hidden = emails.length;
      }
    } catch (error) {
      console.error('Error hiding previous data from agent:', error);
      stats.errors.offers++;
      stats.errors.documents++;
      stats.errors.emails++;
    }
  }

  /**
   * Transfer data to new agent in regular transfers
   * @param {string} leadId - Lead ID
   * @param {string} toProjectId - Target project ID
   * @param {string} toAgentUserId - Target agent user ID
   * @param {string} transferredBy - ID of user performing the transfer
   * @param {Object} stats - Statistics object to update
   */
  async _transferDataToAgent(leadId, toProjectId, toAgentUserId, transferredBy, stats) {
    try {
      // 1. Transfer offers associated with this lead
      // After transfer: created_by remains same, active=true, project_id and agent_id updated
      const offerUpdateResult = await Offer.updateMany(
        { lead_id: leadId },
        {
          $set: {
            project_id: toProjectId,
            agent_id: toAgentUserId,
            active: true,  // Set active to true after transfer
            updatedAt: new Date()
            // Note: created_by is NOT updated - it remains the same
          }
        }
      );
      stats.transferred.offers_count = offerUpdateResult.modifiedCount;

      // Get all offer IDs for this lead to update related entities
      const offers = await Offer.find({ lead_id: leadId }).select('_id').lean();
      const offerIds = offers.map(offer => offer._id);

      if (offerIds.length > 0) {
        // 2. Transfer openings associated with these offers
        const openingUpdateResult = await Opening.updateMany(
          { offer_id: { $in: offerIds } },
          {
            $set: {
              updatedAt: new Date()
            }
          }
        );
        stats.transferred.openings_count = openingUpdateResult.modifiedCount;

        // Get all opening IDs to update confirmations
        const openings = await Opening.find({ offer_id: { $in: offerIds } }).select('_id').lean();
        const openingIds = openings.map(opening => opening._id);

        if (openingIds.length > 0) {
          // 3. Transfer confirmations associated with these openings
          const confirmationUpdateResult = await Confirmation.updateMany(
            { opening_id: { $in: openingIds } },
            {
              $set: {
                updatedAt: new Date()
              }
            }
          );
          stats.transferred.confirmations_count = confirmationUpdateResult.modifiedCount;

          // Get all confirmation IDs to update payment vouchers
          const confirmations = await Confirmation.find({ opening_id: { $in: openingIds } }).select('_id').lean();
          const confirmationIds = confirmations.map(confirmation => confirmation._id);

          // 4. Transfer payment vouchers (both direct offer-linked and confirmation-linked)
          const paymentVoucherQueries = [];
          
          // Payment vouchers linked directly to offers
          if (offerIds.length > 0) {
            paymentVoucherQueries.push({
              offer_id: { $in: offerIds }
            });
          }
          
          // Payment vouchers linked through confirmations
          if (confirmationIds.length > 0) {
            paymentVoucherQueries.push({
              confirmation_id: { $in: confirmationIds }
            });
          }

          if (paymentVoucherQueries.length > 0) {
            const paymentVoucherUpdateResult = await PaymentVoucher.updateMany(
              { $or: paymentVoucherQueries },
              {
                $set: {
                  updatedAt: new Date()
                }
              }
            );
            stats.transferred.payment_vouchers_count = paymentVoucherUpdateResult.modifiedCount;
          }
        }

        // 5. Update document assignments to include the new agent
        const entityIds = [
          leadId, // Lead itself
          ...offerIds, // All offers
          ...openingIds, // All openings
          ...(confirmationIds || []) // All confirmations
        ];

        if (entityIds.length > 0) {
          // Add new assignment entries for documents to ensure proper tracking
          const documentsWithAssignments = await Document.find({
            'assignments.entity_id': { $in: entityIds },
            'assignments.active': true,
            active: true
          }).lean();

          let documentsUpdated = 0;
          for (const doc of documentsWithAssignments) {
            try {
              // Check if the new agent already has access to this document
              const hasAccess = doc.assignments.some(assignment => 
                assignment.assigned_by && assignment.assigned_by.toString() === toAgentUserId
              );

              if (!hasAccess) {
                // Add assignment history entry for the transfer
                await Document.findByIdAndUpdate(doc._id, {
                  $push: {
                    assignment_history: {
                      action: 'reassigned',
                      entity_type: 'lead',
                      entity_id: leadId,
                      performed_at: new Date(),
                      performed_by: transferredBy,
                      notes: `Document access transferred due to lead transfer`
                    }
                  }
                });
                documentsUpdated++;
              }
            } catch (docError) {
              console.error(`Error updating document ${doc._id} for transfer:`, docError);
              stats.errors.documents++;
            }
          }
          stats.transferred.documents_count = documentsUpdated;
        }

        // 6. Update email visibility
        try {
          const { Email } = require('../models');
          const emailUpdateResult = await Email.updateMany(
            { 
              lead_id: leadId,
              is_active: true,
              visible_to_agents: { $ne: toAgentUserId }
            },
            {
              $addToSet: { visible_to_agents: toAgentUserId }
            }
          );
          stats.transferred.emails_count = emailUpdateResult.modifiedCount;
        } catch (emailError) {
          console.error(`Error updating email visibility for transfer:`, emailError);
          stats.errors.emails++;
        }
      }
    } catch (error) {
      console.error('Error transferring data to agent:', error);
      stats.errors.offers++;
      stats.errors.openings++;
      stats.errors.confirmations++;
      stats.errors.payment_vouchers++;
      stats.errors.documents++;
      stats.errors.emails++;
    }
  }
}

module.exports = new AssignLeadsService();
