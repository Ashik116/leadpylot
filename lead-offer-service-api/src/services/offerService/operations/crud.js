/**
 * Offer Service CRUD Operations
 * Contains core CRUD operations for offers
 */

const {
  Offer,
  Lead,
  Team,
  Bank,
  Document,
  Opening,
  Confirmation,
  PaymentVoucher,
  AssignLeads,
  Settings,
  NotFoundError,
  AuthorizationError,
  DatabaseError,
  logger,
  DocumentUploadHelper,
  processFileGroup,
  eventEmitter,
  EVENT_TYPES,
  updateLeadStageAndStatus,
} = require('../config/dependencies');

const { ValidationError } = require('../../../utils/errorHandler');
const taskServiceClient = require('../../../services/taskServiceClient');

const { validateObjectId } = require('../utils/validators');
const PermissionManager = require('../permissions/PermissionManager');
const DocumentManager = require('../documents/DocumentManager');
const { formatRevenue } = require('../../leadService/transforms');
const { applyLeadMasking } = require('../../leadService/queries');
const { User } = require('../../../models');
const mongoose = require('mongoose');
const commissionService = require('../../commissionService');

/**
 * Compare two values to determine if they've actually changed
 * Handles ObjectIds, Dates, primitives, null/undefined
 * @param {*} oldValue - Original value
 * @param {*} newValue - New value
 * @returns {boolean} - True if values are different
 */
const hasValueChanged = (oldValue, newValue) => {
  // Handle null/undefined cases
  if (oldValue === null || oldValue === undefined) {
    return newValue !== null && newValue !== undefined;
  }
  if (newValue === null || newValue === undefined) {
    return oldValue !== null && oldValue !== undefined;
  }

  // Handle ObjectIds (MongoDB ObjectId instances or strings)
  if (mongoose.Types.ObjectId.isValid(oldValue) || mongoose.Types.ObjectId.isValid(newValue)) {
    const oldId = oldValue instanceof mongoose.Types.ObjectId 
      ? oldValue.toString() 
      : (oldValue ? String(oldValue) : null);
    const newId = newValue instanceof mongoose.Types.ObjectId 
      ? newValue.toString() 
      : (newValue ? String(newValue) : null);
    return oldId !== newId;
  }

  // Handle Dates
  if (oldValue instanceof Date || newValue instanceof Date) {
    const oldDate = oldValue instanceof Date ? oldValue.getTime() : (oldValue ? new Date(oldValue).getTime() : null);
    const newDate = newValue instanceof Date ? newValue.getTime() : (newValue ? new Date(newValue).getTime() : null);
    if (isNaN(oldDate) || isNaN(newDate)) {
      // If either is invalid date, do string comparison
      return String(oldValue) !== String(newValue);
    }
    return oldDate !== newDate;
  }

  // Handle numbers (including string numbers)
  if (typeof oldValue === 'number' || typeof newValue === 'number') {
    const oldNum = typeof oldValue === 'string' ? parseFloat(oldValue) : oldValue;
    const newNum = typeof newValue === 'string' ? parseFloat(newValue) : newValue;
    if (!isNaN(oldNum) && !isNaN(newNum)) {
      return oldNum !== newNum;
    }
  }

  // Handle booleans
  if (typeof oldValue === 'boolean' || typeof newValue === 'boolean') {
    return Boolean(oldValue) !== Boolean(newValue);
  }

  // For strings and other primitives, direct comparison
  return oldValue !== newValue;
};

/**
 * Apply formatRevenue to investment_volume field in offer data
 * @param {Object} offer - Single offer object
 * @returns {Object} - Formatted offer with investment_volume formatted
 */
const formatOfferInvestmentVolume = (offer) => {
  if (!offer) return offer;

  return {
    ...offer,
    investment_volume: formatRevenue(offer.investment_volume),
    // Set default value for load_and_opening if not present or null
    load_and_opening: offer.load_and_opening ?? 'opening',
  };
};

/**
 * Get offer by ID with PDF information - Optimized
 */
const getOfferById = async (offerId, user, hasPermissionFn, permissions, options = {}) => {
  try {
    if (!validateObjectId(offerId)) {
      throw new NotFoundError('Invalid offer ID format');
    }

    const offer = await DocumentManager.populateOfferQuery(
      Offer.findOne({ _id: offerId, active: true })
    ).lean();

    if (!offer) {
      throw new NotFoundError('Offer not found or has been deleted');
    }

    // Check permissions
    await PermissionManager.getPermissionFilter(user, hasPermissionFn, permissions, offer);

    // Add assigned documents to the offer
    await DocumentManager.populateOfferDocuments(offer);

    // Apply lead masking to lead_id object (isDetailApi = true for detail API)
    let offerWithMaskedLead = offer;
    if (offer.lead_id) {
      const maskedLead = applyLeadMasking(offer.lead_id, user, true);
      
      // Transform lead_id: rename team_id to project_id and add assigned_agent
      const transformedLead = { ...maskedLead };
      
      // Rename team_id to project_id
      if (transformedLead.team_id) {
        transformedLead.project_id = transformedLead.team_id;
        delete transformedLead.team_id;
      }
      
      // Add assigned_agent from user_id
      if (transformedLead.user_id) {
        transformedLead.assigned_agent = transformedLead.user_id;
        // Keep user_id as well for backward compatibility, or remove it if not needed
      }
      
      // Ensure createdAt and updatedAt are included
      if (offer.lead_id.createdAt) {
        transformedLead.createdAt = offer.lead_id.createdAt;
      }
      if (offer.lead_id.updatedAt) {
        transformedLead.updatedAt = offer.lead_id.updatedAt;
      }
      
      offerWithMaskedLead = {
        ...offer,
        lead_id: transformedLead
      };
    }

    // Include role-based financials data in response
    if (offer.financials?.financials_initialized) {
      const isAdmin = user?.role === 'Admin';
      const userId = user?._id?.toString();
      const agentId = offer.agent_id?._id?.toString() || offer.agent_id?.toString();
      
      if (isAdmin) {
        // Admin sees full financials (already in offer object)
        // No changes needed
      } else {
        // Agent sees only their commission data
        const financials = offer.financials;
        const isPrimaryAgent = userId === agentId;
        
        const splitEntry = financials.split_agents?.find(
          a => a.agent_id?.toString() === userId
        );
        const inboundEntry = financials.inbound_agents?.find(
          a => a.agent_id?.toString() === userId
        );
        
        // Build filtered financials for agent
        let myCommission = null;
        if (isPrimaryAgent && financials.primary_agent_commission) {
          myCommission = {
            type: 'primary',
            percentage: financials.primary_agent_commission.percentage || 0,
            expected_amount: financials.primary_agent_commission.expected_amount || 0,
            actual_amount: financials.primary_agent_commission.actual_amount || 0,
            paid_amount: financials.primary_agent_commission.paid_amount || 0,
          };
        } else if (splitEntry) {
          myCommission = {
            type: 'split',
            percentage: splitEntry.percentage || 0,
            expected_amount: splitEntry.expected_amount || 0,
            actual_amount: splitEntry.actual_amount || 0,
            paid_amount: splitEntry.paid_amount || 0,
          };
        } else if (inboundEntry) {
          myCommission = {
            type: 'inbound',
            percentage: inboundEntry.percentage || 0,
            expected_amount: inboundEntry.expected_amount || 0,
            actual_amount: inboundEntry.actual_amount || 0,
            paid_amount: inboundEntry.paid_amount || 0,
          };
        }
        
        // Replace financials with agent-filtered version
        offerWithMaskedLead.financials = {
          financials_initialized: financials.financials_initialized,
          expected_from_customer: financials.expected_from_customer || 0,
          total_customer_received: financials.payment_summary?.total_received || 0,
          payment_status: financials.payment_summary?.payment_status || 'pending',
          my_commission: myCommission,
        };
      }
    }

    // PDF generation removed - use manual /pdf/generate-offer endpoint
    // No automatic PDF generation when getting offer by ID

    // Fetch other offers for the same lead (excluding current offer)
    // If current_stage is in ['opening', 'confirmation', 'payment', 'netto1', 'netto2']: 
    //   return ALL other offers for the lead with key name 'offers'
    // Otherwise: only include offers with current_stage in: offer, call_1, call_2, call_3, call_4 with key name 'other_offers'
    const resultOffer = formatOfferInvestmentVolume(offerWithMaskedLead);
    const specialStages = ['opening', 'confirmation', 'payment', 'netto1', 'netto2'];
    const isSpecialStage = specialStages.includes(offer.current_stage);
    
    let offersArray = [];
    if (offer.lead_id && offer.lead_id._id) {
      try {
        // Build query condition
        const queryCondition = {
          lead_id: offer.lead_id._id,
          _id: { $ne: offerId },
          active: true,
        };

        // If current_stage is NOT in special stages, filter by allowed stages
        if (!isSpecialStage) {
          const allowedStages = ['offer', 'call_1', 'call_2', 'call_3', 'call_4'];
          queryCondition.current_stage = { $in: allowedStages };
        }
        // If current_stage IS in special stages, no stage filter - return all offers

        offersArray = await Offer.find(queryCondition)
          .populate('project_id', '_id name')
          .populate('agent_id', '_id login role')
          .populate('bank_id', '_id name is_default is_allow state')
          .populate('payment_terms', '_id name info')
          .populate('bonus_amount', '_id name info')
          .sort({ createdAt: -1 })
          .lean();

        logger.info('Fetched offers for lead', {
          leadId: offer.lead_id._id,
          currentOfferId: offerId,
          currentStage: offer.current_stage,
          offersCount: offersArray.length,
          filterType: isSpecialStage ? 'all_offers' : 'filtered_by_stages',
          keyName: isSpecialStage ? 'offers' : 'other_offers',
        });
      } catch (offersError) {
        logger.warn('Failed to fetch offers for lead (non-blocking)', {
          error: offersError.message,
          leadId: offer.lead_id._id,
          currentOfferId: offerId,
        });
        // Don't fail the main request if offers fetch fails
      }
    }

    // Add offers to the response with appropriate key name
    if (isSpecialStage) {
      resultOffer.offers = offersArray;
    } else {
      resultOffer.other_offers = offersArray;
    }

    return resultOffer;
  } catch (error) {
    logger.error('Error in getOfferById:', error);
    throw error;
  }
};

/**
 * Create offer - Optimized with better error handling
 */
const createOffer = async (offerData, files, user, hasPermissionFn, permissions, options = {}, token) => {
    try {
        // Verify permissions
        if (!await hasPermissionFn(user.role, permissions.OFFER_CREATE)) {
          throw new AuthorizationError("You don't have permission to create offers");
        }
    
        // ✅ Extract scheduling and handover fields
        const {
          scheduled_date,
          scheduled_time,
          selected_agent_id,
          agent_id, // Extract agent_id from payload (user sends this for agent transfer)
          notes,
          offer_list_id, // Optional list_id for task assignment
          ...restOfferData
        } = offerData;
    
        // Validate required fields
        if (!restOfferData.project_id || !validateObjectId(restOfferData.project_id)) {
          throw new DatabaseError('Valid project_id is required');
        }
        if (!restOfferData.lead_id || !validateObjectId(restOfferData.lead_id)) {
          throw new DatabaseError('Valid lead_id is required');
        }
    
        // agent_id will be determined by agent_id (from payload), selected_agent_id, or current user
        // Map agent_id to selected_agent_id if provided (for agent transfer)
        const providedAgentId = agent_id || selected_agent_id || user._id.toString();
        if (!validateObjectId(providedAgentId)) {
          throw new DatabaseError('Valid agent_id is required');
        }
        restOfferData.agent_id = providedAgentId;
    
        // Parallel fetch of related data
        const [project, lead, bankDetails] = await Promise.all([
          Team.findById(restOfferData.project_id).lean(),
          Lead.findById(restOfferData.lead_id).lean(),
          restOfferData.bank_id && validateObjectId(restOfferData.bank_id)
            ? Bank.findById(restOfferData.bank_id).select('name').lean()
            : Promise.resolve(null),
        ]);
    
        if (!project) {
          throw new NotFoundError('Project not found');
        }
        if (!lead) {
          throw new NotFoundError('Lead not found');
        }
        if (restOfferData.bank_id && !bankDetails) {
          throw new NotFoundError('Bank not found');
        }
    
        // ✅ Calculate scheduled date/time - return null if not provided
        const calculateScheduledDateTime = () => {
          // Handle scheduled_date: convert to Date if provided, otherwise null
          const finalScheduledDate = scheduled_date && scheduled_date.toString().trim() 
            ? new Date(scheduled_date) 
            : null;
          
          // Handle scheduled_time: trim if string, otherwise null
          const finalScheduledTime = scheduled_time && scheduled_time.toString().trim() 
            ? scheduled_time.toString().trim() 
            : null;
          
          return {
            date: finalScheduledDate,
            time: finalScheduledTime,
          };
        };
    
        const { date: finalScheduledDate, time: finalScheduledTime } = calculateScheduledDateTime();
    
        // ✅ Determine if this is a handover (agent selects someone else)
        // Assign selected_agent_id to finalAgentId (prefer selected_agent_id over agent_id)
        const finalAgentId = selected_agent_id || agent_id || user._id.toString();
        const transferAgentId = selected_agent_id || agent_id;
        const isHandover = transferAgentId && transferAgentId !== user._id.toString();
        logger.info('🔍 OFFER CREATION DEBUG: Is handover', {
          isHandover,
          finalAgentId,
          agent_id_from_payload: agent_id,
          selected_agent_id,
          transferAgentId,
          user_id: user._id,
          user_role: user.role,
        });
    
        // Check agent assignment to project
        const agentInProject = project.agents?.find(
          (agent) =>
            agent.active &&
            ((agent.user && agent.user.toString() === finalAgentId.toString()) ||
              (agent.user_id && agent.user_id.toString() === finalAgentId.toString()))
        );
    
        if (!agentInProject) {
          throw new AuthorizationError('The agent must be assigned to the project to create an offer');
        }
    
    // Generate title
    const title = `${lead.contact_name} - ${restOfferData.investment_volume} - ${bankDetails ? bankDetails.name : ''}`;

    // ✅ Build offer data with creator and scheduling
    // created_by should be set to agent_id (not admin's ID) when admins create offers
    const offerDataWithMetadata = {
      ...restOfferData,
      title,
      created_by: finalAgentId,  // Set to agent_id (not user._id) so admins creating offers use agent_id
      agent_id: finalAgentId,  // IMMEDIATELY assign to selected agent (or current user if none selected)
      ...(finalScheduledDate && { scheduled_date: finalScheduledDate }),
      ...(finalScheduledTime && { scheduled_time: finalScheduledTime }),
      handover_notes: notes || null,
    };

    // ✅ If handover is requested, log it for tracking purposes
    if (isHandover) {
      logger.info(`Offer created and transferred to selected agent`, {
        created_by: user._id,
        assigned_to: finalAgentId,
        leadId: restOfferData.lead_id,
        user_role: user.role,
      });
    }

    // Create offer
    const newOffer = new Offer(offerDataWithMetadata);

    // Process files if provided
    if (files && files.length > 0) {
      await DocumentUploadHelper.processAndAttachFiles(
        newOffer,
        files,
        DocumentUploadHelper.getDocumentTypes().OFFER,
        user._id
      );
    }

    await newOffer.save();

    // Update lead nametitle if provided
    if (offerDataWithMetadata.nametitle) {
      await Lead.findByIdAndUpdate(
        offerDataWithMetadata.lead_id,
        { nametitle: offerDataWithMetadata.nametitle },
        { new: true }
      ).lean();
    }

    // ✅ Transfer lead to match offer's agent_id (finalAgentId)
    // finalAgentId prioritizes selected_agent_id > agent_id > current user
    // Always update lead's user_id to match the offer's agent_id
    // Also update assign_leads table to keep it in sync
    try {
      const currentLeadUserId = lead.user_id?.toString() || lead.user_id;
      const finalAgentIdStr = finalAgentId.toString();
      
      // Always update lead's user_id to finalAgentId to keep them in sync
      const leadUpdateResult = await Lead.findByIdAndUpdate(
        restOfferData.lead_id,
        { user_id: finalAgentId },
        { new: true }
      ).lean();

      if (leadUpdateResult) {
        logger.info('Transferred lead to match offer agent_id', {
          leadId: restOfferData.lead_id,
          previousUserId: currentLeadUserId,
          newUserId: finalAgentIdStr,
          selected_agent_id: selected_agent_id?.toString(),
          agent_id: agent_id?.toString(),
          finalAgentId: finalAgentIdStr,
          offerId: newOffer._id,
          isHandover,
          isPendingTransfer: isHandover && user.role === 'Agent',
        });

        // ✅ Update assign_leads table to match the new agent_id
        // This ensures assign_leads.agent_id is in sync with lead.user_id
        try {
          const assignmentUpdateResult = await AssignLeads.findOneAndUpdate(
            { 
              lead_id: restOfferData.lead_id,
              project_id: restOfferData.project_id
            },
            { 
              $set: { 
                agent_id: finalAgentId,
                updatedAt: new Date()
              } 
            },
            { new: true, runValidators: true }
          ).lean();

          if (assignmentUpdateResult) {
            logger.info('Updated assign_leads agent_id to match offer agent_id', {
              leadId: restOfferData.lead_id,
              projectId: restOfferData.project_id,
              newAgentId: finalAgentIdStr,
              assignmentId: assignmentUpdateResult._id?.toString(),
              offerId: newOffer._id,
            });
          } else {
            logger.warn('AssignLeads record not found when updating agent_id', {
              leadId: restOfferData.lead_id,
              projectId: restOfferData.project_id,
              newAgentId: finalAgentIdStr,
              offerId: newOffer._id,
            });
          }
        } catch (assignLeadsError) {
          logger.error('Failed to update assign_leads agent_id', {
            error: assignLeadsError.message,
            stack: assignLeadsError.stack,
            leadId: restOfferData.lead_id,
            projectId: restOfferData.project_id,
            finalAgentId: finalAgentIdStr,
            offerId: newOffer._id,
          });
          // Don't fail offer creation if assign_leads update fails, but log it
        }
      }
    } catch (error) {
      logger.error('Failed to transfer lead to match offer agent_id', {
        error: error.message,
        stack: error.stack,
        leadId: restOfferData.lead_id,
        finalAgentId,
        selected_agent_id: selected_agent_id?.toString(),
        agent_id: agent_id?.toString(),
        offerId: newOffer._id,
      });
      // Don't fail offer creation if lead transfer fails
    }

    // Create corresponding task in Kanban board system (if offer was created successfully)
    if (newOffer._id) {
      try {
        // Prepare task data for Kanban board
        // Task will be automatically assigned to OFFER board via offer_id
        const taskData = {
          taskTitle: title || `Offer for ${lead.contact_name}`,
          taskDescription: notes || `Offer created: ${title}`,
          priority: 'medium', // Default priority
          offer_id: newOffer._id.toString(),
          lead_id: restOfferData.lead_id ? restOfferData.lead_id.toString() : undefined, // Set lead_id from offer
          // Assign task to the logged-in user who created the offer (not the offer's agent_id)
          assigned: user._id ? [user._id.toString()] : undefined,
          createdBy: user._id ? user._id.toString() : undefined,
          status: 'todo', // Default status
          // If offer_list_id is provided, use it; otherwise auto-find Todo list
          offer_list_id: offer_list_id || undefined,
        };

        const taskResult = await taskServiceClient.createTask(taskData);
        
        if (taskResult && taskResult.success) {
          logger.info('Task created in Kanban board for offer', {
            offer_id: newOffer._id,
            task_id: taskResult.data?._id,
            offer_list_id: offer_list_id || 'auto-assigned to Todo list',
          });

          // Log activity for task creation (subject_id should be lead_id, subject_type should be Offer)
          try {
            const { createActivity } = require('../../../services/activityService/utils');
            await createActivity({
              _creator: user._id,
              _subject_id: restOfferData.lead_id, // always lead_id
              subject_type: 'Offer',
              action: 'create',
              message: `Task created for offer "${title || `Offer #${newOffer._id}`}"`,
              type: 'info',
              is_task: true,
              details: {
                action_type: 'task_created',
                task_id: taskResult.data?._id,
                offer_id: newOffer._id,
                lead_id: restOfferData.lead_id,
                source: 'offer_created',
              },
            });
          } catch (activityError) {
            logger.warn('Failed to log task-created activity for offer (non-blocking)', {
              error: activityError.message,
              offer_id: newOffer._id,
              lead_id: restOfferData.lead_id,
              task_id: taskResult.data?._id,
            });
          }
        } else {
          logger.warn('Task creation in Kanban board failed or was skipped for offer', {
            offer_id: newOffer._id,
            offer_list_id: offer_list_id || 'auto-assigned to Todo list',
          });
        }
      } catch (taskError) {
        // Log error but don't fail offer creation
        logger.error('Error creating task in Kanban board for offer (non-blocking)', {
          error: taskError.message,
          stack: taskError.stack,
          offer_id: newOffer._id,
        });
      }
    }

    // Get populated offer
    const offer = await DocumentManager.populateOfferQuery(Offer.findById(newOffer._id)).lean();

    // Add assigned documents to the offer
    await DocumentManager.populateOfferDocuments(offer);

    // Update lead stage/status if conditions are met
    try {
        const currentLead = await Lead.findById(offerData.lead_id)
          .populate('stage_id', 'name')
          .populate('status_id', 'name')
          .lean();
  
        if (currentLead) {
          const currentStage = currentLead.stage_id?.name || currentLead.stage || '';
          const currentStatus = currentLead.status_id?.name || currentLead.status || '';
  
          logger.info('🔍 OFFER CREATION DEBUG: Lead stage/status before update', {
            leadId: offerData.lead_id,
            currentStage,
            currentStatus,
            stage_id: currentLead.stage_id?._id?.toString(),
            status_id: currentLead.status_id?._id?.toString(),
          });
  
          // Check if we should update to Positiv/Angebot
          const shouldUpdate = !(
            currentStage.toLowerCase() === 'opening' &&
            currentStatus.toLowerCase() !== 'lost' &&
            currentStatus.toLowerCase() !== 'block'
          );
  
          logger.info('🔍 OFFER CREATION DEBUG: Update decision', {
            leadId: offerData.lead_id,
            shouldUpdate,
            isOpening: currentStage.toLowerCase() === 'opening',
            isNotLostOrBlock:
              currentStatus.toLowerCase() !== 'lost' && currentStatus.toLowerCase() !== 'block',
          });
  
          if (shouldUpdate) {
            logger.info('🔄 OFFER CREATION DEBUG: Attempting to update lead stage/status', {
              leadId: offerData.lead_id,
              targetStage: 'Positiv',
              targetStatus: 'Angebot',
            });
  
            const updateResult = await updateLeadStageAndStatus(
              offerData.lead_id,
              'Positiv',
              'Angebot'
            );
  
            logger.info('🔄 OFFER CREATION DEBUG: Update result', {
              leadId: offerData.lead_id,
              updateResult: updateResult ? 'SUCCESS' : 'FAILED',
              updatedLeadId: updateResult?._id?.toString(),
            });
  
            // Update the offer's lead data in the response to reflect the new stage/status
            if (offer.lead_id && updateResult) {
              offer.lead_id.stage = 'Positiv';
              offer.lead_id.status = 'Angebot';
            }
  
            logger.info('Updated lead stage and status for new offer', {
              leadId: offerData.lead_id,
              offerId: newOffer._id,
              previousStage: currentStage,
              previousStatus: currentStatus,
              newStage: 'Positiv',
              newStatus: 'Angebot',
              success: !!updateResult,
            });
          } else {
            logger.info(
              'Skipped lead stage/status update - Opening stage with non-Lost/Block status',
              {
                leadId: offerData.lead_id,
                offerId: newOffer._id,
                currentStage: currentStage,
                currentStatus: currentStatus,
              }
            );
          }
        }
      } catch (error) {
        logger.error('Failed to update lead stage and status for new offer', {
          error: error.message,
          stack: error.stack,
          leadId: offerData.lead_id,
          offerId: newOffer._id,
        });
      }

    // Pin lead to top of agent's queue (so they can create more offers)
    try {
        const { QueueTop } = require('../../../models');
        
        // Only create QueueTop for agents (not admins/supervisors)
        if (user.role === 'Agent' && offerData.lead_id) {
          await QueueTop.findOneAndUpdate(
            {
              lead_id: offerData.lead_id,
              agent_id: user._id,
            },
            {
              $set: {
                is_on_top: true,
                expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
                project_id: offerData.project_id || null,
              },
              $setOnInsert: {
                // Only set these when creating a new document
                lead_id: offerData.lead_id,
                agent_id: user._id,
              },
            },
            {
              upsert: true, // Create if doesn't exist, update if exists
              new: true,
            }
          );
  
          logger.info('Lead pinned to top of queue for agent', {
            leadId: offerData.lead_id,
            agentId: user._id,
            offerId: newOffer._id,
          });
        }
      } catch (error) {
        // Non-critical error - don't fail offer creation if QueueTop fails
        logger.error('Failed to pin lead to top of queue', {
          error: error.message,
          leadId: offerData.lead_id,
          agentId: user._id,
        });
      }

    // ✅ Handle activity logging (immediate assignment or handover)
    try {
      const { createActivity } = require('../../../services/activityService/utils');
      const { User } = require('../../../models');
      
      if (isHandover) {
        // Get agent details for logging
        const [currentAgent, selectedAgent] = await Promise.all([
          User.findById(user._id).select('login first_name').lean(),
          User.findById(selected_agent_id).select('login first_name').lean(),
        ]);

        // Log offer creation with immediate transfer/assignment
        await createActivity({
            _creator: user._id,
            _subject_id: lead._id,
            subject_type: 'Lead',
            action: 'update',
            message: `Offer created and transferred: ${currentAgent?.login || 'Unknown'} → ${selectedAgent?.login || 'Unknown'}`,
            type: 'info',
            details: {
              action_type: 'offer_transferred',
              offer_id: newOffer._id,
              offer_title: title,
              created_by: {
                id: user._id,
                name: currentAgent?.login || currentAgent?.first_name,
                role: user.role,
              },
              assigned_to: {
                id: selected_agent_id,
                name: selectedAgent?.login || selectedAgent?.first_name,
              },
              transfer_notes: notes || null,
              scheduled_date: finalScheduledDate,
              scheduled_time: finalScheduledTime,
            },
          });

        logger.info('Offer created and transferred to selected agent', {
          offerId: newOffer._id,
          leadId: lead._id,
          createdBy: user._id,
          assignedTo: selected_agent_id,
          project: project._id,
          creatorRole: user.role,
        });
      } else {
        // Log regular offer creation with scheduling
        const scheduleMessage = finalScheduledDate && finalScheduledTime
          ? `Offer created, scheduled for ${finalScheduledDate.toISOString().split('T')[0]} at ${finalScheduledTime}`
          : 'Offer created';
        
        await createActivity({
            _creator: user._id,
            _subject_id: lead._id,
            subject_type: 'Lead',
            action: 'update',
            message: scheduleMessage,
            type: 'info',
            details: {
              action_type: 'offer_scheduled',
              offer_id: newOffer._id,
              offer_title: title,
              scheduled_date: finalScheduledDate || null,
              scheduled_time: finalScheduledTime || null,
              notes: notes || null,
            },
          });
      }

      // Also create an activity for the Offer itself (so it can be queried by offer_id)
      const offerScheduleMessage = finalScheduledDate && finalScheduledTime
        ? `Offer created, scheduled for ${finalScheduledDate.toISOString().split('T')[0]} at ${finalScheduledTime}`
        : `Offer created: ${title}`;
      
      await createActivity({
        _creator: user._id,
        _subject_id: newOffer._id,
        subject_type: 'Offer',
        action: 'create',
        message: offerScheduleMessage,
        type: 'info',
        details: {
          action_type: 'offer_created',
          offer_id: newOffer._id,
          offer_title: title,
          lead_id: lead._id,
          project_id: project._id,
          investment_volume: newOffer.investment_volume,
          interest_rate: newOffer.interest_rate,
          scheduled_date: finalScheduledDate || null,
          scheduled_time: finalScheduledTime || null,
          notes: notes || null,
        },
      });
    } catch (activityError) {
      logger.error('Failed to log offer activity:', {
        error: activityError.message,
        stack: activityError.stack,
        leadId: lead._id,
        offerId: newOffer._id,
      });
      // Don't fail offer creation if activity logging fails
    }

    // Emit event
    eventEmitter.emit(EVENT_TYPES.OFFER.CREATED, {
      offer,
      creator: user,
      lead,
      project,
      bankDetails,
    });

    // Auto PDF generation (GeneratedPdf only, no Document assignment)
    let autoPdfResult = null;
    try {
      const { handleAutoPdfGeneration } = require('../utils/autoPdfGeneration');
      autoPdfResult = await handleAutoPdfGeneration(offer, user,token);

      if (autoPdfResult.success) {
        logger.info('✅ Auto PDF generation result - SUCCESS', {
          offerId: offer._id,
          offerType: offer.offerType,
          autoGenerated: autoPdfResult.autoGenerated,
          success: autoPdfResult.success,
          templateFound: autoPdfResult.templateFound,
          documentAssigned: autoPdfResult.documentAssigned || false,
          generatedPdfId: autoPdfResult.generatedPdf?._id,
          matchedTemplate: autoPdfResult.matchedTemplate,
        });
      } else {
        logger.error('❌ Auto PDF generation result - FAILED', {
          offerId: offer._id,
          offerType: offer.offerType,
          autoGenerated: autoPdfResult.autoGenerated,
          success: autoPdfResult.success,
          templateFound: autoPdfResult.templateFound,
          reason: autoPdfResult.reason,
          error: autoPdfResult.error,
          errorCode: autoPdfResult.errorCode,
          message: autoPdfResult.message,
          matchedTemplate: autoPdfResult.matchedTemplate,
        });
      }
    } catch (pdfError) {
      logger.error('❌ Auto PDF generation EXCEPTION during offer creation', {
        offerId: offer._id,
        error: pdfError.message,
        stack: pdfError.stack,
      });
      autoPdfResult = {
        success: false,
        autoGenerated: false,
        error: pdfError.message,
      };
    }

    // Return offer with auto PDF generation info
    const response = formatOfferInvestmentVolume(offer);
    response.autoPdfGeneration = autoPdfResult;

    return response;
  } catch (error) {
    logger.error('Error in createOffer:', error);
    throw error;
  }
};

/**
 * Update offer - Optimized with better validation
 */
const updateOffer = async (
  offerId,
  updateData,
  files,
  user,
  hasPermissionFn,
  permissions,
  options = {}
) => {
  try {
    if (!validateObjectId(offerId)) {
      throw new NotFoundError('Invalid offer ID format');
    }

    const offer = await Offer.findOne({ _id: offerId, active: true });
    if (!offer) {
      throw new NotFoundError('Offer not found or has been deleted');
    }

    // Check permissions
    if (await hasPermissionFn(user.role, permissions.OFFER_UPDATE_ALL)) {
      // Admin can update any offer
    } else if (await hasPermissionFn(user.role, permissions.OFFER_UPDATE_OWN)) {
      if (offer.agent_id.toString() !== user._id.toString()) {
        throw new AuthorizationError("You don't have permission to update this offer");
      }
    } else {
      throw new AuthorizationError("You don't have permission to update offers");
    }

    // Process files if provided
    if (files && files.length > 0) {
      await DocumentUploadHelper.addFilesToEntity(
        offer,
        files,
        DocumentUploadHelper.getDocumentTypes().OFFER,
        user._id
      );
    }
    if (updateData.notes) {
      updateData.handover_notes = updateData.notes;
    }

    logger.info('🔍 OFFER UPDATE DEBUG: updateData', { updateData });

    // Define allowed fields that can be updated
    const allowedFields = [
      'title',
      'nametitle',
      'reference_no',
      'project_id',
      'lead_id',
      'agent_id',
      'bank_id',
      'investment_volume',
      'interest_rate',
      'payment_terms',
      'bonus_amount',
      'bankerRate',
      'agentRate',
      'flex_option',
      'status',
      'offerType',
      'scheduled_date',
      'scheduled_time',
      'handover_notes',
      'load_and_opening',
    ];

    // Filter updateData to only include allowed fields and remove undefined/null values
    const filteredUpdateData = {};
    for (const field of allowedFields) {
      if (updateData.hasOwnProperty(field) && updateData[field] !== undefined && updateData[field] !== null) {
        filteredUpdateData[field] = updateData[field];
      }
    }

    // Store original values from the offer BEFORE any transformations
    // This is used to track which fields actually changed
    const originalOfferValues = {};
    Object.keys(filteredUpdateData).forEach(key => {
      originalOfferValues[key] = offer.get(key);
    });

    // Store original updateData for financial recalculation check
    const originalUpdateData = { ...filteredUpdateData };

    // Update lead nametitle if provided (separate from offer update)
    if (filteredUpdateData.nametitle) {
      const leadId = filteredUpdateData.lead_id || offer.lead_id;
      if (validateObjectId(leadId)) {
        await Lead.findByIdAndUpdate(
          leadId,
          { nametitle: filteredUpdateData.nametitle },
          { new: true }
        );
      }
    }

    // Validate and check existence of related entities
    const validationPromises = [];

    if (filteredUpdateData.project_id) {
      if (!validateObjectId(filteredUpdateData.project_id)) {
        throw new DatabaseError('Invalid project_id format');
      }
      validationPromises.push(
        Team.findById(filteredUpdateData.project_id).lean().then(project => {
          if (!project) {
            throw new NotFoundError('Project not found');
          }
        })
      );
    }

    if (filteredUpdateData.lead_id) {
      if (!validateObjectId(filteredUpdateData.lead_id)) {
        throw new DatabaseError('Invalid lead_id format');
      }
      validationPromises.push(
        Lead.findById(filteredUpdateData.lead_id).lean().then(lead => {
          if (!lead) {
            throw new NotFoundError('Lead not found');
          }
        })
      );
    }

    if (filteredUpdateData.agent_id) {
      if (!validateObjectId(filteredUpdateData.agent_id)) {
        throw new DatabaseError('Invalid agent_id format');
      }
      validationPromises.push(
        User.findById(filteredUpdateData.agent_id).lean().then(agent => {
          if (!agent) {
            throw new NotFoundError('Agent not found');
          }
        })
      );
    }

    if (filteredUpdateData.bank_id) {
      if (!validateObjectId(filteredUpdateData.bank_id)) {
        throw new DatabaseError('Invalid bank_id format');
      }
      validationPromises.push(
        Bank.findById(filteredUpdateData.bank_id).lean().then(bank => {
          if (!bank) {
            throw new NotFoundError('Bank not found');
          }
        })
      );
    }

    if (filteredUpdateData.payment_terms) {
      if (!validateObjectId(filteredUpdateData.payment_terms)) {
        throw new DatabaseError('Invalid payment_terms format');
      }
      validationPromises.push(
        Settings.findById(filteredUpdateData.payment_terms).lean().then(setting => {
          if (!setting) {
            throw new NotFoundError('Payment terms setting not found');
          }
        })
      );
    }

    if (filteredUpdateData.bonus_amount) {
      if (!validateObjectId(filteredUpdateData.bonus_amount)) {
        throw new DatabaseError('Invalid bonus_amount format');
      }
      validationPromises.push(
        Settings.findById(filteredUpdateData.bonus_amount).lean().then(setting => {
          if (!setting) {
            throw new NotFoundError('Bonus amount setting not found');
          }
        })
      );
    }

    // Wait for all validations to complete
    await Promise.all(validationPromises);

    // Handle legacy offers: if created_by is not set, set it to the current user
    if (!offer.created_by) {
      logger.info(`Setting created_by for legacy offer ${offerId} to user ${user._id}`);
      filteredUpdateData.created_by = user._id;
    }

    // Convert string ObjectIds to proper ObjectId instances for MongoDB
    const fieldsToConvert = ['project_id', 'lead_id', 'agent_id', 'bank_id', 'payment_terms', 'bonus_amount', 'created_by'];
    for (const field of fieldsToConvert) {
      if (filteredUpdateData[field] && typeof filteredUpdateData[field] === 'string') {
        filteredUpdateData[field] = new mongoose.Types.ObjectId(filteredUpdateData[field]);
      }
    }

    // Convert scheduled_date string to Date if provided
    if (filteredUpdateData.scheduled_date && typeof filteredUpdateData.scheduled_date === 'string') {
      filteredUpdateData.scheduled_date = new Date(filteredUpdateData.scheduled_date);
    }

    // Convert numeric strings to numbers
    if (filteredUpdateData.investment_volume && typeof filteredUpdateData.investment_volume === 'string') {
      filteredUpdateData.investment_volume = parseFloat(filteredUpdateData.investment_volume);
    }
    if (filteredUpdateData.interest_rate && typeof filteredUpdateData.interest_rate === 'string') {
      filteredUpdateData.interest_rate = parseFloat(filteredUpdateData.interest_rate);
    }
    if (filteredUpdateData.bankerRate && typeof filteredUpdateData.bankerRate === 'string') {
      filteredUpdateData.bankerRate = parseFloat(filteredUpdateData.bankerRate);
    }
    if (filteredUpdateData.agentRate && typeof filteredUpdateData.agentRate === 'string') {
      filteredUpdateData.agentRate = parseFloat(filteredUpdateData.agentRate);
    }

    // Convert boolean strings to booleans
    if (filteredUpdateData.flex_option !== undefined) {
      if (typeof filteredUpdateData.flex_option === 'string') {
        filteredUpdateData.flex_option = filteredUpdateData.flex_option === 'true';
      }
    }

    // Track actual changes (only fields that really changed)
    const actualChanges = {};

    // Apply updates using set() method for proper MongoDB update
    // Track changes during the update loop (no extra iteration needed)
    Object.keys(filteredUpdateData).forEach(key => {
      const oldValue = originalOfferValues[key];
      const newValue = filteredUpdateData[key];
      
      // Compare values to see if they actually changed
      if (hasValueChanged(oldValue, newValue)) {
        actualChanges[key] = newValue;
      }
      
      offer.set(key, newValue);
    });

    // Update the updated_at timestamp
    offer.updated_at = new Date();

    // Save the offer
    await offer.save();

    // Auto-recalculate financials if relevant fields actually changed and financials are initialized
    const financialFields = ['investment_volume', 'bonus_amount', 'bank_id', 'agent_id', 'load_and_opening'];
    const financialFieldChanged = financialFields.some(field => actualChanges.hasOwnProperty(field));
    
    if (financialFieldChanged && offer.financials?.financials_initialized) {
      try {
        // Get the updated offer with populated fields for recalculation
        const offerForRecalc = await Offer.findById(offerId)
          .populate('agent_id', 'commission_percentage_opening commission_percentage_load')
          .populate('bank_id', 'commission_percentage')
          .populate('bonus_amount', 'info');
        
        // Determine what needs to be updated (only for fields that actually changed)
        const recalcData = {};
        
        // If investment_volume actually changed, update it
        if (actualChanges.investment_volume !== undefined) {
          recalcData.investment_total = actualChanges.investment_volume;
        }
        
        // If bonus_amount actually changed, update it
        if (actualChanges.bonus_amount !== undefined && offerForRecalc.bonus_amount?.info?.amount !== undefined) {
          recalcData.bonus_value = offerForRecalc.bonus_amount.info.amount;
        }
        
        // If bank actually changed, update bank percentage (if not manually overridden)
        if (actualChanges.bank_id !== undefined && offerForRecalc.bank_id?.commission_percentage !== undefined) {
          if (!offerForRecalc.financials.bank_commission?.is_overridden) {
            await commissionService.overrideBankPercentage(
              offerId,
              offerForRecalc.bank_id.commission_percentage,
              user._id
            );
          }
        }
        
        // If agent or category actually changed, update agent percentage (if not manually overridden)
        if ((actualChanges.agent_id !== undefined || actualChanges.load_and_opening !== undefined) && 
            !offerForRecalc.financials.primary_agent_commission?.is_overridden) {
          const category = offerForRecalc.load_and_opening || 'opening';
          let agentPct = 0;
          if (category === 'load') {
            agentPct = offerForRecalc.agent_id?.commission_percentage_load || 0;
          } else {
            agentPct = offerForRecalc.agent_id?.commission_percentage_opening || 0;
          }
          await commissionService.overridePrimaryAgentPercentage(offerId, agentPct, user._id);
        }
        
        // Update investment amounts if changed
        if (recalcData.investment_total !== undefined || recalcData.bonus_value !== undefined) {
          await commissionService.updateInvestmentAmounts(offerId, recalcData, user._id);
        } else {
          // Just recalculate to update amounts
          await commissionService.calculateOfferCommissions(offerId, 'field_change');
        }
        
        logger.info('✅ Auto-recalculated financials after offer update', {
          offerId,
          changedFields: Object.keys(actualChanges).filter(f => financialFields.includes(f)),
        });
      } catch (financialsError) {
        logger.error('⚠️ Failed to auto-recalculate financials after offer update', {
          error: financialsError.message,
          offerId,
        });
        // Don't fail the offer update if financials recalculation fails
      }
    }

    // Get populated offer
    const updatedOffer = await DocumentManager.populateOfferQuery(Offer.findById(offerId)).lean();

    // Add assigned documents to the offer
    await DocumentManager.populateOfferDocuments(updatedOffer);

    // Create activity log (before event emission, just like createOffer)
    // This matches the exact pattern from createOffer - activity created synchronously in the function
    try {
      const { createActivity } = require('../../../services/activityService/utils');
      const offerTitle = updatedOffer.title || `Offer #${updatedOffer._id}`;
      const changeCount = Object.keys(actualChanges).length;
      
      await createActivity({
        _creator: user._id,
        _subject_id: updatedOffer._id,
        subject_type: 'Offer',
        action: 'update',
        message: `Offer updated: ${offerTitle}${changeCount > 0 ? ` (${changeCount} field${changeCount > 1 ? 's' : ''} changed)` : ''}`,
        type: 'info',
        metadata: {
          action_type: 'offer_updated',
          offer_id: updatedOffer._id,
          offer_title: offerTitle,
          lead_id: updatedOffer.lead_id?._id || updatedOffer.lead_id,
          changes: actualChanges || {},
        },
      });
    } catch (activityError) {
      logger.error('Failed to log offer update activity:', {
        error: activityError.message,
        stack: activityError.stack,
        offerId: updatedOffer._id,
        creatorId: user._id,
      });
      // Don't fail offer update if activity logging fails
    }

    // Fetch lead for event (matching OFFER.CREATED pattern)
    let lead = null;
    if (updatedOffer.lead_id) {
      try {
        const { Lead } = require('../../../models');
        const leadId = updatedOffer.lead_id._id || updatedOffer.lead_id;
        lead = await Lead.findById(leadId).lean();
      } catch (leadError) {
        logger.warn('Failed to fetch lead for offer update event', {
          error: leadError.message,
          leadId: updatedOffer.lead_id?._id || updatedOffer.lead_id,
        });
      }
    }

    // Emit event with only actual changes (fields that really changed)
    // Include lead to match OFFER.CREATED pattern
    eventEmitter.emit(EVENT_TYPES.OFFER.UPDATED, {
      offer: updatedOffer,
      creator: user,
      lead: lead, // Include lead like OFFER.CREATED does
      changes: actualChanges, // Only fields that actually changed
    });

    // PDF generation removed - use manual /pdf/generate-offer endpoint
    // No automatic PDF generation during offer update

    return formatOfferInvestmentVolume(updatedOffer);
  } catch (error) {
    logger.error('Error in updateOffer:', error);
    throw error;
  }
};

/**
 * Delete offers - Optimized with better error handling and transaction-like behavior
 */
const deleteOffers = async (offerIds, user, hasPermissionFn, permissions) => {
  try {
    // Verify permissions
    if (
      !await hasPermissionFn(user.role, permissions.OFFER_DELETE_ALL) &&
      !await hasPermissionFn(user.role, permissions.OFFER_DELETE_OWN)
    ) {
      throw new AuthorizationError("You don't have permission to delete offers");
    }

    if (!offerIds) {
      throw new DatabaseError(
        'Missing offer ID. Please provide either a single ID or an array of IDs.',
        1202
      );
    }

    // Normalize to array
    const idsToDelete = Array.isArray(offerIds) ? offerIds : [offerIds];

    // Validate all IDs
    const invalidIds = idsToDelete.filter((id) => !validateObjectId(id));
    if (invalidIds.length > 0) {
      throw new DatabaseError(`Invalid offer IDs: ${invalidIds.join(', ')}`);
    }

    const deletedOffers = [];
    const failedOffers = [];
    const cascadeResults = {
      openings: { found: 0, deleted: 0, failed: 0 },
      confirmations: { found: 0, deleted: 0, failed: 0 },
      paymentVouchers: { found: 0, deleted: 0, failed: 0 },
    };

    // Process each offer
    for (const offerId of idsToDelete) {
      try {
        const offer = await Offer.findOne({ _id: offerId, active: true });
        if (!offer) {
          failedOffers.push({ id: offerId, reason: 'Offer not found or already deleted' });
          continue;
        }

        // Check permissions for this specific offer
        const hasDeleteAllPermission = await hasPermissionFn(user.role, permissions.OFFER_DELETE_ALL);
        const hasDeleteOwnPermission = await hasPermissionFn(user.role, permissions.OFFER_DELETE_OWN);
        const isOfferCreator =
          offer.created_by && offer.created_by.toString() === user._id.toString();
        const hasCreatedByField = Boolean(offer.created_by);

        // Log permission check for debugging
        logger.info(`Offer deletion permission check`, {
          userId: user._id,
          userRole: user.role,
          offerId: offerId,
          offerAgentId: offer.agent_id.toString(),
          offerCreatedBy: offer.created_by ? offer.created_by.toString() : 'not-set',
          hasDeleteAllPermission,
          hasDeleteOwnPermission,
          isOfferCreator,
          hasCreatedByField,
        });

        // Permission logic:
        // 1. Users must have either OFFER_DELETE_ALL or OFFER_DELETE_OWN permission
        // 2. Users with OFFER_DELETE_ALL (admins) can delete any offer
        // 3. Users with only OFFER_DELETE_OWN can only delete offers they created themselves
        // 4. Legacy offers without created_by field can only be deleted by admins
        if (!hasDeleteAllPermission && !hasDeleteOwnPermission) {
          failedOffers.push({ id: offerId, reason: 'No permission to delete offers' });
          continue;
        }

        // Handle legacy offers without created_by field - only admins can delete them
        if (!hasCreatedByField && !hasDeleteAllPermission) {
          failedOffers.push({
            id: offerId,
            reason:
              'Access denied - this offer was created before ownership tracking. Only administrators can delete legacy offers.',
          });
          continue;
        }

        // If user doesn't have delete all permission, they can only delete offers they created
        if (!hasDeleteAllPermission && !isOfferCreator) {
          failedOffers.push({
            id: offerId,
            reason: 'Access denied - you can only delete offers you created yourself',
          });
          continue;
        }

        // Store offer data for activity logging
        const offerData = offer.toObject();

        // Find all related data with single queries
        const [relatedOpenings, relatedConfirmations, relatedPaymentVouchers] = await Promise.all([
          Opening.find({ offer_id: offerId, active: true }),
          Confirmation.find({
            $or: [
              { offer_id: offerId },
              {
                opening_id: {
                  $in: await Opening.find({ offer_id: offerId, active: true }).distinct('_id'),
                },
              },
            ],
            active: true,
          }),
          PaymentVoucher.find({
            $or: [
              { offer_id: offerId },
              {
                confirmation_id: {
                  $in: await Confirmation.find({
                    $or: [
                      { offer_id: offerId },
                      {
                        opening_id: {
                          $in: await Opening.find({ offer_id: offerId, active: true }).distinct(
                            '_id'
                          ),
                        },
                      },
                    ],
                    active: true,
                  }).distinct('_id'),
                },
              },
            ],
            active: true,
          }),
        ]);

        // Update counts
        cascadeResults.openings.found += relatedOpenings.length;
        cascadeResults.confirmations.found += relatedConfirmations.length;
        cascadeResults.paymentVouchers.found += relatedPaymentVouchers.length;

        // Delete in reverse order: payment vouchers -> confirmations -> openings -> offer
        const deletionPromises = [];

        // Delete payment vouchers
        for (const paymentVoucher of relatedPaymentVouchers) {
          deletionPromises.push(
            (async () => {
              try {
                paymentVoucher.active = false;
                await paymentVoucher.save();
                cascadeResults.paymentVouchers.deleted++;

                eventEmitter.emit(EVENT_TYPES.PAYMENT_VOUCHER.DELETED, {
                  paymentVoucher: paymentVoucher.toObject(),
                  creator: user,
                  cascadeDelete: true,
                  parentOffer: offerData,
                });
              } catch (error) {
                cascadeResults.paymentVouchers.failed++;
                logger.error('Failed to delete payment voucher during cascade', {
                  paymentVoucherId: paymentVoucher._id,
                  offerId,
                  error: error.message,
                });
              }
            })()
          );
        }

        // Delete confirmations
        for (const confirmation of relatedConfirmations) {
          deletionPromises.push(
            (async () => {
              try {
                confirmation.active = false;
                await confirmation.save();
                cascadeResults.confirmations.deleted++;

                eventEmitter.emit(EVENT_TYPES.CONFIRMATION.DELETED, {
                  confirmation: confirmation.toObject(),
                  creator: user,
                  cascadeDelete: true,
                  parentOffer: offerData,
                });
              } catch (error) {
                cascadeResults.confirmations.failed++;
                logger.error('Failed to delete confirmation during cascade', {
                  confirmationId: confirmation._id,
                  offerId,
                  error: error.message,
                });
              }
            })()
          );
        }

        // Delete openings
        for (const opening of relatedOpenings) {
          deletionPromises.push(
            (async () => {
              try {
                opening.active = false;
                await opening.save();
                cascadeResults.openings.deleted++;

                eventEmitter.emit(EVENT_TYPES.OPENING.DELETED, {
                  opening: opening.toObject(),
                  creator: user,
                  cascadeDelete: true,
                  parentOffer: offerData,
                });
              } catch (error) {
                cascadeResults.openings.failed++;
                logger.error('Failed to delete opening during cascade', {
                  openingId: opening._id,
                  offerId,
                  error: error.message,
                });
              }
            })()
          );
        }

        // Wait for all cascade deletions to complete
        await Promise.all(deletionPromises);

        // Soft delete the offer (mark as inactive)
        await Offer.findByIdAndUpdate(offerId, {
          active: false,
          updated_at: new Date(),
        });

        // Check remaining active offers for this lead and update lead stage/status accordingly
        try {
          const remainingOffersCount = await Offer.countDocuments({
            lead_id: offerData.lead_id,
            active: true,
          });

          logger.info('🗑️ OFFER DELETION DEBUG: Checking lead stage/status update', {
            leadId: offerData.lead_id,
            deletedOfferId: offerId,
            remainingOffersCount,
          });

          if (remainingOffersCount === 0) {
            // No more offers for this lead - update to "Negativ/NE4"
            logger.info('🗑️ OFFER DELETION: Last offer deleted - updating lead to Negativ/NE4', {
              leadId: offerData.lead_id,
              deletedOfferId: offerId,
            });

            const updateResult = await updateLeadStageAndStatus(
              offerData.lead_id,
              'Negativ',
              'NE4'
            );

            if (updateResult) {
              logger.info('✅ OFFER DELETION: Successfully updated lead stage/status', {
                leadId: offerData.lead_id,
                newStage: 'Negativ',
                newStatus: 'NE4',
              });
            } else {
              logger.warn('⚠️ OFFER DELETION: Failed to update lead stage/status', {
                leadId: offerData.lead_id,
              });
            }
          } else {
            logger.info(
              '🗑️ OFFER DELETION: Other offers exist - keeping lead stage/status unchanged',
              {
                leadId: offerData.lead_id,
                deletedOfferId: offerId,
                remainingOffersCount,
              }
            );
          }
        } catch (error) {
          logger.error('❌ OFFER DELETION: Error updating lead stage/status', {
            error: error.message,
            leadId: offerData.lead_id,
            deletedOfferId: offerId,
          });
        }

        // Get lead data for activity logging
        const lead = await Lead.findById(offerData.lead_id).lean();

        // Emit event
        eventEmitter.emit(EVENT_TYPES.OFFER.DELETED, {
          offer: offerData,
          creator: user,
          lead,
          cascadeResults: {
            openings: relatedOpenings.length,
            confirmations: relatedConfirmations.length,
            paymentVouchers: relatedPaymentVouchers.length,
          },
        });

        deletedOffers.push(offerId);
      } catch (error) {
        logger.error(`Error deleting offer ${offerId}`, { error });
        failedOffers.push({ id: offerId, reason: 'Server error' });
      }
    }

    // Build response message
    let message = `Successfully deleted ${deletedOffers.length} offers`;
    if (cascadeResults.openings.found > 0) {
      message += `, ${cascadeResults.openings.deleted} openings`;
    }
    if (cascadeResults.confirmations.found > 0) {
      message += `, ${cascadeResults.confirmations.deleted} confirmations`;
    }
    if (cascadeResults.paymentVouchers.found > 0) {
      message += `, ${cascadeResults.paymentVouchers.deleted} payment vouchers`;
    }

    return {
      message,
      deleted: deletedOffers,
      failed: failedOffers,
      cascadeResults,
    };
  } catch (error) {
    logger.error('Error in deleteOffers:', error);
    throw error;
  }
};

/**
 * Update offers to set current_stage to 'out'
 * Updates multiple offers to mark them as "out" stage
 */
const updateOffersToOut = async (offerIds, user, hasPermissionFn, permissions) => {
  try {
    // Verify permissions - use update permissions since we're updating offers
    if (
      !await hasPermissionFn(user.role, permissions.OFFER_UPDATE_ALL) &&
      !await hasPermissionFn(user.role, permissions.OFFER_UPDATE_OWN)
    ) {
      throw new AuthorizationError("You don't have permission to update offers");
    }

    if (!offerIds || !Array.isArray(offerIds) || offerIds.length === 0) {
      throw new DatabaseError('Missing offer IDs. Please provide an array of offer IDs.', 1202);
    }

    // Validate all IDs
    const invalidIds = offerIds.filter((id) => !validateObjectId(id));
    if (invalidIds.length > 0) {
      throw new DatabaseError(`Invalid offer IDs: ${invalidIds.join(', ')}`);
    }

    const updatedOffers = [];
    const failedOffers = [];

    // Process each offer
    for (const offerId of offerIds) {
      try {
        // Find the offer
        const offer = await Offer.findOne({ _id: offerId, active: true });

        if (!offer) {
          failedOffers.push({
            id: offerId,
            reason: 'Offer not found or has been deleted',
          });
          continue;
        }

        // Check permissions for each offer
        if (await hasPermissionFn(user.role, permissions.OFFER_UPDATE_ALL)) {
          // Admin can update any offer
        } else if (await hasPermissionFn(user.role, permissions.OFFER_UPDATE_OWN)) {
          // Users with only OFFER_UPDATE_OWN can only update offers they created themselves
          if (!offer.created_by) {
            failedOffers.push({
              id: offerId,
              reason: 'Access denied - this offer was created before ownership tracking. Only administrators can update legacy offers.',
            });
            continue;
          }

          // If user doesn't have update all permission, they can only update offers they created
          if (offer.created_by.toString() !== user._id.toString()) {
            failedOffers.push({
              id: offerId,
              reason: 'Access denied - you can only update offers you created yourself',
            });
            continue;
          }
        }

        const previousStage = offer.current_stage || 'offer';

        // Update the offer to set current_stage to 'out'
        offer.current_stage = 'out';
        offer.updated_at = new Date();
        await offer.save();

        // Create activity log
        try {
          const { createActivity } = require('../../activityService/utils');
          const offerTitle = offer.title || `Offer #${offerId}`;
          const leadId = offer.lead_id ? offer.lead_id.toString() : null;

          await createActivity({
            _creator: user._id,
            _subject_id: offerId,
            subject_type: 'Offer',
            action: 'status_change',
            message: `Offer moved to 'out' stage: ${offerTitle}`,
            type: 'info',
            details: {
              action_type: 'offer_moved_to_out',
              offer_id: offerId,
              offer_title: offerTitle,
              previous_stage: previousStage,
              new_stage: 'out',
              lead_id: leadId,
            },
          });
        } catch (activityError) {
          logger.warn('Failed to log offer to out activity (non-blocking)', {
            error: activityError.message,
            offerId,
          });
        }

        updatedOffers.push(offerId);
      } catch (error) {
        logger.error(`Error updating offer ${offerId} to out:`, error);
        failedOffers.push({
          id: offerId,
          reason: error.message || 'Failed to update offer',
        });
      }
    }

    // Build response message
    let message = `Successfully updated ${updatedOffers.length} offer(s) to 'out' stage`;
    if (failedOffers.length > 0) {
      message += `, ${failedOffers.length} failed`;
    }

    return {
      success: true,
      message,
      updated: updatedOffers,
      failed: failedOffers,
      totalRequested: offerIds.length,
      totalUpdated: updatedOffers.length,
      totalFailed: failedOffers.length,
    };
  } catch (error) {
    logger.error('Error in updateOffersToOut:', error);
    throw error;
  }
};

/**
 * Revert offers from 'out' stage back to 'offer' stage
 * Reverts multiple offers from "out" stage back to "offer" stage
 */
const revertOffersFromOut = async (offerIds, user, hasPermissionFn, permissions) => {
  try {
    // Verify permissions - use update permissions since we're updating offers
    if (
      !await hasPermissionFn(user.role, permissions.OFFER_UPDATE_ALL) &&
      !await hasPermissionFn(user.role, permissions.OFFER_UPDATE_OWN)
    ) {
      throw new AuthorizationError("You don't have permission to update offers");
    }

    if (!offerIds || !Array.isArray(offerIds) || offerIds.length === 0) {
      throw new DatabaseError('Missing offer IDs. Please provide an array of offer IDs.', 1202);
    }

    // Validate all IDs
    const invalidIds = offerIds.filter((id) => !validateObjectId(id));
    if (invalidIds.length > 0) {
      throw new DatabaseError(`Invalid offer IDs: ${invalidIds.join(', ')}`);
    }

    const updatedOffers = [];
    const failedOffers = [];

    // Process each offer
    for (const offerId of offerIds) {
      try {
        // Find the offer - must be in 'out' stage
        const offer = await Offer.findOne({ _id: offerId, active: true, current_stage: 'out' });

        if (!offer) {
          // Check if offer exists but not in 'out' stage
          const existingOffer = await Offer.findOne({ _id: offerId, active: true });
          if (existingOffer) {
            failedOffers.push({
              id: offerId,
              reason: `Offer is not in 'out' stage (current stage: ${existingOffer.current_stage})`,
            });
          } else {
            failedOffers.push({
              id: offerId,
              reason: 'Offer not found or has been deleted',
            });
          }
          continue;
        }

        // Check permissions for each offer
        if (await hasPermissionFn(user.role, permissions.OFFER_UPDATE_ALL)) {
          // Admin can update any offer
        } else if (await hasPermissionFn(user.role, permissions.OFFER_UPDATE_OWN)) {
          // Users with only OFFER_UPDATE_OWN can only update offers they created themselves
          if (!offer.created_by) {
            failedOffers.push({
              id: offerId,
              reason: 'Access denied - this offer was created before ownership tracking. Only administrators can update legacy offers.',
            });
            continue;
          }

          // If user doesn't have update all permission, they can only update offers they created
          if (offer.created_by.toString() !== user._id.toString()) {
            failedOffers.push({
              id: offerId,
              reason: 'Access denied - you can only update offers you created yourself',
            });
            continue;
          }
        }

        // Revert the offer from 'out' back to 'offer' stage
        offer.current_stage = 'offer';
        offer.updated_at = new Date();
        await offer.save();

        // Create activity log
        try {
          const { createActivity } = require('../../activityService/utils');
          const offerTitle = offer.title || `Offer #${offerId}`;
          
          await createActivity({
            _creator: user._id,
            _subject_id: offerId,
            subject_type: 'Offer',
            action: 'status_change',
            message: `Offer reverted from 'out' to 'offer' stage: ${offerTitle}`,
            type: 'info',
            details: {
              action_type: 'offer_reverted_from_out',
              offer_id: offerId,
              offer_title: offerTitle,
              previous_stage: 'out',
              new_stage: 'offer',
            },
          });
        } catch (activityError) {
          logger.warn('Failed to log offer revert from out activity (non-blocking)', {
            error: activityError.message,
            offerId,
          });
        }

        updatedOffers.push(offerId);
      } catch (error) {
        logger.error(`Error reverting offer ${offerId} from out:`, error);
        failedOffers.push({
          id: offerId,
          reason: error.message || 'Failed to revert offer',
        });
      }
    }

    // Build response message
    let message = `Successfully reverted ${updatedOffers.length} offer(s) from 'out' stage to 'offer' stage`;
    if (failedOffers.length > 0) {
      message += `, ${failedOffers.length} failed`;
    }

    return {
      success: true,
      message,
      updated: updatedOffers,
      failed: failedOffers,
      totalRequested: offerIds.length,
      totalUpdated: updatedOffers.length,
      totalFailed: failedOffers.length,
    };
  } catch (error) {
    logger.error('Error in revertOffersFromOut:', error);
    throw error;
  }
};

/**
 * Remove document from offer - Optimized with flexible ID handling
 */
const removeDocumentFromOffer = async (offerId, documentId, user, hasPermissionFn, permissions) => {
  try {
    if (!validateObjectId(offerId)) {
      throw new NotFoundError('Invalid offer ID format');
    }
    if (!validateObjectId(documentId)) {
      throw new NotFoundError('Invalid document ID format');
    }

    const offer = await Offer.findOne({ _id: offerId, active: true });
    if (!offer) {
      throw new NotFoundError('Offer not found or has been deleted');
    }

    // Check permissions
    await PermissionManager.getPermissionFilter(user, hasPermissionFn, permissions, offer);

    // Handle both document ID and files array item ID
    let actualDocumentId = documentId;

    // Check if the provided ID is a files array item ID
    const fileItem = offer.files?.find((file) => file._id.toString() === documentId);
    if (fileItem) {
      // If it's a files array item ID, get the actual document ID
      actualDocumentId = fileItem.document.toString();
      logger.info('Converting files array item ID to document ID', {
        offerId,
        filesArrayItemId: documentId,
        actualDocumentId,
      });
    }

    // Remove document
    await DocumentUploadHelper.removeFilesFromEntity(offer, [actualDocumentId]);

    // Also unassign document from the offer using the new assignment functionality
    try {
      const document = await Document.findById(actualDocumentId);
      if (document) {
        const unassignResult = document.unassignFrom(
          'offer',
          offerId,
          user._id,
          `Document unassigned from offer ${offer.offer_no || offerId}`
        );

        if (unassignResult.success) {
          // Save the document to persist the unassignment
          await document.save();

          logger.debug('Document unassigned from offer', {
            documentId: actualDocumentId,
            offerId,
            filename: document.filename,
            activeAssignments: document.assignments.filter((a) => a.active).length,
          });
        } else {
          logger.warn('Failed to unassign document from offer', {
            documentId: actualDocumentId,
            offerId,
            reason: unassignResult.message,
          });
        }
      }
    } catch (unassignError) {
      logger.warn('Failed to unassign document from offer', {
        documentId: actualDocumentId,
        offerId,
        error: unassignError.message,
      });
      // Continue processing even if unassignment fails
    }

    // Get updated offer
    const updatedOffer = await DocumentManager.populateOfferQuery(Offer.findById(offerId)).lean();

    // Add assigned documents to the offer
    await DocumentManager.populateOfferDocuments(updatedOffer);

    // Get document details for activity logging
    const document = await Document.findById(actualDocumentId).lean();

    // Create specific activity log for document removal
    try {
      const { createActivity } = require('../../activityService/utils');
      const offerTitle = updatedOffer.title || `Offer #${offerId}`;
      const documentName = document?.filename || `Document #${actualDocumentId}`;
      
      await createActivity({
        _creator: user._id,
        _subject_id: offerId,
        subject_type: 'Offer',
        action: 'update',
        message: `Document removed from offer: ${offerTitle} - ${documentName}`,
        type: 'info',
        details: {
          action_type: 'document_removed_from_offer',
          offer_id: offerId,
          offer_title: offerTitle,
          document_id: actualDocumentId,
          document_filename: documentName,
          document_type: document?.type,
        },
      });
    } catch (activityError) {
      logger.warn('Failed to log document removal activity (non-blocking)', {
        error: activityError.message,
        offerId,
        documentId: actualDocumentId,
      });
    }

    // Emit event
    eventEmitter.emit(EVENT_TYPES.OFFER.UPDATED, {
      offer: updatedOffer,
      creator: user,
      changes: { document_removed: actualDocumentId },
    });

    return formatOfferInvestmentVolume(updatedOffer);
  } catch (error) {
    logger.error('Error in removeDocumentFromOffer:', error);
    throw error;
  }
};

/**
 * Add documents to offer - Optimized
 */
const addDocumentsToOffer = async (offerId, files, user, documentTypes) => {
  try {
    logger.info('=== Starting addDocumentsToOffer ===', {
      offerId,
      filesCount: files?.length || 0,
      userId: user?._id,
      documentTypes,
    });

    if (!validateObjectId(offerId)) {
      logger.error('Invalid offer ID format', { offerId });
      throw new NotFoundError('Invalid offer ID format');
    }

    if (!files || files.length === 0) {
      logger.error('No files provided for upload');
      throw new DatabaseError('No files provided for upload');
    }

    logger.info('Files received for upload:', {
      files: files.map((f) => ({
        originalname: f.originalname,
        mimetype: f.mimetype,
        size: f.size,
        path: f.path,
      })),
    });

    const offer = await Offer.findById(offerId);
    if (!offer) {
      logger.error('Offer not found', { offerId });
      throw new NotFoundError('Offer not found');
    }

    logger.info('Offer found, processing files', {
      offerId,
      currentStage: offer.current_stage,
      existingFilesCount: offer.files?.length || 0,
    });

    // Determine which files array to use based on current_stage
    const currentStage = offer.current_stage || 'offer';
    const validProgressionStages = ['opening', 'confirmation', 'payment', 'netto1', 'netto2'];
    const isProgressionStage = validProgressionStages.includes(currentStage);

    // Initialize progression stage if it doesn't exist
    if (isProgressionStage && !offer.progression) {
      offer.progression = {};
    }
    if (isProgressionStage && !offer.progression[currentStage]) {
      offer.progression[currentStage] = { files: [] };
    }

    // Get the appropriate files array based on stage
    let targetFilesArray;
    let existingIds;
    
    if (isProgressionStage) {
      // Use progression stage files array
      targetFilesArray = offer.progression[currentStage].files || [];
      existingIds = new Set(targetFilesArray.map((doc) => doc.document?.toString()).filter(Boolean));
      logger.info(`Adding documents to progression.${currentStage}.files`, {
        existingFilesCount: targetFilesArray.length,
      });
    } else {
      // Use root files array for 'offer' stage or unknown stages
      offer.files = offer.files || [];
      targetFilesArray = offer.files;
      existingIds = new Set(targetFilesArray.map((doc) => doc.document?.toString()).filter(Boolean));
      logger.info('Adding documents to root files array', {
        existingFilesCount: targetFilesArray.length,
      });
    }

    logger.info('Calling processFileGroup...', {
      filesCount: files.length,
      documentTypes,
      userId: user._id,
    });

    const documents = await processFileGroup(files, documentTypes, user._id);

    logger.info('processFileGroup completed', {
      documentsCreated: documents?.length || 0,
      documents: documents?.map((doc) => ({
        id: doc._id,
        filename: doc.filename,
        path: doc.path,
        size: doc.size,
      })),
    });

    const documentRefs = documents
      .map((doc) => ({ document: doc._id }))
      .filter((ref) => !existingIds.has(ref.document.toString()));

    logger.info('Document references created', {
      newDocumentRefs: documentRefs.length,
      existingDocuments: existingIds.size,
    });

    // Update assignment tracking for each document
    for (const doc of documents) {
      if (!existingIds.has(doc._id.toString())) {
        const assignResult = doc.assignTo('offer', offerId, user._id, `Document uploaded to offer ${currentStage} stage`);
        if (assignResult.success) {
          await doc.save();
          logger.debug('Document assignment tracking updated', {
            documentId: doc._id,
            filename: doc.filename,
            offerId,
            stage: currentStage,
          });
        } else {
          logger.warn('Failed to update document assignment tracking', {
            documentId: doc._id,
            filename: doc.filename,
            error: assignResult.message,
          });
        }
      }
    }

    // Add documents to the appropriate array
    if (isProgressionStage) {
      // Add to progression stage files array
      if (!offer.progression[currentStage].files) {
        offer.progression[currentStage].files = [];
      }
      offer.progression[currentStage].files.push(...documentRefs);
      // Ensure the stage is marked as active
      if (!offer.progression[currentStage].active) {
        offer.progression[currentStage].active = true;
      }
    } else {
      // Add to root files array
      offer.files.push(...documentRefs);
    }
    
    await offer.save();

    // Log the correct file count based on stage
    const finalFileCount = isProgressionStage 
      ? (offer.progression[currentStage]?.files?.length || 0)
      : (offer.files?.length || 0);
    
    logger.info('Offer saved successfully', {
      offerId,
      currentStage,
      totalFilesNow: finalFileCount,
      filesLocation: isProgressionStage ? `progression.${currentStage}.files` : 'root files',
    });

    const result = await DocumentManager.populateOfferQuery(Offer.findById(offerId)).lean();

    // CRITICAL: Populate documents using hybrid system (reverse + forward references)
    await DocumentManager.populateOfferDocuments(result);

    logger.info('=== addDocumentsToOffer completed successfully ===', {
      offerId,
      finalFileCount: result.files?.length || 0,
    });

    // Create activity log
    try {
      const { createActivity } = require('../../activityService/utils');
      const offerTitle = result.title || `Offer #${offerId}`;
      const filesCount = files?.length || 0;
      
      await createActivity({
        _creator: user._id,
        _subject_id: offerId,
        subject_type: 'Offer',
        action: 'update',
        message: `${filesCount} document(s) added to offer: ${offerTitle}`,
        type: 'info',
        details: {
          action_type: 'documents_added_to_offer',
          offer_id: offerId,
          offer_title: offerTitle,
          documents_count: filesCount,
          stage: currentStage,
          document_ids: documents.map(doc => doc._id),
        },
      });
    } catch (activityError) {
      logger.warn('Failed to log document addition activity (non-blocking)', {
        error: activityError.message,
        offerId,
      });
    }

    return formatOfferInvestmentVolume(result);
  } catch (error) {
    logger.error('Error in addDocumentsToOffer:', {
      error: error.message,
      stack: error.stack,
      offerId,
      filesCount: files?.length || 0,
      userId: user?._id,
    });
    throw error;
  }
};

/**
 * Get document by ID from an offer
 * @param {string} documentId - Document ID
 * @returns {Object} Document details and file path
 */
const getDocumentById = async (documentId) => {
  try {
    if (!validateObjectId(documentId)) {
      throw new NotFoundError('Invalid document ID format');
    }

    const fs = require('fs');
    const storageConfig = require('../../../config/storageConfig');

    // Find the document
    const document = await Document.findById(documentId);
    if (!document) {
      throw new NotFoundError('Document not found');
    }

    // Find the offer that contains this document (check both legacy files array and assignments)
    let offer = await Offer.findOne({
      $or: [
        { 'files.document': documentId },
        { 'progression.opening.files.document': documentId },
        { 'progression.confirmation.files.document': documentId },
        { 'progression.payment.files.document': documentId },
        { 'progression.netto1.files.document': documentId },
        { 'progression.netto2.files.document': documentId },
      ],
      active: true,
    });

    // If not found in files array, check document assignments
    if (!offer) {
      const docWithAssignments = await Document.findById(documentId)
        .select('assignments')
        .lean();
      
      if (docWithAssignments && docWithAssignments.assignments) {
        const offerAssignment = docWithAssignments.assignments.find(
          assignment => assignment.entity_type === 'offer' && assignment.active
        );
        
        if (offerAssignment) {
          offer = await Offer.findOne({
            _id: offerAssignment.entity_id,
            active: true,
          });
        }
      }
    }

    if (!offer) {
      throw new NotFoundError('Document not found in any active offer');
    }

    // Construct the file path using storageConfig
    const relativePath = document.path.replace(/^\//, '');
    const filePath = storageConfig.getFilePath(relativePath);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      logger.error('File not found on server', { path: document.path, fullPath: filePath });
      throw new NotFoundError('File not found on server');
    }

    return {
      document,
      filePath,
      offer,
    };
  } catch (error) {
    logger.error('Error fetching offer document', { error: error.message, documentId });
    throw error;
  }
};

/**
 * Restore a previously soft-deleted offer by setting active=true
 * @param {string} offerId - Offer ID
 * @param {Object} user - Current user
 * @param {Function} hasPermissionFn - Permission check function
 * @param {Object} permissions - Permissions object
 * @returns {Promise<Object>} Restored offer
 */
const restoreOffer = async (offerId, user, hasPermissionFn, permissions) => {
  try {
    if (!validateObjectId(offerId)) {
      throw new NotFoundError('Invalid offer ID format');
    }

    // Find offer including inactive ones
    const offer = await Offer.findOne({ _id: offerId });
    if (!offer) {
      throw new NotFoundError('Offer not found');
    }

    // Check if already active
    if (offer.active === true) {
      throw new DatabaseError('Offer is already active');
    }

    // Check permissions
    if (await hasPermissionFn(user.role, permissions.OFFER_UPDATE_ALL)) {
      // Admin can restore any offer
    } else if (await hasPermissionFn(user.role, permissions.OFFER_UPDATE_OWN)) {
      // Check if user created the offer
      if (offer.created_by && offer.created_by.toString() !== user._id.toString()) {
        throw new AuthorizationError("You don't have permission to restore this offer");
      }
    } else {
      throw new AuthorizationError("You don't have permission to restore offers");
    }

    // Restore by setting active=true
    offer.active = true;
    await offer.save();

    // Get populated offer
    const restoredOffer = await DocumentManager.populateOfferQuery(Offer.findById(offerId)).lean();

    // Add assigned documents to the offer
    await DocumentManager.populateOfferDocuments(restoredOffer);

    // Emit event
    eventEmitter.emit(EVENT_TYPES.OFFER.RESTORED, {
      offer: restoredOffer,
      creator: user,
    });

    logger.info('Offer restored successfully', {
      offer_id: offerId,
      restored_by: user._id,
    });

    return formatOfferInvestmentVolume(restoredOffer);
  } catch (error) {
    logger.error('Error in restoreOffer:', error);
    throw error;
  }
};

/**
 * Execute pending transfer after PDF approval/rejection
 * @param {String} offerId - Offer ID
 * @param {Object} user - User who is executing the action
 * @param {String} action - 'approved' or 'rejected'
 * @returns {Promise<Object>} - Result of the transfer
 */
const executePendingTransfer = async (offerId, user, action = 'approved') => {
  try {
    logger.info(`Executing pending transfer for offer ${offerId}`, { action, user: user._id });

    // Find the offer with pending transfer
    const offer = await Offer.findById(offerId)
      .populate('lead_id')
      .populate('project_id')
      .lean();

    if (!offer) {
      throw new NotFoundError('Offer not found');
    }

    if (!offer.pending_transfer || offer.pending_transfer.status !== 'pending') {
      logger.info(`No pending transfer or already processed for offer ${offerId}`);
      return {
        success: false,
        message: 'No pending transfer or already processed',
      };
    }

    const {
      target_agent_id,
      transfer_notes,
      scheduled_date,
      scheduled_time,
    } = offer.pending_transfer;

    // Get agent details for logging
    const { User } = require('../../../models');
    const [currentAgent, targetAgent] = await Promise.all([
      User.findById(offer.created_by).select('login first_name').lean(),
      User.findById(target_agent_id).select('login first_name').lean(),
    ]);

    if (action === 'approved' || action === 'rejected') {
      // Execute the transfer
      const assignLeadsService = require('../../assignLeadsService');
      await assignLeadsService.bulkReplaceLeadsToProject(
        [offer.lead_id._id.toString()],
        offer.project_id._id.toString(),
        target_agent_id.toString(),
        offer.created_by, // transferredBy (original creator)
        transfer_notes || `Lead transferred after PDF ${action}`,
        false, // isFreshTransfer - keep existing data
        `Agent handover after PDF ${action}`
      );

      // Update offer: mark transfer as completed and add handover metadata
      await Offer.findByIdAndUpdate(offerId, {
        agent_id: target_agent_id,
        'pending_transfer.status': 'completed',
        handover_metadata: {
          original_agent_id: offer.created_by,
          handover_at: new Date(),
          handover_reason: transfer_notes || `Transfer completed after PDF ${action}`,
        },
      });

      // Log the transfer activity
      const { createActivity } = require('../../../services/activityService');
      await createActivity({
        _creator: user._id,
        _subject_id: offer.lead_id._id,
        subject_type: 'Lead',
        action: 'update',
        message: `Lead transferred after PDF ${action}: ${currentAgent?.login || 'Unknown'} → ${targetAgent?.login || 'Unknown'}`,
        type: 'success',
        details: {
          action_type: 'offer_transfer_completed',
          offer_id: offerId,
          offer_title: offer.title,
          from_agent: {
            id: offer.created_by,
            name: currentAgent?.login || currentAgent?.first_name,
          },
          to_agent: {
            id: target_agent_id,
            name: targetAgent?.login || targetAgent?.first_name,
          },
          transfer_notes,
          scheduled_date,
          scheduled_time,
          pdf_action: action,
        },
      });

      logger.info(`Transfer completed successfully for offer ${offerId}`, {
        fromAgent: offer.created_by,
        toAgent: target_agent_id,
        leadId: offer.lead_id._id,
        pdfAction: action,
      });

      return {
        success: true,
        message: `Lead transferred to ${targetAgent?.login || 'target agent'}`,
        transfer: {
          from: currentAgent?.login,
          to: targetAgent?.login,
          leadId: offer.lead_id._id,
        },
      };
    } else {
      logger.warn(`Invalid action for pending transfer: ${action}`);
      return {
        success: false,
        message: 'Invalid action. Must be "approved" or "rejected"',
      };
    }
  } catch (error) {
    logger.error(`Failed to execute pending transfer for offer ${offerId}:`, {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

module.exports = {
  getOfferById,
  createOffer,
  updateOffer,
  deleteOffers,
  updateOffersToOut,
  revertOffersFromOut,
  restoreOffer,
  removeDocumentFromOffer,
  addDocumentsToOffer,
  getDocumentById,
  executePendingTransfer,
};
