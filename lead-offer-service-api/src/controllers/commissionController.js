/**
 * Commission Controller
 * HTTP request handlers for commission management
 * Works directly with Offer model's financials field
 * 
 * No CommissionConfig - agent default % is from User model
 * Split/Inbound % entered directly per offer
 */

const commissionService = require('../services/commissionService');
const logger = require('../utils/logger');
const { createActivity } = require('../services/activityService/utils');

// ========================================
// OFFER FINANCIALS ENDPOINTS
// ========================================

/**
 * Get offer financials
 * @route GET /offers/:offerId/financials
 * 
 * Admin: sees all financial data
 * Agent: sees only their own commission data (no bank, split, inbound, company revenue)
 */
async function getOfferFinancials(req, res, next) {
  try {
    const offer = await commissionService.getOfferFinancials(req.params.offerId);
    
    if (!offer) {
      return res.status(404).json({ error: 'Offer not found' });
    }
    
    const isAdmin = req.user?.role === 'Admin';
    const userId = req.user?._id?.toString();
    
    // Create activity log for viewing financials
    try {
      const offerTitle = offer?.title || `Offer #${req.params.offerId}`;
      await createActivity({
        _creator: req.user._id,
        _subject_id: req.params.offerId,
        subject_type: 'Offer',
        action: 'read',
        message: `Viewed financials for offer: ${offerTitle}`,
        type: 'info',
        details: {
          action_type: 'offer_financials_viewed',
          offer_id: req.params.offerId,
          offer_title: offerTitle,
          viewer_role: req.user?.role,
        },
      });
    } catch (activityError) {
      logger.warn('Failed to log financials view activity (non-blocking)', {
        error: activityError.message,
        offerId: req.params.offerId,
      });
    }

    // If admin, return full data
    if (isAdmin) {
      return res.status(200).json(offer);
    }
    
    // For agents, filter to only show their own commission data
    const financials = offer.financials || {};
    const agentId = offer.agent_id?._id?.toString() || offer.agent_id?.toString();
    
    // Check if this user is the primary agent
    const isPrimaryAgent = userId === agentId;
    
    // Check if this user is a split or inbound agent
    const splitEntry = financials.split_agents?.find(
      a => a.agent_id?.toString() === userId
    );
    const inboundEntry = financials.inbound_agents?.find(
      a => a.agent_id?.toString() === userId
    );
    
    // Build agent-specific response
    const agentResponse = {
      _id: offer._id,
      financials_initialized: financials.financials_initialized || false,
      
      // Customer payment info (what they need to know)
      expected_from_customer: financials.expected_from_customer || 0,
      total_customer_received: financials.payment_summary?.total_received || 0,
      payment_status: financials.payment_summary?.payment_status || 'pending',
      
      // Their commission data (only for their role)
      my_commission: null,
    };
    
    if (isPrimaryAgent && financials.primary_agent_commission) {
      agentResponse.my_commission = {
        type: 'primary',
        percentage: financials.primary_agent_commission.percentage || 0,
        expected_amount: financials.primary_agent_commission.expected_amount || 0,
        actual_amount: financials.primary_agent_commission.actual_amount || 0,
        paid_amount: financials.primary_agent_commission.paid_amount || 0,
      };
    } else if (splitEntry) {
      agentResponse.my_commission = {
        type: 'split',
        percentage: splitEntry.percentage || 0,
        expected_amount: splitEntry.expected_amount || 0,
        actual_amount: splitEntry.actual_amount || 0,
        paid_amount: splitEntry.paid_amount || 0,
      };
    } else if (inboundEntry) {
      agentResponse.my_commission = {
        type: 'inbound',
        percentage: inboundEntry.percentage || 0,
        expected_amount: inboundEntry.expected_amount || 0,
        actual_amount: inboundEntry.actual_amount || 0,
        paid_amount: inboundEntry.paid_amount || 0,
      };
    }
    
    // If user has no commission on this offer, they shouldn't see financial details
    if (!agentResponse.my_commission) {
      return res.status(200).json({
        _id: offer._id,
        financials_initialized: financials.financials_initialized || false,
        message: 'No commission data available for this offer',
      });
    }
    
    res.status(200).json(agentResponse);
  } catch (error) {
    next(error);
  }
}

/**
 * Get all offers with financials
 * @route GET /commissions/offers
 */
async function getAllOffersWithFinancials(req, res, next) {
  try {
    const result = await commissionService.getAllOffersWithFinancials(req.query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Initialize financials for an offer
 * @route POST /offers/:offerId/financials/initialize
 */
async function initializeFinancials(req, res, next) {
  try {
    const offer = await commissionService.initializeFinancials(
      req.params.offerId,
      req.body,
      req.user._id
    );
    
    res.status(201).json(offer);
  } catch (error) {
    next(error);
  }
}

/**
 * Update investment amounts
 * @route PUT /offers/:offerId/financials/investment
 */
async function updateInvestmentAmounts(req, res, next) {
  try {
    const offer = await commissionService.updateInvestmentAmounts(
      req.params.offerId,
      req.body,
      req.user._id
    );
    res.status(200).json(offer);
  } catch (error) {
    next(error);
  }
}

/**
 * Add customer payment
 * @route POST /offers/:offerId/financials/payments
 * 
 * On first payment, automatically creates a cashflow entry to track
 * the money movement through the banking system (via shared MongoDB).
 */
async function addCustomerPayment(req, res, next) {
  try {
    const offer = await commissionService.addCustomerPayment(
      req.params.offerId,
      req.body,
      req.user._id
    );
    res.status(201).json(offer);
  } catch (error) {
    next(error);
  }
}

/**
 * Update customer payment
 * @route PUT /offers/:offerId/financials/payments/:paymentId
 */
async function updateCustomerPayment(req, res, next) {
  try {
    const offer = await commissionService.updateCustomerPayment(
      req.params.offerId,
      req.params.paymentId,
      req.body,
      req.user._id
    );
    res.status(200).json(offer);
  } catch (error) {
    next(error);
  }
}

/**
 * Delete customer payment
 * @route DELETE /offers/:offerId/financials/payments/:paymentId
 */
async function deleteCustomerPayment(req, res, next) {
  try {
    const offer = await commissionService.deleteCustomerPayment(
      req.params.offerId,
      req.params.paymentId,
      req.user._id
    );
    res.status(200).json(offer);
  } catch (error) {
    next(error);
  }
}

/**
 * Override primary agent percentage
 * @route PUT /offers/:offerId/financials/primary-agent/percentage
 */
async function overridePrimaryAgentPercentage(req, res, next) {
  try {
    const { percentage } = req.body;
    
    if (percentage === undefined || percentage < 0 || percentage > 100) {
      return res.status(400).json({ 
        error: 'Percentage must be between 0 and 100' 
      });
    }
    
    const offer = await commissionService.overridePrimaryAgentPercentage(
      req.params.offerId,
      percentage,
      req.user._id
    );
    res.status(200).json(offer);
  } catch (error) {
    next(error);
  }
}

/**
 * Override bank percentage
 * @route PUT /offers/:offerId/financials/bank/percentage
 */
async function overrideBankPercentage(req, res, next) {
  try {
    const { percentage } = req.body;
    
    if (percentage === undefined || percentage < 0 || percentage > 100) {
      return res.status(400).json({ 
        error: 'Percentage must be between 0 and 100' 
      });
    }
    
    const offer = await commissionService.overrideBankPercentage(
      req.params.offerId,
      percentage,
      req.user._id
    );
    res.status(200).json(offer);
  } catch (error) {
    next(error);
  }
}

/**
 * Add split agent
 * @route POST /offers/:offerId/financials/split-agents
 */
async function addSplitAgent(req, res, next) {
  try {
    const { agent_id, percentage, reason } = req.body;
    
    if (!agent_id) {
      return res.status(400).json({ error: 'agent_id is required' });
    }
    if (percentage === undefined || percentage < 0 || percentage > 100) {
      return res.status(400).json({ 
        error: 'Percentage must be between 0 and 100' 
      });
    }
    
    const offer = await commissionService.addSplitAgent(
      req.params.offerId,
      { agent_id, percentage, reason },
      req.user._id
    );
    res.status(201).json(offer);
  } catch (error) {
    next(error);
  }
}

/**
 * Remove split agent
 * @route DELETE /offers/:offerId/financials/split-agents/:agentId
 */
async function removeSplitAgent(req, res, next) {
  try {
    const offer = await commissionService.removeSplitAgent(
      req.params.offerId,
      req.params.agentId,
      req.user._id
    );
    res.status(200).json(offer);
  } catch (error) {
    next(error);
  }
}

/**
 * Add inbound agent
 * @route POST /offers/:offerId/financials/inbound-agents
 */
async function addInboundAgent(req, res, next) {
  try {
    const { agent_id, percentage, reason } = req.body;
    
    if (!agent_id) {
      return res.status(400).json({ error: 'agent_id is required' });
    }
    if (percentage === undefined || percentage < 0 || percentage > 100) {
      return res.status(400).json({ 
        error: 'Percentage must be between 0 and 100' 
      });
    }
    
    const offer = await commissionService.addInboundAgent(
      req.params.offerId,
      { agent_id, percentage, reason },
      req.user._id
    );
    res.status(201).json(offer);
  } catch (error) {
    next(error);
  }
}

/**
 * Remove inbound agent
 * @route DELETE /offers/:offerId/financials/inbound-agents/:agentId
 */
async function removeInboundAgent(req, res, next) {
  try {
    const offer = await commissionService.removeInboundAgent(
      req.params.offerId,
      req.params.agentId,
      req.user._id
    );
    res.status(200).json(offer);
  } catch (error) {
    next(error);
  }
}

/**
 * Update split/inbound agent percentage
 * @route PUT /offers/:offerId/financials/:agentType/:agentId/percentage
 */
async function updateAgentPercentage(req, res, next) {
  try {
    const { offerId, agentType, agentId } = req.params;
    const { percentage } = req.body;
    
    if (!['split-agents', 'inbound-agents'].includes(agentType)) {
      return res.status(400).json({ 
        error: 'Agent type must be split-agents or inbound-agents' 
      });
    }
    if (percentage === undefined || percentage < 0 || percentage > 100) {
      return res.status(400).json({ 
        error: 'Percentage must be between 0 and 100' 
      });
    }
    
    const type = agentType === 'split-agents' ? 'split' : 'inbound';
    const offer = await commissionService.updateAgentPercentage(
      offerId,
      agentId,
      type,
      percentage,
      req.user._id
    );
    res.status(200).json(offer);
  } catch (error) {
    next(error);
  }
}

/**
 * Force recalculation of offer financials
 * @route POST /offers/:offerId/financials/recalculate
 */
async function recalculateOfferFinancials(req, res, next) {
  try {
    const offer = await commissionService.calculateOfferCommissions(
      req.params.offerId,
      'manual'
    );
    res.status(200).json(offer);
  } catch (error) {
    next(error);
  }
}

/**
 * Record payment to an agent
 * @route POST /offers/:offerId/financials/agent-payments
 */
async function recordAgentPayment(req, res, next) {
  try {
    const { agent_id, agent_type, amount } = req.body;
    
    if (!agent_type || !['primary', 'split', 'inbound'].includes(agent_type)) {
      return res.status(400).json({ 
        error: 'agent_type must be primary, split, or inbound' 
      });
    }
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Amount must be positive' });
    }
    
    const offer = await commissionService.recordAgentPayment(
      req.params.offerId,
      agent_id,
      agent_type,
      amount,
      req.user._id
    );
    res.status(201).json(offer);
  } catch (error) {
    next(error);
  }
}

// ========================================
// BALANCE SHEET / AGENT SUMMARY ENDPOINTS
// ========================================

/**
 * Get agent's offers with commissions (balance sheet)
 * @route GET /commissions/agents/:agentId/offers
 */
async function getAgentOffers(req, res, next) {
  try {
    const result = await commissionService.getAgentOffers(
      req.params.agentId,
      req.query
    );
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Get agent commission summary
 * @route GET /commissions/agents/:agentId/summary
 */
async function getAgentCommissionSummary(req, res, next) {
  try {
    const summary = await commissionService.getAgentCommissionSummary(
      req.params.agentId
    );
    res.status(200).json(summary);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  // Offer Financials
  getOfferFinancials,
  getAllOffersWithFinancials,
  initializeFinancials,
  updateInvestmentAmounts,
  addCustomerPayment,
  updateCustomerPayment,
  deleteCustomerPayment,
  overridePrimaryAgentPercentage,
  overrideBankPercentage,
  addSplitAgent,
  removeSplitAgent,
  addInboundAgent,
  removeInboundAgent,
  updateAgentPercentage,
  recalculateOfferFinancials,
  recordAgentPayment,
  
  // Agent Summary
  getAgentOffers,
  getAgentCommissionSummary,
};
