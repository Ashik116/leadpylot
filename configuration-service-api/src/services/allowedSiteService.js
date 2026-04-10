const mongoose = require('mongoose');
const AllowedSite = require('../models/AllowedSite');
const { NotFoundError, ValidationError, ConflictError } = require('../utils/errorHandler');
const logger = require('../utils/logger');

class AllowedSiteService {
  async getAllSites(query = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        search = '',
        showInactive = 'false',
      } = query;

      const filter = {};

      if (showInactive !== 'true') {
        filter.active = true;
      }

      if (search) {
        filter.$or = [
          { url: { $regex: search, $options: 'i' } },
          { name: { $regex: search, $options: 'i' } },
        ];
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const allowedSortFields = {
        url: 'url',
        name: 'name',
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
      };

      const sortField = allowedSortFields[sortBy] || 'createdAt';
      const sortDirection = sortOrder === 'asc' ? 1 : -1;

      const [sites, total] = await Promise.all([
        AllowedSite.find(filter)
          .sort({ [sortField]: sortDirection })
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        AllowedSite.countDocuments(filter),
      ]);

      const formattedSites = sites.map((site) => ({
        _id: site._id,
        id: site._id.toString(),
        url: site.url,
        name: site.name,
        active: site.active,
        createdAt: site.createdAt,
        updatedAt: site.updatedAt,
      }));

      logger.info('Allowed sites fetched', { total, page: parseInt(page) });

      return {
        data: formattedSites,
        meta: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit)),
        },
      };
    } catch (error) {
      logger.error('Error fetching allowed sites', { error: error.message });
      throw error;
    }
  }

  async getSiteById(id) {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ValidationError('Invalid site ID format');
      }

      const site = await AllowedSite.findById(id);

      if (!site) {
        throw new NotFoundError('Allowed site not found');
      }

      logger.info('Allowed site fetched', { siteId: id });
      return site.toResponse();
    } catch (error) {
      logger.error('Error fetching allowed site', { error: error.message, siteId: id });
      throw error;
    }
  }

  async createSite(data) {
    try {
      if (!data.url) {
        throw new ValidationError('Site URL is required');
      }

      const normalizedUrl = data.url.replace(/\/+$/, '').toLowerCase();
      const existing = await AllowedSite.findOne({ url: normalizedUrl });

      if (existing) {
        throw new ConflictError('This site URL is already registered');
      }

      const site = new AllowedSite(data);
      await site.save();

      logger.info('Allowed site created', { siteId: site._id, url: site.url });
      return site.toResponse();
    } catch (error) {
      logger.error('Error creating allowed site', { error: error.message });
      throw error;
    }
  }

  async updateSite(id, updateData) {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ValidationError('Invalid site ID format');
      }

      if (updateData.url) {
        updateData.url = updateData.url.replace(/\/+$/, '').toLowerCase();

        const existing = await AllowedSite.findOne({
          url: updateData.url,
          _id: { $ne: id },
        });

        if (existing) {
          throw new ConflictError('This site URL is already registered');
        }
      }

      const site = await AllowedSite.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!site) {
        throw new NotFoundError('Allowed site not found');
      }

      logger.info('Allowed site updated', { siteId: id });
      return site.toResponse();
    } catch (error) {
      logger.error('Error updating allowed site', { error: error.message, siteId: id });
      throw error;
    }
  }

  async deleteSite(ids) {
    try {
      const siteIds = Array.isArray(ids) ? ids : [ids];

      for (const id of siteIds) {
        if (!mongoose.Types.ObjectId.isValid(id)) {
          throw new ValidationError(`Invalid site ID format: ${id}`);
        }
      }

      const result = await AllowedSite.deleteMany({ _id: { $in: siteIds } });
      const deletedCount = result.deletedCount || 0;

      if (deletedCount === 0) {
        throw new NotFoundError('No allowed sites found to delete');
      }

      logger.info('Allowed sites deleted', { siteIds, deletedCount });

      return {
        success: true,
        message: `${deletedCount} allowed site(s) deleted successfully`,
        deletedCount,
      };
    } catch (error) {
      logger.error('Error deleting allowed sites', { error: error.message });
      throw error;
    }
  }
}

module.exports = new AllowedSiteService();
