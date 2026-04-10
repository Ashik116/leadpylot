/**
 * Task Service
 * Handles task creation in Kanban board system locally
 * Uses local models instead of HTTP API calls
 */

const mongoose = require('mongoose');
const Task = require('../models/Task');
const { User } = require('../models');
const {
  processEntityIdsWithLists,
  handleBoardListPairAssociations,
  getPredefinedSubTaskForTask,
} = require('../utils/taskHelpers');
const { getNextTaskPosition } = require('../utils/positionCalculator');
const logger = require('../utils/logger');
const { ValidationError, NotFoundError } = require('../utils/errorHandler');
const { logTaskActivity, TASK_ACTIVITY_ACTIONS } = require('../utils/taskActivityLogger');

class TaskService {
  /**
   * Create a task in the Kanban board system
   * Automatically assigns task to LEAD board when lead_id is provided
   * 
   * @param {Object} taskData - Task data
   * @param {string} taskData.taskTitle - Task title (required)
   * @param {string} [taskData.taskDescription] - Task description
   * @param {string} [taskData.priority] - Priority: 'low', 'medium', 'high'
   * @param {string} taskData.lead_id - Lead ID (required for auto-assignment to LEAD board)
   * @param {string|string[]} [taskData.assigned] - User ID(s) to assign task to
   * @param {string} [taskData.createdBy] - User ID who created the task
   * @param {string} [taskData.status] - Task status
   * @param {Date} [taskData.dueDate] - Due date
   * @param {Array} [taskData.subTask] - Array of subtasks
   * @param {Array} [taskData.labels] - Array of labels
   * @param {Array} [taskData.custom_fields] - Array of custom fields
   * @returns {Promise<Object>} - Created task
   */
  async createTask(taskData) {
    try {
      const {
        taskTitle,
        taskDescription,
        assigned,
        status,
        priority,
        dueDate,
        attachment,
        internalChat,
        subTask,
        labels,
        custom_fields,
        position,
        task_type, // Allow explicit task_type to be passed
        // Entity IDs
        lead_id,
        offer_id,
        opening_id,
        email_id,
        // Entity-specific List IDs (optional - will auto-find Todo list if not provided)
        lead_list_id,
        offer_list_id,
        opening_list_id,
        email_list_id,
        // Direct board/list IDs
        board_id,
        list_id,
        createdBy,
      } = taskData;

      // Basic validation
      if (!taskTitle) {
        throw new ValidationError('taskTitle is required');
      }

      // Validate assigned users if provided
      if (assigned) {
        const users = Array.isArray(assigned) ? assigned : [assigned];
        for (const userId of users) {
          const user = await User.findById(userId);
          if (!user) {
            throw new NotFoundError(`Assigned user ${userId} not found`);
          }
        }
      }

      // Validate priority if provided
      if (priority && !['low', 'medium', 'high'].includes(priority)) {
        throw new ValidationError('Invalid priority value');
      }

      // Collect board IDs and list IDs
      let finalBoardIds = [];
      let finalListIds = [];
      let entityBoardListPairs = [];

      // Determine task_type first (priority: explicit task_type > entity IDs)
      let taskType = 'custom'; // default
      if (task_type) {
        // Use explicitly provided task_type (e.g., determined from offer's current_stage)
        taskType = task_type;
      } else if (offer_id) {
        taskType = 'offer';
      } else if (opening_id) {
        taskType = 'opening';
      } else if (email_id) {
        taskType = 'email';
      } else if (lead_id) {
        taskType = 'lead';
      }

      // Case: Assign boards based on task_type (not entity IDs)
      // This ensures tasks go to the correct board based on their type
      if (taskType !== 'custom') {
        const taskTypeToBoardType = {
          'lead': 'LEAD',
          'offer': 'OFFER',
          'opening': 'OPENING',
          'email': 'EMAIL',
        };
        
        const boardType = taskTypeToBoardType[taskType];
        if (boardType) {
          const { findBoardByType } = require('../utils/taskHelpers');
          const board = await findBoardByType(boardType);
          
          if (board) {
            // Get list ID based on task_type
            let listId = null;
            const listIdFieldMap = {
              'lead': lead_list_id,
              'offer': offer_list_id,
              'opening': opening_list_id,
              'email': email_list_id,
            };
            
            const providedListId = listIdFieldMap[taskType];
            
            if (providedListId) {
              const { validateListExists } = require('../utils/taskHelpers');
              await validateListExists(providedListId);
              listId = new mongoose.Types.ObjectId(providedListId);
            } else {
              // Auto-find the "Todo" list in the board
              const { validateListExists } = require('../utils/taskHelpers');
              const List = require('../models/List');
              const todoList = await List.findOne({
                board_id: board._id,
                types: 'todo',
              }).sort({ position: 1 });
              
              if (todoList) {
                listId = todoList._id;
              }
            }
            
            if (listId) {
              entityBoardListPairs.push({
                boardId: board._id,
                listId: listId,
              });
              
              if (!finalBoardIds.some(id => id.equals(board._id))) {
                finalBoardIds.push(board._id);
              }
              if (!finalListIds.some(id => id.equals(listId))) {
                finalListIds.push(listId);
              }
            }
          }
        }
      }

      // Case: Direct board_id and list_id provided
      if (board_id) {
        const boardIdArray = Array.isArray(board_id) ? board_id : [board_id];
        for (const bId of boardIdArray) {
          const { validateBoardExists } = require('../utils/taskHelpers');
          await validateBoardExists(bId);
          const objectId = new mongoose.Types.ObjectId(bId);
          if (!finalBoardIds.some(id => id.equals(objectId))) {
            finalBoardIds.push(objectId);
          }
        }
      }

      if (list_id) {
        const listIdArray = Array.isArray(list_id) ? list_id : [list_id];
        for (const lId of listIdArray) {
          const { validateListExists } = require('../utils/taskHelpers');
          await validateListExists(lId);
          const objectId = new mongoose.Types.ObjectId(lId);
          if (!finalListIds.some(id => id.equals(objectId))) {
            finalListIds.push(objectId);
          }
        }
      }

      // Process subtasks - handle predefined_subtask_id references
      let processedSubTasks = undefined;
      if (subTask && Array.isArray(subTask)) {
        processedSubTasks = [];
        for (const subTaskItem of subTask) {
          if (subTaskItem.predefined_subtask_id) {
            // Fetch the predefined subtask template
            const predefinedSubTask = await getPredefinedSubTaskForTask(subTaskItem.predefined_subtask_id);
            
            // Process nested todos from template
            // First, get todos from predefined subtask (filter out deleted ones)
            let processedTodos = [];
            if (predefinedSubTask.todo && Array.isArray(predefinedSubTask.todo)) {
              // Filter out todos with isDeleted: true and map to Task model format
              processedTodos = predefinedSubTask.todo
                .filter((t) => !t.isDeleted) // Filter out soft-deleted todos
                .map((t) => {
                  // Handle assigned field: Convert to array format for Task model
                  let assignedArray = [];
                  if (t.assigned) {
                    if (Array.isArray(t.assigned)) {
                      assignedArray = t.assigned.filter(Boolean); // Filter out null/undefined
                    } else {
                      assignedArray = [t.assigned];
                    }
                  }
                  
                  return {
                    _id: new mongoose.Types.ObjectId(),
                    title: t.title,
                    description: t.description || undefined,
                    isCompleted: t.isCompleted || false,
                    priority: t.priority || 'medium',
                    dueDate: t.dueDate ? new Date(t.dueDate) : undefined,
                    assigned: assignedArray, // Array of ObjectIds for Task model
                    isDelete: false,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  };
                });
            }
            
            // If subTaskItem.todo is provided, it overrides the predefined todos
            if (subTaskItem.todo && Array.isArray(subTaskItem.todo) && subTaskItem.todo.length > 0) {
              processedTodos = subTaskItem.todo.map((t) => {
                // Handle assigned field: Convert to array format for Task model
                let assignedArray = [];
                if (t.assigned) {
                  if (Array.isArray(t.assigned)) {
                    assignedArray = t.assigned.filter(Boolean);
                  } else {
                    assignedArray = [t.assigned];
                  }
                }
                
                return {
                  _id: new mongoose.Types.ObjectId(),
                  title: t.title,
                  description: t.description || undefined,
                  isCompleted: t.isCompleted || false,
                  priority: t.priority || 'medium',
                  dueDate: t.dueDate ? new Date(t.dueDate) : undefined,
                  assigned: assignedArray, // Array of ObjectIds for Task model
                  isDelete: false,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                };
              });
            }
            
            // Create a new subtask from the template
            processedSubTasks.push({
              _id: new mongoose.Types.ObjectId(),
              taskTitle: subTaskItem.taskTitle || predefinedSubTask.taskTitle,
              taskDescription: subTaskItem.taskDescription !== undefined ? subTaskItem.taskDescription : predefinedSubTask.taskDescription,
              assigned: subTaskItem.assigned,
              status: subTaskItem.status || 'todo',
              priority: subTaskItem.priority || predefinedSubTask.priority || 'medium',
              dueDate: subTaskItem.dueDate,
              attachment: subTaskItem.attachment || [],
              internalChat: subTaskItem.internalChat || [],
              isCompleted: subTaskItem.isCompleted || false,
              is_predefined: true,
              predefined_subtask_id: new mongoose.Types.ObjectId(subTaskItem.predefined_subtask_id),
              todo: processedTodos,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          } else {
            // Regular subtask
            let processedTodos = [];
            if (subTaskItem.todo && Array.isArray(subTaskItem.todo)) {
              processedTodos = subTaskItem.todo.map((t) => {
                // Handle assigned field: Convert to array format for Task model
                let assignedArray = [];
                if (t.assigned) {
                  if (Array.isArray(t.assigned)) {
                    assignedArray = t.assigned.filter(Boolean);
                  } else {
                    assignedArray = [t.assigned];
                  }
                }
                
                return {
                  _id: new mongoose.Types.ObjectId(),
                  title: t.title,
                  description: t.description || undefined,
                  isCompleted: t.isCompleted || false,
                  priority: t.priority || 'medium',
                  dueDate: t.dueDate ? new Date(t.dueDate) : undefined,
                  assigned: assignedArray, // Array of ObjectIds for Task model
                  isDelete: false,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                };
              });
            }
            processedSubTasks.push({
              _id: new mongoose.Types.ObjectId(),
              taskTitle: subTaskItem.taskTitle,
              taskDescription: subTaskItem.taskDescription,
              assigned: subTaskItem.assigned,
              status: subTaskItem.status,
              priority: subTaskItem.priority || 'medium',
              dueDate: subTaskItem.dueDate,
              attachment: subTaskItem.attachment || [],
              internalChat: subTaskItem.internalChat || [],
              isCompleted: subTaskItem.isCompleted || false,
              is_predefined: false,
              todo: processedTodos,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        }
      }

      // Process labels if provided
      let processedLabels = [];
      if (labels && Array.isArray(labels)) {
        for (const label of labels) {
          if (!label.title) {
            throw new ValidationError('Label title is required');
          }
          processedLabels.push({
            _id: new mongoose.Types.ObjectId(),
            title: label.title,
            color: label.color || '#3b82f6',
            isSelected: label.isSelected !== undefined ? label.isSelected : true,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }

      // Process custom_fields if provided
      let processedCustomFields = [];
      if (custom_fields && Array.isArray(custom_fields)) {
        for (const field of custom_fields) {
          if (!field.title) {
            throw new ValidationError('Custom field title is required');
          }
          let processedTodos = [];
          if (field.todo && Array.isArray(field.todo)) {
            processedTodos = field.todo.map((t) => ({
              _id: new mongoose.Types.ObjectId(),
              title: t.title,
              description: t.description,
              isCompleted: t.isCompleted || false,
              priority: t.priority || 'medium',
              dueDate: t.dueDate,
              assigned: t.assigned,
              createdAt: new Date(),
              updatedAt: new Date(),
            }));
          }
          processedCustomFields.push({
            _id: new mongoose.Types.ObjectId(),
            title: field.title,
            description: field.description,
            value: field.value,
            field_type: field.field_type || 'text',
            options: field.options || [],
            todo: processedTodos,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }

      // Calculate position for tasks in a list
      let calculatedPosition = undefined;
      
      if (finalListIds.length > 0) {
        // Task belongs to a list - calculate position
        if (position !== undefined) {
          // If frontend sends position=0, treat it as "not provided"
          if (typeof position === 'number' && position > 0) {
            calculatedPosition = position;
          } else {
            // Auto-assign position at bottom of first list
            const firstListId = finalListIds[0].toString();
            calculatedPosition = await getNextTaskPosition(firstListId);
          }
        } else {
          // Calculate position at bottom of first list (new tasks go to bottom)
          const firstListId = finalListIds[0].toString();
          calculatedPosition = await getNextTaskPosition(firstListId);
        }
      }
      // If no list_id (independent task), position remains undefined

      // taskType is already determined above (line 98) based on task_type or entity IDs
      // Use it for saving to the task document (no need to redeclare)

      // Auto-assign to creator if no assigned users provided
      let effectiveAssigned = assigned
      if (!effectiveAssigned && createdBy) {
        effectiveAssigned = [createdBy]
      }

      // Create the task
      const taskDataToSave = {
        taskTitle,
        taskDescription,
        assigned: effectiveAssigned || undefined,
        createdBy: createdBy || undefined,
        status,
        subTask: processedSubTasks || undefined,
        labels: processedLabels.length > 0 ? processedLabels : undefined,
        custom_fields: processedCustomFields.length > 0 ? processedCustomFields : undefined,
        priority: priority || 'medium',
        dueDate: dueDate || undefined,
        attachment: attachment || [],
        internalChat: internalChat || [],
        position: calculatedPosition,
        task_type: taskType, // Set task_type based on entity ID
        // Entity IDs
        lead_id: lead_id || undefined,
        offer_id: offer_id || undefined,
        opening_id: opening_id || undefined,
        email_id: email_id || undefined,
      };

      // Add board_id and list_id arrays if they have values
      if (finalBoardIds.length > 0) {
        taskDataToSave.board_id = finalBoardIds;
      }
      if (finalListIds.length > 0) {
        taskDataToSave.list_id = finalListIds;
      }

      const task = await Task.create(taskDataToSave);
      const taskId = task._id;

      // Handle associations for entity ID pairs
      if (entityBoardListPairs.length > 0) {
        await handleBoardListPairAssociations(entityBoardListPairs, taskId);
      }

      // Handle associations for direct board_id + list_id
      if (board_id && list_id) {
        const { addTaskToList, addListToBoard } = require('../utils/taskHelpers');
        const directBoardIds = Array.isArray(board_id) ? board_id : [board_id];
        const directListIds = Array.isArray(list_id) ? list_id : [list_id];
        
        for (const lId of directListIds) {
          const listObjectId = new mongoose.Types.ObjectId(lId);
          // Add task to list
          await addTaskToList(listObjectId, taskId);
          
          // Add list to each board
          for (const bId of directBoardIds) {
            await addListToBoard(new mongoose.Types.ObjectId(bId), listObjectId);
          }
        }
      } else if (list_id && !hasEntityIds) {
        // Case: Only list_id provided without board
        const { addTaskToList } = require('../utils/taskHelpers');
        const listIdArray = Array.isArray(list_id) ? list_id : [list_id];
        for (const lId of listIdArray) {
          await addTaskToList(new mongoose.Types.ObjectId(lId), taskId);
        }
      }

      // Populate and return task
      const populatedTask = await Task.findById(task._id)
        .populate('assigned', 'login email first_name last_name')
        .populate('createdBy', 'login email first_name last_name')
        .populate('board_id', 'name board_type')
        .populate('list_id', 'listTitle types')
        .populate('subTask.assigned', 'login email first_name last_name')
        .lean();

      // Log activity to TaskServiceActivity collection (dual logging)
      // This logs to 'taskserviceactivities' collection in addition to any 'activities' log
      if (createdBy) {
        const boardNames = populatedTask.board_id?.map(b => b.name || b).join(', ') || 'No board';
        const listNames = populatedTask.list_id?.map(l => l.listTitle || l).join(', ') || 'No list';
        
        // Non-blocking activity log
        logTaskActivity(
          createdBy,
          task._id,
          TASK_ACTIVITY_ACTIONS.CREATE,
          `Task "${taskTitle}" created in ${boardNames} > ${listNames}`,
          {
            board_id: populatedTask.board_id,
            list_id: populatedTask.list_id,
            lead_id: lead_id || undefined,
            offer_id: offer_id || undefined,
            opening_id: opening_id || undefined,
            email_id: email_id || undefined,
            task_type: taskType,
            source: 'lead-offer-service',
          }
        ).catch(err => {
          logger.warn('Failed to log task activity (non-blocking)', { error: err.message });
        });
      }

      return {
        success: true,
        message: 'Task created successfully',
        data: populatedTask,
      };
    } catch (error) {
      logger.error('Failed to create task in Kanban board', {
        error: error.message,
        stack: error.stack,
        taskData: {
          taskTitle: taskData?.taskTitle,
          lead_id: taskData?.lead_id,
        },
      });
      
      // Return null to indicate failure, but don't throw
      // This allows todo creation to succeed even if task creation fails
      return null;
    }
  }

  /**
   * Get tasks by lead ID
   * 
   * @param {string} leadId - Lead ID
   * @returns {Promise<Object>} - Tasks for the lead
   */
  async getTasksByLeadId(leadId) {
    try {
      const tasks = await Task.find({ lead_id: leadId })
        .populate('assigned', 'login email first_name last_name')
        .populate('createdBy', 'login email first_name last_name')
        .populate('board_id', 'name board_type')
        .populate('list_id', 'listTitle types')
        .sort({ position: 1 })
        .lean();

      return {
        success: true,
        data: tasks,
      };
    } catch (error) {
      logger.error('Failed to get tasks by lead ID', {
        error: error.message,
        leadId,
      });
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new TaskService();
