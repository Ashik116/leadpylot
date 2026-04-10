/**
 * Project Routes
 * API endpoints for project management
 */

const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { PERMISSIONS } = require('../middleware/roles/permissions');
const { imageUpload, handleUploadError } = require('../middleware/upload');

/**
 * @route   GET /api/config/projects
 * @desc    Get all projects
 * @access  Private (Admin/Managers see all, Agents see assigned)
 */
router.get('/', authenticate, authorize(PERMISSIONS.PROJECT_READ), projectController.getAllProjects);

/**
 * @route   GET /api/config/projects/:id
 * @desc    Get project by ID
 * @access  Private
 */
router.get('/:id', authenticate, projectController.getProjectById);

/**
 * @route   POST /api/config/projects
 * @desc    Create new project
 * @access  Private (Admin only)
 */
router.post(
  '/',
  authenticate,
  authorize(PERMISSIONS.PROJECT_CREATE),
  projectController.createProject
);

/**
 * @route   PUT /api/config/projects/:id
 * @desc    Update project
 * @access  Private (Admin only)
 */
router.put(
  '/:id',
  authenticate,
  authorize(PERMISSIONS.PROJECT_UPDATE),
  projectController.updateProject
);

/**
 * @route   DELETE /api/config/projects
 * @desc    Bulk delete projects (soft delete) - accepts { ids: [...] } in body
 * @access  Private (Admin only)
 */
router.delete(
  '/',
  authenticate,
  authorize(PERMISSIONS.PROJECT_DELETE),
  projectController.bulkDeleteProjects
);

/**
 * @route   DELETE /api/config/projects/:id
 * @desc    Delete project (soft delete) - accepts id in params or body
 * @access  Private (Admin only)
 */
router.delete(
  '/:id',
  authenticate,
  authorize(PERMISSIONS.PROJECT_DELETE),
  projectController.deleteProject
);

/**
 * @route   POST /api/config/projects/:id/restore
 * @desc    Restore deleted project
 * @access  Private (Admin only)
 */
router.post(
  '/:id/restore',
  authenticate,
  authorize(PERMISSIONS.PROJECT_DELETE),
  projectController.restoreProject
);

/**
 * @route   GET /api/config/projects/:id/agents
 * @desc    Get agents for a project
 * @access  Private
 */
router.get('/:id/agents', authenticate, projectController.getProjectAgents);

/**
 * @route   POST /api/config/projects/:id/agents
 * @desc    Add agent to project
 * @access  Private (Admin only)
 */
router.post(
  '/:id/agents',
  authenticate,
  authorize(PERMISSIONS.PROJECT_UPDATE),
  projectController.addAgentToProject
);

/**
 * @route   PUT /api/config/projects/:id/agents/:agentId
 * @desc    Update agent in project (supports file uploads via multipart/form-data)
 * @access  Private (Admin only)
 */
router.put(
  '/:id/agents/:agentId',
  authenticate,
  authorize(PERMISSIONS.PROJECT_UPDATE),
  imageUpload.any(), // Accept any files in the multipart form data
  handleUploadError,
  projectController.updateAgentInProject
);

/**
 * @route   DELETE /api/config/projects/:id/agents/:agentId
 * @desc    Remove agent from project
 * @access  Private (Admin only)
 */
router.delete(
  '/:id/agents/:agentId',
  authenticate,
  authorize(PERMISSIONS.PROJECT_UPDATE),
  projectController.removeAgentFromProject
);

/**
 * @route   GET /api/config/agents/:userId/projects
 * @desc    Get projects for a specific agent
 * @access  Private
 */
router.get('/agents/:userId/projects', authenticate, projectController.getAgentProjects);

module.exports = router;

