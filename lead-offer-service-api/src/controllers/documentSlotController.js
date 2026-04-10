/**
 * Document Slot Controller
 * Handles HTTP requests for document slot operations
 */

const DocumentSlotService = require('../services/documentSlotService');
const { asyncHandler } = require('../utils/errorHandler');
const logger = require('../utils/logger');

// ============================================
// METADATA ENDPOINTS
// ============================================

/**
 * Get all valid slot names and metadata
 * @route GET /document-slots/metadata
 */
const getSlotsMetadata = asyncHandler(async (req, res) => {
  const metadata = DocumentSlotService.getAllSlotsMetadata();
  const validSlots = DocumentSlotService.getValidSlots();

  res.status(200).json({
    success: true,
    data: {
      valid_slots: validSlots,
      metadata,
    },
  });
});

// ============================================
// OFFER DOCUMENT SLOT ENDPOINTS
// ============================================

/**
 * Get all document slots for an offer
 * @route GET /document-slots/offers/:offerId
 */
const getOfferSlots = asyncHandler(async (req, res) => {
  const { offerId } = req.params;

  const result = await DocumentSlotService.getOfferDocumentSlots(offerId);

  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * Get a specific slot for an offer
 * @route GET /document-slots/offers/:offerId/slots/:slotName
 */
const getOfferSlot = asyncHandler(async (req, res) => {
  const { offerId, slotName } = req.params;

  const result = await DocumentSlotService.getOfferSlot(offerId, slotName);

  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * Add a document to an offer slot
 * @route POST /document-slots/offers/:offerId/slots/:slotName/documents
 * @body { document_id: string }
 */
const addDocumentToOfferSlot = asyncHandler(async (req, res) => {
  const { offerId, slotName } = req.params;
  const { document_id } = req.body;
  const userId = req.user._id;

  const result = await DocumentSlotService.addDocumentToSlot(offerId, slotName, document_id, userId);

  res.status(200).json({
    success: true,
    message: `Document added to ${slotName} slot`,
    data: result,
  });
});

/**
 * Remove a document from an offer slot
 * @route DELETE /document-slots/offers/:offerId/slots/:slotName/documents/:documentId
 */
const removeDocumentFromOfferSlot = asyncHandler(async (req, res) => {
  const { offerId, slotName, documentId } = req.params;
  const userId = req.user._id;

  const result = await DocumentSlotService.removeDocumentFromSlot(
    offerId,
    slotName,
    documentId,
    userId
  );

  res.status(200).json({
    success: true,
    message: `Document removed from ${slotName} slot`,
    data: result,
  });
});

/**
 * Add an email to an offer slot (single offer - offerId in URL)
 * @route POST /document-slots/offers/:offerId/slots/:slotName/emails
 * @body { email_id: string }
 */
const addEmailToOfferSlot = asyncHandler(async (req, res) => {
  const { offerId, slotName } = req.params;
  const { email_id } = req.body;
  const userId = req.user._id;

  const result = await DocumentSlotService.addEmailToSlot(offerId, slotName, email_id, userId);

  res.status(200).json({
    success: true,
    message: `Email added to ${slotName} slot`,
    data: result,
  });
});

/**
 * Add an email to a slot for multiple offers (offer_ids in body)
 * @route POST /document-slots/offers/slots/:slotName/emails
 * @body { offer_ids: string[], email_id: string }
 */
const addEmailToMultipleOffersSlot = asyncHandler(async (req, res) => {
  const { slotName } = req.params;
  const { offer_ids, email_id } = req.body;
  const userId = req.user._id;

  const result = await DocumentSlotService.addEmailToMultipleOffersSlot(
    offer_ids,
    slotName,
    email_id,
    userId
  );

  res.status(200).json({
    success: true,
    message: `Email added to ${slotName} slot for ${result.updated_offers.length} offer(s)`,
    data: result,
  });
});

/**
 * Remove an email from an offer slot
 * @route DELETE /document-slots/offers/:offerId/slots/:slotName/emails/:emailId
 */
const removeEmailFromOfferSlot = asyncHandler(async (req, res) => {
  const { offerId, slotName, emailId } = req.params;
  const userId = req.user._id;

  const result = await DocumentSlotService.removeEmailFromSlot(offerId, slotName, emailId, userId);

  res.status(200).json({
    success: true,
    message: `Email removed from ${slotName} slot`,
    data: result,
  });
});

/**
 * Bulk add documents and emails to an offer slot (single offer - offerId in URL)
 * @route POST /document-slots/offers/:offerId/slots/:slotName/bulk
 * @body { document_ids: string[], email_ids: string[] }
 */
const bulkAddToOfferSlot = asyncHandler(async (req, res) => {
  const { offerId, slotName } = req.params;
  const { document_ids = [], email_ids = [] } = req.body;
  const userId = req.user._id;

  const result = await DocumentSlotService.bulkAddToSlot(
    offerId,
    slotName,
    document_ids,
    email_ids,
    userId
  );

  res.status(200).json({
    success: true,
    message: `Bulk added items to ${slotName} slot`,
    data: result,
  });
});

/**
 * Bulk add documents and emails to a slot for multiple offers (offer_ids in body)
 * @route POST /document-slots/offers/slots/:slotName/bulk
 * @body { offer_ids: string[], document_ids: string[], email_ids: string[] }
 */
const bulkAddToMultipleOffersSlot = asyncHandler(async (req, res) => {
  const { slotName } = req.params;
  const { offer_ids, document_ids = [], email_ids = [] } = req.body;
  const userId = req.user._id;

  const result = await DocumentSlotService.bulkAddToMultipleOffersSlot(
    offer_ids,
    slotName,
    document_ids,
    email_ids,
    userId
  );

  res.status(200).json({
    success: true,
    message: `Bulk added items to ${slotName} slot for ${result.updated_offers.length} offer(s)`,
    data: result,
  });
});

/**
 * Clear all items from an offer slot
 * @route DELETE /document-slots/offers/:offerId/slots/:slotName
 */
const clearOfferSlot = asyncHandler(async (req, res) => {
  const { offerId, slotName } = req.params;
  const userId = req.user._id;

  const result = await DocumentSlotService.clearSlot(offerId, slotName, userId);

  res.status(200).json({
    success: true,
    message: `Cleared ${slotName} slot`,
    data: result,
  });
});

// ============================================
// LEAD LAST EMAIL ENDPOINTS
// ============================================

/**
 * Get last_email for a lead
 * @route GET /document-slots/leads/:leadId/last-email
 */
const getLeadLastEmail = asyncHandler(async (req, res) => {
  const { leadId } = req.params;

  const result = await DocumentSlotService.getLeadLastEmail(leadId);

  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * Add a document to lead's last_email
 * @route POST /document-slots/leads/:leadId/last-email/documents
 * @body { document_id: string }
 */
const addDocumentToLeadLastEmail = asyncHandler(async (req, res) => {
  const { leadId } = req.params;
  const { document_id } = req.body;
  const userId = req.user._id;

  const result = await DocumentSlotService.addDocumentToLeadLastEmail(leadId, document_id, userId);

  res.status(200).json({
    success: true,
    message: 'Document added to last_email',
    data: result,
  });
});

/**
 * Remove a document from lead's last_email
 * @route DELETE /document-slots/leads/:leadId/last-email/documents/:documentId
 */
const removeDocumentFromLeadLastEmail = asyncHandler(async (req, res) => {
  const { leadId, documentId } = req.params;
  const userId = req.user._id;

  const result = await DocumentSlotService.removeDocumentFromLeadLastEmail(
    leadId,
    documentId,
    userId
  );

  res.status(200).json({
    success: true,
    message: 'Document removed from last_email',
    data: result,
  });
});

/**
 * Add an email to lead's last_email
 * @route POST /document-slots/leads/:leadId/last-email/emails
 * @body { email_id: string }
 */
const addEmailToLeadLastEmail = asyncHandler(async (req, res) => {
  const { leadId } = req.params;
  const { email_id } = req.body;
  const userId = req.user._id;

  const result = await DocumentSlotService.addEmailToLeadLastEmail(leadId, email_id, userId);

  res.status(200).json({
    success: true,
    message: 'Email added to last_email',
    data: result,
  });
});

/**
 * Remove an email from lead's last_email
 * @route DELETE /document-slots/leads/:leadId/last-email/emails/:emailId
 */
const removeEmailFromLeadLastEmail = asyncHandler(async (req, res) => {
  const { leadId, emailId } = req.params;
  const userId = req.user._id;

  const result = await DocumentSlotService.removeEmailFromLeadLastEmail(leadId, emailId, userId);

  res.status(200).json({
    success: true,
    message: 'Email removed from last_email',
    data: result,
  });
});

/**
 * Clear lead's last_email
 * @route DELETE /document-slots/leads/:leadId/last-email
 */
const clearLeadLastEmail = asyncHandler(async (req, res) => {
  const { leadId } = req.params;
  const userId = req.user._id;

  const result = await DocumentSlotService.clearLeadLastEmail(leadId, userId);

  res.status(200).json({
    success: true,
    message: 'Cleared last_email',
    data: result,
  });
});

module.exports = {
  // Metadata
  getSlotsMetadata,

  // Offer slots
  getOfferSlots,
  getOfferSlot,
  addDocumentToOfferSlot,
  removeDocumentFromOfferSlot,
  addEmailToOfferSlot,
  addEmailToMultipleOffersSlot,
  removeEmailFromOfferSlot,
  bulkAddToOfferSlot,
  bulkAddToMultipleOffersSlot,
  clearOfferSlot,

  // Lead last_email
  getLeadLastEmail,
  addDocumentToLeadLastEmail,
  removeDocumentFromLeadLastEmail,
  addEmailToLeadLastEmail,
  removeEmailFromLeadLastEmail,
  clearLeadLastEmail,
};
