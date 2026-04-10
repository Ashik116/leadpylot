/**
 * Validates Odoo-style domain arrays used by search / universal query:
 * - Logical tokens: '|', '&', '!'
 * - Leaf tuples: [field, operator, value]
 * - Nested arrays (extra wrapping) as used by some clients
 *
 * Aligned with search-service flatten rules: length-3 arrays with string field + operator are conditions.
 */

const { ValidationError } = require('./errorHandler');

const MAX_DEPTH = 16;
const MAX_ELEMENTS = 500;

/** Field names: letters, digits, underscore, dot (relations), colon (date granularity, lead_transfer:day, etc.) */
const FIELD_NAME_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_.:]*$/;

const LOGICAL_TOKENS = new Set(['|', '&', '!']);

/** Operators accepted by lead-offer universalQuery domainConditionToMongo + common aliases */
const ALLOWED_OPERATORS = new Set([
  '=',
  '!=',
  'in',
  'not in',
  'not_in',
  'notin',
  'between',
  '>',
  '<',
  '>=',
  '<=',
  'contains',
  'like',
  'ilike',
  'is_empty',
  'is_not_empty',
  'is_null',
  'equals',
  'not equals',
  'not_equals',
  'greater',
  'greater than',
  'greater_than',
  'less',
  'less than',
  'less_than',
  'greater_equals',
  'greater than or equals',
  'less_equals',
  'less than or equals',
]);

function normalizeOp(op) {
  return String(op).trim().toLowerCase();
}

function isInFamily(opNorm) {
  return opNorm === 'in' || opNorm === 'not in' || opNorm === 'not_in' || opNorm === 'notin';
}

function isBetweenFamily(opNorm) {
  return opNorm === 'between';
}

function isNullishStateOperator(opNorm) {
  return opNorm === 'is_empty' || opNorm === 'is_not_empty' || opNorm === 'is_null';
}

function validateValueShape(operatorNorm, value, path, operatorRaw) {
  if (value === undefined && !isNullishStateOperator(operatorNorm)) {
    throw new ValidationError(
      `domain: value is required for operator "${operatorRaw}" at ${path}`
    );
  }
  if (isBetweenFamily(operatorNorm)) {
    if (!Array.isArray(value) || value.length !== 2) {
      throw new ValidationError(
        `domain: "between" expects [lowerBound, upperBound] at ${path}`
      );
    }
    return;
  }
  if (isNullishStateOperator(operatorNorm)) {
    // Ignore payload shape for null/empty predicates; callers commonly send null.
    return;
  }
  if (isInFamily(operatorNorm)) {
    if (value !== null && !Array.isArray(value) && typeof value !== 'string' && typeof value !== 'number') {
      // allow scalar for engines that wrap to single-element $in
    }
    if (Array.isArray(value) && value.length > 500) {
      throw new ValidationError(`domain: "in" list too long at ${path}`);
    }
  }
}

function validateLeafCondition(tuple, path) {
  if (!Array.isArray(tuple) || tuple.length !== 3) {
    throw new ValidationError(`domain: each condition must be [field, operator, value] at ${path}`);
  }

  const [field, operator, value] = tuple;

  if (typeof field !== 'string' || !field.trim()) {
    throw new ValidationError(`domain: field must be a non-empty string at ${path}`);
  }

  if (!FIELD_NAME_PATTERN.test(field)) {
    throw new ValidationError(
      `domain: invalid field "${field}" at ${path} (use letters, numbers, _, ., :)`
    );
  }

  if (typeof operator !== 'string' || !operator.trim()) {
    throw new ValidationError(`domain: operator must be a non-empty string at ${path}`);
  }

  const operatorNorm = normalizeOp(operator);
  if (!ALLOWED_OPERATORS.has(operatorNorm)) {
    throw new ValidationError(
      `domain: unsupported operator "${operator}" at ${path}`
    );
  }

  validateValueShape(operatorNorm, value, path, operator);
}

/**
 * Returns true if array looks like a leaf tuple [field, op, value]
 */
function isLeafTuple(arr) {
  return (
    Array.isArray(arr) &&
    arr.length === 3 &&
    typeof arr[0] === 'string' &&
    typeof arr[1] === 'string'
  );
}

function walk(domain, depth, path, stats) {
  if (!Array.isArray(domain)) {
    throw new ValidationError(`domain: expected array at ${path}`);
  }

  if (depth > MAX_DEPTH) {
    throw new ValidationError('domain: nesting too deep');
  }

  for (let i = 0; i < domain.length; i++) {
    if (stats.elements > MAX_ELEMENTS) {
      throw new ValidationError('domain: too many elements');
    }
    stats.elements += 1;

    const el = domain[i];
    const p = `${path}[${i}]`;

    if (typeof el === 'string') {
      if (!LOGICAL_TOKENS.has(el)) {
        throw new ValidationError(
          `domain: invalid string token "${el}" at ${p} (expected |, &, !, or a condition array)`
        );
      }
      continue;
    }

    if (Array.isArray(el)) {
      if (isLeafTuple(el)) {
        validateLeafCondition(el, p);
        stats.leafConditions += 1;
      } else {
        walk(el, depth + 1, p, stats);
      }
      continue;
    }

    if (el === null || typeof el === 'boolean' || typeof el === 'number') {
      throw new ValidationError(`domain: unexpected value at ${p}`);
    }

    throw new ValidationError(`domain: unsupported entry at ${p}`);
  }
}

/**
 * @param {unknown} domain
 * @param {{ allowEmpty?: boolean }} [options]
 * @throws {ValidationError}
 */
function validateDomain(domain, options = {}) {
  const { allowEmpty = true } = options;

  if (!Array.isArray(domain)) {
    throw new ValidationError('domain must be an array');
  }

  if (domain.length === 0 && !allowEmpty) {
    throw new ValidationError('domain must contain at least one condition');
  }

  const stats = { elements: 0, leafConditions: 0 };
  walk(domain, 0, 'domain', stats);

  if (!allowEmpty && stats.leafConditions === 0) {
    throw new ValidationError('domain must contain at least one [field, operator, value] condition');
  }
}

module.exports = {
  validateDomain,
  FIELD_NAME_PATTERN,
  ALLOWED_OPERATORS,
};
