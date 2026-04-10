/**
 * Credential Management Routes
 * Routes for viewing and managing platform credentials
 * All routes require authentication and admin permissions
 */

const express = require('express');
const {
  getUserCredentials,
  decryptCredentialPasswordOld,
  decryptCredentialPassword,
  getCredentialAccessLogs,
  getAdminAccessLogs,
  getUserAccessLogs,
  getAccessStatistics,
} = require('../controllers/credentialController');
const { authenticate } = require('../auth/middleware/authenticate');
const { authorize } = require('../auth/middleware/authorize');
const { PERMISSIONS } = require('../auth/roles/permissions');

const router = express.Router();

/**
 * @route GET /credentials/user/:userId
 * @desc Get all platform credentials for a user (passwords remain encrypted)
 * @access Admin only (requires USER_READ_ALL permission)
 * @param {string} userId - The ID of the user whose credentials to view
 * @returns {Object} List of credentials without decrypted passwords
 */
router.get(
  '/user/:userId',
  authenticate,
  authorize(PERMISSIONS.USER_READ_ALL),
  getUserCredentials
);

/**
 * @route POST /credentials/user/:userId/decrypt/password/:credentialId
 * @desc Get decrypted password for a specific platform credential (NEW ENDPOINT - with password validation)
 * @access Admin only (requires USER_READ_ALL permission)
 * @param {string} userId - The ID of the user whose credential to decrypt
 * @param {string} credentialId - The MongoDB ObjectId of the credential
 * @body {string} adminPassword - Admin password for verification (required)
 * @returns {Object} The credential with decrypted password
 * @note This action is logged for security audit purposes
 * @note Rate limited to prevent abuse (20 requests per 5 minutes)
 * @note If credential uses old bcrypt hash, returns error message
 * @note Admin password is required in request body for additional security
 */
router.post(
  '/user/:userId/decrypt/password/:credentialId',
  authenticate,
  authorize(PERMISSIONS.USER_READ_ALL),
  decryptCredentialPassword
);

/**
 * @route POST /credentials/user/:userId/decrypt/:credentialId
 * @desc Get decrypted password for a specific platform credential (OLD ENDPOINT - no password validation)
 * @access Admin only (requires USER_READ_ALL permission)
 * @param {string} userId - The ID of the user whose credential to decrypt
 * @param {string} credentialId - The MongoDB ObjectId of the credential
 * @returns {Object} The credential with decrypted password
 * @note This action is logged for security audit purposes
 * @note Rate limited to prevent abuse (20 requests per 5 minutes)
 * @note If credential uses old bcrypt hash, returns error message
 */
router.post(
  '/user/:userId/decrypt/:credentialId',
  authenticate,
  authorize(PERMISSIONS.USER_READ_ALL),
  decryptCredentialPasswordOld
);

/**
 * @route GET /credentials/access-logs
 * @desc Get all credential access logs with filtering
 * @access Super Admin only (requires AUDIT_READ permission)
 * @query {number} page - Page number (default: 1)
 * @query {number} limit - Items per page (default: 50)
 * @query {string} accessedBy - Filter by admin who accessed
 * @query {string} targetUser - Filter by target user
 * @query {string} action - Filter by action type
 * @query {string} ipAddress - Filter by IP address
 * @query {string} startDate - Filter logs from this date
 * @query {string} endDate - Filter logs until this date
 * @query {string} status - Filter by status (success, failed, denied)
 */
router.get(
  '/access-logs',
  authenticate,
  authorize(PERMISSIONS.AUDIT_READ),
  getCredentialAccessLogs
);

/**
 * @route GET /credentials/access-logs/statistics
 * @desc Get credential access statistics
 * @access Super Admin only (requires AUDIT_READ permission)
 * @query {number} days - Number of days to analyze (default: 30)
 */
router.get(
  '/access-logs/statistics',
  authenticate,
  authorize(PERMISSIONS.AUDIT_READ),
  getAccessStatistics
);

/**
 * @route GET /credentials/access-logs/admin/:adminId
 * @desc Get credential access logs for a specific admin
 * @access Super Admin or the admin viewing their own logs
 * @param {string} adminId - The ID of the admin
 * @query {number} page - Page number (default: 1)
 * @query {number} limit - Items per page (default: 50)
 * @query {string} startDate - Filter logs from this date
 * @query {string} endDate - Filter logs until this date
 */
router.get(
  '/access-logs/admin/:adminId',
  authenticate,
  getAdminAccessLogs
);

/**
 * @route GET /credentials/access-logs/user/:userId
 * @desc Get credential access logs for a specific target user
 * @access Super Admin only (requires AUDIT_READ permission)
 * @param {string} userId - The ID of the target user
 * @query {number} page - Page number (default: 1)
 * @query {number} limit - Items per page (default: 50)
 * @query {string} startDate - Filter logs from this date
 * @query {string} endDate - Filter logs until this date
 */
router.get(
  '/access-logs/user/:userId',
  authenticate,
  authorize(PERMISSIONS.AUDIT_READ),
  getUserAccessLogs
);

module.exports = router;


