/**
 * Entity Date Handler
 * Handles entity-specific date retrieval for context-aware date grouping
 */

const Offer = require('../../../models/Offer');
const Opening = require('../../../models/Opening');
const Confirmation = require('../../../models/Confirmation');
const PaymentVoucher = require('../../../models/PaymentVoucher');
const Netto1 = require('../../../models/Netto1');
const Netto2 = require('../../../models/Netto2');
const logger = require('../../../helpers/logger');

class EntityDateHandler {
  /**
   * Get entity-specific date maps for leads
   * @param {Array} leadIds - Array of lead IDs
   * @param {string} entityContext - Entity context (offer, opening, confirmation, payment, netto)
   * @returns {Promise<Object>} - Maps of lead IDs to entity-specific dates
   */
  async getEntityDateMaps(leadIds, entityContext) {
    const dateMaps = {};

    try {
      logger.info('Getting entity date maps', {
        entityContext,
        leadCount: leadIds.length,
      });

      switch (entityContext) {
        case 'offer':
          return await this._getOfferDateMaps(leadIds);
        case 'opening':
          return await this._getOpeningDateMaps(leadIds);
        case 'confirmation':
          return await this._getConfirmationDateMaps(leadIds);
        case 'payment':
          return await this._getPaymentDateMaps(leadIds);
        case 'netto':
          return await this._getNettoDateMaps(leadIds);
        default:
          return {};
      }
    } catch (error) {
      logger.error('Error getting entity date maps:', error);
      return {};
    }
  }

  /**
   * Get offer date maps
   * @private
   */
  async _getOfferDateMaps(leadIds) {
    const offers = await Offer.find({
      lead_id: { $in: leadIds, $ne: null },
      active: true,
      createdAt: { $ne: null, $exists: true },
    })
      .select('lead_id createdAt updatedAt')
      .lean();

    logger.info('Found offers for date mapping', {
      offerCount: offers.length,
      leadCount: leadIds.length,
    });

    const dateMaps = {
      offer_createdAt: new Map(),
      offer_updatedAt: new Map(),
      offer_assigned_date: new Map(),
    };

    offers.forEach((offer) => {
      if (!offer || typeof offer !== 'object') {
        logger.warn('Invalid offer object in date mapping', { offer });
        return;
      }

      const leadIdStr = offer.lead_id?.toString();
      if (leadIdStr && offer.createdAt) {
        dateMaps.offer_createdAt.set(leadIdStr, offer.createdAt);
        dateMaps.offer_updatedAt.set(leadIdStr, offer.updatedAt || offer.createdAt);
        dateMaps.offer_assigned_date.set(leadIdStr, offer.createdAt);
      }
    });

    return dateMaps;
  }

  /**
   * Get opening date maps
   * @private
   */
  async _getOpeningDateMaps(leadIds) {
    const offersForOpenings = await Offer.find({
      lead_id: { $in: leadIds, $ne: null },
      active: true,
    })
      .select('_id lead_id')
      .lean();

    const offerIds = offersForOpenings.map((o) => o._id);
    const offerLeadMap = new Map(offersForOpenings.map((o) => [o._id.toString(), o.lead_id]));

    const openings = await Opening.find({
      offer_id: { $in: offerIds },
      active: true,
    })
      .select('offer_id createdAt updatedAt')
      .lean();

    const dateMaps = {
      opening_createdAt: new Map(),
      opening_updatedAt: new Map(),
      opening_assigned_date: new Map(),
    };

    openings.forEach((opening) => {
      const leadId = offerLeadMap.get(opening.offer_id.toString());
      if (leadId) {
        const leadIdStr = leadId.toString();
        dateMaps.opening_createdAt.set(leadIdStr, opening.createdAt);
        dateMaps.opening_updatedAt.set(leadIdStr, opening.updatedAt);
        dateMaps.opening_assigned_date.set(leadIdStr, opening.createdAt);
      }
    });

    return dateMaps;
  }

  /**
   * Get confirmation date maps
   * @private
   */
  async _getConfirmationDateMaps(leadIds) {
    const offersForConfirmations = await Offer.find({
      lead_id: { $in: leadIds, $ne: null },
      active: true,
    })
      .select('_id lead_id')
      .lean();

    const offerIds = offersForConfirmations.map((o) => o._id);
    const offerLeadMap = new Map(offersForConfirmations.map((o) => [o._id.toString(), o.lead_id]));

    const confirmations = await Confirmation.find({
      offer_id: { $in: offerIds },
      active: true,
    })
      .select('offer_id createdAt updatedAt')
      .lean();

    const dateMaps = {
      confirmation_createdAt: new Map(),
      confirmation_updatedAt: new Map(),
      confirmation_assigned_date: new Map(),
    };

    confirmations.forEach((confirmation) => {
      const leadId = offerLeadMap.get(confirmation.offer_id.toString());
      if (leadId) {
        const leadIdStr = leadId.toString();
        dateMaps.confirmation_createdAt.set(leadIdStr, confirmation.createdAt);
        dateMaps.confirmation_updatedAt.set(leadIdStr, confirmation.updatedAt);
        dateMaps.confirmation_assigned_date.set(leadIdStr, confirmation.createdAt);
      }
    });

    return dateMaps;
  }

  /**
   * Get payment date maps
   * @private
   */
  async _getPaymentDateMaps(leadIds) {
    const offersForPayments = await Offer.find({
      lead_id: { $in: leadIds, $ne: null },
      active: true,
    })
      .select('_id lead_id')
      .lean();

    const offerIds = offersForPayments.map((o) => o._id);
    const offerLeadMap = new Map(offersForPayments.map((o) => [o._id.toString(), o.lead_id]));

    const payments = await PaymentVoucher.find({
      offer_id: { $in: offerIds },
      active: true,
    })
      .select('offer_id createdAt updatedAt')
      .lean();

    const dateMaps = {
      payment_createdAt: new Map(),
      payment_updatedAt: new Map(),
      payment_assigned_date: new Map(),
    };

    payments.forEach((payment) => {
      const leadId = offerLeadMap.get(payment.offer_id.toString());
      if (leadId) {
        const leadIdStr = leadId.toString();
        dateMaps.payment_createdAt.set(leadIdStr, payment.createdAt);
        dateMaps.payment_updatedAt.set(leadIdStr, payment.updatedAt);
        dateMaps.payment_assigned_date.set(leadIdStr, payment.createdAt);
      }
    });

    return dateMaps;
  }

  /**
   * Get netto date maps
   * @private
   */
  async _getNettoDateMaps(leadIds) {
    const offersForNetto = await Offer.find({
      lead_id: { $in: leadIds, $ne: null },
      active: true,
    })
      .select('_id lead_id')
      .lean();

    const offerIds = offersForNetto.map((o) => o._id);
    const offerLeadMap = new Map(offersForNetto.map((o) => [o._id.toString(), o.lead_id]));

    const [netto1Records, netto2Records] = await Promise.all([
      Netto1.find({
        offer_id: { $in: offerIds },
        active: true,
      })
        .select('offer_id createdAt updatedAt')
        .lean(),
      Netto2.find({
        offer_id: { $in: offerIds },
        active: true,
      })
        .select('offer_id createdAt updatedAt')
        .lean(),
    ]);

    const dateMaps = {
      netto_createdAt: new Map(),
      netto_updatedAt: new Map(),
      netto_assigned_date: new Map(),
    };

    [...netto1Records, ...netto2Records].forEach((netto) => {
      const leadId = offerLeadMap.get(netto.offer_id.toString());
      if (leadId) {
        const leadIdStr = leadId.toString();
        // Use the latest date if multiple netto records exist for the same lead
        if (
          !dateMaps.netto_createdAt.has(leadIdStr) ||
          netto.createdAt > dateMaps.netto_createdAt.get(leadIdStr)
        ) {
          dateMaps.netto_createdAt.set(leadIdStr, netto.createdAt);
          dateMaps.netto_updatedAt.set(leadIdStr, netto.updatedAt);
          dateMaps.netto_assigned_date.set(leadIdStr, netto.createdAt);
        }
      }
    });

    return dateMaps;
  }
}

module.exports = EntityDateHandler;