/**
 * Authentication Routes
 */
const express = require('express');
const { login, register, me, changePassword, logout, myPermissions, updateTelegramCredentials } = require('../controllers/authController');
const {
  initiateAuthentik,
  getAuthentikUrl,
  authentikCallback,
  authentikCallbackApi,
  authentikStatus,
  authentikLogoutUrl,
} = require('../controllers/authentikController');
const { authenticate } = require('../auth/middleware/authenticate');
const { authorize } = require('../auth/middleware/authorize');
const { PERMISSIONS } = require('../auth/roles/permissions');

const router = express.Router();

/**
 * @route POST /auth/login
 * @desc Authenticate user
 * @access Public
 */
router.post('/login', login);

/**
 * @route POST /auth/register
 * @desc Register new user
 * @access Public (first user) / Admin
 */
router.post('/register', register);

/**
 * @route GET /auth/me
 * @desc Get current user information
 * @access Private
 */
router.get('/me', authenticate, me);

/**
 * @route GET /auth/me/permissions
 * @desc Get current user's permissions
 * @access Private
 */
router.get('/me/permissions', authenticate, myPermissions);

/**
 * @route POST /auth/change-password
 * @desc Change current user's password
 * @access Private
 */
router.post('/change-password', authenticate, authorize(PERMISSIONS.USER_PASSWORD_CHANGE_OWN), changePassword);

/**
 * @route POST /auth/change-password/:id
 * @desc Change password for a specific user by ID
 * @access Private (Admin)
 */
router.post('/change-password/:id', authenticate, authorize(PERMISSIONS.USER_PASSWORD_CHANGE), changePassword);

/**
 * @route POST /auth/logout
 * @desc Log out the current user
 * @access Private
 */
router.post('/logout', authenticate, logout);

/**
 * @route PUT /auth/telegram-credentials
 * @desc Update user's Telegram credentials
 * @access Private
 */
router.put('/telegram-credentials', authenticate, updateTelegramCredentials);

// ==========================================
// Authentik SSO Routes
// ==========================================

/**
 * @route GET /auth/authentik/status
 * @desc Check if Authentik SSO is configured and available
 * @access Public
 */
router.get('/authentik/status', authentikStatus);

/**
 * @route GET /auth/authentik/url
 * @desc Get Authentik authorization URL (for frontend-initiated flow)
 * @access Public
 */
router.get('/authentik/url', getAuthentikUrl);

/**
 * @route GET /auth/authentik
 * @desc Initiate Authentik OAuth flow (redirect to Authentik)
 * @access Public
 */
router.get('/authentik', initiateAuthentik);

/**
 * @route GET /auth/authentik/callback
 * @desc Handle Authentik OAuth callback (redirect from Authentik)
 * @access Public
 */
router.get('/authentik/callback', authentikCallback);

/**
 * @route POST /auth/authentik/callback
 * @desc Handle Authentik OAuth callback via API (for SPA)
 * @access Public
 */
router.post('/authentik/callback', authentikCallbackApi);

/**
 * @route GET /auth/authentik/logout
 * @desc Get Authentik logout URL
 * @access Public
 */
router.get('/authentik/logout', authentikLogoutUrl);

module.exports = router;

