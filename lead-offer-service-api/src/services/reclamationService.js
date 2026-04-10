const { Reclamation, User, Lead, Source } = require('../models');
const mongoose = require('mongoose');
const logger = require('../utils/logger');
const { eventEmitter, EVENT_TYPES } = require('./events');
const { ROLES } = require('../middleware/roles/roleDefinitions');
const { updateLeadStageAndStatus, updateLeadStageAndStatusByStatusId } = require('../utils/leadServiceUtils');

/**
 * Create reclamation request(s) - handles both single and bulk operations
 * @param {Object|Array} reclamationData - Single reclamation data object or array of reclamation data
 * @param {Object} creator - User creating the reclamation(s)
 * @returns {Object|Array} - Single reclamation or array of results for bulk operation
 */
async function createReclamation(reclamationData, creator) {
  try {
    // Check if this is a bulk operation (array input)
    if (Array.isArray(reclamationData)) {
      return await createBulkReclamations(reclamationData, creator);
    }

    // Single reclamation creation
    return await createSingleReclamation(reclamationData, creator);
  } catch (error) {
    logger.error('Error creating reclamation(s)', { error: error.message });
    throw error;
  }
}

/**
 * Create a single reclamation request
 * @param {Object} reclamationData - Reclamation data
 * @param {Object} creator - User creating the reclamation
 * @returns {Object} - Created reclamation
 */
async function createSingleReclamation(reclamationData, creator) {
  try {
    // Validate required fields based on user role
    // Agents must provide project_id and agent_id, admins can submit without them
    if (creator.role === ROLES.AGENT) {
      if (
        !reclamationData.project_id ||
        !mongoose.Types.ObjectId.isValid(reclamationData.project_id)
      ) {
        throw new Error('Project ID is required for agents submitting reclamation requests');
      }

      if (!reclamationData.agent_id || !mongoose.Types.ObjectId.isValid(reclamationData.agent_id)) {
        throw new Error('Agent ID is required for agents submitting reclamation requests');
      }
    }

    // If agent_id is not provided but the creator is an agent, use the creator's ID
    if (!reclamationData.agent_id && creator.role === ROLES.AGENT) {
      reclamationData.agent_id = creator._id;
    }

    const reclamation = new Reclamation(reclamationData);
    await reclamation.save();

    // Update the lead's stage and status: use lead_status_id from request if provided, else default to Negativ/Reclamation
    try {
      let updatedLead = null;
      if (reclamationData.lead_status_id) {
        updatedLead = await updateLeadStageAndStatusByStatusId(
          reclamation.lead_id,
          reclamationData.lead_status_id
        );
      }
      if (!updatedLead) {
        updatedLead = await updateLeadStageAndStatus(
          reclamation.lead_id,
          'Negativ',
          'Reclamation'
        );
      }

      // Also update reclamation_status and use_status
      await Lead.findByIdAndUpdate(reclamation.lead_id, {
        reclamation_status: 'pending',
        use_status: 'Reclamation',
        active: true, // Ensure lead is active when reclamation is created
      });

      if (updatedLead) {
        logger.info(`Updated lead stage and status for new reclamation`, {
          leadId: reclamation.lead_id,
          reclamationId: reclamation._id,
          stage: updatedLead.stage,
          status: updatedLead.status,
        });
      }
    } catch (error) {
      logger.error(`Failed to update lead stage and status for new reclamation`, {
        error,
        leadId: reclamation.lead_id,
        reclamationId: reclamation._id,
      });
      // We don't throw here to avoid failing the reclamation creation if stage update fails
      await Lead.findByIdAndUpdate(reclamation.lead_id, {
        reclamation_status: 'pending',
        use_status: 'Reclamation',
        active: true,
      });
    }

    // Get the populated reclamation with agent details
    const populatedReclamation = await Reclamation.findById(reclamation._id)
      .populate('agent_id', 'name email')
      .populate('lead_id', 'contact_name email_from phone lead_source_no')
      .exec();

    // Get the lead data for better activity logging
    const lead = await Lead.findById(reclamation.lead_id).lean();

    // Resolve selected lead stage/status for activity display (e.g. "Reclamation", "Negativ")
    const { resolveStatusName } = require('./activityService/utils');
    const leadStatusName = reclamationData.lead_status_id
      ? await resolveStatusName(reclamationData.lead_status_id)
      : null;
    const reclamationStatusLabels = { 0: 'Pending', 1: 'Accepted', 2: 'Rejected' };
    const statusLabel = reclamationStatusLabels[reclamation.status] ?? 'Pending';

    // Emit event for activity logging (Reclamation-subject activity, e.g. for reclamation views)
    eventEmitter.emit(EVENT_TYPES.RECLAMATION.CREATED, {
      reclamation: populatedReclamation,
      creator: creator || populatedReclamation.agent_id,
      lead,
      lead_status_id: reclamationData.lead_status_id || null,
      lead_status_name: leadStatusName,
      status_label: statusLabel,
    });

    // Create Lead-scoped activity so it appears on the lead's activity log/timeline
    try {
      const { createActivity } = require('./activityService/utils');
      const creatorId = creator?._id || creator?.id;
      const leadName = lead?.contact_name || lead?.name || populatedReclamation.lead_id?.name || 'Unknown Lead';
      if (creatorId) {
        const reasonText = (reclamation.reason || 'No reason provided').substring(0, 200);
        const statusSuffix = leadStatusName ? ` (Status: ${leadStatusName})` : '';
        const message = `Reclamation created: ${reasonText}${statusSuffix}`;
        await createActivity({
          _creator: creatorId,
          _subject_id: reclamation.lead_id,
          subject_type: 'Lead',
          action: 'create',
          message,
          type: 'info',
          details: {
            action_type: 'reclamation_created',
            reclamation_id: reclamation._id,
            lead_id: reclamation.lead_id,
            lead_name: leadName,
            reason: reclamation.reason,
            status: reclamation.status,
            status_label: statusLabel,
            lead_status_id: reclamationData.lead_status_id || null,
            lead_status_name: leadStatusName || null,
            agent_id: populatedReclamation.agent_id?._id || reclamation.agent_id,
            project_id: reclamation.project_id,
          },
        });
      }
    } catch (activityError) {
      logger.warn('Failed to log reclamation activity for lead (non-blocking)', {
        error: activityError?.message,
        leadId: reclamation.lead_id,
        reclamationId: reclamation._id,
      });
    }

    return populatedReclamation;
  } catch (error) {
    logger.error('Error creating single reclamation', { error: error.message });
    throw error;
  }
}

/**
 * Create multiple reclamation requests in bulk
 * @param {Array} reclamationDataArray - Array of reclamation data objects
 * @param {Object} creator - User creating the reclamations
 * @returns {Object} - Bulk operation result with success/failure counts and details
 */
async function createBulkReclamations(reclamationDataArray, creator) {
  const results = {
    success: [],
    failed: [],
    total: reclamationDataArray.length,
    successCount: 0,
    failureCount: 0,
  };

  logger.info(`Starting bulk reclamation creation for ${reclamationDataArray.length} items`, {
    userId: creator._id,
    userRole: creator.role,
  });

  // Process each reclamation request
  for (let i = 0; i < reclamationDataArray.length; i++) {
    const reclamationData = reclamationDataArray[i];

    try {
      // Create individual reclamation
      const reclamation = await createSingleReclamation(reclamationData, creator);

      results.success.push({
        index: i,
        reclamation_id: reclamation._id,
        lead_id: reclamationData.lead_id,
        reason: reclamationData.reason,
      });
      results.successCount++;
    } catch (error) {
      logger.error(`Failed to create reclamation for item ${i}`, {
        error: error.message,
        leadId: reclamationData.lead_id,
        reason: reclamationData.reason,
      });

      results.failed.push({
        index: i,
        lead_id: reclamationData.lead_id,
        reason: reclamationData.reason,
        error: error.message,
      });
      results.failureCount++;
    }
  }

  logger.info(`Bulk reclamation creation completed`, {
    total: results.total,
    success: results.successCount,
    failed: results.failureCount,
    userId: creator._id,
  });

  return results;
}

/**
 * Get all reclamation requests with pagination, search, and filtering
 * @param {Object} options - Pagination and filtering options
 * @param {number} options.page - Page number (default: 1)
 * @param {number} options.limit - Items per page (default: 20)
 * @param {string} options.search - Search term to filter by reason (optional)
 * @param {string} options.sort - Sort field (default: createdAt)
 * @param {string} options.order - Sort order (asc/desc, default: desc)
 * @param {number} options.status - Filter by status (0=pending, 1=accepted, 2=rejected)
 * @param {string} options.agent_id - Filter by agent ID (optional)
 * @param {Object} user - The user making the request
 * @returns {Object} - Paginated reclamations with metadata
 */
async function getReclamationsWithPagination(options = {}, user) {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      sort = 'createdAt',
      order = 'desc',
      status,
      agent_id,
    } = options;

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Build filter
    const filter = {};

    // Add status filter
    if (status !== undefined) {
      filter.status = status;
    }

    // Add agent_id filter
    if (agent_id) {
      filter.agent_id = agent_id;
    }

    // Add search filter
    if (search && search.trim() !== '') {
      const regex = { $regex: search.trim(), $options: 'i' };
      filter.$or = [{ reason: regex }, { notes: regex }, { 'lead_id.contact_name': regex }];
    }

    // If the user is a provider, only show reclamations for leads that came from their sources
    if (user && user.role === ROLES.PROVIDER) {
      // Get all sources associated with this provider
      const providerSources = await Source.find({ provider_id: user._id }).select('_id').lean();
      const sourceIds = providerSources.map((source) => source._id);

      if (sourceIds.length === 0) {
        // If provider has no sources, return empty result
        return {
          data: [],
          meta: {
            total: 0,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: 0,
          },
        };
      }

      // Find leads that came from these sources
      const leads = await Lead.find({ source_id: { $in: sourceIds } })
        .select('_id')
        .lean();
      const leadIds = leads.map((lead) => lead._id);

      if (leadIds.length === 0) {
        // If no leads from provider's sources, return empty result
        return {
          data: [],
          meta: {
            total: 0,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: 0,
          },
        };
      }

      // Only show reclamations for these leads
      filter.lead_id = { $in: leadIds };
    }

    // If the user is an agent, only show their reclamations
    if (user && user.role === ROLES.AGENT) {
      filter.agent_id = user._id;
    }

    // Build sort object
    const sortObj = {};
    sortObj[sort] = order === 'asc' ? 1 : -1;

    // Get total count for pagination
    const total = await Reclamation.countDocuments(filter);

    // Get paginated reclamations
    const reclamations = await Reclamation.find(filter)
      .populate('agent_id', 'name email')
      .populate({
        path: 'lead_id',
        select: 'lead_source_no contact_name email_from phone lead_date source_id stage status',
        populate: {
          path: 'source_id',
          select: 'name provider_id',
        },
      })
      .populate({ path: 'project_id', model: 'Team', select: 'name color_code' })
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Build pagination metadata
    const meta = {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / parseInt(limit)),
    };

    return {
      data: reclamations,
      meta,
    };
  } catch (error) {
    logger.error('Error fetching reclamations with pagination', { error: error.message });
    throw error;
  }
}

/**
 * Get all reclamation requests
 * @param {Object} query - Query parameters
 * @param {Object} user - The user making the request
 */
async function getReclamations(query = {}, user) {
  try {
    const filter = {};

    // Add filters based on query parameters
    if (query.status !== undefined) {
      filter.status = Number(query.status);
    }

    if (query.agent_id) {
      filter.agent_id = query.agent_id;
    }

    // If the user is a provider, only show reclamations for leads that came from their sources
    if (user && user.role === ROLES.PROVIDER) {
      // Get all sources associated with this provider
      const providerSources = await Source.find({ provider_id: user._id }).select('_id').lean();
      const sourceIds = providerSources.map((source) => source._id);

      if (sourceIds.length === 0) {
        // If provider has no sources, return empty array
        return [];
      }

      // Find leads that came from these sources
      const leads = await Lead.find({ source_id: { $in: sourceIds } })
        .select('_id')
        .lean();
      const leadIds = leads.map((lead) => lead._id);

      if (leadIds.length === 0) {
        // If no leads from provider's sources, return empty array
        return [];
      }

      // Only show reclamations for these leads
      filter.lead_id = { $in: leadIds };
    }

    // If the user is an agent, only show their reclamations
    if (user && user.role === ROLES.AGENT) {
      filter.agent_id = user._id;
    }

    return await Reclamation.find(filter)
      .populate('agent_id', 'name email')
      .populate({
        path: 'lead_id',
        select: 'lead_source_no contact_name email_from phone lead_date source_id stage status',
        populate: {
          path: 'source_id',
          select: 'name provider_id',
        },
      })
      .populate({ path: 'project_id', model: 'Team', select: 'name color_code' })
      .sort({ createdAt: -1 })
      .exec();
  } catch (error) {
    logger.error('Error fetching reclamations', { error: error.message });
    throw error;
  }
}

/**
 * Get a reclamation request by ID
 * @param {string} id - Reclamation ID
 * @param {Object} user - User making the request (optional)
 */
async function getReclamationById(id, user = null) {
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error('Invalid reclamation ID');
    }

    const reclamation = await Reclamation.findById(id)
      .populate('agent_id', 'name email')
      .populate({
        path: 'lead_id',
        select: 'lead_source_no contact_name email_from phone lead_date source_id stage status',
        populate: {
          path: 'source_id',
          select: 'name provider_id',
        },
      })
      .populate({ path: 'project_id', model: 'Team', select: 'name color_code' })
      .exec();

    if (!reclamation) {
      throw new Error('Reclamation not found');
    }

    // If user is a provider, check if they have access to this reclamation
    if (user && user.role === ROLES.PROVIDER) {
      // Check if the lead has a source and if the source belongs to this provider
      const lead = reclamation.lead_id;

      if (!lead || !lead.source_id || !lead.source_id.provider_id) {
        // If lead doesn't have a source or the source doesn't have a provider, deny access
        throw new Error('You do not have permission to access this reclamation');
      }

      // Check if the provider ID matches the user ID
      if (lead.source_id.provider_id.toString() !== user._id.toString()) {
        throw new Error('You do not have permission to access this reclamation');
      }
    }

    return reclamation;
  } catch (error) {
    logger.error('Error fetching reclamation by ID', { error: error.message });
    throw error;
  }
}

/**
 * Update a reclamation request
 * @param {string} id - Reclamation ID
 * @param {Object} updateData - Data to update
 * @param {Object} user - User making the update
 */
async function updateReclamation(id, updateData, user) {
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error('Invalid reclamation ID');
    }

    // Get the original reclamation with populated fields for permission checks
    const originalReclamation = await Reclamation.findById(id)
      .populate('lead_id', 'source_id')
      .populate({
        path: 'lead_id',
        populate: {
          path: 'source_id',
          select: 'provider_id',
        },
      })
      .lean();

    if (!originalReclamation) {
      throw new Error('Reclamation not found');
    }

    // If user is a provider, check if they have access to this reclamation
    if (user && user.role === ROLES.PROVIDER) {
      // Check if the lead has a source and if the source belongs to this provider
      const lead = originalReclamation.lead_id;

      if (!lead || !lead.source_id || !lead.source_id.provider_id) {
        // If lead doesn't have a source or the source doesn't have a provider, deny access
        throw new Error('You do not have permission to update this reclamation');
      }

      // Check if the provider ID matches the user ID
      if (lead.source_id.provider_id.toString() !== user._id.toString()) {
        throw new Error('You do not have permission to update this reclamation');
      }
    }

    // Update the reclamation
    const updatedReclamation = await Reclamation.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    )
      .populate('agent_id', 'name email')
      .populate({
        path: 'lead_id',
        select: 'lead_source_no contact_name email_from phone lead_date source_id stage status',
        populate: {
          path: 'source_id',
          select: 'name provider_id',
        },
      })
      .populate({ path: 'project_id', model: 'Team', select: 'name color_code' })
      .exec();

    if (!updatedReclamation) {
      throw new Error('Reclamation not found');
    }

    // Update the lead's reclamation status based on the reclamation status
    if (updateData.status !== undefined) {
      const reclamationStatusMap = {
        0: 'pending', // Pending
        1: 'accepted', // Accepted
        2: 'rejected', // Rejected
      };

      await Lead.findByIdAndUpdate(updatedReclamation.lead_id._id || updatedReclamation.lead_id, {
        reclamation_status: reclamationStatusMap[updateData.status],
      });
    }

    // Get the lead data for better activity logging
    const lead = await Lead.findById(updatedReclamation.lead_id).lean();

    // Check if this is a status update (approval or rejection)
    if (updateData.status !== undefined && originalReclamation.status !== updateData.status) {
      // Status 1 = Approved
      if (updateData.status === 1) {
        eventEmitter.emit(EVENT_TYPES.RECLAMATION.APPROVED, {
          reclamation: updatedReclamation,
          approver: user || updatedReclamation.agent_id,
          notes: updateData.notes || '',
          lead,
        });
      }
      // Status 2 = Rejected
      else if (updateData.status === 2) {
        eventEmitter.emit(EVENT_TYPES.RECLAMATION.REJECTED, {
          reclamation: updatedReclamation,
          rejector: user || updatedReclamation.agent_id,
          reason: updateData.notes || 'No reason provided',
          lead,
        });
      }
      // For other updates, emit the regular update event
      else {
        eventEmitter.emit(EVENT_TYPES.RECLAMATION.UPDATED, {
          reclamation: updatedReclamation,
          changes: updateData,
          creator: user || updatedReclamation.agent_id,
          lead,
        });
      }
    }
    // For non-status updates, emit the regular update event
    else {
      eventEmitter.emit(EVENT_TYPES.RECLAMATION.UPDATED, {
        reclamation: updatedReclamation,
        changes: updateData,
        creator: user || updatedReclamation.agent_id,
        lead,
      });
    }

    return updatedReclamation;
  } catch (error) {
    logger.error('Error updating reclamation', { error: error.message });
    throw error;
  }
}

/**
 * Delete a reclamation request
 */
async function deleteReclamation(id) {
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error('Invalid reclamation ID');
    }

    const reclamation = await Reclamation.findByIdAndDelete(id);

    if (!reclamation) {
      throw new Error('Reclamation not found');
    }

    return reclamation;
  } catch (error) {
    logger.error('Error deleting reclamation', { error: error.message });
    throw error;
  }
}

module.exports = {
  createReclamation,
  getReclamations,
  getReclamationById,
  updateReclamation,
  deleteReclamation,
  getReclamationsWithPagination,
};
