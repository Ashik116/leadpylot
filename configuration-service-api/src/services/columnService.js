/**
 * Column Service
 * Business logic for column preference management
 * 
 * Features:
 * - In-memory caching for default preferences
 * - Batch operations for bulk updates
 * - Input sanitization and validation
 * - Optimistic locking with version control
 * - Consistent error handling and responses
 */

const mongoose = require('mongoose');
const { ColumnPreference, User } = require('../models');
const logger = require('../utils/logger');
const { NotFoundError, ValidationError } = require('../utils/errorHandler');
const { eventEmitter, EVENT_TYPES } = require('../utils/events');

// ============================================================================
// Constants
// ============================================================================

const ENCODED_DOT = '__DOT__';
const CACHE_TTL_MS = 60 * 1000; // 1 minute cache for default preferences
const MAX_BATCH_SIZE = 100; // Maximum users to process in a single batch
const VALID_TABLE_NAME_REGEX = /^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/;

// ============================================================================
// Cache for Default Preferences
// ============================================================================

let defaultPreferenceCache = {
  data: null,
  expiresAt: 0,
};

/**
 * Get cached default preference or fetch from DB
 * @returns {Promise<Object|null>}
 */
async function getCachedDefaultPreference() {
  const now = Date.now();
  
  if (defaultPreferenceCache.data && defaultPreferenceCache.expiresAt > now) {
    return defaultPreferenceCache.data;
  }
  
  const defaultPref = await ColumnPreference.findOne({ isDefault: true }).lean();
  
  if (defaultPref) {
    defaultPreferenceCache = {
      data: defaultPref,
      expiresAt: now + CACHE_TTL_MS,
    };
  }
  
  return defaultPref;
}

/**
 * Invalidate the default preference cache
 */
function invalidateDefaultPreferenceCache() {
  defaultPreferenceCache = { data: null, expiresAt: 0 };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Safely convert string/ObjectId to MongoDB ObjectId
 * @param {String|ObjectId} id - The ID to convert
 * @returns {ObjectId|null}
 */
function toObjectId(id) {
  if (!id) return null;
  if (id instanceof mongoose.Types.ObjectId) return id;
  try {
    return new mongoose.Types.ObjectId(String(id));
  } catch {
    return null;
  }
}

/**
 * Encode object keys containing dots for Mongoose Map compatibility
 * @param {Object} obj - Object to encode
 * @returns {Object}
 */
function encodeMapKeys(obj) {
  if (!obj || typeof obj !== 'object') return {};
  
  const encoded = {};
  for (const [key, value] of Object.entries(obj)) {
    const encodedKey = key.replace(/\./g, ENCODED_DOT);
    encoded[encodedKey] = value;
  }
  return encoded;
}

/**
 * Decode object keys that were encoded for Mongoose Map
 * @param {Object|Map} obj - Object or Map to decode
 * @returns {Object}
 */
function decodeMapKeys(obj) {
  if (!obj || typeof obj !== 'object') return {};
  
  const decoded = {};
  const entries = obj instanceof Map ? obj.entries() : Object.entries(obj);
  
  for (const [key, value] of entries) {
    const decodedKey = key.replace(new RegExp(ENCODED_DOT, 'g'), '.');
    decoded[decodedKey] = value;
  }
  return decoded;
}

/**
 * Safely convert Map or corrupted Map data to a plain object
 * Handles cases where Mongoose creates a Map from a JSON string
 * @param {Map|Object|String} val - The value to convert
 * @returns {Object}
 */
function safeMapToObject(val) {
  if (!val) return {};
  
  if (val instanceof Map) {
    const firstKey = val.keys().next().value;
    
    // Detect corrupted Map (created from string - keys are character indices)
    if (firstKey === '0' || firstKey === 0) {
      let jsonStr = '';
      for (const char of val.values()) {
        jsonStr += char;
      }
      try {
        const parsed = JSON.parse(jsonStr);
        return typeof parsed === 'object' ? parsed : {};
      } catch {
        logger.warn('Failed to parse corrupted Map data');
        return {};
      }
    }
    
    // Normal Map - convert to object
    const obj = {};
    for (const [key, value] of val.entries()) {
      obj[key] = value;
    }
    return obj;
  }
  
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      return typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }
  
  return typeof val === 'object' ? val : {};
}

/**
 * Sanitize table name to prevent injection attacks
 * @param {String} tableName - Table name to validate
 * @returns {String|null} - Sanitized table name or null if invalid
 */
function sanitizeTableName(tableName) {
  if (!tableName || typeof tableName !== 'string') return null;
  const trimmed = tableName.trim();
  return VALID_TABLE_NAME_REGEX.test(trimmed) ? trimmed : null;
}

/**
 * Extract iterable entries from Map or Object
 * @param {Map|Object} data - Data structure to iterate
 * @returns {Iterator}
 */
function getEntries(data) {
  if (!data) return [];
  return data instanceof Map ? data.entries() : Object.entries(data);
}

/**
 * Get value from Map or Object by key
 * @param {Map|Object} data - Data structure
 * @param {String} key - Key to look up
 * @returns {*}
 */
function getValue(data, key) {
  if (!data) return undefined;
  return data instanceof Map ? data.get(key) : data[key];
}

// ============================================================================
// Data Transformation Helpers
// ============================================================================

/**
 * Transform raw preference data to clean response format
 * @param {Object} prefs - Raw preference document
 * @param {Object} options - Transformation options
 * @returns {Object}
 */
function transformPreferenceData(prefs, options = {}) {
  const { table = null, filterForRole = null, isUsingDefault = false } = options;
  
  const data = {
    columnOrders: {},
    columnVisibility: {},
    isDragModeEnabled: prefs.data?.isDragModeEnabled ?? false,
    hasHydrated: prefs.data?.hasHydrated ?? false,
  };

  // Transform columnOrders
  if (prefs.data?.columnOrders) {
    for (const [tableName, val] of getEntries(prefs.data.columnOrders)) {
      data.columnOrders[tableName] = Array.isArray(val) ? [...val] : [];
    }
  }

  // Transform columnVisibility
  if (prefs.data?.columnVisibility) {
    for (const [tableName, val] of getEntries(prefs.data.columnVisibility)) {
      const visibilityObj = safeMapToObject(val);
      data.columnVisibility[tableName] = decodeMapKeys(visibilityObj);
    }
  }

  // Filter visible columns for non-admin users using default preferences
  if (isUsingDefault && filterForRole && 
      filterForRole !== 'Admin' && filterForRole !== 'Super Admin') {
    for (const [tableName, visibility] of Object.entries(data.columnVisibility)) {
      const visibleColumns = Object.keys(visibility).filter(col => visibility[col] === true);
      
      if (data.columnOrders[tableName]) {
        data.columnOrders[tableName] = data.columnOrders[tableName]
          .filter(col => visibleColumns.includes(col));
      }
      
      data.columnVisibility[tableName] = Object.fromEntries(
        visibleColumns.map(col => [col, true])
      );
    }
  }

  // Filter to specific table if requested
  if (table) {
    return {
      columnOrders: data.columnOrders[table] || [],
      columnVisibility: data.columnVisibility[table] || {},
      isDragModeEnabled: data.isDragModeEnabled,
      hasHydrated: data.hasHydrated,
    };
  }

  return data;
}

/**
 * Build update fields for column preference save operation
 * @param {Object} data - Input data
 * @param {Object} existing - Existing preference document
 * @param {Object} auditInfo - Audit information
 * @returns {Object}
 */
function buildUpdateFields(data, existing, auditInfo) {
  const updateFields = {};

  for (const [key, value] of Object.entries(data)) {
    if (!value || typeof value !== 'object') continue;
    
    if (key === 'columnOrders') {
      for (const [tableName, val] of Object.entries(value)) {
        const sanitizedTable = sanitizeTableName(tableName);
        if (!sanitizedTable) continue;
        updateFields[`data.columnOrders.${sanitizedTable}`] = Array.isArray(val) ? val : [];
      }
    } else if (key === 'columnVisibility') {
      for (const [tableName, val] of Object.entries(value)) {
        const sanitizedTable = sanitizeTableName(tableName);
        if (!sanitizedTable) continue;
        
        // Get existing visibility and merge
        let existingVal = {};
        const visibilityData = existing?.data?.columnVisibility;
        if (visibilityData) {
          const tableData = getValue(visibilityData, tableName);
          if (tableData) {
            existingVal = decodeMapKeys(safeMapToObject(tableData));
          }
        }
        
        const valObj = (val && typeof val === 'object') ? val : {};
        const mergedVal = { ...existingVal, ...valObj };
        updateFields[`data.columnVisibility.${sanitizedTable}`] = encodeMapKeys(mergedVal);
      }
    } else if (['isDragModeEnabled', 'hasHydrated'].includes(key)) {
      updateFields[`data.${key}`] = Boolean(value);
    }
  }

  // Add audit info
  updateFields.version = auditInfo.version ?? existing?.version ?? 0;
  updateFields.updatedAt = new Date();
  updateFields.updatedBy = auditInfo.updatedBy;

  return updateFields;
}

// ============================================================================
// Column Service Class
// ============================================================================

class ColumnService {
  
  // --------------------------------------------------------------------------
  // Public Methods
  // --------------------------------------------------------------------------

  /**
   * Save or update column preference for one or multiple users
   * @param {Array} user_ids - Array of user IDs to update
   * @param {Object} data - Column preference data
   * @param {Number} version - Version number
   * @param {String} loggedInUserId - ID of user making the change
   * @param {Boolean} isAdmin - Whether user is admin
   * @returns {Promise<Object>}
   */
  async saveColumnPreference(user_ids, data, version, loggedInUserId, isAdmin) {
    // Validate inputs
    this._validateSaveInput(data, loggedInUserId);

    // Resolve target user IDs
    const targetUserIds = await this._resolveTargetUsers(user_ids, loggedInUserId, isAdmin);

    // Validate permissions
    this._validateUpdatePermissions(targetUserIds, loggedInUserId, isAdmin);

    const loggedInUserObjId = toObjectId(loggedInUserId);
    const results = [];
    const validUserIds = [];

    // Pre-validate all user IDs
    for (const user_id of targetUserIds) {
      const userObjId = toObjectId(user_id);
      if (!userObjId) {
        results.push({
          user_id,
          matched: 0,
          upserted: 0,
          error: 'Invalid user_id format',
        });
      } else {
        validUserIds.push({ original: user_id, objectId: userObjId });
      }
    }

    // Process in batches for large updates
    const batches = this._chunkArray(validUserIds, MAX_BATCH_SIZE);
    
    for (const batch of batches) {
      const batchResults = await this._processSaveBatch(batch, data, version, loggedInUserObjId);
      results.push(...batchResults);
    }

    // Log success
    const successCount = results.filter(r => !r.error).length;
    logger.info('Column preferences updated', {
      total: results.length,
      success: successCount,
      failed: results.length - successCount,
      updatedBy: loggedInUserId,
    });

    return {
      success: true,
      message: `Column preference(s) processed: ${successCount} successful, ${results.length - successCount} failed`,
      results,
    };
  }

  /**
   * Get column preference by document ID
   * @param {String} id - Column preference document ID
   * @returns {Promise<Object>}
   */
  async getColumnPreferenceById(id) {
    const objectId = toObjectId(id);
    if (!objectId) {
      throw new ValidationError('Invalid preference ID format');
    }

    const prefs = await ColumnPreference.findById(objectId);
    if (!prefs) {
      throw new NotFoundError('Column preference not found');
    }
    
    return prefs;
  }

  /**
   * Delete column preference by ID
   * @param {String} id - Column preference document ID
   * @returns {Promise<Object>}
   */
  async deleteColumnPreference(id) {
    const objectId = toObjectId(id);
    if (!objectId) {
      throw new ValidationError('Invalid preference ID format');
    }

    const deleted = await ColumnPreference.findByIdAndDelete(objectId);
    if (!deleted) {
      throw new NotFoundError('Column preference not found');
    }

    logger.info('Column preference deleted', { id });
    
    eventEmitter.emit(EVENT_TYPES.COLUMN_PREFERENCE.DELETED, {
      id,
      deletedAt: new Date().toISOString(),
    });

    return { 
      success: true, 
      message: 'Column preference deleted successfully' 
    };
  }

  /**
   * Create or update default column preference (Admin only)
   * Uses atomic operation to prevent race conditions
   * @param {Object} data - Column preference data
   * @param {Number} version - Version number
   * @param {String} admin_id - Admin user ID
   * @returns {Promise<Object>}
   */
  async createDefaultColumnPreference(data, version, admin_id) {
    if (!data || typeof data !== 'object') {
      throw new ValidationError('Data object is required');
    }

    const adminObjId = toObjectId(admin_id);
    if (!adminObjId) {
      throw new ValidationError('Invalid admin ID');
    }

    const updateFields = this._buildDefaultUpdateFields(data, version, adminObjId);

    // Atomic upsert operation
    const result = await ColumnPreference.findOneAndUpdate(
      { isDefault: true },
      {
        $set: updateFields,
        $setOnInsert: { 
          createdAt: new Date(),
          isDefault: true,
        },
      },
      { 
        upsert: true, 
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    // Invalidate cache
    invalidateDefaultPreferenceCache();

    // Cleanup orphaned records
    await ColumnPreference.deleteMany({ 
      user_id: { $size: 0 }, 
      isDefault: false 
    });

    const isNewlyCreated = result.upsertedId !== undefined;
    const eventType = isNewlyCreated 
      ? EVENT_TYPES.COLUMN_PREFERENCE.DEFAULT_CREATED 
      : EVENT_TYPES.COLUMN_PREFERENCE.DEFAULT_UPDATED;

    logger.info(`Default column preference ${isNewlyCreated ? 'created' : 'updated'}`, { admin_id });
    
    eventEmitter.emit(eventType, {
      [isNewlyCreated ? 'createdBy' : 'updatedBy']: admin_id,
      data,
    });

    return {
      success: true,
      message: `Default column preference ${isNewlyCreated ? 'created' : 'updated'} successfully`,
      ...(isNewlyCreated && { defaultPref: result }),
    };
  }

  /**
   * Get column preferences for a user
   * Falls back to default preference if user has none
   * @param {String} user_id - User ID
   * @param {String} table - Optional table filter
   * @param {Boolean} getDefault - If true, return default preference only
   * @param {String} user_role - User role for visibility filtering
   * @returns {Promise<Object>}
   */
  async getColumnPreferencesForUser(user_id, table = null, getDefault = false, user_role = null) {
    const sanitizedTable = table ? sanitizeTableName(table) : null;
    if (table && !sanitizedTable) {
      throw new ValidationError('Invalid table name format');
    }

    let prefs;
    let isUsingDefault = false;

    if (getDefault) {
      prefs = await getCachedDefaultPreference();
      if (!prefs) {
        throw new NotFoundError('No default column preferences found');
      }
      isUsingDefault = true;
    } else {
      const userObjId = toObjectId(user_id);
      if (userObjId) {
        prefs = await ColumnPreference.findOne({ user_id: userObjId }).lean();
      }

      if (!prefs) {
        prefs = await getCachedDefaultPreference();
        if (!prefs) {
          throw new NotFoundError('No column preferences found');
        }
        isUsingDefault = true;
      }
    }

    const responseData = transformPreferenceData(prefs, {
      table: sanitizedTable,
      filterForRole: user_role,
      isUsingDefault,
    });

    return { 
      success: true,
      data: responseData, 
      version: prefs.version,
      isDefault: isUsingDefault,
    };
  }

  /**
   * Get column preferences for multiple users (Admin only)
   * Optimized with bulk queries
   * @param {Array} user_ids - Array of user IDs
   * @param {String} table - Optional table filter
   * @param {String} role - Optional role filter
   * @returns {Promise<Object>}
   */
  async getColumnPreferencesForMultipleUsers(user_ids, table = null, role = null) {
    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      throw new ValidationError('user_ids array is required');
    }

    const sanitizedTable = table ? sanitizeTableName(table) : null;
    if (table && !sanitizedTable) {
      throw new ValidationError('Invalid table name format');
    }

    // Resolve target users
    const targetUserIds = await this._resolveAllUsersIfRequested(user_ids, role);

    // Convert to ObjectIds and filter valid ones
    const targetObjectIds = targetUserIds
      .map(id => ({ original: id, objectId: toObjectId(id) }))
      .filter(item => item.objectId !== null);

    if (targetObjectIds.length === 0) {
      return {
        success: true,
        message: 'No valid user IDs provided',
        count: 0,
        results: [],
      };
    }

    // Bulk fetch operations
    const [defaultPref, users, userPrefs] = await Promise.all([
      getCachedDefaultPreference(),
      User.find(
        { _id: { $in: targetObjectIds.map(t => t.objectId) } },
        { _id: 1, login: 1, info: 1, name: 1, role: 1 }
      ).lean(),
      ColumnPreference.find({
        user_id: { $in: targetObjectIds.map(t => t.objectId) },
        isDefault: { $ne: true },
      }).lean(),
    ]);

    // Build lookup maps
    const userInfoMap = new Map(
      users.map(u => [u._id.toString(), u])
    );

    const userPrefMap = new Map();
    for (const pref of userPrefs) {
      if (Array.isArray(pref.user_id)) {
        for (const uid of pref.user_id) {
          userPrefMap.set(uid.toString(), pref);
        }
      }
    }

    // Build results
    const results = targetObjectIds.map(({ original, objectId }) => {
      const userId = objectId.toString();
      const userInfo = userInfoMap.get(userId);
      let prefs = userPrefMap.get(userId);
      let usedDefault = false;

      if (!prefs && defaultPref) {
        prefs = defaultPref;
        usedDefault = true;
      }

      if (!prefs) {
        return {
          usersInfo: { user_id: original, name: null },
          error: 'No preference found (and no default available)',
          isDefault: false,
        };
      }

      const transformedData = transformPreferenceData(prefs, { table: sanitizedTable });

      return {
        usersInfo: {
          user_id: original,
          name: userInfo?.name || userInfo?.login || userInfo?.info?.name || null,
        },
        ...(sanitizedTable 
          ? { 
              columnOrders: { [sanitizedTable]: transformedData.columnOrders },
              columnVisibility: { [sanitizedTable]: transformedData.columnVisibility },
            }
          : { data: transformedData, version: prefs.version }
        ),
        isDefault: usedDefault,
      };
    });

    const response = {
      success: true,
      message: 'Column preferences fetched successfully',
      count: results.length,
    };

    if (sanitizedTable) {
      response.results = [{ table: sanitizedTable, data: results }];
    } else {
      response.results = results;
    }

    return response;
  }

  /**
   * Reset user column preference to default for a specific table
   * @param {String} user_id - User ID
   * @param {String} table - Table name
   * @returns {Promise<Object>}
   */
  async resetUserColumnPreferenceToDefault(user_id, table) {
    const sanitizedTable = sanitizeTableName(table);
    if (!sanitizedTable) {
      throw new ValidationError('Valid table name is required');
    }

    const userObjId = toObjectId(user_id);
    if (!userObjId) {
      throw new ValidationError('Invalid user_id format');
    }

    const defaultPref = await getCachedDefaultPreference();
    if (!defaultPref) {
      throw new NotFoundError('Default column preference not found');
    }

    // Extract table-specific data from default
    const defaultTableOrder = getValue(defaultPref.data?.columnOrders, sanitizedTable);
    const defaultTableVisibility = getValue(defaultPref.data?.columnVisibility, sanitizedTable);

    if (!defaultTableOrder && !defaultTableVisibility) {
      throw new NotFoundError(`No default configuration found for table '${sanitizedTable}'`);
    }

    const updateFields = {
      [`data.columnOrders.${sanitizedTable}`]: Array.isArray(defaultTableOrder) 
        ? [...defaultTableOrder] 
        : [],
      [`data.columnVisibility.${sanitizedTable}`]: safeMapToObject(defaultTableVisibility),
      version: defaultPref.version,
      updatedBy: userObjId,
      updatedAt: new Date(),
    };

    const result = await ColumnPreference.updateOne(
      { user_id: userObjId },
      {
        $set: updateFields,
        $setOnInsert: { 
          createdAt: new Date(), 
          user_id: [userObjId],
        },
      },
      { upsert: true }
    );

    logger.info('User column preference reset to default', { user_id, table: sanitizedTable });

    eventEmitter.emit(EVENT_TYPES.COLUMN_PREFERENCE.RESET_TO_DEFAULT, {
      user_id,
      table: sanitizedTable,
    });

    const wasUpdated = result.matchedCount > 0;
    const wasCreated = result.upsertedCount > 0;

    if (!wasUpdated && !wasCreated) {
      throw new Error(`Could not reset '${sanitizedTable}' column preference to default`);
    }

    return {
      success: true,
      message: wasUpdated 
        ? `Your '${sanitizedTable}' column preference has been reset to default successfully.`
        : `Your '${sanitizedTable}' column preference was created from default successfully.`,
    };
  }

  // --------------------------------------------------------------------------
  // Private Methods
  // --------------------------------------------------------------------------

  /**
   * Validate save operation input
   * @private
   */
  _validateSaveInput(data, loggedInUserId) {
    if (!data || typeof data !== 'object') {
      throw new ValidationError('Invalid request: data object is required');
    }
    if (!loggedInUserId) {
      throw new ValidationError('Invalid request: loggedInUserId is required');
    }
  }

  /**
   * Resolve target user IDs, handling "all" keyword
   * @private
   */
  async _resolveTargetUsers(user_ids, loggedInUserId, isAdmin) {
    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return [loggedInUserId];
    }

    const hasAllKeyword = user_ids.some(id => String(id).toLowerCase() === 'all');

    if (hasAllKeyword) {
      if (!isAdmin) {
        throw new ValidationError('Only admin can update all users');
      }

      const allUsers = await User.find({ role: { $ne: 'Admin' } }, '_id').lean();
      
      if (allUsers.length === 0) {
        throw new NotFoundError('No non-admin users found');
      }

      return allUsers.map(u => u._id.toString());
    }

    return user_ids;
  }

  /**
   * Resolve all users if "all" keyword is present, with optional role filter
   * @private
   */
  async _resolveAllUsersIfRequested(user_ids, role) {
    const hasAllKeyword = user_ids.some(id => String(id).toLowerCase() === 'all');

    if (!hasAllKeyword) {
      return user_ids;
    }

    const query = role ? { role: new RegExp(`^${role}$`, 'i') } : {};
    const allUsers = await User.find(query, { _id: 1 }).lean();
    
    return allUsers.map(user => user._id.toString());
  }

  /**
   * Validate update permissions
   * @private
   */
  _validateUpdatePermissions(targetUserIds, loggedInUserId, isAdmin) {
    const loggedInUserIdStr = String(loggedInUserId);
    const nonSelfIds = targetUserIds.filter(id => String(id) !== loggedInUserIdStr);

    if (nonSelfIds.length > 0 && !isAdmin) {
      throw new ValidationError('Admin role required to update other users');
    }
  }

  /**
   * Process a batch of users for save operation
   * @private
   */
  async _processSaveBatch(batch, data, version, loggedInUserObjId) {
    const results = [];

    // Fetch existing preferences for the batch
    const existingPrefs = await ColumnPreference.find({
      user_id: { $in: batch.map(b => b.objectId) },
    }).lean();

    const existingMap = new Map();
    for (const pref of existingPrefs) {
      if (Array.isArray(pref.user_id)) {
        for (const uid of pref.user_id) {
          existingMap.set(uid.toString(), pref);
        }
      }
    }

    // Build bulk operations
    const bulkOps = [];

    for (const { original, objectId } of batch) {
      const existing = existingMap.get(objectId.toString());
      const updateFields = buildUpdateFields(data, existing, {
        version,
        updatedBy: loggedInUserObjId,
      });

      bulkOps.push({
        updateOne: {
          filter: { user_id: objectId },
          update: {
            $set: updateFields,
            $setOnInsert: { 
              createdAt: new Date(), 
              user_id: [objectId],
            },
          },
          upsert: true,
        },
      });
    }

    // Execute bulk write
    if (bulkOps.length > 0) {
      const bulkResult = await ColumnPreference.bulkWrite(bulkOps, { ordered: false });

      // Map results back to users
      for (let i = 0; i < batch.length; i++) {
        const { original, objectId } = batch[i];
        
        results.push({
          user_id: original,
          matched: bulkResult.matchedCount > i ? 1 : 0,
          upserted: bulkResult.upsertedCount > i ? 1 : 0,
        });

        // Emit events
        eventEmitter.emit(EVENT_TYPES.COLUMN_PREFERENCE.UPDATED, {
          user_id: original,
          updatedBy: loggedInUserObjId,
          data,
        });
      }
    }

    return results;
  }

  /**
   * Build update fields for default preference
   * @private
   */
  _buildDefaultUpdateFields(data, version, adminObjId) {
    const updateFields = {
      updatedAt: new Date(),
      updatedBy: adminObjId,
      user_id: [],
    };

    if (version !== undefined) {
      updateFields.version = version;
    }

    if (data.columnOrders) {
      for (const [table, order] of Object.entries(data.columnOrders)) {
        const sanitizedTable = sanitizeTableName(table);
        if (sanitizedTable) {
          updateFields[`data.columnOrders.${sanitizedTable}`] = Array.isArray(order) ? order : [];
        }
      }
    }

    if (data.columnVisibility) {
      for (const [table, visibility] of Object.entries(data.columnVisibility)) {
        const sanitizedTable = sanitizeTableName(table);
        if (sanitizedTable) {
          const visObj = (visibility && typeof visibility === 'object') ? visibility : {};
          updateFields[`data.columnVisibility.${sanitizedTable}`] = encodeMapKeys(visObj);
        }
      }
    }

    if (data.isDragModeEnabled !== undefined) {
      updateFields['data.isDragModeEnabled'] = Boolean(data.isDragModeEnabled);
    }
    if (data.hasHydrated !== undefined) {
      updateFields['data.hasHydrated'] = Boolean(data.hasHydrated);
    }

    return updateFields;
  }

  /**
   * Split array into chunks
   * @private
   */
  _chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}

// Export singleton instance
module.exports = new ColumnService();
