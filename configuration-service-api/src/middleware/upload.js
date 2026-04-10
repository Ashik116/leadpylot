/**
 * Upload Middleware
 * Multer configuration for file uploads
 */

const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { BadRequestError } = require('../utils/errorHandler');
const storageConfig = require('../config/storage');

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, storageConfig.importsPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename: timestamp_random_originalname
    const uniqueSuffix = Date.now() + '_' + crypto.randomBytes(6).toString('hex');
    const ext = path.extname(file.originalname);
    const nameWithoutExt = path.basename(file.originalname, ext);
    cb(null, `${nameWithoutExt}_${uniqueSuffix}${ext}`);
  },
});

// File filter for Excel files
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'text/csv', // .csv
  ];
  
  const allowedExtensions = ['.xlsx', '.xls', '.csv'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedMimes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new BadRequestError('Only Excel (.xlsx, .xls) and CSV (.csv) files are allowed'), false);
  }
};

// File filter for images (bank logos, etc.)
const imageFilter = (req, file, cb) => {
  const allowedMimes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml'
  ];
  
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedMimes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new BadRequestError('Only image files (JPG, PNG, GIF, WebP, SVG) are allowed'), false);
  }
};

// Create multer upload instance for Excel/CSV
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: storageConfig.maxFileSize, // 10MB default
  },
});

// Create multer upload instance for images
const imageUpload = multer({
  storage: storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB for images
  },
});

// Error handling middleware for multer
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new BadRequestError(`File too large. Maximum size is ${storageConfig.maxFileSize / 1024 / 1024}MB`));
    }
    return next(new BadRequestError(`Upload error: ${err.message}`));
  }
  next(err);
};

module.exports = {
  upload,
  imageUpload,
  handleUploadError,
};

