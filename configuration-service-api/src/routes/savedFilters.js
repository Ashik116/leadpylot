/**
 * User-scoped saved domain filters
 */

const express = require('express');
const router = express.Router();
const savedFilterController = require('../controllers/savedFilterController');
const { authenticate } = require('../middleware/authenticate');

/**
 * @route   POST /saved-filters
 * @desc    Create a saved filter for the authenticated user
 * @body    { title: string, page: string, type?: "filter"|"grouping", domain?: array, groupBy?: string[], description?: string }
 */
router.post('/', authenticate, savedFilterController.createSavedFilter);

/**
 * @route   GET /saved-filters
 * @desc    List saved filters (pagination via pageNum; optional exact filter by query `page`)
 * @query   pageNum, limit, page (exact context), type (filter|grouping), search (matches title or page), sortBy, sortOrder
 */
router.get('/', authenticate, savedFilterController.listSavedFilters);

/**
 * @route   GET /saved-filters/by-page/:page
 * @desc    List saved filters for one page context (exact `page` field); same query options as GET /
 * @example /saved-filters/by-page/lead?pageNum=1&limit=20&search=team
 */
router.get('/by-page/:page', authenticate, savedFilterController.listSavedFiltersByPage);

/**
 * @route   GET /saved-filters/:id
 * @desc    Get one saved filter
 */
router.get('/:id', authenticate, savedFilterController.getSavedFilterById);

/**
 * @route   PUT /saved-filters/:id
 * @desc    Update title, page, type, description, and/or domain/groupBy
 */
router.put('/:id', authenticate, savedFilterController.updateSavedFilter);

/**
 * @route   DELETE /saved-filters/:id
 * @desc    Delete a saved filter
 */
router.delete('/:id', authenticate, savedFilterController.deleteSavedFilter);

module.exports = router;
