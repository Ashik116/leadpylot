const leadGroupingService = require('../services/leadGrouping/LeadGroupingService');
const { hasPermission } = require('../middleware');
const { PERMISSIONS } = require('../middleware/roles/permissions');
const logger = require('../helpers/logger');

class LeadGroupingController {
  /**
   * Get leads grouped by a specific field
   * @route GET /leads/group/:field
   * @access Admin and Agent (with permission-based filtering)
   */
  async groupLeads(req, res) {
    try {
      const { field } = req.params;
      const { user } = req;

      // Check permissions - agents have LEAD_READ_ASSIGNED, admins have LEAD_READ_ALL
      const canReadAllLeads = await hasPermission(user.role, PERMISSIONS.LEAD_READ_ALL);
      const canReadAssignedLeads = await hasPermission(user.role, PERMISSIONS.LEAD_READ_ASSIGNED);

      if (!canReadAllLeads && !canReadAssignedLeads) {
        return res.status(403).json({
          error: 'Access denied. You do not have permission to view leads.',
        });
      }

      // Extract options from query parameters
      const {
        page = 1,
        limit = 50,
        sortBy = 'count',
        sortOrder = 'desc',
        includeLeads = 'false', // Changed default to false for performance
        filters = '[]',
        search = null,
        // Todo filters
        has_todo = null,
        todo_scope = 'all',
        pending_todos = null,
        done_todos = null,
      } = req.query;

      // Parse filters if provided
      let parsedFilters = [];
      try {
        parsedFilters = JSON.parse(filters);
      } catch (error) {
        return res.status(400).json({
          error: 'Invalid filters format. Must be valid JSON array.',
        });
      }

      // Validate field parameter
      if (!field) {
        return res.status(400).json({
          error: 'Grouping field is required.',
        });
      }

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sortBy,
        sortOrder,
        includeLeads: includeLeads === 'true',
        filters: parsedFilters,
        search,
      };

      const result = await leadGroupingService.groupLeads(field, user, options);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      res.status(400).json({
        error: error.message,
        success: false,
      });
    }
  }

  /**
   * Get available grouping fields
   * @route GET /leads/group/options
   * @access Admin and Agent
   */
  async getGroupingOptions(req, res) {
    try {
      const { user } = req;

      // Check permissions - agents have LEAD_READ_ASSIGNED, admins have LEAD_READ_ALL
      const canReadAllLeads = await hasPermission(user.role, PERMISSIONS.LEAD_READ_ALL);
      const canReadAssignedLeads = await hasPermission(user.role, PERMISSIONS.LEAD_READ_ASSIGNED);

      if (!canReadAllLeads && !canReadAssignedLeads) {
        return res.status(403).json({
          error: 'Access denied. You do not have permission to view leads.',
        });
      }

      // Pass user object to service for role-based filtering
      const options = leadGroupingService.getAvailableGroupings(user);

      res.json({
        success: true,
        data: options,
        meta: {
          total: options.length,
          userRole: user.role,
          canReadAllLeads,
          canReadAssignedLeads,
          message:
            user.role !== 'Admin'
              ? 'Showing agent-appropriate grouping options'
              : 'Showing all available grouping options',
        },
      });
    } catch (error) {
      res.status(500).json({
        error: error.message,
        success: false,
      });
    }
  }

  /**
   * Get specific group details with more leads
   * @route GET /leads/group/:field/:groupId
   * @access Admin and Agent (with permission-based filtering)
   */
  async getGroupDetails(req, res) {
    try {
      const { field, groupId } = req.params;
      const { user } = req;

      // Check permissions - agents have LEAD_READ_ASSIGNED, admins have LEAD_READ_ALL
      const canReadAllLeads = await hasPermission(user.role, PERMISSIONS.LEAD_READ_ALL);
      const canReadAssignedLeads = await hasPermission(user.role, PERMISSIONS.LEAD_READ_ASSIGNED);

      if (!canReadAllLeads && !canReadAssignedLeads) {
        return res.status(403).json({
          error: 'Access denied. You do not have permission to view leads.',
        });
      }

      const {
        page = 1,
        limit = 50,
        filters = '[]',
        search = null,
        // Todo filters
        has_todo = null,
        todo_scope = 'all',
        pending_todos = null,
        done_todos = null,
      } = req.query;

      // Parse filters if provided
      let parsedFilters = [];
      try {
        parsedFilters = JSON.parse(filters);
      } catch (error) {
        return res.status(400).json({
          error: 'Invalid filters format. Must be valid JSON array.',
        });
      }

      // Get the full grouping first (optimized - only get stats)
      const groupResult = await leadGroupingService.groupLeads(field, user, {
        page: 1,
        limit: 1000, // Get all groups to find the specific one
        includeLeads: false, // Only get stats to find the group
        filters: parsedFilters,
        search,
      });

      // Find the specific group (handle ObjectId vs string comparison)
      const group = groupResult.data.find((g) => {
        const gId = g.groupId ? g.groupId.toString() : g.groupId;
        const requestedId = groupId;

        // Handle different types: ObjectId, string, boolean, null
        return (
          gId === requestedId ||
          (groupId === 'null' && g.groupName === 'None') ||
          g.groupId === (groupId === 'true' ? true : groupId === 'false' ? false : groupId)
        );
      });

      // Debug log if group not found
      if (!group) {
        logger.warn('Group not found for getGroupDetails', {
          requestedGroupId: groupId,
          field,
          availableGroups: groupResult.data.map((g) => ({
            groupId: g.groupId,
            groupIdType: typeof g.groupId,
            groupIdString: g.groupId ? g.groupId.toString() : g.groupId,
            groupName: g.groupName,
          })),
        });
      }

      if (!group) {
        return res.status(404).json({
          error: 'Group not found.',
          success: false,
        });
      }

      // Get detailed lead data for this group
      const { executeLeadQuery } = require('../services/leadService/queries');

      const leadQuery = {
        _id: { $in: group.leadIds },
      };

      const leadResult = await executeLeadQuery(
        user,
        leadQuery,
        parseInt(page),
        parseInt(limit),
        true, // includeOffers
        null, // state
        has_todo === 'true', // has_todo (from query)
        todo_scope, // todo_scope (from query)
        pending_todos === 'true', // pending_todos (from query)
        done_todos === 'true', // done_todos (from query)
        'createdAt', // sortBy
        'desc' // sortOrder
      );

      res.json({
        success: true,
        data: {
          group: {
            groupId: group.groupId,
            groupName: group.groupName,
            count: group.count,
            reference: group.reference,
          },
          leads: leadResult.data,
        },
        meta: {
          ...leadResult.meta,
          groupField: field,
          groupId: group.groupId,
        },
      });
    } catch (error) {
      res.status(400).json({
        error: error.message,
        success: false,
      });
    }
  }

  /**
   * Get multiple groups with summary stats
   * @route GET /leads/group/summary
   * @access Admin and Agent (with permission-based filtering)
   */
  async getGroupingSummary(req, res) {
    try {
      const { user } = req;

      // Check permissions - agents have LEAD_READ_ASSIGNED, admins have LEAD_READ_ALL
      const canReadAllLeads = await hasPermission(user.role, PERMISSIONS.LEAD_READ_ALL);
      const canReadAssignedLeads = await hasPermission(user.role, PERMISSIONS.LEAD_READ_ASSIGNED);

      if (!canReadAllLeads && !canReadAssignedLeads) {
        return res.status(403).json({
          error: 'Access denied. You do not have permission to view leads.',
        });
      }

      const { fields = 'project,agent,source,status', filters = '[]', search = null } = req.query;

      // Parse filters if provided
      let parsedFilters = [];
      try {
        parsedFilters = JSON.parse(filters);
      } catch (error) {
        return res.status(400).json({
          error: 'Invalid filters format. Must be valid JSON array.',
        });
      }

      const fieldsArray = fields.split(',').map((f) => f.trim());
      const summary = {};

      // Get grouping for each field
      for (const field of fieldsArray) {
        try {
          const result = await leadGroupingService.groupLeads(field, user, {
            page: 1,
            limit: 1000,
            includeLeads: false,
            filters: parsedFilters,
            search,
          });

          summary[field] = {
            groups: result.data.map((g) => ({
              groupId: g.groupId,
              groupName: g.groupName,
              count: g.count,
            })),
            totalGroups: result.meta.total,
            totalLeads: result.meta.totalLeads,
          };
        } catch (error) {
          summary[field] = {
            error: error.message,
            groups: [],
            totalGroups: 0,
            totalLeads: 0,
          };
        }
      }

      res.json({
        success: true,
        data: summary,
        meta: {
          userRole: user.role,
          canReadAllLeads,
          fieldsRequested: fieldsArray,
        },
      });
    } catch (error) {
      res.status(500).json({
        error: error.message,
        success: false,
      });
    }
  }

  /**
   * Get available sorting options for lead grouping
   * @route GET /leads/group/sorting-options
   * @access Admin and Agent
   */
  async getSortingOptions(req, res) {
    try {
      const { user } = req;

      // Check permissions - agents have LEAD_READ_ASSIGNED, admins have LEAD_READ_ALL
      const canReadAllLeads = await hasPermission(user.role, PERMISSIONS.LEAD_READ_ALL);
      const canReadAssignedLeads = await hasPermission(user.role, PERMISSIONS.LEAD_READ_ASSIGNED);

      if (!canReadAllLeads && !canReadAssignedLeads) {
        return res.status(403).json({
          error: 'Access denied. You do not have permission to view leads.',
        });
      }

      const sortingOptions = leadGroupingService.getAvailableGroupingSorts(user);

      res.json({
        success: true,
        data: sortingOptions,
        meta: {
          userRole: user.role,
          canReadAllLeads,
          canReadAssignedLeads,
          message: 'Available sorting options for lead grouping operations',
        },
      });
    } catch (error) {
      res.status(500).json({
        error: error.message,
        success: false,
      });
    }
  }

  /**
   * Group leads by multiple fields in a nested structure OR drill down into specific groups
   * @route GET /leads/group/multilevel/*
   * @access Admin and Agent (with permission-based filtering)
   * @example GET /leads/group/multilevel/project/agent/stage (basic structure)
   * @example GET /leads/group/multilevel/project/agent/stage/details/projectId/agentId (drill down)
   */
  async groupLeadsMultilevel(req, res) {
    try {
      const { user } = req;

      // Check permissions - agents have LEAD_READ_ASSIGNED, admins have LEAD_READ_ALL
      const canReadAllLeads = await hasPermission(user.role, PERMISSIONS.LEAD_READ_ALL);
      const canReadAssignedLeads = await hasPermission(user.role, PERMISSIONS.LEAD_READ_ASSIGNED);

      if (!canReadAllLeads && !canReadAssignedLeads) {
        return res.status(403).json({
          error: 'Access denied. You do not have permission to view leads.',
        });
      }

      // Extract path segments from the URL
      const pathSegments = req.params[0]
        ? req.params[0].split('/').filter((segment) => segment.trim())
        : [];

      // Check if this is a drill-down request (contains "details")
      const detailsIndex = pathSegments.indexOf('details');
      const isDrillDown = detailsIndex !== -1;

      if (isDrillDown) {
        // Handle drill-down into specific groups
        const groupingLevels = pathSegments.slice(0, detailsIndex);
        // Decode URL-encoded group IDs (handles special characters like /, spaces, etc.)
        const groupIds = pathSegments.slice(detailsIndex + 1).map((id) => decodeURIComponent(id));

        // Debug logging
        logger.info('Drill-down request parsed', {
          url: req.originalUrl,
          pathSegments,
          detailsIndex,
          groupingLevels,
          groupIds,
          groupingLevelsLength: groupingLevels.length,
          groupIdsLength: groupIds.length,
        });

        if (groupingLevels.length === 0) {
          return res.status(400).json({
            error: 'At least one grouping level is required before /details/',
            success: false,
          });
        }

        if (groupIds.length === 0) {
          return res.status(400).json({
            error: 'At least one group ID is required after /details/',
            success: false,
          });
        }

        // Extract options for drill-down
        const {
          page = 1,
          limit = 50,
          filters = '[]',
          search = null,
          sortBy = 'createdAt',
          sortOrder = 'desc',
          partner_ids = null, // NEW: Bulk search by partner IDs (also for drill-down)
          // Todo filters
          has_todo = null,
          todo_scope = 'all',
          pending_todos = null,
          done_todos = null,
        } = req.query;

        // Parse filters if provided
        let parsedFilters = [];
        try {
          parsedFilters = JSON.parse(filters);
        } catch (error) {
          return res.status(400).json({
            error: 'Invalid filters format. Must be valid JSON array.',
            success: false,
          });
        }

        // Parse partner_ids if provided (for bulk search in drill-down)
        let parsedPartnerIds = null;
        if (partner_ids) {
          try {
            parsedPartnerIds = JSON.parse(partner_ids);
            if (!Array.isArray(parsedPartnerIds)) {
              return res.status(400).json({
                error: 'partner_ids must be a JSON array.',
                success: false,
              });
            }
            // Clean and filter partner IDs
            parsedPartnerIds = [
              ...new Set(parsedPartnerIds.filter((id) => id && id.toString().trim())),
            ];
            if (parsedPartnerIds.length === 0) {
              return res.status(400).json({
                error: 'No valid partner IDs provided.',
                success: false,
              });
            }
          } catch (error) {
            return res.status(400).json({
              error: 'Invalid partner_ids format. Must be valid JSON array.',
              success: false,
            });
          }
        }

        const drillDownOptions = {
          page: parseInt(page),
          limit: parseInt(limit),
          filters: parsedFilters,
          search,
          sortBy,
          sortOrder,
          partner_ids: parsedPartnerIds, // NEW: Pass bulk search parameter
          // Todo filters
          has_todo: has_todo === 'true',
          todo_scope,
          pending_todos: pending_todos === 'true',
          done_todos: done_todos === 'true',
        };

        const result = await leadGroupingService.getMultilevelGroupDetails(
          groupingLevels,
          groupIds,
          user,
          drillDownOptions
        );

        return res.json({
          success: true,
          ...result,
        });
      } else {
        // Handle basic multilevel grouping
        if (pathSegments.length === 0) {
          return res.status(400).json({
            error:
              'At least one grouping level is required. Example: /leads/group/multilevel/project/agent/stage',
            success: false,
          });
        }

        if (pathSegments.length > 5) {
          return res.status(400).json({
            error: 'Maximum 5 grouping levels allowed for performance reasons.',
            success: false,
          });
        }

        // Extract options from query parameters
        // sortBy supports both group-level and lead-specific sorting:
        // Group-level: count, name, avg_revenue, total_revenue, latest_lead, oldest_lead
        // Lead-specific: contact_name, lead_source_no, expected_revenue, createdAt, updatedAt, lead_date, email_from, phone
        const {
          page = 1,
          limit = 50,
          sortBy = 'count',
          sortOrder = 'desc',
          includeLeads = 'false', // Default to false for performance, like single-level grouping
          filters = '[]',
          search = null,
          partner_ids = null, // NEW: Bulk search by partner IDs
          // Todo filters
          has_todo = null,
          todo_scope = 'all',
          pending_todos = null,
          done_todos = null,
        } = req.query;

        // Parse filters if provided
        let parsedFilters = [];
        try {
          parsedFilters = JSON.parse(filters);
        } catch (error) {
          return res.status(400).json({
            error: 'Invalid filters format. Must be valid JSON array.',
            success: false,
          });
        }

        // Parse partner_ids if provided (for bulk search)
        let parsedPartnerIds = null;
        if (partner_ids) {
          try {
            parsedPartnerIds = JSON.parse(partner_ids);
            if (!Array.isArray(parsedPartnerIds)) {
              return res.status(400).json({
                error: 'partner_ids must be a JSON array.',
                success: false,
              });
            }
            // Clean and filter partner IDs
            parsedPartnerIds = [
              ...new Set(parsedPartnerIds.filter((id) => id && id.toString().trim())),
            ];
            if (parsedPartnerIds.length === 0) {
              return res.status(400).json({
                error: 'No valid partner IDs provided.',
                success: false,
              });
            }
          } catch (error) {
            return res.status(400).json({
              error: 'Invalid partner_ids format. Must be valid JSON array.',
              success: false,
            });
          }
        }

        const options = {
          page: parseInt(page),
          limit: parseInt(limit),
          sortBy,
          sortOrder,
          includeLeads: includeLeads === 'true',
          filters: parsedFilters,
          search,
          partner_ids: parsedPartnerIds, // NEW: Pass bulk search parameter
          // Todo filters
          has_todo: has_todo === 'true',
          todo_scope,
          pending_todos: pending_todos === 'true',
          done_todos: done_todos === 'true',
        };

        const result = await leadGroupingService.groupLeadsMultilevel(pathSegments, user, options);

        return res.json({
          success: true,
          ...result,
        });
      }
    } catch (error) {
      logger.error('Multilevel grouping controller error:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        fullError: error,
      });
      res.status(400).json({
        error: error.message,
        success: false,
      });
    }
  }
}

module.exports = new LeadGroupingController();
