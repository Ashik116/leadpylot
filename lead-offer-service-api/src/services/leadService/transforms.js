/**
 * Lead Service Transforms
 * Functions for transforming lead data and related entities
 */

/**
 * Formats revenue value to display in "k" format for thousands
 * @param {number} revenue - Revenue value to format
 * @returns {string|number} - Formatted revenue (e.g., "10k", "10.05k") or original value if less than 1000
 */
const formatRevenue = (revenue) => {
  if (revenue === null || revenue === undefined || revenue < 1000) {
    return revenue;
  }

  const revenueInK = revenue / 1000;

  // If it's a whole number, show without decimals
  if (revenueInK % 1 === 0) {
    return `${revenueInK}k`;
  }

  // Otherwise, show with up to 2 decimal places, removing trailing zeros
  return `${parseFloat(revenueInK.toFixed(2))}k`;
};

/**
 * Processes a lead with stage and status information
 * @param {Object} lead - Lead object
 * @param {Object} stageMap - Map of stages by ID
 * @param {Object} statusMap - Map of statuses by ID
 * @returns {Object} - Processed lead with stage and status information
 */
const processLeadWithStageAndStatus = (lead, stageMap, statusMap) => {
  // Add stage and status information
  const stageInfo = lead.stage_id ? stageMap[lead.stage_id.toString()] : null;
  const statusInfo = lead.status_id ? statusMap[lead.status_id.toString()] : null;

  // Create a new lead object without stage_id and status_id
  const { stage_id, status_id, ...leadWithoutIds } = lead;

  return {
    ...leadWithoutIds,
    // Format expected_revenue
    expected_revenue: formatRevenue(leadWithoutIds.expected_revenue),
    // Ensure offer_calls always has a default value of 0
    offer_calls: leadWithoutIds.offer_calls !== undefined && leadWithoutIds.offer_calls !== null ? leadWithoutIds.offer_calls : 0,
    // Add stage and status information
    stage: stageInfo
      ? {
          id: stageInfo.id,
          name: stageInfo.name,
          isWonStage: stageInfo.isWonStage,
        }
      : null,
    status: statusInfo
      ? {
          id: statusInfo.id,
          name: statusInfo.name,
          code: statusInfo.code,
        }
      : lead.status || null, // Preserve existing status if statusMap is empty
  };
};

/**
 * Attaches openings with confirmations and payment vouchers to offers
 * @param {Array} offers - Array of offers
 * @param {Object} openingsByOfferId - Map of openings by offer ID
 * @param {Object} confirmationsByOpeningId - Map of confirmations by opening ID
 * @param {Object} paymentVouchersByConfirmationId - Map of payment vouchers by confirmation ID
 * @param {boolean} preserveOriginalFormat - If true, keep original format (bank_id, numeric investment_volume). If false, transform (bank, string investment_volume)
 * @returns {Array} - Transformed offers with openings, confirmations, and payment vouchers attached
 */
const attachOpeningsToOffers = (
  offers,
  openingsByOfferId,
  confirmationsByOpeningId = {},
  paymentVouchersByConfirmationId = {},
  preserveOriginalFormat = false
) => {
  return offers.map((offer) => {
    const opening = openingsByOfferId[offer._id.toString()];

    // If opening exists, attach confirmation with its payment voucher
    let enrichedOpening = null;
    if (opening) {
      const confirmation = confirmationsByOpeningId[opening._id.toString()];

      // If confirmation exists, attach payment voucher to it
      let enrichedConfirmation = null;
      if (confirmation) {
        const paymentVoucher = paymentVouchersByConfirmationId[confirmation._id.toString()];
        enrichedConfirmation = {
          ...confirmation,
          paymentVoucher: paymentVoucher || null,
        };
      }

      enrichedOpening = {
        ...opening,
        confirmation: enrichedConfirmation,
      };
    }

    // Transform document files if they exist
    let transformedFiles = [];
    if (offer.files && Array.isArray(offer.files)) {
      transformedFiles = offer.files.map(fileObj => {
        if (fileObj.document) {
          // Extract document details and assignment information
          const doc = fileObj.document;
          
          // Find the assignment for this offer if it exists
          const assignment = doc.assignments && Array.isArray(doc.assignments) 
            ? doc.assignments.find(a => 
                a.entity_type === 'offer' && 
                a.entity_id.toString() === offer._id.toString() && 
                a.active
              )
            : null;
            
          return {
            _id: doc._id,
            filename: doc.filename,
            filetype: doc.filetype,
            size: doc.size,
            type: doc.type,
            assigned_at: assignment ? assignment.assigned_at : null,
            source: assignment ? 'reverse_reference' : 'forward_reference'
          };
        }
        return fileObj; // If document is not populated, return as is
      });
    }
    
    // Transform the offer object
    const transformedOffer = {
      ...offer,
      // Extract Month from payment_terms
      payment_terms: offer.payment_terms
        ? {
            ...offer.payment_terms,
            Month: offer.payment_terms.info?.Month || offer.payment_terms.info?.month || null,
          }
        : null,
      // Extract Amount from bonus_amount
      bonus_amount: offer.bonus_amount
        ? {
            ...offer.bonus_amount,
            Amount: offer.bonus_amount.info?.Amount || offer.bonus_amount.info?.amount || null,
          }
        : null,
      // Add opening with confirmation and payment voucher
      opening: enrichedOpening,
      // Replace files with transformed files
      files: transformedFiles
    };

    // Helper function to convert populated object to string ID
    const convertToId = (field) => {
      if (field && typeof field === 'object' && field._id) {
        return field._id.toString();
      }
      return field;
    };

    if (preserveOriginalFormat) {
      // For top-level offers: keep original format
      // Keep bank_id, keep numeric investment_volume
      // Convert populated fields to string IDs if they are objects
      transformedOffer.agent_id = convertToId(transformedOffer.agent_id);
      transformedOffer.created_by = convertToId(transformedOffer.created_by);
      transformedOffer.project_id = convertToId(transformedOffer.project_id);
      return transformedOffer;
    } else {
      // For agent offers: transform format
      // Format investment_volume using formatRevenue function
      transformedOffer.investment_volume = formatRevenue(offer.investment_volume);
      // Extract bank from bank_id
      if (offer.bank_id) {
        transformedOffer.bank = offer.bank_id;
      }
      // Remove the original bank_id field
      if (transformedOffer.bank_id) {
        delete transformedOffer.bank_id;
      }
      // Convert populated fields to string IDs if they are objects
      transformedOffer.agent_id = convertToId(transformedOffer.agent_id);
      transformedOffer.created_by = convertToId(transformedOffer.created_by);
      transformedOffer.project_id = convertToId(transformedOffer.project_id);
      return transformedOffer;
    }
  });
};

/**
 * Flattens leads based on the state filter to create separate lead objects for each item
 * @param {Array} leads - Array of processed leads
 * @param {string} state - State filter ('offer', 'opening', 'confirmation', 'payment')
 * @returns {Array} - Flattened array where each item gets its own lead object
 */
const flattenLeadsByState = (leads, state) => {
  if (!state || !['offer', 'opening', 'confirmation', 'payment'].includes(state)) {
    return leads; // Return original structure if no valid state filter
  }

  const flattenedLeads = [];

  leads.forEach((lead) => {
    // Handle different data structures: getAllLeads vs getMyLeads

    // Check if this is the getAllLeads structure (project is array with agent.offers)
    if (Array.isArray(lead.project)) {
      const projects = lead.project || [];

      projects.forEach((project) => {
        const agent = project.agent;
        const offers = agent.offers || [];

        // Process each offer based on state
        offers.forEach((offer) => {
          let shouldInclude = false;

          if (state === 'offer') {
            shouldInclude = true;
          } else if (state === 'opening') {
            shouldInclude = offer.opening ? true : false;
          } else if (state === 'confirmation') {
            shouldInclude = offer.opening && offer.opening.confirmation ? true : false;
          } else if (state === 'payment') {
            shouldInclude =
              offer.opening &&
              offer.opening.confirmation &&
              offer.opening.confirmation.paymentVoucher
                ? true
                : false;
          }

          if (shouldInclude) {
            flattenedLeads.push({
              ...lead,
              project: [
                {
                  ...project,
                  agent: {
                    ...agent,
                    offers: offer, // Single offer instead of array
                  },
                },
              ],
            });
          }
        });
      });
    }
    // Handle getMyLeads structure (agent_offers array, project is single object)
    else if (lead.agent_offers && Array.isArray(lead.agent_offers)) {
      const offers = lead.agent_offers || [];

      // Process each offer based on state
      offers.forEach((offer) => {
        let shouldInclude = false;

        if (state === 'offer') {
          shouldInclude = true;
        } else if (state === 'opening') {
          shouldInclude = offer.opening ? true : false;
        } else if (state === 'confirmation') {
          shouldInclude = offer.opening && offer.opening.confirmation ? true : false;
        } else if (state === 'payment') {
          shouldInclude =
            offer.opening && offer.opening.confirmation && offer.opening.confirmation.paymentVoucher
              ? true
              : false;
        }

        if (shouldInclude) {
          flattenedLeads.push({
            ...lead,
            // Convert to getAllLeads structure for consistency
            project: [
              {
                _id: lead.project._id,
                name: lead.project.name,
                agent: {
                  ...lead.agent,
                  offers: offer, // Single offer instead of array
                },
              },
            ],
            // Remove the agent_offers field to avoid confusion
            agent_offers: undefined,
          });
        }
      });
    }
  });

  return flattenedLeads;
};

module.exports = {
  processLeadWithStageAndStatus,
  attachOpeningsToOffers,
  flattenLeadsByState,
  formatRevenue,
};
