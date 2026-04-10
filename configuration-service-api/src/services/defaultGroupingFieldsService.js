/**
 * Default Grouping Fields Service
 * Business logic for default grouping fields management
 */

const { DefaultGroupingFields } = require('../models');
const logger = require('../utils/logger');
const { NotFoundError, ValidationError } = require('../utils/errorHandler');

/**
 * Create or update default grouping fields for a user
 * @param {String} user_id - User ID
 * @param {Object} defaultGroupingFields - Nested object with model names as keys and field objects as values
 *                                 (e.g., {lead: {assign_date: true, lead_date: false}, offer: {agent_id: true}})
 * @param {Object} defaultFilter - Nested object with model names as keys and arrays of filter objects as values
 *                                 (e.g., {lead: [{field: "use_status", operator: "=", value: "yes"}], offer: [{field: "type", operator: "!=", value: "pending"}]})
 * @returns {Promise<Object>} - Created/updated default grouping fields
 */
async function createOrUpdateDefaultGroupingFields(user_id, defaultGroupingFields, defaultFilter = {}) {
  try {
    if (!user_id) {
      throw new ValidationError('user_id is required');
    }

    if (!defaultGroupingFields || typeof defaultGroupingFields !== 'object') {
      throw new ValidationError('defaultGroupingFields must be an object');
    }

    if (defaultFilter && typeof defaultFilter !== 'object') {
      throw new ValidationError('defaultFilter must be an object');
    }

    // Find existing record for this user
    const existing = await DefaultGroupingFields.findOne({ user_id });

    if (existing) {
      // Update existing record

      // Get existing defaultGroupingFields as a plain object
      const existingFields = {};
      if (existing.defaultGroupingFields && typeof existing.defaultGroupingFields === 'object') {
        // Handle both Map and plain object
        if (existing.defaultGroupingFields instanceof Map) {
          for (const [modelKey, modelFields] of existing.defaultGroupingFields.entries()) {
            if (modelFields instanceof Map) {
              existingFields[modelKey] = Object.fromEntries(modelFields.entries());
            } else {
              existingFields[modelKey] = modelFields;
            }
          }
        } else {
          Object.assign(existingFields, existing.defaultGroupingFields);
        }
      }

      // Merge defaultGroupingFields per model:
      // - For each model in defaultGroupingFields, merge its fields
      // - If a field is set to false, remove it from that model
      // - If a field is set to true, add/update it in that model
      // - Other models and fields remain unchanged
      const updatedFields = { ...existingFields };
      
      for (const [modelKey, modelFields] of Object.entries(defaultGroupingFields)) {
        if (!modelFields || typeof modelFields !== 'object') {
          continue; // Skip invalid model entries
        }

        // Initialize model if it doesn't exist
        if (!updatedFields[modelKey]) {
          updatedFields[modelKey] = {};
        }

        // Merge fields for this model
        for (const [fieldName, fieldValue] of Object.entries(modelFields)) {
          if (fieldValue === false) {
            // Remove the field if set to false
            delete updatedFields[modelKey][fieldName];
            // If model has no fields left, we can optionally remove the model key
            if (Object.keys(updatedFields[modelKey]).length === 0) {
              delete updatedFields[modelKey];
            }
          } else if (fieldValue === true) {
            // Add or update the field if set to true
            updatedFields[modelKey][fieldName] = true;
          }
        }
      }

      // Handle defaultFilter merge - expects arrays of filter objects per model
      // Structure: {modelName: [{field: "use_status", operator: "=", value: "yes"}, ...]}
      const existingFilters = {};
      if (existing.defaultFilter && typeof existing.defaultFilter === 'object') {
        if (existing.defaultFilter instanceof Map) {
          for (const [modelKey, modelFilters] of existing.defaultFilter.entries()) {
            if (Array.isArray(modelFilters)) {
              existingFilters[modelKey] = [...modelFilters];
            } else {
              existingFilters[modelKey] = modelFilters;
            }
          }
        } else {
          for (const [modelKey, modelFilters] of Object.entries(existing.defaultFilter)) {
            if (Array.isArray(modelFilters)) {
              existingFilters[modelKey] = [...modelFilters];
            } else {
              existingFilters[modelKey] = modelFilters;
            }
          }
        }
      }

      const updatedFilters = { ...existingFilters };
      
      // Merge defaultFilter if provided - replace entire array for each model
      if (defaultFilter && Object.keys(defaultFilter).length > 0) {
        for (const [modelKey, modelFilters] of Object.entries(defaultFilter)) {
          if (!Array.isArray(modelFilters)) {
            continue; // Skip invalid entries - must be array
          }

          // Validate filter objects structure
          const validFilters = modelFilters.filter(filter => 
            filter && 
            typeof filter === 'object' && 
            filter.field && 
            filter.operator && 
            filter.value !== undefined
          );

          // Replace entire filter array for this model
          if (validFilters.length > 0) {
            updatedFilters[modelKey] = validFilters;
          } else if (validFilters.length === 0 && updatedFilters[modelKey]) {
            // If empty array provided, remove the model's filters
            delete updatedFilters[modelKey];
          }
        }
      }

      // Update the document
      existing.defaultGroupingFields = updatedFields;
      existing.defaultFilter = updatedFilters;
      // Mark the Mixed fields as modified so Mongoose saves nested changes
      existing.markModified('defaultGroupingFields');
      existing.markModified('defaultFilter');
      await existing.save();

      logger.info('Default grouping fields updated', { user_id, updatedFields });

      return {
        message: 'Default grouping fields updated successfully',
        data: existing,
      };
    } else {
      // Create new record
      // Filter out fields with false values for new records
      const fieldsToSave = {};
      for (const [modelKey, modelFields] of Object.entries(defaultGroupingFields)) {
        if (!modelFields || typeof modelFields !== 'object') {
          continue;
        }

        const modelFieldsToSave = {};
        for (const [fieldName, fieldValue] of Object.entries(modelFields)) {
          if (fieldValue === true) {
            modelFieldsToSave[fieldName] = true;
          }
          // Skip fields with false values for new records
        }

        // Only add model if it has at least one field
        if (Object.keys(modelFieldsToSave).length > 0) {
          fieldsToSave[modelKey] = modelFieldsToSave;
        }
      }

      // Handle defaultFilter for new records - expects arrays of filter objects
      const filtersToSave = {};
      if (defaultFilter && Object.keys(defaultFilter).length > 0) {
        for (const [modelKey, modelFilters] of Object.entries(defaultFilter)) {
          if (Array.isArray(modelFilters)) {
            // Validate filter objects structure
            const validFilters = modelFilters.filter(filter => 
              filter && 
              typeof filter === 'object' && 
              filter.field && 
              filter.operator && 
              filter.value !== undefined
            );
            
            if (validFilters.length > 0) {
              filtersToSave[modelKey] = validFilters;
            }
          }
        }
      }

      const newRecord = new DefaultGroupingFields({
        user_id,
        defaultGroupingFields: fieldsToSave,
        defaultFilter: filtersToSave,
      });

      await newRecord.save();

      logger.info('Default grouping fields created', { user_id, fieldsToSave });

      return {
        message: 'Default grouping fields created successfully',
        data: newRecord,
      };
    }
  } catch (error) {
    logger.error('Error creating/updating default grouping fields:', error);
    throw error;
  }
}

/**
 * Get default grouping fields for a user
 * @param {String} user_id - User ID
 * @returns {Promise<Object>} - Default grouping fields
 */
async function getDefaultGroupingFieldsByUserId(user_id) {
  try {
    if (!user_id) {
      throw new ValidationError('user_id is required');
    }

    const record = await DefaultGroupingFields.findOne({ user_id });

    if (!record) {
      throw new NotFoundError('Default grouping fields not found for this user');
    }

    // Convert Map to plain object for response (handle nested structure)
    const defaultGroupingFields = {};
    if (record.defaultGroupingFields && typeof record.defaultGroupingFields === 'object') {
      if (record.defaultGroupingFields instanceof Map) {
        // Handle Map structure
        for (const [modelKey, modelFields] of record.defaultGroupingFields.entries()) {
          if (modelFields instanceof Map) {
            defaultGroupingFields[modelKey] = Object.fromEntries(modelFields.entries());
          } else {
            defaultGroupingFields[modelKey] = modelFields;
          }
        }
      } else {
        // Handle plain object structure
        Object.assign(defaultGroupingFields, record.defaultGroupingFields);
      }
    }

    // Convert defaultFilter Map to plain object for response (arrays of filter objects)
    const defaultFilter = {};
    if (record.defaultFilter && typeof record.defaultFilter === 'object') {
      if (record.defaultFilter instanceof Map) {
        for (const [modelKey, modelFilters] of record.defaultFilter.entries()) {
          if (Array.isArray(modelFilters)) {
            defaultFilter[modelKey] = [...modelFilters];
          } else {
            defaultFilter[modelKey] = modelFilters;
          }
        }
      } else {
        for (const [modelKey, modelFilters] of Object.entries(record.defaultFilter)) {
          if (Array.isArray(modelFilters)) {
            defaultFilter[modelKey] = [...modelFilters];
          } else {
            defaultFilter[modelKey] = modelFilters;
          }
        }
      }
    }

    return {
      user_id: record.user_id,
      defaultGroupingFields,
      defaultFilter,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  } catch (error) {
    logger.error('Error fetching default grouping fields:', error);
    throw error;
  }
}

/**
 * Create or update default grouping fields for multiple users
 * @param {Array} user_ids - Array of User IDs
 * @param {Object} defaultGroupingFields - Nested object with model names as keys and field objects as values
 * @param {Object} defaultFilter - Nested object with model names as keys and arrays of filter objects as values
 * @returns {Promise<Object>} - Results for all users processed
 */
async function createOrUpdateDefaultGroupingFieldsForMultipleUsers(user_ids, defaultGroupingFields, defaultFilter = {}) {
  try {
    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      throw new ValidationError('user_ids must be a non-empty array');
    }

    if (!defaultGroupingFields || typeof defaultGroupingFields !== 'object') {
      throw new ValidationError('defaultGroupingFields must be an object');
    }

    if (defaultFilter && typeof defaultFilter !== 'object') {
      throw new ValidationError('defaultFilter must be an object');
    }

    const results = [];

    // Process each user_id
    for (const user_id of user_ids) {
      try {
        const result = await createOrUpdateDefaultGroupingFields(user_id, defaultGroupingFields, defaultFilter);
        results.push({
          user_id,
          success: true,
          action: result.message.includes('created') ? 'created' : 'updated',
          data: result.data,
        });
      } catch (error) {
        logger.error(`Error processing user ${user_id}:`, error);
        results.push({
          user_id,
          success: false,
          error: error.message || 'Unknown error',
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    return {
      message: `Processed ${user_ids.length} user(s): ${successCount} succeeded, ${failureCount} failed`,
      total: user_ids.length,
      success: successCount,
      failed: failureCount,
      results,
    };
  } catch (error) {
    logger.error('Error creating/updating default grouping fields for multiple users:', error);
    throw error;
  }
}

/**
 * Get all default grouping fields by model name
 * @param {String} modelName - Model name (e.g., "lead", "offer")
 * @returns {Promise<Array>} - Array of records that have this model in defaultGroupingFields or defaultFilter
 */
async function getDefaultGroupingFieldsByModelName(modelName) {
  try {
    if (!modelName || typeof modelName !== 'string') {
      throw new ValidationError('modelName (page) is required and must be a string');
    }

    // Find all records where the model name exists in either defaultGroupingFields or defaultFilter
    // Populate user to get login information
    const allRecords = await DefaultGroupingFields.find({})
      .populate('user_id', 'login')
      .lean();

    const matchingRecords = [];

    for (const record of allRecords) {
      let hasModel = false;
      let modelGroupingFields = {};
      let modelFilters = [];

      // Check defaultGroupingFields
      if (record.defaultGroupingFields && typeof record.defaultGroupingFields === 'object') {
        const groupingFields = record.defaultGroupingFields instanceof Map
          ? Object.fromEntries(record.defaultGroupingFields.entries())
          : record.defaultGroupingFields;

        if (groupingFields[modelName]) {
          hasModel = true;
          modelGroupingFields = groupingFields[modelName];
        }
      }

      // Check defaultFilter
      if (record.defaultFilter && typeof record.defaultFilter === 'object') {
        const filters = record.defaultFilter instanceof Map
          ? Object.fromEntries(record.defaultFilter.entries())
          : record.defaultFilter;

        if (filters[modelName] && Array.isArray(filters[modelName])) {
          hasModel = true;
          modelFilters = Array.isArray(filters[modelName]) ? [...filters[modelName]] : [];
        }
      }

      // If model exists in either field, include this record
      if (hasModel) {
        matchingRecords.push({
          user_id: record.user_id?._id || record.user_id,
          user: {
            _id: record.user_id?._id || record.user_id,
            login: record.user_id?.login || null,
          },
          defaultGroupingFields: {
            [modelName]: modelGroupingFields
          },
          defaultFilter: {
            [modelName]: modelFilters
          },
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
        });
      }
    }

    return {
      modelName,
      count: matchingRecords.length,
      results: matchingRecords,
    };
  } catch (error) {
    logger.error('Error fetching default grouping fields by model name:', error);
    throw error;
  }
}

module.exports = {
  createOrUpdateDefaultGroupingFields,
  createOrUpdateDefaultGroupingFieldsForMultipleUsers,
  getDefaultGroupingFieldsByUserId,
  getDefaultGroupingFieldsByModelName,
};

