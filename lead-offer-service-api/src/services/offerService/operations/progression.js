/**
 * Offer Service Progression Operations
 * Contains offer progression operations (Opening, Confirmation, Payment, Netto1, Netto2, Lost)
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
  DatabaseError,
  logger,
  DocumentUploadHelper,
  eventEmitter,
  EVENT_TYPES,
  updateLeadStageAndStatus,
} = require('../config/dependencies');

const { validateObjectId } = require('../utils/validators');
const { updateLeadStatusIfHigherPriority } = require('../utils/statusPriority');
const DocumentManager = require('../documents/DocumentManager');

// Helper to update Offer progression and timeline
// This replaces the need for aggregation pipelines to calculate status
const updateOfferProgression = async (offerId, stage, data, userId) => {
  const offer = await Offer.findById(offerId);
  if (!offer) return;

  // 1. Update the embedded progression data for this stage
  // We use $set to target the specific embedded document fields
  const now = new Date();
  const updateQuery = {
    $set: {
      [`progression.${stage}.active`]: true,
      [`progression.${stage}.completed_at`]: now,
      [`progression.${stage}.completed_by`]: userId,
      // Per-stage timestamps for date-based filtering on each progression stage
      [`progression.${stage}.createdAt`]: now,
      [`progression.${stage}.updatedAt`]: now,
      // Also update standard timestamps
      updatedAt: now,
    }
  };

  // Add stage-specific fields if provided
  if (data.amount) updateQuery.$set[`progression.${stage}.amount`] = data.amount;
  if (data.files) updateQuery.$set[`progression.${stage}.files`] = data.files;
  if (data.metadata) updateQuery.$set[`progression.${stage}.metadata`] = data.metadata;
  
  // Specific fields for Netto
  if (data.bankerRate) updateQuery.$set[`progression.${stage}.bankerRate`] = data.bankerRate;
  if (data.agentRate) updateQuery.$set[`progression.${stage}.agentRate`] = data.agentRate;
  
  // Specific for Lost
  if (stage === 'lost') {
     updateQuery.$set[`progression.${stage}.reason`] = data.reason;
     updateQuery.$set[`progression.${stage}.marked_at`] = new Date();
     updateQuery.$set[`progression.${stage}.marked_by`] = userId;
  }

  // 2. Determine if we should update 'current_stage'
  // Only update if the new stage is "higher" in the workflow or if it's a direct move
  // Simple hierarchy check:
  const STAGE_HIERARCHY = ['offer', 'opening', 'confirmation', 'payment', 'netto1', 'netto2', 'lost'];
  const currentStageIndex = STAGE_HIERARCHY.indexOf(offer.current_stage || 'offer');
  const newStageIndex = STAGE_HIERARCHY.indexOf(stage);

  // If new stage is higher priority (or it's lost), update current_stage
  if (newStageIndex > currentStageIndex || stage === 'lost') {
    updateQuery.$set.current_stage = stage;
  }

  // 3. Add to Timeline
  const timelineEntry = {
    action: 'progress',
    from_stage: offer.current_stage || 'offer',
    to_stage: stage,
    timestamp: new Date(),
    user_id: userId,
    metadata: {
      source_id: data.source_id // Reference to external collection doc if needed
    }
  };
  
  updateQuery.$push = { timeline: timelineEntry };

  await Offer.findByIdAndUpdate(offerId, updateQuery);
};


/**
 * Create opening from offer
 * Delegates to openingService for full creation logic (task creation, activity logging, etc.)
 */
const createOpeningFromOffer = async (offerId, files, user, hasPermissionFn, permissions) => {
  // Delegate to openingService which handles:
  // - Opening creation with file uploads
  // - Offer progression update
  // - Lead stage/status update
  // - Task creation in Kanban board
  // - Activity logging (both collections)
  // - Event emission for notifications
  const openingService = require('../../openingService');
  return openingService.createOpening({ offer_id: offerId }, files, user);
};

/**
 * Create confirmation from offer
 * Delegates to confirmationService for full creation logic
 */
const createConfirmationFromOffer = async (
  offerId,
  openingId,
  files,
  notes,
  reference_no,
  user,
  hasPermissionFn,
  permissions
) => {
  const confirmationService = require('../../confirmationService');
  return confirmationService.createConfirmation(
    { offer_id: offerId, opening_id: openingId, notes, reference_no },
    files,
    user
  );
};

/**
 * Create Payment Voucher from Offer
 * Delegates to paymentVoucherService for full creation logic
 */
const createPaymentVoucherFromOffer = async (offerId, amount, notes, files, user) => {
  const paymentVoucherService = require('../../paymentVoucherService');
  return paymentVoucherService.createPaymentVoucher(
    { offer_id: offerId, amount, notes },
    files,
    user
  );
};

/**
 * Create Netto1 from Offer
 */
const createNetto1FromOffer = async (
  offerId, 
  bankerRate, 
  agentRate, 
  files, 
  user,
  hasPermissionFn,
  permissions,
  notes = ''
) => {
  try {
    if (!validateObjectId(offerId)) throw new NotFoundError('Invalid offer ID');
    
    const offer = await Offer.findById(offerId);
    if (!offer) throw new NotFoundError('Offer not found');

    // Validation: Ensure rates sum to <= 100 (if that's a rule) or other logic
    
    // Create Netto1 Record (Legacy)
    const netto1 = new Netto1({
      offer_id: offerId,
      bankerRate,
      agentRate,
      notes,
      creator_id: user._id,
      files: []
    });

    if (files && files.length > 0) {
      await DocumentUploadHelper.processAndAttachFiles(
        netto1,
        files,
        'netto1-contract', // Assuming doc type
        user._id
      );
    }

    await netto1.save();

    // V2: Update Offer Model
    await updateOfferProgression(offerId, 'netto1', {
      source_id: netto1._id,
      files: netto1.files,
      bankerRate,
      agentRate,
      metadata: { notes }
    }, user._id);

    // Update Offer itself with rates (legacy behavior often updated offer rates too)
    offer.bankerRate = bankerRate;
    offer.agentRate = agentRate;
    await offer.save();

    // Update Lead Status
    if (offer.lead_id) {
      await updateLeadStatusIfHigherPriority(
        offer.lead_id,
        'netto1',
        Lead,
        updateLeadStageAndStatus
      );
    }

    // Create activity log
    try {
      const { createActivity } = require('../../activityService/utils');
      const offerTitle = offer.title || `Offer #${offerId}`;
      
      await createActivity({
        _creator: user._id,
        _subject_id: offerId,
        subject_type: 'Offer',
        action: 'status_change',
        message: `Netto1 created for offer: ${offerTitle} (Banker: ${bankerRate}%, Agent: ${agentRate}%)`,
        type: 'info',
        details: {
          action_type: 'netto1_created',
          offer_id: offerId,
          offer_title: offerTitle,
          netto1_id: netto1._id,
          banker_rate: bankerRate,
          agent_rate: agentRate,
          notes: notes,
        },
      });
    } catch (activityError) {
      logger.warn('Failed to log Netto1 creation activity (non-blocking)', {
        error: activityError.message,
        offerId,
      });
    }

    return netto1;
  } catch (error) {
    logger.error('Error creating Netto1:', error);
    throw error;
  }
};

/**
 * Create Netto2 from Offer
 */
const createNetto2FromOffer = async (
  offerId, 
  bankerRate, 
  agentRate, 
  files, 
  user,
  hasPermissionFn,
  permissions,
  notes = ''
) => {
  try {
    if (!validateObjectId(offerId)) throw new NotFoundError('Invalid offer ID');
    
    const offer = await Offer.findById(offerId);
    if (!offer) throw new NotFoundError('Offer not found');

    // Create Netto2 Record (Legacy)
    const netto2 = new Netto2({
      offer_id: offerId,
      bankerRate,
      agentRate,
      notes,
      creator_id: user._id,
      files: []
    });

    if (files && files.length > 0) {
      await DocumentUploadHelper.processAndAttachFiles(
        netto2,
        files,
        'netto2-contract',
        user._id
      );
    }

    await netto2.save();

    // V2: Update Offer Model
    await updateOfferProgression(offerId, 'netto2', {
      source_id: netto2._id,
      files: netto2.files,
      bankerRate,
      agentRate,
      metadata: { notes }
    }, user._id);

    // Update Offer rates
    offer.bankerRate = bankerRate;
    offer.agentRate = agentRate;
    await offer.save();

    // Update Lead Status
    if (offer.lead_id) {
      await updateLeadStatusIfHigherPriority(
        offer.lead_id,
        'netto2',
        Lead,
        updateLeadStageAndStatus
      );
    }

    // Create activity log
    try {
      const { createActivity } = require('../../activityService/utils');
      const offerTitle = offer.title || `Offer #${offerId}`;
      
      await createActivity({
        _creator: user._id,
        _subject_id: offerId,
        subject_type: 'Offer',
        action: 'status_change',
        message: `Netto2 created for offer: ${offerTitle} (Banker: ${bankerRate}%, Agent: ${agentRate}%)`,
        type: 'info',
        details: {
          action_type: 'netto2_created',
          offer_id: offerId,
          offer_title: offerTitle,
          netto2_id: netto2._id,
          banker_rate: bankerRate,
          agent_rate: agentRate,
          notes: notes,
        },
      });
    } catch (activityError) {
      logger.warn('Failed to log Netto2 creation activity (non-blocking)', {
        error: activityError.message,
        offerId,
      });
    }

    return netto2;
  } catch (error) {
    logger.error('Error creating Netto2:', error);
    throw error;
  }
};

/**
 * Create Lost from Offer
 */
const createLostFromOffer = async (offerId, reason, user, hasPermissionFn, permissions, notes = '') => {
  try {
    if (!validateObjectId(offerId)) throw new NotFoundError('Invalid offer ID');
    
    const offer = await Offer.findById(offerId).populate('lead_id');
    if (!offer) throw new NotFoundError('Offer not found');

    // Create Lost Record (Legacy)
    const lost = new Lost({
      offer_id: offerId,
      reason,
      notes,
      creator_id: user._id
    });
    await lost.save();

    // V2: Update Offer Model
    await updateOfferProgression(offerId, 'lost', {
      source_id: lost._id,
      reason
    }, user._id);

    // Update lead stage/status to Lost - only if this is the only offer for the lead
    try {
      if (offer.lead_id) {
        const leadId = offer.lead_id._id || offer.lead_id;
        
        // Check if the lead has other active offers
        const otherOffersCount = await Offer.countDocuments({
          lead_id: leadId,
          active: true,
          _id: { $ne: offerId } // Exclude the current offer
        });

        logger.info('🔍 LOST OFFER DEBUG: Checking other offers for lead', {
          leadId,
          currentOfferId: offerId,
          otherOffersCount,
        });

        if (otherOffersCount > 0) {
          logger.info('🔍 LOST OFFER: Lead has other offers - keeping current stage/status', {
            leadId,
            offerId,
            lostId: lost._id,
            otherOffersCount,
          });
        } else {
          // This is the only offer - update lead to Opening/Lost using Settings collection
          logger.info('🔍 LOST OFFER: This is the only offer - updating lead to Opening/Lost', {
            leadId,
            offerId,
            lostId: lost._id,
          });

          // Find the Opening stage in Settings collection
          const openingStage = await Settings.findOne({ 
            type: 'stage', 
            name: 'Opening' 
          });

          if (openingStage && openingStage.info && openingStage.info.statuses) {
            // Find the Lost status within the Opening stage
            const lostStatus = openingStage.info.statuses.find(
              status => status.name === 'Lost'
            );

            if (lostStatus) {
              // Update the lead with the correct stage and status IDs
              const updateResult = await Lead.findByIdAndUpdate(
                leadId,
                {
                  stage_id: openingStage._id,
                  stage: openingStage.name,
                  status_id: lostStatus._id,
                  status: lostStatus.name,
                  updated_at: new Date(),
                },
                { new: true }
              );

              if (updateResult) {
                logger.info('✅ Updated lead stage and status for lost offer using Settings', {
                  leadId,
                  offerId,
                  lostId: lost._id,
                  stageId: openingStage._id,
                  stageName: openingStage.name,
                  statusId: lostStatus._id,
                  statusName: lostStatus.name,
                  reason,
                });
              } else {
                logger.warn('⚠️ Failed to update lead stage and status for lost offer', {
                  leadId,
                  offerId,
                  lostId: lost._id,
                });
              }
            } else {
              logger.warn('⚠️ Could not find Lost status in Opening stage settings', {
                leadId,
                offerId,
                openingStageId: openingStage._id,
                availableStatuses: openingStage.info.statuses.map(s => s.name),
              });
            }
          } else {
            logger.warn('⚠️ Could not find Opening stage in settings', {
              leadId,
              offerId,
              lostId: lost._id,
            });
          }
        }
      }
    } catch (error) {
      logger.error('Failed to update lead stage and status for lost offer', {
        error: error.message,
        stack: error.stack,
        leadId: offer.lead_id?._id,
        offerId,
        lostId: lost._id,
      });
      // Don't throw here - the lost record was created successfully
    }

    // Get populated lost record
    const populatedLost = await Lost.findById(lost._id)
      .populate({
        path: 'offer_id',
        select: 'title lead_id investment_volume interest_rate profit_percentage status project_id agent_id bonus_amount bank_id offerType',
        populate: [
          { path: 'lead_id', select: 'contact_name email_from phone status stage display_name' },
          { path: 'project_id', select: 'name color_code' },
          { path: 'agent_id', select: '_id login role name email color_code' },
          { path: 'bonus_amount', select: 'name info' },
          { path: 'bank_id', select: 'name account_number iban swift_code state is_allow is_default' },
        ],
      })
      .populate({
        path: 'creator_id',
        select: 'name email role',
      });

    // Emit event
    eventEmitter.emit(EVENT_TYPES.OFFER.LOST, {
      lost: populatedLost,
      creator: user,
      lead: offer.lead_id,
      offer,
      reason,
    });

    return populatedLost;
  } catch (error) {
    logger.error('Error creating Lost record:', error);
    throw error;
  }
};

module.exports = {
  createOpeningFromOffer,
  createConfirmationFromOffer,
  createPaymentVoucherFromOffer,
  createNetto1FromOffer,
  createNetto2FromOffer,
  createLostFromOffer,
  updateOfferProgression, // Export for use in other services
};
