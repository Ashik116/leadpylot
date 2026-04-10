/**
 * Sorting Helper Utilities
 * Centralized sorting logic for offer queries
 */

const logger = require('../../../utils/logger');

/** Normalize asc/desc from query strings (handles ASC, mixed case). */
const isAscendingOrder = (sortOrder) =>
  String(sortOrder ?? 'desc').toLowerCase().trim() === 'asc';

/**
 * Sort keys that require populated refs (cannot use Offer.find().sort() on a non-existent alias).
 * Paths match populated lean() offer shape (lead_id, agent_id, bank_id, project_id).
 */
const OFFER_SORT_POPULATED_PATHS = {
  leadName: 'lead_id.contact_name',
  contactName: 'lead_id.contact_name',
  leadEmail: 'lead_id.email_from',
  partnerId: 'lead_id.lead_source_no',
  bankName: 'bank_id.name',
  projectName: 'project_id.name',
  agent: 'agent_id.login',
};

/**
 * API sortBy -> real Offer collection field for MongoDB .sort()
 * (only for sorts that are real top-level or ref _id fields on Offer)
 */
const OFFER_MONGO_ROOT_SORT_FIELDS = {
  title: 'title',
  investment_volume: 'investment_volume',
  interest_rate: 'interest_rate',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  created_at: 'created_at',
  updated_at: 'updated_at',
  bonusAmount: 'bonus_amount',
};

/**
 * Get nested value from object using dot notation
 * @param {Object} obj - Object to extract value from
 * @param {Object} sortObject - Sort object with field path as key
 * @returns {*} - Extracted value
 */
const getNestedValue = (obj, sortObject) => {
  const fieldPath = Object.keys(sortObject)[0];
  if (!fieldPath) return null;

  return fieldPath.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : null;
  }, obj);
};

/**
 * Sort offers by interest month (payment terms)
 * Optimized for performance with memoization
 * @param {Array} offers - Array of offers to sort
 * @param {String} sortOrder - Sort order ('asc' or 'desc')
 * @returns {Array} - Sorted array
 */
const sortByInterestMonth = (offers, sortOrder = 'desc') => {
  if (!offers || offers.length === 0) return offers;

  logger.debug(`Sorting ${offers.length} offers by interestMonth: ${sortOrder}`);

  // Pre-extract months for performance (avoid repeated nested access)
  const offersWithMonths = offers.map((offer) => ({
    offer,
    months: Number(offer.payment_terms?.info?.info?.months) || 0,
  }));

  // Sort using pre-extracted values
  const asc = isAscendingOrder(sortOrder);
  offersWithMonths.sort((a, b) => {
    if (isNaN(a.months) || isNaN(b.months)) {
      logger.warn(`Invalid months data: a=${a.months}, b=${b.months}`);
      return 0;
    }
    return asc ? a.months - b.months : b.months - a.months;
  });

  const sortedOffers = offersWithMonths.map((item) => item.offer);

  if (logger.level === 'debug') {
    logger.debug(
      `InterestMonth sorting completed. Sample:`,
      sortedOffers.slice(0, 3).map((o) => ({
        id: o._id,
        months: o.payment_terms?.info?.info?.months,
        title: o.title,
      }))
    );
  }

  return sortedOffers;
};

/**
 * Compare two sort values (strings use locale-aware order, not raw <).
 */
const compareSortValues = (va, vb) => {
  if (va === vb) return 0;
  if (va === null || va === undefined) return 1;
  if (vb === null || vb === undefined) return -1;

  if (typeof va === 'string' && typeof vb === 'string') {
    return va.localeCompare(vb, undefined, { sensitivity: 'base', numeric: true });
  }
  if (
    typeof va === 'number' &&
    typeof vb === 'number' &&
    !Number.isNaN(va) &&
    !Number.isNaN(vb)
  ) {
    return va === vb ? 0 : va < vb ? -1 : 1;
  }
  if (va instanceof Date && vb instanceof Date) {
    return va.getTime() - vb.getTime();
  }
  return String(va).localeCompare(String(vb), undefined, { sensitivity: 'base', numeric: true });
};

const tieBreakById = (offerA, offerB) => {
  const ida = offerA?._id != null ? String(offerA._id) : '';
  const idb = offerB?._id != null ? String(offerB._id) : '';
  return ida.localeCompare(idb);
};

/**
 * Sort offers by standard field
 * @param {Array} offers - Array of offers to sort
 * @param {Object} sortObject - Sort object from parseSortParameters
 * @param {String} sortOrder - Sort order ('asc' or 'desc')
 * @returns {Array} - Sorted array
 */
const sortByStandardField = (offers, sortObject, sortOrder = 'desc') => {
  if (!offers || offers.length === 0) return offers;

  const asc = isAscendingOrder(sortOrder);

  const offersWithValues = offers.map((offer) => ({
    offer,
    value: getNestedValue(offer, sortObject),
  }));

  offersWithValues.sort((a, b) => {
    const cmp = compareSortValues(a.value, b.value);
    if (cmp !== 0) return asc ? cmp : -cmp;
    return tieBreakById(a.offer, b.offer);
  });

  return offersWithValues.map((item) => item.offer);
};

/**
 * Sort populated offers by API alias (agent, leadName, …).
 */
const sortOffersByPopulatedAlias = (offers, sortBy, sortOrder = 'desc') => {
  if (!offers?.length) return offers;
  const key = typeof sortBy === 'string' ? sortBy.trim() : sortBy;
  const path = OFFER_SORT_POPULATED_PATHS[key];
  if (!path) return offers;
  const sortObject = { [path]: 1 };
  return sortByStandardField(offers, sortObject, sortOrder);
};

const isInterestMonthSortKey = (sortBy) => {
  const n = typeof sortBy === 'string' ? sortBy.toLowerCase() : '';
  return n === 'interestmonth' || n === 'interest_month' || sortBy === 'interestMonth';
};

const needsOfferPopulatedInMemorySort = (sortBy) => {
  const k = typeof sortBy === 'string' ? sortBy.trim() : '';
  return k !== '' && Object.prototype.hasOwnProperty.call(OFFER_SORT_POPULATED_PATHS, k);
};

/**
 * Apply sorting to offers array
 * Centralized sorting logic with automatic field detection
 * @param {Array} offers - Array of offers to sort
 * @param {String} sortBy - Field to sort by
 * @param {String} sortOrder - Sort order ('asc' or 'desc')
 * @param {Object} sortObject - Parsed sort object
 * @returns {Array} - Sorted array
 */
const applyOfferSorting = (offers, sortBy, sortOrder, sortObject) => {
  if (!offers || offers.length === 0) return offers;

  if (isInterestMonthSortKey(sortBy)) {
    return sortByInterestMonth(offers, sortOrder);
  }

  const popKey = typeof sortBy === 'string' ? sortBy.trim() : '';
  if (popKey && OFFER_SORT_POPULATED_PATHS[popKey]) {
    return sortOffersByPopulatedAlias(offers, sortBy, sortOrder);
  }

  // Apply standard field sorting
  return sortByStandardField(offers, sortObject, sortOrder);
};

/**
 * Create a sorting comparator function for inline use
 * @param {String} sortBy - Field to sort by
 * @param {String} sortOrder - Sort order
 * @param {Object} sortObject - Parsed sort object
 * @returns {Function} - Comparator function
 */
const createSortComparator = (sortBy, sortOrder, sortObject) => {
  if (isInterestMonthSortKey(sortBy)) {
    const asc = isAscendingOrder(sortOrder);
    return (a, b) => {
      const monthsA = Number(a.payment_terms?.info?.info?.months) || 0;
      const monthsB = Number(b.payment_terms?.info?.info?.months) || 0;
      return asc ? monthsA - monthsB : monthsB - monthsA;
    };
  }

  const ascCmp = isAscendingOrder(sortOrder);
  return (a, b) => {
    const fieldA = getNestedValue(a, sortObject);
    const fieldB = getNestedValue(b, sortObject);
    const cmp = compareSortValues(fieldA, fieldB);
    if (cmp !== 0) return ascCmp ? cmp : -cmp;
    return tieBreakById(a, b);
  };
};

module.exports = {
  getNestedValue,
  sortByInterestMonth,
  sortByStandardField,
  applyOfferSorting,
  createSortComparator,
  sortOffersByPopulatedAlias,
  isAscendingOrder,
  isInterestMonthSortKey,
  needsOfferPopulatedInMemorySort,
  OFFER_SORT_POPULATED_PATHS,
  OFFER_MONGO_ROOT_SORT_FIELDS,
};

