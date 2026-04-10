const closedLeadsService = require('../services/closedLeadsService');
// const { hasPermission } = require('../middleware/roles/rolePermissions');
const { hasPermission } = require('../middleware/authorize');
const { PERMISSIONS } = require('../middleware/roles/permissions');
const logger = require('../utils/logger');

/**
 * ClosedLeadsController
 * Handles HTTP requests for closed leads operations
 */
class ClosedLeadsController {
  /**
   * Get all closed projects with lead counts
   * GET /closed-leads/projects
   * @query {number} [page=1] - Page number for pagination
   * @query {number} [limit=50] - Number of projects per page
   */
  async getClosedProjects(req, res) {
    try {
      const { user } = req;
      const { page, limit } = req.query;

      // Check permission - admins can see all, agents can see their assigned closed leads
      const canViewAll = await hasPermission(user.role, PERMISSIONS.LEAD_READ_ALL);
      const canViewAssigned = await hasPermission(user.role, PERMISSIONS.LEAD_READ_ASSIGNED);

      if (!canViewAll && !canViewAssigned) {
        return res.status(403).json({
          error: 'Access denied. You do not have permission to view closed projects.',
        });
      }

      const options = {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 50,
      };

      const result = await closedLeadsService.getClosedProjects(options);

      res.json(result);
    } catch (error) {
      logger.error('Error in getClosedProjects controller', {
        error: error.message,
        stack: error.stack,
      });
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get closed leads with pagination and filters
   * GET /closed-leads
   */
  async getClosedLeads(req, res) {
    try {
      const { user } = req;
      const {
        page,
        limit,
        sortBy,
        sortOrder,
        project_id,
        closed_project_id,
        is_reverted,
        contact_name,
        email_from,
        closeLeadStatus,
      } = req.query;

      // Check permission
      const canViewAll = await hasPermission(user.role, PERMISSIONS.LEAD_READ_ALL);
      const canViewAssigned = await hasPermission(user.role, PERMISSIONS.LEAD_READ_ASSIGNED);

      if (!canViewAll && !canViewAssigned) {
        return res.status(403).json({
          error: 'Access denied. You do not have permission to view closed leads.',
        });
      }

      const filters = {};
      
      // Support both project_id and closed_project_id
      const projectIdToFilter = project_id || closed_project_id;
      if (projectIdToFilter) filters.closed_project_id = projectIdToFilter;

      // By default, exclude reverted leads
      if (is_reverted !== undefined) {
        filters.is_reverted = is_reverted === 'true';
      } else {
        filters.is_reverted = false;
      }

      if (contact_name) filters.contact_name = new RegExp(contact_name, 'i');
      if (email_from) filters.email_from = new RegExp(email_from, 'i');
      
      if (closeLeadStatus) {
        filters.closeLeadStatus =
          typeof closeLeadStatus === 'string' ? closeLeadStatus.toLowerCase() : closeLeadStatus;
      }

      const options = {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 50,
        sortBy: sortBy || 'closed_at',
        sortOrder: parseInt(sortOrder) || -1,
      };

      const result = await closedLeadsService.getClosedLeads(filters, options);

      res.json(result);
    } catch (error) {
      logger.error('Error in getClosedLeads controller', {
        error: error.message,
        stack: error.stack,
      });
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Save closed leads from external microservice
   * POST /closed-leads/external
   * Called by lead-offers-service when closing projects
   */
  async saveClosedLeadsFromExternal(req, res) {
    try {
      const { user } = req;
      const data = req.body;

      // Check permission - only admins can save closed leads
      const canSave = await hasPermission(user.role, PERMISSIONS.LEAD_READ_ALL);

      if (!canSave) {
        return res.status(403).json({
          error: 'Access denied. You do not have permission to save closed leads.',
        });
      }

      const result = await closedLeadsService.saveClosedLeadsFromExternal(data);

      res.json(result);
    } catch (error) {
      logger.error('Error in saveClosedLeadsFromExternal controller', {
        error: error.message,
        stack: error.stack,
      });
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Revert closed leads back to active state
   * POST /closed-leads/revert
   */
  async revertClosedLeads(req, res) {
    try {
      const { user } = req;
      const { leadIds, closedLeadIds, projectId, revertReason, notes } = req.body;

      // Accept both leadIds and closedLeadIds for flexibility
      const leadsToRevert = leadIds || closedLeadIds;

      if (!leadsToRevert || !Array.isArray(leadsToRevert) || leadsToRevert.length === 0) {
        return res.status(400).json({ error: 'Lead IDs array is required (leadIds or closedLeadIds)' });
      }

      // Extract authorization token from request headers
      const authHeader = req.headers.authorization;
      const userToken = authHeader ? authHeader.replace('Bearer ', '') : null;

      const result = await closedLeadsService.revertClosedLeads(
        leadsToRevert,
        projectId, // can be null
        user._id,
        revertReason || notes,
        userToken
      );

      res.json(result);
    } catch (error) {
      logger.error('Error in revertClosedLeads controller', {
        error: error.message,
        stack: error.stack,
      });
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Assign closed leads to another project
   * POST /closed-leads/assign
   */
  async assignClosedLeads(req, res) {
    try {
      const { user } = req;
      const { leadIds, closedLeadIds, projectId, agentId, assignReason, notes, leadPrice } = req.body;

      // Accept both leadIds and closedLeadIds for flexibility
      const leadsToAssign = leadIds || closedLeadIds;

      if (!leadsToAssign || !Array.isArray(leadsToAssign) || leadsToAssign.length === 0) {
        return res.status(400).json({ error: 'Lead IDs array is required (leadIds or closedLeadIds)' });
      }

      if (!projectId) {
        return res.status(400).json({ error: 'Project ID is required' });
      }

      if (!agentId) {
        return res.status(400).json({ error: 'Agent ID is required' });
      }

      // Extract authorization token from request headers
      const authHeader = req.headers.authorization;
      const userToken = authHeader ? authHeader.replace('Bearer ', '') : null;

      const result = await closedLeadsService.assignClosedLeads(
        leadsToAssign,
        projectId,
        agentId,
        user._id,
        assignReason || notes,
        leadPrice,
        userToken
      );

      res.json(result);
    } catch (error) {
      logger.error('Error in assignClosedLeads controller', {
        error: error.message,
        stack: error.stack,
      });
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new ClosedLeadsController();

