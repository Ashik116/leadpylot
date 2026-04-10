/**
 * VOIP Service
 * Handles VOIP extension generation and FreePBX API integration
 */

const axios = require('axios');
const { Lead } = require('../models');
const logger = require('../utils/logger');

// Environment variables will be used for FreePBX API credentials
const FREEPBX_URL = process.env.FREEPBX_URL || 'https://voip.leadpylot.com';
const CLIENT_ID = process.env.FREEPBX_CLIENT_ID;
const CLIENT_SECRET = process.env.FREEPBX_CLIENT_SECRET;

/**
 * Generate a unique 5-digit extension number
 * @returns {Promise<string>} - A unique 5-digit extension number
 */
const generateUniqueExtension = async () => {
  // Generate a random 5-digit number between 10000 and 99999
  const generateRandomExtension = () => {
    return Math.floor(10000 + Math.random() * 90000).toString();
  };

  let isUnique = false;
  let extension;
  let attempts = 0;
  const maxAttempts = 10; // Prevent infinite loops

  // Keep generating until we find a unique one or reach max attempts
  while (!isUnique && attempts < maxAttempts) {
    extension = generateRandomExtension();
    attempts++;

    // Check if this extension already exists in the database
    const existingLead = await Lead.findOne({ voip_extension: extension });

    if (!existingLead) {
      isUnique = true;
      logger.info(`Generated unique VOIP extension: ${extension} (attempt ${attempts})`);
    } else {
      logger.info(`Extension ${extension} already exists, trying again (attempt ${attempts})`);
    }
  }

  if (!isUnique) {
    logger.error(`Failed to generate unique extension after ${maxAttempts} attempts`);
    throw new Error(`Failed to generate unique extension after ${maxAttempts} attempts`);
  }

  return extension;
};

/**
 * Get OAuth access token from FreePBX API
 * @returns {Promise<string>} - Access token
 */
const getAccessToken = async () => {
  try {
    if (!CLIENT_ID || !CLIENT_SECRET) {
      logger.error('FreePBX API credentials not configured');
      throw new Error('FreePBX API credentials not configured');
    }

    const response = await axios.post(`${FREEPBX_URL}/admin/api/oauth/token`, {
      grant_type: 'client_credentials',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    });

    return response.data.access_token;
  } catch (error) {
    logger.error('Error getting FreePBX access token', {
      error: error.message,
    });
    throw new Error(`Failed to get FreePBX access token: ${error.message}`);
  }
};

/**
 * Create a new extension in FreePBX
 * @param {string} extension - The extension number
 * @param {string} name - The name for the extension (typically "Lead - [contact_name]")
 * @returns {Promise<Object>} - The created extension data
 */
const createFreePBXExtension = async (extension, name) => {
  try {
    const token = await getAccessToken();

    const gqlQuery = {
      query: `mutation CreateExtension($input: CoreExtensionInput!) {
        createExtension(input: $input) {
          status
          message
          extension {
            id
            extension
            tech
            name
          }
        }
      }`,
      variables: {
        input: {
          extension: extension,
          name: name,
          tech: 'pjsip',
          voicemail: { enabled: false },
          device: { dial: `PJSIP/${extension}` },
        },
      },
    };

    const response = await axios.post(`${FREEPBX_URL}/admin/api/api/gql`, gqlQuery, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.data.data?.createExtension?.status) {
      const errorMsg = response.data.data?.createExtension?.message || 'Unknown error';
      logger.error(`FreePBX extension creation failed: ${errorMsg}`, {
        extension,
        name,
      });
      throw new Error(`FreePBX extension creation failed: ${errorMsg}`);
    }

    logger.info(`Successfully created FreePBX extension: ${extension}`, {
      extensionId: response.data.data.createExtension.extension.id,
      name,
    });

    return response.data.data.createExtension.extension;
  } catch (error) {
    logger.error('Error creating FreePBX extension', {
      error: error.message,
      extension,
      name,
    });
    throw new Error(`Failed to create FreePBX extension: ${error.message}`);
  }
};

/**
 * Generate multiple unique VOIP extensions in-memory (no database queries)
 * This is optimized for bulk imports - generates all extensions upfront using a Set
 * @param {number} count - Number of extensions to generate
 * @param {Set} existingExtensionsSet - Set of already existing extensions (pre-loaded)
 * @returns {Array<string>} Array of unique extensions
 */
const generateBatchExtensions = (count, existingExtensionsSet = new Set()) => {
  const extensions = [];
  const generatedSet = new Set(existingExtensionsSet);
  
  const startTime = Date.now();
  
  for (let i = 0; i < count; i++) {
    let extension;
    let attempts = 0;
    const maxAttempts = 100; // More attempts for batch generation
    
    do {
      extension = Math.floor(10000 + Math.random() * 90000).toString();
      attempts++;
    } while (generatedSet.has(extension) && attempts < maxAttempts);
    
    if (attempts >= maxAttempts) {
      logger.warn(`Batch extension generation: reached max attempts for extension ${i + 1}, using last generated`);
    }
    
    generatedSet.add(extension);
    extensions.push(extension);
  }
  
  const elapsed = Date.now() - startTime;
  logger.info(`Generated ${count} unique VOIP extensions in ${elapsed}ms (in-memory, no DB queries)`);
  
  return extensions;
};

/**
 * Generate a unique extension and create it in FreePBX
 * @param {Object} lead - The lead object
 * @returns {Promise<string>} - The generated extension
 */
const setupVoipExtensionForLead = async (lead) => {
  try {
    // Generate a unique extension
    const extension = await generateUniqueExtension();

    // Create a name for the extension based on the lead's contact name
    const extensionName = lead.contact_name ? `Lead - ${lead.contact_name}` : `Lead - ${lead._id}`;

    // try {
    //   // Try to create the extension in FreePBX, but don't fail if it doesn't work
    //   await createFreePBXExtension(extension, extensionName);
    //   logger.info(`Successfully created FreePBX extension ${extension} for lead ${lead._id}`);
    // } catch (freePbxError) {
    //   // Log the error but continue with the extension
    //   logger.warn(`Could not create FreePBX extension, but will still use the generated extension: ${extension}`, {
    //     error: freePbxError.message,
    //     leadId: lead._id,
    //     extension
    //   });
    // }

    // Return the extension regardless of whether FreePBX creation succeeded
    return extension;
  } catch (error) {
    logger.error('Error generating unique VOIP extension for lead', {
      error: error.message,
      leadId: lead._id,
    });
    throw error;
  }
};

module.exports = {
  generateUniqueExtension,
  generateBatchExtensions,
  createFreePBXExtension,
  setupVoipExtensionForLead,
};
