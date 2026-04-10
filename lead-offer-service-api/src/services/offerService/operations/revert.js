/**
 * Offer Service Revert Operations
 * Contains revert operations to undo progression stages
 */

const {
  Offer,
  Opening,
  Confirmation,
  PaymentVoucher,
  Netto1,
  Netto2,
  Lost,
  Lead,
  Settings,
  NotFoundError,
  AuthorizationError,
  DatabaseError,
  logger,
  eventEmitter,
  EVENT_TYPES,
  updateLeadStageAndStatus,
} = require('../config/dependencies');

const { validateObjectId } = require('../utils/validators');
const { calculateNettoAmounts } = require('../utils/calculations');
const { STATUS_PRIORITY, STAGE_STATUS_MAPPING } = require('../config/constants');

/**
 * Revert offer progression in V2 consolidated model
 * Updates progression.{stage}.active to false and calculates new current_stage
 * @param {string} offerId - Offer ID
 * @param {string} stage - Stage to revert (e.g., 'payment', 'confirmation', etc.)
 * @param {string} userId - User ID performing the revert
 * @param {string} reason - Reason for revert
 * @returns {Promise<string>} - New current_stage after revert
 */
const revertOfferProgression = async (offerId, stage, userId, reason = '') => {
  try {
    const offer = await Offer.findById(offerId);
    if (!offer) {
      logger.warn(`Offer not found for revert: ${offerId}`);
      return 'offer';
    }

    // Stage hierarchy for determining new current_stage
    const STAGE_HIERARCHY = ['offer', 'opening', 'confirmation', 'payment', 'netto1', 'netto2', 'lost'];
    
    // Build update query
    const updateQuery = {
      $set: {
        [`progression.${stage}.active`]: false,
        [`progression.${stage}.reverted_at`]: new Date(),
        [`progression.${stage}.reverted_by`]: userId,
        [`progression.${stage}.revert_reason`]: reason,
        updatedAt: new Date(),
      }
    };

    // Calculate new current_stage based on remaining active stages
    // Check progression object for active stages in reverse hierarchy order
    let newCurrentStage = 'offer'; // Default fallback
    
    // Check stages in reverse order (highest to lowest) to find the highest remaining active stage
    for (let i = STAGE_HIERARCHY.length - 1; i >= 0; i--) {
      const checkStage = STAGE_HIERARCHY[i];
      
      // Skip the stage we're reverting
      if (checkStage === stage) continue;
      
      // Check if this stage is active in the progression object
      if (offer.progression && 
          offer.progression[checkStage] && 
          offer.progression[checkStage].active === true) {
        newCurrentStage = checkStage;
        break;
      }
    }

    // Update current_stage if it changed
    if (newCurrentStage !== offer.current_stage) {
      updateQuery.$set.current_stage = newCurrentStage;
    }

    // Add timeline entry for revert
    const timelineEntry = {
      action: 'revert',
      from_stage: offer.current_stage || 'offer',
      to_stage: newCurrentStage,
      reverted_stage: stage,
      timestamp: new Date(),
      user_id: userId,
      metadata: {
        revert_reason: reason
      }
    };
    
    updateQuery.$push = { timeline: timelineEntry };

    // Execute update
    await Offer.findByIdAndUpdate(offerId, updateQuery);

    logger.info(`✅ Reverted offer progression: ${stage} → ${newCurrentStage}`, {
      offerId,
      revertedStage: stage,
      newCurrentStage,
      userId,
      reason
    });

    return newCurrentStage;
  } catch (error) {
    logger.error('Error in revertOfferProgression:', error);
    // Return safe fallback - don't throw to avoid breaking revert flow
    return 'offer';
  }
};

/**
 * Calculate the appropriate status after reverting a stage
 * @param {string} offerId - Offer ID
 * @returns {Promise<string>} - The status the lead should revert to
 */
const calculateRevertStatus = async (offerId) => {
  try {
    // Check what progression stages still exist (active) for this offer
    const [openings, confirmations, paymentVouchers, netto1s, netto2s] = await Promise.all([
      Opening.find({ offer_id: offerId, active: true }).lean(),
      Confirmation.find({ 
        $or: [
          { offer_id: offerId },
          { opening_id: { $in: await Opening.find({ offer_id: offerId, active: true }).distinct('_id') } }
        ],
        active: true 
      }).lean(),
      PaymentVoucher.find({
        $or: [
          { offer_id: offerId },
          { confirmation_id: { $in: await Confirmation.find({ 
            $or: [
              { offer_id: offerId },
              { opening_id: { $in: await Opening.find({ offer_id: offerId, active: true }).distinct('_id') } }
            ],
            active: true 
          }).distinct('_id') } }
        ],
        active: true
      }).lean(),
      Netto1.find({ offer_id: offerId, active: true }).lean(),
      Netto2.find({ offer_id: offerId, active: true }).lean(),
    ]);

    // Determine highest remaining stage
    if (netto2s.length > 0) return 'Netto2';
    if (netto1s.length > 0) return 'Netto1';
    if (paymentVouchers.length > 0) return 'Payment';
    if (confirmations.length > 0) return 'Confirmation';
    if (openings.length > 0) return 'Contract';
    
    // If no progression stages remain, revert to base offer status
    return 'Angebot';
  } catch (error) {
    logger.error('Error calculating revert status:', error);
    return 'Angebot'; // Safe fallback
  }
};

/**
 * Revert Netto2 stage - mark netto2 records as inactive
 */
const revertNetto2FromOffer = async (offerId, user, hasPermissionFn, permissions, reason = '') => {
  try {
    if (!validateObjectId(offerId)) {
      throw new NotFoundError('Invalid offer ID format');
    }

    // Verify permissions
    if (
      !await hasPermissionFn(user.role, permissions.OFFER_UPDATE_ALL) &&
      !await hasPermissionFn(user.role, permissions.OFFER_UPDATE_OWN)
    ) {
      throw new AuthorizationError("You don't have permission to revert offers");
    }

    // Validate offer exists
    const offer = await Offer.findById(offerId).populate('lead_id');
    if (!offer) {
      throw new NotFoundError('Offer not found');
    }

    // Check offer ownership if not admin
    if (
      !await hasPermissionFn(user.role, permissions.OFFER_UPDATE_ALL) &&
      offer.agent_id.toString() !== user._id.toString()
    ) {
      throw new AuthorizationError("You don't have permission to revert this offer");
    }

    // Check V2 progression first
    const hasV2Progression = offer.progression && 
                              offer.progression.netto2 && 
                              offer.progression.netto2.active === true;

    // Find active Netto2 records (legacy)
    const netto2Records = await Netto2.find({ offer_id: offerId, active: true });
    
    // Allow revert if either V2 progression exists OR legacy records exist
    if (netto2Records.length === 0 && !hasV2Progression) {
      throw new DatabaseError('No active Netto2 records found to revert');
    }

    // Mark Netto2 records as inactive (if any exist)
    if (netto2Records.length > 0) {
      await Netto2.updateMany(
        { offer_id: offerId, active: true },
        { 
          active: false,
          revert_reason: reason,
          reverted_by: user._id,
          reverted_at: new Date()
        }
      );
    }

    // V2: Update Offer model progression and current_stage
    await revertOfferProgression(offerId, 'netto2', user._id, reason);

    // Calculate new status after revert
    const newStatus = await calculateRevertStatus(offerId);

    // Update lead status
    if (offer.lead_id) {
      await updateLeadStageAndStatus(offer.lead_id._id, 'Opening', newStatus);
      
      logger.info('✅ Reverted Netto2 and updated lead status', {
        leadId: offer.lead_id._id,
        offerId,
        previousStatus: 'Netto2',
        newStatus,
        revertedBy: user._id,
        reason
      });
    }

    // Emit event
    eventEmitter.emit(EVENT_TYPES.OFFER.NETTO2_REVERTED, {
      offer,
      revertedRecords: netto2Records,
      revertedBy: user,
      reason,
      newStatus
    });

    return {
      success: true,
      message: `Reverted ${netto2Records.length} Netto2 record(s)`,
      newStatus,
      revertedCount: netto2Records.length
    };
  } catch (error) {
    logger.error('Error in revertNetto2FromOffer:', error);
    throw error;
  }
};

/**
 * Revert Netto1 stage - mark netto1 records as inactive
 */
const revertNetto1FromOffer = async (offerId, user, hasPermissionFn, permissions, reason = '') => {
  try {
    if (!validateObjectId(offerId)) {
      throw new NotFoundError('Invalid offer ID format');
    }

    // Verify permissions
    if (
      !await hasPermissionFn(user.role, permissions.OFFER_UPDATE_ALL) &&
      !await hasPermissionFn(user.role, permissions.OFFER_UPDATE_OWN)
    ) {
      throw new AuthorizationError("You don't have permission to revert offers");
    }

    // Validate offer exists
    const offer = await Offer.findById(offerId).populate('lead_id');
    if (!offer) {
      throw new NotFoundError('Offer not found');
    }

    // Check offer ownership if not admin
    if (
      !await hasPermissionFn(user.role, permissions.OFFER_UPDATE_ALL) &&
      offer.agent_id.toString() !== user._id.toString()
    ) {
      throw new AuthorizationError("You don't have permission to revert this offer");
    }

    // Check V2 progression first
    const hasV2Progression = offer.progression && 
                              offer.progression.netto1 && 
                              offer.progression.netto1.active === true;

    // Find active Netto1 records (legacy)
    const netto1Records = await Netto1.find({ offer_id: offerId, active: true });
    
    // Allow revert if either V2 progression exists OR legacy records exist
    if (netto1Records.length === 0 && !hasV2Progression) {
      throw new DatabaseError('No active Netto1 records found to revert');
    }

    // Mark Netto1 records as inactive (if any exist)
    if (netto1Records.length > 0) {
      await Netto1.updateMany(
        { offer_id: offerId, active: true },
        { 
          active: false,
          revert_reason: reason,
          reverted_by: user._id,
          reverted_at: new Date()
        }
      );
    }

    // V2: Update Offer model progression and current_stage
    await revertOfferProgression(offerId, 'netto1', user._id, reason);

    // Calculate new status after revert
    const newStatus = await calculateRevertStatus(offerId);

    // Update lead status
    if (offer.lead_id) {
      await updateLeadStageAndStatus(offer.lead_id._id, 'Opening', newStatus);
      
      logger.info('✅ Reverted Netto1 and updated lead status', {
        leadId: offer.lead_id._id,
        offerId,
        previousStatus: 'Netto1',
        newStatus,
        revertedBy: user._id,
        reason
      });
    }

    // Emit event
    eventEmitter.emit(EVENT_TYPES.OFFER.NETTO1_REVERTED, {
      offer,
      revertedRecords: netto1Records,
      revertedBy: user,
      reason,
      newStatus
    });

    return {
      success: true,
      message: `Reverted ${netto1Records.length} Netto1 record(s)`,
      newStatus,
      revertedCount: netto1Records.length
    };
  } catch (error) {
    logger.error('Error in revertNetto1FromOffer:', error);
    throw error;
  }
};

/**
 * Revert Payment stage - mark payment voucher records as inactive
 */
const revertPaymentFromOffer = async (offerId, user, hasPermissionFn, permissions, reason = '') => {
  try {
    if (!validateObjectId(offerId)) {
      throw new NotFoundError('Invalid offer ID format');
    }

    // Verify permissions
    if (
      !await hasPermissionFn(user.role, permissions.OFFER_UPDATE_ALL) &&
      !await hasPermissionFn(user.role, permissions.OFFER_UPDATE_OWN)
    ) {
      throw new AuthorizationError("You don't have permission to revert offers");
    }

    // Validate offer exists
    const offer = await Offer.findById(offerId).populate('lead_id');
    if (!offer) {
      throw new NotFoundError('Offer not found');
    }

    // Check offer ownership if not admin
    if (
      !await hasPermissionFn(user.role, permissions.OFFER_UPDATE_ALL) &&
      offer.agent_id.toString() !== user._id.toString()
    ) {
      throw new AuthorizationError("You don't have permission to revert this offer");
    }

    // Find all active confirmation IDs related to this offer
    const activeConfirmationIds = await Confirmation.find({
      $or: [
        { offer_id: offerId },
        { opening_id: { $in: await Opening.find({ offer_id: offerId, active: true }).distinct('_id') } }
      ],
      active: true
    }).distinct('_id');

    // Check V2 progression first
    const hasV2Progression = offer.progression && 
                              offer.progression.payment && 
                              offer.progression.payment.active === true;

    // Find active Payment Voucher records (legacy)
    const paymentRecords = await PaymentVoucher.find({
      $or: [
        { offer_id: offerId },
        { confirmation_id: { $in: activeConfirmationIds } }
      ],
      active: true
    });

    // Allow revert if either V2 progression exists OR legacy records exist
    if (paymentRecords.length === 0 && !hasV2Progression) {
      throw new DatabaseError('No active Payment Voucher records found to revert');
    }

    // Mark Payment Voucher records as inactive (if any exist)
    if (paymentRecords.length > 0) {
      await PaymentVoucher.updateMany(
        {
          $or: [
            { offer_id: offerId },
            { confirmation_id: { $in: activeConfirmationIds } }
          ],
          active: true
        },
        { 
          active: false,
          revert_reason: reason,
          reverted_by: user._id,
          reverted_at: new Date()
        }
      );
    }

    // V2: Update Offer model progression and current_stage
    await revertOfferProgression(offerId, 'payment', user._id, reason);

    // Calculate new status after revert
    const newStatus = await calculateRevertStatus(offerId);

    // Update lead status
    if (offer.lead_id) {
      await updateLeadStageAndStatus(offer.lead_id._id, 'Opening', newStatus);
      
      logger.info('✅ Reverted Payment and updated lead status', {
        leadId: offer.lead_id._id,
        offerId,
        previousStatus: 'Payment',
        newStatus,
        revertedBy: user._id,
        reason
      });
    }

    // Emit event
    eventEmitter.emit(EVENT_TYPES.OFFER.PAYMENT_REVERTED, {
      offer,
      revertedRecords: paymentRecords,
      revertedBy: user,
      reason,
      newStatus
    });

    return {
      success: true,
      message: `Reverted ${paymentRecords.length} Payment Voucher record(s)`,
      newStatus,
      revertedCount: paymentRecords.length
    };
  } catch (error) {
    logger.error('Error in revertPaymentFromOffer:', error);
    throw error;
  }
};

/**
 * Revert Confirmation stage - mark confirmation records as inactive
 */
const revertConfirmationFromOffer = async (offerId, user, hasPermissionFn, permissions, reason = '') => {
  try {
    if (!validateObjectId(offerId)) {
      throw new NotFoundError('Invalid offer ID format');
    }

    // Verify permissions
    if (
      !await hasPermissionFn(user.role, permissions.OFFER_UPDATE_ALL) &&
      !await hasPermissionFn(user.role, permissions.OFFER_UPDATE_OWN)
    ) {
      throw new AuthorizationError("You don't have permission to revert offers");
    }

    // Validate offer exists
    const offer = await Offer.findById(offerId).populate('lead_id');
    if (!offer) {
      throw new NotFoundError('Offer not found');
    }

    // Check offer ownership if not admin
    if (
      !await hasPermissionFn(user.role, permissions.OFFER_UPDATE_ALL) &&
      offer.agent_id.toString() !== user._id.toString()
    ) {
      throw new AuthorizationError("You don't have permission to revert this offer");
    }

    // Check V2 progression first
    const hasV2Progression = offer.progression && 
                              offer.progression.confirmation && 
                              offer.progression.confirmation.active === true;

    // Find active Confirmation records (legacy)
    const confirmationRecords = await Confirmation.find({
      $or: [
        { offer_id: offerId },
        { opening_id: { $in: await Opening.find({ offer_id: offerId, active: true }).distinct('_id') } }
      ],
      active: true
    });

    // Allow revert if either V2 progression exists OR legacy records exist
    if (confirmationRecords.length === 0 && !hasV2Progression) {
      throw new DatabaseError('No active Confirmation records found to revert');
    }

    // Mark Confirmation records as inactive (if any exist)
    if (confirmationRecords.length > 0) {
      await Confirmation.updateMany(
        {
          $or: [
            { offer_id: offerId },
            { opening_id: { $in: await Opening.find({ offer_id: offerId, active: true }).distinct('_id') } }
          ],
          active: true
        },
        { 
          active: false,
          revert_reason: reason,
          reverted_by: user._id,
          reverted_at: new Date()
        }
      );
    }

    // V2: Update Offer model progression and current_stage
    await revertOfferProgression(offerId, 'confirmation', user._id, reason);

    // Calculate new status after revert
    const newStatus = await calculateRevertStatus(offerId);

    // Update lead status
    if (offer.lead_id) {
      await updateLeadStageAndStatus(offer.lead_id._id, 'Opening', newStatus);
      
      logger.info('✅ Reverted Confirmation and updated lead status', {
        leadId: offer.lead_id._id,
        offerId,
        previousStatus: 'Confirmation',
        newStatus,
        revertedBy: user._id,
        reason
      });
    }

    // Emit event
    eventEmitter.emit(EVENT_TYPES.OFFER.CONFIRMATION_REVERTED, {
      offer,
      revertedRecords: confirmationRecords,
      revertedBy: user,
      reason,
      newStatus
    });

    return {
      success: true,
      message: `Reverted ${confirmationRecords.length} Confirmation record(s)`,
      newStatus,
      revertedCount: confirmationRecords.length
    };
  } catch (error) {
    logger.error('Error in revertConfirmationFromOffer:', error);
    throw error;
  }
};

/**
 * Revert Opening stage - mark opening records as inactive
 */
const revertOpeningFromOffer = async (offerId, user, hasPermissionFn, permissions, reason = '') => {
  try {
    if (!validateObjectId(offerId)) {
      throw new NotFoundError('Invalid offer ID format');
    }

    // Verify permissions
    if (
      !await hasPermissionFn(user.role, permissions.OFFER_UPDATE_ALL) &&
      !await hasPermissionFn(user.role, permissions.OFFER_UPDATE_OWN)
    ) {
      throw new AuthorizationError("You don't have permission to revert offers");
    }

    // Validate offer exists
    const offer = await Offer.findById(offerId).populate('lead_id');
    if (!offer) {
      throw new NotFoundError('Offer not found');
    }

    // Check offer ownership if not admin
    if (
      !await hasPermissionFn(user.role, permissions.OFFER_UPDATE_ALL) &&
      offer.agent_id.toString() !== user._id.toString()
    ) {
      throw new AuthorizationError("You don't have permission to revert this offer");
    }

    // Check V2 progression first
    const hasV2Progression = offer.progression && 
                              offer.progression.opening && 
                              offer.progression.opening.active === true;

    // Find active Opening records (legacy)
    const openingRecords = await Opening.find({ offer_id: offerId, active: true });
    
    // Allow revert if either V2 progression exists OR legacy records exist
    if (openingRecords.length === 0 && !hasV2Progression) {
      throw new DatabaseError('No active Opening records found to revert');
    }

    // Mark Opening records as inactive (if any exist)
    if (openingRecords.length > 0) {
      await Opening.updateMany(
        { offer_id: offerId, active: true },
        { 
          active: false,
          revert_reason: reason,
          reverted_by: user._id,
          reverted_at: new Date()
        }
      );
    }

    // V2: Update Offer model progression and current_stage
    await revertOfferProgression(offerId, 'opening', user._id, reason);

    // Calculate new status after revert
    const newStatus = await calculateRevertStatus(offerId);

    // Update lead status
    if (offer.lead_id) {
      await updateLeadStageAndStatus(offer.lead_id._id, 'Opening', newStatus);
      
      logger.info('✅ Reverted Opening and updated lead status', {
        leadId: offer.lead_id._id,
        offerId,
        previousStatus: 'Contract',
        newStatus,
        revertedBy: user._id,
        reason
      });
    }

    // Emit event
    eventEmitter.emit(EVENT_TYPES.OFFER.OPENING_REVERTED, {
      offer,
      revertedRecords: openingRecords,
      revertedBy: user,
      reason,
      newStatus
    });

    return {
      success: true,
      message: `Reverted ${openingRecords.length} Opening record(s)`,
      newStatus,
      revertedCount: openingRecords.length
    };
  } catch (error) {
    logger.error('Error in revertOpeningFromOffer:', error);
    throw error;
  }
};

/**
 * Get available revert options for an offer
 */
const getRevertOptions = async (offerId, user, hasPermissionFn, permissions) => {
  try {
    if (!validateObjectId(offerId)) {
      throw new NotFoundError('Invalid offer ID format');
    }

    // Verify permissions
    if (
      !await hasPermissionFn(user.role, permissions.OFFER_READ_ALL) &&
      !await hasPermissionFn(user.role, permissions.OFFER_READ_OWN)
    ) {
      throw new AuthorizationError("You don't have permission to view offer revert options");
    }

    // Validate offer exists
    const offer = await Offer.findById(offerId);
    if (!offer) {
      throw new NotFoundError('Offer not found');
    }

    // Check what stages can be reverted (have active records)
    const [openings, confirmations, paymentVouchers, netto1s, netto2s] = await Promise.all([
      Opening.countDocuments({ offer_id: offerId, active: true }),
      Confirmation.countDocuments({ 
        $or: [
          { offer_id: offerId },
          { opening_id: { $in: await Opening.find({ offer_id: offerId, active: true }).distinct('_id') } }
        ],
        active: true 
      }),
      PaymentVoucher.countDocuments({
        $or: [
          { offer_id: offerId },
          { confirmation_id: { $in: await Confirmation.find({ 
            $or: [
              { offer_id: offerId },
              { opening_id: { $in: await Opening.find({ offer_id: offerId, active: true }).distinct('_id') } }
            ],
            active: true 
          }).distinct('_id') } }
        ],
        active: true
      }),
      Netto1.countDocuments({ offer_id: offerId, active: true }),
      Netto2.countDocuments({ offer_id: offerId, active: true }),
    ]);

    const revertOptions = [];

    if (netto2s > 0) {
      revertOptions.push({
        stage: 'netto2',
        displayName: 'Netto2',
        recordCount: netto2s,
        canRevert: true
      });
    }

    if (netto1s > 0) {
      revertOptions.push({
        stage: 'netto1',
        displayName: 'Netto1',
        recordCount: netto1s,
        canRevert: true
      });
    }

    if (paymentVouchers > 0) {
      revertOptions.push({
        stage: 'payment',
        displayName: 'Payment',
        recordCount: paymentVouchers,
        canRevert: true
      });
    }

    if (confirmations > 0) {
      revertOptions.push({
        stage: 'confirmation',
        displayName: 'Confirmation',
        recordCount: confirmations,
        canRevert: true
      });
    }

    if (openings > 0) {
      revertOptions.push({
        stage: 'opening',
        displayName: 'Opening (Contract)',
        recordCount: openings,
        canRevert: true
      });
    }

    return {
      offerId,
      availableReverts: revertOptions,
      currentStatus: await calculateRevertStatus(offerId)
    };
  } catch (error) {
    logger.error('Error in getRevertOptions:', error);
    throw error;
  }
};

/**
 * Revert lost record from offer - Remove lost status and potentially update lead
 */
const revertLostFromOffer = async (offerId, user, hasPermissionFn, permissions, revertReason) => {
  try {
    if (!validateObjectId(offerId)) {
      throw new NotFoundError('Invalid offer ID format');
    }

    // Verify permissions - only admins can revert lost records
    if (!await hasPermissionFn(user.role, permissions.OFFER_UPDATE_ALL)) {
      throw new AuthorizationError("You don't have permission to revert lost records");
    }

    // Get the offer details first
    const offer = await Offer.findById(offerId).populate('lead_id');
    if (!offer) {
      throw new NotFoundError('Offer not found');
    }

    // Check V2 progression first
    const hasV2Progression = offer.progression && 
                              offer.progression.lost && 
                              offer.progression.lost.active === true;

    // Find the active lost record for this offer (legacy)
    const lostRecord = await Lost.findOne({ offer_id: offerId, active: true });
    
    // Allow revert if either V2 progression exists OR legacy records exist
    if (!lostRecord && !hasV2Progression) {
      throw new NotFoundError('No active lost record found for this offer');
    }

    // Store original data for logging (if legacy record exists)
    const originalLostData = lostRecord ? lostRecord.toObject() : null;

    // Mark the lost record as inactive (if legacy record exists)
    if (lostRecord) {
      lostRecord.active = false;
      lostRecord.revert_reason = revertReason || 'Reverted by admin';
      lostRecord.reverted_by = user._id;
      lostRecord.reverted_at = new Date();
      await lostRecord.save();
    }

    // V2: Update Offer model progression and current_stage
    await revertOfferProgression(offerId, 'lost', user._id, revertReason || 'Reverted by admin');

    // Calculate appropriate lead status after reverting lost
    try {
      if (offer.lead_id) {
        // Check if there are other active lost records for this lead
        const otherLostOffersCount = await Lost.countDocuments({
          offer_id: { $in: await Offer.find({ lead_id: offer.lead_id._id, active: true }).distinct('_id') },
          active: true,
          ...(lostRecord ? { _id: { $ne: lostRecord._id } } : {})
        });

        logger.info('🔄 LOST REVERT DEBUG: Checking other lost offers for lead', {
          leadId: offer.lead_id._id,
          revertedLostId: lostRecord?._id,
          otherLostOffersCount,
          v2Only: !lostRecord && hasV2Progression,
        });

        if (otherLostOffersCount === 0) {
          // No other lost offers - calculate the appropriate status to revert to
          const revertStatus = await calculateRevertStatus(offer._id);
          
          logger.info('🔄 LOST REVERT: Reverting lead status', {
            leadId: offer.lead_id._id,
            offerId: offer._id,
            revertedLostId: lostRecord?._id,
            calculatedRevertStatus: revertStatus,
            v2Only: !lostRecord && hasV2Progression,
          });

          // Find the appropriate stage/status from Settings
          let targetStage = 'Positiv';
          let targetStatus = revertStatus || 'Angebot';

          // If there are progression records, use Opening stage
          const hasProgressions = await Promise.all([
            Opening.findOne({ offer_id: offer._id, active: true }),
            Confirmation.findOne({ 
              $or: [
                { offer_id: offer._id },
                { opening_id: { $in: await Opening.find({ offer_id: offer._id, active: true }).distinct('_id') } }
              ],
              active: true 
            }),
            PaymentVoucher.findOne({
              $or: [
                { offer_id: offer._id },
                { confirmation_id: { $in: await Confirmation.find({ 
                  $or: [
                    { offer_id: offer._id },
                    { opening_id: { $in: await Opening.find({ offer_id: offer._id, active: true }).distinct('_id') } }
                  ],
                  active: true 
                }).distinct('_id') } }
              ],
              active: true
            }),
            Netto1.findOne({ offer_id: offer._id, active: true }),
            Netto2.findOne({ offer_id: offer._id, active: true })
          ]);

          const hasAnyProgressions = hasProgressions.some(Boolean);
          if (hasAnyProgressions) {
            targetStage = 'Opening';
          }

          // Look up the appropriate stage and status in Settings
          const stage = await Settings.findOne({ type: 'stage', name: targetStage });
          if (stage && stage.info && stage.info.statuses) {
            const status = stage.info.statuses.find(s => s.name === targetStatus);
            
            if (status) {
              const updateResult = await Lead.findByIdAndUpdate(
                offer.lead_id._id,
                {
                  stage_id: stage._id,
                  stage: stage.name,
                  status_id: status._id,
                  status: status.name,
                  updated_at: new Date(),
                },
                { new: true }
              );

              if (updateResult) {
                logger.info('✅ Reverted lead stage and status after lost revert', {
                  leadId: offer.lead_id._id,
                  offerId: offer._id,
                  revertedLostId: lostRecord?._id,
                  newStageId: stage._id,
                  newStageName: stage.name,
                  newStatusId: status._id,
                  newStatusName: status.name,
                  v2Only: !lostRecord && hasV2Progression,
                });
              }
            } else {
              logger.warn('⚠️ Could not find target status in stage settings', {
                leadId: offer.lead_id._id,
                targetStage,
                targetStatus,
                availableStatuses: stage.info.statuses.map(s => s.name),
              });
            }
          }
        } else {
          logger.info('🔄 LOST REVERT: Lead has other lost offers - keeping Lost status', {
            leadId: offer.lead_id._id,
            offerId: offer._id,
            revertedLostId: lostRecord?._id,
            otherLostOffersCount,
            v2Only: !lostRecord && hasV2Progression,
          });
        }
      }
    } catch (error) {
      logger.error('Failed to update lead stage and status after lost revert', {
        error: error.message,
        stack: error.stack,
        leadId: offer.lead_id?._id,
        offerId: offer._id,
        revertedLostId: lostRecord?._id,
        v2Only: !lostRecord && hasV2Progression,
      });
    }

    // Get the updated lost record for response (if legacy record existed)
    let revertedLostRecord = null;
    if (lostRecord) {
      revertedLostRecord = await Lost.findById(lostRecord._id)
        .populate('offer_id', 'title lead_id investment_volume')
        .populate('creator_id', 'name email role')
        .populate('reverted_by', 'name email role');
    }

    // Emit revert event
    eventEmitter.emit(EVENT_TYPES.OFFER.LOST_REVERTED, {
      lostRecord: revertedLostRecord,
      originalData: originalLostData,
      reverter: user,
      offer,
      lead: offer.lead_id,
      revertReason,
      v2Only: !lostRecord && hasV2Progression, // Indicate if this was V2-only revert
    });

    logger.info('Lost record reverted successfully', {
      userId: user._id,
      lostId: lostRecord?._id,
      offerId: offer._id,
      leadId: offer.lead_id?._id,
      revertReason,
      v2Only: !lostRecord && hasV2Progression,
    });

    return revertedLostRecord || { 
      success: true, 
      message: 'Lost stage reverted (V2 only)',
      offerId: offer._id 
    };
  } catch (error) {
    logger.error('Error in revertLostFromOffer:', error);
    throw error;
  }
};

module.exports = {
  revertNetto2FromOffer,
  revertNetto1FromOffer,
  revertPaymentFromOffer,
  revertConfirmationFromOffer,
  revertOpeningFromOffer,
  revertLostFromOffer,
  getRevertOptions,
  calculateRevertStatus,
};
