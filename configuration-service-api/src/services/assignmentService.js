/**
 * Assignment Service
 * Business logic for lead assignment management
 */

const { Assignment, Project } = require('../models');
const logger = require('../utils/logger');
const { NotFoundError, ValidationError } = require('../utils/errorHandler');
const { eventEmitter, EVENT_TYPES } = require('../utils/events');
const axios = require('axios');

const LEAD_SERVICE_URL = process.env.LEAD_SERVICE_URL || 'http://localhost:4003';

/**
 * Assign leads to a project and agent
 */
async function assignLeadsToProject(leadIds, projectId, agentId, assignedBy, notes = '', authToken) {
  // Validate inputs
  if (!Array.isArray(leadIds) || leadIds.length === 0) {
    throw new ValidationError('Lead IDs array is required and cannot be empty');
  }

  if (!agentId) {
    throw new ValidationError('Agent ID is required');
  }

  // Check if project exists
  const project = await Project.findById(projectId);
  if (!project) {
    throw new NotFoundError('Project not found');
  }

  // Check if agent belongs to project
  if (!project.hasAgent(agentId)) {
    throw new ValidationError('Agent does not belong to this project');
  }

  const results = {
    successful: [],
    failed: [],
    successCount: 0,
    failureCount: 0,
  };

  // Process each lead
  for (const leadId of leadIds) {
    try {
      // Check for existing assignment to same project
      const existing = await Assignment.findOne({
        lead_id: leadId,
        project_id: projectId,
      });

      if (existing) {
        // Update existing assignment
        existing.agent_id = agentId;
        existing.assigned_by = assignedBy;
        existing.notes = notes;
        existing.status = 'active';
        existing.assigned_at = new Date();
        await existing.save();
        results.successful.push(existing);
      } else {
        // Create new assignment
        const assignment = new Assignment({
          lead_id: leadId,
          project_id: projectId,
          agent_id: agentId,
          assigned_by: assignedBy,
          notes,
          status: 'active',
        });
        await assignment.save();
        results.successful.push(assignment);
      }

      // Update lead in Lead Service
      try {
        await axios.put(
          `${LEAD_SERVICE_URL}/api/leads/${leadId}`,
          {
            team_id: projectId,
            user_id: agentId,
            use_status: 'in_use',
            assigned_date: new Date(),
          },
          {
            headers: { Authorization: `Bearer ${authToken}` },
            timeout: 5000,
          }
        );
      } catch (leadUpdateError) {
        logger.warn('Failed to update lead in Lead Service', {
          leadId,
          error: leadUpdateError.message,
        });
        // Don't fail the assignment if lead update fails
      }
    } catch (error) {
      results.failed.push({ leadId, error: error.message });
      logger.error('Failed to assign lead', { leadId, error: error.message });
    }
  }

  results.successCount = results.successful.length;
  results.failureCount = results.failed.length;

  logger.info('Leads assigned to project', {
    projectId,
    agentId,
    successCount: results.successCount,
    failureCount: results.failureCount,
  });

  return {
    success: true,
    message: `Successfully assigned ${results.successCount} leads. ${results.failureCount} failed.`,
    results,
  };
}

/**
 * Get assignments for a project
 */
async function getProjectAssignments(projectId, { page = 1, limit = 50, status = 'active', agentId = null }) {
  const skip = (page - 1) * limit;
  
  const query = { project_id: projectId, status };
  
  if (agentId) {
    query.agent_id = agentId;
  }
  
  const total = await Assignment.countDocuments(query);
  
  const assignments = await Assignment.find(query)
    // Don't populate lead_id - Lead Service owns leads
    // Don't populate agent_id, assigned_by - Auth Service owns users
    .sort({ assigned_at: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .lean();
  
  return {
    data: assignments,
    meta: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get assignments for an agent
 */
async function getAgentAssignments(agentId, { page = 1, limit = 50, status = 'active' }) {
  const skip = (page - 1) * limit;
  
  const query = { agent_id: agentId, status };
  
  const total = await Assignment.countDocuments(query);
  
  const assignments = await Assignment.find(query)
    // Don't populate lead_id - Lead Service owns leads
    .populate('project_id', 'name')
    // Don't populate assigned_by - Auth Service owns users
    .sort({ assigned_at: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .lean();
  
  return {
    data: assignments,
    meta: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get assignments for a lead
 */
async function getLeadAssignments(leadId, { status = null }) {
  const query = { lead_id: leadId };
  
  if (status) {
    query.status = status;
  }
  
  const assignments = await Assignment.find(query)
    .populate('project_id', 'name')
    // Don't populate agent_id, assigned_by - Auth Service owns users
    .sort({ assigned_at: -1 })
    .lean();
  
  return {
    data: assignments,
    meta: {
      total: assignments.length,
    },
  };
}

/**
 * Update assignment status
 */
async function updateAssignmentStatus(leadId, projectId, status) {
  const assignment = await Assignment.findOneAndUpdate(
    { lead_id: leadId, project_id: projectId },
    { $set: { status } },
    { new: true }
  ).lean();

  if (!assignment) {
    throw new NotFoundError('Assignment not found');
  }

  logger.info('Assignment status updated', { leadId, projectId, status });

  return assignment;
}

/**
 * Update assignment agent
 */
async function updateAssignmentAgent(leadId, projectId, newAgentId, authToken) {
  const assignment = await Assignment.findOne({ lead_id: leadId, project_id: projectId });

  if (!assignment) {
    throw new NotFoundError('Assignment not found');
  }

  // Check if new agent belongs to project
  const project = await Project.findById(projectId);
  if (!project || !project.hasAgent(newAgentId)) {
    throw new ValidationError('Agent does not belong to this project');
  }

  assignment.agent_id = newAgentId;
  assignment.assigned_at = new Date();
  await assignment.save();

  // Update lead in Lead Service
  try {
    await axios.put(
      `${LEAD_SERVICE_URL}/api/leads/${leadId}`,
      { user_id: newAgentId },
      {
        headers: { Authorization: `Bearer ${authToken}` },
        timeout: 5000,
      }
    );
  } catch (error) {
    logger.warn('Failed to update lead agent in Lead Service', {
      leadId,
      error: error.message,
    });
  }

  logger.info('Assignment agent updated', { leadId, projectId, newAgentId });

  return assignment;
}

/**
 * Remove assignment (archive)
 */
async function removeAssignment(leadId, projectId, authToken) {
  const assignment = await Assignment.findOne({ lead_id: leadId, project_id: projectId });

  if (!assignment) {
    throw new NotFoundError('Assignment not found');
  }

  assignment.status = 'archived';
  await assignment.save();

  // Check if lead has other active assignments
  const otherActiveAssignments = await Assignment.countDocuments({
    lead_id: leadId,
    status: 'active',
    project_id: { $ne: projectId },
  });

  // If no other assignments, reset lead status in Lead Service
  if (otherActiveAssignments === 0) {
    try {
      await axios.put(
        `${LEAD_SERVICE_URL}/api/leads/${leadId}`,
        {
          team_id: null,
          user_id: null,
          use_status: 'new',
          assigned_date: null,
        },
        {
          headers: { Authorization: `Bearer ${authToken}` },
          timeout: 5000,
        }
      );
    } catch (error) {
      logger.warn('Failed to reset lead in Lead Service', {
        leadId,
        error: error.message,
      });
    }
  }

  logger.info('Assignment removed', { leadId, projectId });

  return { message: 'Assignment removed successfully', assignment };
}

/**
 * Get all assignments grouped by project
 */
async function getAllAssignmentsByProject({ status = 'active' }) {
  const assignments = await Assignment.find({ status })
    // Don't populate lead_id - Lead Service owns leads
    .populate('project_id', 'name')
    // Don't populate agent_id - Auth Service owns users
    .sort({ assigned_at: -1 })
    .lean();

  // Group by project
  const grouped = {};
  
  assignments.forEach(assignment => {
    const projectId = assignment.project_id?._id?.toString();
    if (!projectId) return;
    
    if (!grouped[projectId]) {
      grouped[projectId] = {
        project: assignment.project_id,
        assignments: [],
        totalLeads: 0,
      };
    }
    
    grouped[projectId].assignments.push(assignment);
    grouped[projectId].totalLeads++;
  });

  return Object.values(grouped);
}

/**
 * Bulk replace multiple leads from one project/agent to another project/agent
 */
async function bulkReplaceLeadsToProject(leadIds, toProjectId, toAgentUserId, transferredBy, notes = '', isFreshTransfer = false, transferReason = '', authToken) {
  // Validate inputs
  if (!Array.isArray(leadIds) || leadIds.length === 0) {
    throw new ValidationError('Lead IDs array is required and cannot be empty');
  }

  if (!toProjectId) {
    throw new ValidationError('Target project ID is required');
  }

  if (!toAgentUserId) {
    throw new ValidationError('Target agent ID is required');
  }

  // Check if target project exists
  const targetProject = await Project.findById(toProjectId);
  if (!targetProject) {
    throw new NotFoundError('Target project not found');
  }

  // Check if target agent belongs to project
  if (!targetProject.hasAgent(toAgentUserId)) {
    throw new ValidationError('Target agent does not belong to this project');
  }

  const results = {
    successful: [],
    failed: [],
    totalProcessed: 0,
    successCount: 0,
    failureCount: 0,
  };

  // Process each lead
  for (const leadId of leadIds) {
    try {
      // Archive any existing active assignments for this lead to other projects
      await Assignment.updateMany(
        { 
          lead_id: leadId, 
          project_id: { $ne: toProjectId },
          status: 'active' 
        },
        { 
          $set: { 
            status: 'archived',
            updatedAt: new Date()
          } 
        }
      );

      // Create or update assignment in target project
      const assignment = await Assignment.findOneAndUpdate(
        { lead_id: leadId, project_id: toProjectId },
        {
          $set: {
            agent_id: toAgentUserId,
            assigned_by: transferredBy,
            notes: notes || `Bulk transferred to ${targetProject.name} - Agent ${toAgentUserId}`,
            status: 'active',
            assigned_at: new Date()
          }
        },
        { new: true, upsert: true }
      );

      // Update lead in Lead Service
      try {
        await axios.put(
          `${LEAD_SERVICE_URL}/api/leads/${leadId}`,
          {
            team_id: toProjectId,
            user_id: toAgentUserId,
            use_status: 'in_use',
            assigned_date: new Date(),
          },
          {
            headers: { Authorization: `Bearer ${authToken}` },
            timeout: 5000,
          }
        );
      } catch (leadUpdateError) {
        logger.warn('Failed to update lead in Lead Service', {
          leadId,
          error: leadUpdateError.message,
        });
        // Don't fail the assignment if lead update fails
      }

      results.successful.push(assignment);
    } catch (error) {
      results.failed.push({ leadId, error: error.message });
      logger.error('Failed to bulk replace lead', { leadId, error: error.message });
    }
  }

  results.totalProcessed = leadIds.length;
  results.successCount = results.successful.length;
  results.failureCount = results.failed.length;

  logger.info('Bulk replace leads completed', {
    toProjectId,
    toAgentUserId,
    successCount: results.successCount,
    failureCount: results.failureCount,
  });

  return {
    success: true,
    message: `Bulk replace completed. ${results.successCount} leads transferred, ${results.failureCount} failed.`,
    results,
    details: {
      toProject: {
        id: toProjectId,
        name: targetProject.name,
      },
      toAgent: {
        id: toAgentUserId,
      },
    },
  };
}

/**
 * Get assignments by agent name
 */
async function getAssignmentsByAgentName(agentName) {
  // First, find the user by name/login
  const { User } = require('../models');
  const user = await User.findOne({
    $or: [
      { login: agentName },
      { name: agentName }
    ],
    active: true
  }).select('_id login name').lean();

  if (!user) {
    return [];
  }

  // Get assignments for this user
  const assignments = await Assignment.find({
    agent_id: user._id,
    status: 'active'
  }).select('lead_id project_id agent_id assigned_at notes').lean();

  return assignments;
}

/**
 * Close project with selective lead refresh
 * Matches monolith projectClosureService.closeProjectWithSelectiveRefresh
 */
async function closeProject(projectId, leadsToRefresh = [], closedBy, options = {}) {
  const currentDate = new Date();
  
  // Validate project exists
  const project = await Project.findById(projectId);
  if (!project) {
    throw new NotFoundError('Project not found');
  }

  // Get all active assignments for this project
  const activeAssignments = await Assignment.find({
    project_id: projectId,
    status: 'active'
  });

  if (activeAssignments.length === 0) {
    throw new ValidationError('No active assignments found for this project');
  }

  const allLeadIds = activeAssignments.map(assignment => assignment.lead_id.toString());
  const leadsToRefreshStr = leadsToRefresh.map(id => id.toString());
  
  // Validate that all leads to refresh belong to this project
  const invalidLeads = leadsToRefreshStr.filter(leadId => !allLeadIds.includes(leadId));
  if (invalidLeads.length > 0) {
    throw new ValidationError(`The following leads are not assigned to this project: ${invalidLeads.join(', ')}`);
  }

  const results = {
    successful: [],
    failed: [],
    successCount: 0,
    failureCount: 0,
  };

  // 1. Process leads to refresh (make them reusable)
  if (leadsToRefreshStr.length > 0) {
    for (const leadId of leadsToRefreshStr) {
      try {
        // Update lead in Lead Offers Service to make it reusable
        await axios.put(
          `${LEAD_OFFERS_SERVICE_URL}/api/leads/${leadId}`,
          {
            // Move current assignment to history
            prev_team_id: projectId,
            prev_user_id: activeAssignments.find(a => a.lead_id.toString() === leadId)?.agent_id,
            
            // Clear current assignment (make unassigned)
            team_id: null,
            user_id: null,
            assigned_date: null,
            
            // Set as reusable with fresh status
            use_status: 'reusable',
            stage: 'new',
            status: 'new',
            
            // Project closure tracking
            project_closed_date: currentDate,
            closure_reason: options.closure_reason || 'project_closure_refresh',
            closed_by_user_id: closedBy
          },
          {
            timeout: 10000,
          }
        );

        // Archive the assignment
        await Assignment.updateOne(
          { lead_id: leadId, project_id: projectId, status: 'active' },
          {
            $set: {
              status: 'archived',
              archived_date: currentDate,
              archived_by: closedBy,
              archive_reason: 'project_closure_refresh'
            }
          }
        );

        results.successful.push({ leadId, action: 'refreshed' });
      } catch (error) {
        logger.error('Failed to refresh lead during project closure', {
          leadId,
          projectId,
          error: error.message,
        });
        results.failed.push({ leadId, error: error.message, action: 'refresh' });
      }
    }
  }

  // 2. Process remaining leads (close but don't refresh)
  const remainingLeadIds = allLeadIds.filter(leadId => !leadsToRefreshStr.includes(leadId));
  
  if (remainingLeadIds.length > 0) {
    for (const leadId of remainingLeadIds) {
      try {
        // Update lead in Lead Offers Service to mark closure but keep assignment
        await axios.put(
          `${LEAD_OFFERS_SERVICE_URL}/api/leads/${leadId}`,
          {
            // Project closure tracking (but keep agent assignment)
            project_closed_date: currentDate,
            closure_reason: options.closure_reason || 'project_closure',
            closed_by_user_id: closedBy
          },
          {
            timeout: 10000,
          }
        );

        // Keep assignment active for non-refreshed leads so agents can still see them
        results.successful.push({ leadId, action: 'closed' });
      } catch (error) {
        logger.error('Failed to close lead during project closure', {
          leadId,
          projectId,
          error: error.message,
        });
        results.failed.push({ leadId, error: error.message, action: 'close' });
      }
    }
  }

  // 3. Update project status
  await Project.updateOne(
    { _id: projectId },
    {
      $set: {
        status: 'closed',
        closed_date: currentDate,
        closed_by: closedBy
      }
    }
  );

  results.successCount = results.successful.length;
  results.failureCount = results.failed.length;

  const result = {
    success: true,
    message: `Project closed successfully. ${leadsToRefreshStr.length} leads refreshed, ${remainingLeadIds.length} leads closed.`,
    project_id: projectId,
    total_leads: allLeadIds.length,
    refreshed_leads: leadsToRefreshStr.length,
    closed_leads: remainingLeadIds.length,
    closure_date: currentDate,
    results
  };

  // Emit event for activity logging
  eventEmitter.emit(EVENT_TYPES.PROJECT.CLOSED, {
    project_id: projectId,
    admin_user_id: closedBy,
    total_leads: allLeadIds.length,
    refreshed_leads: leadsToRefreshStr.length,
    closed_leads: remainingLeadIds.length,
    closure_date: currentDate,
    closure_reason: options.closure_reason
  });

  logger.info('Project closed successfully', {
    projectId,
    closedBy,
    totalLeads: allLeadIds.length,
    refreshedLeads: leadsToRefreshStr.length,
    closedLeads: remainingLeadIds.length,
  });

  return result;
}

module.exports = {
  assignLeadsToProject,
  getProjectAssignments,
  getAgentAssignments,
  getLeadAssignments,
  updateAssignmentStatus,
  updateAssignmentAgent,
  removeAssignment,
  getAllAssignmentsByProject,
  bulkReplaceLeadsToProject,
  getAssignmentsByAgentName,
  closeProject,
};


