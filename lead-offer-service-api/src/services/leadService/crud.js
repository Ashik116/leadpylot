/**
 * Lead Service CRUD Operations
 * Functions for creating, updating, deleting, and restoring leads
 */

const { Lead, Source, Transaction, AssignLeads, Offer } = require('../../models');
const {
  processBatchOperation,
  getStageAndStatusMaps,
  findStageAndStatusIdsByName,
  shouldKeepLeadInactive,
} = require('./utils');
const { eventEmitter, EVENT_TYPES } = require('../events');
const logger = require('../../utils/logger');
const mongoose = require('mongoose');
const { TRANSACTION_TYPES } = require('../../middleware/transactionType');
const voipService = require('../voipService');
const freepbxService = require('./freepbxService');
const emailServiceClient = require('../emailServiceClient');
const { ValidationError, ConflictError } = require('../../utils/errorHandler');


/**
 * Create a new lead or multiple leads
 * @param {Object|Array} leadsData - Lead data or array of lead data
 * @param {Object} creator - User creating the lead (for activity logging)
 * @returns {Promise<Object>} - Created lead(s) with metadata
 */
const createLeads = async (leadsData, creator) => {
  // Get stage and status maps for name lookups
  const { stageMap, statusMap } = await getStageAndStatusMaps();

  // Get default New stage and New status IDs
  const { stageId: newStageId, statusId: newStatusId } = await findStageAndStatusIdsByName(
    'New',
    'New'
  );

  // Helper function to get source price if source_id is provided
  const getSourcePrice = async (sourceId) => {
    if (!sourceId || !mongoose.Types.ObjectId.isValid(sourceId)) {
      return 0;
    }

    try {
      const source = await Source.findById(sourceId);
      return source ? source.price : 0;
    } catch (error) {
      logger.error('Error fetching source price', { error, sourceId });
      return 0;
    }
  };

  // Helper function to populate stage and status names and set defaults
  const populateStageAndStatusNames = (leadData) => {
    // Set default stage_id and status_id if not provided
    if (!leadData.stage_id && newStageId) {
      leadData.stage_id = newStageId;
      leadData.stage = 'New';
      logger.info(`Setting default stage for lead: ${leadData.stage} (${newStageId})`);
    } else if (leadData.stage_id) {
      // Check if we have a stage name already set (from our stage/status assignment)
      if (leadData.stage_name) {
        leadData.stage = leadData.stage_name;
        logger.info(`Using pre-assigned stage for lead: ${leadData.stage} (${leadData.stage_id})`);
      } else if (stageMap[leadData.stage_id.toString()]) {
        leadData.stage = stageMap[leadData.stage_id.toString()].name;
        logger.info(`Setting provided stage for lead: ${leadData.stage}`);
      } else {
        // If stage_id is set but not in map, keep the ID but set a default name
        leadData.stage = 'Unknown Stage';
        logger.warn(`Stage ID ${leadData.stage_id} not found in stage map, using default name`);
      }
    }

    if (!leadData.status_id && newStatusId) {
      leadData.status_id = newStatusId;
      leadData.status = 'New';
      logger.info(`Setting default status for lead: ${leadData.status} (${newStatusId})`);
    } else if (leadData.status_id) {
      // Check if we have a status name already set (from our stage/status assignment)
      if (leadData.status_name) {
        leadData.status = leadData.status_name;
        logger.info(
          `Using pre-assigned status for lead: ${leadData.status} (${leadData.status_id})`
        );
      } else if (statusMap[leadData.status_id.toString()]) {
        leadData.status = statusMap[leadData.status_id.toString()].name;
        logger.info(`Setting provided status for lead: ${leadData.status}`);
      } else {
        // If status_id is set but not in map, keep the ID but set a default name
        leadData.status = 'Unknown Status';
        logger.warn(`Status ID ${leadData.status_id} not found in status map, using default name`);
      }
    }

    // Ensure the fields are properly set in the object
    logger.info('Final lead data stage/status:', {
      stage_id: leadData.stage_id ? leadData.stage_id.toString() : null,
      status_id: leadData.status_id ? leadData.status_id.toString() : null,
      stage: leadData.stage,
      status: leadData.status,
    });

    return leadData;
  };

  // Handle single lead creation
  if (!Array.isArray(leadsData)) {
    logger.info(`[DEBUG] Processing SINGLE lead creation`);
    try {
      // If leadPrice is provided in the data, use it; otherwise fetch from source
      if (leadsData.leadPrice !== undefined) {
        // Use the provided leadPrice from request body
        logger.info(`Using provided lead price: ${leadsData.leadPrice}`);
      } else if (leadsData.source_id) {
        // Fallback to fetching price from source if leadPrice not provided
        const sourcePrice = await getSourcePrice(leadsData.source_id);
        leadsData.leadPrice = sourcePrice;
        logger.info(`Fetched lead price from source: ${sourcePrice}`);
      }

      // Populate stage and status names
      leadsData = populateStageAndStatusNames(leadsData);

      const newLead = new Lead(leadsData);
      // Use the duplicate_status if it's already set, otherwise default to 0
      newLead.duplicate_status =
        leadsData.duplicate_status !== undefined ? leadsData.duplicate_status : 0;

      // Generate and set VOIP extension
      try {
        const extension = await voipService.setupVoipExtensionForLead(newLead);
        newLead.voip_extension = extension;
        logger.info(`Set VOIP extension ${extension} for lead ${newLead._id}`);
      } catch (voipError) {
        logger.error(`Failed to set up VOIP extension for lead ${newLead._id}`, {
          error: voipError.message,
        });
        // Continue with lead creation even if VOIP extension setup fails
      }

      await newLead.save();
      // Skip indexing in Elasticsearch
      // await indexLead(newLead);

      // Create FreePBX extension configuration if VOIP extension was set and FreePBX is enabled
      if (newLead.voip_extension && process.env.FREEPBX_ENABLED === 'true') {
        try {
          await freepbxService.createLeadExtension({
            extension: newLead.voip_extension,
            name: newLead.contact_name || 'Lead',
            phone: newLead.phone || newLead.email_from || '',
          });
          logger.info(
            `Created FreePBX extension configuration for lead ${newLead._id}, extension: ${newLead.voip_extension}`
          );
        } catch (freepbxError) {
          logger.error(`Failed to create FreePBX extension configuration for lead ${newLead._id}`, {
            error: freepbxError.message,
            extension: newLead.voip_extension,
          });
          // Continue with lead creation even if FreePBX configuration fails
        }
      } else if (newLead.voip_extension) {
        logger.info(
          `FreePBX integration disabled - skipping extension creation for lead ${newLead._id}, extension: ${newLead.voip_extension}`
        );
      }

      // Create a transaction for the new lead
      const transactionData = {
        user_id: creator ? creator._id : null,
        user_role: creator ? creator.role : null,
        type: TRANSACTION_TYPES.LEAD,
        lead_id: newLead._id,
        amount: newLead.leadPrice || 0,
      };

      try {
        const transaction = new Transaction(transactionData);
        await transaction.save();

        // Add transaction reference to the lead
        newLead.transaction_id = transaction._id;
        await newLead.save();

        logger.info(`Created transaction for lead ${newLead._id}`, {
          transactionId: transaction._id,
        });
      } catch (transactionError) {
        logger.error('Error creating transaction for lead', {
          error: transactionError,
          leadId: newLead._id,
        });
      }

      // Emit event for activity logging
      if (creator) {
        eventEmitter.emit(EVENT_TYPES.LEAD.CREATED, {
          lead: newLead,
          creator,
        });
      }

      // Update lead count for the source if applicable
      if (newLead.source_id) {
        try {
          await Source.findByIdAndUpdate(
            newLead.source_id,
            { $inc: { lead_count: 1 } },
            { new: true }
          );
          logger.info(`Updated lead count for source ${newLead.source_id} (+1)`);
        } catch (error) {
          logger.error(`Failed to update lead count for source ${newLead.source_id}`, { error });
          // Continue even if source update fails
        }
      }

      return {
        message: 'Lead created successfully',
        created: [newLead],
        failed: [],
      };
    } catch (error) {
      logger.error('Error creating single lead', { error });
      throw error;
    }
  }

  // Handle multiple lead creation with batch FreePBX optimization
  const createdLeads = [];
  const failedLeads = [];
  const freepbxExtensionsData = []; // Collect FreePBX extension data for batch creation

  // Process all leads first
  for (const leadData of leadsData) {
    try {
      // If leadPrice is provided in the data, use it; otherwise fetch from source
      if (leadData.leadPrice !== undefined) {
        // Use the provided leadPrice from request body
        logger.info(`Using provided lead price: ${leadData.leadPrice}`);
      } else if (leadData.source_id) {
        // Fallback to fetching price from source if leadPrice not provided
        const sourcePrice = await getSourcePrice(leadData.source_id);
        leadData.leadPrice = sourcePrice;
        logger.info(`Fetched lead price from source: ${sourcePrice}`);
      }

      // Populate stage and status names
      populateStageAndStatusNames(leadData);

      const newLead = new Lead(leadData);

      // Use pre-set duplicate_status if available, otherwise check or set default
      if (leadData.duplicate_status !== undefined) {
        // Use the duplicate_status that was pre-set by our duplicate checking function
        newLead.duplicate_status = leadData.duplicate_status;
      } else if (!Array.isArray(leadsData)) {
        // Only for single lead creation, not bulk imports
        newLead.duplicate_status = 0; // Skip Elasticsearch duplicate checking
      } else {
        // Default for bulk imports without pre-set duplicate_status
        newLead.duplicate_status = 0;
      }

      // Generate and set VOIP extension
      try {
        const extension = await voipService.setupVoipExtensionForLead(newLead);
        newLead.voip_extension = extension;
        logger.info(`Set VOIP extension ${extension} for lead ${newLead._id}`);
      } catch (voipError) {
        logger.error(`Failed to set up VOIP extension for lead ${newLead._id}`, {
          error: voipError.message,
        });
        // Continue with lead creation even if VOIP extension setup fails
      }

      await newLead.save();

      // Skip indexing in Elasticsearch
      // await indexLead(newLead);

      // Collect FreePBX extension data for batch creation (instead of individual calls)
      if (newLead.voip_extension) {
        freepbxExtensionsData.push({
          extension: newLead.voip_extension,
          leadId: newLead._id.toString(), // Use MongoDB ObjectId as the identifier
          phone: newLead.phone || newLead.email_from || '',
        });
      }

      // Create a transaction for the new lead
      const transactionData = {
        user_id: creator ? creator._id : null,
        user_role: creator ? creator.role : null,
        type: TRANSACTION_TYPES.LEAD,
        lead_id: newLead._id,
        amount: newLead.leadPrice || 0,
      };

      try {
        const transaction = new Transaction(transactionData);
        await transaction.save();

        // Add transaction reference to the lead
        newLead.transaction_id = transaction._id;
        await newLead.save();

        logger.info(`Created transaction for lead ${newLead._id}`, {
          transactionId: transaction._id,
        });
      } catch (transactionError) {
        logger.error('Error creating transaction for lead', {
          error: transactionError,
          leadId: newLead._id,
        });
      }

      createdLeads.push(newLead);

      // Emit event for activity logging
      if (creator) {
        eventEmitter.emit(EVENT_TYPES.LEAD.CREATED, {
          lead: newLead,
          creator,
        });
      }
    } catch (error) {
      console.log('❌ error', error);
      logger.error('Error creating lead', { error, leadData });
      failedLeads.push({
        data: leadData,
        error: error.message || 'Server error',
      });
    }
  }

  // Batch create FreePBX extensions for all successfully created leads
  if (freepbxExtensionsData.length > 0) {
    try {
      logger.info(`Creating FreePBX extensions in batch for ${freepbxExtensionsData.length} leads`);
      const batchResult = await freepbxService.batchCreateLeadExtensions(freepbxExtensionsData);

      logger.info(
        `FreePBX batch creation completed: ${batchResult.successful.length} successful, ${batchResult.failed.length} failed`
      );

      // Log any FreePBX failures (but don't fail the lead creation)
      if (batchResult.failed.length > 0) {
        batchResult.failed.forEach((failure) => {
          logger.error(
            `FreePBX extension creation failed for extension ${failure.extension}:`,
            failure.error
          );
        });
      }
    } catch (freepbxError) {
      logger.error('FreePBX batch creation failed:', freepbxError);
      // Continue with lead creation success even if FreePBX batch fails
    }
  }

  // Update lead counts for each source used
  const sourceCountMap = {};

  // Count leads created for each source
  createdLeads.forEach((lead) => {
    if (lead.source_id) {
      const sourceId = lead.source_id.toString();
      sourceCountMap[sourceId] = (sourceCountMap[sourceId] || 0) + 1;
    }
  });

  // Update lead counts in the database
  const sourceUpdatePromises = Object.entries(sourceCountMap).map(async ([sourceId, count]) => {
    try {
      await Source.findByIdAndUpdate(sourceId, { $inc: { lead_count: count } }, { new: true });
      logger.info(`Updated lead count for source ${sourceId} (+${count})`);
    } catch (error) {
      logger.error(`Failed to update lead count for source ${sourceId}`, { error });
    }
  });

  // Wait for all source updates to completed
  await Promise.all(sourceUpdatePromises);
  console.log('✅ Promise.all');

  return {
    message: `Successfully created ${createdLeads.length} leads`,
    created: createdLeads,
    failed: failedLeads,
  };
};

/**
 * Update a lead or multiple leads
 * @param {string|Array} leadIds - Lead ID or array of lead IDs
 * @param {Object} updateData - Data to update
 * @param {Object} user - User updating the lead (for activity logging)
 * @returns {Promise<Object>} - Updated lead(s) with metadata
 */
const updateLeadData = async (leadIds, updateData, user) => {
  // Get stage and status maps for name lookups
  const { stageMap, statusMap } = await getStageAndStatusMaps();

  return processBatchOperation(
    leadIds,
    async (lead) => {
      // Store original lead data for comparison
      const originalLead = { ...lead.toObject() };

      // Check if there are any actual changes to make
      let hasActualChanges = false;
      Object.entries(updateData).forEach(([key, value]) => {
        // Check if the value is actually different from the original
        // Handle special cases for ObjectId and Date comparisons
        if (key === '_id' || key === 'stage_id' || key === 'status_id') {
          // For ObjectIds, compare string representations
          const origVal = originalLead[key] ? originalLead[key].toString() : null;
          const newVal = value ? value.toString() : null;
          if (origVal !== newVal) hasActualChanges = true;
        } else if (originalLead[key] instanceof Date || value instanceof Date) {
          // For dates, compare ISO strings
          const origDate = originalLead[key] ? new Date(originalLead[key]).toISOString() : null;
          const newDate = value ? new Date(value).toISOString() : null;
          if (origDate !== newDate) hasActualChanges = true;
        } else if (originalLead[key] !== value) {
          // For other types, direct comparison
          hasActualChanges = true;
        }
      });

      // Only update if there are actual changes
      if (!hasActualChanges) {
        return originalLead; // Return original lead if no changes
      }

      // Check for duplicate email if email_from is being updated
      if (updateData.email_from) {
        const normalizedEmail = updateData.email_from.toString().toLowerCase().trim();
        
        // Only check for duplicates if the email is actually changing
        const originalEmail = originalLead.email_from 
          ? originalLead.email_from.toString().toLowerCase().trim() 
          : '';
        
        if (normalizedEmail && normalizedEmail !== originalEmail) {
          // Check if another lead already has this email (case-insensitive)
          const existingLead = await Lead.findOne({
            _id: { $ne: lead._id }, // Exclude the current lead
            $expr: {
              $eq: [
                { $toLower: { $trim: { input: '$email_from' } } },
                normalizedEmail
              ]
            }
          });

          if (existingLead) {
            throw new ValidationError(
              `Email "${updateData.email_from}" already exists for another lead and cannot be updated`
            );
          }
        }
      }

      // Check for duplicate lead_source_no if it's being updated
      if (updateData.lead_source_no !== undefined && updateData.lead_source_no !== null) {
        const normalizedLeadSourceNo = updateData.lead_source_no.toString().trim();
        
        // Only check for duplicates if the lead_source_no is actually changing
        const originalLeadSourceNo = originalLead.lead_source_no 
          ? originalLead.lead_source_no.toString().trim() 
          : '';
        
        // Only validate if the value is actually changing and is not empty
        if (normalizedLeadSourceNo && normalizedLeadSourceNo !== originalLeadSourceNo) {
          // Check if another lead already has this lead_source_no
          // Check all leads (both active and inactive) to ensure uniqueness
          // Use $expr to handle potential whitespace in stored values
          const existingLead = await Lead.findOne({
            _id: { $ne: lead._id }, // Exclude the current lead
            $expr: {
              $and: [
                { $ne: ['$lead_source_no', null] },
                { $ne: ['$lead_source_no', ''] },
                {
                  $eq: [
                    { $trim: { input: { $ifNull: ['$lead_source_no', ''] } } },
                    normalizedLeadSourceNo
                  ]
                }
              ]
            }
          });

          if (existingLead) {
            logger.warn('Duplicate lead_source_no detected', {
              leadId: lead._id,
              attemptedValue: normalizedLeadSourceNo,
              existingLeadId: existingLead._id,
              existingLeadContact: existingLead.contact_name || existingLead.email_from,
              existingLeadSourceNo: existingLead.lead_source_no
            });
            throw new ConflictError(
              `Lead source number "${updateData.lead_source_no}" already exists for another lead (ID: ${existingLead._id}) and must be unique`
            );
          }
        }
      }

      // If stage_id is being updated, also update the stage name
      if (updateData.stage_id) {
        const stageId = updateData.stage_id.toString();
        if (stageMap[stageId]) {
          updateData.stage = stageMap[stageId].name;
        }
      }

      // If status_id is being updated, also update the status name
      if (updateData.status_id) {
        const statusId = updateData.status_id.toString();
        if (statusMap[statusId]) {
          updateData.status = statusMap[statusId].name;
        }
      }

      // Determine the new stage and status names for active status check
      // Only check if stage or status is actually being changed
      const isStageChanging = updateData.stage_id || updateData.stage;
      const isStatusChanging = updateData.status_id || updateData.status;
      
      if (isStageChanging || isStatusChanging) {
        const newStageName = updateData.stage || lead.stage;
        const newStatusName = updateData.status || lead.status;

        // Check if status/stage change should keep lead inactive or make it active
        const shouldRemainInactive = await shouldKeepLeadInactive(newStageName, newStatusName);
        
        if (shouldRemainInactive) {
          updateData.active = false;
          if (lead.active !== false) {
            updateData.prev_stage_id = lead.stage_id;
            updateData.prev_status_id = lead.status_id;
            updateData.prev_stage = lead.stage;
            updateData.prev_status = lead.status;
          }
          logger.info(
            `🔄 INACTIVE STATUS: Lead "${lead.contact_name || lead.email_from}" status changed to "${newStatusName}" in stage "${newStageName}" - setting active to false`
          );
        } else {
          // Case 3: Any other status change - make lead active
          updateData.active = true;
          logger.info(
            `🔄 ACTIVE STATUS: Lead "${lead.contact_name || lead.email_from}" status changed to "${newStatusName}" in stage "${newStageName}" - setting active to true`
          );
        }
      }

      // Update the lead
      const updatedLead = await Lead.findByIdAndUpdate(lead._id, updateData, {
        new: true,
      });

      // Update FreePBX if phone number changed
      if (updateData.phone && originalLead.phone !== updateData.phone) {
        try {
          logger.info(`Phone number changed for lead ${lead._id}, updating FreePBX`);
          await freepbxService.updateLeadExtension({
            leadId: lead._id.toString(),
            phone: updateData.phone,
          });
        } catch (freepbxError) {
          logger.error(`Failed to update FreePBX for lead ${lead._id}:`, freepbxError);
          // Continue with lead update even if FreePBX update fails
        }
      }

      // Emit event for activity logging
      if (user && hasActualChanges) {
        // Check if status, stage, or project has changed - using string comparison for proper equality check
        const statusChanged =
          String(originalLead.status_id || '') !== String(updatedLead.status_id || '');
        const stageChanged =
          String(originalLead.stage_id || '') !== String(updatedLead.stage_id || '');
        const useStatusChanged = originalLead.use_status !== updatedLead.use_status;
        const projectChanged = String(originalLead.team_id || '') !== String(updatedLead.team_id || '');
        const agentChanged = String(originalLead.user_id || '') !== String(updatedLead.user_id || '');

        // Check for specific field changes and create a detailed change log
        const fieldChanges = {};
        // old
        // const humanReadableFields = {
        //   contact_name: 'Contact Name',
        //   email_from: 'Email',
        //   phone: 'Phone Number',
        //   expected_revenue: 'Expected Revenue',
        //   lead_date: 'Lead Date',
        //   lead_source_no: 'Lead Source Number',
        //   source_id: 'Source',
        //   usable: 'Usability',
        //   duplicate_status: 'Duplicate Status',
        // };

        // updated
        const humanReadableFields = {
          contact_name: 'Contact',
          email_from: 'Email',
          phone: 'Phone',
          expected_revenue: 'Exp. Revenue',
          lead_date: 'Date',
          lead_source_no: 'Partner ID',
          source_id: 'Source',
          usable: 'Usability',
          duplicate_status: 'Duplicate',
        };
        


        // Identify specific changes
        Object.keys(updateData).forEach((key) => {
          // Skip status-related fields as they're handled separately
          if (!['status_id', 'stage_id', 'use_status'].includes(key)) {
            // Only include if the value actually changed
            if (originalLead[key] !== updatedLead[key]) {
              fieldChanges[key] = {
                field: humanReadableFields[key] || key,
                oldValue: originalLead[key],
                newValue: updatedLead[key],
              };
            }
          }
        });

        // Handle project changes with notifications
        if (projectChanged) {
          try {
            // Get project and agent information for notifications
            const [newProject, newAgent] = await Promise.all([
              updatedLead.team_id ? mongoose.model('Team').findById(updatedLead.team_id).lean() : null,
              updatedLead.user_id ? mongoose.model('User').findById(updatedLead.user_id).lean() : null
            ]);

            if (newProject && newAgent) {
              // Import realtimeNotificationService dynamically to avoid circular dependencies
              const realtimeNotificationService = require('../realtimeNotificationService');
              
              // Create a lead transfer notification for the receiving agent
              await realtimeNotificationService.notifyAgentOfLeadTransfer(
                updatedLead,
                user,
                newAgent,
                newProject,
                null // No batch info for individual changes
              );

              logger.info('Project change notification sent', {
                leadId: updatedLead._id,
                leadName: updatedLead.contact_name,
                fromProject: originalLead.team_id,
                toProject: updatedLead.team_id,
                toAgent: newAgent.login,
                projectName: newProject.name
              });
            }
          } catch (notificationError) {
            logger.error('Failed to send project change notification', {
              error: notificationError.message,
              leadId: updatedLead._id,
              projectId: updatedLead.team_id,
              agentId: updatedLead.user_id
            });
          }

          // Sync email projects when lead project changes
          try {
            const emailSyncResult = await emailServiceClient.updateEmailProjectsForLeadChange(
              updatedLead._id,
              updatedLead.team_id,
              user._id,
              `Lead project changed from ${originalLead.team_id ? 'project ID: ' + originalLead.team_id : 'no project'} to project: ${newProject ? newProject.name : 'unknown project'}`
            );

            logger.info('📧 Email projects synced for lead project change', {
              leadId: updatedLead._id,
              leadName: updatedLead.contact_name,
              emailsUpdated: emailSyncResult.emailsUpdated,
              emailsFound: emailSyncResult.emailsFound,
              newProjectName: emailSyncResult.newProjectName,
              processingTime: emailSyncResult.processingTime
            });
          } catch (emailSyncError) {
            logger.error('❌ Failed to sync email projects for lead project change', {
              error: emailSyncError.message,
              leadId: updatedLead._id,
              leadName: updatedLead.contact_name,
              newProjectId: updatedLead.team_id,
              stack: emailSyncError.stack
            });
            // Don't throw - email sync failure shouldn't block lead updates
          }
        }

        // First, handle regular updates if there are any non-status changes
        if (Object.keys(fieldChanges).length > 0) {
          eventEmitter.emit(EVENT_TYPES.LEAD.UPDATED, {
            lead: updatedLead,
            creator: user,
            changes: fieldChanges,
            changeDescription: Object.values(fieldChanges)
              .map((change) => {
                let oldVal = change.oldValue;
                let newVal = change.newValue;
                let field = change.field;
                if (field === 'checked') {
                  oldVal = oldVal ? 'yes' : 'no';
                  newVal = newVal ? 'yes' : 'no';
                }
                return `${change.field}: "${oldVal}" -> "${newVal}"`;
              })
              .join(', '),
          });
        }

        // Then handle status/stage changes separately
        // Create a combined log for stage and status changes
        if (stageChanged || statusChanged) {
          // Get original stage and status NAMES (not IDs)
          const originalStage = originalLead.stage || 'none';
          const originalStatus = originalLead.status || 'none';

          // Get updated stage and status NAMES (not IDs)
          const updatedStage = updatedLead.stage || 'none';
          const updatedStatus = updatedLead.status || 'none';

          // Create combined status strings
          const oldCombinedStatus = `Stage: ${originalStage} -> ${originalStatus}`;
          const newCombinedStatus = `Stage: ${updatedStage} -> ${updatedStatus}`;

          // Double-check that the combined strings are actually different
          // This prevents logging when the string representations are the same
          if (oldCombinedStatus !== newCombinedStatus) {
            // Emit a single event for the combined change
            eventEmitter.emit(EVENT_TYPES.LEAD.STATUS_CHANGED, {
              lead: updatedLead,
              creator: user,
              oldStatus: oldCombinedStatus,
              newStatus: newCombinedStatus,
              isCombined: true, // Flag to indicate this is a combined status change
            });
          }
        }
        // Only log use_status changes if neither stage nor status changed
        else if (useStatusChanged) {
          const oldStatus = originalLead.use_status || 'none';
          const newStatus = updatedLead.use_status || 'none';

          // Only emit if there's an actual change in the string representation
          if (oldStatus !== newStatus) {
            eventEmitter.emit(EVENT_TYPES.LEAD.STATUS_CHANGED, {
              lead: updatedLead,
              creator: user,
              oldStatus: oldStatus,
              newStatus: newStatus,
            });
          }
        }
      }

      return updatedLead;
    },
    'update',
    1200
  );
};

/**
 * Delete a lead or multiple leads (soft delete)
 * @param {string|Array} leadIds - Lead ID or array of lead IDs
 * @param {Object} user - User deleting the lead (for activity logging)
 * @returns {Promise<Object>} - Deleted lead(s) with metadata
 */
const deleteLeadData = async (leadIds, user) => {
  return processBatchOperation(
    leadIds,
    async (lead) => {
      const deletedLead = await Lead.findByIdAndUpdate(lead._id, { active: false }, { new: true });

      // Emit event for activity logging
      if (user) {
        eventEmitter.emit(EVENT_TYPES.LEAD.DELETED, {
          lead: deletedLead,
          creator: user,
        });
      }

      return deletedLead._id;
    },
    'delete',
    1201
  );
};

/**
 * Restore a lead or multiple leads
 * @param {string|Array} leadIds - Lead ID or array of lead IDs
 * @param {Object} user - User restoring the lead (for activity logging)
 * @returns {Promise<Object>} - Restored lead(s) with metadata
 */
const restoreLeadData = async (leadIds, user) => {
  return processBatchOperation(
    leadIds,
    async (lead) => {
      const restoredLead = await Lead.findByIdAndUpdate(lead._id, { active: true }, { new: true });

      // Emit event for activity logging
      if (user) {
        eventEmitter.emit(EVENT_TYPES.LEAD.RESTORED, {
          lead: restoredLead,
          creator: user,
        });
      }

      return restoredLead._id;
    },
    'restore',
    1202
  );
};

/**
 * Permanently delete a lead or multiple leads from the database
 * @param {string|Array} leadIds - Lead ID or array of lead IDs
 * @param {Object} user - User permanently deleting the lead (for activity logging)
 * @returns {Promise<Object>} - Result with details of permanently deleted leads
 */
const permanentlyDeleteLead = async (leadIds, user) => {
  return processBatchOperation(
    leadIds,
    async (lead) => {
      // Find any lead assignments and delete them first
      await AssignLeads.deleteMany({ lead_id: lead._id });

      // Delete the lead permanently
      const deletedLead = await Lead.findByIdAndDelete(lead._id);

      if (!deletedLead) {
        throw new Error(`Lead with ID ${lead._id} not found`);
      }

      // Emit event for activity logging
      if (user) {
        eventEmitter.emit(EVENT_TYPES.LEAD.PERMANENTLY_DELETED, {
          lead: { _id: lead._id, contact_name: lead.contact_name },
          creator: user,
        });
      }

      return deletedLead._id;
    },
    'permanent-delete',
    1203
  );
};

/**
 * Update secondary email for a lead
 * @param {string} leadId - Lead ID
 * @param {string|null} secondaryEmail - Secondary email address or null to clear
 * @param {Object} user - User updating the lead (for activity logging)
 * @returns {Promise<Object>} - Updated lead with metadata
 */
const updateSecondaryEmail = async (leadId, secondaryEmail, user) => {
  // Validate lead ID
  if (!leadId) {
    throw new Error('Lead ID is required');
  }

  // Convert leadId to ObjectId if it's a string
  const leadObjectId = typeof leadId === 'string' ? new mongoose.Types.ObjectId(leadId) : leadId;

  // Get the lead first to check current state
  const lead = await Lead.findById(leadObjectId);

  if (!lead) {
    throw new Error('Lead not found');
  }

  const updateData = {};

  // Validate and handle secondary_email if provided
  if (secondaryEmail !== undefined) {
    if (secondaryEmail !== null && secondaryEmail !== '') {
      const emailRegex = /^\S+@\S+\.\S+$/;
      if (!emailRegex.test(secondaryEmail)) {
        throw new ValidationError('secondary_email must be a valid email address');
      }

      const normalizedEmail = secondaryEmail.toLowerCase().trim();
      const currentEmailFromNormalized = lead.email_from ? lead.email_from.toLowerCase().trim() : null;
      const currentSecondaryNormalized = lead.secondary_email ? lead.secondary_email.toLowerCase().trim() : null;

      // Prevent setting secondary_email to the same as email_from in the same lead
      if (normalizedEmail === currentEmailFromNormalized) {
        throw new ConflictError('This email address is already in use. Please use a different email address');
      }

      // Prevent setting secondary_email if it's already set as secondary_email on this lead
      if (normalizedEmail === currentSecondaryNormalized) {
        throw new ConflictError('This email address is already in use. Please use a different email address');
      }

      // Check if This email address is already in use. Please use a different email address in ANY lead in the database (must be unique across ALL leads)
      const existingLead = await Lead.findOne({
        _id: { $ne: leadObjectId }, // Exclude current lead
        $or: [
          { secondary_email: normalizedEmail },
          { email_from: normalizedEmail },
        ],
      });

      if (existingLead) {
        throw new ConflictError('This email address is already in use. Please use a different email address');
      }

      updateData.secondary_email = secondaryEmail;
    } else {
      updateData.secondary_email = null;
    }
  }

  // Ensure updateData is not empty
  if (Object.keys(updateData).length === 0) {
    throw new Error('No data to update');
  }

  const hadNoSecondaryEmail = !lead.secondary_email;
  const isSettingNewEmail = updateData.secondary_email && updateData.secondary_email !== null;

  // Update the lead directly using MongoDB
  let updatedLead = await Lead.findByIdAndUpdate(
    leadId,
    { $set: updateData },
    { new: true, runValidators: false }
  );

  if (!updatedLead) {
    throw new Error('Lead not found after update');
  }

  // First time adding a secondary email — auto-swap to make it primary
  if (hadNoSecondaryEmail && isSettingNewEmail) {
    const swapData = {
      email_from: updatedLead.secondary_email,
      secondary_email: updatedLead.email_from,
    };

    updatedLead = await Lead.findByIdAndUpdate(
      leadId,
      { $set: swapData },
      { new: true, runValidators: false }
    );

    if (!updatedLead) {
      throw new Error('Lead not found after email swap');
    }

    if (user) {
      const swapDescription = `Primary email changed: "${swapData.email_from}" made primary. email_from "${lead.email_from}" ↔ secondary_email "${updateData.secondary_email}"`;
      eventEmitter.emit(EVENT_TYPES.LEAD.UPDATED, {
        lead: updatedLead,
        creator: user,
        changes: ['email_from', 'secondary_email'],
        changeDescription: swapDescription,
      });
    }
  }

  // Emit activity log event if user is provided
  if (user) {
    // Build change description for activity log
    const oldSecondary = lead.secondary_email || 'none';
    const newSecondary = updateData.secondary_email || 'none';
    const changeDescription = `secondary_email: "${oldSecondary}" -> "${newSecondary}"`;

    eventEmitter.emit(EVENT_TYPES.LEAD.UPDATED, {
      lead: updatedLead,
      creator: user,
      changes: Object.keys(updateData),
      changeDescription: changeDescription,
    });
  }

  return updatedLead;
};

/**
 * Make an email primary by swapping email_from and secondary_email
 * @param {string} leadId - Lead ID
 * @param {string} email - Email address to make primary
 * @param {Object} user - User updating the lead (for activity logging)
 * @returns {Promise<Object>} - Updated lead with metadata
 */
const makePrimaryEmail = async (leadId, email, user) => {
  // Validate lead ID
  if (!leadId) {
    throw new Error('Lead ID is required');
  }

  // Validate email
  if (!email || typeof email !== 'string') {
    throw new Error('email is required and must be a valid email address');
  }

  // Validate email format
  const emailRegex = /^\S+@\S+\.\S+$/;
  if (!emailRegex.test(email)) {
    throw new Error('email must be a valid email address');
  }

  // Get the lead first to check current state
  const lead = await Lead.findById(leadId);

  if (!lead) {
    throw new Error('Lead not found');
  }

  const currentEmailFrom = lead.email_from;
  const currentSecondaryEmail = lead.secondary_email;

  // Normalize emails for comparison (lowercase)
  const normalizedEmail = email.toLowerCase().trim();
  const normalizedEmailFrom = currentEmailFrom ? currentEmailFrom.toLowerCase().trim() : null;
  const normalizedSecondaryEmail = currentSecondaryEmail
    ? currentSecondaryEmail.toLowerCase().trim()
    : null;

  // Check which field contains this email
  let targetField = null;
  if (normalizedEmailFrom === normalizedEmail) {
    targetField = 'email_from';
  } else if (normalizedSecondaryEmail === normalizedEmail) {
    targetField = 'secondary_email';
  } else {
    throw new Error(`Email "${email}" not found in email_from or secondary_email fields`);
  }

  // If the email is already in email_from (primary field), no swap needed
  if (targetField === 'email_from') {
    throw new Error('This email is already the primary email (in email_from field)');
  }

  // If targetField is secondary_email, swap it to email_from
  const updateData = {};

  // secondary_email becomes primary (email_from)
  // Swap: secondary_email becomes email_from, email_from becomes secondary_email
  if (!currentSecondaryEmail) {
    throw new Error('Cannot swap emails because secondary_email is empty');
  }

  const newEmailFrom = currentSecondaryEmail;
  const newSecondaryEmail = currentEmailFrom;

  updateData.email_from = newEmailFrom;
  updateData.secondary_email = newSecondaryEmail;

  // Update the lead with swapped emails
  const updatedLead = await Lead.findByIdAndUpdate(
    leadId,
    { $set: updateData },
    { new: true, runValidators: false }
  );

  if (!updatedLead) {
    throw new Error('Lead not found after update');
  }

  // Emit activity log event if user is provided
  if (user) {
    const changeDescription = `Primary email changed: "${email}" made primary. email_from "${currentEmailFrom}" ↔ secondary_email "${currentSecondaryEmail}"`;

    eventEmitter.emit(EVENT_TYPES.LEAD.UPDATED, {
      lead: updatedLead,
      creator: user,
      changes: ['email_from', 'secondary_email'],
      changeDescription: changeDescription,
    });
  }

  return updatedLead;
};

/**
 * Update offer_calls field for a lead
 * Increases or decreases the offer_calls value based on query parameters
 * @param {String} leadId - Lead ID
 * @param {Number} increase - Positive number to increase (optional)
 * @param {Number} decrease - Positive number to decrease (optional)
 * @param {Object} user - User updating the lead (for activity logging)
 * @returns {Promise<Object>} - Updated lead
 */
const updateOfferCalls = async (leadId, increase, decrease, user) => {
  if (!mongoose.Types.ObjectId.isValid(leadId)) {
    throw new ValidationError('Invalid lead ID format');
  }

  // Find the lead
  const lead = await Lead.findById(leadId);
  if (!lead) {
    throw new ValidationError('Lead not found');
  }

  // Get current offer_calls value (default to 0 if not set)
  const currentValue = lead.offer_calls || 0;

  // Calculate new value
  let newValue = currentValue;
  if (increase !== undefined && increase !== null) {
    newValue = currentValue + Number(increase);
    
    // Validate: offer_calls cannot exceed 4
    if (newValue > 4) {
      throw new ValidationError(`offer_calls cannot exceed 4. Current value: ${currentValue}, attempted increase: ${increase}, would result in: ${newValue}`);
    }
  } else if (decrease !== undefined && decrease !== null) {
    newValue = Math.max(0, currentValue - Number(decrease)); // Ensure it doesn't go below 0
  }

  // Update the lead
  const updatedLead = await Lead.findByIdAndUpdate(
    leadId,
    { $set: { offer_calls: newValue } },
    { new: true, runValidators: true }
  );

  if (!updatedLead) {
    throw new Error('Lead not found after update');
  }

  // Update related offers' current_stage based on offer_calls value
  // Update ALL offers in offer-related stages (offer, call_1, call_2, call_3, call_4)
  // This ensures synchronization works for both increases and decreases
  const offerStages = ['offer', 'call_1', 'call_2', 'call_3', 'call_4'];

  if (newValue > 0 && newValue <= 4) {
    // Determine the new stage based on offer_calls value
    const newStage = `call_${newValue}`;
    
    // Update all offers for this lead that are in any offer stage
    await Offer.updateMany(
      {
        lead_id: leadId,
        current_stage: { $in: offerStages },
        active: true
      },
      {
        $set: { current_stage: newStage }
      }
    );
  } else if (newValue > 4) {
    // Cap at call_4 if offer_calls exceeds 4
    await Offer.updateMany(
      {
        lead_id: leadId,
        current_stage: { $in: offerStages },
        active: true
      },
      {
        $set: { current_stage: 'call_4' }
      }
    );
  } else if (newValue === 0) {
    // If offer_calls is reset to 0, revert all offer stages back to 'offer'
    await Offer.updateMany(
      {
        lead_id: leadId,
        current_stage: { $in: offerStages },
        active: true
      },
      {
        $set: { current_stage: 'offer' }
      }
    );
  }

  // Emit activity log event if user is provided
  if (user) {
    const operation = increase !== undefined ? 'increased' : 'decreased';
    const amount = increase !== undefined ? increase : decrease;
    const changeDescription = `offer_calls ${operation} by ${amount} (${currentValue} → ${newValue})`;

    eventEmitter.emit(EVENT_TYPES.LEAD.UPDATED, {
      lead: updatedLead,
      creator: user,
      changes: ['offer_calls'],
      changeDescription: changeDescription,
    });
  }

  return updatedLead;
};

/**
 * Batch create leads using insertMany for optimal performance
 * This function is optimized for bulk imports (1000+ leads)
 * Uses pre-loaded reference data to avoid per-lead database queries
 * 
 * @param {Array} leadsData - Array of lead data objects
 * @param {Object} creator - User creating the leads
 * @param {Object} referenceData - Pre-loaded reference data (sourcesPriceMap, existingExtensionsSet)
 * @param {Function} progressCallback - Optional callback for progress updates
 * @returns {Promise<Object>} - Created leads with metadata
 */
const createLeadsBatch = async (leadsData, creator, referenceData, progressCallback) => {
  const startTime = Date.now();
  const CHUNK_SIZE = 5000;
  
  logger.info(`🚀 Starting batch lead creation for ${leadsData.length} leads`);
  
  // Get stage and status maps for name lookups
  const { stageMap, statusMap } = await getStageAndStatusMaps();
  
  // Get default New stage and New status IDs
  const { stageId: newStageId, statusId: newStatusId } = await findStageAndStatusIdsByName('New', 'New');
  
  // Pre-generate all VOIP extensions in-memory (no DB queries)
  const voipService = require('../voipService');
  const extensions = voipService.generateBatchExtensions(
    leadsData.length,
    referenceData?.existingExtensionsSet || new Set()
  );
  
  if (progressCallback) {
    progressCallback({
      phase: 'database_insertion',
      description: 'Preparing lead documents...',
      percentage: 75
    });
  }
  
  // Prepare all lead documents
  const leadDocuments = [];
  const freepbxExtensionsData = [];
  
  for (let i = 0; i < leadsData.length; i++) {
    const leadData = leadsData[i];
    
    // Use pre-loaded source price instead of DB query
    if (leadData.source_id && leadData.leadPrice === undefined) {
      const sourcePrice = referenceData?.sourcesPriceMap?.get(leadData.source_id.toString()) || 0;
      leadData.leadPrice = sourcePrice;
    }
    
    // Set default stage and status if not provided
    if (!leadData.stage_id && newStageId) {
      leadData.stage_id = newStageId;
      leadData.stage = 'New';
    } else if (leadData.stage_id && !leadData.stage) {
      if (leadData.stage_name) {
        leadData.stage = leadData.stage_name;
      } else if (stageMap[leadData.stage_id.toString()]) {
        leadData.stage = stageMap[leadData.stage_id.toString()].name;
      }
    }
    
    if (!leadData.status_id && newStatusId) {
      leadData.status_id = newStatusId;
      leadData.status = 'New';
    } else if (leadData.status_id && !leadData.status) {
      if (leadData.status_name) {
        leadData.status = leadData.status_name;
      } else if (statusMap[leadData.status_id.toString()]) {
        leadData.status = statusMap[leadData.status_id.toString()].name;
      }
    }
    
    // Generate new ObjectId for the lead
    const leadId = new mongoose.Types.ObjectId();
    const extension = extensions[i];
    
    const leadDoc = {
      ...leadData,
      _id: leadId,
      voip_extension: extension,
      duplicate_status: leadData.duplicate_status || 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Remove temporary fields
    delete leadDoc._previousAgentName;
    delete leadDoc._previousProjectName;
    delete leadDoc._sourceAgentName;
    delete leadDoc._sourceProjectName;
    
    leadDocuments.push(leadDoc);
    
    // Collect FreePBX extension data
    if (extension) {
      freepbxExtensionsData.push({
        extension: extension,
        leadId: leadId.toString(),
        phone: leadData.phone || leadData.email_from || ''
      });
    }
  }
  
  // Batch insert leads in chunks
  const allCreated = [];
  const totalChunks = Math.ceil(leadDocuments.length / CHUNK_SIZE);
  
  for (let i = 0; i < leadDocuments.length; i += CHUNK_SIZE) {
    const chunkIndex = Math.floor(i / CHUNK_SIZE) + 1;
    const chunk = leadDocuments.slice(i, i + CHUNK_SIZE);
    
    try {
      const result = await Lead.insertMany(chunk, { ordered: false });
      allCreated.push(...result);
      
      logger.info(`✅ Inserted leads batch ${chunkIndex}/${totalChunks} (${result.length} leads)`);
      
      if (progressCallback) {
        const insertProgress = 75 + (chunkIndex / totalChunks) * 15;
        progressCallback({
          phase: 'database_insertion',
          description: `Inserting leads batch ${chunkIndex}/${totalChunks}...`,
          percentage: Math.round(insertProgress),
          currentBatch: chunkIndex,
          totalBatches: totalChunks,
          processedCount: allCreated.length
        });
      }
    } catch (error) {
      // With ordered: false, some documents may still be inserted
      if (error.insertedDocs) {
        allCreated.push(...error.insertedDocs);
      }
      logger.error(`Error in lead batch ${chunkIndex}:`, {
        error: error.message,
        insertedCount: error.insertedDocs?.length || 0
      });
    }
  }
  
  logger.info(`📦 Leads insertion complete: ${allCreated.length}/${leadDocuments.length} inserted`);
  
  // Batch insert transactions
  if (allCreated.length > 0) {
    if (progressCallback) {
      progressCallback({
        phase: 'post_processing',
        description: 'Creating transaction records...',
        percentage: 92
      });
    }
    
    const transactionDocs = allCreated.map(lead => ({
      user_id: creator?._id || null,
      user_role: creator?.role || null,
      type: TRANSACTION_TYPES.LEAD,
      lead_id: lead._id,
      amount: lead.leadPrice || 0,
      createdAt: new Date()
    }));
    
    // Insert transactions in chunks
    for (let i = 0; i < transactionDocs.length; i += CHUNK_SIZE) {
      const chunk = transactionDocs.slice(i, i + CHUNK_SIZE);
      try {
        await Transaction.insertMany(chunk, { ordered: false });
      } catch (error) {
        logger.error('Error inserting transaction batch:', error.message);
      }
    }
    
    logger.info(`💰 Created ${transactionDocs.length} transaction records`);
  }
  
  // Batch create FreePBX extensions
  if (freepbxExtensionsData.length > 0 && process.env.FREEPBX_ENABLED === 'true') {
    if (progressCallback) {
      progressCallback({
        phase: 'post_processing',
        description: 'Creating FreePBX extensions...',
        percentage: 95
      });
    }
    
    try {
      const batchResult = await freepbxService.batchCreateLeadExtensions(freepbxExtensionsData);
      logger.info(`📞 FreePBX batch creation: ${batchResult.successful?.length || 0} successful, ${batchResult.failed?.length || 0} failed`);
    } catch (freepbxError) {
      logger.error('FreePBX batch creation failed:', freepbxError.message);
    }
  }
  
  // Update source lead counts
  const sourceCountMap = {};
  allCreated.forEach(lead => {
    if (lead.source_id) {
      const sourceId = lead.source_id.toString();
      sourceCountMap[sourceId] = (sourceCountMap[sourceId] || 0) + 1;
    }
  });
  
  const sourceUpdatePromises = Object.entries(sourceCountMap).map(async ([sourceId, count]) => {
    try {
      await Source.findByIdAndUpdate(sourceId, { $inc: { lead_count: count } });
    } catch (error) {
      logger.error(`Failed to update source count for ${sourceId}:`, error.message);
    }
  });
  
  await Promise.all(sourceUpdatePromises);
  
  const totalTime = Date.now() - startTime;
  logger.info(`🎉 Batch lead creation completed in ${totalTime}ms: ${allCreated.length} created`);
  
  return {
    message: `Successfully created ${allCreated.length} leads`,
    created: allCreated,
    failed: leadDocuments.length - allCreated.length > 0 ? 
      leadDocuments.slice(allCreated.length).map(d => ({ data: d, error: 'Insert failed' })) : []
  };
};

module.exports = {
  createLeads,
  createLeadsBatch,
  updateLeadData,
  deleteLeadData,
  restoreLeadData,
  permanentlyDeleteLead,
  updateSecondaryEmail,
  makePrimaryEmail,
  updateOfferCalls,
};
