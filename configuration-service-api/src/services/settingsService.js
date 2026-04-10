const { Settings } = require('../models');
const Document = require('../models/Document');
const EmailTemplateCategory = require('../models/EmailTemplateCategory');
const mongoose = require('mongoose');
const { eventEmitter, EVENT_TYPES } = require('../utils/events');
const logger = require('../utils/logger');
const path = require('path');
const ObjectId = mongoose.Types.ObjectId;

class SettingsService {
  /**
   * Get allowed sort fields for a specific settings type
   * @param {string} type - The type of settings
   * @returns {Object} - Map of allowed sort fields
   */
  getAllowedSortFields(type) {
    const commonFields = {
      'name': 'name',
      'createdAt': 'createdAt',
      'updatedAt': 'updatedAt'
    };

    const typeSpecificFields = {
      'payment_terms': {
        ...commonFields,
        'type': 'info.type',
        'months': 'info.info.months'
      },
      'bonus_amount': {
        ...commonFields,
        'bonus_amount': 'info.bonus_amount',
        'amount': 'info.amount',
        'code': 'info.code'
      },
      'stage': {
        ...commonFields,
        'description': 'info.description'
      },
      'voipservers': {
        ...commonFields,
        'domain': 'info.domain',
        'websocket_address': 'info.websocket_address'
      },
      // email_templates excluded (future Email Service)
    };

    return typeSpecificFields[type] || commonFields;
  }

  /**
   * Get all settings of a specific type
   * @param {string} type - The type of settings to retrieve
   * @returns {Promise<Array>} - Array of settings
   */
  async getSetttingsByType(type) {
    try {
      const settings = await Settings.find({ type }).lean();
      return settings;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all settings of a specific type with pagination, search, and sorting
   * @param {string} type - The type of settings to retrieve
   * @param {Object} options - Pagination and filtering options
   * @param {number} options.page - Page number (default: 1)
   * @param {number} options.limit - Items per page (default: 20)
   * @param {string} options.search - Search term to filter by name (optional)
   * @param {string} options.sortBy - Sort field (default: createdAt)
   * @param {string} options.sortOrder - Sort order (asc/desc, default: desc)
   * @returns {Promise<Object>} - Paginated settings with metadata
   */
  async getSetttingsByTypeWithPagination(type, options = {}) {
    try {
      const { page = 1, limit = 20, search = '', sortBy = 'createdAt', sortOrder = 'desc', select = '' } = options;

      // Calculate pagination
      const skip = (page - 1) * limit;

      // Build query
      const query = { type };

      // Add search filter if provided
      if (search && search.trim() !== '') {
        query.name = { $regex: search.trim(), $options: 'i' };
      }

      // Build sort object with type-specific allowed fields
      const allowedSortFields = this.getAllowedSortFields(type);
      const sortField = allowedSortFields[sortBy] || 'createdAt';
      const sortObj = {};
      sortObj[sortField] = sortOrder === 'asc' ? 1 : -1;

      // Get total count for pagination
      const total = await Settings.countDocuments(query);

      // Get paginated settings
      const settings = await Settings.find(query)
        .select(select)
        .sort(sortObj)
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

      // Special handling for email_templates to populate category and projects
      let transformedSettings = settings;
      if (type === 'email_templates') {
        transformedSettings = await Promise.all(settings.map(async (setting) => {
          let categoryDocument = null;
          const categoryId = setting.info?.category_id;
          if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
            categoryDocument = await this.fetchCategoryById(categoryId);
          }

          // Populate projects for email templates
          let populatedProjects = [];
          if (setting.projects && setting.projects.length > 0) {
            const Project = require('../models/Project');
            populatedProjects = await Project.find({
              _id: { $in: setting.projects }
            }).select('_id name').lean();
          }

          return {
            ...setting,
            id: setting._id.toString(),
            gender_type: setting.gender_type || null,
            projects: populatedProjects,
            info: {
              ...setting.info,
              category_id: categoryDocument || categoryId || null,
              category_id: categoryDocument || categoryId || null, // Populate category_id with full object or keep original
              how_many_offers: setting.info?.how_many_offers ?? 1, // Default 1 for backward compatibility
            }
          };
        }));
      } else {
        // MATCH MONOLITH: Add id field to each setting
        transformedSettings = settings.map(setting => ({
          ...setting,
          id: setting._id.toString()
        }));
      }

      // Build pagination metadata
      const meta = {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      };

      return {
        data: transformedSettings,
        meta,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get a specific setting by type and ID
   * MATCHES MONOLITH: Returns exact same structure as production
   * @param {string} type - The type of setting
   * @param {string} id - The ID of the setting
   * @returns {Promise<Object>} - The setting object
   */
  async getSettingById(type, id) {
    try {
      const setting = await Settings.findOne({
        _id: id,
        type,
      }).lean();

      if (!setting) {
        throw new Error('Setting not found');
      }

      // MATCH MONOLITH: Add id field
      setting.id = setting._id.toString();

      return setting;
    } catch (error) {
      throw error;
    }
  }


  /**
   * Fetch category by ID from DB (same collection as email-service-api)
   * @param {string} categoryId - Category ID
   * @returns {Promise<Object|null>} Category object or null
   */
  async fetchCategoryById(categoryId) {
    try {
      if (!categoryId || !mongoose.Types.ObjectId.isValid(categoryId)) {
        return null;
      }
      const category = await EmailTemplateCategory.findById(categoryId)
        .populate('created_by', 'login email')
        .populate('updated_by', 'login email')
        .lean();
      return category || null;
    } catch (error) {
      logger.warn('Failed to fetch email template category', {
        categoryId,
        error: error.message,
      });
      return null;
    }
  }

  async getEmailTemplateById(id) {
    try {
      const emailTemplate = await Settings.findOne({ _id: id, type: 'email_templates' }).lean();
      if (!emailTemplate) {
        throw new Error('Email template not found');
      }

      let signatureDocument = null;
      const signatureFileId = emailTemplate.info.signature_file_id;
      if (signatureFileId && mongoose.Types.ObjectId.isValid(signatureFileId)) {
        signatureDocument = await Document.findById(signatureFileId).lean();
      }

      let categoryDocument = null;
      const categoryId = emailTemplate.info.category_id;
      if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
        categoryDocument = await this.fetchCategoryById(categoryId);
      }

      // Populate projects
      let populatedProjects = [];
      if (emailTemplate.projects && emailTemplate.projects.length > 0) {
        const Project = require('../models/Project');
        populatedProjects = await Project.find({
          _id: { $in: emailTemplate.projects }
        }).select('_id name').lean();
      }

      const formattedTemplate = {
        _id: emailTemplate._id,
        name: emailTemplate.name,
        template_content: emailTemplate.info.template_content,
        subject: emailTemplate.info?.subject ?? '',
        include_signature: emailTemplate.info.include_signature || false,
        has_signature_file: !!emailTemplate.info.signature_file_id,
        signature_file_id: signatureDocument || (signatureFileId || null),
        category_id: categoryDocument || (categoryId || null),
        gender_type: emailTemplate.gender_type || null,
        projects: populatedProjects,
        how_many_offers: emailTemplate.info?.how_many_offers ?? 1,
        created_at: emailTemplate.createdAt,
        updated_at: emailTemplate.updatedAt,
      };
      return formattedTemplate;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create a new setting or update an existing one
   * @param {string} type - The type of setting
   * @param {Object} data - The setting data
   * @param {string} [id=null] - The ID of the setting to update (if updating)
   * @returns {Promise<Object>} - The created or updated setting
   */
  async updateOrCreateSetting(type, data, id = null, creator) {
    try {
      const { name, ...info } = data;

      // Validate required fields
      if (!name) {
        throw new Error('Name is required');
      }

      // If this is a stage type, process the statuses to add ObjectIds
      // Handle both direct info.statuses and nested info.info.statuses formats
      const stageInfo = info.info ? info.info : info;
      const statuses = stageInfo.statuses;

      if (type === 'stage' && statuses && Array.isArray(statuses)) {
        // Check for duplicate status names within the same stage
        const statusNames = statuses.map((status) => status.name.trim().toLowerCase());
        const duplicateStatusNames = statusNames.filter(
          (name, index) => statusNames.indexOf(name) !== index
        );

        if (duplicateStatusNames.length > 0) {
          throw new Error(
            `Status names must be unique. Duplicate name(s): ${duplicateStatusNames.join(', ')}`
          );
        }

        // Check for status names that exist in other stages
        const allStages = await Settings.find({ type: 'stage' }).lean();
        const existingStatusNames = new Set();

        // Skip the current stage if we're updating
        const otherStages = id
          ? allStages.filter((stage) => stage._id.toString() !== id)
          : allStages;

        // Collect all existing status names from other stages
        otherStages.forEach((stage) => {
          if (stage.info && Array.isArray(stage.info.statuses)) {
            stage.info.statuses.forEach((status) => {
              existingStatusNames.add(status.name.trim().toLowerCase());
            });
          }
        });

        // Check if any of the new status names already exist
        const conflictingNames = [];
        statuses.forEach((status) => {
          if (existingStatusNames.has(status.name.trim().toLowerCase())) {
            conflictingNames.push(status.name);
          }
        });

        if (conflictingNames.length > 0) {
          throw new Error(
            `Status names must be unique across all stages. Conflicting name(s): ${conflictingNames.join(', ')}`
          );
        }

        // Map through each status and ensure they use MongoDB ObjectIds for _id
        stageInfo.statuses = statuses.map((status) => {
          // Create a clean status object without the id field
          const { id, ...cleanStatus } = status;

          // If no _id exists, create a new ObjectId
          if (!cleanStatus._id) {
            return { ...cleanStatus, _id: new mongoose.Types.ObjectId() };
          }

          // If _id exists but is a string, convert to ObjectId
          if (cleanStatus._id && typeof cleanStatus._id === 'string') {
            return {
              ...cleanStatus,
              _id: mongoose.Types.ObjectId.isValid(cleanStatus._id)
                ? new mongoose.Types.ObjectId(cleanStatus._id)
                : new mongoose.Types.ObjectId(),
            };
          }

          return cleanStatus;
        });
      }

      if (id) {
        // Get original setting data for comparison
        const originalSetting = await Settings.findOne({ _id: id, type }).lean();

        if (!originalSetting) {
          throw new Error('Setting not found');
        }

        // Check if name is being changed and if the new name already exists
        if (name !== originalSetting.name) {
          const existingWithSameName = await Settings.findOne({
            type,
            name,
            _id: { $ne: id },
          });

          if (existingWithSameName) {
            throw new Error(`A ${type} with this name already exists`);
          }
        }

        // Update existing setting
        // For stage type, ensure we have the correct info structure
        let updateData;
        if (type === 'stage') {
          // If we have a nested info.info structure, flatten it
          if (info.info) {
            updateData = { name, info: info.info };
          } else {
            updateData = { name, info };
          }
        } else {
          updateData = { name, info };
        }

        const updatedSetting = await Settings.findOneAndUpdate(
          { _id: id, type },
          { $set: updateData },
          { new: true }
        );

        // Emit event for activity logging
        if (type === 'stage') {
          // Emit stage-specific event for better activity logging
          eventEmitter.emit(EVENT_TYPES.STAGE.UPDATED, {
            stage: updatedSetting,
            creator,
            changes: { name, info },
            originalStage: originalSetting,
          });

          // Check for status changes to emit specific events
          if (info.statuses && originalSetting.info.statuses) {
            const originalStatusIds = originalSetting.info.statuses.map((s) => s._id.toString());
            const newStatusIds = info.statuses.map((s) => s._id.toString());

            // Find new statuses (created)
            const newStatuses = info.statuses.filter(
              (s) => !originalStatusIds.includes(s._id.toString())
            );
            newStatuses.forEach((status) => {
              eventEmitter.emit(EVENT_TYPES.STAGE.STATUS_CREATED, {
                stage: updatedSetting,
                status,
                creator,
              });
            });

            // Find removed statuses (deleted)
            const removedStatusIds = originalStatusIds.filter((id) => !newStatusIds.includes(id));
            removedStatusIds.forEach((statusId) => {
              const originalStatus = originalSetting.info.statuses.find(
                (s) => s._id.toString() === statusId
              );
              if (originalStatus) {
                eventEmitter.emit(EVENT_TYPES.STAGE.STATUS_DELETED, {
                  stage: updatedSetting,
                  status: originalStatus,
                  creator,
                });
              }
            });

            // Find updated statuses
            const updatedStatusIds = originalStatusIds.filter((id) => newStatusIds.includes(id));
            updatedStatusIds.forEach((statusId) => {
              const originalStatus = originalSetting.info.statuses.find(
                (s) => s._id.toString() === statusId
              );
              const newStatus = info.statuses.find((s) => s._id.toString() === statusId);

              if (
                originalStatus &&
                newStatus &&
                (originalStatus.name !== newStatus.name ||
                  originalStatus.code !== newStatus.code ||
                  originalStatus.allowed !== newStatus.allowed)
              ) {
                eventEmitter.emit(EVENT_TYPES.STAGE.STATUS_UPDATED, {
                  stage: updatedSetting,
                  status: newStatus,
                  creator,
                  changes: newStatus,
                  originalStatus,
                });
              }
            });
          }
        } else {
          // Emit regular setting update event
          eventEmitter.emit(EVENT_TYPES.SETTINGS.UPDATED, {
            setting: updatedSetting,
            creator,
            changes: { name, info },
            originalSetting,
          });
        }

        return updatedSetting;
      } else {
        // Check for duplicate name within the same type
        const existingSetting = await Settings.findOne({
          type,
          name,
        });

        if (existingSetting) {
          throw new Error(`A ${type} with this name already exists`);
        }

        // Create new setting
        // For stage type, ensure we have the correct info structure
        let settingData;
        if (type === 'stage') {
          // If we have a nested info.info structure, flatten it
          if (info.info) {
            settingData = {
              type,
              name,
              info: info.info,
            };
          } else {
            settingData = {
              type,
              name,
              info,
            };
          }
        } else {
          settingData = {
            type,
            name,
            info,
          };
        }

        const newSetting = new Settings(settingData);

        const savedSetting = await newSetting.save();

        // Emit event for activity logging
        if (type === 'stage') {
          // Emit stage-specific event for better activity logging
          eventEmitter.emit(EVENT_TYPES.STAGE.CREATED, {
            stage: savedSetting,
            creator,
          });

          // Emit events for each status created
          const statusesArray =
            info.info && Array.isArray(info.info.statuses)
              ? info.info.statuses
              : info.statuses && Array.isArray(info.statuses)
                ? info.statuses
                : [];
          if (statusesArray.length > 0) {
            statusesArray.forEach((status) => {
              eventEmitter.emit(EVENT_TYPES.STAGE.STATUS_CREATED, {
                stage: savedSetting,
                status,
                creator,
              });
            });
          }
        } else {
          // Emit regular setting created event
          eventEmitter.emit(EVENT_TYPES.SETTINGS.CREATED, {
            setting: savedSetting,
            creator,
          });
        }

        return savedSetting;
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete a setting by type and ID
   * @param {string} type - The type of setting
   * @param {string} id - The ID of the setting to delete
   * @returns {Promise<boolean>} - True if deleted successfully
   */
  async deleteSetting(type, id, user) {
    try {
      const setting = await Settings.findOne({ _id: id, type }).lean();

      if (!setting) {
        throw new Error('Setting not found');
      }

      // Clean up bidirectional relationship for email templates
      if (type === 'email_templates' && setting.projects && setting.projects.length > 0) {
        const Project = require('../models/Project');
        await Project.updateMany(
          { _id: { $in: setting.projects } },
          { $pull: { email_templates: id } }
        );
      }

      const deletedSetting = await Settings.findOneAndDelete({
        _id: id,
        type,
      });

      // Emit event for activity logging
      if (type === 'stage') {
        // Emit stage-specific event for better activity logging
        eventEmitter.emit(EVENT_TYPES.STAGE.DELETED, {
          stage: deletedSetting,
          creator: user || { _id: 'system' },
        });

        // Emit events for each status deleted
        if (setting.info && setting.info.statuses && Array.isArray(setting.info.statuses)) {
          setting.info.statuses.forEach((status) => {
            eventEmitter.emit(EVENT_TYPES.STAGE.STATUS_DELETED, {
              stage: deletedSetting,
              status,
              creator: user || { _id: 'system' },
            });
          });
        }
      } else {
        // Emit regular setting deleted event
        eventEmitter.emit(EVENT_TYPES.SETTINGS.DELETED, {
          setting: deletedSetting,
          creator: user || { _id: 'system' },
        });
      }

      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Bulk delete settings by type and IDs
   * @param {string} type - The type of settings
   * @param {Array} ids - Array of setting IDs to delete
   * @param {Object} user - User performing the deletion
   * @returns {Promise<Object>} Result with success and failure counts
   */
  async bulkDeleteSettings(type, ids, user) {
    try {

      // - turn into _type
      type = type.replace(/-/g, '_');

      if (!Array.isArray(ids) || ids.length === 0) {
        throw new Error('IDs must be a non-empty array');
      }

      // Validate all IDs are valid MongoDB ObjectIds
      const validIds = ids.filter(id => mongoose.Types.ObjectId.isValid(id));
      if (validIds.length !== ids.length) {
        throw new Error('All IDs must be valid MongoDB ObjectIds');
      }

      const results = {
        successful: [],
        failed: [],
        totalProcessed: 0,
        successCount: 0,
        failureCount: 0,
      };

      // Find all settings that exist for the given type
      const settings = await Settings.find({
        _id: { $in: validIds },
        type,
      });


      // Track which settings were found
      const foundIds = settings.map(setting => setting._id.toString());
      const notFoundIds = validIds.filter(id => !foundIds.includes(id));

      // Add not found IDs to failed results
      notFoundIds.forEach(id => {
        results.failed.push({
          id,
          error: 'Setting not found',
        });
      });

      // Process each found setting
      for (const setting of settings) {
        try {
          // Store setting data before deletion for activity logging
          const settingData = setting.toObject();

          // Delete the setting
          const deletedSetting = await Settings.findOneAndDelete({
            _id: setting._id,
            type,
          });

          // Emit event for activity logging
          if (type === 'stage') {
            // Emit stage-specific event for better activity logging
            eventEmitter.emit(EVENT_TYPES.STAGE.DELETED, {
              stage: deletedSetting,
              creator: user || { _id: 'system' },
            });

            // Emit events for each status deleted
            if (settingData.info && settingData.info.statuses && Array.isArray(settingData.info.statuses)) {
              settingData.info.statuses.forEach((status) => {
                eventEmitter.emit(EVENT_TYPES.STAGE.STATUS_DELETED, {
                  stage: deletedSetting,
                  status,
                  creator: user || { _id: 'system' },
                });
              });
            }
          } else {
            // Emit regular setting deleted event
            eventEmitter.emit(EVENT_TYPES.SETTINGS.DELETED, {
              setting: deletedSetting,
              creator: user || { _id: 'system' },
            });
          }

          results.successful.push({
            _id: setting._id,
            name: setting.name,
          });
        } catch (error) {
          results.failed.push({
            id: setting._id.toString(),
            error: error.message,
          });
        }
      }

      // Update counters
      results.totalProcessed = validIds.length;
      results.successCount = results.successful.length;
      results.failureCount = results.failed.length;

      // Emit bulk delete event for activity logging
      if (results.successCount > 0) {
        eventEmitter.emit(EVENT_TYPES.SETTINGS.BULK_DELETED, {
          settingIds: validIds,
          settingType: type,
          successCount: results.successCount,
          failureCount: results.failureCount,
          user,
        });
      }

      // Build response message
      const message = `Bulk delete completed. ${results.successCount} ${type} settings deleted, ${results.failureCount} failed.`;

      return {
        message,
        results,
      };
    } catch (error) {
      throw error;
    }
  }

  async bulkDeleteEmailTemplates(ids, user) {
    try {
      const results = {
        successful: [],
        failed: [],
        totalProcessed: 0,
        successCount: 0,
        failureCount: 0,
      };
      logger.info(`Bulk deleting email templates`, { ids });
      if (!Array.isArray(ids) || ids.length === 0) {
        throw new Error('IDs must be a non-empty array');
      }

      // Validate all IDs are valid MongoDB ObjectIds
      const validIds = ids.filter(id => mongoose.Types.ObjectId.isValid(id));
      if (validIds.length !== ids.length) {
        throw new Error('All IDs must be valid MongoDB ObjectIds');
      }

      // Find all email templates that exist
      const emailTemplates = await Settings.find({
        _id: { $in: validIds },
        type: 'email_templates',
      });

      // Track which email templates were found
      const foundIds = emailTemplates.map(emailTemplate => emailTemplate._id.toString());
      const notFoundIds = validIds.filter(id => !foundIds.includes(id));

      // Add not found IDs to failed results
      notFoundIds.forEach(id => {
        results.failed.push({
          id,
          error: 'Email template not found',
        });
      });

      // Process each found email template
      for (const emailTemplate of emailTemplates) {
        try {
          // Clean up bidirectional relationship
          if (emailTemplate.projects && emailTemplate.projects.length > 0) {
            const Project = require('../models/Project');
            await Project.updateMany(
              { _id: { $in: emailTemplate.projects } },
              { $pull: { email_templates: emailTemplate._id } }
            );
          }

          const deletedEmailTemplate = await Settings.findOneAndDelete({
            _id: emailTemplate._id,
            type: 'email_templates',
          });

          // Emit event for activity logging using existing SETTINGS namespace
          eventEmitter.emit(EVENT_TYPES.SETTINGS.DELETED, {
            setting: deletedEmailTemplate,
            creator: user || { _id: 'system' },
          });

          results.successful.push({
            _id: emailTemplate._id,
            name: emailTemplate.name,
          });
        } catch (error) {
          results.failed.push({
            id: emailTemplate._id.toString(),
            error: error.message,
          });
        }
      }

      // Update counters and build response
      results.totalProcessed = validIds.length;
      results.successCount = results.successful.length;
      results.failureCount = results.failed.length;

      const message = `Bulk delete completed. ${results.successCount} email templates deleted, ${results.failureCount} failed.`;

      return {
        message,
        results,
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new SettingsService();
