/**
 * Lead Service Utilities
 * Common utility functions used across lead service modules
 */

const mongoose = require('mongoose');
const logger = require('../../utils/logger');
const { Offer, Opening, Confirmation, PaymentVoucher, Settings, Lead } = require('../../models');
const { NotFoundError, DatabaseError } = require('../../utils/errorHandler');



/**
 * Creates a map of items by a specific key for quick lookups (OPTIMIZED with Map)
 * @param {Array} items - Array of items to map
 * @param {string} key - The key to use for mapping (defaults to '_id')
 * @returns {Object} - Map of items by key
 */
const createLookupMap = (items, key = '_id') => {
  // Use Map for O(1) operations during creation
  const map = new Map();
  for (const item of items) {
    const mapKey = item[key]?.toString();
    if (mapKey) {
      map.set(mapKey, item);
    }
  }
  // Convert Map to plain object for compatibility
  return Object.fromEntries(map);
};

/**
 * Builds pagination metadata for responses
 * @param {number} total - Total number of items
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @returns {Object} - Pagination metadata
 */
/**
 * Normalizes page number to ensure it doesn't exceed available pages.
 * If requested page is beyond available pages, returns the last valid page.
 * @param {number} requestedPage - The requested page number
 * @param {number} total - Total number of items
 * @param {number} limit - Items per page
 * @returns {Object} - Normalized page info with page, offset, and pages
 */
const normalizePagination = (requestedPage, total, limit) => {
  const parsedPage = parseInt(requestedPage) || 1;
  const parsedLimit = parseInt(limit) || 50;
  const totalPages = parsedLimit > 0 ? Math.ceil(total / parsedLimit) : 1;
  
  // If total is 0, return page 1
  if (total === 0) {
    return {
      page: 1,
      offset: 0,
      pages: 0,
      limit: parsedLimit,
      total,
      adjusted: parsedPage > 1, // Indicate if page was adjusted
    };
  }
  
  // If requested page exceeds available pages, return last valid page
  const normalizedPage = parsedPage > totalPages ? totalPages : Math.max(1, parsedPage);
  const offset = (normalizedPage - 1) * parsedLimit;
  
  return {
    page: normalizedPage,
    offset,
    pages: totalPages,
    limit: parsedLimit,
    total,
    adjusted: normalizedPage !== parsedPage, // Indicate if page was adjusted
  };
};

const buildPaginationMeta = (total, page, limit) => {
  const normalized = normalizePagination(page, total, limit);
  return {
    total,
    page: normalized.page,
    limit: normalized.limit,
    pages: normalized.pages,
    offset: normalized.offset,
  };
};

/**
 * Gets stage and status maps from settings (OPTIMIZED with caching)
 * @returns {Promise<Object>} - Object containing stageMap and statusMap
 */
const getStageAndStatusMaps = async () => {
  try {
    const cache = require('../../utils/cache');
    const cacheKey = 'stage_status_maps';
    const cacheTTL = 3600; // 1 hour

    // Try to get from cache first
    const cached = await cache.get(cacheKey);
    if (cached) {
      logger.debug('Stage and status maps retrieved from cache');
      return cached;
    }

    // Get all stage settings with optimized field projection
    const stageSettings = await Settings.find({ type: 'stage' })
      .select('_id name info')
      .lean();

    // Create maps for quick lookups using Map for better performance
    const stageMap = {};
    const statusMap = {};

    for (const stage of stageSettings) {
      // Add stage to stage map
      stageMap[stage._id.toString()] = {
        id: stage._id.toString(),
        name: stage.name,
        isWonStage: stage.info?.isWonStage || false,
      };

      // Add statuses to status map
      if (stage.info && Array.isArray(stage.info.statuses)) {
        for (const status of stage.info.statuses) {
          // Use status.id for lookup if it exists, otherwise use _id
          // This handles both ObjectId and UUID string formats
          const statusId = status.id || status._id;
          if (statusId) {
            statusMap[statusId.toString()] = {
              id: statusId.toString(),
              name: status.name,
              code: status.code || '',
              allowed: status.allowed !== false, // Default to true
              stageId: stage._id.toString(),
              stageName: stage.name,
            };
          }
        }
      }
    }

    const result = { stageMap, statusMap };

    // Cache the result
    await cache.set(cacheKey, result, cacheTTL);

    logger.debug('Stage and status maps created and cached', {
      stageCount: Object.keys(stageMap).length,
      statusCount: Object.keys(statusMap).length,
    });

    return result;
  } catch (error) {
    logger.error('Error getting stage and status maps', { 
      error: error.message,
      stack: error.stack,
      name: error.name
    });
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
 * Process a batch operation on leads
 * @param {string|Array} leadIds - Single lead ID or array of lead IDs
 * @param {Function} processFn - Function to process each lead
 * @param {string} operationName - Name of the operation (e.g., 'update', 'delete')
 * @param {number} errorCode - Error code to use if leadIds is missing
 * @returns {Promise<Object>} - Result of the batch operation
 */
const processBatchOperation = async (leadIds, processFn, operationName, errorCode) => {

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

    // Check if status should keep lead inactive or make it active
    const shouldRemainInactive = await shouldKeepLeadInactive(stageName, statusName);
    const Lead = mongoose.model('Lead');
    
    if (shouldRemainInactive) {
      updateData.active = false;
      const currentLead = await Lead.findById(leadId).lean();
      if (currentLead && currentLead.active !== false) {
        updateData.prev_stage_id = currentLead.stage_id;
        updateData.prev_status_id = currentLead.status_id;
        updateData.prev_stage = currentLead.stage;
        updateData.prev_status = currentLead.status;
      }
      logger.info(`🔄 INACTIVE STATUS: Lead ${leadId} status "${statusName}" in stage "${stageName}" - setting active to false`);
    } else {
      updateData.active = true;
      logger.info(`🔄 ACTIVE STATUS: Lead ${leadId} status changed to "${statusName}" in stage "${stageName}" - setting active to true`);
    }

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

/**
 * Check if a status should keep the lead inactive
 * Returns true if the status should remain inactive (Out status or negative Reklamation statuses)
 * @param {string} stageName - The stage name
 * @param {string} statusName - The status name
 * @returns {Promise<boolean>} - True if lead should remain inactive
 */
const shouldKeepLeadInactive = async (stageName, statusName) => {
  try {
    if (!statusName) return false;

    const statusNameLower = statusName.toLowerCase();

    // Case 1: "Out" status always keeps lead inactive
    if (statusNameLower === 'out') {
      return true;
    }

    // Case 2: Check if status is in Reklamation stage and is a negative status
    if (stageName && stageName.toLowerCase() === 'reklamation') {
      // Negative statuses in Reklamation stage that should keep lead inactive
      const negativeReklamationStatuses = [
        'angaben falsch / tot',
        'muslim',
        'blackbox',
        'nicht angefragt / scherzanfrage'
      ];

      if (negativeReklamationStatuses.includes(statusNameLower)) {
        logger.info(`🔄 REKLAMATION NEGATIVE STATUS: Status "${statusName}" in Reklamation stage - should remain inactive`);
        return true;
      }
    }

    return false;
  } catch (error) {
    logger.error('Error checking if lead should remain inactive', {
      error: error.message,
      stageName,
      statusName,
    });
    return false;
  }
};

module.exports = {
  createLookupMap,
  buildPaginationMeta,
  normalizePagination,
  getStageAndStatusMaps,
  findStageAndStatusIdsByName,
  processBatchOperation,
  updateLeadStageAndStatus,
  determineLeadStageAndStatusFromActiveItems,
  revertLeadStageAndStatusAfterDeletion,
  shouldKeepLeadInactive,
};
