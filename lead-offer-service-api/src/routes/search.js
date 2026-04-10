const express = require('express');
const router = express.Router();
const { authenticate, authorize, authorizeAny } = require('../middleware');
const { PERMISSIONS } = require('../middleware/roles/permissions');
const { performGlobalSearch } = require('../controllers/searchController');

/**
 * @route   GET /search
 * @desc    Perform a global search across multiple collections
 * @access  Private - Requires search:execute OR lead read permissions
 * @query   {string} query - Search term (min 2 characters)
 * @query   {number} [limit=10] - Number of results per entity
 * @query   {number} [page=1] - Page number for pagination
 * @query   {string} [entities] - Comma-separated list of entity types to search
 */
router.get('/', authenticate, authorizeAny([PERMISSIONS.SEARCH_EXECUTE, PERMISSIONS.LEAD_READ_ASSIGNED, PERMISSIONS.LEAD_READ_ALL]), performGlobalSearch);

module.exports = router;

