/**
 * Source Controller
 * HTTP request handlers for source management
 * RESPONSE FORMAT: Matches monolith exactly
 */

const sourceService = require('../services/sourceService');
const logger = require('../utils/logger');

/**
 * Get all sources
 * Matches monolith: Returns { data: [...], meta: {...} }
 */
async function getAllSources(req, res, next) {
  try {
    const { page, limit, search, showInactive, sortBy, sortOrder, provider_id, select = '' } = req.query;
    
    const result = await sourceService.getAllSources({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      search,
      showInactive,
      sortBy,
      sortOrder,
      provider_id,
      select,
    });
    
    // Monolith returns { data: [...], meta: {...} } directly
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Get source by ID
 * Matches monolith: Returns source object directly
 */
async function getSourceById(req, res, next) {
  try {
    const { id } = req.params;
    
    const source = await sourceService.getSourceById(id);
    
    // Monolith returns source object directly (no wrapper)
    res.status(200).json(source);
  } catch (error) {
    next(error);
  }
}

/**
 * Create source
 * Matches monolith: Returns source object directly (201 status)
 */
async function createSource(req, res, next) {
  try {
    const sourceData = req.body;
    const user = req.user;
    
    const source = await sourceService.createSource(sourceData, user);
    
    // Monolith returns source object directly (no wrapper, no message)
    res.status(201).json(source);
  } catch (error) {
    next(error);
  }
}

/**
 * Update source
 * Matches monolith: Returns source object directly
 */
async function updateSource(req, res, next) {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const user = req.user;
    
    const source = await sourceService.updateSource(id, updateData, user);
    
    // Monolith returns source object directly (no wrapper, no message)
    res.status(200).json(source);
  } catch (error) {
    next(error);
  }
}

/**
 * Delete source(s)
 * Matches monolith: Returns { message, deletedCount }
 */
async function deleteSource(req, res, next) {
  try {
    const { ids } = req.body;
    const { id } = req.params;
    const user = req.user;
    
    // Support both single ID from params and multiple IDs from body
    const sourceIds = ids || id;
    
    if (!sourceIds) {
      return res.status(400).json({
        error: 'Source ID(s) required'
      });
    }
    
    const result = await sourceService.deleteSource(sourceIds, user);
    
    // Monolith returns { message, deletedCount }
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Increment lead count for a source
 * Matches monolith: Returns source object
 */
async function incrementLeadCount(req, res, next) {
  try {
    const { id } = req.params;
    const { count = 1 } = req.body;
    
    const source = await sourceService.incrementLeadCount(id, count);
    
    // Return source object
    res.status(200).json(source);
  } catch (error) {
    next(error);
  }
}

/**
 * Decrement lead count for a source
 * Matches monolith: Returns source object
 */
async function decrementLeadCount(req, res, next) {
  try {
    const { id } = req.params;
    const { count = 1 } = req.body;
    
    const source = await sourceService.decrementLeadCount(id, count);
    
    // Return source object
    res.status(200).json(source);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAllSources,
  getSourceById,
  createSource,
  updateSource,
  deleteSource,
  incrementLeadCount,
  decrementLeadCount,
};
