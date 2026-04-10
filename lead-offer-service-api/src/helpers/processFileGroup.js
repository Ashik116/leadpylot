const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { Document } = require('../models');
const storageConfig = require('../config/storageConfig');

/**
 * Process file group
 * @param {Array} fileArray - Array of files to process
 * @param {string} docType - Type of document to process
 * @param {string} uploader_id - ID of the user uploading the files
 * @param {Array} assignments - Optional array of assignments for the documents
 * @param {Array} assignment_history - Optional array of assignment history entries
 * @returns {Array} Array of documents
 */

async function processFileGroup(
  fileArray,
  docType = 'extra',
  uploader_id,
  assignments = [],
  assignment_history = []
) {
  if (!fileArray || !fileArray.length) {
    console.log('No files provided to processFileGroup');
    return [];
  }

  // Use centralized storage configuration
  // storageConfig automatically ensures directories exist

  const documents = await Promise.all(
    fileArray.map(async (file, index) => {
      try {
        // Read file buffer from Multer's temp file
        const fileBuffer = await fs.readFile(file.path);
        console.log(`File buffer read successfully, size: ${fileBuffer.length} bytes`);

        const checksum = crypto.createHash('md5').update(fileBuffer).digest('hex');
        const ext = path.extname(file.originalname).toLowerCase();
        const uniqueId = crypto.randomUUID();
        const storageFilename = `${checksum}-${uniqueId}${ext}`;

        // Upload file using hybrid storage (local + cloud)
        const uploadResult = await storageConfig.uploadFile(
          fileBuffer,
          storageFilename,
          'documents',
          {
            originalFilename: file.originalname,
            uploader: uploader_id,
            contentType: file.mimetype,
          }
        );

        if (!uploadResult.success) {
          throw new Error(
            `File upload failed: ${uploadResult.errors?.join(', ') || 'Unknown error'}`
          );
        }

        // Delete temp file
        await fs
          .unlink(file.path)
          .catch(() => console.warn('Could not delete temp file:', file.path));

        // Use the web path from upload result
        const webPath =
          uploadResult.webPath || storageConfig.getWebPath(storageFilename, 'documents');

        // Prepare document data with optional assignments and assignment_history
        const documentData = {
          filetype: file.mimetype,
          filename: file.originalname,
          path: webPath,
          size: file.size,
          type: file.documentType || docType,
          uploader_id: uploader_id,

          // Enhanced library fields
          library_status: assignments && assignments.length > 0 ? 'assigned' : 'library',
          tags: [],
          notes: `Document uploaded for ${docType}`,

          // Metadata for enhanced functionality
          metadata: {
            original_filename: file.originalname,
            file_hash: checksum,
            content_type: file.mimetype,
            source: 'entity_upload',
            storage: uploadResult.storage, // Track which storage (local/cloud/both)
            cloud_url: uploadResult.url, // S3 URL if available
          },
        };

        // Add optional assignments if provided
        if (assignments && assignments.length > 0) {
          documentData.assignments = assignments.map((assignment) => ({
            entity_type: assignment.entity_type,
            entity_id: assignment.entity_id,
            assigned_at: assignment.assigned_at || new Date(),
            assigned_by: assignment.assigned_by || uploader_id,
            active: assignment.active !== undefined ? assignment.active : true,
            notes: assignment.notes || '',
          }));
        }

        // Add optional assignment_history if provided
        if (assignment_history && assignment_history.length > 0) {
          documentData.assignment_history = assignment_history.map((history) => ({
            action: history.action,
            entity_type: history.entity_type,
            entity_id: history.entity_id,
            performed_at: history.performed_at || new Date(),
            performed_by: history.performed_by || uploader_id,
            notes: history.notes || '',
          }));
        }

        // Create document record
        const document = new Document(documentData);

        await document.save();

        // Enhanced logging for document creation
        const logger = require('../utils/logger');
        logger.info('📄 Document created and saved to MongoDB', {
          documentId: document._id,
          filename: file.originalname,
          filetype: file.mimetype,
          size: file.size,
          type: file.documentType || docType,
          uploaderId: uploader_id,
          libraryStatus: document.library_status,
          assignmentsCount: document.assignments?.length || 0,
          assignmentHistoryCount: document.assignment_history?.length || 0,
          storage: uploadResult.storage,
          cloudUrl: uploadResult.url,
          endpoint: 'Document Upload via processFileGroup',
        });

        return document;
      } catch (err) {
        console.error(`Error processing file ${file.originalname}:`, {
          error: err.message,
          stack: err.stack,
        });
        return null;
      }
    })
  );

  const validDocuments = documents.filter(Boolean);
  console.log('=== processFileGroup completed ===', {
    totalProcessed: documents.length,
    successful: validDocuments.length,
    failed: documents.length - validDocuments.length,
    documentsWithAssignments: validDocuments.filter(
      (doc) => doc.assignments && doc.assignments.length > 0
    ).length,
    documentsWithHistory: validDocuments.filter(
      (doc) => doc.assignment_history && doc.assignment_history.length > 0
    ).length,
  });

  return validDocuments;
}

module.exports = processFileGroup;
