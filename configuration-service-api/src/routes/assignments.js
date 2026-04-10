/**
 * Assignment Routes
 * API endpoints for lead assignment management
 */

const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignmentController');
const { authenticate, adminOnly } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { PERMISSIONS } = require('../middleware/roles/permissions');

/**
 * @route   POST /api/config/assignments/assign
 * @desc    Assign leads to a project and agent
 * @access  Private (Admin only)
 */
router.post(
  '/assign',
  authenticate,
  authorize(PERMISSIONS.PROJECT_UPDATE),
  assignmentController.assignLeadsToProject
);

/**
 * @route   POST /api/config/assignments/assign-leads
 * @desc    Assign leads to a project and agent (alias for /assign)
 * @access  Private (Admin only)
 */
router.post(
  '/assign-leads',
  authenticate,
  authorize(PERMISSIONS.PROJECT_UPDATE),
  assignmentController.assignLeadsToProject
);

/**
 * @route   GET /api/config/assignments/projects/:projectId
 * @desc    Get assignments for a project
 * @access  Private
 */
router.get(
  '/projects/:projectId',
  authenticate,
  assignmentController.getProjectAssignments
);

/**
 * @route   GET /api/config/assignments/agents/:agentId
 * @desc    Get assignments for an agent
 * @access  Private
 */
router.get(
  '/agents/:agentId',
  authenticate,
  assignmentController.getAgentAssignments
);

/**
 * @route   GET /api/config/assignments/leads/:leadId
 * @desc    Get assignments for a lead
 * @access  Private
 */
router.get(
  '/leads/:leadId',
  authenticate,
  assignmentController.getLeadAssignments
);

/**
 * @route   PATCH /api/config/assignments/:leadId/:projectId/status
 * @desc    Update assignment status
 * @access  Private (Admin only)
 */
router.patch(
  '/:leadId/:projectId/status',
  authenticate,
  authorize(PERMISSIONS.PROJECT_UPDATE),
  assignmentController.updateAssignmentStatus
);

/**
 * @route   PATCH /api/config/assignments/:leadId/:projectId/agent
 * @desc    Update assignment agent
 * @access  Private (Admin only)
 */
router.patch(
  '/:leadId/:projectId/agent',
  authenticate,
  authorize(PERMISSIONS.PROJECT_UPDATE),
  assignmentController.updateAssignmentAgent
);

/**
 * @route   DELETE /api/config/assignments/:leadId/:projectId
 * @desc    Remove assignment (archive)
 * @access  Private (Admin only)
 */
router.delete(
  '/:leadId/:projectId',
  authenticate,
  authorize(PERMISSIONS.PROJECT_UPDATE),
  assignmentController.removeAssignment
);

/**
 * @route   GET /api/config/assignments/grouped
 * @desc    Get all assignments grouped by project
 * @access  Private (Admin only)
 */
router.get(
  '/grouped',
  authenticate,
  authorize(PERMISSIONS.PROJECT_READ_ALL),
  assignmentController.getAllAssignmentsByProject
);

/**
 * @route   POST /api/config/assignments/bulk-replace
 * @desc    Bulk replace multiple leads from one project/agent to another project/agent
 * @access  Private (Admin only)
 */
router.post(
  '/bulk-replace',
  authenticate,
  authorize(PERMISSIONS.PROJECT_UPDATE),
  assignmentController.bulkReplaceLeadsToProject
);

/**
 * @route   GET /api/config/assignments/by-agent-name/:agentName
 * @desc    Get assignments by agent name
 * @access  Private
 */
router.get(
  '/by-agent-name/:agentName',
  authenticate,
  assignmentController.getAssignmentsByAgentName
);

module.exports = router;

