/**
 * Assignment Handler
 * Handles fetching and processing lead assignments
 */

const AssignLeads = require('../../../models/AssignLeads');
const logger = require('../../../helpers/logger');

class AssignmentHandler {
  /**
   * Fetch active assignments for leads
   * @param {Array} leadIds - Array of lead IDs
   * @returns {Promise<Array>} - Array of active assignments
   */
  async fetchAssignments(leadIds) {
    try {
      const assignments = await AssignLeads.find({
        lead_id: { $in: leadIds },
        status: 'active',
      })
        .populate('project_id', 'name color_code')
        .populate('agent_id', '_id login role active create_date instance_status instance_userid anydesk')
        .sort({ assigned_at: -1 })
        .lean();

      logger.info('Fetched active assignments', {
        leadCount: leadIds.length,
        assignmentCount: assignments.length,
      });

      return assignments;
    } catch (error) {
      logger.error('Error fetching assignments:', error);
      return [];
    }
  }

  /**
   * Fetch assignment history for leads (including archived)
   * @param {Array} leadIds - Array of lead IDs
   * @returns {Promise<Array>} - Array of all assignments (active + archived)
   */
  async fetchAssignmentHistory(leadIds) {
    try {
      const assignmentHistory = await AssignLeads.find({
        lead_id: { $in: leadIds },
      })
        .populate('project_id', 'name color_code')
        .populate('agent_id', '_id login role active create_date instance_status instance_userid anydesk')
        .populate('assigned_by', '_id login role')
        .sort({ assigned_at: -1 })
        .lean();

      logger.info('Fetched assignment history', {
        leadCount: leadIds.length,
        historyCount: assignmentHistory.length,
      });

      return assignmentHistory;
    } catch (error) {
      logger.error('Error fetching assignment history:', error);
      return [];
    }
  }

  /**
   * Create assignment maps for efficient lookup
   * @param {Array} assignments - Array of active assignments
   * @param {Array} assignmentHistory - Array of all assignments (active + archived)
   * @returns {Object} - Maps of assignments by lead ID
   */
  createAssignmentMaps(assignments, assignmentHistory) {
    // Map for active assignments
    const assignmentsByLeadId = {};
    assignments.forEach((assignment) => {
      const leadId = assignment.lead_id.toString();
      if (!assignmentsByLeadId[leadId]) {
        assignmentsByLeadId[leadId] = [];
      }
      assignmentsByLeadId[leadId].push(assignment);
    });

    // Map for complete assignment history
    const assignmentHistoryByLeadId = {};
    assignmentHistory.forEach((assignment) => {
      const leadId = assignment.lead_id.toString();
      if (!assignmentHistoryByLeadId[leadId]) {
        assignmentHistoryByLeadId[leadId] = [];
      }
      assignmentHistoryByLeadId[leadId].push(assignment);
    });

    return {
      assignmentsByLeadId,
      assignmentHistoryByLeadId,
    };
  }

  /**
   * Enhance leads with assignment data
   * @param {Array} leads - Array of lead objects
   * @param {Array} assignments - Array of assignments
   * @returns {Array} - Leads enhanced with assignment data
   */
  enhanceLeadsWithAssignments(leads, assignments) {
    const assignmentMap = new Map();
    
    for (const assignment of assignments) {
      assignmentMap.set(assignment.lead_id.toString(), assignment);
    }

    return leads.map((lead) => {
      const leadIdStr = lead._id.toString();
      const assignment = assignmentMap.get(leadIdStr);

      return {
        ...lead,
        project: assignment?.project_id || null,
        agent: assignment?.agent_id || null,
        assigned_at: assignment?.assigned_at || null,
      };
    });
  }

  /**
   * Get primary assignment for a lead (most recent active assignment)
   * @param {string} leadId - Lead ID
   * @param {Array} assignments - Array of assignments for the lead
   * @returns {Object|null} - Primary assignment or null
   */
  getPrimaryAssignment(leadId, assignments) {
    const leadAssignments = assignments
      .filter((a) => a.lead_id.toString() === leadId.toString())
      .sort((a, b) => new Date(b.assigned_at) - new Date(a.assigned_at));

    return leadAssignments.length > 0 ? leadAssignments[0] : null;
  }

  /**
   * Format assignment history for API response
   * @param {Array} assignmentHistory - Array of assignment history records
   * @returns {Array} - Formatted assignment history
   */
  formatAssignmentHistory(assignmentHistory) {
    return assignmentHistory.map((assignment) => ({
      id: assignment._id,
      project: {
        id: assignment.project_id?._id,
        name: assignment.project_id?.name,
      },
      agent: {
        id: assignment.agent_id?._id,
        login: assignment.agent_id?.login,
        role: assignment.agent_id?.role,
      },
      assigned_by: {
        id: assignment.assigned_by?._id,
        login: assignment.assigned_by?.login,
        role: assignment.assigned_by?.role,
      },
      assigned_at: assignment.assigned_at,
      status: assignment.status,
      notes: assignment.notes,
    }));
  }

  /**
   * Filter assignments by project
   * @param {Array} assignments - Array of assignments
   * @param {string} projectFilter - Project ID or name to filter by
   * @returns {Array} - Filtered assignments
   */
  filterAssignmentsByProject(assignments, projectFilter) {
    if (!projectFilter) return assignments;

    const mongoose = require('mongoose');
    const isObjectId = mongoose.Types.ObjectId.isValid(projectFilter);

    return assignments.filter((assignment) => {
      if (isObjectId) {
        // Filter by project ID (exact match)
        return (
          assignment.project_id &&
          assignment.project_id._id &&
          assignment.project_id._id.toString() === projectFilter.toString()
        );
      } else {
        // Filter by project name (case-insensitive exact match)
        const exactProjectRegex = new RegExp(`^${this._escapeRegex(projectFilter.trim())}$`, 'i');
        return (
          assignment.project_id &&
          assignment.project_id.name &&
          exactProjectRegex.test(assignment.project_id.name)
        );
      }
    });
  }

  /**
   * Escape special regex characters
   * @private
   */
  _escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

module.exports = AssignmentHandler;