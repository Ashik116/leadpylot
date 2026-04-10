const mongoose = require('mongoose');
const { Lead, Team, Source, Bank, Reclamation, Document, User, Todo, PdfTemplate } = require('../models');
const { Settings, SETTINGS_TYPES } = require('../models/Settings');
const { filterLeadsByUserAssignment } = require('./leadService/filters');
const logger = require('../utils/logger');

/**
 * Escape special characters in a string for use in a RegExp
 * @param {string} string - The string to escape
 * @returns {string} - Escaped string safe for RegExp usage
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

/**
 * Check if a field contains a close match to the query (fuzzy matching)
 * Allows partial matches - considers it a match if query is found in the field
 * @param {string} fieldValue - The field value to check
 * @param {string} query - The search query
 * @returns {boolean} - True if field contains the query (case-insensitive)
 */
function isCloseMatch(fieldValue, query) {
  if (!fieldValue || !query) return false;
  
  const fieldLower = fieldValue.toLowerCase();
  const queryLower = query.toLowerCase();
  
  // Consider it a close match if:
  // 1. Field starts with the query (highest priority)
  // 2. Field contains the query anywhere (partial match)
  // 3. Query is a significant portion (at least 3 characters for meaningful matches)
  if (queryLower.length >= 2) {
    return fieldLower.startsWith(queryLower) || fieldLower.includes(queryLower);
  }
  
  return false;
}

/**
 * Perform MongoDB Atlas Search using $search aggregation stage
 * @param {string} collectionName - Name of the MongoDB collection
 * @param {string} query - Search query string
 * @param {Object} searchFields - Object mapping field names to their search configurations
 * @param {Object} filterQuery - Additional MongoDB filter query (for permissions, etc.)
 * @param {Number} limit - Maximum number of results
 * @param {Number} skip - Number of results to skip
 * @param {string} indexName - Name of the Atlas Search index (defaults to 'default')
 * @returns {Promise<Object>} - Search results with items and total count
 */
async function performAtlasSearch(
  collectionName,
  query,
  searchFields,
  filterQuery = {},
  limit = 10,
  skip = 0,
  indexName = 'default'
) {
  try {
    const db = mongoose.connection.db;
    const collection = db.collection(collectionName);

    // Build the search query for Atlas Search
    // Using 'text' operator for basic text search (compatible with basic Atlas Search features)
    const searchPaths = Object.keys(searchFields);
    
    const searchStage = {
      $search: {
        index: indexName,
        text: {
          query: query,
          path: searchPaths.length > 0 ? searchPaths : ['*'], // Search all fields if none specified
        },
      },
    };

    // Build aggregation pipeline
    const pipeline = [
      searchStage, // $search must be the first stage
      {
        $addFields: {
          score: { $meta: 'searchScore' }, // Get relevance score from Atlas Search
        },
      },
    ];

    // Add filter stage if filterQuery is provided
    if (Object.keys(filterQuery).length > 0) {
      pipeline.push({ $match: filterQuery });
    }

    // Add pagination
    pipeline.push({ $skip: skip }, { $limit: limit });

    // Execute aggregation
    const results = await collection.aggregate(pipeline).toArray();

    // Get total count (separate aggregation for count)
    const countPipeline = [searchStage];
    if (Object.keys(filterQuery).length > 0) {
      countPipeline.push({ $match: filterQuery });
    }
    countPipeline.push({ $count: 'total' });
    const countResult = await collection.aggregate(countPipeline).toArray();
    const total = countResult.length > 0 ? countResult[0].total : 0;

    return {
      items: results,
      total: total,
      usingAtlasSearch: true,
    };
  } catch (error) {
    // If Atlas Search is not available (e.g., index doesn't exist, not configured), fall back to regex
    if (
      error.code === 17106 ||
      error.code === 17109 ||
      error.message?.includes('index') ||
      error.message?.includes('$search') ||
      error.message?.includes('Atlas Search')
    ) {
      logger.warn(
        `Atlas Search not available for ${collectionName}, falling back to regex search. Error: ${error.message}`
      );
      return {
        items: [],
        total: 0,
        usingAtlasSearch: false,
        error: error.message,
      };
    }
    throw error;
  }
}

/**
 * Perform a global search across multiple collections
 * @param {string} query - Search query string (min 2 chars)
 * @param {Object} user - User object with role information
 * @param {Object} options - Search options (limit, page, entities)
 * @returns {Promise<Object>} - Results grouped by entity with pagination info
 */
async function globalSearch(query, user, options = {}) {
  const startTime = Date.now();
  const errors = [];
  const isAdmin = user.role === 'Admin';

  try {
    // Minimum query length check
    if (!query || query.length < 2) {
      return {
        status: 'error',
        message: 'Search query must be at least 2 characters long',
        data: null,
      };
    }

    // Parse options
    const limit = options.limit || 10;
    const page = options.page || 1;
    const offset = (page - 1) * limit;

    // Filter which entities to search
    let entitiesToSearch = [
      'leads',
      'projects',
      'banks',
      'sources',
      'reclamations',
      'statuses',
      'mailservers',
      'voipservers',
      'payment_terms',
      'users',
      'documents',
      'todos',
      'pdf_templates',
      'email_templates',
    ];
    if (options.entities && Array.isArray(options.entities) && options.entities.length > 0) {
      entitiesToSearch = options.entities;
    }

    // Create case-insensitive regex for search
    const searchRegex = new RegExp(escapeRegExp(query), 'i');

    // Split query into terms and create a regex for each term
    const terms = query.split(/\s+/).filter((term) => term.length > 0);
    const termRegexes = terms.map((term) => new RegExp(escapeRegExp(term), 'i'));

    logger.info(
      `Starting global search for "${query}" with ${terms.length} terms (limit: ${limit}, page: ${page}, entities: ${entitiesToSearch.join(', ')})`
    );

    // Prepare search functions based on filtered entities
    const searchPromises = [];
    const searchFunctions = {};

    if (entitiesToSearch.includes('leads')) {
      searchFunctions.leads = searchLeads(searchRegex, termRegexes, user, isAdmin, limit, offset, query);
      searchPromises.push(searchFunctions.leads);
    }

    if (entitiesToSearch.includes('projects')) {
      searchFunctions.projects = searchProjects(
        searchRegex,
        termRegexes,
        user,
        isAdmin,
        limit,
        offset,
        query
      );
      searchPromises.push(searchFunctions.projects);
    }

    if (entitiesToSearch.includes('banks')) {
      searchFunctions.banks = searchBanks(searchRegex, termRegexes, isAdmin, limit, offset, query);
      searchPromises.push(searchFunctions.banks);
    }

    if (entitiesToSearch.includes('sources')) {
      searchFunctions.sources = searchSources(searchRegex, termRegexes, isAdmin, limit, offset, query);
      searchPromises.push(searchFunctions.sources);
    }

    if (entitiesToSearch.includes('reclamations')) {
      searchFunctions.reclamations = searchReclamations(
        searchRegex,
        termRegexes,
        isAdmin,
        limit,
        offset,
        query
      );
      searchPromises.push(searchFunctions.reclamations);
    }

    if (entitiesToSearch.includes('statuses')) {
      searchFunctions.statuses = searchStatuses(searchRegex, termRegexes, isAdmin, limit, offset, query);
      searchPromises.push(searchFunctions.statuses);
    }

    if (entitiesToSearch.includes('mailservers')) {
      searchFunctions.mailservers = searchMailServers(searchRegex, termRegexes, isAdmin, limit, offset, query);
      searchPromises.push(searchFunctions.mailservers);
    }

    if (entitiesToSearch.includes('voipservers')) {
      searchFunctions.voipservers = searchVoipServers(searchRegex, termRegexes, isAdmin, limit, offset, query);
      searchPromises.push(searchFunctions.voipservers);
    }

    if (entitiesToSearch.includes('payment_terms')) {
      searchFunctions.payment_terms = searchPaymentTerms(searchRegex, termRegexes, isAdmin, limit, offset, query);
      searchPromises.push(searchFunctions.payment_terms);
    }

    if (entitiesToSearch.includes('users')) {
      searchFunctions.users = searchUsers(searchRegex, termRegexes, isAdmin, limit, offset, query);
      searchPromises.push(searchFunctions.users);
    }

    if (entitiesToSearch.includes('documents')) {
      searchFunctions.documents = searchDocuments(searchRegex, termRegexes, isAdmin, limit, offset, query);
      searchPromises.push(searchFunctions.documents);
    }

    if (entitiesToSearch.includes('todos')) {
      searchFunctions.todos = searchTodos(searchRegex, termRegexes, user, isAdmin, limit, offset, query);
      searchPromises.push(searchFunctions.todos);
    }

    if (entitiesToSearch.includes('pdf_templates')) {
      searchFunctions.pdf_templates = searchPdfTemplates(searchRegex, termRegexes, isAdmin, limit, offset, query);
      searchPromises.push(searchFunctions.pdf_templates);
    }

    if (entitiesToSearch.includes('email_templates')) {
      searchFunctions.email_templates = searchEmailTemplates(searchRegex, termRegexes, isAdmin, limit, offset, query);
      searchPromises.push(searchFunctions.email_templates);
    }

    // Run all searches in parallel and handle any errors
    const searchResults = await Promise.allSettled(searchPromises);

    // Process results
    const results = {};
    const entityKeys = Object.keys(searchFunctions);

    let totalItems = 0;

    searchResults.forEach((result, index) => {
      const entityName = entityKeys[index];

      if (result.status === 'fulfilled') {
        results[entityName] = result.value;
        // Count total items across all entity types for aggregate counts
        if (result.value && typeof result.value.total === 'number') {
          totalItems += result.value.total;
        }
      } else {
        logger.error(`Error searching ${entityName}:`, result.reason);
        results[entityName] = { items: [], total: 0 };
        errors.push(`Error searching ${entityName}: ${result.reason.message || result.reason}`);
      }
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Create simplified flat array format
    const flatResults = [];

    // Map each entity's results to a simplified format and add to flat array
    Object.keys(results).forEach((entityType) => {
      const entityResults = results[entityType]?.items || [];

      if (entityResults.length > 0) {
        entityResults.forEach((item) => {
          // Determine the entity type - use item._type if set (for voipservers, payment_terms, etc.), otherwise derive from entityType
          let itemType = item._type || entityType.slice(0, -1); // Remove trailing 's' to get singular form (leads -> lead)

          // Special case: if it's a lead with use_status === "Reclamation", set type to reclamation
          if (entityType === 'leads' && item.use_status === 'Reclamation') {
            itemType = 'reclamation';
          }

          // Extract only the essential fields for each result
          flatResults.push({
            _id: item._id,
            name:
              item.name ||
              item.contact_name ||
              item.email_from ||
              item.title ||
              item.description ||
              item.stage ||
              item.status ||
              item.filename ||
              'Unnamed',
            _type: itemType,
            _score: item._score || 0,
            _exactMatch: item._exactMatch || false,
          });
        });
      }
    });

    logger.info(
      `Global search for "${query}" completed in ${duration}ms. Found ${flatResults.length} total results across ${Object.keys(results).length} entities`
    );

    // Return simplified flat array results
    return {
      status: 'success',
      message: `Found ${flatResults.length} results for "${query}"`,
      data: flatResults,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`Global search error (${duration}ms):`, error);

    return {
      status: 'error',
      message: `Error performing global search: ${error.message || 'Unknown error'}`,
      data: {},
    };
  }
}

/**
 * Search leads based on user query and permissions using MongoDB Atlas Search
 * @param {RegExp} searchRegex - Main search regex for matching (fallback)
 * @param {Array<RegExp>} termRegexes - Individual term regexes for scoring (fallback)
 * @param {Object} user - User object
 * @param {Boolean} isAdmin - Whether user is admin
 * @param {Number} limit - Results per page
 * @param {Number} skip - Number of results to skip (pagination)
 * @param {string} query - Original search query string for Atlas Search
 * @returns {Promise<Object>} - Lead search results with pagination info
 */
async function searchLeads(searchRegex, termRegexes, user, isAdmin, limit, skip = 0, query = '') {
  // Try Atlas Search first
  try {
    const searchFields = {
      contact_name: { type: 'string' },
      email_from: { type: 'string' },
      secondary_email: { type: 'string' },
      phone: { type: 'string' },
      notes: { type: 'string' },
      stage: { type: 'string' },
      status: { type: 'string' },
      lead_source_no: { type: 'string' },
    };

    // Build filter query for permissions
    let filterQuery = {};
    if (!isAdmin) {
      try {
        // Build a temporary query to get the filter conditions
        const tempQuery = {};
        await filterLeadsByUserAssignment(user, tempQuery);
        filterQuery = tempQuery;
      } catch (error) {
        logger.error('Error building filter query for leads:', error);
        return { items: [], total: 0 };
      }
    }

    const atlasResults = await performAtlasSearch(
      'leads',
      query,
      searchFields,
      filterQuery,
      limit,
      skip,
      'leads_search_index'
    );

    if (atlasResults.usingAtlasSearch && atlasResults.items.length > 0) {
      // Process Atlas Search results
      const processedLeads = atlasResults.items.map((lead) => {
        // Check for close match - allow partial/fuzzy matches
        const exactMatch = 
          isCloseMatch(lead.contact_name, query) ||
          isCloseMatch(lead.email_from, query) ||
          isCloseMatch(lead.secondary_email, query) ||
          isCloseMatch(lead.phone, query);

        return {
          _id: lead._id,
          contact_name: lead.contact_name,
          email_from: lead.email_from,
          secondary_email: lead.secondary_email,
          phone: lead.phone,
          lead_date: lead.lead_date,
          stage: lead.stage,
          status: lead.status,
          createdAt: lead.createdAt,
          use_status: lead.use_status,
          _type: 'lead',
          _score: lead.score || 0, // Use Atlas Search score
          _exactMatch: exactMatch,
        };
      });

      // Sort by exact match first, then by Atlas Search score
      processedLeads.sort((a, b) => {
        if (a._exactMatch && !b._exactMatch) return -1;
        if (!a._exactMatch && b._exactMatch) return 1;
        return (b._score || 0) - (a._score || 0);
      });

      return {
        items: processedLeads,
        total: atlasResults.total,
      };
    }
  } catch (error) {
    logger.warn('Atlas Search failed for leads, falling back to regex:', error.message);
  }

  // Fallback to regex-based search
  let leadQuery = {
    $or: [
      { contact_name: searchRegex },
      { email_from: searchRegex },
      { secondary_email: searchRegex },
      { phone: searchRegex },
      { notes: searchRegex },
      { stage: searchRegex },
      { status: searchRegex },
      { lead_source_no: searchRegex },
    ],
  };

  // For non-admins (agents), use the proper filtering function
  if (!isAdmin) {
    try {
      await filterLeadsByUserAssignment(user, leadQuery);
    } catch (error) {
      logger.error('Error filtering leads by user assignment:', error);
      return { items: [], total: 0 };
    }
  }

  // First get total count for pagination info
  const totalCount = await Lead.countDocuments(leadQuery);

  // Execute the query with pagination
  const leads = await Lead.find(leadQuery)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .select('_id contact_name email_from secondary_email phone lead_date stage status createdAt use_status')
    .lean();

  // Calculate relevance scores if term regexes provided
  const scoredLeads = leads.map((lead) => {
    let score = 1;

    const fieldsToScore = [
      { field: lead.contact_name || '', weight: 5 },
      { field: lead.email_from || '', weight: 4 },
      { field: lead.secondary_email || '', weight: 4 },
      { field: lead.phone || '', weight: 4 },
      { field: lead.stage || '', weight: 3 },
      { field: lead.status || '', weight: 3 },
      { field: lead.notes || '', weight: 2 },
    ];

    if (termRegexes && termRegexes.length) {
      termRegexes.forEach((termRegex) => {
        fieldsToScore.forEach(({ field, weight }) => {
          if (termRegex.test(field)) {
            score += weight;
          }
        });
      });
    }

    return {
      ...lead,
      _type: 'lead',
      _score: score,
      _exactMatch: 
        isCloseMatch(lead.contact_name, query) ||
        isCloseMatch(lead.email_from, query) ||
        isCloseMatch(lead.secondary_email, query) ||
        isCloseMatch(lead.phone, query),
    };
  });

  // Sort by score if we have term matches, otherwise keep default sort
  if (termRegexes && termRegexes.length > 0) {
    scoredLeads.sort((a, b) => {
      if (a._exactMatch && !b._exactMatch) return -1;
      if (!a._exactMatch && b._exactMatch) return 1;
      return b._score - a._score;
    });
  }

  return {
    items: scoredLeads,
    total: totalCount,
  };
}

/**
 * Search projects based on user query and permissions using MongoDB Atlas Search
 * @param {RegExp} searchRegex - Main search regex for matching (fallback)
 * @param {Array<RegExp>} termRegexes - Individual term regexes for scoring (fallback)
 * @param {Object} user - User object
 * @param {Boolean} isAdmin - Whether user is admin
 * @param {Number} limit - Results per page
 * @param {Number} skip - Number of results to skip (pagination)
 * @param {string} query - Original search query string for Atlas Search
 * @returns {Promise<Object>} - Project search results with pagination info
 */
async function searchProjects(searchRegex, termRegexes, user, isAdmin, limit, skip = 0, query = '') {
  // Try Atlas Search first
  try {
    const searchFields = {
      name: { type: 'string' },
      description: { type: 'string' },
      tags: { type: 'string' },
    };

    let filterQuery = { active: true };

    // For non-admins (agents), only return their assigned projects
    if (!isAdmin) {
      try {
        const teams = await Team.find({
          'agents.user': user._id,
        })
          .select('_id')
          .lean();

        const teamIds = teams.map((team) => team._id);

        if (teamIds.length === 0) {
          return { items: [], total: 0 };
        }

        filterQuery._id = { $in: teamIds };
      } catch (error) {
        logger.error('Error finding user teams:', error);
        return { items: [], total: 0 };
      }
    }

    const atlasResults = await performAtlasSearch(
      'teams',
      query,
      searchFields,
      filterQuery,
      limit,
      skip,
      'projects_search_index'
    );

    if (atlasResults.usingAtlasSearch && atlasResults.items.length > 0) {
      const processedProjects = atlasResults.items.map((project) => {
        const exactMatch = isCloseMatch(project.name, query) || isCloseMatch(project.description, query);
        return {
          _id: project._id,
          name: project.name,
          description: project.description,
          createdAt: project.createdAt,
          agents: project.agents,
          _type: 'project',
          _score: project.score || 0,
          _exactMatch: exactMatch,
        };
      });

      processedProjects.sort((a, b) => {
        if (a._exactMatch && !b._exactMatch) return -1;
        if (!a._exactMatch && b._exactMatch) return 1;
        return (b._score || 0) - (a._score || 0);
      });

      return {
        items: processedProjects,
        total: atlasResults.total,
      };
    }
  } catch (error) {
    logger.warn('Atlas Search failed for projects, falling back to regex:', error.message);
  }

  // Fallback to regex-based search
  let projectQuery = {
    $or: [
      { name: searchRegex },
      { description: searchRegex },
      { tags: searchRegex },
    ],
    active: true,
  };

  // For non-admins (agents), only return their assigned projects
  if (!isAdmin) {
    try {
      // Find teams where this user is an agent
      const teams = await Team.find({
        'agents.user': user._id,
      })
        .select('_id')
        .lean();

      const teamIds = teams.map((team) => team._id);

      if (teamIds.length === 0) {
        // No teams assigned, return empty results
        return { items: [], total: 0 };
      }

      // Only search among teams where user is an agent
      projectQuery._id = { $in: teamIds };
    } catch (error) {
      logger.error('Error finding user teams:', error);
      return { items: [], total: 0 };
    }
  }

  // First get total count for pagination info
  const totalCount = await Team.countDocuments(projectQuery);

  // Execute the query with pagination
  const projects = await Team.find(projectQuery)
    .sort({ createdAt: -1 }) // Sort by creation date desc by default
    .skip(skip)
    .limit(limit)
    .select('_id name description createdAt agents')
    .lean();

  // Calculate relevance scores if term regexes provided
  const scoredProjects = projects.map((project) => {
    let score = 1; // Base score

    // Fields to check for term matches, with weights
    const fieldsToScore = [
      { field: project.name || '', weight: 6 },
      { field: project.description || '', weight: 3 },
      { field: project.tags ? project.tags.join(' ') : '', weight: 2 },
    ];

    // Also score agent names if available
    if (project.agents && project.agents.length) {
      project.agents.forEach((agent) => {
        if (agent.name) {
          fieldsToScore.push({ field: agent.name, weight: 2 });
        }
      });
    }

    // Increase score for each term match in each field
    if (termRegexes && termRegexes.length) {
      termRegexes.forEach((termRegex) => {
        fieldsToScore.forEach(({ field, weight }) => {
          if (termRegex.test(field)) {
            score += weight;
          }
        });
      });
    }

    return {
      ...project,
      _type: 'project',
      _score: score,
      _exactMatch: isCloseMatch(project.name, query) || isCloseMatch(project.description, query),
    };
  });

  // Sort by score if we have term matches, otherwise keep default sort
  if (termRegexes && termRegexes.length > 0) {
    scoredProjects.sort((a, b) => {
      // First by exact match
      if (a._exactMatch && !b._exactMatch) return -1;
      if (!a._exactMatch && b._exactMatch) return 1;
      // Then by score
      return b._score - a._score;
    });
  }

  return {
    items: scoredProjects,
    total: totalCount,
  };
}

/**
 * Search sources based on user query (admin only) using MongoDB Atlas Search
 * @param {RegExp} searchRegex - Main search regex for matching (fallback)
 * @param {Array<RegExp>} termRegexes - Individual term regexes for scoring (fallback)
 * @param {Boolean} isAdmin - Whether user is admin
 * @param {Number} limit - Results per page
 * @param {Number} skip - Number of results to skip (pagination)
 * @param {string} query - Original search query string for Atlas Search
 * @returns {Promise<Object>} - Source search results with pagination info
 */
async function searchSources(searchRegex, termRegexes, isAdmin, limit, skip = 0, query = '') {
  // Only admins can search sources
  if (!isAdmin) return { items: [], total: 0 };

  // Try Atlas Search first
  try {
    const searchFields = {
      name: { type: 'string' },
      description: { type: 'string' },
    };

    const atlasResults = await performAtlasSearch(
      'sources',
      query,
      searchFields,
      {},
      limit,
      skip,
      'sources_search_index'
    );

    if (atlasResults.usingAtlasSearch && atlasResults.items.length > 0) {
      const processedSources = atlasResults.items.map((source) => {
        const exactMatch = isCloseMatch(source.name, query) || isCloseMatch(source.description, query);
        return {
          _id: source._id,
          name: source.name,
          price: source.price,
          description: source.description,
          _type: 'source',
          _score: source.score || 0,
          _exactMatch: exactMatch,
        };
      });

      processedSources.sort((a, b) => {
        if (a._exactMatch && !b._exactMatch) return -1;
        if (!a._exactMatch && b._exactMatch) return 1;
        return (b._score || 0) - (a._score || 0);
      });

      return {
        items: processedSources,
        total: atlasResults.total,
      };
    }
  } catch (error) {
    logger.warn('Atlas Search failed for sources, falling back to regex:', error.message);
  }

  const sourceQuery = {
    $or: [{ name: searchRegex }, { description: searchRegex }],
  };

  // First get total count for pagination info
  const totalCount = await Source.countDocuments(sourceQuery);

  // Execute the query with pagination
  const sources = await Source.find(sourceQuery)
    .sort({ createdAt: -1 }) // Sort by creation date desc by default
    .skip(skip)
    .limit(limit)
    .select('_id name price description')
    .lean();

  // Calculate relevance scores if term regexes provided
  const scoredSources = sources.map((source) => {
    let score = 1; // Base score

    // Fields to check for term matches, with weights
    const fieldsToScore = [
      { field: source.name || '', weight: 5 },
      { field: source.description || '', weight: 3 },
    ];

    // Increase score for each term match in each field
    if (termRegexes && termRegexes.length) {
      termRegexes.forEach((termRegex) => {
        fieldsToScore.forEach(({ field, weight }) => {
          if (termRegex.test(field)) {
            score += weight;
          }
        });
      });
    }

    return {
      ...source,
      _type: 'source',
      _score: score,
      _exactMatch: isCloseMatch(source.name, query) || isCloseMatch(source.description, query),
    };
  });

  // Sort by score if we have term matches, otherwise keep default sort
  if (termRegexes && termRegexes.length > 0) {
    scoredSources.sort((a, b) => {
      // First by exact match
      if (a._exactMatch && !b._exactMatch) return -1;
      if (!a._exactMatch && b._exactMatch) return 1;
      // Then by score
      return b._score - a._score;
    });
  }

  return {
    items: scoredSources,
    total: totalCount,
  };
}

/**
 * Search banks based on user query using MongoDB Atlas Search
 * @param {RegExp} searchRegex - Main search regex for matching (fallback)
 * @param {Array<RegExp>} termRegexes - Individual term regexes for scoring (fallback)
 * @param {Boolean} isAdmin - Whether user is admin
 * @param {Number} limit - Results per page
 * @param {Number} skip - Number of results to skip (pagination)
 * @param {string} query - Original search query string for Atlas Search
 * @returns {Promise<Object>} - Bank search results with pagination info
 */
async function searchBanks(searchRegex, termRegexes, isAdmin, limit, skip = 0, query = '') {
  // Only admins can search banks
  if (!isAdmin) return { items: [], total: 0 };

  // Try Atlas Search first
  try {
    const searchFields = {
      name: { type: 'string' },
      swift_code: { type: 'string' },
    };

    const atlasResults = await performAtlasSearch(
      'banks',
      query,
      searchFields,
      {},
      limit,
      skip,
      'banks_search_index'
    );

    if (atlasResults.usingAtlasSearch && atlasResults.items.length > 0) {
      const processedBanks = atlasResults.items.map((bank) => {
        const exactMatch = isCloseMatch(bank.name, query) || isCloseMatch(bank.swift_code, query);
        return {
          _id: bank._id,
          name: bank.name,
          swift_code: bank.swift_code,
          _type: 'bank',
          _score: bank.score || 0,
          _exactMatch: exactMatch,
        };
      });

      processedBanks.sort((a, b) => {
        if (a._exactMatch && !b._exactMatch) return -1;
        if (!a._exactMatch && b._exactMatch) return 1;
        return (b._score || 0) - (a._score || 0);
      });

      return {
        items: processedBanks,
        total: atlasResults.total,
      };
    }
  } catch (error) {
    logger.warn('Atlas Search failed for banks, falling back to regex:', error.message);
  }

  const bankQuery = {
    $or: [{ name: searchRegex }, { swift_code: searchRegex }],
  };

  // First get total count for pagination info
  const totalCount = await Bank.countDocuments(bankQuery);

  // Execute the query with pagination
  const banks = await Bank.find(bankQuery)
    .skip(skip)
    .limit(limit)
    .select('_id name swift_code')
    .lean();

  // Calculate relevance scores if term regexes provided
  const scoredBanks = banks.map((bank) => {
    let score = 1; // Base score

    // Fields to check for term matches, with weights
    const fieldsToScore = [
      { field: bank.name || '', weight: 5 },
      { field: bank.swift_code || '', weight: 4 },
    ];

    // Increase score for each term match in each field
    if (termRegexes && termRegexes.length) {
      termRegexes.forEach((termRegex) => {
        fieldsToScore.forEach(({ field, weight }) => {
          if (termRegex.test(field)) {
            score += weight;
          }
        });
      });
    }

    return {
      ...bank,
      _type: 'bank',
      _score: score,
      _exactMatch: isCloseMatch(bank.name, query) || isCloseMatch(bank.swift_code, query),
    };
  });

  // Sort by score if we have term matches, otherwise keep default sort
  if (termRegexes && termRegexes.length > 0) {
    scoredBanks.sort((a, b) => {
      // First by exact match
      if (a._exactMatch && !b._exactMatch) return -1;
      if (!a._exactMatch && b._exactMatch) return 1;
      // Then by score
      return b._score - a._score;
    });
  }

  return {
    items: scoredBanks,
    total: totalCount,
  };
}

/**
 * Search reclamations based on user query and permissions using MongoDB Atlas Search
 * @param {RegExp} searchRegex - Main search regex for matching (fallback)
 * @param {Array<RegExp>} termRegexes - Individual term regexes for scoring (fallback)
 * @param {Boolean} isAdmin - Whether user is admin
 * @param {Number} limit - Results per page
 * @param {Number} skip - Number of results to skip (pagination)
 * @param {string} query - Original search query string for Atlas Search
 * @returns {Promise<Object>} - Reclamation search results with pagination info
 */
async function searchReclamations(searchRegex, termRegexes, isAdmin, limit, skip = 0, query = '') {
  // Only admins can search reclamations
  if (!isAdmin) return { items: [], total: 0 };

  // Try Atlas Search first
  try {
    const searchFields = {
      reason: { type: 'string' },
      agent_comment: { type: 'string' },
    };

    const atlasResults = await performAtlasSearch(
      'reclamations',
      query,
      searchFields,
      {},
      limit,
      skip,
      'reclamations_search_index'
    );

    if (atlasResults.usingAtlasSearch && atlasResults.items.length > 0) {
      // Need to populate lead_id for reclamations
      const processedReclamations = await Promise.all(
        atlasResults.items.map(async (reclamation) => {
          let leadData = null;
          if (reclamation.lead_id) {
            leadData = await Lead.findById(reclamation.lead_id)
              .select('contact_name email_from phone')
              .lean();
          }
          const exactMatch = 
            isCloseMatch(leadData?.contact_name, query) ||
            isCloseMatch(reclamation.reason, query) ||
            isCloseMatch(reclamation.agent_comment, query);
          return {
            _id: reclamation._id,
            reason: reclamation.reason,
            status: reclamation.status,
            lead_id: reclamation.lead_id,
            agent_comment: reclamation.agent_comment,
            createdAt: reclamation.createdAt,
            updatedAt: reclamation.updatedAt,
            lead_id: leadData ? { ...leadData } : reclamation.lead_id,
            _type: 'reclamation',
            _score: reclamation.score || 0,
            _exactMatch: exactMatch,
          };
        })
      );

      processedReclamations.sort((a, b) => {
        if (a._exactMatch && !b._exactMatch) return -1;
        if (!a._exactMatch && b._exactMatch) return 1;
        return (b._score || 0) - (a._score || 0);
      });

      return {
        items: processedReclamations,
        total: atlasResults.total,
      };
    }
  } catch (error) {
    logger.warn('Atlas Search failed for reclamations, falling back to regex:', error.message);
  }

  const reclamationQuery = {
    $or: [{ reason: searchRegex }, { agent_comment: searchRegex }],
  };

  // First get total count for pagination info
  const totalCount = await Reclamation.countDocuments(reclamationQuery);

  // Execute the query with pagination
  const reclamations = await Reclamation.find(reclamationQuery)
    .sort({ createdAt: -1 }) // Sort by creation date desc by default
    .skip(skip)
    .limit(limit)
    .select('_id reason status lead_id agent_comment createdAt updatedAt')
    .populate('lead_id', 'contact_name email_from phone')
    .lean();

  // Calculate relevance scores if term regexes provided
  const scoredReclamations = reclamations.map((reclamation) => {
    let score = 1; // Base score

    // Fields to check for term matches, with weights
    const fieldsToScore = [
      { field: reclamation.reason || '', weight: 5 },
      { field: reclamation.status || '', weight: 3 },
      { field: reclamation.agent_comment || '', weight: 4 },
      { field: reclamation.lead_id?.contact_name || '', weight: 5 },
      { field: reclamation.lead_id?.email_from || '', weight: 3 },
      { field: reclamation.lead_id?.phone || '', weight: 3 },
    ];

    // Increase score for each term match in each field
    if (termRegexes && termRegexes.length) {
      termRegexes.forEach((termRegex) => {
        fieldsToScore.forEach(({ field, weight }) => {
          if (termRegex.test(field)) {
            score += weight;
          }
        });
      });
    }

    return {
      ...reclamation,
      _type: 'reclamation',
      _score: score,
      _exactMatch:
        isCloseMatch(reclamation.lead_id?.contact_name, query) ||
        isCloseMatch(reclamation.reason, query) ||
        isCloseMatch(reclamation.agent_comment, query),
    };
  });

  // Sort by score if we have term matches, otherwise keep default sort
  if (termRegexes && termRegexes.length > 0) {
    scoredReclamations.sort((a, b) => {
      // First by exact match
      if (a._exactMatch && !b._exactMatch) return -1;
      if (!a._exactMatch && b._exactMatch) return 1;
      // Then by score
      return b._score - a._score;
    });
  }

  return {
    items: scoredReclamations,
    total: totalCount,
  };
}

/**
 * Search status settings based on user query using MongoDB Atlas Search
 * @param {RegExp} searchRegex - Main search regex for matching (fallback)
 * @param {Array<RegExp>} termRegexes - Individual term regexes for scoring (fallback)
 * @param {Boolean} isAdmin - Whether user is admin
 * @param {Number} limit - Results per page
 * @param {Number} skip - Number of results to skip (pagination)
 * @param {string} query - Original search query string for Atlas Search
 * @returns {Promise<Object>} - Status search results with pagination info
 */
async function searchStatuses(searchRegex, termRegexes, isAdmin, limit, skip = 0, query = '') {
  // Only admins can search statuses
  if (!isAdmin) return { items: [], total: 0 };

  // Note: Statuses are stored in Settings collection with nested structure
  // Atlas Search may not work well for this, so we'll keep regex fallback as primary
  // But we'll still try Atlas Search first

  try {
    // Find stage settings
    const stageSettings = await Settings.findOne({
      type: SETTINGS_TYPES.STAGE,
    }).lean();

    if (!stageSettings || !stageSettings.info) return { items: [], total: 0 };

    // Search through stages and statuses
    const allMatchingItems = [];

    // Handle both array and direct object structure
    const stagesList = Array.isArray(stageSettings.info)
      ? stageSettings.info
      : [stageSettings.info];

    // First pass: collect all matching items without limit (for total count)
    for (const stage of stagesList) {
      if (!stage || !stage.name) continue;

      // Check if stage name matches
      const stageMatches = searchRegex.test(stage.name);

      // Add the stage itself if its name matches
      if (stageMatches) {
        allMatchingItems.push({
          _id: stage._id || new mongoose.Types.ObjectId(),
          name: stage.name,
          type: 'stage',
          isWonStage: stage.isWonStage || false,
        });
      }

      // Check each status in this stage
      if (stage.statuses && Array.isArray(stage.statuses)) {
        for (const status of stage.statuses) {
          if (!status || !status.name) continue;

          if (stageMatches || searchRegex.test(status.name)) {
            allMatchingItems.push({
              _id: status._id || new mongoose.Types.ObjectId(),
              name: status.name,
              stage: stage.name,
              type: 'status',
              allowed: status.allowed !== false, // default to true if not specified
              stageId: stage._id,
            });
          }
        }
      }
    }

    // Calculate scores for all items
    const scoredItems = allMatchingItems.map((item) => {
      let score = 1; // Base score

      // Fields to check for term matches, with weights
      const fieldsToScore = [
        { field: item.name || '', weight: 5 },
        { field: item.stage || '', weight: 3 },
      ];

      // Increase score for each term match in each field
      if (termRegexes && termRegexes.length) {
        termRegexes.forEach((termRegex) => {
          fieldsToScore.forEach(({ field, weight }) => {
            if (termRegex.test(field)) {
              score += weight;
            }
          });
        });
      }

      // Boost stages over statuses (since they're more important)
      if (item.type === 'stage') score += 2;

      return {
        ...item,
        _score: score,
        _exactMatch: isCloseMatch(item.name, query),
      };
    });

    // Sort by score if we have term matches
    if (termRegexes && termRegexes.length > 0) {
      scoredItems.sort((a, b) => {
        // First by exact match
        if (a._exactMatch && !b._exactMatch) return -1;
        if (!a._exactMatch && b._exactMatch) return 1;
        // Then by score
        return b._score - a._score;
      });
    } else {
      // Default sort: stages first, then alphabetically by name
      scoredItems.sort((a, b) => {
        if (a.type === 'stage' && b.type !== 'stage') return -1;
        if (a.type !== 'stage' && b.type === 'stage') return 1;
        return a.name.localeCompare(b.name);
      });
    }

    // Apply pagination
    const totalCount = scoredItems.length;
    const paginatedItems = scoredItems.slice(skip, skip + limit);

    return {
      items: paginatedItems,
      total: totalCount,
    };
  } catch (error) {
    logger.error('Error searching status settings:', error);
    return { items: [], total: 0 };
  }
}

/**
 * Search mail servers based on user query using MongoDB Atlas Search
 * @param {RegExp} searchRegex - Main search regex for matching (fallback)
 * @param {Array<RegExp>} termRegexes - Individual term regexes for scoring (fallback)
 * @param {Boolean} isAdmin - Whether user is admin
 * @param {Number} limit - Results per page
 * @param {Number} skip - Number of results to skip (pagination)
 * @param {string} query - Original search query string for Atlas Search
 * @returns {Promise<Object>} - Mail server search results with pagination info
 */
async function searchMailServers(searchRegex, termRegexes, isAdmin, limit, skip = 0, query = '') {
  // Only admins can search mail servers
  if (!isAdmin) return { items: [], total: 0 };

  // Try Atlas Search first
  try {
    const searchFields = {
      name: { type: 'string' },
    };

    const filterQuery = { type: SETTINGS_TYPES.MAIL_SERVERS };

    const atlasResults = await performAtlasSearch(
      'settings',
      query,
      searchFields,
      filterQuery,
      limit,
      skip,
      'mailservers_search_index'
    );

    if (atlasResults.usingAtlasSearch && atlasResults.items.length > 0) {
      const processedServers = atlasResults.items.map((server) => {
        const exactMatch = isCloseMatch(server.name, query);
        return {
          _id: server._id,
          name: server.name,
          type: server.type,
          info: server.info,
          createdAt: server.createdAt,
          updatedAt: server.updatedAt,
          _type: 'mailserver',
          _score: server.score || 0,
          _exactMatch: exactMatch,
        };
      });

      processedServers.sort((a, b) => {
        if (a._exactMatch && !b._exactMatch) return -1;
        if (!a._exactMatch && b._exactMatch) return 1;
        return (b._score || 0) - (a._score || 0);
      });

      return {
        items: processedServers,
        total: atlasResults.total,
      };
    }
  } catch (error) {
    logger.warn('Atlas Search failed for mail servers, falling back to regex:', error.message);
  }

  try {
    const mailServerQuery = {
      type: SETTINGS_TYPES.MAIL_SERVERS,
      name: searchRegex,
    };

    // First get total count for pagination info
    const totalCount = await Settings.countDocuments(mailServerQuery);

    // Execute the query with pagination
    const mailServers = await Settings.find(mailServerQuery)
      .sort({ createdAt: -1 }) // Sort by creation date desc by default
      .skip(skip)
      .limit(limit)
      .select('_id name type info createdAt updatedAt')
      .lean();

    // Calculate relevance scores if term regexes provided
    const scoredMailServers = mailServers.map((mailServer) => {
      let score = 1; // Base score

      // Fields to check for term matches, with weights
      const fieldsToScore = [
        { field: mailServer.name || '', weight: 5 },
      ];

      // Increase score for each term match in each field
      if (termRegexes && termRegexes.length) {
        termRegexes.forEach((termRegex) => {
          fieldsToScore.forEach(({ field, weight }) => {
            if (termRegex.test(field)) {
              score += weight;
            }
          });
        });
      }

      return {
        ...mailServer,
        _type: 'mailserver',
        _score: score,
        _exactMatch: isCloseMatch(mailServer.name, query),
      };
    });

    // Sort by score if we have term matches, otherwise keep default sort
    if (termRegexes && termRegexes.length > 0) {
      scoredMailServers.sort((a, b) => {
        // First by exact match
        if (a._exactMatch && !b._exactMatch) return -1;
        if (!a._exactMatch && b._exactMatch) return 1;
        // Then by score
        return b._score - a._score;
      });
    }

    return {
      items: scoredMailServers,
      total: totalCount,
    };
  } catch (error) {
    logger.error('Error searching mail servers:', error);
    return { items: [], total: 0 };
  }
}

/**
 * Search VOIP servers based on user query using MongoDB Atlas Search
 * @param {RegExp} searchRegex - Main search regex for matching (fallback)
 * @param {Array<RegExp>} termRegexes - Individual term regexes for scoring (fallback)
 * @param {Boolean} isAdmin - Whether user is admin
 * @param {Number} limit - Results per page
 * @param {Number} skip - Number of results to skip (pagination)
 * @param {string} query - Original search query string for Atlas Search
 * @returns {Promise<Object>} - VOIP server search results with pagination info
 */
async function searchVoipServers(searchRegex, termRegexes, isAdmin, limit, skip = 0, query = '') {
  // Only admins can search VOIP servers
  if (!isAdmin) return { items: [], total: 0 };

  // Try Atlas Search first
  try {
    const searchFields = {
      name: { type: 'string' },
      'info.domain': { type: 'string' },
    };

    const filterQuery = { type: SETTINGS_TYPES.VOIP_SERVERS };

    const atlasResults = await performAtlasSearch(
      'settings',
      query,
      searchFields,
      filterQuery,
      limit,
      skip,
      'voipservers_search_index'
    );

    if (atlasResults.usingAtlasSearch && atlasResults.items.length > 0) {
      const processedServers = atlasResults.items.map((voip) => {
        const exactMatch = isCloseMatch(voip.name, query) || isCloseMatch(voip.info?.domain, query);
        return {
          _id: voip._id,
          name: voip.name,
          type: voip.type,
          info: voip.info,
          createdAt: voip.createdAt,
          updatedAt: voip.updatedAt,
          _type: 'voipservers',
          _score: voip.score || 0,
          _exactMatch: exactMatch,
        };
      });

      processedServers.sort((a, b) => {
        if (a._exactMatch && !b._exactMatch) return -1;
        if (!a._exactMatch && b._exactMatch) return 1;
        return (b._score || 0) - (a._score || 0);
      });

      return {
        items: processedServers,
        total: atlasResults.total,
      };
    }
  } catch (error) {
    logger.warn('Atlas Search failed for VOIP servers, falling back to regex:', error.message);
  }

  try {
    const voipQuery = {
      type: SETTINGS_TYPES.VOIP_SERVERS,
      $or: [{ name: searchRegex }, { 'info.domain': searchRegex }],
    };

    const totalCount = await Settings.countDocuments(voipQuery);

    const voipServers = await Settings.find(voipQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('_id name type info createdAt updatedAt')
      .lean();

    const scoredVoipServers = voipServers.map((voip) => {
      let score = 1;

      const fieldsToScore = [
        { field: voip.name || '', weight: 5 },
        { field: voip.info?.domain || '', weight: 3 },
      ];

      if (termRegexes && termRegexes.length) {
        termRegexes.forEach((termRegex) => {
          fieldsToScore.forEach(({ field, weight }) => {
            if (termRegex.test(field)) {
              score += weight;
            }
          });
        });
      }

      return {
        ...voip,
        _type: 'voipservers',
        _score: score,
        _exactMatch: isCloseMatch(voip.name, query) || isCloseMatch(voip.info?.domain, query),
      };
    });

    if (termRegexes && termRegexes.length > 0) {
      scoredVoipServers.sort((a, b) => {
        if (a._exactMatch && !b._exactMatch) return -1;
        if (!a._exactMatch && b._exactMatch) return 1;
        return b._score - a._score;
      });
    }

    return {
      items: scoredVoipServers,
      total: totalCount,
    };
  } catch (error) {
    logger.error('Error searching VOIP servers:', error);
    return { items: [], total: 0 };
  }
}

/**
 * Search payment terms based on user query using MongoDB Atlas Search
 * @param {RegExp} searchRegex - Main search regex for matching (fallback)
 * @param {Array<RegExp>} termRegexes - Individual term regexes for scoring (fallback)
 * @param {Boolean} isAdmin - Whether user is admin
 * @param {Number} limit - Results per page
 * @param {Number} skip - Number of results to skip (pagination)
 * @param {string} query - Original search query string for Atlas Search
 * @returns {Promise<Object>} - Payment terms search results with pagination info
 */
async function searchPaymentTerms(searchRegex, termRegexes, isAdmin, limit, skip = 0, query = '') {
  // Only admins can search payment terms
  if (!isAdmin) return { items: [], total: 0 };

  // Try Atlas Search first
  try {
    const searchFields = {
      name: { type: 'string' },
      'info.info.description': { type: 'string' },
    };

    const filterQuery = { type: SETTINGS_TYPES.PAYMENT_TERMS };

    const atlasResults = await performAtlasSearch(
      'settings',
      query,
      searchFields,
      filterQuery,
      limit,
      skip,
      'payment_terms_search_index'
    );

    if (atlasResults.usingAtlasSearch && atlasResults.items.length > 0) {
      const processedTerms = atlasResults.items.map((term) => {
        const exactMatch = isCloseMatch(term.name, query) || isCloseMatch(term.info?.info?.description, query);
        return {
          _id: term._id,
          name: term.name,
          type: term.type,
          info: term.info,
          createdAt: term.createdAt,
          updatedAt: term.updatedAt,
          _type: 'payment_terms',
          _score: term.score || 0,
          _exactMatch: exactMatch,
        };
      });

      processedTerms.sort((a, b) => {
        if (a._exactMatch && !b._exactMatch) return -1;
        if (!a._exactMatch && b._exactMatch) return 1;
        return (b._score || 0) - (a._score || 0);
      });

      return {
        items: processedTerms,
        total: atlasResults.total,
      };
    }
  } catch (error) {
    logger.warn('Atlas Search failed for payment terms, falling back to regex:', error.message);
  }

  try {
    const paymentTermsQuery = {
      type: SETTINGS_TYPES.PAYMENT_TERMS,
      $or: [{ name: searchRegex }, { 'info.info.description': searchRegex }],
    };

    const totalCount = await Settings.countDocuments(paymentTermsQuery);

    const paymentTerms = await Settings.find(paymentTermsQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('_id name type info createdAt updatedAt')
      .lean();

    const scoredPaymentTerms = paymentTerms.map((term) => {
      let score = 1;

      const fieldsToScore = [
        { field: term.name || '', weight: 5 },
        { field: term.info?.info?.description || '', weight: 3 },
      ];

      if (termRegexes && termRegexes.length) {
        termRegexes.forEach((termRegex) => {
          fieldsToScore.forEach(({ field, weight }) => {
            if (termRegex.test(field)) {
              score += weight;
            }
          });
        });
      }

      return {
        ...term,
        _type: 'payment_terms',
        _score: score,
        _exactMatch: isCloseMatch(term.name, query) || isCloseMatch(term.info?.info?.description, query),
      };
    });

    if (termRegexes && termRegexes.length > 0) {
      scoredPaymentTerms.sort((a, b) => {
        if (a._exactMatch && !b._exactMatch) return -1;
        if (!a._exactMatch && b._exactMatch) return 1;
        return b._score - a._score;
      });
    }

    return {
      items: scoredPaymentTerms,
      total: totalCount,
    };
  } catch (error) {
    logger.error('Error searching payment terms:', error);
    return { items: [], total: 0 };
  }
}

/**
 * Search users (agents) based on query (login, name, email) using MongoDB Atlas Search
 * @param {RegExp} searchRegex - Main search regex for matching (fallback)
 * @param {Array<RegExp>} termRegexes - Individual term regexes for scoring (fallback)
 * @param {Boolean} isAdmin - Whether requester is admin
 * @param {Number} limit - Results per page
 * @param {Number} skip - Number of results to skip (pagination)
 * @param {string} query - Original search query string for Atlas Search
 * @returns {Promise<Object>} - User search results with pagination info
 */
async function searchUsers(searchRegex, termRegexes, isAdmin, limit, skip = 0, query = '') {
  // Only admins can search users to avoid leaking user data to agents
  if (!isAdmin) return { items: [], total: 0 };

  // Try Atlas Search first
  try {
    const searchFields = {
      login: { type: 'string' },
      role: { type: 'string' },
      'info.name': { type: 'string' },
      'info.complete_name': { type: 'string' },
      'info.email': { type: 'string' },
    };

    const filterQuery = { active: true };

    const atlasResults = await performAtlasSearch(
      'users',
      query,
      searchFields,
      filterQuery,
      limit,
      skip,
      'users_search_index'
    );

    if (atlasResults.usingAtlasSearch && atlasResults.items.length > 0) {
      const processedUsers = atlasResults.items.map((user) => {
        const displayName = user.info?.complete_name || user.info?.name || user.login || 'Unnamed user';
        const exactMatch = 
          isCloseMatch(user.login, query) ||
          isCloseMatch(user.info?.name, query) ||
          isCloseMatch(user.info?.complete_name, query) ||
          isCloseMatch(user.info?.email, query);
        return {
          _id: user._id,
          login: user.login,
          role: user.role,
          info: user.info,
          active: user.active,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          name: displayName,
          _type: 'user',
          _score: user.score || 0,
          _exactMatch: exactMatch,
        };
      });

      processedUsers.sort((a, b) => {
        if (a._exactMatch && !b._exactMatch) return -1;
        if (!a._exactMatch && b._exactMatch) return 1;
        return (b._score || 0) - (a._score || 0);
      });

      return {
        items: processedUsers,
        total: atlasResults.total,
      };
    }
  } catch (error) {
    logger.warn('Atlas Search failed for users, falling back to regex:', error.message);
  }

  try {
    const userQuery = {
      active: true,
      $or: [
        { login: searchRegex },
        { role: searchRegex },
        { 'info.name': searchRegex },
        { 'info.complete_name': searchRegex },
        { 'info.email': searchRegex },
      ],
    };

    const totalCount = await User.countDocuments(userQuery);

    const users = await User.find(userQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('_id login role info active createdAt updatedAt')
      .lean();

    const scoredUsers = users.map((user) => {
      let score = 1;

      const displayName =
        user.info?.complete_name || user.info?.name || user.login || 'Unnamed user';

      const fieldsToScore = [
        { field: user.login || '', weight: 6 },
        { field: user.role || '', weight: 2 },
        { field: user.info?.name || '', weight: 4 },
        { field: user.info?.complete_name || '', weight: 4 },
        { field: user.info?.email || '', weight: 3 },
      ];

      if (termRegexes && termRegexes.length) {
        termRegexes.forEach((termRegex) => {
          fieldsToScore.forEach(({ field, weight }) => {
            if (termRegex.test(field)) {
              score += weight;
            }
          });
        });
      }

      return {
        ...user,
        name: displayName, // used by global flat mapper
        _type: 'user',
        _score: score,
        _exactMatch: 
          isCloseMatch(user.login, query) ||
          isCloseMatch(user.info?.name, query) ||
          isCloseMatch(user.info?.complete_name, query) ||
          isCloseMatch(user.info?.email, query),
      };
    });

    if (termRegexes && termRegexes.length > 0) {
      scoredUsers.sort((a, b) => {
        if (a._exactMatch && !b._exactMatch) return -1;
        if (!a._exactMatch && b._exactMatch) return 1;
        return b._score - a._score;
      });
    }

    return {
      items: scoredUsers,
      total: totalCount,
    };
  } catch (error) {
    logger.error('Error searching users:', error);
    return { items: [], total: 0 };
  }
}

/**
 * Search documents based on user query using MongoDB Atlas Search
 * @param {RegExp} searchRegex - Main search regex for matching (fallback)
 * @param {Array<RegExp>} termRegexes - Individual term regexes for scoring (fallback)
 * @param {Boolean} isAdmin - Whether user is admin
 * @param {Number} limit - Results per page
 * @param {Number} skip - Number of results to skip (pagination)
 * @param {string} query - Original search query string for Atlas Search
 * @returns {Promise<Object>} - Document search results with pagination info
 */
async function searchDocuments(searchRegex, termRegexes, isAdmin, limit, skip = 0, query = '') {
  // Only admins can search documents
  if (!isAdmin) return { items: [], total: 0 };

  // Try Atlas Search first
  try {
    const searchFields = {
      filename: { type: 'string' },
      searchable_text: { type: 'string' },
      tags: { type: 'string' },
    };

    const filterQuery = { active: true };

    const atlasResults = await performAtlasSearch(
      'documents',
      query,
      searchFields,
      filterQuery,
      limit,
      skip,
      'documents_search_index'
    );

    if (atlasResults.usingAtlasSearch && atlasResults.items.length > 0) {
      const processedDocuments = atlasResults.items.map((document) => {
        const exactMatch = 
          isCloseMatch(document.filename, query) ||
          isCloseMatch(document.searchable_text, query);
        return {
          _id: document._id,
          filename: document.filename,
          filetype: document.filetype,
          type: document.type,
          library_status: document.library_status,
          tags: document.tags,
          notes: document.notes,
          createdAt: document.createdAt,
          _type: 'document',
          _score: document.score || 0,
          _exactMatch: exactMatch,
        };
      });

      processedDocuments.sort((a, b) => {
        if (a._exactMatch && !b._exactMatch) return -1;
        if (!a._exactMatch && b._exactMatch) return 1;
        return (b._score || 0) - (a._score || 0);
      });

      return {
        items: processedDocuments,
        total: atlasResults.total,
      };
    }
  } catch (error) {
    logger.warn('Atlas Search failed for documents, falling back to regex:', error.message);
  }
  try {
    const documentQuery = {
      $or: [
        { filename: searchRegex },
        { searchable_text: searchRegex },
        { tags: searchRegex },
      ],
      active: true,
    };

    // First get total count for pagination info
    const totalCount = await Document.countDocuments(documentQuery);

    // Execute the query with pagination
    const documents = await Document.find(documentQuery)
      .sort({ createdAt: -1 }) // Sort by creation date desc by default
      .skip(skip)
      .limit(limit)
      .select('_id filename filetype type library_status tags notes createdAt')
      .lean();

    // Calculate relevance scores if term regexes provided
    const scoredDocuments = documents.map((document) => {
      let score = 1; // Base score

      // Fields to check for term matches, with weights
      const fieldsToScore = [
        { field: document.filename || '', weight: 6 },
        { field: document.searchable_text || '', weight: 3 },
        { field: document.tags ? document.tags.join(' ') : '', weight: 2 },
        { field: document.notes || '', weight: 2 },
      ];

      // Increase score for each term match in each field
      if (termRegexes && termRegexes.length) {
        termRegexes.forEach((termRegex) => {
          fieldsToScore.forEach(({ field, weight }) => {
            if (termRegex.test(field)) {
              score += weight;
            }
          });
        });
      }

      return {
        ...document,
        _type: 'document',
        _score: score,
        _exactMatch: isCloseMatch(document.filename, query) || isCloseMatch(document.searchable_text, query),
      };
    });

    // Sort by score if we have term matches, otherwise keep default sort
    if (termRegexes && termRegexes.length > 0) {
      scoredDocuments.sort((a, b) => {
        // First by exact match
        if (a._exactMatch && !b._exactMatch) return -1;
        if (!a._exactMatch && b._exactMatch) return 1;
        // Then by score
        return b._score - a._score;
      });
    }

    return {
      items: scoredDocuments,
      total: totalCount,
    };
  } catch (error) {
    logger.error('Error searching documents:', error);
    return { items: [], total: 0 };
  }
}

/**
 * Search todos based on message using MongoDB Atlas Search
 * @param {RegExp} searchRegex - Main search regex for matching (fallback)
 * @param {Array<RegExp>} termRegexes - Individual term regexes for scoring (fallback)
 * @param {Object} user - User object
 * @param {Boolean} isAdmin - Whether user is admin
 * @param {Number} limit - Results per page
 * @param {Number} skip - Number of results to skip (pagination)
 * @param {string} query - Original search query string for Atlas Search
 * @returns {Promise<Object>} - Todo search results with pagination info
 */
async function searchTodos(searchRegex, termRegexes, user, isAdmin, limit, skip = 0, query = '') {
  // Only admins can search todos
  if (!isAdmin) return { items: [], total: 0 };

  // Try Atlas Search first
  try {
    const searchFields = {
      message: { type: 'string' },
    };

    const filterQuery = { active: true };

    const atlasResults = await performAtlasSearch(
      'todos',
      query,
      searchFields,
      filterQuery,
      limit,
      skip,
      'todos_search_index'
    );

    if (atlasResults.usingAtlasSearch && atlasResults.items.length > 0) {
      const processedTodos = atlasResults.items.map((todo) => {
        const exactMatch = isCloseMatch(todo.message, query);
        return {
          _id: todo._id,
          message: todo.message,
          isDone: todo.isDone,
          active: todo.active,
          creator_id: todo.creator_id,
          assigned_to: todo.assigned_to,
          lead_id: todo.lead_id,
          createdAt: todo.createdAt,
          updatedAt: todo.updatedAt,
          name: todo.message,
          _type: 'todo',
          _score: todo.score || 0,
          _exactMatch: exactMatch,
        };
      });

      processedTodos.sort((a, b) => {
        if (a._exactMatch && !b._exactMatch) return -1;
        if (!a._exactMatch && b._exactMatch) return 1;
        return (b._score || 0) - (a._score || 0);
      });

      return {
        items: processedTodos,
        total: atlasResults.total,
      };
    }
  } catch (error) {
    logger.warn('Atlas Search failed for todos, falling back to regex:', error.message);
  }
  try {
    const todoQuery = {
      message: searchRegex,
      active: true,
    };

    // First get total count for pagination info
    const totalCount = await Todo.countDocuments(todoQuery);

    // Execute the query with pagination
    const todos = await Todo.find(todoQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('_id message isDone active creator_id assigned_to lead_id createdAt updatedAt')
      .lean();

    // Calculate relevance scores if term regexes provided
    const scoredTodos = todos.map((todo) => {
      let score = 1; // Base score

      // Fields to check for term matches, with weights
      const fieldsToScore = [
        { field: todo.message || '', weight: 5 },
      ];

      // Increase score for each term match in each field
      if (termRegexes && termRegexes.length) {
        termRegexes.forEach((termRegex) => {
          fieldsToScore.forEach(({ field, weight }) => {
            if (termRegex.test(field)) {
              score += weight;
            }
          });
        });
      }

      return {
        ...todo,
        name: todo.message, // Use message as name for display
        _type: 'todo',
        _score: score,
        _exactMatch: isCloseMatch(todo.message, query),
      };
    });

    // Sort by score if we have term matches, otherwise keep default sort
    if (termRegexes && termRegexes.length > 0) {
      scoredTodos.sort((a, b) => {
        // First by exact match
        if (a._exactMatch && !b._exactMatch) return -1;
        if (!a._exactMatch && b._exactMatch) return 1;
        // Then by score
        return b._score - a._score;
      });
    }

    return {
      items: scoredTodos,
      total: totalCount,
    };
  } catch (error) {
    logger.error('Error searching todos:', error);
    return { items: [], total: 0 };
  }
}

/**
 * Search PDF templates based on name using MongoDB Atlas Search
 * @param {RegExp} searchRegex - Main search regex for matching (fallback)
 * @param {Array<RegExp>} termRegexes - Individual term regexes for scoring (fallback)
 * @param {Boolean} isAdmin - Whether user is admin
 * @param {Number} limit - Results per page
 * @param {Number} skip - Number of results to skip (pagination)
 * @param {string} query - Original search query string for Atlas Search
 * @returns {Promise<Object>} - PDF template search results with pagination info
 */
async function searchPdfTemplates(searchRegex, termRegexes, isAdmin, limit, skip = 0, query = '') {
  // Only admins can search PDF templates
  if (!isAdmin) return { items: [], total: 0 };

  // Try Atlas Search first
  try {
    const searchFields = {
      name: { type: 'string' },
      description: { type: 'string' },
    };

    const filterQuery = { active: true };

    const atlasResults = await performAtlasSearch(
      'pdftemplates',
      query,
      searchFields,
      filterQuery,
      limit,
      skip,
      'pdf_templates_search_index'
    );

    if (atlasResults.usingAtlasSearch && atlasResults.items.length > 0) {
      const processedTemplates = atlasResults.items.map((template) => {
        const exactMatch = isCloseMatch(template.name, query) || isCloseMatch(template.description, query);
        return {
          _id: template._id,
          name: template.name,
          description: template.description,
          category: template.category,
          offer_type: template.offer_type,
          status: template.status,
          createdAt: template.createdAt,
          updatedAt: template.updatedAt,
          _type: 'pdf_template',
          _score: template.score || 0,
          _exactMatch: exactMatch,
        };
      });

      processedTemplates.sort((a, b) => {
        if (a._exactMatch && !b._exactMatch) return -1;
        if (!a._exactMatch && b._exactMatch) return 1;
        return (b._score || 0) - (a._score || 0);
      });

      return {
        items: processedTemplates,
        total: atlasResults.total,
      };
    }
  } catch (error) {
    logger.warn('Atlas Search failed for PDF templates, falling back to regex:', error.message);
  }

  try {
    const pdfTemplateQuery = {
      $or: [
        { name: searchRegex },
        { description: searchRegex },
      ],
      active: true,
    };

    // First get total count for pagination info
    const totalCount = await PdfTemplate.countDocuments(pdfTemplateQuery);

    // Execute the query with pagination
    const pdfTemplates = await PdfTemplate.find(pdfTemplateQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('_id name description category offer_type status createdAt updatedAt')
      .lean();

    // Calculate relevance scores if term regexes provided
    const scoredPdfTemplates = pdfTemplates.map((template) => {
      let score = 1; // Base score

      // Fields to check for term matches, with weights
      const fieldsToScore = [
        { field: template.name || '', weight: 6 },
        { field: template.description || '', weight: 3 },
      ];

      // Increase score for each term match in each field
      if (termRegexes && termRegexes.length) {
        termRegexes.forEach((termRegex) => {
          fieldsToScore.forEach(({ field, weight }) => {
            if (termRegex.test(field)) {
              score += weight;
            }
          });
        });
      }

      return {
        ...template,
        _type: 'pdf_template',
        _score: score,
        _exactMatch: isCloseMatch(template.name, query) || isCloseMatch(template.description, query),
      };
    });

    // Sort by score if we have term matches, otherwise keep default sort
    if (termRegexes && termRegexes.length > 0) {
      scoredPdfTemplates.sort((a, b) => {
        // First by exact match
        if (a._exactMatch && !b._exactMatch) return -1;
        if (!a._exactMatch && b._exactMatch) return 1;
        // Then by score
        return b._score - a._score;
      });
    }

    return {
      items: scoredPdfTemplates,
      total: totalCount,
    };
  } catch (error) {
    logger.error('Error searching PDF templates:', error);
    return { items: [], total: 0 };
  }
}

/**
 * Search email templates based on name using MongoDB Atlas Search
 * @param {RegExp} searchRegex - Main search regex for matching (fallback)
 * @param {Array<RegExp>} termRegexes - Individual term regexes for scoring (fallback)
 * @param {Boolean} isAdmin - Whether user is admin
 * @param {Number} limit - Results per page
 * @param {Number} skip - Number of results to skip (pagination)
 * @param {string} query - Original search query string for Atlas Search
 * @returns {Promise<Object>} - Email template search results with pagination info
 */
async function searchEmailTemplates(searchRegex, termRegexes, isAdmin, limit, skip = 0, query = '') {
  // Only admins can search email templates
  if (!isAdmin) return { items: [], total: 0 };

  // Try Atlas Search first
  try {
    const searchFields = {
      name: { type: 'string' },
    };

    const filterQuery = { type: SETTINGS_TYPES.EMAIL_TEMPLATES };

    const atlasResults = await performAtlasSearch(
      'settings',
      query,
      searchFields,
      filterQuery,
      limit,
      skip,
      'email_templates_search_index'
    );

    if (atlasResults.usingAtlasSearch && atlasResults.items.length > 0) {
      const processedTemplates = atlasResults.items.map((template) => {
        const exactMatch = isCloseMatch(template.name, query);
        return {
          _id: template._id,
          name: template.name,
          type: template.type,
          info: template.info,
          createdAt: template.createdAt,
          updatedAt: template.updatedAt,
          _type: 'email_template',
          _score: template.score || 0,
          _exactMatch: exactMatch,
        };
      });

      processedTemplates.sort((a, b) => {
        if (a._exactMatch && !b._exactMatch) return -1;
        if (!a._exactMatch && b._exactMatch) return 1;
        return (b._score || 0) - (a._score || 0);
      });

      return {
        items: processedTemplates,
        total: atlasResults.total,
      };
    }
  } catch (error) {
    logger.warn('Atlas Search failed for email templates, falling back to regex:', error.message);
  }

  try {
    const emailTemplateQuery = {
      type: SETTINGS_TYPES.EMAIL_TEMPLATES,
      name: searchRegex,
    };

    // First get total count for pagination info
    const totalCount = await Settings.countDocuments(emailTemplateQuery);

    // Execute the query with pagination
    const emailTemplates = await Settings.find(emailTemplateQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('_id name type info createdAt updatedAt')
      .lean();

    // Calculate relevance scores if term regexes provided
    const scoredEmailTemplates = emailTemplates.map((template) => {
      let score = 1; // Base score

      // Fields to check for term matches, with weights
      const fieldsToScore = [
        { field: template.name || '', weight: 5 },
      ];

      // Increase score for each term match in each field
      if (termRegexes && termRegexes.length) {
        termRegexes.forEach((termRegex) => {
          fieldsToScore.forEach(({ field, weight }) => {
            if (termRegex.test(field)) {
              score += weight;
            }
          });
        });
      }

      return {
        ...template,
        _type: 'email_template',
        _score: score,
        _exactMatch: isCloseMatch(template.name, query),
      };
    });

    // Sort by score if we have term matches, otherwise keep default sort
    if (termRegexes && termRegexes.length > 0) {
      scoredEmailTemplates.sort((a, b) => {
        // First by exact match
        if (a._exactMatch && !b._exactMatch) return -1;
        if (!a._exactMatch && b._exactMatch) return 1;
        // Then by score
        return b._score - a._score;
      });
    }

    return {
      items: scoredEmailTemplates,
      total: totalCount,
    };
  } catch (error) {
    logger.error('Error searching email templates:', error);
    return { items: [], total: 0 };
  }
}

module.exports = {
  globalSearch,
};

