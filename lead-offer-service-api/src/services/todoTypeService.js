/**
 * TodoType Service
 * Handles business logic for todo type operations
 * Now uses PredefinedSubTask model instead of TodoType
 */

const mongoose = require('mongoose');
const PredefinedSubTask = require('../models/PredefinedSubTask');
const Todo = require('../models/Todo');
const { NotFoundError, ValidationError, ConflictError } = require('../utils/errorHandler');

class TodoTypeService {
  /**
   * Create a new todo type
   * @param {Object} todoTypeData - Todo type data
   * @param {Object} user - User creating the todo type
   * @returns {Promise<Object>} - Created todo type
   */
  async createTodoType(todoTypeData, user) {
    try {
      const { name, description, status, todo } = todoTypeData;

      // Validate required fields
      if (!name || !name.trim()) {
        throw new ValidationError('Todo type name is required');
      }

      // Check if predefined subtask with same taskTitle already exists
      const existingPredefinedSubTask = await PredefinedSubTask.findOne({
        taskTitle: name.trim(),
      });

      if (existingPredefinedSubTask) {
        throw new ConflictError('Todo type with this name already exists');
      }

      // Validate and process todo array if provided
      let processedTodos = [];
      if (todo && Array.isArray(todo)) {
        for (const todoItem of todo) {
          if (!todoItem.title || !todoItem.title.trim()) {
            throw new ValidationError('Todo title is required for all todos');
          }
          
          // Validate priority if provided
          if (todoItem.priority && !['low', 'medium', 'high'].includes(todoItem.priority)) {
            throw new ValidationError('Todo priority must be one of: low, medium, high');
          }

          // Validate assigned user IDs if provided
          if (todoItem.assigned) {
            const assignedArray = Array.isArray(todoItem.assigned) ? todoItem.assigned : [todoItem.assigned];
            for (const userId of assignedArray) {
              if (!mongoose.Types.ObjectId.isValid(userId)) {
                throw new ValidationError(`Invalid assigned user ID: ${userId}`);
              }
            }
          }

          processedTodos.push({
            title: todoItem.title.trim(),
            description: todoItem.description ? todoItem.description.trim() : undefined,
            priority: todoItem.priority || 'medium',
            dueDate: todoItem.dueDate ? new Date(todoItem.dueDate) : undefined,
            assigned: todoItem.assigned ? (Array.isArray(todoItem.assigned) ? todoItem.assigned : [todoItem.assigned]) : [],
            isCompleted: todoItem.isCompleted || false,
            isDeleted: false,
          });
        }
      }

      // Map TodoType fields to PredefinedSubTask fields
      // name → taskTitle
      // description → taskDescription
      // status → isActive (active = true, inactive = false)
      const isActive = status !== 'inactive'; // Default to true if status is 'active' or undefined

      // Create the predefined subtask
      const predefinedSubTask = new PredefinedSubTask({
        taskTitle: name.trim(),
        taskDescription: description ? description.trim() : undefined,
        isActive: isActive,
        createdBy: user?._id,
        priority: 'medium', // Default priority
        todo: processedTodos,
      });

      const savedPredefinedSubTask = await predefinedSubTask.save();

      // Populate creator information
      await savedPredefinedSubTask.populate({
        path: 'createdBy',
        select: 'login first_name last_name',
      });

      // Transform PredefinedSubTask to TodoType-like response format
      // Filter out deleted todos (isDeleted: true)
      const filteredTodos = (savedPredefinedSubTask.todo || []).filter((t) => !t.isDeleted);
      
      const responseData = {
        _id: savedPredefinedSubTask._id,
        name: savedPredefinedSubTask.taskTitle,
        description: savedPredefinedSubTask.taskDescription,
        status: savedPredefinedSubTask.isActive ? 'active' : 'inactive',
        todo: filteredTodos,
        created_by: savedPredefinedSubTask.createdBy,
        createdAt: savedPredefinedSubTask.createdAt,
        updatedAt: savedPredefinedSubTask.updatedAt,
      };

      return {
        success: true,
        data: responseData,
        message: 'Todo type created successfully',
      };
    } catch (error) {
      if (error instanceof ValidationError || error instanceof ConflictError) {
        throw error;
      }
      throw new Error(`Error creating todo type: ${error.message}`);
    }
  }

  /**
   * Get all todo types with filtering
   * @param {Object} options - Query options
   * @returns {Promise<Object>} - List of todo types
   */
  async getAllTodoTypes(options = {}) {
    try {
      const { status, search, page = 1, limit = 50 } = options;

      // Build query for PredefinedSubTask
      const query = {};

      // Map status to isActive
      if (status) {
        if (status === 'active') {
          query.isActive = true;
        } else if (status === 'inactive') {
          query.isActive = false;
        }
      }

      // Map search to taskTitle and taskDescription
      if (search) {
        query.$or = [
          { taskTitle: { $regex: search, $options: 'i' } },
          { taskDescription: { $regex: search, $options: 'i' } },
        ];
      }

      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Get predefined subtasks with pagination
      const [predefinedSubTasks, total] = await Promise.all([
        PredefinedSubTask.find(query)
          .populate({
            path: 'createdBy',
            select: 'login first_name last_name',
          })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit)),
        PredefinedSubTask.countDocuments(query),
      ]);

      // Transform PredefinedSubTask to TodoType-like response format
      // Filter out deleted todos (isDeleted: true) from each item
      const todoTypes = predefinedSubTasks.map((item) => {
        const filteredTodos = (item.todo || []).filter((t) => !t.isDeleted);
        return {
          _id: item._id,
          name: item.taskTitle,
          description: item.taskDescription,
          status: item.isActive ? 'active' : 'inactive',
          todo: filteredTodos,
          created_by: item.createdBy,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        };
      });

      return {
        success: true,
        data: todoTypes,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
        message: 'Todo types retrieved successfully',
      };
    } catch (error) {
      throw new Error(`Error getting todo types: ${error.message}`);
    }
  }

  /**
   * Get a single todo type by ID
   * @param {string} id - Todo type ID
   * @returns {Promise<Object>} - Todo type
   */
  async getTodoTypeById(id) {
    try {
      const predefinedSubTask = await PredefinedSubTask.findById(id).populate({
        path: 'createdBy',
        select: 'login first_name last_name',
      });

      if (!predefinedSubTask) {
        throw new NotFoundError('Todo type not found');
      }

      // Transform PredefinedSubTask to TodoType-like response format
      // Filter out deleted todos (isDeleted: true)
      const filteredTodos = (predefinedSubTask.todo || []).filter((t) => !t.isDeleted);
      
      const todoType = {
        _id: predefinedSubTask._id,
        name: predefinedSubTask.taskTitle,
        description: predefinedSubTask.taskDescription,
        status: predefinedSubTask.isActive ? 'active' : 'inactive',
        todo: filteredTodos,
        created_by: predefinedSubTask.createdBy,
        createdAt: predefinedSubTask.createdAt,
        updatedAt: predefinedSubTask.updatedAt,
      };

      return {
        success: true,
        data: todoType,
        message: 'Todo type retrieved successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new Error(`Error getting todo type: ${error.message}`);
    }
  }

  /**
   * Update a todo type
   * @param {string} id - Todo type ID
   * @param {Object} updateData - Data to update
   * @param {Object} user - User updating the todo type
   * @returns {Promise<Object>} - Updated todo type
   */
  async updateTodoType(id, updateData, user) {
    try {
      const { name, description, status, todo } = updateData;

      const predefinedSubTask = await PredefinedSubTask.findById(id);

      if (!predefinedSubTask) {
        throw new NotFoundError('Todo type not found');
      }

      // If name is being updated, check for duplicates
      if (name && name.trim() !== predefinedSubTask.taskTitle) {
        const existingPredefinedSubTask = await PredefinedSubTask.findOne({
          taskTitle: name.trim(),
          _id: { $ne: id },
        });

        if (existingPredefinedSubTask) {
          throw new ConflictError('Todo type with this name already exists');
        }

        predefinedSubTask.taskTitle = name.trim();
      }

      if (description !== undefined) {
        predefinedSubTask.taskDescription = description ? description.trim() : undefined;
      }

      if (status && ['active', 'inactive'].includes(status)) {
        predefinedSubTask.isActive = status === 'active';
      }

      // Handle todo array update (smart merge: include _id to update existing, omit _id to create new)
      if (todo !== undefined && Array.isArray(todo)) {
        const existingTodoIds = new Set(
          (predefinedSubTask.todo || []).map((t) => t._id?.toString())
        );

        const processedTodos = [];
        for (const todoItem of todo) {
          const isExistingTodo = todoItem._id && existingTodoIds.has(todoItem._id.toString());

          if (isExistingTodo) {
            // Update existing todo
            const existingTodo = predefinedSubTask.todo.find(
              (t) => t._id.toString() === todoItem._id.toString()
            );
            if (existingTodo) {
              if (todoItem.title !== undefined) {
                if (!todoItem.title || !todoItem.title.trim()) {
                  throw new ValidationError('Todo title cannot be empty');
                }
                existingTodo.title = todoItem.title.trim();
              }
              if (todoItem.description !== undefined) {
                existingTodo.description = todoItem.description ? todoItem.description.trim() : undefined;
              }
              if (todoItem.priority !== undefined) {
                if (!['low', 'medium', 'high'].includes(todoItem.priority)) {
                  throw new ValidationError('Todo priority must be one of: low, medium, high');
                }
                existingTodo.priority = todoItem.priority;
              }
              if (todoItem.dueDate !== undefined) {
                existingTodo.dueDate = todoItem.dueDate ? new Date(todoItem.dueDate) : undefined;
              }
              if (todoItem.assigned !== undefined) {
                const assignedArray = Array.isArray(todoItem.assigned) ? todoItem.assigned : [todoItem.assigned];
                for (const userId of assignedArray) {
                  if (userId && !mongoose.Types.ObjectId.isValid(userId)) {
                    throw new ValidationError(`Invalid assigned user ID: ${userId}`);
                  }
                }
                existingTodo.assigned = assignedArray.filter(Boolean);
              }
              if (todoItem.isCompleted !== undefined) {
                existingTodo.isCompleted = todoItem.isCompleted;
              }
              if (todoItem.isDeleted !== undefined) {
                existingTodo.isDeleted = todoItem.isDeleted;
              }
              existingTodo.updatedAt = new Date();
              processedTodos.push(existingTodo);
            }
          } else {
            // Create new todo
            if (!todoItem.title || !todoItem.title.trim()) {
              throw new ValidationError('Todo title is required for new todos');
            }

            // Validate priority if provided
            if (todoItem.priority && !['low', 'medium', 'high'].includes(todoItem.priority)) {
              throw new ValidationError('Todo priority must be one of: low, medium, high');
            }

            // Validate assigned user IDs if provided
            if (todoItem.assigned) {
              const assignedArray = Array.isArray(todoItem.assigned) ? todoItem.assigned : [todoItem.assigned];
              for (const userId of assignedArray) {
                if (!mongoose.Types.ObjectId.isValid(userId)) {
                  throw new ValidationError(`Invalid assigned user ID: ${userId}`);
                }
              }
            }

            processedTodos.push({
              title: todoItem.title.trim(),
              description: todoItem.description ? todoItem.description.trim() : undefined,
              priority: todoItem.priority || 'medium',
              dueDate: todoItem.dueDate ? new Date(todoItem.dueDate) : undefined,
              assigned: todoItem.assigned ? (Array.isArray(todoItem.assigned) ? todoItem.assigned : [todoItem.assigned]) : [],
              isCompleted: todoItem.isCompleted || false,
              isDeleted: false,
            });
          }
        }

        // Keep all processed todos (including soft-deleted ones) in database
        // Soft-deleted todos (isDeleted: true) will be filtered out in GET responses
        predefinedSubTask.todo = processedTodos;
      }

      if (user?._id) {
        predefinedSubTask.updatedBy = user._id;
      }

      const updatedPredefinedSubTask = await predefinedSubTask.save();

      // Populate creator information
      await updatedPredefinedSubTask.populate({
        path: 'createdBy',
        select: 'login first_name last_name',
      });

      // Transform PredefinedSubTask to TodoType-like response format
      // Filter out deleted todos (isDeleted: true)
      const filteredTodos = (updatedPredefinedSubTask.todo || []).filter((t) => !t.isDeleted);
      
      const responseData = {
        _id: updatedPredefinedSubTask._id,
        name: updatedPredefinedSubTask.taskTitle,
        description: updatedPredefinedSubTask.taskDescription,
        status: updatedPredefinedSubTask.isActive ? 'active' : 'inactive',
        todo: filteredTodos,
        created_by: updatedPredefinedSubTask.createdBy,
        createdAt: updatedPredefinedSubTask.createdAt,
        updatedAt: updatedPredefinedSubTask.updatedAt,
      };

      return {
        success: true,
        data: responseData,
        message: 'Todo type updated successfully',
      };
    } catch (error) {
      if (
        error instanceof NotFoundError ||
        error instanceof ConflictError ||
        error instanceof ValidationError
      ) {
        throw error;
      }
      throw new Error(`Error updating todo type: ${error.message}`);
    }
  }

  /**
   * Update todo type status
   * @param {string} id - Todo type ID
   * @param {string} status - New status
   * @returns {Promise<Object>} - Updated todo type
   */
  async updateTodoTypeStatus(id, status) {
    try {
      if (!['active', 'inactive'].includes(status)) {
        throw new ValidationError('Status must be either "active" or "inactive"');
      }

      const predefinedSubTask = await PredefinedSubTask.findById(id);

      if (!predefinedSubTask) {
        throw new NotFoundError('Todo type not found');
      }

      predefinedSubTask.isActive = status === 'active';
      const updatedPredefinedSubTask = await predefinedSubTask.save();

      // Populate creator information
      await updatedPredefinedSubTask.populate({
        path: 'createdBy',
        select: 'login first_name last_name',
      });

      // Transform PredefinedSubTask to TodoType-like response format
      // Filter out deleted todos (isDeleted: true)
      const filteredTodos = (updatedPredefinedSubTask.todo || []).filter((t) => !t.isDeleted);
      
      const responseData = {
        _id: updatedPredefinedSubTask._id,
        name: updatedPredefinedSubTask.taskTitle,
        description: updatedPredefinedSubTask.taskDescription,
        status: updatedPredefinedSubTask.isActive ? 'active' : 'inactive',
        todo: filteredTodos,
        created_by: updatedPredefinedSubTask.createdBy,
        createdAt: updatedPredefinedSubTask.createdAt,
        updatedAt: updatedPredefinedSubTask.updatedAt,
      };

      return {
        success: true,
        data: responseData,
        message: 'Todo type status updated successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      throw new Error(`Error updating todo type status: ${error.message}`);
    }
  }

  /**
   * Delete a todo type
   * @param {string} id - Todo type ID
   * @returns {Promise<Object>} - Deletion result
   */
  async deleteTodoType(id) {
    try {
      const predefinedSubTask = await PredefinedSubTask.findById(id);

      if (!predefinedSubTask) {
        throw new NotFoundError('Todo type not found');
      }

      // Note: We don't check for todos using this predefined subtask
      // as it's used differently in the task system
      // If needed, we can add a check later

      await PredefinedSubTask.findByIdAndDelete(id);

      return {
        success: true,
        message: 'Todo type deleted successfully',
      };
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      throw new Error(`Error deleting todo type: ${error.message}`);
    }
  }
}

module.exports = new TodoTypeService();

