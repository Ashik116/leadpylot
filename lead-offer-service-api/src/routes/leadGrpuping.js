const express = require('express');
const router = express.Router();
const leadGroupingController = require('../controllers/leadGroupingController');
const { authenticate } = require('../middleware');
const { authorizeAny } = require('../middleware/authorize');
const { PERMISSIONS } = require('../middleware/roles/permissions');

/**
 * @route GET /leads/group/options
 * @desc Get available grouping fields
 * @access Private - Requires lead:read:assigned or lead:read:all permission
 */
router.get('/options', authenticate, authorizeAny([PERMISSIONS.LEAD_READ_ASSIGNED, PERMISSIONS.LEAD_READ_ALL]), leadGroupingController.getGroupingOptions);

/**
 * @route GET /leads/group/summary
 * @desc Get summary of multiple groupings
 * @access Private - Requires lead:read:assigned or lead:read:all permission
 */
router.get('/summary', authenticate, authorizeAny([PERMISSIONS.LEAD_READ_ASSIGNED, PERMISSIONS.LEAD_READ_ALL]), leadGroupingController.getGroupingSummary);

/**
 * @route GET /leads/group/multilevel/*
 * @desc Group leads by multiple fields in a nested structure OR drill down into specific groups
 * @access Private - Requires lead:read:assigned or lead:read:all permission
 * @example GET /leads/group/multilevel/project/agent/stage (basic structure)
 * @example GET /leads/group/multilevel/project/agent/stage/details/projectId/agentId (drill down)
 */
router.get('/multilevel/*', authenticate, authorizeAny([PERMISSIONS.LEAD_READ_ASSIGNED, PERMISSIONS.LEAD_READ_ALL]), leadGroupingController.groupLeadsMultilevel);

/**
 * @route GET /leads/group/:field
 * @desc Group leads by a specific field
 * @access Private - Requires lead:read:assigned or lead:read:all permission
 */
router.get('/:field', authenticate, authorizeAny([PERMISSIONS.LEAD_READ_ASSIGNED, PERMISSIONS.LEAD_READ_ALL]), leadGroupingController.groupLeads);

/**
 * @route GET /leads/group/:field/:groupId
 * @desc Get specific group details with leads
 * @access Private - Requires lead:read:assigned or lead:read:all permission
 */
router.get('/:field/:groupId', authenticate, authorizeAny([PERMISSIONS.LEAD_READ_ASSIGNED, PERMISSIONS.LEAD_READ_ALL]), leadGroupingController.getGroupDetails);

module.exports = router;
