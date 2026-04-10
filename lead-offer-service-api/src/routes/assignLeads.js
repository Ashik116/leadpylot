const express = require('express');
const router = express.Router();
const assignLeadsController = require('../controllers/assignLeadsController');
const { adminOnly, authenticate } = require('../middleware');
const { authorize, authorizeAny } = require('../middleware/authorize');
const { PERMISSIONS } = require('../middleware/roles/permissions');
const { validateRequest, validateBulkDelete } = require('../middleware/validation');
const { body } = require('express-validator');

/**
 * @route POST /assign-leads
 * @access Private - Requires assign:create permission
 */
router.post('/', authenticate, authorize(PERMISSIONS.ASSIGN_LEAD_CREATE), assignLeadsController.assignLeadsToProject);

/**
 * @route GET /assign-leads/project/:projectId

 * @access Admin or agents assigned to the project
 */
router.get('/project/:projectId', authenticate, authorizeAny([PERMISSIONS.ASSIGN_LEAD_READ_PROJECT, PERMISSIONS.ASSIGN_LEAD_READ_OWN, PERMISSIONS.ASSIGN_LEAD_READ_ALL]), assignLeadsController.getProjectLeads);

/**
 * @route GET /assign-leads/agent/:agentId
 * @access Private - Requires assign:read:own or assign:read:all permission
 */
router.get('/agent/:agentId', authenticate, authorizeAny([PERMISSIONS.ASSIGN_LEAD_READ_OWN, PERMISSIONS.ASSIGN_LEAD_READ_ALL]), assignLeadsController.getAgentLeads);

/**
 * @route GET /assign-leads/lead/:leadId
 * @access Private - Requires assign:read:own, assign:read:project, or assign:read:all permission
 */
router.get('/lead/:leadId', authenticate, authorizeAny([PERMISSIONS.ASSIGN_LEAD_READ_OWN, PERMISSIONS.ASSIGN_LEAD_READ_PROJECT, PERMISSIONS.ASSIGN_LEAD_READ_ALL]), assignLeadsController.getLeadProjects);

/**
 * @route PATCH /assign-leads/:leadId/:projectId/status
 * @access Private - Requires assign:update permission
 */
router.patch('/:leadId/:projectId/status', authenticate, authorize(PERMISSIONS.ASSIGN_LEAD_UPDATE), assignLeadsController.updateAssignmentStatus);

/**
 * @route PATCH /assign-leads/:leadId/:projectId/agent
 * @access Private - Requires assign:agent:update permission
 */
router.patch('/:leadId/:projectId/agent', authenticate, authorize(PERMISSIONS.ASSIGN_LEAD_AGENT_UPDATE), assignLeadsController.updateAssignmentAgent);

/**
 * @route POST /api/assign-leads/replace
 * @desc Replace a lead from one project/agent to another project/agent
 * @access Admin only
 */
router.post(
    '/replace', 
    adminOnly, 
    validateRequest([
        body('leadId').isMongoId().withMessage('Lead ID must be a valid MongoDB ID'),
        body('toProjectId').isMongoId().withMessage('To project ID must be a valid MongoDB ID'),
        body('toAgentUserId').isMongoId().withMessage('To agent user ID must be a valid MongoDB ID'),
        body('notes').isString().optional().withMessage('Notes must be a string'),
        body('isFreshTransfer').isBoolean().optional().withMessage('isFreshTransfer must be a boolean'),
        body('transferReason').isString().optional().withMessage('transferReason must be a string'),
    ]),
    assignLeadsController.replaceLeadToProject
);

/**
 * @route POST /api/assign-leads/bulk-replace
 * @desc Bulk replace multiple leads from one project/agent to another project/agent
 * @access Admin only
 */
router.post(
    '/bulk-replace', 
    adminOnly, 
    validateRequest([
        body('leadIds').isArray().withMessage('Lead IDs must be an array'),
        body('leadIds.*').isMongoId().withMessage('All lead IDs must be valid MongoDB IDs'),
        body('toProjectId').isMongoId().withMessage('To project ID must be a valid MongoDB ID'),
        body('toAgentUserId').isMongoId().withMessage('To agent user ID must be a valid MongoDB ID'),
        body('notes').isString().optional().withMessage('Notes must be a string'),
        body('isFreshTransfer').isBoolean().optional().withMessage('isFreshTransfer must be a boolean'),
        body('transferReason').isString().optional().withMessage('transferReason must be a string'),
    ]),
    assignLeadsController.bulkReplaceLeadsToProject
);

/**
 * @route DELETE /assign-leads/:leadId/:projectId
 * @access Private - Requires assign:delete permission
 */
router.delete('/:leadId/:projectId', authenticate, authorize(PERMISSIONS.ASSIGN_LEAD_DELETE), assignLeadsController.removeLeadFromProject);

/**
 * @route GET /assign-leads/grouped
 * @access Private - Requires assign:read:own, assign:read:project, or assign:read:all permission
 */
router.get('/grouped', authenticate, authorizeAny([PERMISSIONS.ASSIGN_LEAD_READ_OWN, PERMISSIONS.ASSIGN_LEAD_READ_PROJECT, PERMISSIONS.ASSIGN_LEAD_READ_ALL]), assignLeadsController.getAllLeadsByProjects);

/**
 * @route POST /assign-leads/project/:projectId/close
 * @access Admin only
 */
router.post('/project/:projectId/close', adminOnly, assignLeadsController.closeProject);

/**
 * @route GET /assign-leads/project/:projectId/refreshable
 * @access Admin only
 */
router.get('/project/:projectId/refreshable', adminOnly, assignLeadsController.getRefreshableLeads);

/**
 * @route GET /assign-leads/reusable
 * @access Admin only
 */
router.get('/reusable', adminOnly, assignLeadsController.getReusableLeads);

module.exports = router;
