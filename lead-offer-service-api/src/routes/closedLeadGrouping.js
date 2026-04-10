const express = require('express');
const router = express.Router();
const closedLeadGroupingController = require('../controllers/closedLeadGroupingController');
const { authenticate } = require('../middleware');
const { authorizeAny } = require('../middleware/authorize');
const { PERMISSIONS } = require('../middleware/roles/permissions');

const authPerms = [PERMISSIONS.LEAD_READ_ASSIGNED, PERMISSIONS.LEAD_READ_ALL];

router.get('/options', authenticate, authorizeAny(authPerms), closedLeadGroupingController.getGroupingOptions);
router.get('/summary', authenticate, authorizeAny(authPerms), closedLeadGroupingController.getGroupingSummary);
router.get('/sorting-options', authenticate, authorizeAny(authPerms), closedLeadGroupingController.getSortingOptions);
router.get('/multilevel/*', authenticate, authorizeAny(authPerms), closedLeadGroupingController.groupClosedLeadsMultilevel);
router.get('/:field', authenticate, authorizeAny(authPerms), closedLeadGroupingController.groupClosedLeads);
router.get('/:field/:groupId', authenticate, authorizeAny(authPerms), closedLeadGroupingController.getGroupDetails);

module.exports = router;
