const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

/**
 * AWS S3 Service for Lightsail Object Storage
 * Handles all S3/Lightsail Object Storage operations
 */
class AWSS3Service {
  constructor() {
    // Validate required environment variables
    this.validateConfig();
    
    // Initialize S3 client with Lightsail-compatible configuration
    const clientConfig = {
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
      // Disable default integrity checksums that break S3-compatible services
      checksumAlgorithm: undefined,
      useAccelerateEndpoint: false,
    };

    // Only add endpoint if specifically configured (for Lightsail)
    if (process.env.AWS_S3_ENDPOINT) {
      // Skip setting endpoint for standard AWS S3 regional endpoints to avoid signature issues
      const isStandardAwsEndpoint = process.env.AWS_S3_ENDPOINT.includes('s3.') && 
                                   process.env.AWS_S3_ENDPOINT.includes('.amazonaws.com');
      
      if (!isStandardAwsEndpoint) {
        clientConfig.endpoint = process.env.AWS_S3_ENDPOINT;
        clientConfig.forcePathStyle = true;
      }
    }

    this.s3Client = new S3Client(clientConfig);

    this.bucketName = process.env.AWS_S3_BUCKET;
    this.enabled = process.env.CLOUD_STORAGE_ENABLED === 'true';
    
    console.log('AWS S3 Service initialized:', {
      enabled: this.enabled,
      bucket: this.bucketName,
      region: process.env.AWS_REGION,
      endpoint: process.env.AWS_S3_ENDPOINT || 'default'
    });
  }

  /**
   * Validate required configuration
   */
  validateConfig() {
    const requiredVars = [
      'AWS_ACCESS_KEY_ID',
      'AWS_SECRET_ACCESS_KEY',
      'AWS_REGION',
      'AWS_S3_BUCKET'
    ];

    const missing = requiredVars.filter(varName => !process.env[varName]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required AWS environment variables: ${missing.join(', ')}`);
    }
  }

  /**
   * Generate S3 key (path) for file
   * @param {string} filename - Original filename
   * @param {string} type - Storage type (documents, imports, etc.)
   * @returns {string} - S3 key
   */
  getS3Key(filename, type = 'documents') {
    // Create directory structure in S3 similar to local storage
    const prefix = type === 'documents' ? '' : `${type}/`;
    return `${prefix}${filename}`;
  }

  /**
   * Upload file to S3
   * @param {Buffer|string} fileContent - File content (Buffer) or file path (string)
   * @param {string} filename - Target filename
   * @param {string} type - Storage type
   * @param {Object} metadata - Additional metadata
   * @returns {Object} - Upload result
   */
  async uploadFile(fileContent, filename, type = 'documents', metadata = {}) {
    if (!this.enabled) {
      throw new Error('Cloud storage is not enabled');
    }

    try {
      let buffer;
      let contentType = 'application/octet-stream';

      // Handle file path input
      if (typeof fileContent === 'string') {
        buffer = await fs.readFile(fileContent);
        contentType = this.getContentType(fileContent);
      } else {
        buffer = fileContent;
        contentType = this.getContentType(filename);
      }

      const s3Key = this.getS3Key(filename, type);
      
      const uploadParams = {
        Bucket: this.bucketName,
        Key: s3Key,
        Body: buffer,
        // Explicitly disable checksum algorithms to fix signature mismatch
        ChecksumAlgorithm: undefined,
        // Remove ContentType and Metadata completely to avoid header issues
        // ContentType: contentType,
        // Metadata: {
        //   'original-name': filename,
        //   'storage-type': type,
        //   'uploaded-at': new Date().toISOString().replace(/[^0-9]/g, ''),
        // }
      };

      // Only add server-side encryption for standard AWS S3
      if (process.env.AWS_S3_SERVER_SIDE_ENCRYPTION && !process.env.AWS_S3_ENDPOINT) {
        uploadParams.ServerSideEncryption = process.env.AWS_S3_SERVER_SIDE_ENCRYPTION;
      }

      // Skip ACL for Lightsail (often not supported)
      if (process.env.AWS_S3_ACL && !process.env.AWS_S3_ENDPOINT) {
        uploadParams.ACL = process.env.AWS_S3_ACL;
      }

      const command = new PutObjectCommand(uploadParams);
      const result = await this.s3Client.send(command);

      console.log(`File uploaded to S3: ${s3Key}`);

      return {
        success: true,
        s3Key,
        etag: result.ETag,
        url: this.getPublicUrl(s3Key),
        size: buffer.length
      };
    } catch (error) {
      console.error('Error uploading file to S3:', error);
      throw new Error(`S3 upload failed: ${error.message}`);
    }
  }

  /**
   * Download file from S3
   * @param {string} filename - Filename to download
   * @param {string} type - Storage type
   * @returns {Buffer} - File content
   */
  async downloadFile(filename, type = 'documents') {
    if (!this.enabled) {
      throw new Error('Cloud storage is not enabled');
    }

    try {
      const s3Key = this.getS3Key(filename, type);
      
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key
      });

      const result = await this.s3Client.send(command);
      
      // Convert stream to buffer
      const chunks = [];
      for await (const chunk of result.Body) {
        chunks.push(chunk);
      }
      
      return Buffer.concat(chunks);
    } catch (error) {
      if (error.name === 'NoSuchKey') {
        return null; // File not found
      }
      console.error('Error downloading file from S3:', error);
      throw new Error(`S3 download failed: ${error.message}`);
    }
  }

  /**
   * Check if file exists in S3
   * @param {string} filename - Filename to check
   * @param {string} type - Storage type
   * @returns {boolean} - True if file exists
   */
  async fileExists(filename, type = 'documents') {
    if (!this.enabled) {
      return false;
    }

    try {
      const s3Key = this.getS3Key(filename, type);
      
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key
      });

      await this.s3Client.send(command);
      return true;
    } catch (error) {
      if (error.name === 'NotFound' || error.name === 'NoSuchKey') {
        return false;
      }
      console.error('Error checking file existence in S3:', error);
      return false;
    }
  }

  /**
   * Delete file from S3
   * @param {string} filename - Filename to delete
   * @param {string} type - Storage type
   * @returns {boolean} - True if file was deleted
   */
  async deleteFile(filename, type = 'documents') {
    if (!this.enabled) {
      return false;
    }

    try {
      const s3Key = this.getS3Key(filename, type);
      
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key
      });

      await this.s3Client.send(command);
      console.log(`File deleted from S3: ${s3Key}`);
      return true;
    } catch (error) {
      console.error('Error deleting file from S3:', error);
      return false;
    }
  }

  /**
   * List files in S3 by type
   * @param {string} type - Storage type
   * @param {number} maxKeys - Maximum number of keys to return (uses pagination for unlimited)
   * @returns {Array} - List of files
   */
  async listFiles(type = 'documents', maxKeys = 1000) {
    if (!this.enabled) {
      return [];
    }

    try {
      const prefix = type === 'documents' ? '' : `${type}/`;
      let allFiles = [];
      let continuationToken = null;
      let totalFetched = 0;
      const batchSize = Math.min(1000, maxKeys); // AWS limit is 1000 per request
      
      do {
        const command = new ListObjectsV2Command({
          Bucket: this.bucketName,
          Prefix: prefix,
          MaxKeys: Math.min(batchSize, maxKeys - totalFetched),
          ContinuationToken: continuationToken
        });

        const result = await this.s3Client.send(command);
        
        if (result.Contents) {
          const batchFiles = result.Contents.map(object => ({
            key: object.Key,
            filename: path.basename(object.Key),
            size: object.Size,
            lastModified: object.LastModified,
            url: this.getPublicUrl(object.Key)
          }));
          
          allFiles = allFiles.concat(batchFiles);
          totalFetched += batchFiles.length;
        }
        
        continuationToken = result.IsTruncated ? result.NextContinuationToken : null;
        
        // Stop if we've reached the requested limit (unless unlimited)
        if (maxKeys < 999999 && totalFetched >= maxKeys) {
          break;
        }
        
      } while (continuationToken && totalFetched < maxKeys);
      
      console.log(`Listed ${totalFetched} files from ${type} storage ${maxKeys >= 999999 ? '(unlimited)' : `(limit: ${maxKeys})`}`);
      return allFiles.slice(0, maxKeys); // Ensure we don't exceed the limit
      
    } catch (error) {
      console.error('Error listing files from S3:', error);
      return [];
    }
  }

  /**
   * Generate signed URL for temporary access
   * @param {string} filename - Filename
   * @param {string} type - Storage type
   * @param {number} expiresIn - Expiration time in seconds (default: 1 hour)
   * @returns {string} - Signed URL
   */
  async getSignedUrl(filename, type = 'documents', expiresIn = 3600) {
    if (!this.enabled) {
      throw new Error('Cloud storage is not enabled');
    }

    try {
      const s3Key = this.getS3Key(filename, type);
      
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key
      });

      return await getSignedUrl(this.s3Client, command, { expiresIn });
    } catch (error) {
      console.error('Error generating signed URL:', error);
      throw new Error(`Failed to generate signed URL: ${error.message}`);
    }
  }

  /**
   * Get public URL for file (if bucket allows public access)
   * @param {string} s3Key - S3 key
   * @returns {string} - Public URL
   */
  getPublicUrl(s3Key) {
    if (process.env.AWS_S3_ENDPOINT) {
      return `${process.env.AWS_S3_ENDPOINT}/${this.bucketName}/${s3Key}`;
    }
    return `https://${this.bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
  }

  /**
   * Get content type based on file extension
   * @param {string} filename - Filename
   * @returns {string} - Content type
   */
  getContentType(filename) {
    const ext = path.extname(filename).toLowerCase();
    const contentTypes = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
      '.txt': 'text/plain',
      '.csv': 'text/csv',
      '.zip': 'application/zip'
    };
    
    return contentTypes[ext] || 'application/octet-stream';
  }

  /**
   * Get storage statistics from S3
   * @returns {Object} - Storage statistics
   */
  async getStorageStats() {
    if (!this.enabled) {
      return { enabled: false };
    }

    try {
      const types = ['documents', 'imports', 'offerImports', 'uploads', 'signatures'];
      const stats = { enabled: true, types: {} };

      for (const type of types) {
        // Use unlimited file listing for accurate stats
        const files = await this.listFiles(type, 999999); // Very high limit to get all files
        const totalSize = files.reduce((sum, file) => sum + file.size, 0);
        
        stats.types[type] = {
          fileCount: files.length,
          totalSize,
          totalSizeMB: Math.round(totalSize / (1024 * 1024) * 100) / 100
        };
      }

      return stats;
    } catch (error) {
      console.error('Error getting S3 storage stats:', error);
      return { enabled: true, error: error.message };
    }
  }

  /**
   * Test S3 connection
   * @returns {Object} - Connection test result
   */
  async testConnection() {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        MaxKeys: 1
      });

      await this.s3Client.send(command);
      
      return {
        success: true,
        message: 'S3 connection successful',
        bucket: this.bucketName,
        region: process.env.AWS_REGION
      };
    } catch (error) {
      return {
        success: false,
        message: `S3 connection failed: ${error.message}`,
        error: error.name
      };
    }
  }
}

module.exports = AWSS3Service; 