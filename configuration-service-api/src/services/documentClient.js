/**
 * Document Service Client
 * HTTP client for communicating with the Document microservice
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const logger = require('../utils/logger');

const DOCUMENT_SERVICE_URL = process.env.DOCUMENT_SERVICE_URL || 'http://localhost:4002';

/**
 * Upload a file to the document service
 * @param {Object} file - Multer file object
 * @param {string} documentType - Type of document (e.g., 'extra' for bank logos)
 * @param {string} userId - ID of user uploading the file
 * @param {string} authToken - JWT bearer token for authentication
 * @returns {Object} Document object with _id
 */
async function uploadDocument(file, documentType = 'extra', userId = null, authToken = null) {
  try {
    // Create form data
    const formData = new FormData();

    // Add file buffer or stream
    if (file.buffer) {
      formData.append('file', file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype,
      });
    } else if (file.path && fs.existsSync(file.path)) {
      formData.append('file', fs.createReadStream(file.path), {
        filename: file.originalname,
        contentType: file.mimetype,
      });
    } else {
      throw new Error('File buffer or path not found');
    }

    // Add metadata
    formData.append('type', documentType);
    if (userId) {
      formData.append('uploader_id', userId);
    }

    // Build headers with authentication
    const headers = formData.getHeaders();
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }

    // Upload to document service
    const response = await axios.post(
      `${DOCUMENT_SERVICE_URL}/attachments/library/upload/single`,
      formData,
      {
        headers,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 60000, // 60 second timeout for large files
      }
    );
    
    if (response.data && response.data.data && response.data.data.document) {
      logger.info('Document uploaded successfully', {
        documentId: response.data.data.document._id,
        filename: file.originalname,
        size: file.size,
      });
      
      return response.data.data.document;
    }
    
    throw new Error('Invalid response from document service');
  } catch (error) {
    logger.error('Error uploading document to document service', {
      error: error.message,
      filename: file?.originalname,
      documentServiceUrl: DOCUMENT_SERVICE_URL,
      response: error.response?.data,
    });
    
    throw new Error(`Failed to upload document: ${error.message}`);
  }
}

/**
 * Delete a document from the document service
 * @param {string} documentId - Document ID to delete
 * @returns {boolean} Success status
 */
async function deleteDocument(documentId) {
  try {
    const response = await axios.delete(
      `${DOCUMENT_SERVICE_URL}/attachments/library/${documentId}`,
      {
        timeout: 30000,
      }
    );
    
    logger.info('Document deleted successfully', {
      documentId,
    });
    
    return true;
  } catch (error) {
    logger.error('Error deleting document from document service', {
      error: error.message,
      documentId,
      response: error.response?.data,
    });
    
    // Don't throw error for delete failures, just log it
    return false;
  }
}

/**
 * Get document metadata from document service
 * @param {string} documentId - Document ID
 * @param {string} authToken - JWT bearer token for authentication (optional)
 * @returns {Object} Document object
 */
async function getDocument(documentId, authToken = null) {
  try {
    const headers = {};
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }

    const response = await axios.get(
      `${DOCUMENT_SERVICE_URL}/attachments/library/${documentId}`,
      {
        headers,
        timeout: 10000,
      }
    );

    if (response.data && response.data.data) {
      return response.data.data;
    }

    return null;
  } catch (error) {
    logger.error('Error getting document from document service', {
      error: error.message,
      documentId,
      response: error.response?.data,
    });

    return null;
  }
}

module.exports = {
  uploadDocument,
  deleteDocument,
  getDocument,
};

