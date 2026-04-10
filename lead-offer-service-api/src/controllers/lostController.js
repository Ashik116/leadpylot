const offerService = require('../services/offerService');
const { hasPermission } = require('../middleware');
const { PERMISSIONS } = require('../middleware/roles/permissions');
const { asyncHandler } = require('../helpers/errorHandler');
const logger = require('../helpers/logger');

/**
 * Create lost record from offer
 * @route POST /lost-offers
 * @access Private - Authenticated users with proper permissions
 */
const createLostFromOffer = asyncHandler(async (req, res) => {
  const { offer_id, reason, notes } = req.body;

  logger.info('Creating lost record from offer:', {
    userId: req.user._id,
    offerId: offer_id,
    reason,
  });

  try {
    const lostRecord = await offerService.createLostFromOffer(
      offer_id,
      reason,
      req.user,
      hasPermission,
      PERMISSIONS,
      notes
    );

    logger.info('Lost record created successfully:', {
      userId: req.user._id,
      offerId: offer_id,
      lostId: lostRecord._id,
      reason,
    });

    res.status(201).json({
      success: true,
      message: 'Offer marked as lost successfully',
      data: lostRecord,
    });
  } catch (error) {
    logger.error('Error creating lost record:', {
      userId: req.user._id,
      offerId: offer_id,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
});

/**
 * Get all lost records (for admin use)
 * @route GET /lost-offers
 * @access Private - Admin only
 */
const getAllLostRecords = asyncHandler(async (req, res) => {
  // This would need to be implemented if needed
  // For now, just return a placeholder response
  res.status(200).json({
    success: true,
    message: 'Lost records endpoint - to be implemented if needed',
    data: [],
  });
});

/**
 * Get lost record by ID
 * @route GET /lost-offers/:id
 * @access Private - Authenticated users with proper permissions
 */
const getLostRecordById = asyncHandler(async (req, res) => {
  // This would need to be implemented if needed
  // For now, just return a placeholder response
  res.status(200).json({
    success: true,
    message: 'Get lost record by ID endpoint - to be implemented if needed',
    data: null,
  });
});

/**
 * Revert lost record (restore offer from lost status)
 * @route POST /lost-offers/:id/revert
 * @access Private - Admin only
 */
const revertLostRecord = asyncHandler(async (req, res) => {
  const { id: lostId } = req.params;
  const { revert_reason } = req.body;

  logger.info('Reverting lost record:', {
    userId: req.user._id,
    lostId,
    revertReason: revert_reason,
  });

  try {
    const revertedRecord = await offerService.revertLostFromOffer(
      lostId,
      revert_reason,
      req.user,
      hasPermission,
      PERMISSIONS
    );

    logger.info('Lost record reverted successfully:', {
      userId: req.user._id,
      lostId,
      offerId: revertedRecord.offer_id?._id,
      revertReason: revert_reason,
    });

    res.status(200).json({
      success: true,
      message: 'Lost record reverted successfully',
      data: revertedRecord,
    });
  } catch (error) {
    logger.error('Error reverting lost record:', {
      userId: req.user._id,
      lostId,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
});

module.exports = {
  createLostFromOffer,
  getAllLostRecords,
  getLostRecordById,
  revertLostRecord,
};
