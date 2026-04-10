/**
 * Offer Import Helper
 * Contains offer creation logic for imports to avoid circular dependencies
 */

const mongoose = require('mongoose');
const { Offer, Lead, Bank, AssignLeads, Team } = require('../../models');
const { updateLeadStageAndStatus } = require('../leadService/utils');
const { AuthorizationError, NotFoundError } = require('../../utils/errorHandler');
const logger = require('../../utils/logger');
const { eventEmitter, EVENT_TYPES } = require('../events');

const OFFER_POPULATE_CONFIG = [
  { path: 'project_id', model: 'Team', select: 'name color_code' },
  { path: 'lead_id', select: 'contact_name lead_source_no current_month' },
  { path: 'agent_id', select: '_id login role color_code' },
  { path: 'payment_terms', select: 'name info' },
  { path: 'bonus_amount', select: 'name info' },
  {
    path: 'bank_id',
    select: 'name nickName iban Ref provider bank_country_flag bank_country_code country logo',
    populate: [
      {
        path: 'provider',
        select: 'name login',
        model: 'User',
      },
      {
        path: 'logo',
        select: 'filetype filename path size type createdAt',
        model: 'Document',
      },
      {
        path: 'bank_country_flag',
        select: 'filetype filename path size type createdAt',
        model: 'Document',
      },
    ],
  },
];

/**
 * Apply standard population to an Offer query
 * @param {Object} query - Mongoose query object
 * @returns {Object} - Query with population applied
 */
const populateOfferQuery = (query) => {
  OFFER_POPULATE_CONFIG.forEach((config) => {
    // Handle nested populate for bank_id with array of populates
    if (config.path === 'bank_id' && Array.isArray(config.populate)) {
      query = query.populate({
        path: config.path,
        select: config.select,
        populate: config.populate.map(p => ({
          ...p,
          options: { strictPopulate: false }
        }))
      });
    } else if (config.path === 'bank_id' && config.populate && config.populate.path === 'provider') {
      // Legacy support for old object format
      query = query.populate({
        ...config,
        populate: {
          ...config.populate,
          options: { strictPopulate: false }
        }
      });
    } else {
      query = query.populate(config);
    }
  });
  return query;
};

/**
 * Create offer for import (simplified version without PDF generation)
 * @param {Object} offerData - Offer data
 * @param {Object} user - User creating the offer
 * @param {Function} hasPermissionFn - Permission checking function
 * @param {Object} permissions - Permission constants
 * @returns {Object} - Created offer
 */
const createOfferForImport = async (offerData, user, hasPermissionFn, permissions) => {
  // Verify user has permission to create offers
  if (!await hasPermissionFn(user.role, permissions.OFFER_CREATE)) {
    throw new AuthorizationError("You don't have permission to create offers");
  }

  // Check if the agent is assigned to the project
  const project = await Team.findById(offerData.project_id).lean();
  if (!project) {
    throw new AuthorizationError('Project not found');
  }

  const agentInProject = project.agents?.find(agent => 
    agent.active && 
    (
      (agent.user && agent.user.toString() === offerData.agent_id.toString()) ||
      (agent.user_id && agent.user_id.toString() === offerData.agent_id.toString())
    )
  );

  if (!agentInProject) {
    throw new AuthorizationError('The agent must be assigned to the project to create an offer');
  }

  // Get the lead data for the activity log
  const lead = await Lead.findById(offerData.lead_id).lean();

  // If Bank ID is provided, Get Bank details
  let bankDetails = null;
  if (offerData.bank_id) {
    bankDetails = await Bank.findById(offerData.bank_id).select('name').lean();
    if (!bankDetails) {
      throw new NotFoundError('Bank not found!');
    }
  }

  // Create a title for the offer
  // Format: "ContactName-InvestmentVolume-BankName"
  const title =
    lead.contact_name +
    ' - ' +
    offerData.investment_volume +
    ' - ' +
    (bankDetails ? bankDetails.name : '');

  offerData.title = title; // Set the title based on lead and investment volume

  // Set the created_by field to track who actually created the offer
  offerData.created_by = user._id;

  // Update the lead's nametitle if provided in the offer data
  if (offerData.nametitle) {
    await Lead.findByIdAndUpdate(
      offerData.lead_id,
      { nametitle: offerData.nametitle },
      { new: true }
    );
  }

  // Create the new offer
  const newOffer = new Offer(offerData);
  await newOffer.save();

  // Get the populated offer
  const offer = await populateOfferQuery(Offer.findById(newOffer._id)).lean();

  // Update the lead's stage to Positiv and status to Angebot only if current stage and status is "New/New"
  try {
    // Get current lead data to check stage and status
    const currentLead = await Lead.findById(offerData.lead_id)
      .populate('stage_id', 'name')
      .populate('status_id', 'name')
      .lean();

    if (currentLead) {
      const currentStage = currentLead.stage_id?.name || currentLead.stage || '';
      const currentStatus = currentLead.status_id?.name || currentLead.status || '';

      // Only update if both stage and status are "New"
      if (currentStage.toLowerCase() === 'new' && currentStatus.toLowerCase() === 'new') {
        const updatedLead = await updateLeadStageAndStatus(offerData.lead_id, 'Positiv', 'Angebot');
        logger.info(`Updated lead stage and status for new offer (was New/New)`, {
          leadId: offerData.lead_id,
          offerId: newOffer._id,
          previousStage: currentStage,
          previousStatus: currentStatus,
          newStage: 'Positiv',
          newStatus: 'Angebot',
        });
      } else {
        logger.info(`Skipped lead stage/status update for offer creation (not New/New)`, {
          leadId: offerData.lead_id,
          offerId: newOffer._id,
          currentStage: currentStage,
          currentStatus: currentStatus,
          message: 'Lead stage/status unchanged - offer created without status update',
        });
      }
    } else {
      logger.warn(`Lead not found when trying to update stage/status for offer`, {
        leadId: offerData.lead_id,
        offerId: newOffer._id,
      });
    }
  } catch (error) {
    logger.error(`Failed to update lead stage and status for new offer`, {
      error,
      leadId: offerData.lead_id,
      offerId: newOffer._id,
    });
    // We don't throw here to avoid failing the offer creation if stage update fails
  }

  // Emit event for activity logging
  eventEmitter.emit(EVENT_TYPES.OFFER.CREATED, {
    offer,
    creator: user,
    lead,
    project,
    bankDetails,
  });

  return offer;
};

module.exports = {
  createOfferForImport,
}; 