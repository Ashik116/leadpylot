/**
 * Task Helper Functions
 * Helper functions for task creation and management
 * Cloned from todo-bord-service-api task.service.ts
 */

const mongoose = require('mongoose');
const Board = require('../models/Board');
const List = require('../models/List');
const Task = require('../models/Task');
const PredefinedSubTask = require('../models/PredefinedSubTask');
const { ValidationError, NotFoundError } = require('./errorHandler');
const logger = require('../utils/logger');

// Board type constants
const BOARD_TYPES = {
  LEAD: 'LEAD',
  OFFER: 'OFFER',
  OPENING: 'OPENING',
  EMAIL: 'EMAIL',
  INTERNAL: 'INTERNAL',
};

// Entity configuration mapping
const ENTITY_CONFIG = {
  lead_id: { boardType: BOARD_TYPES.LEAD, listIdField: 'lead_list_id' },
  offer_id: { boardType: BOARD_TYPES.OFFER, listIdField: 'offer_list_id' },
  opening_id: { boardType: BOARD_TYPES.OPENING, listIdField: 'opening_list_id' },
  email_id: { boardType: BOARD_TYPES.EMAIL, listIdField: 'email_list_id' },
};

/**
 * Find system board by board_type
 */
const findBoardByType = async (boardType) => {
  return Board.findOne({ board_type: boardType, is_system: true });
};

/**
 * Validate and get board by ID
 */
const validateBoardExists = async (boardId) => {
  const board = await Board.findById(boardId);
  if (!board) {
    throw new NotFoundError('Board not found');
  }
  return board;
};

/**
 * Validate and get list by ID
 */
const validateListExists = async (listId) => {
  const list = await List.findById(listId);
  if (!list) {
    throw new NotFoundError('List not found. List must be created before assigning tasks.');
  }
  return list;
};

/**
 * Add task to list's tasks array
 */
const addTaskToList = async (listId, taskId) => {
  const result = await List.updateOne(
    { _id: listId },
    { $addToSet: { tasks: taskId } }
  );
  return result;
};

/**
 * Add list to board's lists array (if not present)
 */
const addListToBoard = async (boardId, listId) => {
  const result = await Board.updateOne(
    { _id: boardId },
    { $addToSet: { lists: listId } }
  );
  return result;
};

/**
 * Remove task from list's tasks array
 */
const removeTaskFromList = async (listId, taskId) => {
  await List.updateOne({ _id: listId }, { $pull: { tasks: taskId } });
};

/**
 * Process entity IDs and return board-list pairs
 * When lead_id is provided, finds LEAD board and its Todo list
 */
const processEntityIdsWithLists = async (entityIds, listIds = {}) => {
  const pairs = [];

  // If offer_id or opening_id is present, skip lead_id to avoid assigning task to LEAD board
  // Tasks from offers/openings should only go to OFFER/OPENING boards, not LEAD board
  const shouldSkipLeadId = entityIds.offer_id || entityIds.opening_id;

  for (const [entityKey, config] of Object.entries(ENTITY_CONFIG)) {
    // Skip lead_id if offer_id or opening_id is present
    if (entityKey === 'lead_id' && shouldSkipLeadId) {
      continue;
    }

    const entityValue = entityIds[entityKey];
    if (entityValue) {
      // Find the system board for this entity type
      const board = await findBoardByType(config.boardType);
      if (!board) {
        logger.warn(`System board for ${config.boardType} not found. Task will be created without board assignment.`);
        // Continue without throwing - allow task creation without board
        continue;
      }

      // Get the corresponding list ID for this entity (if provided)
      const listIdValue = listIds[config.listIdField];
      
      let listId;
      if (listIdValue) {
        // Use provided list ID
        await validateListExists(listIdValue);
        listId = new mongoose.Types.ObjectId(listIdValue);
      } else {
        // Auto-find the "Todo" list in the board (default list for new tasks)
        const todoList = await List.findOne({
          board_id: board._id,
          types: 'todo',
        }).sort({ position: 1 }); // Get first todo list if multiple exist
        
        if (!todoList) {
          logger.warn(`Todo list not found in ${config.boardType} board. Task will be created without list assignment.`);
          continue;
        }
        listId = todoList._id;
      }

      pairs.push({
        boardId: board._id,
        listId: listId,
      });
    }
  }

  return pairs;
};

/**
 * Handle board and list associations for a task
 */
const handleBoardListPairAssociations = async (pairs, taskId) => {
  for (const pair of pairs) {
    // Add task to the list
    await addTaskToList(pair.listId, taskId);
    // Add list to the board
    await addListToBoard(pair.boardId, pair.listId);
  }
};

/**
 * Get predefined subtask by ID for populating into task
 */
const getPredefinedSubTaskForTask = async (predefinedSubTaskId) => {
  const predefinedSubTask = await PredefinedSubTask.findById(predefinedSubTaskId);

  if (!predefinedSubTask) {
    throw new NotFoundError(`Predefined subtask with id ${predefinedSubTaskId} not found`);
  }

  if (!predefinedSubTask.isActive) {
    throw new ValidationError(`Predefined subtask with id ${predefinedSubTaskId} is not active`);
  }

  // Return only the fields needed for a subtask (including todo)
  // Note: We return the full todo array here, filtering of isDeleted will happen in taskServiceClient
  return {
    taskTitle: predefinedSubTask.taskTitle,
    taskDescription: predefinedSubTask.taskDescription,
    priority: predefinedSubTask.priority,
    todo: predefinedSubTask.todo || [], // Return all todos, including structure for filtering
  };
};

module.exports = {
  findBoardByType,
  validateBoardExists,
  validateListExists,
  addTaskToList,
  addListToBoard,
  removeTaskFromList,
  processEntityIdsWithLists,
  handleBoardListPairAssociations,
  getPredefinedSubTaskForTask,
  BOARD_TYPES,
  ENTITY_CONFIG,
};
