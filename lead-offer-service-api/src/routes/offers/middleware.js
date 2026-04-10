const multer = require('multer');
const path = require('path');
const storageConfig = require('../../config/storageConfig');
const { asyncHandler } = require('../../utils/errorHandler');

/**
 * Configure multer storage for file uploads
 */
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Use centralized storage configuration for temp uploads
    const tempUploadsDir = storageConfig.getFilePath('', 'temp');
    cb(null, tempUploadsDir);
  },
  filename: function (req, file, cb) {
    // Use a timestamp prefix to avoid filename collisions
    cb(null, Date.now() + '-' + file.originalname);
  },
});

/**
 * File filter to allow only certain file types
 */
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/jpg',
    'image/webp',
    'application/pdf',
    'text/plain',
  ];
  
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error('Invalid file type'));
  }
  
  cb(null, true);
};

/**
 * Multer upload configuration
 */
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

/**
 * Middleware to process document types from request
 * Assigns document types to uploaded files based on the request body
 */
const processDocumentType = asyncHandler(async (req, res, next) => {
  if (req.files && req.files.length > 0) {
    // Check if documentTypes is provided as an array
    if (req.body.documentTypes && Array.isArray(JSON.parse(req.body.documentTypes))) {
      const documentTypes = JSON.parse(req.body.documentTypes);

      // Assign document type to each file based on the array index
      req.files.forEach((file, index) => {
        // If there's a document type specified for this index, use it; otherwise use default
        file.documentType = index < documentTypes.length ? documentTypes[index] : 'extra';

        // Validate that the document type is one of the allowed values
        if (!['contract', 'id', 'extra'].includes(file.documentType)) {
          file.documentType = 'extra'; // Default to 'extra' if invalid type
        }
      });
    } else {
      // Fallback to the old behavior if documentTypes is not provided
      req.files.forEach((file) => {
        file.documentType = req.body.documentType || 'extra';
      });
    }
  }
  next();
});

module.exports = {
  upload,
  processDocumentType,
};

