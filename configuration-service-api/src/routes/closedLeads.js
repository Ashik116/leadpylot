const express = require('express');
const router = express.Router();
const closedLeadsController = require('../controllers/closedLeadsController');
const { authenticate, adminOnly } = require('../middleware/authenticate');

/**
 * Closed Leads Routes
 * Handles routing for closed leads operations
 */

// ===== Closed Leads CRUD =====

/**
 * @route GET /closed-leads/projects
 * @desc Get all closed projects with lead counts
 * @access Authenticated users with LEAD_READ permission
 * @query {number} [page=1] - Page number for pagination
 * @query {number} [limit=50] - Number of projects per page
 */
router.get('/projects', authenticate, closedLeadsController.getClosedProjects);

/**
 * @route GET /closed-leads
 * @desc Get closed leads with pagination and filters
 * @access Authenticated users with LEAD_READ permission
 * @query {string} [project_id] - Filter by project ID
 * @query {string} [closed_project_id] - Filter by project ID (alternative)
 * @query {boolean} [is_reverted] - Filter by reverted status
 * @query {string} [contact_name] - Search by contact name
 * @query {string} [email_from] - Search by email
 * @query {string} [closeLeadStatus] - Filter by close lead status (fresh/revert/assigned)
 * @query {number} [page=1] - Page number for pagination
 * @query {number} [limit=50] - Number of items per page
 * @query {string} [sortBy=closed_at] - Sort field
 * @query {number} [sortOrder=-1] - Sort order (1=asc, -1=desc)
 */
router.get('/', authenticate, closedLeadsController.getClosedLeads);

/**
 * @route POST /closed-leads/external
 * @desc Save closed leads from external microservice (lead-offers-service)
 * @access Admin only (service-to-service call)
 * @body {string} projectId - Project ID
 * @body {Array} leads - Array of lead objects to save as closed leads
 * @body {string} adminUserId - User ID who closed the project
 * @body {string} [closureReason] - Reason for closure
 */
router.post('/external', authenticate, closedLeadsController.saveClosedLeadsFromExternal);

/**
 * @route POST /closed-leads/revert
 * @desc Revert closed leads back to active state
 * @access Admin only
 * @body {Array} leadIds|closedLeadIds - Array of closed lead IDs to revert
 * @body {string} [projectId] - Project ID to assign reverted leads to (optional, uses original project if not provided)
 * @body {string} [revertReason|notes] - Reason for reverting
 */
router.post('/revert', authenticate, adminOnly, closedLeadsController.revertClosedLeads);

/**
 * @route POST /closed-leads/assign
 * @desc Assign closed leads to another project
 * @access Admin only
 * @body {Array} leadIds|closedLeadIds - Array of closed lead IDs to assign
 * @body {string} projectId - Target project ID
 * @body {string} agentId - Agent ID to assign to
 * @body {string} [assignReason|notes] - Reason for assignment
 * @body {number} [leadPrice] - Price of the lead
 */
router.post('/assign', authenticate, adminOnly, closedLeadsController.assignClosedLeads);

module.exports = router;

