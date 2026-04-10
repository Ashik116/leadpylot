/**
 * Leads Routes Middleware
 * Multer configuration for Excel/CSV file uploads
 */

const multer = require('multer');
const path = require('path');
const storageConfig = require('../../config/storageConfig');

// Configure multer for Excel file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Use centralized storage configuration for temp uploads
    const tempUploadsDir = storageConfig.getFilePath('', 'temp');
    // storageConfig automatically ensures the directory exists
    cb(null, tempUploadsDir);
  },
  filename: function (req, file, cb) {
    // Generate a unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

// File filter to accept Excel and CSV files
const fileFilter = (req, file, cb) => {
  const allowedFileTypes = ['.xlsx', '.xls', '.csv'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedFileTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only Excel (.xlsx, .xls) and CSV (.csv) files are allowed'));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB file size limit
});

module.exports = {
  upload,
};

