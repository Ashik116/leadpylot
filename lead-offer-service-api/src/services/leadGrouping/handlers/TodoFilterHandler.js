/**
 * Todo Filter Handler
 * Handles todo-related filtering and adding todos to results
 */

const Todo = require('../../../models/Todo');
const { AssignLeads, User } = require('../../../models');
const { ROLES } = require('../../../middleware/roles/roleDefinitions');

class TodoFilterHandler {
  constructor(user) {
    this.user = user;
  }

  /**
   * Derive todo flags from filters
   * @param {Array} filters - Array of filter objects
   * @returns {Object} - Todo flags object
   */
  deriveTodoFlags(filters) {
    const flags = {
      has_todo: this._hasFilterValue(filters, 'has_todo'),
      has_extra_todo: this._hasFilterValue(filters, 'has_extra_todo'),
      has_assigned_todo: this._hasFilterValue(filters, 'has_assigned_todo'),
      pending_todos: this._hasFilterValue(filters, 'pending_todos'),
      done_todos: this._hasFilterValue(filters, 'done_todos'),
    };

    // Suppress has_todo if conflicting filters present
    const shouldSuppressHasTodo =
      flags.done_todos || flags.pending_todos || flags.has_extra_todo || flags.has_assigned_todo;

    if (shouldSuppressHasTodo) {
      flags.has_todo = false;
    }

    return flags;
  }

  /**
   * Check if filter has true value
   * @private
   */
  _hasFilterValue(filters, field) {
    return (filters || []).some(
      (f) => f && f.field === field && (f.value === true || f.value === 'true')
    );
  }

  /**
   * Add filtered todos to lead results
   * @param {Array} leads - Array of lead objects
   * @param {Object} todoFilters - Object indicating which todo filters are applied
   * @returns {Promise<Array>} - Leads with filtered todos added
   */
  async addTodosToResults(leads, todoFilters) {
    const leadIds = leads.map((lead) => lead._id);

    // Initialize todo maps
    const extraTodoMap = {};
    const assignedTodoMap = {};
    const activeTodoMap = {};

    // Fetch extra todos (assigned TO the user) if needed
    if (todoFilters.has_extra_todo) {
      const extraTodos = await this._fetchExtraTodos(leadIds);
      this._buildTodoMap(extraTodos, extraTodoMap);
    }

    // Fetch assigned todos (assigned BY the user to others) if needed
    if (todoFilters.has_assigned_todo) {
      const assignedTodos = await this._fetchAssignedTodos(leadIds);
      this._buildTodoMap(assignedTodos, assignedTodoMap);
    }

    // Fetch active todos if any todo filter is present
    if (todoFilters.has_todo || todoFilters.has_extra_todo || todoFilters.has_assigned_todo) {
      const activeTodos = await this._fetchActiveTodos(leadIds, todoFilters);
      this._buildTodoMap(activeTodos, activeTodoMap);
    }

    // Add todos to each lead
    return leads.map((lead) => {
      const leadId = lead._id.toString();
      const updatedLead = { ...lead };

      if (todoFilters.has_todo || todoFilters.has_extra_todo || todoFilters.has_assigned_todo) {
        updatedLead.activeTodos = activeTodoMap[leadId] || [];
      }

      if (todoFilters.has_extra_todo) {
        updatedLead.extraTodos = extraTodoMap[leadId] || [];
      }

      if (todoFilters.has_assigned_todo) {
        updatedLead.assignedTodos = assignedTodoMap[leadId] || [];
      }

      return updatedLead;
    });
  }

  /**
   * Fetch extra todos (assigned TO user)
   * @private
   */
  async _fetchExtraTodos(leadIds) {
    let extraTodoQuery = {
      lead_id: { $in: leadIds },
      active: true,
      isDone: false,
    };

    if (this.user.role === ROLES.ADMIN) {
      const adminUsers = await User.find({ role: ROLES.ADMIN }).select('_id');
      const adminIds = adminUsers.map((admin) => admin._id);
      extraTodoQuery.assigned_to = { $in: adminIds };
    } else if (this.user.role === ROLES.AGENT) {
      const assignments = await AssignLeads.find({
        agent_id: this.user._id,
        status: 'active',
      }).select('lead_id');
      const assignedLeadIds = assignments.map((assignment) => assignment.lead_id);

      extraTodoQuery.$or = [
        { lead_id: { $in: assignedLeadIds }, assigned_to: this.user._id },
        { lead_id: { $in: leadIds }, assigned_to: this.user._id },
      ];
    } else {
      return [];
    }

    return await Todo.find(extraTodoQuery)
      .populate('creator_id', '_id login role')
      .populate('assigned_to', '_id login role')
      .sort({ isDone: 1, createdAt: -1 })
      .lean();
  }

  /**
   * Fetch assigned todos (assigned BY user to others)
   * @private
   */
  async _fetchAssignedTodos(leadIds) {
    let assignedTodoQuery = {
      lead_id: { $in: leadIds },
      creator_id: this.user._id,
      assigned_to: { $ne: null, $ne: this.user._id },
      active: true,
    };

    if (this.user.role === ROLES.AGENT) {
      const assignments = await AssignLeads.find({
        agent_id: this.user._id,
        status: 'active',
      }).select('lead_id');
      const assignedLeadIds = assignments.map((assignment) => assignment.lead_id);
      assignedTodoQuery.lead_id = { $in: assignedLeadIds };
    }

    return await Todo.find(assignedTodoQuery)
      .populate('creator_id', '_id login role')
      .populate('assigned_to', '_id login role')
      .sort({ isDone: 1, createdAt: -1 })
      .lean();
  }

  /**
   * Fetch active todos
   * @private
   */
  async _fetchActiveTodos(leadIds, todoFilters) {
    const activeTodoQuery = {
      lead_id: { $in: leadIds },
      active: true,
    };

    // Apply pending/done filters
    if (todoFilters.pending_todos) {
      activeTodoQuery.isDone = false;
    } else if (todoFilters.done_todos) {
      activeTodoQuery.isDone = true;
    } else {
      activeTodoQuery.isDone = false; // Default: only pending
    }

    return await Todo.find(activeTodoQuery)
      .populate('creator_id', '_id login role')
      .populate('assigned_to', '_id login role')
      .sort({ isDone: 1, createdAt: -1 })
      .lean();
  }

  /**
   * Build todo map by lead ID
   * @private
   */
  _buildTodoMap(todos, todoMap) {
    todos.forEach((todo) => {
      const leadId = todo.lead_id.toString();
      if (!todoMap[leadId]) {
        todoMap[leadId] = [];
      }
      todoMap[leadId].push(this._formatTodoObject(todo));
    });
  }

  /**
   * Format todo object for response
   * @private
   */
  _formatTodoObject(todo) {
    return {
      _id: todo._id,
      message: todo.message,
      isDone: todo.isDone,
      active: todo.active,
      creator: {
        _id: todo.creator_id._id,
        login: todo.creator_id.login,
        role: todo.creator_id.role,
      },
      assignedTo: todo.assigned_to
        ? {
            _id: todo.assigned_to._id,
            login: todo.assigned_to.login,
            role: todo.assigned_to.role,
          }
        : null,
      createdAt: todo.createdAt,
      updatedAt: todo.updatedAt,
    };
  }

  /**
   * Get lead IDs that have todos (for filtering)
   * @param {Array} leadIds - Array of lead IDs to check
   * @param {Object} todoFilters - Todo filter flags
   * @returns {Promise<Array>} - Lead IDs with matching todos
   */
  async getLeadIdsWithTodos(leadIds, todoFilters) {
    let todoQuery = {
      lead_id: { $in: leadIds },
      active: true,
    };

    // Apply filter-specific criteria
    if (todoFilters.has_todo) {
      todoQuery.isDone = false;
      
      if (this.user.role === ROLES.AGENT) {
        const assignments = await AssignLeads.find({
          agent_id: this.user._id,
          status: 'active',
        }).select('lead_id');
        const assignedLeadIds = assignments.map((a) => a.lead_id.toString());
        const accessibleLeadIds = leadIds.filter((id) => assignedLeadIds.includes(id.toString()));

        todoQuery.$or = [
          { lead_id: { $in: accessibleLeadIds } },
          { lead_id: { $in: leadIds }, assigned_to: this.user._id },
        ];
      }
    } else if (todoFilters.has_extra_todo) {
      todoQuery.isDone = false;
      
      if (this.user.role === ROLES.ADMIN) {
        const adminUsers = await User.find({ role: ROLES.ADMIN }).select('_id');
        const adminIds = adminUsers.map((admin) => admin._id);
        todoQuery.assigned_to = { $in: adminIds };
      } else if (this.user.role === ROLES.AGENT) {
        const assignments = await AssignLeads.find({
          agent_id: this.user._id,
          status: 'active',
        }).select('lead_id');
        const assignedLeadIds = assignments.map((a) => a.lead_id.toString());
        const accessibleLeadIds = leadIds.filter((id) => assignedLeadIds.includes(id.toString()));

        todoQuery.$or = [
          { lead_id: { $in: accessibleLeadIds }, assigned_to: this.user._id },
          { assigned_to: this.user._id },
        ];
      }
    } else if (todoFilters.has_assigned_todo) {
      todoQuery.creator_id = this.user._id;
      todoQuery.assigned_to = { $ne: null, $ne: this.user._id };

      if (this.user.role === ROLES.AGENT) {
        const assignments = await AssignLeads.find({
          agent_id: this.user._id,
          status: 'active',
        }).select('lead_id');
        const assignedLeadIds = assignments.map((a) => a.lead_id.toString());
        todoQuery.lead_id = { $in: assignedLeadIds };
      }
    }

    // Apply pending/done filters
    if (todoFilters.pending_todos) {
      todoQuery.isDone = false;
    } else if (todoFilters.done_todos) {
      todoQuery.isDone = true;
    }

    const todos = await Todo.find(todoQuery).select('lead_id').lean();
    return [...new Set(todos.map((t) => t.lead_id.toString()))];
  }
}

module.exports = TodoFilterHandler;