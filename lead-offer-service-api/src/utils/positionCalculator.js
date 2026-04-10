/**
 * ============================================================================
 * PRODUCTION-SAFE TRELLO-STYLE POSITION CALCULATOR
 * ============================================================================
 *
 * Implements floating-point position-based ordering for efficient drag & drop.
 *
 * KEY PRINCIPLES:
 * - Positions are floating-point numbers with gaps (e.g., 16384, 32768, 49152)
 * - Inserting between items: newPosition = (beforePos + afterPos) / 2
 * - Inserting at top: newPosition = firstItem.position / 2
 * - Inserting at bottom: newPosition = lastItem.position + DEFAULT_GAP
 * - Only ONE database update per drag & drop operation
 * - Rebalancing when positions get too close (< MIN_GAP)
 *
 * SAFETY VALIDATIONS (NON-NEGOTIABLE):
 * - beforeId/afterId MUST exist in the database
 * - beforeId/afterId MUST belong to the target list/board
 * - beforeId/afterId MUST NOT be the same item
 * - beforeId/afterId MUST NOT be the excluded item (moving item)
 * - beforeId/afterId MUST be adjacent in sorted order (when both provided)
 * - Invalid IDs trigger FALLBACK (move to bottom) instead of corrupting order
 */

const mongoose = require('mongoose');
const Task = require('../models/Task');
const List = require('../models/List');

// Default gap between positions (for new items and bottom insertions)
const DEFAULT_POSITION_GAP = 16384;

// Minimum gap before triggering rebalancing
const MIN_POSITION_GAP = 0.001;

/**
 * ============================================================================
 * VALIDATION HELPER FUNCTIONS
 * ============================================================================
 */

/**
 * Validates that beforeId/afterId are properly positioned within the items array.
 * This is the CORE SAFETY CHECK that prevents order corruption.
 *
 * @param {Array} items - All items in the target list/board (sorted by position)
 * @param {String|null} beforeId - ID of item before the drop position
 * @param {String|null} afterId - ID of item after the drop position
 * @param {String} excludeId - ID of item being moved (should not match before/after)
 * @returns {Object} ValidationResult with indices and positions if valid
 */
const validateDndContext = (items, beforeId, afterId, excludeId) => {
  // Build index map for O(1) lookup
  const indexMap = new Map();
  const posMap = new Map();

  for (let i = 0; i < items.length; i++) {
    const idStr = items[i]._id.toString();
    indexMap.set(idStr, i);
    posMap.set(idStr, items[i].position);
  }

  // Helper to validate a single ID
  const validateSingleId = (id, expectedRole) => {
    // Check 1: ID must exist in the items
    const index = indexMap.get(id);
    if (index === undefined) {
      return {
        valid: false,
        reason: `DND_VALIDATION_FAILED: ${expectedRole}Id "${id}" not found in target list/board`
      };
    }

    // Check 2: ID must not be the excluded (moving) item
    if (excludeId && id === excludeId) {
      return {
        valid: false,
        reason: `DND_VALIDATION_FAILED: ${expectedRole}Id "${id}" is the moving item (excludeId)`
      };
    }

    const pos = posMap.get(id);
    return { index, pos, valid: true };
  };

  // Validate beforeId if provided
  let beforeIndex;
  let beforePos;

  if (beforeId) {
    const beforeResult = validateSingleId(beforeId, 'before');
    if (!beforeResult.valid) {
      return { valid: false, reason: beforeResult.reason };
    }
    beforeIndex = beforeResult.index;
    beforePos = beforeResult.pos;
  }

  // Validate afterId if provided
  let afterIndex;
  let afterPos;

  if (afterId) {
    const afterResult = validateSingleId(afterId, 'after');
    if (!afterResult.valid) {
      return { valid: false, reason: afterResult.reason };
    }
    afterIndex = afterResult.index;
    afterPos = afterResult.pos;
  }

  // Check 3: beforeId and afterId must not be the same
  if (beforeId && afterId && beforeId === afterId) {
    return {
      valid: false,
      reason: `DND_VALIDATION_FAILED: beforeId and afterId are the same: "${beforeId}"`
    };
  }

  // Check 4: If both provided, they must be ADJACENT in sorted order
  if (beforeIndex !== undefined && afterIndex !== undefined) {
    // Adjacent means afterIndex = beforeIndex + 1
    if (afterIndex - beforeIndex !== 1) {
      return {
        valid: false,
        reason: `DND_VALIDATION_FAILED: beforeId (index ${beforeIndex}) and afterId (index ${afterIndex}) are not adjacent. Gap: ${afterIndex - beforeIndex - 1}`
      };
    }
  }

  // All validations passed
  return {
    valid: true,
    beforeIndex,
    afterIndex,
    beforePos,
    afterPos
  };
};

/**
 * Fallback strategy: Move to bottom of the list/board
 * This is SAFE and prevents order corruption when validation fails
 */
const getFallbackPosition = (items) => {
  const lastItem = items[items.length - 1];
  const lastPos = lastItem?.position ?? 0;

  // Place at bottom with a generous gap
  return {
    position: lastPos <= 0 ? DEFAULT_POSITION_GAP : lastPos + DEFAULT_POSITION_GAP,
    needsRebalancing: true,  // Trigger rebalancing to recover from bad state
    usedFallback: true
  };
};

/**
 * Logs invalid DND context for monitoring/debugging
 */
const logInvalidDndContext = (reason, metadata) => {
  console.warn('[positionCalculator] ' + reason, {
    ...metadata,
    timestamp: new Date().toISOString()
  });
};

/**
 * ============================================================================
 * TASK POSITION CALCULATION
 * ============================================================================
 */

/**
 * Calculate position for a task within a list
 *
 * PRODUCTION-SAFE: Validates all inputs before calculating position.
 * If validation fails, uses fallback strategy (move to bottom).
 *
 * @param {String} listId - Target list ID
 * @param {Object} input - Position input with beforeId/afterId
 * @param {String} excludeTaskId - Task being moved (excluded from search)
 * @returns {Object} PositionResult with position and needsRebalancing flag
 */
const calculateTaskPosition = async (listId, input, excludeTaskId) => {
  const { beforeId, afterId } = input;

  // Get tasks in the list sorted by position (exclude the moving task)
  const query = { list_id: new mongoose.Types.ObjectId(listId) };
  if (excludeTaskId) {
    query._id = { $ne: new mongoose.Types.ObjectId(excludeTaskId) };
  }

  const tasksInList = await Task.find(query)
    .select('_id position')
    .sort({ position: 1, _id: 1 }) // Secondary sort by _id prevents flicker on duplicate positions
    .lean();

  // Case: Empty list
  if (tasksInList.length === 0) {
    return { position: DEFAULT_POSITION_GAP, needsRebalancing: false };
  }

  // VALIDATE beforeId/afterId BEFORE using them
  const validation = validateDndContext(
    tasksInList,
    beforeId,
    afterId,
    excludeTaskId
  );

  if (!validation.valid) {
    // Validation failed - use fallback strategy
    logInvalidDndContext(validation.reason, {
      listId,
      beforeId,
      afterId,
      excludeId: excludeTaskId
    });
    return getFallbackPosition(tasksInList);
  }

  // Validation passed - safe to calculate position
  return calculatePositionFromNeighbors(
    validation.beforePos ?? null,
    validation.afterPos ?? null,
    tasksInList
  );
};

/**
 * ============================================================================
 * LIST POSITION CALCULATION
 * ============================================================================
 */

/**
 * Calculate position for a list within a board
 *
 * PRODUCTION-SAFE: Validates all inputs before calculating position.
 * If validation fails, uses fallback strategy (move to bottom).
 *
 * @param {String} boardId - Target board ID
 * @param {Object} input - Position input with beforeId/afterId
 * @param {String} excludeListId - List being moved (excluded from search)
 * @returns {Object} PositionResult with position and needsRebalancing flag
 */
const calculateListPosition = async (boardId, input, excludeListId) => {
  const { beforeId, afterId } = input;

  // Get lists in the board sorted by position (exclude the moving list)
  const query = { board_id: new mongoose.Types.ObjectId(boardId) };
  if (excludeListId) {
    query._id = { $ne: new mongoose.Types.ObjectId(excludeListId) };
  }

  const listsInBoard = await List.find(query)
    .select('_id position')
    .sort({ position: 1, _id: 1 })
    .lean();

  // Case: Empty board
  if (listsInBoard.length === 0) {
    return { position: DEFAULT_POSITION_GAP, needsRebalancing: false };
  }

  // VALIDATE beforeId/afterId BEFORE using them
  const validation = validateDndContext(
    listsInBoard,
    beforeId,
    afterId,
    excludeListId
  );

  if (!validation.valid) {
    // Validation failed - use fallback strategy
    logInvalidDndContext(validation.reason, {
      boardId,
      beforeId,
      afterId,
      excludeId: excludeListId
    });
    return getFallbackPosition(listsInBoard);
  }

  // Validation passed - safe to calculate position
  return calculatePositionFromNeighbors(
    validation.beforePos ?? null,
    validation.afterPos ?? null,
    listsInBoard
  );
};

/**
 * ============================================================================
 * CORE POSITION CALCULATION LOGIC
 * ============================================================================
 */

/**
 * Core position calculation logic
 * ONLY called after validation has passed - inputs are guaranteed safe
 *
 * @param {Number|null} beforePos - Position of item before drop target
 * @param {Number|null} afterPos - Position of item after drop target
 * @param {Array} items - All items in the list/board
 * @returns {Object} PositionResult with position and needsRebalancing flag
 */
const calculatePositionFromNeighbors = (beforePos, afterPos, items) => {
  let position;
  let needsRebalancing = false;

  // Handle null/undefined/0 positions as 0
  const safeBefore = beforePos ?? 0;
  const safeAfter = afterPos ?? 0;

  // Case 1: Move to TOP (only afterId provided)
  if (beforePos === null && afterPos !== null) {
    // If afterPos is 0 or very small, use half of DEFAULT_GAP
    position = safeAfter <= 0 ? DEFAULT_POSITION_GAP / 2 : safeAfter / 2;
    needsRebalancing = position < MIN_POSITION_GAP;
  }
  // Case 2: Move to BOTTOM (only beforeId provided)
  else if (beforePos !== null && afterPos === null) {
    position = safeBefore + DEFAULT_POSITION_GAP;
  }
  // Case 3: Move BETWEEN items (both provided)
  else if (beforePos !== null && afterPos !== null) {
    // If both are 0 or equal, assign positions with gap and trigger rebalancing
    if (safeBefore === safeAfter) {
      // If both are 0, use DEFAULT_GAP/2 to create space
      position = safeBefore <= 0 ? DEFAULT_POSITION_GAP / 2 : safeBefore + DEFAULT_POSITION_GAP / 2;
      needsRebalancing = true; // trigger rebalancing to fix the 0-position issue
    } else {
      position = (safeBefore + safeAfter) / 2;
      needsRebalancing = Math.abs(safeAfter - safeBefore) < MIN_POSITION_GAP * 2;
    }
  }
  // Case 4: No neighbors provided - insert at bottom
  else {
    const lastItem = items[items.length - 1];
    const lastPos = lastItem?.position ?? 0;
    position = (lastPos || 0) + DEFAULT_POSITION_GAP;
  }

  return { position, needsRebalancing, usedFallback: false };
};

/**
 * ============================================================================
 * NEXT POSITION HELPERS
 * ============================================================================
 */

/**
 * Get the next position for a new item at the bottom of a list
 * Handles the case where all tasks have position 0 (legacy data)
 */
const getNextTaskPosition = async (listId) => {
  const lastTask = await Task.findOne({ list_id: new mongoose.Types.ObjectId(listId) })
    .select('position')
    .sort({ position: -1 })
    .lean();

  const lastPosition = lastTask?.position ?? 0;

  // If last position is 0 or very small, start from DEFAULT_GAP
  // This handles legacy tasks with position 0
  if (lastPosition <= 0) {
    return DEFAULT_POSITION_GAP;
  }

  return lastPosition + DEFAULT_POSITION_GAP;
};

/**
 * Get the next position for a new list at the bottom of a board
 * Handles the case where all lists have position 0 (legacy data)
 */
const getNextListPosition = async (boardId) => {
  const lastList = await List.findOne({ board_id: new mongoose.Types.ObjectId(boardId) })
    .select('position')
    .sort({ position: -1 })
    .lean();

  const lastPosition = lastList?.position ?? 0;

  // If last position is 0 or very small, start from DEFAULT_GAP
  if (lastPosition <= 0) {
    return DEFAULT_POSITION_GAP;
  }

  return lastPosition + DEFAULT_POSITION_GAP;
};

module.exports = {
  DEFAULT_POSITION_GAP,
  MIN_POSITION_GAP,
  calculateTaskPosition,
  calculateListPosition,
  getNextTaskPosition,
  getNextListPosition,
  calculatePositionFromNeighbors,
  validateDndContext,
  getFallbackPosition,
};
