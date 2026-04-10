/**
 * Storage Configuration
 * File storage setup and utilities
 */

const path = require('path');
const fs = require('fs-extra');
const logger = require('../utils/logger');

class StorageConfig {
  constructor() {
    // Base upload path
    this.uploadPath = process.env.UPLOAD_PATH || path.join(__dirname, '../../uploads');
    
    // Subdirectories
    this.importsPath = path.join(this.uploadPath, 'imports');
    this.exportsPath = path.join(this.uploadPath, 'exports');
    this.errorsPath = path.join(this.uploadPath, 'errors');

    // Logical directory map for external consumers
    // Add any new storage buckets here and they will be auto-created
    this.directories = {
      documents: path.join(this.uploadPath, 'documents'),
      signatures: path.join(this.uploadPath, 'signatures'),
      imports: this.importsPath,
      exports: this.exportsPath,
      errors: this.errorsPath,
    };
    
    // File size limits
    this.maxFileSize = parseInt(process.env.MAX_FILE_SIZE || '10485760'); // 10MB
    
    // Initialize directories
    this.initializeDirectories();
  }
  
  /**
   * Initialize storage directories
   */
  initializeDirectories() {
    const directories = [
      this.uploadPath,
      ...Object.values(this.directories),
    ];

    directories.forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        logger.info(`Created directory: ${dir}`);
      }
    });
  }
  
  /**
   * Get full path for import file
   */
  getImportPath(filename) {
    return path.join(this.importsPath, filename);
  }
  
  /**
   * Get full path for export file
   */
  getExportPath(filename) {
    return path.join(this.exportsPath, filename);
  }
  
  /**
   * Get full path for error file
   */
  getErrorPath(filename) {
    return path.join(this.errorsPath, filename);
  }
  
  /**
   * Get full file path within a logical storage type
   * @param {string} filename
   * @param {string} type one of keys in this.directories
   */
  getFilePath(filename, type = 'documents') {
    const baseDir = this.getPath(type);
    return path.join(baseDir, filename);
  }

  /**
   * Delete file
   */
  async deleteFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        await fs.unlink(filePath);
        logger.info(`Deleted file: ${filePath}`);
        return true;
      }
      return false;
    } catch (error) {
      logger.error(`Error deleting file: ${filePath}`, error);
      return false;
    }
  }
  
  /**
   * Check if file exists
   */
  fileExists(filePath) {
    return fs.existsSync(filePath);
  }
  
  /**
   * Get file size
   */
  async getFileSize(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return stats.size;
    } catch (error) {
      logger.error(`Error getting file size: ${filePath}`, error);
      return 0;
    }
  }
  
  /**
   * Move file
   */
  async moveFile(sourcePath, destPath) {
    try {
      await fs.move(sourcePath, destPath, { overwrite: true });
      logger.info(`Moved file from ${sourcePath} to ${destPath}`);
      return true;
    } catch (error) {
      logger.error(`Error moving file`, error);
      return false;
    }
  }
  
  /**
   * Copy file
   */
  async copyFile(sourcePath, destPath) {
    try {
      await fs.copy(sourcePath, destPath);
      logger.info(`Copied file from ${sourcePath} to ${destPath}`);
      return true;
    } catch (error) {
      logger.error(`Error copying file`, error);
      return false;
    }
  }

    /**
   * Get absolute path for a storage type
   * @param {string} type - Storage type (documents, imports, etc.)
   * @returns {string} - Absolute path
   */
    getPath(type = 'documents') {
      const dir = this.directories && this.directories[type];
      if (!dir) {
        throw new Error(`Unknown storage type: ${type}. Available types: ${Object.keys(this.directories).join(', ')}`);
      }
      return dir;
    }

    
}

// Export singleton instance
module.exports = new StorageConfig();

