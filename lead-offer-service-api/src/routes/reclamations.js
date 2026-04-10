/**
 * Reclamation Routes
 * API endpoints for reclamation requests
 */

const express = require('express');
const router = express.Router();
const reclamationController = require('../controllers/reclamationController');
const { authenticate, adminOnly, adminOrProviderOnly } = require('../middleware');
const { validateRequest } = require('../middleware/validation');
const { query } = require('express-validator');

// Create a new reclamation request
// Any authenticated user can create
router.post(
  '/',
  authenticate,
  validateRequest({
    body: {
      // project_id and agent_id are not required for admin users
      // but will be validated in the service for agents
      lead_id: 'required|string',
      reason: 'required|string',
    },
  }),
  reclamationController.createReclamation
);

/**
 * Get all reclamation requests with pagination
 * Query parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20)
 * - search: Search term to filter by reason (optional)
 * - status: Filter by status (0=pending, 1=accepted, 2=rejected)
 * - agent_id: Filter by agent ID (optional)
 * - sort: Sort field (default: createdAt)
 * - order: Sort order (asc/desc, default: desc)
 */
router.get(
  '/', 
  authenticate, 
  adminOrProviderOnly,
  validateRequest([
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1 }).toInt(),
    query('search')
      .optional()
      .isString()
      .trim()
      .withMessage('Search must be a valid string')
      .isLength({ max: 200 })
      .withMessage('Search term must be between 1 and 200 characters'),
    query('status').optional().isInt({ min: 0, max: 2 }).toInt(),
    query('agent_id').optional().isMongoId().withMessage('Agent ID must be a valid MongoDB ID'),
    query('sort').optional().isIn(['createdAt', 'updatedAt', 'status']).isString().trim(),
    query('order').optional().isIn(['asc', 'desc']).isString().trim(),
  ]),
  reclamationController.getReclamations
);

/**
 * Get reclamations for the authenticated user with pagination
 * Query parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20)
 * - search: Search term to filter by reason (optional)
 * - status: Filter by status (0=pending, 1=accepted, 2=rejected)
 * - sort: Sort field (default: createdAt)
 * - order: Sort order (asc/desc, default: desc)
 */
router.get(
  '/my-reclamations', 
  authenticate,
  validateRequest([
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1 }).toInt(),
    query('search')
      .optional()
      .isString()
      .trim()
      .withMessage('Search must be a valid string')
      .isLength({ max: 200 })
      .withMessage('Search term must be between 1 and 200 characters'),
    query('status').optional().isInt({ min: 0, max: 2 }).toInt(),
    query('sort').optional().isIn(['createdAt', 'updatedAt', 'status']).isString().trim(),
    query('order').optional().isIn(['asc', 'desc']).isString().trim(),
  ]),
  reclamationController.getMyReclamations
);

// Get a reclamation request by ID
// Admins, Providers, and the owner agent can view
router.get('/:id', authenticate, reclamationController.getReclamationById);

// Update a reclamation request
// Admins and Providers can update status and provide response
router.patch(
  '/:id',
  authenticate,
  adminOrProviderOnly,
  validateRequest({
    body: {
      status: 'integer|in:0,1,2',
      response: 'string',
    },
  }),
  reclamationController.updateReclamation
);

// Delete a reclamation request
// Only admins can delete
router.delete('/:id', authenticate, adminOnly, reclamationController.deleteReclamation);

module.exports = router;
