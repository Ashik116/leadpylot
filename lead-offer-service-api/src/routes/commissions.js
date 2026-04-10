/**
 * Commission Routes
 * API endpoints for commission management
 * 
 * No CommissionConfig - agent default % is from User model
 * Split/Inbound % entered directly per offer
 * 
 * Routes:
 * - /commissions/offers - List offers with financials
 * - /commissions/agents/:agentId - Agent balance sheet
 * 
 * Financial operations on individual offers are in offers.js:
 * - /offers/:offerId/financials/*
 */

const express = require('express');
const router = express.Router();
const { param, query } = require('express-validator');
const commissionController = require('../controllers/commissionController');
const { requireAuth, adminOnly } = require('../middleware');
const { validateRequest } = require('../middleware/validation');

// ========================================
// OFFERS WITH FINANCIALS LIST (Admin)
// ========================================

/**
 * @route GET /commissions/offers
 * @desc Get all offers with financials initialized
 * @access Private - Admin only
 */
router.get(
  '/offers',
  requireAuth,
  adminOnly,
  validateRequest([
    query('category').optional().isIn(['opening', 'load']),
    query('payment_status').optional().isIn(['pending', 'partial', 'complete', 'overpaid']),
    query('agent_id').optional().isMongoId(),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ]),
  commissionController.getAllOffersWithFinancials
);

// ========================================
// AGENT BALANCE SHEET ROUTES
// ========================================

/**
 * @route GET /commissions/agents/:agentId/offers
 * @desc Get agent's offers with commission data
 * @access Private - Admin or the agent themselves
 */
router.get(
  '/agents/:agentId/offers',
  requireAuth,
  validateRequest([
    param('agentId').isMongoId().withMessage('Invalid agent ID'),
    query('commission_type').optional().isIn(['primary', 'split', 'inbound', 'all']),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ]),
  commissionController.getAgentOffers
);

/**
 * @route GET /commissions/agents/:agentId/summary
 * @desc Get agent's commission summary
 * @access Private - Admin or the agent themselves
 */
router.get(
  '/agents/:agentId/summary',
  requireAuth,
  validateRequest([
    param('agentId').isMongoId().withMessage('Invalid agent ID'),
  ]),
  commissionController.getAgentCommissionSummary
);

module.exports = router;
