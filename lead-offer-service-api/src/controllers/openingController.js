/**
 * Opening Controller
 * Handles operations for opening management with document uploads
 */
const fs = require('fs');
const { hasPermission } = require('../middleware');
const { PERMISSIONS } = require('../middleware/roles/permissions');
const { asyncHandler, AuthorizationError } = require('../helpers/errorHandler');
const { openingService } = require('../services');

/**
 * Create a new opening with documents
 */
const createOpening = asyncHandler(async (req, res) => {
  const { user } = req;

  if (!(await hasPermission(user.role, PERMISSIONS.OPENING_CREATE))) {
    throw new AuthorizationError("You don't have permission to create openings");
  }

  const files = req.files || [];
  const result = await openingService.createOpening(req.body, files, user);

  return res.status(201).json(result);
});

/**
 * Get all openings with pagination and filtering
 */
const getAllOpenings = asyncHandler(async (req, res) => {
  const { user } = req;
  const { page, limit, offer_id, showInactive, search } = req.query;

  // Check if user has permission to read openings
  const canReadAll = await hasPermission(user.role, PERMISSIONS.OPENING_READ_ALL);
  const canReadOwn = await hasPermission(user.role, PERMISSIONS.OPENING_READ);

  if (!canReadAll && !canReadOwn) {
    throw new AuthorizationError("You don't have permission to view openings");
  }

  const options = {
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 20,
    showInactive: showInactive === 'true',
    search: search || '',
  };

  if (offer_id) {
    options.offer_id = offer_id;
  }

  // If user can only read their own openings, add agent_id filter for lead assignment
  if (!canReadAll && canReadOwn) {
    options.agent_id = user._id;
  }

  if (search && search.trim() !== '') {
    options.search = search;
  }

  const result = await openingService.getAllOpenings(options);

  return res.status(200).json(result);
});

/**
 * Get opening by ID
 */
const getOpeningById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { user } = req;
  const { showInactive } = req.query;

  if (!(await hasPermission(user.role, PERMISSIONS.OPENING_READ))) {
    throw new AuthorizationError("You don't have permission to view openings");
  }

  // Convert string query parameter to boolean
  const includeInactive = showInactive === 'true';

  const opening = await openingService.getOpeningById(id, includeInactive);

  return res.status(200).json(opening);
});

/**
 * Update opening
 */
const updateOpening = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { user } = req;

  if (!(await hasPermission(user.role, PERMISSIONS.OPENING_UPDATE))) {
    throw new AuthorizationError("You don't have permission to update openings");
  }

  const files = req.files || [];
  const result = await openingService.updateOpening(id, req.body, files, user);

  return res.status(200).json(result);
});

/**
 * Add documents to existing opening
 */
const addDocumentsToOpening = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { user } = req;

  if (!(await hasPermission(user.role, PERMISSIONS.OPENING_UPDATE))) {
    throw new AuthorizationError("You don't have permission to update openings");
  }

  const files = req.files || [];
  if (!files || files.length === 0) {
    return res.status(400).json({
      status: 'error',
      message: 'No files provided',
    });
  }

  const result = await openingService.addDocumentsToOpening(id, files, user);

  return res.status(200).json({
    status: 'success',
    message: 'Documents added successfully',
    data: result,
  });
});

/**
 * Delete opening (soft delete)
 */
const deleteOpening = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { user } = req;

  if (!(await hasPermission(user.role, PERMISSIONS.OPENING_DELETE))) {
    throw new AuthorizationError("You don't have permission to delete openings");
  }

  const result = await openingService.deleteOpening(id);

  return res.status(200).json(result);
});

/**
 * Bulk delete openings (soft delete)
 */
const bulkDeleteOpenings = asyncHandler(async (req, res) => {
  const { ids } = req.body;
  const { user } = req;

  if (!(await hasPermission(user.role, PERMISSIONS.OPENING_DELETE))) {
    throw new AuthorizationError("You don't have permission to delete openings");
  }

  const result = await openingService.bulkDeleteOpenings(ids, user);

  return res.status(200).json(result);
});

/**
 * Restore a previously soft-deleted opening
 */
const restoreOpening = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { user } = req;

  if (!(await hasPermission(user.role, PERMISSIONS.OPENING_UPDATE))) {
    throw new AuthorizationError("You don't have permission to restore openings");
  }

  const result = await openingService.restoreOpening(id);

  return res.status(200).json(result);
});

/**
 * View/download a document from an opening
 */
const viewDocument = asyncHandler(async (req, res) => {
  const { user } = req;
  const { documentId } = req.params;

  // Check if user has permission to view documents
  // Only admins and agents can view documents
  const canReadOwn = await hasPermission(user.role, PERMISSIONS.OPENING_READ);
  const canReadAll = await hasPermission(user.role, PERMISSIONS.OPENING_READ_ALL);
  if (!canReadOwn && !canReadAll) {
    throw new AuthorizationError("You don't have permission to view opening documents");
  }

  try {
    // Get document details from service
    const { document, filePath, opening } = await openingService.getDocumentById(documentId);

    // For agents, check if they have access to this opening
    if (user.role !== 'admin' && opening.creator_id.toString() !== user._id.toString()) {
      throw new AuthorizationError("You don't have permission to view this document");
    }

    // Set appropriate headers for file download
    res.setHeader('Content-Type', document.filetype || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${document.filename}"`);

    // Stream the file to the response
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('Invalid')) {
      return res.status(404).json({
        status: 'error',
        message: error.message,
      });
    }
    throw error;
  }
});

/**
 * Remove a document from an opening
 */
const removeDocumentFromOpening = asyncHandler(async (req, res) => {
  const { openingId, documentId } = req.params;
  const { user } = req;

  // Check if user has permission to update openings
  if (!(await hasPermission(user.role, PERMISSIONS.OPENING_UPDATE))) {
    throw new AuthorizationError("You don't have permission to remove documents from openings");
  }

  try {
    const result = await openingService.removeDocumentFromOpening(openingId, documentId, user);

    return res.status(200).json({
      status: 'success',
      message: 'Document removed successfully',
      data: result,
    });
  } catch (error) {
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
  createOpening,
  getAllOpenings,
  getOpeningById,
  updateOpening,
  addDocumentsToOpening,
  deleteOpening,
  bulkDeleteOpenings,
  restoreOpening,
  viewDocument,
  removeDocumentFromOpening,
};
