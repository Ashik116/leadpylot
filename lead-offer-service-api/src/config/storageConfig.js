const path = require('path');
const fs = require('fs');

/**
 * Centralized Storage Configuration
 * Provides consistent file storage paths across all services
 * Now supports both local and cloud storage via HybridStorageService
 */
class StorageConfig {
  constructor() {
    // Base storage directory - always absolute path
    this.baseStorageDir = path.join(process.cwd(), 'storage');

    // Subdirectories for different file types
    this.directories = {
      documents: path.join(this.baseStorageDir),
      imports: path.join(this.baseStorageDir, 'imports'),
      offerImports: path.join(this.baseStorageDir, 'offer_imports'),
      uploads: path.join(this.baseStorageDir, 'uploads'),
      signatures: path.join(this.baseStorageDir, 'signatures'),
      fonts: path.join(this.baseStorageDir, 'fonts'),
      temp: path.join(process.cwd(), 'temp-uploads'),
      logs: path.join(process.cwd(), 'logs'),
      pdfGenerated: path.join(process.cwd(), 'pdf', 'generated')
    };

    // Initialize hybrid storage if cloud storage is enabled
    this.hybridStorage = null;
    this.cloudEnabled = process.env.CLOUD_STORAGE_ENABLED === 'true';

    if (this.cloudEnabled) {
      try {
        const HybridStorageService = require('../services/hybridStorageService');
        this.hybridStorage = new HybridStorageService();
      } catch (error) {
        console.warn('Failed to initialize hybrid storage:', error.message);
        console.warn('Falling back to local storage only');
        this.cloudEnabled = false;
      }
    }

    // Ensure all directories exist
    this.ensureDirectoriesExist();
  }

  /**
   * Ensure all storage directories exist
   */
  ensureDirectoriesExist() {
    Object.values(this.directories).forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Created storage directory: ${dir}`);
      }
    });
  }

  /**
   * Get absolute path for a storage type
   * @param {string} type - Storage type (documents, imports, etc.)
   * @returns {string} - Absolute path
   */
  getPath(type = 'documents') {
    const dir = this.directories[type];
    if (!dir) {
      throw new Error(`Unknown storage type: ${type}. Available types: ${Object.keys(this.directories).join(', ')}`);
    }
    return dir;
  }

  /**
   * Get relative path for web access
   * @param {string} filename - Filename
   * @param {string} type - Storage type
   * @returns {string} - Relative path for web access
   */
  getWebPath(filename, type = 'documents') {
    // Use hybrid storage if available
    if (this.hybridStorage) {
      return this.hybridStorage.getWebPath(filename, type);
    }

    // Fallback to local path
    const subPath = type === 'documents' ? '' : `/${type}`;
    return `/storage${subPath}/${filename}`;
  }

  /**
   * Get full file path
   * @param {string} filename - Filename
   * @param {string} type - Storage type
   * @returns {string} - Full file path
   */
  getFilePath(filename, type = 'documents') {
    return path.join(this.getPath(type), filename);
  }

  /**
   * Check if file exists in storage
   * @param {string} filename - Filename
   * @param {string} type - Storage type
   * @returns {boolean} - True if file exists
   */
  fileExists(filename, type = 'documents') {
    return fs.existsSync(this.getFilePath(filename, type));
  }

  /**
   * Delete file from storage
   * @param {string} filename - Filename
   * @param {string} type - Storage type
   * @returns {boolean} - True if file was deleted
   */
  deleteFile(filename, type = 'documents') {
    try {
      const filePath = this.getFilePath(filename, type);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Error deleting file ${filename}:`, error);
      return false;
    }
  }

  /**
   * Get storage statistics
   * @returns {Object} - Storage statistics
   */
  getStorageStats() {
    const stats = {};

    Object.entries(this.directories).forEach(([type, dir]) => {
      try {
        if (fs.existsSync(dir)) {
          const files = fs.readdirSync(dir);
          let totalSize = 0;

          files.forEach(file => {
            try {
              const filePath = path.join(dir, file);
              const stat = fs.statSync(filePath);
              if (stat.isFile()) {
                totalSize += stat.size;
              }
            } catch (err) {
              // Skip files that can't be accessed
            }
          });

          stats[type] = {
            path: dir,
            fileCount: files.length,
            totalSize: totalSize,
            totalSizeMB: Math.round(totalSize / (1024 * 1024) * 100) / 100
          };
        } else {
          stats[type] = {
            path: dir,
            fileCount: 0,
            totalSize: 0,
            totalSizeMB: 0
          };
        }
      } catch (error) {
        stats[type] = {
          path: dir,
          error: error.message
        };
      }
    });

    return stats;
  }

  /**
   * Upload file using hybrid storage (local + cloud)
   * @param {Buffer|string} fileContent - File content or path
   * @param {string} filename - Target filename
   * @param {string} type - Storage type
   * @param {Object} metadata - Additional metadata
   * @returns {Object} - Upload result
   */
  async uploadFile(fileContent, filename, type = 'documents', metadata = {}) {
    if (this.hybridStorage) {
      return await this.hybridStorage.uploadFile(fileContent, filename, type, metadata);
    }

    // Fallback to local-only upload
    let buffer;
    if (typeof fileContent === 'string') {
      buffer = require('fs').readFileSync(fileContent);
    } else {
      buffer = fileContent;
    }

    const filePath = this.getFilePath(filename, type);
    require('fs').writeFileSync(filePath, buffer);

    return {
      success: true,
      storage: { local: true, cloud: false },
      webPath: this.getWebPath(filename, type)
    };
  }

  /**
   * Download file using hybrid storage
   * @param {string} filename - Filename to download
   * @param {string} type - Storage type
   * @returns {Buffer|null} - File content or null if not found
   */
  async downloadFile(filename, type = 'documents') {
    if (this.hybridStorage) {
      return await this.hybridStorage.downloadFile(filename, type);
    }

    // Fallback to local download
    try {
      const filePath = this.getFilePath(filename, type);
      return require('fs').readFileSync(filePath);
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if file exists using hybrid storage
   * @param {string} filename - Filename to check
   * @param {string} type - Storage type
   * @returns {boolean|Object} - True/false for local-only, object for hybrid
   */
  async fileExistsAsync(filename, type = 'documents') {
    if (this.hybridStorage) {
      return await this.hybridStorage.fileExists(filename, type);
    }

    // Fallback to local check
    return this.fileExists(filename, type);
  }

  /**
   * Delete file using hybrid storage
   * @param {string} filename - Filename to delete
   * @param {string} type - Storage type
   * @returns {boolean|Object} - True/false for local-only, object for hybrid
   */
  async deleteFileAsync(filename, type = 'documents') {
    if (this.hybridStorage) {
      return await this.hybridStorage.deleteFile(filename, type);
    }

    // Fallback to local delete
    return this.deleteFile(filename, type);
  }

  /**
   * Get signed URL for cloud storage access
   * @param {string} filename - Filename
   * @param {string} type - Storage type
   * @param {number} expiresIn - Expiration time in seconds
   * @returns {string|null} - Signed URL or null if not available
   */
  async getSignedUrl(filename, type = 'documents', expiresIn = 3600) {
    if (this.hybridStorage) {
      return await this.hybridStorage.getSignedUrl(filename, type, expiresIn);
    }

    return null; // Not available for local-only storage
  }

  /**
   * Test storage connections
   * @returns {Object} - Connection test results
   */
  async testConnections() {
    if (this.hybridStorage) {
      return await this.hybridStorage.testConnections();
    }

    return {
      local: { success: true, message: 'Local storage available' },
      cloud: { success: false, message: 'Cloud storage not enabled' }
    };
  }

  /**
   * Get comprehensive storage statistics
   * @returns {Object} - Combined statistics
   */
  async getStorageStatsAsync() {
    if (this.hybridStorage) {
      return await this.hybridStorage.getStorageStats();
    }

    return {
      config: { cloudEnabled: false },
      local: this.getStorageStats(),
      cloud: null
    };
  }

  /**
   * List files from storage
   * @param {string} type - Storage type
   * @returns {Object} - Files from storage
   */
  async listFiles(type = 'documents') {
    if (this.hybridStorage) {
      return await this.hybridStorage.listFiles(type);
    }

    // Fallback to local listing
    const result = { local: [], cloud: [], combined: [] };

    try {
      const dir = this.getPath(type);
      const files = require('fs').readdirSync(dir);

      for (const filename of files) {
        const filePath = require('path').join(dir, filename);
        const stats = require('fs').statSync(filePath);

        if (stats.isFile()) {
          const fileInfo = {
            filename,
            size: stats.size,
            lastModified: stats.mtime,
            storage: 'local'
          };
          result.local.push(fileInfo);
          result.combined.push(fileInfo);
        }
      }
    } catch (error) {
      console.error('Error listing local files:', error.message);
    }

    return result;
  }

  /**
   * Check if cloud storage is enabled and available
   * @returns {boolean} - True if cloud storage is enabled
   */
  isCloudEnabled() {
    return this.cloudEnabled && this.hybridStorage;
  }

  /**
   * Get storage configuration info
   * @returns {Object} - Configuration information
   */
  getStorageInfo() {
    return {
      cloudEnabled: this.cloudEnabled,
      hybridStorageAvailable: !!this.hybridStorage,
      localDirectories: Object.keys(this.directories),
      baseStorageDir: this.baseStorageDir
    };
  }
}

// Export singleton instance
module.exports = new StorageConfig();
