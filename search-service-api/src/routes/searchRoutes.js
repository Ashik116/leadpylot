const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { PERMISSIONS } = require('../middleware/roles/permissions');

/**
 * @route POST /api/search
 * @desc Execute search query
 * @access Private - Requires search:execute permission
 */
router.post('/', authenticate, authorize(PERMISSIONS.SEARCH_EXECUTE), searchController.search);

module.exports = router;
