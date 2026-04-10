/**
 * Commission Calculator Service
 * Handles all commission calculations directly on the Offer model
 * 
 * KEY PRINCIPLE: All percentages are calculated on the same BASE (customer payment)
 * - Bank takes X% of customer payment
 * - Primary agent takes Y% of customer payment (default from User model)
 * - Split agents take Z% of customer payment (entered per offer)
 * - Inbound agents take W% of customer payment (entered per offer)
 * - Company revenue = Customer payment - Bank - All Commissions
 */

const mongoose = require('mongoose');
const { Offer, User } = require('../../models');
const logger = require('../../utils/logger');
const cashflowIntegration = require('../cashflowIntegration');

/**
 * Calculate payment status based on amounts
 */
function getPaymentStatus(received, expected) {
  if (received === 0) return 'pending';
  if (received < expected) return 'partial';
  if (received === expected) return 'complete';
  return 'overpaid';
}

/**
 * Validate total percentages don't exceed 100%
 */
function validatePercentages(financials) {
  const bankPct = financials?.bank_commission?.percentage || 0;
  const primaryPct = financials?.primary_agent_commission?.percentage || 0;
  
  let splitTotal = 0;
  if (financials?.split_agents) {
    splitTotal = financials.split_agents.reduce((sum, a) => sum + (a.percentage || 0), 0);
  }
  
  let inboundTotal = 0;
  if (financials?.inbound_agents) {
    inboundTotal = financials.inbound_agents.reduce((sum, a) => sum + (a.percentage || 0), 0);
  }
  
  const totalPercentage = bankPct + primaryPct + splitTotal + inboundTotal;
  
  return {
    total_percentage: totalPercentage,
    is_valid: totalPercentage <= 100,
    validation_message: totalPercentage > 100 
      ? `Total percentages (${totalPercentage.toFixed(2)}%) exceed 100%`
      : null,
    breakdown: {
      bank: bankPct,
      primary_agent: primaryPct,
      split_agents: splitTotal,
      inbound_agents: inboundTotal,
    },
  };
}

/**
 * Main calculation function
 * Recalculates all financial data for an offer
 * 
 * @param {ObjectId|String} offerId - Offer ID
 * @param {String} triggeredBy - What triggered this calculation
 * @returns {Object} Updated Offer document
 */
async function calculateOfferCommissions(offerId, triggeredBy = 'manual') {
  const offer = await Offer.findById(offerId);
  
  if (!offer) {
    throw new Error(`Offer not found: ${offerId}`);
  }
  
  if (!offer.financials?.financials_initialized) {
    throw new Error(`Financials not initialized for offer: ${offerId}. Call initializeFinancials first.`);
  }
  
  const financials = offer.financials;
  
  logger.debug('Starting commission calculation', {
    offerId,
    triggeredBy,
    category: offer.load_and_opening,
  });
  
  // ========================================
  // STEP 1: Calculate payment summary
  // ========================================
  const totalReceived = (financials.customer_payments || []).reduce(
    (sum, payment) => sum + (payment.amount || 0), 
    0
  );
  const expectedFromCustomer = financials.expected_from_customer || 0;
  
  financials.payment_summary = {
    total_received: totalReceived,
    balance_due: Math.max(0, expectedFromCustomer - totalReceived),
    overpayment: Math.max(0, totalReceived - expectedFromCustomer),
    payment_status: getPaymentStatus(totalReceived, expectedFromCustomer),
    last_payment_date: financials.customer_payments?.length > 0 
      ? financials.customer_payments[financials.customer_payments.length - 1].payment_date
      : null,
  };
  
  // BASE amounts for all percentage calculations
  const expectedBase = expectedFromCustomer;  // Full expected payment
  const actualBase = totalReceived;           // Actual received payment
  
  logger.debug('Payment summary calculated', {
    expectedBase,
    actualBase,
    paymentStatus: financials.payment_summary.payment_status,
  });
  
  // ========================================
  // STEP 2: Calculate bank deduction (on BASE)
  // ========================================
  const bankPct = financials.bank_commission?.percentage || 0;
  financials.bank_commission.expected_amount = expectedBase * (bankPct / 100);
  financials.bank_commission.actual_amount = actualBase * (bankPct / 100);
  
  // ========================================
  // STEP 3: Calculate primary agent commission (on BASE)
  // ========================================
  const primaryPct = financials.primary_agent_commission?.percentage || 0;
  financials.primary_agent_commission.expected_amount = expectedBase * (primaryPct / 100);
  financials.primary_agent_commission.actual_amount = actualBase * (primaryPct / 100);
  
  let totalExpectedCommissions = financials.primary_agent_commission.expected_amount;
  let totalActualCommissions = financials.primary_agent_commission.actual_amount;
  
  // ========================================
  // STEP 4: Calculate split agent commissions (on BASE)
  // ========================================
  if (financials.has_split && financials.split_agents?.length > 0) {
    for (let splitAgent of financials.split_agents) {
      splitAgent.expected_amount = expectedBase * (splitAgent.percentage / 100);
      splitAgent.actual_amount = actualBase * (splitAgent.percentage / 100);
      
      totalExpectedCommissions += splitAgent.expected_amount;
      totalActualCommissions += splitAgent.actual_amount;
    }
  }
  
  // ========================================
  // STEP 5: Calculate inbound agent commissions (on BASE)
  // ========================================
  if (financials.has_inbound && financials.inbound_agents?.length > 0) {
    for (let inboundAgent of financials.inbound_agents) {
      inboundAgent.expected_amount = expectedBase * (inboundAgent.percentage / 100);
      inboundAgent.actual_amount = actualBase * (inboundAgent.percentage / 100);
      
      totalExpectedCommissions += inboundAgent.expected_amount;
      totalActualCommissions += inboundAgent.actual_amount;
    }
  }
  
  // ========================================
  // STEP 6: Calculate company revenue
  // Company Revenue = Base - Bank Deduction - All Commissions
  // ========================================
  financials.net_amounts = {
    total_expected_commissions: totalExpectedCommissions,
    total_actual_commissions: totalActualCommissions,
    expected_company_revenue: expectedBase - 
      financials.bank_commission.expected_amount - 
      totalExpectedCommissions,
    actual_company_revenue: actualBase - 
      financials.bank_commission.actual_amount - 
      totalActualCommissions,
  };
  
  // ========================================
  // STEP 7: Validate percentages
  // ========================================
  financials.validation = validatePercentages(financials);
  financials.last_calculated_at = new Date();
  
  // Save the offer
  offer.markModified('financials');
  await offer.save();
  
  logger.info('Commission calculation completed', {
    offerId,
    triggeredBy,
    expectedRevenue: financials.net_amounts.expected_company_revenue,
    actualRevenue: financials.net_amounts.actual_company_revenue,
    isValid: financials.validation.is_valid,
  });
  
  return offer;
}

/**
 * Initialize financials for an offer
 * Gets default agent percentage from User model
 * Auto-reads bonus from Settings and deducts from investment
 */
async function initializeFinancials(offerId, initData = {}, userId = null) {
  const offer = await Offer.findById(offerId)
    .populate('bank_id', 'commission_percentage')
    .populate('agent_id', 'commission_percentage_opening commission_percentage_load')
    .populate('bonus_amount', 'name info'); // Populate bonus from Settings
  
  if (!offer) {
    throw new Error(`Offer not found: ${offerId}`);
  }
  
  // Don't re-initialize if already done
  if (offer.financials?.financials_initialized) {
    logger.warn('Financials already initialized for offer', { offerId });
    return offer;
  }
  
  const {
    investment_total,
    bonus_value,
    bank_percentage,
    agent_percentage,
  } = initData;
  
  // Use provided values or defaults from offer
  const investmentTotal = investment_total || offer.investment_volume || 0;
  
  // Get bonus value: from initData > from Settings.info.amount > 0
  // Settings stores bonus as: { info: { amount: 100 } }
  let bonusValue = bonus_value;
  if (bonusValue === undefined) {
    bonusValue = offer.bonus_amount?.info?.amount || 0;
  }
  
  // ALWAYS deduct bonus from investment to get expected_from_customer
  const expectedFromCustomer = investmentTotal - bonusValue;
  
  logger.info('Initializing financials with bonus deduction', {
    offerId,
    investmentTotal,
    bonusValue,
    expectedFromCustomer,
  });
  
  // Get bank percentage from bank model or from initData
  let bankPct = bank_percentage;
  if (bankPct === undefined && offer.bank_id?.commission_percentage !== undefined) {
    bankPct = offer.bank_id.commission_percentage;
  }
  bankPct = bankPct || 0;
  
  // Get agent percentage from User model based on offer category (opening/load)
  // or from initData if explicitly provided
  let agentPct = agent_percentage;
  if (agentPct === undefined && offer.agent_id) {
    const category = offer.load_and_opening || 'opening';
    if (category === 'load') {
      agentPct = offer.agent_id.commission_percentage_load;
    } else {
      agentPct = offer.agent_id.commission_percentage_opening;
    }
  }
  agentPct = agentPct || 0;
  
  // Initialize the financials object
  offer.financials = {
    investment_total: investmentTotal,
    bonus_value: bonusValue,
    expected_from_customer: expectedFromCustomer,
    customer_payments: [],
    payment_summary: {
      total_received: 0,
      balance_due: expectedFromCustomer,
      overpayment: 0,
      payment_status: 'pending',
    },
    bank_commission: {
      percentage: bankPct,
      is_overridden: false,
      original_percentage: bankPct,
      expected_amount: 0,
      actual_amount: 0,
    },
    primary_agent_commission: {
      percentage: agentPct,
      is_overridden: false,
      original_percentage: agentPct,
      expected_amount: 0,
      actual_amount: 0,
      paid_amount: 0,
      payment_status: 'pending',
    },
    has_split: false,
    split_agents: [],
    has_inbound: false,
    inbound_agents: [],
    net_amounts: {
      total_expected_commissions: 0,
      total_actual_commissions: 0,
      expected_company_revenue: 0,
      actual_company_revenue: 0,
    },
    validation: {
      total_percentage: 0,
      is_valid: true,
    },
    last_calculated_at: null,
    financials_initialized: true,
  };
  
  offer.markModified('financials');
  await offer.save();
  
  // Run initial calculation
  return calculateOfferCommissions(offerId, 'initial');
}

/**
 * Get or initialize financials for an offer
 * This is the safe way to access financials - it auto-initializes if needed
 */
async function getOrInitializeFinancials(offerId, initData = {}) {
  const offer = await Offer.findById(offerId);
  
  if (!offer) {
    throw new Error(`Offer not found: ${offerId}`);
  }
  
  if (!offer.financials?.financials_initialized) {
    return initializeFinancials(offerId, initData);
  }
  
  return offer;
}

/**
 * Add a customer payment and recalculate
 * Creates cashflow entry on first payment, adds deposit transaction for EVERY payment
 * 
 * @param {string} offerId - Offer ID
 * @param {Object} paymentData - Payment data (amount, payment_date, etc.)
 * @param {string} userId - User recording the payment
 * @param {Object} [options] - Additional options
 * @param {boolean} [options.skipCashflow] - Skip cashflow operations (default: false)
 */
async function addCustomerPayment(offerId, paymentData, userId, options = {}) {
  const offer = await getOrInitializeFinancials(offerId);
  
  // Check if this is the first payment (need to create cashflow entry)
  const isFirstPayment = !offer.financials.customer_payments || 
                         offer.financials.customer_payments.length === 0;
  const needsCashflowEntry = isFirstPayment && !offer.in_cashflow;
  
  // Add the payment
  offer.financials.customer_payments.push({
    ...paymentData,
    recorded_by: userId,
    created_at: new Date(),
  });
  
  offer.markModified('financials');
  await offer.save();
  
  // Recalculate commissions
  const updatedOffer = await calculateOfferCommissions(offerId, 'payment_received');
  
  // Handle cashflow operations (unless skipped)
  if (!options.skipCashflow) {
    try {
      // Step 1: Create cashflow entry if first payment
      if (needsCashflowEntry) {
        logger.info('First payment received, creating cashflow entry', {
          offerId,
          paymentAmount: paymentData.amount,
          userId,
        });
        
        const cashflowAmount = offer.financials.expected_from_customer || 
                              offer.investment_volume || 
                              paymentData.amount;
        
        const entryResult = await cashflowIntegration.createCashflowEntry({
          offerId: offerId.toString(),
          amount: cashflowAmount,
          currency: paymentData.currency || 'EUR',
          notes: `Created on first payment`,
          userId: userId.toString(),
        });
        
        if (entryResult && entryResult.success) {
          logger.info('Cashflow entry created', {
            offerId,
            cashflowEntryId: entryResult.data._id,
          });
        }
      }
      
      // Step 2: Add deposit transaction for THIS payment (every payment gets a transaction)
      logger.info('Adding cashflow deposit for payment', {
        offerId,
        paymentAmount: paymentData.amount,
        userId,
      });
      
      const depositResult = await cashflowIntegration.addCashflowDeposit({
        offerId: offerId.toString(),
        paymentAmount: paymentData.amount,
        currency: paymentData.currency || 'EUR',
        paymentMethod: paymentData.payment_method,
        notes: `Payment: €${paymentData.amount} via ${paymentData.payment_method || 'bank_transfer'}`,
        userId: userId.toString(),
      });
      
      if (depositResult && depositResult.success) {
        logger.info('Cashflow deposit transaction created', {
          offerId,
          transactionId: depositResult.data._id,
          amount: paymentData.amount,
        });
      } else {
        logger.warn('Cashflow deposit creation failed', { offerId });
      }
      
    } catch (cashflowError) {
      // Don't fail the payment operation if cashflow creation fails
      logger.error('Failed to process cashflow (non-fatal)', {
        offerId,
        error: cashflowError.message,
      });
    }
  }
  
  return updatedOffer;
}

/**
 * Update an existing customer payment and recalculate
 */
async function updateCustomerPayment(offerId, paymentId, paymentData, userId) {
  const offer = await getOrInitializeFinancials(offerId);
  
  // Find the payment by _id
  const paymentIndex = offer.financials.customer_payments.findIndex(
    p => p._id && p._id.toString() === paymentId
  );
  
  if (paymentIndex === -1) {
    throw new Error('Payment not found');
  }
  
  // Update the payment fields
  const existingPayment = offer.financials.customer_payments[paymentIndex];
  if (paymentData.amount !== undefined) existingPayment.amount = paymentData.amount;
  if (paymentData.payment_date !== undefined) existingPayment.payment_date = paymentData.payment_date;
  if (paymentData.payment_method !== undefined) existingPayment.payment_method = paymentData.payment_method;
  if (paymentData.reference !== undefined) existingPayment.reference = paymentData.reference;
  if (paymentData.notes !== undefined) existingPayment.notes = paymentData.notes;
  existingPayment.updated_by = userId;
  existingPayment.updated_at = new Date();
  
  offer.markModified('financials');
  await offer.save();
  
  // Recalculate
  return calculateOfferCommissions(offerId, 'payment_updated');
}

/**
 * Delete a customer payment and recalculate
 */
async function deleteCustomerPayment(offerId, paymentId, userId) {
  const offer = await getOrInitializeFinancials(offerId);
  
  // Find and remove the payment by _id
  const paymentIndex = offer.financials.customer_payments.findIndex(
    p => p._id && p._id.toString() === paymentId
  );
  
  if (paymentIndex === -1) {
    throw new Error('Payment not found');
  }
  
  // Remove the payment
  offer.financials.customer_payments.splice(paymentIndex, 1);
  
  offer.markModified('financials');
  await offer.save();
  
  // Recalculate
  return calculateOfferCommissions(offerId, 'payment_deleted');
}

/**
 * Update investment amounts
 */
async function updateInvestmentAmounts(offerId, investmentData, userId) {
  const offer = await getOrInitializeFinancials(offerId);
  
  if (investmentData.investment_total !== undefined) {
    offer.financials.investment_total = investmentData.investment_total;
  }
  if (investmentData.bonus_value !== undefined) {
    offer.financials.bonus_value = investmentData.bonus_value;
  }
  
  // Recalculate expected from customer
  offer.financials.expected_from_customer = 
    offer.financials.investment_total - offer.financials.bonus_value;
  
  offer.markModified('financials');
  await offer.save();
  
  // Recalculate
  return calculateOfferCommissions(offerId, 'manual');
}

/**
 * Override primary agent percentage
 */
async function overridePrimaryAgentPercentage(offerId, newPercentage, userId) {
  const offer = await getOrInitializeFinancials(offerId);
  
  // Store original if not already overridden
  if (!offer.financials.primary_agent_commission.is_overridden) {
    offer.financials.primary_agent_commission.original_percentage = 
      offer.financials.primary_agent_commission.percentage;
  }
  
  offer.financials.primary_agent_commission.percentage = newPercentage;
  offer.financials.primary_agent_commission.is_overridden = true;
  
  offer.markModified('financials');
  await offer.save();
  
  // Recalculate
  return calculateOfferCommissions(offerId, 'rate_change');
}

/**
 * Override bank percentage
 */
async function overrideBankPercentage(offerId, newPercentage, userId) {
  const offer = await getOrInitializeFinancials(offerId);
  
  // Store original if not already overridden
  if (!offer.financials.bank_commission.is_overridden) {
    offer.financials.bank_commission.original_percentage = 
      offer.financials.bank_commission.percentage;
  }
  
  offer.financials.bank_commission.percentage = newPercentage;
  offer.financials.bank_commission.is_overridden = true;
  
  offer.markModified('financials');
  await offer.save();
  
  // Recalculate
  return calculateOfferCommissions(offerId, 'rate_change');
}

/**
 * Add a split agent (percentage entered directly)
 */
async function addSplitAgent(offerId, agentData, userId) {
  const offer = await getOrInitializeFinancials(offerId);
  
  // Check if agent already exists
  const existingAgent = offer.financials.split_agents.find(
    a => a.agent_id.toString() === agentData.agent_id.toString()
  );
  
  if (existingAgent) {
    throw new Error('This agent is already a split agent for this offer');
  }
  
  // Add the split agent with percentage provided directly
  offer.financials.split_agents.push({
    agent_id: agentData.agent_id,
    percentage: agentData.percentage, // Must be provided
    is_overridden: false,
    reason: agentData.reason || 'Split commission',
    added_by: userId,
    added_at: new Date(),
  });
  
  offer.financials.has_split = true;
  
  offer.markModified('financials');
  await offer.save();
  
  // Recalculate
  return calculateOfferCommissions(offerId, 'agent_added');
}

/**
 * Remove a split agent
 */
async function removeSplitAgent(offerId, agentId, userId) {
  const offer = await getOrInitializeFinancials(offerId);
  
  // Remove the agent
  offer.financials.split_agents = offer.financials.split_agents.filter(
    a => a.agent_id.toString() !== agentId.toString()
  );
  
  offer.financials.has_split = offer.financials.split_agents.length > 0;
  
  offer.markModified('financials');
  await offer.save();
  
  // Recalculate
  return calculateOfferCommissions(offerId, 'agent_removed');
}

/**
 * Add an inbound agent (percentage entered directly)
 */
async function addInboundAgent(offerId, agentData, userId) {
  const offer = await getOrInitializeFinancials(offerId);
  
  // Check if agent already exists
  const existingAgent = offer.financials.inbound_agents.find(
    a => a.agent_id.toString() === agentData.agent_id.toString()
  );
  
  if (existingAgent) {
    throw new Error('This agent is already an inbound agent for this offer');
  }
  
  // Add the inbound agent with percentage provided directly
  offer.financials.inbound_agents.push({
    agent_id: agentData.agent_id,
    percentage: agentData.percentage, // Must be provided
    is_overridden: false,
    reason: agentData.reason || 'Inbound commission',
    added_by: userId,
    added_at: new Date(),
  });
  
  offer.financials.has_inbound = true;
  
  offer.markModified('financials');
  await offer.save();
  
  // Recalculate
  return calculateOfferCommissions(offerId, 'agent_added');
}

/**
 * Remove an inbound agent
 */
async function removeInboundAgent(offerId, agentId, userId) {
  const offer = await getOrInitializeFinancials(offerId);
  
  // Remove the agent
  offer.financials.inbound_agents = offer.financials.inbound_agents.filter(
    a => a.agent_id.toString() !== agentId.toString()
  );
  
  offer.financials.has_inbound = offer.financials.inbound_agents.length > 0;
  
  offer.markModified('financials');
  await offer.save();
  
  // Recalculate
  return calculateOfferCommissions(offerId, 'agent_removed');
}

/**
 * Update split/inbound agent percentage
 */
async function updateAgentPercentage(offerId, agentId, agentType, newPercentage, userId) {
  const offer = await getOrInitializeFinancials(offerId);
  
  const agentArray = agentType === 'split' 
    ? offer.financials.split_agents 
    : offer.financials.inbound_agents;
    
  const agent = agentArray.find(a => a.agent_id.toString() === agentId.toString());
  
  if (!agent) {
    throw new Error(`Agent not found in ${agentType} agents`);
  }
  
  // Store original if not already overridden
  if (!agent.is_overridden) {
    agent.original_percentage = agent.percentage;
  }
  
  agent.percentage = newPercentage;
  agent.is_overridden = true;
  
  offer.markModified('financials');
  await offer.save();
  
  // Recalculate
  return calculateOfferCommissions(offerId, 'rate_change');
}

/**
 * Record commission payment to an agent
 */
async function recordAgentPayment(offerId, agentId, agentType, paymentAmount, userId) {
  const offer = await getOrInitializeFinancials(offerId);
  
  let agent;
  if (agentType === 'primary') {
    agent = offer.financials.primary_agent_commission;
  } else if (agentType === 'split') {
    agent = offer.financials.split_agents.find(
      a => a.agent_id.toString() === agentId.toString()
    );
  } else if (agentType === 'inbound') {
    agent = offer.financials.inbound_agents.find(
      a => a.agent_id.toString() === agentId.toString()
    );
  }
  
  if (!agent) {
    throw new Error(`Agent not found`);
  }
  
  agent.paid_amount = (agent.paid_amount || 0) + paymentAmount;
  
  if (agent.paid_amount >= agent.actual_amount) {
    agent.payment_status = 'paid';
  } else if (agent.paid_amount > 0) {
    agent.payment_status = 'partial';
  }
  
  offer.markModified('financials');
  await offer.save();
  
  return offer;
}

/**
 * Get offers with financials for an agent (for balance sheet)
 */
async function getAgentOffers(agentId, options = {}) {
  const { 
    page = 1, 
    limit = 50,
    payment_status,
    commission_type, // 'primary', 'split', 'inbound', 'all'
  } = options;
  
  const skip = (page - 1) * limit;
  
  // Build query based on commission type
  let query = {
    active: true,
    'financials.financials_initialized': true,
  };
  
  if (!commission_type || commission_type === 'all') {
    query.$or = [
      { agent_id: agentId },
      { 'financials.split_agents.agent_id': agentId },
      { 'financials.inbound_agents.agent_id': agentId },
    ];
  } else if (commission_type === 'primary') {
    query.agent_id = agentId;
  } else if (commission_type === 'split') {
    query['financials.split_agents.agent_id'] = agentId;
  } else if (commission_type === 'inbound') {
    query['financials.inbound_agents.agent_id'] = agentId;
  }
  
  const [offers, total] = await Promise.all([
    Offer.find(query)
      .select('title reference_no investment_volume load_and_opening agent_id financials current_stage createdAt')
      .populate('agent_id', 'login name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Offer.countDocuments(query),
  ]);
  
  return {
    data: offers,
    meta: { total, page, limit, pages: Math.ceil(total / limit) },
  };
}

/**
 * Get agent commission summary
 */
async function getAgentCommissionSummary(agentId) {
  const result = await Offer.aggregate([
    {
      $match: {
        active: true,
        'financials.financials_initialized': true,
        $or: [
          { agent_id: new mongoose.Types.ObjectId(agentId) },
          { 'financials.split_agents.agent_id': new mongoose.Types.ObjectId(agentId) },
          { 'financials.inbound_agents.agent_id': new mongoose.Types.ObjectId(agentId) },
        ],
      },
    },
    {
      $group: {
        _id: null,
        total_offers: { $sum: 1 },
        // Primary agent stats
        primary_expected: {
          $sum: {
            $cond: [
              { $eq: ['$agent_id', new mongoose.Types.ObjectId(agentId)] },
              '$financials.primary_agent_commission.expected_amount',
              0,
            ],
          },
        },
        primary_actual: {
          $sum: {
            $cond: [
              { $eq: ['$agent_id', new mongoose.Types.ObjectId(agentId)] },
              '$financials.primary_agent_commission.actual_amount',
              0,
            ],
          },
        },
        primary_paid: {
          $sum: {
            $cond: [
              { $eq: ['$agent_id', new mongoose.Types.ObjectId(agentId)] },
              '$financials.primary_agent_commission.paid_amount',
              0,
            ],
          },
        },
      },
    },
  ]);
  
  return result[0] || {
    total_offers: 0,
    primary_expected: 0,
    primary_actual: 0,
    primary_paid: 0,
  };
}

module.exports = {
  calculateOfferCommissions,
  initializeFinancials,
  getOrInitializeFinancials,
  addCustomerPayment,
  updateCustomerPayment,
  deleteCustomerPayment,
  updateInvestmentAmounts,
  overridePrimaryAgentPercentage,
  overrideBankPercentage,
  addSplitAgent,
  removeSplitAgent,
  addInboundAgent,
  removeInboundAgent,
  updateAgentPercentage,
  recordAgentPayment,
  getAgentOffers,
  getAgentCommissionSummary,
  validatePercentages,
};
