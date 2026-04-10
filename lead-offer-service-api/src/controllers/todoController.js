/**
 * Todo Controller
 * Handles HTTP requests for todo operations
 */

const { asyncHandler } = require('../utils/errorHandler');
const todoService = require('../services/todoService');

/**
 * Create a new todo
 * @route POST /todos
 * @access Private - Agent/Admin
 */
const createTodo = asyncHandler(async (req, res) => {
  const { user } = req;
  const result = await todoService.createTodo(req.body, user);

  return res.status(201).json(result);
});

/**
 * Get all todos with filtering and pagination
 * @route GET /todos
 * @access Private - Agent/Admin
 */
const getAllTodos = asyncHandler(async (req, res) => {
  const { user } = req;
  const result = await todoService.getAllTodos(user, req.query);

  return res.status(200).json(result);
});

/**
 * Get a single todo by ID
 * @route GET /todos/:id
 * @access Private - Agent/Admin
 */
const getTodoById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { user } = req;
  const result = await todoService.getTodoById(id, user);

  return res.status(200).json(result);
});

/**
 * Update a todo
 * @route PUT /todos/:id
 * @access Private - Agent/Admin
 */
const updateTodo = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { user } = req;
  const result = await todoService.updateTodo(id, req.body, user);

  return res.status(200).json(result);
});

/**
 * Delete a todo (soft delete)
 * @route DELETE /todos/:id
 * @access Private - Agent/Admin
 */
const deleteTodo = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { user } = req;
  const result = await todoService.deleteTodo(id, user);

  return res.status(200).json(result);
});

/**
 * Get todos for a specific lead
 * @route GET /todos/lead/:leadId
 * @access Private - Agent/Admin
 */
const getTodosByLeadId = asyncHandler(async (req, res) => {
  const { leadId } = req.params;
  const { user } = req;
  const result = await todoService.getTodosByLeadId(leadId, user, req.query);

  return res.status(200).json(result);
});

/**
 * Toggle todo status (done/undone)
 * @route PATCH /todos/:id/status
 * @access Private - Agent/Admin
 */
const toggleTodoStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isDone } = req.body;
  const { user } = req;
  const result = await todoService.toggleTodoStatus(id, isDone, user);

  return res.status(200).json(result);
});

/**
 * Assign a todo to a specific user
 * @route POST /todos/:id/assign
 * @access Private - Agent/Admin
 */
const assignTodo = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { assignee_id } = req.body;
  const { user } = req;
  const result = await todoService.assignTodo(id, assignee_id, user);

  return res.status(200).json(result);
});

/**
 * Unassign a todo from current assignee
 * @route DELETE /todos/:id/assign
 * @access Private - Agent/Admin
 */
const unassignTodo = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { user } = req;
  const result = await todoService.unassignTodo(id, user);

  return res.status(200).json(result);
});

/**
 * Reassign a todo to a different user
 * @route PUT /todos/:id/assign
 * @access Private - Agent/Admin
 */
const reassignTodo = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { assignee_id } = req.body;
  const { user } = req;
  const result = await todoService.reassignTodo(id, assignee_id, user);

  return res.status(200).json(result);
});

/**
 * Get current user's tasks (email tasks and assigned todos)
 * @route GET /todos/my-tasks
 * @access Private - Agent/Admin
 */
const getMyTasks = asyncHandler(async (req, res) => {
  const { user } = req;
  const result = await todoService.getMyTasks(user);

  return res.status(200).json(result);
});

/**
 * Get board members by board_type (LEAD or OFFER)
 * @route GET /todos/board-members
 * @access Private - Agent/Admin
 */
const getBoardMembersByType = asyncHandler(async (req, res) => {
  const { board_type } = req.query;
  const { user } = req;
  const result = await todoService.getBoardMembersByType(board_type, user);

  return res.status(200).json(result);
});

module.exports = {
  createTodo,
  getAllTodos,
  getTodoById,
  updateTodo,
  deleteTodo,
  getTodosByLeadId,
  toggleTodoStatus,
  assignTodo,
  unassignTodo,
  reassignTodo,
  getMyTasks,
  getBoardMembersByType,
}; 