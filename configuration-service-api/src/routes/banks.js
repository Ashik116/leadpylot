/**
 * Bank Routes
 * API endpoints for bank management
 * UPDATED: With logo upload support via multer
 */

const express = require('express');
const router = express.Router();
const bankController = require('../controllers/bankController');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { PERMISSIONS } = require('../middleware/roles/permissions');
const { imageUpload, handleUploadError } = require('../middleware/upload');

/**
 * @route   GET /api/config/banks
 * @desc    Get all banks
 * @access  Private
 */
router.get('/', authenticate, bankController.getAllBanks);

/**
 * @route   GET /api/config/banks/:id
 * @desc    Get bank by ID
 * @access  Private
 */
router.get('/:id', authenticate, bankController.getBankById);

/**
 * @route   POST /api/config/banks
 * @desc    Create new bank (with optional logo upload)
 * @access  Private (Admin only)
 * @upload  Single file field 'logo' for bank logo
 */
router.post(
  '/',
  authenticate,
  authorize(PERMISSIONS.BANK_CREATE),
  imageUpload.single('logo'),
  handleUploadError,
  bankController.createBank
);

/**
 * @route   PUT /api/config/banks/:id
 * @desc    Update bank (with optional logo upload)
 * @access  Private (Admin only)
 * @upload  Single file field 'logo' for bank logo
 */
router.put(
  '/:id',
  authenticate,
  authorize(PERMISSIONS.BANK_UPDATE),
  imageUpload.single('logo'),
  handleUploadError,
  bankController.updateBank
);

/**
 * @route   DELETE /api/config/banks/bulk
 * @desc    Bulk delete banks
 * @access  Private (Admin only)
 */
router.delete(
  '/',
  authenticate,
  authorize(PERMISSIONS.BANK_DELETE),
  bankController.bulkDeleteBanks
);

/**
 * @route   POST /api/config/banks/:id/projects
 * @desc    Add project to bank
 * @access  Private (Admin only)
 */
router.post(
  '/:id/projects',
  authenticate,
  authorize(PERMISSIONS.BANK_UPDATE),
  bankController.addProjectToBank
);

/**
 * @route   DELETE /api/config/banks/:id/projects/:projectId
 * @desc    Remove project from bank
 * @access  Private (Admin only)
 */
router.delete(
  '/:id/projects/:projectId',
  authenticate,
  authorize(PERMISSIONS.BANK_UPDATE),
  bankController.removeProjectFromBank
);

/**
 * @route   GET /api/config/projects/:projectId/banks
 * @desc    Get banks for a project
 * @access  Private
 */
router.get('/projects/:projectId', authenticate, bankController.getBanksByProject);

/**
 * @route   GET /api/config/agents/:agentId/banks
 * @desc    Get banks accessible by an agent
 * @access  Private
 */
router.get('/agents/:agentId', authenticate, bankController.getBanksForAgent);

module.exports = router;

