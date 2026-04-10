const { ClosedLead, ClosedOffer, ClosedActivity, ClosedTodo, ClosedAssignLeads, ClosedTermine, Project, Assignment, Settings } = require('../models');
const logger = require('../utils/logger');
const axios = require('axios');

const LEAD_SERVICE_URL = process.env.LEAD_SERVICE_URL || 'http://localhost:4003';

/**
 * ClosedLeadsService
 * Handles closed leads operations for the configuration service
 */
class ClosedLeadsService {
  /**
   * Get all closed projects with lead counts
   * @param {Object} options - Pagination options
   * @returns {Promise<Object>} - Result with closed projects and metadata
   */
  async getClosedProjects(options = {}) {
    try {
      const { page = 1, limit = 50 } = options;
      const skip = (page - 1) * limit;

      // Aggregate closed leads by project to get counts
      const projectStats = await ClosedLead.aggregate([
        {
          $group: {
            _id: '$closed_project_id',
            lead_count: { $sum: 1 },
            original_lead_ids: { $push: '$original_lead_id' },
            in_use_count: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ['$is_reverted', false] },
                      { $eq: ['$use_status', 'in_use'] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            assigned_count: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ['$is_reverted', false] },
                      { $eq: ['$closeLeadStatus', 'assigned'] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            reverted_count: {
              $sum: {
                $cond: [{ $eq: ['$is_reverted', true] }, 1, 0],
              },
            },
            last_closed_at: { $max: '$closed_at' },
          },
        },
        {
          $sort: { last_closed_at: -1 },
        },
      ]);

      // Get total count before pagination
      const total = projectStats.length;

      // Apply pagination
      const paginatedProjectStats = projectStats.slice(skip, skip + limit);

      if (paginatedProjectStats.length === 0) {
        return {
          data: [],
          meta: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit),
          },
        };
      }

      // Get project details for all project IDs
      const projectIds = paginatedProjectStats.map((stat) => stat._id);
      const projects = await Project.find({ _id: { $in: projectIds } })
        .select('_id name active')
        .lean();

      // Get total leads count for each project using Assignment model
      // Count distinct lead_ids per project_id (includes both active and archived assignments)
      const totalLeadsStats = await Assignment.aggregate([
        {
          $match: {
            project_id: { $in: projectIds },
          },
        },
        {
          $group: {
            _id: {
              project_id: '$project_id',
              lead_id: '$lead_id',
            },
          },
        },
        {
          $group: {
            _id: '$_id.project_id',
            total_leads: { $sum: 1 },
          },
        },
      ]);

      // Create maps for quick lookup
      const projectMap = {};
      projects.forEach((project) => {
        projectMap[project._id.toString()] = project;
      });

      const totalLeadsMap = {};
      totalLeadsStats.forEach((stat) => {
        totalLeadsMap[stat._id.toString()] = stat.total_leads;
      });

      // Calculate revertable_count: count closed leads whose original leads have no team_id
      // Note: This requires access to Lead model which might be in another service
      // For now, we'll set it to 0 and it can be enhanced later if needed
      const allOriginalLeadIds = paginatedProjectStats.flatMap(
        (stat) => stat.original_lead_ids
      );

      // TODO: If Lead model is available, check which leads have no team_id
      // For now, we'll calculate based on is_reverted and closeLeadStatus
      const revertableCountMap = {};
      paginatedProjectStats.forEach((stat) => {
        // Revertable = non-reverted closed leads
        const revertableCount = stat.original_lead_ids.filter(
          (leadId) => leadId && !stat.reverted_count
        ).length;
        revertableCountMap[stat._id.toString()] = Math.max(
          0,
          stat.lead_count - stat.reverted_count
        );
      });

      // Combine stats with project details
      const result = paginatedProjectStats.map((stat) => {
        const projectId = stat._id.toString();
        const project =
          projectMap[projectId] || { _id: stat._id, name: 'Unknown Project' };

        // Total leads from Assignment (all unique leads ever assigned to this project)
        const totalLeads = totalLeadsMap[projectId] || 0;

        // Closed leads count (leads preserved in ClosedLead - refreshed leads)
        const closedLeads = stat.lead_count;

        // Pending count = total leads - closed leads (leads not yet closed/refreshed)
        const pendingCount = Math.max(0, totalLeads - closedLeads);

        // Revertable count (non-reverted closed leads)
        const revertableCount = revertableCountMap[projectId] || 0;

        return {
          project_id: stat._id,
          project_name: project.name,
          project_active: project.active !== false, // Default to true if not set
          total_leads: totalLeads,
          lead_count: closedLeads,
          pending_count: pendingCount,
          revertable_count: revertableCount,
          in_use_count: stat.in_use_count,
          assigned_count: stat.assigned_count || 0,
          reverted_count: stat.reverted_count,
          last_closed_at: stat.last_closed_at,
        };
      });

      return {
        data: result,
        meta: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error getting closed projects', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Get closed leads with pagination and filters
   * @param {Object} filters - Query filters
   * @param {Object} options - Pagination and sorting options
   * @returns {Promise<Object>} - Result with closed leads and metadata
   */
  async getClosedLeads(filters = {}, options = {}) {
    try {
      const {
        page = 1,
        limit = 50,
        sortBy = 'closed_at',
        sortOrder = -1,
      } = options;

      const skip = (page - 1) * limit;
      const query = { ...filters };

      // Get closed leads with pagination
      const [closedLeads, total] = await Promise.all([
        ClosedLead.find(query)
          .sort({ [sortBy]: sortOrder })
          .skip(skip)
          .limit(limit)
          .populate('closed_project_id', 'name active')
          .populate('closed_by_user_id', 'login role')
          .populate('reverted_by_user_id', 'login role')
          .lean(),
        ClosedLead.countDocuments(query),
      ]);

      if (closedLeads.length === 0) {
        return {
          data: [],
          meta: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit),
          },
        };
      }

      // Resolve current_status IDs to full status objects
      const statusMap = await this._buildStatusMap(closedLeads);

      const result = closedLeads.map((lead) => {
        let resolved = null;
        if (lead.current_status) {
          const id = lead.current_status.toString();
          resolved = statusMap[id] || null;

          // Fallback when Settings lookup misses but lead already has stage/status snapshot.
          if (!resolved && (lead.status || lead.stage || lead.stage_id)) {
            resolved = {
              _id: id,
              name: lead.status || '',
              stage: lead.stage || '',
              stage_id: lead.stage_id || null,
            };
          }

          if (!resolved) {
            resolved = lead.current_status;
          }
        }
        return {
          ...lead,
          current_status: resolved,
        };
      });

      return {
        data: result,
        meta: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error getting closed leads', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Save closed leads from external service (called by lead-offers-service)
   * @param {Object} data - Closed leads data from project closure
   * @returns {Promise<Object>} - Result with statistics
   */
  async saveClosedLeadsFromExternal(data) {
    try {
      const {
        projectId,
        leads,
        adminUserId,
        closureReason,
        current_status,
      } = data;

      if (!projectId || !leads || !Array.isArray(leads) || leads.length === 0) {
        throw new Error('Invalid data: projectId and leads array are required');
      }

      if (!adminUserId) {
        throw new Error('adminUserId is required');
      }

      const stats = {
        closed_leads_count: 0,
        closed_offers_count: 0,
        closed_activities_count: 0,
        closed_todos_count: 0,
        closed_assignments_count: 0,
        closed_termine_count: 0,
        errors: [],
      };

      console.log('🔵 [closedLeadsService] Received from lead service, current_status:', current_status);
      logger.info('Saving closed leads from external service', {
        projectId,
        leadsCount: leads.length,
        adminUserId,
      });

      // Process each lead
      for (const leadData of leads) {
        try {
          // Create ClosedLead record
          const closedLeadData = {
            original_lead_id: leadData._id,
            closed_project_id: projectId,
            closed_at: new Date(),
            closed_by_user_id: adminUserId,
            closure_reason: closureReason || 'project_closure',
            is_reverted: false,
            closeLeadStatus: 'fresh',
            ...(current_status && { current_status }),
            
            // Store offer and document references
            offer_ids: leadData.offer_ids || [],
            document_ids: leadData.document_ids || [],
            
            // Copy all lead data
            id: leadData.id,
            use_status: leadData.use_status,
            reclamation_status: leadData.reclamation_status,
            usable: leadData.usable,
            duplicate_status: leadData.duplicate_status,
            checked: leadData.checked,
            lead_source_no: leadData.lead_source_no,
            system_id: leadData.system_id,
            contact_name: leadData.contact_name,
            nametitle: leadData.nametitle,
            email_from: leadData.email_from,
            secondary_email: leadData.secondary_email,
            phone: leadData.phone,
            expected_revenue: leadData.expected_revenue,
            leadPrice: leadData.leadPrice,
            lead_date: leadData.lead_date,
            assigned_date: leadData.assigned_date,
            source_month: leadData.source_month,
            prev_month: leadData.prev_month,
            current_month: leadData.current_month,
            source_team_id: leadData.source_team_id,
            source_user_id: leadData.source_user_id,
            prev_team_id: leadData.prev_team_id,
            prev_user_id: leadData.prev_user_id,
            source_id: leadData.source_id,
            transaction_id: leadData.transaction_id,
            team_id: leadData.team_id,
            user_id: leadData.user_id,
            instance_id: leadData.instance_id,
            stage_id: leadData.stage_id,
            status_id: leadData.status_id,
            stage: leadData.stage,
            status: leadData.status,
            write_date: leadData.write_date,
            active: leadData.active,
            notes: leadData.notes,
            tags: leadData.tags,
            custom_fields: leadData.custom_fields,
            voip_extension: leadData.voip_extension,
          };

          const closedLead = await ClosedLead.create(closedLeadData);
          stats.closed_leads_count++;

          logger.debug('Created ClosedLead from external service', {
            closedLeadId: closedLead._id,
            originalLeadId: leadData._id,
          });

          // Save associated offers
          if (leadData.offers && Array.isArray(leadData.offers) && leadData.offers.length > 0) {
            for (const offerData of leadData.offers) {
              try {
                const closedOfferData = {
                  original_offer_id: offerData._id,
                  closed_lead_id: closedLead._id,
                  ...offerData,
                  // Override project_id to match closed_project_id
                  project_id: projectId,
                };
                
                // Remove _id to let MongoDB generate a new one
                delete closedOfferData._id;
                
                await ClosedOffer.create(closedOfferData);
                stats.closed_offers_count++;
              } catch (offerError) {
                logger.error('Error saving closed offer', {
                  offerId: offerData._id,
                  leadId: leadData._id,
                  error: offerError.message,
                });
              }
            }
          }

          // Save associated activities
          if (leadData.activities && Array.isArray(leadData.activities) && leadData.activities.length > 0) {
            for (const activityData of leadData.activities) {
              try {
                const closedActivityData = {
                  original_activity_id: activityData._id,
                  closed_lead_id: closedLead._id,
                  ...activityData,
                };
                
                // Remove _id to let MongoDB generate a new one
                delete closedActivityData._id;
                
                await ClosedActivity.create(closedActivityData);
                stats.closed_activities_count++;
              } catch (activityError) {
                logger.error('Error saving closed activity', {
                  activityId: activityData._id,
                  leadId: leadData._id,
                  error: activityError.message,
                });
              }
            }
          }

          // Save associated todos
          if (leadData.todos && Array.isArray(leadData.todos) && leadData.todos.length > 0) {
            for (const todoData of leadData.todos) {
              try {
                const closedTodoData = {
                  original_todo_id: todoData._id,
                  closed_lead_id: closedLead._id,
                  ...todoData,
                };
                
                // Remove _id to let MongoDB generate a new one
                delete closedTodoData._id;
                
                await ClosedTodo.create(closedTodoData);
                stats.closed_todos_count++;
              } catch (todoError) {
                logger.error('Error saving closed todo', {
                  todoId: todoData._id,
                  leadId: leadData._id,
                  error: todoError.message,
                });
              }
            }
          }

          // Save associated assignments
          if (leadData.assignments && Array.isArray(leadData.assignments) && leadData.assignments.length > 0) {
            for (const assignmentData of leadData.assignments) {
              try {
                const closedAssignmentData = {
                  original_assignment_id: assignmentData._id,
                  closed_lead_id: closedLead._id,
                  ...assignmentData,
                };
                
                // Remove _id to let MongoDB generate a new one
                delete closedAssignmentData._id;
                
                await ClosedAssignLeads.create(closedAssignmentData);
                stats.closed_assignments_count++;
              } catch (assignmentError) {
                logger.error('Error saving closed assignment', {
                  assignmentId: assignmentData._id,
                  leadId: leadData._id,
                  error: assignmentError.message,
                });
              }
            }
          }

          // Save associated termine (appointments)
          if (leadData.termine && Array.isArray(leadData.termine) && leadData.termine.length > 0) {
            for (const termineData of leadData.termine) {
              try {
                const closedTermineData = {
                  original_appointment_id: termineData._id,
                  closed_lead_id: closedLead._id,
                  ...termineData,
                };
                
                // Remove _id to let MongoDB generate a new one
                delete closedTermineData._id;
                
                await ClosedTermine.create(closedTermineData);
                stats.closed_termine_count++;
              } catch (termineError) {
                logger.error('Error saving closed termine', {
                  termineId: termineData._id,
                  leadId: leadData._id,
                  error: termineError.message,
                });
              }
            }
          }

        } catch (error) {
          logger.error('Error saving individual closed lead', {
            leadId: leadData._id,
            error: error.message,
          });
          stats.errors.push({
            leadId: leadData._id,
            error: error.message,
          });
        }
      }

      logger.info('Completed saving closed leads from external service', {
        projectId,
        savedCount: stats.closed_leads_count,
        offersCount: stats.closed_offers_count,
        activitiesCount: stats.closed_activities_count,
        todosCount: stats.closed_todos_count,
        assignmentsCount: stats.closed_assignments_count,
        termineCount: stats.closed_termine_count,
        errorCount: stats.errors.length,
      });

      return {
        success: true,
        stats,
      };
    } catch (error) {
      logger.error('Error in saveClosedLeadsFromExternal', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Revert closed leads back to active state
   * This will restore the lead and all related data (activities, todos, assignments, offers, termine) 
   * back to the lead-offers-service
   * @param {Array} leadIds - Array of closed lead IDs
   * @param {string} projectId - Project ID to assign to (optional, uses original closed_project_id if not provided)
   * @param {string} userId - User ID who is reverting
   * @param {string} revertReason - Reason for reverting
   * @param {string} userToken - JWT token for authentication with lead-offers-service
   * @returns {Promise<Object>} - Result with statistics
   */
  async revertClosedLeads(leadIds, projectId, userId, revertReason, userToken) {
    try {
      const result = {
        reverted_count: 0,
        restored_leads: [],
        stats: {
          reverted_activities: 0,
          reverted_todos: 0,
          reverted_assignments: 0,
          deleted_activities: 0,
          deleted_todos: 0,
          deleted_assignments: 0,
        },
        errors: []
      };

      logger.info('Reverting closed leads', {
        leadIds,
        projectId,
        userId
      });

      for (const leadId of leadIds) {
        try {
          // Fetch the closed lead with all its data
          const closedLead = await ClosedLead.findById(leadId);
          
          if (!closedLead) {
            result.errors.push({
              leadId,
              error: 'Closed lead not found'
            });
            continue;
          }

          // Check if already reverted
          if (closedLead.is_reverted) {
            result.errors.push({
              leadId,
              error: 'This closed lead has already been reverted'
            });
            continue;
          }

          // Prepare lead data for restoration (exclude internal fields)
          const leadData = closedLead.toObject();
          const originalLeadId = closedLead.original_lead_id;
          
          // Remove MongoDB internal fields
          delete leadData._id;
          delete leadData.__v;
          delete leadData.createdAt;
          delete leadData.updatedAt;
          
          // Remove closure-related fields
          delete leadData.closed_at;
          delete leadData.closed_by_user_id;
          delete leadData.closure_reason;
          delete leadData.is_reverted;
          delete leadData.reverted_at;
          delete leadData.reverted_by_user_id;
          delete leadData.closeLeadStatus;
          delete leadData.closed_project_id;
          delete leadData.original_lead_id;
          delete leadData.original_closure_reason;  // This field doesn't exist in Lead model
          delete leadData.original_closed_by_user_id;  // This field doesn't exist in Lead model
          delete leadData.reverted_to_project_id;
          delete leadData.revert_reason;
          delete leadData.assigned_project_id;
          delete leadData.assigned_agent_id;
          delete leadData.assigned_at;
          delete leadData.assigned_by_user_id;
          delete leadData.assign_reason;
          delete leadData.lead_price;
          delete leadData.offer_ids;
          delete leadData.document_ids;
          delete leadData.reverted_lead_id;
          delete leadData.assigned_lead_id;
          
          // Remove populated/virtual fields that shouldn't be sent to API
          delete leadData.id; // Virtual field
          
          // Sanitize email_from to ensure it matches the Lead model's regex: /^\S+@\S+\.\S+$/
          if (leadData.email_from) {
            const emailRegex = /^\S+@\S+\.\S+$/;
            if (!emailRegex.test(leadData.email_from)) {
              logger.warn('Invalid email_from detected, removing', { email: leadData.email_from, leadId });
              delete leadData.email_from;
            }
          }
          
          // Sanitize secondary_email as well
          if (leadData.secondary_email) {
            const emailRegex = /^\S+@\S+\.\S+$/;
            if (!emailRegex.test(leadData.secondary_email)) {
              logger.warn('Invalid secondary_email detected, removing', { email: leadData.secondary_email, leadId });
              delete leadData.secondary_email;
            }
          }
          
          // Convert fields to string as per validation requirements
          if (leadData.duplicate_status !== undefined && leadData.duplicate_status !== null) {
            leadData.duplicate_status = String(leadData.duplicate_status);
          }
          
          // Convert expected_revenue to string
          if (leadData.expected_revenue !== undefined && leadData.expected_revenue !== null) {
            leadData.expected_revenue = String(leadData.expected_revenue);
          }

          // If team_id or user_id are null (lead was made fresh), get them from ClosedAssignLeads
          if (!leadData.team_id || !leadData.user_id) {
            const closedAssignment = await ClosedAssignLeads.findOne({ closed_lead_id: leadId }).sort({ assigned_at: -1 });
            if (closedAssignment) {
              leadData.team_id = closedAssignment.project_id;
              leadData.user_id = closedAssignment.agent_id;
              logger.info('Restored team_id and user_id from assignment', {
                leadId,
                team_id: leadData.team_id,
                user_id: leadData.user_id
              });
            } else {
              // Use closed_project_id as fallback
              leadData.team_id = closedLead.closed_project_id;
              logger.warn('No assignment found, using closed_project_id', {
                leadId,
                closed_project_id: closedLead.closed_project_id
              });
            }
          }

          // Set status to in_use for reverted leads (restoring to original assignment)
          leadData.use_status = 'in_use';
          leadData.active = true;
          // Don't set _id in the body, use it only in the URL

          // Log the data we're about to send for debugging
          logger.info('Attempting to restore lead to lead-offers-service', {
            leadId: originalLeadId,
            closedLeadId: leadId,
            dataKeys: Object.keys(leadData),
            use_status: leadData.use_status,
            team_id: leadData.team_id,
            user_id: leadData.user_id,
            email_from: leadData.email_from,
            secondary_email: leadData.secondary_email
          });

          // Call lead-offers-service to restore the lead  
          try {
            await axios.put(
              `${LEAD_SERVICE_URL}/leads/${originalLeadId}`,
              leadData,
              {
                headers: {
                  'Authorization': `Bearer ${userToken}`,
                  'Content-Type': 'application/json'
                }
              }
            );
          } catch (apiError) {
            // Log detailed error information including the payload
            logger.error('Failed to update lead in lead-offers-service', {
              leadId: originalLeadId,
              status: apiError.response?.status,
              statusText: apiError.response?.statusText,
              data: apiError.response?.data,
              url: `${LEAD_SERVICE_URL}/leads/${originalLeadId}`,
              sentData: leadData  // Log the data we sent
            });
            throw apiError;
          }

          logger.info('Lead restored to lead-offers-service', {
            closedLeadId: leadId,
            originalLeadId: originalLeadId
          });

          // Revert only activities, todos, and assignments
          // (Offers and termine remain in original collections - no need to revert)
          await this._revertActivities(leadId, originalLeadId, result.stats, userToken);
          await this._revertTodos(leadId, originalLeadId, result.stats, userToken);
          await this._revertAssignments(leadId, originalLeadId, result.stats, userToken);

          // Delete only related closed data (activities, todos, assignments) but keep the ClosedLead record
          await this._deleteClosedLeadRelatedData(leadId, result.stats);

          // NOW mark as reverted AFTER successful restoration (atomic update for race condition protection)
          const updateResult = await ClosedLead.updateOne(
            { _id: leadId, is_reverted: false },
            {
              $set: {
                is_reverted: true,
                reverted_at: new Date(),
                reverted_by_user_id: userId,
                closeLeadStatus: 'revert',
                revert_reason: revertReason || 'admin_revert',
                reverted_to_project_id: projectId || null
              }
            }
          );

          if (updateResult.matchedCount === 0) {
            logger.warn('Lead was already reverted by concurrent request', { leadId });
          }

          result.reverted_count++;
          result.restored_leads.push({
            closedLeadId: leadId,
            originalLeadId: originalLeadId
          });

        } catch (error) {
          logger.error('Error reverting individual lead', {
            leadId,
            error: error.message,
            stack: error.stack
          });
          result.errors.push({
            leadId,
            error: error.message
          });
        }
      }

      logger.info('Completed reverting closed leads', {
        revertedCount: result.reverted_count,
        errorCount: result.errors.length,
        stats: result.stats
      });

      return {
        success: true,
        message: `Successfully reverted ${result.reverted_count} closed leads. Leads are now active and reusable.`,
        ...result
      };
    } catch (error) {
      logger.error('Error in revertClosedLeads', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Revert activities - restore them to lead-offers-service
   */
  async _revertActivities(closedLeadId, originalLeadId, stats, userToken) {
    try {
      const closedActivities = await ClosedActivity.find({ closed_lead_id: closedLeadId });

      for (const closedActivity of closedActivities) {
        const activityData = closedActivity.toObject();
        const originalActivityId = closedActivity.original_activity_id;
        
        delete activityData._id;
        delete activityData.__v;
        delete activityData.closed_lead_id;
        delete activityData.original_activity_id;
        delete activityData.createdAt;
        delete activityData.updatedAt;
        
        // Activities are not moved during closure, only copied as snapshots
        // Original activities remain in the lead-offers-service database
        // No need to restore them via API
        stats.reverted_activities++;
      }
      
      logger.info('Activities remain in original collection', {
        closedLeadId,
        count: closedActivities.length
      });
    } catch (error) {
      logger.error('Error processing activities during revert', {
        closedLeadId,
        error: error.message
      });
    }
  }

  /**
   * Revert todos - restore them to lead-offers-service
   */
  async _revertTodos(closedLeadId, originalLeadId, stats, userToken) {
    try {
      const closedTodos = await ClosedTodo.find({ closed_lead_id: closedLeadId });

      for (const closedTodo of closedTodos) {
        const todoData = closedTodo.toObject();
        const originalTodoId = closedTodo.original_todo_id;
        
        delete todoData._id;
        delete todoData.__v;
        delete todoData.closed_lead_id;
        delete todoData.original_todo_id;
        delete todoData.createdAt;
        delete todoData.updatedAt;
        
        // Todos are not moved during closure, only copied as snapshots
        // Original todos remain in the lead-offers-service database
        // No need to restore them via API
        stats.reverted_todos++;
      }
      
      logger.info('Todos remain in original collection', {
        closedLeadId,
        count: closedTodos.length
      });
    } catch (error) {
      logger.error('Error processing todos during revert', {
        closedLeadId,
        error: error.message
      });
    }
  }

  /**
   * Revert assignments - update status to 'active' in lead-offers-service
   */
  async _revertAssignments(closedLeadId, originalLeadId, stats, userToken) {
    try {
      const closedAssignments = await ClosedAssignLeads.find({ closed_lead_id: closedLeadId });

      for (const closedAssignment of closedAssignments) {
        const originalAssignmentId = closedAssignment.original_assignment_id;
        const projectId = closedAssignment.project_id;
        
        // Update assignment status to 'active' so it shows up in the leads API
        try {
          await axios.patch(
            `${LEAD_SERVICE_URL}/assign-leads/${originalLeadId}/${projectId}/status`,
            { status: 'active' },
            {
              headers: {
                'Authorization': `Bearer ${userToken}`,
                'Content-Type': 'application/json'
              }
            }
          );
          
          logger.info('Assignment status updated to active', {
            assignmentId: originalAssignmentId,
            leadId: originalLeadId,
            projectId
          });
        } catch (updateError) {
          logger.error('Failed to update assignment status', {
            assignmentId: originalAssignmentId,
            leadId: originalLeadId,
            projectId,
            error: updateError.message
          });
        }
        
        stats.reverted_assignments++;
      }
      
      logger.info('Assignments updated to active status', {
        closedLeadId,
        count: closedAssignments.length
      });
    } catch (error) {
      logger.error('Error processing assignments during revert', {
        closedLeadId,
        error: error.message
      });
    }
  }


  /**
   * Delete closed lead related data after successful revert
   * Note: We keep the ClosedLead record itself (marked as reverted) and ClosedOffers/ClosedTermine
   * for historical reference
   */
  async _deleteClosedLeadRelatedData(closedLeadId, stats) {
    try {
      // Delete only activities, todos, and assignments (matching main backend)
      const deletedActivities = await ClosedActivity.deleteMany({ closed_lead_id: closedLeadId });
      stats.deleted_activities = (stats.deleted_activities || 0) + (deletedActivities.deletedCount || 0);

      const deletedTodos = await ClosedTodo.deleteMany({ closed_lead_id: closedLeadId });
      stats.deleted_todos = (stats.deleted_todos || 0) + (deletedTodos.deletedCount || 0);

      const deletedAssignments = await ClosedAssignLeads.deleteMany({ closed_lead_id: closedLeadId });
      stats.deleted_assignments = (stats.deleted_assignments || 0) + (deletedAssignments.deletedCount || 0);

      // NOTE: We do NOT delete ClosedOffer and ClosedTermine - they remain for historical reference
      // This matches the main backend behavior where offers and documents stay in original collections

      logger.debug('Deleted closed lead related data after revert (kept ClosedLead, ClosedOffer, ClosedTermine records)', {
        closedLeadId,
        deletedActivities: deletedActivities.deletedCount || 0,
        deletedTodos: deletedTodos.deletedCount || 0,
        deletedAssignments: deletedAssignments.deletedCount || 0
      });
    } catch (error) {
      logger.error('Error deleting closed lead related data', {
        closedLeadId,
        error: error.message
      });
    }
  }

  /**
   * Assign closed leads to another project
   * Creates new Lead records from ClosedLead data and assigns them
   * Matches the exact logic from main backend's closedLeadsAssignmentService
   * @param {Array} leadIds - Array of closed lead IDs
   * @param {string} projectId - Target project ID
   * @param {string} agentId - Agent ID to assign to
   * @param {string} userId - User ID who is assigning
   * @param {string} assignReason - Reason for assignment
   * @param {number} leadPrice - Price of the lead (optional)
   * @param {string} userToken - JWT token for authentication with lead-offers-service
   * @returns {Promise<Object>} - Result with statistics
   */
  async assignClosedLeads(leadIds, projectId, agentId, userId, assignReason, leadPrice, userToken) {
    try {
      // Input validation (matching main backend)
      if (!agentId) {
        throw new Error('Agent ID is required. Leads must be assigned to an agent.');
      }

      if (!Array.isArray(leadIds) || leadIds.length === 0) {
        throw new Error('Closed lead IDs array is required and cannot be empty.');
      }

      // Validate project and agent
      const project = await Project.findById(projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      if (project.status === 'closed') {
        throw new Error('Cannot assign leads to a closed project');
      }

      const results = {
        successful: [],
        failed: [],
        totalProcessed: 0,
        successCount: 0,
        failureCount: 0,
      };

      logger.info('Assigning closed leads to project', {
        leadIds,
        projectId,
        agentId,
        userId,
        leadPrice
      });

      const settingsStages = await Settings.find({ type: 'stage' }).lean();

      // Process each closed lead
      for (const closedLeadId of leadIds) {
        try {
          // Get closed lead
          const closedLead = await ClosedLead.findById(closedLeadId);
          if (!closedLead) {
            results.failed.push({
              closedLeadId,
              error: 'Closed lead not found',
            });
            continue;
          }

          // Check if closed lead is already reverted
          if (closedLead.is_reverted) {
            results.failed.push({
              closedLeadId,
              error: 'Cannot assign: Closed lead has already been reverted',
            });
            continue;
          }

          // Check if closed lead is fresh (reusable) - only fresh leads can be assigned
          if (closedLead.closeLeadStatus !== 'fresh') {
            results.failed.push({
              closedLeadId,
              error: `Cannot assign: Closed lead is not fresh. Current status: ${closedLead.closeLeadStatus || 'unknown'}. Only leads with status 'fresh' can be used.`,
            });
            continue;
          }

          // Check agent assignment history from ClosedAssignLeads  
          const agentHistory = await ClosedAssignLeads.findOne({
            lead_id: closedLead.lead_id || closedLead.original_lead_id,
            agent_id: agentId,
          });

          if (agentHistory) {
            results.failed.push({
              closedLeadId,
              error: 'This agent was previously assigned to this lead',
            });
            continue;
          }

          // Prepare lead data (matching main backend exactly)
          const leadObj = closedLead.toObject();
          
          // Remove MongoDB internal fields
          delete leadObj._id;
          delete leadObj.__v;
          delete leadObj.createdAt;
          delete leadObj.updatedAt;
          
          // Remove closure-related fields
          delete leadObj.closed_at;
          delete leadObj.closed_by_user_id;
          delete leadObj.closure_reason;
          delete leadObj.is_reverted;
          delete leadObj.reverted_at;
          delete leadObj.reverted_by_user_id;
          delete leadObj.closeLeadStatus;
          delete leadObj.closed_project_id;
          delete leadObj.original_lead_id;
          delete leadObj.original_closure_reason;  // This field doesn't exist in Lead model
          delete leadObj.original_closed_by_user_id;  // This field doesn't exist in Lead model
          delete leadObj.offer_ids;
          delete leadObj.document_ids;
          delete leadObj.reverted_to_project_id;
          delete leadObj.revert_reason;
          delete leadObj.assigned_project_id;
          delete leadObj.assigned_agent_id;
          delete leadObj.assigned_at;
          delete leadObj.assigned_by_user_id;
          delete leadObj.assign_reason;
          delete leadObj.lead_price;
          delete leadObj.reverted_lead_id;
          delete leadObj.assigned_lead_id;
          
          // Remove populated/virtual fields
          delete leadObj.id; // Virtual field
          
          // Sanitize email_from to ensure it matches the Lead model's regex: /^\S+@\S+\.\S+$/
          if (leadObj.email_from) {
            const emailRegex = /^\S+@\S+\.\S+$/;
            if (!emailRegex.test(leadObj.email_from)) {
              logger.warn('Invalid email_from detected in assign, removing', { 
                email: leadObj.email_from, 
                closedLeadId 
              });
              delete leadObj.email_from;
            }
          }
          
          // Sanitize secondary_email as well
          if (leadObj.secondary_email) {
            const emailRegex = /^\S+@\S+\.\S+$/;
            if (!emailRegex.test(leadObj.secondary_email)) {
              logger.warn('Invalid secondary_email detected in assign, removing', { 
                email: leadObj.secondary_email, 
                closedLeadId 
              });
              delete leadObj.secondary_email;
            }
          }
          
          // Convert fields to string as per validation requirements
          if (leadObj.duplicate_status !== undefined && leadObj.duplicate_status !== null) {
            leadObj.duplicate_status = String(leadObj.duplicate_status);
          }
          
          // Convert expected_revenue to string
          if (leadObj.expected_revenue !== undefined && leadObj.expected_revenue !== null) {
            leadObj.expected_revenue = String(leadObj.expected_revenue);
          }

          // When closure stored current_status, send that status and its parent stage to lead-offers
          // (matches UI "current status" / pipeline position at close time)
          if (closedLead.current_status) {
            const pipeline = this._resolveCurrentStatusPipeline(closedLead.current_status, settingsStages);
            if (pipeline) {
              leadObj.status_id = pipeline.status_id;
              leadObj.stage_id = pipeline.stage_id;
              leadObj.status = pipeline.status;
              leadObj.stage = pipeline.stage;
            } else {
              logger.warn('current_status not found in Settings; using snapshot stage/status fields', {
                closedLeadId,
                current_status: closedLead.current_status.toString(),
              });
            }
          }
          delete leadObj.current_status;

          const newLeadData = {
            ...leadObj,
            use_status: 'in_use',
            assigned_date: new Date(),
            team_id: projectId,
            user_id: agentId,
            leadPrice: leadPrice !== null ? leadPrice : closedLead.leadPrice,
            // Clear closure tracking
            project_closed_date: null,
            closure_reason: null,
            active: true,
          };

          // Create or update lead in lead-offers-service
          try {
            await axios.put(
              `${LEAD_SERVICE_URL}/leads/${closedLead.original_lead_id}`,
              newLeadData,
              {
                headers: {
                  'Authorization': `Bearer ${userToken}`,
                  'Content-Type': 'application/json'
                }
              }
            );
          } catch (apiError) {
            // Log detailed error information
            logger.error('Failed to update lead in lead-offers-service during assign', {
              leadId: closedLead.original_lead_id,
              status: apiError.response?.status,
              statusText: apiError.response?.statusText,
              data: apiError.response?.data,
              url: `${LEAD_SERVICE_URL}/leads/${closedLead.original_lead_id}`
            });
            throw apiError;
          }

          logger.info('Lead created/updated in lead-offers-service', {
            closedLeadId,
            originalLeadId: closedLead.original_lead_id
          });

          // Create assignment record via API
          let assignmentId = null;
          try {
            const assignmentResponse = await axios.post(
              `${LEAD_SERVICE_URL}/assign-leads`,
              {
                projectId: projectId,
                leadIds: [closedLead.original_lead_id],
                agentId: agentId,
                notes: assignReason || 'Assigned from closed leads',
                leadPrice: leadPrice || 0
              },
              {
                headers: {
                  'Authorization': `Bearer ${userToken}`,
                  'Content-Type': 'application/json'
                }
              }
            );
            assignmentId = assignmentResponse.data?._id || assignmentResponse.data?.assignment?._id;
            logger.info('Assignment created successfully', {
              leadId: closedLead.original_lead_id,
              projectId,
              agentId,
              assignmentId
            });
          } catch (assignError) {
            logger.error('Error creating assignment record', {
              leadId: closedLead.original_lead_id,
              error: assignError.message,
              status: assignError.response?.status,
              data: assignError.response?.data
            });
          }

          // Update closed lead status to 'in_use' and closeLeadStatus to 'assigned' (matching main backend)
          await ClosedLead.findByIdAndUpdate(closedLeadId, {
            $set: {
              use_status: 'in_use',
              closeLeadStatus: 'assigned',
              assigned_project_id: projectId,
              assigned_agent_id: agentId,
              assigned_at: new Date(),
              assigned_by_user_id: userId,
              assign_reason: assignReason || 'Assigned from closed leads',
              lead_price: leadPrice || null,
            },
          });

          results.successful.push({
            closedLeadId,
            newLeadId: closedLead.original_lead_id,
            assignmentId: assignmentId,
          });

        } catch (error) {
          logger.error('Error assigning closed lead', {
            closedLeadId,
            error: error.message,
            stack: error.stack
          });
          results.failed.push({
            closedLeadId,
            error: error.message
          });
        }
      }

      results.totalProcessed = leadIds.length;
      results.successCount = results.successful.length;
      results.failureCount = results.failed.length;

      logger.info('Completed assigning closed leads', {
        successCount: results.successCount,
        failureCount: results.failureCount
      });

      return {
        success: true,
        message: `Successfully assigned ${results.successCount} closed leads, ${results.failureCount} failed`,
        results,
      };
    } catch (error) {
      logger.error('Error in assignClosedLeads', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Resolve a status id (ClosedLead.current_status) to Lead pipeline fields via Settings stages.
   * @param {import('mongoose').Types.ObjectId|string} currentStatusId
   * @param {object[]} [stagesPreloaded] - Optional preloaded Settings stage docs (avoids N+1 in batch assign)
   * @returns {{ status_id: unknown, stage_id: unknown, status: string, stage: string }|null}
   */
  _resolveCurrentStatusPipeline(currentStatusId, stagesPreloaded) {
    try {
      if (!currentStatusId) return null;
      const targetId = currentStatusId.toString();

      for (const stage of stagesPreloaded || []) {
        if (!stage.info || !Array.isArray(stage.info.statuses)) continue;
        for (const s of stage.info.statuses) {
          const sid = (s._id || s.id)?.toString();
          if (sid === targetId) {
            return {
              status_id: s._id || s.id,
              stage_id: stage._id,
              status: s.name || '',
              stage: stage.name || '',
            };
          }
        }
      }
      return null;
    } catch (error) {
      logger.error('Error resolving current_status pipeline for assign', { error: error.message });
      return null;
    }
  }

  /**
   * Build a map of statusId -> { _id, name, stage, stage_id } from Settings
   * Used to populate current_status in closed lead responses
   */
  async _buildStatusMap(closedLeads) {
    try {
      const statusIds = closedLeads
        .filter((l) => l.current_status)
        .map((l) => l.current_status.toString());

      if (statusIds.length === 0) return {};

      const stages = await Settings.find({ type: 'stage' }).lean();

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
      logger.error('Error building status map for current_status population', { error: error.message });
      return {};
    }
  }
}

module.exports = new ClosedLeadsService();

