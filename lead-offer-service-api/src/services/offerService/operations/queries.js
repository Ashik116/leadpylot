/**
 * Offer Service Query Operations - OPTIMIZED for V2 Consolidated Model
 * Replaced complex aggregation pipelines with direct queries on 'current_stage'
 */

const { Offer, Todo, Lead, logger, mongoose, NotFoundError, AuthorizationError } = require('../config/dependencies');
const User = require('../../../models/User');

/**
 * Get lead IDs that should be excluded from offer queries
 * Excludes leads with status "out" (case insensitive) OR inactive leads
 * @returns {Promise<Array>} Array of lead IDs to exclude
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

const { normalizeQuery, parseSortParameters, getPaginationMeta } = require('../utils/query');
const { calculateNettoAmounts } = require('../utils/calculations');
const { validateObjectId } = require('../utils/validators');
const { OFFER_POPULATE_CONFIG, MAX_LIMIT, PROGRESS_FILTERS } = require('../config/constants');
const PermissionManager = require('../permissions/PermissionManager');
const DocumentManager = require('../documents/DocumentManager');
const OfferQueryBuilder = require('../builders/QueryBuilder');
const { formatRevenue } = require('../../leadService/transforms');
const { getRevertOptions } = require('./revert');
const { applyLeadMasking } = require('../../leadService/queries');


// Import optimization helpers
const {
  applyOfferSorting,
  sortByInterestMonth,
  sortOffersByPopulatedAlias,
  isInterestMonthSortKey,
  needsOfferPopulatedInMemorySort,
  OFFER_MONGO_ROOT_SORT_FIELDS,
  isAscendingOrder,
} = require('../utils/sortingHelper');

const {
  populateBankProviders,
  populateOffersDocumentsParallel,
  applyNettoCalculations,
} = require('../utils/parallelHelper');

/**
 * Fetch color_code for agents from User model
 * This ensures color_code is always fetched correctly even if populate doesn't work
 * @param {Array} offers - Array of offers with agent_id
 * @returns {Promise<Map>} - Map of agent_id to color_code
 */
const fetchAgentColorCodes = async (offers) => {
  try {
    const agentIds = offers
      .map(offer => offer.agent_id?._id || offer.agent_id)
      .filter(Boolean)
      .map(id => id.toString ? id.toString() : id);
    
    if (agentIds.length === 0) {
      return new Map();
    }
    
    // Remove duplicates
    const uniqueAgentIds = [...new Set(agentIds)];
    
    const users = await User.find({ _id: { $in: uniqueAgentIds } })
      .select('_id color_code')
      .lean();
    
    const colorCodeMap = new Map();
    users.forEach(user => {
      if (user._id) {
        colorCodeMap.set(user._id.toString(), user.color_code || null);
      }
    });
    
    return colorCodeMap;
  } catch (error) {
    logger.error('Error fetching agent color codes:', error);
    return new Map();
  }
};

/**
 * Apply formatRevenue to investment_volume field in offer data
 * Excludes offer_calls as it's a lead field, not an offer field
 * @param {Object|Array} offers - Single offer or array of offers
 * @returns {Object|Array} - Formatted offer(s) with investment_volume formatted
 */
const formatOfferInvestmentVolume = (offers) => {
  if (!offers) return offers;

  if (Array.isArray(offers)) {
    return offers.map((offer) => {
      // Explicitly exclude offer_calls (it's a lead field, not offer field)
      const { offer_calls, ...offerWithoutCalls } = offer;
      return {
        ...offerWithoutCalls,
        investment_volume: formatRevenue(offer.investment_volume),
        // Set default value for load_and_opening if not present or null
        load_and_opening: offer.load_and_opening ?? 'opening',
      };
    });
  }

  // Explicitly exclude offer_calls (it's a lead field, not offer field)
  const { offer_calls, ...offerWithoutCalls } = offers;
  return {
    ...offerWithoutCalls,
    investment_volume: formatRevenue(offers.investment_volume),
    // Set default value for load_and_opening if not present or null
    load_and_opening: offers.load_and_opening ?? 'opening',
  };
};

/**
 * Optimized getAllOffers function
 * Uses direct standard MongoDB queries instead of complex aggregation
 */
const getAllOffers = async (user, query, hasPermissionFn, permissions) => {
  const startTime = Date.now();

  try {
    const normalizedQuery = normalizeQuery(query);
    const {
      page,
      limit,
      search,
      has_progress,
      out,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      ...filters
    } = normalizedQuery;

    logger.debug('Processing V2 optimized offers request', {
      userId: user._id,
      role: user.role,
      filters: { ...filters, search: search ? 'provided' : 'none' },
    });

    // Execute permission filter
    const permissionFilter = await PermissionManager.getPermissionFilter(
      user,
      hasPermissionFn,
      permissions
    );

    // Build base query
    const baseQuery = await OfferQueryBuilder.buildBaseMatch(
      { ...filters, user },
      permissionFilter,
      hasPermissionFn,
      permissions
    );

    // Add search filter if present (searches offer fields AND lead contact_name/phone/email)
    if (search) {
      const sanitizedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = { $regex: sanitizedSearch, $options: 'i' };

      // Check if search term is a valid MongoDB ObjectId
      const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(search);

      // Build lead search conditions
      const leadSearchConditions = [
        { contact_name: searchRegex },
        { phone: searchRegex },
        { email_from: searchRegex },
        { lead_source_no: searchRegex },
      ];

      // Add _id search if valid ObjectId (for lead _id)
      if (isValidObjectId) {
        leadSearchConditions.push({ _id: search });
        logger.info(`getAllOffers: Valid ObjectId detected for lead search, adding _id search for "${search}"`);
      }

      // Find leads matching the search term
      const matchingLeads = await Lead.find({
        $or: leadSearchConditions,
        active: true,
      }).select('_id').lean();

      const matchingLeadIds = matchingLeads.map(l => l._id);

      // Build combined search: offer fields OR matching lead IDs
      const offerSearchConditions = [
        { title: searchRegex },
        { nametitle: searchRegex },
        { reference_no: searchRegex },
        ...(matchingLeadIds.length > 0 ? [{ lead_id: { $in: matchingLeadIds } }] : []),
      ];

      // Add offer _id search if valid ObjectId
      if (isValidObjectId) {
        offerSearchConditions.push({ _id: search });
        logger.info(`getAllOffers: Valid ObjectId detected for offer search, adding _id search for "${search}"`);
      }

      baseQuery.$or = offerSearchConditions;
    }

    // Handle out query parameter
    if (out === true || out === 'true') {
      // Filter to show only offers with current_stage='out'
      baseQuery.current_stage = 'out';
    } else if (out === false || out === 'false') {
      // Explicitly exclude offers with current_stage='out'
      baseQuery.current_stage = { $ne: 'out' };
    }

    // Handle Progress Filtering (Simpler V2 logic)
    // Only apply if out parameter is not set
    if (!out || (out !== true && out !== 'true')) {
      if (has_progress && has_progress !== 'any') {
        if (PROGRESS_FILTERS[has_progress]) {
          Object.assign(baseQuery, PROGRESS_FILTERS[has_progress]);
        }
      } else if (!has_progress) {
         // Show all offer stages (offer, call_1, call_2, call_3, call_4)
         // This excludes offers that have progressed to opening/confirmation/payment/netto/lost/out
         if (!baseQuery.current_stage) {
           Object.assign(baseQuery, { current_stage: { $in: ['offer', 'call_1', 'call_2', 'call_3', 'call_4'] } });
         }
      }
    }

    // Exclude offers where lead is "out" status or inactive
    const excludedLeadIds = await getExcludedLeadIds();
    if (excludedLeadIds.length > 0) {
      baseQuery.lead_id = { $nin: excludedLeadIds };
    }

    const trimmedSortBy = typeof sortBy === 'string' ? sortBy.trim() : 'createdAt';
    const isInterestMonthSort = isInterestMonthSortKey(sortBy);
    const needsPopulatedSort = needsOfferPopulatedInMemorySort(trimmedSortBy);

    const sortDir = isAscendingOrder(sortOrder) ? 1 : -1;
    const mongoField = OFFER_MONGO_ROOT_SORT_FIELDS[trimmedSortBy] || trimmedSortBy;

    // Calculate Pagination
    const skip = (page - 1) * limit;

    let offers, total;

    if (isInterestMonthSort || needsPopulatedSort) {
      const [totalCount, allOffers] = await Promise.all([
        Offer.countDocuments(baseQuery),
        DocumentManager.populateOfferQuery(Offer.find(baseQuery)).lean({ virtuals: true }),
      ]);

      let sortedOffers;
      if (isInterestMonthSort) {
        sortedOffers = sortByInterestMonth(allOffers, sortOrder);
      } else {
        sortedOffers = sortOffersByPopulatedAlias(allOffers, trimmedSortBy, sortOrder);
      }
      total = totalCount;
      offers = sortedOffers.slice(skip, skip + limit);
    } else {
      [offers, total] = await Promise.all([
        DocumentManager.populateOfferQuery(
          Offer.find(baseQuery)
            .sort({ [mongoField]: sortDir })
            .skip(skip)
            .limit(limit)
        ).lean({ virtuals: true }),
        Offer.countDocuments(baseQuery),
      ]);
    }

    if (offers.length === 0) {
      const duration = Date.now() - startTime;
      logger.info(`getAllOffers completed in ${duration}ms (0 results)`);
      return {
        data: [],
        meta: getPaginationMeta(total, page, limit),
      };
    }

    // Populate bank providers (handle cases where provider is still an ID string)
    const offersWithProviders = await populateBankProviders(offers);
    
    // Populate documents
    // Note: In V2, documents are nested in `progression` but main offer files are still in `files`
    // The parallel helper handles standard offer files.
    // For nested files in progression, the frontend might access them differently or we might need to map them.
    // For now, we populate standard offer documents.
    const offersWithDocs = await populateOffersDocumentsParallel(offersWithProviders, DocumentManager);

    // Populate document_slots (documents and emails per slot)
    const offersWithDocumentSlots = await DocumentManager.populateDocumentSlotsForOffers(offersWithDocs);

    // Fetch todo counts for all leads (active and not done)
    const leadIds = offersWithDocumentSlots
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

    // Fetch color_codes for all agents to ensure they're always available
    const agentColorCodeMap = await fetchAgentColorCodes(offersWithDocumentSlots);

    // Add todoCount to each offer and ensure offer_calls is in lead_id with default 0
    // Also apply lead masking based on user's unmask and view_type properties
    const offersWithTodoCounts = offersWithDocumentSlots.map(offer => {
      const leadId = offer.lead_id?._id?.toString() || offer.lead_id?.toString();
      const todoCount = leadId ? (todoCountMap.get(leadId) || 0) : 0;
      // Explicitly exclude offer_calls from the offer object (top level)
      const { offer_calls, ...offerWithoutCalls } = offer;
      
      // Ensure offer_calls is always present in lead_id with default 0
      let leadIdWithOfferCalls = offerWithoutCalls.lead_id ? {
        ...offerWithoutCalls.lead_id,
        offer_calls: offerWithoutCalls.lead_id.offer_calls !== undefined && offerWithoutCalls.lead_id.offer_calls !== null 
          ? offerWithoutCalls.lead_id.offer_calls 
          : 0
      } : offerWithoutCalls.lead_id;
      
      // Apply lead masking (isDetailApi = false for list API)
      if (leadIdWithOfferCalls) {
        leadIdWithOfferCalls = applyLeadMasking(leadIdWithOfferCalls, user, false);
      }
      
      // Ensure agent_id has color_code field - fetch from map if not in populated data
      let agentIdWithColorCode = offerWithoutCalls.agent_id;
      if (agentIdWithColorCode) {
        const agentId = agentIdWithColorCode._id?.toString() || agentIdWithColorCode.toString();
        // Use color_code from map if available, otherwise use the one from populate, or null
        const colorCode = agentColorCodeMap.has(agentId) 
          ? agentColorCodeMap.get(agentId)
          : (agentIdWithColorCode.color_code || null);
        
        agentIdWithColorCode = {
          ...agentIdWithColorCode,
          color_code: colorCode
        };
      }
      
      return {
        ...offerWithoutCalls,
        lead_id: leadIdWithOfferCalls,
        agent_id: agentIdWithColorCode,
        todoCount: todoCount,
      };
    });

    // Apply Netto Calculations
    applyNettoCalculations(offersWithTodoCounts, has_progress, user, calculateNettoAmounts);

    const duration = Date.now() - startTime;
    logger.info(`getAllOffers completed in ${duration}ms (${offersWithTodoCounts.length} results)`);

    return {
      data: formatOfferInvestmentVolume(offersWithTodoCounts),
      meta: getPaginationMeta(total, page, limit),
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`Error in getAllOffers after ${duration}ms:`, error);
    throw error;
  }
};

/**
 * Optimized getOffersWithProgress function
 * Uses direct queries on 'current_stage' instead of aggregation
 */
const getOffersWithProgress = async (query, user, hasPermissionFn, permissions) => {
  try {
    const normalizedQuery = normalizeQuery(query);

    const {
      page,
      limit,
      search,
      stage,
      has_progress,
      sortBy: requestedSortBy,
      sortOrder = 'desc',
      ...filters
    } = normalizedQuery;

    // Determine default sort field based on has_progress stage
    // Sort by the stage's completed_at date instead of updatedAt for better UX
    const getDefaultSortField = (progressStage) => {
      const stageToSortField = {
        opening: 'progression.opening.completed_at',
        confirmation: 'progression.confirmation.completed_at',
        payment: 'progression.payment.completed_at',
        netto1: 'progression.netto1.completed_at',
        netto2: 'progression.netto2.completed_at',
        netto: 'progression.netto1.completed_at', // For 'netto' filter, use netto1's date
        lost: 'progression.lost.marked_at',
      };
      return stageToSortField[progressStage] || 'updatedAt';
    };

    // Use requested sortBy if provided, otherwise use stage-specific default
    const sortBy = requestedSortBy || getDefaultSortField(has_progress);

    logger.debug('Processing V2 optimized offers with progress request', {
      userId: user._id,
      role: user.role,
      filters: { ...filters, search: search ? 'provided' : 'none', stage, has_progress },
      sortBy,
      sortOrder,
    });

    // Special case: return grouped results for all progress buckets when has_progress === 'all_grouped'
    // For has_progress === 'all', return a flat list using PROGRESS_FILTERS.all
    if (has_progress === 'all_grouped') {
      const buckets = ['opening', 'confirmation', 'payment', 'netto1', 'netto2', 'netto', 'lost'];
      const reqPage = Number(page) || 1;
      const reqLimit = Number(limit) || MAX_LIMIT;

      const bucketPromises = buckets.map((bucket) => {
        const bucketQuery = {
          ...query,
          has_progress: bucket,
          page: reqPage,
          limit: reqLimit,
        };
        return getOffersWithProgress(bucketQuery, user, hasPermissionFn, permissions)
          .then((res) => ({ bucket, result: res }))
          .catch((error) => ({ bucket, error }));
      });

      const bucketResults = await Promise.all(bucketPromises);

      const grouped = {};
      for (const br of bucketResults) {
        if (br.error) {
          logger.error(`Error fetching progress bucket ${br.bucket}:`, br.error);
          grouped[br.bucket] = {
            title: br.bucket,
            data: [],
            meta: { total: 0, page: reqPage, limit: reqLimit, pages: 0 },
          };
          continue;
        }

        const r = br.result || { data: [], meta: {} };
        const total = r.meta?.total || 0;
        const pages = reqLimit > 0 ? Math.ceil(total / reqLimit) : 0;

        grouped[br.bucket] = {
          title: br.bucket,
          data: r.data || [],
          meta: {
            total,
            page: reqPage,
            limit: reqLimit,
            pages,
          },
        };
      }

      // Fetch color_codes for all agents across all buckets
      const allOffersInBuckets = Object.values(grouped)
        .flatMap(bucket => bucket.data || [])
        .filter(Boolean);
      const agentColorCodeMap = await fetchAgentColorCodes(allOffersInBuckets);

      // Add revert options and apply lead masking
      for (const bucketKey in grouped) {
        const bucket = grouped[bucketKey];
        if (bucket.data && Array.isArray(bucket.data)) {
          const offersWithRevertOptions = await Promise.all(
            bucket.data.map(async (offer) => {
              try {
                let processedOffer = { ...offer };
                
                // Apply lead masking (isDetailApi = false for list API)
                if (processedOffer.lead_id) {
                  processedOffer.lead_id = applyLeadMasking(processedOffer.lead_id, user, false);
                }
                
                // Ensure agent_id has color_code field
                let agentIdWithColorCode = processedOffer.agent_id;
                if (agentIdWithColorCode) {
                  const agentId = agentIdWithColorCode._id?.toString() || agentIdWithColorCode.toString();
                  const colorCode = agentColorCodeMap.has(agentId) 
                    ? agentColorCodeMap.get(agentId)
                    : (agentIdWithColorCode.color_code || null);
                  
                  agentIdWithColorCode = {
                    ...agentIdWithColorCode,
                    color_code: colorCode
                  };
                }
                processedOffer.agent_id = agentIdWithColorCode;
                
                if (offer._id) {
                  const revertOptionsResult = await getRevertOptions(
                    offer._id,
                    user,
                    hasPermissionFn,
                    permissions
                  );
                  processedOffer = {
                    ...processedOffer,
                    availableReverts: (revertOptionsResult.availableReverts || []).map(o => o.stage),
                  };
                }
                return processedOffer;
              } catch (error) {
                return { ...offer, availableReverts: [] };
              }
            })
          );
          bucket.data = offersWithRevertOptions;
        }
      }

      return { title: 'All Progress', data: grouped };
    }

    // STANDARD SINGLE BUCKET QUERY (including 'all' which uses PROGRESS_FILTERS.all)
    const permissionFilter = await PermissionManager.getPermissionFilter(
      user,
      hasPermissionFn,
      permissions
    );

    const baseQuery = await OfferQueryBuilder.buildBaseMatch(
      { ...filters, user },
      permissionFilter,
      hasPermissionFn,
      permissions
    );

    // Add search filter if present (searches offer fields AND lead contact_name/phone/email)
    if (search) {
      const sanitizedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = { $regex: sanitizedSearch, $options: 'i' };

      // Check if search term is a valid MongoDB ObjectId
      const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(search);

      // Build lead search conditions
      const leadSearchConditions = [
        { contact_name: searchRegex },
        { phone: searchRegex },
        { email_from: searchRegex },
        { lead_source_no: searchRegex },
      ];

      // Add _id search if valid ObjectId (for lead _id)
      if (isValidObjectId) {
        leadSearchConditions.push({ _id: search });
        logger.info(`getOffersWithProgress: Valid ObjectId detected for lead search, adding _id search for "${search}"`);
      }

      // Find leads matching the search term
      const matchingLeads = await Lead.find({
        $or: leadSearchConditions,
        active: true,
      }).select('_id').lean();

      const matchingLeadIds = matchingLeads.map(l => l._id);

      // Build combined search: offer fields OR matching lead IDs
      const offerSearchConditions = [
        { title: searchRegex },
        { nametitle: searchRegex },
        { reference_no: searchRegex },
        ...(matchingLeadIds.length > 0 ? [{ lead_id: { $in: matchingLeadIds } }] : []),
      ];

      // Add offer _id search if valid ObjectId
      if (isValidObjectId) {
        offerSearchConditions.push({ _id: search });
        logger.info(`getOffersWithProgress: Valid ObjectId detected for offer search, adding _id search for "${search}"`);
      }

      baseQuery.$or = offerSearchConditions;
    }

    if (stage) {
      baseQuery.current_stage = stage;
    }

    // Apply Progress Filter (V2)
    if (has_progress && has_progress !== 'any') {
      if (PROGRESS_FILTERS[has_progress]) {
        Object.assign(baseQuery, PROGRESS_FILTERS[has_progress]);
      }
    } else if (has_progress === 'any') {
      // 'any' means anything EXCEPT 'offer'
      baseQuery.current_stage = { $ne: 'offer' };
    }

    // Exclude offers where lead is "out" status or inactive
    const excludedLeadIds = await getExcludedLeadIds();
    if (excludedLeadIds.length > 0) {
      baseQuery.lead_id = { $nin: excludedLeadIds };
    }

    const skip = (page - 1) * limit;

    const trimmedSortBy = typeof sortBy === 'string' ? sortBy.trim() : 'createdAt';
    const isInterestMonthSort = isInterestMonthSortKey(sortBy);
    const needsPopulatedSort = needsOfferPopulatedInMemorySort(trimmedSortBy);
    const sortDir = isAscendingOrder(sortOrder) ? 1 : -1;
    const mongoField =
      Object.prototype.hasOwnProperty.call(OFFER_MONGO_ROOT_SORT_FIELDS, trimmedSortBy)
        ? OFFER_MONGO_ROOT_SORT_FIELDS[trimmedSortBy]
        : sortBy;

    let offers;
    let total;

    if (isInterestMonthSort || needsPopulatedSort) {
      const [totalCount, allOffers] = await Promise.all([
        Offer.countDocuments(baseQuery),
        DocumentManager.populateOfferQuery(Offer.find(baseQuery)).lean({ virtuals: true }),
      ]);
      let sortedOffers;
      if (isInterestMonthSort) {
        sortedOffers = sortByInterestMonth(allOffers, sortOrder);
      } else {
        sortedOffers = sortOffersByPopulatedAlias(allOffers, trimmedSortBy, sortOrder);
      }
      total = totalCount;
      offers = sortedOffers.slice(skip, skip + limit);
    } else {
      [offers, total] = await Promise.all([
        DocumentManager.populateOfferQuery(
          Offer.find(baseQuery)
            .sort({ [mongoField]: sortDir })
            .skip(skip)
            .limit(limit)
        ).lean({ virtuals: true }),
        Offer.countDocuments(baseQuery),
      ]);
    }

    if (offers.length === 0) {
      return {
        data: [],
        meta: getPaginationMeta(total, page, limit),
      };
    }

    // Populate bank providers (handle cases where provider is still an ID string)
    const offersWithProviders = await populateBankProviders(offers);
    
    // Populate documents
    const offersWithDocuments = await populateOffersDocumentsParallel(offersWithProviders, DocumentManager);

    // Apply Netto Calculations
    // In V2, we might not need the loop in parallelHelper, but applyNettoCalculations
    // is still useful for RBAC math
    applyNettoCalculations(offersWithDocuments, has_progress, user, calculateNettoAmounts);

    // Fetch color_codes for all agents to ensure they're always available
    const agentColorCodeMap = await fetchAgentColorCodes(offersWithDocuments);

    // Apply lead masking to lead_id objects (isDetailApi = false for list API)
    const offersWithMaskedLeads = offersWithDocuments.map(offer => {
      let processedOffer = { ...offer };
      
      if (offer.lead_id) {
        processedOffer.lead_id = applyLeadMasking(offer.lead_id, user, false);
      }
      
      // Ensure agent_id has color_code field - fetch from map if not in populated data
      let agentIdWithColorCode = offer.agent_id;
      if (agentIdWithColorCode) {
        const agentId = agentIdWithColorCode._id?.toString() || agentIdWithColorCode.toString();
        // Use color_code from map if available, otherwise use the one from populate, or null
        const colorCode = agentColorCodeMap.has(agentId) 
          ? agentColorCodeMap.get(agentId)
          : (agentIdWithColorCode.color_code || null);
        
        agentIdWithColorCode = {
          ...agentIdWithColorCode,
          color_code: colorCode
        };
      }
      
      return {
        ...processedOffer,
        agent_id: agentIdWithColorCode,
      };
    });

    return {
      data: formatOfferInvestmentVolume(offersWithMaskedLeads),
      meta: getPaginationMeta(total, page, limit),
    };
  } catch (error) {
    logger.error('Error in getOffersWithProgress:', error);
    throw error;
  }
};

/**
 * Get offers by lead ID - Optimized
 */
const getOffersByLeadId = async (leadId, user, hasPermissionFn, permissions, query = {}) => {
  const startTime = Date.now();

  try {
    if (!validateObjectId(leadId)) {
      throw new Error('Invalid lead ID format');
    }

    const { sortBy = 'createdAt', sortOrder = 'desc' } = query;
    // V2: Sorting is just standard Mongoose sort now
    const sortParams = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const permissionFilter = await PermissionManager.getPermissionFilter(
      user,
      hasPermissionFn,
      permissions
    );

    const finalQuery = {
      lead_id: leadId,
      active: true,
      ...permissionFilter,
    };

    // OPTIMIZATION: Single query with all populations
    const offers = await DocumentManager.populateOfferQuery(
      Offer.find(finalQuery).sort(sortParams)
    ).lean({ virtuals: true });

    if (offers.length === 0) {
      const duration = Date.now() - startTime;
      logger.info(`getOffersByLeadId completed in ${duration}ms (0 results)`);
      return formatOfferInvestmentVolume(offers);
    }

    // Populate bank providers (handle cases where provider is still an ID string)
    const offersWithProviders = await populateBankProviders(offers);

    // Documents
    const offersWithDocuments = await populateOffersDocumentsParallel(
      offersWithProviders,
      DocumentManager
    );

    // Apply lead masking to lead_id objects (isDetailApi = false for list API)
    const offersWithMaskedLeads = offersWithDocuments.map(offer => {
      let processedOffer = { ...offer };
      
      if (offer.lead_id) {
        processedOffer.lead_id = applyLeadMasking(offer.lead_id, user, false);
      }
      
      // Ensure agent_id has color_code field (even if null/undefined in DB)
      if (offer.agent_id) {
        processedOffer.agent_id = {
          ...offer.agent_id,
          color_code: offer.agent_id.color_code || null
        };
      }
      
      return processedOffer;
    });

    const duration = Date.now() - startTime;
    logger.info(`getOffersByLeadId completed in ${duration}ms (${offersWithMaskedLeads.length} results)`);

    return formatOfferInvestmentVolume(offersWithMaskedLeads);
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`Error in getOffersByLeadId after ${duration}ms:`, error);
    throw error;
  }
};

/**
 * Get offers by project ID - Optimized
 */
const getOffersByProjectId = async (projectId, user, hasPermissionFn, permissions, query = {}) => {
  const startTime = Date.now();

  try {
    if (!validateObjectId(projectId)) {
      throw new Error('Invalid project ID format');
    }

    const { sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const sortParams = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const permissionFilter = await PermissionManager.getPermissionFilter(
      user,
      hasPermissionFn,
      permissions
    );

    const finalQuery = {
      project_id: projectId,
      active: true,
      ...permissionFilter,
    };

    const offers = await DocumentManager.populateOfferQuery(
      Offer.find(finalQuery).sort(sortParams)
    ).lean({ virtuals: true });

    if (offers.length === 0) {
      const duration = Date.now() - startTime;
      logger.info(`getOffersByProjectId completed in ${duration}ms (0 results)`);
      return formatOfferInvestmentVolume(offers);
    }

    const offersWithDocuments = await populateOffersDocumentsParallel(
      offers,
      DocumentManager
    );

    // Apply lead masking to lead_id objects (isDetailApi = false for list API)
    const offersWithMaskedLeads = offersWithDocuments.map(offer => {
      let processedOffer = { ...offer };
      
      if (offer.lead_id) {
        processedOffer.lead_id = applyLeadMasking(offer.lead_id, user, false);
      }
      
      // Ensure agent_id has color_code field (even if null/undefined in DB)
      if (offer.agent_id) {
        processedOffer.agent_id = {
          ...offer.agent_id,
          color_code: offer.agent_id.color_code || null
        };
      }
      
      return processedOffer;
    });

    const duration = Date.now() - startTime;
    logger.info(`getOffersByProjectId completed in ${duration}ms (${offersWithMaskedLeads.length} results)`);

    return formatOfferInvestmentVolume(offersWithMaskedLeads);
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`Error in getOffersByProjectId after ${duration}ms:`, error);
    throw error;
  }
};

/**
 * Get single offer with progress by ID
 * Returns the same structure as getOffersWithProgress but for a single offer
 */
const getOfferWithProgressById = async (offerId, user, hasPermissionFn, permissions) => {
  const startTime = Date.now();

  try {
    if (!validateObjectId(offerId)) {
      throw new NotFoundError('Invalid offer ID format');
    }

    logger.debug('Processing getOfferWithProgressById request', {
      userId: user._id,
      role: user.role,
      offerId,
    });

    // First, fetch the offer without permission filtering (to check if it exists)
    const offer = await DocumentManager.populateOfferQuery(
      Offer.findOne({ _id: offerId, active: true })
    ).lean({ virtuals: true });

    if (!offer) {
      throw new NotFoundError('Offer not found or has been deleted');
    }

    // Check if lead is excluded (status "out" or inactive)
    const excludedLeadIds = await getExcludedLeadIds();
    const leadId = offer.lead_id?._id || offer.lead_id;
    if (leadId && excludedLeadIds.some(id => id.toString() === leadId.toString())) {
      throw new NotFoundError('Offer not found');
    }

    // Check permissions (this will throw AuthorizationError if user doesn't have access)
    await PermissionManager.getPermissionFilter(user, hasPermissionFn, permissions, offer);

    // Populate bank providers (handle cases where provider is still an ID string)
    const [offerWithProvider] = await populateBankProviders([offer]);
    
    // Populate documents
    const [offerWithDocuments] = await populateOffersDocumentsParallel([offerWithProvider], DocumentManager);

    // Apply Netto Calculations (if needed)
    applyNettoCalculations([offerWithDocuments], null, user, calculateNettoAmounts);

    // Fetch color_codes for agent to ensure it's always available
    const agentColorCodeMap = await fetchAgentColorCodes([offerWithDocuments]);

    // Apply lead masking to lead_id object (isDetailApi = true for detail API)
    let processedOffer = { ...offerWithDocuments };
    
    if (processedOffer.lead_id) {
      processedOffer.lead_id = applyLeadMasking(processedOffer.lead_id, user, true);
    }
    
    // Ensure agent_id has color_code field - fetch from map if not in populated data
    let agentIdWithColorCode = processedOffer.agent_id;
    if (agentIdWithColorCode) {
      const agentId = agentIdWithColorCode._id?.toString() || agentIdWithColorCode.toString();
      // Use color_code from map if available, otherwise use the one from populate, or null
      const colorCode = agentColorCodeMap.has(agentId) 
        ? agentColorCodeMap.get(agentId)
        : (agentIdWithColorCode.color_code || null);
      
      agentIdWithColorCode = {
        ...agentIdWithColorCode,
        color_code: colorCode
      };
    }
    
    processedOffer = {
      ...processedOffer,
      agent_id: agentIdWithColorCode,
    };

    // Get todo count for the lead
    let todoCount = 0;
    if (processedOffer.lead_id?._id) {
      const leadId = processedOffer.lead_id._id;
      const todoCountResult = await Todo.countDocuments({
        lead_id: leadId,
        active: true,
        isDone: false,
      });
      todoCount = todoCountResult || 0;
    }

    // Add todoCount to the offer
    processedOffer.todoCount = todoCount;

    const duration = Date.now() - startTime;
    logger.info(`getOfferWithProgressById completed in ${duration}ms`);

    return formatOfferInvestmentVolume(processedOffer);
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`Error in getOfferWithProgressById after ${duration}ms:`, error);
    throw error;
  }
};

module.exports = {
  getAllOffers,
  getOffersWithProgress,
  getOffersByLeadId,
  getOffersByProjectId,
  getOfferWithProgressById,
};
