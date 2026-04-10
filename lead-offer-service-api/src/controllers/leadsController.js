const fs = require('fs');
const path = require('path');
const { hasPermission } = require('../middleware');
const { PERMISSIONS } = require('../middleware/roles/permissions');
const { asyncHandler, AuthorizationError } = require('../utils/errorHandler');
const leadService = require('../services/leadService');
const logger = require('../utils/logger');
const { ImportHistory, Lead, Reclamation, Team, AssignLeads, User } = require('../models');
const storageConfig = require('../config/storageConfig');


/**
 * Get all leads with project details, filtered based on user permissions
 */
const getAllLeads = asyncHandler(async (req, res) => {
  const { user } = req;

  const result = await leadService.getAllLeads(user, req.query, hasPermission, PERMISSIONS);

  return res.status(200).json(result);
});

/**
 * Get archived leads (active: false) with project details, filtered based on user permissions
 */
const getArchivedLeads = asyncHandler(async (req, res) => {
  const { user } = req;

  // Force showInactive to true for archived leads endpoint
  const query = { ...req.query, showInactive: true };

  const result = await leadService.getAllLeads(user, query, hasPermission, PERMISSIONS);

  return res.status(200).json(result);
});

/**
 * Get lead by ID with project details and appropriate permission checks
 */
const getLeadById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { user } = req;
  const { showInactive } = req.query;

  // Convert string query parameter to boolean
  // Always include inactive leads when fetching by ID, but still respect showInactive parameter if provided
  const includeInactive = showInactive === 'true' || true;

  const lead = await leadService.getLeadById(id, user, hasPermission, PERMISSIONS, includeInactive);

  return res.status(200).json(lead);
});

/**
 * Create a new lead
 */
const createLead = asyncHandler(async (req, res) => {
  const { user } = req;

  if (!(await hasPermission(user.role, PERMISSIONS.LEAD_CREATE))) {
    throw new AuthorizationError("You don't have permission to create leads");
  }

  const lead = await leadService.createNewLead(req.body);
  return res.status(201).json(lead);
});

/**
 * Create one or multiple leads
 * Handles both single lead object and array of lead objects
 */
const createLeads = asyncHandler(async (req, res) => {
  const { user } = req;

  if (!(await hasPermission(user.role, PERMISSIONS.LEAD_CREATE))) {
    throw new AuthorizationError("You don't have permission to create leads");
  }

  // Handle both single object and array of objects
  if (Array.isArray(req.body)) {
    // Multiple leads case
    console.log('✅ req.body multiple', req.body);
    const result = await leadService.createLeads(req.body, user);

    // If at least one lead was created successfully, return 200
    if (result.created && result.created.length > 0) {
      return res.status(200).json(result);
    } else {
      // If all leads failed, return 400 with error details
      return res.status(400).json({
        message: 'All leads failed validation. Please check your input data and try again.',
        result,
      });
    }
  } else if (typeof req.body === 'object' && req.body !== null) {
    // Single lead case - wrap in array and use the same function
    console.log('✅ req.body single', req.body);
    const result = await leadService.createLeads([req.body], user);

    // For single lead creation, return the created lead for backward compatibility
    if (result.created && result.created.length > 0) {
      return res.status(200).json(result.created[0]);
    } else {
      // If creation failed, return the error
      return res.status(400).json({
        message: 'Lead creation failed. Please check your input data and try again.',
        error: result.failed && result.failed.length > 0 ? result.failed[0].error : 'Unknown error',
      });
    }
  } else {
    return res.status(400).json({
      message: 'Invalid request format. Expected an object or array of lead objects.',
    });
  }
});

/**
 * Update an existing lead
 */
const updateLead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { user } = req;

  // Allow either lead:update or activity:create permission
  const hasLeadUpdate = await hasPermission(user.role, PERMISSIONS.LEAD_UPDATE);
  const hasActivityCreate = await hasPermission(user.role, PERMISSIONS.ACTIVITY_CREATE);
  
  if (!hasLeadUpdate && !hasActivityCreate) {
    throw new AuthorizationError("You don't have permission to edit leads or create activities");
  }
  // Pass the user object to the service method for activity logging
  const updatedLead = await leadService.updateLeadData(id, req.body, user);

  return res.status(200).json(updatedLead);
});

/**
 * Delete a lead or multiple leads
 */
const deleteLead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { ids } = req.body;
  const { user } = req;

  if (!(await hasPermission(user.role, PERMISSIONS.LEAD_DELETE))) {
    throw new AuthorizationError("You don't have permission to delete leads");
  }

  let result;

  if (ids && Array.isArray(ids) && ids.length > 0) {
    // Pass the user object for activity logging
    result = await leadService.deleteLeadData(ids, user);
  } else if (id) {
    // Pass the user object for activity logging
    result = await leadService.deleteLeadData(id, user);
  } else {
    throw new Error(
      'Missing lead ID. Please provide either "id" for single deletion or "ids" array for bulk deletion.'
    );
  }

  return res.status(200).json(result);
});

/**
 * Get leads assigned to the current user
 */
const getMyLeads = asyncHandler(async (req, res) => {
  const { user } = req;

  const result = await leadService.getMyLeads(user, req.query);

  return res.status(200).json(result);
});

/**
 * Update multiple leads with the same data
 */
const bulkUpdateLeads = asyncHandler(async (req, res) => {
  const { user } = req;
  const { leadIds, updateData } = req.body;

  if (!(await hasPermission(user.role, PERMISSIONS.LEAD_UPDATE))) {
    throw new AuthorizationError("You don't have permission to edit leads");
  }

  if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
    return res.status(400).json({
      message: 'Missing or invalid leadIds. Please provide an array of lead IDs.',
    });
  }

  if (!updateData || typeof updateData !== 'object' || Object.keys(updateData).length === 0) {
    return res.status(400).json({
      message: 'Missing or invalid updateData. Please provide an object with fields to update.',
    });
  }

  // Pass the user object for activity logging
  const result = await leadService.updateLeadData(leadIds, updateData, user);

  return res.status(200).json(result);
});

/**
 * Get all lead IDs as an array
 * For agents, only returns IDs of leads assigned to them
 */
const getLeadIds = asyncHandler(async (req, res) => {
  const { user } = req;

  const leadIds = await leadService.getLeadIds(user, hasPermission, PERMISSIONS);

  return res.status(200).json({ leadIds });
});

/**
 * Import leads from Excel file
 * For small imports (< 1000 leads): processes synchronously
 * For large imports (>= 1000 leads): runs in background with real-time progress via WebSocket
 * 
 * Optionally accepts source_id to apply to all imported leads
 */
const importLeadsFromExcel = asyncHandler(async (req, res) => {
  const { user } = req;
  const { source_id, lead_price, async: asyncMode } = req.body;

  if (!(await hasPermission(user.role, PERMISSIONS.LEAD_CREATE))) {
    throw new AuthorizationError("You don't have permission to import leads");
  }

  // Check if file exists in the request
  if (!req.file) {
    return res.status(400).json({
      message: 'Please upload an Excel file',
    });
  }

  try {
    // Convert lead_price to number if provided, default to 0
    const leadPriceValue = lead_price ? parseFloat(lead_price) : 0;
    
    // Check file size to determine processing mode
    // For large files, use background processing to avoid Cloudflare timeout
    const fileSizeKB = req.file.size / 1024;
    const useBackgroundProcessing = asyncMode === 'true' || asyncMode === true || fileSizeKB > 500;
    
    if (useBackgroundProcessing) {
      // BACKGROUND PROCESSING MODE
      // Create import record immediately and return 202 Accepted
      const importQueue = require('../services/importQueue');
      
      // Create import history record with queued status
      const importRecord = new ImportHistory({
        user_id: user._id || user.id,
        user_name: user.name || user.login || user.email || 'Unknown',
        user_email: user.email || user.login || 'unknown@example.com',
        original_filename: req.file.originalname,
        stored_filename: `pending-${Date.now()}`,
        file_size: req.file.size,
        source_id: source_id || null,
        lead_price: leadPriceValue,
        total_rows: 0, // Will be updated when processing starts
        success_count: 0,
        failure_count: 0,
        status: 'queued',
        original_file_path: req.file.path,
        progress: {
          current_phase: 'queued',
          phase_description: 'Import queued, waiting to start...',
          processed_count: 0,
          percentage: 0
        }
      });
      
      await importRecord.save();
      
      logger.info(`📋 Created import record ${importRecord._id} for background processing`, {
        filename: req.file.originalname,
        fileSize: fileSizeKB + 'KB',
        userId: user._id
      });
      
      // Add job to queue (runs in background)
      await importQueue.addJob(importRecord._id.toString(), (user._id || user.id).toString(), {
        file: req.file,
        user,
        sourceId: source_id,
        leadPrice: leadPriceValue
      });
      
      // Return immediately with 202 Accepted
      return res.status(202).json({
        message: 'Import started. Track progress via WebSocket or polling.',
        importId: importRecord._id,
        status: 'queued',
        websocket: {
          event: 'import:progress',
          subscribeEvent: 'subscribe:import',
          room: `import:${importRecord._id}`
        },
        polling: {
          endpoint: `/leads/import/${importRecord._id}/progress`,
          interval_ms: 2000
        }
      });
    }
    
    // SYNCHRONOUS PROCESSING MODE (for small files)
    // Process the Excel file and create leads with optional source_id and lead_price
    const result = await leadService.importLeadsFromExcel(
      req.file,
      user,
      source_id,
      leadPriceValue
    );

    // Even if all leads were duplicates, we still return a 200 status with the result
    // which will include the failed leads and download link
    return res.status(200).json({
      ...result,
      message:
        result.success && result.success.length === 0 && result.failed && result.failed.length > 0
          ? 'All leads were duplicates or invalid. See details in the error report.'
          : 'Import completed successfully',
    });
  } catch (error) {
    logger.error('Error importing leads from Excel', { error });
    return res.status(500).json({
      message: 'Error importing leads from Excel',
      error: error.message,
    });
  }
});

/**
 * Get import progress for a specific import
 * Used as a fallback when WebSocket is not available
 */
const getImportProgress = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { user } = req;
  
  if (!(await hasPermission(user.role, PERMISSIONS.LEAD_CREATE))) {
    throw new AuthorizationError("You don't have permission to view import progress");
  }
  
  const importRecord = await ImportHistory.findById(id).lean();
  
  if (!importRecord) {
    return res.status(404).json({ error: 'Import not found' });
  }
  
  // Check if user owns this import or is admin
  const userId = (user._id || user.id).toString();
  const importUserId = importRecord.user_id?.toString();
  
  if (user.role !== 'Admin' && userId !== importUserId) {
    throw new AuthorizationError("You don't have permission to view this import");
  }
  
  return res.status(200).json({
    importId: id,
    status: importRecord.status,
    progress: importRecord.progress || {
      current_phase: importRecord.status,
      phase_description: importRecord.status === 'completed' ? 'Import completed' : 'Processing...',
      percentage: importRecord.status === 'completed' ? 100 : 0
    },
    results: importRecord.status === 'completed' ? {
      success_count: importRecord.success_count,
      failure_count: importRecord.failure_count,
      enhanced_count: importRecord.enhanced_count,
      auto_assigned_count: importRecord.auto_assigned_count,
      stage_assigned_count: importRecord.stage_assigned_count,
      reclamation_created_count: importRecord.reclamation_created_count,
      processing_time_ms: importRecord.processing_time_ms,
      downloadLink: importRecord.error_filename ? `/leads/download/${importRecord.error_filename}` : null,
      duplicate_status_summary: importRecord.duplicate_status_summary || {
        new: 0,
        oldDuplicate: 0,
        duplicate: 0
      }
    } : null,
    error: importRecord.status === 'failed' ? importRecord.error_message : null
  });
});

/**
 * Get import history
 */
const getImportHistory = asyncHandler(async (req, res) => {
  const { user } = req;

  if (!(await hasPermission(user.role, PERMISSIONS.LEAD_CREATE))) {
    throw new AuthorizationError("You don't have permission to view import history");
  }

  const result = await leadService.getImportHistory(user, req.query);

  return res.status(200).json(result);
});

/**
 * Revert a lead import - undoes all operations performed during the import
 */
const revertLeadImport = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const { user } = req;

  // Only allow admins to revert imports
  if (user.role !== 'Admin') {
    throw new AuthorizationError('Only administrators can revert lead imports');
  }

  try {
    const result = await leadService.revertLeadImport(id, user, reason || '');

    return res.status(200).json({
      success: true,
      message: result.message,
      data: {
        import_id: result.importId,
        revert_summary: result.revert_summary,
        processing_time_ms: result.processing_time_ms,
      },
    });
  } catch (error) {
    logger.error('Error reverting lead import', { error, importId: id, userId: user._id });

    // Return specific error messages for better user experience
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to revert import',
      import_id: id,
    });
  }
});

/**
 * Permanently delete a lead or multiple leads from the database
 * This operation cannot be undone
 */
const permanentlyDeleteLead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { ids } = req.body;
  const { user } = req;

  // Only allow admins to permanently delete leads
  if (user.role !== 'Admin') {
    throw new AuthorizationError('Only administrators can permanently delete leads');
  }

  let result;

  if (ids && Array.isArray(ids) && ids.length > 0) {
    // Bulk permanent deletion
    result = await leadService.permanentlyDeleteLead(ids, user);
  } else if (id) {
    // Single lead permanent deletion
    result = await leadService.permanentlyDeleteLead(id, user);
  } else {
    throw new Error(
      'Missing lead ID. Please provide either "id" for single deletion or "ids" array for bulk deletion.'
    );
  }

  return res.status(200).json({
    status: 'success',
    message: 'Leads permanently deleted',
    data: result,
  });
});

/**
 * Get leads by values (partner IDs, emails, or phone numbers)
 * Handles array of values that can be a mix of partner IDs, emails, and phone numbers
 */
const getLeadsByPartnerIds = asyncHandler(async (req, res) => {
  const { user } = req;
  const { values } = req.body;

  // Validate input
  if (!values) {
    return res.status(400).json({
      message: 'Missing values. Please provide an array of values (partner IDs, emails, or phone numbers) in the request body.',
    });
  }

  if (!Array.isArray(values)) {
    return res.status(400).json({
      message: 'Invalid values format. Expected an array of values.',
    });
  }

  if (values.length === 0) {
    return res.status(400).json({
      message: 'values array cannot be empty.',
    });
  }

  const result = await leadService.getLeadsByPartnerIds(
    values,
    user,
    req.query,
    hasPermission,
    PERMISSIONS
  );

  return res.status(200).json(result);
});

/**
 * Update lead status by stage and status name or ID
 * Handles both positive and negative status updates
 */
const updateLeadStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { user } = req;
  const { stage_name, status_name, stage_id, status_id } = req.body;

  if (!(await hasPermission(user.role, PERMISSIONS.LEAD_UPDATE))) {
    throw new AuthorizationError("You don't have permission to update lead status");
  }

  // Validate that we have either names or IDs
  if ((!stage_name || !status_name) && (!stage_id || !status_id)) {
    return res.status(400).json({
      message: 'Either stage_name/status_name or stage_id/status_id must be provided',
    });
  }

  let updateData = {};

  // If stage and status names are provided, use them
  if (stage_name && status_name) {
    const { stageId, statusId } = await leadService.findStageAndStatusIdsByName(
      stage_name,
      status_name
    );

    if (!stageId || !statusId) {
      return res.status(400).json({
        message: `Invalid stage '${stage_name}' or status '${status_name}'. Please check the stage and status names.`,
      });
    }

    updateData = {
      stage_id: stageId,
      status_id: statusId,
      stage: stage_name,
      status: status_name,
    };
  } else {
    // If IDs are provided, validate they exist and get names
    const { stageMap, statusMap } = await leadService.getStageAndStatusMaps();

    const stage = stageMap[stage_id];
    const status = statusMap[status_id];

    if (!stage || !status) {
      return res.status(400).json({
        message: 'Invalid stage_id or status_id provided',
      });
    }

    updateData = {
      stage_id,
      status_id,
      stage: stage.name,
      status: status.name,
    };
  }

  // Note: Active status logic is now handled in leadService.updateLeadData (crud.js)
  // The new logic checks:
  // 1. "Out" status → keep active as false
  // 2. Reklamation stage with negative statuses → keep active as false
  // 3. Any other status change → set active to true

  // Update the lead status
  const result = await leadService.updateLeadData(id, updateData, user);

  return res.status(200).json({
    status: 'success',
    message: 'Lead status updated successfully',
    data: result,
  });
});

/**
 * Update status for multiple leads
 * Handles bulk status updates for efficiency
 */
const bulkUpdateLeadStatus = asyncHandler(async (req, res) => {
  const { user } = req;
  const {
    leadIds,
    stage_name,
    status_name,
    stage_id,
    status_id,
    project_id,
    toAgentUserId,
    source_id,
  } = req.body;

  if (!(await hasPermission(user.role, PERMISSIONS.LEAD_UPDATE))) {
    throw new AuthorizationError("You don't have permission to update lead status");
  }

  // Validate input
  if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
    return res.status(400).json({
      message: 'leadIds array is required and must contain at least one lead ID',
    });
  }

  // Build optional stage/status update
  let updateData = {};
  let finalStageName = null;
  let finalStatusName = null;
  const isStatusChangeRequested = (stage_name && status_name) || (stage_id && status_id);

  // Optional: update source_id for all selected leads
  if (source_id) {
    updateData.source_id = source_id;
  }

  if (stage_name && status_name) {
    const { stageId, statusId } = await leadService.findStageAndStatusIdsByName(
      stage_name,
      status_name
    );

    if (!stageId || !statusId) {
      return res.status(400).json({
        message: `Invalid stage '${stage_name}' or status '${status_name}'. Please check the stage and status names.`,
      });
    }

    updateData.stage_id = stageId;
    updateData.status_id = statusId;
    updateData.stage = stage_name;
    updateData.status = status_name;
    finalStageName = stage_name;
    finalStatusName = status_name;
  } else if (stage_id && status_id) {
    // If IDs are provided, validate they exist and get names
    const { stageMap, statusMap } = await leadService.getStageAndStatusMaps();
    const stage = stageMap[stage_id];
    const status = statusMap[status_id];

    if (!stage || !status) {
      return res.status(400).json({
        message: 'Invalid stage_id or status_id provided',
      });
    }

    updateData.stage_id = stage_id;
    updateData.status_id = status_id;
    updateData.stage = stage.name;
    updateData.status = status.name;
    finalStageName = stage.name;
    finalStatusName = status.name;
  }

  // BIDIRECTIONAL RECLAMATION LOGIC
  const reclamationService = require('../services/reclamationService');

  // Get current leads to check their existing stage
  const currentLeads = await Lead.find({ _id: { $in: leadIds } }).lean();

  const reclamationResults = {
    toReclamation: [],
    fromReclamation: [],
    reclamationErrors: [],
  };

  const isMovingToReclamation =
    !!finalStageName &&
    (finalStageName.toLowerCase() === 'reklamation' ||
      finalStageName.toLowerCase() === 'reclamation');

  if (isStatusChangeRequested) {
    logger.info(`🔴 BULK UPDATE DEBUG: Stage comparison`, {
      finalStageName,
      finalStageNameLower: finalStageName ? finalStageName.toLowerCase() : null,
      isMovingToReclamation,
      leadIds: leadIds.length,
    });
  }

  // Process each lead for reclamation logic (only when status change requested)
  for (const lead of currentLeads) {
    try {
      if (!isStatusChangeRequested) continue;
      const currentStage = lead.stage || '';
      const currentUseStatus = lead.use_status || '';
      const currentReclamationStatus = lead.reclamation_status || '';
      
      // Check if lead is in reclamation by stage name OR by use_status/reclamation_status fields
      const isCurrentlyInReclamation =
        currentStage.toLowerCase() === 'reklamation' ||
        currentStage.toLowerCase() === 'reclamation' ||
        currentUseStatus.toLowerCase() === 'reclamation' ||
        currentReclamationStatus === 'pending';

      logger.info(`🔴 BULK UPDATE: Lead ${lead._id} stage check`, {
        leadId: lead._id,
        currentStage,
        currentUseStatus,
        currentReclamationStatus,
        isCurrentlyInReclamation,
        isMovingToReclamation,
        willCreateReclamation: isMovingToReclamation && !isCurrentlyInReclamation,
      });

      if (isMovingToReclamation) {
        // Check if reclamation record already exists for this lead
        const existingReclamation = await Reclamation.findOne({
          lead_id: lead._id,
          status: { $in: [0, 1] }, // Pending or Accepted
        });

        logger.info(`🔍 BULK UPDATE: Checking reclamation record for lead ${lead._id}`, {
          leadId: lead._id,
          existingReclamation: existingReclamation ? existingReclamation._id : null,
          needsReclamationRecord: !existingReclamation,
        });

        if (!existingReclamation) {
          // MOVING TO RECLAMATION OR ALREADY IN RECLAMATION BUT NO RECORD: Create reclamation record and set use_status
          const reclamationData = {
            lead_id: lead._id,
            project_id: lead.team_id ? lead.team_id : null, // Use team_id if available
            agent_id: lead.user_id ? lead.user_id : null, // Use user_id if available
            reason: `Bulk status update - Lead moved to Reklamation stage with status "${finalStatusName}"`,
            status: 0, // Pending
          };

          logger.info(`🔴 BULK UPDATE: Creating reclamation for lead ${lead._id}`, {
            leadId: lead._id,
            leadName: lead.contact_name || lead.email_from,
            reclamationData,
          });

          const reclamation = await reclamationService.createReclamation(reclamationData, user);

          if (reclamation) {
            logger.info(
              `✅ BULK UPDATE: Successfully created reclamation ${reclamation._id} for lead ${lead._id}`
            );
            reclamationResults.toReclamation.push({
              leadId: lead._id,
              leadName: lead.contact_name || lead.email_from,
              reclamationId: reclamation._id,
            });
          } else {
            logger.error(
              `❌ BULK UPDATE: Failed to create reclamation for lead ${lead._id} - service returned null`
            );
          }
        } else {
          logger.info(
            `ℹ️ BULK UPDATE: Reclamation record already exists for lead ${lead._id} - skipping creation`
          );
        }
      } else if (!isMovingToReclamation && isCurrentlyInReclamation) {
        // MOVING FROM RECLAMATION: Delete reclamation records from collection
        const existingReclamations = await Reclamation.find({
          lead_id: lead._id,
          status: { $in: [0, 1] }, // Pending or Accepted
        });

        if (existingReclamations.length > 0) {
          // Delete all pending/accepted reclamations for this lead
          const deleteResult = await Reclamation.deleteMany({
            lead_id: lead._id,
            status: { $in: [0, 1] },
          });

          logger.info(`🗑️ BULK UPDATE: Deleted ${deleteResult.deletedCount} reclamation records for lead ${lead._id}`);

          reclamationResults.fromReclamation.push({
            leadId: lead._id,
            leadName: lead.contact_name || lead.email_from,
            deletedReclamations: deleteResult.deletedCount,
          });
        }
      }
    } catch (error) {
      logger.error(`Error processing reclamation for lead ${lead._id}:`, error);
      reclamationResults.reclamationErrors.push({
        leadId: lead._id,
        leadName: lead.contact_name || lead.email_from,
        error: error.message,
      });
    }
  }

  // Optional: Validate project change intent and prepare membership lookup
  let targetTeam = null;
  let targetTeamAgentIds = new Set();
  let targetAgent = null;
  const projectChangeErrors = [];
  if (project_id) {
    try {
      targetTeam = await Team.findById(project_id).select('agents.user name').lean();
      if (!targetTeam) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid project_id provided',
        });
      }
      targetTeamAgentIds = new Set(
        (targetTeam.agents || [])
          .map((a) => (a && a.user ? a.user.toString() : null))
          .filter(Boolean)
      );
      if (toAgentUserId) {
        targetAgent = await User.findById(toAgentUserId).select('_id login').lean();
        if (!targetAgent) {
          return res
            .status(400)
            .json({ status: 'error', message: 'Invalid toAgentUserId provided' });
        }
        if (!targetTeamAgentIds.has(toAgentUserId.toString())) {
          return res.status(400).json({
            status: 'error',
            message: 'Target agent is not a member of the target project',
          });
        }
      }
    } catch (err) {
      return res.status(400).json({ status: 'error', message: 'Invalid project_id provided' });
    }
  }

  // Map for quick lead lookup
  const leadById = new Map(currentLeads.map((l) => [l._id.toString(), l]));

  // Update leads individually to preserve reclamation-specific changes
  const updatePromises = leadIds.map(async (leadId) => {
    const leadUpdateData = { ...updateData };

    // Check if this lead was moved TO reclamation - preserve the use_status
    if (isStatusChangeRequested) {
      const movedToReclamation = reclamationResults.toReclamation.find(
        (r) => r.leadId.toString() === leadId.toString()
      );
      if (movedToReclamation) {
        leadUpdateData.use_status = 'Reclamation';
        leadUpdateData.reclamation_status = 'pending';
      }

      // Check if this lead was moved FROM reclamation - reset use_status and reclamation_status
      const movedFromReclamation = reclamationResults.fromReclamation.find(
        (r) => r.leadId.toString() === leadId.toString()
      );
      if (movedFromReclamation) {
        leadUpdateData.use_status = 'reusable'; // Valid enum: 'new', 'in_use', 'pending', 'reusable', 'reclamation'
        leadUpdateData.reclamation_status = 'accepted';
        leadUpdateData.active = true; // Reactivate the lead when moving from reclamation
      }
    }
    console.log('toProjectId 1 ✅', project_id);

    // Handle project (team) change with agent membership validation
    if (project_id) {
      const lead = leadById.get(leadId.toString());
      const assignedAgentId = lead && lead.user_id ? lead.user_id.toString() : null;
      const moveAgentId = toAgentUserId ? toAgentUserId.toString() : assignedAgentId;
      const canMove = moveAgentId && targetTeamAgentIds.has(moveAgentId);
      if (canMove) {
        leadUpdateData.team_id = project_id;
        if (toAgentUserId) {
          leadUpdateData.user_id = toAgentUserId;
        }
        console.log('toProjectId 2 ✅', project_id);

        // Upsert assignment mapping for the new project/agent
        try {
          await AssignLeads.findOneAndUpdate(
            { lead_id: leadId, project_id: project_id },
            {
              $set: {
                agent_id: moveAgentId,
                assigned_by: user._id,
                status: 'active',
                assigned_at: new Date(),
              },
            },
            { new: true, upsert: true }
          );
        } catch (e) {
          projectChangeErrors.push({
            leadId,
            reason: `Assignment upsert failed: ${e.message}`,
            targetProject: targetTeam ? { _id: targetTeam._id, name: targetTeam.name } : null,
            assignedAgentId: moveAgentId,
          });
        }
      } else {
        projectChangeErrors.push({
          leadId: leadId,
          reason:
            'Assigned agent is not a member of the target project. Add the agent to the project before moving the lead.',
          targetProject: targetTeam ? { _id: targetTeam._id, name: targetTeam.name } : null,
          assignedAgentId: moveAgentId || assignedAgentId,
        });
      }
    }

    return leadService.updateLeadData([leadId], leadUpdateData, user);
  });

  const updateResults = await Promise.all(updatePromises);

  // Combine all results
  const result = {
    message: `Successfully updated status for ${leadIds.length} leads`,
    updated: updateResults.flatMap((r) => r.updated || []),
    failed: updateResults.flatMap((r) => r.failed || []),
  };

  // Prepare comprehensive response
  const response = {
    status: 'success',
    message: `Successfully updated status for ${result.updated ? result.updated.length : 0} leads`,
    data: result,
    reclamation: {
      toReclamation: reclamationResults.toReclamation,
      fromReclamation: reclamationResults.fromReclamation,
      errors: reclamationResults.reclamationErrors,
      summary: {
        createdReclamations: reclamationResults.toReclamation.length,
        deletedReclamations: reclamationResults.fromReclamation.length,
        errors: reclamationResults.reclamationErrors.length,
      },
    },
    projectChange: project_id
      ? {
          targetProjectId: project_id,
          failed: projectChangeErrors,
          failedCount: projectChangeErrors.length,
        }
      : undefined,
  };

  // Update response message to include reclamation info
  let statusMessage = `Successfully updated status for ${result.updated ? result.updated.length : 0} leads`;

  if (reclamationResults.toReclamation.length > 0) {
    statusMessage += `, created ${reclamationResults.toReclamation.length} reclamation records`;
  }

  if (reclamationResults.fromReclamation.length > 0) {
    statusMessage += `, deleted ${reclamationResults.fromReclamation.length} reclamation records`;
  }

  if (reclamationResults.reclamationErrors.length > 0) {
    statusMessage += `, ${reclamationResults.reclamationErrors.length} reclamation errors occurred`;
  }

  // Include project change info in message if applicable
  if (project_id) {
    const failedCount = projectChangeErrors.length;
    if (failedCount > 0) {
      statusMessage += `, ${failedCount} lead(s) could not be moved to the new project due to agent membership`;
    }
  }
  response.message = statusMessage;

  return res.status(200).json(response);
});

/**
 * Download import files from storage directory with smart filename handling
 * Sets filename based on ImportHistory document:
 * - Original files: original_filename + "_original"
 * - Error files: original_filename + "_failed"
 * - Unknown files: stored filename as fallback
 */
const downloadImportFile = asyncHandler(async (req, res) => {
  const { user } = req;

  if (!(await hasPermission(user.role, PERMISSIONS.LEAD_CREATE))) {
    throw new AuthorizationError("You don't have permission to download import files");
  }

  // Extract the file path from the URL (everything after /download/)
  const filePath = req.params[0];

  if (!filePath) {
    return res.status(400).json({ message: 'File path is required' });
  }

  // Extract filename from the path
  const storedFilename = path.basename(filePath);

  // Determine storage type based on file path
  let storageType = 'documents'; // Default for error files
  if (filePath.includes('imports/')) {
    storageType = 'imports';
  }

  // Try to find the import history record for this file
  let downloadFilename = storedFilename; // Default fallback

  try {
    let importRecord = null;

    // First, check if this is an error file by looking in error_filename field
    if (filePath.includes('error-leads') || filePath.includes('failed-leads')) {
      console.log('Detected error file path, searching by error_filename');
      importRecord = await ImportHistory.findOne({
        error_filename: storedFilename,
      }).select('original_filename error_filename');
    } else {
      console.log('Regular file path, searching by stored_filename');
      // For regular files, look up by stored_filename
      importRecord = await ImportHistory.findOne({
        stored_filename: storedFilename,
      }).select('original_filename error_filename stored_filename');
    }

    console.log('Import record found:', { importRecord });

    if (importRecord && importRecord.original_filename) {
      const originalFilename = importRecord.original_filename;
      const errorFilename = importRecord.error_filename;

      // Extract file extension from original filename
      const ext = path.extname(originalFilename);
      const nameWithoutExt = path.basename(originalFilename, ext);

      // Determine if this is an error file download
      const isErrorFile =
        filePath.includes('error-leads') || filePath.includes('failed-leads') || errorFilename;

      // Generate download filename based on file type
      if (isErrorFile) {
        downloadFilename = `${nameWithoutExt}_failed${ext}`;
      } else {
        downloadFilename = `${nameWithoutExt}_original${ext}`;
      }

      logger.info('Import file download - record found', {
        userId: user._id,
        storedFilename,
        originalFilename,
        errorFilename,
        downloadFilename,
        isErrorFile,
        filePath,
      });
    } else {
      // No import record found, try to create a meaningful filename from stored filename
      const ext = path.extname(storedFilename);
      const nameWithoutExt = path.basename(storedFilename, ext);

      // Clean up the filename - remove hash patterns and timestamps
      let cleanName = nameWithoutExt;

      // Remove common hash patterns (32 characters hex)
      cleanName = cleanName.replace(/[-_][a-f0-9]{32}$/i, '');
      // Remove timestamp patterns
      cleanName = cleanName.replace(/[-_]\d{13,}$/, ''); // Remove long timestamps
      cleanName = cleanName.replace(/[-_]\d{10}$/, ''); // Remove Unix timestamps
      // Remove shorter hash patterns (16+ characters)
      cleanName = cleanName.replace(/[-_][a-f0-9]{16,}$/i, '');

      if (filePath.includes('error-leads') || filePath.includes('failed-leads')) {
        // For error files, add _failed suffix
        downloadFilename = `${cleanName}_failed${ext}`;
      } else {
        // For other files, try to clean up the filename but add _original
        downloadFilename = `${cleanName}_original${ext}`;
      }

      logger.warn('Import file download - no record found, using fallback', {
        userId: user._id,
        storedFilename,
        downloadFilename,
        filePath,
      });
    }
  } catch (error) {
    logger.error('Error looking up import history for download', {
      error: error.message,
      storedFilename,
      filePath,
    });

    // Fallback: try to create a reasonable filename
    const ext = path.extname(storedFilename);
    const nameWithoutExt = path.basename(storedFilename, ext);

    // Clean up the filename - remove hash patterns and timestamps
    let cleanName = nameWithoutExt;

    // Remove common hash patterns (32 characters hex)
    cleanName = cleanName.replace(/[-_][a-f0-9]{32}$/i, '');
    // Remove timestamp patterns
    cleanName = cleanName.replace(/[-_]\d{13,}$/, ''); // Remove long timestamps
    cleanName = cleanName.replace(/[-_]\d{10}$/, ''); // Remove Unix timestamps
    // Remove shorter hash patterns (16+ characters)
    cleanName = cleanName.replace(/[-_][a-f0-9]{16,}$/i, '');

    if (filePath.includes('error-leads') || filePath.includes('failed-leads')) {
      downloadFilename = `${cleanName}_failed${ext}`;
    } else {
      downloadFilename = `${cleanName}_original${ext}`;
    }
  }

  // First try to serve from cloud storage (preferred)
  logger.info('☁️ Attempting to serve file from CLOUD storage', {
    filename: storedFilename,
    storageType,
    userId: user._id,
    storage: 'CLOUD',
  });

  try {
    const fileBuffer = await storageConfig.downloadFile(storedFilename, storageType);

    if (fileBuffer) {
      // Determine content type based on file extension
      const ext = path.extname(downloadFilename).toLowerCase();
      let contentType = 'application/octet-stream';

      if (ext === '.xlsx') {
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      } else if (ext === '.xls') {
        contentType = 'application/vnd.ms-excel';
      } else if (ext === '.csv') {
        contentType = 'text/csv';
      }

      // Set headers for file download
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
      res.setHeader('Content-Length', fileBuffer.length);

      logger.info('☁️ File served from CLOUD storage', {
        filename: storedFilename,
        downloadFilename,
        size: fileBuffer.length,
        userId: user._id,
        storage: 'CLOUD',
      });

      return res.send(fileBuffer);
    }
  } catch (cloudError) {
    logger.warn('⚠️ Cloud storage failed, attempting local fallback', {
      error: cloudError.message,
      filename: storedFilename,
      storageType,
      userId: user._id,
    });
  }

  // Fallback to local storage if cloud failed or file not found in cloud
  logger.info('📁 Attempting to serve file from LOCAL storage (fallback)', {
    filename: storedFilename,
    userId: user._id,
    storage: 'LOCAL',
  });

  // Use storageConfig to get the absolute file path
  const fullPath = path.join(storageConfig.getPath(), filePath);

  // Security check: ensure the resolved path is within the storage directory
  const storagePath = storageConfig.getPath();
  if (!fullPath.startsWith(storagePath)) {
    return res.status(403).json({ message: 'Access denied' });
  }

  // Check if file exists
  if (!fs.existsSync(fullPath)) {
    logger.error('❌ File not found in cloud or local storage', {
      filename: storedFilename,
      storageType,
      userId: user._id,
      fullPath,
    });
    return res.status(404).json({ message: 'File not found in cloud or local storage' });
  }

  // Set headers for file download
  res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);

  // Determine content type based on file extension
  const ext = path.extname(downloadFilename).toLowerCase();
  if (ext === '.xlsx') {
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
  } else if (ext === '.xls') {
    res.setHeader('Content-Type', 'application/vnd.ms-excel');
  } else if (ext === '.csv') {
    res.setHeader('Content-Type', 'text/csv');
  } else {
    res.setHeader('Content-Type', 'application/octet-stream');
  }

  // Stream the file to the response
  const fileStream = fs.createReadStream(fullPath);
  fileStream.on('error', (err) => {
    logger.error('❌ File stream error', { error: err.message, fullPath });
    if (!res.headersSent) {
      res.status(500).json({ message: 'Error streaming file' });
    }
  });

  fileStream.on('open', () => {
    logger.info('📁 File served from LOCAL storage (fallback)', {
      filename: storedFilename,
      downloadFilename,
      userId: user._id,
      storage: 'LOCAL',
    });
  });

  fileStream.pipe(res);
});

/**
 * Get leads that have todos assigned to the current user
 */
const getExtraLeads = asyncHandler(async (req, res) => {
  const { user } = req;

  const result = await leadService.getExtraLeads(user, req.query);

  return res.status(200).json(result);
});

/**
 * Get leads where the current user has assigned todos to other users
 */
const getAssignedLeads = asyncHandler(async (req, res) => {
  const { user } = req;

  const result = await leadService.getAssignedLeads(user, req.query);

  return res.status(200).json(result);
});

/**
 * Get leads in queue order for agents
 * Queue is sorted by status priority (New → Ne1 → Ne2 → Ne3 → Ne4) then by assignedAt (oldest first)
 */
const getLeadsQueue = asyncHandler(async (req, res) => {
    const { user } = req;
  
    const result = await leadService.getLeadsQueue(user, req.query);
  
    return res.status(200).json(result);
  });
  
  /**
   * Get current top lead from queue
   * Returns the #1 lead in the agent's queue with navigation tracking
   * ALWAYS maintains previous_lead_id chain for navigation
   */
  const getCurrentTopLead = asyncHandler(async (req, res) => {
    const { user } = req;
  
    // Get the queue with just 1 lead, respecting filters from query params
    const queueResult = await leadService.getLeadsQueue(user, {
      ...req.query, // Pass all query params (source, project_id, project_name, exclude_recent)
      page: 1,
      limit: 1,
    });
  
    if (!queueResult.data || queueResult.data.length === 0) {
      return res.status(200).json({
        status: 'success',
        message: 'No leads in your queue',
        data: null,
        previous_lead: null,
        queue_info: queueResult.queue_info,
      });
    }
  
    const currentLead = queueResult.data[0];
    const QueueTop = require('../models/queueTop');
    const AgentQueuePosition = require('../models/agentQueuePosition');
  
    // Get agent's last viewed lead position
    const lastPosition = await AgentQueuePosition.findOne({
      agent_id: user._id,
    });
  
    const currentLeadId = currentLead._id.toString();
    const lastLeadId = lastPosition?.current_lead_id?.toString();
    
    // Use ACTUAL filters applied (including auto-detected project)
    const actualProjectFilter = queueResult.queue_info?.filtered_by_project;
    const currentFilters = {
      project_id: actualProjectFilter?.project_id?.toString() || req.query.project_id || null,
      project_name: actualProjectFilter?.project_name || req.query.project_name || null,
      source: req.query.source || null,
    };
  
    // Check if filters have changed (source or project)
    const filtersChanged = lastPosition && 
                           JSON.stringify(lastPosition.filters) !== JSON.stringify(currentFilters);
    
    // Check if current top lead has changed
    const leadChanged = lastLeadId !== currentLeadId;
    
    const hasChanged = !lastPosition || leadChanged || filtersChanged;
  
    // Get existing navigation tracking (if any)
    let queueTop = await QueueTop.findOne({
      lead_id: currentLead._id,
      agent_id: user._id,
    });
  
    // ALWAYS ensure QueueTop exists with proper previous_lead_id tracking
    // Only link to previous lead if LEAD changed but FILTERS stayed the same
    if (leadChanged && !filtersChanged && lastPosition && lastLeadId) {
      // Lead changed within same filter - link to previous lead
      if (queueTop) {
        // QueueTop exists - update it with previous_lead_id if needed
        if (!queueTop.previous_lead_id || queueTop.previous_lead_id.toString() !== lastLeadId) {
          queueTop.previous_lead_id = lastPosition.current_lead_id;
          queueTop.viewed_at = new Date();
          queueTop.view_count = (queueTop.view_count || 0) + 1;
          await queueTop.save();
          
          logger.info('Linked previous lead to current lead (same filter)', {
            userId: user._id,
            currentLeadId: currentLeadId,
            previousLeadId: lastLeadId,
          });
        } else {
          // previous_lead_id already set correctly, just update view tracking
          queueTop.viewed_at = new Date();
          queueTop.view_count = (queueTop.view_count || 0) + 1;
          await queueTop.save();
          
          logger.info('Updated view tracking (previous_lead_id already set)', {
            userId: user._id,
            leadId: currentLead._id,
            viewCount: queueTop.view_count,
          });
        }
      } else {
        // QueueTop doesn't exist - create it with previous_lead_id
        queueTop = await QueueTop.create({
          lead_id: currentLead._id,
          agent_id: user._id,
          is_on_top: false,
          previous_lead_id: lastPosition.current_lead_id,
          viewed_at: new Date(),
          view_count: 1,
        });
        
        logger.info('Created QueueTop with previous lead link (same filter)', {
          userId: user._id,
          currentLeadId: currentLeadId,
          previousLeadId: lastLeadId,
        });
      }
    } else if (filtersChanged && lastPosition) {
      // Filters changed - DON'T link to previous lead (different filter context)
      if (queueTop) {
        // Just update view tracking, don't change previous_lead_id
        queueTop.viewed_at = new Date();
        queueTop.view_count = (queueTop.view_count || 0) + 1;
        await queueTop.save();
        
        logger.info('Filter changed - not linking previous lead from different filter', {
          userId: user._id,
          currentLeadId: currentLeadId,
          oldFilters: lastPosition.filters,
          newFilters: currentFilters,
        });
      } else {
        // Create QueueTop WITHOUT previous_lead_id (new filter context)
        queueTop = await QueueTop.create({
          lead_id: currentLead._id,
          agent_id: user._id,
          is_on_top: false,
          previous_lead_id: null, // ✅ No previous link across filters
          viewed_at: new Date(),
          view_count: 1,
        });
        
        logger.info('Created QueueTop for new filter (no previous lead)', {
          userId: user._id,
          currentLeadId: currentLeadId,
          newFilters: currentFilters,
        });
      }
    } else if (queueTop) {
      // Same lead - just update view tracking, preserve existing previous_lead_id
      queueTop.viewed_at = new Date();
      queueTop.view_count = (queueTop.view_count || 0) + 1;
      await queueTop.save();
      
      logger.info('Updated view tracking for same lead', {
        userId: user._id,
        leadId: currentLead._id,
        viewCount: queueTop.view_count,
        hasPrevious: !!queueTop.previous_lead_id,
      });
    } else {
      // First time viewing this lead and no previous position
      // Create QueueTop without previous_lead_id (first lead in session)
      queueTop = await QueueTop.create({
        lead_id: currentLead._id,
        agent_id: user._id,
        is_on_top: false,
        previous_lead_id: null,
        viewed_at: new Date(),
        view_count: 1,
      });
      
      logger.info('Created QueueTop for first view (no previous lead)', {
        userId: user._id,
        currentLeadId: currentLeadId,
      });
    }
  
    // Update agent's current position (for next iteration)
    await AgentQueuePosition.findOneAndUpdate(
      { agent_id: user._id },
      {
        current_lead_id: currentLead._id,
        last_viewed_at: new Date(),
        filters: currentFilters,
      },
      { upsert: true }
    );
  
    logger.info('Updated agent queue position', {
      userId: user._id,
      currentLeadId: currentLead._id,
      filters: currentFilters,
      hasChanged: hasChanged,
      previousLeadLinked: hasChanged && lastPosition && lastLeadId,
    });
  
    // Get previous lead ID - but only if it matches current filters
    let previousLeadId = null;
    if (queueTop?.previous_lead_id) {
      // Check if previous lead matches current source filter
      if (currentFilters.source) {
        const Lead = require('../models/Lead');
        
        const previousLead = await Lead.findById(queueTop.previous_lead_id)
          .populate('source_id', 'name')
          .select('source_id')
          .lean();
        
        const previousLeadSource = previousLead?.source_id?.name?.toLowerCase();
        const currentSource = currentFilters.source.toLowerCase();
        
        // Only include previous_lead_id if source matches
        if (previousLeadSource === currentSource) {
          previousLeadId = queueTop.previous_lead_id.toString();
          logger.info('Previous lead matches current source filter', {
            userId: user._id,
            previousLeadId,
            source: currentSource,
          });
        } else {
          logger.info('Previous lead has different source - not including in navigation', {
            userId: user._id,
            previousLeadSource,
            currentSource,
          });
        }
      } else {
        // No source filter - include previous lead
        previousLeadId = queueTop.previous_lead_id.toString();
      }
    }
    
    logger.info('Agent viewed current top lead', {
      userId: user._id,
      currentLeadId: currentLead._id,
      hasQueueTop: !!queueTop,
      viewCount: queueTop?.view_count || 0,
      hasPreviousLeadId: !!previousLeadId,
    });
  
    return res.status(200).json({
      status: 'success',
      data: currentLead,
      queue_info: {
        total_in_queue: queueResult.meta.total,
        current_position: 1,
        breakdown: queueResult.queue_breakdown,
        filtered_by_project: queueResult.queue_info?.filtered_by_project || null,
      },
      navigation: {
        // Previous lead ID only
        previous_lead_id: previousLeadId,
        has_previous: !!previousLeadId,
        
        // Next lead info (none for current top)
        next_lead_id: null,
        has_next: false,
        next_is_current_top: false,
        
        // Current lead status
        is_current_top: true,
        is_pinned: queueTop?.is_on_top || false,
        can_complete: queueTop?.is_on_top || false,
        
        // View tracking
        view_count: queueTop?.view_count || 0,
        first_viewed_at: queueTop?.createdAt || null,
        last_viewed_at: queueTop?.viewed_at || null,
      },
    });
  });
  
  /**
   * Mark current "on top" lead as completed
   * This removes the lead from the top of the agent's queue
   */
  const completeCurrentTopLead = asyncHandler(async (req, res) => {
    const { user } = req;
    const { lead_id } = req.body;
  
    if (!lead_id) {
      return res.status(400).json({
        message: 'lead_id is required',
      });
    }
  
    const {QueueTop} = require('../models');
  
    // Find and update the queue top record
    const result = await QueueTop.findOneAndUpdate(
      {
        lead_id: lead_id,
        agent_id: user._id,
        is_on_top: true,
      },
      {
        is_on_top: false,
        completed_at: new Date(),
      },
      {
        new: true,
      }
    );
  
    if (!result) {
      return res.status(404).json({
        message: 'No active "on top" record found for this lead',
      });
    }
  
    logger.info(`Agent ${user._id} completed working on lead ${lead_id}`);
  
    // Get the next lead in queue and set its previous_lead_id
    try {
      const nextQueueResult = await leadService.getLeadsQueue(user, {
        page: 1,
        limit: 1,
      });
  
      if (nextQueueResult.data && nextQueueResult.data.length > 0) {
        const nextLead = nextQueueResult.data[0];
        
        // Update or create QueueTop for next lead with previous_lead_id
        // Only set navigation fields, don't overwrite is_on_top if it exists
        await QueueTop.findOneAndUpdate(
          {
            lead_id: nextLead._id,
            agent_id: user._id,
          },
          {
            $set: {
              previous_lead_id: lead_id, // Set the completed lead as previous
              viewed_at: new Date(),
            },
            $setOnInsert: {
              // Only set these if creating a new record
              lead_id: nextLead._id,
              agent_id: user._id,
              is_on_top: false, // Default to false for navigation-only records
            },
          },
          {
            upsert: true,
            new: true,
          }
        );
  
        logger.info(`Set navigation: previous lead ${lead_id} for next lead ${nextLead._id}`);
  
        return res.status(200).json({
          status: 'success',
          message: 'Lead completed. Moving to next lead.',
          completed_lead: result,
          next_lead: {
            _id: nextLead._id,
            contact_name: nextLead.contact_name,
            status: nextLead.status,
          },
        });
      }
    } catch (error) {
      logger.error('Failed to set next lead navigation', {
        error: error.message,
        completedLeadId: lead_id,
      });
    }
  
    return res.status(200).json({
      status: 'success',
      message: 'Lead removed from top of queue',
      completed_lead: result,
      next_lead: null,
    });
  });
  
  /**
   * Navigate to a specific lead in the queue
   * Returns lead details with full navigation context (previous/next)
   * Includes identifiers to determine which endpoint to call for navigation
   * 
   * GET /leads/queue/navigate/:lead_id
   */
  const navigateToLead = asyncHandler(async (req, res) => {
    const { user } = req;
    const { lead_id } = req.params;
  
    if (!lead_id) {
      return res.status(400).json({
        message: 'lead_id is required',
      });
    }
  
    const {Lead} = require('../models');
    const {QueueTop} = require('../models');
    const {AgentQueuePosition} = require('../models');
  
    // Get the requested lead
    const lead = await Lead.findById(lead_id).lean();
  
    if (!lead) {
      return res.status(404).json({
        message: 'Lead not found',
      });
    }
  
    // Get QueueTop record for this lead (contains navigation info)
    const queueTop = await QueueTop.findOne({
      lead_id: lead_id,
      agent_id: user._id,
    });
  
    // Get agent's current queue position
    const agentPosition = await AgentQueuePosition.findOne({
      agent_id: user._id,
    });
  
    // Get current top lead from FILTERED queue (for is_current_top check)
    const filteredQueueResult = await leadService.getLeadsQueue(user, {
      ...req.query, // Respect filters
      page: 1,
      limit: 1,
    });
  
    const currentTopLead = filteredQueueResult.data?.[0];
    const currentTopLeadId = currentTopLead?._id?.toString();
    const requestedLeadId = lead_id.toString();
  
    // Determine if this lead is the current top in the FILTERED queue
    const isCurrentTop = currentTopLeadId === requestedLeadId;
  
    // Get FULL UNFILTERED queue to find actual position of this lead
    // (Lead might have different source/filters than current view)
    const fullQueueResult = await leadService.getLeadsQueue(user, {
      // Don't apply source filter - get ALL agent's leads
      project_id: req.query.project_id,
      project_name: req.query.project_name,
      // source: req.query.source,  // ← Remove source filter
      page: 1,
      limit: 1000,
    });
  
    // Find the position of the requested lead in the FULL queue
    let currentPosition = null;
    const leadIndex = fullQueueResult.data?.findIndex(
      (queueLead) => queueLead._id.toString() === requestedLeadId
    );
    
    if (leadIndex !== undefined && leadIndex >= 0) {
      currentPosition = leadIndex + 1; // Convert 0-based index to 1-based position
    }
  
    // Check if this lead is pinned (has active offer)
    const isPinned = queueTop?.is_on_top === true;
  
    // Helper function to check if a lead matches current source filter
    const leadMatchesSourceFilter = async (leadId, sourceFilter) => {
      if (!sourceFilter) return true; // No filter = all leads match
      
      const leadToCheck = await Lead.findById(leadId)
        .populate('source_id', 'name')
        .select('source_id')
        .lean();
      
      const leadSource = leadToCheck?.source_id?.name?.toLowerCase();
      return leadSource === sourceFilter.toLowerCase();
    };
  
    // Get previous lead ID - only if it matches current source filter
    let previousLeadId = null;
    if (queueTop && queueTop.previous_lead_id) {
      const matches = await leadMatchesSourceFilter(queueTop.previous_lead_id, req.query.source);
      if (matches) {
        previousLeadId = queueTop.previous_lead_id.toString();
      } else {
        logger.info('Previous lead filtered out (different source)', {
          userId: user._id,
          previousLeadId: queueTop.previous_lead_id.toString(),
        });
      }
    }
  
    // Determine next lead ID - only if it matches current source filter
    let nextLeadId = null;
    let nextIsCurrentTop = false;
  
    if (isCurrentTop) {
      // If viewing current top, there's no "next" in the chain
      // User should complete this lead to move to actual next lead in queue
      nextLeadId = null;
      nextIsCurrentTop = false;
    } else {
      // If viewing a previous lead, the "next" is the lead that has this lead as previous
      // Search for a lead where previous_lead_id = current lead_id
      const nextQueueTop = await QueueTop.findOne({
        agent_id: user._id,
        previous_lead_id: lead_id,
      });
  
      if (nextQueueTop) {
        const nextMatches = await leadMatchesSourceFilter(nextQueueTop.lead_id, req.query.source);
        if (nextMatches) {
          nextLeadId = nextQueueTop.lead_id.toString();
          // Check if next lead is the current top
          nextIsCurrentTop = nextLeadId === currentTopLeadId;
        } else {
          logger.info('Next lead filtered out (different source)', {
            userId: user._id,
            nextLeadId: nextQueueTop.lead_id.toString(),
          });
        }
      } else {
        // No next lead in chain - might be because this was the last lead viewed
        // Check if current top is different from this lead
        if (currentTopLeadId && currentTopLeadId !== requestedLeadId) {
          // Current top is the "next" lead (already filtered)
          nextLeadId = currentTopLeadId;
          nextIsCurrentTop = true;
        }
      }
    }
  
    // Fetch full lead data with relationships
    const fullLead = await leadService.getLeadById(lead_id, user, hasPermission, PERMISSIONS, true);
  
    logger.info('Agent navigated to lead', {
      userId: user._id,
      leadId: lead_id,
      isCurrentTop,
      isPinned,
      hasPrevious: !!previousLeadId,
      hasNext: !!nextLeadId,
      nextIsCurrentTop,
    });
  
    return res.status(200).json({
      status: 'success',
      data: fullLead,
      navigation: {
        // Previous lead ID only (no full object)
        previous_lead_id: previousLeadId,
        has_previous: !!previousLeadId,
  
        // Next lead ID only (no full object)
        next_lead_id: nextLeadId,
        has_next: !!nextLeadId,
        next_is_current_top: nextIsCurrentTop,
  
        // Current lead status
        is_current_top: isCurrentTop,
        is_pinned: isPinned,
        can_complete: isPinned, // Can only complete if pinned
  
        // View tracking
        view_count: queueTop?.view_count || 0,
        first_viewed_at: queueTop?.createdAt || null,
        last_viewed_at: queueTop?.viewed_at || null,
      },
      queue_info: {
        total_in_queue: filteredQueueResult.meta?.total || 0, // Total in FILTERED queue
        current_position: currentPosition, // Position in FULL queue (unfiltered)
        breakdown: filteredQueueResult.queue_breakdown || {},
        filtered_by_project: filteredQueueResult.queue_info?.filtered_by_project || null,
      },
      ui_hints: {
        // UI guidance for which buttons to show
        show_previous_button: !!previousLeadId,
        show_next_button: !!nextLeadId,
        show_complete_button: isPinned && isCurrentTop,
        show_back_to_current_button: !isCurrentTop && !!currentTopLead,
  
        // Which endpoint to call for next button
        next_endpoint: nextIsCurrentTop 
          ? '/leads/queue/current-top' 
          : nextLeadId 
            ? `/leads/queue/navigate/${nextLeadId}` 
            : null,
        
        // Which endpoint to call for previous button
        previous_endpoint: previousLeadId 
          ? `/leads/queue/navigate/${previousLeadId}` 
          : null,
  
        // Which endpoint to call for complete button
        complete_endpoint: isPinned 
          ? '/leads/currenttop-completed' 
          : null,
      },
    });
  });

/**
 * Update secondary email for a lead
 * Separate API endpoint for managing secondary_email field
 */
const updateSecondaryEmail = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { secondary_email } = req.body;
  const { user } = req;

  if (!(await hasPermission(user.role, PERMISSIONS.LEAD_UPDATE))) {
    throw new AuthorizationError("You don't have permission to update leads");
  }

  // Call service method to update secondary email
  const updatedLead = await leadService.updateSecondaryEmail(id, secondary_email, user);

  return res.status(200).json({
    status: 'success',
    message: 'Secondary email updated successfully',
    data: updatedLead,
  });
});

/**
 * Make primary email - Swap emails when setting which email is primary
 * This API accepts an email address and makes it the primary email by swapping
 */
const makePrimaryEmail = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { email } = req.body;
  const { user } = req;

  if (!(await hasPermission(user.role, PERMISSIONS.LEAD_UPDATE))) {
    throw new AuthorizationError("You don't have permission to update leads");
  }

  // Call service method to make email primary
  const updatedLead = await leadService.makePrimaryEmail(id, email, user);

  return res.status(200).json({
    status: 'success',
    message: `Email "${email}" is now the primary email. Emails have been swapped.`,
    data: updatedLead,
  });
});

/**
 * Update offer_calls field for a lead
 * Increases or decreases the offer_calls value based on query parameters
 */
const updateOfferCalls = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { increase, decrease } = req.query;
  const { user } = req;

  if (!(await hasPermission(user.role, PERMISSIONS.LEAD_UPDATE))) {
    throw new AuthorizationError("You don't have permission to update leads");
  }

  // Call service method to update offer_calls
  const updatedLead = await leadService.updateOfferCalls(id, increase, decrease, user);

  return res.status(200).json({
    status: 'success',
    message: `offer_calls ${increase !== undefined ? 'increased' : 'decreased'} successfully`,
    data: updatedLead,
  });
});

/**
 * Generate and save lead summary using Leadbot conversation API
 * User passes user_id and lead_id; fetches conversation from leadbot and saves summary to DB
 * @route POST /leads/:id/generate-summary
 */
const generateSummary = asyncHandler(async (req, res) => {
  const { id: leadId } = req.params;
  const { user_id: userId, limit } = req.body;
  const { user } = req;

  if (!(await hasPermission(user.role, PERMISSIONS.LEAD_READ_ASSIGNED)) && !(await hasPermission(user.role, PERMISSIONS.LEAD_READ_ALL))) {
    throw new AuthorizationError("You don't have permission to generate lead summaries");
  }

  const { generateAndSaveSummaryFromLeadbot } = require('../services/leadSummaryService');
  const result = await generateAndSaveSummaryFromLeadbot(userId, leadId, {
    trigger: 'manual',
    limit: limit || 20,
  });

  if (!result.saved) {
    return res.status(400).json({
      status: 'error',
      message: result.error || 'Failed to generate and save lead summary',
    });
  }

  return res.status(200).json({
    status: 'success',
    message: 'Lead summary generated and saved successfully',
    data: { summary: result.summary },
  });
});

module.exports = {
  getAllLeads,
  getArchivedLeads,
  getLeadById,
  createLead,
  createLeads,
  updateLead,
  deleteLead,
  permanentlyDeleteLead,
  getMyLeads,
  bulkUpdateLeads,
  getLeadIds,
  importLeadsFromExcel,
  getImportProgress,
  getImportHistory,
  revertLeadImport,
  getLeadsByPartnerIds,
  updateLeadStatus,
  bulkUpdateLeadStatus,
  downloadImportFile,
  getExtraLeads,
  getAssignedLeads,
  getLeadsQueue,
  getCurrentTopLead,
  completeCurrentTopLead,
  navigateToLead,
  updateSecondaryEmail,
  makePrimaryEmail,
  updateOfferCalls,
  generateSummary,
};
