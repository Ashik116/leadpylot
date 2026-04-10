/**
 * Payment Voucher Controller
 * Handles operations for payment voucher management with document uploads
 */
const fs = require('fs');
const { hasPermission } = require('../middleware');
const { PERMISSIONS } = require('../middleware/roles/permissions');
const { asyncHandler, AuthorizationError } = require('../helpers/errorHandler');
const { paymentVoucherService } = require('../services');

/**
 * Create a new payment voucher with documents
 */
const createPaymentVoucher = asyncHandler(async (req, res) => {
  const { user } = req;

  if (!(await hasPermission(user.role, PERMISSIONS.PAYMENT_VOUCHER_CREATE))) {
    throw new AuthorizationError("You don't have permission to create payment vouchers");
  }

  const files = req.files || [];
  const result = await paymentVoucherService.createPaymentVoucher(req.body, files, user);

  return res.status(201).json(result);
});

/**
 * Get all payment vouchers with pagination and filtering
 */
const getAllPaymentVouchers = asyncHandler(async (req, res) => {
  const { user } = req;
  const { page, limit, confirmation_id, showInactive, agent_id, search } = req.query;

  // Check if user has permission to read payment vouchers
  const canReadAll = await hasPermission(user.role, PERMISSIONS.PAYMENT_VOUCHER_READ_ALL);
  const canReadOwn = await hasPermission(user.role, PERMISSIONS.PAYMENT_VOUCHER_READ);

  if (!canReadAll && !canReadOwn) {
    throw new AuthorizationError("You don't have permission to view payment vouchers");
  }

  const options = {
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 20,
    showInactive: showInactive === 'true',
    agent_id: agent_id || null,
    search,
  };

  if (confirmation_id) {
    options.confirmation_id = confirmation_id;
  }

  // If user can only read their own payment vouchers, add agent_id filter for lead assignment
  if (!canReadAll && canReadOwn) {
    options.agent_id = user._id;
  }

  const result = await paymentVoucherService.getAllPaymentVouchers(options);

  return res.status(200).json(result);
});

/**
 * Get payment voucher by ID
 */
const getPaymentVoucherById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { user } = req;
  const { showInactive } = req.query;

  if (!(await hasPermission(user.role, PERMISSIONS.PAYMENT_VOUCHER_READ))) {
    throw new AuthorizationError("You don't have permission to view payment vouchers");
  }

  // Convert string query parameter to boolean
  const includeInactive = showInactive === 'true';

  const paymentVoucher = await paymentVoucherService.getPaymentVoucherById(id, includeInactive);

  return res.status(200).json(paymentVoucher);
});

/**
 * Update payment voucher
 */
const updatePaymentVoucher = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { user } = req;

  if (!(await hasPermission(user.role, PERMISSIONS.PAYMENT_VOUCHER_UPDATE))) {
    throw new AuthorizationError("You don't have permission to update payment vouchers");
  }

  const files = req.files || [];
  const result = await paymentVoucherService.updatePaymentVoucher(id, req.body, files, user);

  return res.status(200).json(result);
});

/**
 * Add documents to existing payment voucher
 */
const addDocumentsToPaymentVoucher = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { user } = req;

  if (!(await hasPermission(user.role, PERMISSIONS.PAYMENT_VOUCHER_UPDATE))) {
    throw new AuthorizationError("You don't have permission to update payment vouchers");
  }

  const files = req.files || [];
  if (!files || files.length === 0) {
    return res.status(400).json({
      status: 'error',
      message: 'No files provided',
    });
  }

  const result = await paymentVoucherService.addDocumentsToPaymentVoucher(id, files, user);

  return res.status(200).json({
    status: 'success',
    message: 'Documents added successfully',
    data: result,
  });
});

/**
 * Delete payment voucher (soft delete)
 */
const deletePaymentVoucher = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { user } = req;

  if (!(await hasPermission(user.role, PERMISSIONS.PAYMENT_VOUCHER_DELETE))) {
    throw new AuthorizationError("You don't have permission to delete payment vouchers");
  }

  const result = await paymentVoucherService.deletePaymentVoucher(id);

  return res.status(200).json(result);
});

/**
 * Bulk delete payment vouchers
 */
const bulkDeletePaymentVouchers = asyncHandler(async (req, res) => {
  const { ids } = req.body;
  const { user } = req;

  if (!(await hasPermission(user.role, PERMISSIONS.PAYMENT_VOUCHER_DELETE_ALL))) {
    throw new AuthorizationError("You don't have permission to delete payment vouchers");
  }

  const result = await paymentVoucherService.bulkDeletePaymentVouchers(ids, user);

  return res.status(200).json(result);
});

/**
 * Restore a previously soft-deleted payment voucher
 */
const restorePaymentVoucher = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { user } = req;

  if (!(await hasPermission(user.role, PERMISSIONS.PAYMENT_VOUCHER_UPDATE))) {
    throw new AuthorizationError("You don't have permission to restore payment vouchers");
  }

  const result = await paymentVoucherService.restorePaymentVoucher(id);

  return res.status(200).json(result);
});

/**
 * View/download a document from a payment voucher
 */
const viewDocument = asyncHandler(async (req, res) => {
  const { user } = req;
  const { documentId } = req.params;

  // Check if user has permission to view documents
  // Only admins and agents can view documents
  const canReadOwn = await hasPermission(user.role, PERMISSIONS.PAYMENT_VOUCHER_READ);
  const canReadAll = await hasPermission(user.role, PERMISSIONS.PAYMENT_VOUCHER_READ_ALL);
  if (!canReadOwn && !canReadAll) {
    throw new AuthorizationError("You don't have permission to view payment voucher documents");
  }

  try {
    // Get document details from service
    const { document, filePath, paymentVoucher } = await paymentVoucherService.getDocumentById(documentId);

    // For agents, check if they have access to this payment voucher
    if (user.role !== 'admin' && paymentVoucher.creator_id.toString() !== user._id.toString()) {
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
  createPaymentVoucher,
  getAllPaymentVouchers,
  getPaymentVoucherById,
  updatePaymentVoucher,
  addDocumentsToPaymentVoucher,
  deletePaymentVoucher,
  bulkDeletePaymentVouchers,
  restorePaymentVoucher,
  viewDocument,
}; 