/**
 * Confirmation Controller
 * Handles operations for confirmation management with document uploads
 */
const fs = require('fs');
const { hasPermission } = require('../middleware/authorize');
const { PERMISSIONS } = require('../middleware/roles/permissions');
const { asyncHandler, AuthorizationError } = require('../helpers/errorHandler');
const { confirmationService } = require('../services');

/**
 * Create a new confirmation with documents
 */
const createConfirmation = asyncHandler(async (req, res) => {
  const { user } = req;

  if (!(await hasPermission(user.role, PERMISSIONS.CONFIRMATION_CREATE))) {
    throw new AuthorizationError("You don't have permission to create confirmations");
  }

  const files = req.files || [];
  const result = await confirmationService.createConfirmation(req.body, files, user);

  return res.status(201).json(result);
});

/**
 * Get all confirmations with pagination and filtering
 */
const getAllConfirmations = asyncHandler(async (req, res) => {
  const { user } = req;

  // Check if user has permission to read confirmations
  const canReadAll = await hasPermission(user.role, PERMISSIONS.CONFIRMATION_READ_ALL);
  const canReadOwn = await hasPermission(user.role, PERMISSIONS.CONFIRMATION_READ);

  if (!canReadAll && !canReadOwn) {
    throw new AuthorizationError("You don't have permission to view confirmations");
  }

  const result = await confirmationService.getAllConfirmations(req.query, hasPermission, PERMISSIONS, user);

  return res.status(200).json(result);
});

/**
 * Get confirmation by ID
 */
const getConfirmationById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { user } = req;
  const { showInactive } = req.query;

  if (!(await hasPermission(user.role, PERMISSIONS.CONFIRMATION_READ))) {
    throw new AuthorizationError("You don't have permission to view confirmations");
  }

  // Convert string query parameter to boolean
  const includeInactive = showInactive === 'true';

  const confirmation = await confirmationService.getConfirmationById(id, includeInactive);

  return res.status(200).json(confirmation);
});

/**
 * Update confirmation
 */
const updateConfirmation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { user } = req;

  if (!(await hasPermission(user.role, PERMISSIONS.CONFIRMATION_UPDATE))) {
    throw new AuthorizationError("You don't have permission to update confirmations");
  }

  const files = req.files || [];
  const result = await confirmationService.updateConfirmation(id, req.body, files, user);

  return res.status(200).json(result);
});

/**
 * Add documents to existing confirmation
 */
const addDocumentsToConfirmation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { user } = req;

  if (!(await hasPermission(user.role, PERMISSIONS.CONFIRMATION_UPDATE))) {
    throw new AuthorizationError("You don't have permission to update confirmations");
  }

  const files = req.files || [];
  if (!files || files.length === 0) {
    return res.status(400).json({
      status: 'error',
      message: 'No files provided',
    });
  }

  const result = await confirmationService.addDocumentsToConfirmation(id, files, user);

  return res.status(200).json({
    status: 'success',
    message: 'Documents added successfully',
    data: result,
  });
});

/**
 * Delete confirmation (soft delete)
 */
const deleteConfirmation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { user } = req;

  if (!(await hasPermission(user.role, PERMISSIONS.CONFIRMATION_DELETE))) {
    throw new AuthorizationError("You don't have permission to delete confirmations");
  }

  const result = await confirmationService.deleteConfirmation(id);

  return res.status(200).json(result);
});

/**
 * Bulk delete confirmations (soft delete)
 */
const bulkDeleteConfirmations = asyncHandler(async (req, res) => {
  const { ids } = req.body;
  const { user } = req;

  if (!(await hasPermission(user.role, PERMISSIONS.CONFIRMATION_DELETE))) {
    throw new AuthorizationError("You don't have permission to delete confirmations");
  }

  const result = await confirmationService.bulkDeleteConfirmations(ids, user);

  return res.status(200).json(result);
});

/**
 * Restore a previously soft-deleted confirmation
 */
const restoreConfirmation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { user } = req;

  if (!(await hasPermission(user.role, PERMISSIONS.CONFIRMATION_UPDATE))) {
    throw new AuthorizationError("You don't have permission to restore confirmations");
  }

  const result = await confirmationService.restoreConfirmation(id);

  return res.status(200).json(result);
});

/**
 * View/download a document from a confirmation
 */
const viewDocument = asyncHandler(async (req, res) => {
  const { user } = req;
  const { documentId } = req.params;

  // Check if user has permission to view documents
  // Only admins and agents can view documents
  const canReadOwn = await hasPermission(user.role, PERMISSIONS.CONFIRMATION_READ);
  const canReadAll = await hasPermission(user.role, PERMISSIONS.CONFIRMATION_READ_ALL);
  if (!canReadOwn && !canReadAll) {
    throw new AuthorizationError("You don't have permission to view confirmation documents");
  }

  try {
    // Get document details from service
    const { document, filePath, confirmation } = await confirmationService.getDocumentById(documentId);

    // For agents, check if they have access to this confirmation
    if (user.role !== 'admin' && confirmation.creator_id.toString() !== user._id.toString()) {
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

module.exports = {
  createConfirmation,
  getAllConfirmations,
  getConfirmationById,
  updateConfirmation,
  addDocumentsToConfirmation,
  deleteConfirmation,
  bulkDeleteConfirmations,
  restoreConfirmation,
  viewDocument,
}; 