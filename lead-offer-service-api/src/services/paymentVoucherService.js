const {
  PaymentVoucher,
  Confirmation,
  Offer,
  Lead,
  DatabaseError,
  NotFoundError,
  AuthorizationError,
  logger,
  eventEmitter,
  EVENT_TYPES,
  DocumentUploadHelper,
  updateLeadStageAndStatus,
} = require('../config/dependencies');

const { updateLeadStatusIfHigherPriority } = require('./offerService/utils/statusPriority');
const { updateOfferProgression } = require('./offerService/operations/progression');
const taskServiceClient = require('./taskServiceClient');
const { createActivity } = require('./activityService/utils');
const { ACTIVITY_ACTIONS } = require('../models/activity');

/**
 * Helper to flatten payment voucher response
 */
const flattenPaymentVoucherResponse = (pv) => {
  if (!pv) return null;
  return pv.toObject ? pv.toObject() : pv;
};

/**
 * Create a new payment voucher with documents
 * @param {Object} paymentVoucherData - Payment voucher data (must have either offer_id or confirmation_id)
 * @param {Array} files - Uploaded files
 * @param {Object} user - User creating the payment voucher
 * @returns {Object} Created payment voucher with populated references
 */
const createPaymentVoucher = async (paymentVoucherData, files, user) => {
  try {
    const { confirmation_id, offer_id, amount, notes } = paymentVoucherData;

    // Validate inputs
    if (!confirmation_id && !offer_id) {
      throw new NotFoundError('Either confirmation_id or offer_id must be provided');
    }

    let confirmation = null;
    if (confirmation_id) {
      confirmation = await Confirmation.findById(confirmation_id);
      if (!confirmation) throw new NotFoundError('Confirmation not found');
    }

    // Determine Offer ID
    const targetOfferId = offer_id || (confirmation ? confirmation.offer_id : null);
    const offer = await Offer.findById(targetOfferId);
    if (!offer) throw new NotFoundError('Offer not found');

    // Create Payment Voucher Record (Legacy)
    const paymentVoucher = new PaymentVoucher({
      confirmation_id: confirmation_id || null,
      offer_id: targetOfferId,
      amount,
      notes,
      creator_id: user._id,
      files: [],
    });

    if (files && files.length > 0) {
      await DocumentUploadHelper.processAndAttachFiles(
        paymentVoucher,
        files,
        DocumentUploadHelper.getDocumentTypes().PAYMENT,
        user._id
      );
    }

    await paymentVoucher.save();

    // V2: Update Offer Model directly
    await updateOfferProgression(targetOfferId, 'payment', {
      source_id: paymentVoucher._id,
      files: paymentVoucher.files,
      amount: amount,
      metadata: { notes, confirmation_id }
    }, user._id);

    // Get populated PV
    const populatedPV = await PaymentVoucher.findById(paymentVoucher._id)
      .populate('files.document')
      .populate('offer_id')
      .populate('confirmation_id');

    // Update Lead Status
    const populatedOffer = populatedPV.offer_id;
    if (populatedOffer && populatedOffer.lead_id) {
      try {
        await updateLeadStatusIfHigherPriority(
          populatedOffer.lead_id,
          'payment', // Using 'payment' as key for priority check
          Lead,
          updateLeadStageAndStatus
        );
      } catch (error) {
        logger.error(`Failed to update lead stage`, { error });
      }
    }

    // Create task in Kanban board
    try {
      const lead = await Lead.findById(offer.lead_id).select('contact_name display_name').lean();
      const leadName = lead?.contact_name || lead?.display_name || '';
      const offerTitle = populatedOffer?.title || `Offer ${targetOfferId}`;
      const taskTitle = leadName ? `Payment: ${leadName}` : `Payment: ${offerTitle}`;

      const taskData = {
        taskTitle: taskTitle,
        taskDescription: `Payment voucher created for offer: ${offerTitle}. Amount: ${amount}`,
        priority: 'medium',
        offer_id: targetOfferId.toString(),
        assigned: user._id ? [user._id.toString()] : undefined,
        createdBy: user._id ? user._id.toString() : undefined,
        status: 'todo',
      };

      const taskResult = await taskServiceClient.createTask(taskData);
      if (taskResult?.success) {
        logger.info('Task created in Kanban board for payment voucher', {
          payment_voucher_id: paymentVoucher._id,
          task_id: taskResult.data?._id,
        });
      }
    } catch (taskError) {
      logger.warn('Failed to create task for payment voucher (non-blocking)', { error: taskError.message });
    }

    // Log activity
    try {
      const lead = await Lead.findById(offer.lead_id).select('contact_name display_name').lean();
      const leadName = lead?.contact_name || lead?.display_name || '';
      const offerTitle = populatedOffer?.title || `Offer ${targetOfferId}`;
      
      await createActivity({
        _creator: user._id,
        _subject_id: paymentVoucher._id,
        subject_type: 'Payment Voucher',
        action: ACTIVITY_ACTIONS.CREATE,
        message: leadName 
          ? `Payment voucher created for "${leadName}" - ${offerTitle} (€${amount})`
          : `Payment voucher created for ${offerTitle} (€${amount})`,
        type: 'info',
        details: {
          action_type: 'payment_voucher_created',
          payment_voucher_id: paymentVoucher._id,
          offer_id: targetOfferId,
          confirmation_id: confirmation_id,
          amount: amount,
        },
      });
    } catch (activityError) {
      logger.warn('Failed to log payment voucher activity (non-blocking)', { error: activityError.message });
    }

    // Emit event for notifications
    eventEmitter.emit(EVENT_TYPES.PAYMENT_VOUCHER.CREATED, {
      paymentVoucher: populatedPV,
      creator: user,
      lead: await Lead.findById(offer.lead_id),
      confirmation: confirmation,
      offer: populatedOffer,
      createdDirectlyFromOffer: !!offer_id,
    });

    return flattenPaymentVoucherResponse(populatedPV);
  } catch (error) {
    if (error instanceof NotFoundError) throw error;
    throw new DatabaseError(`Error creating payment voucher: ${error.message}`);
  }
};

/**
 * Get all payment vouchers
 */
const getPaymentVouchers = async (options) => {
  // Placeholder for read logic
  return { data: [], meta: {} };
};

module.exports = {
  createPaymentVoucher,
  getPaymentVouchers,
};
