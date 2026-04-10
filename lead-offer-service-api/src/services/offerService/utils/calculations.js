/**
 * Offer Service Calculations
 * Contains calculation utilities for offer services
 */

const { logger } = require('../config/dependencies');

/**
 * Calculate Netto amounts based on user role
 * @param {Object} offer - Offer object with financial data
 * @param {string} userRole - User role (agent, admin, banker)
 * @returns {Object} - Calculated amounts based on user role
 */
const calculateNettoAmounts = (offer, userRole) => {
  const investmentVolume = offer.investment_volume || 0;
  
  // Handle different bonus amount structures
  let bonusAmount = 0;
  if (offer.bonus_amount) {
    if (typeof offer.bonus_amount === 'number') {
      bonusAmount = offer.bonus_amount;
    } else if (offer.bonus_amount.info && typeof offer.bonus_amount.info.amount === 'number') {
      bonusAmount = offer.bonus_amount.info.amount;
    } else if (typeof offer.bonus_amount.info === 'number') {
      bonusAmount = offer.bonus_amount.info;
    }
  }
  
  const bankerRate = offer.bankerRate || 0;
  const agentRate = offer.agentRate || 0;

  // Calculate base amount (investment - bonus)
  const baseAmount = investmentVolume - bonusAmount;
  
  // Log calculation details for debugging
  logger.debug('Netto calculation details', {
    investmentVolume,
    bonusAmount,
    baseAmount,
    agentRate,
    bankerRate,
    userRole
  });
  
  // Calculate shares (handle negative base amounts)
  const agentShare = Math.round((baseAmount * agentRate) / 100);
  const bankShare = Math.round((baseAmount * bankerRate) / 100);
  const totalRevenue = baseAmount - agentShare - bankShare;

  // Role-based calculations
  switch (userRole.toLowerCase()) {
    case 'agent':
      return {
        agentShare,
        revenue: baseAmount - agentShare, // Agent sees their cut + remaining
        visibleAmounts: ['agentShare', 'revenue'],
        calculationBase: {
          investmentVolume,
          bonusAmount,
          baseAmount,
          agentRate,
        },
      };

    case 'admin':
      return {
        agentShare,
        bankShare,
        revenue: totalRevenue,
        visibleAmounts: ['agentShare', 'bankShare', 'revenue'],
        calculationBase: {
          investmentVolume,
          bonusAmount,
          baseAmount,
          agentRate,
          bankerRate,
        },
      };

    case 'banker':
      return {
        bankShare,
        revenue: baseAmount - bankShare, // Banker sees their cut + remaining
        visibleAmounts: ['bankShare', 'revenue'],
        calculationBase: {
          investmentVolume,
          bonusAmount,
          baseAmount,
          bankerRate,
        },
      };

    default:
      // Default to admin view for unknown roles
      return {
        agentShare,
        bankShare,
        revenue: totalRevenue,
        visibleAmounts: ['agentShare', 'bankShare', 'revenue'],
        calculationBase: {
          investmentVolume,
          bonusAmount,
          baseAmount,
          agentRate,
          bankerRate,
        },
      };
  }
};

module.exports = {
  calculateNettoAmounts,
}; 