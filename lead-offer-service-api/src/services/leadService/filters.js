/**
 * Lead Service Filters
 * Functions for building queries and filtering leads
 */

const mongoose = require('mongoose');
const logger = require('../../utils/logger');
const {
  Offer,
  Opening,
  AssignLeads,
  Todo,
  Source,
  Confirmation,
  PaymentVoucher,
  Lead,
} = require('../../models');
/**
 * Parses the enhanced use_status parameter to handle multiple values and special keywords
 * @param {string} use_status - The use_status parameter value
 * @returns {Object} - Parsed use_status filter object
 */
const parseUseStatusFilter = (use_status) => {
  if (!use_status) return null;

  // Handle special keywords
  if (use_status === 'active') {
    return { $in: ['usable', 'new'] };
  }

  if (use_status === 'reusable') {
    return 'reusable';
  }

  // Handle comma-separated values
  if (use_status.includes(',')) {
    const values = use_status
      .split(',')
      .map((v) => v.trim())
      .filter((v) => v);
    return values.length > 1 ? { $in: values } : values[0];
  }

  // Handle single value
  return use_status;
};

/**
 * Builds a query object for filtering leads
 * @param {Object} filters - Filter parameters
 * @returns {Promise<Object>} - MongoDB query object and additional filters
 */
const buildLeadQuery = async ({
  status,
  search,
  showInactive,
  includeAll = false,
  use_status,
  investment_volume,
  agent_name,
  project_name,
  project_id,
  has_opening,
  duplicate,
  state,
  has_todo,
  has_ticket,
  source,
}) => {
  // Handle base query with active status filter
  const dbQuery = {};

  // When includeAll=true, skip active filter entirely to return all leads
  if (!includeAll) {
    // When showInactive=true, show only inactive leads. Otherwise show only active leads.
    dbQuery.active = showInactive ? false : true;
  }

  // Add status filter if provided
  if (status) {
    // When status is "Hold", include "Hold" and "Termin"
    if (status.toLowerCase() === 'hold') {
      dbQuery.status = { $in: ['Hold', 'Termin'] };
    } else {
      dbQuery.status = status;
    }
  }

  // Add use_status filter with enhanced parsing
  // When showInactive=true, don't apply use_status filter since archived leads should be shown regardless of use_status
  if (includeAll) {
    // When includeAll=true, only apply use_status if explicitly provided
    const parsedUseStatus = parseUseStatusFilter(use_status);
    if (parsedUseStatus) {
      dbQuery.use_status = parsedUseStatus;
    }
  } else if (showInactive) {
    // For archived leads, don't enforce default filter
    const parsedUseStatus = parseUseStatusFilter(use_status);
    if (parsedUseStatus) {
      dbQuery.use_status = parsedUseStatus;
    }
    // Note: No default use_status filter for archived leads
  } else {
    // For active leads, apply the use_status filter logic
    const parsedUseStatus = parseUseStatusFilter(use_status);
    if (parsedUseStatus) {
      dbQuery.use_status = parsedUseStatus;
    } else {
      // By default, exclude leads with use_status "pending"
      // Only show pending leads when explicitly requested via query parameter
      dbQuery.use_status = { $ne: 'pending' };
    }
  }

  // Add duplicate status filter if provided
  if (duplicate !== undefined && duplicate !== null) {
    // Convert string to number since query params come as strings
    const duplicateStatus = parseInt(duplicate, 10);

    // Only apply filter if it's a valid number (0, 1, or 2)
    if (!isNaN(duplicateStatus) && [0, 1, 2].includes(duplicateStatus)) {
      // If duplicate=0, show leads with duplicate_status 0 (not duplicates)
      // If duplicate=1, show leads with duplicate_status 1 (low priority duplicates)
      // If duplicate=2, show leads with duplicate_status 2 (high priority duplicates)
      dbQuery.duplicate_status = duplicateStatus;
      logger.info(`Filtering leads by duplicate status: ${duplicateStatus}`);
    }
  }

  // Add source filter if provided
  if (source) {
    // Find ALL sources containing the search term (case-insensitive partial match)
    const sourceRegex = new RegExp(source.trim(), 'i');
    const matchingSources = await Source.find({ name: sourceRegex, active: true }).select('_id name').lean();

    if (matchingSources.length > 0) {
      // Filter leads by all matching source IDs
      const sourceIds = matchingSources.map(s => s._id);
      dbQuery.source_id = { $in: sourceIds };
      logger.info(`Filtering leads by sources containing "${source}": ${matchingSources.map(s => s.name).join(', ')} (${sourceIds.length} sources)`);
    } else {
      // No matching source found, return empty result
      logger.warn(`No active source found containing: ${source}`);
      dbQuery._id = { $in: [] }; // Ensure empty result
      return { dbQuery, additionalFilters: { hasAdvancedFilters: false, leadIds: [] } };
    }
  }

  // Track additional filters that can't be directly added to the MongoDB query
  const additionalFilters = {
    hasAdvancedFilters: false,
    leadIds: null,
  };

  // Filter by project ID if provided (takes priority over project_name)
  if (project_id) {
    additionalFilters.hasAdvancedFilters = true;

    // Find leads assigned to this specific project by ID
    const leadAssignments = await AssignLeads.find({
      project_id: new mongoose.Types.ObjectId(project_id),
      status: 'active',
    })
      .sort({ assigned_at: -1 }) // Most recent assignments first
      .select('lead_id assigned_at')
      .lean();

    if (leadAssignments.length > 0) {
      // Use only the most recent assignment for each lead (in case there are duplicates)
      const leadAssignmentMap = new Map();
      leadAssignments.forEach(assignment => {
        const leadId = assignment.lead_id.toString();
        if (!leadAssignmentMap.has(leadId)) {
          leadAssignmentMap.set(leadId, assignment);
        }
      });

      let leadIdsFromProject = Array.from(leadAssignmentMap.values()).map(a => a.lead_id);

      // If source_id filter is already set, filter the lead IDs by source to ensure they match
      if (dbQuery.source_id) {
        const Lead = mongoose.model('Lead');
        const leadsWithSource = await Lead.find({
          _id: { $in: leadIdsFromProject },
          source_id: dbQuery.source_id,
        })
          .select('_id')
          .lean();

        const filteredLeadIds = leadsWithSource.map(lead => lead._id);
        logger.info(
          `After applying source filter (${dbQuery.source_id}), ${filteredLeadIds.length} leads remain from ${leadIdsFromProject.length} project leads`
        );
        leadIdsFromProject = filteredLeadIds;
      }

      // If we already have lead IDs from other filters, intersect them
      if (additionalFilters.leadIds !== null) {
        additionalFilters.leadIds = additionalFilters.leadIds.filter((id) =>
          leadIdsFromProject.some((pid) => pid.toString() === id.toString())
        );
      } else {
        additionalFilters.leadIds = leadIdsFromProject;
      }
    } else {
      // No leads assigned to this specific project
      additionalFilters.leadIds = [];
      dbQuery._id = { $in: [] }; // Ensure empty result
      return { dbQuery, additionalFilters };
    }
  }
  // Filter by project name if provided (only if project_id is not provided)
  else if (project_name) {
    additionalFilters.hasAdvancedFilters = true;
    const escapeRegex = (string) => {
      return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape all special characters
    };

    // First, find the exact project by name (case-insensitive but exact match)
    const exactProject = await mongoose
      .model('Team')
      .findOne({
        name: { $regex: new RegExp(`^${escapeRegex(project_name.trim())}$`, 'i') }, // Exact match, case-insensitive
        active: true, // Only active projects
      })
      .select('_id name')
      .lean();

    if (exactProject) {
      // Use the specific project ID for filtering
      const projectId = exactProject._id;

      // Find leads assigned to this SPECIFIC project only (most recent first)
      const leadAssignments = await AssignLeads.find({
        project_id: projectId, // Exact project ID match
        status: 'active',
      })
        .sort({ assigned_at: -1 }) // Most recent assignments first
        .select('lead_id assigned_at')
        .lean();

      if (leadAssignments.length > 0) {
        // Use only the most recent assignment for each lead (in case there are duplicates)
        const leadAssignmentMap = new Map();
        leadAssignments.forEach(assignment => {
          const leadId = assignment.lead_id.toString();
          if (!leadAssignmentMap.has(leadId)) {
            leadAssignmentMap.set(leadId, assignment);
          }
        });

        let leadIdsFromProject = Array.from(leadAssignmentMap.values()).map(a => a.lead_id);

        // If source_id filter is already set, filter the lead IDs by source to ensure they match
        if (dbQuery.source_id) {
          const Lead = mongoose.model('Lead');
          const leadsWithSource = await Lead.find({
            _id: { $in: leadIdsFromProject },
            source_id: dbQuery.source_id,
          })
            .select('_id')
            .lean();

          const filteredLeadIds = leadsWithSource.map(lead => lead._id);
          logger.info(
            `After applying source filter (${dbQuery.source_id}), ${filteredLeadIds.length} leads remain from ${leadIdsFromProject.length} project leads`
          );
          leadIdsFromProject = filteredLeadIds;
        }

        // If we already have lead IDs from other filters, intersect them
        if (additionalFilters.leadIds !== null) {
          additionalFilters.leadIds = additionalFilters.leadIds.filter((id) =>
            leadIdsFromProject.some((pid) => pid.toString() === id.toString())
          );
        } else {
          additionalFilters.leadIds = leadIdsFromProject;
        }
      } else {
        // No leads assigned to this specific project
        additionalFilters.leadIds = [];
        dbQuery._id = { $in: [] }; // Ensure empty result
        return { dbQuery, additionalFilters };
      }
    } else {
      // No exact project match found, return empty result
      additionalFilters.leadIds = [];
      dbQuery._id = { $in: [] }; // Ensure empty result
      return { dbQuery, additionalFilters };
    }
  }

  // Handle state-based filtering (offer, opening, confirmation, or payment)
  if (state && ['offer', 'opening', 'confirmation', 'payment'].includes(state)) {
    additionalFilters.hasAdvancedFilters = true;

    if (state === 'offer') {
      // Find all leads that have offers
      const offers = await Offer.find({}).select('lead_id').lean();

      if (offers.length > 0) {
        const leadIdsWithOffers = [...new Set(offers.map((offer) => offer.lead_id.toString()))];

        // If we already have lead IDs from other filters, intersect them
        if (additionalFilters.leadIds !== null) {
          additionalFilters.leadIds = additionalFilters.leadIds.filter((id) =>
            leadIdsWithOffers.includes(id.toString())
          );
        } else {
          additionalFilters.leadIds = offers.map((offer) => offer.lead_id);
        }
      } else {
        // No offers found, return empty result
        additionalFilters.leadIds = [];
        dbQuery._id = { $in: [] }; // Ensure empty result
        return { dbQuery, additionalFilters };
      }
    } else if (state === 'opening') {
      // Find all leads that have openings (through offers)
      const openings = await Opening.find({ active: true }).select('offer_id').lean();

      if (openings.length > 0) {
        const offerIds = openings.map((opening) => opening.offer_id);
        const offersWithOpenings = await Offer.find({
          _id: { $in: offerIds },
        })
          .select('lead_id')
          .lean();

        if (offersWithOpenings.length > 0) {
          const leadIdsWithOpenings = [
            ...new Set(offersWithOpenings.map((offer) => offer.lead_id.toString())),
          ];

          // If we already have lead IDs from other filters, intersect them
          if (additionalFilters.leadIds !== null) {
            additionalFilters.leadIds = additionalFilters.leadIds.filter((id) =>
              leadIdsWithOpenings.includes(id.toString())
            );
          } else {
            additionalFilters.leadIds = offersWithOpenings.map((offer) => offer.lead_id);
          }
        } else {
          // No offers with openings found
          additionalFilters.leadIds = [];
          dbQuery._id = { $in: [] }; // Ensure empty result
          return { dbQuery, additionalFilters };
        }
      } else {
        // No openings found, return empty result
        additionalFilters.leadIds = [];
        dbQuery._id = { $in: [] }; // Ensure empty result
        return { dbQuery, additionalFilters };
      }
    } else if (state === 'confirmation') {
      // Find all leads that have confirmations (through openings and offers)
      const confirmations = await Confirmation.find({ active: true }).select('opening_id').lean();

      if (confirmations.length > 0) {
        const openingIds = confirmations.map((confirmation) => confirmation.opening_id);
        const openingsWithConfirmations = await Opening.find({
          _id: { $in: openingIds },
          active: true,
        })
          .select('offer_id')
          .lean();

        if (openingsWithConfirmations.length > 0) {
          const offerIds = openingsWithConfirmations.map((opening) => opening.offer_id);
          const offersWithConfirmations = await Offer.find({
            _id: { $in: offerIds },
          })
            .select('lead_id')
            .lean();

          if (offersWithConfirmations.length > 0) {
            const leadIdsWithConfirmations = [
              ...new Set(offersWithConfirmations.map((offer) => offer.lead_id.toString())),
            ];

            // If we already have lead IDs from other filters, intersect them
            if (additionalFilters.leadIds !== null) {
              additionalFilters.leadIds = additionalFilters.leadIds.filter((id) =>
                leadIdsWithConfirmations.includes(id.toString())
              );
            } else {
              additionalFilters.leadIds = offersWithConfirmations.map((offer) => offer.lead_id);
            }
          } else {
            // No offers with confirmations found
            additionalFilters.leadIds = [];
            dbQuery._id = { $in: [] }; // Ensure empty result
            return { dbQuery, additionalFilters };
          }
        } else {
          // No openings with confirmations found
          additionalFilters.leadIds = [];
          dbQuery._id = { $in: [] }; // Ensure empty result
          return { dbQuery, additionalFilters };
        }
      } else {
        // No confirmations found, return empty result
        additionalFilters.leadIds = [];
        dbQuery._id = { $in: [] }; // Ensure empty result
        return { dbQuery, additionalFilters };
      }
    } else if (state === 'payment') {
      const paymentVouchers = await PaymentVoucher.find({ active: true })
        .select('confirmation_id')
        .lean();

      if (paymentVouchers.length > 0) {
        const confirmationIds = paymentVouchers.map((voucher) => voucher.confirmation_id);
        const confirmationsWithPayments = await Confirmation.find({
          _id: { $in: confirmationIds },
          active: true,
        })
          .select('opening_id')
          .lean();

        if (confirmationsWithPayments.length > 0) {
          const openingIds = confirmationsWithPayments.map(
            (confirmation) => confirmation.opening_id
          );
          const openingsWithPayments = await Opening.find({
            _id: { $in: openingIds },
            active: true,
          })
            .select('offer_id')
            .lean();

          if (openingsWithPayments.length > 0) {
            const offerIds = openingsWithPayments.map((opening) => opening.offer_id);
            const offersWithPayments = await Offer.find({
              _id: { $in: offerIds },
            })
              .select('lead_id')
              .lean();

            if (offersWithPayments.length > 0) {
              const leadIdsWithPayments = [
                ...new Set(offersWithPayments.map((offer) => offer.lead_id.toString())),
              ];

              // If we already have lead IDs from other filters, intersect them
              if (additionalFilters.leadIds !== null) {
                additionalFilters.leadIds = additionalFilters.leadIds.filter((id) =>
                  leadIdsWithPayments.includes(id.toString())
                );
              } else {
                additionalFilters.leadIds = offersWithPayments.map((offer) => offer.lead_id);
              }
            } else {
              // No offers with payment vouchers found
              additionalFilters.leadIds = [];
              dbQuery._id = { $in: [] }; // Ensure empty result
              return { dbQuery, additionalFilters };
            }
          } else {
            // No openings with payment vouchers found
            additionalFilters.leadIds = [];
            dbQuery._id = { $in: [] }; // Ensure empty result
            return { dbQuery, additionalFilters };
          }
        } else {
          // No confirmations with payment vouchers found
          additionalFilters.leadIds = [];
          dbQuery._id = { $in: [] }; // Ensure empty result
          return { dbQuery, additionalFilters };
        }
      } else {
        // No payment vouchers found, return empty result
        additionalFilters.leadIds = [];
        dbQuery._id = { $in: [] }; // Ensure empty result
        return { dbQuery, additionalFilters };
      }
    }
  }

  // Handle agent name filter separately (based on lead assignments, not offers)
  if (agent_name) {
    additionalFilters.hasAdvancedFilters = true;

    const agentRegex = new RegExp(agent_name, 'i');
    const matchingAgents = await mongoose
      .model('User')
      .find({
        $or: [{ login: agentRegex }, { first_name: agentRegex }, { last_name: agentRegex }],
      })
      .select('_id')
      .lean();

    if (matchingAgents.length > 0) {
      const agentIds = matchingAgents.map((a) => a._id);

      // Look for lead assignments, not offers (most recent first)
      const assignments = await AssignLeads.find({
        agent_id: { $in: agentIds },
        status: 'active',
      })
        .sort({ assigned_at: -1 }) // Most recent assignments first
        .select('lead_id assigned_at')
        .lean();

      if (assignments.length > 0) {
        // Use only the most recent assignment for each lead (in case there are duplicates)
        const leadAssignmentMap = new Map();
        assignments.forEach(assignment => {
          const leadId = assignment.lead_id.toString();
          if (!leadAssignmentMap.has(leadId)) {
            leadAssignmentMap.set(leadId, assignment);
          }
        });

        const leadIdsFromAgents = Array.from(leadAssignmentMap.values()).map(a => a.lead_id);

        // If we already have lead IDs from other filters, intersect them
        if (additionalFilters.leadIds !== null) {
          additionalFilters.leadIds = additionalFilters.leadIds.filter((id) =>
            leadIdsFromAgents.some((agentLeadId) => agentLeadId.toString() === id.toString())
          );
        } else {
          additionalFilters.leadIds = leadIdsFromAgents;
        }
      } else {
        // No leads assigned to these agents
        additionalFilters.leadIds = [];
        dbQuery._id = { $in: [] }; // Ensure empty result
        return { dbQuery, additionalFilters };
      }
    } else {
      // No matching agents found, return empty result
      additionalFilters.leadIds = [];
      dbQuery._id = { $in: [] }; // Ensure empty result
      return { dbQuery, additionalFilters };
    }
  }

  // Handle opening-related filters
  if (has_opening === 'true' || investment_volume) {
    additionalFilters.hasAdvancedFilters = true;

    // Build a query to find leads with openings that match the criteria
    let offerQuery = {};

    // Filter by investment volume if provided
    if (investment_volume && !isNaN(investment_volume)) {
      offerQuery.investment_volume = parseFloat(investment_volume);
    }

    // Find offers matching the criteria
    const offers = await Offer.find(offerQuery).select('lead_id').lean();

    // If has_opening is true but no offers found, return empty result
    if (has_opening === 'true' && offers.length === 0) {
      additionalFilters.leadIds = [];
      return { dbQuery, additionalFilters };
    }

    // If we have offers, get the lead IDs
    if (offers.length > 0) {
      const leadIds = offers.map((offer) => offer.lead_id);

      // If we're specifically looking for leads with openings
      if (has_opening === 'true') {
        // Find openings for these offers
        const openingOfferIds = await Opening.find({
          offer_id: { $in: offers.map((o) => o._id) },
          active: true,
        })
          .select('offer_id')
          .lean();

        if (openingOfferIds.length > 0) {
          // Get the offers with openings
          const offersWithOpenings = await Offer.find({
            _id: { $in: openingOfferIds.map((o) => o.offer_id) },
          })
            .select('lead_id')
            .lean();

          // Get the lead IDs for offers with openings
          const newLeadIds = offersWithOpenings.map((o) => o.lead_id);

          // If we already have lead IDs from other filters (like state), intersect them
          if (additionalFilters.leadIds !== null) {
            additionalFilters.leadIds = additionalFilters.leadIds.filter((id) =>
              newLeadIds.some((newId) => newId.toString() === id.toString())
            );
          } else {
            additionalFilters.leadIds = newLeadIds;
          }
        } else {
          // No openings found for these offers
          additionalFilters.leadIds = [];
        }
      } else {
        // Not specifically looking for openings, just use the lead IDs from offers
        // If we already have lead IDs from other filters (like state), intersect them
        if (additionalFilters.leadIds !== null) {
          additionalFilters.leadIds = additionalFilters.leadIds.filter((id) =>
            leadIds.some((newId) => newId.toString() === id.toString())
          );
        } else {
          additionalFilters.leadIds = leadIds;
        }
      }
    }
  }

  // Handle todo/ticket filters if provided
  // Normalize boolean values (query params come as strings)
  const normalizedHasTodo = has_todo === true || has_todo === 'true';
  const normalizedHasTicket = has_ticket === true || has_ticket === 'true';

  // When has_ticket=true or has_todo=true, don't filter leads by type
  // Return all leads with todos/tickets included in response (no type filtering)
  if (normalizedHasTodo || normalizedHasTicket) {
    additionalFilters.hasAdvancedFilters = true;
    // Don't filter leads - return all leads, todos/tickets will be included in executeLeadQuery
    // No type filtering - all todos and tickets regardless of type field
  }

  // Handle search filter if provided
  if (search && search.trim()) {
    const searchTerm = search.trim();
    // Escape special regex characters to prevent regex errors
    const escapedSearchTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const searchRegex = new RegExp(escapedSearchTerm, 'i');
    let leadIdsFromSearch = null;

    // Check if search term is a valid MongoDB ObjectId
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(searchTerm);

    // Basic search on lead fields
    dbQuery.$or = [
      { contact_name: searchRegex },
      { email_from: searchRegex },
      { phone: searchRegex },
      { lead_source_no: searchRegex }, // Add partner ID search
      { notes: searchRegex },
      { tags: searchRegex },
    ];

    // Add _id search if valid ObjectId
    if (isValidObjectId) {
      dbQuery.$or.push({ _id: searchTerm });
      logger.info(`buildLeadQuery: Valid ObjectId detected, adding _id search for "${searchTerm}"`);
    }

    // If the search term is a number, also search for expected revenue
    if (!isNaN(searchTerm)) {
      const numericValue = parseFloat(searchTerm);
      dbQuery.$or.push({ expected_revenue: numericValue });

      // Also search for investment_volume in offers
      const matchingOffers = await Offer.find({
        investment_volume: numericValue,
      })
        .select('lead_id')
        .lean();

      if (matchingOffers.length > 0) {
        leadIdsFromSearch = matchingOffers.map((o) => o.lead_id);
      }
    }

    // If we found leads through search, add them to the query
    if (leadIdsFromSearch && leadIdsFromSearch.length > 0) {
      dbQuery.$or.push({ _id: { $in: leadIdsFromSearch } });
    }
  }

  // If we have advanced filters, handle lead IDs appropriately
  if (additionalFilters.hasAdvancedFilters) {
    // If leadIds is null, it means no filtering was done yet (e.g., only has_opening=true or has_todo=true was specified)
    if (additionalFilters.leadIds === null) {
      // No specific filtering was done, continue with regular query
      // But if has_opening or has_todo is true, we need to find leads with openings or todos
      if (has_opening === 'true') {
        // Find all offers with openings
        const openings = await Opening.find({ active: true }).select('offer_id').lean();
        if (openings.length > 0) {
          const offerIds = openings.map((o) => o.offer_id);
          const offersWithOpenings = await Offer.find({
            _id: { $in: offerIds },
          })
            .select('lead_id')
            .lean();
          if (offersWithOpenings.length > 0) {
            const leadIdsWithOpenings = offersWithOpenings.map((o) => o.lead_id);
            if (!dbQuery._id) {
              dbQuery._id = { $in: leadIdsWithOpenings };
            } else {
              // Intersect with existing IDs
              const existingIds = dbQuery._id.$in || [];
              const filteredIds = leadIdsWithOpenings.filter((id) =>
                existingIds.some((existingId) => existingId.toString() === id.toString())
              );
              dbQuery._id = { $in: filteredIds };
            }
          } else {
            // No offers with openings found
            additionalFilters.leadIds = [];
            dbQuery._id = { $in: [] }; // Empty result
          }
        } else {
          // No openings found
          additionalFilters.leadIds = [];
          dbQuery._id = { $in: [] }; // Empty result
        }
      } else if (normalizedHasTodo || normalizedHasTicket) {
        // Find ALL todos/tickets - NO type filtering
        const todos = await Todo.find({ active: true })
          .select('lead_id')
          .lean();
        const leadIdsFromTodos = [...new Set(todos.map((todo) => todo.lead_id))];

        if (leadIdsFromTodos.length > 0) {
          if (!dbQuery._id) {
            dbQuery._id = { $in: leadIdsFromTodos };
          } else {
            // Intersect with existing IDs
            const existingIds = dbQuery._id.$in || [];
            const filteredIds = leadIdsFromTodos.filter((id) =>
              existingIds.some((existingId) => existingId.toString() === id.toString())
            );
            dbQuery._id = { $in: filteredIds };
          }
        } else {
          // No matching todos/tickets found
          additionalFilters.leadIds = [];
          dbQuery._id = { $in: [] }; // Empty result
        }
      }
    } else if (additionalFilters.leadIds.length === 0) {
      // We have an empty leadIds array, which means no leads match the criteria
      dbQuery._id = { $in: [] }; // Empty result
    } else {
      // If source_id filter is set, filter the lead IDs by source to ensure they match
      let finalLeadIds = additionalFilters.leadIds;
      if (dbQuery.source_id) {
        const Lead = mongoose.model('Lead');
        const leadsWithSource = await Lead.find({
          _id: { $in: additionalFilters.leadIds },
          source_id: dbQuery.source_id,
        })
          .select('_id')
          .lean();

        finalLeadIds = leadsWithSource.map(lead => lead._id);
        logger.info(
          `After applying source filter (${dbQuery.source_id}) to final lead IDs, ${finalLeadIds.length} leads remain from ${additionalFilters.leadIds.length} total leads`
        );
      }

      // We have leadIds, add them to the query
      if (!dbQuery._id) {
        dbQuery._id = { $in: finalLeadIds };
      } else {
        // If we already have an _id filter, intersect it with our lead IDs
        const existingIds = dbQuery._id.$in || [];
        const filteredIds = finalLeadIds.filter((id) =>
          existingIds.some((existingId) => existingId.toString() === id.toString())
        );
        dbQuery._id = { $in: filteredIds };
      }
    }
  }

  return { dbQuery, additionalFilters };
};

/**
 * Filters leads to only those assigned to the given user
 * @param {Object} user - User object
 * @param {Object} dbQuery - Existing MongoDB query
 * @returns {Promise<Object>} - Updated MongoDB query
 */
const filterLeadsByUserAssignment = async (user, dbQuery) => {
  logger.info(`Filtering leads for user ${user._id} (${user.login})`);

  // Get assignments for the current user using user._id directly, sorted by most recent first
  const assignments = await AssignLeads.find({
    agent_id: user._id,
    status: 'active',
  })
    .sort({ assigned_at: -1 }) // Most recent assignments first
    .lean();

  logger.info(`Found ${assignments.length} assignments for user ${user._id}`);

  // Use only the most recent assignment for each lead (in case there are multiple active assignments)
  const leadAssignmentMap = new Map();
  assignments.forEach((assignment) => {
    const leadId = assignment.lead_id.toString();
    if (!leadAssignmentMap.has(leadId)) {
      leadAssignmentMap.set(leadId, assignment);
    }
  });

  const assignedLeadIds = Array.from(leadAssignmentMap.values()).map((a) => a.lead_id);

  // Also include leads where the user has temporary read‑only access via Lead.temporary_access_agents
  const tempAccessLeads = await Lead.find({
    temporary_access_agents: user._id,
  })
    .select('_id')
    .lean();

  const tempAccessLeadIds = tempAccessLeads.map((l) => l._id);

  // Combine assigned and temporary-access lead IDs (unique)
  const allAccessibleLeadIdsMap = new Map();
  assignedLeadIds.forEach((id) => allAccessibleLeadIdsMap.set(id.toString(), id));
  tempAccessLeadIds.forEach((id) => {
    const key = id.toString();
    if (!allAccessibleLeadIdsMap.has(key)) {
      allAccessibleLeadIdsMap.set(key, id);
    }
  });

  const accessibleLeadIds = Array.from(allAccessibleLeadIdsMap.values());

  logger.info(
    `Found ${assignedLeadIds.length} assigned and ${tempAccessLeadIds.length} temporary-access leads for user ${user._id} (total unique: ${accessibleLeadIds.length})`
  );

  // If no accessible leads at all, return empty result
  if (accessibleLeadIds.length === 0) {
    logger.warn(`No assigned or temporary-access leads found for user ${user._id}`);
    dbQuery._id = { $in: [] }; // Empty result
    return dbQuery;
  }

  // Handle different existing _id filter scenarios
  if (!dbQuery._id) {
    // No existing _id filter, add all accessible lead IDs
    dbQuery._id = { $in: accessibleLeadIds };
    logger.info(`Set dbQuery._id to $in with ${accessibleLeadIds.length} lead IDs`);
  } else if (dbQuery._id.$in) {
    // Existing _id filter is already $in array, intersect with accessible lead IDs
    const existingIds = dbQuery._id.$in;
    logger.info(
      `Existing query has ${existingIds.length} IDs, intersecting with ${accessibleLeadIds.length} accessible IDs`
    );

    const filteredIds = accessibleLeadIds.filter((id) =>
      existingIds.some((existingId) => existingId.toString() === id.toString())
    );

    logger.info(`After intersection, ${filteredIds.length} IDs remain`);
    dbQuery._id = { $in: filteredIds };
  } else {
    // Existing _id filter is a direct value (like in getLeadById)
    const requestedLeadId = dbQuery._id;
    logger.info(
      `Checking if requested lead ID ${requestedLeadId} is in user's assigned or temporary-access leads`
    );

    // Check if the requested lead is in the user's accessible leads
    const isAccessible = accessibleLeadIds.some(
      (accessibleId) => accessibleId.toString() === requestedLeadId.toString()
    );

    if (isAccessible) {
      logger.info(
        `Lead ${requestedLeadId} is accessible to user ${user._id} (assigned or temporary), allowing access`
      );
      // Keep the original _id filter since the lead is accessible to the user
    } else {
      logger.warn(
        `Lead ${requestedLeadId} is NOT assigned or temporary-access for user ${user._id}, denying access`
      );
      // Set to empty result since the requested lead is not accessible to this user
      dbQuery._id = { $in: [] };
    }
  }

  return dbQuery;
};

module.exports = {
  buildLeadQuery,
  filterLeadsByUserAssignment,
};
