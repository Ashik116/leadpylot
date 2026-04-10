/**
 * Universal Query Middleware for Lead-Offers-Service
 * 
 * Adds filtering and grouping capabilities via query parameters
 * 
 * Usage:
 * GET /leads?domain=[["status","=","new"]]
 * GET /offers?groupBy=["status"]
 * 
 * Bulk Search + GroupBy Integration:
 * 1. POST /leads/bulk-search with values (phones, emails, partner IDs)
 * 2. Extract leadIds from response.meta.leadIds
 * 3. GET /leads?groupBy=["user_id"]&domain=[["_id","in",leadIds]]&page=1&limit=80
 * 
 * The domain parameter supports filtering by _id with "in" operator:
 * - domain=[["_id","in",[id1,id2,id3,...]]] filters to only those lead IDs
 * - Works seamlessly with groupBy to group filtered results
 * 
 * @module middleware/universalQuery
 */

const axios = require('axios');
const crypto = require('crypto');
const mongoose = require('mongoose');
const logger = require('../utils/logger');
const { 
  fetchLeadRelatedData, 
  createLookupMaps, 
  processLeadsWithRelatedData,
  hydrateLeadReferences,
  applyLeadMasking,
  resolveValuesToLeadIds,
  maskEmail,
  maskPhone,
  shouldMaskLeadData
} = require('../services/leadService/queries');
const { normalizePagination } = require('../services/leadService/utils');
const { OFFER_POPULATE_CONFIG } = require('../config/constants');
const DocumentManager = require('../services/offerService/documents/DocumentManager');
const { populateBankProviders } = require('../services/offerService/utils/parallelHelper');
const Lead = require('../models/Lead');
const Todo = require('../models/Todo');
const Offer = require('../models/Offer');
const Opening = require('../models/Opening');
const Confirmation = require('../models/Confirmation');
const PaymentVoucher = require('../models/PaymentVoucher');
const Appointment = require('../models/Appointment');
const Reclamation = require('../models/Reclamation');
const ClosedLead = require('../models/ClosedLead');
const Source = require('../models/Source');
const { enrichClosedLeadsWithCurrentStatus, attachClosedLeadSourceAliases } = require('../utils/closedLeadCurrentStatus');

/**
 * Parse JSON array from query params (domain / groupBy).
 * Express may pass a string; proxies or clients may double-encode. A failed parse
 * must not fall through to the list route (which looks like "groupBy ignored").
 */
function parseJsonArrayQueryParam(raw, paramName) {
  if (raw === undefined || raw === null || raw === '') return [];
  const str = Array.isArray(raw) ? raw.length === 1 ? raw[0] : raw.join('') : String(raw);
  if (!str.trim()) return [];
  try {
    const v = JSON.parse(str);
    return Array.isArray(v) ? v : [];
  } catch {
    try {
      const v = JSON.parse(decodeURIComponent(str));
      return Array.isArray(v) ? v : [];
    } catch {
      logger.error(`Invalid ${paramName} JSON (expected array)`, { preview: str.slice(0, 200) });
      throw new Error(`INVALID_QUERY_PARAM:${paramName}`);
    }
  }
}
const AssignLeads = require('../models/AssignLeads');
const User = require('../models/User');
const Team = require('../models/Team');
const PermissionManager = require('../services/offerService/permissions/PermissionManager');
const { hasPermission } = require('../middleware/authorize');
const { PERMISSIONS } = require('../middleware/roles/permissions');

/**
 * Get lead IDs that should be excluded from offer queries for agents
 * Excludes leads with status "out" (case insensitive) OR inactive leads
 * @returns {Promise<Array>} Array of lead IDs to exclude
 */
const getInactiveLeadIds = async () => {
  try {
    const inactiveLeads = await Lead.find({
      $or: [
        { status: { $regex: /^out$/i } },
        { active: false }
      ]
    }).select('_id').lean();
    return inactiveLeads.map(lead => lead._id);
  } catch (error) {
    logger.error('Error fetching inactive lead IDs:', error.message);
    return [];
  }
};

// Search service URL
const SEARCH_SERVICE_URL = process.env.SEARCH_SERVICE_URL || 'http://search-service:3010';

/**
 * Fetch color_code for agents from User model
 * This ensures color_code is always fetched correctly even if populate doesn't work
 * @param {Array} offers - Array of offers with agent_id
 * @returns {Promise<Map>} - Map of agent_id to color_code
 */
async function fetchAgentColorCodes(offers) {
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
}

/**
 * Population configuration for each model
 * This ensures filtered queries return the same structure as baseline queries
 */
const MODEL_POPULATION_CONFIG = {
  Offer: [
    {
      path: 'lead_id',
      select: 'lead_source_no contact_name email_from phone source_id stage status offer_calls expected_revenue',
      populate: {
        path: 'source_id',
        select: 'name price active color'
      }
    },
    { path: 'project_id', select: 'name color_code' },
    { path: 'agent_id', select: '_id login role color_code' },
    { path: 'created_by', select: 'login' },
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
    { path: 'payment_terms', select: 'name info' },
    { path: 'bonus_amount', select: 'name info' }
  ],
  Opening: [
    {
      path: 'lead_id',
      select: 'lead_source_no contact_name email_from phone source_id stage status',
      populate: {
        path: 'source_id',
        select: 'name price active color'
      }
    },
    { path: 'project_id', select: 'name color_code' },
    { path: 'agent_id', select: '_id login role color_code' },
    { path: 'created_by', select: 'login' },
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
    { path: 'offer_id', select: 'title reference_no investment_volume interest_rate' }
  ],
  Confirmation: [
    {
      path: 'lead_id',
      select: 'lead_source_no contact_name email_from phone source_id stage status',
      populate: {
        path: 'source_id',
        select: 'name price active color'
      }
    },
    { path: 'project_id', select: 'name color_code' },
    { path: 'agent_id', select: '_id login role color_code' },
    { path: 'created_by', select: 'login' },
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
    { path: 'offer_id', select: 'title reference_no investment_volume interest_rate' },
    { path: 'opening_id', select: 'reference_no' }
  ],
  PaymentVoucher: [
    {
      path: 'lead_id',
      select: 'lead_source_no contact_name email_from phone source_id stage status',
      populate: {
        path: 'source_id',
        select: 'name price active color'
      }
    },
    { path: 'project_id', select: 'name color_code' },
    { path: 'agent_id', select: '_id login role color_code' },
    { path: 'created_by', select: 'login' },
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
    { path: 'offer_id', select: 'title reference_no investment_volume interest_rate' }
  ],
  Appointment: [
    {
      path: 'lead_id',
      select: 'lead_source_no contact_name email_from phone source_id stage status'
    },
    { path: 'project_id', select: 'name color_code' },
    { path: 'agent_id', select: '_id login role color_code' },
    { path: 'created_by', select: 'login' }
  ],
  Todo: [
    { path: 'lead_id', select: 'lead_source_no contact_name' },
    { path: 'user_id', select: 'login role' },
    { path: 'created_by', select: 'login' }
  ],
  Reclamation: [
    {
      path: 'lead_id',
      select: 'lead_source_no contact_name email_from phone lead_date source_id stage status',
      populate: {
        path: 'source_id',
        select: 'name price active color'
      }
    },
    { path: 'agent_id', select: '_id login role name email color_code' },
    { path: 'project_id', model: 'Team', select: 'name color_code' }
  ],
  ClosedLead: [
    { path: 'team_id', select: '_id name' },
    { path: 'user_id', select: '_id login role' },
    { path: 'source_id', select: '_id name price active color' },
    { path: 'closed_project_id', select: '_id name' },
    { path: 'closed_by_user_id', select: '_id login' },
    { path: 'prev_team_id', select: '_id name' },
    { path: 'prev_user_id', select: '_id login' },
    { path: 'source_user_id', select: '_id login role' },
    { path: 'source_team_id', select: '_id name' }
  ]
};

/**
 * Get model class by name
 */
const MODEL_CLASSES = {
  Lead,
  Offer,
  Opening,
  Confirmation,
  PaymentVoucher,
  Appointment,
  Todo,
  Reclamation,
  ClosedLead
};

/**
 * Populate results for a given model using the same population as regular routes
 * @param {string} modelName - Name of the model
 * @param {Array} ids - Array of document IDs to fetch with population
 * @returns {Array} - Populated documents
 */
async function populateModelResults(modelName, ids) {
  const ModelClass = MODEL_CLASSES[modelName];
  const populationConfig = MODEL_POPULATION_CONFIG[modelName];
  
  if (!ModelClass || !populationConfig) {
    logger.debug(`No population config for model: ${modelName}`);
    return null; // Return null to indicate no population needed
  }
  
  try {
    let query = ModelClass.find({ _id: { $in: ids } });
    
    // Apply all population configurations
    for (const config of populationConfig) {
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
    }
    
    const populated = await query.lean();
    
    // Post-process to ensure provider is null if not populated
    populated.forEach(doc => {
      if (doc.bank_id && doc.bank_id.provider === undefined) {
        doc.bank_id.provider = null;
      }
    });
    
    // Create a map for quick lookup and preserve original order
    const populatedMap = new Map();
    populated.forEach(doc => {
      populatedMap.set(doc._id.toString(), doc);
    });
    
    // Return in original order
    return ids.map(id => populatedMap.get(id.toString())).filter(Boolean);
  } catch (error) {
    logger.error(`Error populating ${modelName}:`, error.message);
    return null;
  }
}

/**
 * Route to model name mapping
 */
const ROUTE_MODEL_MAP = {
  '/closed-leads': 'ClosedLead',
  '/leads': 'Lead',
  '/offers': 'Offer',
  '/openings': 'Opening',
  '/todos': 'Todo',
  '/appointments': 'Appointment',
  '/confirmations': 'Confirmation',
  '/payment-vouchers': 'PaymentVoucher',
  '/reclamations': 'Reclamation'
};

/**
 * Predefined filter parameters for each model
 * Maps query parameter names to field names and operators
 */
const PREDEFINED_FILTERS = {
  Lead: {
    leadIds: { field: '_id', operator: 'in' }, // Filter by lead IDs (from bulk-search) - uses $in query
    values: { field: '_id', operator: 'in' }, // Bulk-search values (partner IDs, emails, phones) - resolves to leadIds
    status: { field: 'status', operator: '=' },
    stage: { field: 'stage', operator: '=' },
    status_id: { field: 'status_id', operator: '=' },
    stage_id: { field: 'stage_id', operator: '=' },
    project_id: { field: 'team_id', operator: '=' },
    team_id: { field: 'team_id', operator: '=' },
    agent_id: { field: 'user_id', operator: '=' },
    user_id: { field: 'user_id', operator: '=' },
    source_id: { field: 'source_id', operator: '=' },
    source: { field: 'source_id', operator: '=', lookup: 'source' }, // Special: lookup source by name
    // 'search' is handled specially below - searches contact_name, email_from, phone, lead_source_no (partner_id)
    search: { field: '_search', operator: 'search', searchFields: ['contact_name', 'email_from', 'phone', 'lead_source_no', 'notes', 'tags'] },
    active: { field: 'active', operator: '=', transform: v => v === 'true' || v === true },
    checked: { field: 'checked', operator: '=', transform: v => v === 'true' || v === true },
    has_offer: { field: 'has_offer', operator: '=', transform: v => v === 'true' || v === true },
    has_opening: { field: 'has_opening', operator: '=', transform: v => v === 'true' || v === true },
    has_confirmation: { field: 'has_confirmation', operator: '=', transform: v => v === 'true' || v === true },
    has_payment: { field: 'has_payment', operator: '=', transform: v => v === 'true' || v === true },
    has_netto: { field: 'has_netto', operator: '=', transform: v => v === 'true' || v === true },
    has_lost: { field: 'has_lost', operator: '=', transform: v => v === 'true' || v === true },
    duplicate_status: { field: 'duplicate_status', operator: '=' },
  },
  Offer: {
    status: { field: 'status', operator: '=' },
    project_id: { field: 'project_id', operator: '=' },
    agent_id: { field: 'agent_id', operator: '=' },
    lead_id: { field: 'lead_id', operator: '=' },
    bank_id: { field: 'bank_id', operator: '=' },
    current_stage: { field: 'current_stage', operator: '=' },
    // out=true -> current_stage='out', out=false -> current_stage != 'out' (for grouping "current stage out" view)
    out: { field: 'current_stage', operator: '=' },
    // has_progress maps to current_stage for progression filtering
    // e.g., has_progress=opening -> current_stage = 'opening'
    has_progress: { field: 'current_stage', operator: '=' },
    active: { field: 'active', operator: '=', transform: v => v === 'true' || v === true },
    // 'search' is handled specially - searches title, reference_no, and related lead fields (contact_name, phone, email_from, lead_source_no)
    search: { field: '_search', operator: 'search', searchFields: ['title', 'nametitle', 'reference_no'], relatedLeadSearch: true },
  },
  Opening: {
    status: { field: 'status', operator: '=' },
    offer_id: { field: 'offer_id', operator: '=' },
    agent_id: { field: 'agent_id', operator: '=' },
    active: { field: 'active', operator: '=', transform: v => v === 'true' || v === true },
  },
  Confirmation: {
    status: { field: 'status', operator: '=' },
    offer_id: { field: 'offer_id', operator: '=' },
    opening_id: { field: 'opening_id', operator: '=' },
    agent_id: { field: 'agent_id', operator: '=' },
    active: { field: 'active', operator: '=', transform: v => v === 'true' || v === true },
  },
  PaymentVoucher: {
    status: { field: 'status', operator: '=' },
    offer_id: { field: 'offer_id', operator: '=' },
    agent_id: { field: 'agent_id', operator: '=' },
    active: { field: 'active', operator: '=', transform: v => v === 'true' || v === true },
  },
  Todo: {
    lead_id: { field: 'lead_id', operator: '=' },
    user_id: { field: 'user_id', operator: '=' },
    isDone: { field: 'isDone', operator: '=', transform: v => v === 'true' || v === true },
    active: { field: 'active', operator: '=', transform: v => v === 'true' || v === true },
    priority: { field: 'priority', operator: '=' },
  },
  Appointment: {
    lead_id: { field: 'lead_id', operator: '=' },
    agent_id: { field: 'agent_id', operator: '=' },
    status: { field: 'status', operator: '=' },
    active: { field: 'active', operator: '=', transform: v => v === 'true' || v === true },
  },
  Reclamation: {
    status: { field: 'status', operator: '=' },
    lead_id: { field: 'lead_id', operator: '=' },
    agent_id: { field: 'agent_id', operator: '=' },
    project_id: { field: 'project_id', operator: '=' },
    search: { field: '_search', operator: 'search', searchFields: ['reason', 'response'] },
  },
  ClosedLead: {
    status: { field: 'status', operator: '=' },
    stage: { field: 'stage', operator: '=' },
    closed_project_id: { field: 'closed_project_id', operator: '=' },
    team_id: { field: 'team_id', operator: '=' },
    project_id: { field: 'team_id', operator: '=' },
    user_id: { field: 'user_id', operator: '=' },
    agent_id: { field: 'user_id', operator: '=' },
    source_id: { field: 'source_id', operator: '=' },
    closed_by_user_id: { field: 'closed_by_user_id', operator: '=' },
    closeLeadStatus: { field: 'closeLeadStatus', operator: '=' },
    is_reverted: { field: 'is_reverted', operator: '=', transform: v => v === 'true' || v === true },
    use_status: { field: 'use_status', operator: '=' },
    duplicate_status: { field: 'duplicate_status', operator: '=' },
    search: { field: '_search', operator: 'search', searchFields: ['contact_name', 'email_from', 'phone', 'lead_source_no'] },
    source_agent: { field: 'source_user_id', operator: '=' },
    source_project: { field: 'source_team_id', operator: '=' },
  }
};

/**
 * Convert predefined filter parameters to domain conditions
 * @param {Object} query - Request query params
 * @param {string} modelName - Model name
 * @param {Object} req - Request object (for values resolution - user, hasPermission, PERMISSIONS)
 */
async function convertPredefinedFilters(query, modelName, req) {
  const filters = PREDEFINED_FILTERS[modelName];
  if (!filters) {
    logger.info(`Universal query: No predefined filters found for model: ${modelName}`);
    return [];
  }

  const domain = [];

  logger.info(`Universal query: Processing predefined filters for ${modelName}, available params: ${Object.keys(filters).join(', ')}`);
  logger.info(`Universal query: Query params received: ${Object.keys(query).join(', ')}`);

  for (const [param, config] of Object.entries(filters)) {
    const value = query[param];
    if (value !== undefined && value !== null && value !== '') {
      let finalValue = value;
      
      // Special handling: values - bulk-search format (partner IDs, emails, phones) - resolves to leadIds
      if (param === 'values' && modelName === 'Lead' && req && req.user) {
        let vals = [];
        if (Array.isArray(value)) {
          vals = value;
        } else if (typeof value === 'string') {
          const trimmed = value.trim();
          if (trimmed.startsWith('[')) {
            try {
              vals = JSON.parse(trimmed);
            } catch (e) {
              logger.warn(`Universal query: Invalid values JSON: ${trimmed}`);
              continue;
            }
          } else {
            vals = trimmed.split(',').map(s => s.trim()).filter(Boolean);
          }
        }
        if (vals.length > 0) {
          const leadIds = await resolveValuesToLeadIds(vals, req.user, hasPermission, PERMISSIONS);
          if (leadIds.length > 0) {
            domain.push(['_id', 'in', leadIds]);
            logger.info(`Universal query: values filter resolved ${vals.length} value(s) to ${leadIds.length} lead IDs`);
          } else {
            logger.info(`Universal query: No leads found for values`);
            return [['_id', '=', null]];
          }
        }
        continue;
      }
      
      // Special handling: leadIds - filter leads by ID array (from bulk-search meta.leadIds)
      // Supports: leadIds=["id1","id2"] (JSON) or leadIds=id1,id2 (comma-separated) or leadIds=id1&leadIds=id2 (repeated)
      if (param === 'leadIds' && modelName === 'Lead') {
        let ids = [];
        if (Array.isArray(value)) {
          ids = value;
        } else if (typeof value === 'string') {
          const trimmed = value.trim();
          if (trimmed.startsWith('[')) {
            try {
              ids = JSON.parse(trimmed);
            } catch (e) {
              logger.warn(`Universal query: Invalid leadIds JSON: ${trimmed}`);
              continue;
            }
          } else {
            ids = trimmed.split(',').map(s => s.trim()).filter(Boolean);
          }
        }
        const validIds = ids.filter(id => mongoose.Types.ObjectId.isValid(id) && String(id).length === 24);
        if (validIds.length > 0) {
          const objectIds = validIds.map(id => new mongoose.Types.ObjectId(id));
          domain.push(['_id', 'in', objectIds]);
          logger.info(`Universal query: leadIds filter applied with ${objectIds.length} IDs`);
        } else {
          logger.warn(`Universal query: No valid lead IDs in leadIds param`);
          return [['_id', '=', null]];
        }
        continue;
      }
      
      // Special handling: Lookup source by name if source parameter is provided
      // Uses partial matching to find ALL sources containing the search term
      if (param === 'source' && config.lookup === 'source') {
        const sourceRegex = new RegExp(String(value).trim(), 'i');
        const matchingSources = await Source.find({ name: sourceRegex, active: true }).select('_id name').lean();
        
        if (matchingSources.length > 0) {
          // Use 'in' operator for multiple sources
          const sourceIds = matchingSources.map(s => s._id);
          domain.push([config.field, 'in', sourceIds]);
          logger.info(`Universal query: Found sources containing "${value}": ${matchingSources.map(s => s.name).join(', ')} (${sourceIds.length} sources)`);
          continue; // Skip the normal domain.push below since we already added the filter
        } else {
          logger.warn(`Universal query: No active source found containing: ${value}`);
          // Return empty domain to ensure no results
          return [['_id', '=', null]]; // This will match nothing
        }
      }
      
      // Special handling: Search operator - searches multiple fields
      if (config.operator === 'search') {
        const searchTerm = String(value).trim();
        if (!searchTerm) {
          logger.info(`Universal query: Search parameter is empty, skipping`);
          continue;
        }

        logger.info(`Universal query: Processing search operator for "${searchTerm}"`);

        // Escape special regex characters
        const sanitizedSearch = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const searchRegex = { $regex: sanitizedSearch, $options: 'i' };

        // Check if search term is a valid MongoDB ObjectId
        const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(searchTerm);
        logger.info(`Universal query: Search term "${searchTerm}" is ${isValidObjectId ? 'valid' : 'NOT valid'} ObjectId`);

        if (modelName === 'Lead') {
          // For Lead: search contact_name, email_from, phone, lead_source_no (partner_id), notes, tags, _id
          // Build the $or conditions
          const orConditions = [
            { contact_name: searchRegex },
            { email_from: searchRegex },
            { phone: searchRegex },
            { lead_source_no: searchRegex }, // partner_id
            { notes: searchRegex },
            { tags: searchRegex },
          ];

          // Add _id search if valid ObjectId
          if (isValidObjectId) {
            orConditions.push({ _id: searchTerm });
            logger.info(`Universal query: Valid ObjectId detected, adding _id search for "${searchTerm}"`);

            // Test direct _id query to verify lead exists
            const directFind = await Lead.findById(searchTerm).select('_id').lean();
            logger.info(`Universal query: Direct findById for "${searchTerm}" found: ${directFind ? 'YES' : 'NO'}`);
          }

          logger.info(`Universal query: Executing Lead search with ${orConditions.length} conditions for "${searchTerm}"`);
          logger.info(`Universal query: Query conditions: ${JSON.stringify(orConditions)}`);
          const matchingLeads = await Lead.find({
            $or: orConditions,
          }).select('_id').lean();
          logger.info(`Universal query: Lead search "${searchTerm}" returned ${matchingLeads.length} results`);

          if (matchingLeads.length > 0) {
            const leadIds = matchingLeads.map(l => l._id);
            domain.push(['_id', 'in', leadIds]);
            logger.info(`Universal query: Lead search "${searchTerm}" found ${leadIds.length} matches`);
          } else {
            logger.info(`Universal query: Lead search "${searchTerm}" found 0 matches`);
            return [['_id', '=', null]]; // Return empty result
          }
        } else if (modelName === 'Offer') {
          // For Offer: search title, nametitle, reference_no AND lead contact_name/phone/email/lead_source_no
          // When searching, only exclude inactive leads (not "out" status leads)
          // since we want to include offers with current_stage='out' in search results
          const inactiveLeadIds = await Lead.find({ active: false }).select('_id').lean();
          const inactiveLeadIdArray = inactiveLeadIds.map(l => l._id);

          // Check if search term is a valid MongoDB ObjectId
          const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(searchTerm);

          // First find matching leads (only exclude inactive, not "out" status)
          const leadSearchQuery = {
            $or: [
              { contact_name: searchRegex },
              { phone: searchRegex },
              { email_from: searchRegex },
              { lead_source_no: searchRegex }, // partner_id
            ],
            active: true,
          };

          // Add _id search if valid ObjectId (for lead _id)
          if (isValidObjectId) {
            leadSearchQuery.$or.push({ _id: searchTerm });
            logger.info(`Universal query: Valid ObjectId detected for lead search, adding _id search for "${searchTerm}"`);
          }

          if (inactiveLeadIdArray.length > 0) {
            leadSearchQuery._id = { $nin: inactiveLeadIdArray };
          }

          const matchingLeads = await Lead.find(leadSearchQuery).select('_id').lean();
          const matchingLeadIds = matchingLeads.map(l => l._id);

          // Build offer search query
          const offerSearchConditions = [
            { title: searchRegex },
            { nametitle: searchRegex },
            { reference_no: searchRegex },
          ];

          // Add lead_id filter if we found matching leads
          if (matchingLeadIds.length > 0) {
            offerSearchConditions.push({ lead_id: { $in: matchingLeadIds } });
          }

          // Add offer _id search if valid ObjectId
          if (isValidObjectId) {
            offerSearchConditions.push({ _id: searchTerm });
            logger.info(`Universal query: Valid ObjectId detected for offer search, adding _id search for "${searchTerm}"`);
          }

          // Find matching offers (exclude only inactive leads, not "out" status leads)
          const offerSearchQuery = {
            $or: offerSearchConditions,
          };

          if (inactiveLeadIdArray.length > 0) {
            offerSearchQuery.lead_id = { $nin: inactiveLeadIdArray };
          }

          const matchingOffers = await Offer.find(offerSearchQuery).select('_id').lean();

          if (matchingOffers.length > 0) {
            const offerIds = matchingOffers.map(o => o._id);
            domain.push(['_id', 'in', offerIds]);
            logger.info(`Universal query: Offer search "${searchTerm}" found ${offerIds.length} matches (${matchingLeadIds.length} related leads)`);
          } else {
            logger.info(`Universal query: Offer search "${searchTerm}" found 0 matches`);
            return [['_id', '=', null]]; // Return empty result
          }
        }
        continue; // Skip the normal domain.push below since we already handled search
      }
      
      // Apply transform if defined (e.g., string "true" -> boolean true)
      if (config.transform) {
        finalValue = config.transform(value);
      }
      
      // Special handling: When status is "Hold", include "Hold" and "Termin"
      if (param === 'status' && modelName === 'Lead' && String(value).toLowerCase() === 'hold') {
        domain.push([config.field, 'in', ['Hold', 'Termin']]);
      } 
      // Special handling: has_progress=all means all progress stages (not 'offer')
      else if (param === 'has_progress' && modelName === 'Offer' && String(value).toLowerCase() === 'all') {
        domain.push([config.field, 'in', ['opening', 'confirmation', 'payment', 'netto1', 'netto2', 'lost']]);
        logger.info(`Universal query: has_progress=all converted to current_stage IN all progress stages`);
      }
      // Special handling: has_progress=all_grouped should skip (handled by controller)
      else if (param === 'has_progress' && modelName === 'Offer' && String(value).toLowerCase() === 'all_grouped') {
        // Skip - this is handled by the controller for grouped response
        continue;
      }
      // Special handling: has_progress=netto means netto1 or netto2
      else if (param === 'has_progress' && modelName === 'Offer' && String(value).toLowerCase() === 'netto') {
        domain.push([config.field, 'in', ['netto1', 'netto2']]);
        logger.info(`Universal query: has_progress=netto converted to current_stage IN ['netto1', 'netto2']`);
      }
      // Special handling: out=true -> current_stage='out', out=false -> current_stage != 'out' (for "current stage out" grouping)
      else if (param === 'out' && modelName === 'Offer') {
        const outVal = value === true || value === 'true';
        if (outVal) {
          domain.push(['current_stage', '=', 'out']);
          logger.info(`Universal query: out=true converted to current_stage = 'out'`);
        } else {
          domain.push(['current_stage', '!=', 'out']);
          logger.info(`Universal query: out=false converted to current_stage != 'out'`);
        }
      }
      else {
        domain.push([config.field, config.operator, finalValue]);
      }
    }
  }
  
  return domain;
}

/**
 * Check if any predefined filters are present in query
 */
function hasPredefinedFilters(query, modelName) {
  const filters = PREDEFINED_FILTERS[modelName];
  if (!filters) return false;
  
  for (const param of Object.keys(filters)) {
    if (query[param] !== undefined && query[param] !== null && query[param] !== '') {
      return true;
    }
  }
  return false;
}

/**
 * Main middleware function
 */
const universalQueryMiddleware = async (req, res, next) => {
  const { domain, groupBy, expand, includeAll, use_status, showInactive, search } = req.query;

  // Detect model from route early for predefined filter check
  const fullPath = req.baseUrl + req.path;
  const modelName = detectModelFromRoute(fullPath);
  
  // Check if we have predefined filters
  const hasPredefined = modelName && hasPredefinedFilters(req.query, modelName);
  
  // Pass through if no universal query params AND no predefined filters
  if (!domain && !groupBy && !includeAll && !use_status && !hasPredefined) {
    return next();
  }

  // Require authenticated user (agent token must be validated)
  if (!req.user || !req.user._id) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  
  try {
    // Parse parameters (robust: nginx/proxies may alter encoding; bad parse must not fall through to next())
    let parsedDomain = [];
    if (domain) {
      try {
        parsedDomain = parseJsonArrayQueryParam(domain, 'domain');
      } catch (e) {
        if (e.message && e.message.startsWith('INVALID_QUERY_PARAM')) {
          return res.status(400).json({
            success: false,
            error: 'Invalid domain parameter (expected JSON array)',
          });
        }
        throw e;
      }
    }
    // Filter out "in"/"not in" with empty array - treat as no filter (return all)
    parsedDomain = parsedDomain.filter((c) => {
      if (!Array.isArray(c) || c.length < 3) return true;
      const [, op, val] = c;
      if ((op === 'in' || op === 'not in') && Array.isArray(val) && val.length === 0) return false;
      return true;
    });
    let parsedGroupBy = [];
    if (groupBy) {
      try {
        parsedGroupBy = parseJsonArrayQueryParam(groupBy, 'groupBy');
      } catch (e) {
        if (e.message && e.message.startsWith('INVALID_QUERY_PARAM')) {
          return res.status(400).json({
            success: false,
            error: 'Invalid groupBy parameter (expected JSON array)',
          });
        }
        throw e;
      }
    }
    const shouldExpand = expand === 'true';

    // Model already detected above for predefined filter check
    if (!modelName) {
      logger.warn(`Could not detect model from route: ${fullPath}`);
      return next();
    }

    // Convert predefined filters to domain conditions and merge with explicit domain
    // This includes the 'search' parameter which is defined in PREDEFINED_FILTERS
    const predefinedDomain = await convertPredefinedFilters(req.query, modelName, req);
    if (predefinedDomain.length > 0) {
      parsedDomain = [...parsedDomain, ...predefinedDomain];
      logger.info(`Added predefined filters for ${modelName}:`, predefinedDomain);
    }

    // Handle agent_name filter for Lead model (requires assignment lookup before search)
    // This needs to be done before calling search service to ensure proper pagination
    if (modelName === 'Lead' && req.query.agent_name) {
      const agent_name = req.query.agent_name;
      const project_id = req.query.project_id;
      
      logger.info(`Universal query: Processing agent_name filter: ${agent_name}${project_id ? ` with project_id: ${project_id}` : ''}`);
      
      // Look up agents by name
      const agentRegex = new RegExp(agent_name, 'i');
      const User = mongoose.model('User');
      const matchingAgents = await User.find({
        $or: [{ login: agentRegex }, { first_name: agentRegex }, { last_name: agentRegex }],
      })
        .select('_id')
        .lean();
      
      if (matchingAgents.length > 0) {
        const agentIds = matchingAgents.map((a) => a._id);
        
        // Build assignment query
        const assignmentQuery = {
          agent_id: { $in: agentIds },
          status: 'active',
        };
        
        // If project_id is provided, filter assignments by project
        if (project_id) {
          assignmentQuery.project_id = new mongoose.Types.ObjectId(project_id);
        }
        
        // Find lead assignments
        const assignments = await AssignLeads.find(assignmentQuery)
          .sort({ assigned_at: -1 }) // Most recent assignments first
          .select('lead_id assigned_at')
          .lean();
        
        if (assignments.length > 0) {
          // Use only the most recent assignment for each lead
          const leadAssignmentMap = new Map();
          assignments.forEach((assignment) => {
            const leadId = assignment.lead_id.toString();
            if (!leadAssignmentMap.has(leadId)) {
              leadAssignmentMap.set(leadId, assignment);
            }
          });
          
          const assignedLeadIds = Array.from(leadAssignmentMap.values()).map((a) => a.lead_id);
          
          // Add lead IDs filter to domain
          parsedDomain.push(['_id', 'in', assignedLeadIds]);
          
          logger.info(
            `Universal query: Added ${assignedLeadIds.length} lead IDs from agent "${agent_name}"${project_id ? ` in project ${project_id}` : ''} to domain`
          );
        } else {
          // No assignments found, return empty result
          parsedDomain.push(['_id', '=', null]); // This will match nothing
          logger.info(
            `Universal query: No assignments found for agent "${agent_name}"${project_id ? ` in project ${project_id}` : ''}`
          );
        }
      } else {
        // No matching agents found, return empty result
        parsedDomain.push(['_id', '=', null]); // This will match nothing
        logger.warn(`Universal query: No agents found matching: ${agent_name}`);
      }
    }

    // Convert "project" domain filter to "project_id" for Offer model
    // Look up project by name and convert to project_id
    if (modelName === 'Offer') {
      const convertedDomain = [];
      for (const condition of parsedDomain) {
        if (Array.isArray(condition) && condition[0] === 'project') {
          const operator = condition[1];
          const projectName = condition[2];
          
          // Look up project by name
          const project = await Team.findOne({ 
            name: new RegExp(`^${projectName}$`, 'i'), 
            active: true 
          }).select('_id').lean();
          
          if (project) {
            // Convert to project_id filter
            convertedDomain.push(['project_id', operator, project._id]);
            logger.info(`Universal query: Converted project filter "${projectName}" to project_id: ${project._id}`);
          } else {
            // Project not found, return empty result
            logger.warn(`Universal query: Project "${projectName}" not found, returning empty result`);
            convertedDomain.push(['_id', '=', null]);
          }
        } else {
          convertedDomain.push(condition);
        }
      }
      parsedDomain = convertedDomain;
    }
    
    // Apply includeAll / use_status / active helpers in the same way as filters.js,
    // but locally in lead-offers-service so that both summary and details
    // behave consistently when called on port 4003.
    // When source=recycle, treat as includeAll so list count matches groupBy count
    // (recycle groupBy uses includeAll=true; list must use same filters to show all leads).
    const hasProgress = req.query.has_progress;
    const effectiveIncludeAll = includeAll === 'true' || (modelName === 'Lead' && req.query.source === 'recycle');
    // search variable already extracted above (line 603)
    parsedDomain = applyQueryParameterFilters(parsedDomain, {
      includeAll: effectiveIncludeAll,
      use_status,
      showInactive: showInactive === 'true',
      groupBy: parsedGroupBy,
      modelName,
      hasProgress,
      search
    });
    
    // For Offer-related models: exclude records of inactive leads
    // - For agents (non-admin): add lead_id not in inactiveLeadIds to domain
    // - For Offer grouping: search service adds this internally (avoids huge payload over network)
    const offerRelatedModels = ['Offer', 'Opening', 'Confirmation', 'PaymentVoucher'];
    const isOfferGrouping = modelName === 'Offer' && parsedGroupBy.length > 0;
    const isAgentExcludingInactive = offerRelatedModels.includes(modelName) && req.user && req.user.role !== 'Admin';
    if (isAgentExcludingInactive && !isOfferGrouping) {
      const hasLeadIdExclusion = parsedDomain.some(
        c => Array.isArray(c) && c[0] === 'lead_id' && c[1] === 'not in'
      );
      if (!hasLeadIdExclusion) {
        const inactiveLeadIds = await getInactiveLeadIds();
        if (inactiveLeadIds.length > 0) {
          parsedDomain.push(['lead_id', 'not in', inactiveLeadIds]);
          logger.info(`Universal query: Excluding ${inactiveLeadIds.length} inactive leads from ${modelName} records`);
        }
      }
    }
    
    // Apply agent permission filter for Offer model (restrict to assigned leads)
    if (modelName === 'Offer' && req.user) {
      try {
        const canReadAll = await hasPermission(req.user.role, PERMISSIONS.OFFER_READ_ALL);
        const canReadOwn = await hasPermission(req.user.role, PERMISSIONS.OFFER_READ_OWN);
        
        // If agent can only read their own offers, filter by assigned leads
        if (!canReadAll && canReadOwn) {
          const assignments = await AssignLeads.find({
            agent_id: req.user._id,
            status: 'active',
          })
            .select('lead_id')
            .lean();

          const assignedLeadIds = assignments.map((a) => a.lead_id);
          
          if (assignedLeadIds.length === 0) {
            // Agent has no assigned leads, return empty result
            parsedDomain.push(['_id', '=', null]);
            logger.info(`Universal query: Agent ${req.user._id} has no assigned leads, returning empty result`);
          } else {
            // Check if lead_id filter already exists in domain
            const hasLeadIdFilter = parsedDomain.some(
              condition => Array.isArray(condition) && condition[0] === 'lead_id'
            );
            
            if (hasLeadIdFilter) {
              // If there's already a lead_id filter, we need to intersect it with assigned leads
              // Find the existing lead_id condition
              const leadIdIndex = parsedDomain.findIndex(
                condition => Array.isArray(condition) && condition[0] === 'lead_id'
              );
              
              if (leadIdIndex !== -1) {
                const existingCondition = parsedDomain[leadIdIndex];
                // If it's an 'in' operator, intersect the arrays
                if (existingCondition[1] === 'in' && Array.isArray(existingCondition[2])) {
                  const existingLeadIds = existingCondition[2];
                  const intersectedIds = existingLeadIds.filter(id => 
                    assignedLeadIds.some(assignedId => 
                      id.toString() === assignedId.toString()
                    )
                  );
                  parsedDomain[leadIdIndex] = ['lead_id', 'in', intersectedIds];
                  logger.info(`Universal query: Intersected domain lead_id filter with agent assignments: ${intersectedIds.length} leads`);
                } else {
                  // For other operators, add a new 'in' condition (will be ANDed by search service)
                  parsedDomain.push(['lead_id', 'in', assignedLeadIds]);
                  logger.info(`Universal query: Added agent assignment filter: ${assignedLeadIds.length} assigned leads`);
                }
              }
            } else {
              // No existing lead_id filter, add agent assignment filter
              parsedDomain.push(['lead_id', 'in', assignedLeadIds]);
              logger.info(`Universal query: Added agent assignment filter: ${assignedLeadIds.length} assigned leads`);
            }
          }
        }
      } catch (error) {
        logger.error('Error applying agent permission filter in universalQuery:', error);
        // Don't block the request, but log the error
      }
    }
    
    logger.info(`Universal query: ${modelName}`, {
      domain: parsedDomain,
      groupBy: parsedGroupBy,
      expand: shouldExpand,
      includeAll: includeAll === 'true',
      showInactive: showInactive === 'true',
      use_status
    });
    
    // Call search service
    let result;
    
    if (parsedGroupBy.length > 0 && shouldExpand) {
      result = await handleGroupingWithExpansion(req, {
        modelName,
        groupBy: parsedGroupBy,
        domain: parsedDomain,
        originalQuery: req.query
      });
    } else if (parsedGroupBy.length > 0) {
      result = await handleGroupingOnly(req, {
        modelName,
        groupBy: parsedGroupBy,
        domain: parsedDomain,
        originalQuery: req.query
      });
    } else {
      result = await handleFilteringOnly(req, {
        modelName,
        domain: parsedDomain,
        originalQuery: req.query
      });
    }
    
    return res.json(result);
    
  } catch (error) {
    logger.error('Universal query middleware error:', {
      error: error.message,
      stack: error.stack
    });
    return next();
  }
};

/**
 * Apply query parameter filters (includeAll, use_status, active) to domain
 * This mirrors the logic from filters.js so that calling the
 * lead-offers-service directly behaves the same for both regular queries and groupBy.
 *
 * @param {Array} domain - Existing domain filters
 * @param {Object} options
 * @param {boolean} options.includeAll
 * @param {string} options.use_status
 * @param {boolean} options.showInactive
 * @param {Array} options.groupBy
 * @param {string} options.modelName
 * @returns {Array}
 */
function applyQueryParameterFilters(domain, { includeAll, use_status, showInactive, groupBy, modelName, hasProgress, search }) {
  if (!Array.isArray(domain)) {
    domain = [];
  }

  const isLeadModel = modelName === 'Lead';
  const isOfferModel = modelName === 'Offer';

  // Check existing filters in domain
  const hasActiveFilter = domain.some(
    condition => Array.isArray(condition) && condition[0] === 'active'
  );
  const hasUseStatusFilter = domain.some(
    condition => Array.isArray(condition) && condition[0] === 'use_status'
  );
  const hasCurrentStageFilter = domain.some(
    condition => Array.isArray(condition) && condition[0] === 'current_stage'
  );

  // ===== LEAD MODEL DEFAULTS =====
  // Check if lead_transfer is in groupBy - if so, don't apply default filters
  // because lead_transfer grouping already filters by active leads and use_status
  const hasLeadTransferGrouping = groupBy && Array.isArray(groupBy) && 
    groupBy.some(field => typeof field === 'string' && field.startsWith('lead_transfer:'));
  
  // Apply active filter for Lead model (mirrors filters.js logic)
  // When includeAll=true, skip active filter entirely to return all leads (both active and inactive)
  // When lead_transfer grouping is present, skip default filters (already handled in search service)
  const hasGrouping = groupBy && Array.isArray(groupBy) && groupBy.length > 0;
  const shouldApplyActiveForGrouping = isLeadModel && hasGrouping && !includeAll && !hasActiveFilter && !hasLeadTransferGrouping;
  const shouldApplyActiveForList = isLeadModel && !includeAll && !hasActiveFilter && !hasLeadTransferGrouping;
  if (shouldApplyActiveForGrouping || shouldApplyActiveForList) {
    // When showInactive=true, show only inactive leads. Otherwise show only active leads.
    domain.push(['active', '=', showInactive ? false : true]);
  }

  // Explicit use_status from query string wins if not already in domain
  if (isLeadModel && use_status && !hasUseStatusFilter) {
    domain.push(['use_status', '=', use_status]);
  }

  // Default behavior when nothing passed:
  // - includeAll=true  -> no implicit use_status filter
  // - use_status given -> respect explicit filter above
  // - showInactive=true -> don't apply use_status filter (archived leads shown regardless)
  // - lead_transfer grouping -> skip default filters (already handled in search service)
  // - otherwise        -> exclude pending by default
  if (
    isLeadModel &&
    !includeAll &&
    !showInactive &&
    !use_status &&
    !hasUseStatusFilter &&
    !hasLeadTransferGrouping
  ) {
    domain.push(['use_status', '!=', 'pending']);
  }

  // ===== OFFER MODEL DEFAULTS =====
  // When querying offers without explicit has_progress or current_stage:
  // - Default to current_stage IN ['offer', 'call_1', 'call_2', 'call_3', 'call_4'] (all offer stages)
  // - When searching, also include 'out' stage offers
  // - Default to active = true
  // This mirrors the behavior of GET /offers without filters
  if (isOfferModel && !includeAll) {
    // Apply current_stage default if not already filtered
    if (!hasCurrentStageFilter && !hasProgress) {
      const offerStages = ['offer', 'call_1', 'call_2', 'call_3', 'call_4'];
      if (search) {
        // Include 'out' stage when searching
        offerStages.push('out');
      }
      domain.push(['current_stage', 'in', offerStages]);
    }
    
    // Apply active default if not already filtered
    if (!hasActiveFilter) {
      domain.push(['active', '=', true]);
    }
  }

  // ===== CLOSED LEAD MODEL DEFAULTS =====
  // Exclude reverted leads by default (mirrors closedLeads.js route behavior).
  // When includeAll=true, skip this filter to show all closed leads including reverted ones.
  const isClosedLeadModel = modelName === 'ClosedLead';
  if (isClosedLeadModel && !includeAll) {
    const hasRevertedFilter = domain.some(
      condition => Array.isArray(condition) && condition[0] === 'is_reverted'
    );
    if (!hasRevertedFilter) {
      domain.push(['is_reverted', '!=', true]);
    }
  }

  return domain;
}

function detectModelFromRoute(path) {
  for (const [route, model] of Object.entries(ROUTE_MODEL_MAP)) {
    if (path.includes(route)) {
      return model;
    }
  }
  return null;
}

/**
 * Recursively apply permission-based masking to groupName when grouping by email_from or phone.
 * Mirrors list view: agents without unmask permission see masked values in group labels.
 * @param {Array} groups - Array of group objects with groupName, fieldName, subGroups
 * @param {Object} user - User object (req.user)
 */
function applyGroupNameMasking(groups, user) {
  if (!groups || !Array.isArray(groups) || !user) return;
  if (user.role === 'Admin') return;
  const isDetailApi = false; // Grouped view is list-level, not detail
  if (!shouldMaskLeadData(user, isDetailApi)) return;

  const MASKABLE_FIELDS = ['email_from', 'phone'];

  const maskGroup = (group) => {
    if (!group) return;
    const fieldName = group.fieldName;
    const baseField = fieldName && typeof fieldName === 'string'
      ? (fieldName.includes(':') ? fieldName.split(':')[0] : fieldName)
      : null;
    if (baseField && MASKABLE_FIELDS.includes(baseField) && group.groupName) {
      if (baseField === 'email_from') {
        group.groupName = maskEmail(group.groupName) ?? group.groupName;
      } else if (baseField === 'phone') {
        group.groupName = maskPhone(group.groupName) ?? group.groupName;
      }
    }
    if (group.subGroups && Array.isArray(group.subGroups)) {
      group.subGroups.forEach(maskGroup);
    }
  };

  groups.forEach(maskGroup);
}

/** Map duplicate_status numeric values to display labels (matches filter dropdown) */
const DUPLICATE_STATUS_LABELS = {
  0: 'New',
  1: '10 Week Duplicate',
  2: 'Duplicate'
};

/**
 * Recursively format groupName for duplicate_status: replace 0,1,2 with "New", "10 Week Duplicate", "Duplicate".
 * @param {Array} groups - Array of group objects with groupName, fieldName, subGroups
 */
function applyDuplicateStatusGroupNameFormatting(groups) {
  if (!groups || !Array.isArray(groups)) return;

  const formatGroup = (group) => {
    if (!group) return;
    const baseField = group.fieldName && typeof group.fieldName === 'string'
      ? (group.fieldName.includes(':') ? group.fieldName.split(':')[0] : group.fieldName)
      : null;
    if (baseField === 'duplicate_status' && group.groupName !== undefined && group.groupName !== null) {
      const num = typeof group.groupName === 'number' ? group.groupName : parseInt(group.groupName, 10);
      if (DUPLICATE_STATUS_LABELS[num] !== undefined) {
        group.groupName = DUPLICATE_STATUS_LABELS[num];
      }
    }
    if (group.subGroups && Array.isArray(group.subGroups)) {
      group.subGroups.forEach(formatGroup);
    }
  };

  groups.forEach(formatGroup);
}

async function handleGroupingOnly(req, { modelName, groupBy, domain, originalQuery }) {
  const queryParams = originalQuery || {};
  const page = parseInt(queryParams.page) || 1;
  const limit = parseInt(queryParams.limit) || 80;
  // Support subgroup pagination for multilevel grouping
  const subPage = parseInt(queryParams.subPage) || 1;
  const subLimit = queryParams.subLimit !== undefined ? parseInt(queryParams.subLimit) : null;
  // Support groupId parameter to specify which group's subgroups to paginate
  const targetGroupId = queryParams.groupId || null;
  // Support parentGroupId to identify the correct parent when fetching leads for a subgroup
  const parentGroupId = queryParams.parentGroupId || null;
  // Check if we need to fetch leads for a specific group
  const fetchLeadsForGroup = queryParams.fetchLeads === 'true' || queryParams.fetchLeads === true;
  
  // Extract sort parameters and construct orderBy for search service
  const sortBy = queryParams.sortBy || null;
  const sortOrder = queryParams.sortOrder || 'desc';
  const orderByValue = sortBy ? `${sortBy} ${sortOrder}` : null;
  
  logger.info(`Grouping only: ${modelName}`, { groupBy, page, limit, subPage, subLimit, targetGroupId, parentGroupId, fetchLeadsForGroup, domain, orderBy: orderByValue });
  
  // Call search service
  // For multi-level grouping, skip includeIds because _buildNestedStructure
  // discards _recordIds (each group gets a domain filter instead).
  // Skipping $push:'$_id' in the $group stage dramatically reduces aggregation time.
  const isMultilevelGrouping = groupBy && groupBy.length > 1;
  const includeAllFlag = queryParams.includeAll === 'true' || queryParams.includeAll === true;
  const response = await axios.post(`${SEARCH_SERVICE_URL}/api/search`, {
    model: modelName,
    domain: domain || [],
    groupBy,
    includeIds: !isMultilevelGrouping,
    limit: limit,
    offset: (page - 1) * limit,
    ...(orderByValue && { orderBy: orderByValue }),
    ...(includeAllFlag && { includeAll: true })
  }, {
    headers: {
      Authorization: req.headers.authorization
    }
  });
  
  /**
   * Generate a deterministic ObjectId for "None" groups (null values)
   * Uses the same algorithm as search service: seed = level === 0 ? field : `${field}_level_${level}`
   * For None groups, field should be passed as `${field}_none`
   * @param {string} field - The grouping field name (should be `${field}_none` for None groups)
   * @param {number} level - The grouping level (optional, for multilevel grouping)
   * @returns {mongoose.Types.ObjectId} - Deterministic ObjectId
   */
  const generateNoneGroupId = (field, level = 0) => {
    // Match search service algorithm exactly: seed = level === 0 ? field : `${field}_level_${level}`
    const seed = level === 0 ? field : `${field}_level_${level}`;
    const hash = crypto.createHash('md5').update(seed).digest('hex');
    const objectIdHex = hash.substring(0, 24);

    try {
      return new mongoose.Types.ObjectId(objectIdHex);
    } catch (error) {
      const fallbackSeed = `${field}_${level}`.padEnd(24, '0').substring(0, 24);
      return new mongoose.Types.ObjectId(fallbackSeed);
    }
  };

  // Helper function to compare group IDs (handles ObjectId, string, date strings, etc.)
  const compareGroupIds = (groupId1, groupId2) => {
    if (!groupId1 || !groupId2) return false;
    
    // Convert both to strings for comparison
    const str1 = groupId1.toString();
    const str2 = groupId2.toString();
    
    // Direct string comparison
    if (str1 === str2) return true;
    
    // Try ObjectId comparison if both are valid ObjectIds
    try {
      if (mongoose.Types.ObjectId.isValid(str1) && mongoose.Types.ObjectId.isValid(str2)) {
        const objId1 = new mongoose.Types.ObjectId(str1);
        const objId2 = new mongoose.Types.ObjectId(str2);
        return objId1.equals(objId2);
      }
    } catch (e) {
      // Ignore ObjectId conversion errors
    }
    
    return false;
  };

  // Helper function to recursively format groups and fix null groupIds
  const formatGroup = (group, fieldName = null, level = 0, subgroupLimit = null, subgroupPage = 1, targetGroupId = null) => {
    // If groupId is null and groupName is "None", generate a proper groupId
    // Use the same format as search service: `${field}_none` for level 0
    let groupId = group.groupId;
    if ((groupId === null || groupId === undefined) && (group.groupName === 'None' || group.groupName === null)) {
      const field = group.fieldName || fieldName || 'unknown';
      // Match search service format: for None groups, use `${field}_none` as the seed
      const noneField = `${field}_none`;
      groupId = generateNoneGroupId(noneField, level);
      logger.info(`Generated groupId for null group: ${field} -> ${groupId}`);
    }
    
    const formatted = {
      groupId: groupId,
      groupName: group.groupName || 'Unknown',
      fieldName: group.fieldName,
      count: group.count,
      // Preserve domain filter for proper lead fetching when expanding groups
      ...(group.domain && Array.isArray(group.domain) && group.domain.length > 0 && { domain: group.domain }),
      // Preserve isSpecialGrouping flag for name population
      ...(group.isSpecialGrouping !== undefined && { isSpecialGrouping: group.isSpecialGrouping }),
      // Preserve _recordIds if present
      ...(group._recordIds && { _recordIds: group._recordIds })
    };
    
    // If there are subGroups, recursively format them and add pagination meta
    if (group.subGroups && Array.isArray(group.subGroups) && group.subGroups.length > 0) {
      // Check if this group matches the target groupId for subgroup pagination
      // Use groupId (which may have been generated for null groups) for comparison
      const shouldPaginateSubgroups = targetGroupId ? compareGroupIds(groupId, targetGroupId) : (subgroupLimit !== null);
      
      // Apply pagination to subgroups only if:
      // 1. This group matches the targetGroupId, OR
      // 2. No targetGroupId is specified and subgroupLimit is provided
      const totalSubGroups = group.subGroups.length;
      let subLimit, subPage, subOffset, paginatedSubGroups, subPages;
      
      if (shouldPaginateSubgroups) {
        subLimit = subgroupLimit !== null ? subgroupLimit : totalSubGroups;
        subPage = subgroupPage || 1;
        subOffset = (subPage - 1) * subLimit;
        
        // Handle pagination with bounds checking
        if (subLimit > 0 && subOffset < totalSubGroups) {
          paginatedSubGroups = group.subGroups.slice(subOffset, subOffset + subLimit);
        } else if (subOffset >= totalSubGroups) {
          // If offset is beyond available subgroups, return empty array
          paginatedSubGroups = [];
        } else {
          // No limit, return all subgroups
          paginatedSubGroups = group.subGroups;
        }
        
        subPages = subLimit > 0 ? Math.ceil(totalSubGroups / subLimit) : 1;
      } else {
        // Don't paginate - return all subgroups
        paginatedSubGroups = group.subGroups;
        subLimit = totalSubGroups;
        subPage = 1;
        subOffset = 0;
        subPages = 1;
      }
      
      formatted.subGroups = paginatedSubGroups.map((subGroup, idx) => {
        // Recursively format the subGroup first (handles any nested subGroups)
        // Pass down the limit and page for nested subgroups, and targetGroupId
        const formattedSubGroup = formatGroup(subGroup, subGroup.fieldName || group.fieldName, level + 1, subgroupLimit, subgroupPage, targetGroupId);
        
        // Always add pagination meta to each subGroup (overwrite any existing meta, including null)
        // Create a new object to ensure meta is always present and never null
        return {
          groupId: formattedSubGroup.groupId,
          groupName: formattedSubGroup.groupName,
          fieldName: formattedSubGroup.fieldName,
          count: formattedSubGroup.count,
          meta: {
            total: formattedSubGroup.count || 0,
            totalGroups: 1,
            page: 1,
            limit: formattedSubGroup.count || 0,
            pages: 1,
            offset: 0
          },
          // Preserve domain filter for proper lead fetching when expanding groups
          ...(formattedSubGroup.domain && Array.isArray(formattedSubGroup.domain) && formattedSubGroup.domain.length > 0 && { domain: formattedSubGroup.domain }),
          // Preserve isSpecialGrouping flag for name population
          ...(formattedSubGroup.isSpecialGrouping !== undefined && { isSpecialGrouping: formattedSubGroup.isSpecialGrouping }),
          // Preserve _recordIds if present
          ...(formattedSubGroup._recordIds && { _recordIds: formattedSubGroup._recordIds }),
          // Preserve any other properties (like nested subGroups if they exist)
          ...(formattedSubGroup.subGroups && { subGroups: formattedSubGroup.subGroups })
        };
      });
      
      // Add pagination meta to the parent group for its subgroups
      formatted.meta = {
        total: totalSubGroups,
        totalGroups: totalSubGroups,
        page: subPage,
        limit: subLimit,
        pages: subPages,
        offset: subOffset
      };
    }
    
    return formatted;
  };

  // Ensure pagination metadata is complete
  const meta = response.data.meta || {};
  const total = meta.total !== undefined ? meta.total : response.data.data.length;
  
  // Normalize page: if requested page exceeds available pages, use the last valid page
  const groupingPaginationInfo = normalizePagination(page, total, limit);
  const normalizedPage = groupingPaginationInfo.page;
  
  if (groupingPaginationInfo.adjusted) {
    logger.info(`Grouping: Page ${page} exceeds available pages (${groupingPaginationInfo.pages}), adjusted to page ${normalizedPage}`);
  }

  logger.info(`Grouping response meta:`, { 
    searchServiceMeta: meta, 
    calculatedTotal: total,
    dataLength: response.data.data.length,
    normalizedPage: normalizedPage
  });

  // Process groups and fix null groupIds
  // For multilevel grouping, use subPage and subLimit for subgroup pagination if provided
  // If targetGroupId is specified, only paginate subgroups for that specific group
  const isMultilevel = groupBy && groupBy.length > 1;
  const subgroupLimit = isMultilevel && subLimit !== null ? subLimit : (isMultilevel ? limit : null);
  const subgroupPage = isMultilevel ? subPage : 1;
  
  const processedData = response.data.data.map((group, idx) => {
    // Determine the field name from groupBy array
    const fieldName = groupBy && groupBy.length > 0 ? groupBy[0] : group.fieldName || 'unknown';
    // Pass targetGroupId to formatGroup so it knows which group's subgroups to paginate
    return formatGroup(group, fieldName, 0, subgroupLimit, subgroupPage, targetGroupId);
  });

  // Populate reference field names for special groupings (e.g., team_id -> project name)
  // Check if any groups have isSpecialGrouping flag and need name population
  const hasSpecialGrouping = processedData.some(g => g.isSpecialGrouping);
  logger.info(`[NAME POPULATION] Checking: hasSpecialGrouping=${hasSpecialGrouping}, groupBy=${JSON.stringify(groupBy)}, processedData.length=${processedData.length}`);
  
  if (hasSpecialGrouping && groupBy && groupBy.length > 0) {
    // Find all fields that are not lead_transfer (they might be reference fields)
    const otherFields = groupBy.filter(f => !f.startsWith('lead_transfer:'));
    logger.info(`[NAME POPULATION] Found ${otherFields.length} otherFields: ${JSON.stringify(otherFields)}`);
    
    // Populate names for each reference field
    for (const field of otherFields) {
      logger.info(`[NAME POPULATION] Calling populateReferenceFieldNames for field: ${field}`);
      await populateReferenceFieldNames(processedData, field, otherFields);
    }
  } else {
    logger.warn(`[NAME POPULATION] Skipped: hasSpecialGrouping=${hasSpecialGrouping}, groupBy=${JSON.stringify(groupBy)}`);
  }

  // Apply level-specific sorting based on sortBy/sortOrder.
  // sortBy can match any field in the groupBy array – sorting is applied only at that level.
  const isDateFieldName = (name) => {
    const n = name.includes('.') ? name.split('.').pop() : name;
    return n === 'lead_date' || n === 'createdAt' || n === 'updatedAt' ||
           n === 'assigned_date' || n.endsWith('_at') || n.endsWith('_date');
  };

  const applySortAtLevel = (groups, targetLevel, currentLevel = 0) => {
    if (currentLevel === targetLevel) {
      const isAscending = sortOrder === 'asc';
      const field = groupBy[targetLevel];
      const baseField = field.includes(':') ? field.split(':')[0] : field;

      if (isDateFieldName(baseField)) {
        const extractDateStr = (group) => {
          const gid = (group.groupId || '').toString();
          const match = gid.match(/(\d{4}-\d{2}-\d{2})$|(\d{4}-W\d{1,2})$|(\d{4}-\d{2})$|(\d{4})$/);
          return match ? match[0] : '';
        };
        groups.sort((a, b) => {
          if (a.groupName === 'None' && b.groupName !== 'None') return 1;
          if (a.groupName !== 'None' && b.groupName === 'None') return -1;
          const dateA = extractDateStr(a);
          const dateB = extractDateStr(b);
          return isAscending ? dateA.localeCompare(dateB) : dateB.localeCompare(dateA);
        });
      } else {
        groups.sort((a, b) => {
          if (a.groupName === 'None' && b.groupName !== 'None') return 1;
          if (a.groupName !== 'None' && b.groupName === 'None') return -1;
          if (a.groupName === 'None' && b.groupName === 'None') return 0;
          const nameA = (a.groupName || '').toString().toLowerCase();
          const nameB = (b.groupName || '').toString().toLowerCase();
          const numA = parseFloat(nameA);
          const numB = parseFloat(nameB);
          if (!isNaN(numA) && !isNaN(numB)) {
            return isAscending ? numA - numB : numB - numA;
          }
          return isAscending ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
        });
      }
    } else if (currentLevel < targetLevel) {
      for (const group of groups) {
        if (group.subGroups && Array.isArray(group.subGroups)) {
          applySortAtLevel(group.subGroups, targetLevel, currentLevel + 1);
        }
      }
    }
  };

  if (sortBy && groupBy && groupBy.length > 0) {
    const sortLevel = groupBy.findIndex(field => {
      const baseField = field.includes(':') ? field.split(':')[0] : field;
      // projectName sorts groups by project title when groupBy is project_id (search-service sorts in pipeline; this is backup)
      if (modelName === 'Offer' && baseField === 'project_id' && sortBy === 'projectName') {
        return true;
      }
      return baseField === sortBy || field === sortBy;
    });

    if (sortLevel >= 0) {
      applySortAtLevel(processedData, sortLevel);
      logger.info(`Backup sort applied: sortBy=${sortBy}, level=${sortLevel}, sortOrder=${sortOrder}`);
    } else if (sortBy === 'count') {
      const isAscending = sortOrder === 'asc';
      processedData.sort((a, b) => isAscending ? (a.count || 0) - (b.count || 0) : (b.count || 0) - (a.count || 0));
    }
  } else {
    // No explicit sortBy: keep default backup for date fields at level 0
    const firstField = groupBy && groupBy.length > 0 ? groupBy[0] : null;
    if (firstField) {
      const baseFirst = firstField.includes(':') ? firstField.split(':')[0] : firstField;
      const isLeadTransferGrouping = baseFirst === 'lead_transfer';
      if (!isLeadTransferGrouping && isDateFieldName(baseFirst)) {
        applySortAtLevel(processedData, 0);
      }
    }
  }

  // If targetGroupId is provided, find the group and fetch its leads
  // This handles the case where frontend requests leads for a specific nested group
  if (targetGroupId && modelName === 'Lead') {
    // Recursively find the group matching targetGroupId
    // If parentGroupId is provided, first find the parent, then search within its subGroups
    const findGroupById = (groups, groupId, parentId = null) => {
      for (const group of groups) {
        // If we're looking for a subgroup within a specific parent
        if (parentId) {
          if (compareGroupIds(group.groupId, parentId)) {
            // Found the parent, now search in its subGroups
            if (group.subGroups && group.subGroups.length > 0) {
              for (const subGroup of group.subGroups) {
                if (compareGroupIds(subGroup.groupId, groupId)) {
                  return subGroup;
                }
              }
            }
            return null; // Parent found but subgroup not found
          }
          // Continue searching for the parent in subGroups
          if (group.subGroups && group.subGroups.length > 0) {
            const found = findGroupById(group.subGroups, groupId, parentId);
            if (found) return found;
          }
        } else {
          // No parent specified, search all groups
          if (compareGroupIds(group.groupId, groupId)) {
            return group;
          }
          if (group.subGroups && group.subGroups.length > 0) {
            const found = findGroupById(group.subGroups, groupId, null);
            if (found) return found;
          }
        }
      }
      return null;
    };
    
    const targetGroup = findGroupById(processedData, targetGroupId, parentGroupId);
    
    if (targetGroup) {
      // Apply pagination
      const leadPage = parseInt(queryParams.leadPage) || subPage || 1;
      const leadLimit = parseInt(queryParams.leadLimit) || subLimit || 50;
      const leadOffset = (leadPage - 1) * leadLimit;
      
      // If group has _recordIds, use them (for lead_transfer grouping)
      if (targetGroup._recordIds && targetGroup._recordIds.length > 0) {
        logger.info(`[FETCH LEADS] Found group with ${targetGroup._recordIds.length} lead IDs for groupId: ${targetGroupId}`);
        
        const paginatedLeadIds = targetGroup._recordIds.slice(leadOffset, leadOffset + leadLimit);
        
        // Fetch leads
        const leads = await fetchFullLeadsWithNesting(paginatedLeadIds, req.user);
        
        // Add leads to the target group
        targetGroup.leads = leads;
        targetGroup.leadMeta = {
          total: targetGroup._recordIds.length,
          page: leadPage,
          limit: leadLimit,
          pages: Math.ceil(targetGroup._recordIds.length / leadLimit),
          offset: leadOffset
        };
        
        logger.info(`[FETCH LEADS] Fetched ${leads.length} leads for groupId: ${targetGroupId} (page ${leadPage}, limit ${leadLimit})`);
      } 
      // If group has domain filter, use it to fetch leads via search service
      else if (targetGroup.domain && targetGroup.domain.length > 0) {
        logger.info(`[FETCH LEADS] Using domain filter for groupId: ${targetGroupId}`, { domain: targetGroup.domain });
        
        try {
          // Call search service with the group's domain filter
          const searchResponse = await axios.post(`${SEARCH_SERVICE_URL}/api/search`, {
            model: 'Lead',
            domain: targetGroup.domain,
            groupBy: [], // No grouping, just fetch leads
            limit: leadLimit,
            offset: leadOffset,
            orderBy: 'createdAt desc'
          }, {
            headers: {
              Authorization: req.headers.authorization
            }
          });
          
          const leadIds = searchResponse.data.data.map(lead => lead._id);
          const totalLeads = searchResponse.data.meta?.total || leadIds.length;
          
          // Fetch full lead data with nesting
          const leads = await fetchFullLeadsWithNesting(leadIds, req.user);
          
          // Add leads to the target group
          targetGroup.leads = leads;
          targetGroup.leadMeta = {
            total: totalLeads,
            page: leadPage,
            limit: leadLimit,
            pages: Math.ceil(totalLeads / leadLimit),
            offset: leadOffset
          };
          
          logger.info(`[FETCH LEADS] Fetched ${leads.length} leads using domain filter for groupId: ${targetGroupId} (page ${leadPage}, limit ${leadLimit}, total ${totalLeads})`);
        } catch (error) {
          logger.error(`[FETCH LEADS] Error fetching leads with domain filter for groupId: ${targetGroupId}`, { error: error.message });
        }
    } else {
      logger.warn(`[FETCH LEADS] Group found but has no _recordIds or domain for groupId: ${targetGroupId}, fieldName: ${targetGroup.fieldName}`);
      }
    } else {
      logger.warn(`[FETCH LEADS] Group not found for groupId: ${targetGroupId}`);
    }
  }

  // Apply permission-based masking to groupName for email_from/phone (mirrors list view)
  if (modelName === 'Lead' && req.user) {
    applyGroupNameMasking(processedData, req.user);
  }
  // Format duplicate_status group names: 0→New, 1→10 Week Duplicate, 2→Duplicate
  if (modelName === 'Lead') {
    applyDuplicateStatusGroupNameFormatting(processedData);
  }
  
  return {
    success: true,
    grouped: true,
    data: processedData,
    meta: {
      totalGroups: total,
      total: total,
      page: normalizedPage,
      limit: limit,
      pages: groupingPaginationInfo.pages,
      offset: groupingPaginationInfo.offset,
      ...meta // Include any additional meta fields from search service (will override if duplicates)
    }
  };
}

/**
 * ============================================
 * PROGRESSION DATE FILTER HELPERS
 * Maps domain date filters (createdAt/updatedAt) to stage-specific fields
 * when filtering offers in the progress view.
 *
 * For specific stages (opening, confirmation, etc.): Simple field rename in
 * the domain, then send to search service as usual.
 *
 * For multi-stage cases (all, netto, any): Direct MongoDB query with $or
 * so each stage checks its own timestamp field.
 * ============================================
 */

// Stage-specific field mapping for createdAt domain filter
// Uses completed_at (exists for all data, set at the same time as createdAt)
const STAGE_CREATED_FIELD = {
  opening: 'progression.opening.completed_at',
  confirmation: 'progression.confirmation.completed_at',
  payment: 'progression.payment.completed_at',
  netto1: 'progression.netto1.completed_at',
  netto2: 'progression.netto2.completed_at',
  lost: 'progression.lost.completed_at',
};

const STAGE_UPDATED_FIELD = {
  opening: 'progression.opening.updatedAt',
  confirmation: 'progression.confirmation.updatedAt',
  payment: 'progression.payment.updatedAt',
  netto1: 'progression.netto1.updatedAt',
  netto2: 'progression.netto2.updatedAt',
  lost: 'progression.lost.updatedAt',
};

/**
 * Analyse the domain for date conditions and determine mapping strategy.
 * Returns null if no date conditions or has_progress is not set.
 *
 * ALL progression date filtering uses direct MongoDB queries (not the search
 * service) because the search service cannot reliably filter on deeply nested
 * date fields like progression.confirmation.completed_at.
 */
function getProgressionDateMapping(domain, hasProgress) {
  const dateConditions = domain.filter(
    c => Array.isArray(c) && (c[0] === 'createdAt' || c[0] === 'updatedAt')
  );

  if (dateConditions.length === 0) return null;

  // Single specific stage (opening, confirmation, payment, netto1, netto2, lost)
  // Uses direct MongoDB query with that single stage in the $or
  if (STAGE_CREATED_FIELD[hasProgress]) {
    return {
      directQuery: true,
      dateConditions,
      stages: [hasProgress],
    };
  }

  // Multi-stage cases
  // Note: all_grouped is excluded – it's handled by the controller for grouped response
  if (hasProgress === 'all') {
    return {
      directQuery: true,
      dateConditions,
      stages: ['opening', 'confirmation', 'payment', 'netto1', 'netto2', 'lost'],
    };
  }

  if (hasProgress === 'netto') {
    return {
      directQuery: true,
      dateConditions,
      stages: ['netto1', 'netto2'],
    };
  }

  if (hasProgress === 'any') {
    return {
      directQuery: true,
      dateConditions,
      stages: ['opening', 'confirmation', 'payment', 'netto1', 'netto2', 'lost'],
    };
  }

  return null;
}

/**
 * Convert a single domain condition [field, operator, value] to a MongoDB
 * query fragment.
 */
function domainConditionToMongo(condition) {
  if (!Array.isArray(condition) || condition.length < 3) return {};
  const [field, operator, value] = condition;

  switch (String(operator).toLowerCase()) {
    case '=':
    case 'equals':
      return { [field]: value };
    case '!=':
    case 'not equals':
      return { [field]: { $ne: value } };
    case 'in':
      // Empty array = no filter (return all)
      if (Array.isArray(value) && value.length === 0) return {};
      return { [field]: { $in: Array.isArray(value) ? value : [value] } };
    case 'not in':
      // Empty array = no filter (return all)
      if (Array.isArray(value) && value.length === 0) return {};
      return { [field]: { $nin: Array.isArray(value) ? value : [value] } };
    case '>':
    case 'greater':
    case 'greater than':
      return { [field]: { $gt: value } };
    case '>=':
    case 'greater_equals':
    case 'greater than or equals':
      return { [field]: { $gte: value } };
    case '<':
    case 'less':
    case 'less than':
      return { [field]: { $lt: value } };
    case '<=':
    case 'less_equals':
    case 'less than or equals':
      return { [field]: { $lte: value } };
    case 'contains':
    case 'like':
    case 'ilike':
      return {
        [field]: {
          $regex: String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
          $options: 'i',
        },
      };
    default:
      return { [field]: value };
  }
}

/**
 * Build a MongoDB date filter object for a given operator + date-string value.
 * "equals" is treated as the full day (00:00:00 – 23:59:59 UTC).
 */
function buildMongoDateFilter(operator, value) {
  const dateStr = String(value);

  switch (String(operator).toLowerCase()) {
    case '=':
    case 'equals': {
      const startDate = new Date(dateStr + 'T00:00:00.000Z');
      const endDate = new Date(dateStr + 'T23:59:59.999Z');
      return { $gte: startDate, $lte: endDate };
    }
    case '!=':
    case 'not equals': {
      const startDate = new Date(dateStr + 'T00:00:00.000Z');
      const endDate = new Date(dateStr + 'T23:59:59.999Z');
      return { $not: { $gte: startDate, $lte: endDate } };
    }
    case '>':
    case 'greater':
    case 'greater than':
      return { $gt: new Date(dateStr + 'T23:59:59.999Z') };
    case '>=':
    case 'greater_equals':
    case 'greater than or equals':
      return { $gte: new Date(dateStr + 'T00:00:00.000Z') };
    case '<':
    case 'less':
    case 'less than':
      return { $lt: new Date(dateStr + 'T00:00:00.000Z') };
    case '<=':
    case 'less_equals':
    case 'less than or equals':
      return { $lte: new Date(dateStr + 'T23:59:59.999Z') };
    default:
      return new Date(dateStr);
  }
}

/**
 * Handle direct MongoDB query for multi-stage date filtering.
 * Used when has_progress is 'all', 'netto', or 'any' and the domain
 * contains createdAt/updatedAt conditions. Builds a $or query so each
 * stage checks its own timestamp field.
 */
async function handleDirectProgressDateQuery(req, { domain, dateConditions, stages, originalQuery }) {
  const {
    page = 1,
    limit = 50,
    sortBy: requestedSortBy,
    sortOrder: requestedSortOrder = 'desc',
    has_progress,
  } = originalQuery;

  const requestedPage = parseInt(page) || 1;
  const limitValue = parseInt(limit) || 50;
  const skip = (requestedPage - 1) * limitValue;

  // Determine sort field (reuse same logic as handleFilteringOnly)
  const getDefaultSortField = (progressStage) => {
    const stageToSortField = {
      opening: 'progression.opening.completed_at',
      confirmation: 'progression.confirmation.completed_at',
      payment: 'progression.payment.completed_at',
      netto1: 'progression.netto1.completed_at',
      netto2: 'progression.netto2.completed_at',
      netto: 'progression.netto1.completed_at',
      lost: 'progression.lost.marked_at',
    };
    return stageToSortField[progressStage] || 'updatedAt';
  };

  const sortBy = requestedSortBy || getDefaultSortField(has_progress);
  const validSortBy = sortBy && typeof sortBy === 'string' ? sortBy : 'updatedAt';
  const validSortOrder =
    requestedSortOrder && typeof requestedSortOrder === 'string'
      ? requestedSortOrder
      : 'desc';

  // Separate non-date, non-current_stage conditions
  const nonDateNonStageDomain = domain.filter(
    c =>
      !Array.isArray(c) ||
      (c[0] !== 'createdAt' && c[0] !== 'updatedAt' && c[0] !== 'current_stage')
  );

  // Convert remaining domain conditions to MongoDB
  const mongoConditions = nonDateNonStageDomain
    .filter(c => Array.isArray(c))
    .map(condition => domainConditionToMongo(condition));

  // Build stage-specific $or conditions
  const stageOrConditions = stages.map(stage => {
    const stageCondition = { current_stage: stage };
    for (const [field, op, value] of dateConditions) {
      if (field === 'createdAt') {
        stageCondition[STAGE_CREATED_FIELD[stage]] = buildMongoDateFilter(op, value);
      } else if (field === 'updatedAt') {
        stageCondition[STAGE_UPDATED_FIELD[stage]] = buildMongoDateFilter(op, value);
      }
    }
    return stageCondition;
  });

  // Combine all conditions with $and
  const mongoQuery =
    mongoConditions.length > 0
      ? { $and: [...mongoConditions, { $or: stageOrConditions }] }
      : { $or: stageOrConditions };

  logger.info('Direct progress date query:', {
    stages,
    dateConditionsCount: dateConditions.length,
    mongoQueryPreview: JSON.stringify(mongoQuery).substring(0, 500),
    sortBy: validSortBy,
    sortOrder: validSortOrder,
    page: requestedPage,
    limit: limitValue,
  });

  // Execute query (fetch only _id for efficiency, then populate via helper)
  const [offerIds, total] = await Promise.all([
    Offer.find(mongoQuery)
      .sort({ [validSortBy]: validSortOrder === 'asc' ? 1 : -1 })
      .skip(skip)
      .limit(limitValue)
      .select('_id')
      .lean(),
    Offer.countDocuments(mongoQuery),
  ]);

  if (offerIds.length === 0) {
    return {
      success: true,
      data: [],
      meta: {
        total: 0,
        page: requestedPage,
        limit: limitValue,
        pages: 0,
        offset: skip,
      },
    };
  }

  const paginationInfo = normalizePagination(requestedPage, total, limitValue);

  // Fetch fully populated offers
  const ids = offerIds.map(o => o._id);
  let enrichedData = await fetchFullOffersWithNesting(ids);

  // Apply lead masking
  const user = req.user;
  if (user && enrichedData.length > 0) {
    enrichedData = enrichedData.map(offer => {
      if (offer.lead_id && typeof offer.lead_id === 'object') {
        return {
          ...offer,
          lead_id: applyLeadMasking(offer.lead_id, user, false),
        };
      }
      return offer;
    });
  }

  return {
    success: true,
    data: enrichedData,
    meta: {
      total,
      page: paginationInfo.page,
      limit: limitValue,
      pages: paginationInfo.pages,
      offset: paginationInfo.offset,
    },
  };
}

async function handleFilteringOnly(req, { modelName, domain, originalQuery }) {
  const { page = 1, limit = 50, sortBy: requestedSortBy, sortOrder = 'desc', has_progress } = originalQuery;

  // ===== PROGRESSION DATE FILTER MAPPING =====
  // When filtering offers by date in the progress view, map the date filter
  // to stage-specific timestamps instead of the offer's top-level createdAt.
  // Example: has_progress=confirmation & domain=[["createdAt","equals","2026-02-13"]]
  //   -> filters by progression.confirmation.completed_at instead of offer.createdAt
  // All progression date filtering uses direct MongoDB queries because the
  // search service cannot reliably filter on nested date fields.
  if (modelName === 'Offer' && has_progress) {
    const dateMapping = getProgressionDateMapping(domain, has_progress);
    if (dateMapping && dateMapping.directQuery) {
      return await handleDirectProgressDateQuery(req, {
        domain,
        dateConditions: dateMapping.dateConditions,
        stages: dateMapping.stages,
        originalQuery,
      });
    }
  }

  // Determine default sort field based on has_progress stage for Offer model
  // Sort by the stage's completed_at date instead of createdAt for better UX
  const getDefaultSortField = (progressStage, model) => {
    if (model !== 'Offer') return 'createdAt';
    
    const stageToSortField = {
      opening: 'progression.opening.completed_at',
      confirmation: 'progression.confirmation.completed_at',
      payment: 'progression.payment.completed_at',
      netto1: 'progression.netto1.completed_at',
      netto2: 'progression.netto2.completed_at',
      netto: 'progression.netto1.completed_at',
      lost: 'progression.lost.marked_at',
    };
    return stageToSortField[progressStage] || 'createdAt';
  };

  // Use requested sortBy if provided, otherwise use stage-specific default
  const sortBy = requestedSortBy || getDefaultSortField(has_progress, modelName);
  
  // Ensure sortBy is always a valid string (fallback to 'createdAt' if somehow null/undefined)
  const validSortBy = (sortBy && typeof sortBy === 'string') ? sortBy : 'createdAt';
  const validSortOrder = (sortOrder && typeof sortOrder === 'string') ? sortOrder : 'desc';
  
  logger.info(`Filtering: ${modelName}`, { domain, page, limit, sortBy: validSortBy, sortOrder: validSortOrder });
  
  // Call search service
  const orderByValue = `${validSortBy} ${validSortOrder}`;
  logger.info('Calling search service', { modelName, orderBy: orderByValue, domain: domain.length });
  
  const requestedPage = parseInt(page) || 1;
  const limitValue = parseInt(limit) || 50;
  
  let response = await axios.post(`${SEARCH_SERVICE_URL}/api/search`, {
    model: modelName,
    domain,
    limit: limitValue,
    offset: (requestedPage - 1) * limitValue,
    orderBy: orderByValue
  }, {
    headers: {
      Authorization: req.headers.authorization
    }
  });
  
  let enrichedData = response.data.data;
  const meta = response.data.meta || {};
  const total = meta.total || 0;
  
  // Normalize page: if requested page exceeds available pages, re-query with last valid page
  const paginationInfo = normalizePagination(requestedPage, total, limitValue);
  let normalizedPage = paginationInfo.page;
  
  if (paginationInfo.adjusted && total > 0) {
    logger.info(`Page ${requestedPage} exceeds available pages (${paginationInfo.pages}), re-querying with page ${normalizedPage}`);
    
    // Re-query with the correct offset
    response = await axios.post(`${SEARCH_SERVICE_URL}/api/search`, {
      model: modelName,
      domain,
      limit: limitValue,
      offset: paginationInfo.offset,
      orderBy: orderByValue
    }, {
      headers: {
        Authorization: req.headers.authorization
      }
    });
    
    enrichedData = response.data.data;
  }
  
  // Log first few expected_revenue values to verify sort order from search service
  if (modelName === 'Lead' && sortBy === 'expected_revenue' && enrichedData.length > 0) {
    const firstFewRevenues = enrichedData.slice(0, 5).map(l => l.expected_revenue);
    logger.info('Search service returned leads (first 5 expected_revenue)', { revenues: firstFewRevenues });
  }
  
  // Apply population to ensure consistent response structure with baseline queries
  if (enrichedData.length > 0) {
    if (modelName === 'Lead') {
      // Lead has special enrichment with nested data
      const leadIds = enrichedData.map(l => l._id);
      enrichedData = await fetchFullLeadsWithNesting(leadIds, req.user);
    } else if (modelName === 'Offer') {
      // Offer has special enrichment with todoCount
      const offerIds = enrichedData.map(o => o._id);
      enrichedData = await fetchFullOffersWithNesting(offerIds);
      
      // Apply lead masking to offer.lead_id for non-admin users
      const user = req.user;
      if (user && enrichedData.length > 0) {
        enrichedData = enrichedData.map(offer => {
          if (offer.lead_id && typeof offer.lead_id === 'object') {
            return {
              ...offer,
              lead_id: applyLeadMasking(offer.lead_id, user, false) // isDetailApi = false for list
            };
          }
          return offer;
        });
      }
    } else {
      // For other models, use universal population
      const ids = enrichedData.map(doc => doc._id);
      const populated = await populateModelResults(modelName, ids);
      if (populated) {
        enrichedData = populated;
      }
      if (modelName === 'ClosedLead' && enrichedData.length > 0) {
        enrichedData = await enrichClosedLeadsWithCurrentStatus(enrichedData);
        enrichedData = attachClosedLeadSourceAliases(enrichedData);
      }
    }
  }

  return {
    success: true,
    data: enrichedData,
    meta: {
      total: total,
      page: normalizedPage,
      limit: limitValue,
      pages: paginationInfo.pages,
      offset: paginationInfo.offset,
    }
  };
}

async function handleGroupingWithExpansion(req, { modelName, groupBy, domain, originalQuery }) {
  const { page = 1, limit = 10 } = originalQuery;
  
  logger.info(`Grouping with expansion: ${modelName}`, { groupBy, limit });
  
  // Call search service for grouping
  // Skip includeIds for multi-level grouping (nested structure discards _recordIds, uses domain instead)
  const isMultilevel = groupBy && groupBy.length > 1;
  const response = await axios.post(`${SEARCH_SERVICE_URL}/api/search`, {
    model: modelName,
    domain,
    groupBy,
    includeIds: !isMultilevel
  }, {
    headers: {
      Authorization: req.headers.authorization
    }
  });
  
  /**
   * Generate a deterministic ObjectId for "None" groups (null values)
   * Uses the same algorithm as search service: seed = level === 0 ? field : `${field}_level_${level}`
   * For None groups, field should be passed as `${field}_none`
   * @param {string} field - The grouping field name (should be `${field}_none` for None groups)
   * @param {number} level - The grouping level (optional, for multilevel grouping)
   * @returns {mongoose.Types.ObjectId} - Deterministic ObjectId
   */
  const generateNoneGroupId = (field, level = 0) => {
    // Match search service algorithm exactly: seed = level === 0 ? field : `${field}_level_${level}`
    const seed = level === 0 ? field : `${field}_level_${level}`;
    const hash = crypto.createHash('md5').update(seed).digest('hex');
    const objectIdHex = hash.substring(0, 24);

    try {
      return new mongoose.Types.ObjectId(objectIdHex);
    } catch (error) {
      const fallbackSeed = `${field}_${level}`.padEnd(24, '0').substring(0, 24);
      return new mongoose.Types.ObjectId(fallbackSeed);
    }
  };
  
  // Expand each group (ensure data is array)
  const groups = Array.isArray(response.data?.data) ? response.data.data : [];
  const expandedGroups = await Promise.all(
    groups.map(async (group) => {
      // Fix null groupId for "None" groups
      // Use the same format as search service: `${field}_none` for level 0
      let groupId = group.groupId;
      if ((groupId === null || groupId === undefined) && (group.groupName === 'None' || group.groupName === null)) {
        const field = group.fieldName || (groupBy && groupBy.length > 0 ? groupBy[0] : 'unknown');
        // Match search service format: for None groups, use `${field}_none` as the seed
        const noneField = `${field}_none`;
        groupId = generateNoneGroupId(noneField, 0);
        logger.info(`Generated groupId for null group in expansion: ${field} -> ${groupId}`);
      }
      
      const recordIds = group._recordIds || [];
      
      if (recordIds.length === 0) {
        return {
          groupId: groupId,
          groupName: group.groupName || 'Unknown',
          fieldName: group.fieldName,
          count: group.count,
          records: []
        };
      }
      
      const limitedIds = recordIds.slice(0, parseInt(limit) || 10);

      let records;
      if (modelName === 'Lead') {
        records = await fetchFullLeadsWithNesting(limitedIds, req.user);
      } else {
        const normalizedIds = limitedIds.map(id => {
          if (id instanceof mongoose.Types.ObjectId) return id;
          try { return new mongoose.Types.ObjectId(id); } catch (e) { return null; }
        }).filter(Boolean);
        const Model = mongoose.models[modelName] || mongoose.model(modelName);
        records = normalizedIds.length > 0
          ? await Model.find({ _id: { $in: normalizedIds } }).lean()
          : [];
      }
      
      return {
        groupId: groupId,
        groupName: group.groupName || 'Unknown',
        fieldName: group.fieldName,
        count: group.count,
        totalInGroup: recordIds.length,
        records,
        hasMore: recordIds.length > (parseInt(limit) || 10)
      };
    })
  );

  // Apply permission-based masking to groupName for email_from/phone (mirrors list view)
  if (modelName === 'Lead' && req.user) {
    applyGroupNameMasking(expandedGroups, req.user);
  }
  // Format duplicate_status group names: 0→New, 1→10 Week Duplicate, 2→Duplicate
  if (modelName === 'Lead') {
    applyDuplicateStatusGroupNameFormatting(expandedGroups);
  }
  
  return {
    success: true,
    grouped: true,
    expanded: true,
    data: expandedGroups,
    meta: {
      totalGroups: expandedGroups.length,
      limitPerGroup: parseInt(limit)
    }
  };
}

async function fetchFullLeadsWithNesting(leadIds, user) {
  try {
    // CRITICAL: Normalize leadIds to ObjectIds to ensure proper matching in queries
    // This is especially important when IDs come from search service as strings
    const normalizedLeadIds = leadIds.map(id => {
      if (id instanceof mongoose.Types.ObjectId) {
        return id;
      }
      try {
        return new mongoose.Types.ObjectId(id);
      } catch (error) {
        logger.warn(`Invalid lead ID format: ${id}`, error);
        return id; // Return as-is if conversion fails
      }
    }).filter(Boolean);
    
    // CRITICAL: Create a map to preserve order BEFORE fetching
    // This ensures we can restore the exact order from leadIds after all processing
    const orderMap = new Map();
    leadIds.forEach((id, index) => {
      orderMap.set(id.toString(), index);
    });
    
    // Fetch leads with all necessary fields for population
    const leads = await Lead.find({ _id: { $in: normalizedLeadIds } })
      .select('_id contact_name email_from secondary_email phone lead_source_no expected_revenue offer_calls status stage use_status duplicate_status assigned_date active createdAt updatedAt source_id user_id stage_id status_id lead_date prev_user_id prev_team_id source_agent source_project team_id')
      .lean();
    
    if (leads.length === 0) {
      return [];
    }
    
    // CRITICAL: Sort leads by the original order BEFORE processing
    // MongoDB's $in operator doesn't guarantee order, so we need to sort immediately
    leads.sort((a, b) => {
      const indexA = orderMap.get(a._id.toString()) ?? Infinity;
      const indexB = orderMap.get(b._id.toString()) ?? Infinity;
      return indexA - indexB;
    });
    
    // Populate reference fields: source_id, user_id, prev_user_id, prev_team_id, source_agent, source_project
    // Note: source_agent and source_project are the actual schema fields (renamed from source_user_id and source_team_id)
    await hydrateLeadReferences(leads);
    
    const {
      assignments,
      assignmentHistory,
      offers,
      openings,
      confirmations,
      paymentVouchers,
      appointments,
      stageMap,
      statusMap
    } = await fetchLeadRelatedData(normalizedLeadIds);
    
    const lookupMaps = createLookupMaps(
      assignments,
      assignmentHistory,
      offers,
      openings,
      confirmations,
      paymentVouchers,
      appointments
    );
    
    const processedLeads = processLeadsWithRelatedData(
      leads,
      lookupMaps,
      stageMap,
      statusMap,
      true,
      user,
      null,
      new Set()
    );
    
    // CRITICAL: Ensure processedLeads maintains order
    // Create a map to preserve order after processing
    const processedMap = new Map();
    processedLeads.forEach(lead => {
      processedMap.set(lead._id.toString(), lead);
    });
    
    // Re-sort processedLeads to maintain original order
    const sortedProcessedLeads = leadIds
      .map(id => processedMap.get(id.toString()))
      .filter(Boolean);
    
    // CRITICAL: Use normalizedLeadIds for Todo aggregation to ensure proper ObjectId matching
    // Only count pending todos (isDone must be explicitly false)
    // Note: MongoDB's isDone: false will only match documents where isDone is explicitly false,
    // it will NOT match null, undefined, or true values
    const todoCountResults = await Todo.aggregate([
      { 
        $match: { 
          lead_id: { $in: normalizedLeadIds }, 
          active: true, 
          isDone: false // Only count pending todos (excludes done, null, and undefined)
        } 
      },
      { $group: { _id: '$lead_id', todoCount: { $sum: 1 } } }
    ]);
    
    const todoCountMap = new Map(
      todoCountResults.map(r => [r._id.toString(), r.todoCount])
    );
    
    const leadsWithTodoCounts = sortedProcessedLeads.map(lead => ({
      ...lead,
      todoCount: todoCountMap.get(lead._id.toString()) || 0
    }));
    
    // Return leads in the same order as leadIds (which preserves search service sort order)
    return leadsWithTodoCounts;
    
  } catch (error) {
    logger.error('Error fetching nested lead data:', error);
    // Even in error case, preserve order and normalize IDs
    const normalizedLeadIds = leadIds.map(id => {
      if (id instanceof mongoose.Types.ObjectId) {
        return id;
      }
      try {
        return new mongoose.Types.ObjectId(id);
      } catch (e) {
        return id;
      }
    }).filter(Boolean);
    const errorLeads = await Lead.find({ _id: { $in: normalizedLeadIds } }).lean();
    const errorMap = new Map();
    errorLeads.forEach(lead => {
      errorMap.set(lead._id.toString(), lead);
    });
    return leadIds.map(id => errorMap.get(id.toString())).filter(Boolean);
  }
}

async function fetchFullOffersWithNesting(offerIds) {
  try {
    // Fetch offers with populated fields
    const offers = await DocumentManager.populateOfferQuery(
      Offer.find({ _id: { $in: offerIds } })
    )
      .populate('created_by', 'login first_name last_name')
      .lean({ virtuals: true });
    
    if (offers.length === 0) {
      return [];
    }
    
    // Populate bank providers (handle cases where provider is still an ID string)
    const offersWithProviders = await populateBankProviders(offers);

    // Populate documents using DocumentManager (hybrid system: reverse + forward references)
    // This ensures grouped/filtered queries return files just like regular queries
    let offersWithDocs = offersWithProviders;
    if (offerIds.length > 0) {
      const documentsByOffer = await DocumentManager.populateMultipleOfferDocuments(offersWithProviders, offerIds);
      // Attach populated documents to offers
      offersWithDocs = offersWithProviders.map((offer) => {
        const offerId = offer._id.toString();
        return {
          ...offer,
          files: documentsByOffer[offerId] || [],
        };
      });
    }

    // Populate document_slots (documents and emails) - modifies offersWithDocs in place
    offersWithDocs = await DocumentManager.populateDocumentSlotsForOffers(offersWithDocs);

    // Create a map for quick lookup and preserve original order from offerIds
    const offerMap = new Map();
    offersWithDocs.forEach(offer => {
      offerMap.set(offer._id.toString(), offer);
    });

    // Fetch todo counts for all leads associated with these offers
    const leadIds = offersWithDocs
      .map(offer => offer.lead_id?._id || offer.lead_id)
      .filter(Boolean);

    let todoCountMap = new Map();
    if (leadIds.length > 0) {
      // CRITICAL: Normalize leadIds to ObjectIds to ensure proper matching in Todo aggregation
      const normalizedLeadIds = leadIds.map(id => {
        if (id instanceof mongoose.Types.ObjectId) {
          return id;
        }
        try {
          return new mongoose.Types.ObjectId(id);
        } catch (error) {
          logger.warn(`Invalid lead ID format in offer: ${id}`, error);
          return id; // Return as-is if conversion fails
        }
      }).filter(Boolean);

      // Only count pending todos (isDone must be explicitly false)
      // Note: MongoDB's isDone: false will only match documents where isDone is explicitly false,
      // it will NOT match null, undefined, or true values
      const todoCountResults = await Todo.aggregate([
        {
          $match: {
            lead_id: { $in: normalizedLeadIds },
            active: true,
            isDone: false, // Only count pending todos (excludes done, null, and undefined)
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
      for (const result of todoCountResults) {
        const leadId = result._id?.toString();
        if (leadId) {
          todoCountMap.set(leadId, result.todoCount);
        }
      }
    }

    // Fetch color_codes for all agents to ensure they're always available
    const agentColorCodeMap = await fetchAgentColorCodes(offersWithDocs);
    
    // Return offers in original order from offerIds (preserves sort order from search service)
    return offerIds.map(id => {
      const offer = offerMap.get(id.toString());
      if (!offer) return null;
      const leadId = offer.lead_id?._id?.toString() || offer.lead_id?.toString();
      const todoCount = leadId ? (todoCountMap.get(leadId) || 0) : 0;
      
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
        ...offer,
        agent_id: agentIdWithColorCode,
        todoCount: todoCount,
        // Set default value for load_and_opening if not present or null
        load_and_opening: offer.load_and_opening ?? 'opening',
      };
    }).filter(Boolean); // Filter out any null entries
    
  } catch (error) {
    logger.error('Error fetching nested offer data:', error);
    return await Offer.find({ _id: { $in: offerIds } }).lean();
  }
}

/**
 * Populate reference field names for groups (e.g., team_id -> project name)
 * @param {Array} groups - Array of groups to populate
 * @param {string} fieldName - Field name (e.g., 'team_id')
 * @param {Array} allOtherFields - All other fields in groupBy (for context)
 * @returns {Promise<void>}
 */
async function populateReferenceFieldNames(groups, fieldName, allOtherFields = []) {
  logger.info(`[NAME POPULATION] populateReferenceFieldNames START for field: ${fieldName}, groups.length: ${groups?.length || 0}`);
  
  if (!groups || groups.length === 0) {
    logger.warn(`[NAME POPULATION] No groups provided for field ${fieldName}, skipping`);
    return;
  }
  
  // Map field name to actual schema field name
  // Frontend might send: "project", "agent" 
  // Schema fields are: "team_id", "user_id"
  // GroupIds use: the original fieldName from groupBy
  const leadSchema = Lead.schema;
  
  // Field name mappings (frontend/groupBy field name -> schema field name)
  const fieldMappings = {
    'agent_id': 'user_id',
    'project_id': 'team_id',
    'agent': 'user_id',      // Frontend might send "agent"
    'project': 'team_id'      // Frontend might send "project"
  };
  
  // Special fields that are references but don't have ref in schema
  const specialReferenceFields = {
    'status_id': 'Status',
    'stage_id': 'Stage'
  };
  
  // Try to find the field in schema
  let schemaPath = leadSchema.path(fieldName);
  let actualFieldName = fieldName;
  let refCollection = null;
  
  // If not found, try mappings
  if (!schemaPath && fieldMappings[fieldName]) {
    actualFieldName = fieldMappings[fieldName];
    schemaPath = leadSchema.path(actualFieldName);
  }
  
  // Check if it's a special reference field (status_id, stage_id)
  if (specialReferenceFields[fieldName]) {
    refCollection = specialReferenceFields[fieldName];
    logger.info(`Field ${fieldName} is a special reference field pointing to ${refCollection}`);
  } else if (schemaPath && schemaPath.options && schemaPath.options.ref) {
    // Standard reference field with ref in schema
    refCollection = schemaPath.options.ref;
  } else {
    // Not a reference field, skip
    logger.debug(`Field ${fieldName} (checked as ${actualFieldName}) is not a reference field, skipping name population`);
    return;
  }
  
  if (!refCollection) {
    logger.warn(`Could not determine refCollection for field ${fieldName}`);
    return;
  }
  logger.info(`Populating ${refCollection} names for field ${fieldName} (schema field: ${actualFieldName})`);
  
  // Use the original fieldName for groupId matching (since groupIds use groupBy field names)
  // but use actualFieldName for schema lookups
  
  // Extract all ObjectIds from groupIds
  const referenceIds = [];
  const groupIdToGroupMap = new Map();
  
  function extractIds(groupsArray) {
    logger.info(`[EXTRACT IDS] Processing ${groupsArray.length} groups for field ${fieldName}`);
    groupsArray.forEach(group => {
      logger.debug(`[EXTRACT IDS] Checking group: fieldName=${group.fieldName}, groupId=${group.groupId}, target fieldName=${fieldName}`);
      
      // Check if this group matches the field we're looking for
      // fieldName might be "user_id" but group.fieldName might also be "user_id"
      if (group.groupId && group.fieldName === fieldName) {
        // Only extract IDs for groups that match this field
        const groupIdStr = group.groupId.toString();
        const normalizedFieldName = fieldName.replace(/\./g, '_').replace(/:/g, '_');
        
        logger.info(`[EXTRACT IDS] Extracting ObjectId for field ${fieldName} from groupId: ${groupIdStr}`);
        
        // Split groupId to find the field and its value
        // Format: "team_id_xxx" or "team_id_xxx_user_id_yyy"
        // When split: ["team", "id", "xxx"] or ["team", "id", "xxx", "user", "id", "yyy"]
        const parts = groupIdStr.split('_');
        let objectIdStr = null;
        
        // Look for the field name in the parts array
        // Field names like "team_id" or "user_id" are split into ["team", "id"] or ["user", "id"]
        for (let i = 0; i < parts.length - 1; i++) {
          let fieldMatch = false;
          let matchedEndIndex = i;
          
          // Try to match the normalized field name by combining parts
          let combinedPart = parts[i];
          
          // First try exact single-part match
          if (combinedPart === normalizedFieldName) {
            fieldMatch = true;
          } else {
            // Try combining with next parts to match field name
            // e.g., "user" + "_" + "id" = "user_id"
            for (let j = i + 1; j < parts.length; j++) {
              combinedPart += '_' + parts[j];
              if (combinedPart === normalizedFieldName) {
                fieldMatch = true;
                matchedEndIndex = j;
                break;
              }
              // If combined part is longer than field name, stop trying
              if (combinedPart.length > normalizedFieldName.length) {
                break;
              }
            }
          }
          
          if (fieldMatch && matchedEndIndex + 1 < parts.length) {
            // The part after the matched field name should be the ObjectId
            const potentialId = parts[matchedEndIndex + 1];
            if (/^[a-f0-9]{24}$/i.test(potentialId)) {
              objectIdStr = potentialId;
              logger.debug(`Found ObjectId ${objectIdStr} for field ${fieldName} in compound groupId at position ${matchedEndIndex + 1}`);
              break;
            }
          }
        }
        
        // Fallback 1: try direct prefix match
        if (!objectIdStr) {
          const fieldPrefix = `${normalizedFieldName}_`;
          if (groupIdStr.startsWith(fieldPrefix)) {
            let valueStr = groupIdStr.substring(fieldPrefix.length);
            const objectIdMatch = valueStr.match(/^([a-f0-9]{24})/i);
            if (objectIdMatch) {
              objectIdStr = objectIdMatch[1];
              logger.debug(`Found ObjectId ${objectIdStr} for field ${fieldName} using prefix match`);
            }
          }
        }
        
        // Fallback 2: if groupId is just an ObjectId (24 hex chars), use it directly
        if (!objectIdStr && /^[a-f0-9]{24}$/i.test(groupIdStr)) {
          objectIdStr = groupIdStr;
          logger.debug(`Using groupId directly as ObjectId: ${objectIdStr}`);
        }
        
        if (objectIdStr) {
          try {
            const objId = new mongoose.Types.ObjectId(objectIdStr);
            referenceIds.push(objId);
            if (!groupIdToGroupMap.has(groupIdStr)) {
              groupIdToGroupMap.set(groupIdStr, []);
            }
            groupIdToGroupMap.get(groupIdStr).push(group);
            logger.debug(`Successfully extracted ObjectId ${objectIdStr} for field ${fieldName} from groupId ${groupIdStr}`);
          } catch (e) {
            logger.warn(`Failed to parse ObjectId from groupId: ${groupIdStr}`, e);
          }
        } else {
          logger.warn(`Could not extract ObjectId from groupId: ${groupIdStr} for field: ${fieldName}, group.fieldName: ${group.fieldName}`);
        }
      }
      
      // Recursively process subgroups
      if (group.subGroups && Array.isArray(group.subGroups)) {
        logger.debug(`[EXTRACT IDS] Recursively processing ${group.subGroups.length} subgroups`);
        extractIds(group.subGroups);
      }
    });
  }
  
  logger.info(`[EXTRACT IDS] Starting extraction for field ${fieldName} from ${groups.length} top-level groups`);
  extractIds(groups);
  
  if (referenceIds.length === 0) {
    logger.debug(`No reference IDs found for field ${fieldName}`);
    return;
  }
  
  // Remove duplicates
  const uniqueIds = [...new Set(referenceIds.map(id => id.toString()))].map(id => new mongoose.Types.ObjectId(id));
  
  try {
    // Fetch reference documents
    let RefModel;
    let selectFields;
    
    if (refCollection === 'Team') {
      RefModel = Team;
      selectFields = '_id name';
    } else if (refCollection === 'User') {
      RefModel = User;
      selectFields = '_id login';
    } else if (refCollection === 'Source') {
      RefModel = Source;
      selectFields = '_id name';
    } else if (refCollection === 'Status') {
      // Status is stored in Settings collection with type: 'stage'
      // Status IDs are in info.statuses array
      // We'll query Settings collection directly
      RefModel = null; // Special handling needed
      selectFields = '_id name';
    } else if (refCollection === 'Stage') {
      // Stage is stored in Settings collection with type: 'stage'
      // Stage _id matches the document _id
      // We'll query Settings collection directly
      RefModel = null; // Special handling needed
      selectFields = '_id name';
    } else {
      // Try to get model from mongoose
      RefModel = mongoose.models[refCollection];
      selectFields = '_id name login';
    }
    
    let refDocs = [];
    
    if (refCollection === 'Status' || refCollection === 'Stage') {
      // Special handling for Status and Stage - query Settings collection
      logger.info(`Fetching ${refCollection} documents from Settings collection for ${uniqueIds.length} IDs: ${uniqueIds.slice(0, 3).map(id => id.toString()).join(', ')}...`);
      
      try {
        // Get Settings model or create a temporary one
        let SettingsModel = mongoose.models['Settings'];
        if (!SettingsModel) {
          const SettingsSchema = new mongoose.Schema({}, { collection: 'settings', strict: false });
          SettingsModel = mongoose.model('Settings', SettingsSchema);
        }
        
        if (refCollection === 'Stage') {
          // For Stage: query Settings where type='stage' and _id matches
          const settingsDocs = await SettingsModel.find({ 
            type: 'stage',
            _id: { $in: uniqueIds }
          }).lean();
          
          refDocs = settingsDocs.map(doc => ({
            _id: doc._id,
            name: doc.name || 'Unknown Stage'
          }));
        } else if (refCollection === 'Status') {
          // For Status: query Settings where type='stage' and find status in info.statuses array
          // We need to get all stages and filter manually since MongoDB $in doesn't work well with nested arrays
          const settingsDocs = await SettingsModel.find({ 
            type: 'stage'
          }).lean();
          
          // Extract statuses from the nested array that match our IDs
          const statusMap = new Map();
          const uniqueIdStrings = uniqueIds.map(id => id.toString());
          
          settingsDocs.forEach(stageDoc => {
            if (stageDoc.info && stageDoc.info.statuses && Array.isArray(stageDoc.info.statuses)) {
              stageDoc.info.statuses.forEach(status => {
                // Handle both ObjectId and string formats
                let statusId = null;
                if (status._id) {
                  statusId = status._id.toString ? status._id.toString() : status._id;
                } else if (status.id) {
                  statusId = status.id.toString ? status.id.toString() : status.id;
                }
                
                if (statusId && uniqueIdStrings.includes(statusId)) {
                  // Use the original ObjectId format for matching
                  const matchingId = uniqueIds.find(id => id.toString() === statusId);
                  if (matchingId) {
                    statusMap.set(statusId, {
                      _id: matchingId, // Use the original ObjectId from uniqueIds
                      name: status.name || 'Unknown Status'
                    });
                  }
                }
              });
            }
          });
          
          refDocs = Array.from(statusMap.values());
        }
        
        logger.info(`Fetched ${refDocs.length} ${refCollection} documents from Settings collection`);
      } catch (error) {
        logger.error(`Error fetching ${refCollection} from Settings collection:`, error);
        return;
      }
    } else {
      if (!RefModel) {
        logger.warn(`Model ${refCollection} not found for field ${fieldName}`);
        return;
      }
      
      logger.info(`Fetching ${refCollection} documents for ${uniqueIds.length} IDs: ${uniqueIds.slice(0, 3).map(id => id.toString()).join(', ')}...`);
      
      refDocs = await RefModel.find({ _id: { $in: uniqueIds } })
        .select(selectFields)
        .lean();
      
      logger.info(`Fetched ${refDocs.length} ${refCollection} documents`);
    }
    
    // Create name map
    const nameMap = new Map();
    refDocs.forEach(doc => {
      const id = doc._id.toString();
      let name = 'Unknown';
      
      if (refCollection === 'Team') {
        name = doc.name || 'Unknown Project';
      } else if (refCollection === 'User') {
        name = doc.login || 'Unknown User';
      } else if (refCollection === 'Source') {
        name = doc.name || 'Unknown Source';
      } else if (refCollection === 'Status' || refCollection === 'Stage') {
        name = doc.name || 'Unknown';
      } else {
        name = doc.name || doc.login || 'Unknown';
      }
      
      nameMap.set(id, name);
      logger.debug(`Mapped ${refCollection} ID ${id} -> name: "${name}"`);
    });
    
    logger.info(`Created nameMap with ${nameMap.size} entries for ${refCollection}`);
    
            // Update group names recursively
            function updateGroupNames(groupsArray) {
                groupsArray.forEach(group => {
                    // Check if this group matches the field we're populating
                    if (group.fieldName === fieldName && group.groupId) {
                        const groupIdStr = group.groupId.toString();
                        const normalizedFieldName = fieldName.replace(/\./g, '_').replace(/:/g, '_');
                        
                        logger.debug(`Updating groupName for field ${fieldName}, groupId: ${groupIdStr}, current groupName: ${group.groupName}`);
                        
                        // Extract ObjectId from groupId
                        // Format can be: "field_id" or "field1_id1_field2_id2_..."
                        let objectIdStr = null;
                        
                        // Split groupId by underscores to find field and its value
                        // Format: "team_id_xxx" or "team_id_xxx_user_id_yyy"
                        // When split: ["team", "id", "xxx"] or ["team", "id", "xxx", "user", "id", "yyy"]
                        const parts = groupIdStr.split('_');
                        
                        // Look for the field name in the parts array
                        // Field names like "team_id" or "user_id" are split into ["team", "id"] or ["user", "id"]
                        for (let i = 0; i < parts.length - 1; i++) {
                            let fieldMatch = false;
                            let matchedEndIndex = i;
                            
                            // Try to match the normalized field name by combining parts
                            // Start with single part, then try combinations
                            let combinedPart = parts[i];
                            
                            // First try exact single-part match
                            if (combinedPart === normalizedFieldName) {
                                fieldMatch = true;
                            } else {
                                // Try combining with next parts to match field name
                                // e.g., "user" + "_" + "id" = "user_id"
                                for (let j = i + 1; j < parts.length; j++) {
                                    combinedPart += '_' + parts[j];
                                    if (combinedPart === normalizedFieldName) {
                                        fieldMatch = true;
                                        matchedEndIndex = j;
                                        break;
                                    }
                                    // If combined part is longer than field name, stop trying
                                    if (combinedPart.length > normalizedFieldName.length) {
                                        break;
                                    }
                                }
                            }
                            
                            if (fieldMatch && matchedEndIndex + 1 < parts.length) {
                                // The part after the matched field name should be the ObjectId
                                const potentialId = parts[matchedEndIndex + 1];
                                if (/^[a-f0-9]{24}$/i.test(potentialId)) {
                                    objectIdStr = potentialId;
                                    logger.debug(`Found ObjectId ${objectIdStr} for field ${fieldName} in updateGroupNames at position ${matchedEndIndex + 1}`);
                                    break;
                                }
                            }
                        }
                        
                        // Fallback 1: try direct prefix match
                        if (!objectIdStr) {
                            const fieldPrefix = `${normalizedFieldName}_`;
                            if (groupIdStr.startsWith(fieldPrefix)) {
                                let valueStr = groupIdStr.substring(fieldPrefix.length);
                                const objectIdMatch = valueStr.match(/^([a-f0-9]{24})/i);
                                if (objectIdMatch) {
                                    objectIdStr = objectIdMatch[1];
                                    logger.debug(`Found ObjectId ${objectIdStr} using prefix match in updateGroupNames`);
                                }
                            }
                        }
                        
                        // Fallback 2: if groupId is just an ObjectId (24 hex chars), use it directly
                        if (!objectIdStr && /^[a-f0-9]{24}$/i.test(groupIdStr)) {
                            objectIdStr = groupIdStr;
                            logger.debug(`Using groupId directly as ObjectId in updateGroupNames: ${objectIdStr}`);
                        }
                        
                        if (objectIdStr) {
                            const name = nameMap.get(objectIdStr);
                            if (name) {
                                const oldName = group.groupName;
                                group.groupName = name;
                                logger.info(`Updated groupName for ${fieldName}: ${groupIdStr} (ObjectId: ${objectIdStr}) -> "${oldName}" -> "${name}"`);
                            } else {
                                logger.warn(`No name found for ObjectId ${objectIdStr} in ${refCollection} collection. nameMap has ${nameMap.size} entries. Available IDs: ${Array.from(nameMap.keys()).slice(0, 5).join(', ')}...`);
                            }
                        } else {
                            logger.warn(`Could not extract ObjectId from groupId: ${groupIdStr} for field: ${fieldName}, group.fieldName: ${group.fieldName}`);
                        }
                    }
                    
                    // Recursively update subgroups
                    if (group.subGroups && Array.isArray(group.subGroups)) {
                        logger.debug(`[UPDATE NAMES] Recursively processing ${group.subGroups.length} subgroups`);
                        updateGroupNames(group.subGroups);
                    }
                });
            }
            
            logger.info(`[UPDATE NAMES] Starting name update for field ${fieldName} from ${groups.length} top-level groups, nameMap size: ${nameMap.size}`);
            updateGroupNames(groups);
    
    logger.info(`Populated ${nameMap.size} reference names for field ${fieldName}`);
  } catch (error) {
    logger.error(`Error populating reference field names for ${fieldName}:`, error);
  }
}

module.exports = universalQueryMiddleware;

