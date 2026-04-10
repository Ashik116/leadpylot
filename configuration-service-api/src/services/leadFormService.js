const mongoose = require('mongoose');
const LeadForm = require('../models/LeadForm');
const { NotFoundError, ValidationError } = require('../utils/errorHandler');
const { toRevenueInt, formatRevenueForResponse } = require('../utils/revenue');
const { eventEmitter, EVENT_TYPES } = require('../utils/events');
const logger = require('../utils/logger');

class LeadFormService {
  async getAllLeadForms(query = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        search = '',
        source,
        site_link,
      } = query;

      const filter = {
        is_deleted: { $ne: true },
        use_status: { $nin: ['converted'] },
      };

      if (source) {
        filter.source = { $regex: source, $options: 'i' };
      }

      if (site_link) {
        filter.site_link = { $regex: site_link, $options: 'i' };
      }

      if (search) {
        filter.$or = [
          { first_name: { $regex: search, $options: 'i' } },
          { last_name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
          { source: { $regex: search, $options: 'i' } },
        ];
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const allowedSortFields = {
        first_name: 'first_name',
        last_name: 'last_name',
        email: 'email',
        source: 'source',
        expected_revenue: 'expected_revenue',
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
      };

      const sortField = allowedSortFields[sortBy] || 'createdAt';
      const sortDirection = sortOrder === 'asc' ? 1 : -1;

      const [leads, total] = await Promise.all([
        LeadForm.find(filter)
          .sort({ [sortField]: sortDirection })
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        LeadForm.countDocuments(filter),
      ]);

      const formattedLeads = leads.map((lead) => ({
        _id: lead._id,
        id: lead._id.toString(),
        first_name: lead.first_name,
        last_name: lead.last_name,
        contact_name: lead.contact_name,
        email: lead.email,
        phone: lead.phone,
        site_link: lead.site_link,
        source: lead.source,
        expected_revenue: formatRevenueForResponse(lead.expected_revenue),
        lead_source_no: lead.lead_source_no,
        createdAt: lead.createdAt,
        updatedAt: lead.updatedAt,
      }));

      logger.info('Lead forms fetched', { total, page: parseInt(page) });

      return {
        data: formattedLeads,
        meta: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit)),
        },
      };
    } catch (error) {
      logger.error('Error fetching lead forms', { error: error.message });
      throw error;
    }
  }

  async getLeadFormById(id) {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ValidationError('Invalid lead form ID format');
      }

      const lead = await LeadForm.findOne({ _id: id, is_deleted: { $ne: true } });

      if (!lead) {
        throw new NotFoundError('Lead form not found');
      }

      logger.info('Lead form fetched', { leadId: id });
      return lead.toResponse();
    } catch (error) {
      logger.error('Error fetching lead form', { error: error.message, leadId: id });
      throw error;
    }
  }

  async createLeadForm(data) {
    try {
      const { first_name, last_name, email } = data;

      if (!first_name || !last_name || !email) {
        throw new ValidationError('first_name, last_name, and email are required');
      }

      const lead = new LeadForm(data);
      await lead.save();

      eventEmitter.emit(EVENT_TYPES.LEAD_FORM.CREATED, { lead: lead.toResponse() });

      logger.info('Lead form created', { leadId: lead._id, source: lead.source });
      return lead.toResponse();
    } catch (error) {
      logger.error('Error creating lead form', { error: error.message });
      throw error;
    }
  }

  async updateLeadForm(id, updateData) {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ValidationError('Invalid lead form ID format');
      }

      if (updateData.expected_revenue !== undefined) {
        updateData.expected_revenue = toRevenueInt(updateData.expected_revenue);
      }

      const lead = await LeadForm.findOneAndUpdate(
        { _id: id, is_deleted: { $ne: true } },
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!lead) {
        throw new NotFoundError('Lead form not found');
      }

      logger.info('Lead form updated', { leadId: id });
      return lead.toResponse();
    } catch (error) {
      logger.error('Error updating lead form', { error: error.message, leadId: id });
      throw error;
    }
  }

  async deleteLeadForm(ids) {
    try {
      const leadIds = Array.isArray(ids) ? ids : [ids];

      for (const id of leadIds) {
        if (!mongoose.Types.ObjectId.isValid(id)) {
          throw new ValidationError(`Invalid lead form ID format: ${id}`);
        }
      }

      const result = await LeadForm.updateMany(
        { _id: { $in: leadIds }, is_deleted: { $ne: true } },
        { $set: { is_deleted: true } }
      );

      const modifiedCount = result.modifiedCount || result.nModified || 0;

      if (modifiedCount === 0) {
        throw new NotFoundError('No lead forms found to delete');
      }

      logger.info('Lead forms soft deleted', { leadIds, deletedCount: modifiedCount });

      return {
        success: true,
        message: `${modifiedCount} lead form(s) deleted successfully`,
        deletedCount: modifiedCount,
      };
    } catch (error) {
      logger.error('Error deleting lead forms', { error: error.message });
      throw error;
    }
  }
}

module.exports = new LeadFormService();
