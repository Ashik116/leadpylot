/**
 * Offer Service Index
 * Exports all offer service functions from modular structure
 */

// Import existing Excel functionality
const { importOffersFromExcel, getOfferImportHistory, revertOfferImport } = require('./excel');

// Import core operations
const {
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
} = require('./operations/crud');

// Import query operations
const {
  getAllOffers,
  getOffersWithProgress,
  getOffersByLeadId,
  getOffersByProjectId,
  getOfferWithProgressById,
} = require('./operations/queries');

// Import progression operations
const {
  createOpeningFromOffer,
  createConfirmationFromOffer,
  createPaymentVoucherFromOffer,
  createNetto1FromOffer,
  createNetto2FromOffer,
  createLostFromOffer,
} = require('./operations/progression');

// Import revert operations
const {
  revertOpeningFromOffer,
  revertConfirmationFromOffer,
  revertPaymentFromOffer,
  revertNetto1FromOffer,
  revertNetto2FromOffer,
  revertLostFromOffer,
  getRevertOptions,
} = require('./operations/revert');

// Import utility function
const { calculateNettoAmounts } = require('./utils/calculations');

module.exports = {
  // Excel operations (existing)
  importOffersFromExcel,
  getOfferImportHistory,
  revertOfferImport,

  // Core CRUD operations
  getAllOffers,
  getOfferById,
  createOffer,
  updateOffer,
  deleteOffers,
  updateOffersToOut,
  revertOffersFromOut,
  restoreOffer,
  getOffersByLeadId,
  getOffersByProjectId,
  removeDocumentFromOffer,
  getOffersWithProgress,
  getOfferWithProgressById,
  addDocumentsToOffer,
  getDocumentById,

  // Progression operations
  createOpeningFromOffer,
  createConfirmationFromOffer,
  createPaymentVoucherFromOffer,
  createNetto1FromOffer,
  createNetto2FromOffer,
  createLostFromOffer,

  // Revert operations
  revertOpeningFromOffer,
  revertConfirmationFromOffer,
  revertPaymentFromOffer,
  revertNetto1FromOffer,
  revertNetto2FromOffer,
  revertLostFromOffer,
  getRevertOptions,

  // Utility functions
  calculateNettoAmounts,
}; 