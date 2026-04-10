/**
 * TodoType Controller
 * Handles HTTP requests for todo type operations
 */

const { asyncHandler } = require('../utils/errorHandler');
const todoTypeService = require('../services/todoTypeService');

/**
 * Create a new todo type
 * @route POST /todos/todo-types
 * @access Private - Admin only
 */
const createTodoType = asyncHandler(async (req, res) => {
  const { user } = req;
  const result = await todoTypeService.createTodoType(req.body, user);

  return res.status(201).json(result);
});

/**
 * Get all todo types with filtering
 * @route GET /todos/todo-types
 * @access Private - All authenticated users
 */
const getAllTodoTypes = asyncHandler(async (req, res) => {
  const result = await todoTypeService.getAllTodoTypes(req.query);

  return res.status(200).json(result);
});

/**
 * Get a single todo type by ID
 * @route GET /todos/todo-types/:id
 * @access Private - All authenticated users
 */
const getTodoTypeById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await todoTypeService.getTodoTypeById(id);

  return res.status(200).json(result);
});

/**
 * Update a todo type
 * @route PUT /todos/todo-types/:id
 * @access Private - Admin only
 */
const updateTodoType = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { user } = req;
  const result = await todoTypeService.updateTodoType(id, req.body, user);

  return res.status(200).json(result);
});

/**
 * Update todo type status
 * @route PATCH /todos/todo-types/:id/status
 * @access Private - Admin only
 */
const updateTodoTypeStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const result = await todoTypeService.updateTodoTypeStatus(id, status);

  return res.status(200).json(result);
});

/**
 * Delete a todo type
 * @route DELETE /todos/todo-types/:id
 * @access Private - Admin only
 */
const deleteTodoType = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await todoTypeService.deleteTodoType(id);

  return res.status(200).json(result);
});

module.exports = {
  createTodoType,
  getAllTodoTypes,
  getTodoTypeById,
  updateTodoType,
  updateTodoTypeStatus,
  deleteTodoType,
};

