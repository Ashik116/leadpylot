/**
 * Lead Service Utilities
 * Common utility functions used across lead service modules
 */

const mongoose = require('mongoose');
const { Settings } = require('../models/Settings');
const logger = require('../helpers/logger');

/**
 * Creates a map of items by a specific key for quick lookups
 * @param {Array} items - Array of items to map
 * @param {string} key - The key to use for mapping (defaults to '_id')
 * @returns {Object} - Map of items by key
 */
const createLookupMap = (items, key = '_id') => {
  const map = {};
  items.forEach((item) => {
    const mapKey = item[key]?.toString();
    if (mapKey) {
      map[mapKey] = item;
    }
  });
  return map;
};

/**
 * Builds pagination metadata for responses
 * @param {number} total - Total number of items
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @returns {Object} - Pagination metadata
 */
const buildPaginationMeta = (total, page, limit) => {
  return {
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    pages: Math.ceil(total / parseInt(limit)),
  };
};

/**
 * Gets stage and status maps from settings
 * @returns {Promise<Object>} - Object containing stageMap and statusMap
 */
const getStageAndStatusMaps = async () => {
  try {
    // Get all stage settings
    const stageSettings = await Settings.find({ type: 'stage' }).lean();

    // Create maps for quick lookups
    const stageMap = {};
    const statusMap = {};

    stageSettings.forEach((stage) => {
      // Add stage to stage map
      stageMap[stage._id.toString()] = {
        id: stage._id.toString(),
        name: stage.name,
        isWonStage: stage.info?.isWonStage || false,
      };

      // Add statuses to status map
      if (stage.info && Array.isArray(stage.info.statuses)) {
        stage.info.statuses.forEach((status) => {
          // Use status.id for lookup if it exists, otherwise use _id
          // This handles both ObjectId and UUID string formats
          const statusId = status.id || status._id;
          if (statusId) {
            statusMap[statusId.toString()] = {
              id: statusId.toString(),
              name: status.name,
              code: status.code || '',
              allowed: status.allowed || true,
              stageId: stage._id.toString(),
              stageName: stage.name,
            };
          }
        });
      }
    });

    logger.debug('Stage and status maps created', {
      stageCount: Object.keys(stageMap).length,
      statusCount: Object.keys(statusMap).length,
      stageIds: Object.keys(stageMap),
      statusIds: Object.keys(statusMap),
    });

    return { stageMap, statusMap };
  } catch (error) {
    logger.error('Error getting stage and status maps', { error });
    return { stageMap: {}, statusMap: {} };
  }
};

/**
 * Finds stage and status IDs by their names
 * @param {string} stageName - The name of the stage to find
 * @param {string} statusName - The name of the status to find within the stage
 * @returns {Promise<Object>} - Object containing stageId and statusId
 */
const findStageAndStatusIdsByName = async (stageName, statusName = null) => {
  try {
    // Get all stage settings
    const stageSettings = await Settings.find({ type: 'stage' }).lean();

    let stageId = null;
    let statusId = null;

    // Log for debugging
    logger.info(`Searching for stage: ${stageName}, status: ${statusName}`);
    logger.info(`Found ${stageSettings.length} stages in database`);

    // Find the stage by name (case-insensitive)
    const stage = stageSettings.find((s) => s.name.toLowerCase() === stageName.toLowerCase());
    if (stage) {
      stageId = stage._id;

      // If status name is provided, find the status
      if (statusName && stage.info && Array.isArray(stage.info.statuses)) {
        const status = stage.info.statuses.find(
          (s) => s.name.toLowerCase() === statusName.toLowerCase()
        );

        if (status) {
          // Handle both _id (ObjectId) and id (UUID string) formats
          statusId = status._id || status.id;

          // Convert string ID to ObjectId if needed
          if (
            statusId &&
            typeof statusId === 'string' &&
            mongoose.Types.ObjectId.isValid(statusId)
          ) {
            statusId = new mongoose.Types.ObjectId(statusId);
          }
        }
      }
    }

    logger.debug('Found stage and status IDs by name', {
      stageName,
      statusName,
      stageId: stageId ? stageId.toString() : null,
      statusId: statusId ? statusId.toString() : null,
      stageFound: !!stageId,
      statusFound: !!statusId,
    });

    return { stageId, statusId };
  } catch (error) {
    logger.error('Error finding stage and status IDs by name', {
      error,
      stageName,
      statusName,
    });
    return { stageId: null, statusId: null };
  }
};

/**
 * Finds stage and status by status ID (e.g. when frontend sends desired lead status_id)
 * @param {string|ObjectId} statusId - The status ID to find (from Settings stage.info.statuses)
 * @returns {Promise<Object>} - Object containing stageId, statusId, stageName, statusName or nulls if not found
 */
const findStageAndStatusByStatusId = async (statusId) => {
  try {
    if (!statusId) return { stageId: null, statusId: null, stageName: null, statusName: null };
    const statusIdStr = statusId.toString();
    const stageSettings = await Settings.find({ type: 'stage' }).lean();

    for (const stage of stageSettings) {
      if (!stage.info || !Array.isArray(stage.info.statuses)) continue;
      const status = stage.info.statuses.find(
        (s) =>
          (s._id && s._id.toString() === statusIdStr) ||
          (s.id && s.id.toString() === statusIdStr)
      );
      if (status) {
        const resolvedStatusId = status._id || status.id;
        return {
          stageId: stage._id,
          statusId: typeof resolvedStatusId === 'string' && mongoose.Types.ObjectId.isValid(resolvedStatusId)
            ? new mongoose.Types.ObjectId(resolvedStatusId)
            : resolvedStatusId,
          stageName: stage.name,
          statusName: status.name || '',
        };
      }
    }

    logger.warn('Could not find stage/status for status_id', { statusId: statusIdStr });
    return { stageId: null, statusId: null, stageName: null, statusName: null };
  } catch (error) {
    logger.error('Error finding stage and status by status ID', { error, statusId });
    return { stageId: null, statusId: null, stageName: null, statusName: null };
  }
};

/**
 * Updates a lead's stage and status by status ID (used when frontend sends the desired lead status_id)
 * @param {string} leadId - The ID of the lead to update
 * @param {string|ObjectId} statusId - The status ID from Settings (e.g. from request body)
 * @returns {Promise<Object>} - Updated lead document or null
 */
const updateLeadStageAndStatusByStatusId = async (leadId, statusId) => {
  try {
    const { stageId, statusId: resolvedStatusId, stageName, statusName } =
      await findStageAndStatusByStatusId(statusId);

    if (!stageId || !resolvedStatusId) {
      logger.warn(`Could not resolve stage/status for status_id when updating lead`, {
        leadId,
        statusId: statusId?.toString(),
      });
      return null;
    }

    const updateData = {
      stage_id: stageId,
      status_id: resolvedStatusId,
      stage: stageName,
      status: statusName,
    };

    if (statusName && statusName.toLowerCase() === 'out') {
      updateData.active = false;
    }

    const Lead = mongoose.model('Lead');
    const updatedLead = await Lead.findByIdAndUpdate(leadId, updateData, { new: true });

    logger.info(`Updated lead ${leadId} to stage '${stageName}' and status '${statusName}' by status_id`, {
      leadId,
      stageId: stageId.toString(),
      statusId: resolvedStatusId.toString(),
    });

    return updatedLead;
  } catch (error) {
    logger.error('Error updating lead stage and status by status ID', {
      error,
      leadId,
      statusId: statusId?.toString(),
    });
    return null;
  }
};

/**
 * Process a batch operation on leads
 * @param {string|Array} leadIds - Single lead ID or array of lead IDs
 * @param {Function} processFn - Function to process each lead
 * @param {string} operationName - Name of the operation (e.g., 'update', 'delete')
 * @param {number} errorCode - Error code to use if leadIds is missing
 * @returns {Promise<Object>} - Result of the batch operation
 */
const processBatchOperation = async (leadIds, processFn, operationName, errorCode) => {
  const { Lead } = require('../../models');
  const { NotFoundError, DatabaseError } = require('../../helpers/errorHandler');

  // Check if we're dealing with a batch operation (array of IDs)
  if (Array.isArray(leadIds)) {
    const successfulLeads = [];
    const failedLeads = [];

    // Process each lead ID
    for (const id of leadIds) {
      try {
        const lead = await Lead.findById(id);

        if (!lead) {
          failedLeads.push({ id, reason: 'Lead not found' });
          continue;
        }

        // Process the lead
        const result = await processFn(lead);
        successfulLeads.push(result);
      } catch (error) {
        logger.error(`Error ${operationName}ing lead ${id}`, { error });
        failedLeads.push({ id, reason: error.message || 'Server error' });
      }
    }

    const pastTense =
      operationName === 'update'
        ? 'updated'
        : operationName === 'delete'
          ? 'deleted'
          : operationName === 'restore'
            ? 'restored'
            : `${operationName}d`;

    return {
      message: `Successfully ${pastTense} ${successfulLeads.length} leads`,
      [pastTense]: successfulLeads,
      failed: failedLeads,
    };
  } else {
    // Single lead operation
    try {
      const lead = await Lead.findById(leadIds);

      if (!lead) {
        throw new NotFoundError('Lead');
      }

      // Process the lead
      const result = await processFn(lead);

      const pastTense =
        operationName === 'update'
          ? 'updated'
          : operationName === 'delete'
            ? 'deleted'
            : operationName === 'restore'
              ? 'restored'
              : `${operationName}d`;

      return {
        message: `Lead ${pastTense} successfully`,
        [pastTense]: [result],
        failed: [],
      };
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }

      logger.error(`Error ${operationName}ing lead ${leadIds}`, { error });
      throw new DatabaseError(`Error ${operationName}ing lead: ${error.message}`, errorCode);
    }
  }
};

/**
 * Updates a lead's stage and status by name
 * @param {string} leadId - The ID of the lead to update
 * @param {string} stageName - The name of the stage to set
 * @param {string} statusName - The name of the status to set
 * @returns {Promise<Object>} - Updated lead document
 */
const updateLeadStageAndStatus = async (leadId, stageName, statusName) => {
  try {
    // Get the stage and status IDs
    const { stageId, statusId } = await findStageAndStatusIdsByName(stageName, statusName);

    if (!stageId || !statusId) {
      logger.warn(`Could not find stage '${stageName}' or status '${statusName}' for lead update`, {
        leadId,
        stageName,
        statusName,
      });
      return null;
    }

    // Prepare update data
    const updateData = {
      stage_id: stageId,
      status_id: statusId,
      stage: stageName,
      status: statusName,
    };

    // Special handling for "out" status - set active to false
    if (statusName && statusName.toLowerCase() === 'out') {
      updateData.active = false;
      logger.info(`🔄 OUT STATUS: Lead ${leadId} status is "out" - setting active to false`);
    }

    // Update the lead with the new stage and status
    const Lead = mongoose.model('Lead');
    const updatedLead = await Lead.findByIdAndUpdate(
      leadId,
      updateData,
      { new: true }
    );

    logger.info(`Updated lead ${leadId} to stage '${stageName}' and status '${statusName}'`, {
      leadId,
      stageId: stageId.toString(),
      statusId: statusId.toString(),
    });

    return updatedLead;
  } catch (error) {
    logger.error(`Error updating lead stage and status`, {
      error,
      leadId,
      stageName,
      statusName,
    });
    return null;
  }
};

/**
 * Determines the correct stage and status for a lead based on remaining active items
 * @param {string} leadId - The ID of the lead to check
 * @returns {Promise<Object>} - Object with stageName and statusName
 */
const determineLeadStageAndStatusFromActiveItems = async (leadId) => {
  try {
    const { Offer, Opening, Confirmation, PaymentVoucher } = require('../../models');

    // Get all offers for this lead
    const offers = await Offer.find({ lead_id: leadId }).lean();
    
    if (offers.length === 0) {
      // No offers exist, lead should be in initial state
      return { stageName: 'New', statusName: 'New' };
    }

    // Get all active openings for this lead's offers
    const offerIds = offers.map(offer => offer._id);
    const activeOpenings = await Opening.find({ 
      offer_id: { $in: offerIds }, 
      active: true 
    }).lean();

    if (activeOpenings.length === 0) {
      // No active openings, lead should be at offer stage
      return { stageName: 'Positiv', statusName: 'Angebot' };
    }

    // Get all active confirmations for these openings
    const openingIds = activeOpenings.map(opening => opening._id);
    const activeConfirmations = await Confirmation.find({ 
      opening_id: { $in: openingIds }, 
      active: true 
    }).lean();

    // Also check for direct confirmations (created directly from offers)
    const directConfirmations = await Confirmation.find({ 
      offer_id: { $in: offerIds }, 
      active: true 
    }).lean();

    const totalActiveConfirmations = activeConfirmations.length + directConfirmations.length;

    if (totalActiveConfirmations === 0) {
      // No active confirmations, lead should be at opening stage
      return { stageName: 'Opening', statusName: 'Contract' };
    }

    // Get all active payment vouchers for these confirmations
    const confirmationIds = [...activeConfirmations, ...directConfirmations].map(conf => conf._id);
    const activePaymentVouchers = await PaymentVoucher.find({ 
      confirmation_id: { $in: confirmationIds }, 
      active: true 
    }).lean();

    // Also check for direct payment vouchers (created directly from offers)
    const directPaymentVouchers = await PaymentVoucher.find({ 
      offer_id: { $in: offerIds }, 
      active: true 
    }).lean();

    const totalActivePaymentVouchers = activePaymentVouchers.length + directPaymentVouchers.length;

    if (totalActivePaymentVouchers > 0) {
      // Active payment vouchers exist, lead should be at payment stage
      return { stageName: 'Opening', statusName: 'Payment' };
    }

    // Active confirmations exist but no payment vouchers
    return { stageName: 'Opening', statusName: 'Confirmation' };

  } catch (error) {
    logger.error('Error determining lead stage and status from active items', {
      error,
      leadId,
    });
    // Return a safe default
    return { stageName: 'Positiv', statusName: 'Angebot' };
  }
};

/**
 * Updates a lead's stage and status based on remaining active items after deletion
 * @param {string} leadId - The ID of the lead to update
 * @param {string} deletedItemType - Type of item deleted ('opening', 'confirmation', 'payment_voucher')
 * @param {string} deletedItemId - ID of the deleted item
 * @returns {Promise<Object>} - Updated lead document or null if no update needed
 */
const revertLeadStageAndStatusAfterDeletion = async (leadId, deletedItemType, deletedItemId) => {
  try {
    logger.info(`Reverting lead stage/status after ${deletedItemType} deletion`, {
      leadId,
      deletedItemType,
      deletedItemId,
    });

    // Determine the correct stage and status based on remaining active items
    const { stageName, statusName } = await determineLeadStageAndStatusFromActiveItems(leadId);

    // Get current lead data to check if update is needed
    const Lead = mongoose.model('Lead');
    const currentLead = await Lead.findById(leadId)
      .populate('stage_id', 'name')
      .populate('status_id', 'name')
      .lean();

    if (!currentLead) {
      logger.warn(`Lead not found when trying to revert stage/status`, { leadId });
      return null;
    }

    const currentStage = currentLead.stage_id?.name || currentLead.stage || '';
    const currentStatus = currentLead.status_id?.name || currentLead.status || '';

    // Only update if the stage or status needs to change
    if (currentStage === stageName && currentStatus === statusName) {
      logger.info(`Lead stage/status already correct after ${deletedItemType} deletion`, {
        leadId,
        currentStage,
        currentStatus,
        deletedItemType,
      });
      return currentLead;
    }

    // Update the lead's stage and status
    const updatedLead = await updateLeadStageAndStatus(leadId, stageName, statusName);

    if (updatedLead) {
      logger.info(`Successfully reverted lead stage/status after ${deletedItemType} deletion`, {
        leadId,
        deletedItemType,
        deletedItemId,
        previousStage: currentStage,
        previousStatus: currentStatus,
        newStage: stageName,
        newStatus: statusName,
      });
    }

    return updatedLead;
  } catch (error) {
    logger.error(`Error reverting lead stage/status after ${deletedItemType} deletion`, {
      error,
      leadId,
      deletedItemType,
      deletedItemId,
    });
    return null;
  }
};

module.exports = {
  createLookupMap,
  buildPaginationMeta,
  getStageAndStatusMaps,
  findStageAndStatusIdsByName,
  findStageAndStatusByStatusId,
  updateLeadStageAndStatusByStatusId,
  processBatchOperation,
  updateLeadStageAndStatus,
  determineLeadStageAndStatusFromActiveItems,
  revertLeadStageAndStatusAfterDeletion,
};
