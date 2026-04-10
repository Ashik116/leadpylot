/**
 * Assignment Controller
 * HTTP request handlers for lead assignment management
 * RESPONSE FORMAT: Matches monolith exactly
 */

const assignmentService = require('../services/assignmentService');
const logger = require('../utils/logger');

/**
 * Assign leads to project
 * Matches monolith: Returns ARRAY of assignments directly (201 status)
 */
async function assignLeadsToProject(req, res, next) {
  try {
    const { leadIds, projectId, agentId, notes, leadPrice } = req.body;
    const assignedBy = req.user._id;
    const authToken = req.headers.authorization?.replace('Bearer ', '');

    const assignments = await assignmentService.assignLeadsToProject(
      leadIds,
      projectId,
      agentId,
      assignedBy,
      notes,
      authToken
    );

    // Monolith returns array of assignments directly (no wrapper)
    res.status(201).json(assignments);
  } catch (error) {
    next(error);
  }
}

/**
 * Get project assignments
 * Matches monolith: Returns { data: [...], meta: {...} }
 */
async function getProjectAssignments(req, res, next) {
  try {
    const { projectId } = req.params;
    const { page, limit, status, agentId } = req.query;

    const result = await assignmentService.getProjectAssignments(projectId, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      status,
      agentId,
    });

    // Monolith returns { data: [...], meta: {...} } directly
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Get agent assignments
 * Matches monolith: Returns { data: [...], meta: {...} }
 */
async function getAgentAssignments(req, res, next) {
  try {
    const { agentId } = req.params;
    const { page, limit, status } = req.query;

    const result = await assignmentService.getAgentAssignments(agentId, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 50,
      status,
    });

    // Monolith returns { data: [...], meta: {...} } directly
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Get lead assignments
 * Matches monolith: Returns ARRAY directly (no wrapper)
 */
async function getLeadAssignments(req, res, next) {
  try {
    const { leadId } = req.params;
    const { status } = req.query;

    const assignments = await assignmentService.getLeadAssignments(leadId, { status });

    // Monolith returns array directly (no wrapper)
    res.status(200).json(assignments);
  } catch (error) {
    next(error);
  }
}

/**
 * Update assignment status
 * Matches monolith: Returns assignment object directly
 */
async function updateAssignmentStatus(req, res, next) {
  try {
    const { leadId, projectId } = req.params;
    const { status } = req.body;

    const assignment = await assignmentService.updateAssignmentStatus(leadId, projectId, status);

    // Monolith returns assignment object directly (no wrapper)
    res.status(200).json(assignment);
  } catch (error) {
    next(error);
  }
}

/**
 * Update assignment agent
 * Matches monolith: Returns assignment object directly
 */
async function updateAssignmentAgent(req, res, next) {
  try {
    const { leadId, projectId } = req.params;
    const { agentId } = req.body;
    const authToken = req.headers.authorization?.replace('Bearer ', '');

    const assignment = await assignmentService.updateAssignmentAgent(
      leadId,
      projectId,
      agentId,
      authToken
    );

    // Monolith returns assignment object directly (no wrapper)
    res.status(200).json(assignment);
  } catch (error) {
    next(error);
  }
}

/**
 * Remove assignment
 * Matches monolith: Returns assignment object directly
 */
async function removeAssignment(req, res, next) {
  try {
    const { leadId, projectId } = req.params;
    const authToken = req.headers.authorization?.replace('Bearer ', '');

    const assignment = await assignmentService.removeAssignment(leadId, projectId, authToken);

    // Monolith returns assignment object directly
    res.status(200).json(assignment);
  } catch (error) {
    next(error);
  }
}

/**
 * Get all assignments grouped by project
 * Matches monolith: Returns ARRAY directly (no wrapper)
 */
async function getAllAssignmentsByProject(req, res, next) {
  try {
    const { page, limit, status } = req.query;

    const result = await assignmentService.getAllAssignmentsByProject({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 1000,
      status,
    });

    // Monolith returns array directly (no wrapper!)
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Bulk replace leads to project
 * Matches monolith: Returns { message, successCount, results: [...] }
 */
async function bulkReplaceLeadsToProject(req, res, next) {
  try {
    const { leadIds, toProjectId, toAgentUserId, notes, isFreshTransfer = false, transferReason = '' } = req.body;
    const transferredBy = req.user._id;
    const authToken = req.headers.authorization?.replace('Bearer ', '');

    const result = await assignmentService.bulkReplaceLeadsToProject(
      leadIds,
      toProjectId,
      toAgentUserId,
      transferredBy,
      notes,
      isFreshTransfer,
      transferReason,
      authToken
    );

    // Monolith returns { message, successCount, results: [...] }
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Get assignments by agent name
 * Matches monolith: Returns result as-is
 */
async function getAssignmentsByAgentName(req, res, next) {
  try {
    const { agentName } = req.params;

    const assignments = await assignmentService.getAssignmentsByAgentName(agentName);

    // Return assignments as-is
    res.status(200).json(assignments);
  } catch (error) {
    next(error);
  }
}

/**
 * Close project with selective lead refresh
 * Matches monolith: Returns closure result object
 * Supports both URL parameter and body parameter for projectId
 */
async function closeProject(req, res, next) {
  try {
    // Support both URL parameter and body parameter for projectId
    const projectId = req.params.projectId || req.body.projectId;
    const { leadsToRefresh, closureReason } = req.body;
    const closedBy = req.user._id;

    // Validate projectId is provided
    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    // Validate leadsToRefresh is an array
    if (!Array.isArray(leadsToRefresh)) {
      return res.status(400).json({ error: 'Leads to refresh must be an array' });
    }

    const result = await assignmentService.closeProject(
      projectId,
      leadsToRefresh,
      closedBy,
      { closure_reason: closureReason }
    );

    // Monolith returns closure result object directly
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
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
