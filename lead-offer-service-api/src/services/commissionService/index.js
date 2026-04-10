/**
 * Commission Service Index
 * Exports all commission-related services
 * Works directly with the Offer model
 * 
 * No CommissionConfig - agent default % is stored in User model
 * Split/Inbound percentages are entered directly per offer
 */

const calculator = require('./calculator');
const { Offer } = require('../../models');
const logger = require('../../utils/logger');

// ========================================
// OFFER FINANCIALS - On Offer model
// ========================================

/**
 * Get offer with financials
 */
async function getOfferFinancials(offerId) {
  const offer = await Offer.findById(offerId)
    .select('title reference_no investment_volume load_and_opening agent_id bank_id financials current_stage createdAt')
    .populate('agent_id', 'login name commission_percentage_opening commission_percentage_load')
    .populate('bank_id', 'name nickName commission_percentage')
    .populate('financials.split_agents.agent_id', 'login name')
    .populate('financials.inbound_agents.agent_id', 'login name')
    .lean();
  
  return offer;
}

/**
 * Get all offers with financials initialized
 */
async function getAllOffersWithFinancials(query = {}) {
  const { 
    category, 
    payment_status,
    agent_id,
    page = 1, 
    limit = 50 
  } = query;
  const skip = (page - 1) * limit;
  
  const dbQuery = {
    active: true,
    'financials.financials_initialized': true,
  };
  
  if (category) dbQuery.load_and_opening = category;
  if (payment_status) dbQuery['financials.payment_summary.payment_status'] = payment_status;
  if (agent_id) {
    dbQuery.$or = [
      { agent_id: agent_id },
      { 'financials.split_agents.agent_id': agent_id },
      { 'financials.inbound_agents.agent_id': agent_id },
    ];
  }
  
  const [offers, total] = await Promise.all([
    Offer.find(dbQuery)
      .select('title reference_no investment_volume load_and_opening agent_id bank_id financials current_stage createdAt')
      .populate('agent_id', 'login name')
      .populate('bank_id', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Offer.countDocuments(dbQuery),
  ]);
  
  return {
    data: offers,
    meta: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
}

// ========================================
// EXPORTS
// ========================================

module.exports = {
  // Calculator functions
  ...calculator,
  
  // Offer Financials
  getOfferFinancials,
  getAllOffersWithFinancials,
};
