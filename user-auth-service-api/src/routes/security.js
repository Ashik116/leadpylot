/**
 * Security Routes
 * API endpoints for security management
 */

const express = require('express');
const {
  getSecurityDashboard,
  getFailedLoginAttempts,
  getSuccessfulLogins,
  getActiveSessions,
  getBlockedIPs,
  blockIP,
  unblockIP,
  forceLogoutSession,
  getSecurityStats,
} = require('../controllers/securityController');
const { authenticate } = require('../auth/middleware/authenticate');
const { authorize } = require('../auth/middleware/authorize');
const { PERMISSIONS } = require('../auth/roles/permissions');
const router = express.Router();


// All security routes require admin role
router.use(authenticate);

/**
 * @route GET /security/dashboard
 * @desc Get security dashboard overview data
 * @access Admin only
 * @query {number} timeframe - Hours to look back (default: 24)
 * @query {number} limit - Limit results (default: 100)
 * @query {number} skip - Skip results (default: 0)
 */
router.get('/dashboard', authorize(PERMISSIONS.SECURITY_DASHBOARD_READ), getSecurityDashboard);

/**
 * @route GET /security/stats
 * @desc Get security statistics
 * @access Admin only
 * @query {number} timeframe - Hours to look back (default: 24)
 */
router.get('/stats', authorize(PERMISSIONS.SECURITY_STATS_READ), getSecurityStats);

/**
 * @route GET /security/failed-logins
 * @desc Get failed login attempts
 * @access Admin only
 * @query {number} page - Page number (default: 1)
 * @query {number} limit - Limit per page (default: 50)
 * @query {number} timeframe - Hours to look back (default: 24)
 * @query {string} ipAddress - Filter by IP address
 * @query {string} login - Filter by login username
 */
router.get('/failed-logins', authorize(PERMISSIONS.SECURITY_FAILED_LOGINS_READ), getFailedLoginAttempts);

/**
 * @route GET /security/successful-logins
 * @desc Get successful logins with geolocation
 * @access Admin only
 * @query {number} page - Page number (default: 1)
 * @query {number} limit - Limit per page (default: 50)
 * @query {number} timeframe - Hours to look back (default: 24)
 * @query {string} userId - Filter by user ID
 */
router.get('/successful-logins', authorize(PERMISSIONS.SECURITY_SUCCESSFUL_LOGINS_READ), getSuccessfulLogins);

/**
 * @route GET /security/active-sessions
 * @desc Get active user sessions (agent board)
 * @access Admin only
 * @query {number} page - Page number (default: 1)
 * @query {number} limit - Limit per page (default: 50)
 */
router.get('/active-sessions', authorize(PERMISSIONS.SECURITY_ACTIVE_SESSIONS_READ), getActiveSessions);

/**
 * @route GET /security/blocked-ips
 * @desc Get blocked IP addresses
 * @access Admin only
 * @query {number} page - Page number (default: 1)
 * @query {number} limit - Limit per page (default: 50)
 */
router.get('/blocked-ips', authorize(PERMISSIONS.SECURITY_BLOCKED_IPS_READ), getBlockedIPs);

/**
 * @route POST /security/block-ip
 * @desc Block an IP address manually
 * @access Admin only
 * @body {string} ipAddress - IP address to block
 * @body {string} reason - Reason for blocking
 * @body {string} blockType - Type of block (manual/temporary/permanent)
 * @body {number} expirationHours - Hours until expiration (for temporary blocks)
 * @body {string} notes - Additional notes
 */
router.post('/block-ip', authorize(PERMISSIONS.SECURITY_BLOCK_IP_CREATE), blockIP);

/**
 * @route DELETE /security/blocked-ips/:id
 * @desc Unblock an IP address
 * @access Admin only
 * @param {string} id - Blocked IP record ID
 */
router.delete('/blocked-ips/:id', authorize(PERMISSIONS.SECURITY_BLOCK_IP_DELETE), unblockIP);

/**
 * @route POST /security/force-logout/:sessionId
 * @desc Force logout a user session
 * @access Admin only
 * @param {string} sessionId - Session ID to terminate
 */
router.post('/force-logout/:sessionId', authorize(PERMISSIONS.SECURITY_FORCE_LOGOUT_CREATE), forceLogoutSession);

module.exports = router;
