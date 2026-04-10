const mongoose = require('mongoose');
const { Source } = require('../models');
const { NotFoundError, ValidationError } = require('../utils/errorHandler');
const { eventEmitter, EVENT_TYPES } = require('../utils/events');
const logger = require('../utils/logger');

const HEX_COLOR = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;

/**
 * Normalize optional hex color: empty → null; add leading #; validate.
 * @param {unknown} input
 * @returns {string|null}
 */
function normalizeSourceColor(input) {
  if (input === undefined) return undefined;
  if (input == null || input === '') return null;
  let s = String(input).trim();
  if (s === '') return null;
  if (!s.startsWith('#')) s = `#${s}`;
  if (!HEX_COLOR.test(s)) {
    throw new ValidationError('Color must be a valid hex code (e.g. #3B82F6 or #RGB)');
  }
  return s.toLowerCase();
}

/**
 * Source Service
 * Manages lead source (UTM source) operations
 */
class SourceService {
  /**
   * Get all sources with filtering and pagination
   * @param {Object} query - Query parameters
   * @returns {Promise<Object>} - Sources with pagination info
   */
  async getAllSources(query = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        search = '',
        showInactive = 'false',
        provider_id,
        select
      } = query;

      // Build filter conditions
      const filter = {};

      // Only show active sources by default
      if (showInactive !== 'true') {
        filter.active = true;
      }

      // Filter by provider if specified
      if (provider_id) {
        if (!mongoose.Types.ObjectId.isValid(provider_id)) {
          throw new ValidationError('Invalid provider ID format');
        }
        filter.provider_id = provider_id;
      }

      // Add search functionality
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } }
        ];
      }

      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Handle sorting
      const allowedSortFields = {
        'name': 'name',
        'price': 'price',
        'provider': 'provider_id',
        'lead_count': 'lead_count',
        'createdAt': 'createdAt',
        'updatedAt': 'updatedAt'
      };

      const sortField = allowedSortFields[sortBy] || 'createdAt';
      const sortDirection = sortOrder === 'asc' ? 1 : -1;


      logger.info('Selecting fields', { select });
      // Execute query with pagination
      const [sources, total] = await Promise.all([
        Source.find(filter)
          .select(select)
          .sort({ [sortField]: sortDirection })
          .skip(skip)
          .limit(parseInt(limit))
          .populate('provider_id', 'login info role')
          .lean(),
        Source.countDocuments(filter)
      ]);

      let formattedSources = [];
      if (select && select !== '') {
        // When specific fields are selected, only include those fields
        const selectedFields = String(select)
          .split(/[ ,]+/)
          .map(f => f.trim())
          .filter(Boolean);

        formattedSources = sources.map(source => {
          const item = {};

          // Always include id as string for consistency
          if (source._id) {
            item.id = String(source._id);
          }

          for (const field of selectedFields) {
            if (field === 'provider' || field === 'provider_id') {
              // Normalize provider field name and shape
              if (source.provider_id) {
                item.provider = {
                  _id: source.provider_id._id,
                  name: source.provider_id.info?.name,
                  email: source.provider_id.info?.email,
                  login: source.provider_id.login,
                  role: source.provider_id.role,
                };
              } else {
                item.provider = null;
              }
            } else if (field === '_id') {
              // If explicitly requested, include _id as well
              item._id = source._id;
            } else {
              // Copy over scalar fields that exist on the source
              if (Object.prototype.hasOwnProperty.call(source, field)) {
                item[field] = source[field];
              }
            }
          }

          return item;
        });
      } else {
        // Format response using toResponse method when no select or empty select
        formattedSources = sources.map(source => {
          // Manually format since we used lean()
          let provider = null;
          if (source.provider_id) {
            provider = {
              _id: source.provider_id._id,
              name: source.provider_id.info?.name,
              email: source.provider_id.info?.email,
              login: source.provider_id.login,
              role: source.provider_id.role,
            };
          }

          return {
            _id: source._id,
            id: source._id.toString(), // MATCH MONOLITH: Add id field
            name: source.name,
            price: source.price,
            color: source.color ?? null,
            provider: provider,
            lead_count: source.lead_count,
            active: source.active,
            createdAt: source.createdAt,
            updatedAt: source.updatedAt,
          };
        });
      }


      logger.info('Sources fetched successfully', {
        total,
        page: parseInt(page),
        limit: parseInt(limit)
      });

      return {
        data: formattedSources,
        meta: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit)),
        },
      };
    } catch (error) {
      logger.error('Error fetching sources', { error: error.message });
      throw error;
    }
  }

  /**
   * Get source by ID
   * @param {string} id - Source ID
   * @returns {Promise<Object>} - Source object
   */
  async getSourceById(id) {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ValidationError('Invalid source ID format');
      }

      const source = await Source.findOne({ _id: id, active: true })
        .populate('provider_id', 'login info role');

      if (!source) {
        throw new NotFoundError('Source not found');
      }

      logger.info('Source fetched successfully', { sourceId: id });
      const response = source.toResponse();

      // MATCH MONOLITH: Add id field
      response.id = response._id.toString();

      return response;
    } catch (error) {
      logger.error('Error fetching source', { error: error.message, sourceId: id });
      throw error;
    }
  }

  /**
   * Create a new source
   * @param {Object} sourceData - Source data
   * @param {Object} user - User who created the source
   * @returns {Promise<Object>} - Created source
   */
  async createSource(sourceData, user = null) {
    try {
      // Empty string from forms must not reach Mongoose ObjectId (cast fails on "")
      if (Object.prototype.hasOwnProperty.call(sourceData, 'provider_id')) {
        const pid = sourceData.provider_id;
        if (pid === '' || pid === null || pid === undefined) {
          sourceData.provider_id = null;
        } else if (!mongoose.Types.ObjectId.isValid(pid)) {
          throw new ValidationError('Invalid provider ID format');
        }
      }

      // Remove lead_count from sourceData as it should only be updated internally
      if (sourceData.lead_count !== undefined) {
        delete sourceData.lead_count;
      }

      if (Object.prototype.hasOwnProperty.call(sourceData, 'color')) {
        const normalized = normalizeSourceColor(sourceData.color);
        if (normalized === undefined) {
          delete sourceData.color;
        } else {
          sourceData.color = normalized;
        }
      }

      // Create new source
      const newSource = new Source(sourceData);
      await newSource.save();

      // Populate provider for response
      await newSource.populate('provider_id', 'login info role');

      // Emit source created event
      if (user) {
        eventEmitter.emit(EVENT_TYPES.SOURCE.CREATED, {
          source: newSource,
          user,
        });
      }

      logger.info('Source created successfully', { sourceId: newSource._id });
      return newSource.toResponse();
    } catch (error) {
      logger.error('Error creating source', { error: error.message, sourceData });
      throw error;
    }
  }

  /**
   * Update source data
   * @param {string} id - Source ID
   * @param {Object} updateData - Data to update
   * @param {Object} user - User who updated the source
   * @returns {Promise<Object>} - Updated source
   */
  async updateSource(id, updateData, user = null) {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ValidationError('Invalid source ID format');
      }

      // Remove lead_count from updateData as it should only be updated internally
      if (updateData.lead_count !== undefined) {
        delete updateData.lead_count;
      }

      // Clear or validate provider_id (UI often sends "" to mean "no provider")
      if (Object.prototype.hasOwnProperty.call(updateData, 'provider_id')) {
        const pid = updateData.provider_id;
        if (pid === '' || pid === null || pid === undefined) {
          updateData.provider_id = null;
        } else if (!mongoose.Types.ObjectId.isValid(pid)) {
          throw new ValidationError('Invalid provider ID format');
        }
      }

      if (Object.prototype.hasOwnProperty.call(updateData, 'color')) {
        const normalized = normalizeSourceColor(updateData.color);
        updateData.color = normalized === undefined ? null : normalized;
      }

      // Find and update source
      const source = await Source.findOneAndUpdate(
        { _id: id, active: true },
        { $set: updateData },
        { new: true, runValidators: true }
      ).populate('provider_id', 'login info role');

      if (!source) {
        throw new NotFoundError('Source not found');
      }

      // Emit source updated event
      if (user) {
        eventEmitter.emit(EVENT_TYPES.SOURCE.UPDATED, {
          source,
          user,
          updateData,
        });
      }

      logger.info('Source updated successfully', { sourceId: id });
      return source.toResponse();
    } catch (error) {
      logger.error('Error updating source', { error: error.message, sourceId: id });
      throw error;
    }
  }

  /**
   * Delete source (soft delete)
   * @param {string|Array} ids - Source ID or array of IDs
   * @param {Object} user - User who deleted the source
   * @returns {Promise<Object>} - Deletion result
   */
  async deleteSource(ids, user = null) {
    try {
      // Handle both single ID and array of IDs
      const sourceIds = Array.isArray(ids) ? ids : [ids];

      // Validate all IDs
      for (const id of sourceIds) {
        if (!mongoose.Types.ObjectId.isValid(id)) {
          throw new ValidationError(`Invalid source ID format: ${id}`);
        }
      }

      // For activity logging, fetch source information before deletion
      let sourceInfo = {};
      if (user && sourceIds.length === 1) {
        try {
          const source = await Source.findById(sourceIds[0]);
          if (source) {
            sourceInfo = {
              sourceName: source.name,
              sourceDetails: source.toObject(),
            };
          }
        } catch (error) {
          logger.error('Error fetching source before deletion', { error: error.message });
        }
      }

      // Soft delete by setting active to false
      const result = await Source.updateMany(
        { _id: { $in: sourceIds }, active: true },
        { $set: { active: false } }
      );

      const modifiedCount = result.modifiedCount || result.nModified || 0;

      if (modifiedCount === 0) {
        throw new NotFoundError('No sources found to delete');
      }

      // Emit source deleted event
      if (user) {
        eventEmitter.emit(EVENT_TYPES.SOURCE.DELETED, {
          sourceIds,
          user,
          ...sourceInfo,
        });
      }

      logger.info('Sources deleted successfully', {
        sourceIds,
        deletedCount: modifiedCount
      });

      return {
        success: true,
        message: `${modifiedCount} source(s) deleted successfully`,
        deletedCount: modifiedCount,
      };
    } catch (error) {
      logger.error('Error deleting sources', { error: error.message, sourceIds: ids });
      throw error;
    }
  }

  /**
   * Increment lead count for a source
   * @param {string} sourceId - Source ID
   * @param {number} count - Number to increment by (default: 1)
   * @returns {Promise<Object>} - Updated source
   */
  async incrementLeadCount(sourceId, count = 1) {
    try {
      if (!mongoose.Types.ObjectId.isValid(sourceId)) {
        throw new ValidationError('Invalid source ID format');
      }

      const source = await Source.findOneAndUpdate(
        { _id: sourceId, active: true },
        { $inc: { lead_count: count } },
        { new: true }
      );

      if (!source) {
        throw new NotFoundError('Source not found');
      }

      logger.info('Source lead count incremented', {
        sourceId,
        count,
        newCount: source.lead_count
      });

      return source.toResponse();
    } catch (error) {
      logger.error('Error incrementing lead count', {
        error: error.message,
        sourceId,
        count
      });
      throw error;
    }
  }

  /**
   * Decrement lead count for a source
   * @param {string} sourceId - Source ID
   * @param {number} count - Number to decrement by (default: 1)
   * @returns {Promise<Object>} - Updated source
   */
  async decrementLeadCount(sourceId, count = 1) {
    try {
      if (!mongoose.Types.ObjectId.isValid(sourceId)) {
        throw new ValidationError('Invalid source ID format');
      }

      const source = await Source.findOneAndUpdate(
        { _id: sourceId, active: true },
        { $inc: { lead_count: -count } },
        { new: true }
      );

      if (!source) {
        throw new NotFoundError('Source not found');
      }

      // Ensure lead_count doesn't go below 0
      if (source.lead_count < 0) {
        source.lead_count = 0;
        await source.save();
      }

      logger.info('Source lead count decremented', {
        sourceId,
        count,
        newCount: source.lead_count
      });

      return source.toResponse();
    } catch (error) {
      logger.error('Error decrementing lead count', {
        error: error.message,
        sourceId,
        count
      });
      throw error;
    }
  }
}

module.exports = new SourceService();

