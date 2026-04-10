/**
 * Lead Service Queries
 * Functions for querying leads and related data
 */

const mongoose = require('mongoose');
const {
  Lead,
  User,
  Appointment,
  Team,
  Source,
  Offer,
  Opening,
  Confirmation,
  PaymentVoucher,
  AssignLeads,
  Todo,
  Favourite,
  Email,
} = require('../../models');
const { NotFoundError, AuthorizationError } = require('../../utils/errorHandler');
const logger = require('../../utils/logger');
const { buildLeadQuery, filterLeadsByUserAssignment } = require('./filters');
const { getStageAndStatusMaps, buildPaginationMeta, createLookupMap, normalizePagination } = require('./utils');
const { ROLES } = require('../../middleware/roles/roleDefinitions');
const { attachOpeningsToOffers, processLeadWithStageAndStatus, flattenLeadsByState } = require('./transforms');
const DocumentManager = require('../offerService/documents/DocumentManager');



/**
 * Safely normalize a potential ObjectId reference.
 * @param {unknown} value
 * @returns {mongoose.Types.ObjectId|null}
 */
const normalizeObjectId = (value) => {
  if (!value) {
    return null;
  }

  if (mongoose.Types.ObjectId.isValid(value)) {
    return typeof value === 'string' ? new mongoose.Types.ObjectId(value) : value;
  }

  if (value._id && mongoose.Types.ObjectId.isValid(value._id)) {
    return typeof value._id === 'string' ? new mongoose.Types.ObjectId(value._id) : value._id;
  }

  return null;
};

const referenceHydrationConfig = [
  { field: 'source_id', model: Source, select: 'name price active color' },
  {
    field: 'user_id',
    model: User,
    select:
      '_id login firstName lastName role active create_date instance_status instance_userid anydesk color_code',
  },
  { field: 'prev_user_id', model: User, select: '_id login role color_code' },
  { field: 'prev_team_id', model: Team, select: '_id name color_code' },
  { field: 'source_agent', model: User, select: '_id login role color_code' },
  { field: 'source_project', model: Team, select: '_id name color_code' },
];

/**
 * Hydrate reference fields manually, skipping invalid IDs.
 * This replaces mongoose populate to avoid CastErrors from legacy string IDs.
 * @param {Array<Object>} leads
 * @returns {Promise<void>}
 */
const hydrateLeadReferences = async (leads) => {
  if (!Array.isArray(leads) || leads.length === 0) {
    return;
  }

  const pendingLookups = referenceHydrationConfig.map(({ field }) => ({
    field,
    ids: new Set(),
  }));

  const lookupByField = pendingLookups.reduce((acc, entry) => {
    acc[entry.field] = entry;
    return acc;
  }, {});

  leads.forEach((lead) => {
    referenceHydrationConfig.forEach(({ field }) => {
      const normalized = normalizeObjectId(lead[field]);
      if (normalized) {
        lookupByField[field].ids.add(normalized.toString());
        lead[field] = normalized;
      } else {
        lead[field] = null;
      }
    });
  });

  await Promise.all(
    referenceHydrationConfig.map(async ({ field, model, select }) => {
      const ids = Array.from(lookupByField[field].ids);
      if (ids.length === 0) {
        return;
      }

      const docs = await model
        .find({ _id: { $in: ids } })
        .select(select)
        .lean();

      const docMap = new Map(docs.map((doc) => [doc._id.toString(), doc]));

      leads.forEach((lead) => {
        const value = lead[field];
        if (value) {
          lead[field] = docMap.get(value.toString()) || null;
        }
      });
    })
  );
};

/**
 * Parses revenue string to numeric value for proper sorting
 * @param {string} value - Revenue string (e.g., "100k", "10k", "25k")
 * @returns {number} - Numeric value for sorting
 */
const parseRevenueValue = (value) => {
  if (typeof value === 'number') {
    return value;
  }

  if (!value || typeof value !== 'string') {
    return 0;
  }

  // Remove any whitespace and convert to lowercase
  const cleaned = value.toString().trim().toLowerCase();

  // If it's already a plain number, parse it directly
  if (/^\d+(\.\d+)?$/.test(cleaned)) {
    return parseFloat(cleaned);
  }

  // Handle formatted strings like "100k", "10k", "25k", etc.
  const match = cleaned.match(/^(\d+(?:\.\d+)?)\s*([kmb]?)$/);
  if (!match) {
    return 0; // Return 0 for invalid formats
  }

  const [, numberPart, suffix] = match;
  const baseNumber = parseFloat(numberPart);

  if (isNaN(baseNumber)) {
    return 0;
  }

  // Apply multiplier based on suffix
  switch (suffix) {
    case 'k':
      return baseNumber * 1000;
    case 'm':
      return baseNumber * 1000000;
    case 'b':
      return baseNumber * 1000000000;
    default:
      return baseNumber;
  }
};

/**
 * Parses sorting parameters and returns MongoDB sort object
 * @param {string} sortBy - Field to sort by
 * @param {string} sortOrder - Order to sort (asc or desc)
 * @returns {Object} - MongoDB sort object
 */
const parseSortParameters = (sortBy = 'createdAt', sortOrder = 'desc') => {
  // Define allowed sort fields for security - expanded to match dynamicFilterService
  const allowedSortFields = {
    contact_name: 'contact_name',
    lead_source_no: 'lead_source_no',
    expected_revenue: 'expected_revenue',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    lead_date: 'lead_date',
    email_from: 'email_from',
    phone: 'phone',
    status: 'status',
    stage: 'stage',
    use_status: 'use_status',
    duplicate_status: 'duplicate_status',
    assigned_date: 'assigned_date',
    active: 'active',
    agent: 'user_id',
    prev_project: 'prev_team_id',
    prev_agent: 'prev_user_id',
    leadPrice: 'leadPrice',
    source_month: 'source_month',
    prev_month: 'prev_month',
    current_month: 'current_month',
    prev_stage: 'prev_stage',
    prev_status: 'prev_status',
    project_name: 'team_id', // denormalized sort: executeLeadQuery uses Team lookup for real name order
  };

  // Validate sort field
  const sortField = allowedSortFields[sortBy] || 'createdAt';

  // Normalize and validate sort order - ensure it's a string and lowercase
  const normalizedSortOrder = sortOrder ? String(sortOrder).toLowerCase().trim() : 'desc';
  const order = normalizedSortOrder === 'asc' ? 1 : -1;

  const sortObject = {};
  sortObject[sortField] = order;

  // Add secondary sort by _id for consistent ordering when primary field values are equal
  // Always use ascending order for _id to ensure consistent tie-breaking
  sortObject._id = 1;

  logger.info(`Applying sort: ${sortField} ${order === 1 ? 'ascending' : 'descending'} (normalized from: ${sortOrder})`);

  return sortObject;
};

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
 * Helper function to fetch assignment history for leads (including archived assignments)
 * @param {Array} leadIds - Array of lead IDs
 * @returns {Promise<Object>} - Object containing assignment history
 */
const fetchLeadAssignmentHistory = async (leadIds) => {
  // Get ALL assignments (active and archived) for complete history with optimized field projection
  const assignmentHistory = await AssignLeads.find({
    lead_id: { $in: leadIds },
    // No status filter - gets both active and archived for complete history
  })
    .select('lead_id project_id agent_id assigned_by assigned_at status')
    .populate('project_id', 'name color_code')
    .populate(
      'agent_id',
      '_id login role active create_date instance_status instance_userid anydesk color_code'
    )
    .populate('assigned_by', '_id login role')
    .sort({ assigned_at: -1 }) // Most recent first
    .lean();

  return assignmentHistory;
};

/**
 * Helper function to fetch related data for leads (OPTIMIZED)
 * @param {Array} leadIds - Array of lead IDs
 * @returns {Promise<Object>} - Object containing assignments, offers, openings, appointments, and maps
 */
const fetchLeadRelatedData = async (leadIds, user = null) => {
  const isAdmin = user?.role === 'Admin';
  // Fetch related data in parallel
  const [assignments, assignmentHistory, offers, appointments, { stageMap, statusMap }] = await Promise.all([
    // Get assignments for these leads
    AssignLeads.find({
      lead_id: { $in: leadIds },
      status: 'active',
    })
      .populate('project_id', 'name color_code')
      .populate(
        'agent_id',
        '_id login role active create_date instance_status instance_userid anydesk color_code'
      )
      .sort({ assigned_at: -1 }) // Sort by most recent first
      .lean(),

    // Get complete assignment history (including archived)
    fetchLeadAssignmentHistory(leadIds),

    // Get offers for these leads with populated payment terms, bonus amount details
    // Note: files will be populated using DocumentManager after fetching
    Offer.find({
      lead_id: { $in: leadIds },
      ...(isAdmin ? {} : { agent_id: user?._id }), // Admins see all offers; others see only their own
    })
      .populate(
        'bank_id',
        '_id name nickName account_number iban swift_code state is_allow is_default nametitle'
      )
      .populate('project_id', 'name color_code')
      .populate('payment_terms', 'name info')
      .populate('bonus_amount', 'name info')
      .populate('agent_id', '_id login role')
      .lean(),

    // Get appointments for these leads
    Appointment.find({
      lead_id: { $in: leadIds },
      active: true,
    })
      .populate('created_by', '_id login role')
      .sort({ appointment_date: -1 })
      .lean(),

    // Get stage and status information
    getStageAndStatusMaps(),
  ]);

  // Populate offer documents using DocumentManager (hybrid system: reverse + forward references)
  const offerIds = offers.map((offer) => offer._id);
  let populatedOffers = offers;
  if (offerIds.length > 0) {
    const documentsByOffer = await DocumentManager.populateMultipleOfferDocuments(offers, offerIds);
    // Attach populated documents to offers
    populatedOffers = offers.map((offer) => {
      const offerId = offer._id.toString();
      return {
        ...offer,
        files: documentsByOffer[offerId] || [],
      };
    });
  }

  // Get openings for the offers
  const openings = await Opening.find({
    offer_id: { $in: offerIds },
    active: true,
  })
    .lean();

  // Populate opening documents using DocumentManager (hybrid system)
  const openingIds = openings.map((opening) => opening._id);
  let populatedOpenings = openings;
  if (openingIds.length > 0) {
    const documentsByOpening = await DocumentManager.populateMultipleOpeningDocuments(openings, openingIds);
    populatedOpenings = openings.map((opening) => {
      const openingId = opening._id.toString();
      return {
        ...opening,
        files: documentsByOpening[openingId] || [],
      };
    });
  }

  // Get confirmations for the openings
  const confirmations = await Confirmation.find({
    opening_id: { $in: openingIds },
    active: true,
  })
    .lean();

  // Populate confirmation documents using DocumentManager (hybrid system)
  const confirmationIds = confirmations.map((confirmation) => confirmation._id);
  let populatedConfirmations = confirmations;
  if (confirmationIds.length > 0) {
    const documentsByConfirmation = await DocumentManager.populateMultipleConfirmationDocuments(confirmations, confirmationIds);
    populatedConfirmations = confirmations.map((confirmation) => {
      const confirmationId = confirmation._id.toString();
      return {
        ...confirmation,
        files: documentsByConfirmation[confirmationId] || [],
      };
    });
  }

  // Get payment vouchers for the confirmations
  const paymentVouchers = await PaymentVoucher.find({
    confirmation_id: { $in: confirmationIds },
    active: true,
  })
    .lean();

  // Populate payment voucher documents using DocumentManager (hybrid system)
  const paymentVoucherIds = paymentVouchers.map((paymentVoucher) => paymentVoucher._id);
  let populatedPaymentVouchers = paymentVouchers;
  if (paymentVoucherIds.length > 0) {
    const documentsByPaymentVoucher = await DocumentManager.populateMultiplePaymentVoucherDocuments(paymentVouchers, paymentVoucherIds);
    populatedPaymentVouchers = paymentVouchers.map((paymentVoucher) => {
      const paymentVoucherId = paymentVoucher._id.toString();
      return {
        ...paymentVoucher,
        files: documentsByPaymentVoucher[paymentVoucherId] || [],
      };
    });
  }

  return {
    assignments,
    assignmentHistory,
    offers: populatedOffers,
    openings: populatedOpenings,
    confirmations: populatedConfirmations,
    paymentVouchers: populatedPaymentVouchers,
    appointments,
    stageMap,
    statusMap,
  };
};

/**
 * Helper function to create lookup maps from related data
 * @param {Array} assignments - Lead assignments (active only)
 * @param {Array} assignmentHistory - Complete assignment history (active + archived)
 * @param {Array} offers - Lead offers
 * @param {Array} openings - Lead openings
 * @param {Array} confirmations - Lead confirmations
 * @param {Array} paymentVouchers - Lead payment vouchers
 * @param {Array} appointments - Lead appointments
 * @returns {Object} - Lookup maps for efficient data processing
 */
const createLookupMaps = (
  assignments,
  assignmentHistory,
  offers,
  openings,
  confirmations,
  paymentVouchers,
  appointments
) => {
  // Create lookup maps for active assignments
  const assignmentsByLeadId = {};
  assignments.forEach((assignment) => {
    const leadId = assignment.lead_id.toString();
    if (!assignmentsByLeadId[leadId]) {
      assignmentsByLeadId[leadId] = [];
    }
    assignmentsByLeadId[leadId].push(assignment);
  });

  // Create lookup maps for assignment history
  const assignmentHistoryByLeadId = {};
  assignmentHistory.forEach((assignment) => {
    const leadId = assignment.lead_id.toString();
    if (!assignmentHistoryByLeadId[leadId]) {
      assignmentHistoryByLeadId[leadId] = [];
    }
    assignmentHistoryByLeadId[leadId].push(assignment);
  });

  const offersByLeadId = {};
  offers.forEach((offer) => {
    const leadId = offer.lead_id.toString();
    if (!offersByLeadId[leadId]) {
      offersByLeadId[leadId] = [];
    }
    offersByLeadId[leadId].push(offer);
  });

  const openingsByOfferId = createLookupMap(openings, 'offer_id');
  const confirmationsByOpeningId = createLookupMap(confirmations, 'opening_id');
  const paymentVouchersByConfirmationId = createLookupMap(paymentVouchers, 'confirmation_id');

  // Create lookup map for appointments
  const appointmentsByLeadId = {};
  appointments.forEach((appointment) => {
    const leadId = appointment.lead_id.toString();
    if (!appointmentsByLeadId[leadId]) {
      appointmentsByLeadId[leadId] = [];
    }
    appointmentsByLeadId[leadId].push(appointment);
  });

  return {
    assignmentsByLeadId,
    assignmentHistoryByLeadId,
    offersByLeadId,
    openingsByOfferId,
    confirmationsByOpeningId,
    paymentVouchersByConfirmationId,
    appointmentsByLeadId,
  };
};

/**
 * Masks an email address to show only first 4 characters + *** and full domain
 * Example: jochen.stielau@web.de becomes joch***@web.de
 * @param {string} email - Email address to mask
 * @returns {string} - Masked email address
 */
// Export this function so it can be used in other files
const maskEmail = (email) => {
  if (!email) return undefined;

  try {
    const parts = email.split('@');
    if (parts.length !== 2) return undefined;

    const [username, domain] = parts;

    // Get first 4 characters of username, or all if less than 4
    const visibleUsername = username.substring(0, 4);
    const maskedUsername = visibleUsername + '***';

    // Keep full domain (no masking)
    return `${maskedUsername}@${domain}`;
  } catch (error) {
    logger.error(`Error masking email: ${error.message}`);
    return undefined;
  }
};

/**
 * Mask phone number to show first 4 digits + *** + last 3 digits
 * German phone numbers (+49 or 49 prefix) are converted to 0 prefix before masking
 * Example: +4915231097016 -> 0152***016
 * Example: 4915231097016 -> 0152***016
 * @param {String} phone - Phone number to mask
 * @returns {String|undefined} - Masked phone number or undefined if invalid
 */
const maskPhone = (phone) => {
  if (!phone) return undefined;

  try {
    let phoneStr = phone.toString().trim();
    
    // Replace German country code (+49 or 49) with 0
    // Handle +49 prefix (with plus sign)
    if (phoneStr.startsWith('+49')) {
      phoneStr = '0' + phoneStr.substring(3);
    }
    // Handle 49 prefix (without plus, at start of number)
    else if (phoneStr.startsWith('49') && phoneStr.length > 10) {
      // Only replace if it looks like a German number (49 followed by area code starting with 1-9)
      const afterPrefix = phoneStr.substring(2);
      if (/^[1-9]/.test(afterPrefix)) {
        phoneStr = '0' + afterPrefix;
      }
    }

    // Remove any non-digit characters for masking calculation
    const digitsOnly = phoneStr.replace(/\D/g, '');

    if (digitsOnly.length === 0) return undefined;

    // If phone is very short (7 digits or less), show first 2 + *** + last 2
    if (digitsOnly.length <= 7) {
      const first = digitsOnly.substring(0, 2);
      const last = digitsOnly.substring(digitsOnly.length - 2);
      return `${first}***${last}`;
    }

    // For longer numbers, show first 4 digits + *** + last 3 digits
    const firstFour = digitsOnly.substring(0, 4);
    const lastThree = digitsOnly.substring(digitsOnly.length - 3);

    return `${firstFour}***${lastThree}`;
  } catch (error) {
    logger.error(`Error masking phone: ${error.message}`);
    return undefined;
  }
};


/**

 * Determine if lead data should be masked based on user's unmask and view_type properties

 * Priority 1: unmask property (top priority)

 *   - If unmask = false → Always mask

 *   - If unmask = true → Continue to Priority 2

 * Priority 2: view_type property (only when unmask = true)

 *   - If view_type = "listView" → Unmask

 *   - If view_type = "detailsView" → Mask list API, unmask detail API

 * @param {Object} user - User object with unmask and view_type properties

 * @param {boolean} isDetailApi - Whether this is a detail API call (GET /leads/:id) or list API (GET /leads)

 * @returns {boolean} - true if data should be masked, false if unmasked

 */

const shouldMaskLeadData = (user, isDetailApi = false) => {

  if (!user) return true; // Default: mask if no user



  // Convert unmask to boolean if it's a string

  const unmaskValue = user.unmask === true || user.unmask === 'true' || user.unmask === 1;

  const unmaskFalse = user.unmask === false || user.unmask === 'false' || user.unmask === 0;



  // Priority 1: unmask property (top priority)

  if (unmaskFalse) {

    // For unmask: false, only mask list API, NOT detail API
    return !isDetailApi; // Mask list API, unmask detail API

  }



  if (unmaskValue) {

    // Priority 2: view_type property

    const viewType = user.view_type || user.viewType; // Check both possible property names



    if (viewType === 'listView' || viewType === 'list') {

      return false; // Unmask

    }

    if (viewType === 'detailsView' || viewType === 'details' || viewType === 'detailView') {

      // Mask list API, unmask detail API

      return !isDetailApi;

    }

    // If unmask is true but view_type is not set or invalid, default to mask

    return true;

  }



  // Default: mask

  return true;

};



/**

 * Apply masking to lead data based on user's unmask and view_type properties

 * @param {Object} lead - Lead object to mask

 * @param {Object} user - User object with unmask and view_type properties

 * @param {boolean} isDetailApi - Whether this is a detail API call

 * @returns {Object} - Lead object with masked data if applicable

 */

const applyLeadMasking = (lead, user, isDetailApi = false) => {
  if (!lead || !user) return lead;

  const isAdmin = user.role === 'Admin';
  const shouldMask = shouldMaskLeadData(user, isDetailApi);

  // Admins are not affected by masking
  if (isAdmin) {
    return lead;
  }

  // Apply masking if needed
  if (shouldMask) {
    const maskedLead = { ...lead };

    // Mask email
    if (maskedLead.email_from) {
      maskedLead.email_from = maskEmail(maskedLead.email_from);
    }

    // Mask phone number (show first 4 digits + *** + last 3 digits)
    if (maskedLead.phone) {
      maskedLead.phone = maskPhone(maskedLead.phone);
    }

    return maskedLead;
  }

  // No masking needed
  return lead;
};

/**
 * Helper function to process leads with their related data
 * @param {Array} leads - Array of lead documents
 * @param {Object} lookupMaps - Lookup maps for related data
 * @param {Object} stageMap - Stage information map
 * @param {Object} statusMap - Status information map
 * @param {boolean} includeOffers - Whether to include offers in agent data
 * @param {Object} user - User object to check role for data privacy
 * @param {string} projectFilter - Project filter for strict filtering
 * @param {Set} favouriteLeadIds - Set of favourite lead IDs for current user
 * @returns {Array} - Processed leads with related data
 * @param {boolean} isDetailApi - Whether this is a detail API call (GET /leads/:id) or list API (GET /leads)
 */
const processLeadsWithRelatedData = (
  leads,
  lookupMaps,
  stageMap,
  statusMap,
  includeOffers = true,
  user = null,
  projectFilter = null,
  favouriteLeadIds = null,
  isDetailApi = false
) => {
  const {
    assignmentsByLeadId,
    assignmentHistoryByLeadId,
    offersByLeadId,
    openingsByOfferId,
    confirmationsByOpeningId,
    paymentVouchersByConfirmationId,
    appointmentsByLeadId,
  } = lookupMaps;
  const isAdmin = user && user.role === 'Admin';

  // Helper function to escape special regex characters
  const escapeRegex = (string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape all special characters
  };

  return leads
    .map((lead) => {
      const leadId = lead._id.toString();

      const fullLeadHistory = assignmentHistoryByLeadId[leadId] || [];

      // Get assignments for this lead and sort by assignment date (most recent first)
      let leadAssignments = (assignmentsByLeadId[leadId] || []).sort(
        (a, b) => new Date(b.assigned_at) - new Date(a.assigned_at)
      );

      // If project filter is provided, STRICTLY filter to only show assignments matching the project
      if (projectFilter) {
        // Check if projectFilter is a MongoDB ObjectId (project_id) or a string (project_name)
        const mongoose = require('mongoose');
        const isObjectId = mongoose.Types.ObjectId.isValid(projectFilter);

        if (isObjectId) {
          // Filter by project ID (exact match)
          leadAssignments = leadAssignments.filter(
            (assignment) =>
              assignment.project_id &&
              assignment.project_id._id &&
              assignment.project_id._id.toString() === projectFilter.toString()
          );
        } else {
          // Filter by project name (exact match)
          const exactProjectRegex = new RegExp(`^${escapeRegex(projectFilter.trim())}$`, 'i');
          leadAssignments = leadAssignments.filter(
            (assignment) =>
              assignment.project_id &&
              assignment.project_id.name &&
              exactProjectRegex.test(assignment.project_id.name)
          );
        }

        // If no assignments match the filter after strict filtering, this lead shouldn't appear
        if (leadAssignments.length === 0) {
          return null; // This lead will be filtered out
        }
      }

      const primaryAssignment = leadAssignments.length > 0 ? leadAssignments[0] : null;

      // Get offers for this lead and attach openings with confirmations and payment vouchers
      let leadOffers = offersByLeadId[leadId] || [];

      // If project filtering is active, also filter offers to only show offers from the exact project
      if (projectFilter && leadOffers.length > 0) {
        const mongoose = require('mongoose');
        const isObjectId = mongoose.Types.ObjectId.isValid(projectFilter);

        if (isObjectId) {
          // Filter by project ID (exact match)
          leadOffers = leadOffers.filter((offer) => {
            return (
              offer.project_id &&
              offer.project_id._id &&
              offer.project_id._id.toString() === projectFilter.toString()
            );
          });
        } else {
          // Filter by project name (exact match)
          const exactProjectRegex = new RegExp(`^${escapeRegex(projectFilter.trim())}$`, 'i');
          leadOffers = leadOffers.filter((offer) => {
            // Check if offer belongs to the exact matching project
            return (
              offer.project_id &&
              offer.project_id.name &&
              exactProjectRegex.test(offer.project_id.name)
            );
          });
        }
      }

      const offersWithOpenings = attachOpeningsToOffers(
        leadOffers,
        openingsByOfferId,
        confirmationsByOpeningId,
        paymentVouchersByConfirmationId
      );

      // Process lead with stage and status information
      const processedLead = processLeadWithStageAndStatus(lead, stageMap, statusMap);

      // Use the new masking logic that considers both unmask and view_type

      const shouldMask = shouldMaskLeadData(user, isDetailApi);



      if (!isAdmin && shouldMask) {
        // Mask email to show only first 3 letters, then ****, then @ and partial domain
        processedLead.email_from = maskEmail(processedLead.email_from);

        // Mask phone number: show first 2 digits, asterisks, and last 2 digits
        // Example: 12046142597 -> 12*******97
        if (processedLead.phone) {
          processedLead.phone = maskPhone(processedLead.phone);
        }
      }

      // Create a map of offers by agent ID for projects - only for filtered offers
      const offersByAgentId = {};
      leadOffers.forEach((offer) => {
        const agentId = offer.agent_id.toString();
        if (!offersByAgentId[agentId]) {
          offersByAgentId[agentId] = [];
        }
        offersByAgentId[agentId].push(offer);
      });

      // Get the primary assignment's project and agent details
      const primaryProject = primaryAssignment ? primaryAssignment.project_id : null;
      const primaryAgentId = primaryAssignment ? primaryAssignment.agent_id._id.toString() : null;

      // Get offers for the primary agent (only filtered offers)
      const primaryAgentOffers = primaryAgentId ? offersByAgentId[primaryAgentId] || [] : [];
      const primaryAgentOffersWithOpenings = attachOpeningsToOffers(
        primaryAgentOffers,
        openingsByOfferId,
        confirmationsByOpeningId,
        paymentVouchersByConfirmationId
      );

      // Format the response to match the desired structure with projects as an array
      // ONLY include assignments that match the exact project filter (strict filtering)
      const leadProjects = [];

      if (primaryAssignment) {
        // Create a project entry with its agent and offers
        leadProjects.push({
          _id: primaryProject._id,
          name: primaryProject.name,
          color_code: primaryProject.color_code,
          agent: {
            _id: primaryAssignment.agent_id._id,
            login: primaryAssignment.agent_id.login,
            role: primaryAssignment.agent_id.role,
            color_code: primaryAssignment.agent_id.color_code,
            user_id: primaryAssignment.agent_id._id,
            ...(includeOffers && { offers: primaryAgentOffersWithOpenings }),
          },
        });

        // Add additional projects ONLY if they match the exact filter (when filter is active)
        leadAssignments.slice(1).forEach((assignment) => {
          if (assignment.project_id && assignment.agent_id) {
            const agentId = assignment.agent_id._id.toString();
            const agentOffers = offersByAgentId[agentId] || [];
            const agentOffersWithOpenings = attachOpeningsToOffers(
              agentOffers,
              openingsByOfferId,
              confirmationsByOpeningId,
              paymentVouchersByConfirmationId
            );

            leadProjects.push({
              _id: assignment.project_id._id,
              name: assignment.project_id.name,
              color_code: assignment.project_id.color_code,
              agent: {
                _id: assignment.agent_id._id,
                login: assignment.agent_id.login,
                role: assignment.agent_id.role,
                color_code: assignment.agent_id.color_code,
                user_id: assignment.agent_id._id,
                ...(includeOffers && { offers: agentOffersWithOpenings }),
              },
            });
          }
        });
      }

      // Get complete assignment history for this lead and apply strict filtering
      let leadHistory = fullLeadHistory || [];

      // Apply strict filtering to assignment history - only show history for the exact matching project
      if (projectFilter) {
        const mongoose = require('mongoose');
        const isObjectId = mongoose.Types.ObjectId.isValid(projectFilter);

        if (isObjectId) {
          // Filter by project ID (exact match)
          leadHistory = leadHistory.filter(
            (assignment) =>
              assignment.project_id &&
              assignment.project_id._id &&
              assignment.project_id._id.toString() === projectFilter.toString()
          );
        } else {
          // Filter by project name (exact match)
          const exactProjectRegex = new RegExp(`^${escapeRegex(projectFilter.trim())}$`, 'i');
          leadHistory = leadHistory.filter(
            (assignment) =>
              assignment.project_id &&
              assignment.project_id.name &&
              exactProjectRegex.test(assignment.project_id.name)
          );
        }
      }

      // Format assignment history for clean presentation
      const formattedHistory = leadHistory.map((assignment) => ({
        id: assignment._id,
        project: {
          id: assignment.project_id?._id,
          name: assignment.project_id?.name,
        },
        agent: {
          id: assignment.agent_id?._id,
          login: assignment.agent_id?.login,
          role: assignment.agent_id?.role,
          color_code: assignment.agent_id?.color_code,
        },
        assigned_by: {
          id: assignment.assigned_by?._id,
          login: assignment.assigned_by?.login,
          role: assignment.assigned_by?.role,
        },
        assigned_at: assignment.assigned_at,
        status: assignment.status,
        notes: assignment.notes,
      }));

      // Get appointments for this lead
      const leadAppointments = appointmentsByLeadId[leadId] || [];

      // Work out historical assignment metadata (previous + first source assignment)
      const historyDesc = [...fullLeadHistory]; // already sorted desc from fetchLeadAssignmentHistory
      const historyAsc = [...fullLeadHistory].sort(
        (a, b) => new Date(a.assigned_at) - new Date(b.assigned_at)
      );

      const primaryAssignmentId = primaryAssignment?._id?.toString() || null;
      const currentAgentId = processedLead.user_id?._id?.toString() || null;
      const primaryHistoryIndex = (() => {
        if (primaryAssignmentId) {
          const indexById = historyDesc.findIndex(
            (assignment) => assignment._id?.toString() === primaryAssignmentId
          );
          if (indexById !== -1) {
            return indexById;
          }
        }
        if (currentAgentId) {
          const indexByAgent = historyDesc.findIndex(
            (assignment) => assignment.agent_id?._id?.toString() === currentAgentId
          );
          if (indexByAgent !== -1) {
            return indexByAgent;
          }
        }
        return -1;
      })();
      const historyAfterPrimary =
        primaryHistoryIndex >= 0 ? historyDesc.slice(primaryHistoryIndex + 1) : historyDesc;
      const previousAssignment =
        historyAfterPrimary.find(
          (assignment) => assignment.agent_id && assignment.project_id
        ) || null;

      const sourceAssignment = historyAsc.length > 0 ? historyAsc[0] : null;

      const normalizeAgent = (assignment) =>
        assignment && assignment.agent_id
          ? {
            _id: assignment.agent_id._id,
            login: assignment.agent_id.login,
            role: assignment.agent_id.role,
            color_code: assignment.agent_id.color_code,
          }
          : null;

      const normalizeProject = (assignment) =>
        assignment && assignment.project_id
          ? {
            _id: assignment.project_id._id,
            name: assignment.project_id.name,
            color_code: assignment.project_id.color_code,
          }
          : null;

      const normalizeAgentDoc = (doc) =>
        doc
          ? {
            _id: doc._id || doc,
            login: doc.login,
            role: doc.role,
            color_code: doc.color_code,
          }
          : null;

      const normalizeProjectDoc = (doc) =>
        doc
          ? {
            _id: doc._id || doc,
            name: doc.name,
            color_code: doc.color_code,
          }
          : null;

      // Prefer snapshot fields stored on Lead (updated by transfer logic) and use history as a fallback
      const previousAgentSnapshot =
        normalizeAgentDoc(lead.prev_user_id) || normalizeAgent(previousAssignment);
      const previousProjectSnapshot =
        normalizeProjectDoc(lead.prev_team_id) || normalizeProject(previousAssignment);
      const sourceAgentSnapshot =
        normalizeAgentDoc(lead.source_agent) || normalizeAgent(sourceAssignment);
      const sourceProjectSnapshot =
        normalizeProjectDoc(lead.source_project) || normalizeProject(sourceAssignment);

      const formattedLead = {
        ...processedLead,
        // Add projects as an array (STRICTLY filtered to only the exact matching project)
        project: leadProjects,
        // Add offers as an array (STRICTLY filtered to only the exact matching project offers)
        offers: leadOffers,
        // Add appointments for this lead
        appointments: leadAppointments,
        // Add assignedAt directly at the top level (from primary assignment)
        assignedAt: primaryAssignment ? primaryAssignment.assigned_at : null,
        // Add complete assignment history (STRICTLY filtered to only the exact matching project)
        assignment_history: formattedHistory,
        // Add favourite status for current user
        is_favourite: favouriteLeadIds ? favouriteLeadIds.has(leadId) : false,
      };

      if ('source_user_id' in formattedLead) {
        delete formattedLead.source_user_id;
      }
      if ('source_team_id' in formattedLead) {
        delete formattedLead.source_team_id;
      }

      // Ensure snapshot reference fields are populated with rich data (fallback to history when needed)
      if (!formattedLead.prev_user_id && previousAgentSnapshot) {
        formattedLead.prev_user_id = previousAgentSnapshot;
      }
      if (!formattedLead.prev_team_id && previousProjectSnapshot) {
        formattedLead.prev_team_id = previousProjectSnapshot;
      }

      // Add source_agent and source_project snapshots
      formattedLead.source_agent = sourceAgentSnapshot;
      formattedLead.source_project = sourceProjectSnapshot;

      return formattedLead;
    })
    .filter((lead) => lead !== null); // Remove any null leads that didn't match the strict filter
};

/**
 * Apply project ID filter for agent queries
 * Only shows leads assigned to the agent for the specific project ID
 */
const applyProjectIdFilterForAgent = async (user, project_id, agentQuery) => {
  // First get the assigned leads for this user
  await filterLeadsByUserAssignment(user, agentQuery);

  logger.info(`Agent filtering by project ID: ${project_id}`);

  // Find assignments for this specific project ID only (most recent first)
  const projectAssignments = await AssignLeads.find({
    project_id: new mongoose.Types.ObjectId(project_id),
    agent_id: user._id, // Only this agent's assignments
    status: 'active',
  })
    .sort({ assigned_at: -1 }) // Most recent assignments first
    .select('lead_id assigned_at')
    .lean();

  if (projectAssignments.length > 0) {
    // Use only the most recent assignment for each lead (in case there are duplicates)
    const leadAssignmentMap = new Map();
    projectAssignments.forEach(assignment => {
      const leadId = assignment.lead_id.toString();
      if (!leadAssignmentMap.has(leadId)) {
        leadAssignmentMap.set(leadId, assignment);
      }
    });

    let leadIdsFromProject = Array.from(leadAssignmentMap.values()).map(a => a.lead_id);
    logger.info(
      `Found ${leadIdsFromProject.length} leads assigned to agent in this specific project`
    );

    // If source_id filter is already set, filter the lead IDs by source to ensure they match
    if (agentQuery.source_id) {
      const Lead = mongoose.model('Lead');
      const leadsWithSource = await Lead.find({
        _id: { $in: leadIdsFromProject },
        source_id: agentQuery.source_id,
      })
        .select('_id')
        .lean();

      const filteredLeadIds = leadsWithSource.map(lead => lead._id);
      logger.info(
        `After applying source filter (${agentQuery.source_id}), ${filteredLeadIds.length} leads remain from ${leadIdsFromProject.length} project leads`
      );
      leadIdsFromProject = filteredLeadIds;
    }

    // Update the query to only include leads from this specific project
    if (!agentQuery._id) {
      agentQuery._id = { $in: leadIdsFromProject };
    } else {
      // Intersect with existing lead IDs
      const existingIds = agentQuery._id.$in || [];
      const filteredIds = leadIdsFromProject.filter((id) =>
        existingIds.some((existingId) => existingId.toString() === id.toString())
      );
      agentQuery._id = { $in: filteredIds };
    }
  } else {
    // No leads assigned to this agent in this specific project
    logger.info(`No leads assigned to agent in project ID: ${project_id}`);
    agentQuery._id = { $in: [] }; // Ensure empty result
  }
};

/**
 * Apply project name filter for agent queries
 * @param {Object} user - User object
 * @param {string} project_name - Project name to filter by
 * @param {Object} agentQuery - Existing agent query
 * @returns {Promise<void>} - Updates agentQuery in place
 */
const applyProjectNameFilterForAgent = async (user, project_name, agentQuery) => {
  // First get the assigned leads for this user
  await filterLeadsByUserAssignment(user, agentQuery);

  const escapeRegex = (string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape all special characters
  };

  // Find the exact project by name (case-insensitive but exact match)
  const exactProject = await mongoose
    .model('Team')
    .findOne({
      name: {
        $regex: new RegExp(`^${escapeRegex(project_name.trim())}$`, 'i'), // strictly match full name
      },
      active: true,
    })
    .select('_id name')
    .lean();

  if (exactProject) {
    const projectId = exactProject._id;
    logger.info(`Found exact project match: '${exactProject.name}' (ID: ${projectId})`);

    // Find assignments for this SPECIFIC project only (most recent first)
    const projectAssignments = await AssignLeads.find({
      project_id: projectId, // Exact project ID match
      agent_id: user._id, // Only this agent's assignments
      status: 'active',
    })
      .sort({ assigned_at: -1 }) // Most recent assignments first
      .select('lead_id assigned_at')
      .lean();

    if (projectAssignments.length > 0) {
      // Use only the most recent assignment for each lead (in case there are duplicates)
      const leadAssignmentMap = new Map();
      projectAssignments.forEach(assignment => {
        const leadId = assignment.lead_id.toString();
        if (!leadAssignmentMap.has(leadId)) {
          leadAssignmentMap.set(leadId, assignment);
        }
      });

      let leadIdsFromProject = Array.from(leadAssignmentMap.values()).map(a => a.lead_id);
      logger.info(
        `Found ${leadIdsFromProject.length} leads assigned to agent in this specific project`
      );

      // If source_id filter is already set, filter the lead IDs by source to ensure they match
      if (agentQuery.source_id) {
        const Lead = mongoose.model('Lead');
        const leadsWithSource = await Lead.find({
          _id: { $in: leadIdsFromProject },
          source_id: agentQuery.source_id,
        })
          .select('_id')
          .lean();

        const filteredLeadIds = leadsWithSource.map(lead => lead._id);
        logger.info(
          `After applying source filter (${agentQuery.source_id}), ${filteredLeadIds.length} leads remain from ${leadIdsFromProject.length} project leads`
        );
        leadIdsFromProject = filteredLeadIds;
      }

      // Update the query to only include leads from this specific project
      if (!agentQuery._id) {
        agentQuery._id = { $in: leadIdsFromProject };
      } else {
        // Intersect with existing lead IDs
        const existingIds = agentQuery._id.$in || [];
        const filteredIds = leadIdsFromProject.filter((id) =>
          existingIds.some((existingId) => existingId.toString() === id.toString())
        );
        agentQuery._id = { $in: filteredIds };
        logger.info(`After project filtering, ${filteredIds.length} leads remain`);
      }
    } else {
      // No leads assigned to this agent in this specific project
      logger.info(`No leads assigned to agent in project '${exactProject.name}'`);
      agentQuery._id = { $in: [] }; // Ensure empty result
    }
  } else {
    // No exact project match found
    logger.info(`No exact project found matching '${project_name}'`);
    agentQuery._id = { $in: [] }; // Ensure empty result
  }
};

/**
 * Core function to execute a lead query and process the results
 * @param {Object} user - User object
 * @param {Object} dbQuery - MongoDB query object
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @param {boolean} includeOffers - Whether to include offers in agent data
 * @param {string} state - State filter
 * @param {boolean} has_todo - Todo filter
 * @param {('all'|'assigned_to_me'|'assigned_by_me')} todo_scope - Todo scope filter
 * @param {boolean} pending_todos - When has_todo=true, only show pending (incomplete) todos
 * @param {boolean} done_todos - When has_todo=true, only show done (completed) todos
 * @param {string} sortBy - Field to sort by
 * @param {string} sortOrder - Sort order (asc/desc)
 * @param {string} projectNameFilter - Project name filter to limit displayed projects
 * @param {('offer'|'lead'|null)} ticket_source - Filter tickets by source (offer tickets vs lead tickets)
 * @returns {Promise<Object>} - Paginated leads with metadata
 */
const executeLeadQuery = async (
  user,
  dbQuery,
  page,
  limit,
  includeOffers = true,
  state = null,
  has_todo = null,
  has_ticket = null,
  todo_scope = 'all',
  pending_todos = null,
  done_todos = null,
  sortBy = 'createdAt',
  sortOrder = 'desc',
  projectFilter = null,
  ticket_source = null
) => {
  // Normalize boolean parameters (handle both string 'true' and boolean true from query params)
  const normalizedPendingTodos = pending_todos === true || pending_todos === 'true';
  const normalizedDoneTodos = done_todos === true || done_todos === 'true';
  // Normalize ticket_source filter
  const normalizedTicketSource = ticket_source && ['offer', 'lead'].includes(ticket_source) ? ticket_source : null;

  // IMPROVED APPROACH: Don't pre-filter leads by todo scope to maintain proper pagination
  // Instead, we'll filter todos by scope when displaying them, but show all leads
  // This ensures statistics work correctly and pagination behaves as expected
  let effectiveQuery = { ...dbQuery };

  // Store the original query for statistics calculation
  const originalDbQuery = { ...dbQuery };

  // Only apply todo scope filtering to the todo objects, not to the lead query itself
  // This maintains the expected behavior while ensuring statistics are always present

  // Log the final query being used (summary only)
  // logger.info('Executing lead query', {
  //   queryType: effectiveQuery.$and ? 'compound' : 'simple',
  //   hasAndConditions: !!effectiveQuery.$and,
  //   topLevelKeys: Object.keys(effectiveQuery),
  //   conditionCount: effectiveQuery.$and ? effectiveQuery.$and.length : 1
  // });

  // If ticket_source filter is applied, we need to pre-filter leads based on their tickets
  if (normalizedTicketSource && (has_todo || has_ticket)) {
    const ticketSourceQuery = {
      active: true,
      ...(normalizedTicketSource === 'offer' ? { offer_id: { $exists: true, $ne: null } } : {}),
      ...(normalizedTicketSource === 'lead' ? { $or: [{ offer_id: null }, { offer_id: { $exists: false } }] } : {}),
      ...(normalizedPendingTodos ? { isDone: false } : {}),
      ...(normalizedDoneTodos ? { isDone: true } : {}),
    };
    
    // Get lead IDs that have matching tickets
    const leadIdsWithMatchingTickets = await Todo.distinct('lead_id', ticketSourceQuery);
    
    // Intersect with existing query
    if (effectiveQuery._id && effectiveQuery._id.$in) {
      const existingIds = new Set(effectiveQuery._id.$in.map(id => id.toString()));
      const filteredIds = leadIdsWithMatchingTickets.filter(id => existingIds.has(id.toString()));
      effectiveQuery._id = { $in: filteredIds };
    } else {
      effectiveQuery._id = { $in: leadIdsWithMatchingTickets };
    }
    
    logger.info(`Filtered leads by ticket_source=${normalizedTicketSource}, found ${leadIdsWithMatchingTickets.length} leads`);
  }

  // Count total leads matching the query
  let total = await Lead.countDocuments(effectiveQuery);

  logger.info(`Total leads found: ${total}`);

  // If no leads found, return empty result with pagination metadata
  if (total === 0) {
    logger.warn(`No leads found matching query for user ${user._id}`);
    return {
      data: [],
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  // Normalize page to ensure it doesn't exceed available pages
  const paginationInfo = normalizePagination(page, total, limit);
  const normalizedPage = paginationInfo.page;
  if (paginationInfo.adjusted) {
    logger.info(`Page ${page} exceeds available pages (${paginationInfo.pages}), adjusted to page ${normalizedPage}`);
  }

  // Check if we need special handling for revenue sorting, lead_source_no sorting, lead_date sorting, or todo-based sorting
  logger.info('Checking sort type', { sortBy, sortOrder, sortByType: typeof sortBy });
  const isRevenueSort = sortBy === 'expected_revenue';
  const isLeadSourceNoSort = sortBy === 'lead_source_no';
  const isLeadDateSort = sortBy === 'lead_date';
  const isProjectNameSort = sortBy === 'project_name';
  const isTodoBasedSort = has_todo === true;

  if (isRevenueSort) {
    logger.info('Revenue sort detected, will use aggregation pipeline');
  }

  let leads;
  let skip = paginationInfo.offset;

  if (isTodoBasedSort) {
    // For todo-based sorting, we need to aggregate leads with their most recent todo
    // and sort them by the most recent todo creation date
    logger.info('Todo-based sorting detected, using aggregation pipeline');

    // Create aggregation pipeline to get leads with their most recent todo date
    const pipeline = [
      // Match leads from our query
      { $match: effectiveQuery },

      // Lookup todos for each lead
      {
        $lookup: {
          from: 'todos',
          localField: '_id',
          foreignField: 'lead_id',
          pipeline: [
            {
              $match: {
                active: true,
                ...(normalizedPendingTodos ? { isDone: false } : {}),
                ...(normalizedDoneTodos ? { isDone: true } : {}),
                ...(todo_scope === 'assigned_to_me' ? { assigned_to: user._id } : {}),
                ...(todo_scope === 'assigned_by_me' ? {
                  creator_id: user._id,
                  assigned_to: { $nin: [null, user._id] }
                } : {}),
                // Apply ticket source filter
                ...(normalizedTicketSource === 'offer' ? { offer_id: { $exists: true, $ne: null } } : {}),
                ...(normalizedTicketSource === 'lead' ? { $or: [{ offer_id: null }, { offer_id: { $exists: false } }] } : {})
              }
            },
            { $sort: { createdAt: -1 } }, // Sort todos by creation date descending
            { $limit: 1 } // Get only the most recent todo
          ],
          as: 'recentTodos'
        }
      },

      // Add field for most recent todo date (for sorting)
      {
        $addFields: {
          mostRecentTodoDate: {
            $ifNull: [
              { $arrayElemAt: ['$recentTodos.createdAt', 0] },
              new Date(0) // If no todos, use epoch time (very old date)
            ]
          }
        }
      },

      // Sort by most recent todo date (descending - newest first)
      { $sort: { mostRecentTodoDate: -1 } },

      // Remove the temporary recentTodos field
      { $unset: 'recentTodos' },

      // Apply pagination
      { $skip: skip },
      { $limit: parseInt(limit) }
    ];

    // Execute aggregation
    leads = await Lead.aggregate(pipeline);

  } else if (isRevenueSort) {
    // Fallback to in-memory sort to guarantee correct ordering for formatted strings (e.g., "24.18k")
    logger.info('Revenue sorting detected, sorting in application memory for correctness');

    // Fetch all matching leads (minimal fields for performance)
    leads = await Lead.find(effectiveQuery)
      .select('_id contact_name email_from secondary_email phone lead_source_no expected_revenue offer_calls status stage use_status duplicate_status assigned_date active createdAt updatedAt source_id user_id stage_id status_id lead_date prev_user_id prev_team_id source_agent source_project team_id')
      .lean();

    // Sort using robust JS parser
    leads.sort((a, b) => {
      const aValue = parseRevenueValue(a.expected_revenue);
      const bValue = parseRevenueValue(b.expected_revenue);
      const comparison = sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
      if (comparison !== 0) return comparison;
      // Stable tie-breaker
      return a._id.toString().localeCompare(b._id.toString());
    });

    // Apply pagination after sorting
    leads = leads.slice(skip, skip + parseInt(limit));
  } else if (isLeadSourceNoSort) {
    // For lead_source_no sorting, use JavaScript sorting to ensure proper numerical ordering
    logger.error('=== LEAD_SOURCE_NO SORTING CODE EXECUTING ===', {
      sortBy,
      sortOrder,
      isLeadSourceNoSort,
      conditionCheck: sortBy === 'lead_source_no'
    });

    try {
      // Fetch all leads matching the query
      leads = await Lead.find(effectiveQuery)
        .select('_id contact_name email_from secondary_email phone lead_source_no expected_revenue offer_calls status stage use_status duplicate_status assigned_date active createdAt updatedAt source_id user_id stage_id status_id lead_date prev_user_id prev_team_id source_agent source_project')
        .lean();

      // Normalize sortOrder BEFORE sorting
      const normalizedSortOrder = sortOrder ? String(sortOrder).toLowerCase().trim() : 'desc';
      const isDescending = normalizedSortOrder === 'desc';

      // Sort leads by lead_source_no as a number
      leads.sort((a, b) => {
        try {
          const aValue = a.lead_source_no ? parseFloat(a.lead_source_no.toString().trim()) : 0;
          const bValue = b.lead_source_no ? parseFloat(b.lead_source_no.toString().trim()) : 0;

          if (isNaN(aValue)) return 1;
          if (isNaN(bValue)) return -1;

          const comparison = isDescending ? (bValue - aValue) : (aValue - bValue);

          if (comparison === 0) {
            const aId = a._id ? a._id.toString() : '';
            const bId = b._id ? b._id.toString() : '';
            return aId.localeCompare(bId);
          }

          return comparison;
        } catch (sortError) {
          logger.error('Error sorting lead_source_no values', { error: sortError.message });
          return 1;
        }
      });

      // Apply pagination after sorting
      leads = leads.slice(skip, skip + parseInt(limit));

      // Log first few results to verify sorting
      if (leads.length > 0) {
        logger.error('lead_source_no sorting completed - first 5 values:', {
          values: leads.slice(0, 5).map(l => l.lead_source_no),
          sortOrder,
          isDescending
        });
      }
    } catch (leadSourceNoSortError) {
      logger.error('Error in lead_source_no sorting', { error: leadSourceNoSortError.message });
      throw new Error(`Failed to sort by lead_source_no: ${leadSourceNoSortError.message}`);
    }
  } else if (isLeadDateSort) {
    // For lead_date sorting, use JavaScript sorting to ensure proper date ordering
    logger.error('=== LEAD_DATE SORTING CODE EXECUTING ===', {
      sortBy,
      sortOrder,
      isLeadDateSort,
      conditionCheck: sortBy === 'lead_date'
    });

    try {
      // Fetch all leads matching the query
      const allLeads = await Lead.find(effectiveQuery)
        .select('_id contact_name email_from secondary_email phone lead_source_no expected_revenue offer_calls status stage use_status duplicate_status assigned_date active createdAt updatedAt source_id user_id stage_id status_id lead_date prev_user_id prev_team_id source_agent source_project')
        .lean();

      // Normalize sortOrder BEFORE sorting
      const normalizedSortOrder = sortOrder ? String(sortOrder).toLowerCase().trim() : 'desc';
      const isDescending = normalizedSortOrder === 'desc';

      // Sort leads by lead_date as a Date
      allLeads.sort((a, b) => {
        try {
          const aValue = a.lead_date ? new Date(a.lead_date).getTime() : 0;
          const bValue = b.lead_date ? new Date(b.lead_date).getTime() : 0;

          if (isNaN(aValue)) return 1;
          if (isNaN(bValue)) return -1;

          const comparison = isDescending ? (bValue - aValue) : (aValue - bValue);

          if (comparison === 0) {
            const aId = a._id ? a._id.toString() : '';
            const bId = b._id ? b._id.toString() : '';
            return aId.localeCompare(bId);
          }

          return comparison;
        } catch (sortError) {
          logger.error('Error sorting lead_date values', { error: sortError.message });
          return 1;
        }
      });

      // Apply pagination AFTER sorting
      leads = allLeads.slice(skip, skip + parseInt(limit));

      // Log first few results to verify sorting
      if (leads.length > 0) {
        logger.error('lead_date sorting completed - first 5 dates:', {
          dates: leads.slice(0, 5).map(l => l.lead_date),
          timestamps: leads.slice(0, 5).map(l => l.lead_date ? new Date(l.lead_date).getTime() : 0),
          sortOrder,
          isDescending
        });
      }
    } catch (leadDateSortError) {
      logger.error('Error in lead_date sorting', { error: leadDateSortError.message });
      throw new Error(`Failed to sort by lead_date: ${leadDateSortError.message}`);
    }
  } else if (isProjectNameSort) {
    const allLeads = await Lead.find(effectiveQuery)
      .select(
        '_id contact_name email_from secondary_email phone lead_source_no expected_revenue offer_calls status stage use_status duplicate_status assigned_date active createdAt updatedAt source_id user_id stage_id status_id lead_date prev_user_id prev_team_id source_agent source_project team_id'
      )
      .lean();

    const teamIdSet = new Set();
    allLeads.forEach((l) => {
      if (l.team_id) teamIdSet.add(l.team_id.toString());
    });
    const teamDocs =
      teamIdSet.size > 0
        ? await Team.find({ _id: { $in: [...teamIdSet].map((id) => new mongoose.Types.ObjectId(id)) } })
            .select('_id name')
            .lean()
        : [];
    const nameByTeamId = new Map(teamDocs.map((t) => [t._id.toString(), (t.name || '').toLowerCase()]));

    const normalizedSortOrder = sortOrder ? String(sortOrder).toLowerCase().trim() : 'desc';
    const isDescending = normalizedSortOrder === 'desc';

    allLeads.sort((a, b) => {
      const aName = a.team_id ? nameByTeamId.get(a.team_id.toString()) ?? '' : '';
      const bName = b.team_id ? nameByTeamId.get(b.team_id.toString()) ?? '' : '';
      let cmp = aName.localeCompare(bName, undefined, { sensitivity: 'base' });
      if (isDescending) cmp = -cmp;
      if (cmp !== 0) return cmp;
      return a._id.toString().localeCompare(b._id.toString());
    });

    leads = allLeads.slice(skip, skip + parseInt(limit, 10));
  } else {
    // Standard sorting - use MongoDB sorting
    const sortObject = parseSortParameters(sortBy, sortOrder);

    // Get paginated leads with optimized field projection
    leads = await Lead.find(effectiveQuery)
      .select(
        '_id contact_name email_from secondary_email phone lead_source_no expected_revenue offer_calls status stage use_status duplicate_status assigned_date active createdAt updatedAt source_id user_id stage_id status_id lead_date prev_user_id prev_team_id source_agent source_project'
      )
      .sort(sortObject)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
  }

  await hydrateLeadReferences(leads);

  // If no leads found after pagination, return empty result
  if (leads.length === 0) {
    return {
      data: [],
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  const leadIds = leads.map((lead) => lead._id);

  // Fetch favourite status for current user
  const favourites = await Favourite.find({
    lead_id: { $in: leadIds },
    user_id: user._id,
    active: true,
  })
    .select('lead_id')
    .lean();

  const favouriteLeadIds = new Set(favourites.map((fav) => fav.lead_id.toString()));

  // Fetch all related data
  const {
    assignments,
    assignmentHistory,
    offers,
    openings,
    confirmations,
    paymentVouchers,
    appointments,
    stageMap,
    statusMap,
  } = await fetchLeadRelatedData(leadIds, user);

  // Create lookup maps
  const lookupMaps = createLookupMaps(
    assignments,
    assignmentHistory,
    offers,
    openings,
    confirmations,
    paymentVouchers,
    appointments
  );

  // CRITICAL: Create a map to preserve original sort order AFTER sorting
  // processLeadsWithRelatedData uses .map() which preserves order, but we need to ensure
  // the order is maintained even if some leads are filtered out
  // IMPORTANT: Create this map AFTER leads have been sorted, so we preserve the SORTED order
  const leadOrderMap = new Map();
  leads.forEach((lead, index) => {
    leadOrderMap.set(lead._id.toString(), index);
  });

  // Process leads with related data - pass user to control data privacy
  // NOTE: .map() preserves order, so sorted leads will remain sorted
  const processedLeads = processLeadsWithRelatedData(
    leads,
    lookupMaps,
    stageMap,
    statusMap,
    includeOffers,
    user,
    projectFilter,
    favouriteLeadIds,
    false // isDetailApi = false for GET /leads (list API)
  );

  // CRITICAL: Re-sort processedLeads to maintain SORTED order from leads array
  // This ensures sorting is preserved even after processing (which may filter some leads)
  // Only re-sort if we have an order map (i.e., leads were already sorted)
  if (leadOrderMap.size > 0) {
    processedLeads.sort((a, b) => {
      const aOrder = leadOrderMap.get(a._id.toString()) ?? Infinity;
      const bOrder = leadOrderMap.get(b._id.toString()) ?? Infinity;
      return aOrder - bOrder;
    });
  }

  // Always fetch todo counts for all leads (active and not done)
  const todoCountResults = await Todo.aggregate([
    {
      $match: {
        lead_id: { $in: leadIds },
        active: true,
        isDone: false,
      },
    },
    {
      $group: {
        _id: '$lead_id',
        todoCount: { $sum: 1 },
      },
    },
  ]);

  // Create todo count lookup map using Map for better performance
  const todoCountMap = new Map();
  for (const result of todoCountResults) {
    const leadId = result._id?.toString();
    if (leadId) {
      todoCountMap.set(leadId, result.todoCount);
    }
  }

  // Add todo counts to each lead
  let leadsWithTodoCounts = processedLeads.map((lead) => ({
    ...lead,
    todoCount: todoCountMap.get(lead._id.toString()) || 0,
  }));

  // Normalize boolean values
  const normalizedHasTodo = has_todo === true || has_todo === 'true';
  const normalizedHasTicket = has_ticket === true || has_ticket === 'true';

  // Add detailed todo objects if has_todo or has_ticket filter is applied
  console.log('executeLeadQuery - Checking todo/ticket filter:', {
    normalizedHasTodo,
    normalizedHasTicket,
    willEnter: normalizedHasTodo || normalizedHasTicket,
    leadIdsCount: leadIds.length,
  });

  if (normalizedHasTodo || normalizedHasTicket) {
    console.log('executeLeadQuery - Entering todo/ticket processing block');
    // Fetch actual todo objects for all leads (all active todos and tickets with sorting)
    // When has_ticket=true, return all todos and tickets (no type filtering)
    const baseTodoQuery = {
      lead_id: { $in: leadIds },
      active: true,
    };

    // Remove type filtering - always return all todos and tickets
    // No type filter applied - will fetch all active todos and tickets

    // Apply scope conditions
    if (todo_scope === 'assigned_to_me') {
      baseTodoQuery.assigned_to = user._id;
    } else if (todo_scope === 'assigned_by_me') {
      baseTodoQuery.creator_id = user._id;
      baseTodoQuery.assigned_to = { $nin: [null, user._id] };
    }

    // Apply pending/done todo filters
    if (normalizedPendingTodos) {
      baseTodoQuery.isDone = false; // Only pending (incomplete) todos
    } else if (normalizedDoneTodos) {
      baseTodoQuery.isDone = true; // Only done (completed) todos
    }
    // If neither pending_todos nor done_todos is specified, show all todos (default behavior)

    // Apply ticket source filter (offer tickets vs lead tickets)
    if (normalizedTicketSource === 'offer') {
      // Only offer tickets (have offer_id)
      baseTodoQuery.offer_id = { $exists: true, $ne: null };
    } else if (normalizedTicketSource === 'lead') {
      // Only lead tickets (no offer_id or offer_id is null)
      baseTodoQuery.$or = baseTodoQuery.$or || [];
      baseTodoQuery.$and = [
        ...(baseTodoQuery.$and || []),
        { $or: [{ offer_id: null }, { offer_id: { $exists: false } }] }
      ];
    }

    const activeTodos = await Todo.find(baseTodoQuery)
      .populate('creator_id', '_id login role')
      .populate('assigned_to', '_id login role')
      .populate('assigned_by', '_id login role')
      .populate('offer_id', '_id title investment_volume bank_id status current_stage')
      .sort({ isDone: 1, createdAt: -1 }) // Sort by isDone (false first), then by creation date
      .lean();

    // Fetch lead user_id mappings for access control
    // This allows agents to see todos if they're assigned to the lead, even if not assigned to the todo
    const uniqueLeadIds = [...new Set(activeTodos.map(todo => todo.lead_id?.toString()).filter(Boolean))];
    const leadUserMap = new Map();
    if (uniqueLeadIds.length > 0) {
      const leads = await Lead.find({ _id: { $in: uniqueLeadIds } })
        .select('_id user_id')
        .lean();
      for (const lead of leads) {
        if (lead._id && lead.user_id) {
          leadUserMap.set(lead._id.toString(), lead.user_id.toString());
        }
      }
    }

    // Use Map for better performance during todo object map creation
    const todoObjectMap = new Map();
    const userId = user._id.toString();
    const isAdmin = user.role === 'Admin';

    console.log('executeLeadQuery - Processing todos, total count:', activeTodos.length);
    console.log('executeLeadQuery - User ID:', userId, 'isAdmin:', isAdmin);

    for (const todo of activeTodos) {
      // Admin users can see ALL todos and tickets without access restrictions
      if (!isAdmin) {
        const leadId = todo.lead_id?.toString();
        const leadUserId = leadId ? leadUserMap.get(leadId) : null;
        const isAssignedToLead = leadUserId && leadUserId === userId;
        const isAssigned = todo.assigned_to && todo.assigned_to._id && todo.assigned_to._id.toString() === userId;

        // When pending_todos=true, apply special access control rules:
        // - If agent is assigned to the lead: see ALL todos in that lead
        // - If agent is NOT assigned to the lead: see only todos assigned to them
        if (normalizedPendingTodos) {
          if (isAssignedToLead) {
            // Agent assigned to lead: see ALL todos in that lead (no filtering needed)
            // Continue to add this todo
          } else {
            // Agent NOT assigned to lead: only see todos assigned to them
            if (!isAssigned) {
              continue; // Skip this todo - agent not assigned to lead and not assigned to todo
            }
          }
        } else {
          // Default behavior: check if user is creator, assigned to todo, or assigned to the lead
          const isCreator = todo.creator_id && todo.creator_id._id && todo.creator_id._id.toString() === userId;
          if (!isCreator && !isAssigned && !isAssignedToLead) {
            continue; // Skip this todo - user has no access
          }
        }
      }

      const leadId = todo.lead_id?.toString();
      if (!leadId) continue;
      if (!todoObjectMap.has(leadId)) {
        todoObjectMap.set(leadId, []);
      }
      todoObjectMap.get(leadId).push({
        _id: todo._id,
        message: todo.message,
        isDone: todo.isDone,
        active: todo.active,
        type: todo.type,
        time: todo.completion_duration || null,
        creator: {
          _id: todo.creator_id._id,
          login: todo.creator_id.login,
          role: todo.creator_id.role,
        },
        assignedTo: todo.assigned_to
          ? {
            _id: todo.assigned_to._id,
            login: todo.assigned_to.login,
            role: todo.assigned_to.role,
          }
          : null,
        createdAt: todo.createdAt,
        updatedAt: todo.updatedAt,
        dateOfDone: todo.dateOfDone || null,
        dateOfDoneTime: todo.dateOfDone ? new Date(todo.dateOfDone).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) : null,
      });
    }

    // Add todo objects to each lead and update todoCount to reflect only visible todos
    leadsWithTodoCounts = leadsWithTodoCounts.map((lead) => {
      const visibleTodos = todoObjectMap.get(lead._id.toString()) || [];
      return {
        ...lead,
        activeTodos: visibleTodos,
        // Update todoCount to reflect only visible todos
        todoCount: visibleTodos.length,
      };
    });

    // When pending_todos or done_todos filter is applied, only return leads that have matching todos
    // This ensures that if done_todos=true, only leads with at least one done todo are returned
    // Also filter when has_todo or has_ticket is true to exclude leads with empty activeTodos
    if (normalizedPendingTodos || normalizedDoneTodos || normalizedHasTodo || normalizedHasTicket) {
      leadsWithTodoCounts = leadsWithTodoCounts.filter((lead) => lead.activeTodos.length > 0);
    }
  }

  // Apply flattening if state filter is provided
  const finalLeads = flattenLeadsByState(leadsWithTodoCounts, state);

  // Prepare response object with updated pagination metadata (using normalized page)
  let responseMeta;
  if (has_todo === true || has_ticket === true) {
    // Use custom pagination metadata when todos/tickets are included
    responseMeta = {
      total,
      page: normalizedPage,
      limit: parseInt(limit),
      totalPages: paginationInfo.pages,
      hasNextPage: normalizedPage < paginationInfo.pages,
      hasPrevPage: normalizedPage > 1,
    };
  } else {
    // Use standard pagination metadata (already uses normalized page internally)
    responseMeta = buildPaginationMeta(total, normalizedPage, limit);
  }

  const response = {
    data: finalLeads,
    meta: responseMeta,
  };

  // IMPORTANT: Always add comprehensive todos statistics when has_todo=true
  // This ensures the statistics field is present regardless of other query parameters
  // The statistics are calculated based on the original lead set, not filtered results
  if (has_todo === true) {
    // Get all leads from the ORIGINAL dbQuery (before any filtering) for comprehensive statistics
    // This ensures statistics are always calculated even when scope filtering reduces the result set
    const baseLeadIds = await Lead.find(originalDbQuery).select('_id').lean();
    const allLeadIdArray = baseLeadIds.map((lead) => lead._id);

    // Calculate todos statistics across ALL leads (not just the paginated ones)
    // Apply the same pending/done filters to statistics if specified
    const statsMatchQuery = {
      lead_id: { $in: allLeadIdArray },
      active: true,
    };

    // Apply pending/done todo filters to statistics
    if (normalizedPendingTodos) {
      statsMatchQuery.isDone = false; // Only pending (incomplete) todos
    } else if (normalizedDoneTodos) {
      statsMatchQuery.isDone = true; // Only done (completed) todos
    }

    // Build queries for parallel execution
    const todosStatsPromise = Todo.aggregate([
      {
        $match: statsMatchQuery,
      },
      {
        $group: {
          _id: null,
          total_todos: { $sum: 1 },
          pending_todos: { $sum: { $cond: [{ $eq: ['$isDone', false] }, 1, 0] } },
          completed_todos: { $sum: { $cond: [{ $eq: ['$isDone', true] }, 1, 0] } },
          assigned_todos: { $sum: { $cond: [{ $ne: ['$assigned_to', null] }, 1, 0] } },
          unassigned_todos: { $sum: { $cond: [{ $eq: ['$assigned_to', null] }, 1, 0] } },
        },
      },
    ]);

    // Prepare scope-specific statistics query if needed
    let scopeStatsPromise = Promise.resolve([]);
    if (todo_scope !== 'all') {
      const scopeQuery = {
        lead_id: { $in: allLeadIdArray }, // Use complete lead set for scope statistics
        active: true,
      };

      if (todo_scope === 'assigned_to_me') {
        scopeQuery.assigned_to = user._id;
      } else if (todo_scope === 'assigned_by_me') {
        scopeQuery.creator_id = user._id;
        scopeQuery.assigned_to = { $nin: [null, user._id] };
      }

      // Apply pending/done todo filters to scope statistics
      if (normalizedPendingTodos) {
        scopeQuery.isDone = false; // Only pending (incomplete) todos
      } else if (normalizedDoneTodos) {
        scopeQuery.isDone = true; // Only done (completed) todos
      }

      scopeStatsPromise = Todo.aggregate([
        { $match: scopeQuery },
        {
          $group: {
            _id: null,
            scope_total_todos: { $sum: 1 },
            scope_pending_todos: { $sum: { $cond: [{ $eq: ['$isDone', false] }, 1, 0] } },
            scope_completed_todos: { $sum: { $cond: [{ $eq: ['$isDone', true] }, 1, 0] } },
          },
        },
      ]);
    }

    // Prepare leads count query
    const leadsCountQuery = {
      lead_id: { $in: allLeadIdArray },
      active: true,
    };

    // Apply pending/done todo filters to leads count
    if (normalizedPendingTodos) {
      leadsCountQuery.isDone = false; // Only count leads with pending todos
    } else if (normalizedDoneTodos) {
      leadsCountQuery.isDone = true; // Only count leads with done todos
    } else {
      // Default: count leads with any active todos (pending)
      leadsCountQuery.isDone = false;
    }

    const leadsWithTodosCountPromise = allLeadIdArray.length > 0
      ? Todo.distinct('lead_id', leadsCountQuery).then(ids => ids.length)
      : Promise.resolve(0);

    // Execute all statistics queries in parallel for better performance
    const [todosStats, scopeStats, leadsWithTodosCount] = await Promise.all([
      todosStatsPromise,
      scopeStatsPromise,
      leadsWithTodosCountPromise,
    ]);

    // Extract statistics or provide defaults
    const stats = todosStats[0] || {
      total_todos: 0,
      pending_todos: 0,
      completed_todos: 0,
      assigned_todos: 0,
      unassigned_todos: 0,
    };

    // Process scope-specific statistics
    let scopeSpecificStats = null;
    if (todo_scope !== 'all' && scopeStats[0]) {
      scopeSpecificStats = {
        total_count: scopeStats[0].scope_total_todos,
        pending_count: scopeStats[0].scope_pending_todos,
        completed_count: scopeStats[0].scope_completed_todos,
        completion_rate:
          scopeStats[0].scope_total_todos > 0
            ? Math.round(
              (scopeStats[0].scope_completed_todos / scopeStats[0].scope_total_todos) * 100
            )
            : 0,
      };
    }

    // Add todos statistics to response
    // Note: When has_todo=true, only leads with todos are returned, so leads_without_todos will be 0
    response.statistics = {
      leads_with_todos: has_todo === true ? finalLeads.length : leadsWithTodosCount,
      leads_without_todos: has_todo === true ? 0 : allLeadIdArray.length - leadsWithTodosCount,
      todos: {
        total_count: stats.total_todos,
        pending_count: stats.pending_todos,
        completed_count: stats.completed_todos,
        assigned_count: stats.assigned_todos,
        unassigned_count: stats.unassigned_todos,
        completion_rate:
          stats.total_todos > 0 ? Math.round((stats.completed_todos / stats.total_todos) * 100) : 0,
      },
      filters: {
        pending_todos: pending_todos || false,
        done_todos: done_todos || false,
        description: {
          pending_todos: 'When true, only pending (incomplete) todos are shown',
          done_todos: 'When true, only done (completed) todos are shown',
          default: 'When neither is specified, all todos are shown',
        },
      },
      scope: {
        current_scope: todo_scope,
        available_scopes: ['all', 'assigned_to_me', 'assigned_by_me'],
        description: {
          all: 'All active todos for the leads',
          assigned_to_me: 'Todos assigned to the current user',
          assigned_by_me: 'Todos created by the current user and assigned to others',
        },
        // Add scope-specific statistics when applicable
        ...(scopeSpecificStats && { scope_statistics: scopeSpecificStats }),
      },
    };

    logger.info('📊 Todos statistics ALWAYS added to leads response when has_todo=true', {
      userId: user._id,
      totalLeads: finalLeads.length,
      leadsWithTodos: response.statistics.leads_with_todos,
      totalTodos: stats.total_todos,
      pendingTodos: stats.pending_todos,
      completedTodos: stats.completed_todos,
      scope: todo_scope,
      pendingTodosFilter: pending_todos,
      doneTodosFilter: done_todos,
      scopeSpecificStats: !!scopeSpecificStats,
      message:
        'Statistics field guaranteed when has_todo=true, regardless of other query parameters',
    });
  }

  return response;
};

/**
 * Get all leads with filtering, pagination, and permission checking
 * @param {Object} user - User object
 * @param {Object} query - Query parameters
 * @param {Function} hasPermissionFn - Function to check permissions
 * @param {Object} permissions - Permissions object
 * @returns {Promise<Object>} - Paginated leads with metadata
 */
const getAllLeads = async (user, query, hasPermissionFn, permissions) => {
  const {
    page = 1,
    limit = 50,
    status,
    search,
    showInactive = false,
    includeAll = false,
    use_status,
    has_opening,
    project_name,
    project_id,
    investment_volume,
    agent_name,
    duplicate,
    state,
    has_todo,
    has_ticket,
    todo_scope = 'all',
    pending_todos,
    pending, // Support 'pending' as alias for 'pending_todos'
    done_todos,
    ticket_source, // 'offer' | 'lead' | undefined - filter by ticket source
    source,
    has_schedule,
    has_transferred_offer,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = query;

  // Normalize boolean query parameters (they come as strings from URL)
  const normalizedHasTodo = has_todo === true || has_todo === 'true';
  const normalizedHasTicket = has_ticket === true || has_ticket === 'true';
  // Normalize ticket_source filter ('offer' or 'lead')
  const normalizedTicketSource = ticket_source && ['offer', 'lead'].includes(ticket_source) ? ticket_source : null;
  const normalizedHasSchedule = has_schedule === true || has_schedule === 'true';
  const normalizedHasTransferredOffer = has_transferred_offer === true || has_transferred_offer === 'true';
  // Support both 'pending_todos' and 'pending' as query parameters
  const normalizedPendingTodos = (pending_todos === true || pending_todos === 'true') || (pending === true || pending === 'true');
  const normalizedDoneTodos = done_todos === true || done_todos === 'true';

  // For agents, we'll prioritize their assignments
  if (!await hasPermissionFn(user.role, permissions.LEAD_READ_ALL)) {
    logger.info(`User ${user._id} is not admin, will prioritize their assignments`);

    // If state filter, has_todo filter, or source filter is provided, agents also need the advanced filtering
    if (
      (state && ['offer', 'opening', 'confirmation', 'payment'].includes(state)) ||
      normalizedHasTodo ||
      source ||
      normalizedHasSchedule ||
      normalizedHasTransferredOffer ||
      normalizedHasTicket
    ) {
      // Use the full filtering logic for agents when state filter, has_todo filter, or source filter is applied
      logger.info(
        `Agent ${user._id} using advanced filtering (state: ${state}, has_todo: ${normalizedHasTodo}, has_ticket: ${normalizedHasTicket}, source: ${source})`
      );
      const { dbQuery } = await buildLeadQuery({
        status,
        search,
        showInactive,
        includeAll,
        use_status,
        has_opening,
        project_name,
        project_id,
        investment_volume,
        agent_name,
        duplicate,
        state,
        has_ticket: normalizedHasTicket,
        has_todo: normalizedHasTodo,
        source,
        has_schedule: normalizedHasSchedule,
        has_transferred_offer: normalizedHasTransferredOffer,
      });

      // Access control for agents: when has_todo=true or has_ticket=true, allow access via todos/tickets as well
      if (normalizedHasTodo || normalizedHasTicket) {
        // Build todo query for access control - NO type filtering
        // This finds ALL todos/tickets the user has access to (assigned to them or created by them)
        const todoAccessQuery = {
          active: true,
          $or: [{ assigned_to: user._id }, { creator_id: user._id }]
        };

        // Parallel execution for better performance
        const [assigned, todoLeadIds] = await Promise.all([
          AssignLeads.find({ agent_id: user._id, status: 'active' })
            .select('lead_id')
            .lean(),
          Todo.distinct('lead_id', todoAccessQuery),
        ]);
        const assignedLeadIds = assigned.map((a) => a.lead_id);
        const unionIds = Array.from(
          new Set([
            ...assignedLeadIds.map((x) => x.toString()),
            ...todoLeadIds.map((x) => x.toString()),
          ])
        ).map((id) => new mongoose.Types.ObjectId(id));

        // Intersect with the filtered lead IDs from buildLeadQuery
        if (dbQuery._id && dbQuery._id.$in) {
          const existing = new Set(dbQuery._id.$in.map((id) => id.toString()));
          dbQuery._id = { $in: unionIds.filter((id) => existing.has(id.toString())) };
        } else {
          // If no filter from buildLeadQuery, use the union of assigned and todo-accessible leads
          dbQuery._id = { $in: unionIds };
        }
      } else {
        // Default: only assigned leads
        await filterLeadsByUserAssignment(user, dbQuery);
      }

      // Additional filter: when has_schedule=true, filter leads with scheduled offers
      if (normalizedHasSchedule) {
        const scheduledOffers = await Offer.find({
          active: true,
          $or: [
            { scheduled_date: { $exists: true, $ne: null } },
            { scheduled_time: { $exists: true, $ne: null } },
          ],
        }).distinct('lead_id');

        if (dbQuery._id && dbQuery._id.$in) {
          const existing = new Set(dbQuery._id.$in.map((id) => id.toString()));
          const scheduledLeadIds = scheduledOffers
            .map((id) => id.toString())
            .filter((id) => existing.has(id))
            .map((id) => new mongoose.Types.ObjectId(id));
          dbQuery._id = { $in: scheduledLeadIds };
        } else {
          dbQuery._id = { $in: scheduledOffers };
        }
      }

      // Additional filter: when has_transferred_offer=true, filter leads with transferred offers created by current agent
      if (normalizedHasTransferredOffer) {
        const transferredOffers = await Offer.find({
          active: true,
          created_by: user._id,
          'handover_metadata.original_agent_id': { $exists: true },
          $expr: { $ne: ['$agent_id', '$created_by'] },
        }).distinct('lead_id');

        if (dbQuery._id && dbQuery._id.$in) {
          const existing = new Set(dbQuery._id.$in.map((id) => id.toString()));
          const transferredLeadIds = transferredOffers
            .map((id) => id.toString())
            .filter((id) => existing.has(id))
            .map((id) => new mongoose.Types.ObjectId(id));
          dbQuery._id = { $in: transferredLeadIds };
        } else {
          dbQuery._id = { $in: transferredOffers };
        }
      }

      return await executeLeadQuery(
        user,
        dbQuery,
        page,
        limit,
        true,
        state,
        normalizedHasTodo,
        normalizedHasTicket,
        todo_scope,
        normalizedPendingTodos,
        normalizedDoneTodos,
        sortBy,
        sortOrder,
        project_name || project_id,
        normalizedTicketSource
      );
    }

    // For non-admin users without state filter, start with a clean query that only filters by active status
    const agentQuery = {};

    if (!includeAll) {
      agentQuery.active = showInactive ? false : true;
    }

    // Add only the most essential filters that should apply to agents
    if (status) {
      // When status is "Hold", include "Hold" and "Termin"
      if (status.toLowerCase() === 'hold') {
        agentQuery.status = { $in: ['Hold', 'Termin'] };
      } else {
        agentQuery.status = status;
      }
    }

    // When showInactive=true, don't apply use_status filter since archived leads should be shown regardless of use_status
    if (includeAll) {
      const parsedUseStatus = parseUseStatusFilter(use_status);
      if (parsedUseStatus) {
        agentQuery.use_status = parsedUseStatus;
      }
    } else if (showInactive) {
      const parsedUseStatus = parseUseStatusFilter(use_status);
      if (parsedUseStatus) {
        agentQuery.use_status = parsedUseStatus;
      }
    } else {
      const parsedUseStatus = parseUseStatusFilter(use_status);
      if (parsedUseStatus) {
        agentQuery.use_status = parsedUseStatus;
      } else {
        agentQuery.use_status = { $ne: 'pending' };
      }
    }

    // Add source filter if provided (for simple agent queries)
    if (source) {

      // Find ALL sources containing the search term (case-insensitive partial match)
      const sourceRegex = new RegExp(source, 'i');
      const matchingSources = await Source.find({ name: sourceRegex, active: true }).select('_id name').lean();

      if (matchingSources.length > 0) {
        // Filter leads by all matching source IDs
        const sourceIds = matchingSources.map(s => s._id);
        agentQuery.source_id = { $in: sourceIds };
        logger.info(`Filtering agent leads by sources containing "${source}": ${matchingSources.map(s => s.name).join(', ')} (${sourceIds.length} sources)`);
      } else {
        // No matching source found, return empty result
        logger.info(`No active source found containing: ${source}`);
        return {
          data: [],
          meta: buildPaginationMeta(0, page, limit),
        };
      }
    }

    // ✅ Handle search filter for agents (matches buildLeadQuery behavior)
    if (search && search.trim()) {
      const searchTerm = search.trim();
      const searchRegex = new RegExp(searchTerm, 'i');

      // Check if search term is a valid MongoDB ObjectId
      const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(searchTerm);

      // Basic search on lead fields
      agentQuery.$or = [
        { contact_name: searchRegex },
        { email_from: searchRegex },
        { phone: searchRegex },
        { lead_source_no: searchRegex },
        { notes: searchRegex },
        { tags: searchRegex },
      ];

      // Add _id search if valid ObjectId
      if (isValidObjectId) {
        agentQuery.$or.push({ _id: searchTerm });
        logger.info(`Agent search: Valid ObjectId detected, adding _id search for "${searchTerm}"`);
      }

      // If the search term is a number, also search for expected revenue
      if (!isNaN(searchTerm)) {
        const numericValue = parseFloat(searchTerm);
        agentQuery.$or.push({ expected_revenue: numericValue });

        // Also search for investment_volume in offers
        const matchingOffers = await Offer.find({
          investment_volume: numericValue,
        })
          .select('lead_id')
          .lean();

        if (matchingOffers.length > 0) {
          agentQuery.$or.push({ _id: { $in: matchingOffers.map((o) => o.lead_id) } });
        }
      }

      logger.info(`Agent search filter applied: "${searchTerm}"`);
    }

    // Handle project filtering for agents (project_id takes priority over project_name)
    if (!normalizedHasTransferredOffer) {
      if (project_id) {
        await applyProjectIdFilterForAgent(user, project_id, agentQuery);
      } else if (project_name) {
        await applyProjectNameFilterForAgent(user, project_name, agentQuery);
      } else {
        // No project filter, just get the assigned leads for this user
        await filterLeadsByUserAssignment(user, agentQuery);
      }
    }

    // Expand access when has_todo=true or has_ticket=true: union assigned leads with leads where user has todo/ticket access
    // Note: This is already handled in the filterLeadsByUserAssignment function
    // This code path is for when project filtering is applied, so we need to merge todo/ticket access
    if (normalizedHasTodo || normalizedHasTicket) {
      let currentIds = null;
      if (agentQuery._id && agentQuery._id.$in) {
        currentIds = new Set(agentQuery._id.$in.map((id) => id.toString()));
      }

      // Build todo query for access control - NO type filtering
      // This finds ALL todos/tickets the user has access to (assigned to them or created by them)
      const todoAccessQuery = {
        active: true,
        $or: [{ assigned_to: user._id }, { creator_id: user._id }]
      };

      // Fetch todo/ticket lead IDs
      const todoLeadIds = await Todo.distinct('lead_id', todoAccessQuery);
      const unionIds = new Set([
        ...(currentIds ? Array.from(currentIds) : []),
        ...todoLeadIds.map((x) => x.toString()),
      ]);
      agentQuery._id = {
        $in: Array.from(unionIds).map((id) => new mongoose.Types.ObjectId(id)),
      };
    }

    // ✅ Filter by scheduled offers when has_schedule=true
    // Skip this when has_transferred_offer=true as we want all transferred leads regardless of schedule
    if (normalizedHasSchedule && !normalizedHasTransferredOffer) {
      const scheduledOffers = await Offer.find({
        active: true,
        $or: [
          { scheduled_date: { $exists: true, $ne: null } },
          { scheduled_time: { $exists: true, $ne: null } }
        ]
      }).distinct('lead_id');

      // Intersect with existing lead IDs if already filtered
      if (agentQuery._id && agentQuery._id.$in) {
        const existing = new Set(agentQuery._id.$in.map((id) => id.toString()));
        const scheduledLeadIds = scheduledOffers
          .map((id) => id.toString())
          .filter((id) => existing.has(id))
          .map((id) => new mongoose.Types.ObjectId(id));
        agentQuery._id = { $in: scheduledLeadIds };
      } else {
        agentQuery._id = { $in: scheduledOffers };
      }
    }

    // ✅ Filter by transferred offers when has_transferred_offer=true
    if (normalizedHasTransferredOffer) {
      const transferredOffers = await Offer.find({
        active: true,
        created_by: user._id,
        'handover_metadata.original_agent_id': { $exists: true },
        $expr: { $ne: ['$agent_id', '$created_by'] }
      }).distinct('lead_id');

      // Intersect with existing lead IDs if already filtered
      if (agentQuery._id && agentQuery._id.$in) {
        const existing = new Set(agentQuery._id.$in.map((id) => id.toString()));
        const transferredLeadIds = transferredOffers
          .map((id) => id.toString())
          .filter((id) => existing.has(id))
          .map((id) => new mongoose.Types.ObjectId(id));
        agentQuery._id = { $in: transferredLeadIds };
      } else {
        agentQuery._id = { $in: transferredOffers };
      }
    }

    // Use this query instead of the complex one
    logger.info(`Using agent-specific query: ${JSON.stringify(agentQuery)}`);
    return await executeLeadQuery(
      user,
      agentQuery,
      page,
      limit,
      true,
      null,
      normalizedHasTodo,
      normalizedHasTicket,
      todo_scope,
      normalizedPendingTodos,
      normalizedDoneTodos,
      sortBy,
      sortOrder,
      project_name || project_id,
      normalizedTicketSource
    );
  }

  // For admins, use the full filtering logic
  logger.info(`User ${user._id} is admin, using full filtering`);
  const { dbQuery } = await buildLeadQuery({
    status,
    search,
    showInactive,
    includeAll,
    use_status,
    has_opening,
    project_name,
    project_id,
    investment_volume,
    agent_name,
    duplicate,
    state,
    has_ticket: normalizedHasTicket,
    has_todo: normalizedHasTodo,
    source,
  });

  // ✅ Filter by scheduled offers when has_schedule=true (admin)
  // Skip this when has_transferred_offer=true as we want all transferred leads regardless of schedule
  if (normalizedHasSchedule && !normalizedHasTransferredOffer) {
    const scheduledOffers = await Offer.find({
      active: true,
      $or: [
        { scheduled_date: { $exists: true, $ne: null } },
        { scheduled_time: { $exists: true, $ne: null } }
      ]
    }).distinct('lead_id');

    // Intersect with existing lead IDs if already filtered
    if (dbQuery._id && dbQuery._id.$in) {
      const existing = new Set(dbQuery._id.$in.map((id) => id.toString()));
      const scheduledLeadIds = scheduledOffers
        .map((id) => id.toString())
        .filter((id) => existing.has(id))
        .map((id) => new mongoose.Types.ObjectId(id));
      dbQuery._id = { $in: scheduledLeadIds };
    } else {
      dbQuery._id = { $in: scheduledOffers };
    }
  }

  // ✅ Filter by transferred offers when has_transferred_offer=true (admin)
  if (normalizedHasTransferredOffer) {
    const transferredOffers = await Offer.find({
      active: true,
      created_by: user._id,
      'handover_metadata.original_agent_id': { $exists: true },
      $expr: { $ne: ['$agent_id', '$created_by'] }
    }).distinct('lead_id');

    // Intersect with existing lead IDs if already filtered
    if (dbQuery._id && dbQuery._id.$in) {
      const existing = new Set(dbQuery._id.$in.map((id) => id.toString()));
      const transferredLeadIds = transferredOffers
        .map((id) => id.toString())
        .filter((id) => existing.has(id))
        .map((id) => new mongoose.Types.ObjectId(id));
      dbQuery._id = { $in: transferredLeadIds };
    } else {
      dbQuery._id = { $in: transferredOffers };
    }
  }

  return await executeLeadQuery(
    user,
    dbQuery,
    page,
    limit,
    true,
    state,
    normalizedHasTodo,
    normalizedHasTicket,
    todo_scope,
    normalizedPendingTodos,
    normalizedDoneTodos,
    sortBy,
    sortOrder,
    project_name || project_id,
    normalizedTicketSource
  );
};

/**
 * Get leads assigned to the current user
 * @param {Object} user - User object
 * @param {Object} query - Query parameters
 * @returns {Promise<Object>} - Paginated leads with metadata
 */
const getMyLeads = async (user, query) => {
  const {
    page = 1,
    limit = 20,
    status,
    showInactive = false,
    use_status,
    project_name,
    state,
    has_todo,
    source,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = query;

  // Build the query for assignments
  let assignmentQuery = {
    agent_id: user._id,
    status: 'active',
  };

  // If project_name is provided, filter by project name
  if (project_name) {
    const projectRegex = new RegExp(project_name, 'i');
    const matchingProjects = await mongoose
      .model('Team')
      .find({ name: projectRegex })
      .select('_id')
      .lean();

    if (matchingProjects.length > 0) {
      const projectIds = matchingProjects.map((p) => p._id);
      assignmentQuery.project_id = { $in: projectIds };
    } else {
      // No matching projects found, return empty result
      return {
        data: [],
        meta: buildPaginationMeta(0, page, limit),
      };
    }
  }

  // Build the lead match query for populate
  let leadMatchQuery = {
    ...(status
      ? (status.toLowerCase() === 'hold'
        ? { status: { $in: ['Hold', 'Termin'] } }
        : { status })
      : {}),
    // When showInactive=true, don't apply use_status filter since archived leads should be shown regardless of use_status
    ...(showInactive
      ? parseUseStatusFilter(use_status)
        ? { use_status: parseUseStatusFilter(use_status) }
        : {}
      : parseUseStatusFilter(use_status)
        ? { use_status: parseUseStatusFilter(use_status) }
        : { use_status: { $ne: 'pending' } }),
    active: showInactive ? false : true,
  };

  // Add source filter if provided
  if (source) {
    // Find ALL sources containing the search term (case-insensitive partial match)
    const sourceRegex = new RegExp(source, 'i');
    const matchingSources = await Source.find({ name: sourceRegex, active: true }).select('_id name').lean();

    if (matchingSources.length > 0) {
      // Filter leads by all matching source IDs
      const sourceIds = matchingSources.map(s => s._id);
      leadMatchQuery.source_id = { $in: sourceIds };
      logger.info(`Filtering my leads by sources containing "${source}": ${matchingSources.map(s => s.name).join(', ')} (${sourceIds.length} sources)`);
    } else {
      // No matching source found, return empty result
      logger.info(`No active source found containing: ${source}`);
      return {
        data: [],
        meta: buildPaginationMeta(0, page, limit),
      };
    }
  }

  // Get assignments for the current user
  const assignments = await AssignLeads.find(assignmentQuery)
    .populate({
      path: 'lead_id',
      match: leadMatchQuery,
      populate: [
        {
          path: 'source_id',
          select: 'name price active color',
        },
        {
          path: 'prev_user_id',
          select: '_id login role color_code',
        },
        {
          path: 'prev_team_id',
          select: '_id name color_code',
        },
        {
          path: 'source_project',
          select: '_id name color_code',
        },
        {
          path: 'source_agent',
          select: '_id login role color_code',
        },
      ],
    })
    .populate('project_id', 'name color_code')
    .populate(
      'agent_id',
      '_id login role active create_date instance_status instance_userid anydesk color_code'
    )
    .lean();

  // Filter out assignments with no lead (might have been deleted or filtered out)
  let validAssignments = assignments.filter((a) => a.lead_id);

  // If has_todo filter is applied, filter to only leads with active todos that are not done
  if (has_todo === true) {
    const leadsWithTodos = await Todo.find({
      active: true,
      isDone: false,
    }).distinct('lead_id');
    const leadsWithTodosSet = new Set(leadsWithTodos.map((id) => id.toString()));

    validAssignments = validAssignments.filter((assignment) =>
      leadsWithTodosSet.has(assignment.lead_id._id.toString())
    );
  }

  const total = validAssignments.length;

  // Normalize page to ensure it doesn't exceed available pages
  const myLeadsPaginationInfo = normalizePagination(page, total, limit);
  const myLeadsNormalizedPage = myLeadsPaginationInfo.page;
  if (myLeadsPaginationInfo.adjusted) {
    logger.info(`getMyLeads: Page ${page} exceeds available pages (${myLeadsPaginationInfo.pages}), adjusted to page ${myLeadsNormalizedPage}`);
  }

  // Apply sorting to assignments based on lead data
  const sortObject = parseSortParameters(sortBy, sortOrder);
  const sortField = Object.keys(sortObject)[0];
  const sortDirection = sortObject[sortField];

  validAssignments.sort((a, b) => {
    let aValue = a.lead_id[sortField];
    let bValue = b.lead_id[sortField];

    // Handle null/undefined values
    if (aValue === null || aValue === undefined) aValue = '';
    if (bValue === null || bValue === undefined) bValue = '';

    // Handle different data types
    if (sortField === 'expected_revenue') {
      aValue = parseRevenueValue(aValue);
      bValue = parseRevenueValue(bValue);
    } else if (
      sortField === 'createdAt' ||
      sortField === 'updatedAt' ||
      sortField === 'lead_date'
    ) {
      aValue = new Date(aValue);
      bValue = new Date(bValue);
    } else {
      // String comparison for text fields
      aValue = String(aValue).toLowerCase();
      bValue = String(bValue).toLowerCase();
    }

    if (aValue < bValue) return -1 * sortDirection;
    if (aValue > bValue) return 1 * sortDirection;
    return 0;
  });

  // Apply pagination using normalized page
  const paginatedAssignments = validAssignments.slice(
    myLeadsPaginationInfo.offset,
    myLeadsPaginationInfo.offset + parseInt(limit)
  );

  // If no leads found, return empty result with pagination metadata
  if (paginatedAssignments.length === 0) {
    return {
      data: [],
      meta: buildPaginationMeta(total, myLeadsNormalizedPage, limit),
    };
  }

  // Extract leads from assignments
  const leads = paginatedAssignments.map((assignment) => ({
    ...assignment.lead_id,
    // Add assignment metadata
    project: assignment.project_id,
    assignedAt: assignment.assigned_at,
    agent: {
      _id: assignment.agent_id._id,
      login: assignment.agent_id.login,
      role: assignment.agent_id.role,
      color_code: assignment.agent_id.color_code,
      user_id: assignment.agent_id._id,
    },
  }));

  const leadIds = leads.map((lead) => lead._id);

  // Fetch related data using the helper function
  const {
    assignmentHistory,
    offers,
    openings,
    confirmations,
    paymentVouchers,
    appointments,
    stageMap,
    statusMap,
  } = await fetchLeadRelatedData(leadIds, user);

  // Create lookup maps
  const lookupMaps = createLookupMaps(
    [],
    assignmentHistory,
    offers,
    openings,
    confirmations,
    paymentVouchers,
    appointments
  );

  // Process leads with related data, including offers for the current user
  const processedLeads = leads.map((lead) => {
    const leadId = lead._id.toString();

    // Get offers for this lead and attach openings
    const leadOffers = lookupMaps.offersByLeadId[leadId] || [];
    const offersWithOpenings = attachOpeningsToOffers(
      leadOffers,
      lookupMaps.openingsByOfferId,
      lookupMaps.confirmationsByOpeningId,
      lookupMaps.paymentVouchersByConfirmationId
    );

    // Process lead with stage and status information
    const processedLead = processLeadWithStageAndStatus(lead, stageMap, statusMap);

    return {
      ...processedLead,
      project: lead.project,
      assignedAt: lead.assignedAt,
      agent_offers: offersWithOpenings, // Renamed to agent_offers for clarity
      agent: lead.agent,
    };
  });

  // Always fetch todo counts for all leads (active and not done)
  const todoCountResults = await Todo.aggregate([
    {
      $match: {
        lead_id: { $in: leadIds },
        active: true,
        isDone: false,
      },
    },
    {
      $group: {
        _id: '$lead_id',
        todoCount: { $sum: 1 },
      },
    },
  ]);

  // Create todo count lookup map
  const todoCountMap = {};
  todoCountResults.forEach((result) => {
    todoCountMap[result._id.toString()] = result.todoCount;
  });

  // Add todo counts to each lead
  let leadsWithTodoCounts = processedLeads.map((lead) => ({
    ...lead,
    todoCount: todoCountMap[lead._id.toString()] || 0,
  }));

  // Add detailed todo objects if has_todo filter is applied
  if (has_todo === true) {
    // Fetch actual todo objects for all leads (all active todos with sorting)
    const activeTodos = await Todo.find({
      lead_id: { $in: leadIds },
      active: true,
    })
      .populate('creator_id', '_id login role')
      .populate('assigned_to', '_id login role')
      .sort({ isDone: 1, createdAt: -1 }) // Sort by isDone (false first), then by creation date
      .lean();

    const todoObjectMap = {};
    const userId = user._id.toString();


    activeTodos.forEach((todo) => {

      console.log('Vugichugi', todo);

      // Check if user is the creator or assigned to this todo
      const isCreator = todo.creator_id && todo.creator_id.toString() === userId;
      const isAssigned = todo.assigned_to && todo.assigned_to.toString() === userId;

      // Only include todo if user is creator or assigned
      if (!isCreator && !isAssigned) {
        return; // Skip this todo
      }

      const leadId = todo.lead_id.toString();
      if (!todoObjectMap[leadId]) {
        todoObjectMap[leadId] = [];
      }
      todoObjectMap[leadId].push({
        _id: todo._id,
        message: todo.message,
        isDone: todo.isDone,
        active: todo.active,
        creator: {
          _id: todo.creator_id._id,
          login: todo.creator_id.login,
          role: todo.creator_id.role,
        },
        assignedTo: todo.assigned_to
          ? {
            _id: todo.assigned_to._id,
            login: todo.assigned_to.login,
            role: todo.assigned_to.role,
          }
          : null,
        createdAt: todo.createdAt,
        updatedAt: todo.updatedAt,
        dateOfDone: todo.dateOfDone || null,
        dateOfDoneTime: todo.dateOfDone ? new Date(todo.dateOfDone).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) : null,
      });
    });

    // Add todo objects to each lead and update todoCount to reflect only visible todos
    leadsWithTodoCounts = leadsWithTodoCounts.map((lead) => {
      const visibleTodos = todoObjectMap[lead._id.toString()] || [];
      return {
        ...lead,
        activeTodos: visibleTodos,
        // Update todoCount to reflect only visible todos
        todoCount: visibleTodos.length,
      };
    });
  }

  // Apply flattening if state filter is provided
  const finalLeads = flattenLeadsByState(leadsWithTodoCounts, state);

  return {
    data: finalLeads,
    meta: buildPaginationMeta(total, myLeadsNormalizedPage, limit),
  };
};

/**
 * Get a lead by ID with permission checking
 * @param {string} leadId - Lead ID
 * @param {Object} user - User object
 * @param {Function} hasPermissionFn - Function to check permissions
 * @param {Object} permissions - Permissions object
 * @param {boolean} includeInactive - Whether to include inactive leads (default: false)
 * @returns {Promise<Object>} - Lead with related data
 */
const getLeadById = async (leadId, user, hasPermissionFn, permissions, includeInactive = false) => {
  // Build query based on permissions
  const query = {
    _id: leadId,
    active: includeInactive ? { $in: [true, false] } : true,
  };

  // Check permissions
  if (!await hasPermissionFn(user.role, permissions.LEAD_READ_ALL)) {
    // Non-admin users can only see assigned leads
    await filterLeadsByUserAssignment(user, query);
  }

  // Find the lead
  const lead = await Lead.findOne(query)
    .populate('source_id', 'name price active color')
    .populate('source_project', '_id name color_code')
    .populate('source_agent', '_id login role color_code')
    .populate('prev_team_id', '_id name color_code')
    .populate('prev_user_id', '_id login role color_code')
    .lean();

  if (lead?.temporary_access_agents?.some(agent => agent.toString() === user._id.toString())) {
    lead.temporary_access = true;
  }

  if (!lead) {
    throw new NotFoundError('Lead not found or access denied');
  }

  // Fetch favourite status for current user
  const favourites = await Favourite.find({
    lead_id: lead._id,
    user_id: user._id,
    active: true,
  })
    .select('lead_id')
    .lean();

  const favouriteLeadIds = new Set(favourites.map((fav) => fav.lead_id.toString()));

  // Use the helper function to get related data and process the lead
  const {
    assignments,
    assignmentHistory,
    offers,
    openings,
    confirmations,
    paymentVouchers,
    appointments,
    stageMap,
    statusMap,
  } = await fetchLeadRelatedData([lead._id], user);
  const lookupMaps = createLookupMaps(
    assignments,
    assignmentHistory,
    offers,
    openings,
    confirmations,
    paymentVouchers,
    appointments
  );
  const [processedLead] = processLeadsWithRelatedData(
    [lead],
    lookupMaps,
    stageMap,
    statusMap,
    true,
    user,
    null,
    favouriteLeadIds,
    true // isDetailApi = true for GET /leads/:id
  );

  // Fetch scheduled emails for this lead
  const scheduledEmails = await Email.find({
    lead_id: lead._id,
    schedule_status: { $in: ['pending', 'sent', 'failed', 'cancelled'] },
    is_active: true,
  })
    .populate('scheduled_by', 'login name role')
    .populate('schedule_cancelled_by', 'login name role')
    .populate('project_id', 'name')
    .populate('mailserver_id', 'name')
    .select(
      'subject to from_address scheduled_at schedule_status schedule_pre_approved ' +
      'schedule_attempts schedule_error schedule_notification_sent ' +
      'schedule_cancelled_at schedule_cancelled_by scheduled_by ' +
      'project_id mailserver_id sent_at createdAt'
    )
    .sort({ scheduled_at: -1 })
    .lean();

  processedLead.scheduled_emails = scheduledEmails;

  // For admin users, find duplicate leads based on email or phone
  if (await hasPermissionFn(user.role, permissions.LEAD_READ_ALL)) {
    const duplicateLeads = await findDuplicateLeads(lead);
    processedLead.duplicate_leads = duplicateLeads;
  }

  return processedLead;
};

/**
 * Find duplicate leads for a given lead based on email or phone matching
 * Uses the same logic as the import duplicate detection
 * @param {Object} lead - The lead to find duplicates for
 * @returns {Promise<Array>} - Array of duplicate leads with minimal info
 */
const findDuplicateLeads = async (lead) => {
  try {
    // Normalize the lead's email and phone for matching
    const normalizedEmail = lead.email_from?.toString().toLowerCase().trim() || '';
    const normalizedPhone = lead.phone?.toString().replace(/\D/g, '') || '';

    // Build query to find leads matching by email OR phone (excluding current lead)
    const matchConditions = [];
    
    if (normalizedEmail) {
      // Case-insensitive email match
      matchConditions.push({ email_from: { $regex: new RegExp(`^${normalizedEmail}$`, 'i') } });
    }
    
    if (normalizedPhone) {
      // Phone match (exact match on normalized phone)
      matchConditions.push({ phone: { $regex: normalizedPhone } });
    }

    // If no email or phone to match, return empty array
    if (matchConditions.length === 0) {
      return [];
    }

    // Find potential duplicate leads
    const duplicates = await Lead.find({
      _id: { $ne: lead._id }, // Exclude current lead
      active: true,
      $or: matchConditions,
    })
      .select('_id lead_source_no duplicate_status user_id team_id contact_name email_from phone lead_date')
      .populate('user_id', '_id login first_name last_name')
      .populate('team_id', '_id name')
      .lean();

    // Format the duplicate leads for response
    return duplicates.map((dup) => ({
      _id: dup._id,
      lead_source_no: dup.lead_source_no || null,
      duplicate_status: dup.duplicate_status || 0,
      contact_name: dup.contact_name || null,
      email_from: dup.email_from || null,
      phone: dup.phone || null,
      lead_date: dup.lead_date || null,
      agent: dup.user_id ? {
        _id: dup.user_id._id,
        login: dup.user_id.login,
        name: `${dup.user_id.first_name || ''} ${dup.user_id.last_name || ''}`.trim() || dup.user_id.login,
      } : null,
      project: dup.team_id ? {
        _id: dup.team_id._id,
        name: dup.team_id.name,
      } : null,
    }));
  } catch (error) {
    logger.error('Error finding duplicate leads:', error);
    return []; // Return empty array on error, don't fail the main request
  }
};

/**
 * Get all lead IDs as an array
 * For agents, only returns IDs of leads assigned to them
 * @param {Object} user - User object
 * @param {Function} hasPermissionFn - Function to check permissions
 * @param {Object} permissions - Permissions object
 * @returns {Promise<Array>} - Array of lead IDs
 */
const getLeadIds = async (user, hasPermissionFn, permissions) => {
  // Build query based on permissions
  const query = { active: true };

  // Check permissions
  if (!await hasPermissionFn(user.role, permissions.LEAD_READ_ALL)) {
    // Non-admin users can only see assigned leads
    await filterLeadsByUserAssignment(user, query);
  }

  // Get all lead IDs
  const leads = await Lead.find(query, { _id: 1 }).lean();
  return leads.map((lead) => lead._id);
};

/**
 * Get leads by partner IDs (lead_source_no values) - returns all matching leads without pagination
 * @param {Array} partnerIds - Array of lead_source_no values to search for
 * @param {Object} user - User object
 * @param {Object} query - Query parameters (showInactive, etc.)
 * @param {Function} hasPermissionFn - Function to check permissions
 * @param {Object} permissions - Permissions object
 * @returns {Promise<Object>} - All matching leads with metadata
 */
/**
 * Helper function to detect if a value is an email
 */
const isEmail = (value) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
};

/**
 * Helper function to detect if a value is a phone number
 * Phone numbers typically contain formatting characters like +, -, spaces, parentheses
 * 
 * IMPORTANT: Pure digit-only strings are treated as partner IDs, NOT phone numbers
 * This prevents numeric partner IDs like "2385102" from being incorrectly categorized
 * 
 * A value is considered a phone number if:
 * - It contains phone formatting characters (+, -, spaces, parentheses) AND
 * - After removing formatting, it has 7-15 digits
 * 
 * Examples:
 * - "+49 123 456789" → phone (has formatting)
 * - "(123) 456-7890" → phone (has formatting)
 * - "2385102" → partner ID (pure digits, no formatting)
 * - "12345678901" → partner ID (pure digits, no formatting)
 */
const isPhone = (value) => {
  // Check if the value has phone formatting characters
  const hasPhoneFormatting = /[\s\-\(\)\+]/.test(value);

  // If it's pure digits with no formatting, treat as partner ID, not phone
  if (!hasPhoneFormatting) {
    return false;
  }

  // Remove common phone formatting characters
  const cleaned = value.replace(/[\s\-\(\)\+]/g, '');

  // Check if it's all digits and has reasonable phone length (7-15 digits)
  return /^\d{7,15}$/.test(cleaned);
};

/**
 * Helper function to categorize values into partner IDs, emails, and phones
 */
const categorizeValues = (values) => {
  const emails = [];
  const phones = [];
  const partnerIds = [];

  values.forEach((value) => {
    const trimmed = value.toString().trim();
    if (!trimmed) return;

    if (isEmail(trimmed)) {
      emails.push(trimmed);
    } else if (isPhone(trimmed)) {
      phones.push(trimmed);
    } else {
      // Everything else is treated as partner ID
      partnerIds.push(trimmed);
    }
  });

  return { emails, phones, partnerIds };
};

/**
 * Resolve bulk-search values (partner IDs, emails, phones) to lead IDs.
 * Used by Leads API when values param is passed - same logic as bulk-search.
 * @param {Array} values - Array of partner IDs, emails, or phone numbers
 * @param {Object} user - User object for permission filtering
 * @param {Function} hasPermissionFn - Function to check permissions
 * @param {Object} permissions - Permissions object
 * @returns {Promise<Array>} - Array of lead ObjectIds
 */
const resolveValuesToLeadIds = async (values, user, hasPermissionFn, permissions) => {
  if (!Array.isArray(values) || values.length === 0) {
    return [];
  }
  const cleanedValues = [...new Set(values.filter((val) => val && val.toString().trim()))];
  if (cleanedValues.length === 0) return [];

  const { emails, phones, partnerIds } = categorizeValues(cleanedValues);
  const orConditions = [];

  if (partnerIds.length > 0) {
    orConditions.push({ lead_source_no: { $in: partnerIds } });
  }
  if (emails.length > 0) {
    orConditions.push({
      $or: [
        { email_from: { $in: emails } },
        { secondary_email: { $in: emails } },
      ],
    });
  }
  if (phones.length > 0) {
    orConditions.push({ phone: { $in: phones } });
  }
  if (orConditions.length === 0) return [];

  const dbQuery = { $or: orConditions };
  if (!await hasPermissionFn(user.role, permissions.LEAD_READ_ALL)) {
    await filterLeadsByUserAssignment(user, dbQuery);
  }

  const leads = await Lead.find(dbQuery).select('_id').lean();
  return leads.map((l) => l._id);
};

const getLeadsByPartnerIds = async (values, user, query = {}, hasPermissionFn, permissions) => {
  const { showInactive = false } = query;

  // Validate input
  if (!Array.isArray(values) || values.length === 0) {
    return {
      data: [],
      meta: {
        total: 0,
        message: 'No values provided',
      },
    };
  }

  // Clean and filter values - remove empty values and duplicates
  const cleanedValues = [...new Set(values.filter((val) => val && val.toString().trim()))];

  if (cleanedValues.length === 0) {
    return {
      data: [],
      meta: {
        total: 0,
        message: 'No valid values provided',
      },
    };
  }

  // Categorize values into emails, phones, and partner IDs
  const { emails, phones, partnerIds } = categorizeValues(cleanedValues);

  // Build the main query using $or to search across all three fields
  const orConditions = [];

  // Add partner ID search condition
  if (partnerIds.length > 0) {
    orConditions.push({
      lead_source_no: { $in: partnerIds },
    });
  }

  // Add email search condition (search both email_from and secondary_email)
  if (emails.length > 0) {
    orConditions.push({
      $or: [
        { email_from: { $in: emails } },
        { secondary_email: { $in: emails } },
      ],
    });
  }

  // Add phone search condition
  if (phones.length > 0) {
    orConditions.push({
      phone: { $in: phones },
    });
  }

  // If no valid conditions, return empty result
  if (orConditions.length === 0) {
    return {
      data: [],
      meta: {
        total: 0,
        message: 'No valid search values provided',
      },
    };
  }

  // Build the main query
  const dbQuery = {
    $or: orConditions,
    // Removed active filter to include both active and inactive leads by default
  };

  // Apply user-based filtering if not admin
  if (!await hasPermissionFn(user.role, permissions.LEAD_READ_ALL)) {
    await filterLeadsByUserAssignment(user, dbQuery);
  }

  try {
    // Get total count
    const total = await Lead.countDocuments(dbQuery);

    if (total === 0) {
      return {
        data: [],
        meta: {
          total: 0,
          message: 'No leads found for the provided partner IDs',
        },
      };
    }

    // Get sorting parameters from query
    const { sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const sortObject = parseSortParameters(sortBy, sortOrder);

    // Execute the main query - get ALL matching leads without pagination
    const leads = await Lead.find(dbQuery)
      .populate('source_id', 'name price active color')
      .sort(sortObject)
      .lean();

    // Get lead IDs for fetching related data
    const leadIds = leads.map((lead) => lead._id);

    // Fetch related data using the existing helper function
    const {
      assignments,
      assignmentHistory,
      offers,
      openings,
      confirmations,
      paymentVouchers,
      appointments,
      stageMap,
    statusMap,
  } = await fetchLeadRelatedData(leadIds, user);

    // Create lookup maps for efficient data processing
    const lookupMaps = createLookupMaps(
      assignments,
      assignmentHistory,
      offers,
      openings,
      confirmations,
      paymentVouchers,
      appointments
    );

    // Process leads with related data
    const processedLeads = processLeadsWithRelatedData(
      leads,
      lookupMaps,
      stageMap,
      statusMap,
      true, // includeOffers
      user,
      null, // projectFilter
      null, // favouriteLeadIds
      false // isDetailApi = false for list API
    );

    // Determine which values were found and which were missed
    const foundValues = new Set();
    const foundPartnerIds = [];
    const foundEmails = [];
    const foundPhones = [];

    leads.forEach((lead) => {
      // Check partner IDs
      if (lead.lead_source_no && partnerIds.includes(lead.lead_source_no)) {
        foundValues.add(lead.lead_source_no);
        foundPartnerIds.push(lead.lead_source_no);
      }
      // Check emails
      if (lead.email_from && emails.includes(lead.email_from)) {
        foundValues.add(lead.email_from);
        foundEmails.push(lead.email_from);
      }
      if (lead.secondary_email && emails.includes(lead.secondary_email)) {
        foundValues.add(lead.secondary_email);
        foundEmails.push(lead.secondary_email);
      }
      // Check phones
      if (lead.phone && phones.includes(lead.phone)) {
        foundValues.add(lead.phone);
        foundPhones.push(lead.phone);
      }
    });

    // Remove duplicates
    const uniqueFoundPartnerIds = [...new Set(foundPartnerIds)];
    const uniqueFoundEmails = [...new Set(foundEmails)];
    const uniqueFoundPhones = [...new Set(foundPhones)];

    // Calculate missed values
    const missedPartnerIds = partnerIds.filter((id) => !foundValues.has(id));
    const missedEmails = emails.filter((email) => !foundValues.has(email));
    const missedPhones = phones.filter((phone) => !foundValues.has(phone));
    const totalFound = uniqueFoundPartnerIds.length + uniqueFoundEmails.length + uniqueFoundPhones.length;
    const totalMissed = missedPartnerIds.length + missedEmails.length + missedPhones.length;

    // leadIds was already extracted at line 3344 from the database query results
    // Reuse it here for groupBy integration (no need to re-extract from processedLeads)
    // These IDs can be used in domain filters: [["_id", "in", leadIds]]

    // Return formatted response with all leads and value breakdown (maintaining same structure)
    return {
      data: processedLeads,
      meta: {
        total: total,
        message: `Found ${total} leads for ${cleanedValues.length} value(s). ${totalFound} values matched, ${totalMissed} values had no matches.`,
        searchedPartnerIds: cleanedValues, // Keep for backward compatibility
        foundPartnerIds: Array.from(foundValues), // All found values
        missedPartnerIds: [...missedPartnerIds, ...missedEmails, ...missedPhones], // All missed values
        // Convenience field: Array of lead IDs for use with groupBy domain filters
        // Usage: GET /leads?groupBy=["user_id"]&domain=[["_id","in",leadIds]]&page=1&limit=80
        leadIds: leadIds, // Reuse leadIds extracted at line 3344
        summary: {
          totalSearched: cleanedValues.length,
          totalFound: totalFound,
          totalMissed: totalMissed,
          totalLeads: total,
          breakdown: {
            partnerIds: {
              searched: partnerIds.length,
              found: uniqueFoundPartnerIds.length,
              missed: missedPartnerIds.length,
            },
            emails: {
              searched: emails.length,
              found: uniqueFoundEmails.length,
              missed: missedEmails.length,
            },
            phones: {
              searched: phones.length,
              found: uniqueFoundPhones.length,
              missed: missedPhones.length,
            },
          },
        },
      },
    };
  } catch (error) {
    logger.error('Error in getLeadsByPartnerIds:', {
      error: error.message,
      values: cleanedValues,
    });
    throw error;
  }
};

/**
 * Get leads that have todos assigned to the requesting user
 * @param {Object} user - User object with role and _id
 * @param {Object} query - Query parameters (page, limit)
 * @returns {Promise<Object>} - Leads with todos assigned to user
 */
const getExtraLeads = async (user, query) => {

  try {
    // Build todo query to find todos assigned to this user
    let todoQuery = { active: true };

    if (user.role === ROLES.ADMIN) {
      // Admin sees todos assigned to any admin
      const adminUsers = await User.find({ role: ROLES.ADMIN }).select('_id');
      const adminIds = adminUsers.map((admin) => admin._id);
      todoQuery.assigned_to = { $in: adminIds };
    } else {
      // Agent sees only todos assigned to them
      todoQuery.assigned_to = user._id;
    }

    // Get todos and extract lead IDs
    const todos = await Todo.find(todoQuery).select('lead_id').lean();
    const leadIds = [...new Set(todos.map((t) => t.lead_id))];

    if (leadIds.length === 0) {
      return {
        data: [],
        meta: {
          total: 0,
          page: parseInt(query.page) || 1,
          limit: parseInt(query.limit) || 50,
          totalPages: 0,
          message: 'No leads found with todos assigned to you',
        },
      };
    }

    // Use a custom implementation to show only todos assigned to this user
    return await getExtraLeadsWithFilteredTodos(user, leadIds, query);
  } catch (error) {
    logger.error('Error in getExtraLeads:', { error: error.message, userId: user._id });
    throw error;
  }
};

/**
 * Helper function to get leads with only the todos assigned to the user
 * @param {Object} user - User object
 * @param {Array} leadIds - Array of lead IDs
 * @param {Object} query - Query parameters
 * @returns {Promise<Object>} - Leads with filtered todos
 */
const getExtraLeadsWithFilteredTodos = async (user, leadIds, query) => {
  // Use executeLeadQuery to get the basic lead data
  const leadQuery = { _id: { $in: leadIds } };
  const result = await executeLeadQuery(
    user,
    leadQuery,
    parseInt(query.page) || 1,
    parseInt(query.limit) || 50,
    true, // includeOffers
    query.state,
    false, // Don't include todos yet - we'll add them manually
    'all', // todo_scope
    null, // pending_todos
    null, // done_todos
    'createdAt', // sortBy
    'desc' // sortOrder
  );

  // If has_todo is requested, fetch only the todos assigned to this user
  if (query.has_todo === 'true' || query.has_todo === true) {
    let todoQuery = {
      lead_id: { $in: result.data.map((lead) => lead._id) },
      active: true,
    };

    if (user.role === ROLES.ADMIN) {
      // Admin sees todos assigned to any admin
      const adminUsers = await User.find({ role: ROLES.ADMIN }).select('_id');
      const adminIds = adminUsers.map((admin) => admin._id);
      todoQuery.assigned_to = { $in: adminIds };
    } else {
      // Agent sees only todos assigned to them
      todoQuery.assigned_to = user._id;
    }

    const extraTodos = await Todo.find(todoQuery)
      .populate('creator_id', '_id login role')
      .populate('assigned_to', '_id login role')
      .sort({ isDone: 1, createdAt: -1 }) // Sort by isDone (false first), then by creation date
      .lean();

    // Create a map of todos by lead ID
    const todoObjectMap = {};
    extraTodos.forEach((todo) => {
      const leadId = todo.lead_id.toString();
      if (!todoObjectMap[leadId]) {
        todoObjectMap[leadId] = [];
      }
      todoObjectMap[leadId].push({
        _id: todo._id,
        message: todo.message,
        isDone: todo.isDone,
        active: todo.active,
        creator: {
          _id: todo.creator_id._id,
          login: todo.creator_id.login,
          role: todo.creator_id.role,
        },
        assignedTo: todo.assigned_to
          ? {
            _id: todo.assigned_to._id,
            login: todo.assigned_to.login,
            role: todo.assigned_to.role,
          }
          : null,
        createdAt: todo.createdAt,
        updatedAt: todo.updatedAt,
        dateOfDone: todo.dateOfDone || null,
        dateOfDoneTime: todo.dateOfDone ? new Date(todo.dateOfDone).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) : null,
      });
    });

    // Add filtered todos to each lead
    result.data = result.data.map((lead) => ({
      ...lead,
      activeTodos: todoObjectMap[lead._id.toString()] || [],
    }));
  }

  return result;
};

/**
 * Get leads where the requesting user has assigned todos to other users
 * @param {Object} user - User object with role and _id
 * @param {Object} query - Query parameters (page, limit, etc.)
 * @returns {Promise<Object>} - Leads where user assigned todos to others
 */
const getAssignedLeads = async (user, query) => {

  try {
    // Build todo query to find todos created by this user and assigned to others
    const todoQuery = {
      creator_id: user._id,
      assigned_to: { $exists: true, $nin: [null, user._id] },
      active: true,
    };

    // Get todos and extract lead IDs
    const todos = await Todo.find(todoQuery).select('lead_id').lean();
    const leadIds = [...new Set(todos.map((t) => t.lead_id))];

    if (leadIds.length === 0) {
      return {
        data: [],
        meta: {
          total: 0,
          page: parseInt(query.page) || 1,
          limit: parseInt(query.limit) || 50,
          totalPages: 0,
          message: 'No leads found where you assigned todos to others',
        },
      };
    }

    // Use a custom implementation to show only assigned todos
    return await getAssignedLeadsWithFilteredTodos(user, leadIds, query);
  } catch (error) {
    logger.error('Error in getAssignedLeads:', { error: error.message, userId: user._id });
    throw error;
  }
};

/**
 * Helper function to get leads with only the todos assigned by the user
 * @param {Object} user - User object
 * @param {Array} leadIds - Array of lead IDs
 * @param {Object} query - Query parameters
 * @returns {Promise<Object>} - Leads with filtered todos
 */
const getAssignedLeadsWithFilteredTodos = async (user, leadIds, query) => {

  // Use executeLeadQuery to get the basic lead data
  const leadQuery = { _id: { $in: leadIds } };
  const result = await executeLeadQuery(
    user,
    leadQuery,
    parseInt(query.page) || 1,
    parseInt(query.limit) || 50,
    true, // includeOffers
    query.state,
    false, // Don't include todos yet - we'll add them manually
    'all', // todo_scope
    null, // pending_todos
    null, // done_todos
    'createdAt', // sortBy
    'desc' // sortOrder
  );

  // If has_todo is requested, fetch only the todos assigned by this user
  if (query.has_todo === 'true' || query.has_todo === true) {
    const assignedTodos = await Todo.find({
      lead_id: { $in: result.data.map((lead) => lead._id) },
      creator_id: user._id,
      assigned_to: { $exists: true, $nin: [null, user._id] },
      active: true,
    })
      .populate('creator_id', '_id login role')
      .populate('assigned_to', '_id login role')
      .sort({ isDone: 1, createdAt: -1 }) // Sort by isDone (false first), then by creation date
      .lean();

    // Create a map of todos by lead ID
    const todoObjectMap = {};
    assignedTodos.forEach((todo) => {
      const leadId = todo.lead_id.toString();
      if (!todoObjectMap[leadId]) {
        todoObjectMap[leadId] = [];
      }
      todoObjectMap[leadId].push({
        _id: todo._id,
        message: todo.message,
        isDone: todo.isDone,
        active: todo.active,
        creator: {
          _id: todo.creator_id._id,
          login: todo.creator_id.login,
          role: todo.creator_id.role,
        },
        assignedTo: todo.assigned_to
          ? {
            _id: todo.assigned_to._id,
            login: todo.assigned_to.login,
            role: todo.assigned_to.role,
          }
          : null,
        createdAt: todo.createdAt,
        updatedAt: todo.updatedAt,
        dateOfDone: todo.dateOfDone || null,
        dateOfDoneTime: todo.dateOfDone ? new Date(todo.dateOfDone).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) : null,
      });
    });

    // Add filtered todos to each lead
    result.data = result.data.map((lead) => ({
      ...lead,
      activeTodos: todoObjectMap[lead._id.toString()] || [],
    }));
  }

  return result;
};

/**
 * Get leads in queue order for agents
 * Queue is sorted by status priority (New → Ne1 → Ne2 → Ne3 → Ne4) then by assignedAt (oldest first)
 * @param {Object} user - User object with role and _id
 * @param {Object} query - Query parameters (page, limit, project_id, project_name, source, exclude_recent)
 * @returns {Promise<Object>} - Leads in queue order with breakdown statistics
 */
const getLeadsQueue = async (user, query) => {
  const {
    page = 1,
    limit = 20,
    project_id,
    project_name,
    source,
    exclude_recent = 0, // Hours to exclude recently worked leads
  } = query;

  try {
    // Status priority mapping (lower number = higher priority in queue)
    const statusPriority = {
      new: 1,
      ne1: 2,
      ne2: 3,
      ne3: 4,
      ne4: 5,
      reclamation: 6,
      // Default for any other status
      default: 999,
    };

    // Build base query for agent's assigned leads
    const agentQuery = {
      active: true, // Only active leads
    };

    // Apply source filter if provided
    if (source) {
      const Source = require('../../models/Source');
      // Find ALL sources containing the search term (case-insensitive partial match)
      const sourceRegex = new RegExp(source, 'i');
      const matchingSources = await Source.find({ name: sourceRegex, active: true }).select('_id name').lean();

      if (matchingSources.length > 0) {
        const sourceIds = matchingSources.map(s => s._id);
        agentQuery.source_id = { $in: sourceIds };
        logger.info(`Queue filtering by sources containing "${source}": ${matchingSources.map(s => s.name).join(', ')} (${sourceIds.length} sources)`);
      } else {
        logger.info(`No active source found containing: ${source}`);
        return {
          data: [],
          meta: buildPaginationMeta(0, page, limit),
          queue_breakdown: {},
          message: 'No active source found containing the provided name',
        };
      }
    }

    // Auto-detect newest project if no project filter provided
    let autoDetectedProjectId = null;
    let autoDetectedProjectName = null;
    let autoDetectedProjectAssignedAt = null;

    if (!project_id && !project_name) {
      // Find the most recently assigned project for this agent
      const mostRecentAssignment = await AssignLeads.findOne({
        agent_id: user._id,
        status: 'active',
      })
        .sort({ assigned_at: -1 }) // Most recent first
        .select('project_id assigned_at')
        .populate('project_id', 'name color_code')
        .lean();

      if (mostRecentAssignment && mostRecentAssignment.project_id) {
        autoDetectedProjectId = mostRecentAssignment.project_id._id;
        autoDetectedProjectName = mostRecentAssignment.project_id.name;
        autoDetectedProjectAssignedAt = mostRecentAssignment.assigned_at;

        logger.info(`Auto-detected newest project for agent ${user._id}:`, {
          projectId: autoDetectedProjectId,
          projectName: autoDetectedProjectName,
          assignedAt: autoDetectedProjectAssignedAt,
        });
      } else {
        logger.info(`No active assignments found for agent ${user._id}`);
        return {
          data: [],
          meta: buildPaginationMeta(0, page, limit),
          queue_breakdown: {},
          message: 'No active assignments found',
        };
      }
    }

    // Apply project filtering (from explicit filter or auto-detected)
    const effectiveProjectId = project_id || autoDetectedProjectId;

    if (effectiveProjectId) {
      // Get assignments for this specific project
      const projectAssignments = await AssignLeads.find({
        project_id: new mongoose.Types.ObjectId(effectiveProjectId),
        agent_id: user._id,
        status: 'active',
      })
        .sort({ assigned_at: -1 })
        .select('lead_id assigned_at')
        .lean();

      if (projectAssignments.length > 0) {
        const leadAssignmentMap = new Map();
        projectAssignments.forEach((assignment) => {
          const leadId = assignment.lead_id.toString();
          if (!leadAssignmentMap.has(leadId)) {
            leadAssignmentMap.set(leadId, assignment);
          }
        });

        const leadIdsFromProject = Array.from(leadAssignmentMap.values()).map((a) => a.lead_id);
        agentQuery._id = { $in: leadIdsFromProject };
      } else {
        return {
          data: [],
          meta: buildPaginationMeta(0, page, limit),
          queue_breakdown: {},
          message: 'No leads assigned to you in this project',
        };
      }
    } else if (project_name) {
      // Find exact project by name
      const escapeRegex = (string) => {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      };

      const exactProject = await mongoose
        .model('Team')
        .findOne({
          name: {
            $regex: new RegExp(`^${escapeRegex(project_name.trim())}$`, 'i'),
          },
          active: true,
        })
        .lean();

      if (exactProject) {
        const projectAssignments = await AssignLeads.find({
          project_id: exactProject._id,
          agent_id: user._id,
          status: 'active',
        })
          .sort({ assigned_at: -1 })
          .select('lead_id assigned_at')
          .lean();

        if (projectAssignments.length > 0) {
          const leadAssignmentMap = new Map();
          projectAssignments.forEach((assignment) => {
            const leadId = assignment.lead_id.toString();
            if (!leadAssignmentMap.has(leadId)) {
              leadAssignmentMap.set(leadId, assignment);
            }
          });

          const leadIdsFromProject = Array.from(leadAssignmentMap.values()).map((a) => a.lead_id);
          agentQuery._id = { $in: leadIdsFromProject };
        } else {
          return {
            data: [],
            meta: buildPaginationMeta(0, page, limit),
            queue_breakdown: {},
            message: `No leads assigned to you in project '${project_name}'`,
          };
        }
      } else {
        return {
          data: [],
          meta: buildPaginationMeta(0, page, limit),
          queue_breakdown: {},
          message: `No project found matching '${project_name}'`,
        };
      }
    } else {
      // No project filter, get all assigned leads for this agent
      await filterLeadsByUserAssignment(user, agentQuery);
    }

    // Exclude recently worked leads if requested
    let excludedLeadIds = [];
    if (exclude_recent > 0) {
      const Activity = require('../../models/activity');
      const cutoffDate = new Date(Date.now() - exclude_recent * 60 * 60 * 1000);

      const recentActivities = await Activity.find({
        user_id: user._id,
        lead_id: { $exists: true },
        createdAt: { $gte: cutoffDate },
      })
        .distinct('lead_id')
        .lean();

      excludedLeadIds = recentActivities;

      logger.info(
        `Excluding ${excludedLeadIds.length} leads worked on in last ${exclude_recent} hours`
      );

      // Add exclusion to query
      if (agentQuery._id && agentQuery._id.$in) {
        // Filter out excluded leads from existing $in array
        agentQuery._id.$in = agentQuery._id.$in.filter(
          (id) => !excludedLeadIds.some((excludedId) => excludedId.toString() === id.toString())
        );
      } else if (excludedLeadIds.length > 0) {
        // Add $nin condition
        agentQuery._id = agentQuery._id || {};
        agentQuery._id.$nin = excludedLeadIds;
      }
    }

    // STEP 1: Fetch leads marked as "on top" (agent is actively working on them)
    const QueueTop = require('../../models/queueTop');
    const onTopRecords = await QueueTop.find({
      agent_id: user._id,
      is_on_top: true,
    })
      .select('lead_id')
      .lean();

    const onTopLeadIds = onTopRecords.map((record) => record.lead_id);

    logger.info(`Found ${onTopLeadIds.length} on-top leads for user ${user._id}`);

    // STEP 2: Fetch all leads matching the queue query
    const allLeads = await Lead.find(agentQuery)
      .populate('source_id', 'name price active color')
      .lean();

    logger.info(`Found ${allLeads.length} leads in queue for user ${user._id}`);

    if (allLeads.length === 0) {
      return {
        data: [],
        meta: buildPaginationMeta(0, page, limit),
        queue_breakdown: {},
        message: 'No leads in your queue',
      };
    }

    // Get assignments for these leads to get assignedAt dates
    const leadIds = allLeads.map((lead) => lead._id);
    const assignments = await AssignLeads.find({
      lead_id: { $in: leadIds },
      agent_id: user._id,
      status: 'active',
    })
      .sort({ assigned_at: -1 })
      .lean();

    // Create assignment map (most recent per lead)
    const assignmentMap = new Map();
    assignments.forEach((assignment) => {
      const leadId = assignment.lead_id.toString();
      if (!assignmentMap.has(leadId)) {
        assignmentMap.set(leadId, assignment);
      }
    });

    // Attach assignedAt to each lead
    const leadsWithAssignedAt = allLeads
      .map((lead) => {
        const assignment = assignmentMap.get(lead._id.toString());
        return {
          ...lead,
          assignedAt: assignment ? assignment.assigned_at : lead.createdAt, // Fallback to createdAt
        };
      })
      .filter((lead) => lead.assignedAt); // Only keep leads with assignedAt

    // Sort leads by queue order: "On Top" First → Status Priority → Date
    const sortedLeads = leadsWithAssignedAt.sort((a, b) => {
      const leadIdA = a._id.toString();
      const leadIdB = b._id.toString();

      // Check if leads are marked as "on top"
      const isOnTopA = onTopLeadIds.some((id) => id.toString() === leadIdA);
      const isOnTopB = onTopLeadIds.some((id) => id.toString() === leadIdB);

      // Priority 1: "On top" leads always come first
      if (isOnTopA && !isOnTopB) return -1; // A comes first
      if (!isOnTopA && isOnTopB) return 1;  // B comes first

      // If both are "on top" or both are not, sort by status priority and date
      const statusA = (a.status?.toString() || '').toLowerCase().replace(/\s+/g, '');
      const statusB = (b.status?.toString() || '').toLowerCase().replace(/\s+/g, '');

      const priorityA = statusPriority[statusA] || statusPriority.default;
      const priorityB = statusPriority[statusB] || statusPriority.default;

      // Priority 2: Sort by status priority
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // Priority 3: Sort by appropriate date field
      // - NEW: Sort by assignedAt (oldest assigned first)
      // - NE1/NE2/NE3/etc: Sort by updatedAt (oldest updated first - needs follow-up)
      let dateA, dateB;

      if (statusA === 'new') {
        // For NEW status, use assignedAt
        dateA = new Date(a.assignedAt);
        dateB = new Date(b.assignedAt);
      } else {
        // For all other statuses (NE1, NE2, NE3, etc.), use updatedAt
        dateA = new Date(a.updatedAt || a.assignedAt); // Fallback to assignedAt if no updatedAt
        dateB = new Date(b.updatedAt || b.assignedAt);
      }

      return dateA - dateB; // Oldest first
    });

    // Calculate queue breakdown by status
    const queueBreakdown = {};
    sortedLeads.forEach((lead) => {
      const status = (lead.status?.toString() || 'unknown').toLowerCase().replace(/\s+/g, '');
      queueBreakdown[status] = (queueBreakdown[status] || 0) + 1;
    });

    // Calculate total
    const total = sortedLeads.length;

    // Normalize page to ensure it doesn't exceed available pages
    const queuePaginationInfo = normalizePagination(page, total, limit);
    const queueNormalizedPage = queuePaginationInfo.page;
    if (queuePaginationInfo.adjusted) {
      logger.info(`getLeadsQueue: Page ${page} exceeds available pages (${queuePaginationInfo.pages}), adjusted to page ${queueNormalizedPage}`);
    }

    // Apply pagination using normalized values
    const skip = queuePaginationInfo.offset;
    const paginatedLeads = sortedLeads.slice(skip, skip + parseInt(limit));

    if (paginatedLeads.length === 0) {
      return {
        data: [],
        meta: buildPaginationMeta(total, queueNormalizedPage, limit),
        queue_breakdown: queueBreakdown,
      };
    }

    // Fetch related data for paginated leads
    const paginatedLeadIds = paginatedLeads.map((lead) => lead._id);

    // Fetch favourite status for current user
    const Favourite = require('../../models/Favourite');
    const favourites = await Favourite.find({
      lead_id: { $in: paginatedLeadIds },
      user_id: user._id,
      active: true,
    })
      .select('lead_id')
      .lean();

    const favouriteLeadIds = new Set(favourites.map((fav) => fav.lead_id.toString()));

    const {
      assignments: relatedAssignments,
      assignmentHistory,
      offers,
      openings,
      confirmations,
      paymentVouchers,
      appointments,
      stageMap,
    statusMap,
  } = await fetchLeadRelatedData(paginatedLeadIds, user);

    // Create lookup maps
    const lookupMaps = createLookupMaps(
      relatedAssignments,
      assignmentHistory,
      offers,
      openings,
      confirmations,
      paymentVouchers,
      appointments
    );

    // Process leads with related data
    // NOTE: Pass null for projectFilter to show ALL offers regardless of project filter
    // This matches the behavior of get-by-id endpoint
    const processedLeads = processLeadsWithRelatedData(
      paginatedLeads,
      lookupMaps,
      stageMap,
      statusMap,
      true, // includeOffers
      user,
      null, // Don't filter offers by project - show all offers for the lead
      favouriteLeadIds,
      false // isDetailApi = false for queue API (list API)
    );

    // Add queue position and "on top" flag to each lead
    const leadsWithPosition = processedLeads.map((lead, index) => {
      const globalPosition = skip + index + 1;
      const status = (lead.status?.toString() || 'unknown').toLowerCase().replace(/\s+/g, '');
      const leadId = lead._id.toString();

      // Check if this lead is marked as "on top"
      const isOnTop = onTopLeadIds.some((id) => id.toString() === leadId);

      // Calculate position within status group (normalize spaces for comparison)
      let positionInStatus = 1;
      for (let i = 0; i < skip + index; i++) {
        if ((sortedLeads[i].status?.toString() || '').toLowerCase().replace(/\s+/g, '') === status) {
          positionInStatus++;
        }
      }

      return {
        ...lead,
        is_on_top: isOnTop, // Flag indicating agent is actively working on this lead
        queue_position: {
          overall: globalPosition,
          in_status: positionInStatus,
          status_group: status,
        },
      };
    });

    // Build response
    const response = {
      data: leadsWithPosition,
      meta: buildPaginationMeta(total, queueNormalizedPage, limit),
      queue_breakdown: queueBreakdown,
      queue_info: {
        total_in_queue: total,
        total_excluded: excludedLeadIds.length,
        exclude_recent_hours: exclude_recent,
        current_page_range: {
          from: skip + 1,
          to: skip + paginatedLeads.length,
        },
        status_priority_order: ['new', 'ne1', 'ne2', 'ne3', 'ne4', 'reclamation'],
        sorting: 'Status Priority (ascending) → NEW: Assigned Date (oldest first), NE1/NE2/etc: Updated Date (oldest first)',
        // Add project filter information
        filtered_by_project: autoDetectedProjectId ? {
          project_id: autoDetectedProjectId,
          project_name: autoDetectedProjectName,
          assigned_at: autoDetectedProjectAssignedAt,
          auto_detected: true,
        } : (project_id || project_name) ? {
          project_id: project_id,
          project_name: project_name,
          auto_detected: false,
        } : null,
      },
    };

    logger.info('Queue response prepared', {
      userId: user._id,
      totalInQueue: total,
      pageSize: paginatedLeads.length,
      breakdown: queueBreakdown,
    });

    return response;
  } catch (error) {
    logger.error('Error in getLeadsQueue:', {
      error: error.message,
      userId: user._id,
      query,
    });
    throw error;
  }
};

module.exports = {
  getAllLeads,
  getMyLeads,
  getLeadById,
  getLeadIds,
  getExtraLeads,
  getAssignedLeads,
  getLeadsQueue,
  // Export helper functions for potential reuse
  executeLeadQuery,
  fetchLeadRelatedData,
  createLookupMaps,
  processLeadsWithRelatedData,
  hydrateLeadReferences,
  maskEmail,
  maskPhone,
  shouldMaskLeadData,
  applyLeadMasking,
  parseUseStatusFilter,
  parseSortParameters,
  parseRevenueValue,
  getLeadsByPartnerIds,
  resolveValuesToLeadIds,
};


