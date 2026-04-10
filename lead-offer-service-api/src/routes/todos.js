const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const todoController = require('../controllers/todoController');
const todoTypeController = require('../controllers/todoTypeController');
const { authenticate, adminOnly } = require('../middleware');
const { authorizeAny } = require('../middleware/authorize');
const { PERMISSIONS } = require('../middleware/roles/permissions');
const { validateRequest } = require('../middleware');

/**
 * @route POST /todos
 * @desc Create a new todo / ticket for a lead
 * @access Private - Agent/Admin
 * @body {string} lead_id - Lead ID (MongoId) - Required
 * @body {string} message - Ticket / todo message - Required
 * @body {string[]} [todoTypesids] - Optional array of TodoType IDs
 * @body {string} [assignto] - Optional user ID to assign this ticket to
 * @body {string[]} [documents_ids] - Optional related document IDs
 */
router.post(
  '/',
  authenticate,
  authorizeAny([PERMISSIONS.LEAD_READ_ASSIGNED, PERMISSIONS.LEAD_READ_ALL]),
  validateRequest([
    body('lead_id').optional().isMongoId().withMessage('lead_id must be a valid MongoDB ObjectId when provided'),
    body('opening_id').optional().isMongoId().withMessage('opening_id must be a valid MongoDB ObjectId when provided'),
    body('offer_id').optional().isMongoId().withMessage('offer_id must be a valid MongoDB ObjectId when provided'),
    body('email_id').optional().isMongoId().withMessage('email_id must be a valid MongoDB ObjectId when provided'),
    body('task_type').optional().isString().withMessage('task_type must be a valid string when provided'),
    body('taskTitle')
      .isString()
      .trim()
      .isLength({ min: 1, max: 500 })
      .withMessage('taskTitle must be between 1 and 500 characters'),
    // Custom validation: at least one entity ID must be provided
    body().custom((value) => {
      const { lead_id, offer_id, opening_id } = value;
      if (!lead_id && !offer_id && !opening_id) {
        throw new Error('At least one of lead_id, offer_id, or opening_id must be provided');
      }
      return true;
    }).withMessage('At least one of lead_id, offer_id, or opening_id must be provided'),
    body('todoTypesids')
      .optional()
      .isArray()
      .withMessage('todoTypesids must be an array when provided')
      .custom((value) => {
        // Only validate if value is provided and not empty
        if (!value || value.length === 0) {
          return true; // Allow empty array
        }
        // Allow both formats: array of strings or array of objects
        return value.every((item) => {
          if (typeof item === 'string') {
            // Old format: array of MongoDB ObjectIds
            return /^[0-9a-fA-F]{24}$/.test(item);
          }
          if (typeof item === 'object' && item !== null) {
            // New format: array of objects with todoTypeId and optional isDone
            const hasValidId =
              item.todoTypeId && /^[0-9a-fA-F]{24}$/.test(item.todoTypeId.toString());
            const hasValidIsDone =
              item.isDone === undefined || typeof item.isDone === 'boolean';
            return hasValidId && hasValidIsDone;
          }
          return false;
        });
      })
      .withMessage(
        'todoTypesids must be an array of MongoDB ObjectIds or objects with todoTypeId (and optional isDone)'
      ),
    body('taskDescription')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1, max: 500 })
      .withMessage('Description must be between 1 and 500 characters'),
    body('assignto')
      .optional()
      .isMongoId()
      .withMessage('Valid assignto user id is required when provided'),
    body('documents_ids')
      .optional()
      .isArray()
      .withMessage('documents_ids must be an array when provided'),
    body('documents_ids.*')
      .optional()
      .isMongoId()
      .withMessage('Each documents_ids item must be a valid id'),
  ]),
  todoController.createTodo
);

/**
 * @route GET /todos
 * @desc Get all todos with filtering, pagination, and comprehensive statistics
 * @access Private - Agent/Admin
 * @query {number} [page=1] - Page number for pagination
 * @query {number} [limit=20] - Number of todos per page
 * @query {string} [lead_id] - Filter by specific lead ID
 * @query {string} [creator_id] - Filter by todo creator (Admin only)
 * @query {boolean} [isDone] - Filter by completion status
 * @query {boolean} [showInactive=false] - Include inactive todos
 * @query {string} [search] - Search in todo messages
 * @response {Object} statistics - Todo counts and metrics
 * @response {number} statistics.all_todos_count - Total todos matching filters
 * @response {number} statistics.pending_todos_count - Count of incomplete todos
 * @response {number} statistics.completed_todos_count - Count of completed todos
 */
router.get('/', authenticate, authorizeAny(['lead:read:assigned', 'lead:read:all']), todoController.getAllTodos);

/**
 * @route POST /todos/todo-types
 * @desc Create a new todo type (PredefinedSubTask)
 * @access Private - Admin only
 * @body {string} name - Todo type name (required, 1-100 characters)
 * @body {string} [description] - Optional description (max 500 characters)
 * @body {string} [status] - Status: "active" or "inactive" (default: "active")
 * @body {Array} [todo] - Optional array of nested todos (subtasks under subtask)
 * @body {string} todo[].title - Todo title (required for each todo)
 * @body {string} [todo[].description] - Todo description (max 500 characters)
 * @body {string} [todo[].priority] - Priority: "low", "medium", or "high" (default: "medium")
 * @body {string|Array} [todo[].assigned] - User ID(s) assigned to todo (MongoDB ObjectId or array)
 * @body {string} [todo[].dueDate] - Due date (ISO 8601 format)
 * @body {boolean} [todo[].isCompleted] - Completion status (default: false)
 * 
 * @example
 * // Request body with todos:
 * {
 *   "name": "Follow up call",
 *   "description": "Make a follow-up call to the client",
 *   "status": "active",
 *   "todo": [
 *     {
 *       "title": "Prepare call notes",
 *       "description": "Review client history before calling",
 *       "priority": "high",
 *       "isCompleted": false
 *     },
 *     {
 *       "title": "Schedule follow-up",
 *       "priority": "medium",
 *       "assigned": "507f1f77bcf86cd799439011"
 *     }
 *   ]
 * }
 * 
 * @example
 * // Minimal request body:
 * {
 *   "name": "Send email"
 * }
 * 
 * @response {Object} 201 - Todo type created successfully
 * @response {boolean} response.success - Success flag
 * @response {string} response.message - Success message
 * @response {Object} response.data - Created todo type object
 * @response {string} response.data._id - Todo type ID
 * @response {string} response.data.name - Todo type name
 * @response {string} response.data.description - Todo type description
 * @response {string} response.data.status - Todo type status ("active" or "inactive")
 * @response {Array} response.data.todo - Array of nested todos
 * @response {string} response.data.todo[]._id - Todo ID
 * @response {string} response.data.todo[].title - Todo title
 * @response {string} response.data.todo[].description - Todo description
 * @response {string} response.data.todo[].priority - Todo priority
 * @response {Array} response.data.todo[].assigned - Assigned user IDs
 * @response {Date} response.data.todo[].dueDate - Due date
 * @response {boolean} response.data.todo[].isCompleted - Completion status
 * @response {string} response.data.createdBy - Creator user ID
 * @response {Date} response.data.createdAt - Creation timestamp
 * @response {Date} response.data.updatedAt - Update timestamp
 */
router.post(
  '/todo-types',
  authenticate,
  adminOnly,
  validateRequest([
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Todo type name is required')
      .isLength({ min: 1, max: 100 })
      .withMessage('Todo type name must be between 1 and 100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description cannot exceed 500 characters'),
    body('status')
      .optional()
      .isIn(['active', 'inactive'])
      .withMessage('Status must be either "active" or "inactive"'),
    body('todo')
      .optional()
      .isArray()
      .withMessage('Todo must be an array when provided'),
    body('todo.*.title')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Todo title is required when todo is provided'),
    body('todo.*.description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Todo description cannot exceed 500 characters'),
    body('todo.*.priority')
      .optional()
      .isIn(['low', 'medium', 'high'])
      .withMessage('Todo priority must be one of: low, medium, high'),
    body('todo.*.assigned')
      .optional()
      .custom((value) => {
        if (value === null || value === undefined) return true;
        const assignedArray = Array.isArray(value) ? value : [value];
        return assignedArray.every((id) => {
          if (!id) return true; // Allow null/undefined in array
          return /^[0-9a-fA-F]{24}$/.test(id.toString());
        });
      })
      .withMessage('Todo assigned must be a valid MongoDB ObjectId or array of ObjectIds'),
    body('todo.*.dueDate')
      .optional()
      .isISO8601()
      .withMessage('Todo dueDate must be a valid ISO 8601 date'),
    body('todo.*.isCompleted')
      .optional()
      .isBoolean()
      .withMessage('Todo isCompleted must be a boolean'),
    body('todo.*.isDeleted')
      .optional()
      .isBoolean()
      .withMessage('Todo isDeleted must be a boolean'),
  ]),
  todoTypeController.createTodoType
);

/**
 * @route GET /todos/todo-types
 * @desc Get all todo types (PredefinedSubTask) with filtering and pagination
 * @access Private - All authenticated users
 * @query {string} [status] - Filter by status: "active" or "inactive"
 * @query {string} [search] - Search in name or description (case-insensitive)
 * @query {number} [page=1] - Page number for pagination (min: 1)
 * @query {number} [limit=50] - Number of todo types per page (min: 1, max: 100)
 * 
 * @example
 * // Get all active todo types:
 * GET /todos/todo-types?status=active
 * 
 * @example
 * // Search todo types:
 * GET /todos/todo-types?search=follow
 * 
 * @example
 * // Paginated results:
 * GET /todos/todo-types?page=2&limit=20
 * 
 * @response {Object} 200 - Todo types retrieved successfully
 * @response {boolean} response.success - Success flag
 * @response {string} response.message - Success message
 * @response {Array} response.data - Array of todo type objects
 * @response {string} response.data[]._id - Todo type ID
 * @response {string} response.data[].name - Todo type name
 * @response {string} response.data[].description - Todo type description
 * @response {string} response.data[].status - Todo type status
 * @response {Array} response.data[].todo - Array of nested todos
 * @response {string} response.data[].createdBy - Creator user ID
 * @response {Date} response.data[].createdAt - Creation timestamp
 * @response {Date} response.data[].updatedAt - Update timestamp
 * @response {Object} response.meta - Pagination metadata
 * @response {number} response.meta.total - Total number of todo types
 * @response {number} response.meta.page - Current page number
 * @response {number} response.meta.limit - Items per page
 * @response {number} response.meta.pages - Total number of pages
 */
router.get(
  '/todo-types',
  authenticate,
  validateRequest([
    query('status').optional().isIn(['active', 'inactive']),
    query('search').optional().isString(),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ]),
  todoTypeController.getAllTodoTypes
);

/**
 * @route GET /todos/todo-types/:id
 * @desc Get a single todo type (PredefinedSubTask) by ID
 * @access Private - All authenticated users
 * @param {string} id - Todo type ID (MongoDB ObjectId, required)
 * 
 * @example
 * // Get todo type by ID:
 * GET /todos/todo-types/507f1f77bcf86cd799439011
 * 
 * @response {Object} 200 - Todo type retrieved successfully
 * @response {boolean} response.success - Success flag
 * @response {string} response.message - Success message
 * @response {Object} response.data - Todo type object
 * @response {string} response.data._id - Todo type ID
 * @response {string} response.data.name - Todo type name
 * @response {string} response.data.description - Todo type description
 * @response {string} response.data.status - Todo type status ("active" or "inactive")
 * @response {Object} response.data.createdBy - Creator user object (populated)
 * @response {string} response.data.createdBy._id - Creator user ID
 * @response {string} response.data.createdBy.login - Creator username
 * @response {Date} response.data.createdAt - Creation timestamp
 * @response {Date} response.data.updatedAt - Update timestamp
 * 
 * @response {Object} 404 - Todo type not found
 * @response {boolean} response.success - Success flag (false)
 * @response {string} response.message - Error message
 */
router.get(
  '/todo-types/:id',
  authenticate,
  validateRequest([
    param('id').isMongoId().withMessage('Valid todo type ID is required'),
  ]),
  todoTypeController.getTodoTypeById
);

/**
 * @route PUT /todos/todo-types/:id
 * @desc Update a todo type (PredefinedSubTask)
 * @access Private - Admin only
 * @param {string} id - Todo type ID (MongoDB ObjectId, required)
 * @body {string} [name] - Todo type name (1-100 characters, optional)
 * @body {string} [description] - Description (max 500 characters, optional)
 * @body {string} [status] - Status: "active" or "inactive" (optional)
 * @body {Array} [todo] - Array of nested todos (smart merge: include _id to update existing, omit _id to create new)
 * @body {string} [todo[]._id] - Todo ID (include to update existing todo, omit to create new)
 * @body {string} [todo[].title] - Todo title (required for new todos)
 * @body {string} [todo[].description] - Todo description (max 500 characters)
 * @body {string} [todo[].priority] - Priority: "low", "medium", or "high"
 * @body {string|Array} [todo[].assigned] - User ID(s) assigned to todo (MongoDB ObjectId or array)
 * @body {string} [todo[].dueDate] - Due date (ISO 8601 format)
 * @body {boolean} [todo[].isCompleted] - Completion status
 * @body {boolean} [todo[].isDeleted] - Soft delete flag (set to true to soft delete todo, only works with _id. Deleted todos are filtered out from GET responses)
 * 
 * @example
 * // Update todo type name and description:
 * PUT /todos/todo-types/507f1f77bcf86cd799439011
 * {
 *   "name": "Updated follow up call",
 *   "description": "Updated description for follow up call"
 * }
 * 
 * @example
 * // Update with todos (create new todos):
 * PUT /todos/todo-types/507f1f77bcf86cd799439011
 * {
 *   "todo": [
 *     {
 *       "title": "New todo item",
 *       "priority": "high",
 *       "isCompleted": false
 *     }
 *   ]
 * }
 * 
 * @example
 * // Update existing todo (include _id):
 * PUT /todos/todo-types/507f1f77bcf86cd799439011
 * {
 *   "todo": [
 *     {
 *       "_id": "507f1f77bcf86cd799439012",
 *       "title": "Updated todo title",
 *       "isCompleted": true
 *     }
 *   ]
 * }
 * 
 * @example
 * // Soft delete todo (set isDeleted: true):
 * PUT /todos/todo-types/507f1f77bcf86cd799439011
 * {
 *   "todo": [
 *     {
 *       "_id": "507f1f77bcf86cd799439012",
 *       "isDeleted": true
 *     }
 *   ]
 * }
 * // Note: Todos with isDeleted: true will not appear in GET API responses
 * 
 * @response {Object} 200 - Todo type updated successfully
 * @response {boolean} response.success - Success flag
 * @response {string} response.message - Success message
 * @response {Object} response.data - Updated todo type object
 * @response {string} response.data._id - Todo type ID
 * @response {string} response.data.name - Updated todo type name
 * @response {string} response.data.description - Updated description
 * @response {string} response.data.status - Updated status
 * @response {Date} response.data.updatedAt - Update timestamp
 * 
 * @response {Object} 404 - Todo type not found
 * @response {boolean} response.success - Success flag (false)
 * @response {string} response.message - Error message
 */
router.put(
  '/todo-types/:id',
  authenticate,
  adminOnly,
  validateRequest([
    param('id').isMongoId().withMessage('Valid todo type ID is required'),
    body('name')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Todo type name cannot be empty')
      .isLength({ min: 1, max: 100 })
      .withMessage('Todo type name must be between 1 and 100 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description cannot exceed 500 characters'),
    body('status')
      .optional()
      .isIn(['active', 'inactive'])
      .withMessage('Status must be either "active" or "inactive"'),
    body('todo')
      .optional()
      .isArray()
      .withMessage('Todo must be an array when provided'),
    body('todo.*._id')
      .optional()
      .isMongoId()
      .withMessage('Todo _id must be a valid MongoDB ObjectId when provided'),
    body('todo.*.title')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Todo title cannot be empty when provided'),
    body('todo.*.description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Todo description cannot exceed 500 characters'),
    body('todo.*.priority')
      .optional()
      .isIn(['low', 'medium', 'high'])
      .withMessage('Todo priority must be one of: low, medium, high'),
    body('todo.*.assigned')
      .optional()
      .custom((value) => {
        if (value === null || value === undefined) return true;
        const assignedArray = Array.isArray(value) ? value : [value];
        return assignedArray.every((id) => {
          if (!id) return true; // Allow null/undefined in array
          return /^[0-9a-fA-F]{24}$/.test(id.toString());
        });
      })
      .withMessage('Todo assigned must be a valid MongoDB ObjectId or array of ObjectIds'),
    body('todo.*.dueDate')
      .optional()
      .isISO8601()
      .withMessage('Todo dueDate must be a valid ISO 8601 date'),
    body('todo.*.isCompleted')
      .optional()
      .isBoolean()
      .withMessage('Todo isCompleted must be a boolean'),
    body('todo.*.isDeleted')
      .optional()
      .isBoolean()
      .withMessage('Todo isDeleted must be a boolean'),
  ]),
  todoTypeController.updateTodoType
);

/**
 * @route PATCH /todos/todo-types/:id/status
 * @desc Update todo type status only (PredefinedSubTask)
 * @access Private - Admin only
 * @param {string} id - Todo type ID (MongoDB ObjectId, required)
 * @body {string} status - New status: "active" or "inactive" (required)
 * 
 * @example
 * // Activate todo type:
 * PATCH /todos/todo-types/507f1f77bcf86cd799439011/status
 * {
 *   "status": "active"
 * }
 * 
 * @example
 * // Deactivate todo type:
 * PATCH /todos/todo-types/507f1f77bcf86cd799439011/status
 * {
 *   "status": "inactive"
 * }
 * 
 * @response {Object} 200 - Todo type status updated successfully
 * @response {boolean} response.success - Success flag
 * @response {string} response.message - Success message
 * @response {Object} response.data - Updated todo type object
 * @response {string} response.data._id - Todo type ID
 * @response {string} response.data.status - Updated status
 * @response {Date} response.data.updatedAt - Update timestamp
 * 
 * @response {Object} 404 - Todo type not found
 * @response {boolean} response.success - Success flag (false)
 * @response {string} response.message - Error message
 */
router.patch(
  '/todo-types/:id/status',
  authenticate,
  adminOnly,
  validateRequest([
    param('id').isMongoId().withMessage('Valid todo type ID is required'),
    body('status')
      .notEmpty()
      .withMessage('Status is required')
      .isIn(['active', 'inactive'])
      .withMessage('Status must be either "active" or "inactive"'),
  ]),
  todoTypeController.updateTodoTypeStatus
);

/**
 * @route DELETE /todos/todo-types/:id
 * @desc Delete a todo type (PredefinedSubTask)
 * @access Private - Admin only
 * @param {string} id - Todo type ID (MongoDB ObjectId, required)
 * 
 * @example
 * // Delete todo type:
 * DELETE /todos/todo-types/507f1f77bcf86cd799439011
 * 
 * @response {Object} 200 - Todo type deleted successfully
 * @response {boolean} response.success - Success flag
 * @response {string} response.message - Success message
 * @response {Object} response.data - Deleted todo type object (if soft delete) or confirmation
 * 
 * @response {Object} 404 - Todo type not found
 * @response {boolean} response.success - Success flag (false)
 * @response {string} response.message - Error message
 * 
 * @response {Object} 400 - Cannot delete todo type (e.g., in use)
 * @response {boolean} response.success - Success flag (false)
 * @response {string} response.message - Error message explaining why deletion failed
 */
router.delete(
  '/todo-types/:id',
  authenticate,
  adminOnly,
  validateRequest([
    param('id').isMongoId().withMessage('Valid todo type ID is required'),
  ]),
  todoTypeController.deleteTodoType
);

/**
 * @route GET /todos/my-tasks
 * @desc Get current user's tasks (email tasks and assigned todos)
 * @access Private - Agent/Admin
 * @response {Array} data - Array of user's tasks with email and lead details
 */
router.get('/my-tasks', authenticate, authorizeAny(['lead:read:assigned', 'lead:read:all']), todoController.getMyTasks);

/**
 * @route GET /todos/lead/:leadId
 * @desc Get todos for a specific lead with statistics
 * @access Private - Agent/Admin
 * @param {string} leadId - Lead ID to get todos for
 * @query {boolean} [isDone] - Filter by completion status
 * @query {boolean} [showInactive=false] - Include inactive todos
 * @response {Object} statistics - Todo counts for this lead
 * @response {number} statistics.all_todos_count - Total todos for this lead
 * @response {number} statistics.pending_todos_count - Count of incomplete todos
 * @response {number} statistics.completed_todos_count - Count of completed todos
 */
router.get('/lead/:leadId', authenticate, authorizeAny(['lead:read:assigned', 'lead:read:all']), todoController.getTodosByLeadId);

/**
 * @route GET /todos/board-members
 * @desc Get board members by board_type (LEAD or OFFER)
 * @access Private - Agent/Admin
 * @query {string} board_type - Board type: "lead" or "offer" (required)
 * @response {Array} data - Array of board members with metadata
 */
router.get(
  '/board-members',
  authenticate,
  validateRequest([
    query('board_type')
      .notEmpty()
      .withMessage('board_type is required')
      .isIn(['lead', 'offer', 'opening', 'email'])
      .withMessage('board_type must be one of: lead, offer, opening, email'),
  ]),
  todoController.getBoardMembersByType
);

/**
 * @route GET /todos/:id
 * @desc Get a single todo by ID
 * @access Private - Agent/Admin
 */
router.get('/:id', authenticate, authorizeAny(['lead:read:assigned', 'lead:read:all']), todoController.getTodoById);

/**
 * @route PUT /todos/:id
 * @desc Update a todo
 * @access Private - Agent/Admin
 */
router.put(
  '/:id',
  authenticate,
  validateRequest({
    body: {
      message: 'string|min:1|max:500',
      isDone: 'boolean',
      documents_ids: 'array',
      'documents_ids.*': 'string',
      todoTypesids: 'array',
      'todoTypesids.*.todoTypeId': 'string',
      'todoTypesids.*.isDone': 'boolean',
    },
  }),
  todoController.updateTodo
);

/**
 * @route PATCH /todos/:id/status
 * @desc Toggle todo status (done/undone)
 * @access Private - Agent/Admin
 */
router.patch(
  '/:id/status',
  authenticate,
  validateRequest({
    body: {
      isDone: 'required|boolean',
    },
  }),
  todoController.toggleTodoStatus
);

/**
 * @route DELETE /todos/:id
 * @desc Delete a todo (soft delete)
 * @access Private - Agent/Admin
 */
router.delete('/:id', authenticate, todoController.deleteTodo);

/**
 * @route POST /todos/:id/assign
 * @desc Assign a todo to a specific user
 * @access Private - Agent/Admin
 */
router.post(
  '/:id/assign',
  authenticate,
  validateRequest({
    body: {
      assignee_id: 'required|string',
    },
  }),
  todoController.assignTodo
);

/**
 * @route DELETE /todos/:id/assign
 * @desc Unassign a todo from current assignee
 * @access Private - Agent/Admin
 */
router.delete('/:id/assign', authenticate, todoController.unassignTodo);

/**
 * @route PUT /todos/:id/assign
 * @desc Reassign a todo to a different user
 * @access Private - Agent/Admin
 */
router.put(
  '/:id/assign',
  authenticate,
  validateRequest({
    body: {
      assignee_id: 'required|string',
    },
  }),
  todoController.reassignTodo
);

module.exports = router;
