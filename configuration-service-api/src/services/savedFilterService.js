const mongoose = require('mongoose');
const SavedFilter = require('../models/SavedFilter');
const { NotFoundError, ValidationError } = require('../utils/errorHandler');
const { validateDomain, FIELD_NAME_PATTERN } = require('../utils/domainValidation');
const logger = require('../utils/logger');

function assertValidDomain(domain) {
  validateDomain(domain, { allowEmpty: false });
}

/**
 * Pagination uses `page`.
 * `pageContext` is the explicit filter key for document.page.
 */
function parsePagination(query) {
  const pageNum = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  return { pageNum, limit };
}

function normalizeOptionalString(value) {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new ValidationError('title, page, and description must be strings when provided');
  }
  const trimmed = value.trim();
  return trimmed === '' ? '' : trimmed;
}

function requireNonEmptyString(value, fieldLabel) {
  if (value === undefined || value === null) {
    throw new ValidationError(`${fieldLabel} is required`);
  }
  if (typeof value !== 'string' || !value.trim()) {
    throw new ValidationError(`${fieldLabel} must be a non-empty string`);
  }
  return value.trim();
}

function normalizeSavedFilterType(value) {
  if (value === undefined || value === null || value === '') {
    return 'filter';
  }
  if (typeof value !== 'string') {
    throw new ValidationError('type must be either "filter" or "grouping"');
  }
  const normalized = value.trim().toLowerCase();
  if (normalized !== 'filter' && normalized !== 'grouping') {
    throw new ValidationError('type must be either "filter" or "grouping"');
  }
  return normalized;
}

function normalizeGroupBy(value) {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (!Array.isArray(value)) {
    throw new ValidationError('groupBy must be an array of field names');
  }
  const normalized = value.map((item) => {
    if (typeof item !== 'string' || !item.trim()) {
      throw new ValidationError('groupBy must contain non-empty string field names');
    }
    const field = item.trim();
    if (!FIELD_NAME_PATTERN.test(field)) {
      throw new ValidationError(
        `groupBy contains invalid field "${field}" (use letters, numbers, _, ., :)`
      );
    }
    return field;
  });
  return normalized;
}

function assertTypeSpecificPayload(type, payload, options = {}) {
  const {
    requireDomainForFilter = false,
    requireGroupByForGrouping = true,
    requireGroupByProvidedForGrouping = false,
  } = options;
  const domainProvided = payload._domainProvided !== undefined
    ? Boolean(payload._domainProvided)
    : payload.domain !== undefined;
  const groupByProvided = payload._groupByProvided !== undefined
    ? Boolean(payload._groupByProvided)
    : payload.groupBy !== undefined;
  const hasDomain = Array.isArray(payload.domain) && payload.domain.length > 0;
  const hasGroupBy = Array.isArray(payload.groupBy) && payload.groupBy.length > 0;

  if (!hasDomain && !hasGroupBy) {
    throw new ValidationError('At least one of domain or groupBy must be provided');
  }

  if (type === 'grouping') {
    if (requireGroupByProvidedForGrouping && !groupByProvided) {
      throw new ValidationError('groupBy is required for type "grouping"');
    }
    if (requireGroupByForGrouping && !hasGroupBy) {
      throw new ValidationError('groupBy is required for type "grouping"');
    }
    if (domainProvided) {
      throw new ValidationError('domain is not allowed for type "grouping"');
    }
    return;
  }

  if (requireDomainForFilter && !hasDomain) {
    throw new ValidationError('domain is required for type "filter"');
  }
  if (!hasDomain) {
    throw new ValidationError('domain is required for type "filter"');
  }
  if (groupByProvided) {
    throw new ValidationError('groupBy is not allowed for type "filter"');
  }
  assertValidDomain(payload.domain);
}

function escapeRegex(term) {
  return String(term).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Apply search across title and page (case-insensitive substring).
 */
function applyTitlePageSearch(filter, search) {
  if (!search || !String(search).trim()) {
    return;
  }
  const term = String(search).trim();
  const escaped = escapeRegex(term);
  const regex = { $regex: escaped, $options: 'i' };
  const searchCondition = { $or: [{ title: regex }, { page: regex }] };
  if (filter.$or) {
    const existingOr = filter.$or;
    delete filter.$or;
    filter.$and = [{ $or: existingOr }, searchCondition];
    return;
  }
  filter.$or = searchCondition.$or;
}

/**
 * Create a saved filter (title, page, domain required; description optional)
 */
async function createSavedFilter(userId, body) {
  const { title, page, description } = body;
  const type = normalizeSavedFilterType(body.type);
  const groupBy = normalizeGroupBy(body.groupBy);
  const domain = body.domain;
  assertTypeSpecificPayload(type, { domain, groupBy }, { requireDomainForFilter: true });

  const doc = new SavedFilter({
    user_id: userId,
    title: requireNonEmptyString(title, 'title'),
    page: requireNonEmptyString(page, 'page'),
    type,
  });
  if (groupBy !== undefined) {
    doc.groupBy = groupBy;
  }
  if (domain !== undefined) {
    doc.domain = domain;
  }

  const normalizedDescription = normalizeOptionalString(description);
  if (normalizedDescription !== undefined) {
    doc.description = normalizedDescription;
  }

  await doc.save();
  logger.info('Saved filter created', { id: doc._id, userId });

  return doc.toObject();
}

/**
 * List saved filters with pagination (`page`), optional filter by `pageContext`, search on title + page
 */
async function listSavedFilters(userId, query = {}) {
  const { pageNum, limit } = parsePagination(query);
  const { search = '', sortBy = 'createdAt', sortOrder = 'desc' } = query;

  const filter = { user_id: userId };

  // Filter by document.page using explicit pageContext (preferred).
  if (query.pageContext !== undefined && query.pageContext !== null && String(query.pageContext).trim()) {
    filter.page = String(query.pageContext).trim();
  }
  if (query.type !== undefined && query.type !== null && String(query.type).trim()) {
    const normalizedType = normalizeSavedFilterType(query.type);
    filter.type = normalizedType;
  }

  applyTitlePageSearch(filter, search);

  const allowedSort = {
    title: 'title',
    page: 'page',
    type: 'type',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  };
  const sortField = allowedSort[sortBy] || 'createdAt';
  const sortDir = sortOrder === 'asc' ? 1 : -1;
  const skip = (pageNum - 1) * limit;

  const [items, total] = await Promise.all([
    SavedFilter.find(filter)
      .sort({ [sortField]: sortDir })
      .skip(skip)
      .limit(limit)
      .lean(),
    SavedFilter.countDocuments(filter),
  ]);

  return {
    data: items,
    meta: {
      total,
      page: pageNum,
      limit,
      pages: Math.ceil(total / limit) || 0,
    },
  };
}

/**
 * Get one saved filter by id — only if owned by user
 */
async function getSavedFilterById(id, userId) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ValidationError('Invalid saved filter id');
  }

  const doc = await SavedFilter.findOne({ _id: id, user_id: userId }).lean();

  if (!doc) {
    throw new NotFoundError('Saved filter not found');
  }

  return doc;
}

/**
 * Update a saved filter (title and page required on update)
 */
async function updateSavedFilter(id, userId, body) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ValidationError('Invalid saved filter id');
  }

  const doc = await SavedFilter.findOne({ _id: id, user_id: userId });
  if (!doc) {
    throw new NotFoundError('Saved filter not found');
  }

  doc.title = requireNonEmptyString(body.title, 'title');
  doc.page = requireNonEmptyString(body.page, 'page');
  const nextType = body.type !== undefined ? normalizeSavedFilterType(body.type) : (doc.type || 'filter');
  const normalizedGroupBy = body.groupBy !== undefined ? normalizeGroupBy(body.groupBy) : doc.groupBy;
  const nextDomain = body.domain !== undefined ? body.domain : doc.domain;
  const effectiveGroupBy = normalizedGroupBy;
  const effectiveDomain = nextDomain;

  assertTypeSpecificPayload(
    nextType,
    {
      domain: effectiveDomain,
      groupBy: effectiveGroupBy,
      _domainProvided: body.domain !== undefined,
      _groupByProvided: body.groupBy !== undefined,
    },
    { requireDomainForFilter: true, requireGroupByProvidedForGrouping: nextType === 'grouping' }
  );
  doc.type = nextType;
  if (body.groupBy !== undefined) {
    doc.groupBy = body.groupBy;
  }

  if (body.description !== undefined) {
    doc.description = normalizeOptionalString(body.description);
  }

  if (body.domain !== undefined) {
    doc.domain = body.domain;
    doc.markModified('domain');
  }

  await doc.save();
  logger.info('Saved filter updated', { id: doc._id, userId });

  return doc.toObject();
}

/**
 * List saved filters for a single page context (exact match on `page`).
 * Same query options as GET /saved-filters (page, limit, search, sortBy, sortOrder).
 */
async function listSavedFiltersByPage(userId, pageContext, query = {}) {
  const key = pageContext !== undefined && pageContext !== null ? String(pageContext).trim() : '';
  if (!key) {
    throw new ValidationError('page is required');
  }
  const merged = { ...query, pageContext: key };
  return listSavedFilters(userId, merged);
}

/**
 * Delete a saved filter
 */
async function deleteSavedFilter(id, userId) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ValidationError('Invalid saved filter id');
  }

  const result = await SavedFilter.deleteOne({ _id: id, user_id: userId });

  if (result.deletedCount === 0) {
    throw new NotFoundError('Saved filter not found');
  }

  logger.info('Saved filter deleted', { id, userId });
  return { success: true, id };
}

module.exports = {
  createSavedFilter,
  listSavedFilters,
  listSavedFiltersByPage,
  getSavedFilterById,
  updateSavedFilter,
  deleteSavedFilter,
};
