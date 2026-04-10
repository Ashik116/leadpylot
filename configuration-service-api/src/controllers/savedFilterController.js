/**
 * Saved filter presets (user-scoped domain arrays)
 */

const savedFilterService = require('../services/savedFilterService');
const { asyncHandler } = require('../utils/errorHandler');

function resolveUserId(req) {
  return req.user?._id || req.user?.id;
}

const createSavedFilter = asyncHandler(async (req, res) => {
  const userId = resolveUserId(req);
  if (!userId) {
    return res.status(400).json({ success: false, error: 'User context required' });
  }

  const data = await savedFilterService.createSavedFilter(userId, req.body);
  res.status(201).json({ success: true, data });
});

const listSavedFilters = asyncHandler(async (req, res) => {
  const userId = resolveUserId(req);
  if (!userId) {
    return res.status(400).json({ success: false, error: 'User context required' });
  }

  const result = await savedFilterService.listSavedFilters(userId, req.query);
  res.status(200).json({ success: true, ...result });
});

const listSavedFiltersByPage = asyncHandler(async (req, res) => {
  const userId = resolveUserId(req);
  if (!userId) {
    return res.status(400).json({ success: false, error: 'User context required' });
  }

  const pageContext = req.params.page != null ? String(req.params.page) : '';
  const result = await savedFilterService.listSavedFiltersByPage(userId, pageContext, req.query);
  res.status(200).json({ success: true, ...result });
});

const getSavedFilterById = asyncHandler(async (req, res) => {
  const userId = resolveUserId(req);
  if (!userId) {
    return res.status(400).json({ success: false, error: 'User context required' });
  }

  const data = await savedFilterService.getSavedFilterById(req.params.id, userId);
  res.status(200).json({ success: true, data });
});

const updateSavedFilter = asyncHandler(async (req, res) => {
  const userId = resolveUserId(req);
  if (!userId) {
    return res.status(400).json({ success: false, error: 'User context required' });
  }

  const data = await savedFilterService.updateSavedFilter(req.params.id, userId, req.body);
  res.status(200).json({ success: true, data });
});

const deleteSavedFilter = asyncHandler(async (req, res) => {
  const userId = resolveUserId(req);
  if (!userId) {
    return res.status(400).json({ success: false, error: 'User context required' });
  }

  const result = await savedFilterService.deleteSavedFilter(req.params.id, userId);
  res.status(200).json({ success: true, ...result });
});

module.exports = {
  createSavedFilter,
  listSavedFilters,
  listSavedFiltersByPage,
  getSavedFilterById,
  updateSavedFilter,
  deleteSavedFilter,
};
