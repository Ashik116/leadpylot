/**
 * Filter Routes
 *
 * This module provides generic group by filtering capabilities for any table.
 * It supports both full table grouping and bulk search result grouping.
 *
 * Features:
 * - Group any table by one or multiple fields
 * - Bulk search grouping (group by on filtered values for supported tables)
 * - Get available tables and their grouping options
 * - Get table-specific grouping options
 * - Get group summary statistics
 *
 * Supported Tables:
 * - leads, offers, openings, confirmations, paymentvouchers
 * - appointments, todos, banks, sources
 *
 * @module routes/filters
 */

const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { authenticate } = require('../middleware');
const { authorizeAny } = require('../middleware/authorize');
const { PERMISSIONS } = require('../middleware/roles/permissions');
const {
  groupByTable,
  getAvailableTables,
  getTableGroupByOptions,
  getTableGroupSummary,
} = require('../controllers/filterController');

const router = express.Router();

/**
 * @route POST /filters/group-by
 * @desc Group any table by specified fields with optional bulk search filtering
 * @access Private - Based on table permissions (Admin/Agent)
 *
 * @body {string} table - Table name (required) - e.g., 'leads', 'offers', 'todos'
 * @body {Array<string>} groupByFields - Array of field names to group by (required)
 * @body {Array<string>} [bulkSearchValues] - Array of values for bulk search (optional, only for supported tables)
 * @body {boolean} [showInactive=false] - Include inactive records in grouping
 * @body {boolean} [includeRecords=false] - Include full populated record data in response
 *
 * @returns {Object} Response object with grouped data and metadata
 * @returns {Array} data - Array of grouped records with counts and statistics
 * @returns {Object} meta - Grouping metadata and summary
 *
 * @example Normal grouping (entire table):
 * POST /filters/group-by
 * {
 *   "table": "leads",
 *   "groupByFields": ["status", "stage"],
 *   "showInactive": false
 * }
 *
 * @example Grouping offers by agent and status:
 * POST /filters/group-by
 * {
 *   "table": "offers",
 *   "groupByFields": ["agent_id", "status"]
 * }
 *
 * @example Bulk search grouping (only on specified partner IDs for leads):
 * POST /filters/group-by
 * {
 *   "table": "leads",
 *   "groupByFields": ["source_id"],
 *   "bulkSearchValues": ["PARTNER001", "PARTNER002", "PARTNER003"],
 *   "showInactive": false
 * }
 *
 * @example Grouping todos by status and priority:
 * POST /filters/group-by
 * {
 *   "table": "todos",
 *   "groupByFields": ["status", "priority"]
 * }
 *
 * @example Nested format response - single field grouping:
 * POST /filters/group-by
 * {
 *   "table": "leads",
 *   "groupByFields": ["status"],
 *   "format": "nested"
 * }
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "New": [
 *       { "groupBy": { "status": "New" }, "count": 345, "percentage": "94.26", "recordIds": [...] }
 *     ],
 *     "Angebot": [
 *       { "groupBy": { "status": "Angebot" }, "count": 4, "percentage": "1.09", "recordIds": [...] }
 *     ],
 *     "Termin": [
 *       { "groupBy": { "status": "Termin" }, "count": 1, "percentage": "0.27", "recordIds": [...] }
 *     ]
 *   },
 *   "meta": { "table": "leads", "totalRecords": 366, "totalGroups": 10 }
 * }
 *
 * @example Nested format response - multiple fields grouping (grouped by first field):
 * POST /filters/group-by
 * {
 *   "table": "leads",
 *   "groupByFields": ["status", "phone"]
 * }
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "New": [
 *       { "groupBy": { "status": "New", "phone": "490784128132" }, "count": 1, "percentage": "0.27", ... },
 *       { "groupBy": { "status": "New", "phone": "4917681748494" }, "count": 1, "percentage": "0.27", ... },
 *       { "groupBy": { "status": "New", "phone": "49015730756959" }, "count": 1, "percentage": "0.27", ... }
 *     ],
 *     "Angebot": [
 *       { "groupBy": { "status": "Angebot", "phone": "+491752973828" }, "count": 1, "percentage": "0.27", ... },
 *       { "groupBy": { "status": "Angebot", "phone": "4901712687362" }, "count": 1, "percentage": "0.27", ... }
 *     ],
 *     "Termin": [
 *       { "groupBy": { "status": "Termin", "phone": "49015227130000" }, "count": 1, "percentage": "0.27", ... }
 *     ]
 *   },
 *   "meta": { "table": "leads", "totalRecords": 366, "totalGroups": 366 }
 * }
 *
 * @example With populated record data:
 * POST /filters/group-by
 * {
 *   "table": "leads",
 *   "groupByFields": ["status"],
 *   "includeRecords": true
 * }
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "New": [
 *       {
 *         "groupBy": { "status": "New" },
 *         "count": 345,
 *         "percentage": "94.26",
 *         "recordIds": [...],
 *         "records": [
 *           {
 *             "_id": "689db2de565bac6f7bcf765e",
 *             "contact_name": "John Doe",
 *             "phone": "490784128132",
 *             "email_from": "john@example.com",
 *             "status": "New",
 *             "source_id": { "_id": "...", "name": "Facebook" },
 *             "team_id": { "_id": "...", "name": "Sales Team" },
 *             "user_id": { "_id": "...", "firstName": "Jane", "lastName": "Smith" }
 *           },
 *           ...more records
 *         ]
 *       }
 *     ],
 *     "Angebot": [...],
 *     "Termin": [...]
 *   },
 *   "meta": { "table": "leads", "totalRecords": 366, "totalGroups": 10 }
 * }
 *
 * @error 400 - Invalid table, groupByFields, or bulkSearchValues
 * @error 401 - Unauthorized access
 * @error 403 - Insufficient permissions
 * @error 500 - Internal server error
 */
router.post(
  '/group-by',
  authenticate,
  authorizeAny([PERMISSIONS.LEAD_READ_ASSIGNED, PERMISSIONS.LEAD_READ_ALL, PERMISSIONS.OFFER_READ_OWN, PERMISSIONS.OFFER_READ_ALL]),
  [
    body('table')
      .notEmpty()
      .withMessage('table is required')
      .isString()
      .trim()
      .toLowerCase()
      .withMessage('table must be a valid string'),
    body('groupByFields')
      .isArray({ min: 1 })
      .withMessage('groupByFields must be an array with at least one field'),
    body('groupByFields.*')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('Each groupByField must be a non-empty string'),
    body('bulkSearchValues').optional().isArray().withMessage('bulkSearchValues must be an array'),
    body('showInactive').optional().isBoolean().withMessage('showInactive must be a boolean'),
    body('includeRecords').optional().isBoolean().withMessage('includeRecords must be a boolean'),
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
  groupByTable
);

/**
 * @route GET /filters/tables
 * @desc Get list of all available tables with their grouping field options
 * @access Private - All authenticated users
 *
 * @returns {Object} Response object with available tables
 * @returns {Array} data - Array of available tables with their configurations
 * @returns {string} data[].table - Table name
 * @returns {string} data[].label - Human-readable table label
 * @returns {boolean} data[].hasPermission - Whether user has permission to view this table
 * @returns {boolean} data[].supportsBulkSearch - Whether table supports bulk search
 * @returns {string} data[].bulkSearchField - Field used for bulk search (if supported)
 * @returns {Array} data[].fields - Available fields for grouping
 *
 * @example
 * GET /filters/tables
 *
 * Response:
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "table": "leads",
 *       "label": "Lead",
 *       "hasPermission": true,
 *       "supportsBulkSearch": true,
 *       "bulkSearchField": "lead_source_no",
 *       "fields": [
 *         { "value": "stage", "label": "Stage", "type": "string", "hasLookup": true },
 *         { "value": "status", "label": "Status", "type": "string", "hasLookup": true }
 *       ]
 *     },
 *     {
 *       "table": "offers",
 *       "label": "Offer",
 *       "hasPermission": true,
 *       "supportsBulkSearch": false,
 *       "bulkSearchField": null,
 *       "fields": [
 *         { "value": "status", "label": "Status", "type": "string", "hasLookup": false }
 *       ]
 *     }
 *   ]
 * }
 *
 * @error 401 - Unauthorized access
 * @error 500 - Internal server error
 */
router.get('/tables', authenticate, authorizeAny(['lead:read:assigned', 'lead:read:all', 'offer:read:own', 'offer:read:all']), getAvailableTables);

/**
 * @route GET /filters/tables/:table/options
 * @desc Get available grouping field options for a specific table
 * @access Private - All authenticated users
 *
 * @param {string} table - Table name (e.g., 'leads', 'offers', 'todos')
 *
 * @returns {Object} Response object with table-specific grouping options
 * @returns {string} table - Table name
 * @returns {boolean} supportsBulkSearch - Whether table supports bulk search
 * @returns {string} bulkSearchField - Field used for bulk search (if supported)
 * @returns {Array} data - Array of available grouping fields
 *
 * @example
 * GET /filters/tables/leads/options
 *
 * Response:
 * {
 *   "success": true,
 *   "table": "leads",
 *   "supportsBulkSearch": true,
 *   "bulkSearchField": "lead_source_no",
 *   "data": [
 *     { "value": "stage", "label": "Stage", "type": "string", "hasLookup": true },
 *     { "value": "status", "label": "Status", "type": "string", "hasLookup": true },
 *     { "value": "source_id", "label": "Source", "type": "reference", "hasLookup": true }
 *   ]
 * }
 *
 * @error 400 - Invalid table name
 * @error 401 - Unauthorized access
 * @error 500 - Internal server error
 */
router.get(
  '/tables/:table/options',
  authenticate,
  authorizeAny([PERMISSIONS.LEAD_READ_ASSIGNED, PERMISSIONS.LEAD_READ_ALL, PERMISSIONS.OFFER_READ_OWN, PERMISSIONS.OFFER_READ_ALL]),
  [
    param('table')
      .notEmpty()
      .isString()
      .trim()
      .toLowerCase()
      .withMessage('table parameter must be a valid string'),
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
  getTableGroupByOptions
);

/**
 * @route POST /filters/group-summary
 * @desc Get summary statistics for a specific grouping field in a table
 * @access Private - Based on table permissions (Admin/Agent)
 *
 * @body {string} table - Table name (required)
 * @body {string} groupByField - Single field name to get summary for (required)
 * @body {Array<string>} [bulkSearchValues] - Array of values for bulk search (optional)
 * @body {boolean} [showInactive=false] - Include inactive records
 *
 * @returns {Object} Response object with group summary statistics
 * @returns {string} table - Table name
 * @returns {string} groupByField - Field that was grouped by
 * @returns {Object} data - Summary statistics
 * @returns {number} data.totalGroups - Total number of groups
 * @returns {number} data.minRecordsPerGroup - Minimum records in any group
 * @returns {number} data.maxRecordsPerGroup - Maximum records in any group
 * @returns {number} data.avgRecordsPerGroup - Average records per group
 * @returns {number} data.totalRecords - Total records across all groups
 *
 * @example
 * POST /filters/group-summary
 * {
 *   "table": "leads",
 *   "groupByField": "status",
 *   "showInactive": false
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "table": "leads",
 *   "groupByField": "status",
 *   "data": {
 *     "totalGroups": 5,
 *     "minRecordsPerGroup": 10,
 *     "maxRecordsPerGroup": 250,
 *     "avgRecordsPerGroup": 100,
 *     "totalRecords": 500
 *   }
 * }
 *
 * @error 400 - Invalid or missing table/groupByField
 * @error 401 - Unauthorized access
 * @error 403 - Insufficient permissions
 * @error 500 - Internal server error
 */
router.post(
  '/group-summary',
  authenticate,
  authorizeAny([PERMISSIONS.LEAD_READ_ASSIGNED, PERMISSIONS.LEAD_READ_ALL, PERMISSIONS.OFFER_READ_OWN, PERMISSIONS.OFFER_READ_ALL]),
  [
    body('table')
      .notEmpty()
      .withMessage('table is required')
      .isString()
      .trim()
      .toLowerCase()
      .withMessage('table must be a valid string'),
    body('groupByField')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('groupByField must be a non-empty string'),
    body('bulkSearchValues').optional().isArray().withMessage('bulkSearchValues must be an array'),
    body('showInactive').optional().isBoolean().withMessage('showInactive must be a boolean'),
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
  getTableGroupSummary
);

module.exports = router;
