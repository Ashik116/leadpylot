const offerService = require('../services/offerService');
const { hasPermission } = require('../middleware/authorize');
const { PERMISSIONS } = require('../middleware/roles/permissions');
const { asyncHandler } = require('../utils/errorHandler');
const { AuthorizationError } = require('../utils/errorHandler');
const logger = require('../utils/logger');
const { getOffersOptimized, getOffersWithTickets } = require('../services/offerService/utils/queryOptimizer');
const { createActivity } = require('../services/activityService/utils');

// Import helper functions
const {
  checkReadPermission,
  checkUpdatePermission,
  applyAgentFilter,
  validateOfferAccess,
  buildFilterOptions,
  sendPdfResponse,
  sendJsonResponse,
  sendSuccessResponse,
  sendDeprecatedResponse,
  sendCreatedResponse,
} = require('./helpers');

/**
 * Get all offers with pagination and filtering
 * OPTIMIZED: Using ultra-fast query for simple list requests
 */
const getAllOffers = asyncHandler(async (req, res) => {
  // Use optimized version for simple list queries (no progress filters)
  // Falls back to original for complex queries
  const { has_progress } = req.query;

  let result;
  if (!has_progress) {
    // Use optimized version for simple lists (469x faster!)
    try {
      result = await getOffersOptimized(
        req.user,
        req.query,
        hasPermission,
        PERMISSIONS
      );
    } catch (error) {
      logger.warn('Optimized query failed, falling back to original:', error.message);
      result = await offerService.getAllOffers(
        req.user,
        req.query,
        hasPermission,
        PERMISSIONS
      );
    }
  } else {
    // Use original aggregation for complex progress filtering
    result = await offerService.getAllOffers(
      req.user,
      req.query,
      hasPermission,
      PERMISSIONS
    );
  }

  sendJsonResponse(res, result);
});

/**
 * Get offer by ID with PDF information
 */
const getOfferById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { returnPdf } = req.query;

  // No PDF generation options - use manual /pdf/generate-offer endpoint
  const options = {};

  const offer = await offerService.getOfferById(
    id,
    req.user,
    hasPermission,
    PERMISSIONS,
    options
  );

  // If returnPdf is true and PDF exists, return the PDF directly (now async)
  if (returnPdf === 'true' && offer.pdfPath) {
    try {
      await sendPdfResponse(res, offer.pdfPath, offer.pdfFilename);
      return;
    } catch (error) {
      logger.error('Error sending PDF:', error);
      // If PDF send fails, fall back to returning offer data
    }
  }

  // Create activity log for viewing offer details
  try {
    const offerTitle = offer.title || `Offer #${id}`;
    await createActivity({
      _creator: req.user._id,
      _subject_id: id,
      subject_type: 'Offer',
      action: 'read',
      message: `Viewed offer details: ${offerTitle}`,
      type: 'info',
      details: {
        action_type: 'offer_viewed',
        offer_id: id,
        offer_title: offerTitle,
        returned_pdf: returnPdf === 'true' && offer.pdfPath ? true : false,
      },
    });
  } catch (activityError) {
    logger.warn('Failed to log offer view activity (non-blocking)', {
      error: activityError.message,
      offerId: id,
    });
  }

  // Return the offer data with PDF information
  sendJsonResponse(res, offer);
});

/**
 * Create a new offer (PDF generation removed - use /pdf/generate-offer endpoint)
 */
const createOffer = asyncHandler(async (req, res) => {
  const token = req.headers.authorization.split(' ')[1];
  const files = req.files || [];

  // Add the agent_id if not provided
  if (!req.body.agent_id) {
    req.body.agent_id = req.user._id;
  }

  // Automatic PDF generation enabled
  const options = {
    generatePdf: true,
  };

  // Create the offer with auto PDF generation (parallel processing)
  const offer = await offerService.createOffer(
    req.body,
    files,
    req.user,
    hasPermission,
    PERMISSIONS,
    options,
    token
  );

  // Return the offer data with auto PDF generation info
  sendCreatedResponse(res, offer);
});

/**
 * Update an offer (PDF generation removed - use /pdf/generate-offer endpoint)
 */
const updateOffer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const files = req.files || [];

  // No automatic PDF generation during update
  const options = {
    generatePdf: false,
  };

  const offer = await offerService.updateOffer(
    id,
    req.body,
    files,
    req.user,
    hasPermission,
    PERMISSIONS,
    options
  );

  // Return the offer data only (no PDF generation)
  sendJsonResponse(res, offer);
});

/**
 * Download PDF for offer (deprecated - use /pdf/generate-offer and /documents/:id/download)
 */
const downloadOfferPdf = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Create activity log for PDF download attempt (even though deprecated)
  try {
    const offer = await offerService.getOfferById(id, req.user, hasPermission, PERMISSIONS, {});
    const offerTitle = offer?.title || `Offer #${id}`;
    await createActivity({
      _creator: req.user._id,
      _subject_id: id,
      subject_type: 'Offer',
      action: 'read',
      message: `Attempted to download PDF for offer: ${offerTitle} (deprecated endpoint)`,
      type: 'info',
      details: {
        action_type: 'offer_pdf_download_attempted',
        offer_id: id,
        offer_title: offerTitle,
        endpoint: 'deprecated',
      },
    });
  } catch (activityError) {
    logger.warn('Failed to log PDF download activity (non-blocking)', {
      error: activityError.message,
      offerId: id,
    });
  }

  sendDeprecatedResponse(
    res,
    'This endpoint is deprecated. Use /pdf/generate-offer to generate PDFs and /documents/:id/download to download them.',
    {
      generate: '/pdf/generate-offer',
      list: `/pdf/offer/${id}/documents`,
      download: '/documents/:documentId/download',
    }
  );
});

/**
 * Delete offer(s)
 */
const deleteOffers = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { ids } = req.body;

  const result = await offerService.deleteOffers(
    id || ids,
    req.user,
    hasPermission,
    PERMISSIONS
  );

  sendJsonResponse(res, result);
});

/**
 * Update offers to set current_stage to 'out'
 * Accepts array of offer IDs in request body: { ids: ["id1", "id2"] } or ["id1", "id2"]
 */
const updateOfferToOut = asyncHandler(async (req, res) => {
  const offerIds = req.normalizedOfferIds || [];

  if (!offerIds || offerIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No offer IDs provided',
    });
  }

  const result = await offerService.updateOffersToOut(
    offerIds,
    req.user,
    hasPermission,
    PERMISSIONS
  );

  sendJsonResponse(res, result);
});

/**
 * Revert offers from 'out' stage back to 'offer' stage
 * Accepts array of offer IDs in request body: { ids: ["id1", "id2"] } or ["id1", "id2"]
 */
const revertOfferFromOut = asyncHandler(async (req, res) => {
  const offerIds = req.normalizedOfferIds || [];

  if (!offerIds || offerIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No offer IDs provided',
    });
  }

  const result = await offerService.revertOffersFromOut(
    offerIds,
    req.user,
    hasPermission,
    PERMISSIONS
  );

  sendJsonResponse(res, result);
});

/**
 * Restore a previously soft-deleted offer
 */
const restoreOffer = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const offer = await offerService.restoreOffer(id, req.user, hasPermission, PERMISSIONS);

  sendSuccessResponse(res, 'Offer restored successfully', offer, 200);
});

/**
 * Get offers by lead ID
 */
const getOffersByLeadId = asyncHandler(async (req, res) => {
  const { leadId } = req.params;

  const offers = await offerService.getOffersByLeadId(
    leadId,
    req.user,
    hasPermission,
    PERMISSIONS,
    req.query
  );

  // Create activity log for viewing offers by lead
  try {
    await createActivity({
      _creator: req.user._id,
      _subject_id: leadId,
      subject_type: 'Lead',
      action: 'read',
      message: `Viewed offers for lead: ${leadId}`,
      type: 'info',
      details: {
        action_type: 'offers_by_lead_viewed',
        lead_id: leadId,
        offers_count: offers?.data?.length || offers?.length || 0,
      },
    });
  } catch (activityError) {
    logger.warn('Failed to log offers by lead view activity (non-blocking)', {
      error: activityError.message,
      leadId,
    });
  }

  sendJsonResponse(res, offers);
});

/**
 * Get offers by project ID
 */
const getOffersByProjectId = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const offers = await offerService.getOffersByProjectId(
    projectId,
    req.user,
    hasPermission,
    PERMISSIONS,
    req.query
  );

  // Create activity log for viewing offers by project
  try {
    await createActivity({
      _creator: req.user._id,
      _subject_id: projectId,
      subject_type: 'Project',
      action: 'read',
      message: `Viewed offers for project: ${projectId}`,
      type: 'info',
      details: {
        action_type: 'offers_by_project_viewed',
        project_id: projectId,
        offers_count: offers?.data?.length || offers?.length || 0,
      },
    });
  } catch (activityError) {
    logger.warn('Failed to log offers by project view activity (non-blocking)', {
      error: activityError.message,
      projectId,
    });
  }

  sendJsonResponse(res, offers);
});

/**
 * Remove document from offer
 */
const removeDocumentFromOffer = asyncHandler(async (req, res) => {
  const { offerId, documentId } = req.params;
  const { user } = req;

  const updatedOffer = await offerService.removeDocumentFromOffer(
    offerId,
    documentId,
    user,
    hasPermission,
    PERMISSIONS
  );

  sendJsonResponse(res, updatedOffer);
});

/**
 * Get offers with progress (offers that have openings, confirmations, or payment vouchers)
 * Optimized with helper functions
 */
const getOffersWithProgress = asyncHandler(async (req, res) => {
  const { user } = req;
  const { page, limit, search, status, project_id, lead_id, agent_id, stage, has_progress, sortBy, sortOrder } =
    req.query;

  // Check if user has permission to read offers
  const canReadAll = await hasPermission(user.role, PERMISSIONS.OFFER_READ_ALL);
  const canReadOwn = await hasPermission(user.role, PERMISSIONS.OFFER_READ_OWN);

  if (!canReadAll && !canReadOwn) {
    throw new AuthorizationError("You don't have permission to view offers");
  }

  const parsedPage = parseInt(page) || 1;
  const parsedLimit = typeof limit !== 'undefined' && limit !== null ? parseInt(limit) : undefined;

  const options = {
    page: parsedPage,
    // For 'all_grouped' (multi-table view), use large limit. Otherwise use provided or default 20.
    limit: typeof parsedLimit !== 'undefined' ? parsedLimit : (has_progress === 'all_grouped' ? 999999 : 20),
    search: search || null,
    status: status || null,
    project_id: project_id || null,
    lead_id: lead_id || null,
    agent_id: agent_id || null,
    stage: stage || null,
    has_progress: has_progress || 'any', // Default to 'any' to show all offers with any progress
    sortBy: sortBy || null,
    sortOrder: sortOrder || null,
  };

  // If user can only read their own offers, add agent_id filter
  if (!canReadAll && canReadOwn) {
    options.agent_id = user._id;
  }

  const result = await offerService.getOffersWithProgress(
    options,
    user,
    hasPermission,
    PERMISSIONS
  );

  // Create activity log for viewing offers with progress
  try {
    const filterInfo = [];
    if (search) filterInfo.push(`search: "${search}"`);
    if (project_id) filterInfo.push(`project: ${project_id}`);
    if (lead_id) filterInfo.push(`lead: ${lead_id}`);
    if (agent_id) filterInfo.push(`agent: ${agent_id}`);
    if (status) filterInfo.push(`status: ${status}`);
    if (stage) filterInfo.push(`stage: ${stage}`);
    if (has_progress) filterInfo.push(`progress: ${has_progress}`);
    
    await createActivity({
      _creator: user._id,
      _subject_id: null,
      subject_type: 'Offer',
      action: 'read',
      message: `Viewed offers with progress${filterInfo.length > 0 ? ` (${filterInfo.join(', ')})` : ''}`,
      type: 'info',
      details: {
        action_type: 'offers_progress_viewed',
        filters: options,
        result_count: result?.data?.length || 0,
        total: result?.meta?.total || 0,
      },
    });
  } catch (activityError) {
    logger.warn('Failed to log offers progress view activity (non-blocking)', {
      error: activityError.message,
    });
  }

  return res.status(200).json(result);
});

/**
 * Get single offer with progress by ID
 * Returns the same structure as one item from getOffersWithProgress
 */
const getOfferWithProgressById = asyncHandler(async (req, res) => {
  const { user } = req;
  const { id } = req.params;

  // Check if user has permission to read offers
  const canReadAll = await hasPermission(user.role, PERMISSIONS.OFFER_READ_ALL);
  const canReadOwn = await hasPermission(user.role, PERMISSIONS.OFFER_READ_OWN);

  if (!canReadAll && !canReadOwn) {
    throw new AuthorizationError("You don't have permission to view offers");
  }

  const offer = await offerService.getOfferWithProgressById(
    id,
    user,
    hasPermission,
    PERMISSIONS
  );

  // Create activity log for viewing single offer with progress
  try {
    const offerTitle = offer?.title || `Offer #${id}`;
    await createActivity({
      _creator: user._id,
      _subject_id: id,
      subject_type: 'Offer',
      action: 'read',
      message: `Viewed offer progress details: ${offerTitle}`,
      type: 'info',
      details: {
        action_type: 'offer_progress_viewed',
        offer_id: id,
        offer_title: offerTitle,
      },
    });
  } catch (activityError) {
    logger.warn('Failed to log offer progress view activity (non-blocking)', {
      error: activityError.message,
      offerId: id,
    });
  }

  return res.status(200).json({
    success: true,
    data: offer,
  });
});

/**
 * Add documents to offer
 * Optimized with helper functions and async validation
 */
const addDocumentsToOffer = asyncHandler(async (req, res) => {
  const { user } = req;
  const { offerId } = req.params;
  const files = req.files || [];
  const { documentTypes } = req.body;

  // Check permissions using helper
  const { canUpdateAll, canUpdateOwn } = await checkUpdatePermission(user, hasPermission, PERMISSIONS);

  // Validate access for users who can only update own offers (async)
  await validateOfferAccess(
    offerId,
    user,
    canUpdateAll,
    offerService.getOfferById,
    hasPermission,
    PERMISSIONS
  );

  // Add documents (this is already async in the service)
  const updatedOffer = await offerService.addDocumentsToOffer(
    offerId,
    files,
    user,
    documentTypes
  );

  sendJsonResponse(res, updatedOffer);
});

/**
 * Send offer to Netto1 system
 */
const createNetto1FromOffer = asyncHandler(async (req, res) => {
  const { offerId } = req.params;
  const { bankerRate, agentRate, notes } = req.body;
  const files = req.files || [];

  const result = await offerService.createNetto1FromOffer(
    offerId,
    bankerRate,
    agentRate,
    files,
    req.user,
    hasPermission,
    PERMISSIONS,
    notes || ''
  );

  sendSuccessResponse(res, 'Offer successfully sent to Netto1', result, 200);
});

/**
 * Send offer to Netto2 system
 */
const createNetto2FromOffer = asyncHandler(async (req, res) => {
  const { offerId } = req.params;
  const { bankerRate, agentRate, notes } = req.body;
  const files = req.files || [];

  const result = await offerService.createNetto2FromOffer(
    offerId,
    bankerRate,
    agentRate,
    files,
    req.user,
    hasPermission,
    PERMISSIONS,
    notes || ''
  );

  sendSuccessResponse(res, 'Offer successfully sent to Netto2', result, 200);
});

/**
 * Get offers with tickets (for Offer Tickets dashboard)
 * Returns offers that have associated tickets, in offer-centric format
 * @route GET /offers/tickets
 */
const getOfferTickets = asyncHandler(async (req, res) => {
  const result = await getOffersWithTickets(
    req.user,
    req.query,
    hasPermission,
    PERMISSIONS
  );
  sendJsonResponse(res, result);
});

/**
 * View/download a document from an offer
 */
const viewDocument = asyncHandler(async (req, res) => {
  const { user } = req;
  const { documentId } = req.params;
  const fs = require('fs');

  // Check if user has permission to view documents
  const canReadOwn = await hasPermission(user.role, PERMISSIONS.OFFER_READ_OWN);
  const canReadAll = await hasPermission(user.role, PERMISSIONS.OFFER_READ_ALL);
  if (!canReadOwn && !canReadAll) {
    throw new AuthorizationError("You don't have permission to view offer documents");
  }

  try {
    // Get document details from service
    const { document, filePath, offer } = await offerService.getDocumentById(documentId);

    // For agents, check if they have access to this offer
    if (!canReadAll && offer.agent_id && offer.agent_id.toString() !== user._id.toString()) {
      throw new AuthorizationError("You don't have permission to view this document");
    }

    // Create activity log for document view/download BEFORE streaming the file
    // This ensures the activity is logged even if the stream fails
    try {
      const offerTitle = offer.title || `Offer #${offer._id}`;
      const activityData = {
        _creator: user._id,
        _subject_id: offer._id,
        subject_type: 'Offer',
        action: 'read',
        message: `Document viewed/downloaded: ${document.filename} from offer: ${offerTitle}`,
        type: 'info',
        details: {
          action_type: 'document_viewed_downloaded',
          offer_id: offer._id,
          offer_title: offerTitle,
          document_id: document._id,
          document_filename: document.filename,
          document_type: document.type,
        },
      };
      
      logger.info('Creating activity log for document view', {
        documentId,
        offerId: offer._id,
        userId: user._id,
        activityData,
      });
      
      const activityResult = await createActivity(activityData);
      
      logger.info('Activity logged successfully for document view', {
        documentId,
        offerId: offer._id,
        userId: user._id,
        activityId: activityResult?._id || 'unknown',
      });
    } catch (activityError) {
      // Log the error but don't block the file download
      logger.error('Failed to log document view activity', {
        error: activityError.message,
        stack: activityError.stack,
        documentId,
        offerId: offer._id,
        userId: user._id,
      });
    }

    // Set appropriate headers for file download
    res.setHeader('Content-Type', document.filetype || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${document.filename}"`);

    // Stream the file to the response
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    logger.error('Error in viewDocument', {
      error: error.message,
      stack: error.stack,
      documentId,
      userId: user._id,
    });
    if (error.message.includes('not found') || error.message.includes('Invalid')) {
      return res.status(404).json({
        status: 'error',
        message: error.message,
      });
    }
    throw error;
  }
});

module.exports = {
  getAllOffers,
  getOfferById,
  createOffer,
  updateOffer,
  downloadOfferPdf,
  deleteOffers,
  updateOfferToOut,
  revertOfferFromOut,
  restoreOffer,
  getOffersByLeadId,
  getOffersByProjectId,
  removeDocumentFromOffer,
  addDocumentsToOffer,
  getOffersWithProgress,
  getOfferWithProgressById,
  createNetto1FromOffer,
  createNetto2FromOffer,
  getOfferTickets,
  viewDocument,
};
