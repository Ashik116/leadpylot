/**
 * Opening Service
 * Handles operations related to openings and document management
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const logger = require('../helpers/logger');
const { Document, Opening, Offer, Lead, AssignLeads, Confirmation, PaymentVoucher } = require('../models');
const { updateLeadStageAndStatus, revertLeadStageAndStatusAfterDeletion } = require('../utils/leadServiceUtils');
const { updateLeadStatusIfHigherPriority } = require('./offerService/utils/statusPriority');
const { updateOfferProgression } = require('./offerService/operations/progression');
const { NotFoundError, DatabaseError } = require('../helpers/errorHandler');
const { eventEmitter, EVENT_TYPES } = require('./events');
const processFileGroup = require('../helpers/processFileGroup');
const DocumentUploadHelper = require('../helpers/documentUploadHelper');
const storageConfig = require('../config/storageConfig');
const commissionService = require('./commissionService');
const taskServiceClient = require('../services/taskServiceClient');
const { createActivity } = require('./activityService/utils');
const { ACTIVITY_ACTIONS } = require('../models/activity');

/**
 * Flatten opening response to have lead and offer at top level
 * @param {Object} opening - Populated opening object
 * @returns {Object} - Flattened response with lead, offer, and opening details
 */
const flattenOpeningResponse = (opening) => {
  if (!opening) return opening;

  const openingObj = opening.toObject ? opening.toObject() : opening;
  
  return {
    ...openingObj,
    lead: openingObj.offer_id?.lead_id || null,
    offer: openingObj.offer_id ? {
      ...openingObj.offer_id,
      lead_id: undefined // Remove the nested lead_id reference
    } : null,
    offer_id: undefined // Remove the nested offer_id reference
  };
};

/**
 * Create a new opening with associated documents
 * @param {Object} openingData - Data for the new opening
 * @param {Array} files - Uploaded files
 * @param {Object} user - Current user
 * @returns {Object} Created opening with document details
 */
const createOpening = async (openingData, files, user) => {
  try {
    // Extract opening_list_id if provided (optional list ID for task assignment)
    const { opening_list_id, ...restOpeningData } = openingData;
    
    // Validate offer exists and get bonus_amount details
    const offer = await Offer.findById(restOpeningData.offer_id)
      .populate('bonus_amount', 'name info');
    if (!offer) {
      throw new NotFoundError('Offer not found');
    }

    // Create opening record
    const opening = new Opening({
      offer_id: restOpeningData.offer_id,
      creator_id: user._id,
      contract_files: [],
      load_and_opening: restOpeningData.load_and_opening || undefined, // Add load_and_opening if provided
    });

    // Process and attach files using unified document service
    if (files && files.length > 0) {
      await DocumentUploadHelper.processAndAttachFiles(
        opening,
        files,
        DocumentUploadHelper.getDocumentTypes().OPENING,
        user._id
      );
    }

    // Save opening with document references
    await opening.save();

    // V2: Update Offer Model directly (consolidated approach)
    await updateOfferProgression(restOpeningData.offer_id, 'opening', {
      source_id: opening._id,
      files: opening.files
    }, user._id);

    // Auto-initialize financials for commission tracking
    try {
      // Get bonus amount from offer (could be a number or an object with info.amount)
      let bonusValue = 0;
      if (typeof offer.bonus_amount === 'number') {
        bonusValue = offer.bonus_amount;
      } else if (offer.bonus_amount?.info?.amount) {
        bonusValue = offer.bonus_amount.info.amount;
      }
      
      await commissionService.initializeFinancials(
        restOpeningData.offer_id,
        {
          investment_total: offer.investment_volume || 0,
          bonus_value: bonusValue,
        },
        user._id
      );
      
      logger.info('✅ Auto-initialized financials for opening', {
        offerId: restOpeningData.offer_id,
        openingId: opening._id,
        investment_total: offer.investment_volume,
        bonus_value: bonusValue,
      });
    } catch (financialsError) {
      // Don't fail opening creation if financials initialization fails
      logger.error('⚠️ Failed to auto-initialize financials for opening', {
        error: financialsError.message,
        offerId: restOpeningData.offer_id,
        openingId: opening._id,
      });
    }

    // Create corresponding task in Kanban board system (if opening was created successfully)
    if (opening._id) {
      try {
        // Get offer title or lead name for task title
        const offerTitle = offer.title || `Opening for Offer ${restOpeningData.offer_id}`;
        let leadName = '';
        
        // Try to get lead name from offer if populated
        if (offer.lead_id) {
          const lead = await Lead.findById(offer.lead_id).select('contact_name display_name').lean();
          leadName = lead?.contact_name || lead?.display_name || '';
        }
        
        const taskTitle = leadName ? `Opening: ${leadName}` : offerTitle;
        
        // Prepare task data for Kanban board
        // Task will be automatically assigned to OPENING board via task_type
        // Use offer._id as opening_id (since openings are stored in Offer table)
        const taskData = {
          taskTitle: taskTitle,
          taskDescription: `Opening created for offer: ${offerTitle}`,
          priority: 'medium', // Default priority
          opening_id: offer._id.toString(), // Use offer._id as opening_id (not opening._id)
          lead_id: offer.lead_id ? (offer.lead_id._id ? offer.lead_id._id.toString() : offer.lead_id.toString()) : undefined, // Set lead_id from offer (handle both populated and non-populated)
          task_type: 'opening', // Explicitly set task_type to 'opening'
          // Assign task to the user who created the opening
          assigned: user._id ? [user._id.toString()] : undefined,
          createdBy: user._id ? user._id.toString() : undefined,
          status: 'todo', // Default status
          // If opening_list_id is provided, use it; otherwise auto-find Todo list
          opening_list_id: opening_list_id || undefined,
        };

        const taskResult = await taskServiceClient.createTask(taskData);
        
        if (taskResult && taskResult.success) {
          logger.info('Task created in Kanban board for opening', {
            opening_id: opening._id,
            task_id: taskResult.data?._id,
            opening_list_id: opening_list_id || 'auto-assigned to Todo list',
          });

          // Log activity for task creation (subject_id should be lead_id, subject_type should be Opening)
          try {
            await createActivity({
              _creator: user._id,
              _subject_id: offer.lead_id, // always lead_id
              subject_type: 'Opening',
              action: ACTIVITY_ACTIONS.CREATE,
              message: `Task created for opening "${offerTitle}"`,
              type: 'info',
              is_task: true,
              details: {
                action_type: 'task_created',
                task_id: taskResult.data?._id,
                opening_id: opening._id,
                offer_id: restOpeningData.offer_id,
                lead_id: offer.lead_id,
                source: 'opening_created',
              },
            });
          } catch (activityError) {
            logger.warn('Failed to log task-created activity for opening (non-blocking)', {
              error: activityError.message,
              opening_id: opening._id,
              lead_id: offer.lead_id,
              task_id: taskResult.data?._id,
            });
          }
        } else {
          logger.warn('Task creation in Kanban board failed or was skipped for opening', {
            opening_id: opening._id,
            opening_list_id: opening_list_id || 'auto-assigned to Todo list',
          });
        }
      } catch (taskError) {
        // Log error but don't fail opening creation
        logger.error('Error creating task in Kanban board for opening (non-blocking)', {
          error: taskError.message,
          stack: taskError.stack,
          opening_id: opening._id,
        });
      }
    }

    // Get populated opening for response and event emission
    const populatedOpening = await Opening.findById(opening._id)
      .populate({
        path: 'files.document',
        select: 'filetype filename path size type createdAt',
      })
      .populate({
        path: 'offer_id',
        select: 'title lead_id investment_volume interest_rate profit_percentage status project_id agent_id payment_terms bonus_amount bank_id files createdAt updatedAt',
        populate: [
          {
            path: 'project_id',
            select: 'name'
          },
          {
            path: 'agent_id',
            select: 'login role name email'
          },
          {
            path: 'payment_terms',
            select: 'name info'
          },
          {
            path: 'bonus_amount',
            select: 'name info'
          },
          {
            path: 'bank_id',
            select: 'name account_number iban swift_code state is_allow is_default'
          },
          {
            path: 'lead_id',
            select: 'contact_name email_from phone status stage display_name assigned_agent createdAt updatedAt'
          }
        ]
      })
      .populate({
        path: 'creator_id',
        select: 'name email role',
      });

    // Get the lead data for the activity log if offer exists
    let lead = null;
    const populatedOffer = populatedOpening.offer_id;

    if (populatedOffer && populatedOffer.lead_id) {
      lead = await Lead.findById(populatedOffer.lead_id)
        .select('_id contact_name display_name email phone status stage assigned_agent')
        .lean();

      // Update the lead's stage to Opening and status to Contract (with priority check)
      try {
        const updated = await updateLeadStatusIfHigherPriority(
          populatedOffer.lead_id,
          'opening',
          Lead,
          updateLeadStageAndStatus
        );
        
        let updatedLead = null;
        if (updated) {
          updatedLead = await Lead.findById(populatedOffer.lead_id).lean();
        }
        logger.info(`Updated lead stage and status for new opening`, {
          leadId: populatedOffer.lead_id,
          openingId: opening._id,
          stage: 'Opening',
          status: 'Contract',
        });

        // Update the lead reference with the updated data
        if (updatedLead) {
          lead = updatedLead.toObject();
        }
      } catch (error) {
        logger.error(`Failed to update lead stage and status for new opening`, {
          error,
          leadId: populatedOffer.lead_id,
          openingId: opening._id,
        });
        // We don't throw here to avoid failing the opening creation if stage update fails
      }
    }

    // Log activity to main 'activities' collection
    try {
      const leadName = lead?.contact_name || lead?.display_name || '';
      const offerTitle = populatedOffer?.title || `Offer ${restOpeningData.offer_id}`;
      
      await createActivity({
        _creator: user._id,
        _subject_id: opening._id,
        subject_type: 'Opening',
        action: ACTIVITY_ACTIONS.CREATE,
        message: leadName 
          ? `Opening created for "${leadName}" - ${offerTitle}`
          : `Opening created for ${offerTitle}`,
        type: 'info',
        details: {
          action_type: 'opening_created',
          opening_id: opening._id,
          offer_id: restOpeningData.offer_id,
          lead_id: populatedOffer?.lead_id?._id || populatedOffer?.lead_id,
          lead_name: leadName,
          offer_title: offerTitle,
          creator_id: user._id,
          creator_name: user.login || user.name,
        },
      });
    } catch (activityError) {
      logger.warn('Failed to log opening activity (non-blocking)', {
        error: activityError.message,
        opening_id: opening._id,
      });
    }

    // Emit event for notifications
    eventEmitter.emit(EVENT_TYPES.OPENING.CREATED, {
      opening: populatedOpening,
      creator: user,
      lead,
      offer: populatedOffer,
    });

    return flattenOpeningResponse(populatedOpening);
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    throw new DatabaseError(`Error creating opening: ${error.message}`);
  }
};

/**
 * Get all openings with pagination and filtering
 * 
 * All query parameters work independently and can be combined:
 * - search: Searches across offer.title and lead.contact_name (case-insensitive)
 * - showInactive: Include/exclude inactive openings
 * - offer_id: Filter by specific offer ID
 * - agent_id: Filter by agent's assigned leads
 * - page/limit: Pagination controls
 * 
 * @param {Object} options - Query options including pagination and filters
 * @param {string} options.search - Search term (optional, searches across offer title, lead contact name)
 * @param {number} options.page - Page number (default: 1)
 * @param {number} options.limit - Items per page (default: 20)
 * @param {string} options.offer_id - Filter by specific offer ID
 * @param {string} options.agent_id - Filter by agent ID (shows openings for agent's assigned leads)
 * @param {boolean} options.showInactive - Include inactive openings (default: false)
 * @returns {Object} Paginated openings with metadata
 */
const getAllOpenings = async (options = {}) => {
  try {
    const { page = 1, limit = 20, offer_id, agent_id, showInactive = false, search } = options;

    // Calculate pagination
    const skip = (page - 1) * limit;

    logger.debug('Processing openings request', {
      search: search || 'none',
      offer_id: offer_id || 'none',
      agent_id: agent_id || 'none',
      showInactive,
    });

    // Build aggregation pipeline that handles all filters independently
    const pipeline = [];

    // Stage 1: Base matching filters
    const baseMatch = {};
    
    // Filter by active status
    if (!showInactive) {
      baseMatch.active = true;
    }
    
    // Filter by specific offer ID
    if (offer_id) {
      baseMatch.offer_id = new mongoose.Types.ObjectId(offer_id);
    }

    pipeline.push({ $match: baseMatch });

    // Stage 2: Lookup offer details (needed for search and agent filtering)
    pipeline.push({
      $lookup: {
        from: 'offers',
        localField: 'offer_id',
        foreignField: '_id',
        as: 'offer_details'
      }
    });

    pipeline.push({
      $unwind: {
        path: '$offer_details',
        preserveNullAndEmptyArrays: true
      }
    });

    // Stage 3: Lookup lead details (needed for search and agent filtering)
    pipeline.push({
      $lookup: {
        from: 'leads',
        localField: 'offer_details.lead_id',
        foreignField: '_id',
        as: 'lead_details'
      }
    });

    pipeline.push({
      $unwind: {
        path: '$lead_details',
        preserveNullAndEmptyArrays: true
      }
    });

    // Stage 4: Agent filtering (independent of other filters)
    if (agent_id) {
      // Get all lead assignments for this agent
      const assignments = await AssignLeads.find({
        agent_id: agent_id,
        status: 'active',
      }).select('lead_id');
      
      const assignedLeadIds = assignments.map(a => a.lead_id.toString());
      
      if (assignedLeadIds.length === 0) {
        // Agent has no assigned leads, return empty result
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

      // Filter by assigned leads
      pipeline.push({
        $match: {
          'lead_details._id': { $in: assignedLeadIds.map(id => new mongoose.Types.ObjectId(id)) }
        }
      });
    }

    // Stage 5: Search filtering (independent of other filters)
    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      pipeline.push({
        $match: {
          $or: [
            { 'offer_details.title': { $regex: searchRegex } },
            { 'lead_details.contact_name': { $regex: searchRegex } }
          ]
        }
      });
    }

    // Stage 6: Add sorting
    pipeline.push({ $sort: { createdAt: -1 } });

    // Stage 7: Get total count and paginated data
    pipeline.push({
      $facet: {
        data: [
          { $skip: skip },
          { $limit: parseInt(limit) },
          {
            $project: {
              _id: 1,
              offer_id: 1,
              creator_id: 1,
              files: 1,
              active: 1,
              createdAt: 1,
              updatedAt: 1
            }
          }
        ],
        totalCount: [{ $count: 'count' }]
      }
    });

    // Execute aggregation
    const [result] = await Opening.aggregate(pipeline);
    const openingIds = result.data || [];
    const total = result.totalCount.length > 0 ? result.totalCount[0].count : 0;

    // If no results found, return empty data
    if (openingIds.length === 0) {
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

    // Get full opening data with all populations for the found IDs
    // Preserve the original order from aggregation
    const orderedIds = openingIds.map(opening => opening._id);
    const openings = await Opening.find({
      _id: { $in: orderedIds }
    })
      .populate({
        path: 'files.document',
        select: 'filetype filename path size type createdAt',
      })
      .populate({
        path: 'offer_id',
        select: 'title lead_id investment_volume interest_rate profit_percentage status project_id agent_id payment_terms bonus_amount bank_id files createdAt updatedAt',
        populate: [
          {
            path: 'project_id',
            select: 'name'
          },
          {
            path: 'agent_id',
            select: 'login role name email'
          },
          {
            path: 'payment_terms',
            select: 'name info'
          },
          {
            path: 'bonus_amount',
            select: 'name info'
          },
          {
            path: 'bank_id',
            select: 'name'
          },
          {
            path: 'lead_id',
            select: 'contact_name lead_source_no stage createdAt updatedAt'
          },
          {
            path: 'files.document',
            select: 'filetype filename path size type createdAt'
          }
        ]
      })
      .populate({
        path: 'creator_id',
        select: 'name email role',
      });

    // Sort openings to match the order from aggregation
    const openingsMap = new Map(openings.map(opening => [opening._id.toString(), opening]));
    const sortedOpenings = orderedIds.map(id => openingsMap.get(id.toString())).filter(Boolean);

    return {
      data: sortedOpenings.map(opening => flattenOpeningResponse(opening)),
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    throw new DatabaseError(`Error fetching openings: ${error.message}`);
  }
};

/**
 * Get opening by ID
 * @param {string} id - Opening ID
 * @param {boolean} includeInactive - Whether to include inactive openings
 * @returns {Object} Opening with document details
 */
const getOpeningById = async (id, includeInactive = false) => {
  try {
    const query = { _id: id };

    if (!includeInactive) {
      query.active = true;
    }

    const opening = await Opening.findOne(query)
      .populate({
        path: 'files.document',
        select: 'filetype filename path size type createdAt',
      })
      .populate({
        path: 'offer_id',
        select: 'title lead_id investment_volume interest_rate profit_percentage status project_id agent_id payment_terms bonus_amount bank_id files createdAt updatedAt',
        populate: [
          {
            path: 'project_id',
            select: 'name'
          },
          {
            path: 'agent_id',
            select: 'login role name email'
          },
          {
            path: 'payment_terms',
            select: 'name info'
          },
          {
            path: 'bonus_amount',
            select: 'name info'
          },
          {
            path: 'bank_id',
            select: 'name account_number iban swift_code state is_allow is_default'
          },
          {
            path: 'lead_id',
            select: 'contact_name email_from phone status stage display_name assigned_agent createdAt updatedAt'
          },
          {
            path: 'files.document',
            select: 'filetype filename path size type createdAt'
          }
        ]
      })
      .populate({
        path: 'creator_id',
        select: 'name email role',
      });

    if (!opening) {
      throw new NotFoundError('Opening not found');
    }

    return flattenOpeningResponse(opening);
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    throw new DatabaseError(`Error fetching opening: ${error.message}`);
  }
};

/**
 * Update opening
 * @param {string} id - Opening ID
 * @param {Object} updateData - Data to update
 * @param {Array} files - Optional files to upload
 * @param {Object} user - User performing the update
 * @returns {Object} Updated opening
 */
const updateOpening = async (id, updateData, files = [], user) => {
  try {
    const opening = await Opening.findById(id);
    if (!opening) {
      throw new NotFoundError('Opening not found');
    }

    // Update fields
    if (updateData.offer_id) {
      // Validate offer exists
      const offer = await Offer.findById(updateData.offer_id);
      if (!offer) {
        throw new NotFoundError('Offer not found');
      }
      opening.offer_id = updateData.offer_id;
    }

    // Process and attach files using unified document service
    if (files && files.length > 0) {
      await DocumentUploadHelper.addFilesToEntity(
        opening,
        files,
        DocumentUploadHelper.getDocumentTypes().OPENING,
        user._id
      );
    }

    // Store original opening data for comparison
    const originalOpening = opening.toObject();

    // Save changes
    await opening.save();

    // Get updated opening for response and event emission
    const updatedOpening = await Opening.findById(id)
      .populate({
        path: 'files.document',
        select: 'filetype filename path size type createdAt',
      })
      .populate({
        path: 'offer_id',
        select: 'title lead_id investment_volume interest_rate profit_percentage status project_id agent_id payment_terms bonus_amount bank_id files createdAt updatedAt',
        populate: [
          {
            path: 'project_id',
            select: 'name'
          },
          {
            path: 'agent_id',
            select: 'login role name email'
          },
          {
            path: 'payment_terms',
            select: 'name info'
          },
          {
            path: 'bonus_amount',
            select: 'name info'
          },
          {
            path: 'bank_id',
            select: 'name account_number iban swift_code state is_allow is_default'
          },
          {
            path: 'lead_id',
            select: 'contact_name email_from phone status stage display_name assigned_agent createdAt updatedAt'
          }
        ]
      })
      .populate({
        path: 'creator_id',
        select: 'name email role',
      });

    // Get the offer data for the activity log
    const offer = await Offer.findById(updatedOpening.offer_id._id).lean();

    // Get the lead data for the activity log
    const lead = await Lead.findById(offer.lead_id).lean();

    // Emit event for activity logging
    eventEmitter.emit(EVENT_TYPES.OPENING.UPDATED, {
      opening: updatedOpening,
      creator: user || { _id: 'system' },
      changes: updateData,
    });

    return flattenOpeningResponse(updatedOpening);
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    throw new DatabaseError(`Error updating opening: ${error.message}`);
  }
};

/**
 * Add documents to existing opening
 * @param {string} id - Opening ID
 * @param {Array} files - Files to upload
 * @param {Object} user - User performing the action
 * @returns {Object} Updated opening with new documents
 */
const addDocumentsToOpening = async (id, files, user) => {
  try {
    // Find the opening
    const opening = await Opening.findById(id);
    if (!opening) {
      throw new NotFoundError('Opening not found');
    }

    // Process and attach files using unified document service
    if (files && files.length > 0) {
      await DocumentUploadHelper.addFilesToEntity(
        opening,
        files,
        DocumentUploadHelper.getDocumentTypes().OPENING,
        user._id
      );
    }
    
    // Return populated opening
    const populatedOpening = await Opening.findById(id)
      .populate({
        path: 'files.document',
        select: 'filetype filename path size type createdAt',
      })
      .populate({
        path: 'offer_id',
        select: 'title lead_id investment_volume interest_rate profit_percentage status project_id agent_id payment_terms bonus_amount bank_id files createdAt updatedAt',
        populate: [
          {
            path: 'project_id',
            select: 'name'
          },
          {
            path: 'agent_id',
            select: 'login role name email'
          },
          {
            path: 'payment_terms',
            select: 'name info'
          },
          {
            path: 'bonus_amount',
            select: 'name info'
          },
          {
            path: 'bank_id',
            select: 'name account_number iban swift_code state is_allow is_default'
          },
          {
            path: 'lead_id',
            select: 'contact_name email_from phone status stage display_name assigned_agent createdAt updatedAt'
          }
        ]
      })
      .populate({
        path: 'creator_id',
        select: 'name email role',
      });

    // Emit event for activity logging
    eventEmitter.emit(EVENT_TYPES.OPENING.UPDATED, {
      opening: populatedOpening,
      creator: user,
      changes: { documents_added: files.length },
    });

    return flattenOpeningResponse(populatedOpening);
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    throw new DatabaseError(`Error adding documents to opening: ${error.message}`);
  }
};

/**
 * Soft delete opening with cascading delete of confirmations and payment vouchers
 * @param {string} id - Opening ID
 * @returns {Object} Result message with cascading delete details
 */
const deleteOpening = async (id) => {
  try {
    const opening = await Opening.findById(id);
    if (!opening) {
      throw new NotFoundError('Opening not found');
    }

    // Store opening data before deletion for activity logging
    const openingData = opening.toObject();

    // Get the lead ID for stage/status reversion
    let leadId = null;
    const offer = await Offer.findById(opening.offer_id).lean();
    if (offer) {
      leadId = offer.lead_id;
    }

    // Find all related confirmations to delete them as well
    const relatedConfirmations = await Confirmation.find({
      opening_id: id,
      active: true,
    });

    // Find all related payment vouchers through confirmations
    const confirmationIds = relatedConfirmations.map(c => c._id);
    const relatedPaymentVouchers = await PaymentVoucher.find({
      confirmation_id: { $in: confirmationIds },
      active: true,
    });

    const cascadeResults = {
      confirmations: {
        found: relatedConfirmations.length,
        deleted: 0,
        failed: 0,
      },
      paymentVouchers: {
        found: relatedPaymentVouchers.length,
        deleted: 0,
        failed: 0,
      },
    };

    // Soft delete all related payment vouchers first
    for (const paymentVoucher of relatedPaymentVouchers) {
      try {
        paymentVoucher.active = false;
        await paymentVoucher.save();
        cascadeResults.paymentVouchers.deleted++;

        // Emit event for payment voucher deletion activity logging
        eventEmitter.emit(EVENT_TYPES.PAYMENT_VOUCHER.DELETED, {
          paymentVoucher: paymentVoucher.toObject(),
          creator: { _id: 'system' },
          cascadeDelete: true,
          parentOpening: openingData,
        });

        logger.info('Payment voucher deleted due to opening cascading delete', {
          paymentVoucherId: paymentVoucher._id,
          openingId: id,
        });
      } catch (error) {
        cascadeResults.paymentVouchers.failed++;
        logger.error('Failed to delete payment voucher during opening cascade', {
          paymentVoucherId: paymentVoucher._id,
          openingId: id,
          error: error.message,
        });
      }
    }

    // Soft delete all related confirmations
    for (const confirmation of relatedConfirmations) {
      try {
        confirmation.active = false;
        await confirmation.save();
        cascadeResults.confirmations.deleted++;

        // Emit event for confirmation deletion activity logging
        eventEmitter.emit(EVENT_TYPES.CONFIRMATION.DELETED, {
          confirmation: confirmation.toObject(),
          creator: { _id: 'system' },
          cascadeDelete: true,
          parentOpening: openingData,
        });

        logger.info('Confirmation deleted due to opening cascading delete', {
          confirmationId: confirmation._id,
          openingId: id,
        });
      } catch (error) {
        cascadeResults.confirmations.failed++;
        logger.error('Failed to delete confirmation during opening cascade', {
          confirmationId: confirmation._id,
          openingId: id,
          error: error.message,
        });
      }
    }

    // Soft delete the opening
    opening.active = false;
    await opening.save();

    // Revert lead stage/status based on remaining active items
    if (leadId) {
      try {
        await revertLeadStageAndStatusAfterDeletion(leadId, 'opening', id);
      } catch (error) {
        logger.error('Failed to revert lead stage/status after opening deletion', {
          error,
          leadId,
          openingId: id,
        });
        // Don't throw here to avoid failing the deletion if stage update fails
      }
    } else {
      logger.warn('Could not determine lead ID for opening deletion stage reversion', {
        openingId: id,
      });
    }

    // Get the lead data for the activity log
    const lead = leadId ? await Lead.findById(leadId).lean() : null;

    // Emit event for activity logging
    eventEmitter.emit(EVENT_TYPES.OPENING.DELETED, {
      opening: openingData,
      creator: { _id: 'system' },
      lead,
      offer,
      cascadeResults,
    });

    // Build response message
    let message = 'Opening deactivated successfully';
    if (cascadeResults.confirmations.found > 0) {
      message += `. Also deleted ${cascadeResults.confirmations.deleted} related confirmations`;
      if (cascadeResults.confirmations.failed > 0) {
        message += ` (${cascadeResults.confirmations.failed} failed)`;
      }
    }
    if (cascadeResults.paymentVouchers.found > 0) {
      message += ` and ${cascadeResults.paymentVouchers.deleted} related payment vouchers`;
      if (cascadeResults.paymentVouchers.failed > 0) {
        message += ` (${cascadeResults.paymentVouchers.failed} failed)`;
      }
    }

    return {
      message,
      opening: {
        _id: opening._id,
        active: opening.active,
      },
      cascadeResults,
    };
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    throw new DatabaseError(`Error deleting opening: ${error.message}`);
  }
};

/**
 * Bulk soft delete openings with cascading delete of confirmations and payment vouchers
 * @param {Array} ids - Array of opening IDs
 * @param {Object} user - User performing the deletion
 * @returns {Object} Result with success and failure counts and cascading delete details
 */
const bulkDeleteOpenings = async (ids, user) => {
  try {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new Error('IDs must be a non-empty array');
    }

    // Validate all IDs are valid MongoDB ObjectIds
    const validIds = ids.filter(id => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length !== ids.length) {
      throw new Error('All IDs must be valid MongoDB ObjectIds');
    }

    const results = {
      successful: [],
      failed: [],
      totalProcessed: 0,
      successCount: 0,
      failureCount: 0,
      cascadeResults: {
        confirmations: {
          found: 0,
          deleted: 0,
          failed: 0,
        },
        paymentVouchers: {
          found: 0,
          deleted: 0,
          failed: 0,
        },
      },
    };

    // Find all openings that exist and are active
    const openings = await Opening.find({
      _id: { $in: validIds },
      active: true,
    });

    // Track which openings were found
    const foundIds = openings.map(opening => opening._id.toString());
    const notFoundIds = validIds.filter(id => !foundIds.includes(id));

    // Add not found IDs to failed results
    notFoundIds.forEach(id => {
      results.failed.push({
        id,
        error: 'Opening not found or already inactive',
      });
    });

    // Process each found opening
    for (const opening of openings) {
      try {

        // find the offer
        const offer = await Offer.findById(opening.offer_id);
        if (!offer) {
          throw new NotFoundError('Offer not found');
        }

        // Store opening data before deletion for activity logging
        const openingData = opening.toObject();

        // get the lead
        const lead = await Lead.findById(offer.lead_id);
        if (!lead) {
          throw new NotFoundError('Lead not found');
        }

        // Find and delete related confirmations and payment vouchers
        const relatedConfirmations = await Confirmation.find({
          opening_id: opening._id,
          active: true,
        });

        // Find all related payment vouchers through confirmations
        const confirmationIds = relatedConfirmations.map(c => c._id);
        const relatedPaymentVouchers = await PaymentVoucher.find({
          confirmation_id: { $in: confirmationIds },
          active: true,
        });

        results.cascadeResults.confirmations.found += relatedConfirmations.length;
        results.cascadeResults.paymentVouchers.found += relatedPaymentVouchers.length;

        // Soft delete all related payment vouchers first
        for (const paymentVoucher of relatedPaymentVouchers) {
          try {
            paymentVoucher.active = false;
            await paymentVoucher.save();
            results.cascadeResults.paymentVouchers.deleted++;

            // Emit event for payment voucher deletion activity logging
            eventEmitter.emit(EVENT_TYPES.PAYMENT_VOUCHER.DELETED, {
              paymentVoucher: paymentVoucher.toObject(),
              creator: user,
              cascadeDelete: true,
              parentOpening: openingData,
            });
          } catch (error) {
            results.cascadeResults.paymentVouchers.failed++;
            logger.error('Failed to delete payment voucher during opening bulk cascade', {
              paymentVoucherId: paymentVoucher._id,
              openingId: opening._id,
              error: error.message,
            });
          }
        }

        // Soft delete all related confirmations
        for (const confirmation of relatedConfirmations) {
          try {
            confirmation.active = false;
            await confirmation.save();
            results.cascadeResults.confirmations.deleted++;

            // Emit event for confirmation deletion activity logging
            eventEmitter.emit(EVENT_TYPES.CONFIRMATION.DELETED, {
              confirmation: confirmation.toObject(),
              creator: user,
              cascadeDelete: true,
              parentOpening: openingData,
            });
          } catch (error) {
            results.cascadeResults.confirmations.failed++;
            logger.error('Failed to delete confirmation during opening bulk cascade', {
              confirmationId: confirmation._id,
              openingId: opening._id,
              error: error.message,
            });
          }
        }

        // Soft delete the opening
        opening.active = false;
        await opening.save();

        // Revert lead stage/status based on remaining active items
        if (lead) {
          try {
            await revertLeadStageAndStatusAfterDeletion(lead._id, 'opening', opening._id);
          } catch (error) {
            logger.error('Failed to revert lead stage/status after bulk opening deletion', {
              error,
              leadId: lead._id,
              openingId: opening._id,
            });
            // Don't throw here to avoid failing the deletion if stage update fails
          }
        }

        results.successful.push({
          _id: opening._id,
          active: opening.active,
        });

        logger.info('Opening bulk deleted successfully with cascading deletes', {
          openingId: opening._id,
          offerId: opening.offer_id,
          confirmationsDeleted: relatedConfirmations.length,
          paymentVouchersDeleted: relatedPaymentVouchers.length,
        });
      } catch (error) {
        results.failed.push({
          id: opening._id.toString(),
          error: error.message,
        });

        logger.error('Failed to delete opening in bulk operation', {
          openingId: opening._id,
          error: error.message,
        });
      }
    }

    // Update counters
    results.totalProcessed = validIds.length;
    results.successCount = results.successful.length;
    results.failureCount = results.failed.length;

    // Emit bulk delete event for activity logging
    if (results.successCount > 0) {
      eventEmitter.emit(EVENT_TYPES.OPENING.BULK_DELETED, {
        openingIds: validIds,
        successCount: results.successCount,
        failureCount: results.failureCount,
        cascadeResults: results.cascadeResults,
        user,
      });
    }

    // Build response message
    let message = `Bulk delete completed. ${results.successCount} openings deactivated, ${results.failureCount} failed.`;
    if (results.cascadeResults.confirmations.found > 0) {
      message += ` Also deleted ${results.cascadeResults.confirmations.deleted} related confirmations`;
      if (results.cascadeResults.confirmations.failed > 0) {
        message += ` (${results.cascadeResults.confirmations.failed} confirmations failed)`;
      }
    }
    if (results.cascadeResults.paymentVouchers.found > 0) {
      message += ` and ${results.cascadeResults.paymentVouchers.deleted} related payment vouchers`;
      if (results.cascadeResults.paymentVouchers.failed > 0) {
        message += ` (${results.cascadeResults.paymentVouchers.failed} payment vouchers failed)`;
      }
    }

    return {
      message,
      results,
    };
  } catch (error) {
    throw new DatabaseError(`Error in bulk delete openings: ${error.message}`);
  }
};

/**
 * Restore a previously soft-deleted opening
 * @param {string} id - Opening ID
 * @returns {Object} Result message
 */
const restoreOpening = async (id) => {
  try {
    const opening = await Opening.findById(id);
    if (!opening) {
      throw new NotFoundError('Opening not found');
    }

    // Restore by setting active=true
    opening.active = true;
    await opening.save();

    return {
      message: 'Opening restored successfully',
      opening: {
        _id: opening._id,
        active: opening.active,
      },
    };
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    throw new DatabaseError(`Error restoring opening: ${error.message}`);
  }
};

/**
 * Get document by ID from an opening
 * @param {string} documentId - Document ID
 * @returns {Object} Document details and file path
 */
async function getDocumentById(documentId) {
  try {
    if (!mongoose.Types.ObjectId.isValid(documentId)) {
      throw new Error('Invalid document ID');
    }

    // Find the document
    const document = await Document.findById(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    // Find the opening that contains this document to verify it exists
    const opening = await Opening.findOne({
      'files.document': documentId,
      active: true,
    });

    if (!opening) {
      throw new Error('Document not found in any active opening');
    }

    // Construct the file path using storageConfig
    // Get the relative path by removing any leading slash
    const relativePath = document.path.replace(/^\//, '');
    const filePath = storageConfig.getFilePath(relativePath);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      logger.error('File not found on server', { path: document.path, fullPath: filePath });
      throw new Error('File not found on server');
    }

    return {
      document,
      filePath,
      opening,
    };
  } catch (error) {
    logger.error('Error fetching document', { error: error.message, documentId });
    throw error;
  }
}

/**
 * Remove a document from an opening
 * @param {string} openingId - Opening ID
 * @param {string} documentId - Document ID to remove
 * @param {Object} user - User performing the action
 * @returns {Object} Updated opening
 */
const removeDocumentFromOpening = async (openingId, documentId, user) => {
  const opening = await Opening.findById(openingId);
  if (!opening) {
    throw new NotFoundError('Opening');
  }

  // Remove document using unified document service
  await DocumentUploadHelper.removeFilesFromEntity(opening, [documentId]);

  // Get populated opening
  const updatedOpening = await getOpeningById(openingId, true); // Use existing get function with includeInactive

  // Emit event
  eventEmitter.emit(EVENT_TYPES.OPENING.UPDATED, {
    opening: updatedOpening,
    creator: user,
    changes: { document_removed: documentId },
  });

  return flattenOpeningResponse(updatedOpening);
};

module.exports = {
  createOpening,
  getAllOpenings,
  getOpeningById,
  updateOpening,
  addDocumentsToOpening,
  deleteOpening,
  bulkDeleteOpenings,
  restoreOpening,
  getDocumentById,
  removeDocumentFromOpening, // Add this
};
