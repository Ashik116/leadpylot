/**
 * Document Slot Service
 * Handles operations for the new document_slots structure on Offers and last_email on Leads
 * 
 * Document Slots (Offer level):
 * - contract, id_files, contract_received_mail (Opening stage)
 * - bank_confirmation, annahme (Confirmation stage)
 * - swift, swift_confirm_mail (Payment stage)
 * - depot_update_mail, depot_login, load_mail (Post-Payment)
 * 
 * Last Email (Lead level):
 * - Stores the most recent email communication with the lead
 */

const mongoose = require('mongoose');
// Register Email model so populate('document_slots.*.emails') and last_email.emails work
const Email = require('../models/Email');
const Offer = require('../models/Offer');
const Lead = require('../models/Lead');
const Document = require('../models/Document');
const logger = require('../utils/logger');
const { ConflictError } = require('../utils/errorHandler');

// Valid document slot names for offers
const VALID_OFFER_SLOTS = [
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
  'load_mail',
];

// Slot metadata for UI display
const SLOT_METADATA = {
  offer_email: {
    label: 'Offer Email',
    stage: 'offer',
    direction: 'outgoing',
    description: 'Offer email communication with customer',
  },
  offer_contract: {
    label: 'Offer Contract',
    stage: 'offer',
    direction: 'outgoing',
    description: 'Offer contract document',
  },
  contract: {
    label: 'Contract',
    stage: 'opening',
    direction: 'incoming',
    description: 'Customer sends signed contract',
  },
  id_files: {
    label: 'ID Files',
    stage: 'opening',
    direction: 'incoming',
    description: 'Customer sends ID documents with contract',
  },
  contract_received_mail: {
    label: 'Contract Received Mail',
    stage: 'opening',
    direction: 'outgoing',
    description: 'We confirm receipt of contract and ID',
  },
  opening_contract_client_email: {
    label: 'Opening Contract Client Email',
    stage: 'opening',
    direction: 'outgoing',
    description: 'Opening contract email sent to client',
  },
  bank_confirmation: {
    label: 'Bank Confirmation',
    stage: 'confirmation',
    direction: 'outgoing',
    description: 'We confirm account opened with depot login',
  },
  annahme: {
    label: 'Annahme',
    stage: 'confirmation',
    direction: 'outgoing',
    description: 'We send bank details to customer',
  },
  confirmation_email: {
    label: 'Confirmation Email',
    stage: 'confirmation',
    direction: 'outgoing',
    description: 'Confirmation email to customer',
  },
  swift: {
    label: 'Swift',
    stage: 'payment',
    direction: 'incoming',
    description: 'Customer sends payment voucher',
  },
  swift_confirm_mail: {
    label: 'Swift Confirm Mail',
    stage: 'payment',
    direction: 'outgoing',
    description: 'We confirm receipt of payment voucher',
  },
  depot_update_mail: {
    label: 'Depot Update Mail',
    stage: 'post-payment',
    direction: 'outgoing',
    description: 'We confirm amount updated in account',
  },
  depot_login: {
    label: 'Depot Login',
    stage: 'post-payment',
    direction: 'outgoing',
    description: 'Depot login credentials',
  },
  load_mail: {
    label: 'Load Mail',
    stage: 'post-payment',
    direction: 'outgoing',
    description: 'Follow-up mail with new offers (1-2 weeks later)',
  },
  last_email: {
    label: 'Last Email',
    stage: 'lead',
    direction: 'any',
    description: 'Most recent email communication with lead',
  },
};

class DocumentSlotService {
  /**
   * Get all valid slot names
   * @returns {Array} Array of valid slot names
   */
  static getValidSlots() {
    return VALID_OFFER_SLOTS;
  }

  /**
   * Get slot metadata
   * @param {String} slotName - Name of the slot
   * @returns {Object} Slot metadata
   */
  static getSlotMetadata(slotName) {
    return SLOT_METADATA[slotName] || null;
  }

  /**
   * Get all slots metadata
   * @returns {Object} All slots metadata
   */
  static getAllSlotsMetadata() {
    return SLOT_METADATA;
  }

  /**
   * Validate slot name
   * @param {String} slotName - Slot name to validate
   * @returns {Boolean} Whether the slot name is valid
   */
  static isValidSlot(slotName) {
    return VALID_OFFER_SLOTS.includes(slotName);
  }

  // ============================================
  // OFFER DOCUMENT SLOT OPERATIONS
  // ============================================

  /**
   * Get all document slots for an offer
   * @param {String} offerId - Offer ID
   * @returns {Object} Document slots with populated documents and emails
   */
  static async getOfferDocumentSlots(offerId) {
    const offer = await Offer.findById(offerId)
      .populate('document_slots.offer_email.documents')
      .populate('document_slots.offer_email.emails')
      .populate('document_slots.offer_contract.documents')
      .populate('document_slots.offer_contract.emails')
      .populate('document_slots.contract.documents')
      .populate('document_slots.contract.emails')
      .populate('document_slots.id_files.documents')
      .populate('document_slots.id_files.emails')
      .populate('document_slots.contract_received_mail.documents')
      .populate('document_slots.contract_received_mail.emails')
      .populate('document_slots.opening_contract_client_email.documents')
      .populate('document_slots.opening_contract_client_email.emails')
      .populate('document_slots.bank_confirmation.documents')
      .populate('document_slots.bank_confirmation.emails')
      .populate('document_slots.annahme.documents')
      .populate('document_slots.annahme.emails')
      .populate('document_slots.confirmation_email.documents')
      .populate('document_slots.confirmation_email.emails')
      .populate('document_slots.swift.documents')
      .populate('document_slots.swift.emails')
      .populate('document_slots.swift_confirm_mail.documents')
      .populate('document_slots.swift_confirm_mail.emails')
      .populate('document_slots.depot_update_mail.documents')
      .populate('document_slots.depot_update_mail.emails')
      .populate('document_slots.depot_login.documents')
      .populate('document_slots.depot_login.emails')
      .populate('document_slots.load_mail.documents')
      .populate('document_slots.load_mail.emails')
      .populate('document_slots.offer_email.updated_by', 'name login')
      .populate('document_slots.offer_contract.updated_by', 'name login')
      .populate('document_slots.contract.updated_by', 'name login')
      .populate('document_slots.id_files.updated_by', 'name login')
      .populate('document_slots.contract_received_mail.updated_by', 'name login')
      .populate('document_slots.opening_contract_client_email.updated_by', 'name login')
      .populate('document_slots.bank_confirmation.updated_by', 'name login')
      .populate('document_slots.annahme.updated_by', 'name login')
      .populate('document_slots.confirmation_email.updated_by', 'name login')
      .populate('document_slots.swift.updated_by', 'name login')
      .populate('document_slots.swift_confirm_mail.updated_by', 'name login')
      .populate('document_slots.depot_update_mail.updated_by', 'name login')
      .populate('document_slots.depot_login.updated_by', 'name login')
      .populate('document_slots.load_mail.updated_by', 'name login')
      .lean();

    if (!offer) {
      throw new Error('Offer not found');
    }

    // Format response with metadata
    const slotsWithMetadata = {};
    for (const slotName of VALID_OFFER_SLOTS) {
      const slotData = offer.document_slots?.[slotName] || {
        documents: [],
        emails: [],
        updated_at: null,
        updated_by: null,
      };
      slotsWithMetadata[slotName] = {
        ...slotData,
        metadata: SLOT_METADATA[slotName],
      };
    }

    return {
      offer_id: offer._id,
      document_slots: slotsWithMetadata,
    };
  }

  /**
   * Get a specific document slot for an offer
   * @param {String} offerId - Offer ID
   * @param {String} slotName - Slot name
   * @returns {Object} Slot data with documents and emails
   */
  static async getOfferSlot(offerId, slotName) {
    if (!this.isValidSlot(slotName)) {
      throw new Error(`Invalid slot name: ${slotName}`);
    }

    const offer = await Offer.findById(offerId)
      .populate(`document_slots.${slotName}.documents`)
      .populate(`document_slots.${slotName}.emails`)
      .populate(`document_slots.${slotName}.updated_by`, 'name login')
      .lean();

    if (!offer) {
      throw new Error('Offer not found');
    }

    const slotData = offer.document_slots?.[slotName] || {
      documents: [],
      emails: [],
      updated_at: null,
      updated_by: null,
    };

    return {
      offer_id: offer._id,
      slot_name: slotName,
      ...slotData,
      metadata: SLOT_METADATA[slotName],
    };
  }

  /**
   * Add a document to a slot
   * @param {String} offerId - Offer ID
   * @param {String} slotName - Slot name
   * @param {String} documentId - Document ID to add
   * @param {String} userId - User performing the action
   * @returns {Object} Updated slot data
   */
  static async addDocumentToSlot(offerId, slotName, documentId, userId) {
    if (!this.isValidSlot(slotName)) {
      throw new Error(`Invalid slot name: ${slotName}`);
    }

    // Verify document exists
    const document = await Document.findById(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    const offer = await Offer.findById(offerId);
    if (!offer) {
      throw new Error('Offer not found');
    }

    // Initialize slot if not exists
    if (!offer.document_slots) {
      offer.document_slots = {};
    }
    if (!offer.document_slots[slotName]) {
      offer.document_slots[slotName] = {
        documents: [],
        emails: [],
        updated_at: new Date(),
        updated_by: userId,
      };
    }

    // Check if document already exists in slot
    const existingDocs = offer.document_slots[slotName].documents || [];
    if (existingDocs.some((docId) => docId.toString() === documentId)) {
      throw new ConflictError('Document already exists in this slot');
    }

    // Add document to slot
    offer.document_slots[slotName].documents.push(documentId);
    offer.document_slots[slotName].updated_at = new Date();
    offer.document_slots[slotName].updated_by = userId;

    // Mark as modified to ensure save
    offer.markModified('document_slots');
    await offer.save();

    logger.info(`Document ${documentId} added to slot ${slotName} for offer ${offerId}`);

    // Create activity log for both Offer and Lead
    try {
      const { createActivity } = require('./activityService/utils');
      const offerTitle = offer.title || `Offer #${offerId}`;
      const documentName = document.name || document.filename || 'Document';
      const slotMetadata = DocumentSlotService.getSlotMetadata(slotName);
      const slotLabel = slotMetadata?.label || slotName;
      const leadId = offer.lead_id?._id || offer.lead_id;
      
      // Create activity for Offer
      await createActivity({
        _creator: userId,
        _subject_id: offerId,
        subject_type: 'Offer',
        action: 'update',
        message: `Document "${documentName}" added to ${slotLabel} slot for offer: ${offerTitle}`,
        type: 'info',
        details: {
          action_type: 'document_added_to_slot',
          offer_id: offerId,
          offer_title: offerTitle,
          slot_name: slotName,
          slot_label: slotLabel,
          document_id: documentId,
          document_name: documentName,
          lead_id: leadId,
        },
      });

      // Also create activity for Lead (so it appears when querying by lead_id)
      if (leadId) {
        await createActivity({
          _creator: userId,
          _subject_id: leadId,
          subject_type: 'Lead',
          action: 'update',
          message: `Document "${documentName}" added to ${slotLabel} slot for offer: ${offerTitle}`,
          type: 'info',
          details: {
            action_type: 'document_added_to_slot',
            offer_id: offerId,
            offer_title: offerTitle,
            slot_name: slotName,
            slot_label: slotLabel,
            document_id: documentId,
            document_name: documentName,
            lead_id: leadId,
          },
        });
      }
    } catch (activityError) {
      logger.warn('Failed to log document slot addition activity (non-blocking)', {
        error: activityError.message,
        offerId,
        slotName,
        documentId,
      });
    }

    return this.getOfferSlot(offerId, slotName);
  }

  /**
   * Remove a document from a slot
   * @param {String} offerId - Offer ID
   * @param {String} slotName - Slot name
   * @param {String} documentId - Document ID to remove
   * @param {String} userId - User performing the action
   * @returns {Object} Updated slot data
   */
  static async removeDocumentFromSlot(offerId, slotName, documentId, userId) {
    if (!this.isValidSlot(slotName)) {
      throw new Error(`Invalid slot name: ${slotName}`);
    }

    const offer = await Offer.findById(offerId);
    if (!offer) {
      throw new Error('Offer not found');
    }

    if (!offer.document_slots?.[slotName]?.documents) {
      throw new Error('Slot is empty');
    }

    // Find and remove document
    const docIndex = offer.document_slots[slotName].documents.findIndex(
      (docId) => docId.toString() === documentId
    );

    if (docIndex === -1) {
      throw new Error('Document not found in this slot');
    }

    offer.document_slots[slotName].documents.splice(docIndex, 1);
    offer.document_slots[slotName].updated_at = new Date();
    offer.document_slots[slotName].updated_by = userId;

    offer.markModified('document_slots');
    await offer.save();

    logger.info(`Document ${documentId} removed from slot ${slotName} for offer ${offerId}`);

    return this.getOfferSlot(offerId, slotName);
  }

  /**
   * Add an email to a slot
   * @param {String} offerId - Offer ID
   * @param {String} slotName - Slot name
   * @param {String} emailId - Email ID to add
   * @param {String} userId - User performing the action
   * @returns {Object} Updated slot data
   */
  static async addEmailToSlot(offerId, slotName, emailId, userId) {
    if (!this.isValidSlot(slotName)) {
      throw new Error(`Invalid slot name: ${slotName}`);
    }

    const offer = await Offer.findById(offerId);
    if (!offer) {
      throw new Error('Offer not found');
    }

    // Initialize slot if not exists
    if (!offer.document_slots) {
      offer.document_slots = {};
    }
    if (!offer.document_slots[slotName]) {
      offer.document_slots[slotName] = {
        documents: [],
        emails: [],
        updated_at: new Date(),
        updated_by: userId,
      };
    }

    // Check if email already exists in slot
    const existingEmails = offer.document_slots[slotName].emails || [];
    if (existingEmails.some((eId) => eId.toString() === emailId)) {
      throw new ConflictError('Email already exists in this slot');
    }

    // Add email to slot
    offer.document_slots[slotName].emails.push(emailId);
    offer.document_slots[slotName].updated_at = new Date();
    offer.document_slots[slotName].updated_by = userId;

    offer.markModified('document_slots');
    await offer.save();

    logger.info(`Email ${emailId} added to slot ${slotName} for offer ${offerId}`);

    // Create activity log for both Offer and Lead
    try {
      const { createActivity } = require('./activityService/utils');
      const email = await Email.findById(emailId);
      const offerTitle = offer.title || `Offer #${offerId}`;
      const emailSubject = email?.subject || email?.email_subject || 'Email';
      const slotMetadata = DocumentSlotService.getSlotMetadata(slotName);
      const slotLabel = slotMetadata?.label || slotName;
      const leadId = offer.lead_id?._id || offer.lead_id;
      
      // Create activity for Offer
      await createActivity({
        _creator: userId,
        _subject_id: offerId,
        subject_type: 'Offer',
        action: 'update',
        message: `Email "${emailSubject}" added to ${slotLabel} slot for offer: ${offerTitle}`,
        type: 'info',
        details: {
          action_type: 'email_added_to_slot',
          offer_id: offerId,
          offer_title: offerTitle,
          slot_name: slotName,
          slot_label: slotLabel,
          email_id: emailId,
          email_subject: emailSubject,
          lead_id: leadId,
        },
      });

      // Also create activity for Lead (so it appears when querying by lead_id)
      if (leadId) {
        await createActivity({
          _creator: userId,
          _subject_id: leadId,
          subject_type: 'Lead',
          action: 'update',
          message: `Email "${emailSubject}" added to ${slotLabel} slot for offer: ${offerTitle}`,
          type: 'info',
          details: {
            action_type: 'email_added_to_slot',
            offer_id: offerId,
            offer_title: offerTitle,
            slot_name: slotName,
            slot_label: slotLabel,
            email_id: emailId,
            email_subject: emailSubject,
            lead_id: leadId,
          },
        });
      }

      // Also create activity for Email (so it appears when filtering by subject_type=Email)
      // Use leadId as subject_id to match the filter pattern (subject_id=leadId&subject_type=Email)
      if (leadId) {
        await createActivity({
          _creator: userId,
          _subject_id: leadId,
          subject_type: 'Email',
          action: 'update',
          message: `Email "${emailSubject}" added to ${slotLabel} slot for offer: ${offerTitle}`,
          type: 'info',
          details: {
            action_type: 'email_added_to_slot',
            offer_id: offerId,
            offer_title: offerTitle,
            slot_name: slotName,
            slot_label: slotLabel,
            email_id: emailId,
            email_subject: emailSubject,
            lead_id: leadId,
          },
        });
      }
    } catch (activityError) {
      logger.warn('Failed to log email slot addition activity (non-blocking)', {
        error: activityError.message,
        offerId,
        slotName,
        emailId,
      });
    }

    return this.getOfferSlot(offerId, slotName);
  }

  /**
   * Add an email to a slot for multiple offers
   * @param {string[]} offerIds - Array of offer IDs
   * @param {String} slotName - Slot name
   * @param {String} emailId - Email ID to add
   * @param {String} userId - User performing the action
   * @returns {Object} Summary with updated_offers, not_found_offers, results
   */
  static async addEmailToMultipleOffersSlot(offerIds, slotName, emailId, userId) {
    if (!this.isValidSlot(slotName)) {
      throw new Error(`Invalid slot name: ${slotName}`);
    }
    if (!offerIds?.length) {
      throw new Error('offer_ids is required and must be a non-empty array');
    }

    const notFoundOfferIds = [];
    const results = {};
    const updatedOfferIds = [];

    for (const offerId of offerIds) {
      try {
        await this.addEmailToSlot(offerId, slotName, emailId, userId);
        const slotData = await this.getOfferSlot(offerId, slotName);
        updatedOfferIds.push(offerId);
        results[offerId] = slotData;
      } catch (err) {
        if (err.message?.includes('Offer not found') || err.message === 'Offer not found') {
          notFoundOfferIds.push(offerId);
        } else {
          throw err;
        }
      }
    }

    logger.info(
      `Email ${emailId} added to slot ${slotName} for ${updatedOfferIds.length} offer(s)`
    );

    return {
      updated_offers: updatedOfferIds,
      not_found_offers: notFoundOfferIds,
      results,
      slot_name: slotName,
      email_id: emailId,
    };
  }

  /**
   * Remove an email from a slot
   * @param {String} offerId - Offer ID
   * @param {String} slotName - Slot name
   * @param {String} emailId - Email ID to remove
   * @param {String} userId - User performing the action
   * @returns {Object} Updated slot data
   */
  static async removeEmailFromSlot(offerId, slotName, emailId, userId) {
    if (!this.isValidSlot(slotName)) {
      throw new Error(`Invalid slot name: ${slotName}`);
    }

    const offer = await Offer.findById(offerId);
    if (!offer) {
      throw new Error('Offer not found');
    }

    if (!offer.document_slots?.[slotName]?.emails) {
      throw new Error('Slot has no emails');
    }

    // Find and remove email
    const emailIndex = offer.document_slots[slotName].emails.findIndex(
      (eId) => eId.toString() === emailId
    );

    if (emailIndex === -1) {
      throw new Error('Email not found in this slot');
    }

    offer.document_slots[slotName].emails.splice(emailIndex, 1);
    offer.document_slots[slotName].updated_at = new Date();
    offer.document_slots[slotName].updated_by = userId;

    offer.markModified('document_slots');
    await offer.save();

    logger.info(`Email ${emailId} removed from slot ${slotName} for offer ${offerId}`);

    return this.getOfferSlot(offerId, slotName);
  }

  /**
   * Bulk add documents/emails to a slot
   * @param {String} offerId - Offer ID
   * @param {String} slotName - Slot name
   * @param {Array} documentIds - Array of document IDs
   * @param {Array} emailIds - Array of email IDs
   * @param {String} userId - User performing the action
   * @returns {Object} Updated slot data
   */
  static async bulkAddToSlot(offerId, slotName, documentIds = [], emailIds = [], userId) {
    if (!this.isValidSlot(slotName)) {
      throw new Error(`Invalid slot name: ${slotName}`);
    }

    const offer = await Offer.findById(offerId);
    if (!offer) {
      throw new Error('Offer not found');
    }

    // Initialize slot if not exists
    if (!offer.document_slots) {
      offer.document_slots = {};
    }
    if (!offer.document_slots[slotName]) {
      offer.document_slots[slotName] = {
        documents: [],
        emails: [],
        updated_at: new Date(),
        updated_by: userId,
      };
    }

    // Add documents (avoid duplicates)
    const existingDocs = new Set(
      (offer.document_slots[slotName].documents || []).map((d) => d.toString())
    );
    const newDocs = documentIds.filter((id) => !existingDocs.has(id));
    offer.document_slots[slotName].documents.push(...newDocs);

    // Add emails (avoid duplicates)
    const existingEmails = new Set(
      (offer.document_slots[slotName].emails || []).map((e) => e.toString())
    );
    const newEmails = emailIds.filter((id) => !existingEmails.has(id));
    offer.document_slots[slotName].emails.push(...newEmails);

    offer.document_slots[slotName].updated_at = new Date();
    offer.document_slots[slotName].updated_by = userId;

    offer.markModified('document_slots');
    await offer.save();

    logger.info(
      `Bulk added ${newDocs.length} documents and ${newEmails.length} emails to slot ${slotName} for offer ${offerId}`
    );

    return this.getOfferSlot(offerId, slotName);
  }

  /**
   * Bulk add documents/emails to a slot for multiple offers
   * @param {string[]} offerIds - Array of offer IDs
   * @param {String} slotName - Slot name
   * @param {Array} documentIds - Array of document IDs
   * @param {Array} emailIds - Array of email IDs
   * @param {String} userId - User performing the action
   * @returns {Object} Summary with updated_offers, not_found_offers, results
   */
  static async bulkAddToMultipleOffersSlot(offerIds, slotName, documentIds = [], emailIds = [], userId) {
    if (!this.isValidSlot(slotName)) {
      throw new Error(`Invalid slot name: ${slotName}`);
    }
    if (!offerIds?.length) {
      throw new Error('offer_ids is required and must be a non-empty array');
    }
    if ((!documentIds?.length && !emailIds?.length)) {
      throw new Error('At least one of document_ids or email_ids must be provided and non-empty');
    }

    const docIds = Array.isArray(documentIds) ? documentIds : [];
    const emlIds = Array.isArray(emailIds) ? emailIds : [];
    const notFoundOfferIds = [];
    const results = {};
    const updatedOfferIds = [];

    for (const offerId of offerIds) {
      try {
        await this.bulkAddToSlot(offerId, slotName, docIds, emlIds, userId);
        const slotData = await this.getOfferSlot(offerId, slotName);
        updatedOfferIds.push(offerId);
        results[offerId] = slotData;
      } catch (err) {
        if (err.message?.includes('Offer not found') || err.message === 'Offer not found') {
          notFoundOfferIds.push(offerId);
        } else {
          throw err;
        }
      }
    }

    logger.info(
      `Bulk added ${docIds.length} docs, ${emlIds.length} emails to slot ${slotName} for ${updatedOfferIds.length} offer(s)`
    );

    return {
      updated_offers: updatedOfferIds,
      not_found_offers: notFoundOfferIds,
      results,
      slot_name: slotName,
      document_ids: docIds,
      email_ids: emlIds,
    };
  }

  /**
   * Clear all items from a slot
   * @param {String} offerId - Offer ID
   * @param {String} slotName - Slot name
   * @param {String} userId - User performing the action
   * @returns {Object} Updated slot data
   */
  static async clearSlot(offerId, slotName, userId) {
    if (!this.isValidSlot(slotName)) {
      throw new Error(`Invalid slot name: ${slotName}`);
    }

    const offer = await Offer.findById(offerId);
    if (!offer) {
      throw new Error('Offer not found');
    }

    if (!offer.document_slots) {
      offer.document_slots = {};
    }

    offer.document_slots[slotName] = {
      documents: [],
      emails: [],
      updated_at: new Date(),
      updated_by: userId,
    };

    offer.markModified('document_slots');
    await offer.save();

    logger.info(`Cleared slot ${slotName} for offer ${offerId}`);

    return this.getOfferSlot(offerId, slotName);
  }

  // ============================================
  // LEAD LAST EMAIL OPERATIONS
  // ============================================

  /**
   * Get last_email for a lead
   * @param {String} leadId - Lead ID
   * @returns {Object} Last email slot data
   */
  static async getLeadLastEmail(leadId) {
    const lead = await Lead.findById(leadId)
      .populate('last_email.documents')
      .populate('last_email.emails')
      .populate('last_email.updated_by', 'name login')
      .lean();

    if (!lead) {
      throw new Error('Lead not found');
    }

    let lastEmail = lead.last_email || {
      documents: [],
      emails: [],
      updated_at: null,
      updated_by: null,
    };

    // When no emails are pinned in last_email, show latest emails for this lead from Email collection
    const hasPinnedEmails = lastEmail.emails && lastEmail.emails.length > 0;
    if (!hasPinnedEmails) {
      const leadObjectId = mongoose.Types.ObjectId.isValid(leadId)
        ? new mongoose.Types.ObjectId(leadId)
        : leadId;
      const latestEmails = await Email.find({ lead_id: leadObjectId })
        .sort({ updatedAt: -1, received_at: -1, sent_at: -1 })
        .limit(1)
        .lean();
      lastEmail = {
        ...lastEmail,
        emails: latestEmails,
      };
    }

    return {
      lead_id: lead._id,
      ...lastEmail,
      metadata: SLOT_METADATA.last_email,
    };
  }

  /**
   * Add document to lead's last_email
   * @param {String} leadId - Lead ID
   * @param {String} documentId - Document ID
   * @param {String} userId - User performing the action
   * @returns {Object} Updated last_email data
   */
  static async addDocumentToLeadLastEmail(leadId, documentId, userId) {
    const lead = await Lead.findById(leadId);
    if (!lead) {
      throw new Error('Lead not found');
    }

    // Verify document exists
    const document = await Document.findById(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    // Initialize last_email if not exists
    if (!lead.last_email) {
      lead.last_email = {
        documents: [],
        emails: [],
        updated_at: new Date(),
        updated_by: userId,
      };
    }

    // Check if document already exists
    const existingDocs = lead.last_email.documents || [];
    if (existingDocs.some((docId) => docId.toString() === documentId)) {
      throw new ConflictError('Document already exists in last_email');
    }

    lead.last_email.documents.push(documentId);
    lead.last_email.updated_at = new Date();
    lead.last_email.updated_by = userId;

    lead.markModified('last_email');
    await lead.save();

    logger.info(`Document ${documentId} added to last_email for lead ${leadId}`);

    return this.getLeadLastEmail(leadId);
  }

  /**
   * Remove document from lead's last_email
   * @param {String} leadId - Lead ID
   * @param {String} documentId - Document ID
   * @param {String} userId - User performing the action
   * @returns {Object} Updated last_email data
   */
  static async removeDocumentFromLeadLastEmail(leadId, documentId, userId) {
    const lead = await Lead.findById(leadId);
    if (!lead) {
      throw new Error('Lead not found');
    }

    if (!lead.last_email?.documents) {
      throw new Error('No documents in last_email');
    }

    const docIndex = lead.last_email.documents.findIndex(
      (docId) => docId.toString() === documentId
    );

    if (docIndex === -1) {
      throw new Error('Document not found in last_email');
    }

    lead.last_email.documents.splice(docIndex, 1);
    lead.last_email.updated_at = new Date();
    lead.last_email.updated_by = userId;

    lead.markModified('last_email');
    await lead.save();

    logger.info(`Document ${documentId} removed from last_email for lead ${leadId}`);

    return this.getLeadLastEmail(leadId);
  }

  /**
   * Add email to lead's last_email
   * @param {String} leadId - Lead ID
   * @param {String} emailId - Email ID
   * @param {String} userId - User performing the action
   * @returns {Object} Updated last_email data
   */
  static async addEmailToLeadLastEmail(leadId, emailId, userId) {
    const lead = await Lead.findById(leadId);
    if (!lead) {
      throw new Error('Lead not found');
    }

    // Initialize last_email if not exists
    if (!lead.last_email) {
      lead.last_email = {
        documents: [],
        emails: [],
        updated_at: new Date(),
        updated_by: userId,
      };
    }

    // Check if email already exists
    const existingEmails = lead.last_email.emails || [];
    if (existingEmails.some((eId) => eId.toString() === emailId)) {
      throw new ConflictError('Email already exists in last_email');
    }

    lead.last_email.emails.push(emailId);
    lead.last_email.updated_at = new Date();
    lead.last_email.updated_by = userId;

    lead.markModified('last_email');
    await lead.save();

    logger.info(`Email ${emailId} added to last_email for lead ${leadId}`);

    return this.getLeadLastEmail(leadId);
  }

  /**
   * Remove email from lead's last_email
   * @param {String} leadId - Lead ID
   * @param {String} emailId - Email ID
   * @param {String} userId - User performing the action
   * @returns {Object} Updated last_email data
   */
  static async removeEmailFromLeadLastEmail(leadId, emailId, userId) {
    const lead = await Lead.findById(leadId);
    if (!lead) {
      throw new Error('Lead not found');
    }

    if (!lead.last_email?.emails) {
      throw new Error('No emails in last_email');
    }

    const emailIndex = lead.last_email.emails.findIndex((eId) => eId.toString() === emailId);

    if (emailIndex === -1) {
      throw new Error('Email not found in last_email');
    }

    lead.last_email.emails.splice(emailIndex, 1);
    lead.last_email.updated_at = new Date();
    lead.last_email.updated_by = userId;

    lead.markModified('last_email');
    await lead.save();

    logger.info(`Email ${emailId} removed from last_email for lead ${leadId}`);

    return this.getLeadLastEmail(leadId);
  }

  /**
   * Clear lead's last_email
   * @param {String} leadId - Lead ID
   * @param {String} userId - User performing the action
   * @returns {Object} Updated last_email data
   */
  static async clearLeadLastEmail(leadId, userId) {
    const lead = await Lead.findById(leadId);
    if (!lead) {
      throw new Error('Lead not found');
    }

    lead.last_email = {
      documents: [],
      emails: [],
      updated_at: new Date(),
      updated_by: userId,
    };

    lead.markModified('last_email');
    await lead.save();

    logger.info(`Cleared last_email for lead ${leadId}`);

    return this.getLeadLastEmail(leadId);
  }
}

module.exports = DocumentSlotService;
