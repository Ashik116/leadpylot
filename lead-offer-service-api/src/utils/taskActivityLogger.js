/**
 * Task Activity Logger
 * Logs activities to the TaskServiceActivity collection (todo-board-service activity system)
 * This enables dual logging - same event logged in both:
 * 1. 'activities' collection (for todos, leads, offers, etc.)
 * 2. 'taskserviceactivities' collection (for tasks, boards, lists)
 */

const {
  TaskServiceActivity,
  TASK_ACTIVITY_TYPES,
  TASK_ACTIVITY_ACTIONS,
  TASK_VISIBILITY,
  TASK_ACTIVITY_TYPE_STATUS,
} = require('../models');
const logger = require('./logger');

/**
 * Create a task service activity log entry
 * Non-blocking - errors are logged but don't break the main flow
 * 
 * @param {Object} data - Activity data
 * @param {string} data.creator - User ID who performed the action
 * @param {string} data.subject_id - Task/Board/List ID
 * @param {string} data.subject_type - 'Task', 'Board', 'List', etc.
 * @param {string} data.action - Action performed (create, update, delete, etc.)
 * @param {string} data.message - Human-readable message
 * @param {Object} [data.metadata] - Additional metadata
 * @param {string} [data.visibility] - Visibility level (admin, self, all)
 * @returns {Promise<Object|null>} - Created activity or null on error
 */
const createTaskServiceActivity = async (data) => {
  try {
    const activity = new TaskServiceActivity({
      creator: data.creator,
      subject_id: data.subject_id,
      subject_type: data.subject_type,
      action: data.action,
      message: data.message,
      type: data.type || TASK_ACTIVITY_TYPE_STATUS.INFO,
      metadata: data.metadata || {},
      visibility: data.visibility || TASK_VISIBILITY.ALL,
    });

    await activity.save();

    logger.info('Task service activity logged successfully', {
      activityId: activity._id,
      creator: data.creator,
      subject: data.subject_id,
      subjectType: data.subject_type,
      action: data.action,
    });

    return activity;
  } catch (error) {
    logger.error('Error creating task service activity log', {
      error: error.message,
      errorName: error.name,
      validationErrors: error.errors,
      attemptedAction: data.action,
      attemptedData: {
        creator: data.creator,
        subject_id: data.subject_id,
        subject_type: data.subject_type,
        action: data.action,
      },
    });
    // Don't throw - activity logging should never break the main flow
    return null;
  }
};

/**
 * Log activity for task operations
 * 
 * @param {string} creatorId - User ID who performed the action
 * @param {string} taskId - Task ID
 * @param {string} action - Action performed
 * @param {string} message - Human-readable message
 * @param {Object} [metadata] - Additional metadata
 * @returns {Promise<Object|null>}
 */
const logTaskActivity = async (creatorId, taskId, action, message, metadata = {}) => {
  return createTaskServiceActivity({
    creator: creatorId,
    subject_id: taskId,
    subject_type: TASK_ACTIVITY_TYPES.TASK,
    action,
    message,
    metadata,
  });
};

/**
 * Log activity for list operations
 * 
 * @param {string} creatorId - User ID who performed the action
 * @param {string} listId - List ID
 * @param {string} action - Action performed
 * @param {string} message - Human-readable message
 * @param {Object} [metadata] - Additional metadata
 * @returns {Promise<Object|null>}
 */
const logListActivity = async (creatorId, listId, action, message, metadata = {}) => {
  return createTaskServiceActivity({
    creator: creatorId,
    subject_id: listId,
    subject_type: TASK_ACTIVITY_TYPES.LIST,
    action,
    message,
    metadata,
  });
};

/**
 * Log activity for board operations
 * 
 * @param {string} creatorId - User ID who performed the action
 * @param {string} boardId - Board ID
 * @param {string} action - Action performed
 * @param {string} message - Human-readable message
 * @param {Object} [metadata] - Additional metadata
 * @returns {Promise<Object|null>}
 */
const logBoardActivity = async (creatorId, boardId, action, message, metadata = {}) => {
  return createTaskServiceActivity({
    creator: creatorId,
    subject_id: boardId,
    subject_type: TASK_ACTIVITY_TYPES.BOARD,
    action,
    message,
    metadata,
  });
};

module.exports = {
  createTaskServiceActivity,
  logTaskActivity,
  logListActivity,
  logBoardActivity,
  TASK_ACTIVITY_TYPES,
  TASK_ACTIVITY_ACTIONS,
  TASK_VISIBILITY,
  TASK_ACTIVITY_TYPE_STATUS,
};
