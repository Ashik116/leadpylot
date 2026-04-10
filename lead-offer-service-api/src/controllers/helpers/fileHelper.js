const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

/**
 * Check if file exists (async)
 * @param {String} filePath - Path to file
 * @returns {Promise<Boolean>} - True if file exists
 */
const fileExists = async (filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

/**
 * Read file as buffer (async)
 * @param {String} filePath - Path to file
 * @returns {Promise<Buffer>} - File contents as buffer
 */
const readFileBuffer = async (filePath) => {
  return await fs.readFile(filePath);
};

/**
 * Send PDF file as response
 * @param {Object} res - Express response object
 * @param {String} pdfPath - Path to PDF file
 * @param {String} filename - Filename for download
 * @returns {Promise<void>}
 */
const sendPdfResponse = async (res, pdfPath, filename) => {
  const exists = await fileExists(pdfPath);
  
  if (!exists) {
    throw new Error('PDF file not found');
  }

  const pdfBuffer = await readFileBuffer(pdfPath);
  
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(pdfBuffer);
};

/**
 * Get file stats (async)
 * @param {String} filePath - Path to file
 * @returns {Promise<Object>} - File stats
 */
const getFileStats = async (filePath) => {
  try {
    return await fs.stat(filePath);
  } catch (error) {
    return null;
  }
};

/**
 * Check if path is a directory (async)
 * @param {String} dirPath - Path to check
 * @returns {Promise<Boolean>} - True if directory exists
 */
const isDirectory = async (dirPath) => {
  try {
    const stats = await fs.stat(dirPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
};

/**
 * Ensure directory exists (create if not) (async)
 * @param {String} dirPath - Path to directory
 * @returns {Promise<void>}
 */
const ensureDirectory = async (dirPath) => {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    // Directory might already exist
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
};

/**
 * Delete file (async)
 * @param {String} filePath - Path to file
 * @returns {Promise<void>}
 */
const deleteFile = async (filePath) => {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    // Ignore if file doesn't exist
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
};

/**
 * Move/rename file (async)
 * @param {String} oldPath - Current file path
 * @param {String} newPath - New file path
 * @returns {Promise<void>}
 */
const moveFile = async (oldPath, newPath) => {
  await fs.rename(oldPath, newPath);
};

/**
 * Copy file (async)
 * @param {String} sourcePath - Source file path
 * @param {String} destPath - Destination file path
 * @returns {Promise<void>}
 */
const copyFile = async (sourcePath, destPath) => {
  await fs.copyFile(sourcePath, destPath);
};

/**
 * Read directory contents (async)
 * @param {String} dirPath - Path to directory
 * @returns {Promise<Array>} - Array of file/directory names
 */
const readDirectory = async (dirPath) => {
  try {
    return await fs.readdir(dirPath);
  } catch {
    return [];
  }
};

module.exports = {
  fileExists,
  readFileBuffer,
  sendPdfResponse,
  getFileStats,
  isDirectory,
  ensureDirectory,
  deleteFile,
  moveFile,
  copyFile,
  readDirectory,
};

