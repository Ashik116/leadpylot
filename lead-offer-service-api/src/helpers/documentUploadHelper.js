

const unifiedDocumentService = require('../services/unifiedDocumentService');



/**
 * Document Upload Helper
 * Provides reusable functions for document operations
 */
class DocumentUploadHelper {
  /**
   * Process and attach files to entity during creation
   * @param {Object} entity - The entity to attach files to
   * @param {Array} files - Files to process
   * @param {String} documentType - Type of document
   * @param {String} uploaderId - ID of user uploading files
   * @returns {Object} Updated entity with files attached
   */
  static async processAndAttachFiles(entity, files, documentType, uploaderId) {
    if (!files || files.length === 0) {
      return entity;
    }

    const documentIds = await unifiedDocumentService.processFiles(files, documentType, uploaderId);
    return await unifiedDocumentService.addDocumentsToEntity(entity, documentIds);
  }

  /**
   * Add files to existing entity
   * @param {Object} entity - The entity to add files to
   * @param {Array} files - Files to add
   * @param {String} documentType - Type of document
   * @param {String} uploaderId - ID of user uploading files
   * @returns {Object} Updated entity
   */
  static async addFilesToEntity(entity, files, documentType, uploaderId) {
    if (!files || files.length === 0) {
      return entity;
    }

    const documentIds = await unifiedDocumentService.processFiles(files, documentType, uploaderId);
    return await unifiedDocumentService.addDocumentsToEntity(entity, documentIds);
  }

  /**
   * Remove files from entity
   * @param {Object} entity - The entity to remove files from
   * @param {Array} documentIds - Document IDs to remove
   * @returns {Object} Updated entity
   */
  static async removeFilesFromEntity(entity, documentIds) {
    return await unifiedDocumentService.removeDocumentsFromEntity(entity, documentIds);
  }

  /**
   * Get files for entity
   * @param {String} entityId - Entity ID
   * @param {String} entityType - Entity type
   * @returns {Array} Array of documents
   */
  static async getEntityFiles(entityId, entityType) {
    return await unifiedDocumentService.getEntityDocuments(entityId, entityType);
  }

  /**
   * Delete document
   * @param {String} documentId - Document ID to delete
   * @returns {Boolean} Success status
   */
  static async deleteDocument(documentId) {
    return await unifiedDocumentService.deleteDocument(documentId);
  }

  /**
   * Get document types
   * @returns {Object} Document types mapping
   */
  static getDocumentTypes() {
    return unifiedDocumentService.getDocumentTypes();
  }
}

module.exports = DocumentUploadHelper; 