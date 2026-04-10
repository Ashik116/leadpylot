/**
 * Universal Query Middleware - User Auth Service
 * 
 * Enables domain filtering and grouping for user/auth queries
 * by proxying to the centralized search-service.
 * 
 * Usage:
 * GET /users?domain=[["active","=",true]]
 * GET /users?role=Agent&search=john
 * GET /users?domain=[["role","=","agent"]]&groupBy=["role"]
 */

const axios = require('axios');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

const SEARCH_SERVICE_URL = process.env.SEARCH_SERVICE_URL || 'http://localhost:3010';

const ROUTE_MODEL_MAP = {
  '/users': 'User',
  '/sessions': 'UserSession',
  '/login-attempts': 'LoginAttempt',
};

/**
 * Population configuration for each model to ensure consistent response structure
 */
const MODEL_POPULATION_CONFIG = {
  UserSession: [
    { path: 'user_id', select: 'login role' }
  ],
  LoginAttempt: [
    { path: 'user_id', select: 'login' }
  ]
  // User model doesn't need population as it's a base model
};

/**
 * Predefined filter parameters for each model
 */
const PREDEFINED_FILTERS = {
  User: {
    role: { field: 'role', operator: '=' },
    search: { field: 'login', operator: 'ilike' },
    active: { field: 'active', operator: '=', transform: v => v === 'true' || v === true },
    showInactive: { field: 'active', operator: '=', transform: v => !(v === 'true' || v === true) },
  },
  UserSession: {
    user_id: { field: 'user_id', operator: '=' },
    active: { field: 'active', operator: '=', transform: v => v === 'true' || v === true },
  },
  LoginAttempt: {
    user_id: { field: 'user_id', operator: '=' },
    success: { field: 'success', operator: '=', transform: v => v === 'true' || v === true },
    ip_address: { field: 'ip_address', operator: '=' },
  }
};

/**
 * Check if request has predefined filters
 */
function hasPredefinedFilters(query, modelName) {
  const modelFilters = PREDEFINED_FILTERS[modelName];
  if (!modelFilters) return false;
  
  return Object.keys(modelFilters).some(key => query[key] !== undefined);
}

/**
 * Convert predefined filters to domain conditions
 */
function convertPredefinedFilters(query, modelName) {
  const modelFilters = PREDEFINED_FILTERS[modelName];
  if (!modelFilters) return [];
  
  const conditions = [];
  
  for (const [paramName, config] of Object.entries(modelFilters)) {
    const value = query[paramName];
    if (value !== undefined) {
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
    return ids.map(id => populatedMap.get(id.toString())).filter(Boolean);
  } catch (error) {
    logger.error(`[UniversalQuery] Population error for ${modelName}:`, error.message);
    return null;
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
  const { domain, groupBy, limit, page, offset, sortBy, sortOrder, orderBy, fields } = req.query;

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

    // Convert predefined filters to domain conditions
    if (hasPredefined) {
      const predefinedConditions = convertPredefinedFilters(req.query, modelName);
      parsedDomain = [...parsedDomain, ...predefinedConditions];
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
      }
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
