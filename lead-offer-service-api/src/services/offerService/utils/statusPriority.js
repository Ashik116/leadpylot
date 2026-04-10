/**
 * Status Priority Utilities
 * Handles lead status update logic based on priority hierarchy
 */

const { STATUS_PRIORITY, STAGE_STATUS_MAPPING } = require('../config/constants');
const { logger } = require('../config/dependencies');

/**
 * Check if a new status should update the lead based on priority
 * @param {string} currentStatus - Current lead status
 * @param {string} newStatus - New status to potentially set
 * @returns {boolean} - Whether the update should proceed
 */
const shouldUpdateStatus = (currentStatus, newStatus) => {
  const currentPriority = STATUS_PRIORITY[currentStatus?.toLowerCase()] || 0;
  const newPriority = STATUS_PRIORITY[newStatus?.toLowerCase()] || 0;
  
  const shouldUpdate = newPriority > currentPriority;
  
  logger.debug('Status priority check', {
    currentStatus,
    newStatus,
    currentPriority,
    newPriority,
    shouldUpdate
  });
  
  return shouldUpdate;
};

/**
 * Get status name from stage
 * @param {string} stage - Stage name (e.g., 'opening', 'netto1')
 * @returns {string} - Status name (e.g., 'Contract', 'Netto1')
 */
const getStatusFromStage = (stage) => {
  return STAGE_STATUS_MAPPING[stage?.toLowerCase()] || stage;
};

/**
 * Update lead status only if new status has higher priority
 * @param {string} leadId - Lead ID
 * @param {string} stage - New stage name
 * @param {Object} Lead - Lead model
 * @param {Function} updateLeadStageAndStatus - Update function
 * @returns {Promise<boolean>} - Whether update was performed
 */
const updateLeadStatusIfHigherPriority = async (leadId, stage, Lead, updateLeadStageAndStatus) => {
  try {
    // Get current lead status
    const currentLead = await Lead.findById(leadId)
      .populate('status_id', 'name')
      .lean();
    
    if (!currentLead) {
      logger.warn('Lead not found for status priority check', { leadId });
      return false;
    }
    
    const currentStatus = currentLead.status_id?.name || currentLead.status || '';
    const newStatus = getStatusFromStage(stage);
    
    logger.debug('Lead status priority check', {
      leadId,
      stage,
      currentStatus,
      newStatus
    });
    
    if (shouldUpdateStatus(currentStatus, newStatus)) {
      logger.info('🔄 STATUS PRIORITY: Updating lead status (higher priority)', {
        leadId,
        previousStatus: currentStatus,
        newStatus,
        stage: 'Opening'
      });
      
      await updateLeadStageAndStatus(leadId, 'Opening', newStatus);
      return true;
    } else {
      logger.info('⏸️ STATUS PRIORITY: Skipping lead status update (lower priority)', {
        leadId,
        currentStatus,
        attemptedStatus: newStatus,
        stage
      });
      
      return false;
    }
  } catch (error) {
    logger.error('Error in status priority check', {
      error: error.message,
      leadId,
      stage
    });
    return false;
  }
};

module.exports = {
  shouldUpdateStatus,
  getStatusFromStage,
  updateLeadStatusIfHigherPriority,
  STATUS_PRIORITY
}; 