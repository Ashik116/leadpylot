const mongoose = require('mongoose');
const Lead = require('../models/Lead');
const AssignLeads = require('../models/AssignLeads');
const Team = require('../models/Team');
const Offer = require('../models/Offer');
const Document = require('../models/Document');
const { eventEmitter, EVENT_TYPES } = require('./events');
const { findStageAndStatusIdsByName, findStageAndStatusByStatusId } = require('../utils/leadServiceUtils');
const axios = require('axios');

/**
 * Project Closure Service
 * Handles project closure with selective lead refresh functionality
 */
class ProjectClosureService {
  /**
   * Check if MongoDB supports transactions
   * @returns {Promise<boolean>} - True if transactions are supported
   */
  async _supportsTransactions() {
    try {
      // Try to get server info to check replica set status
      const admin = mongoose.connection.db.admin();
      const result = await admin.serverStatus();
      
      // Check if this is a replica set or mongos
      return result.repl !== undefined || result.sharding !== undefined;
    } catch (error) {
      // If we can't determine, assume no transaction support
      return false;
    }
  }

  /**
   * Close a project with selective lead refresh
   * @param {string} projectId - Project ID to close
   * @param {Array} leadsToRefresh - Array of lead IDs to refresh (make reusable)
   * @param {string} adminUserId - Admin user ID who is closing the project
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} - Result of the closure operation
   */
  async closeProjectWithSelectiveRefresh(projectId, leadsToRefresh = [], adminUserId, options = {}) {
    // Check if transactions are supported (replica set or mongos)
    const useTransactions = await this._supportsTransactions();
    
    if (useTransactions) {
      return await this._closeProjectWithTransaction(projectId, leadsToRefresh, adminUserId, options);
    } else {
      return await this._closeProjectWithoutTransaction(projectId, leadsToRefresh, adminUserId, options);
    }
  }

  /**
   * Close project with transaction support
   */
  async _closeProjectWithTransaction(projectId, leadsToRefresh = [], adminUserId, options = {}) {
    const session = await mongoose.startSession();
    
    try {
      return await session.withTransaction(async () => {
        return await this._performProjectClosure(projectId, leadsToRefresh, adminUserId, options, session);
      });
    } catch (error) {
      throw new Error(`Project closure failed: ${error.message}`);
    } finally {
      await session.endSession();
    }
  }

  /**
   * Close project without transaction support
   */
  async _closeProjectWithoutTransaction(projectId, leadsToRefresh = [], adminUserId, options = {}) {
    try {
      return await this._performProjectClosure(projectId, leadsToRefresh, adminUserId, options, null);
    } catch (error) {
      throw new Error(`Project closure failed: ${error.message}`);
    }
  }

  /**
   * Perform the actual project closure operations
   * NEW BEHAVIOR: Only close and refresh the leads specified in leadsToRefresh
   * Other leads remain pending (not closed)
   */
  async _performProjectClosure(projectId, leadsToRefresh = [], adminUserId, options = {}, session = null) {
    const currentDate = new Date();
    
    // Validate project exists
    const project = await Team.findById(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    // Validate that leadsToRefresh is provided and not empty
    if (!leadsToRefresh || leadsToRefresh.length === 0) {
      throw new Error('No leads specified to close. Please provide lead IDs in leadsToRefresh array.');
    }

    const leadsToRefreshStr = leadsToRefresh.map(id => id.toString());

    // Get the actual lead documents to close
    const leadsToClose = await Lead.find({
      _id: { $in: leadsToRefresh }
    });

    if (leadsToClose.length === 0) {
      throw new Error('No valid leads found for the specified lead IDs');
    }

    const allLeadIds = leadsToClose.map(lead => lead._id.toString());

    // Get assignments for these leads (may or may not exist)
    const activeAssignments = await AssignLeads.find({
      project_id: projectId,
      status: 'active',
      lead_id: { $in: leadsToRefresh }
    });
    
    // === STEP 0: Save closed leads to configuration service ===
    try {
      await this._saveClosedLeadsToConfigService(
        projectId,
        leadsToClose,
        adminUserId,
        options.closure_reason,
        options.current_status || null
      );
      console.log('✅ Successfully saved closed leads to configuration service');
    } catch (preservationError) {
      console.error('❌ Error saving closed leads to configuration service:', preservationError.message);
      // Continue with closure even if this fails
    }

    // 1. Process leads to refresh (make them reusable)
    if (leadsToRefreshStr.length > 0) {
      // Get the current data for leads to refresh
      const leadsToRefreshData = leadsToClose;

      // Resolve target stage/status: use current_status if provided, otherwise fall back to "new"
      let targetStageId, targetStatusId, targetStageName, targetStatusName;

      if (options.current_status) {
        // Caller passed a specific status ID to set on the refreshed leads
        const resolved = await findStageAndStatusByStatusId(options.current_status);
        if (!resolved.stageId || !resolved.statusId) {
          throw new Error('Could not find stage and status for the provided current_status ID in system settings');
        }
        targetStageId = resolved.stageId;
        targetStatusId = resolved.statusId;
        targetStageName = resolved.stageName;
        targetStatusName = resolved.statusName;
      } else {
        // Default: reset leads to "new" stage and status
        const { stageId: newStageId, statusId: newStatusId } = await findStageAndStatusIdsByName('new', 'new');
        if (!newStageId || !newStatusId) {
          throw new Error('Could not find "new" stage and status in system settings');
        }
        targetStageId = newStageId;
        targetStatusId = newStatusId;
        targetStageName = 'new';
        targetStatusName = 'new';
      }

      // Update each lead individually to properly move current values to history
      // NOTE: Tickets (Todos with type="Ticket") and Termine (Appointments) are NOT deleted
      // They remain with the lead even after refresh for continuity
      for (const leadData of leadsToRefreshData) {
        const updateOptions = session ? { session } : {};
        
        await Lead.updateOne(
          { _id: leadData._id },
          {
            $set: {
              // Move current assignment to history
              prev_team_id: leadData.team_id,
              prev_user_id: leadData.user_id,
              
              // Clear current assignment (make unassigned)
              team_id: null,
              user_id: null,
              assigned_date: null,
              
              // Set as reusable with resolved status
              use_status: 'reusable',
              stage_id: targetStageId,
              status_id: targetStatusId,
              stage: targetStageName,
              status: targetStatusName,
              
              // Project closure tracking
              project_closed_date: currentDate,
              closure_reason: options.closure_reason || 'project_closure_refresh',
              closed_by_user_id: adminUserId,
              ...(options.notes && { closure_notes: options.notes })
              
              // IMPORTANT: We do NOT delete or deactivate:
              // - Tickets (Todos with type="Ticket") - they stay with the lead
              // - Termine (Appointments) - they stay with the lead
              // - Activities - preserved in history
              // Only the project assignment is cleared
            }
          },
          updateOptions
        );
      }
    }

    // 2. Archive assignments only for closed/refreshed leads (if they exist)
    // NOTE: Other leads in the project remain active (pending)
    const assignmentUpdateOptions = session ? { session } : {};
    
    if (activeAssignments.length > 0) {
      // Archive assignments for closed/refreshed leads
      await AssignLeads.updateMany(
        { 
          project_id: projectId, 
          status: 'active',
          lead_id: { $in: leadsToRefresh }
        },
        {
          $set: {
            status: 'archived',
            archived_date: currentDate,
            archived_by: adminUserId,
            archive_reason: 'lead_closed_and_refreshed'
          }
        },
        assignmentUpdateOptions
      );
    }

    // 3. Update project status to closed (even if only some leads are closed)
    const teamUpdateOptions = session ? { session } : {};
    
    await Team.updateOne(
      { _id: projectId },
      {
        $set: {
          status: 'closed',
          closed_date: currentDate,
          closed_by: adminUserId
        }
      },
      teamUpdateOptions
    );

    const result = {
      success: true,
      message: `Project closed successfully. ${leadsToRefreshStr.length} leads closed and made fresh. Other leads remain pending.`,
      project_id: projectId,
      closed_and_refreshed_leads: leadsToRefreshStr.length,
      closure_date: currentDate
    };

    // Emit event for activity logging
    eventEmitter.emit(EVENT_TYPES.PROJECT.CLOSED, {
      project_id: projectId,
      admin_user_id: adminUserId,
      closed_leads: leadsToRefreshStr.length,
      closure_date: currentDate,
      closure_reason: options.closure_reason
    });

    return result;
  }

  /**
   * Get leads that can be refreshed for a project
   * @param {string} projectId - Project ID
   * @returns {Promise<Array>} - Array of leads that can be refreshed
   */
  async getRefreshableLeads(projectId) {
    try {
      const activeAssignments = await AssignLeads.find({
        project_id: projectId,
        status: 'active'
      })
      .populate({
        path: 'lead_id',
        select: 'contact_name email_from phone use_status expected_revenue assigned_date'
      })
      .populate({
        path: 'agent_id',
        select: 'login'
      })
      .sort({ assigned_at: -1 });

      return activeAssignments.map(assignment => ({
        lead_id: assignment.lead_id._id,
        contact_name: assignment.lead_id.contact_name,
        email_from: assignment.lead_id.email_from,
        phone: assignment.lead_id.phone,
        use_status: assignment.lead_id.use_status,
        expected_revenue: assignment.lead_id.expected_revenue,
        assigned_date: assignment.lead_id.assigned_date,
        agent_login: assignment.agent_id?.login,
        assignment_date: assignment.assigned_at
      }));
    } catch (error) {
      throw new Error(`Failed to get refreshable leads: ${error.message}`);
    }
  }

  /**
   * Get reusable leads (leads that were refreshed and can be reassigned)
   * @param {Object} filters - Filters for querying reusable leads
   * @returns {Promise<Array>} - Array of reusable leads
   */
  async getReusableLeads(filters = {}) {
    try {
      const query = {
        use_status: 'reusable',
        project_closed_date: { $exists: true },
        ...filters
      };

      const leads = await Lead.find(query)
        .select('contact_name email_from phone expected_revenue project_closed_date closure_reason')
        .sort({ project_closed_date: -1 });

      return leads;
    } catch (error) {
      throw new Error(`Failed to get reusable leads: ${error.message}`);
    }
  }

  /**
   * Save closed leads to configuration service via API call
   * @param {string} projectId - Project ID
   * @param {Array} leads - Array of lead documents
   * @param {string} adminUserId - Admin user ID
   * @param {string} closureReason - Closure reason
   */
  async _saveClosedLeadsToConfigService(projectId, leads, adminUserId, closureReason, currentStatus = null) {
    try {
      const configServiceUrl = process.env.CONFIGURATION_SERVICE_URL || 'http://localhost:4006';
      
      // Prepare leads data with offers, activities, todos, assignments, termine, and document IDs
      const leadsData = await Promise.all(
        leads.map(async (lead) => {
          const Offer = require('../models/Offer');
          const { Activity } = require('../models/activity');
          const Todo = require('../models/Todo');
          const AssignLeads = require('../models/AssignLeads');
          const Appointment = require('../models/Appointment');
          const Document = require('../models/Document');
          
          // Get full offer data for this lead (with progression)
          const offers = await Offer.find({ lead_id: lead._id, active: true }).lean();
          const offerIds = offers.map(o => o._id);

          // Get activities for this lead
          const activities = await Activity.find({
            subject_id: lead._id,
            subject_type: 'Lead'
          }).lean();

          // Get todos for this lead
          const todos = await Todo.find({
            lead_id: lead._id,
            active: true
          }).lean();

          // Get assignments for this lead
          const assignments = await AssignLeads.find({
            lead_id: lead._id
          }).lean();

          // Get termine (appointments) for this lead
          const termine = await Appointment.find({
            lead_id: lead._id,
            active: true
          }).lean();

          // Get document IDs for this lead
          const documents = await Document.find({
            'assignments.entity_type': 'lead',
            'assignments.entity_id': lead._id,
            'assignments.active': true,
            active: true,
          }).select('_id').lean();
          const documentIds = documents.map(d => d._id);

          return {
            ...lead.toObject(),
            offer_ids: offerIds,
            document_ids: documentIds,
            offers: offers,              // Full offer data with progression
            activities: activities,      // Full activity data
            todos: todos,               // Full todo data with types
            assignments: assignments,    // Assignment history
            termine: termine,           // Appointments
          };
        })
      );

      // Get JWT token from environment or generate service token
      const token = process.env.SERVICE_JWT_TOKEN || this._getServiceToken();

      // Call configuration service API
      const axios = require('axios');
      console.log('🔵 [projectClosureService] Sending to config service, current_status:', currentStatus);
      const response = await axios.post(
        `${configServiceUrl}/closed-leads/external`,
        {
          projectId,
          leads: leadsData,
          adminUserId,
          closureReason,
          current_status: currentStatus,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          timeout: 30000, // 30 second timeout
        }
      );

      console.log('✅ Configuration service response:', response.data);
      console.log(`   📊 Stats: ${response.data.stats?.closed_leads_count || 0} leads, ${response.data.stats?.closed_offers_count || 0} offers, ${response.data.stats?.closed_activities_count || 0} activities, ${response.data.stats?.closed_todos_count || 0} todos, ${response.data.stats?.closed_assignments_count || 0} assignments, ${response.data.stats?.closed_termine_count || 0} termine`);
      return response.data;
    } catch (error) {
      console.error('❌ Error calling configuration service:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      throw error;
    }
  }

  /**
   * Get service token for inter-service communication
   */
  _getServiceToken() {
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      {
        service: 'lead-offers-service',
        role: 'Admin',
        _id: 'service-account',
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );
    return token;
  }
}

module.exports = new ProjectClosureService(); 