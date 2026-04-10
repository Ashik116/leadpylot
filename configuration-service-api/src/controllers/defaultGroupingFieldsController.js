/**
 * Default Grouping Fields Controller
 * Handles HTTP requests for default grouping fields operations
 */

const defaultGroupingFieldsService = require('../services/defaultGroupingFieldsService');
const { asyncHandler } = require('../utils/errorHandler');
const logger = require('../utils/logger');

/**
 * Create or update default grouping fields
 * PUT /default-grouping-fields
 * Body: { user_id? or user_ids?: string|string[], defaultGroupingFields: {modelName: {fieldName: boolean}}, defaultFilter?: {modelName: [{field: string, operator: string, value: any}]} }
 * Example: { user_ids: ["id1", "id2"], defaultGroupingFields: {lead: {assign_date: true}}, defaultFilter: {lead: [{field: "use_status", operator: "=", value: "yes"}]} }
 * If user_ids is array, processes multiple users. If user_id is single value or not provided, processes single user.
 */
const createOrUpdateDefaultGroupingFields = asyncHandler(async (req, res) => {
  const { user_id, user_ids, defaultGroupingFields, defaultFilter } = req.body;

  // Check if user_ids array is provided
  if (user_ids && Array.isArray(user_ids) && user_ids.length > 0) {
    // Process multiple users
    const isAdmin = req.user?.role === 'Admin' || req.user?.role === 'Super Admin';

    if (!isAdmin) {
      return res.status(403).json({ message: 'Access denied: Admin role required to update multiple users' });
    }

    // Validate that all user_ids are valid
    const invalidIds = user_ids.filter((id) => !id || typeof id !== 'string');
    if (invalidIds.length > 0) {
      return res.status(400).json({ message: 'All user_ids must be valid strings' });
    }

    const result = await defaultGroupingFieldsService.createOrUpdateDefaultGroupingFieldsForMultipleUsers(
      user_ids,
      defaultGroupingFields,
      defaultFilter || {}
    );

    const statusCode = result.failed === 0 ? 200 : 207; // 207 Multi-Status if some failed
    res.status(statusCode).json(result);
  } else {
    // Process single user (backward compatible)
    const targetUserId = user_id || req.user?._id;

    if (!targetUserId) {
      return res.status(400).json({ message: 'user_id or user_ids is required' });
    }

    // Users can only update their own fields unless they're admin
    const isAdmin = req.user?.role === 'Admin' || req.user?.role === 'Super Admin';
    const isOwnRequest = targetUserId.toString() === req.user?._id?.toString();

    if (!isOwnRequest && !isAdmin) {
      return res.status(403).json({ message: 'Access denied: You can only update your own default grouping fields' });
    }

    const result = await defaultGroupingFieldsService.createOrUpdateDefaultGroupingFields(
      targetUserId,
      defaultGroupingFields,
      defaultFilter || {}
    );

    const statusCode = result.message.includes('created') ? 201 : 200;
    res.status(statusCode).json(result);
  }
});

/**
 * Get default grouping fields for a user
 * GET /default-grouping-fields/:user_id
 * or
 * GET /default-grouping-fields (uses authenticated user's ID)
 */
const getDefaultGroupingFields = asyncHandler(async (req, res) => {
  const { user_id } = req.params;
  
  // If user_id is not in params, use the authenticated user's ID
  const targetUserId = user_id || req.user?._id;

  if (!targetUserId) {
    return res.status(400).json({ message: 'user_id is required' });
  }

  // Users can only view their own fields unless they're admin
  const isAdmin = req.user?.role === 'Admin' || req.user?.role === 'Super Admin';
  const isOwnRequest = targetUserId.toString() === req.user?._id?.toString();

  if (!isOwnRequest && !isAdmin) {
    return res.status(403).json({ message: 'Access denied: You can only view your own default grouping fields' });
  }

  const result = await defaultGroupingFieldsService.getDefaultGroupingFieldsByUserId(targetUserId);
  res.status(200).json(result);
});

/**
 * Get all default grouping fields by model name (page) or for authenticated user
 * GET /default-grouping-fields?page=lead - Returns all records with that model (Admin only)
 * GET /default-grouping-fields - Returns authenticated user's record
 */
const getDefaultGroupingFieldsByPage = asyncHandler(async (req, res) => {
  const { page } = req.query;

  // If page query param is provided, return all records with that model
  if (page) {
    // Admin only for this endpoint since it returns all users' data
    const isAdmin = req.user?.role === 'Admin' || req.user?.role === 'Super Admin';
    
    if (!isAdmin) {
      return res.status(403).json({ message: 'Access denied: Admin role required to view all records by model' });
    }

    const result = await defaultGroupingFieldsService.getDefaultGroupingFieldsByModelName(page);
    return res.status(200).json(result);
  }

  // Otherwise, return authenticated user's record (original behavior)
  const targetUserId = req.user?._id;

  if (!targetUserId) {
    return res.status(400).json({ message: 'user_id is required' });
  }

  const result = await defaultGroupingFieldsService.getDefaultGroupingFieldsByUserId(targetUserId);
  res.status(200).json(result);
});

module.exports = {
  createOrUpdateDefaultGroupingFields,
  getDefaultGroupingFields,
  getDefaultGroupingFieldsByPage,
};




