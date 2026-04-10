const assignLeadsService = require('../services/assignLeadsService');
const projectClosureService = require('../services/projectClosureService');
const Team = require('../models/Team');
const { hasPermission } = require('../middleware');
const { PERMISSIONS } = require('../middleware/roles/permissions');

class AssignLeadsController {
  //assign leads to a specific agent of a specific project
  async assignLeadsToProject(req, res) {
    try {
      const { leadIds, projectId, agentId, notes, leadPrice } = req.body;
      const { user } = req;

      // Check if user has permission to assign leads
      if (!(await hasPermission(user.role, PERMISSIONS.LEAD_ASSIGN))) {
        return res.status(403).json({
          error: 'Access denied. You do not have permission to assign leads.',
        });
      }

      if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
        return res.status(400).json({ error: 'Lead IDs are required and must be an array' });
      }

      if (!projectId) {
        return res.status(400).json({ error: 'Project ID is required' });
      }

      if (!agentId) {
        return res
          .status(400)
          .json({ error: 'Agent ID is required. Leads must be assigned to an agent.' });
      }

      // Use the authenticated user's ID as the assignedBy value
      const assignedById = user._id;

      const assignments = await assignLeadsService.assignLeadsToProject(
        leadIds,
        projectId,
        assignedById,
        agentId,
        notes,
        leadPrice
      );

      res.status(201).json(assignments);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  //get leads assigned to a specific project
  async getProjectLeads(req, res) {
    try {
      const { projectId } = req.params;
      const { status, page, limit, agentId } = req.query;
      const { user } = req;

      // If user has permission to read all assignments, allow unrestricted access
      const canReadAllAssignments = await hasPermission(user.role, PERMISSIONS.ASSIGN_LEAD_READ_ALL);

      // If user only has permission to read project assignments, check if they belong to this project
      const canReadProjectAssignments = await hasPermission(user.role, PERMISSIONS.ASSIGN_LEAD_READ_PROJECT);
      if (
        !canReadAllAssignments &&
        canReadProjectAssignments
      ) {
        const team = await Team.findById(projectId);

        if (!team) {
          return res.status(404).json({ error: 'Project not found' });
        }

        // Check if user is an agent in this project
        if (!assignLeadsService.isUserAgentInProject(team, user._id.toString())) {
          return res.status(403).json({
            error: "Access denied. You don't have permission to access leads for this project.",
          });
        }
      } else if (
        !canReadAllAssignments &&
        !canReadProjectAssignments
      ) {
        return res.status(403).json({
          error: "Access denied. You don't have permission to access leads for this project.",
        });
      }

      const result = await assignLeadsService.getProjectLeads(projectId, {
        status,
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20,
        agentId,
      });

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  //get projects a lead is assigned to
  async getLeadProjects(req, res) {
    try {
      const { leadId } = req.params;
      const { status } = req.query;
      const { user } = req;

      const assignments = await assignLeadsService.getLeadProjects(leadId, { status });

      // If user has permission to read all assignments, return all
      if (await hasPermission(user.role, PERMISSIONS.ASSIGN_LEAD_READ_ALL)) {
        return res.json(assignments);
      }

      // If user has permission to read project assignments, filter projects they have access to
      if (await hasPermission(user.role, PERMISSIONS.ASSIGN_LEAD_READ_PROJECT)) {
        const userAssignments = [];

        for (const assignment of assignments) {
          const team = await Team.findById(assignment.project_id._id || assignment.project_id);

          if (team && assignLeadsService.isUserAgentInProject(team, user._id.toString())) {
            userAssignments.push(assignment);
          }
        }

        return res.json(userAssignments);
      }

      // If user has permission to read only own assignments, filter to their assignments
      if (await hasPermission(user.role, PERMISSIONS.ASSIGN_LEAD_READ_OWN)) {
        const userAssignments = assignments.filter(
          (assignment) =>
            assignment.agent_id &&
            assignment.agent_id._id &&
            assignment.agent_id._id.toString() === user._id.toString()
        );

        return res.json(userAssignments);
      }

      // No permission to read assignments
      return res.status(403).json({
        error: "Access denied. You don't have permission to access lead assignments.",
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  //update the status of a lead assignment
  async updateAssignmentStatus(req, res) {
    try {
      const { leadId, projectId } = req.params;
      const { status } = req.body;
      const { user } = req;

      // Check if user has permission to update assignments
      if (!(await hasPermission(user.role, PERMISSIONS.ASSIGN_LEAD_UPDATE))) {
        return res.status(403).json({
          error: 'Access denied. You do not have permission to update assignments.',
        });
      }

      if (!status) {
        return res.status(400).json({ error: 'Status is required' });
      }

      const assignment = await assignLeadsService.updateAssignmentStatus(leadId, projectId, status);
      res.json(assignment);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  //update the agent assigned to a lead in a project
  async updateAssignmentAgent(req, res) {
    try {
      const { leadId, projectId } = req.params;
      const { agentId } = req.body;
      const { user } = req;

      // Check if user has permission to update agent assignments
      if (!(await hasPermission(user.role, PERMISSIONS.ASSIGN_LEAD_AGENT_UPDATE))) {
        return res.status(403).json({
          error: 'Access denied. You do not have permission to update agent assignments.',
        });
      }

      if (!agentId) {
        return res.status(400).json({ error: 'Agent ID is required' });
      }

      const assignment = await assignLeadsService.updateAssignmentAgent(leadId, projectId, agentId);
      res.json(assignment);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  //transfer a lead from one project/agent to another project/agent
  async replaceLeadToProject(req, res) {
    try {
      const { leadId, toProjectId, toAgentUserId, notes, isFreshTransfer = false, transferReason = '', isRestore = false } = req.body;
      const { user } = req;

      // Check if user has permission to assign leads
      if (!(await hasPermission(user.role, PERMISSIONS.LEAD_ASSIGN))) {
        return res.status(403).json({
          error: 'Access denied. You do not have permission to transfer leads.',
        });
      }

      // This validation is now handled in the service by checking if lead is already in target project
      if(toProjectId === leadId) {
        return res.status(400).json({ error: 'Lead is already assigned to the target project' });
      }

      // Validate fresh transfer flag (ensure it's boolean)
      const freshTransfer = Boolean(isFreshTransfer);
      const restoreFlag = Boolean(isRestore);

      // Use the authenticated user's ID as the transferredBy value
      const transferredById = user._id;

      const result = await assignLeadsService.replaceLeadToProject(
        leadId,
        toProjectId,
        toAgentUserId,
        transferredById,
        notes,
        freshTransfer,
        transferReason,
        restoreFlag
      );

      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  //bulk transfer multiple leads from one project/agent to another project/agent
  async bulkReplaceLeadsToProject(req, res) {
    try {
      const { leadIds, toProjectId, toAgentUserId, notes, isFreshTransfer = false, transferReason = '', isRestore = false } = req.body;
      const { user } = req;

      // Check if user has permission to assign leads
      if (!(await hasPermission(user.role, PERMISSIONS.LEAD_ASSIGN))) {
        return res.status(403).json({
          error: 'Access denied. You do not have permission to transfer leads.',
        });
      }

      // Validate fresh transfer flag (ensure it's boolean)
      const freshTransfer = Boolean(isFreshTransfer);
      const restoreFlag = Boolean(isRestore);

      // Use the authenticated user's ID as the transferredBy value
      const transferredById = user._id;

      const result = await assignLeadsService.bulkReplaceLeadsToProject(
        leadIds,
        toProjectId,
        toAgentUserId,
        transferredById,
        notes,
        freshTransfer,
        transferReason,
        restoreFlag
      );

      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  //remove a lead from a project (archive the assignment)
  async removeLeadFromProject(req, res) {
    try {
      const { leadId, projectId } = req.params;
      const { user } = req;

      // Check if user has permission to delete assignments
      if (!(await hasPermission(user.role, PERMISSIONS.ASSIGN_LEAD_DELETE))) {
        return res.status(403).json({
          error: 'Access denied. You do not have permission to remove lead assignments.',
        });
      }

      const assignment = await assignLeadsService.removeLeadFromProject(leadId, projectId);
      res.json(assignment);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  //get leads assigned to a specific agent
  async getAgentLeads(req, res) {
    try {
      const { agentId } = req.params;
      const { status, page, limit } = req.query;
      const { user } = req;

      // Check for appropriate permissions
      const canReadAllAssignments = await hasPermission(user.role, PERMISSIONS.ASSIGN_LEAD_READ_ALL);
      const isOwnData = user._id.toString() === agentId;
      const canReadOwnAssignments = await hasPermission(user.role, PERMISSIONS.ASSIGN_LEAD_READ_OWN);

      // Verify user has permission to access this data
      if (!canReadAllAssignments && !(isOwnData && canReadOwnAssignments)) {
        return res.status(403).json({
          error: "Access denied. You don't have permission to access leads for this agent.",
        });
      }

      const result = await assignLeadsService.getAgentLeads(agentId, {
        status,
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 50,
      });

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  //get all leads grouped by projects
  async getAllLeadsByProjects(req, res) {
    try {
      const { user } = req;
      const { page = 1, limit = 1000 } = req.query;

      // Check permissions - allow ASSIGN_LEAD_READ_ALL, ASSIGN_LEAD_READ_OWN, or ASSIGN_LEAD_READ_PROJECT
      const hasReadAll = await hasPermission(user.role, PERMISSIONS.ASSIGN_LEAD_READ_ALL);
      const hasReadOwn = await hasPermission(user.role, PERMISSIONS.ASSIGN_LEAD_READ_OWN);
      const hasReadProject = await hasPermission(user.role, PERMISSIONS.ASSIGN_LEAD_READ_PROJECT);
      
      if (!hasReadAll && !hasReadOwn && !hasReadProject) {
        return res.status(403).json({
          error: 'Access denied. You do not have permission to view lead assignments.',
        });
      }

      // Use the new centralized grouping service for consistency
      const leadGroupingService = require('../services/leadGrouping/LeadGroupingService');
      
      const result = await leadGroupingService.groupLeads('project', user, {
        page: parseInt(page),
        limit: parseInt(limit),
        sortBy: 'name',
        sortOrder: 'asc',
        includeLeads: true,
        maxLeadsPerGroup: 1000 // Include all leads for backward compatibility
      });

      // Get project IDs to calculate offer statistics
      const projectIds = result.data.map(group => group.groupId).filter(id => id);

      // Calculate offer statistics for all projects
      const offerStats = await fetchOfferStatsByProject(projectIds, user);

      // Transform the result to match the existing API structure
      const projectLeads = result.data.map(group => ({
        projectId: group.groupId,
        projectName: group.groupName,
        totalLeads: group.count,
        totalAgents: group.reference ? 1 : 0, // Simplified for now
        leads: group.leads ? group.leads.map(lead => {
          // Extract the primary assignment info from the lead structure
          const primaryProject = Array.isArray(lead.project) && lead.project.length > 0 ? lead.project[0] : null;
          const primaryAgent = primaryProject ? primaryProject.agent : null;
          
          return {
            lead: lead,
            assignment: {
              agent: primaryAgent,
              assignedAt: lead.assignedAt || null,
              assignedBy: null,
              notes: ''
            }
          };
        }) : [],
        offers: offerStats[group.groupId?.toString()] || {
          total: 0,
          pending: 0,
          accepted: 0,
          rejected: 0,
          expired: 0,
        }
      }));

      res.json(projectLeads);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Close project with selective lead refresh
  async closeProject(req, res) {
    try {
      const { projectId } = req.params;
      const { leadsToRefresh, closureReason, current_status, notes } = req.body;
      const { user } = req;

      // Check if user has permission to close projects (Admin only)
      if (!(await hasPermission(user.role, PERMISSIONS.ASSIGN_LEAD_DELETE))) {
        return res.status(403).json({
          error: 'Access denied. You do not have permission to close projects.',
        });
      }

      if (!projectId) {
        return res.status(400).json({ error: 'Project ID is required' });
      }

      if (!Array.isArray(leadsToRefresh)) {
        return res.status(400).json({ error: 'Leads to refresh must be an array' });
      }

      const result = await projectClosureService.closeProjectWithSelectiveRefresh(
        projectId,
        leadsToRefresh,
        user._id,
        { closure_reason: closureReason, current_status: current_status || null, notes: notes || null }
      );

      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  // Get leads that can be refreshed for a project
  async getRefreshableLeads(req, res) {
    try {
      const { projectId } = req.params;
      const { user } = req;

      // Check if user has permission to view project assignments
      if (!(await hasPermission(user.role, PERMISSIONS.ASSIGN_LEAD_READ_ALL))) {
        return res.status(403).json({
          error: 'Access denied. You do not have permission to view project leads.',
        });
      }

      if (!projectId) {
        return res.status(400).json({ error: 'Project ID is required' });
      }

      const leads = await projectClosureService.getRefreshableLeads(projectId);
      res.json(leads);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Get reusable leads (leads that were refreshed and can be reassigned)
  async getReusableLeads(req, res) {
    try {
      const { user } = req;
      const filters = req.query;

      // Check if user has permission to view all assignments
      if (!(await hasPermission(user.role, PERMISSIONS.ASSIGN_LEAD_READ_ALL))) {
        return res.status(403).json({
          error: 'Access denied. You do not have permission to view reusable leads.',
        });
      }

      const leads = await projectClosureService.getReusableLeads(filters);
      res.json(leads);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

// Helper function to calculate offer statistics by project
async function fetchOfferStatsByProject(projectIds, user = null) {
  if (!projectIds || projectIds.length === 0) {
    return {};
  }

  const { Offer, Opening, Confirmation, PaymentVoucher } = require('../models');
  const mongoose = require('mongoose');
  
  const offerStats = {};

  for (const projectId of projectIds) {
    if (!projectId) continue;
    
    // Build match criteria based on user role
    const matchCriteria = {
      project_id: new mongoose.Types.ObjectId(projectId)
    };
    
    // If user is not Admin, only show offers where user is the agent
    if (user && user.role !== 'Admin') {
      matchCriteria.agent_id = new mongoose.Types.ObjectId(user._id);
    }
    
    // Use aggregation to get offers with their progression status
    const pipeline = [
      {
        $match: matchCriteria
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
      rejected: 0,
      expired: 0, 
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

module.exports = new AssignLeadsController();
