/**
 * Bank Controller
 * HTTP request handlers for bank management
 * RESPONSE FORMAT: Matches monolith exactly
 * UPDATED: With logo upload handling and permission passing
 */

const bankService = require('../services/bankService');
const logger = require('../utils/logger');
const { PERMISSIONS } = require('../middleware/roles/permissions');
// const { hasPermission } = require('../middleware/roles/rolePermissions');
const { hasPermission } = require('../middleware/authorize');
const { AuthorizationError } = require('../utils/errorHandler');


/**
 * Get all banks
 * Matches monolith: Returns { data: [...], meta: {...} }
 */
const getAllBanks = async (req, res, next) => {
  try {
    const { user } = req;
    const authToken = req.headers.authorization?.replace('Bearer ', '');
    const result = await bankService.getAllBanks(user, req.query, hasPermission, PERMISSIONS, authToken);

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Get bank by ID
 * Matches monolith: Returns bank object directly with populated fields
 */
async function getBankById(req, res, next) {
  try {
    const { id } = req.params;
    const user = req.user;
    const hasPermissionFn = req.hasPermission;
    const permissions = req.permissions;
    const authToken = req.headers.authorization?.replace('Bearer ', '');

    const bank = await bankService.getBankById(id, user, hasPermissionFn, permissions, authToken);

    // Monolith returns bank object directly (no wrapper)
    res.status(200).json(bank);
  } catch (error) {
    next(error);
  }
}

/**
 * Create bank
 * Matches monolith: Returns bank object directly (201 status)
 * NOW SUPPORTS: Logo file upload via multipart/form-data
 */
async function createBank(req, res, next) {
  try {
    const bankData = req.body;
    const creatorId = req.user._id;
    const logoFile = req.file; // From multer middleware
    const authToken = req.headers.authorization?.replace('Bearer ', ''); // Extract auth token for document service

    logger.debug('Create bank request', {
      hasFile: !!logoFile,
      fileName: logoFile?.originalname,
      fileSize: logoFile?.size,
      bankName: bankData.name
    });

    const bank = await bankService.createBank(bankData, creatorId, logoFile, authToken);

    // Monolith returns bank object directly (no wrapper, no message)
    res.status(201).json(bank);
  } catch (error) {
    next(error);
  }
}

/**
 * Update bank
 * Matches monolith: Returns bank object directly
 * NOW SUPPORTS: Logo file upload via multipart/form-data
 */
async function updateBank(req, res, next) {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const updaterId = req.user._id;
    const logoFile = req.file; // From multer middleware
    const authToken = req.headers.authorization?.replace('Bearer ', ''); // Extract auth token for document service

    logger.debug('Update bank request', {
      bankId: id,
      hasFile: !!logoFile,
      fileName: logoFile?.originalname,
      fileSize: logoFile?.size,
      hasAllowedAgents: Object.prototype.hasOwnProperty.call(updateData, 'allowedAgents')
    });

    const bank = await bankService.updateBank(id, updateData, updaterId, logoFile, authToken);

    // Monolith returns bank object directly (no wrapper, no message)
    res.status(200).json(bank);
  } catch (error) {
    next(error);
  }
}

/**
 * Bulk delete or update state of banks
 * Matches monolith: Returns { message, deletedCount }
 * Supports bulkState parameter to change state dynamically (active, blocked, stop, new)
 * If bulkState is not provided, banks will be deleted
 */
async function bulkDeleteBanks(req, res, next) {
  try {
    const { ids, bulkState } = req.body;
    const { user } = req;

    if (!(await hasPermission(user.role, PERMISSIONS.BANK_DELETE))) {
      throw new AuthorizationError("You don't have permission to delete banks");
    }

    const result = await bankService.bulkDeleteBanks(ids, user, bulkState);

    // Monolith returns { message, deletedCount }
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Add project to bank
 * Matches monolith: Returns updated bank or result
 */
async function addProjectToBank(req, res, next) {
  try {
    const { id } = req.params;
    const { projectId } = req.body;

    const result = await bankService.addProjectToBank(id, projectId);

    // Return result as-is
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Remove project from bank
 * Matches monolith: Returns updated bank or result
 */
async function removeProjectFromBank(req, res, next) {
  try {
    const { id, projectId } = req.params;

    const result = await bankService.removeProjectFromBank(id, projectId);

    // Return result as-is
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Get banks for a project
 * Matches monolith: Returns { data: [...], meta: {...} }
 * WITH: User permission passing and agent filtering
 */
async function getBanksByProject(req, res, next) {
  try {
    const { projectId } = req.params;
    const user = req.user;
    const hasPermissionFn = req.hasPermission;
    const permissions = req.permissions;
    const query = req.query;

    const result = await bankService.getBanksByProject(projectId, user, hasPermissionFn, permissions, query);

    // Monolith returns { data: [...], meta: {...} }
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Get banks accessible by an agent
 * Matches monolith: Returns { data: [...], meta: {...} }
 */
async function getBanksForAgent(req, res, next) {
  try {
    const { agentId } = req.params;
    const { is_allow } = req.query;

    const result = await bankService.getBanksForAgent(agentId, {
      is_allow: is_allow !== 'false',
    });

    // Monolith returns { data: [...], meta: {...} }
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
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
};

