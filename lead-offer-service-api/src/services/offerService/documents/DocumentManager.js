/**
 * Offer Document Manager
 * Handles document operations for offers including hybrid document system
 */

const { Document, Email } = require('../config/dependencies');
const { OFFER_POPULATE_CONFIG } = require('../config/constants');

class DocumentManager {
  /**
   * Populate offer query with standard configurations
   * @param {Object} query - Mongoose query object
   * @returns {Object} - Populated query
   */
  static populateOfferQuery(query) {
    OFFER_POPULATE_CONFIG.forEach((config) => {
      // Handle nested populate for bank_id with array of populates
      if (config.path === 'bank_id' && Array.isArray(config.populate)) {
        query = query.populate({
          path: config.path,
          select: config.select,
          populate: config.populate.map(p => ({
            ...p,
            options: { strictPopulate: false }
          }))
        });
      } else if (config.path === 'bank_id' && config.populate && config.populate.path === 'provider') {
        // Legacy support for old object format
        query = query.populate({
          ...config,
          populate: {
            ...config.populate,
            options: { strictPopulate: false }
          }
        });
      } else {
        query = query.populate(config);
      }
    });
    return query;
  }

  /**
   * Helper function to populate assigned documents to a single offer (HYBRID SYSTEM)
   * Shows documents from BOTH sources:
   * 1. REVERSE REFERENCES: Documents with assignments pointing to offer
   * 2. FORWARD REFERENCES: Documents referenced in offer.files array (legacy)
   * @param {Object} offer - Offer object to populate documents for
   * @returns {Object} - Offer with populated documents
   */
  static async populateOfferDocuments(offer) {
    if (!offer || !offer._id) return offer;

    // 1. REVERSE REFERENCES: Get documents with assignments pointing to this offer
    const assignedDocuments = await Document.find({
      'assignments.entity_type': 'offer',
      'assignments.entity_id': offer._id,
      'assignments.active': true,
      active: true,
    })
      .select('_id filename filetype size type assignments')
      .lean();

    // 2. FORWARD REFERENCES: Get documents referenced in offer.files array (legacy)
    let legacyDocuments = [];
    if (offer.files && offer.files.length > 0) {
      const legacyDocIds = offer.files
        .filter(file => file.document) // Only files with document references
        .map(file => file.document);
      
      if (legacyDocIds.length > 0) {
        legacyDocuments = await Document.find({
          _id: { $in: legacyDocIds },
          active: true
        }).select('_id filename filetype size type assignments').lean();
      }
    }

    // 3. MERGE AND DEDUPLICATE: Build final files array
    const documentMap = new Map();
    
    // Add reverse reference documents (priority for assigned_at timestamp)
    assignedDocuments.forEach(doc => {
      doc.assignments.forEach(assignment => {
        if (assignment.entity_type === 'offer' && assignment.entity_id.toString() === offer._id.toString() && assignment.active) {
          documentMap.set(doc._id.toString(), {
            _id: doc._id,
            filename: doc.filename,
            filetype: doc.filetype,
            size: doc.size,
            type: doc.type,
            assigned_at: assignment.assigned_at,
            source: 'reverse_reference'
          });
        }
      });
    });
    
    // Add legacy documents (only if not already added by reverse reference)
    legacyDocuments.forEach(doc => {
      const docId = doc._id.toString();
      if (!documentMap.has(docId)) {
        // Find the legacy reference to get any metadata
        const legacyRef = offer.files.find(file => 
          file.document && file.document.toString() === docId
        );
        
        documentMap.set(docId, {
          _id: doc._id,
          filename: doc.filename,
          filetype: doc.filetype,
          size: doc.size,
          type: doc.type,
          assigned_at: legacyRef?.assigned_at || doc.createdAt || new Date(),
          source: 'forward_reference'
        });
      }
    });

    // Convert map to array and sort by assigned_at
    offer.files = Array.from(documentMap.values())
      .sort((a, b) => new Date(b.assigned_at) - new Date(a.assigned_at));

    return offer;
  }

  /**
   * Populate documents for multiple offers using hybrid system
   * @param {Array} offers - Array of offer objects
   * @param {Array} offerIdsArray - Array of offer IDs for bulk operations
   * @returns {Object} - Documents grouped by offer ID
   */
  static async populateMultipleOfferDocuments(offers, offerIdsArray) {
    // 1. REVERSE REFERENCES: Get documents with assignments pointing to offers
    const assignedDocuments = await Document.find({
      'assignments.entity_type': 'offer',
      'assignments.entity_id': { $in: offerIdsArray },
      'assignments.active': true,
      active: true,
    })
      .select('_id filename filetype size type assignments')
      .lean();

    // 2. FORWARD REFERENCES: Get all legacy document references from offer.files arrays
    const allLegacyDocIds = new Set();
    offers.forEach(offer => {
      if (offer.files && offer.files.length > 0) {
        offer.files.forEach(file => {
          if (file.document) {
            allLegacyDocIds.add(file.document.toString());
          }
        });
      }
    });

    const legacyDocuments = allLegacyDocIds.size > 0 ? await Document.find({
      _id: { $in: Array.from(allLegacyDocIds) },
      active: true
    }).select('_id filename filetype size type assignments').lean() : [];

    // 3. MERGE AND DEDUPLICATE: Group documents by offer ID (hybrid approach)
    const documentsByOffer = {};
    
    // Add reverse reference documents first
    assignedDocuments.forEach(doc => {
      doc.assignments.forEach(assignment => {
        if (assignment.entity_type === 'offer' && assignment.active) {
          const offerId = assignment.entity_id.toString();
          if (!documentsByOffer[offerId]) {
            documentsByOffer[offerId] = new Map();
          }
          documentsByOffer[offerId].set(doc._id.toString(), {
            _id: doc._id,
            filename: doc.filename,
            filetype: doc.filetype,
            size: doc.size,
            type: doc.type,
            assigned_at: assignment.assigned_at,
            source: 'reverse_reference'
          });
        }
      });
    });

    // Add legacy documents (only if not already added by reverse reference)
    legacyDocuments.forEach(doc => {
      const docId = doc._id.toString();
      // Find which offers reference this document
      offers.forEach(offer => {
        if (offer.files && offer.files.length > 0) {
          const legacyRef = offer.files.find(file => 
            file.document && file.document.toString() === docId
          );
          if (legacyRef) {
            const offerId = offer._id.toString();
            if (!documentsByOffer[offerId]) {
              documentsByOffer[offerId] = new Map();
            }
            // Only add if not already present from reverse reference
            if (!documentsByOffer[offerId].has(docId)) {
              documentsByOffer[offerId].set(docId, {
                _id: doc._id,
                filename: doc.filename,
                filetype: doc.filetype,
                size: doc.size,
                type: doc.type,
                assigned_at: legacyRef.assigned_at || doc.createdAt || new Date(),
                source: 'forward_reference'
              });
            }
          }
        }
      });
    });

    // Convert maps to arrays and sort
    Object.keys(documentsByOffer).forEach(offerId => {
      documentsByOffer[offerId] = Array.from(documentsByOffer[offerId].values())
        .sort((a, b) => new Date(b.assigned_at) - new Date(a.assigned_at));
    });

    return documentsByOffer;
  }

  /**
   * Populate documents for multiple openings using hybrid system
   * @param {Array} openings - Array of opening objects
   * @param {Array} openingIdsArray - Array of opening IDs for bulk operations
   * @returns {Object} - Documents grouped by opening ID
   */
  static async populateMultipleOpeningDocuments(openings, openingIdsArray) {
    // 1. REVERSE REFERENCES: Get documents with assignments pointing to openings
    const assignedDocuments = await Document.find({
      'assignments.entity_type': 'opening',
      'assignments.entity_id': { $in: openingIdsArray },
      'assignments.active': true,
      active: true,
    })
      .select('_id filename filetype size type assignments')
      .lean();

    // 2. FORWARD REFERENCES: Get all legacy document references from opening.files arrays
    const allLegacyDocIds = new Set();
    openings.forEach(opening => {
      if (opening.files && opening.files.length > 0) {
        opening.files.forEach(file => {
          if (file.document) {
            allLegacyDocIds.add(file.document.toString());
          }
        });
      }
    });

    const legacyDocuments = allLegacyDocIds.size > 0 ? await Document.find({
      _id: { $in: Array.from(allLegacyDocIds) },
      active: true
    }).select('_id filename filetype size type assignments').lean() : [];

    // 3. MERGE AND DEDUPLICATE: Group documents by opening ID (hybrid approach)
    const documentsByOpening = {};
    
    // Add reverse reference documents first
    assignedDocuments.forEach(doc => {
      doc.assignments.forEach(assignment => {
        if (assignment.entity_type === 'opening' && assignment.active) {
          const openingId = assignment.entity_id.toString();
          if (!documentsByOpening[openingId]) {
            documentsByOpening[openingId] = new Map();
          }
          documentsByOpening[openingId].set(doc._id.toString(), {
            _id: doc._id,
            filename: doc.filename,
            filetype: doc.filetype,
            size: doc.size,
            type: doc.type,
            assigned_at: assignment.assigned_at,
            source: 'reverse_reference'
          });
        }
      });
    });

    // Add legacy documents (only if not already added by reverse reference)
    legacyDocuments.forEach(doc => {
      const docId = doc._id.toString();
      openings.forEach(opening => {
        if (opening.files && opening.files.length > 0) {
          const legacyRef = opening.files.find(file => 
            file.document && file.document.toString() === docId
          );
          if (legacyRef) {
            const openingId = opening._id.toString();
            if (!documentsByOpening[openingId]) {
              documentsByOpening[openingId] = new Map();
            }
            if (!documentsByOpening[openingId].has(docId)) {
              documentsByOpening[openingId].set(docId, {
                _id: doc._id,
                filename: doc.filename,
                filetype: doc.filetype,
                size: doc.size,
                type: doc.type,
                assigned_at: legacyRef.assigned_at || doc.createdAt || new Date(),
                source: 'forward_reference'
              });
            }
          }
        }
      });
    });

    // Convert maps to arrays and sort
    Object.keys(documentsByOpening).forEach(openingId => {
      documentsByOpening[openingId] = Array.from(documentsByOpening[openingId].values())
        .sort((a, b) => new Date(b.assigned_at) - new Date(a.assigned_at));
    });

    return documentsByOpening;
  }

  /**
   * Populate documents for multiple confirmations using hybrid system
   * @param {Array} confirmations - Array of confirmation objects
   * @param {Array} confirmationIdsArray - Array of confirmation IDs for bulk operations
   * @returns {Object} - Documents grouped by confirmation ID
   */
  static async populateMultipleConfirmationDocuments(confirmations, confirmationIdsArray) {
    // 1. REVERSE REFERENCES: Get documents with assignments pointing to confirmations
    const assignedDocuments = await Document.find({
      'assignments.entity_type': 'confirmation',
      'assignments.entity_id': { $in: confirmationIdsArray },
      'assignments.active': true,
      active: true,
    })
      .select('_id filename filetype size type assignments')
      .lean();

    // 2. FORWARD REFERENCES: Get all legacy document references from confirmation.files arrays
    const allLegacyDocIds = new Set();
    confirmations.forEach(confirmation => {
      if (confirmation.files && confirmation.files.length > 0) {
        confirmation.files.forEach(file => {
          if (file.document) {
            allLegacyDocIds.add(file.document.toString());
          }
        });
      }
    });

    const legacyDocuments = allLegacyDocIds.size > 0 ? await Document.find({
      _id: { $in: Array.from(allLegacyDocIds) },
      active: true
    }).select('_id filename filetype size type assignments').lean() : [];

    // 3. MERGE AND DEDUPLICATE: Group documents by confirmation ID (hybrid approach)
    const documentsByConfirmation = {};
    
    // Add reverse reference documents first
    assignedDocuments.forEach(doc => {
      doc.assignments.forEach(assignment => {
        if (assignment.entity_type === 'confirmation' && assignment.active) {
          const confirmationId = assignment.entity_id.toString();
          if (!documentsByConfirmation[confirmationId]) {
            documentsByConfirmation[confirmationId] = new Map();
          }
          documentsByConfirmation[confirmationId].set(doc._id.toString(), {
            _id: doc._id,
            filename: doc.filename,
            filetype: doc.filetype,
            size: doc.size,
            type: doc.type,
            assigned_at: assignment.assigned_at,
            source: 'reverse_reference'
          });
        }
      });
    });

    // Add legacy documents (only if not already added by reverse reference)
    legacyDocuments.forEach(doc => {
      const docId = doc._id.toString();
      confirmations.forEach(confirmation => {
        if (confirmation.files && confirmation.files.length > 0) {
          const legacyRef = confirmation.files.find(file => 
            file.document && file.document.toString() === docId
          );
          if (legacyRef) {
            const confirmationId = confirmation._id.toString();
            if (!documentsByConfirmation[confirmationId]) {
              documentsByConfirmation[confirmationId] = new Map();
            }
            if (!documentsByConfirmation[confirmationId].has(docId)) {
              documentsByConfirmation[confirmationId].set(docId, {
                _id: doc._id,
                filename: doc.filename,
                filetype: doc.filetype,
                size: doc.size,
                type: doc.type,
                assigned_at: legacyRef.assigned_at || doc.createdAt || new Date(),
                source: 'forward_reference'
              });
            }
          }
        }
      });
    });

    // Convert maps to arrays and sort
    Object.keys(documentsByConfirmation).forEach(confirmationId => {
      documentsByConfirmation[confirmationId] = Array.from(documentsByConfirmation[confirmationId].values())
        .sort((a, b) => new Date(b.assigned_at) - new Date(a.assigned_at));
    });

    return documentsByConfirmation;
  }

  /**
   * Populate documents for multiple payment vouchers using hybrid system
   * @param {Array} paymentVouchers - Array of payment voucher objects
   * @param {Array} paymentVoucherIdsArray - Array of payment voucher IDs for bulk operations
   * @returns {Object} - Documents grouped by payment voucher ID
   */
  static async populateMultiplePaymentVoucherDocuments(paymentVouchers, paymentVoucherIdsArray) {
    // 1. REVERSE REFERENCES: Get documents with assignments pointing to payment vouchers
    const assignedDocuments = await Document.find({
      'assignments.entity_type': 'payment_voucher',
      'assignments.entity_id': { $in: paymentVoucherIdsArray },
      'assignments.active': true,
      active: true,
    })
      .select('_id filename filetype size type assignments')
      .lean();

    // 2. FORWARD REFERENCES: Get all legacy document references from paymentVoucher.files arrays
    const allLegacyDocIds = new Set();
    paymentVouchers.forEach(paymentVoucher => {
      if (paymentVoucher.files && paymentVoucher.files.length > 0) {
        paymentVoucher.files.forEach(file => {
          if (file.document) {
            allLegacyDocIds.add(file.document.toString());
          }
        });
      }
    });

    const legacyDocuments = allLegacyDocIds.size > 0 ? await Document.find({
      _id: { $in: Array.from(allLegacyDocIds) },
      active: true
    }).select('_id filename filetype size type assignments').lean() : [];

    // 3. MERGE AND DEDUPLICATE: Group documents by payment voucher ID (hybrid approach)
    const documentsByPaymentVoucher = {};
    
    // Add reverse reference documents first
    assignedDocuments.forEach(doc => {
      doc.assignments.forEach(assignment => {
        if (assignment.entity_type === 'payment_voucher' && assignment.active) {
          const paymentVoucherId = assignment.entity_id.toString();
          if (!documentsByPaymentVoucher[paymentVoucherId]) {
            documentsByPaymentVoucher[paymentVoucherId] = new Map();
          }
          documentsByPaymentVoucher[paymentVoucherId].set(doc._id.toString(), {
            _id: doc._id,
            filename: doc.filename,
            filetype: doc.filetype,
            size: doc.size,
            type: doc.type,
            assigned_at: assignment.assigned_at,
            source: 'reverse_reference'
          });
        }
      });
    });

    // Add legacy documents (only if not already added by reverse reference)
    legacyDocuments.forEach(doc => {
      const docId = doc._id.toString();
      paymentVouchers.forEach(paymentVoucher => {
        if (paymentVoucher.files && paymentVoucher.files.length > 0) {
          const legacyRef = paymentVoucher.files.find(file => 
            file.document && file.document.toString() === docId
          );
          if (legacyRef) {
            const paymentVoucherId = paymentVoucher._id.toString();
            if (!documentsByPaymentVoucher[paymentVoucherId]) {
              documentsByPaymentVoucher[paymentVoucherId] = new Map();
            }
            if (!documentsByPaymentVoucher[paymentVoucherId].has(docId)) {
              documentsByPaymentVoucher[paymentVoucherId].set(docId, {
                _id: doc._id,
                filename: doc.filename,
                filetype: doc.filetype,
                size: doc.size,
                type: doc.type,
                assigned_at: legacyRef.assigned_at || doc.createdAt || new Date(),
                source: 'forward_reference'
              });
            }
          }
        }
      });
    });

    // Convert maps to arrays and sort
    Object.keys(documentsByPaymentVoucher).forEach(paymentVoucherId => {
      documentsByPaymentVoucher[paymentVoucherId] = Array.from(documentsByPaymentVoucher[paymentVoucherId].values())
        .sort((a, b) => new Date(b.assigned_at) - new Date(a.assigned_at));
    });

    return documentsByPaymentVoucher;
  }

  /**
   * Populate document_slots for multiple offers (documents and emails)
   * @param {Array} offers - Array of offer objects with document_slots
   * @returns {Array} - Offers with populated document_slots
   */
  static async populateDocumentSlotsForOffers(offers) {
    const logger = require('../../../utils/logger');
    if (!offers || offers.length === 0) return offers;

    logger.info(`[populateDocumentSlotsForOffers] Processing ${offers.length} offers`);

    // Collect all document and email IDs from all document_slots
    const allDocIds = new Set();
    const allEmailIds = new Set();

    // All document slot names
    const slotNames = [
      'offer_email',
      'offer_contract',
      'contract',
      'id_files',
      'contract_received_mail',
      'opening_contract_client_email',
      'bank_confirmation',
      'annahme',
      'confirmation_email',
      'swift',
      'swift_confirm_mail',
      'depot_update_mail',
      'depot_login',
      'load_mail'
    ];

    // Extract IDs from document_slots
    offers.forEach(offer => {
      if (offer.document_slots) {
        slotNames.forEach(slotName => {
          const slot = offer.document_slots[slotName];
          if (slot) {
            // Collect document IDs
            if (slot.documents && slot.documents.length > 0) {
              slot.documents.forEach(docId => {
                if (typeof docId === 'object' && docId._id) {
                  allDocIds.add(docId._id.toString());
                } else if (typeof docId === 'string') {
                  allDocIds.add(docId);
                }
              });
            }
            // Collect email IDs
            if (slot.emails && slot.emails.length > 0) {
              slot.emails.forEach(emailId => {
                if (typeof emailId === 'object' && emailId._id) {
                  allEmailIds.add(emailId._id.toString());
                } else if (typeof emailId === 'string') {
                  allEmailIds.add(emailId);
                }
              });
            }
          }
        });
      }
    });

    logger.info(`[populateDocumentSlotsForOffers] Found ${allDocIds.size} document IDs, ${allEmailIds.size} email IDs`);

    // Fetch all documents in bulk
    const documentsMap = new Map();
    if (allDocIds.size > 0) {
      const documents = await Document.find({
        _id: { $in: Array.from(allDocIds) },
        active: true
      }).lean();
      documents.forEach(doc => {
        documentsMap.set(doc._id.toString(), doc);
      });
      logger.info(`[populateDocumentSlotsForOffers] Fetched ${documents.length} documents`);
    }

    // Fetch all emails in bulk
    const emailsMap = new Map();
    if (allEmailIds.size > 0) {
      const emails = await Email.find({
        _id: { $in: Array.from(allEmailIds) }
      }).lean();
      emails.forEach(email => {
        emailsMap.set(email._id.toString(), email);
      });
      logger.info(`[populateDocumentSlotsForOffers] Fetched ${emails.length} emails`);
    }

    // Map document_slots data by offer ID for updated_by population
    const allUpdatedByIds = new Set();
    offers.forEach(offer => {
      if (offer.document_slots) {
        slotNames.forEach(slotName => {
          const slot = offer.document_slots[slotName];
          if (slot && slot.updated_by) {
            if (typeof slot.updated_by === 'object' && slot.updated_by._id) {
              allUpdatedByIds.add(slot.updated_by._id.toString());
            } else if (typeof slot.updated_by === 'string') {
              allUpdatedByIds.add(slot.updated_by);
            }
          }
        });
      }
    });

    // Fetch all updated_by users
    const usersMap = new Map();
    if (allUpdatedByIds.size > 0) {
      const { User } = require('../../../models');
      const users = await User.find({
        _id: { $in: Array.from(allUpdatedByIds) }
      }).select('_id login name').lean();
      users.forEach(user => {
        usersMap.set(user._id.toString(), user);
      });
    }

    // Replace IDs with populated data in document_slots
    const populatedOffers = offers.map(offer => {
      const populatedOffer = { ...offer };

      if (populatedOffer.document_slots) {
        slotNames.forEach(slotName => {
          if (populatedOffer.document_slots[slotName]) {
            const slot = { ...populatedOffer.document_slots[slotName] };

            // Populate documents
            if (slot.documents && slot.documents.length > 0) {
              slot.documents = slot.documents.map(docId => {
                const idStr = typeof docId === 'object' && docId._id
                  ? docId._id.toString()
                  : docId.toString();
                return documentsMap.get(idStr) || docId;
              });
            }

            // Populate emails
            if (slot.emails && slot.emails.length > 0) {
              slot.emails = slot.emails.map(emailId => {
                const idStr = typeof emailId === 'object' && emailId._id
                  ? emailId._id.toString()
                  : emailId.toString();
                return emailsMap.get(idStr) || emailId;
              });
            }

            // Populate updated_by
            if (slot.updated_by) {
              const idStr = typeof slot.updated_by === 'object' && slot.updated_by._id
                ? slot.updated_by._id.toString()
                : slot.updated_by.toString();
              slot.updated_by = usersMap.get(idStr) || slot.updated_by;
            }

            populatedOffer.document_slots[slotName] = slot;
          }
        });
      }

      return populatedOffer;
    });

    return populatedOffers;
  }
}

module.exports = DocumentManager; 