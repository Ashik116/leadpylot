const mysql = require('mysql2/promise');
const axios = require('axios');
const logger = require('../../utils/logger');

/**
 * FreePBX Service for managing VoIP extensions through MariaDB
 *
 * This service handles the creation of FreePBX configuration entries
 * for lead extensions including:
 * 1. miscdest - Maps lead name to actual phone number
 * 2. miscapps - Maps extension to miscdest entry
 * 3. featurecodes - Makes extension accessible via feature codes
 */
class FreePBXService {
  constructor() {
    this.pool = null;
    this.isConnected = false;
  }

  /**
   * Initialize MariaDB connection pool
   */
  async initialize() {
    try {
      // Check if FreePBX is enabled
      if (process.env.FREEPBX_ENABLED !== 'true') {
        logger.info('FreePBX integration disabled via FREEPBX_ENABLED environment variable');
        this.isConnected = false;
        return;
      }

      // Check if required connection parameters are provided
      if (!process.env.MARIA_HOST || !process.env.MARIA_USER || !process.env.MARIA_PASS) {
        logger.warn('FreePBX MariaDB credentials not configured - skipping initialization');
        this.isConnected = false;
        return;
      }

      this.pool = mysql.createPool({
        host: process.env.MARIA_HOST,
        user: process.env.MARIA_USER,
        password: process.env.MARIA_PASS,
        database: process.env.MARIA_DATABASE || 'asterisk',
        port: process.env.MARIA_PORT || 3306,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        connectTimeout: 10000, // Reduced timeout for Docker
        acquireTimeout: 10000, // Add acquire timeout
      });

      // Test connection with timeout
      await this.testConnection();
      this.isConnected = true;
      logger.info('FreePBX MariaDB connection pool initialized successfully');
    } catch (error) {
      logger.warn('Failed to initialize FreePBX MariaDB connection (will continue without FreePBX):', error.message);
      this.isConnected = false;
      this.pool = null; // Ensure pool is null when initialization fails
      // Don't throw error - allow system to continue without FreePBX
    }
  }

  /**
   * Test database connection
   */
  async testConnection() {
    try {
      // Check if pool exists first
      if (!this.pool) {
        throw new Error('Database connection pool not initialized');
      }
      
      const connection = await this.pool.getConnection();
      await connection.execute('SELECT 1');
      connection.release();
      logger.info('FreePBX MariaDB connection test successful');
      return true;
    } catch (error) {
      logger.error('FreePBX MariaDB connection test failed:', error);
      throw error;
    }
  }

  /**
   * Ensure database connection is available
   */
  async ensureConnection() {
    if (!this.isConnected || !this.pool) {
      await this.initialize();
    }
  }

  /**
   * Create FreePBX configuration for a lead extension
   * @param {Object} leadData - Lead information
   * @param {string} leadData.extension - 5-digit extension number
   * @param {string} leadData.leadId - MongoDB ObjectId of the lead (used as description)
   * @param {string} leadData.phone - Lead phone number (without + or 00)
   * @returns {Promise<Object>} - Result with created record IDs
   */
  async createLeadExtension(leadData) {
    // Check if FreePBX is connected
    if (!this.isConnected) {
      logger.info('FreePBX not connected - skipping extension creation');
      return null;
    }

    await this.ensureConnection();

    const { extension, leadId, phone } = leadData;

    // Validate input
    if (!extension || !leadId || !phone) {
      throw new Error('Missing required fields: extension, leadId, or phone');
    }

    // Clean phone number (remove + and 00 prefix)
    const cleanPhone = this.cleanPhoneNumber(phone);

    logger.info(`Creating FreePBX extension ${extension} for lead ID: ${leadId} -> ${cleanPhone}`);

    const connection = await this.pool.getConnection();

    try {
      await connection.beginTransaction();

      // Step 1: Insert into miscdest table - use leadId as description
      const miscdestId = await this.insertMiscDest(connection, {
        description: leadId,
        destdial: cleanPhone,
      });

      // Step 2: Insert into miscapps table - use leadId as description
      const miscappsId = await this.insertMiscApps(connection, {
        ext: extension,
        description: leadId,
        dest: `ext-miscdests,${miscdestId},1`, // This format is required by FreePBX
      });

      // Step 3: Insert into featurecodes table - use leadId as description
      await this.insertFeatureCodes(connection, {
        modulename: 'miscapps', // Changed from 'core' to 'miscapps'
        featurename: `miscapp_${miscappsId}`, // This format is required by FreePBX
        description: leadId, // Use MongoDB ObjectId for identification
        defaultcode: extension,
        // Other parameters handled in insertFeatureCodes method
      });

      await connection.commit();

      const result = {
        miscdestId,
        miscappsId,
        extension,
        leadId,
        phoneNumber: cleanPhone,
      };

      logger.info(`Successfully created FreePBX extension configuration:`, result);
      return result;
    } catch (error) {
      await connection.rollback();
      logger.error(`Failed to create FreePBX extension ${extension}:`, error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Insert record into miscdests table
   * @private
   */
  async insertMiscDest(connection, data) {
    const query = `
      INSERT INTO miscdests (description, destdial) 
      VALUES (?, ?)
    `;

    const [result] = await connection.execute(query, [data.description, data.destdial]);

    logger.info(
      `Inserted miscdest: ID=${result.insertId}, description="${data.description}", destdial="${data.destdial}"`
    );
    return result.insertId;
  }

  /**
   * Insert record into miscapps table
   * @private
   */
  async insertMiscApps(connection, data) {
    // Use only the columns that exist in the schema
    const query = `
      INSERT INTO miscapps (ext, description, dest) 
      VALUES (?, ?, ?)
    `;

    const [result] = await connection.execute(query, [data.ext, data.description, data.dest]);

    logger.info(`Inserted miscapps: ID=${result.insertId}, ext="${data.ext}", dest="${data.dest}"`);
    return result.insertId;
  }

  /**
   * Insert record into featurecodes table
   * @private
   */
  async insertFeatureCodes(connection, data) {
    // FreePBX requires additional fields for feature codes to display correctly
    const query = `
      INSERT INTO featurecodes 
      (modulename, featurename, description, defaultcode, enabled, providedest) 
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    // Make sure enabled is numeric 1 (not string) and add customcode and providedest
    const [result] = await connection.execute(query, [
      data.modulename,
      data.featurename,
      data.description,
      data.defaultcode,
      1, // ensure enabled is numeric 1
      0, // providedest must be 0 for proper display
    ]);

    logger.info(
      `Inserted featurecodes: ID=${result.insertId}, featurename="${data.featurename}", defaultcode="${data.defaultcode}"`
    );
    return result.insertId;
  }

  /**
   * Clean phone number by removing +, 00 prefixes, spaces, dashes, and dots
   * @private
   */
  cleanPhoneNumber(phone) {
    if (!phone) return '';

    let cleaned = phone.toString().trim();

    // Remove + prefix
    if (cleaned.startsWith('+')) {
      cleaned = cleaned.substring(1);
    }

    // Remove 00 prefix
    if (cleaned.startsWith('00')) {
      cleaned = cleaned.substring(2);
    }

    // Remove spaces, dashes, dots, and parentheses
    cleaned = cleaned.replace(/[\s\-\.\(\)]/g, '');

    logger.info(`Sanitized phone number: ${phone} → ${cleaned}`);
    return cleaned;
  }

  /**
   * Update FreePBX phone number for a lead extension
   * @param {Object} updateData - Update information
   * @param {string} updateData.leadId - MongoDB ObjectId of the lead
   * @param {string} updateData.phone - New phone number
   * @returns {Promise<Object>} - Update result
   */
  async updateLeadExtension(updateData) {
    // Check if FreePBX is connected
    if (!this.isConnected) {
      logger.info('FreePBX not connected - skipping extension update');
      return null;
    }

    await this.ensureConnection();

    const { leadId, phone } = updateData;

    // Validate input
    if (!leadId || !phone) {
      throw new Error('Missing required fields: leadId or phone');
    }

    // Clean phone number
    const cleanPhone = this.cleanPhoneNumber(phone);

    logger.info(`Updating FreePBX phone number for lead ID: ${leadId} -> ${cleanPhone}`);

    const connection = await this.pool.getConnection();

    try {
      await connection.beginTransaction();

      // Find the miscdest record by leadId (stored in description field)
      const [miscdestRows] = await connection.execute(
        'SELECT id FROM miscdests WHERE description = ?',
        [leadId]
      );

      if (miscdestRows.length === 0) {
        logger.warn(`No FreePBX extension found for lead ID: ${leadId}`);
        await connection.rollback();
        return { updated: false, reason: 'Extension not found' };
      }

      const miscdestId = miscdestRows[0].id;

      // Update the phone number in miscdest table
      await connection.execute(
        'UPDATE miscdests SET destdial = ? WHERE id = ?',
        [cleanPhone, miscdestId]
      );

      await connection.commit();

      const result = {
        updated: true,
        leadId,
        miscdestId,
        newPhoneNumber: cleanPhone,
      };

      logger.info(`Successfully updated FreePBX phone number:`, result);
      
      // Trigger FreePBX reload
      try {
        await this.reloadFreePBX();
        logger.info('FreePBX reloaded after phone update');
      } catch (reloadError) {
        logger.error('Failed to reload FreePBX after phone update:', reloadError);
        // Don't fail the operation if reload fails
      }

      return result;
    } catch (error) {
      await connection.rollback();
      logger.error(`Failed to update FreePBX phone for lead ${leadId}:`, error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Batch delete FreePBX configurations for multiple leads by MongoDB ObjectIds
   * Uses a single transaction for all deletions and reloads FreePBX once at the end
   * @param {Array<string>} leadIds - Array of MongoDB ObjectIds
   * @returns {Promise<Object>} - Deletion results with counts
   */
  async batchDeleteLeadExtensionsByLeadIds(leadIds) {
    // Check if FreePBX is connected
    if (!this.isConnected) {
      logger.info('FreePBX not connected - skipping batch extension deletion');
      return { deleted: 0, failed: 0, skipped: leadIds.length };
    }

    if (!leadIds || leadIds.length === 0) {
      return { deleted: 0, failed: 0, skipped: 0 };
    }

    await this.ensureConnection();

    logger.info(`🔄 Batch deleting FreePBX configurations for ${leadIds.length} leads...`);

    const connection = await this.pool.getConnection();
    const results = {
      deleted: 0,
      failed: 0,
      errors: [],
    };

    try {
      await connection.beginTransaction();

      // Convert leadIds to strings for SQL IN clause
      const leadIdStrings = leadIds.map(id => id.toString());
      const placeholders = leadIdStrings.map(() => '?').join(',');

      // Step 1: Find all miscdest records by leadIds
      const [miscdestRows] = await connection.execute(
        `SELECT id, description FROM miscdests WHERE description IN (${placeholders})`,
        leadIdStrings
      );

      if (miscdestRows.length === 0) {
        logger.warn(`No FreePBX extensions found for ${leadIds.length} lead IDs`);
        await connection.rollback();
        return { deleted: 0, failed: 0, skipped: leadIds.length };
      }

      logger.info(`Found ${miscdestRows.length} FreePBX miscdest entries to delete`);

      const miscdestIds = miscdestRows.map(row => row.id);
      const miscdestPlaceholders = miscdestIds.map(() => '?').join(',');

      // Step 2: Find all miscapps records using dest field
      const destPatterns = miscdestIds.map(id => `ext-miscdests,${id},1`);
      const destPlaceholders = destPatterns.map(() => '?').join(',');

      const [miscappsRows] = await connection.execute(
        `SELECT miscapps_id FROM miscapps WHERE dest IN (${destPlaceholders})`,
        destPatterns
      );

      logger.info(`Found ${miscappsRows.length} FreePBX miscapps entries to delete`);

      if (miscappsRows.length > 0) {
        const miscappsIds = miscappsRows.map(row => row.miscapps_id);
        const miscappsPlaceholders = miscappsIds.map(() => '?').join(',');

        // Step 3: Delete from featurecodes
        const featureNames = miscappsIds.map(id => `miscapp_${id}`);
        const featurePlaceholders = featureNames.map(() => '?').join(',');

        const [featureResult] = await connection.execute(
          `DELETE FROM featurecodes WHERE featurename IN (${featurePlaceholders})`,
          featureNames
        );
        logger.info(`✓ Deleted ${featureResult.affectedRows} featurecode entries`);

        // Step 4: Delete from miscapps
        const [miscappsResult] = await connection.execute(
          `DELETE FROM miscapps WHERE miscapps_id IN (${miscappsPlaceholders})`,
          miscappsIds
        );
        logger.info(`✓ Deleted ${miscappsResult.affectedRows} miscapps entries`);
      }

      // Step 5: Delete from miscdests
      const [miscdestResult] = await connection.execute(
        `DELETE FROM miscdests WHERE id IN (${miscdestPlaceholders})`,
        miscdestIds
      );
      logger.info(`✓ Deleted ${miscdestResult.affectedRows} miscdest entries`);

      await connection.commit();
      results.deleted = miscdestRows.length;

      logger.info(`✅ Successfully batch deleted ${results.deleted} FreePBX configurations`);

      // Reload FreePBX once after all deletions
      try {
        await this.reloadFreePBX();
        logger.info('✅ FreePBX reloaded after batch deletion');
      } catch (reloadError) {
        logger.error('Failed to reload FreePBX after batch deletion:', reloadError);
        // Don't fail the operation if reload fails
      }

      return results;
    } catch (error) {
      await connection.rollback();
      logger.error(`Failed to batch delete FreePBX extensions:`, error);
      results.failed = leadIds.length;
      results.errors.push(error.message);
      return results;
    } finally {
      connection.release();
    }
  }

  /**
   * Delete FreePBX configuration for a lead by MongoDB ObjectId
   * @param {string} leadId - MongoDB ObjectId of the lead
   * @returns {Promise<boolean>} - Success status
   */
  async deleteLeadExtensionByLeadId(leadId) {
    // Check if FreePBX is connected
    if (!this.isConnected) {
      logger.info('FreePBX not connected - skipping extension deletion');
      return null;
    }

    await this.ensureConnection();

    logger.info(`Deleting FreePBX extension configuration for lead ID: ${leadId}`);

    const connection = await this.pool.getConnection();

    try {
      await connection.beginTransaction();

      // Find the miscdest record by leadId (stored in description field)
      const [miscdestRows] = await connection.execute(
        'SELECT id FROM miscdests WHERE description = ?',
        [leadId]
      );

      if (miscdestRows.length === 0) {
        logger.warn(`No FreePBX extension found for lead ID: ${leadId}`);
        await connection.rollback();
        return false;
      }

      const miscdestId = miscdestRows[0].id;

      // Find the miscapps record using the dest field
      const [miscappsRows] = await connection.execute(
        'SELECT miscapps_id FROM miscapps WHERE dest = ?',
        [`ext-miscdests,${miscdestId},1`]
      );

      if (miscappsRows.length > 0) {
        const miscappsId = miscappsRows[0].miscapps_id;

        // Delete from featurecodes
        await connection.execute(
          'DELETE FROM featurecodes WHERE featurename = ?',
          [`miscapp_${miscappsId}`]
        );
        logger.info(`✓ Deleted featurecode for miscapp_${miscappsId}`);

        // Delete from miscapps
        await connection.execute('DELETE FROM miscapps WHERE miscapps_id = ?', [miscappsId]);
        logger.info(`✓ Deleted miscapps record ID ${miscappsId}`);
      }

      // Delete from miscdests
      await connection.execute('DELETE FROM miscdests WHERE id = ?', [miscdestId]);
      logger.info(`✓ Deleted miscdest record ID ${miscdestId}`);

      await connection.commit();
      logger.info(`✅ Successfully deleted FreePBX configuration for lead ID: ${leadId}`);
      return true;
    } catch (error) {
      await connection.rollback();
      logger.error(`Failed to delete FreePBX extension for lead ${leadId}:`, error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Delete FreePBX configuration for a lead extension
   * @param {string} extension - Extension number to delete
   * @returns {Promise<boolean>} - Success status
   */
  async deleteLeadExtension(extension) {
    // Check if FreePBX is connected
    if (!this.isConnected) {
      logger.info('FreePBX not connected - skipping extension deletion');
      return null;
    }

    await this.ensureConnection();

    logger.info(`Deleting FreePBX extension configuration for: ${extension}`);

    const connection = await this.pool.getConnection();

    try {
      await connection.beginTransaction();

      // Find the miscapps record to get the feature name
      const [miscappsRows] = await connection.execute('SELECT miscapps_id FROM miscapps WHERE ext = ?', [
        extension,
      ]);

      if (miscappsRows.length > 0) {
        const miscappsId = miscappsRows[0].miscapps_id;

        // Delete from featurecodes
        await connection.execute('DELETE FROM featurecodes WHERE featurename = ?', [
          `miscapps_${miscappsId}`,
        ]);

        // Find the dest value to get miscdest ID
        const [destRows] = await connection.execute('SELECT dest FROM miscapps WHERE miscapps_id = ?', [
          miscappsId,
        ]);

        if (destRows.length > 0) {
          const dest = destRows[0].dest;
          const miscdestIdMatch = dest.match(/ext-miscdests,(\d+),1/);

          if (miscdestIdMatch) {
            const miscdestId = miscdestIdMatch[1];

            // Delete from miscdests
            await connection.execute('DELETE FROM miscdests WHERE id = ?', [miscdestId]);
          }
        }

        // Delete from miscapps
        await connection.execute('DELETE FROM miscapps WHERE miscapps_id = ?', [miscappsId]);
      }

      await connection.commit();
      logger.info(`Successfully deleted FreePBX extension configuration for: ${extension}`);
      return true;
    } catch (error) {
      await connection.rollback();
      logger.error(`Failed to delete FreePBX extension ${extension}:`, error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Trigger FreePBX reload to apply configuration changes
   * @returns {Promise<boolean>} - Success status
   */
  async reloadFreePBX() {
    try {
      const reloadUrl = process.env.FREEPBX_RELOAD_URL;

      if (!reloadUrl) {
        throw new Error('FREEPBX_RELOAD_URL not configured');
      }

      logger.info('Triggering FreePBX reload...');

      const response = await axios.get(reloadUrl, {
        timeout: 30000, // 30 second timeout
        headers: {
          'User-Agent': 'LeadPylot-Backend/1.0',
        },
      });

      if (response.status === 200) {
        logger.info('FreePBX reload completed successfully');
        return true;
      } else {
        logger.warn(`FreePBX reload returned status: ${response.status}`);
        return false;
      }
    } catch (error) {
      logger.error('Failed to reload FreePBX:', error);
      throw error;
    }
  }

  /**
   * True batch create multiple lead extensions using bulk INSERT operations
   * @param {Array} leadsData - Array of lead data objects
   * @returns {Promise<Object>} - Batch creation results
   */
  async batchCreateLeadExtensions(leadsData) {
    await this.ensureConnection();

    const results = {
      successful: [],
      failed: [],
      total: leadsData.length,
    };

    if (leadsData.length === 0) {
      return results;
    }

    logger.info(`Starting TRUE batch creation of ${leadsData.length} FreePBX extensions`);

    const connection = await this.pool.getConnection();

    try {
      await connection.beginTransaction();

      // Prepare data for batch operations
      const miscdestData = [];
      const processedLeads = [];
      
      for (const leadData of leadsData) {
        try {
          const { extension, leadId, phone } = leadData;

          // Validate input
          if (!extension || !leadId || !phone) {
            throw new Error('Missing required fields: extension, leadId, or phone');
          }

          // Clean phone number
          const cleanPhone = this.cleanPhoneNumber(phone);
          
          miscdestData.push([leadId, cleanPhone]);
          processedLeads.push({
            extension,
            leadId,
            phone: cleanPhone,
            originalData: leadData
          });
        } catch (error) {
          logger.error(`Failed to prepare data for extension ${leadData.extension}:`, error);
          results.failed.push({
            extension: leadData.extension,
            leadId: leadData.leadId,
            error: error.message,
          });
        }
      }

      if (processedLeads.length === 0) {
        await connection.rollback();
        return results;
      }

      // Step 1: Batch insert into miscdests table
      logger.info(`Batch inserting ${miscdestData.length} records into miscdests table`);
      const miscdestQuery = `
        INSERT INTO miscdests (description, destdial) 
        VALUES ${miscdestData.map(() => '(?, ?)').join(', ')}
      `;
      const miscdestValues = miscdestData.flat();
      const [miscdestResult] = await connection.execute(miscdestQuery, miscdestValues);
      
      const firstMiscdestId = miscdestResult.insertId;
      logger.info(`Batch inserted miscdests: first ID=${firstMiscdestId}, count=${miscdestData.length}`);

      // Step 2: Batch insert into miscapps table
      const miscappsData = [];
      processedLeads.forEach((lead, index) => {
        const miscdestId = firstMiscdestId + index;
        miscappsData.push([lead.extension, lead.leadId, `ext-miscdests,${miscdestId},1`]);
      });

      logger.info(`Batch inserting ${miscappsData.length} records into miscapps table`);
      const miscappsQuery = `
        INSERT INTO miscapps (ext, description, dest) 
        VALUES ${miscappsData.map(() => '(?, ?, ?)').join(', ')}
      `;
      const miscappsValues = miscappsData.flat();
      const [miscappsResult] = await connection.execute(miscappsQuery, miscappsValues);
      
      const firstMiscappsId = miscappsResult.insertId;
      logger.info(`Batch inserted miscapps: first ID=${firstMiscappsId}, count=${miscappsData.length}`);

      // Step 3: Batch insert into featurecodes table
      const featurecodesData = [];
      processedLeads.forEach((lead, index) => {
        const miscappsId = firstMiscappsId + index;
        featurecodesData.push([
          'miscapps',
          `miscapp_${miscappsId}`,
          lead.leadId,
          lead.extension,
          1, // enabled
          0  // providedest
        ]);
      });

      logger.info(`Batch inserting ${featurecodesData.length} records into featurecodes table`);
      const featurecodesQuery = `
        INSERT INTO featurecodes 
        (modulename, featurename, description, defaultcode, enabled, providedest) 
        VALUES ${featurecodesData.map(() => '(?, ?, ?, ?, ?, ?)').join(', ')}
      `;
      const featurecodesValues = featurecodesData.flat();
      await connection.execute(featurecodesQuery, featurecodesValues);
      
      logger.info(`Batch inserted featurecodes: count=${featurecodesData.length}`);

      // Commit the transaction
      await connection.commit();

      // Mark all as successful
      processedLeads.forEach((lead, index) => {
        const miscdestId = firstMiscdestId + index;
        const miscappsId = firstMiscappsId + index;
        
        results.successful.push({
          extension: lead.extension,
          leadId: lead.leadId,
          result: {
            miscdestId,
            miscappsId,
            extension: lead.extension,
            leadId: lead.leadId,
            phoneNumber: lead.phone,
          }
        });
      });

      logger.info(
        `TRUE batch creation completed: ${results.successful.length} successful, ${results.failed.length} failed`
      );

    } catch (error) {
      await connection.rollback();
      logger.error('Batch creation failed, rolling back transaction:', error);
      
      // Mark all as failed if transaction fails
      processedLeads.forEach(lead => {
        if (!results.failed.find(f => f.extension === lead.extension)) {
          results.failed.push({
            extension: lead.extension,
            leadId: lead.leadId,
            error: error.message,
          });
        }
      });
    } finally {
      connection.release();
    }

    // If we had any successful creations, trigger reload
    if (results.successful.length > 0) {
      try {
        await this.reloadFreePBX();
        logger.info('FreePBX reloaded after TRUE batch creation');
      } catch (error) {
        logger.error('Failed to reload FreePBX after batch creation:', error);
      }
    }

    return results;
  }

  /**
   * Close database connections
   */
  async close() {
    if (this.pool) {
      await this.pool.end();
      this.isConnected = false;
      logger.info('FreePBX MariaDB connection pool closed');
    }
  }
}

// Create singleton instance
const freepbxService = new FreePBXService();

// Initialize the service when the module is loaded
// But don't block module loading with async initialization
(async () => {
  try {
    await freepbxService.initialize();
  } catch (error) {
    // Just log the error, don't crash the application
    // The service will try to reconnect when methods are called
    logger.error('Initial FreePBX MariaDB connection failed:', error);
  }
})();

module.exports = freepbxService;
