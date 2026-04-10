const fs = require('fs').promises;
const path = require('path');
const storageConfig = require('../config/storageConfig');
const AWSS3Service = require('./awsS3Service');

/**
 * Hybrid Storage Service
 * Manages both local and cloud storage with intelligent routing
 */
class HybridStorageService {
  constructor() {
    this.localStorage = storageConfig;
    
    // Initialize S3 service if cloud storage is enabled
    this.cloudStorage = null;
    if (process.env.CLOUD_STORAGE_ENABLED === 'true') {
      try {
        this.cloudStorage = new AWSS3Service();
      } catch (error) {
        console.warn('Cloud storage initialization failed:', error.message);
        console.warn('Falling back to local storage only');
      }
    }

    // Configuration
    this.config = {
      cloudEnabled: this.cloudStorage && this.cloudStorage.enabled,
      fallbackToLocal: process.env.STORAGE_FALLBACK_TO_LOCAL !== 'false',
      dualMode: process.env.DUAL_STORAGE_MODE === 'true',
      preferredStorage: process.env.PREFERRED_STORAGE || 'cloud', // 'cloud' or 'local'
    };

    console.log('Hybrid Storage Service initialized:', this.config);
  }

  /**
   * Upload file with intelligent routing
   * @param {Buffer|string} fileContent - File content or path
   * @param {string} filename - Target filename
   * @param {string} type - Storage type
   * @param {Object} metadata - Additional metadata
   * @returns {Object} - Upload result with storage info
   */
  async uploadFile(fileContent, filename, type = 'documents', metadata = {}) {
    const result = {
      filename,
      type,
      success: false,
      storage: {
        local: false,
        cloud: false
      },
      errors: []
    };

    // Dual storage mode - write to both
    if (this.config.dualMode) {
      return await this.uploadToBoth(fileContent, filename, type, metadata);
    }

    // Single storage mode - prefer cloud, fallback to local
    if (this.config.cloudEnabled && this.config.preferredStorage === 'cloud') {
      try {
        const cloudResult = await this.cloudStorage.uploadFile(fileContent, filename, type, metadata);
        result.success = true;
        result.storage.cloud = true;
        result.cloudResult = cloudResult;
        result.url = cloudResult.url;
        result.webPath = `/storage/cloud/${filename}`;
        
        // Enhanced logging for cloud uploads
        const logger = require('../utils/logger');
        logger.info('📤 File uploaded to AWS CLOUD storage', {
          filename,
          type,
          size: Buffer.isBuffer(fileContent) ? fileContent.length : 'unknown',
          url: cloudResult.url,
          bucket: this.cloudStorage.bucketName,
          region: process.env.AWS_REGION,
          storage: 'CLOUD'
        });
        return result;
      } catch (error) {
        const logger = require('../utils/logger');
        logger.error('❌ Cloud upload FAILED', {
          filename,
          type,
          error: error.message,
          bucket: this.cloudStorage?.bucketName,
          region: process.env.AWS_REGION,
          storage: 'CLOUD'
        });
        result.errors.push(`Cloud: ${error.message}`);
        
        // Fallback to local if enabled
        if (this.config.fallbackToLocal) {
          return await this.uploadToLocal(fileContent, filename, type, result);
        }
      }
    } else {
      // Local storage preferred or cloud not available
      return await this.uploadToLocal(fileContent, filename, type, result);
    }

    result.success = false;
    return result;
  }

  /**
   * Upload to both local and cloud storage
   * @private
   */
  async uploadToBoth(fileContent, filename, type, metadata) {
    const result = {
      filename,
      type,
      success: false,
      storage: { local: false, cloud: false },
      errors: []
    };

    // Upload to local storage
    try {
      await this.uploadToLocalOnly(fileContent, filename, type);
      result.storage.local = true;
      // Build web path manually to avoid circular dependency
      const subPath = type === 'documents' ? '' : `/${type}`;
      result.webPath = `/storage${subPath}/${filename}`;
    } catch (error) {
      result.errors.push(`Local: ${error.message}`);
    }

    // Upload to cloud storage
    if (this.config.cloudEnabled) {
      try {
        const cloudResult = await this.cloudStorage.uploadFile(fileContent, filename, type, metadata);
        result.storage.cloud = true;
        result.cloudResult = cloudResult;
        result.url = cloudResult.url;
      } catch (error) {
        result.errors.push(`Cloud: ${error.message}`);
      }
    }

    result.success = result.storage.local || result.storage.cloud;
    
    // Use cloud URL if available, otherwise local web path
    if (result.storage.cloud) {
      result.webPath = `/storage/cloud/${filename}`;
    }

    // Enhanced logging for dual storage uploads
    const logger = require('../utils/logger');
    logger.info('🔄 Dual storage upload completed', {
      filename,
      type,
      localSuccess: result.storage.local,
      cloudSuccess: result.storage.cloud,
      overallSuccess: result.success,
      errors: result.errors,
      storage: 'DUAL'
    });
    return result;
  }

  /**
   * Upload to local storage with result tracking
   * @private
   */
  async uploadToLocal(fileContent, filename, type, result) {
    try {
      await this.uploadToLocalOnly(fileContent, filename, type);
      result.success = true;
      result.storage.local = true;
      
      // Build web path manually to avoid circular dependency
      const subPath = type === 'documents' ? '' : `/${type}`;
      result.webPath = `/storage${subPath}/${filename}`;
      
      // Enhanced logging for local uploads
      const logger = require('../utils/logger');
      logger.info('💾 File uploaded to LOCAL storage', {
        filename,
        type,
        size: Buffer.isBuffer(fileContent) ? fileContent.length : 'unknown',
        path: result.webPath,
        storage: 'LOCAL'
      });
      return result;
    } catch (error) {
      const logger = require('../utils/logger');
      logger.error('❌ Local upload FAILED', {
        filename,
        type,
        error: error.message,
        storage: 'LOCAL'
      });
      result.errors.push(`Local: ${error.message}`);
      result.success = false;
      return result;
    }
  }

  /**
   * Upload to local storage only
   * @private
   */
  async uploadToLocalOnly(fileContent, filename, type) {
    let buffer;

    if (typeof fileContent === 'string') {
      buffer = await fs.readFile(fileContent);
    } else {
      buffer = fileContent;
    }

    // Build path manually to avoid circular dependency  
    const path = require('path');
    const baseStorageDir = path.join(process.cwd(), 'storage');
    const directories = {
      documents: baseStorageDir,
      imports: path.join(baseStorageDir, 'imports'),
      offerImports: path.join(baseStorageDir, 'offer_imports'),
      uploads: path.join(baseStorageDir, 'uploads'),
      signatures: path.join(baseStorageDir, 'signatures'),
      fonts: path.join(baseStorageDir, 'fonts'),
    };
    
    const localDir = directories[type] || directories.documents;
    const filePath = path.join(localDir, filename);
    await fs.writeFile(filePath, buffer);
  }

  /**
   * Download file with intelligent routing
   * @param {string} filename - Filename to download
   * @param {string} type - Storage type
   * @returns {Buffer|null} - File content or null if not found
   */
  async downloadFile(filename, type = 'documents') {
    // Try cloud storage first if preferred
    if (this.config.cloudEnabled && this.config.preferredStorage === 'cloud') {
      try {
        const buffer = await this.cloudStorage.downloadFile(filename, type);
        if (buffer) {
          // Enhanced logging for cloud downloads
          const logger = require('../utils/logger');
          logger.info('📥 File downloaded from AWS CLOUD storage', {
            filename,
            type,
            size: buffer.length,
            bucket: this.cloudStorage.bucketName,
            region: process.env.AWS_REGION,
            storage: 'CLOUD'
          });
          return buffer;
        }
      } catch (error) {
        const logger = require('../utils/logger');
        logger.error('❌ Cloud download FAILED', {
          filename,
          type,
          error: error.message,
          bucket: this.cloudStorage?.bucketName,
          region: process.env.AWS_REGION,
          storage: 'CLOUD'
        });
      }
    }

    // Try local storage
    try {
      // Build path manually to avoid circular dependency
      const path = require('path');
      const baseStorageDir = path.join(process.cwd(), 'storage');
      const directories = {
        documents: baseStorageDir,
        imports: path.join(baseStorageDir, 'imports'),
        offerImports: path.join(baseStorageDir, 'offer_imports'),
        uploads: path.join(baseStorageDir, 'uploads'),
        signatures: path.join(baseStorageDir, 'signatures'),
        fonts: path.join(baseStorageDir, 'fonts'),
      };
      
      const localDir = directories[type] || directories.documents;
      const filePath = path.join(localDir, filename);
      const buffer = await fs.readFile(filePath);
      
      // Enhanced logging for local downloads
      const logger = require('../utils/logger');
      logger.info('📥 File downloaded from LOCAL storage', {
        filename,
        type,
        size: buffer.length,
        path: filePath,
        storage: 'LOCAL'
      });
      return buffer;
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('Local download failed:', error.message);
      }
    }

    // Try cloud storage as fallback if not already tried
    if (this.config.cloudEnabled && this.config.preferredStorage !== 'cloud') {
      try {
        const buffer = await this.cloudStorage.downloadFile(filename, type);
        if (buffer) {
          // Enhanced logging for cloud fallback downloads
          const logger = require('../utils/logger');
          logger.info('📥 File downloaded from AWS CLOUD storage (FALLBACK)', {
            filename,
            type,
            size: buffer.length,
            bucket: this.cloudStorage.bucketName,
            region: process.env.AWS_REGION,
            storage: 'CLOUD_FALLBACK'
          });
          return buffer;
        }
      } catch (error) {
        const logger = require('../utils/logger');
        logger.error('❌ Cloud download fallback FAILED', {
          filename,
          type,
          error: error.message,
          bucket: this.cloudStorage?.bucketName,
          region: process.env.AWS_REGION,
          storage: 'CLOUD_FALLBACK'
        });
      }
    }

    // Enhanced logging for file not found
    const logger = require('../utils/logger');
    logger.warn('⚠️ File NOT FOUND in any storage', {
      filename,
      type,
      cloudEnabled: this.config.cloudEnabled,
      preferredStorage: this.config.preferredStorage,
      fallbackToLocal: this.config.fallbackToLocal,
      storage: 'NONE'
    });
    
    return null; // File not found in any storage
  }

  /**
   * Check if file exists in any storage
   * @param {string} filename - Filename to check
   * @param {string} type - Storage type
   * @returns {Object} - Existence info for both storages
   */
  async fileExists(filename, type = 'documents') {
    const result = {
      local: false,
      cloud: false,
      exists: false
    };

    // Check local storage
    try {
      const path = require('path');
      const fs = require('fs');
      
      // Build path manually to avoid circular dependency
      const baseStorageDir = path.join(process.cwd(), 'storage');
      const directories = {
        documents: baseStorageDir,
        imports: path.join(baseStorageDir, 'imports'),
        offerImports: path.join(baseStorageDir, 'offer_imports'),
        uploads: path.join(baseStorageDir, 'uploads'),
        signatures: path.join(baseStorageDir, 'signatures'),
        fonts: path.join(baseStorageDir, 'fonts'),
      };
      
      const localDir = directories[type] || directories.documents;
      const filePath = path.join(localDir, filename);
      result.local = fs.existsSync(filePath);
    } catch (error) {
      console.error('Error checking local file existence:', error.message);
      result.local = false;
    }

    // Check cloud storage
    if (this.config.cloudEnabled) {
      try {
        result.cloud = await this.cloudStorage.fileExists(filename, type);
      } catch (error) {
        console.error('Error checking cloud file existence:', error.message);
      }
    }

    result.exists = result.local || result.cloud;
    return result;
  }

  /**
   * Delete file from storage
   * @param {string} filename - Filename to delete
   * @param {string} type - Storage type
   * @returns {Object} - Deletion result
   */
  async deleteFile(filename, type = 'documents') {
    const result = {
      filename,
      storage: { local: false, cloud: false },
      success: false
    };

    // Delete from local storage
    try {
      result.storage.local = this.localStorage.deleteFile(filename, type);
    } catch (error) {
      console.error('Local delete failed:', error.message);
    }

    // Delete from cloud storage
    if (this.config.cloudEnabled) {
      try {
        result.storage.cloud = await this.cloudStorage.deleteFile(filename, type);
      } catch (error) {
        console.error('Cloud delete failed:', error.message);
      }
    }

    result.success = result.storage.local || result.storage.cloud;
    return result;
  }

  /**
   * Get web path for file access
   * @param {string} filename - Filename
   * @param {string} type - Storage type
   * @returns {string} - Web path
   */
  getWebPath(filename, type = 'documents') {
    // If cloud storage is enabled and preferred, return cloud path
    if (this.config.cloudEnabled && this.config.preferredStorage === 'cloud') {
      return `/storage/cloud/${filename}`;
    }
    
    // Otherwise return local path - build manually to avoid circular dependency
    const subPath = type === 'documents' ? '' : `/${type}`;
    return `/storage${subPath}/${filename}`;
  }

  /**
   * Get signed URL for cloud storage
   * @param {string} filename - Filename
   * @param {string} type - Storage type
   * @param {number} expiresIn - Expiration time in seconds
   * @returns {string|null} - Signed URL or null if not available
   */
  async getSignedUrl(filename, type = 'documents', expiresIn = 3600) {
    if (!this.config.cloudEnabled) {
      return null;
    }

    try {
      return await this.cloudStorage.getSignedUrl(filename, type, expiresIn);
    } catch (error) {
      console.error('Error generating signed URL:', error.message);
      return null;
    }
  }

  /**
   * Get combined storage statistics
   * @returns {Object} - Combined statistics
   */
  async getStorageStats() {
    const stats = {
      config: this.config,
      local: this.localStorage.getStorageStats(),
      cloud: null
    };

    if (this.config.cloudEnabled) {
      try {
        stats.cloud = await this.cloudStorage.getStorageStats();
      } catch (error) {
        stats.cloud = { error: error.message };
      }
    }

    return stats;
  }

  /**
   * Test storage connections
   * @returns {Object} - Connection test results
   */
  async testConnections() {
    const results = {
      local: { success: true, message: 'Local storage available' },
      cloud: null
    };

    if (this.config.cloudEnabled) {
      try {
        results.cloud = await this.cloudStorage.testConnection();
      } catch (error) {
        results.cloud = {
          success: false,
          message: `Cloud connection failed: ${error.message}`
        };
      }
    } else {
      results.cloud = { success: false, message: 'Cloud storage not enabled' };
    }

    return results;
  }

  /**
   * List files from both storages
   * @param {string} type - Storage type
   * @returns {Object} - Files from both storages
   */
  async listFiles(type = 'documents') {
    const result = {
      local: [],
      cloud: [],
      combined: []
    };

    // List local files
    try {
      const localDir = this.localStorage.getPath(type);
      const localFiles = await fs.readdir(localDir);
      
      for (const filename of localFiles) {
        const filePath = path.join(localDir, filename);
        const stats = await fs.stat(filePath);
        
        if (stats.isFile()) {
          result.local.push({
            filename,
            size: stats.size,
            lastModified: stats.mtime,
            storage: 'local'
          });
        }
      }
    } catch (error) {
      console.error('Error listing local files:', error.message);
    }

    // List cloud files
    if (this.config.cloudEnabled) {
      try {
        const cloudFiles = await this.cloudStorage.listFiles(type);
        result.cloud = cloudFiles.map(file => ({
          ...file,
          storage: 'cloud'
        }));
      } catch (error) {
        console.error('Error listing cloud files:', error.message);
      }
    }

    // Combine and deduplicate
    const fileMap = new Map();
    
    [...result.local, ...result.cloud].forEach(file => {
      const existing = fileMap.get(file.filename);
      if (!existing) {
        fileMap.set(file.filename, file);
      } else {
        // Merge storage info for files existing in both places
        if (existing.storage !== file.storage) {
          existing.storage = 'both';
          existing.locations = [existing.storage === 'both' ? existing.locations : [existing.storage], file.storage].flat();
        }
      }
    });

    result.combined = Array.from(fileMap.values());
    return result;
  }
}

module.exports = HybridStorageService; 