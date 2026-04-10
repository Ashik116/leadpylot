/**
 * Column Preference Controller
 * Handles HTTP requests for column preference operations
 * 
 * All endpoints return consistent response format:
 * { success: boolean, message: string, data?: any, ... }
 */

const columnService = require('../services/columnService');
const { asyncHandler } = require('../utils/errorHandler');

/**
 * Save or update column preference
 * PUT /column-preference/save
 */
const saveColumnPreference = asyncHandler(async (req, res) => {
  const loggedInUserId = req.user?._id;
  const isAdmin = ['Admin', 'Super Admin'].includes(req.user?.role);

  if (!loggedInUserId) {
    return res.status(401).json({ 
      success: false, 
      message: 'Unauthorized: User ID missing from token' 
    });
  }

  const { user_ids, data, version } = req.body;

  const result = await columnService.saveColumnPreference(
    user_ids,
    data,
    version,
    loggedInUserId,
    isAdmin
  );

  res.status(200).json(result);
});

/**
 * Get column preference by ID
 * GET /column-preference/get-by-id/:id
 */
const getColumnPreferenceById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  if (!id) {
    return res.status(400).json({ 
      success: false, 
      message: 'Preference ID is required' 
    });
  }

  const prefs = await columnService.getColumnPreferenceById(id);
  res.status(200).json({ success: true, data: prefs });
});

/**
 * Delete column preference
 * DELETE /column-preference/delete/:id
 */
const deleteColumnPreference = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  if (!id) {
    return res.status(400).json({ 
      success: false, 
      message: 'Preference ID is required' 
    });
  }

  const result = await columnService.deleteColumnPreference(id);
  res.status(200).json(result);
});

/**
 * Create or update default column preference (Admin only)
 * POST /column-preference/default
 */
const createDefaultColumnPreference = asyncHandler(async (req, res) => {
  const admin_id = req.user?._id;
  const isAdmin = ['Admin', 'Super Admin'].includes(req.user?.role);

  if (!admin_id || !isAdmin) {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied: Admin role required' 
    });
  }

  const { data, version } = req.body;

  if (!data) {
    return res.status(400).json({ 
      success: false, 
      message: 'Data object is required' 
    });
  }

  const result = await columnService.createDefaultColumnPreference(data, version, admin_id);
  
  const statusCode = result.defaultPref ? 201 : 200;
  res.status(statusCode).json(result);
});

/**
 * Get column preferences for current user
 * GET /column-preference/get-by-user
 * Query params: ?table=tableName (optional), ?default=true (optional)
 */
const getColumnPreferencesForUser = asyncHandler(async (req, res) => {
  const user_id = req.user?._id;
  const user_role = req.user?.role;
  const { table, default: getDefault } = req.query;

  if (!user_id) {
    return res.status(401).json({ 
      success: false, 
      message: 'Unauthorized: User ID missing from token' 
    });
  }

  const result = await columnService.getColumnPreferencesForUser(
    user_id, 
    table || null, 
    getDefault === 'true', 
    user_role
  );
  
  res.status(200).json(result);
});

/**
 * Update user column preference by admin
 * PUT /column-preference/admin-update
 */
const updateUserColumnPreferenceByAdmin = asyncHandler(async (req, res) => {
  const admin_id = req.user?._id;
  const isAdmin = ['Admin', 'Super Admin'].includes(req.user?.role);

  if (!admin_id || !isAdmin) {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied: Admin role required' 
    });
  }

  let { user_ids, data, version } = req.body;

  // If user_ids is missing or empty, use admin's own ID
  if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
    user_ids = [admin_id];
  }

  const result = await columnService.saveColumnPreference(
    user_ids,
    data,
    version,
    admin_id,
    true // isAdmin
  );

  res.status(200).json(result);
});

/**
 * Get column preferences for multiple users (Admin only)
 * POST /column-preference/admin/get-multiple-users
 * Body: { user_ids: [], table?: string, role?: string }
 */
const getColumnPreferencesForMultipleUsers = asyncHandler(async (req, res) => {
  const admin_id = req.user?._id;
  const isAdmin = ['Admin', 'Super Admin'].includes(req.user?.role);

  if (!admin_id || !isAdmin) {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied: Admin role required' 
    });
  }

  const { user_ids, table, role } = req.body;

  if (!user_ids || !Array.isArray(user_ids)) {
    return res.status(400).json({ 
      success: false, 
      message: 'user_ids array is required' 
    });
  }

  const result = await columnService.getColumnPreferencesForMultipleUsers(
    user_ids, 
    table || null, 
    role || null
  );
  
  res.status(200).json(result);
});

/**
 * Reset user column preference to default for a specific table
 * POST /column-preference/reset-to-default
 * Body: { table: string }
 */
const resetUserColumnPreferenceToDefault = asyncHandler(async (req, res) => {
  const user_id = req.user?._id;

  if (!user_id) {
    return res.status(401).json({ 
      success: false, 
      message: 'Unauthorized: User ID missing from token' 
    });
  }

  const { table } = req.body;

  if (!table) {
    return res.status(400).json({ 
      success: false, 
      message: 'Table name is required' 
    });
  }

  const result = await columnService.resetUserColumnPreferenceToDefault(user_id, table);
  res.status(200).json(result);
});

module.exports = {
  saveColumnPreference,
  getColumnPreferenceById,
  deleteColumnPreference,
  createDefaultColumnPreference,
  getColumnPreferencesForUser,
  updateUserColumnPreferenceByAdmin,
  getColumnPreferencesForMultipleUsers,
  resetUserColumnPreferenceToDefault,
};
