/**
 * Todo Service
 * Handles business logic for todo operations
 */

const mongoose = require('mongoose');
const { Todo, Lead, User, Activity, AssignLeads, Email, Offer, Opening, Board } = require('../models');
const { eventEmitter, EVENT_TYPES } = require('./events');
const { AuthorizationError, ValidationError, NotFoundError } = require('../utils/errorHandler');
const { ROLES } = require('../middleware/roles/roleDefinitions');
const logger = require('../utils/logger');
const { createActivity } = require('./activityService/utils');
const { ACTIVITY_TYPES, ACTIVITY_ACTIONS } = require('../models/activity');
const taskServiceClient = require('./taskServiceClient');

class TodoService {
  /**
   * Check if a user has access to a lead based on assignments
   * @param {string} leadId - Lead ID
   * @param {Object} user - User object
   * @returns {Promise<boolean>} - True if user has access
   */
  async hasLeadAccess(leadId, user) {
    if (user.role === ROLES.ADMIN) {
      return true;
    }

    if (user.role === ROLES.AGENT) {
      // Check if the lead is assigned to this agent
      const assignment = await AssignLeads.findOne({
        lead_id: leadId,
        agent_id: user._id,
        status: 'active',
      });
      if (assignment) {
        // const todo = await Todo.findOne({ lead_id: leadId, $or: [{ assigned_to: user._id }, { creator_id: user._id }], active: true });
        // if (!todo) {
        //   return false;
        // }
        return true;
      }

      // Also allow access if agent has temporary read-only access on the lead
      const lead = await Lead.findOne({ _id: leadId, temporary_access_agents: user._id });
      const todo = await Todo.findOne({ lead_id: leadId, $or: [{ assigned_to: user._id }, { creator_id: user._id }], active: true });
      if (!todo) {
        return false;
      }
      return !!(lead && todo);
    }
  }

  /**
   * Check if an agent has other pending todos for a lead (excluding a specific todo)
   * @param {string} agentId - Agent ID
   * @param {string} leadId - Lead ID
   * @param {string} excludeTodoId - Todo ID to exclude from the check
   * @returns {Promise<boolean>} - True if agent has other pending todos
   */
  async _hasOtherPendingTodos(agentId, leadId, excludeTodoId) {
    const otherPendingTodos = await Todo.findOne({
      lead_id: leadId,
      assigned_to: agentId,
      active: true,
      isDone: false,
      _id: { $ne: excludeTodoId },
    });

    return !!otherPendingTodos;
  }

  /**
   * Remove agent from temporary_access_agents if they have no other pending todos
   * @param {string} agentId - Agent ID
   * @param {string} leadId - Lead ID
   * @param {string} excludeTodoId - Todo ID to exclude from the check
   * @returns {Promise<void>}
   */
  async _removeAgentFromTemporaryAccess(agentId, leadId, excludeTodoId) {
    try {
      // Check if agent is an agent (not admin)
      const agent = await User.findById(agentId);
      if (!agent || agent.role !== ROLES.AGENT) {
        return;
      }

      // Check if agent is already assigned to the lead through AssignLeads
      const alreadyAssigned = await AssignLeads.findOne({
        lead_id: leadId,
        agent_id: agentId,
        status: 'active',
      });

      if (alreadyAssigned) {
        // Agent is already assigned, don't remove from temporary_access_agents
        return;
      }

      // Check if agent has other pending todos for this lead
      const hasOtherPendingTodos = await this._hasOtherPendingTodos(
        agentId,
        leadId,
        excludeTodoId
      );

      if (!hasOtherPendingTodos) {
        // Remove agent from temporary_access_agents
        await Lead.updateOne(
          { _id: leadId },
          { $pull: { temporary_access_agents: agentId } }
        );
        logger.info('Removed agent from temporary_access_agents', {
          agentId,
          leadId,
          excludeTodoId,
        });
      }
    } catch (error) {
      logger.error('Error removing agent from temporary_access_agents:', error);
      // Don't throw - this is a cleanup operation
    }
  }

  /**
   * Add agent to temporary_access_agents if they're an agent and not already assigned
   * @param {string} agentId - Agent ID
   * @param {string} leadId - Lead ID
   * @returns {Promise<void>}
   */
  async _addAgentToTemporaryAccess(agentId, leadId) {
    try {
      const agent = await User.findById(agentId);
      if (!agent || agent.role !== ROLES.AGENT) {
        return;
      }

      // Check if agent is already assigned to this lead
      const alreadyAssigned = await AssignLeads.findOne({
        lead_id: leadId,
        agent_id: agentId,
        status: 'active',
      });

      if (!alreadyAssigned) {
        // Add agent to temporary_access_agents
        await Lead.updateOne(
          { _id: leadId },
          { $addToSet: { temporary_access_agents: agentId } }
        );
        logger.info('Added agent to temporary_access_agents', {
          agentId,
          leadId,
        });
      }
    } catch (error) {
      logger.error('Error adding agent to temporary_access_agents:', error);
      // Don't throw - this is a cleanup operation
    }
  }

  /**
   * Calculate human-readable duration between two dates
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {string} - Human-readable duration string (e.g., "2 days 3 hours 15 minutes")
   */
  _calculateDuration(startDate, endDate) {
    if (!startDate || !endDate) {
      return '';
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffMs = end - start;

    if (diffMs < 0) {
      return '';
    }

    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    const parts = [];

    if (diffDays > 0) {
      parts.push(`${diffDays} ${diffDays === 1 ? 'day' : 'days'}`);
    }

    const remainingHours = diffHours % 24;
    if (remainingHours > 0) {
      parts.push(`${remainingHours} ${remainingHours === 1 ? 'hour' : 'hours'}`);
    }

    const remainingMinutes = diffMinutes % 60;
    // For durations > 1 hour, round to nearest minute
    // For durations < 1 hour, show exact minutes and seconds
    if (diffHours === 0) {
      const remainingSeconds = diffSeconds % 60;
      if (remainingMinutes > 0) {
        parts.push(`${remainingMinutes} ${remainingMinutes === 1 ? 'minute' : 'minutes'}`);
      }
      if (remainingSeconds > 0 && remainingMinutes === 0) {
        parts.push(`${remainingSeconds} ${remainingSeconds === 1 ? 'second' : 'seconds'}`);
      }
    } else if (remainingMinutes > 0) {
      parts.push(`${remainingMinutes} ${remainingMinutes === 1 ? 'minute' : 'minutes'}`);
    }

    return parts.length > 0 ? parts.join(' ') : 'Less than a minute';
  }

  /**
   * Create a new todo / ticket
   * @param {Object} todoData - Todo data
   * @param {Object} creator - User creating the todo
   * @returns {Promise<Object>} - Created todo
   */
  async createTodo(todoData, creator) {
    try {
      const { lead_id, offer_id, opening_id, email_id, taskTitle, task_type, taskDescription, todoTypesids, assignto, documents_ids, board_id, list_id, note } = todoData;

      // Basic validation (route already validates at least one entity ID is provided)
      if (!taskTitle) {
        throw new ValidationError('taskTitle is required');
      }

      // Validate at least one entity ID is provided
      if (!lead_id && !offer_id && !opening_id && !email_id) {
        throw new ValidationError('At least one of lead_id, offer_id, opening_id, or email_id must be provided');
      }

      // Determine which entity we're working with and get the related lead_id
      let finalLeadId = lead_id;
      let finalOfferId = offer_id;
      let finalOpeningId = opening_id;
      let finalEmailId = email_id;
      let lead = null;
      let offer = null;
      let email = null;

      // Handle offer_id
      if (offer_id) {
        offer = await Offer.findById(offer_id);
        if (!offer) {
          throw new NotFoundError('Offer not found');
        }
        // Get lead_id from offer
        finalLeadId = offer.lead_id;
        finalOfferId = offer_id;
      }

      // Handle opening_id (opening_id is actually an Offer ID where the offer is in opening stage)
      if (opening_id) {
        // Search for opening in Offer table (not Opening table)
        // If offer was already fetched (from offer_id), validate it matches
        if (offer && offer._id.toString() !== opening_id.toString()) {
          throw new ValidationError('offer_id does not match opening_id');
        }
        
        // Fetch offer if not already fetched
        if (!offer) {
          offer = await Offer.findById(opening_id);
          if (!offer) {
            throw new NotFoundError('Opening not found');
          }
        }
        
        // Validate that this offer is actually in opening stage
        const isOpening = offer.current_stage === 'opening' || (offer.progression?.opening?.active === true);
        if (!isOpening) {
          throw new ValidationError('The provided opening_id does not refer to an offer in opening stage');
        }
        
        // Get lead_id from offer
        finalLeadId = offer.lead_id;
        finalOfferId = opening_id; // opening_id is the offer ID
        finalOpeningId = opening_id; // Store as opening_id for task creation
      }
      
      // Determine task_type based on offer's current_stage if we have an offer
      let determinedTaskType = task_type || null;
      if (offer) {
        const offerStages = ['offer', 'call_1', 'call_2', 'call_3', 'call_4', 'out'];
        const openingStages = ['opening', 'payment', 'netto1', 'netto2', 'confirmation', 'lost'];
        
        if (offerStages.includes(offer.current_stage) && !determinedTaskType) {
          determinedTaskType = 'offer';
        } else if (openingStages.includes(offer.current_stage) && !determinedTaskType) {
          determinedTaskType = 'opening';
        }
      }

      // Handle lead_id (if provided directly or derived from offer/opening)
      if (lead_id) {
        // If lead_id was provided directly, use it (but validate it matches offer/opening if those are also provided)
        if (offer_id && lead_id.toString() !== offer.lead_id.toString()) {
          throw new ValidationError('lead_id does not match the lead associated with the offer');
        }
        if (opening_id && lead_id.toString() !== offer.lead_id.toString()) {
          throw new ValidationError('lead_id does not match the lead associated with the opening');
        }
        finalLeadId = lead_id;
      }

      // Handle email_id - fetch email and get its lead_id
      if (email_id) {
        email = await Email.findById(email_id);
        if (!email) {
          throw new NotFoundError('Email not found');
        }
        // If email has a lead_id, use it (but validate it matches if lead_id was also provided)
        if (email.lead_id) {
          if (lead_id && email.lead_id.toString() !== lead_id.toString()) {
            throw new ValidationError('email_id does not match the provided lead_id');
          }
          if (!finalLeadId) {
            finalLeadId = email.lead_id;
          }
        }
        finalEmailId = email_id;
      }

      // Fetch the lead to validate it exists
      lead = await Lead.findById(finalLeadId);
      if (!lead) {
        throw new NotFoundError('Lead not found');
      }

      // Check if creator has permission to create todo for this lead
      const hasAccess = await this.hasLeadAccess(finalLeadId, creator);
      if (!hasAccess) {
        throw new AuthorizationError('You can only create todos for your assigned leads');
      }

      // Resolve assignee user (ticket owner) - optional
      let assignee = null;
      if (assignto) {
        assignee = await User.findById(assignto);
        if (!assignee) {
          throw new NotFoundError('Assignee user not found');
        }
      }

      // Normalize todoTypesids to array of objects with todoTypeId and isDone
      // Support both old format (array of IDs) and new format (array of objects)
      // This field is now optional
      let normalizedTodoTypes = [];
      if (Array.isArray(todoTypesids) && todoTypesids.length > 0) {
        normalizedTodoTypes = todoTypesids.map((item) => {
          // If it's a string (old format), convert to new format
          if (typeof item === 'string') {
            return {
              todoTypeId: item,
              isDone: false,
            };
          }
          // If it's an object, ensure it has the correct structure
          if (typeof item === 'object' && item !== null) {
            return {
              todoTypeId: item.todoTypeId || item.id || item,
              isDone: item.isDone !== undefined ? item.isDone : false,
            };
          }
          throw new ValidationError('Invalid todoTypesids format');
        });

        // Validate all todoTypeIds are valid MongoDB ObjectIds
        for (const todoType of normalizedTodoTypes) {
          if (!mongoose.Types.ObjectId.isValid(todoType.todoTypeId)) {
            throw new ValidationError('Invalid todoTypeId format');
          }
        }
      }

      // Create a single todo document with multiple types and documents
      const todo = new Todo({
        creator_id: creator._id,
        lead_id: finalLeadId,
        offer_id: finalOfferId || undefined,
        message: taskTitle.trim(),
        isDone: false,
        active: true,
        assigned_to: assignee ? assignee._id : undefined,
        // Track who assigned and when (creator is the assigner on creation)
        assigned_by: assignee ? creator._id : undefined,
        assigned_at: assignee ? new Date() : undefined,
        todoTypesids: normalizedTodoTypes,
        documents_ids: Array.isArray(documents_ids) ? documents_ids : [],
      });

      // If assignee is provided and is an agent and not already assigned to this lead,
      // grant temporary read-only access by adding them to lead.temporary_access_agents.
      if (assignee && assignee.role === ROLES.AGENT) {
        const alreadyAssigned = await AssignLeads.findOne({
          lead_id: finalLeadId,
          agent_id: assignee._id,
          status: 'active',
        });

        if (!alreadyAssigned) {
          await Lead.updateOne(
            { _id: finalLeadId },
            { $addToSet: { temporary_access_agents: assignee._id } }
          );
        }
      }

      const savedTodo = await todo.save();

      // Populate creator, lead, assignee, and todoTypes information
      // Note: todoTypesids.todoTypeId now references PredefinedSubTask
      const populatePaths = [
        { path: 'creator_id', select: 'login first_name last_name' },
        { path: 'lead_id', select: 'contact_name email_from phone' },
        { path: 'todoTypesids.todoTypeId', select: 'name description status' },
      ];

      // Only populate assigned_to and assigned_by if there's an assignee
      if (assignee) {
        populatePaths.push({ path: 'assigned_to', select: 'login first_name last_name' });
        populatePaths.push({ path: 'assigned_by', select: 'login first_name last_name' });
      }

      await savedTodo.populate(populatePaths);

      // Determine if it's a Todo or Ticket based on assignee
      const itemType = assignee ? 'Ticket' : 'Todo';

      // Track activity for todo/ticket creation
      try {
        const creatorName = creator.login || `${creator.first_name || ''} ${creator.last_name || ''}`.trim() || 'Unknown';
        const assigneeName = assignee ? (assignee.login || `${assignee.first_name || ''} ${assignee.last_name || ''}`.trim() || 'Unknown') : null;

        // Determine subject_type based on which entity the todo was created from
        // Priority: opening_id > offer_id > email_id > lead_id
        // But _subject_id should always be the lead_id
        let subjectType = ACTIVITY_TYPES.LEAD; // Default to Lead
        if (finalOpeningId) {
          subjectType = ACTIVITY_TYPES.OPENING;
        } else if (finalOfferId) {
          subjectType = ACTIVITY_TYPES.OFFER;
        } else if (finalEmailId) {
          subjectType = ACTIVITY_TYPES.EMAIL;
        }

        await createActivity({
          _creator: creator._id,
          _subject_id: finalLeadId, // Always use lead_id for subject_id
          subject_type: subjectType, // Use Offer, Opening, or Lead based on source entity
          action: ACTIVITY_ACTIONS.CREATE,
          message: assignee
            ? `${itemType} created and assigned to ${assigneeName} by ${creatorName}`
            : `${itemType} created by ${creatorName}`,
          type: 'info',
          // Todo/Ticket activities are task-related by definition
          is_task: true,
          details: {
            action_type: 'todo_created',
            item_type: itemType.toLowerCase(), // 'todo' or 'ticket'
            todo_id: savedTodo._id,
            message: taskTitle.trim(),
            created_by: {
              id: creator._id,
              name: creatorName,
              role: creator.role,
            },
            assigned_to: assignee ? {
              id: assignee._id,
              name: assigneeName,
              role: assignee.role,
            } : null,
            todo_types: normalizedTodoTypes.length > 0 ? normalizedTodoTypes.map(t => {
              // Get populated todoType data if available
              const todoTypeData = savedTodo.todoTypesids?.find(
                (tt) => {
                  const ttId = tt.todoTypeId?._id?.toString() || tt.todoTypeId?.toString();
                  const tId = t.todoTypeId?.toString() || t.todoTypeId;
                  return ttId === tId;
                }
              );
              return {
                todoTypeId: t.todoTypeId,
                isDone: t.isDone,
                // Include PredefinedSubTask data if populated
                name: todoTypeData?.todoTypeId?.taskTitle || null,
                description: todoTypeData?.todoTypeId?.taskDescription || null,
                status: todoTypeData?.todoTypeId?.isActive ? 'active' : 'inactive',
              };
            }) : [],
            documents_count: Array.isArray(documents_ids) ? documents_ids.length : 0,
          },
        });
      } catch (activityError) {
        // Log error but don't fail the todo creation
        logger.error('Error creating activity log for todo creation:', activityError);
      }

      // Emit events for activity logging and notifications
      eventEmitter.emit(EVENT_TYPES.TODO.CREATED, {
        todo: savedTodo,
        creator,
        lead,
      });

      // Only emit ASSIGNED event if there's an assignee
      if (assignee) {
        eventEmitter.emit(EVENT_TYPES.TODO.ASSIGNED, {
          todo: savedTodo,
          assignee,
          assigner: creator,
        });
      }

      logger.info('Todo ticket created', {
        lead_id: finalLeadId,
        offer_id: finalOfferId,
        opening_id: finalOpeningId,
        createdBy: creator._id,
        assignee: assignee ? assignee._id : null,
        todoTypesids: normalizedTodoTypes,
        itemType,
      });

      // Create corresponding task in Kanban board system (if any entity ID exists)
      if (finalLeadId || finalOfferId || finalOpeningId) {
        try {
          // Prepare subtasks from PredefinedSubTask if todoTypesids are provided
          let subtasks = [];
          if (normalizedTodoTypes && normalizedTodoTypes.length > 0) {
            // Fetch PredefinedSubTask data for each todoTypeId
            const PredefinedSubTask = require('../models/PredefinedSubTask');
            
            for (const todoType of normalizedTodoTypes) {
              try {
                const predefinedSubTask = await PredefinedSubTask.findById(todoType.todoTypeId);
                if (predefinedSubTask) {
                  // Create subtask using predefined_subtask_id reference
                  subtasks.push({
                    predefined_subtask_id: predefinedSubTask._id.toString(),
                    // Optional: You can also include taskTitle for immediate display
                    // The task service will populate from PredefinedSubTask
                  });
                }
              } catch (predefinedError) {
                logger.warn('Failed to fetch PredefinedSubTask for todoType', {
                  todoTypeId: todoType.todoTypeId,
                  error: predefinedError.message,
                });
              }
            }
          }

          // Prepare task data for Kanban board
          // Task will be automatically assigned to appropriate board (LEAD/OFFER/OPENING) via entity IDs
          const taskData = {
            taskTitle: taskTitle.trim(),
            taskDescription: taskDescription ? taskDescription.trim() : '', // Use todo description if provided
            priority: 'medium', // Default priority, can be enhanced later
            lead_id: finalLeadId ? finalLeadId.toString() : undefined,
            offer_id: finalOfferId ? finalOfferId.toString() : undefined,
            email_id: email_id ? email_id.toString() : undefined,
            opening_id: finalOpeningId ? finalOpeningId.toString() : undefined,
            board_id: board_id ? board_id.toString() : undefined,
            list_id: list_id ? list_id.toString() : undefined,
            note: note ? note.trim() : undefined,
            // Assign task to the logged-in user who created the todo (not the todo's assignee)
            assigned: creator._id ? [creator._id.toString()] : undefined,
            createdBy: creator._id.toString(),
            status: 'todo', // Default status
            // Add subtasks from PredefinedSubTask if available
            subTask: subtasks.length > 0 ? subtasks : undefined,
            // Explicitly set task_type based on offer's current_stage if determined
            task_type: determinedTaskType || undefined,
          };

          const taskResult = await taskServiceClient.createTask(taskData);
          
          if (taskResult && taskResult.success) {
            logger.info('Task created in Kanban board', {
              todo_id: savedTodo._id,
              task_id: taskResult.data?._id,
              lead_id: finalLeadId,
              offer_id: finalOfferId,
              opening_id: finalOpeningId,
              subtasks_count: subtasks.length,
            });
            
            // Optionally store task_id in todo for reference (if you add a field)
            // For now, we just log it
          } else {
            logger.warn('Task creation in Kanban board failed or was skipped', {
              todo_id: savedTodo._id,
              lead_id: finalLeadId,
              offer_id: finalOfferId,
              opening_id: finalOpeningId,
            });
          }
        } catch (taskError) {
          // Log error but don't fail todo creation
          logger.error('Error creating task in Kanban board (non-blocking)', {
            error: taskError.message,
            stack: taskError.stack,
            todo_id: savedTodo._id,
            lead_id: finalLeadId,
            offer_id: finalOfferId,
            opening_id: finalOpeningId,
          });
        }
      } else {
        logger.debug('Skipping task creation: No entity IDs provided');
      }

      return {
        success: true,
        data: savedTodo,
        message: 'Todo created successfully',
      };
    } catch (error) {
      logger.error('Error creating todo:', error);
      throw error;
    }
  }

  /**
   * Get all todos with filtering and pagination (excludes auto-generated admin-only todos)
   * @param {Object} user - User making the request
   * @param {Object} options - Query options
   * @returns {Promise<Object>} - Paginated todos
   */
  async getAllTodos(user, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        lead_id,
        creator_id,
        isDone,
        showInactive = false,
        search,
      } = options;

      const skip = (page - 1) * parseInt(limit);
      const query = {};

      // Exclude admin-only auto todos from regular todo view
      query.admin_only = { $ne: true };

      // Build query based on user role
      if (user.role === ROLES.ADMIN) {
        // Admin can see all todos (except admin-only auto todos which have separate endpoint)
        if (creator_id) query.creator_id = creator_id;
      } else if (user.role === ROLES.AGENT) {
        // Agent can see todos for their assigned leads OR todos assigned to them
        const assignments = await AssignLeads.find({
          agent_id: user._id,
          status: 'active',
        }).select('lead_id');
        const leadIds = assignments.map((assignment) => assignment.lead_id);

        query.$or = [
          { lead_id: { $in: leadIds } }, // Todos for assigned leads
          { assigned_to: user._id }, // Todos assigned to them
        ];
      } else {
        throw new AuthorizationError('Insufficient permissions to view todos');
      }

      // Apply filters
      if (lead_id) query.lead_id = lead_id;
      if (isDone !== undefined) query.isDone = isDone === 'true';
      if (!showInactive) query.active = true;

      // Search functionality
      if (search) {
        query.message = { $regex: search, $options: 'i' };
      }

      // Build base query for statistics (without pagination)
      const statsQuery = { ...query };
      delete statsQuery.$or; // Remove $or for stats to get accurate counts

      // For agents, we need to handle the OR condition differently for stats
      if (user.role === ROLES.AGENT) {
        const assignments = await AssignLeads.find({
          agent_id: user._id,
          status: 'active',
        }).select('lead_id');
        const leadIds = assignments.map((assignment) => assignment.lead_id);

        statsQuery.$or = [
          { lead_id: { $in: leadIds } }, // Todos for assigned leads
          { assigned_to: user._id }, // Todos assigned to them
        ];
      }

      const [todos, total, pendingCount, completedCount] = await Promise.all([
        Todo.find(query)
          .populate('temporary_access_agents', 'login first_name last_name')
          .populate('todoTypesids.todoTypeId', 'taskTitle taskDescription isActive priority category tags todo')
          .populate('documents_ids', 'filename filetype size type')
          .populate('creator_id', 'login first_name last_name')
          .populate('lead_id', 'contact_name email_from phone')
          .populate('assigned_to', 'login first_name last_name')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit)),
        Todo.countDocuments(query),
        Todo.countDocuments({ ...statsQuery, isDone: false, active: true }),
        Todo.countDocuments({ ...statsQuery, isDone: true, active: true }),
      ]);

      return {
        success: true,
        data: todos,
        meta: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit)),
        },
        statistics: {
          all_todos_count: total,
          pending_todos_count: pendingCount,
          completed_todos_count: completedCount,
        },
      };
    } catch (error) {
      logger.error('Error getting todos:', error);
      throw error;
    }
  }

  /**
   * Get a single todo by ID
   * @param {string} todoId - Todo ID
   * @param {Object} user - User making the request
   * @returns {Promise<Object>} - Todo data
   */
  async getTodoById(todoId, user) {
    try {
      const todo = await Todo.findById(todoId)
        .populate('creator_id', 'login first_name last_name')
        .populate('lead_id', 'contact_name email_from phone')
        .populate('assigned_to', 'login first_name last_name')
        .populate('documents_ids', 'filename filetype size type')
        .populate('todoTypesids.todoTypeId', 'name description status');

      if (!todo) {
        throw new NotFoundError('Todo not found');
      }

      // Check if user has permission to view this todo
      if (user.role !== ROLES.ADMIN) {
        const hasLeadAccess = await this.hasLeadAccess(todo.lead_id, user);
        const isAssignedToUser =
          todo.assigned_to && todo.assigned_to.toString() === user._id.toString();

        if (!hasLeadAccess && !isAssignedToUser) {
          throw new AuthorizationError(
            'You can only view todos for your assigned leads or todos assigned to you'
          );
        }
      }

      return {
        success: true,
        data: todo,
      };
    } catch (error) {
      logger.error('Error getting todo by ID:', error);
      throw error;
    }
  }

  /**
   * Update a todo
   * @param {string} todoId - Todo ID
   * @param {Object} updateData - Update data
   * @param {Object} user - User making the request
   * @returns {Promise<Object>} - Updated todo
   */
  async updateTodo(todoId, updateData, user) {
    try {
      const todo = await Todo.findById(todoId);

      if (!todo) {
        throw new NotFoundError('Todo not found');
      }

      // Check if user has permission to update this todo
      const hasLeadAccess = await this.hasLeadAccess(todo.lead_id, user);
      const isAssignedToUser =
        todo.assigned_to && todo.assigned_to.toString() === user._id.toString();

      if (user.role !== ROLES.ADMIN) {
        if (user.role === ROLES.AGENT) {
          const isOnlyMarkingDone =
            Object.keys(updateData).length === 1 && updateData.hasOwnProperty('isDone');
          const isOnlyUpdatingTodoTypes =
            Object.keys(updateData).length === 1 && updateData.hasOwnProperty('todoTypesids');

          if (isOnlyMarkingDone) {
            // Agent can mark ANY todo as done if they have lead access OR if it's assigned to them
            if (!hasLeadAccess && !isAssignedToUser) {
              throw new AuthorizationError(
                'You can only mark todos as done for your assigned leads or todos assigned to you'
              );
            }
            logger.info(
              `Agent ${user.id} marking todo ${todoId} as ${updateData.isDone ? 'done' : 'undone'}`
            );
          } else if (isOnlyUpdatingTodoTypes) {
            // Agent can update todoType statuses if the todo is assigned to them
            if (!isAssignedToUser && !hasLeadAccess) {
              throw new AuthorizationError(
                'You can only update todo types for todos assigned to you or your assigned leads'
              );
            }
          } else {
            // For other updates (like message), only allowed if they have lead access
            if (!hasLeadAccess) {
              throw new AuthorizationError(
                'You can only update todo content for your assigned leads'
              );
            }
          }
        }
      }

      // Update allowed fields
      const allowedUpdates = ['message', 'isDone', 'todoTypesids', 'dateOfDone', 'completion_duration', 'type', 'documents_ids'];
      const updates = {};

      allowedUpdates.forEach((field) => {
        if (updateData[field] !== undefined) {
          updates[field] = updateData[field];
        }
      });

      // Ensure type is set correctly based on current assigned_to state
      // (findByIdAndUpdate doesn't trigger pre-save hooks, so we set it explicitly)
      // If type is not explicitly provided in updateData, set it based on current assigned_to
      if (!updates.type) {
        const currentAssignedTo = todo.assigned_to;
        updates.type = currentAssignedTo ? 'Ticket' : 'Todo';
      }

      // Trim message if provided
      if (updates.message) {
        updates.message = updates.message.trim();
      }

      // Handle todoTypesids update - merge with existing todoTypesids
      if (updates.todoTypesids) {
        // Normalize the incoming todoTypesids
        const normalizedTodoTypes = updates.todoTypesids.map((item) => {
          if (typeof item === 'string') {
            return {
              todoTypeId: item,
              isDone: false,
            };
          }
          if (typeof item === 'object' && item !== null) {
            return {
              todoTypeId: item.todoTypeId || item.id || item,
              isDone: item.isDone !== undefined ? item.isDone : false,
            };
          }
          throw new ValidationError('Invalid todoTypesids format');
        });

        // Convert existing todoTypesids to a map for easy lookup
        const existingTodoTypesMap = new Map();
        if (Array.isArray(todo.todoTypesids)) {
          todo.todoTypesids.forEach((item) => {
            const todoTypeId =
              item.todoTypeId?.toString() || item.toString();
            existingTodoTypesMap.set(todoTypeId, {
              todoTypeId: item.todoTypeId || item,
              isDone: item.isDone !== undefined ? item.isDone : false,
            });
          });
        }

        // Merge: update existing ones, add new ones
        normalizedTodoTypes.forEach((newItem) => {
          const todoTypeId = newItem.todoTypeId.toString();
          if (existingTodoTypesMap.has(todoTypeId)) {
            // Update existing - preserve todoTypeId, update isDone
            existingTodoTypesMap.set(todoTypeId, {
              todoTypeId: existingTodoTypesMap.get(todoTypeId).todoTypeId,
              isDone: newItem.isDone,
            });
          } else {
            // Add new
            existingTodoTypesMap.set(todoTypeId, newItem);
          }
        });

        // Convert back to array
        updates.todoTypesids = Array.from(existingTodoTypesMap.values());

        // If all todoTypesids are done, automatically set todo isDone to true
        // Only auto-set if isDone wasn't explicitly provided in updateData
        if (!updateData.hasOwnProperty('isDone') && updates.todoTypesids.length > 0) {
          const allTodoTypesDone = updates.todoTypesids.every(
            (item) => item.isDone === true
          );
          if (allTodoTypesDone) {
            updates.isDone = true;
          }
        }
      }

      // Handle temporary_access_agents when isDone status changes
      if (updates.hasOwnProperty('isDone') && todo.assigned_to) {
        const wasDone = todo.isDone;
        const willBeDone = updates.isDone;

        if (!wasDone && willBeDone) {
          // Todo is being marked as done - remove agent if no other pending todos
          await this._removeAgentFromTemporaryAccess(
            todo.assigned_to,
            todo.lead_id,
            todoId
          );
        } else if (wasDone && !willBeDone) {
          // Todo is being marked as undone - add agent back if they're an agent
          await this._addAgentToTemporaryAccess(todo.assigned_to, todo.lead_id);
        }
      }

      const updatedTodo = await Todo.findByIdAndUpdate(todoId, updates, {
        new: true,
        runValidators: true,
      })
        .populate('creator_id', 'login first_name last_name')
        .populate('lead_id', 'contact_name email_from phone')
        .populate('assigned_to', 'login first_name last_name')
        .populate('todoTypesids.todoTypeId', 'name description status');

      // Determine if it's a Todo or Ticket based on assignee
      const itemType = updatedTodo.assigned_to ? 'Ticket' : 'Todo';

      // Track activity for todo/ticket update
      try {
        const updaterName = user.login || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown';
        const assigneeName = updatedTodo.assigned_to
          ? (updatedTodo.assigned_to.login || `${updatedTodo.assigned_to.first_name || ''} ${updatedTodo.assigned_to.last_name || ''}`.trim() || 'Unknown')
          : null;

        // Build update details
        const updateDetails = {
          action_type: 'todo_updated',
          item_type: itemType.toLowerCase(),
          todo_id: updatedTodo._id,
          updated_by: {
            id: user._id,
            name: updaterName,
            role: user.role,
          },
        };

        // Track what was updated
        if (updates.message !== undefined) {
          updateDetails.message_changed = true;
          updateDetails.old_message = todo.message;
          updateDetails.new_message = updates.message;
        }

        if (updates.isDone !== undefined) {
          updateDetails.status_changed = true;
          updateDetails.old_status = todo.isDone ? 'done' : 'pending';
          updateDetails.new_status = updates.isDone ? 'done' : 'pending';
        }

        if (updates.todoTypesids !== undefined) {
          updateDetails.todo_types_updated = true;
          updateDetails.todo_types = updates.todoTypesids.map(t => ({
            todoTypeId: t.todoTypeId,
            isDone: t.isDone,
          }));
        }

        if (assigneeName) {
          updateDetails.assigned_to = {
            id: updatedTodo.assigned_to._id,
            name: assigneeName,
            role: updatedTodo.assigned_to.role,
          };
        }

        // Build activity message
        let activityMessage = `${itemType} updated by ${updaterName}`;
        if (updates.isDone !== undefined) {
          activityMessage = `${itemType} marked as ${updates.isDone ? 'done' : 'pending'} by ${updaterName}`;
        } else if (updates.message !== undefined) {
          activityMessage = `${itemType} message updated by ${updaterName}`;
        } else if (updates.todoTypesids !== undefined) {
          activityMessage = `${itemType} types updated by ${updaterName}`;
        }

        await createActivity({
          _creator: user._id,
          _subject_id: todo.lead_id,
          subject_type: ACTIVITY_TYPES.LEAD,
          action: ACTIVITY_ACTIONS.UPDATE,
          message: activityMessage,
          type: 'info',
          details: updateDetails,
        });
      } catch (activityError) {
        // Log error but don't fail the todo update
        logger.error('Error creating activity log for todo update:', activityError);
      }

      const lead = await Lead.findById(todo.lead_id);

      if (updateData.isDone === true) {
        eventEmitter.emit(EVENT_TYPES.TODO.COMPLETED, {
          todo: updatedTodo,
          originalTodo: todo,
          updater: user,
        });
      }
      else {
        eventEmitter.emit(EVENT_TYPES.TODO.UPDATED, {
          todo: updatedTodo,
          lead: lead,
          originalTodo: todo,
          updater: user,
        });
      }
      // Emit event for activity logging

      return {
        success: true,
        data: updatedTodo,
        message: 'Todo updated successfully',
      };
    } catch (error) {
      logger.error('Error updating todo:', error);
      throw error;
    }
  }

  /**
   * Delete a todo (soft delete)
   * @param {string} todoId - Todo ID
   * @param {Object} user - User making the request
   * @returns {Promise<Object>} - Success message
   */
  async deleteTodo(todoId, user) {
    try {
      const todo = await Todo.findById(todoId);

      if (!todo) {
        throw new NotFoundError('Todo not found');
      }

      // Check if user has permission to delete this todo
      if (user.role !== ROLES.ADMIN) {
        if (user.role === ROLES.AGENT) {
          // Agent can only delete todos they created themselves
          if (todo.creator_id.toString() !== user._id.toString()) {
            throw new AuthorizationError('You can only delete todos that you created');
          }
        }
      }

      // Before soft-deleting, remove agent from temporary_access_agents if needed
      // Only remove if the todo is not done (pending) and has an assignee
      if (todo.assigned_to && !todo.isDone) {
        await this._removeAgentFromTemporaryAccess(
          todo.assigned_to,
          todo.lead_id,
          todoId
        );
      }

      // Soft delete - set active to false
      const deletedTodo = await Todo.findByIdAndUpdate(todoId, { active: false }, { new: true })
        .populate('creator_id', 'login first_name last_name')
        .populate('lead_id', 'contact_name email_from phone')
        .populate('assigned_to', 'login first_name last_name');

      // Determine if it's a Todo or Ticket based on assignee
      const itemType = deletedTodo.assigned_to ? 'Ticket' : 'Todo';

      // Track activity for todo/ticket deletion
      try {
        const deleterName = user.login || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown';
        const assigneeName = deletedTodo.assigned_to
          ? (deletedTodo.assigned_to.login || `${deletedTodo.assigned_to.first_name || ''} ${deletedTodo.assigned_to.last_name || ''}`.trim() || 'Unknown')
          : null;

        await createActivity({
          _creator: user._id,
          _subject_id: deletedTodo.lead_id,
          subject_type: ACTIVITY_TYPES.LEAD,
          action: ACTIVITY_ACTIONS.DELETE,
          message: `${itemType} deleted by ${deleterName}`,
          type: 'info',
          details: {
            action_type: 'todo_deleted',
            item_type: itemType.toLowerCase(),
            todo_id: deletedTodo._id,
            message: deletedTodo.message,
            deleted_by: {
              id: user._id,
              name: deleterName,
              role: user.role,
            },
            assigned_to: assigneeName ? {
              id: deletedTodo.assigned_to._id,
              name: assigneeName,
              role: deletedTodo.assigned_to.role,
            } : null,
          },
        });
      } catch (activityError) {
        // Log error but don't fail the todo deletion
        logger.error('Error creating activity log for todo deletion:', activityError);
      }

      // Emit event for activity logging
      eventEmitter.emit(EVENT_TYPES.TODO.DELETED, {
        todo: deletedTodo,
        deleter: user,
      });

      return {
        success: true,
        message: 'Todo deleted successfully',
      };
    } catch (error) {
      logger.error('Error deleting todo:', error);
      throw error;
    }
  }

  /**
   * Get todos for a specific lead
   * @param {string} leadId - Lead ID
   * @param {Object} user - User making the request
   * @param {Object} options - Query options
   * @returns {Promise<Object>} - Todos for the lead
   */
  async getTodosByLeadId(leadId, user, options = {}) {
    try {
      const { isDone, showInactive = false } = options;

      // Check if lead exists and user has access
      const lead = await Lead.findById(leadId);
      if (!lead) {
        throw new NotFoundError('Lead not found');
      }

      // Check permissions
      const hasAccess = await this.hasLeadAccess(leadId, user);
      if (!hasAccess) {
        throw new AuthorizationError('You can only view todos for your assigned leads');
      }

      const query = { lead_id: leadId };

      if (isDone !== undefined) query.isDone = isDone === 'true';
      if (!showInactive) query.active = true;

      const [todos, total, pendingCount, completedCount] = await Promise.all([
        Todo.find(query)
          .populate('creator_id', 'login first_name last_name')
          .populate('assigned_to', 'login first_name last_name')
          .populate('todoTypesids.todoTypeId', 'taskTitle taskDescription isActive priority category tags todo')
          .sort({ createdAt: -1 }),
        Todo.countDocuments(query),
        Todo.countDocuments({ ...query, isDone: false, active: true }),
        Todo.countDocuments({ ...query, isDone: true, active: true }),
      ]);

      return {
        success: true,
        data: todos,
        meta: {
          total: todos.length,
          lead_id: leadId,
        },
        statistics: {
          all_todos_count: total,
          pending_todos_count: pendingCount,
          completed_todos_count: completedCount,
        },
      };
    } catch (error) {
      logger.error('Error getting todos by lead ID:', error);
      throw error;
    }
  }

  /**
   * Mark todo as done/undone
   * @param {string} todoId - Todo ID
   * @param {boolean} isDone - Done status
   * @param {Object} user - User making the request
   * @returns {Promise<Object>} - Updated todo
   */
  async toggleTodoStatus(todoId, isDone, user) {
    try {
      const todo = await Todo.findById(todoId)
        .populate('creator_id', 'login first_name last_name')
        .populate('assigned_to', 'login first_name last_name')
        .populate('lead_id', 'contact_name email_from phone');

      if (!todo) {
        throw new NotFoundError('Todo not found');
      }

      // Determine if it's a Todo or Ticket based on assignee
      const itemType = todo.assigned_to ? 'Ticket' : 'Todo';


      // Prepare update data with dateOfDone and completion_duration
      const updateData = { isDone };

      // When isDone becomes true, set dateOfDone and calculate completion_duration
      if (isDone && !todo.isDone) {
        const now = new Date();
        updateData.dateOfDone = now;
        updateData.completion_duration = this._calculateDuration(todo.createdAt, now);
      }
      // Note: When isDone becomes false, we keep dateOfDone and completion_duration for historical record

      // Track activity for status toggle
      try {
        const userName = user.login || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown';
        const assigneeName = todo.assigned_to
          ? (todo.assigned_to.login || `${todo.assigned_to.first_name || ''} ${todo.assigned_to.last_name || ''}`.trim() || 'Unknown')
          : null;

        // Build activity message based on user role and status change
        let activityMessage = '';
        if (user.role === ROLES.AGENT && isDone) {
          // Agent marking as done - emphasize completion
          if (todo.assigned_to && todo.assigned_to._id.toString() === user._id.toString()) {
            activityMessage = `Agent ${userName} completed ${itemType.toLowerCase()}`;
          } else {
            activityMessage = `Agent ${userName} marked ${itemType.toLowerCase()} as done`;
          }
        } else if (user.role === ROLES.AGENT && !isDone) {
          // Agent marking as pending
          activityMessage = `Agent ${userName} marked ${itemType.toLowerCase()} as pending`;
        } else {
          // Admin or other roles
          activityMessage = `${itemType} marked as ${isDone ? 'done' : 'pending'} by ${userName}`;
        }

        const activityDetails = {
          action_type: 'todo_status_toggled',
          item_type: itemType.toLowerCase(),
          todo_id: todo._id,
          old_status: todo.isDone ? 'done' : 'pending',
          new_status: isDone ? 'done' : 'pending',
          toggled_by: {
            id: user._id,
            name: userName,
            role: user.role,
          },
          assigned_to: assigneeName ? {
            id: todo.assigned_to._id,
            name: assigneeName,
            role: todo.assigned_to.role,
          } : null,
        };

        // Add completion flag for agents marking as done
        if (user.role === ROLES.AGENT && isDone) {
          activityDetails.agent_completed = true;
          activityDetails.completed_by_agent = {
            id: user._id,
            name: userName,
            role: user.role,
          };
          // If agent is the assignee, mark as self-completed
          if (todo.assigned_to && todo.assigned_to._id.toString() === user._id.toString()) {
            activityDetails.self_completed = true;
          }
        }

        // Add completion duration to activity details if todo is being marked as done
        if (isDone && !todo.isDone && updateData.completion_duration) {
          activityDetails.completion_duration = updateData.completion_duration;
          activityDetails.dateOfDone = updateData.dateOfDone;
        }

        await createActivity({
          _creator: user._id,
          _subject_id: todo.lead_id,
          subject_type: ACTIVITY_TYPES.LEAD,
          action: ACTIVITY_ACTIONS.STATUS_CHANGE,
          message: activityMessage,
          type: 'info',
          details: activityDetails,
        });
      } catch (activityError) {
        // Log error but don't fail the status toggle
        logger.error('Error creating activity log for todo status toggle:', activityError);
      }
      await this.updateTodo(todoId, updateData, user);

      // Handle temporary access based on status change for agents
      if (user.role === ROLES.AGENT) {
        if (isDone && !todo.isDone) {
          // Agent is marking the todo as done (false → true) - remove temporary access
          await this._removeAgentFromTemporaryAccess(user._id, todo.lead_id, todoId);
          logger.info('Agent temporary access removed from lead after marking todo as done', {
            agentId: user._id,
            leadId: todo.lead_id,
            todoId: todoId,
          });
        } else if (!isDone && todo.isDone) {
          // Agent is marking the todo as not done (true → false) - add temporary access
          await this._addAgentToTemporaryAccess(user._id, todo.lead_id);
          logger.info('Agent temporary access granted to lead after marking todo as not done', {
            agentId: user._id,
            leadId: todo.lead_id,
            todoId: todoId,
          });
        }
      }
      return

    } catch (error) {
      logger.error('Error toggling todo status:', error);
      throw error;
    }
  }

  /**
   * Assign a todo to a specific user
   * @param {string} todoId - Todo ID
   * @param {string} assigneeId - User ID to assign todo to
   * @param {Object} assigner - User making the assignment
   * @returns {Promise<Object>} - Updated todo
   */
  async assignTodo(todoId, assigneeId, assigner) {
    try {
      const todo = await Todo.findById(todoId);

      if (!todo) {
        throw new NotFoundError('Todo not found');
      }

      // Check if user has permission to assign this todo
      if (assigner.role !== ROLES.ADMIN) {
        if (assigner.role === ROLES.AGENT) {
          // Agent can assign todos for their assigned leads OR todos they created
          const hasAccess = await this.hasLeadAccess(todo.lead_id, assigner);
          const isCreator = todo.creator_id.toString() === assigner._id.toString();

          if (!hasAccess && !isCreator) {
            throw new AuthorizationError(
              'You can only assign todos for your assigned leads or todos you created'
            );
          }
        }
      }

      // Verify assignee exists and is valid
      const assignee = await User.findById(assigneeId);
      if (!assignee) {
        throw new NotFoundError('Assignee not found');
      }

      // Admins can self-assign and assign to other admins
      // Agents cannot self-assign if they already have lead access
      if (assigner.role !== ROLES.ADMIN) {
        if (assignee._id.toString() === assigner._id.toString()) {
          const hasLeadAccess = await this.hasLeadAccess(todo.lead_id, assignee);
          if (hasLeadAccess) {
            throw new ValidationError(
              'Cannot assign todo to yourself when you already have access through lead assignment'
            );
          }
        }
      }

      const updatedTodo = await Todo.findByIdAndUpdate(
        todoId,
        {
          assigned_to: assigneeId,
          assigned_by: assigner._id,
          assigned_at: new Date(),
          type: 'Ticket',
        },
        { new: true, runValidators: true }
      )
        .populate('creator_id', 'login first_name last_name')
        .populate('lead_id', 'contact_name email_from phone')
        .populate('assigned_to', 'login first_name last_name')
        .populate('assigned_by', 'login first_name last_name');

      // Add assignee to temporary_access_agents if needed
      // Only add if the todo is not done (pending)
      if (!updatedTodo.isDone) {
        await this._addAgentToTemporaryAccess(assigneeId, todo.lead_id);
      }

      // Track activity for todo/ticket assignment
      try {
        const assignerName = assigner.login || `${assigner.first_name || ''} ${assigner.last_name || ''}`.trim() || 'Unknown';
        const assigneeName = assignee.login || `${assignee.first_name || ''} ${assignee.last_name || ''}`.trim() || 'Unknown';
        const previousAssigneeId = todo.assigned_to ? todo.assigned_to.toString() : null;

        await createActivity({
          _creator: assigner._id,
          _subject_id: todo.lead_id,
          subject_type: ACTIVITY_TYPES.LEAD,
          action: ACTIVITY_ACTIONS.ASSIGN,
          message: `Ticket assigned to ${assigneeName} by ${assignerName}`,
          type: 'info',
          details: {
            action_type: 'todo_assigned',
            item_type: 'ticket', // When assigned, it becomes a ticket
            todo_id: updatedTodo._id,
            message: updatedTodo.message,
            assigned_by: {
              id: assigner._id,
              name: assignerName,
              role: assigner.role,
            },
            assigned_to: {
              id: assignee._id,
              name: assigneeName,
              role: assignee.role,
            },
            previous_assignee: previousAssigneeId,
          },
        });
      } catch (activityError) {
        // Log error but don't fail the assignment
        logger.error('Error creating activity log for todo assignment:', activityError);
      }

      // Emit event for activity logging
      eventEmitter.emit(EVENT_TYPES.TODO.ASSIGNED, {
        todo: updatedTodo,
        assignee,
        assigner,
      });

      return {
        success: true,
        data: updatedTodo,
        message: 'Todo assigned successfully',
      };
    } catch (error) {
      logger.error('Error assigning todo:', error);
      throw error;
    }
  }

  /**
   * Unassign a todo from current assignee
   * @param {string} todoId - Todo ID
   * @param {Object} user - User making the request
   * @returns {Promise<Object>} - Updated todo
   */
  async unassignTodo(todoId, user) {
    try {
      const todo = await Todo.findById(todoId);

      if (!todo) {
        throw new NotFoundError('Todo not found');
      }

      if (!todo.assigned_to) {
        throw new ValidationError('Todo is not currently assigned');
      }

      // Check if user has permission to unassign this todo
      if (user.role !== ROLES.ADMIN) {
        if (user.role === ROLES.AGENT) {
          // Agent can unassign if they assigned it OR if they have lead access OR if it's assigned to them
          const hasLeadAccess = await this.hasLeadAccess(todo.lead_id, user);
          const isCreator = todo.creator_id.toString() === user._id.toString();
          const isAssignee = todo.assigned_to.toString() === user._id.toString();

          if (!hasLeadAccess && !isCreator && !isAssignee) {
            throw new AuthorizationError(
              'You can only unassign todos for your assigned leads, todos you created, or todos assigned to you'
            );
          }
        }
      }

      const previousAssignee = await User.findById(todo.assigned_to);

      // Before unassigning, remove previous assignee from temporary_access_agents if needed
      // Only remove if the todo is not done (pending)
      if (previousAssignee && !todo.isDone) {
        await this._removeAgentFromTemporaryAccess(
          todo.assigned_to,
          todo.lead_id,
          todoId
        );
      }

      const updatedTodo = await Todo.findByIdAndUpdate(
        todoId,
        { $unset: { assigned_to: 1 }, type: 'Todo' },
        { new: true, runValidators: true }
      )
        .populate('creator_id', 'login first_name last_name')
        .populate('lead_id', 'contact_name email_from phone')
        .populate('assigned_to', 'login first_name last_name');

      // Track activity for todo/ticket unassignment
      try {
        const unassignerName = user.login || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown';
        const previousAssigneeName = previousAssignee
          ? (previousAssignee.login || `${previousAssignee.first_name || ''} ${previousAssignee.last_name || ''}`.trim() || 'Unknown')
          : 'Unknown';

        await createActivity({
          _creator: user._id,
          _subject_id: todo.lead_id,
          subject_type: ACTIVITY_TYPES.LEAD,
          action: ACTIVITY_ACTIONS.UPDATE,
          message: `Ticket unassigned from ${previousAssigneeName} by ${unassignerName}`,
          type: 'info',
          details: {
            action_type: 'todo_unassigned',
            item_type: 'todo', // When unassigned, it becomes a todo
            todo_id: updatedTodo._id,
            message: updatedTodo.message,
            unassigned_by: {
              id: user._id,
              name: unassignerName,
              role: user.role,
            },
            previous_assignee: previousAssignee ? {
              id: previousAssignee._id,
              name: previousAssigneeName,
              role: previousAssignee.role,
            } : null,
          },
        });
      } catch (activityError) {
        // Log error but don't fail the unassignment
        logger.error('Error creating activity log for todo unassignment:', activityError);
      }

      // Emit event for activity logging
      eventEmitter.emit(EVENT_TYPES.TODO.UNASSIGNED, {
        todo: updatedTodo,
        previousAssignee,
        unassigner: user,
      });

      return {
        success: true,
        data: updatedTodo,
        message: 'Todo unassigned successfully',
      };
    } catch (error) {
      logger.error('Error unassigning todo:', error);
      throw error;
    }
  }

  /**
   * Reassign a todo to a different user
   * @param {string} todoId - Todo ID
   * @param {string} newAssigneeId - New user ID to assign todo to
   * @param {Object} assigner - User making the reassignment
   * @returns {Promise<Object>} - Updated todo
   */
  async reassignTodo(todoId, newAssigneeId, assigner) {
    try {
      const todo = await Todo.findById(todoId);

      if (!todo) {
        throw new NotFoundError('Todo not found');
      }

      if (!todo.assigned_to) {
        throw new ValidationError('Todo is not currently assigned');
      }

      // Check if user has permission to reassign this todo
      if (assigner.role !== ROLES.ADMIN) {
        if (assigner.role === ROLES.AGENT) {
          // Agent can reassign if they assigned it OR if they have lead access
          const hasLeadAccess = await this.hasLeadAccess(todo.lead_id, assigner);
          const isCreator = todo.creator_id.toString() === assigner._id.toString();

          if (!hasLeadAccess && !isCreator) {
            throw new AuthorizationError(
              'You can only reassign todos for your assigned leads or todos you created'
            );
          }
        }
      }

      // Verify new assignee exists and is valid
      const newAssignee = await User.findById(newAssigneeId);
      if (!newAssignee) {
        throw new NotFoundError('New assignee not found');
      }

      const previousAssignee = await User.findById(todo.assigned_to);

      // Before reassigning, remove previous assignee from temporary_access_agents if needed
      // Only remove if the todo is not done (pending)
      if (previousAssignee && !todo.isDone) {
        await this._removeAgentFromTemporaryAccess(
          todo.assigned_to,
          todo.lead_id,
          todoId
        );
      }

      const updatedTodo = await Todo.findByIdAndUpdate(
        todoId,
        {
          assigned_to: newAssigneeId,
          assigned_by: assigner._id,
          assigned_at: new Date(),
          type: 'Ticket',
        },
        { new: true, runValidators: true }
      )
        .populate('creator_id', 'login first_name last_name')
        .populate('lead_id', 'contact_name email_from phone')
        .populate('assigned_to', 'login first_name last_name')
        .populate('assigned_by', 'login first_name last_name');

      // After reassigning, add new assignee to temporary_access_agents if needed
      // Only add if the todo is not done (pending)
      if (!updatedTodo.isDone) {
        await this._addAgentToTemporaryAccess(newAssigneeId, todo.lead_id);
      }

      // Track activity for todo/ticket reassignment
      try {
        const assignerName = assigner.login || `${assigner.first_name || ''} ${assigner.last_name || ''}`.trim() || 'Unknown';
        const newAssigneeName = newAssignee.login || `${newAssignee.first_name || ''} ${newAssignee.last_name || ''}`.trim() || 'Unknown';
        const previousAssigneeName = previousAssignee
          ? (previousAssignee.login || `${previousAssignee.first_name || ''} ${previousAssignee.last_name || ''}`.trim() || 'Unknown')
          : 'Unknown';

        await createActivity({
          _creator: assigner._id,
          _subject_id: todo.lead_id,
          subject_type: ACTIVITY_TYPES.LEAD,
          action: ACTIVITY_ACTIONS.ASSIGN,
          message: `Ticket reassigned from ${previousAssigneeName} to ${newAssigneeName} by ${assignerName}`,
          type: 'info',
          details: {
            action_type: 'todo_reassigned',
            item_type: 'ticket',
            todo_id: updatedTodo._id,
            message: updatedTodo.message,
            reassigned_by: {
              id: assigner._id,
              name: assignerName,
              role: assigner.role,
            },
            previous_assignee: previousAssignee ? {
              id: previousAssignee._id,
              name: previousAssigneeName,
              role: previousAssignee.role,
            } : null,
            new_assignee: {
              id: newAssignee._id,
              name: newAssigneeName,
              role: newAssignee.role,
            },
          },
        });
      } catch (activityError) {
        // Log error but don't fail the reassignment
        logger.error('Error creating activity log for todo reassignment:', activityError);
      }

      // Emit event for activity logging
      eventEmitter.emit(EVENT_TYPES.TODO.REASSIGNED, {
        todo: updatedTodo,
        previousAssignee,
        newAssignee,
        assigner,
      });

      return {
        success: true,
        data: updatedTodo,
        message: 'Todo reassigned successfully',
      };
    } catch (error) {
      logger.error('Error reassigning todo:', error);
      throw error;
    }
  }

  /**
   * Get auto-generated admin todos (separate from regular todos)
   * @param {Object} user - Admin user making the request
   * @param {Object} options - Query options
   * @returns {Promise<Object>} - Paginated auto todos
   */
  async getAdminAutoTodos(user, options = {}) {
    try {
      // Only admins can view admin auto todos
      if (user.role !== ROLES.ADMIN) {
        throw new AuthorizationError('Only admins can view auto-generated admin todos');
      }

      const {
        page = 1,
        limit = 20,
        isDone,
        offer_id,
        template_id,
        assigned_to,
        priority,
        search,
        sortBy = 'priority',
        sortOrder = 'desc',
      } = options;

      const skip = (page - 1) * parseInt(limit);
      const query = {
        todo_type: 'offer_auto',
        active: true,
      };

      // Apply filters
      if (isDone !== undefined) query.isDone = isDone === 'true';
      if (offer_id) query.offer_id = offer_id;
      if (template_id) query.template_id = template_id;
      if (assigned_to) query.assigned_to = assigned_to;
      if (priority) query.priority = priority;

      // Search functionality
      if (search) {
        query.message = { $regex: search, $options: 'i' };
      }

      // Build sort object with default priority sorting
      const sort = {};
      if (sortBy === 'priority') {
        sort.priority = sortOrder === 'asc' ? 1 : -1;
        sort.createdAt = -1; // Secondary sort by creation date
      } else {
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
      }

      const [todos, total, pendingCount, completedCount] = await Promise.all([
        Todo.find(query)
          .populate('creator_id', 'login first_name last_name')
          .populate('lead_id', 'contact_name email_from phone')
          .populate('offer_id', 'title investment_volume')
          .populate('assigned_to', 'login first_name last_name')
          .populate('template_id', 'name description priority')
          .sort(sort)
          .skip(skip)
          .limit(parseInt(limit)),
        Todo.countDocuments(query),
        Todo.countDocuments({ ...query, isDone: false }),
        Todo.countDocuments({ ...query, isDone: true }),
      ]);

      return {
        success: true,
        data: todos,
        meta: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit)),
        },
        statistics: {
          all_todos_count: total,
          pending_todos_count: pendingCount,
          completed_todos_count: completedCount,
        },
      };
    } catch (error) {
      logger.error('Error getting admin auto todos:', error);
      throw error;
    }
  }

  /**
   * Assign an admin auto todo to an agent (makes it visible to them)
   * @param {string} todoId - Todo ID
   * @param {string} agentId - Agent ID to assign to
   * @param {Object} user - Admin user making the assignment
   * @returns {Promise<Object>} - Updated todo
   */
  async assignAdminTodoToAgent(todoId, agentId, user) {
    try {
      // Only admins can assign admin todos
      if (user.role !== ROLES.ADMIN) {
        throw new AuthorizationError('Only admins can assign admin todos to agents');
      }

      const todo = await Todo.findById(todoId);
      if (!todo) {
        throw new NotFoundError('Todo not found');
      }

      if (todo.todo_type !== 'offer_auto') {
        throw new ValidationError('Can only assign auto-generated admin todos through this method');
      }

      // Verify agent exists and has access to the lead
      const agent = await User.findById(agentId);
      if (!agent) {
        throw new NotFoundError('Agent not found');
      }

      // Check if agent has access to the lead
      const hasAccess = await this.hasLeadAccess(todo.lead_id, agent);
      if (!hasAccess) {
        throw new AuthorizationError('Agent must have access to the lead to be assigned this todo');
      }

      // Update the todo
      const updatedTodo = await Todo.findByIdAndUpdate(
        todoId,
        {
          assigned_to: agentId,
          admin_only: false, // Make it visible to the agent
        },
        { new: true, runValidators: true }
      )
        .populate('creator_id', 'login first_name last_name')
        .populate('lead_id', 'contact_name email_from phone')
        .populate('offer_id', 'title investment_volume')
        .populate('assigned_to', 'login first_name last_name')
        .populate('template_id', 'name description priority');

      // Emit assignment event
      eventEmitter.emit(EVENT_TYPES.TODO.ASSIGNED, {
        todo: updatedTodo,
        assignee: agent,
        assigner: user,
        isAdminAutoTodo: true,
      });

      logger.info('Admin auto todo assigned to agent', {
        todoId,
        agentId,
        assignedBy: user._id,
        leadId: todo.lead_id,
        offerId: todo.offer_id,
      });

      return {
        success: true,
        data: updatedTodo,
        message: 'Admin todo assigned to agent successfully',
      };
    } catch (error) {
      logger.error('Error assigning admin todo to agent:', error);
      throw error;
    }
  }

  /**
   * Make an admin auto todo admin-only again (remove agent assignment)
   * @param {string} todoId - Todo ID
   * @param {Object} user - Admin user making the change
   * @returns {Promise<Object>} - Updated todo
   */
  async makeAdminTodoAdminOnly(todoId, user) {
    try {
      // Only admins can manage admin todo visibility
      if (user.role !== ROLES.ADMIN) {
        throw new AuthorizationError('Only admins can manage admin todo visibility');
      }

      const todo = await Todo.findById(todoId);
      if (!todo) {
        throw new NotFoundError('Todo not found');
      }

      if (todo.todo_type !== 'offer_auto') {
        throw new ValidationError('Can only manage auto-generated admin todos through this method');
      }

      const previousAssignee = todo.assigned_to ? await User.findById(todo.assigned_to) : null;

      // Update the todo
      const updatedTodo = await Todo.findByIdAndUpdate(
        todoId,
        {
          admin_only: true,
          $unset: { assigned_to: 1 }, // Remove assignment
        },
        { new: true, runValidators: true }
      )
        .populate('creator_id', 'login first_name last_name')
        .populate('lead_id', 'contact_name email_from phone')
        .populate('offer_id', 'title investment_volume')
        .populate('template_id', 'name description priority');

      // Emit unassignment event if there was a previous assignee
      if (previousAssignee) {
        eventEmitter.emit(EVENT_TYPES.TODO.UNASSIGNED, {
          todo: updatedTodo,
          previousAssignee,
          unassigner: user,
          isAdminAutoTodo: true,
        });
      }

      logger.info('Admin auto todo made admin-only', {
        todoId,
        changedBy: user._id,
        previousAssignee: previousAssignee?._id,
      });

      return {
        success: true,
        data: updatedTodo,
        message: 'Todo is now admin-only',
      };
    } catch (error) {
      logger.error('Error making admin todo admin-only:', error);
      throw error;
    }
  }

  /**
   * Get todos by offer ID (for admin to see all todos related to an offer)
   * @param {string} offerId - Offer ID
   * @param {Object} user - User making the request
   * @param {Object} options - Query options
   * @returns {Promise<Object>} - Todos for the offer
   */
  async getTodosByOfferId(offerId, user, options = {}) {
    try {
      // Only admins can view todos by offer ID
      if (user.role !== ROLES.ADMIN) {
        throw new AuthorizationError('Only admins can view todos by offer ID');
      }

      const { isDone, sortBy = 'priority', sortOrder = 'desc' } = options;

      const query = { offer_id: offerId, active: true };

      if (isDone !== undefined) query.isDone = isDone === 'true';

      // Build sort object
      const sort = {};
      if (sortBy === 'priority') {
        sort.priority = sortOrder === 'asc' ? 1 : -1;
        sort.createdAt = -1; // Secondary sort
      } else {
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
      }

      const [todos, total, pendingCount, completedCount] = await Promise.all([
        Todo.find(query)
          .populate('creator_id', 'login first_name last_name')
          .populate('lead_id', 'contact_name email_from phone')
          .populate('assigned_to', 'login first_name last_name')
          .populate('template_id', 'name description priority')
          .sort(sort),
        Todo.countDocuments(query),
        Todo.countDocuments({ ...query, isDone: false }),
        Todo.countDocuments({ ...query, isDone: true }),
      ]);

      return {
        success: true,
        data: todos,
        meta: {
          total: todos.length,
          offer_id: offerId,
        },
        statistics: {
          all_todos_count: total,
          pending_todos_count: pendingCount,
          completed_todos_count: completedCount,
        },
      };
    } catch (error) {
      logger.error('Error getting todos by offer ID:', error);
      throw error;
    }
  }

  /**
   * Get admin todos grouped by lead and offer for hierarchical display
   * @param {Object} user - Admin user making the request
   * @param {Object} options - Query options
   * @returns {Promise<Object>} - Grouped todos data
   */
  async getAdminTodosGrouped(user, options = {}) {
    try {
      // Only admins can view grouped admin todos
      if (user.role !== ROLES.ADMIN) {
        throw new AuthorizationError('Only admins can view grouped admin todos');
      }

      const {
        page = 1,
        limit = 20,
        isDone,
        search,
        sortBy = 'priority',
        sortOrder = 'desc',
      } = options;

      const skip = (page - 1) * parseInt(limit);

      // Build aggregation pipeline to group todos by lead and offer
      const pipeline = [
        // Match admin todos
        {
          $match: {
            todo_type: 'offer_auto',
            active: true,
            ...(isDone !== undefined && { isDone: isDone === 'true' }),
          }
        },

        // Lookup lead data
        {
          $lookup: {
            from: 'leads',
            localField: 'lead_id',
            foreignField: '_id',
            as: 'lead'
          }
        },

        // Lookup offer data
        {
          $lookup: {
            from: 'offers',
            localField: 'offer_id',
            foreignField: '_id',
            as: 'offer'
          }
        },

        // Lookup creator data
        {
          $lookup: {
            from: 'users',
            localField: 'creator_id',
            foreignField: '_id',
            as: 'creator'
          }
        },

        // Lookup assigned user data
        {
          $lookup: {
            from: 'users',
            localField: 'assigned_to',
            foreignField: '_id',
            as: 'assignedUser'
          }
        },

        // Lookup template data
        {
          $lookup: {
            from: 'todotemplates',
            localField: 'template_id',
            foreignField: '_id',
            as: 'template'
          }
        },

        // Unwind lookups
        { $unwind: { path: '$lead', preserveNullAndEmptyArrays: true } },
        { $unwind: { path: '$offer', preserveNullAndEmptyArrays: true } },
        { $unwind: { path: '$creator', preserveNullAndEmptyArrays: true } },
        { $unwind: { path: '$assignedUser', preserveNullAndEmptyArrays: true } },
        { $unwind: { path: '$template', preserveNullAndEmptyArrays: true } },

        // Apply search filter if provided
        ...(search ? [{
          $match: {
            $or: [
              { 'lead.contact_name': { $regex: search, $options: 'i' } },
              { 'offer.title': { $regex: search, $options: 'i' } },
              { 'message': { $regex: search, $options: 'i' } }
            ]
          }
        }] : []),

        // Project needed fields - minimize data transfer
        {
          $project: {
            _id: 1,
            message: 1,
            isDone: 1,
            priority: 1,
            admin_only: 1,
            due_date: 1,
            createdAt: 1,
            updatedAt: 1,
            lead_id: '$lead._id',
            offer_id: '$offer._id',
            lead: {
              _id: '$lead._id',
              contact_name: '$lead.contact_name',
              email_from: '$lead.email_from',
              phone: '$lead.phone'
            },
            offer: {
              _id: '$offer._id',
              title: '$offer.title',
              investment_volume: '$offer.investment_volume'
            },
            creator: {
              _id: '$creator._id',
              first_name: '$creator.first_name',
              last_name: '$creator.last_name'
            },
            assignedUser: {
              $cond: {
                if: { $ne: ['$assignedUser._id', null] },
                then: {
                  _id: '$assignedUser._id',
                  first_name: '$assignedUser.first_name',
                  last_name: '$assignedUser.last_name'
                },
                else: null
              }
            },
            template: {
              $cond: {
                if: { $ne: ['$template._id', null] },
                then: {
                  _id: '$template._id',
                  name: '$template.name',
                  priority: '$template.priority'
                },
                else: null
              }
            }
          }
        },

        // Group by lead and offer combination first
        {
          $group: {
            _id: {
              lead_id: '$lead_id',
              offer_id: '$offer_id'
            },
            lead: { $first: '$lead' },
            offer: { $first: '$offer' },
            todos: { $push: '$$ROOT' },
            todoCount: { $sum: 1 }
          }
        },

        // Now group by lead, collecting offers with their todos
        {
          $group: {
            _id: '$_id.lead_id',
            lead: { $first: '$lead' },
            offers: {
              $push: {
                offer: '$offer',
                todos: '$todos',
                todoCount: '$todoCount'
              }
            },
            totalTodos: { $sum: '$todoCount' },
            pendingTodos: {
              $sum: {
                $size: {
                  $filter: {
                    input: '$todos',
                    cond: { $eq: ['$$this.isDone', false] }
                  }
                }
              }
            },
            completedTodos: {
              $sum: {
                $size: {
                  $filter: {
                    input: '$todos',
                    cond: { $eq: ['$$this.isDone', true] }
                  }
                }
              }
            }
          }
        },


        // Sort leads by contact name
        {
          $sort: {
            'lead.contact_name': 1
          }
        },

        // Add pagination
        {
          $facet: {
            data: [
              { $skip: skip },
              { $limit: parseInt(limit) }
            ],
            totalCount: [
              { $count: 'count' }
            ]
          }
        }
      ];

      const [result] = await Todo.aggregate(pipeline);
      const leadsWithTodos = result.data || [];
      const total = result.totalCount[0]?.count || 0;

      // Clean up the data structure and sort offers within each lead
      const processedLeads = leadsWithTodos.map(leadGroup => {
        // Sort offers by title for consistent ordering
        const sortedOffers = leadGroup.offers
          .map(offerGroup => ({
            offer: offerGroup.offer,
            todos: offerGroup.todos
              .map(todo => ({
                _id: todo._id,
                message: todo.message,
                isDone: todo.isDone,
                priority: todo.priority,
                admin_only: todo.admin_only,
                due_date: todo.due_date,
                createdAt: todo.createdAt,
                updatedAt: todo.updatedAt,
                creator: todo.creator,
                assignedUser: todo.assignedUser,
                template: todo.template
              }))
              .sort((a, b) => b.priority - a.priority), // Sort todos by priority (highest first)
            todoCount: offerGroup.todoCount
          }))
          .sort((a, b) => a.offer.title.localeCompare(b.offer.title)); // Sort offers by title

        return {
          _id: leadGroup._id,
          lead: leadGroup.lead,
          offers: sortedOffers,
          totalTodos: leadGroup.totalTodos,
          pendingTodos: leadGroup.pendingTodos,
          completedTodos: leadGroup.completedTodos
        };
      });

      return {
        success: true,
        data: processedLeads,
        meta: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit)),
        },
        statistics: {
          total_leads_with_todos: total,
          total_todos: processedLeads.reduce((sum, lead) => sum + lead.totalTodos, 0),
          total_pending: processedLeads.reduce((sum, lead) => sum + lead.pendingTodos, 0),
          total_completed: processedLeads.reduce((sum, lead) => sum + lead.completedTodos, 0),
        },
      };
    } catch (error) {
      logger.error('Error getting grouped admin todos:', error);
      throw error;
    }
  }


  /**
 * Get current user's tasks (email tasks and assigned todos)
 * @param {Object} user - Current user
 * @returns {Object} - User's tasks with email and lead details
 */
  async getMyTasks(user) {
    try {
      // Build query to find tasks assigned to or created by the user
      const query = {
        active: true,
        $or: [
          { assigned_to: user._id },
          { creator_id: user._id },
        ],
      };

      // Fetch todos with populated fields
      const todos = await Todo.find(query)
        .populate('assigned_to', '_id login')
        .populate('creator_id', '_id login')
        .populate('lead_id', '_id contact_name email_from phone')
        .sort({ createdAt: -1, isDone: 1 }) // Pending tasks first, then by creation date
        .lean();

      // Enrich with email details for email_tasks
      const enrichedTodos = await Promise.all(
        todos.map(async (todo) => {
          if (todo.email_id) {
            try {
              const email = await Email.findById(todo.email_id)
                .select('subject from_email message_id conversation_id')
                .lean();

              return {
                ...todo,
                email_subject: email?.subject,
                email_from: email?.from_email,
              };
            } catch (err) {
              logger.warn(`Failed to fetch email ${todo.email_id} for todo ${todo._id}:`, err.message);
              return todo;
            }
          }
          return todo;
        })
      );

      return {
        success: true,
        data: enrichedTodos,
        meta: {
          total: enrichedTodos.length,
          pending: enrichedTodos.filter((t) => !t.isDone).length,
          completed: enrichedTodos.filter((t) => t.isDone).length,
        },
      };
    } catch (error) {
      logger.error('Error getting user tasks:', error);
      throw error;
    }
  }

  /**
   * Get all members of a board by board_type (LEAD or OFFER)
   * @param {string} boardType - Board type ('lead' or 'offer')
   * @param {Object} user - User making the request
   * @returns {Promise<Object>} - Board members with metadata
   */
  async getBoardMembersByType(boardType, user) {
    try {
      // Validate board_type
      const validTypes = ['lead', 'offer', 'opening', 'email'];
      const normalizedType = boardType ? boardType.toLowerCase() : null;

      if (!normalizedType || !validTypes.includes(normalizedType)) {
        throw new ValidationError(
          `Invalid board_type. Must be one of: ${validTypes.join(', ')}`
        );
      }

      // Find the board by board_type and is_system=true
      const board = await Board.findOne({
        board_type: normalizedType.toUpperCase(),
        is_system: true,
      });

      if (!board) {
        throw new NotFoundError(
          `${normalizedType.toUpperCase()} board not found`
        );
      }

      // Check if user has permission to view board members
      // Allow: board creator, board members, and admins
      const isCreator = board.created_by && board.created_by.toString() === user._id.toString();
      const isMember = board.members && board.members.some(
        (member) => member.user_id && member.user_id.toString() === user._id.toString()
      );

      if (!isCreator && !isMember && user.role !== ROLES.ADMIN) {
        throw new AuthorizationError(
          'You do not have permission to view members of this board'
        );
      }

      // Extract user IDs from board members, filtering out null/undefined values
      const memberUserIds = board.members
        ? board.members
            .map((member) => member.user_id)
            .filter((id) => id != null) // Filter out null/undefined
        : [];

      // Include board creator in the results if not already in members
      if (board.created_by) {
        const creatorId = board.created_by.toString();
        if (!memberUserIds.some((id) => id && id.toString() === creatorId)) {
          memberUserIds.push(board.created_by);
        }
      }

      // If no members, return empty array
      if (memberUserIds.length === 0) {
        return {
          success: true,
          message: 'No members found for this board',
          data: [],
        };
      }

      // Find all users associated with the board (all roles)
      const users = await User.find({
        _id: { $in: memberUserIds },
      })
        .select('_id login email first_name last_name avatar role')
        .lean();

      // Add additional metadata to each user
      const usersWithMetadata = users.map((user) => {
        const isBoardCreator = board.created_by
          ? board.created_by.toString() === user._id.toString()
          : false;
        const memberData = board.members
          ? board.members.find(
              (m) => m.user_id && m.user_id.toString() === user._id.toString()
            )
          : null;

        return {
          ...user,
          isCreator: isBoardCreator,
          joinedAt: memberData ? memberData.joined_at : null,
        };
      });

      logger.info(`Board members retrieved for ${normalizedType} board`, {
        boardId: board._id,
        boardType: normalizedType,
        memberCount: usersWithMetadata.length,
        requestedBy: user._id,
      });

      return {
        success: true,
        message: 'Board members retrieved successfully',
        data: usersWithMetadata,
      };
    } catch (error) {
      logger.error('Error getting board members by type:', error);
      throw error;
    }
  }
}

module.exports = new TodoService();
