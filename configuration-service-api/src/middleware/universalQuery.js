/**
 * Universal Query Middleware - Configuration Service
 *
 * Enables domain filtering and grouping for configuration queries
 * by proxying to the centralized search-service.
 *
 * Usage:
 * GET /banks?domain=[["active","=",true]]
 * GET /banks?state=active
 * GET /sources?domain=[["name","ilike","test"]]
 * GET /sources?search=test&showInactive=true
 * GET /projects?domain=[["active","=",true]]&groupBy=["type"]
 */

const axios = require('axios');
const mongoose = require('mongoose');
const crypto = require('crypto');
const logger = require('../utils/logger');
const documentClient = require('../services/documentClient');
const Bank = require('../models/Bank');
const { Settings } = require('../models/Settings');

const SEARCH_SERVICE_URL = process.env.SEARCH_SERVICE_URL || 'http://search-service:3010';

const ROUTE_MODEL_MAP = {
  '/banks': 'Bank',
  '/sources': 'Source',
  '/projects': 'Project',
  '/assignments': 'Assignment',
  '/column-preference': 'ColumnPreference',
  '/closed-leads': 'ClosedLead',
};

/**
 * Population configuration for each model to ensure consistent response structure
 */
const MODEL_POPULATION_CONFIG = {
  Bank: [
    { path: 'projects', select: 'name' }
  ],
  Source: [
    { path: 'provider_id', select: 'login' }
  ],
  Project: [
    { path: 'created_by', select: 'login' },
    { path: 'mailserver_id', select: 'name info' },
    { path: 'voipserver_id', select: 'name' },
    { path: 'mailservers', select: 'name info' },
    { path: 'agents.mailservers', select: 'name info' }
  ],
  Assignment: [
    { path: 'lead_id', select: 'contact_name lead_source_no' },
    { path: 'project_id', select: 'name' },
    { path: 'user_id', select: 'login' },
    { path: 'assigned_by', select: 'login' }
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
 * Predefined filter parameters for each model
 * Maps query parameter names to field names and operators
 */
const PREDEFINED_FILTERS = {
  Bank: {
    state: { field: 'state', operator: '=' },
    status: { field: 'state', operator: '=' },  // alias for state
    search: { field: 'name', operator: 'ilike' },
    project_id: { field: 'project_id', operator: '=' },
  },
  Source: {
    search: { field: 'name', operator: 'ilike' },
    provider_id: { field: 'provider_id', operator: '=' },
    active: { field: 'active', operator: '=', transform: v => v === 'true' || v === true },
    showInactive: { field: 'active', operator: '=', transform: v => !(v === 'true' || v === true) },
  },
  Project: {
    search: { field: 'name', operator: 'ilike' },
    active: { field: 'active', operator: '=', transform: v => v === 'true' || v === true },
    showInactive: { field: 'active', operator: '=', transform: v => !(v === 'true' || v === true) },
  },
  Assignment: {
    project_id: { field: 'project_id', operator: '=' },
    user_id: { field: 'user_id', operator: '=' },
    lead_id: { field: 'lead_id', operator: '=' },
    status: { field: 'status', operator: '=' },
  },
  ClosedLead: {
    closed_project_id: { field: 'closed_project_id', operator: '=' },
    project_id: { field: 'team_id', operator: '=' },
    team_id: { field: 'team_id', operator: '=' },
    user_id: { field: 'user_id', operator: '=' },
    agent_id: { field: 'user_id', operator: '=' },
    source_id: { field: 'source_id', operator: '=' },
    closeLeadStatus: { field: 'closeLeadStatus', operator: '=' },
    is_reverted: { field: 'is_reverted', operator: '=', transform: v => v === 'true' || v === true },
    use_status: { field: 'use_status', operator: '=' },
    search: { field: '_search', operator: 'search', searchFields: ['contact_name', 'email_from', 'phone', 'lead_source_no'] },
    // Same logical fields as Lead API names; stored as source_user_id / source_team_id on ClosedLead
    source_agent: { field: 'source_user_id', operator: '=' },
    source_project: { field: 'source_team_id', operator: '=' },
  },
};

/**
 * Check if request has predefined filters
 */
function hasPredefinedFilters(query, modelName) {
  const modelFilters = PREDEFINED_FILTERS[modelName];
  if (!modelFilters) return false;

  return Object.keys(modelFilters).some(key => {
    const value = query[key];
    return value !== undefined && value !== null && value !== '';
  });
}

/**
 * Convert predefined filters to domain conditions
 */
async function convertPredefinedFilters(query, modelName) {
  const modelFilters = PREDEFINED_FILTERS[modelName];
  if (!modelFilters) return [];
  
  const conditions = [];
  
  for (const [paramName, config] of Object.entries(modelFilters)) {
    const value = query[paramName];
    // Skip undefined, null, or empty string values (for search filters)
    if (value !== undefined && value !== null && value !== '') {
      if (config.operator === 'search') {
        const searchTerm = String(value).trim();
        if (!searchTerm) continue;

        const Model = getModelClass(modelName);
        if (!Model || !Array.isArray(config.searchFields) || config.searchFields.length === 0) {
          // Fallback to plain ilike if model/search config is unavailable
          conditions.push([config.field, 'ilike', searchTerm]);
          continue;
        }

        const sanitizedSearch = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const searchRegex = { $regex: sanitizedSearch, $options: 'i' };
        const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(searchTerm);

        const orConditions = config.searchFields.map((field) => ({ [field]: searchRegex }));
        if (isValidObjectId) {
          orConditions.push({ _id: searchTerm });
        }

        const matches = await Model.find({ $or: orConditions }).select('_id').lean();
        if (matches.length > 0) {
          conditions.push(['_id', 'in', matches.map((m) => m._id)]);
        } else {
          // Force empty result when no search match exists
          return [['_id', '=', null]];
        }
        continue;
      }

      const transformedValue = config.transform ? config.transform(value) : value;
      conditions.push([config.field, config.operator, transformedValue]);
    }
  }
  
  return conditions;
}

/**
 * Get model class dynamically
 */
function getModelClass(modelName) {
  try {
    return mongoose.model(modelName);
  } catch (e) {
    return null;
  }
}

/**
 * Transform Project results to add agentsCount and voipserver_name
 */
async function transformProjectResults(projects) {
  if (!Array.isArray(projects)) {
    return projects;
  }
  
  // Collect all unique voipserver_ids that need to be fetched
  const voipserverIdsToFetch = [];
  const voipserverIdMap = new Map();
  
  // Collect all unique mailserver_ids that need to be fetched
  const mailserverIdsToFetch = [];
  const mailserverIdMap = new Map();
  
  projects.forEach((project, index) => {
    // Handle voipserver_id
    if (project.voipserver_id) {
      // Check if voipserver_id is populated (object with name)
      if (typeof project.voipserver_id === 'object' && project.voipserver_id !== null) {
        // Already populated, use it
        voipserverIdMap.set(index, project.voipserver_id.name || '');
      } else {
        // Need to fetch - collect the ID
        const voipId = project.voipserver_id.toString();
        if (!voipserverIdsToFetch.includes(voipId)) {
          voipserverIdsToFetch.push(voipId);
        }
        voipserverIdMap.set(index, voipId); // Store the ID to fetch later
      }
    } else {
      voipserverIdMap.set(index, null);
    }
    
    // Handle mailservers array
    if (project.mailservers && Array.isArray(project.mailservers)) {
      const mailserverData = [];
      project.mailservers.forEach((mailserver) => {
        if (typeof mailserver === 'object' && mailserver !== null && mailserver._id) {
          // Already populated
          mailserverData.push({
            _id: mailserver._id.toString(),
            name: mailserver.name || '',
            info: mailserver.info || {}
          });
        } else {
          // Need to fetch - collect the ID
          const mailId = mailserver.toString();
          if (!mailserverIdsToFetch.includes(mailId)) {
            mailserverIdsToFetch.push(mailId);
          }
          mailserverData.push(mailId); // Store the ID to fetch later
        }
      });
      mailserverIdMap.set(index, mailserverData);
    } else {
      mailserverIdMap.set(index, []);
    }
  });
  
  // Fetch voipserver names in batch if needed
  const voipserverNameMap = new Map();
  if (voipserverIdsToFetch.length > 0) {
    try {
      const Settings = getModelClass('Settings');
      if (Settings) {
        const voipservers = await Settings.find({
          _id: { $in: voipserverIdsToFetch.map(id => new mongoose.Types.ObjectId(id)) }
        }).select('name').lean();
        
        voipservers.forEach(voip => {
          voipserverNameMap.set(voip._id.toString(), voip.name || '');
        });
      }
    } catch (error) {
      logger.error('[UniversalQuery] Error fetching voipserver names:', error.message);
    }
  }
  
  // Fetch mailservers in batch if needed
  const mailserverDataMap = new Map();
  if (mailserverIdsToFetch.length > 0) {
    try {
      const Settings = getModelClass('Settings');
      if (Settings) {
        const mailservers = await Settings.find({
          _id: { $in: mailserverIdsToFetch.map(id => new mongoose.Types.ObjectId(id)) }
        }).select('name info').lean();
        
        mailservers.forEach(mail => {
          mailserverDataMap.set(mail._id.toString(), {
            _id: mail._id.toString(),
            name: mail.name || '',
            info: mail.info || {}
          });
        });
      }
    } catch (error) {
      logger.error('[UniversalQuery] Error fetching mailservers:', error.message);
    }
  }
  
  // Transform projects
  return projects.map((project, index) => {
    const transformed = { ...project };
    
    // Add agentsCount
    if (project.agents && Array.isArray(project.agents)) {
      transformed.agentsCount = project.agents.length;
    } else {
      transformed.agentsCount = 0;
    }
    
    // Add voipserver_name
    const voipValue = voipserverIdMap.get(index);
    if (voipValue === null) {
      transformed.voipserver_name = '';
    } else if (typeof voipValue === 'string' && voipserverNameMap.has(voipValue)) {
      // Fetched from database
      transformed.voipserver_name = voipserverNameMap.get(voipValue);
    } else if (typeof voipValue === 'string') {
      // ID was stored but not found in database
      transformed.voipserver_name = '';
    } else {
      // Already had the name from populated object
      transformed.voipserver_name = voipValue;
      // Keep the ID reference if it was an object
      if (typeof project.voipserver_id === 'object' && project.voipserver_id !== null) {
        transformed.voipserver_id = project.voipserver_id._id || project.voipserver_id;
      }
    }
    
    // Populate mailservers array
    const mailserverData = mailserverIdMap.get(index) || [];
    transformed.mailservers = mailserverData.map((mail) => {
      if (typeof mail === 'object' && mail._id) {
        // Already populated
        return mail;
      } else {
        // Need to fetch from map
        const mailId = mail.toString();
        return mailserverDataMap.get(mailId) || {
          _id: mailId,
          name: '',
          info: {}
        };
      }
    });
    
    return transformed;
  });
}

/**
 * Generate a deterministic ObjectId for "None" groups
 * Matches the search-service algorithm exactly
 */
function generateNoneGroupId(field, level = 0) {
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
}

/**
 * Check if a groupId represents a "None" group by comparing it with generated None groupId
 */
function isNoneGroupId(groupId, fieldName, level = 0) {
  if (!groupId) return false;
  
  const noneGroupId = generateNoneGroupId(`${fieldName}_none`, level);
  const groupIdStr = groupId.toString();
  const noneGroupIdStr = noneGroupId.toString();
  
  return groupIdStr === noneGroupIdStr;
}

/**
 * Normalize grouped results: generate groupId for "None" groups and handle empty strings
 * This ensures consistency with the search-service normalization
 */
function normalizeGroupedResults(data, groupBy = [], level = 0) {
  if (!Array.isArray(data)) {
    return data;
  }

  return data.map(group => {
    const fieldName = group.fieldName || (groupBy.length > level ? groupBy[level] : 'unknown');
    
    // If groupId is null/undefined and groupName is "None", generate a proper groupId
    if ((group.groupId === null || group.groupId === undefined) && 
        (group.groupName === 'None' || group.groupName === null || group.groupName === '')) {
      const noneField = `${fieldName}_none`;
      group.groupId = generateNoneGroupId(noneField, level);
      group.groupName = 'None';
      logger.info(`[UniversalQuery] Generated groupId for None group: ${fieldName} -> ${group.groupId}`);
    }
    
    // Normalize empty string groupId to null first, then generate if it's a None group
    if (group.groupId === '') {
      if (group.groupName === 'None' || group.groupName === null || group.groupName === '') {
        const noneField = `${fieldName}_none`;
        group.groupId = generateNoneGroupId(noneField, level);
        group.groupName = 'None';
        logger.info(`[UniversalQuery] Generated groupId for empty string None group: ${fieldName} -> ${group.groupId}`);
      } else {
        group.groupId = null;
      }
    }
    
    // Recursively normalize subgroups if they exist
    if (group.subGroups && Array.isArray(group.subGroups)) {
      group.subGroups = normalizeGroupedResults(group.subGroups, groupBy, level + 1);
    }
    
    return group;
  });
}

/**
 * Populate bank documents (logo, country_flag) from Document service
 * @param {Array} banks - Array of bank objects
 * @param {string} authToken - JWT bearer token for authentication
 * @returns {Promise<Array>} Banks with populated document objects
 */
async function populateBankDocumentsFromService(banks, authToken) {
  if (!banks || banks.length === 0) {
    return banks;
  }

  // Collect all unique document IDs to fetch
  const logoIds = new Set();
  const countryFlagIds = new Set();

  banks.forEach(bank => {
    if (bank.logo) {
      logoIds.add(bank.logo.toString());
    }
    if (bank.bank_country_flag) {
      countryFlagIds.add(bank.bank_country_flag.toString());
    }
  });

  // Fetch all documents from Document service in parallel
  const [logoDocs, countryFlagDocs] = await Promise.all([
    // Fetch logos
    Promise.all(
      Array.from(logoIds).map(id =>
        documentClient.getDocument(id, authToken).catch(err => {
          logger.warn('[UniversalQuery] Failed to fetch logo document', { documentId: id, error: err.message });
          return null;
        })
      )
    ),
    // Fetch country flags
    Promise.all(
      Array.from(countryFlagIds).map(id =>
        documentClient.getDocument(id, authToken).catch(err => {
          logger.warn('[UniversalQuery] Failed to fetch country flag document', { documentId: id, error: err.message });
          return null;
        })
      )
    )
  ]);

  // Create maps for quick lookup
  const logoMap = new Map();
  logoDocs.forEach((doc, index) => {
    const id = Array.from(logoIds)[index];
    if (doc) {
      logoMap.set(id, doc);
    }
  });

  const countryFlagMap = new Map();
  countryFlagDocs.forEach((doc, index) => {
    const id = Array.from(countryFlagIds)[index];
    if (doc) {
      countryFlagMap.set(id, doc);
    }
  });

  // Replace document IDs with actual documents and map field names
  return banks.map(bank => {
    // Populate logo
    if (bank.logo) {
      const logoId = bank.logo.toString();
      bank.logo = logoMap.get(logoId) || bank.logo;
    }

    // Populate and map bank_country_flag → country_flag
    if (bank.bank_country_flag) {
      const countryFlagId = bank.bank_country_flag.toString();
      bank.country_flag = countryFlagMap.get(countryFlagId) || bank.bank_country_flag;
      delete bank.bank_country_flag;
    }

    return bank;
  });
}

/**
 * Populate results for consistent response structure
 */
async function populateResults(modelName, ids) {
  const ModelClass = getModelClass(modelName);
  const populationConfig = MODEL_POPULATION_CONFIG[modelName];

  if (!ModelClass || !populationConfig || ids.length === 0) {
    return null;
  }
  
  try {
    let query = ModelClass.find({ _id: { $in: ids } });
    for (const config of populationConfig) {
      query = query.populate(config);
    }
    const populated = await query.lean();
    
    // Preserve original order
    const populatedMap = new Map();
    populated.forEach(doc => populatedMap.set(doc._id.toString(), doc));
    const orderedResults = ids.map(id => populatedMap.get(id.toString())).filter(Boolean);
    
    // Apply Project-specific transformations
    if (modelName === 'Project') {
      return await transformProjectResults(orderedResults);
    }
    
    return orderedResults;
  } catch (error) {
    logger.error(`[UniversalQuery] Population error for ${modelName}:`, error.message);
    return null;
  }
}

/**
 * Enrich ClosedLead results by resolving current_status ObjectIds to {_id, name, stage, stage_id}
 */
/**
 * Expose source_agent / source_project alongside source_user_id / source_team_id (same populated shape as team_id / user_id).
 */
function attachClosedLeadSourceAliases(leads) {
  if (!Array.isArray(leads) || leads.length === 0) return leads;
  return leads.map((doc) => {
    if (!doc || typeof doc !== 'object') return doc;
    const out = { ...doc };
    if (Object.prototype.hasOwnProperty.call(doc, 'source_user_id')) {
      out.source_agent = doc.source_user_id;
    }
    if (Object.prototype.hasOwnProperty.call(doc, 'source_team_id')) {
      out.source_project = doc.source_team_id;
    }
    return out;
  });
}

async function enrichClosedLeadsWithCurrentStatus(leads) {
  if (!Array.isArray(leads) || leads.length === 0) return leads;

  const statusIds = leads
    .filter(l => l && l.current_status)
    .map(l => l.current_status.toString());

  if (statusIds.length === 0) return leads;

  try {
    const stages = await Settings.find({ type: 'stage' }).lean();
    const statusMap = {};
    for (const stage of stages) {
      if (!stage.info || !Array.isArray(stage.info.statuses)) continue;
      for (const status of stage.info.statuses) {
        const id = (status._id || status.id)?.toString();
        if (id && statusIds.includes(id)) {
          statusMap[id] = {
            _id: id,
            name: status.name || '',
            stage: stage.name,
            stage_id: stage._id,
          };
        }
      }
    }

    return leads.map(lead => {
      if (!lead || !lead.current_status) return lead;
      const id = lead.current_status.toString();

      const resolved = statusMap[id] || (
        lead.status || lead.stage || lead.stage_id
          ? {
              _id: id,
              name: lead.status || '',
              stage: lead.stage || '',
              stage_id: lead.stage_id || null,
            }
          : lead.current_status
      );

      return { ...lead, current_status: resolved };
    });
  } catch (error) {
    logger.error('[UniversalQuery] Error enriching current_status:', error.message);
    return leads;
  }
}

const detectModelFromRoute = (path) => {
  for (const [route, model] of Object.entries(ROUTE_MODEL_MAP)) {
    if (path.includes(route)) {
      return model;
    }
  }
  return null;
};

const universalQueryMiddleware = async (req, res, next) => {
  const { domain, groupBy, limit, page, offset, sortBy, sortOrder, orderBy, fields, groupId } = req.query;

  // Detect model from route first for predefined filter check
  const fullPath = req.baseUrl + req.path;
  const modelName = detectModelFromRoute(fullPath);
  
  // Check for predefined filters
  const hasPredefined = modelName && hasPredefinedFilters(req.query, modelName);

  // Pass through if no query params that need search service
  if (!domain && !groupBy && !hasPredefined) {
    return next();
  }

  try {
    // Parse parameters
    let parsedDomain = domain ? JSON.parse(domain) : [];
    const parsedGroupBy = groupBy ? JSON.parse(groupBy) : [];
    const parsedFields = fields ? JSON.parse(fields) : null;

    if (!modelName) {
      logger.warn(`[UniversalQuery] Could not detect model from route: ${fullPath}`);
      return next();
    }

    // Handle groupId parameter: if provided, convert it to a domain filter
    // This allows filtering by a specific group (especially for "None" groups)
    // Works both with groupBy (summary view) and without (detail view)
    if (groupId) {
      let fieldName = null;
      
      // If groupBy is provided, use the first field
      if (parsedGroupBy.length > 0) {
        const firstField = parsedGroupBy[0];
        fieldName = firstField.includes(':') ? firstField.split(':')[0] : firstField;
      } else {
        // If no groupBy, try to extract field name from domain or use a common field
        // For banks, common optional fields are: account, account_number, iban, etc.
        // We'll check domain first to see if there's a field hint
        if (parsedDomain.length > 0 && Array.isArray(parsedDomain[0])) {
          fieldName = parsedDomain[0][0];
        }
      }
      
      if (fieldName) {
        // Check if this is a "None" groupId
        if (isNoneGroupId(groupId, fieldName, 0)) {
          // For "None" groups, filter for null or empty string values
          parsedDomain.push([fieldName, 'is_null', null]);
          logger.info(`[UniversalQuery] Filtering by None groupId for field: ${fieldName}`);
        } else {
          // For regular groups, filter by the exact value
          // Note: We'd need to decode the groupId to get the actual value
          // For now, we'll let the search-service handle it if it supports groupId filtering
          logger.info(`[UniversalQuery] groupId provided but not a None group: ${groupId}`);
        }
      } else {
        logger.warn(`[UniversalQuery] groupId provided but could not determine field name`);
      }
    }

    // Convert predefined filters to domain conditions
    if (hasPredefined) {
      const predefinedConditions = await convertPredefinedFilters(req.query, modelName);
      parsedDomain = [...parsedDomain, ...predefinedConditions];
    }

    // ClosedLead defaults: exclude reverted leads unless explicitly filtered
    if (modelName === 'ClosedLead') {
      const hasRevertedFilter = parsedDomain.some(
        condition => Array.isArray(condition) && condition[0] === 'is_reverted'
      );
      if (!hasRevertedFilter) {
        parsedDomain.push(['is_reverted', '!=', true]);
      }
    }

    logger.info(`[UniversalQuery] ${modelName}`, {
      domain: parsedDomain,
      groupBy: parsedGroupBy,
      hasPredefined
    });

    // Build search request
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 50;
    const offsetNum = offset ? parseInt(offset) : (pageNum - 1) * limitNum;

    const searchRequest = {
      model: modelName,
      domain: parsedDomain,
      limit: limitNum,
      offset: offsetNum
    };

    if (parsedGroupBy.length > 0) {
      searchRequest.groupBy = parsedGroupBy;
      searchRequest.includeIds = true;
    }

    if (sortBy || orderBy) {
      searchRequest.orderBy = orderBy || `${sortBy || 'createdAt'} ${sortOrder || 'desc'}`;
    }

    if (parsedFields) {
      searchRequest.fields = parsedFields;
    }

    // Call search service
    const response = await axios.post(`${SEARCH_SERVICE_URL}/api/search`, searchRequest, {
      headers: {
        Authorization: req.headers.authorization
      }
    });

    const result = response.data;
    let resultData = result.data || [];

    // Apply population for non-grouped queries to ensure consistent structure
    if (parsedGroupBy.length === 0 && resultData.length > 0) {
      const ids = resultData.map(doc => doc._id);
      const populated = await populateResults(modelName, ids);
      if (populated) {
        resultData = populated;

        // For Bank model, populate documents from Document service (logo, country_flag)
        if (modelName === 'Bank') {
          const authToken = req.headers.authorization?.replace('Bearer ', '');
          resultData = await populateBankDocumentsFromService(resultData, authToken);
        }
      } else if (modelName === 'Project') {
        // If population failed but we have Project data, still apply transformations
        resultData = await transformProjectResults(resultData);
      }

      // Enrich ClosedLead current_status with resolved names
      if (modelName === 'ClosedLead') {
        resultData = await enrichClosedLeadsWithCurrentStatus(resultData);
        resultData = attachClosedLeadSourceAliases(resultData);
      }
    } else if (modelName === 'Project' && resultData.length > 0) {
      // For grouped queries, still apply Project transformations if needed
      resultData = await transformProjectResults(resultData);
    }
    
    // Normalize grouped results: generate groupId for "None" groups
    if (parsedGroupBy.length > 0 && resultData.length > 0) {
      resultData = normalizeGroupedResults(resultData, parsedGroupBy, 0);
    }
    
    const meta = result.meta || {};
    const total = meta.total || 0;
    const pages = limitNum > 0 ? Math.ceil(total / limitNum) : 1;

    const formattedResponse = {
      success: true,
      data: resultData,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        pages,
        offset: offsetNum,
        ...meta
      }
    };

    if (parsedGroupBy.length > 0) {
      formattedResponse.grouped = true;
      formattedResponse.meta.totalGroups = result.data?.length || 0;
    }

    return res.json(formattedResponse);

  } catch (error) {
    logger.error('[UniversalQuery] Error:', {
      error: error.message,
      stack: error.stack
    });

    if (error.response?.status === 404 || error.code === 'ECONNREFUSED') {
      logger.warn('[UniversalQuery] Search service unavailable, falling through');
      return next();
    }

    return res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.error || error.message
    });
  }
};

module.exports = universalQueryMiddleware;
