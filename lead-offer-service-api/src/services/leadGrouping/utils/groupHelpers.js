/**
 * Grouping Helper Functions
 * Reusable utility functions for lead grouping operations
 */

const crypto = require('crypto');
const mongoose = require('mongoose');
const { ENTITY_PRIORITY, ENTITY_DATE_MAPPINGS } = require('../config/groupingFields');
const logger = require('../../../helpers/logger');

/**
 * Generate a deterministic ObjectId for "None" groups
 * @param {string} field - The grouping field name
 * @param {number} level - The grouping level (optional, for multilevel grouping)
 * @returns {mongoose.Types.ObjectId} - Deterministic ObjectId
 */
const generateNoneGroupId = (field, level = 0) => {
  const seed = `none_${field}_level_${level}`;
  const hash = crypto.createHash('md5').update(seed).digest('hex');
  const objectIdHex = hash.substring(0, 24);

  try {
    return new mongoose.Types.ObjectId(objectIdHex);
  } catch (error) {
    const fallbackSeed = `${field}_${level}`.padEnd(24, '0').substring(0, 24);
    return new mongoose.Types.ObjectId(fallbackSeed);
  }
};

/**
 * Detect entity context from filters to determine which entity's dates to use
 * @param {Array} filters - Array of filter objects
 * @returns {string|null} - Entity type or null for lead context
 */
const detectEntityContext = (filters) => {
  if (!filters || !Array.isArray(filters)) return null;

  for (const { entity, pattern } of ENTITY_PRIORITY) {
    const hasEntityFilter = filters.some(
      (filter) => filter && filter.field === pattern && filter.value === true
    );

    if (hasEntityFilter) {
      return entity;
    }
  }

  return null;
};

/**
 * Get entity-specific date field mapping
 * @param {string} dateField - Original date field (createdAt, updatedAt, assigned_date)
 * @param {string} entityContext - Entity context (offer, opening, confirmation, payment, netto)
 * @returns {Object} - Field mapping with entity-specific details
 */
const getEntityDateField = (dateField, entityContext) => {
  if (!entityContext) {
    return {
      entityType: 'lead',
      field: dateField,
      collection: 'Lead',
      requiresJoin: dateField === 'assigned_date',
    };
  }

  const mapping = ENTITY_DATE_MAPPINGS[entityContext];
  if (!mapping) {
    return getEntityDateField(dateField, null);
  }

  return {
    entityType: mapping.entityType,
    field: mapping.fields[dateField] || dateField,
    collection: mapping.collection,
    requiresJoin: true,
  };
};

/**
 * Get display name for reference objects
 * @param {Object} ref - Reference object
 * @param {string} collection - Collection name
 * @returns {string} - Display name
 */
const getDisplayName = (ref, collection) => {
  switch (collection) {
    case 'User':
      return ref.login || 'Unknown User';
    case 'Team':
      return ref.name || 'Unknown Project';
    case 'Source':
      return ref.name || 'Unknown Source';
    default:
      return ref.name || ref.login || 'Unknown';
  }
};

/**
 * Format value for display
 * @param {*} value - Value to format
 * @param {string} type - Field type
 * @returns {string} - Formatted value
 */
const formatValue = (value, type) => {
  if (value === null || value === undefined) return 'None';

  switch (type) {
    case 'boolean':
      return value ? 'Yes' : 'No';
    case 'number':
      return value.toLocaleString();
    case 'date':
      return new Date(value).toLocaleDateString();
    default:
      return value.toString();
  }
};

/**
 * Compare two values for sorting
 * @param {*} a - First value
 * @param {*} b - Second value
 * @param {string} sortOrder - Sort order (asc/desc)
 * @returns {number} - Comparison result
 */
const compareValues = (a, b, sortOrder) => {
  if (a === null || a === undefined) a = '';
  if (b === null || b === undefined) b = '';

  if (typeof a === 'string' && typeof b === 'string') {
    return sortOrder === 'desc' ? b.localeCompare(a) : a.localeCompare(b);
  }

  return sortOrder === 'desc' ? (b > a ? 1 : b < a ? -1 : 0) : a > b ? 1 : a < b ? -1 : 0;
};

/**
 * Count total leads in nested structure
 * @param {Array} groups - Nested group structure
 * @returns {number} - Total lead count
 */
const countLeadsInNestedStructure = (groups) => {
  let total = 0;

  for (const group of groups) {
    if (group.subGroups) {
      total += countLeadsInNestedStructure(group.subGroups);
    } else {
      total += group.count;
    }
  }

  return total;
};

/**
 * Get helpful descriptions for grouping fields (especially for agents)
 * @param {string} field - Field name
 * @returns {string} - Field description
 */
const getFieldDescription = (field) => {
  const descriptions = {
    stage: 'Group leads by their current stage in the sales process',
    status: 'Group leads by their current status',
    source: 'Group leads by where they came from',
    lead_date: 'Group leads by the date they were created',
    lead_date_month: 'Group leads by month',
    lead_date_year: 'Group leads by year',
    lead_date_week: 'Group leads by week',
    has_offer: 'Group leads by whether they have an offer',
    has_opening: 'Group leads by whether they have an opening',
    has_confirmation: 'Group leads by whether they have confirmation',
    has_payment: 'Group leads by whether they have payment',
    has_todo: 'Group leads by whether they have pending tasks',
    has_extra_todo: 'Group leads by whether they have todos assigned to them',
    has_assigned_todo: 'Group leads by whether they have assigned todos to others',
    is_favourite: 'Group leads by whether they are marked as favourite',
    last_transfer: 'Group leads by their last transfer history (FromAgent→ToAgent(date))',
    contact_name: 'Group leads by contact name',
    email_from: 'Group leads by email address',
    phone: 'Group leads by phone number',
    use_status: 'Group leads by usage status',
    closeLeadStatus: 'Close Status',
    closed_at: 'Closed At',
    current_status: 'Current Status',
    closure_reason: 'Closure Reason',
    closed_project: 'Closed Project',
    closed_by: 'Closed By',
  };

  return descriptions[field] || '';
};

/**
 * Get default value for a field when no leads are available
 * @param {string} field - Field name
 * @returns {*} - Default value
 */
const getDefaultValueForField = (field) => {
  const stringFields = [
    'contact_name',
    'lead_source_no',
    'email_from',
    'phone',
    'title',
    'payment_terms',
    'bank_name',
    'project_name',
    'agent',
    'offer_status',
    'current_stage',
  ];

  const numberFields = [
    'expected_revenue',
    'investment_volume',
    'interest_rate',
    'bonus_amount',
  ];

  const dateFields = ['createdAt', 'updatedAt', 'lead_date'];

  if (stringFields.includes(field)) return '';
  if (numberFields.includes(field)) return 0;
  if (dateFields.includes(field)) return new Date(0);

  return '';
};

/**
 * Sanitize filters for multilevel grouping
 * If conflicting todo filters are present, ignore has_todo
 * @param {Array} filters - Array of filter objects
 * @returns {Array} - Sanitized filters
 */
const sanitizeTodoFilters = (filters) => {
  if (!filters || !Array.isArray(filters)) return filters;

  const shouldIgnoreHasTodo = filters.some(
    (f) =>
      f &&
      ['done_todos', 'pending_todos', 'has_extra_todo', 'has_assigned_todo'].includes(f.field) &&
      (f.value === true || f.value === 'true')
  );

  return shouldIgnoreHasTodo ? filters.filter((f) => !(f && f.field === 'has_todo')) : filters;
};

/**
 * Create a lookup map from an array
 * @param {Array} items - Array of items
 * @param {string} keyField - Field to use as key
 * @returns {Object} - Lookup map
 */
const createLookupMap = (items, keyField) => {
  const map = {};
  items.forEach((item) => {
    const key = item[keyField]?.toString();
    if (key) {
      if (!map[key]) {
        map[key] = [];
      }
      map[key].push(item);
    }
  });
  return map;
};

module.exports = {
  generateNoneGroupId,
  detectEntityContext,
  getEntityDateField,
  getDisplayName,
  formatValue,
  compareValues,
  countLeadsInNestedStructure,
  getFieldDescription,
  getDefaultValueForField,
  sanitizeTodoFilters,
  createLookupMap,
};