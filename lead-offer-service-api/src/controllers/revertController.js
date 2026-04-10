/**
 * Revert Controller
 * Handles API endpoints for reverting offer progression stages
 */

const offerService = require('../services/offerService');
const { hasPermission } = require('../middleware/authorize');
const { PERMISSIONS } = require('../middleware/roles/permissions');
const logger = require('../helpers/logger');
const { createActivity } = require('../services/activityService/utils');

/**
 * Revert a specific stage for an offer
 * POST /api/offers/:offerId/revert/:stage
 */
const revertStage = async (req, res) => {
  try {
    const { offerId, stage } = req.params;
    const { reason = '' } = req.body;
    const user = req.user;

    // Validate stage parameter
    const validStages = ['opening', 'confirmation', 'payment', 'netto1', 'netto2', 'lost'];
    if (!validStages.includes(stage.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Invalid stage: ${stage}. Valid stages are: ${validStages.join(', ')}`,
      });
    }

    let result;
    
    switch (stage.toLowerCase()) {
      case 'opening':
        result = await offerService.revertOpeningFromOffer(
          offerId,
          user,
          hasPermission,
          PERMISSIONS,
          reason
        );
        break;
      case 'confirmation':
        result = await offerService.revertConfirmationFromOffer(
          offerId,
          user,
          hasPermission,
          PERMISSIONS,
          reason
        );
        break;
      case 'payment':
        result = await offerService.revertPaymentFromOffer(
          offerId,
          user,
          hasPermission,
          PERMISSIONS,
          reason
        );
        break;
      case 'netto1':
        result = await offerService.revertNetto1FromOffer(
          offerId,
          user,
          hasPermission,
          PERMISSIONS,
          reason
        );
        break;
      case 'netto2':
        result = await offerService.revertNetto2FromOffer(
          offerId,
          user,
          hasPermission,
          PERMISSIONS,
          reason
        );
        break;
      case 'lost':
        result = await offerService.revertLostFromOffer(
          offerId,
          user,
          hasPermission,
          PERMISSIONS,
          reason
        );
        break;
      default:
        return res.status(400).json({
          success: false,
          message: `Unsupported stage: ${stage}`,
        });
    }

    logger.info('Successfully reverted offer stage', {
      offerId,
      stage,
      userId: user._id,
      userRole: user.role,
      reason,
      result: result.message
    });

    res.status(200).json({
      success: true,
      message: result.message,
      data: {
        offerId,
        stage,
        newStatus: result.newStatus,
        revertedCount: result.revertedCount,
        reason,
        revertedBy: user._id,
        revertedAt: new Date(),
      },
    });
  } catch (error) {
    logger.error('Error reverting offer stage:', {
      error: error.message,
      offerId: req.params.offerId,
      stage: req.params.stage,
      userId: req.user?._id,
      userRole: req.user?.role,
    });

    const statusCode = error.name === 'NotFoundError' ? 404 :
                      error.name === 'AuthorizationError' ? 403 :
                      error.name === 'DatabaseError' ? 400 : 500;

    res.status(statusCode).json({
      success: false,
      message: error.message || 'Internal server error during revert operation',
    });
  }
};

/**
 * Get available revert options for an offer
 * GET /api/offers/:offerId/revert-options
 */
const getRevertOptions = async (req, res) => {
  try {
    const { offerId } = req.params;
    const user = req.user;

    const revertOptions = await offerService.getRevertOptions(
      offerId,
      user,
      hasPermission,
      PERMISSIONS
    );

    logger.debug('Retrieved revert options for offer', {
      offerId,
      userId: user._id,
      userRole: user.role,
      availableReverts: revertOptions.availableReverts.length
    });

    // Create activity log for viewing revert options
    try {
      const offer = await offerService.getOfferById(offerId, user, hasPermission, PERMISSIONS, {});
      const offerTitle = offer?.title || `Offer #${offerId}`;
      await createActivity({
        _creator: user._id,
        _subject_id: offerId,
        subject_type: 'Offer',
        action: 'read',
        message: `Viewed revert options for offer: ${offerTitle}`,
        type: 'info',
        details: {
          action_type: 'revert_options_viewed',
          offer_id: offerId,
          offer_title: offerTitle,
          available_reverts: revertOptions.availableReverts.length,
        },
      });
    } catch (activityError) {
      logger.warn('Failed to log revert options view activity (non-blocking)', {
        error: activityError.message,
        offerId,
      });
    }

    res.status(200).json({
      success: true,
      data: revertOptions,
    });
  } catch (error) {
    logger.error('Error getting revert options:', {
      error: error.message,
      offerId: req.params.offerId,
      userId: req.user?._id,
      userRole: req.user?.role,
    });

    const statusCode = error.name === 'NotFoundError' ? 404 :
                      error.name === 'AuthorizationError' ? 403 : 500;

    res.status(statusCode).json({
      success: false,
      message: error.message || 'Internal server error getting revert options',
    });
  }
};

/**
 * Batch revert multiple stages for an offer
 * POST /api/offers/:offerId/revert-batch
 */
const revertBatch = async (req, res) => {
  try {
    const { offerId } = req.params;
    const { stages, reason = '' } = req.body;
    const user = req.user;

    if (!Array.isArray(stages) || stages.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Stages array is required and must not be empty',
      });
    }

    // Validate all stages first
    const validStages = ['opening', 'confirmation', 'payment', 'netto1', 'netto2', 'lost'];
    const invalidStages = stages.filter(stage => !validStages.includes(stage.toLowerCase()));
    
    if (invalidStages.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid stages: ${invalidStages.join(', ')}. Valid stages are: ${validStages.join(', ')}`,
      });
    }

    // Sort stages by priority (highest to lowest) to revert in correct order
    const stagePriority = { netto2: 5, netto1: 4, payment: 3, confirmation: 2, opening: 1, lost: 0 };
    const sortedStages = stages.sort((a, b) => 
      (stagePriority[b.toLowerCase()] || 0) - (stagePriority[a.toLowerCase()] || 0)
    );

    const results = [];
    let currentStatus = null;

    // Revert stages one by one in priority order
    for (const stage of sortedStages) {
      try {
        let result;
        
        switch (stage.toLowerCase()) {
          case 'opening':
            result = await offerService.revertOpeningFromOffer(
              offerId, user, hasPermission, PERMISSIONS, reason
            );
            break;
          case 'confirmation':
            result = await offerService.revertConfirmationFromOffer(
              offerId, user, hasPermission, PERMISSIONS, reason
            );
            break;
          case 'payment':
            result = await offerService.revertPaymentFromOffer(
              offerId, user, hasPermission, PERMISSIONS, reason
            );
            break;
          case 'netto1':
            result = await offerService.revertNetto1FromOffer(
              offerId, user, hasPermission, PERMISSIONS, reason
            );
            break;
          case 'netto2':
            result = await offerService.revertNetto2FromOffer(
              offerId, user, hasPermission, PERMISSIONS, reason
            );
            break;
          case 'lost':
            result = await offerService.revertLostFromOffer(
              offerId, user, hasPermission, PERMISSIONS, reason
            );
            break;
        }

        if (result.success) {
          results.push({
            stage,
            success: true,
            message: result.message,
            revertedCount: result.revertedCount,
          });
          currentStatus = result.newStatus;
        }
      } catch (stageError) {
        // Continue with other stages even if one fails
        results.push({
          stage,
          success: false,
          message: stageError.message,
          revertedCount: 0,
        });
        
        logger.warn('Failed to revert stage in batch operation', {
          offerId,
          stage,
          error: stageError.message,
          userId: user._id
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    
    logger.info('Completed batch revert operation', {
      offerId,
      requestedStages: stages.length,
      successfulReverts: successCount,
      userId: user._id,
      userRole: user.role,
      reason
    });

    res.status(200).json({
      success: successCount > 0,
      message: `Reverted ${successCount} of ${stages.length} stages`,
      data: {
        offerId,
        results,
        finalStatus: currentStatus,
        reason,
        revertedBy: user._id,
        revertedAt: new Date(),
      },
    });
  } catch (error) {
    logger.error('Error in batch revert operation:', {
      error: error.message,
      offerId: req.params.offerId,
      userId: req.user?._id,
      userRole: req.user?.role,
    });

    const statusCode = error.name === 'NotFoundError' ? 404 :
                      error.name === 'AuthorizationError' ? 403 :
                      error.name === 'DatabaseError' ? 400 : 500;

    res.status(statusCode).json({
      success: false,
      message: error.message || 'Internal server error during batch revert operation',
    });
  }
};

module.exports = {
  revertStage,
  getRevertOptions,
  revertBatch,
};
