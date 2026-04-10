/**
 * Bank Service
 * Business logic for bank management
 * MATCHES MONOLITH: Complete feature parity with backend/services/bankService.js
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Bank, Project, User, Document } = require('../models');
const logger = require('../utils/logger');
const { NotFoundError, ValidationError, AuthorizationError, DatabaseError } = require('../utils/errorHandler');
const { eventEmitter, EVENT_TYPES } = require('../utils/events');
const documentClient = require('./documentClient');

/**
 * Process bank logo upload using Document microservice
 * MATCHES MONOLITH: processBankLogo function
 */
async function processBankLogo(file, userId = null, authToken = null) {
  if (!file) return null;

  try {
    // Upload to document service with authentication token
    const document = await documentClient.uploadDocument(file, 'extra', userId, authToken);
    
    // Clean up the temporary file if it exists
    if (file.path && fs.existsSync(file.path)) {
      try {
        fs.unlinkSync(file.path);
        logger.debug('Temporary bank logo file deleted', { path: file.path });
      } catch (err) {
        logger.error('Error deleting temporary bank logo file', { path: file.path, error: err.message });
      }
    }
    
    return document._id;
  } catch (error) {
    logger.error('Error processing bank logo', { error: error.message });
    
    // Clean up the temporary file if it exists
    if (file && file.path && fs.existsSync(file.path)) {
      try {
        fs.unlinkSync(file.path);
        logger.debug('Cleaned up temporary file after error', { path: file.path });
      } catch (cleanupError) {
        logger.error('Error cleaning up temporary file', { error: cleanupError.message });
      }
    }
    
    throw new DatabaseError('Failed to process bank logo: ' + error.message);
  }
}

/**
 * Get agents from projects
 * MATCHES MONOLITH: getAgentsFromProjects function
 */
async function getAgentsFromProjects(projectIds) {
  if (!projectIds || !Array.isArray(projectIds) || projectIds.length === 0) {
    return [];
  }

  try {
    // Get all projects with their agents populated
    const projects = await Project.find({ 
      _id: { $in: projectIds },
      active: true 
    }).populate('agents.user', '_id').lean();
    
    // Extract all agent user IDs from all projects
    const allAgentIds = [];
    projects.forEach(project => {
      if (project.agents && Array.isArray(project.agents)) {
        project.agents.forEach(agent => {
          if (agent.user && agent.user._id && agent.active !== false) {
            allAgentIds.push(agent.user._id.toString());
          }
        });
      }
    });
    
    // Remove duplicates
    const uniqueAgentIds = [...new Set(allAgentIds)];
    
    logger.debug('Auto-populated agents from projects', {
      projectIds,
      totalAgentsFound: uniqueAgentIds.length,
      agentIds: uniqueAgentIds
    });
    
    return uniqueAgentIds;
  } catch (error) {
    logger.error('Error getting agents from projects', { error: error.message, projectIds });
    return [];
  }
}

/**
 * Filter out banks where the current user is restricted
 * MATCHES MONOLITH: filterRestrictedBanks function
 */
function filterRestrictedBanks(banks, user) {
  if (!banks || !Array.isArray(banks) || !user) {
    return banks || [];
  }

  return banks.filter(bank => {
    // If access restriction is not enabled for this bank, show it to all agents
    if (bank.isRestricted !== true) {
      return true;
    }

    // If access restriction is enabled, check if current user is in allowed agents
    if (bank.allowedAgents && Array.isArray(bank.allowedAgents)) {
      const userIdString = user._id.toString();
      const isAllowed = bank.allowedAgents.some(allowedId =>
        allowedId.toString() === userIdString
      );

      return isAllowed; // Show bank only if user IS allowed
    }

    // If access restriction is enabled but no allowed agents array, hide the bank
    return false;
  });
}

/**
 * Populate bank documents (logo, country_flag) from Document service
 * Since documents are stored in a separate microservice, we need to fetch them manually
 * @param {Array} banks - Array of bank objects (Mongoose documents or plain objects)
 * @param {string} authToken - JWT bearer token for authentication (optional)
 * @returns {Promise<Array>} Banks with populated document objects
 */
async function populateBankDocuments(banks, authToken = null) {
  if (!banks || banks.length === 0) {
    return banks;
  }

  // Collect all unique document IDs to fetch
  const logoIds = new Set();
  const countryFlagIds = new Set();

  banks.forEach(bank => {
    const bankObj = bank.toObject ? bank.toObject() : bank;
    if (bankObj.logo) {
      logoIds.add(bankObj.logo.toString());
    }
    if (bankObj.bank_country_flag) {
      countryFlagIds.add(bankObj.bank_country_flag.toString());
    }
  });

  // Fetch all documents from Document service in parallel
  const [logoDocs, countryFlagDocs] = await Promise.all([
    // Fetch logos
    Promise.all(
      Array.from(logoIds).map(id =>
        documentClient.getDocument(id, authToken).catch(err => {
          logger.warn('Failed to fetch logo document', { documentId: id, error: err.message });
          return null;
        })
      )
    ),
    // Fetch country flags
    Promise.all(
      Array.from(countryFlagIds).map(id =>
        documentClient.getDocument(id, authToken).catch(err => {
          logger.warn('Failed to fetch country flag document', { documentId: id, error: err.message });
          return null;
        })
      )
    )
  ]);

  // Create maps for quick lookup
  const logoMap = new Map();
  logoDocs.forEach((doc, index) => {
    const id = Array.from(logoIds)[index];
    if (doc) {
      logoMap.set(id, doc);
    }
  });

  const countryFlagMap = new Map();
  countryFlagDocs.forEach((doc, index) => {
    const id = Array.from(countryFlagIds)[index];
    if (doc) {
      countryFlagMap.set(id, doc);
    }
  });

  // Replace document IDs with actual documents
  return banks.map(bank => {
    const bankObj = bank.toObject ? bank.toObject() : bank;

    // Populate logo
    if (bankObj.logo) {
      const logoId = bankObj.logo.toString();
      bankObj.logo = logoMap.get(logoId) || bankObj.logo;
    }

    // Populate bank_country_flag
    if (bankObj.bank_country_flag) {
      const countryFlagId = bankObj.bank_country_flag.toString();
      bankObj.bank_country_flag = countryFlagMap.get(countryFlagId) || bankObj.bank_country_flag;
    }

    return bankObj;
  });
}

/**
 * Get all banks with pagination, filtering, sorting, and search
 * MATCHES MONOLITH: Complete implementation with aggregation pipeline
 *
 * @param {Object} options - Query options
 * @param {number} options.page - Page number
 * @param {number} options.limit - Items per page
 * @param {string} options.search - Search term
 * @param {string} options.state - Filter by state
 * @param {boolean} options.is_allow - Filter by is_allow
 * @param {string} options.sortBy - Sort field
 * @param {string} options.sortOrder - Sort direction (asc/desc)
 * @param {Object} user - User object (optional, for permission checks)
 * @param {Function} hasPermissionFn - Permission checking function (optional)
 * @param {Object} permissions - Permission constants (optional)
 * @param {string} authToken - JWT bearer token for document service authentication (optional)
 */
const getAllBanks = async (user, query, hasPermissionFn, permissions, authToken = null) => {
  const { page = 1, limit = 20, status, search, sortBy, sortOrder } = query;
  const skip = (page - 1) * limit;

  logger.debug('Processing banks request', {
    userId: user._id,
    role: user.role,
    search: search || 'none',
    status: status || 'none',
    hasSearch: !!(search && search.trim() !== ''),
  });

  if (await hasPermissionFn(user.role, permissions.BANK_READ_ALL)) {
    logger.debug('User has BANK_READ_ALL permission');

    // If we have search criteria, use aggregation pipeline
    // Use explicit check to avoid issues with empty string query params
    const hasSearch = search && typeof search === 'string' && search.trim().length > 0;

    if (hasSearch) {
      // Build aggregation pipeline for search
      const pipeline = [];

      // Stage 1: Base matching filters
      const baseMatch = {};
      if (status) {
        baseMatch.state = status;
      }

      pipeline.push({ $match: baseMatch });

      // Stage 2: Search filtering (independent of other filters)
      const searchRegex = new RegExp(search.trim(), 'i');
      pipeline.push({
        $match: {
          $or: [
            { name: { $regex: searchRegex } },
            { nickName: { $regex: searchRegex } },
            { account_number: { $regex: searchRegex } },
            { iban: { $regex: searchRegex } },
            { country: { $regex: searchRegex } },
            { code: { $regex: searchRegex } },
            { email: { $regex: searchRegex } }
          ]
        }
      });

      // Stage 3: Add sorting
      let sortOptions = { createdAt: -1 }; // Default sort
      if (sortBy && sortOrder) {
        const allowedSortFields = {
          'name': 'name',
          'state': 'state', 
          'country': 'country',
          'createdAt': 'createdAt',
          'updatedAt': 'updatedAt'
        };
        
        const sortField = allowedSortFields[sortBy] || 'createdAt';
        const sortDirection = sortOrder === 'asc' ? 1 : -1;
        sortOptions = { [sortField]: sortDirection };
      }
      pipeline.push({ $sort: sortOptions });

      // Stage 4: Get total count and paginated data
      pipeline.push({
        $facet: {
          data: [
            { $skip: skip },
            { $limit: parseInt(limit) },
            {
              $project: {
                _id: 1,
                id: 1,
                code: 1,
                account_number: 1,
                nickName: 1,
                iban: 1,
                swift_code: 1,
                phone: 1,
                email: 1,
                name: 1,
                account: 1,
                country: 1,
                address: 1,
                is_default: 1,
                is_allow: 1,
                min_limit: 1,
                max_limit: 1,
                commission_percentage: 1,
                lei_code: 1,
                note: 1,
                state: 1,
                multi_iban: 1,
                projects: 1,
                logo: 1,
                bank_country_flag: 1,
                bank_country_code: 1,
                Ref: 1,
                provider: 1, // Will be populated separately
                isExclude: 1,
                excludedAgents: 1,
                createdAt: 1,
                updatedAt: 1
              }
            }
          ],
          totalCount: [{ $count: 'count' }]
        }
      });

      // Execute aggregation
      const [result] = await Bank.aggregate(pipeline);
      const bankIds = result.data || [];
      const total = result.totalCount.length > 0 ? result.totalCount[0].count : 0;

      // If no results found, return empty data
      if (bankIds.length === 0) {
        return {
          data: [],
          meta: {
            total: 0,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: 0,
          },
        };
      }

      // Get full bank data with populations for the found IDs
      // Preserve the original order from aggregation
      const orderedIds = bankIds.map(bank => bank._id);
      const banks = await Bank.find({ _id: { $in: orderedIds } })
        .populate('provider', 'name login');

      // Populate documents from Document service (logo, country_flag)
      const banksWithDocs = await populateBankDocuments(banks, authToken);

      // Sort banks to match the order from aggregation and apply field mapping
      const banksMap = new Map(banksWithDocs.map(bank => [bank._id.toString(), bank]));
      const sortedBanks = orderedIds
        .map(id => {
          const bank = banksMap.get(id.toString());
          if (bank) {
            // Apply toResponse transformation for country_flag
            if (bank.bank_country_flag) {
              bank.country_flag = bank.bank_country_flag;
              delete bank.bank_country_flag;
            }
            return bank;
          }
          return null;
        })
        .filter(Boolean);

      return {
        data: sortedBanks,
        meta: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit)),
        },
      };
    } else {
      // No search, use simple query with filters
      const dbQuery = {};
      if (status) {
        dbQuery.state = status;
      }

      // Handle sorting
      let sortOptions = { createdAt: -1 }; // Default sort
      if (sortBy && sortOrder) {
        const allowedSortFields = {
          'name': 'name',
          'state': 'state', 
          'country': 'country',
          'createdAt': 'createdAt',
          'updatedAt': 'updatedAt'
        };
        
        const sortField = allowedSortFields[sortBy] || 'createdAt';
        const sortDirection = sortOrder === 'asc' ? 1 : -1;
        sortOptions = { [sortField]: sortDirection };
      }

      const [banks, total] = await Promise.all([
        Bank.find(dbQuery)
          .skip(skip)
          .limit(parseInt(limit))
          .populate('provider', 'name login')
          .sort(sortOptions),
        Bank.countDocuments(dbQuery),
      ]);

      // Populate documents from Document service (logo, country_flag)
      const banksWithDocs = await populateBankDocuments(banks, authToken);

      // Apply toResponse to map field names (bank_country_flag → country_flag)
      const responseData = banksWithDocs.map(bank => {
        // For plain objects, manually apply the toResponse transformation
        if (bank.bank_country_flag) {
          bank.country_flag = bank.bank_country_flag;
          delete bank.bank_country_flag;
        }
        return bank;
      });

      return {
        data: responseData,
        meta: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit)),
        },
      };
    }
  }

  throw new AuthorizationError("You don't have permission to view the banks");
};

/**
 * Get bank by ID
 * MATCHES MONOLITH: Returns exact same structure as production
 */
async function getBankById(bankId, user = null, hasPermissionFn = null, permissions = null, authToken = null) {
  const bank = await Bank.findById(bankId)
    .populate('provider', 'name login');

  if (!bank) {
    throw new NotFoundError('Bank not found');
  }

  // Permission check (if provided)
  if (user && hasPermissionFn && permissions) {
    if (!await hasPermissionFn(user.role, permissions.BANK_READ_ALL)) {
      throw new AuthorizationError("You don't have permission to view banks");
    }
  }

  // Populate documents from Document service (logo, country_flag)
  const [bankWithDocs] = await populateBankDocuments([bank], authToken);

  // Map field names (bank_country_flag → country_flag)
  if (bankWithDocs.bank_country_flag) {
    bankWithDocs.country_flag = bankWithDocs.bank_country_flag;
    delete bankWithDocs.bank_country_flag;
  }

  return bankWithDocs;
}

/**
 * Create a new bank
 * MATCHES MONOLITH: With logo handling and agent auto-population
 */
async function createBank(bankData, creatorId, logoFile = null, authToken = null) {
  // Handle logo processing
  let logoDocumentId = null;
  if (logoFile) {
    // New file upload - process the file with authentication token
    logoDocumentId = await processBankLogo(logoFile, creatorId, authToken);
  } else if (bankData.logo && typeof bankData.logo === 'string') {
    // Existing logo ID - use as is
    logoDocumentId = bankData.logo;
    logger.debug('Using existing logo with ID', { logoId: logoDocumentId });
  }

  // Extract projects to update bidirectional relationship
  const projectIds = bankData.projects || [];

  // Add logo to bank data if processed or provided
  if (logoDocumentId) {
    bankData.logo = logoDocumentId;
  }

  // Auto-populate allowedAgents from project agents if isRestricted is true and projects are specified
  if (bankData.isRestricted && projectIds.length > 0) {
    const agentsFromProjects = await getAgentsFromProjects(projectIds);
    bankData.allowedAgents = agentsFromProjects;

    logger.debug('Auto-populated allowedAgents for new bank', {
      bankName: bankData.name,
      projectCount: projectIds.length,
      agentsCount: agentsFromProjects.length,
      allowedAgents: agentsFromProjects
    });
  }

  // Field name mapping: Handle different field names from frontend
  // frontend sends: country_flag → database field: bank_country_flag
  if (bankData.country_flag && !bankData.bank_country_flag) {
    bankData.bank_country_flag = bankData.country_flag;
    delete bankData.country_flag;
  }

  // Create the new bank
  const bank = new Bank(bankData);
  await bank.save();

  // Update projects with this bank if projects were specified
  if (projectIds.length > 0) {
    // Add this bank to each project's banks array
    await Project.updateMany({ _id: { $in: projectIds } }, { $addToSet: { banks: bank._id } });

    logger.debug(`Added bank ${bank._id} to ${projectIds.length} projects`);
  }
  
  logger.info('Bank created', { bankId: bank._id, name: bank.name, creatorId });
  
  // Emit event
  eventEmitter.emit(EVENT_TYPES.BANK.CREATED, {
    bank: bank.toObject(),
    creator: { _id: creatorId },
  });
  
  return getBankById(bank._id);
}

/**
 * Update bank
 * MATCHES MONOLITH: With logo handling and agent auto-population
 */
async function updateBank(bankId, updateData, updaterId, logoFile = null, authToken = null) {
  logger.debug('updateBankData called', {
    bankId,
    hasAllowedAgents: Object.prototype.hasOwnProperty.call(updateData, 'allowedAgents'),
    allowedAgentsValue: updateData.allowedAgents,
    isRestricted: updateData.isRestricted
  });

  // Find the bank first to get current projects
  const currentBank = await Bank.findById(bankId);
  if (!currentBank) {
    throw new NotFoundError('Bank not found');
  }

  // Parse projects if JSON string (from multipart form-data) - must be before any logic
  if (updateData.projects !== undefined && typeof updateData.projects === 'string') {
    try {
      updateData.projects = JSON.parse(updateData.projects);
    } catch (e) {
      updateData.projects = updateData.projects ? [updateData.projects] : [];
    }
  }
  if (updateData.projects !== undefined && !Array.isArray(updateData.projects)) {
    updateData.projects = [];
  }

  // Handle logo updates
  if (logoFile) {
    // New file upload - process the file with authentication token
    const logoDocumentId = await processBankLogo(logoFile, updaterId, authToken);
    updateData.logo = logoDocumentId;
    
    // Optionally delete old logo from document service
    if (currentBank.logo) {
      await documentClient.deleteDocument(currentBank.logo);
    }
  } else if (updateData.logo && typeof updateData.logo === 'string') {
    // Existing logo ID - keep the reference as is
    logger.debug('Keeping existing logo with ID', { logoId: updateData.logo });
  } else if (updateData.logo === null || updateData.logo === undefined) {
    // Logo removal - set to null
    updateData.logo = null;
  }

  // Field name mapping: Handle different field names from frontend
  // frontend sends: country_flag → database field: bank_country_flag
  if (updateData.country_flag !== undefined) {
    // If both are provided, prefer the explicit bank_country_flag, otherwise use country_flag
    if (updateData.bank_country_flag === undefined) {
      updateData.bank_country_flag = updateData.country_flag;
    }
    delete updateData.country_flag;
  }

  // Handle bidirectional relationship with projects if projects are being updated
  if (updateData.projects !== undefined) {
    const projectsArray = Array.isArray(updateData.projects) ? updateData.projects : [];

    // Get current and new project IDs
    const currentProjectIds = currentBank.projects
      ? currentBank.projects.map((p) => p.toString())
      : [];
    const newProjectIds = projectsArray.map((p) => (p && p.toString ? p.toString() : String(p || '')));

    // Find projects to add and remove
    const projectsToAdd = newProjectIds.filter((id) => !currentProjectIds.includes(id));
    const projectsToRemove = currentProjectIds.filter((id) => !newProjectIds.includes(id));

    const bankIdObj = typeof bankId === 'string' ? new mongoose.Types.ObjectId(bankId) : bankId;

    // Add bank to new projects (bidirectional: update Project.banks)
    if (projectsToAdd.length > 0) {
      await Project.updateMany(
        { _id: { $in: projectsToAdd.map((id) => new mongoose.Types.ObjectId(id)) } },
        { $addToSet: { banks: bankIdObj } }
      );
      logger.debug(`Added bank ${bankId} to ${projectsToAdd.length} projects`);
    }

    // Remove bank from removed projects (bidirectional: update Project.banks)
    if (projectsToRemove.length > 0) {
      await Project.updateMany(
        { _id: { $in: projectsToRemove.map((id) => new mongoose.Types.ObjectId(id)) } },
        { $pull: { banks: bankIdObj } }
      );
      logger.debug(`Removed bank ${bankId} from ${projectsToRemove.length} projects`);
    }

    // Auto-update allowedAgents ONLY if not explicitly provided and isRestricted is enabled      
    const hasAllowedAgents = Object.prototype.hasOwnProperty.call(updateData, 'allowedAgents');
    const shouldAutoPopulate = (updateData.isRestricted === true || (currentBank.isRestricted && updateData.isRestricted !== false)) && 
        newProjectIds.length > 0 && 
        (!hasAllowedAgents || updateData.allowedAgents === null || updateData.allowedAgents === undefined);
        
    logger.debug('Auto-populate decision', {
      updateDataIsRestricted: updateData.isRestricted,
      currentBankIsRestricted: currentBank.isRestricted,
      newProjectIdsLength: newProjectIds.length,
      hasAllowedAgents: hasAllowedAgents,
      shouldAutoPopulate: shouldAutoPopulate
    });
    
    if (shouldAutoPopulate) {
      const agentsFromProjects = await getAgentsFromProjects(newProjectIds);
      logger.debug('OVERRIDING allowedAgents', {
        original: updateData.allowedAgents,
        new: agentsFromProjects
      });
      updateData.allowedAgents = agentsFromProjects;
      
      logger.debug('Auto-updated allowedAgents for bank (no explicit selection provided)', {
        bankId: bankId,
        bankName: currentBank.name,
        projectCount: newProjectIds.length,
        agentsCount: agentsFromProjects.length,
        allowedAgents: agentsFromProjects
      });
    }
  } else if (updateData.isRestricted === true && 
             currentBank.projects && 
             currentBank.projects.length > 0 && 
             (!Object.prototype.hasOwnProperty.call(updateData, 'allowedAgents') || updateData.allowedAgents === null || updateData.allowedAgents === undefined)) {
    // If only isRestricted is being set to true and no explicit allowedAgents provided, auto-populate from existing projects
    logger.debug('Second auto-populate condition triggered');
    const existingProjectIds = currentBank.projects.map((p) => p.toString());
    const agentsFromProjects = await getAgentsFromProjects(existingProjectIds);
    logger.debug('OVERRIDING allowedAgents (existing projects)', {
      original: updateData.allowedAgents,
      new: agentsFromProjects
    });
    updateData.allowedAgents = agentsFromProjects;
    
    logger.debug('Auto-populated allowedAgents when enabling restriction (no explicit selection provided)', {
      bankId: bankId,
      bankName: currentBank.name,
      projectCount: existingProjectIds.length,
      agentsCount: agentsFromProjects.length,
      allowedAgents: agentsFromProjects
    });
  }
  
  // Update fields
  const allowedFields = [
    'name', 'nickName', 'code', 'account_number', 'iban', 'swift_code', 'phone', 'email',
    'account', 'country', 'address', 'is_default', 'is_allow', 'state',
    'min_limit', 'max_limit', 'lei_code', 'note', 'multi_iban', 'projects',
    'logo', 'bank_country_flag', 'bank_country_code',
    'isRestricted', 'allowedAgents', 'Ref', 'provider', 'commission_percentage'
  ];
  
  allowedFields.forEach(field => {
    if (updateData[field] !== undefined) {
      currentBank[field] = updateData[field];
    }
  });
  
  await currentBank.save();
  
  logger.info('Bank updated', { bankId, updaterId });
  
  // Emit event
  eventEmitter.emit(EVENT_TYPES.BANK.UPDATED, {
    bank: currentBank.toObject(),
    creator: { _id: updaterId },
    changes: updateData,
  });
  
  return getBankById(bankId);
}

/**
 * Bulk delete or update state of banks
 * MATCHES MONOLITH: Detailed reporting with success/failure tracking
 * Supports bulkState parameter to change state dynamically (active, blocked, stop, new)
 * If bulkState is not provided, banks will be deleted
 */
async function bulkDeleteBanks(bankIds, user, bulkState = null) {
  try {
    if (!Array.isArray(bankIds) || bankIds.length === 0) {
      throw new Error('IDs must be a non-empty array');
    }

    // Validate all IDs are valid MongoDB ObjectIds
    const validIds = bankIds.filter(id => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length !== bankIds.length) {
      throw new Error('All IDs must be valid MongoDB ObjectIds');
    }

    // Valid bank states from the model enum
    const VALID_STATES = ['active', 'blocked', 'stop', 'new'];
    
    // Validate bulkState if provided
    if (bulkState !== null && bulkState !== undefined && !VALID_STATES.includes(bulkState)) {
      throw new Error(`Invalid state: ${bulkState}. Valid states are: ${VALID_STATES.join(', ')}`);
    }

    const results = {
      successful: [],
      failed: [],
      totalProcessed: 0,
      successCount: 0,
      failureCount: 0,
    };

    // Find all banks that exist
    const banks = await Bank.find({
      _id: { $in: validIds },
    });

    // Track which banks were found
    const foundIds = banks.map(bank => bank._id.toString());
    const notFoundIds = validIds.filter(id => !foundIds.includes(id));

    // Add not found IDs to failed results
    notFoundIds.forEach(id => {
      results.failed.push({
        id,
        error: 'Bank not found',
      });
    });

    // Process banks using bulk operations
    try {
      // Check if we should update state or delete
      const shouldUpdateState = bulkState !== null && bulkState !== undefined;

      if (shouldUpdateState) {
        // Use updateMany to change state dynamically for all banks at once
        const updateResult = await Bank.updateMany(
          { _id: { $in: foundIds } },
          { $set: { state: bulkState } }
        );

        // Populate successful results
        banks.forEach(bank => {
          results.successful.push({
            _id: bank._id,
            name: bank.name,
            state: bulkState,
            previousState: bank.state,
          });
        });

        logger.info(`Banks state changed to ${bulkState} in bulk operation`, {
          count: updateResult.modifiedCount,
          newState: bulkState,
          bankIds: foundIds,
        });
      } else {
        // Collect all unique project IDs from banks to be deleted
        const allProjectIds = new Set();
        banks.forEach(bank => {
          if (bank.projects && bank.projects.length > 0) {
            bank.projects.forEach(projectId => allProjectIds.add(projectId.toString()));
          }
        });

        // Remove all banks from their projects in one operation
        if (allProjectIds.size > 0) {
          await Project.updateMany(
            { _id: { $in: Array.from(allProjectIds) } },
            { $pull: { banks: { $in: foundIds } } }
          );
          logger.debug(`Removed ${foundIds.length} banks from ${allProjectIds.size} projects`);
        }

        // Use deleteMany to delete all banks at once
        const deleteResult = await Bank.deleteMany({ _id: { $in: foundIds } });

        // Populate successful results
        banks.forEach(bank => {
          results.successful.push({
            _id: bank._id,
            name: bank.name,
          });
        });

        logger.info('Banks bulk deleted successfully', {
          count: deleteResult.deletedCount,
          bankIds: foundIds,
          projectsUpdated: allProjectIds.size,
        });
      }
    } catch (error) {
      // If bulk operation fails, add all banks to failed results
      banks.forEach(bank => {
        results.failed.push({
          id: bank._id.toString(),
          error: error.message,
        });
      });

      const operation = bulkState ? `update state to ${bulkState}` : 'delete';
      logger.error(`Failed to ${operation} banks in bulk operation`, {
        error: error.message,
        bankCount: banks.length,
        bulkState,
      });
    }

    // Update counters
    results.totalProcessed = validIds.length;
    results.successCount = results.successful.length;
    results.failureCount = results.failed.length;

    // Emit bulk event for activity logging
    if (results.successCount > 0) {
      const shouldUpdateState = bulkState !== null && bulkState !== undefined;
      
      if (shouldUpdateState) {
        eventEmitter.emit(EVENT_TYPES.BANK.BULK_STATE_CHANGED, {
          bankIds: validIds,
          newState: bulkState,
          successCount: results.successCount,
          failureCount: results.failureCount,
          user: { _id: user._id },
        });
      } else {
        eventEmitter.emit(EVENT_TYPES.BANK.BULK_DELETED, {
          bankIds: validIds,
          successCount: results.successCount,
          failureCount: results.failureCount,
          user: { _id: user._id },
        });
      }
    }

    // Build response message
    const shouldUpdateState = bulkState !== null && bulkState !== undefined;
    let message;
    
    if (shouldUpdateState) {
      message = `Bulk state change completed. ${results.successCount} banks changed to '${bulkState}', ${results.failureCount} failed.`;
    } else {
      message = `Bulk delete completed. ${results.successCount} banks deleted, ${results.failureCount} failed.`;
    }

    return {
      message,
      results,
      ...(shouldUpdateState && { state: bulkState }),
    };
  } catch (error) {
    const operation = bulkState ? `update state to ${bulkState}` : 'delete';
    throw new DatabaseError(`Error in bulk ${operation} banks: ${error.message}`);
  }
}

/**
 * Add project to bank
 */
async function addProjectToBank(bankId, projectId) {
  const bank = await Bank.findById(bankId);
  
  if (!bank) {
    throw new NotFoundError('Bank not found');
  }
  
  // Check if project exists
  const project = await Project.findById(projectId);
  if (!project) {
    throw new NotFoundError('Project not found');
  }
  
  // Add project to bank
  bank.addProject(projectId);
  await bank.save();
  
  // Add bank to project
  if (!project.banks) {
    project.banks = [];
  }
  if (!project.banks.includes(bankId)) {
    project.banks.push(bankId);
    await project.save();
  }
  
  logger.info('Project added to bank', { bankId, projectId });
  
  return { message: 'Project added to bank successfully' };
}

/**
 * Remove project from bank
 */
async function removeProjectFromBank(bankId, projectId) {
  const bank = await Bank.findById(bankId);
  
  if (!bank) {
    throw new NotFoundError('Bank not found');
  }
  
  // Remove project from bank
  bank.removeProject(projectId);
  await bank.save();
  
  // Remove bank from project
  await Project.findByIdAndUpdate(
    projectId,
    { $pull: { banks: bankId } }
  );
  
  logger.info('Project removed from bank', { bankId, projectId });
  
  return { message: 'Project removed from bank successfully' };
}

/**
 * Get banks for a specific project
 * MATCHES MONOLITH: Multiple query strategies with agent filtering
 */
async function getBanksByProject(projectId, user = null, hasPermissionFn = null, permissions = null, query = {}) {
  const { page = 1, limit = 20 } = query;
  const skip = (page - 1) * limit;

  logger.debug('Processing banks by project request', {
    userId: user?._id,
    role: user?.role,
    projectId,
  });

  // Check if user has permission to view banks (if provided)
  if (user && hasPermissionFn && permissions) {
    if (!await hasPermissionFn(user.role, permissions.BANK_READ_ALL)) {
      throw new AuthorizationError("You don't have permission to view the banks");
    }
  }

  // Find banks that have this project in their projects array
  // Try different query approaches to ensure we find the banks (MATCHES MONOLITH)
  const dbQuery = {
    $or: [
      { projects: { $elemMatch: { $eq: projectId } } }, // Array contains projectId as a value
      {
        projects: {
          $elemMatch: { $eq: new mongoose.Types.ObjectId(projectId) },
        },
      }, // Array contains projectId as ObjectId
      { projects: projectId }, // Simple equality check
      { 'projects.0': projectId }, // Check if first element is projectId
    ],
  };

  logger.debug('Bank query for project', {
    projectId,
    query: JSON.stringify(dbQuery),
  });

  const [allBanks, total] = await Promise.all([
    Bank.find(dbQuery)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('provider', 'name login')
      .populate('projects', 'name'),
    Bank.countDocuments(dbQuery),
  ]);

  // Filter out banks where the current user is not allowed (only for agents)
  const banks = user && user.role === 'Agent' ? filterRestrictedBanks(allBanks, user) : allBanks;

  // Populate documents from Document service (logo, country_flag)
  const banksWithDocs = await populateBankDocuments(banks);

  // Apply toResponse to map field names (bank_country_flag → country_flag)
  const transformedBanks = banksWithDocs.map(bank => {
    if (bank.bank_country_flag) {
      bank.country_flag = bank.bank_country_flag;
      delete bank.bank_country_flag;
    }
    return bank;
  });

  return {
    data: transformedBanks,
    meta: {
      total: banks.length, // Use filtered count instead of original total
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(banks.length / parseInt(limit)), // Use filtered count for pages calculation
      projectId,
    },
  };
}

/**
 * Get banks accessible by an agent (considering restrictions)
 * MATCHES MONOLITH: Agent access control
 */
async function getBanksForAgent(agentId, { is_allow = true }) {
  const query = {
    is_allow,
    $or: [
      { isRestricted: { $ne: true } }, // Not restricted or field doesn't exist
      { isRestricted: false },
      { isRestricted: true, allowedAgents: agentId },
    ],
  };

  const banks = await Bank.find(query)
    .select('name nickName iban Ref provider is_default min_limit max_limit commission_percentage state country bank_country_flag bank_country_code')
    .populate('provider', 'name login')
    .sort('name');

  // Populate documents from Document service (logo, country_flag)
  const banksWithDocs = await populateBankDocuments(banks);

  // Apply toResponse to map field names (bank_country_flag → country_flag)
  const transformedBanks = banksWithDocs.map(bank => {
    if (bank.bank_country_flag) {
      bank.country_flag = bank.bank_country_flag;
      delete bank.bank_country_flag;
    }
    return bank;
  });

  return {
    data: transformedBanks,
    meta: {
      total: banks.length,
      agentId,
    },
  };
}

module.exports = {
  getAllBanks,
  getBankById,
  createBank,
  updateBank,
  bulkDeleteBanks,
  addProjectToBank,
  removeProjectFromBank,
  getBanksByProject,
  getBanksForAgent,
  processBankLogo,
  filterRestrictedBanks,
  getAgentsFromProjects,
};

