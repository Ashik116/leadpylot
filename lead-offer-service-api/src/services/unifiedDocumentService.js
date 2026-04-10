const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Document } = require('../models');
const { DatabaseError } = require('../utils/errorHandler');
const storageConfig = require('../config/storageConfig');

/**
 * Unified Document Service
 * Handles all document operations in a centralized way
 */
class UnifiedDocumentService {
  constructor() {
    // Use centralized storage configuration
    this.storageConfig = storageConfig;
  }

  /**
   * Process and save multiple files
   * @param {Array} files - Array of file objects from multer
   * @param {String} documentType - Type of document (offer, opening, confirmation, payment_voucher, etc.)
   * @param {String} uploaderId - ID of user uploading files
   * @returns {Array} Array of document IDs
   */
  async processFiles(files, documentType = 'extra', uploaderId = null) {
    if (!files || files.length === 0) {
      return [];
    }

    const documentIds = [];
    
    for (const file of files) {
      try {
        const documentId = await this.processFile(file, documentType, uploaderId);
        if (documentId) {
          documentIds.push(documentId);
        }
      } catch (error) {
        console.error('Error processing file:', file.originalname, error);
        // Clean up temporary file on error
        this.cleanupTempFile(file.path);
        throw error;
      }
    }

    return documentIds;
  }

  /**
   * Process and save a single file
   * @param {Object} file - File object from multer
   * @param {String} documentType - Type of document
   * @param {String} uploaderId - ID of user uploading file
   * @returns {String} Document ID
   */
  async processFile(file, documentType = 'extra', uploaderId = null) {
    try {
      // Generate MD5 hash for file deduplication
      const fileBuffer = fs.readFileSync(file.path);
      const checksum = crypto.createHash('md5').update(fileBuffer).digest('hex');
      
      // Create secure filename
      const ext = path.extname(file.originalname);
      const storagePath = `${checksum}${ext}`;

      // Upload file using hybrid storage (local + cloud)
      const uploadResult = await this.storageConfig.uploadFile(fileBuffer, storagePath, 'documents', {
        originalFilename: file.originalname,
        uploader: uploaderId,
        contentType: file.mimetype
      });

      if (!uploadResult.success) {
        throw new Error(`File upload failed: ${uploadResult.errors?.join(', ') || 'Unknown error'}`);
      }

      // Clean up temporary file
      this.cleanupTempFile(file.path);

      // Create document record with enhanced library fields
      const document = new Document({
        filetype: file.mimetype,
        filename: file.originalname,
        path: uploadResult.webPath || this.storageConfig.getWebPath(storagePath, 'documents'),
        size: file.size,
        type: documentType,
        uploader_id: uploaderId,
        
        // Enhanced library fields
        library_status: 'assigned', // Documents uploaded via offers/openings are automatically assigned
        tags: this.getDocumentTags(documentType),
        notes: `Document uploaded for ${documentType}`,
        
        // Metadata for enhanced functionality
        metadata: {
          original_filename: file.originalname,
          file_hash: checksum,
          content_type: file.mimetype,
          source: 'entity_upload',
          storage: uploadResult.storage, // Track which storage (local/cloud/both)
          cloud_url: uploadResult.url // S3 URL if available
        }
      });

      await document.save();
      return document._id;
    } catch (error) {
      console.error('Error processing file:', error);
      throw new DatabaseError(`Failed to process file: ${error.message}`);
    }
  }

  /**
   * Add documents to an entity
   * @param {Object} entity - The entity to add documents to
   * @param {Array} documentIds - Array of document IDs to add
   * @returns {Object} Updated entity
   */
  async addDocumentsToEntity(entity, documentIds) {
    if (!documentIds || documentIds.length === 0) {
      return entity;
    }

    const documentRefs = documentIds.map(id => ({ document: id }));
    
    if (!entity.files) {
      entity.files = [];
    }
    
    entity.files.push(...documentRefs);
    await entity.save();
    
    return entity;
  }

  /**
   * Remove documents from an entity
   * @param {Object} entity - The entity to remove documents from
   * @param {Array} documentIds - Array of document IDs to remove
   * @returns {Object} Updated entity
   */
  async removeDocumentsFromEntity(entity, documentIds) {
    if (!documentIds || documentIds.length === 0) {
      return entity;
    }

    entity.files = entity.files.filter(
      file => !documentIds.some(id => id.toString() === file.document.toString())
    );
    
    await entity.save();
    return entity;
  }

  /**
   * Get documents for an entity
   * @param {String} entityId - Entity ID
   * @param {String} entityType - Entity type (Opening, Offer, etc.)
   * @returns {Array} Array of populated documents
   */
  async getEntityDocuments(entityId, entityType) {
    const EntityModel = require('../models')[entityType];
    const entity = await EntityModel.findById(entityId)
      .populate('files.document');
    
    return entity ? entity.files.map(file => file.document) : [];
  }

  /**
   * Delete document and its file
   * @param {String} documentId - Document ID to delete
   * @returns {Boolean} Success status
   */
  async deleteDocument(documentId) {
    try {
      const document = await Document.findById(documentId);
      if (!document) {
        return false;
      }

      // Delete physical file using storageConfig
      const relativePath = document.path.replace(/^\//, '');
      const filePath = storageConfig.getFilePath(relativePath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // Delete document record
      await Document.findByIdAndDelete(documentId);
      return true;
    } catch (error) {
      console.error('Error deleting document:', error);
      return false;
    }
  }

  /**
   * Clean up temporary file
   * @param {String} tempPath - Path to temporary file
   */
  cleanupTempFile(tempPath) {
    if (tempPath && fs.existsSync(tempPath)) {
      try {
        fs.unlinkSync(tempPath);
      } catch (error) {
        console.error('Error cleaning up temp file:', tempPath, error);
      }
    }
  }

  /**
   * Get document types for different entities
   * @returns {Object} Document types mapping
   */
  getDocumentTypes() {
    return {
      // ============================================
      // NEW DOCUMENT SLOT TYPES (Primary)
      // Aligned with offer workflow stages
      // ============================================
      
      // Offer Stage - Email communication
      OFFER_EMAIL_SLOT: 'offer_email',           // Offer email communication with customer
      OFFER_CONTRACT_SLOT: 'offer_contract',    // Offer contract document
      
      // Opening Stage - Incoming from Customer
      CONTRACT: 'contract',                      // Customer sends signed contract
      ID_FILES: 'id_files',                      // Customer sends ID documents
      
      // Opening Stage - Outgoing to Customer
      CONTRACT_RECEIVED_MAIL: 'contract_received_mail', // We confirm receipt of contract + ID
      OPENING_CONTRACT_CLIENT_EMAIL: 'opening_contract_client_email', // Opening contract email to client
      
      // Confirmation Stage - Outgoing to Customer
      BANK_CONFIRMATION: 'bank_confirmation',    // We confirm account opened + depot login
      ANNAHME: 'annahme',                        // We send bank details
      CONFIRMATION_EMAIL_SLOT: 'confirmation_email', // Confirmation email to customer
      
      // Payment Stage - Incoming from Customer
      SWIFT: 'swift',                            // Customer sends payment voucher
      
      // Payment Stage - Outgoing to Customer
      SWIFT_CONFIRM_MAIL: 'swift_confirm_mail',  // We confirm receipt of payment
      
      // Post-Payment - Outgoing to Customer
      DEPOT_UPDATE_MAIL: 'depot_update_mail',    // We confirm amount updated
      DEPOT_LOGIN: 'depot_login',                // Depot login credentials
      LOAD_MAIL: 'load_mail',                    // Follow-up with new offers
      
      // Lead Level
      LAST_EMAIL: 'last_email',                  // Most recent email communication
      
      // ============================================
      // LEGACY TYPES (Backward Compatibility)
      // Map old constants to new values for existing code
      // ============================================
      OFFER: 'contract',           // Legacy: maps to contract
      OPENING: 'contract',         // Legacy: maps to contract
      CONFIRMATION: 'annahme',     // Legacy: maps to annahme
      PAYMENT_VOUCHER: 'swift',    // Legacy: maps to swift
      NETTO1: 'netto1-mail',       // Keep as-is for netto stages
      NETTO2: 'netto2-mail',       // Keep as-is for netto stages
      
      // Legacy detailed types (keep for backward compatibility)
      OFFER_CONTRACT: 'offer-contract',
      OFFER_EXTRA: 'offer-extra',
      OFFER_EMAIL: 'offer-email',
      OPENING_CONTRACT: 'opening-contract',
      OPENING_ID: 'opening-id',
      OPENING_EXTRA: 'opening-extra',
      OPENING_EMAIL: 'opening-email',
      OPENING_MAIL: 'opening-mail',
      CONFIRMATION_CONTRACT: 'confirmation-contract',
      CONFIRMATION_EXTRA: 'confirmation-extra',
      CONFIRMATION_EMAIL: 'confirmation-email',
      CONFIRMATION_MAIL: 'confirmation-mail',
      PAYMENT_CONTRACT: 'payment-contract',
      PAYMENT_EXTRA: 'payment-extra',
      PAYMENT_EMAIL: 'payment-email',
      PAYMENT_MAIL: 'payment-mail',
      NETTO1_MAIL: 'netto1-mail',
      NETTO2_MAIL: 'netto2-mail',
    };
  }

  /**
   * Generate appropriate tags based on document type
   * @param {String} documentType - Type of document
   * @returns {Array} Array of tags
   */
  getDocumentTags(documentType) {
    const baseTags = ['document', 'upload'];
    
    // Handle new document slot types
    switch (documentType) {
      // Offer Stage
      case 'offer_email':
        baseTags.push('offer', 'email', 'outgoing', 'communication');
        break;
      case 'offer_contract':
        baseTags.push('offer', 'contract', 'document');
        break;
      
      // Opening Stage
      case 'contract':
        baseTags.push('contract', 'opening', 'incoming', 'legal');
        break;
      case 'id_files':
        baseTags.push('identification', 'opening', 'incoming', 'personal');
        break;
      case 'contract_received_mail':
        baseTags.push('opening', 'outgoing', 'confirmation', 'mail');
        break;
      case 'opening_contract_client_email':
        baseTags.push('opening', 'outgoing', 'contract', 'client', 'email');
        break;
      
      // Confirmation Stage
      case 'bank_confirmation':
        baseTags.push('confirmation', 'outgoing', 'bank', 'account');
        break;
      case 'annahme':
        baseTags.push('confirmation', 'outgoing', 'bank', 'details', 'acceptance');
        break;
      case 'confirmation_email':
        baseTags.push('confirmation', 'outgoing', 'email', 'customer');
        break;
      
      // Payment Stage
      case 'swift':
        baseTags.push('payment', 'incoming', 'swift', 'voucher', 'financial');
        break;
      case 'swift_confirm_mail':
        baseTags.push('payment', 'outgoing', 'confirmation', 'mail');
        break;
      
      // Post-Payment
      case 'depot_update_mail':
        baseTags.push('post-payment', 'outgoing', 'depot', 'update', 'mail');
        break;
      case 'depot_login':
        baseTags.push('post-payment', 'outgoing', 'depot', 'credentials');
        break;
      case 'load_mail':
        baseTags.push('post-payment', 'outgoing', 'followup', 'offer', 'mail');
        break;
      
      // Lead Level
      case 'last_email':
        baseTags.push('lead', 'email', 'communication', 'recent');
        break;
    }
    
    // Legacy type handling - Add type-specific tags
    if (documentType.includes('offer')) {
      baseTags.push('offer');
    }
    if (documentType.includes('opening')) {
      baseTags.push('opening');
    }
    if (documentType.includes('confirmation')) {
      baseTags.push('confirmation');
    }
    if (documentType.includes('payment')) {
      baseTags.push('payment', 'financial');
    }
    if (documentType.includes('contract') && !baseTags.includes('contract')) {
      baseTags.push('contract', 'legal');
    }
    if (documentType.includes('id') && !baseTags.includes('identification')) {
      baseTags.push('identification', 'personal');
    }
    if (documentType.includes('extra')) {
      baseTags.push('additional');
    }
    if (documentType.includes('email')) {
      baseTags.push('email', 'communication');
    }
    if (documentType.includes('mail') && !baseTags.includes('mail')) {
      baseTags.push('mail', 'communication');
    }
    if (documentType.includes('netto1')) {
      baseTags.push('netto1', 'financial');
    }
    if (documentType.includes('netto2')) {
      baseTags.push('netto2', 'financial');
    }
    
    // Handle legacy single word types
    switch (documentType) {
      case 'offer':
        baseTags.push('offer');
        break;
      case 'opening':
        baseTags.push('opening');
        break;
      case 'confirmation':
        baseTags.push('confirmation');
        break;
      case 'payment_voucher':
        baseTags.push('payment', 'voucher', 'financial');
        break;
      case 'id':
        baseTags.push('identification', 'personal');
        break;
      case 'extra':
        baseTags.push('additional');
        break;
      case 'library':
        baseTags.push('library');
        break;
      case 'communication':
        baseTags.push('communication');
        break;
      case 'legal':
        baseTags.push('legal');
        break;
      case 'financial':
        baseTags.push('financial');
        break;
    }
    
    return [...new Set(baseTags)]; // Remove duplicates
  }
}

module.exports = new UnifiedDocumentService(); 