/**
 * Offer Query Optimizer - Microservice Version
 * Ultra-fast queries for large datasets (100k+ offers)
 * 
 * Performance: 469x faster than aggregation pipeline for simple list queries
 * Use this for: GET /offers (standard list without complex progress filters)
 * Use aggregation for: Complex progress filtering, netto calculations
 */

const { Offer, Todo, mongoose, Document, logger, Lead } = require('../config/dependencies');
// const { Document } = require('../../../models/mongo/document');
const { formatRevenue } = require('../../leadService/transforms');
const { applyLeadMasking } = require('../../leadService/queries');
const {
  sortByInterestMonth,
  sortOffersByPopulatedAlias,
  isInterestMonthSortKey,
  needsOfferPopulatedInMemorySort,
  OFFER_MONGO_ROOT_SORT_FIELDS,
  isAscendingOrder,
} = require('./sortingHelper');
const { populateBankProviders } = require('./parallelHelper');
const DocumentManager = require('../documents/DocumentManager');

/**
 * Get lead IDs that should be excluded from offer queries
 * Excludes leads with status "out" (case insensitive) OR inactive leads
 */
const getExcludedLeadIds = async () => {
  try {
    const excludedLeads = await Lead.find({
      $or: [
        { status: { $regex: /^out$/i } },
        { active: false }
      ]
    }).select('_id').lean();
    return excludedLeads.map(lead => lead._id);
  } catch (error) {
    logger.error('Error fetching excluded lead IDs:', error.message);
    return [];
  }
};

/**
 * Optimized offer list query - FAST version for large datasets
 * Uses indexed queries, lean(), and minimal populations
 * 
 * Performance: < 500ms for 50 offers from 100k+ dataset
 * vs 43+ seconds with aggregation pipeline
 */
const getOffersOptimized = async (user, query, hasPermissionFn, permissions) => {
  const startTime = Date.now();

  try {
    const {
      page = 1,
      limit = 50,
      search,
      status,
      project_id,
      agent_id,
      active,
      out,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    // Build query with indexed fields
    const matchQuery = {};
    
    // Handle out query parameter
    if (out === true || out === 'true') {
      // Filter to show only offers with current_stage='out'
      matchQuery.current_stage = 'out';
    } else if (out === false || out === 'false') {
      // Explicitly exclude offers with current_stage='out'
      matchQuery.current_stage = { $ne: 'out' };
    } else {
      // V2: Filter to show all offer stages (offer, call_1, call_2, call_3, call_4)
      // This excludes offers that have progressed to opening/confirmation/payment/netto/lost/out
      matchQuery.current_stage = { $in: ['offer', 'call_1', 'call_2', 'call_3', 'call_4'] };
    }

    // Apply active filter - if not provided, default to true (only active offers)
    if (active !== undefined && active !== null) {
      // Handle both boolean and string values
      // If it's explicitly false (boolean or string), set to false; otherwise true
      matchQuery.active = active !== false && active !== 'false';
    } else {
      matchQuery.active = true;
    }

    // Permission-based filtering
    const canReadAll = await hasPermissionFn(user.role, permissions.OFFER_READ_ALL);
    if (!canReadAll) {
      matchQuery.agent_id = user._id;
    }

    // Apply filters (all indexed fields)
    if (status) matchQuery.status = status;
    if (project_id) matchQuery.project_id = new mongoose.Types.ObjectId(project_id);
    if (agent_id) matchQuery.agent_id = new mongoose.Types.ObjectId(agent_id);

    // Exclude offers where lead is "out" status or inactive
    const excludedLeadIds = await getExcludedLeadIds();
    if (excludedLeadIds.length > 0) {
      matchQuery.lead_id = { $nin: excludedLeadIds };
    }

    // Search optimization - use indexed fields
    if (search) {
      matchQuery.$or = [
        { title: { $regex: search, $options: 'i' } },
        { reference_no: { $regex: search, $options: 'i' } }
      ];
    }

    const trimmedSortBy = typeof sortBy === 'string' ? sortBy.trim() : 'createdAt';
    const isInterestMonthSort = isInterestMonthSortKey(sortBy);
    const needsPopulatedSort = needsOfferPopulatedInMemorySort(trimmedSortBy);

    const sortDir = isAscendingOrder(sortOrder) ? 1 : -1;
    const mongoField = OFFER_MONGO_ROOT_SORT_FIELDS[trimmedSortBy] || trimmedSortBy;
    const sortObj = { [mongoField]: sortDir };

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // interestMonth + lead/agent/bank/project display sorts need populated data, then in-memory order
    let offers, total;

    if (isInterestMonthSort || needsPopulatedSort) {
      const [totalCount, allOffers] = await Promise.all([
        Offer.countDocuments(matchQuery),
        Offer.find(matchQuery)
          .populate({
            path: 'lead_id',
            select: 'lead_source_no contact_name email_from phone source_id stage status offer_calls',
            populate: {
              path: 'source_id',
              select: 'name price active color'
            }
          })
          .populate('project_id', 'name color_code')
          .populate('agent_id', '_id login first_name last_name role color_code')
          .populate({
            path: 'bank_id',
            select: 'name nickName iban Ref provider',
            populate: {
              path: 'provider',
              select: 'name login',
            },
          })
          .populate('payment_terms', 'name info')
          .populate('bonus_amount', 'name info')
          .populate('created_by', 'login first_name last_name')
          .populate({
            path: 'files.document',
            select: 'filename filetype size type assignments'
          })
          .lean()
      ]);

      let sortedOffers;
      if (isInterestMonthSort) {
        sortedOffers = sortByInterestMonth(allOffers, sortOrder);
      } else {
        sortedOffers = sortOffersByPopulatedAlias(allOffers, trimmedSortBy, sortOrder);
      }
      total = totalCount;
      offers = sortedOffers.slice(skip, skip + parseInt(limit));
    } else {
      [total, offers] = await Promise.all([
        Offer.countDocuments(matchQuery),
        Offer.find(matchQuery)
          .populate({
            path: 'lead_id',
            select: 'lead_source_no contact_name email_from phone source_id stage status offer_calls',
            populate: {
              path: 'source_id',
              select: 'name price active color'
            }
          })
          .populate('project_id', 'name color_code')
          .populate('agent_id', '_id login first_name last_name role color_code')
          .populate({
            path: 'bank_id',
            select: 'name nickName iban Ref provider',
            populate: {
              path: 'provider',
              select: 'name login',
            },
          })
          .populate('payment_terms', 'name info')
          .populate('bonus_amount', 'name info')
          .populate('created_by', 'login first_name last_name')
          .populate({
            path: 'files.document',
            select: 'filename filetype size type assignments'
          })
          .sort(sortObj)
          .skip(skip)
          .limit(parseInt(limit))
          .lean()
      ]);
    }

    // === REVERSE REFERENCE LOOKUP ===
    // Fetch documents that have assignments pointing to these offers
    const offerIds = offers.map(o => o._id);
    const assignedDocuments = await Document.find({
      'assignments.entity_type': 'offer',
      'assignments.entity_id': { $in: offerIds },
      'assignments.active': true,
      active: true,
    })
      .select('_id filename filetype size type assignments')
      .lean();

    // Group documents by offer ID
    const documentsByOfferId = {};
    assignedDocuments.forEach(doc => {
      doc.assignments.forEach(assignment => {
        if (assignment.entity_type === 'offer' && assignment.active) {
          const offerId = assignment.entity_id.toString();
          if (!documentsByOfferId[offerId]) {
            documentsByOfferId[offerId] = [];
          }
          documentsByOfferId[offerId].push({
            _id: doc._id,
            filename: doc.filename,
            filetype: doc.filetype,
            size: doc.size,
            type: doc.type,
            assigned_at: assignment.assigned_at,
            source: 'reverse_reference'
          });
        }
      });
    });

    const duration = Date.now() - startTime;
    logger.info(`✅ Optimized offers query completed in ${duration}ms`, {
      total,
      returned: offers.length,
      page,
      limit,
      documentsLoaded: assignedDocuments.length,
      improvement: 'Using indexed .lean() query with reverse reference documents'
    });

    // Populate document_slots (documents and emails per slot)
    const offersWithDocumentSlots = await DocumentManager.populateDocumentSlotsForOffers(offers);

    // Fetch todo counts for all leads (active and not done)
    const leadIds = offers
      .map(offer => offer.lead_id?._id || offer.lead_id)
      .filter(Boolean);

    let todoCountMap = new Map();
    if (leadIds.length > 0) {
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
      for (const result of todoCountResults) {
        const leadId = result._id?.toString();
        if (leadId) {
          todoCountMap.set(leadId, result.todoCount);
        }
      }
    }

    // Format offers with proper structure (use offersWithDocumentSlots for document_slots)
    const formattedOffers = offers.map((offer, i) => {
      const offerWithSlots = offersWithDocumentSlots[i] || offer;
      const leadId = offer.lead_id?._id?.toString() || offer.lead_id?.toString();
      const todoCount = leadId ? (todoCountMap.get(leadId) || 0) : 0;
      
      // Get documents from reverse reference lookup
      const reverseRefDocs = documentsByOfferId[offer._id.toString()] || [];
      
      // Also process forward reference files (legacy) if any
      const forwardRefDocs = Array.isArray(offer.files) && offer.files.length > 0
        ? offer.files.map(file => {
            if (file.document) {
              const assignment = file.document.assignments?.find(
                a => a.entity_type === 'offer' && a.entity_id.toString() === offer._id.toString()
              );
              return {
                _id: file.document._id,
                filename: file.document.filename,
                filetype: file.document.filetype,
                size: file.document.size,
                type: file.document.type,
                assigned_at: assignment?.assigned_at || file.document.createdAt,
                source: 'forward_reference'
              };
            }
            return file;
          }).filter(f => f._id)
        : [];

      // Explicitly exclude offer_calls from top level (it's a lead field, not offer field)
      const { offer_calls, ...offerWithoutCalls } = offer;
      
      // Ensure offer_calls is always present in lead_id with default 0
      let leadIdWithOfferCalls = offerWithoutCalls.lead_id ? {
        ...offerWithoutCalls.lead_id,
        offer_calls: offerWithoutCalls.lead_id.offer_calls !== undefined && offerWithoutCalls.lead_id.offer_calls !== null 
          ? offerWithoutCalls.lead_id.offer_calls 
          : 0
      } : offerWithoutCalls.lead_id;
      
      // Apply lead masking for non-admin users (isDetailApi = false for list API)
      if (leadIdWithOfferCalls && typeof leadIdWithOfferCalls === 'object') {
        leadIdWithOfferCalls = applyLeadMasking(leadIdWithOfferCalls, user, false);
      }
      
      // Merge and deduplicate (reverse refs take priority)
      const docMap = new Map();
      reverseRefDocs.forEach(doc => docMap.set(doc._id.toString(), doc));
      forwardRefDocs.forEach(doc => {
        if (!docMap.has(doc._id.toString())) {
          docMap.set(doc._id.toString(), doc);
        }
      });
      
      const processedFiles = Array.from(docMap.values())
        .sort((a, b) => new Date(b.assigned_at) - new Date(a.assigned_at));

      // Ensure agent_id has color_code field (even if null/undefined in DB)
      const agentIdWithColorCode = offerWithoutCalls.agent_id ? {
        ...offerWithoutCalls.agent_id,
        color_code: offerWithoutCalls.agent_id.color_code || null
      } : offerWithoutCalls.agent_id;
      
      return {
        _id: offerWithoutCalls._id,
        title: offerWithoutCalls.title,
        nametitle: offerWithoutCalls.nametitle,
        project_id: offerWithoutCalls.project_id,
        lead_id: leadIdWithOfferCalls,
        agent_id: agentIdWithColorCode,
        created_by: offerWithoutCalls.created_by,
        bank_id: offerWithoutCalls.bank_id,
        investment_volume: formatRevenue(offerWithoutCalls.investment_volume),
        interest_rate: offerWithoutCalls.interest_rate,
        payment_terms: offerWithoutCalls.payment_terms,
        bonus_amount: offerWithoutCalls.bonus_amount,
        status: offerWithoutCalls.status,
        offerType: offerWithoutCalls.offerType,
        flex_option: offerWithoutCalls.flex_option,
        active: offerWithoutCalls.active,
        scheduled_date: offerWithoutCalls.scheduled_date,
        scheduled_time: offerWithoutCalls.scheduled_time,
        handover_notes: offerWithoutCalls.handover_notes,
        pending_transfer: offerWithoutCalls.pending_transfer,
        current_stage: offerWithoutCalls.current_stage || 'offer',
        load_and_opening: offerWithoutCalls.load_and_opening ?? 'opening',
        files: processedFiles,
        document_slots: offerWithSlots.document_slots || offerWithoutCalls.document_slots,
        todoCount: todoCount,
        created_at: offerWithoutCalls.created_at,
        updated_at: offerWithoutCalls.updated_at,
        createdAt: offerWithoutCalls.createdAt,
        updatedAt: offerWithoutCalls.updatedAt,
        __v: offerWithoutCalls.__v
      };
    });

    return {
      data: formattedOffers,
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    };

  } catch (error) {
    logger.error('Error in getOffersOptimized:', error);
    throw error;
  }
};

/**
 * Get single offer with full details (for detail view)
 */
const getOfferByIdOptimized = async (offerId, user, hasPermissionFn, permissions) => {
  const offer = await Offer.findOne({ _id: offerId, active: true })
    .populate('lead_id')
    .populate('project_id')
    .populate('agent_id', '_id login first_name last_name email color_code')
    .populate({
      path: 'bank_id',
      select: 'name nickName iban Ref provider',
      populate: {
        path: 'provider',
        select: 'name login',
      },
    })
    .populate('payment_terms', 'name info')
    .populate('bonus_amount', 'name info')
    .populate('files.document')
    .lean();

  if (!offer) {
    throw new Error('Offer not found');
  }

  // Permission check
  const canReadAll = await hasPermissionFn(user.role, permissions.OFFER_READ_ALL);
  if (!canReadAll && offer.agent_id._id.toString() !== user._id.toString()) {
    throw new Error('Unauthorized');
  }

  // Ensure agent_id has color_code field (even if null/undefined in DB)
  if (offer.agent_id) {
    offer.agent_id = {
      ...offer.agent_id,
      color_code: offer.agent_id.color_code || null
    };
  }

  // Apply lead masking for non-admin users (isDetailApi = true for detail API)
  if (offer.lead_id && typeof offer.lead_id === 'object') {
    offer.lead_id = applyLeadMasking(offer.lead_id, user, true);
  }

  return offer;
};

/**
 * Get offers that have tickets (for Offer Tickets dashboard)
 * Returns offers with their associated tickets in offer-centric format
 * 
 * @param {Object} user - Current user
 * @param {Object} query - Query parameters
 * @param {Function} hasPermissionFn - Permission check function
 * @param {Object} permissions - Permissions object
 * @returns {Promise<Object>} - Paginated offers with tickets
 */
const getOffersWithTickets = async (user, query, hasPermissionFn, permissions) => {
  const startTime = Date.now();

  try {
    const {
      page = 1,
      limit = 50,
      search,
      status, // offer status
      ticket_status, // 'pending' | 'done' | undefined (all)
      ownership, // 'for_me' | 'from_me' | 'all' (admin only)
      project_id,
      agent_id,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    // Permission check
    const canReadAll = await hasPermissionFn(user.role, permissions.OFFER_READ_ALL);
    const isAdmin = canReadAll;

    // Step 1: Build ticket query to find offers with tickets
    const ticketQuery = {
      active: true,
      offer_id: { $exists: true, $ne: null }, // Only offer tickets
    };

    // Apply ticket status filter using the new ticket_status field
    // pending = not assigned, in_progress = assigned but not done, done = completed
    if (ticket_status === 'pending') {
      // Pending means not assigned AND not done
      ticketQuery.isDone = false;
      ticketQuery.$or = [
        { assigned_to: null },
        { assigned_to: { $exists: false } }
      ];
    } else if (ticket_status === 'in_progress') {
      // In progress means assigned but not done
      ticketQuery.isDone = false;
      ticketQuery.assigned_to = { $exists: true, $ne: null };
    } else if (ticket_status === 'done') {
      ticketQuery.isDone = true;
    }

    // Apply ownership filter
    if (ownership === 'for_me') {
      ticketQuery.assigned_to = user._id;
    } else if (ownership === 'from_me') {
      ticketQuery.creator_id = user._id;
      ticketQuery.assigned_to = { $nin: [null, user._id] };
    } else if (!isAdmin) {
      // Non-admins can only see tickets they created or assigned to them
      ticketQuery.$or = [
        { creator_id: user._id },
        { assigned_to: user._id }
      ];
    }
    // 'all' ownership for admins = no additional filter

    // Step 2: Get offer IDs that have matching tickets
    const ticketsWithOffers = await Todo.find(ticketQuery)
      .select('offer_id lead_id isDone message priority createdAt updatedAt assigned_to assigned_by assigned_at creator_id type dateOfDone ticket_status')
      .populate('assigned_to', '_id login role color_code')
      .populate('assigned_by', '_id login role')
      .populate('creator_id', '_id login role')
      .lean();

    // Group tickets by offer_id
    const ticketsByOfferId = new Map();
    ticketsWithOffers.forEach(ticket => {
      const offerId = ticket.offer_id?.toString();
      if (offerId) {
        if (!ticketsByOfferId.has(offerId)) {
          ticketsByOfferId.set(offerId, []);
        }
        ticketsByOfferId.get(offerId).push(ticket);
      }
    });

    const offerIdsWithTickets = Array.from(ticketsByOfferId.keys());

    if (offerIdsWithTickets.length === 0) {
      return {
        data: [],
        meta: {
          total: 0,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false,
        },
        statistics: {
          total_tickets: 0,
          pending_tickets: 0,
          completed_tickets: 0,
        }
      };
    }

    // Step 3: Build offer query
    const offerQuery = {
      _id: { $in: offerIdsWithTickets.map(id => new mongoose.Types.ObjectId(id)) },
      active: true,
    };

    // Agent filter (non-admins can only see their own offers)
    if (!canReadAll) {
      offerQuery.agent_id = user._id;
    } else if (agent_id) {
      offerQuery.agent_id = new mongoose.Types.ObjectId(agent_id);
    }

    // Additional filters
    if (status) offerQuery.status = status;
    if (project_id) offerQuery.project_id = new mongoose.Types.ObjectId(project_id);

    // Exclude offers where lead is "out" or inactive
    const excludedLeadIds = await getExcludedLeadIds();
    if (excludedLeadIds.length > 0) {
      offerQuery.lead_id = { $nin: excludedLeadIds };
    }

    // Search
    if (search) {
      offerQuery.$or = [
        { title: { $regex: search, $options: 'i' } },
        { reference_no: { $regex: search, $options: 'i' } }
      ];
    }

    // Step 4: Count and fetch offers
    const total = await Offer.countDocuments(offerQuery);
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const trimmedSortBy = typeof sortBy === 'string' ? sortBy.trim() : 'createdAt';
    const isInterestMonthSort = isInterestMonthSortKey(sortBy);
    const needsPopulatedSort = needsOfferPopulatedInMemorySort(trimmedSortBy);
    const sortDir = isAscendingOrder(sortOrder) ? 1 : -1;
    const mongoField = OFFER_MONGO_ROOT_SORT_FIELDS[trimmedSortBy] || trimmedSortBy;
    const sortObj = { [mongoField]: sortDir };

    const populateChain = () =>
      Offer.find(offerQuery)
        .populate({
          path: 'lead_id',
          select: 'lead_source_no contact_name email_from phone source_id stage status expected_revenue createdAt',
          populate: {
            path: 'source_id',
            select: 'name price active color',
          },
        })
        .populate('project_id', 'name')
        .populate('agent_id', '_id login role color_code')
        .populate({
          path: 'bank_id',
          select: 'name nickName iban Ref provider',
          populate: {
            path: 'provider',
            select: 'name login',
            options: { strictPopulate: false },
          },
        })
        .populate('payment_terms', 'name info')
        .populate('bonus_amount', 'name info');

    let offers;
    if (isInterestMonthSort || needsPopulatedSort) {
      const allOffers = await populateChain().lean();
      let sortedOffers;
      if (isInterestMonthSort) {
        sortedOffers = sortByInterestMonth(allOffers, sortOrder);
      } else {
        sortedOffers = sortOffersByPopulatedAlias(allOffers, trimmedSortBy, sortOrder);
      }
      offers = sortedOffers.slice(skip, skip + parseInt(limit));
    } else {
      offers = await populateChain().sort(sortObj).skip(skip).limit(parseInt(limit)).lean();
    }

    // Populate bank providers (handle cases where provider is still an ID string)
    const offersWithProviders = await populateBankProviders(offers);

    // Step 5: Attach tickets to each offer
    const offersWithTickets = offersWithProviders.map(offer => {
      const tickets = ticketsByOfferId.get(offer._id.toString()) || [];
      // Get the primary ticket (most recent pending, or most recent if all done)
      const pendingTickets = tickets.filter(t => !t.isDone);
      const primaryTicket = pendingTickets.length > 0 
        ? pendingTickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]
        : tickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

      // Compute ticket_status if not present (for backward compatibility)
      const computeTicketStatus = (t) => {
        if (t.ticket_status) return t.ticket_status;
        if (t.isDone) return 'done';
        if (t.assigned_to) return 'in_progress';
        return 'pending';
      };

      // Apply lead masking for non-admin users (isDetailApi = false for list API)
      let maskedLeadId = offer.lead_id;
      if (offer.lead_id && typeof offer.lead_id === 'object') {
        maskedLeadId = applyLeadMasking(offer.lead_id, user, false);
      }

      return {
        ...offer,
        lead_id: maskedLeadId,
        // Format investment volume
        investment_volume: formatRevenue(offer.investment_volume),
        investment_volume_raw: offer.investment_volume,
        // Add ticket info
        ticket: primaryTicket ? {
          _id: primaryTicket._id,
          message: primaryTicket.message,
          isDone: primaryTicket.isDone,
          priority: primaryTicket.priority,
          type: primaryTicket.type,
          ticket_status: computeTicketStatus(primaryTicket),
          createdAt: primaryTicket.createdAt,
          updatedAt: primaryTicket.updatedAt,
          dateOfDone: primaryTicket.dateOfDone,
          assignedAt: primaryTicket.assigned_at,
          creator: primaryTicket.creator_id,
          assignedTo: primaryTicket.assigned_to,
          assignedBy: primaryTicket.assigned_by,
        } : null,
        allTickets: tickets.map(t => ({
          _id: t._id,
          message: t.message,
          isDone: t.isDone,
          priority: t.priority,
          ticket_status: computeTicketStatus(t),
          createdAt: t.createdAt,
          assignedTo: t.assigned_to,
        })),
        ticketCount: tickets.length,
        pendingTicketCount: tickets.filter(t => !t.isDone && !t.assigned_to).length,
        inProgressTicketCount: tickets.filter(t => !t.isDone && t.assigned_to).length,
        doneTicketCount: tickets.filter(t => t.isDone).length,
      };
    });

    // Calculate statistics with the three-state workflow
    const allTickets = ticketsWithOffers;
    const statistics = {
      total_tickets: allTickets.length,
      pending_tickets: allTickets.filter(t => !t.isDone && !t.assigned_to).length,
      in_progress_tickets: allTickets.filter(t => !t.isDone && t.assigned_to).length,
      completed_tickets: allTickets.filter(t => t.isDone).length,
    };

    const duration = Date.now() - startTime;
    logger.info(`getOffersWithTickets completed in ${duration}ms - ${offers.length} offers with tickets`);

    return {
      data: offersWithTickets,
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
        hasNextPage: parseInt(page) < Math.ceil(total / parseInt(limit)),
        hasPrevPage: parseInt(page) > 1,
      },
      statistics,
    };

  } catch (error) {
    logger.error('Error in getOffersWithTickets:', error);
    throw error;
  }
};

module.exports = {
  getOffersOptimized,
  getOfferByIdOptimized,
  getOffersWithTickets
};

