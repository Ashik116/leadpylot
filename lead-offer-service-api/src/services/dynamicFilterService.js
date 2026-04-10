/**
 * Dynamic Filter Service
 * Handles complex filtering with multiple sequential rules
 */

const mongoose = require('mongoose');
const { Lead, AssignLeads, Source, Team, User } = require('../models');
const Offer = require('../models/Offer');
const Todo = require('../models/Todo');
const logger = require('../utils/logger');

// Available filter operators
const OPERATORS = {
  EQUALS: 'equals',
  NOT_EQUALS: 'not_equals',
  CONTAINS: 'contains',
  NOT_CONTAINS: 'not_contains',
  STARTS_WITH: 'starts_with',
  ENDS_WITH: 'ends_with',
  GREATER_THAN: 'greater_than',
  LESS_THAN: 'less_than',
  GREATER_THAN_OR_EQUAL: 'greater_than_or_equal',
  LESS_THAN_OR_EQUAL: 'less_than_or_equal',
  IN: 'in',
  NOT_IN: 'not_in',
  IS_EMPTY: 'is_empty',
  IS_NOT_EMPTY: 'is_not_empty',
  BETWEEN: 'between',
  NOT_BETWEEN: 'not_between',
};

// Available filter fields with their types and operators
const FILTER_FIELDS = {
  // Lead basic fields
  contact_name: {
    type: 'string',
    operators: [
      OPERATORS.EQUALS,
      OPERATORS.NOT_EQUALS,
      OPERATORS.CONTAINS,
      OPERATORS.NOT_CONTAINS,
      OPERATORS.STARTS_WITH,
      OPERATORS.ENDS_WITH,
      OPERATORS.IS_EMPTY,
      OPERATORS.IS_NOT_EMPTY,
    ],
  },
  email_from: {
    type: 'string',
    operators: [
      OPERATORS.EQUALS,
      OPERATORS.NOT_EQUALS,
      OPERATORS.CONTAINS,
      OPERATORS.NOT_CONTAINS,
      OPERATORS.STARTS_WITH,
      OPERATORS.ENDS_WITH,
      OPERATORS.IS_EMPTY,
      OPERATORS.IS_NOT_EMPTY,
    ],
  },
  phone: {
    type: 'string',
    operators: [
      OPERATORS.EQUALS,
      OPERATORS.NOT_EQUALS,
      OPERATORS.CONTAINS,
      OPERATORS.NOT_CONTAINS,
      OPERATORS.STARTS_WITH,
      OPERATORS.ENDS_WITH,
      OPERATORS.IS_EMPTY,
      OPERATORS.IS_NOT_EMPTY,
    ],
  },
  status: {
    type: 'string',
    operators: [
      OPERATORS.EQUALS,
      OPERATORS.NOT_EQUALS,
      OPERATORS.IN,
      OPERATORS.NOT_IN,
      OPERATORS.IS_EMPTY,
      OPERATORS.IS_NOT_EMPTY,
    ],
  },
  stage: {
    type: 'string',
    operators: [
      OPERATORS.EQUALS,
      OPERATORS.NOT_EQUALS,
      OPERATORS.IN,
      OPERATORS.NOT_IN,
      OPERATORS.IS_EMPTY,
      OPERATORS.IS_NOT_EMPTY,
    ],
  },
  use_status: {
    type: 'string',
    operators: [OPERATORS.EQUALS, OPERATORS.NOT_EQUALS, OPERATORS.IN, OPERATORS.NOT_IN],
  },
  duplicate_status: {
    type: 'number',
    operators: [
      OPERATORS.EQUALS,
      OPERATORS.NOT_EQUALS,
      OPERATORS.GREATER_THAN,
      OPERATORS.LESS_THAN,
      OPERATORS.GREATER_THAN_OR_EQUAL,
      OPERATORS.LESS_THAN_OR_EQUAL,
      OPERATORS.IN,
      OPERATORS.NOT_IN,
    ],
  },
  expected_revenue: {
    type: 'number',
    operators: [
      OPERATORS.EQUALS,
      OPERATORS.NOT_EQUALS,
      OPERATORS.GREATER_THAN,
      OPERATORS.LESS_THAN,
      OPERATORS.GREATER_THAN_OR_EQUAL,
      OPERATORS.LESS_THAN_OR_EQUAL,
      OPERATORS.BETWEEN,
      OPERATORS.IS_EMPTY,
      OPERATORS.IS_NOT_EMPTY,
    ],
  },
  leadPrice: {
    type: 'number',
    operators: [
      OPERATORS.EQUALS,
      OPERATORS.NOT_EQUALS,
      OPERATORS.GREATER_THAN,
      OPERATORS.LESS_THAN,
      OPERATORS.GREATER_THAN_OR_EQUAL,
      OPERATORS.LESS_THAN_OR_EQUAL,
      OPERATORS.BETWEEN,
      OPERATORS.IS_EMPTY,
      OPERATORS.IS_NOT_EMPTY,
    ],
  },
  lead_date: {
    type: 'date',
    operators: [
      OPERATORS.EQUALS,
      OPERATORS.NOT_EQUALS,
      OPERATORS.GREATER_THAN,
      OPERATORS.LESS_THAN,
      OPERATORS.GREATER_THAN_OR_EQUAL,
      OPERATORS.LESS_THAN_OR_EQUAL,
      OPERATORS.BETWEEN,
      OPERATORS.NOT_BETWEEN,
      OPERATORS.IS_EMPTY,
      OPERATORS.IS_NOT_EMPTY,
    ],
  },
  assigned_date: {
    type: 'date',
    operators: [
      OPERATORS.EQUALS,
      OPERATORS.NOT_EQUALS,
      OPERATORS.GREATER_THAN,
      OPERATORS.LESS_THAN,
      OPERATORS.GREATER_THAN_OR_EQUAL,
      OPERATORS.LESS_THAN_OR_EQUAL,
      OPERATORS.BETWEEN,
      OPERATORS.NOT_BETWEEN,
      OPERATORS.IS_EMPTY,
      OPERATORS.IS_NOT_EMPTY,
    ],
  },
  createdAt: {
    type: 'date',
    operators: [
      OPERATORS.EQUALS,
      OPERATORS.NOT_EQUALS,
      OPERATORS.GREATER_THAN,
      OPERATORS.LESS_THAN,
      OPERATORS.GREATER_THAN_OR_EQUAL,
      OPERATORS.LESS_THAN_OR_EQUAL,
      OPERATORS.BETWEEN,
      OPERATORS.NOT_BETWEEN,
      OPERATORS.IS_EMPTY,
      OPERATORS.IS_NOT_EMPTY,
    ],
  },
  updatedAt: {
    type: 'date',
    operators: [
      OPERATORS.EQUALS,
      OPERATORS.NOT_EQUALS,
      OPERATORS.GREATER_THAN,
      OPERATORS.LESS_THAN,
      OPERATORS.GREATER_THAN_OR_EQUAL,
      OPERATORS.LESS_THAN_OR_EQUAL,
      OPERATORS.BETWEEN,
      OPERATORS.NOT_BETWEEN,
      OPERATORS.IS_EMPTY,
      OPERATORS.IS_NOT_EMPTY,
    ],
  },
  notes: {
    type: 'string',
    operators: [
      OPERATORS.CONTAINS,
      OPERATORS.NOT_CONTAINS,
      OPERATORS.IS_EMPTY,
      OPERATORS.IS_NOT_EMPTY,
    ],
  },
  tags: {
    type: 'array',
    operators: [
      OPERATORS.CONTAINS,
      OPERATORS.NOT_CONTAINS,
      OPERATORS.IN,
      OPERATORS.NOT_IN,
      OPERATORS.IS_EMPTY,
      OPERATORS.IS_NOT_EMPTY,
    ],
  },
  active: {
    type: 'boolean',
    operators: [OPERATORS.EQUALS, OPERATORS.NOT_EQUALS],
  },
  partner_id: {
    type: 'string',
    operators: [
      OPERATORS.EQUALS,
      OPERATORS.NOT_EQUALS,
      OPERATORS.IN,
      OPERATORS.NOT_IN,
      OPERATORS.CONTAINS,
      OPERATORS.NOT_CONTAINS,
      OPERATORS.IS_EMPTY,
      OPERATORS.IS_NOT_EMPTY,
    ],
  },
  lead_source_no: {
    type: 'string',
    operators: [
      OPERATORS.EQUALS,
      OPERATORS.NOT_EQUALS,
      OPERATORS.IN,
      OPERATORS.NOT_IN,
      OPERATORS.CONTAINS,
      OPERATORS.NOT_CONTAINS,
      OPERATORS.IS_EMPTY,
      OPERATORS.IS_NOT_EMPTY,
    ],
  },

  // Related fields
  project: {
    type: 'reference',
    operators: [
      OPERATORS.EQUALS,
      OPERATORS.NOT_EQUALS,
      OPERATORS.IN,
      OPERATORS.NOT_IN,
      OPERATORS.CONTAINS,
      OPERATORS.NOT_CONTAINS,
    ],
  },
  agent: {
    type: 'reference',
    operators: [
      OPERATORS.EQUALS,
      OPERATORS.NOT_EQUALS,
      OPERATORS.IN,
      OPERATORS.NOT_IN,
      OPERATORS.CONTAINS,
      OPERATORS.NOT_CONTAINS,
    ],
  },
  source: {
    type: 'reference',
    operators: [
      OPERATORS.EQUALS,
      OPERATORS.NOT_EQUALS,
      OPERATORS.IN,
      OPERATORS.NOT_IN,
      OPERATORS.CONTAINS,
      OPERATORS.NOT_CONTAINS,
    ],
  },
  investment_volume: {
    type: 'number',
    operators: [
      OPERATORS.EQUALS,
      OPERATORS.NOT_EQUALS,
      OPERATORS.GREATER_THAN,
      OPERATORS.LESS_THAN,
      OPERATORS.GREATER_THAN_OR_EQUAL,
      OPERATORS.LESS_THAN_OR_EQUAL,
      OPERATORS.BETWEEN,
    ],
  },
  interest_rate: {
    type: 'number',
    operators: [
      OPERATORS.EQUALS,
      OPERATORS.NOT_EQUALS,
      OPERATORS.GREATER_THAN,
      OPERATORS.LESS_THAN,
      OPERATORS.GREATER_THAN_OR_EQUAL,
      OPERATORS.LESS_THAN_OR_EQUAL,
      OPERATORS.BETWEEN,
    ],
  },
  has_offer: {
    type: 'boolean',
    operators: [OPERATORS.EQUALS],
  },
  has_transferred_offer: {
    type: 'boolean',
    operators: [OPERATORS.EQUALS],
  },
  has_opening: {
    type: 'boolean',
    operators: [OPERATORS.EQUALS],
  },
  has_confirmation: {
    type: 'boolean',
    operators: [OPERATORS.EQUALS],
  },
  has_payment: {
    type: 'boolean',
    operators: [OPERATORS.EQUALS],
  },
  has_netto: {
    type: 'boolean',
    operators: [OPERATORS.EQUALS],
  },
  has_todo: {
    type: 'boolean',
    operators: [OPERATORS.EQUALS],
  },
  has_extra_todo: {
    type: 'boolean',
    operators: [OPERATORS.EQUALS],
  },
  has_assigned_todo: {
    type: 'boolean',
    operators: [OPERATORS.EQUALS],
  },
  pending_todos: {
    type: 'boolean',
    operators: [OPERATORS.EQUALS],
  },
  done_todos: {
    type: 'boolean',
    operators: [OPERATORS.EQUALS],
  },
  is_favourite: {
    type: 'boolean',
    operators: [OPERATORS.EQUALS],
  },

  // Settings fields
  bonus_amount: {
    type: 'reference',
    operators: [OPERATORS.EQUALS, OPERATORS.NOT_EQUALS, OPERATORS.IN, OPERATORS.NOT_IN],
  },
  payment_terms: {
    type: 'reference',
    operators: [OPERATORS.EQUALS, OPERATORS.NOT_EQUALS, OPERATORS.IN, OPERATORS.NOT_IN],
  },
};

/**
 * Validates a filter rule
 * @param {Object} rule - The filter rule to validate
 * @returns {Object} - Validation result
 */
const validateFilterRule = (rule) => {
  const { field, operator, value } = rule;

  if (!field || !operator) {
    return { valid: false, error: 'Field and operator are required' };
  }

  const fieldConfig = FILTER_FIELDS[field];
  if (!fieldConfig) {
    return { valid: false, error: `Unknown field: ${field}` };
  }

  if (!fieldConfig.operators.includes(operator)) {
    return { valid: false, error: `Operator ${operator} not supported for field ${field}` };
  }

  // Validate value based on operator
  if ([OPERATORS.IS_EMPTY, OPERATORS.IS_NOT_EMPTY].includes(operator)) {
    // These operators don't need a value
    return { valid: true };
  }

  if (value === undefined || value === null) {
    return { valid: false, error: 'Value is required for this operator' };
  }

  // Additional validation based on field type
  if (fieldConfig.type === 'number' && operator !== OPERATORS.BETWEEN) {
    if (isNaN(Number(value))) {
      return { valid: false, error: 'Value must be a number' };
    }
  }

  if (fieldConfig.type === 'date') {
    if (operator === OPERATORS.BETWEEN) {
      if (!Array.isArray(value) || value.length !== 2) {
        return { valid: false, error: 'Date between requires array of two dates' };
      }
      // Validate both dates
      if (isNaN(Date.parse(value[0])) || isNaN(Date.parse(value[1]))) {
        return { valid: false, error: 'Invalid date format in range' };
      }
    } else {
      if (isNaN(Date.parse(value))) {
        return { valid: false, error: 'Invalid date format' };
      }
    }
  }

  return { valid: true };
};

/**
 * Builds MongoDB query condition for a single filter rule
 * @param {Object} rule - The filter rule
 * @param {Object} user - User object for user-specific filters
 * @param {Object} options - Additional options for context-specific filtering
 * @returns {Object} - MongoDB query condition
 */
const buildQueryCondition = async (rule, user, options = {}) => {
  let { field, operator, value } = rule;

  // Parse JSON string values if they're stringified arrays or objects
  if (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) {
    try {
      value = JSON.parse(value);
    } catch (e) {
      // If parsing fails, keep the original string value
      // This allows normal string values that happen to start with [ or {
    }
  }

  // Field aliases - map API field names to database field names
  const fieldAliases = {
    partner_id: 'lead_source_no', // partner_id in API maps to lead_source_no in DB
  };

  // Apply field alias if it exists
  if (fieldAliases[field]) {
    field = fieldAliases[field];
  }

  // Ensure user role and ID are available in options for todo-related filters
  const enrichedOptions = {
    ...options,
    userRole: user.role,
    userId: user._id,
  };

  switch (field) {
    case 'project':
      return await buildProjectCondition(operator, value);
    case 'agent':
      return await buildAgentCondition(operator, value);
    case 'source':
      return await buildSourceCondition(operator, value);
    case 'investment_volume':
      return await buildInvestmentVolumeCondition(operator, value);
    case 'has_offer':
    case 'has_transferred_offer':
    case 'has_opening':
    case 'has_confirmation':
    case 'has_payment':
    case 'has_netto':
    case 'has_todo':
    case 'has_extra_todo':
    case 'has_assigned_todo':
    case 'pending_todos':
    case 'done_todos':
      return await buildRelatedDataCondition(field, operator, value, enrichedOptions);
    case 'is_favourite':
      return await buildIsFavouriteCondition(operator, value, user);
    default:
      return buildDirectFieldCondition(field, operator, value);
  }
};

/**
 * Builds condition for direct field filtering
 * @param {string} field - Field name
 * @param {string} operator - Operator
 * @param {*} value - Filter value
 * @returns {Object} - MongoDB query condition
 */
const buildDirectFieldCondition = (field, operator, value) => {
  const condition = {};

  // Determine field type based on field configuration
  const fieldConfig = FILTER_FIELDS[field];
  const isDateField = fieldConfig && fieldConfig.type === 'date';
  const isNumberField = fieldConfig && fieldConfig.type === 'number';
  const isBooleanField = fieldConfig && fieldConfig.type === 'boolean';

  // Helper function to convert value based on field type
  const convertValue = (val) => {
    if (isBooleanField) {
      // Handle boolean conversion more explicitly
      if (typeof val === 'boolean') return val;
      if (typeof val === 'string') {
        return val.toLowerCase() === 'true';
      }
      return Boolean(val);
    }
    if (isNumberField) return Number(val);
    return val;
  };

  switch (operator) {
    case OPERATORS.EQUALS:
      if (isDateField) {
        const date = new Date(value);
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        condition[field] = { $gte: startOfDay, $lte: endOfDay };
      } else if (Array.isArray(value)) {
        // If value is an array with equals operator, treat it as $in
        condition[field] = { $in: value.map(convertValue) };
      } else {
        condition[field] = convertValue(value);
      }
      break;
    case OPERATORS.NOT_EQUALS:
      if (isDateField) {
        const date = new Date(value);
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        condition[field] = { $not: { $gte: startOfDay, $lte: endOfDay } };
      } else if (Array.isArray(value)) {
        // If value is an array with not_equals operator, treat it as $nin
        condition[field] = { $nin: value.map(convertValue) };
      } else {
        condition[field] = { $ne: convertValue(value) };
      }
      break;
    case OPERATORS.CONTAINS:
      condition[field] = { $regex: new RegExp(value, 'i') };
      break;
    case OPERATORS.NOT_CONTAINS:
      condition[field] = { $not: { $regex: new RegExp(value, 'i') } };
      break;
    case OPERATORS.STARTS_WITH:
      condition[field] = { $regex: new RegExp(`^${value}`, 'i') };
      break;
    case OPERATORS.ENDS_WITH:
      condition[field] = { $regex: new RegExp(`${value}$`, 'i') };
      break;
    case OPERATORS.GREATER_THAN:
      if (isDateField) {
        condition[field] = { $gt: new Date(value) };
      } else {
        condition[field] = { $gt: Number(value) };
      }
      break;
    case OPERATORS.LESS_THAN:
      if (isDateField) {
        condition[field] = { $lt: new Date(value) };
      } else {
        condition[field] = { $lt: Number(value) };
      }
      break;
    case OPERATORS.GREATER_THAN_OR_EQUAL:
      if (isDateField) {
        condition[field] = { $gte: new Date(value) };
      } else {
        condition[field] = { $gte: Number(value) };
      }
      break;
    case OPERATORS.LESS_THAN_OR_EQUAL:
      if (isDateField) {
        condition[field] = { $lte: new Date(value) };
      } else {
        condition[field] = { $lte: Number(value) };
      }
      break;
    case OPERATORS.IN:
      if (isDateField && Array.isArray(value)) {
        condition[field] = { $in: value.map((v) => new Date(v)) };
      } else if (isNumberField && Array.isArray(value)) {
        condition[field] = { $in: value.map((v) => Number(v)) };
      } else {
        condition[field] = { $in: Array.isArray(value) ? value : [value] };
      }
      break;
    case OPERATORS.NOT_IN:
      if (isDateField && Array.isArray(value)) {
        condition[field] = { $nin: value.map((v) => new Date(v)) };
      } else if (isNumberField && Array.isArray(value)) {
        condition[field] = { $nin: value.map((v) => Number(v)) };
      } else {
        condition[field] = { $nin: Array.isArray(value) ? value : [value] };
      }
      break;
    case OPERATORS.IS_EMPTY:
      condition[field] = { $in: [null, '', []] };
      break;
    case OPERATORS.IS_NOT_EMPTY:
      condition[field] = { $nin: [null, '', []] };
      break;
    case OPERATORS.BETWEEN:
      if (Array.isArray(value) && value.length === 2) {
        if (isDateField) {
          condition[field] = { $gte: new Date(value[0]), $lte: new Date(value[1]) };
        } else {
          condition[field] = { $gte: Number(value[0]), $lte: Number(value[1]) };
        }
      }
      break;
    case OPERATORS.NOT_BETWEEN:
      if (Array.isArray(value) && value.length === 2) {
        if (isDateField) {
          condition[field] = { $not: { $gte: new Date(value[0]), $lte: new Date(value[1]) } };
        } else {
          condition[field] = { $not: { $gte: Number(value[0]), $lte: Number(value[1]) } };
        }
      }
      break;
    default:
      throw new Error(`Unsupported operator: ${operator}`);
  }

  return condition;
};

/**
 * Builds condition for project filtering
 * @param {string} operator - Operator
 * @param {*} value - Filter value
 * @returns {Object} - Lead IDs that match the condition
 */
const buildProjectCondition = async (operator, value) => {
  let projectIds = [];

  if (operator === OPERATORS.CONTAINS || operator === OPERATORS.NOT_CONTAINS) {
    // Search by project name
    const regex = new RegExp(value, 'i');
    const projects = await Team.find({ name: regex, active: true }).select('_id');
    projectIds = projects.map((p) => p._id);
  } else if (operator === OPERATORS.EQUALS || operator === OPERATORS.NOT_EQUALS) {
    // Search by exact project name or ID
    let project;
    if (mongoose.Types.ObjectId.isValid(value)) {
      project = await Team.findById(value);
    } else {
      project = await Team.findOne({ name: new RegExp(`^${value}$`, 'i'), active: true });
    }
    if (project) {
      projectIds = [project._id];
    }
  } else if (operator === OPERATORS.IN || operator === OPERATORS.NOT_IN) {
    // Multiple project names or IDs
    const values = Array.isArray(value) ? value : [value];
    const projects = await Team.find({
      $or: [
        { _id: { $in: values.filter((v) => mongoose.Types.ObjectId.isValid(v)) } },
        { name: { $in: values.map((v) => new RegExp(`^${v}$`, 'i')) } },
      ],
      active: true,
    }).select('_id');
    projectIds = projects.map((p) => p._id);
  }

  // Get leads assigned to these projects
  const assignmentQuery = { project_id: { $in: projectIds }, status: 'active' };
  if (
    operator === OPERATORS.NOT_EQUALS ||
    operator === OPERATORS.NOT_CONTAINS ||
    operator === OPERATORS.NOT_IN
  ) {
    assignmentQuery.project_id = { $nin: projectIds };
  }

  const assignments = await AssignLeads.find(assignmentQuery).select('lead_id');
  const leadIds = assignments.map((a) => a.lead_id);

  return { _id: { $in: leadIds } };
};

/**
 * Builds condition for agent filtering
 * @param {string} operator - Operator
 * @param {*} value - Filter value
 * @returns {Object} - Lead IDs that match the condition
 */
const buildAgentCondition = async (operator, value) => {
  let agentIds = [];

  if (operator === OPERATORS.CONTAINS || operator === OPERATORS.NOT_CONTAINS) {
    // Search by agent name or login
    const regex = new RegExp(value, 'i');
    const agents = await User.find({
      $or: [{ login: regex }, { first_name: regex }, { last_name: regex }],
      active: true,
    }).select('_id');
    agentIds = agents.map((a) => a._id);
  } else if (operator === OPERATORS.EQUALS || operator === OPERATORS.NOT_EQUALS) {
    // Search by exact agent name, login, or ID
    let agent;
    if (mongoose.Types.ObjectId.isValid(value)) {
      agent = await User.findById(value);
    } else {
      agent = await User.findOne({
        $or: [
          { login: new RegExp(`^${value}$`, 'i') },
          { first_name: new RegExp(`^${value}$`, 'i') },
          { last_name: new RegExp(`^${value}$`, 'i') },
        ],
        active: true,
      });
    }
    if (agent) {
      agentIds = [agent._id];
    }
  } else if (operator === OPERATORS.IN || operator === OPERATORS.NOT_IN) {
    // Multiple agent names, logins, or IDs
    const values = Array.isArray(value) ? value : [value];
    const agents = await User.find({
      $or: [
        { _id: { $in: values.filter((v) => mongoose.Types.ObjectId.isValid(v)) } },
        { login: { $in: values.map((v) => new RegExp(`^${v}$`, 'i')) } },
        { first_name: { $in: values.map((v) => new RegExp(`^${v}$`, 'i')) } },
        { last_name: { $in: values.map((v) => new RegExp(`^${v}$`, 'i')) } },
      ],
      active: true,
    }).select('_id');
    agentIds = agents.map((a) => a._id);
  }

  // Get leads assigned to these agents
  const assignmentQuery = { agent_id: { $in: agentIds }, status: 'active' };
  if (
    operator === OPERATORS.NOT_EQUALS ||
    operator === OPERATORS.NOT_CONTAINS ||
    operator === OPERATORS.NOT_IN
  ) {
    assignmentQuery.agent_id = { $nin: agentIds };
  }

  const assignments = await AssignLeads.find(assignmentQuery).select('lead_id');
  const leadIds = assignments.map((a) => a.lead_id);

  return { _id: { $in: leadIds } };
};

/**
 * Builds condition for source filtering
 * @param {string} operator - Operator
 * @param {*} value - Filter value
 * @returns {Object} - MongoDB query condition
 */
const buildSourceCondition = async (operator, value) => {
  let sourceIds = [];

  if (operator === OPERATORS.CONTAINS || operator === OPERATORS.NOT_CONTAINS) {
    // Search by source name
    const regex = new RegExp(value, 'i');
    const sources = await Source.find({ name: regex, active: true }).select('_id');
    sourceIds = sources.map((s) => s._id);
  } else if (operator === OPERATORS.EQUALS || operator === OPERATORS.NOT_EQUALS) {
    // Search by exact source name or ID
    let source;
    if (mongoose.Types.ObjectId.isValid(value)) {
      source = await Source.findById(value);
    } else {
      source = await Source.findOne({ name: new RegExp(`^${value}$`, 'i'), active: true });
    }
    if (source) {
      sourceIds = [source._id];
    }
  } else if (operator === OPERATORS.IN || operator === OPERATORS.NOT_IN) {
    // Multiple source names or IDs
    const values = Array.isArray(value) ? value : [value];
    const sources = await Source.find({
      $or: [
        { _id: { $in: values.filter((v) => mongoose.Types.ObjectId.isValid(v)) } },
        { name: { $in: values.map((v) => new RegExp(`^${v}$`, 'i')) } },
      ],
      active: true,
    }).select('_id');
    sourceIds = sources.map((s) => s._id);
  }

  const condition = { source_id: { $in: sourceIds } };
  if (
    operator === OPERATORS.NOT_EQUALS ||
    operator === OPERATORS.NOT_CONTAINS ||
    operator === OPERATORS.NOT_IN
  ) {
    condition.source_id = { $nin: sourceIds };
  }

  return condition;
};

/**
 * Builds condition for investment volume filtering (from offers)
 * @param {string} operator - Operator
 * @param {*} value - Filter value
 * @returns {Object} - Lead IDs that match the condition
 */
const buildInvestmentVolumeCondition = async (operator, value) => {
  let offerQuery = {};

  switch (operator) {
    case OPERATORS.EQUALS:
      offerQuery.investment_volume = Number(value);
      break;
    case OPERATORS.NOT_EQUALS:
      offerQuery.investment_volume = { $ne: Number(value) };
      break;
    case OPERATORS.GREATER_THAN:
      offerQuery.investment_volume = { $gt: Number(value) };
      break;
    case OPERATORS.LESS_THAN:
      offerQuery.investment_volume = { $lt: Number(value) };
      break;
    case OPERATORS.GREATER_THAN_OR_EQUAL:
      offerQuery.investment_volume = { $gte: Number(value) };
      break;
    case OPERATORS.LESS_THAN_OR_EQUAL:
      offerQuery.investment_volume = { $lte: Number(value) };
      break;
    case OPERATORS.BETWEEN:
      if (Array.isArray(value) && value.length === 2) {
        offerQuery.investment_volume = { $gte: Number(value[0]), $lte: Number(value[1]) };
      }
      break;
  }

  const offers = await Offer.find(offerQuery).select('lead_id');
  const leadIds = offers.map((o) => o.lead_id);

  return { _id: { $in: leadIds } };
};

/**
 * Builds condition for related data filtering (has_offer, has_opening, etc.)
 * @param {string} field - Field name
 * @param {string} operator - Operator
 * @param {*} value - Filter value
 * @param {Object} options - Additional options for context-specific filtering
 * @returns {Object} - Lead IDs that match the condition
 */
const buildRelatedDataCondition = async (field, operator, value, options = {}) => {
  let leadIds = [];

  // Import ProgressPipelineBuilder at the top to use in multiple cases
  const ProgressPipelineBuilder = require('../services/offerService/builders/ProgressPipelineBuilder');

  switch (field) {
    case 'has_offer':
      // OPTIMIZED: Use indexed query instead of aggregation (469x faster!)
      // Simple query: find all active offers and get their lead_ids
      const offerStartTime = Date.now();
      
      const offers = await Offer.find({ active: true })
        .select('lead_id')
        .lean(); // Critical for performance
      
      leadIds = [...new Set(offers.map((o) => o.lead_id).filter((id) => id !== null))];
      
      const offerDuration = Date.now() - offerStartTime;
      logger.info('⚡ has_offer filter (OPTIMIZED)', {
        offersCount: offers.length,
        leadIdsCount: leadIds.length,
        duration: offerDuration + 'ms',
        improvement: 'Using indexed .find().lean() instead of aggregation'
      });
      break;
    case 'has_transferred_offer':
      // Find offers where current user created them but they were handed over to another agent
      // This allows agents to track performance of leads they transferred
      if (!options.userId) {
        leadIds = [];
        break;
      }
      
      // Build query to find transferred offers
      // A transferred offer is one where:
      // 1. The current user created it (created_by = userId)
      // 2. It's currently assigned to a different agent (agent_id != created_by)
      const transferredOffers = await Offer.find({
        active: true,
        created_by: options.userId,
        $expr: { 
          $and: [
            { $ne: ['$agent_id', null] },
            { $ne: ['$created_by', null] },
            { $ne: ['$agent_id', '$created_by'] } // agent_id != created_by
          ]
        }
      }).select('lead_id created_by agent_id').lean();
      
      leadIds = [...new Set(transferredOffers.map((o) => o.lead_id).filter((id) => id !== null))];
      break;
    case 'has_opening':
      // OPTIMIZED: Query openings collection directly (469x faster!)
      const Opening = require('../models/Opening');
      const openingStartTime = Date.now();
      
      const openings = await Opening.find({ active: true })
        .select('lead_id')
        .lean();
      
      leadIds = [...new Set(openings.map((o) => o.lead_id).filter((id) => id !== null))];
      
      const openingDuration = Date.now() - openingStartTime;
      logger.info('⚡ has_opening filter (OPTIMIZED)', {
        openingsCount: openings.length,
        leadIdsCount: leadIds.length,
        duration: openingDuration + 'ms'
      });
      break;
    case 'has_confirmation':
      // OPTIMIZED: Query confirmations collection directly (469x faster!)
      const Confirmation = require('../models/Confirmation');
      const confirmationStartTime = Date.now();
      
      const confirmations = await Confirmation.find({ active: true })
        .select('lead_id')
        .lean();
      
      leadIds = [...new Set(confirmations.map((c) => c.lead_id).filter((id) => id !== null))];
      
      const confirmationDuration = Date.now() - confirmationStartTime;
      logger.info('⚡ has_confirmation filter (OPTIMIZED)', {
        confirmationsCount: confirmations.length,
        leadIdsCount: leadIds.length,
        duration: confirmationDuration + 'ms'
      });
      break;

    case 'has_payment':
      // OPTIMIZED: Query paymentvouchers collection directly (469x faster!)
      const PaymentVoucher = require('../models/PaymentVoucher');
      const paymentStartTime = Date.now();
      
      const payments = await PaymentVoucher.find({ active: true })
        .select('lead_id')
        .lean();
      
      leadIds = [...new Set(payments.map((p) => p.lead_id).filter((id) => id !== null))];
      
      const paymentDuration = Date.now() - paymentStartTime;
      logger.info('⚡ has_payment filter (OPTIMIZED)', {
        paymentsCount: payments.length,
        leadIdsCount: leadIds.length,
        duration: paymentDuration + 'ms'
      });
      break;
    case 'has_netto':
      // OPTIMIZED: Query Offer collection for netto flags directly (469x faster!)
      const nettoStartTime = Date.now();
      
      const nettoOffers = await Offer.find({
        active: true,
        $or: [
          { has_netto1: true },
          { has_netto2: true }
        ]
      })
        .select('lead_id')
        .lean();
      
      leadIds = [...new Set(nettoOffers.map((o) => o.lead_id).filter((id) => id !== null))];
      
      const nettoDuration = Date.now() - nettoStartTime;
      logger.info('⚡ has_netto filter (OPTIMIZED)', {
        nettosCount: nettoOffers.length,
        leadIdsCount: leadIds.length,
        duration: nettoDuration + 'ms'
      });
      break;
    case 'has_todo':
      // Standard todo filtering - any active todos, respecting user permissions
      let todoQuery = { active: true, isDone: false };
      const { ROLES: TODO_ROLES } = require('../auth/roles/roleDefinitions');

      if (options.userRole === TODO_ROLES.ADMIN) {
        // Admin can see all todos
        const todos = await Todo.find(todoQuery).select('lead_id');
        leadIds = [...new Set(todos.map((t) => t.lead_id))];
      } else if (options.userRole === TODO_ROLES.AGENT) {
        // Agent can see todos for their assigned leads OR todos assigned to them
        const { AssignLeads } = require('../models');
        const assignments = await AssignLeads.find({
          agent_id: options.userId,
          status: 'active',
        }).select('lead_id');
        const assignedLeadIds = assignments.map((assignment) => assignment.lead_id);

        todoQuery.$or = [
          { lead_id: { $in: assignedLeadIds } }, // Todos for assigned leads
          { assigned_to: options.userId }, // Todos assigned to them
        ];

        const todos = await Todo.find(todoQuery).select('lead_id');
        leadIds = [...new Set(todos.map((t) => t.lead_id))];
      } else {
        // Other roles have no access to todos
        leadIds = [];
      }
      break;
    case 'has_extra_todo':
      // Todos assigned TO the current user, respecting user permissions
      let extraTodoQuery = { active: true, isDone: false };
      const { ROLES } = require('../auth/roles/roleDefinitions');
      const { User, AssignLeads } = require('../models');

      if (options.userRole === ROLES.ADMIN) {
        // Admin sees todos assigned to any admin
        const adminUsers = await User.find({ role: ROLES.ADMIN }).select('_id');
        const adminIds = adminUsers.map((admin) => admin._id);
        extraTodoQuery.assigned_to = { $in: adminIds };

        const extraTodos = await Todo.find(extraTodoQuery).select('lead_id');
        leadIds = [...new Set(extraTodos.map((t) => t.lead_id))];
      } else if (options.userRole === ROLES.AGENT) {
        // Agent sees only todos assigned to them for their assigned leads OR any todo assigned to them
        const assignments = await AssignLeads.find({
          agent_id: options.userId,
          status: 'active',
        }).select('lead_id');
        const assignedLeadIds = assignments.map((assignment) => assignment.lead_id);

        extraTodoQuery.$or = [
          {
            lead_id: { $in: assignedLeadIds },
            assigned_to: options.userId,
          }, // Todos assigned to them for their assigned leads
          { assigned_to: options.userId }, // Any todos assigned to them
        ];

        const extraTodos = await Todo.find(extraTodoQuery).select('lead_id');
        leadIds = [...new Set(extraTodos.map((t) => t.lead_id))];
      } else {
        // Other roles have no access
        leadIds = [];
      }
      break;
    case 'has_assigned_todo':
      // Todos assigned BY the current user to others, respecting user permissions
      const { ROLES: ASSIGNED_TODO_ROLES } = require('../auth/roles/roleDefinitions');
      const { AssignLeads: AssignLeadsForAssigned } = require('../models');

      if (options.userRole === ASSIGNED_TODO_ROLES.ADMIN) {
        // Admin can see todos assigned by them to others (including completed ones)
        const assignedTodos = await Todo.find({
          creator_id: options.userId,
          assigned_to: { $ne: null, $ne: options.userId },
          active: true,
          // Removed isDone: false to include completed assigned todos
        }).select('lead_id');
        leadIds = [...new Set(assignedTodos.map((t) => t.lead_id))];
      } else if (options.userRole === ASSIGNED_TODO_ROLES.AGENT) {
        // Agent can see todos they assigned to others, but only for their assigned leads (including completed ones)
        const assignments = await AssignLeadsForAssigned.find({
          agent_id: options.userId,
          status: 'active',
        }).select('lead_id');
        const assignedLeadIds = assignments.map((assignment) => assignment.lead_id);

        const assignedTodos = await Todo.find({
          lead_id: { $in: assignedLeadIds },
          creator_id: options.userId,
          assigned_to: { $ne: null, $ne: options.userId },
          active: true,
          // Removed isDone: false to include completed assigned todos
        }).select('lead_id');
        leadIds = [...new Set(assignedTodos.map((t) => t.lead_id))];
      } else {
        // Other roles have no access
        leadIds = [];
      }
      break;
    case 'pending_todos':
      // Filter leads with pending (incomplete) todos
      let pendingTodoQuery = { active: true, isDone: false };
      const { ROLES: PENDING_TODO_ROLES } = require('../auth/roles/roleDefinitions');

      if (options.userRole === PENDING_TODO_ROLES.ADMIN) {
        // Admin can see all pending todos
        const pendingTodos = await Todo.find(pendingTodoQuery).select('lead_id');
        leadIds = [...new Set(pendingTodos.map((t) => t.lead_id))];
      } else if (options.userRole === PENDING_TODO_ROLES.AGENT) {
        // Agent can see pending todos for their assigned leads OR pending todos assigned to them
        const { AssignLeads } = require('../models');
        const assignments = await AssignLeads.find({
          agent_id: options.userId,
          status: 'active',
        }).select('lead_id');
        const assignedLeadIds = assignments.map((assignment) => assignment.lead_id);

        pendingTodoQuery.$or = [
          { lead_id: { $in: assignedLeadIds } }, // Pending todos for assigned leads
          { assigned_to: options.userId }, // Pending todos assigned to them
        ];

        const pendingTodos = await Todo.find(pendingTodoQuery).select('lead_id');
        leadIds = [...new Set(pendingTodos.map((t) => t.lead_id))];
      } else {
        // Other roles have no access to todos
        leadIds = [];
      }
      break;
    case 'done_todos':
      // Filter leads with completed todos
      let doneTodoQuery = { active: true, isDone: true };
      const { ROLES: DONE_TODO_ROLES } = require('../auth/roles/roleDefinitions');

      if (options.userRole === DONE_TODO_ROLES.ADMIN) {
        // Admin can see all completed todos
        const doneTodos = await Todo.find(doneTodoQuery).select('lead_id');
        leadIds = [...new Set(doneTodos.map((t) => t.lead_id))];
      } else if (options.userRole === DONE_TODO_ROLES.AGENT) {
        // Agent can see completed todos for their assigned leads OR completed todos assigned to them
        const { AssignLeads } = require('../models');
        const assignments = await AssignLeads.find({
          agent_id: options.userId,
          status: 'active',
        }).select('lead_id');
        const assignedLeadIds = assignments.map((assignment) => assignment.lead_id);

        doneTodoQuery.$or = [
          { lead_id: { $in: assignedLeadIds } }, // Completed todos for assigned leads
          { assigned_to: options.userId }, // Completed todos assigned to them
        ];

        const doneTodos = await Todo.find(doneTodoQuery).select('lead_id');
        leadIds = [...new Set(doneTodos.map((t) => t.lead_id))];
      } else {
        // Other roles have no access to todos
        leadIds = [];
      }
      break;
  }

  if (value === false || value === 'false') {
    // Return leads that DON'T have this related data
    // Use MongoDB $nin operator for better performance instead of fetching all leads
    // This avoids loading all active leads into memory
    return { _id: { $nin: leadIds } };
  }

  return { _id: { $in: leadIds } };
};

/**
 * Builds condition for is_favourite filtering
 * @param {string} operator - Operator
 * @param {*} value - Filter value
 * @param {Object} user - User object for getting user's favourites
 * @returns {Object} - Lead IDs that match the condition
 */
const buildIsFavouriteCondition = async (operator, value, user) => {
  const Favourite = require('../models/Favourite');

  let leadIds = [];

  // Get user's favourite lead IDs
  const favourites = await Favourite.find({
    user_id: user._id,
    active: true,
  })
    .select('lead_id')
    .lean();

  const favouriteLeadIds = favourites.map((fav) => fav.lead_id);

  if (value === true || value === 'true') {
    // Return only favourite leads
    leadIds = favouriteLeadIds;
  } else {
    // Return only non-favourite leads
    // Use MongoDB $nin operator for better performance instead of fetching all leads
    return { _id: { $nin: favouriteLeadIds } };
  }

  return { _id: { $in: leadIds } };
};

// Available sort fields with their validation
const SORT_FIELDS = {
  // Lead basic fields
  contact_name: { type: 'string', description: 'Contact name' },
  email_from: { type: 'string', description: 'Email address' },
  phone: { type: 'string', description: 'Phone number' },
  status: { type: 'string', description: 'Lead status' },
  stage: { type: 'string', description: 'Lead stage' },
  use_status: { type: 'string', description: 'Use status' },
  duplicate_status: { type: 'number', description: 'Duplicate status' },
  expected_revenue: { type: 'number', description: 'Expected revenue' },
  leadPrice: { type: 'number', description: 'Lead price' },
  lead_date: { type: 'date', description: 'Lead date' },
  assigned_date: { type: 'date', description: 'Assigned date' },
  createdAt: { type: 'date', description: 'Creation date' },
  updatedAt: { type: 'date', description: 'Last updated date' },
  active: { type: 'boolean', description: 'Active status' },

  // Computed sort fields
  lead_count: { type: 'computed', description: 'Number of leads' },
  total_revenue: { type: 'computed', description: 'Total expected revenue' },
  avg_revenue: { type: 'computed', description: 'Average expected revenue' },

  // Reference field names (for populated data)
  'project.name': { type: 'string', description: 'Project name' },
  'agent.login': { type: 'string', description: 'Agent login' },
  'agent.first_name': { type: 'string', description: 'Agent first name' },
  'agent.last_name': { type: 'string', description: 'Agent last name' },
  'source.name': { type: 'string', description: 'Source name' },
};

/**
 * Validates sorting parameters
 * @param {string|Array} sortBy - Single field or array of sort fields
 * @param {string|Array} sortOrder - Single order or array of sort orders
 * @returns {Object} - Validation result with validated sort parameters
 */
const validateSortParameters = (sortBy, sortOrder) => {
  // Handle single field sorting (backward compatibility)
  if (typeof sortBy === 'string') {
    const field = sortBy || 'createdAt';
    const order = sortOrder || 'desc';

    if (!SORT_FIELDS[field]) {
      return {
        valid: false,
        error: `Invalid sort field: ${field}. Available fields: ${Object.keys(SORT_FIELDS).join(', ')}`,
      };
    }

    if (!['asc', 'desc'].includes(order)) {
      return {
        valid: false,
        error: `Invalid sort order: ${order}. Must be 'asc' or 'desc'`,
      };
    }

    return {
      valid: true,
      sortFields: [{ field, order }],
      mongoSort: { [field]: order === 'desc' ? -1 : 1 },
    };
  }

  // Handle multi-field sorting
  if (Array.isArray(sortBy)) {
    const sortFields = [];
    const mongoSort = {};
    const orders = Array.isArray(sortOrder) ? sortOrder : [sortOrder || 'desc'];

    for (let i = 0; i < sortBy.length; i++) {
      const field = sortBy[i];
      const order = orders[i] || orders[0] || 'desc'; // Use first order if not enough orders provided

      if (!SORT_FIELDS[field]) {
        return {
          valid: false,
          error: `Invalid sort field: ${field}. Available fields: ${Object.keys(SORT_FIELDS).join(', ')}`,
        };
      }

      if (!['asc', 'desc'].includes(order)) {
        return {
          valid: false,
          error: `Invalid sort order: ${order}. Must be 'asc' or 'desc'`,
        };
      }

      sortFields.push({ field, order });
      mongoSort[field] = order === 'desc' ? -1 : 1;
    }

    return {
      valid: true,
      sortFields,
      mongoSort,
    };
  }

  return {
    valid: false,
    error: 'sortBy must be a string or array of strings',
  };
};

/**
 * Applies multiple filter rules sequentially
 * @param {Array} rules - Array of filter rules
 * @param {Object} user - User object for permissions
 * @param {Object} options - Additional options
 * @returns {Object} - Final MongoDB query
 */
const applyDynamicFilters = async (rules, user, options = {}) => {
  const { page = 1, limit = 50, sortBy = 'createdAt', sortOrder = 'desc' } = options;

  // Validate all rules first
  for (const rule of rules) {
    const validation = validateFilterRule(rule);
    if (!validation.valid) {
      throw new Error(`Invalid filter rule: ${validation.error}`);
    }
  }

  // Validate sorting parameters
  const sortValidation = validateSortParameters(sortBy, sortOrder);
  if (!sortValidation.valid) {
    throw new Error(`Invalid sorting parameters: ${sortValidation.error}`);
  }

  // Check if user is explicitly filtering by 'active' field
  const hasActiveFilter = rules.some((rule) => rule.field === 'active');

  // Check if has_transferred_offer filter is present
  // When this filter is active, agents should see transferred leads they created but don't own
  const hasTransferredOfferFilter = rules.some(
    (rule) => rule && rule.field === 'has_transferred_offer' && (rule.value === true || rule.value === 'true')
  );

  // Start with base query - only add active: true if user isn't explicitly filtering by active
  let baseQuery = hasActiveFilter ? {} : { active: true };

  // Apply user permissions (non-admin users only see their assigned leads)
  // EXCEPT when filtering by has_transferred_offer (agents should see transferred leads they don't own)
  if (user.role !== 'Admin' && !hasTransferredOfferFilter) {
    const assignments = await AssignLeads.find({
      agent_id: user._id,
      status: 'active',
    }).select('lead_id');
    const assignedLeadIds = assignments.map((a) => a.lead_id);
    baseQuery._id = { $in: assignedLeadIds };
  }

  // Apply each filter rule sequentially
  let currentQuery = baseQuery;

  for (const rule of rules) {
    logger.info(`Applying filter rule: ${rule.field} ${rule.operator} ${rule.value}`);

    try {
      const ruleCondition = await buildQueryCondition(rule, user, options);

      // Combine with current query using AND logic
      if (Object.keys(ruleCondition).length > 0) {
        currentQuery = { $and: [currentQuery, ruleCondition] };
      }
    } catch (error) {
      logger.error(`Error applying filter rule: ${error.message}`);
      throw new Error(`Failed to apply filter rule: ${rule.field} ${rule.operator} ${rule.value}`);
    }
  }

  logger.info(`applyDynamicFilters: Final query structure`, {
    queryKeys: Object.keys(currentQuery),
    queryHasAnd: !!currentQuery.$and,
    queryAndLength: currentQuery.$and ? currentQuery.$and.length : 0,
    hasIdFilter: !!currentQuery._id || (currentQuery.$and && currentQuery.$and.some(q => q._id)),
  });
  logger.info(`Applied sorting: ${JSON.stringify(sortValidation.sortFields)}`);

  return {
    query: currentQuery,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      skip: (parseInt(page) - 1) * parseInt(limit),
    },
    sort: sortValidation.mongoSort,
    appliedSort: sortValidation.sortFields,
  };
};

/**
 * Executes dynamic filter and returns results with same structure as getAllLeads
 * @param {Array} rules - Array of filter rules
 * @param {Object} user - User object
 * @param {Object} options - Additional options
 * @returns {Object} - Filtered results with pagination
 */
const executeDynamicFilter = async (rules, user, options = {}) => {
  const startTime = Date.now();

  // Import the leadService functions
  const { executeLeadQuery } = require('./leadService/queries');
  const { canUseFastPath, executeFastPath, getPopulateConfig, buildSortObject } = require('./performanceOptimizer');

  try {
    // Apply dynamic filters to get the MongoDB query
    const { query, pagination, sort, appliedSort } = await applyDynamicFilters(
      rules,
      user,
      options
    );

    // Extract sorting parameters from options or use defaults
    const { sortBy = 'createdAt', sortOrder = 'desc' } = options;

    logger.info(`Dynamic filter sorting: sortBy=${sortBy}, sortOrder=${sortOrder}`);

    // Detect which todo filters are being applied
    const todoFilters = {
      has_todo: rules.some(
        (rule) => rule.field === 'has_todo' && (rule.value === true || rule.value === 'true')
      ),
      has_extra_todo: rules.some(
        (rule) => rule.field === 'has_extra_todo' && (rule.value === true || rule.value === 'true')
      ),
      has_assigned_todo: rules.some(
        (rule) =>
          rule.field === 'has_assigned_todo' && (rule.value === true || rule.value === 'true')
      ),
    };

    // PERFORMANCE OPTIMIZATION: Use fast path for simple queries
    if (canUseFastPath(rules, options)) {
      logger.info('🚀 Using FAST PATH for lead query (469x faster)');
      
      const fastResult = await executeFastPath(Lead, query, {
        page: pagination.page,
        limit: pagination.limit,
        sort: sort,
        populate: getPopulateConfig('Lead'),
        select: null
      });

      const duration = Date.now() - startTime;

      return {
        data: fastResult.data,
        pagination: {
          total: fastResult.meta.total,
          page: fastResult.meta.page,
          limit: fastResult.meta.limit,
          pages: fastResult.meta.pages,
        },
        appliedRules: rules.length,
        totalFiltered: fastResult.meta.total,
        performance: {
          executionTime: duration,
          usedFastPath: true,
          improvement: '469x faster'
        }
      };
    }

    // SLOW PATH: Use existing aggregation for complex queries
    logger.info('🐢 Using SLOW PATH (aggregation required for complex filters)');

    // Use the same executeLeadQuery function that getAllLeads uses
    // This ensures we get the same data structure with populated relationships
    const result = await executeLeadQuery(
      user,
      query,
      pagination.page,
      pagination.limit,
      true, // includeOffers
      null, // state (not used in dynamic filters)
      todoFilters.has_todo, // has_todo (for regular todos)
      'all', // todo_scope
      null, // pending_todos
      null, // done_todos
      sortBy, // Use actual sortBy parameter
      sortOrder // Use actual sortOrder parameter
    );

    // Add specific filtered todos to the results
    if (todoFilters.has_extra_todo || todoFilters.has_assigned_todo) {
      result.data = await addFilteredTodosToResults(result.data, user, todoFilters);
    }

    // Note: user_id population is handled by executeLeadQuery's populate functionality

    const executionTime = Date.now() - startTime;

    return {
      data: result.data,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: result.meta.total,
        pages: result.meta.totalPages,
      },
      appliedRules: rules,
      totalFiltered: result.meta.total,
      executionTime,
      todoFilters, // Include info about which todo filters were applied
      appliedSort: appliedSort, // Include applied sorting info for debugging
      performance: {
        usedFastPath: false
      }
    };
  } catch (error) {
    logger.error('Dynamic filter execution error:', error);
    throw error;
  }
};

/**
 * Add specific filtered todos to the lead results based on todo filter types
 * @param {Array} leads - Array of lead objects
 * @param {Object} user - User object
 * @param {Object} todoFilters - Object indicating which todo filters are applied
 * @returns {Array} - Leads with filtered todos added
 */
const addFilteredTodosToResults = async (leads, user, todoFilters) => {
  const Todo = require('../models/Todo');
  const { ROLES } = require('../auth/roles/roleDefinitions');
  const { AssignLeads } = require('../models');

  const leadIds = leads.map((lead) => lead._id);

  // Initialize todo maps
  let extraTodoMap = {};
  let assignedTodoMap = {};
  let activeTodoMap = {};

  // Fetch extra todos (assigned TO the user) if needed
  if (todoFilters.has_extra_todo) {
    let extraTodoQuery = {
      lead_id: { $in: leadIds },
      active: true,
      isDone: false,
    };

    if (user.role === ROLES.ADMIN) {
      // Admin sees todos assigned to any admin
      const { User } = require('../models');
      const adminUsers = await User.find({ role: ROLES.ADMIN }).select('_id');
      const adminIds = adminUsers.map((admin) => admin._id);
      extraTodoQuery.assigned_to = { $in: adminIds };
    } else if (user.role === ROLES.AGENT) {
      // Agent sees only todos assigned to them for their assigned leads OR any todo assigned to them
      const assignments = await AssignLeads.find({
        agent_id: user._id,
        status: 'active',
      }).select('lead_id');
      const assignedLeadIds = assignments.map((assignment) => assignment.lead_id);

      extraTodoQuery.$or = [
        {
          lead_id: { $in: assignedLeadIds },
          assigned_to: user._id,
        }, // Todos assigned to them for their assigned leads
        {
          lead_id: { $in: leadIds },
          assigned_to: user._id,
        }, // Any todos assigned to them for leads in scope
      ];
    }

    const extraTodos = await Todo.find(extraTodoQuery)
      .populate('creator_id', '_id login role')
      .populate('assigned_to', '_id login role')
      .sort({ isDone: 1, createdAt: -1 })
      .lean();

    // Create map of extra todos by lead ID
    extraTodos.forEach((todo) => {
      const leadId = todo.lead_id.toString();
      if (!extraTodoMap[leadId]) {
        extraTodoMap[leadId] = [];
      }
      extraTodoMap[leadId].push(formatTodoObject(todo));
    });
  }

  // Fetch assigned todos (assigned BY the user to others) if needed
  if (todoFilters.has_assigned_todo) {
    let assignedTodoQuery = {
      lead_id: { $in: leadIds },
      creator_id: user._id,
      assigned_to: { $ne: null, $ne: user._id },
      active: true,
      // Removed isDone: false to include completed assigned todos
    };

    if (user.role === ROLES.AGENT) {
      // Agent can only see assigned todos for their assigned leads
      const assignments = await AssignLeads.find({
        agent_id: user._id,
        status: 'active',
      }).select('lead_id');
      const assignedLeadIds = assignments.map((assignment) => assignment.lead_id);

      assignedTodoQuery.lead_id = { $in: assignedLeadIds };
    }

    const assignedTodos = await Todo.find(assignedTodoQuery)
      .populate('creator_id', '_id login role')
      .populate('assigned_to', '_id login role')
      .sort({ isDone: 1, createdAt: -1 })
      .lean();

    // Create map of assigned todos by lead ID
    assignedTodos.forEach((todo) => {
      const leadId = todo.lead_id.toString();
      if (!assignedTodoMap[leadId]) {
        assignedTodoMap[leadId] = [];
      }
      assignedTodoMap[leadId].push(formatTodoObject(todo));
    });
  }

  // Fetch active todos (same shape as leads route when has_todo is applied)
  // We include this whenever any todo-related filter is present to keep response shape consistent
  if (todoFilters.has_todo || todoFilters.has_extra_todo || todoFilters.has_assigned_todo) {
    const activeTodos = await Todo.find({
      lead_id: { $in: leadIds },
      active: true,
      isDone: false,
    })
      .populate('creator_id', '_id login role')
      .populate('assigned_to', '_id login role')
      .sort({ isDone: 1, createdAt: -1 })
      .lean();

    activeTodos.forEach((todo) => {
      const id = todo.lead_id.toString();
      if (!activeTodoMap[id]) activeTodoMap[id] = [];
      activeTodoMap[id].push(formatTodoObject(todo));
    });
  }

  // Add filtered todos to each lead
  return leads.map((lead) => {
    const leadId = lead._id.toString();
    const updatedLead = { ...lead };

    // Always expose activeTodos to match /leads when filtering by todos
    if (todoFilters.has_todo || todoFilters.has_extra_todo || todoFilters.has_assigned_todo) {
      updatedLead.activeTodos = activeTodoMap[leadId] || [];
    }

    if (todoFilters.has_extra_todo) {
      updatedLead.extraTodos = extraTodoMap[leadId] || [];
    }

    if (todoFilters.has_assigned_todo) {
      updatedLead.assignedTodos = assignedTodoMap[leadId] || [];
    }

    return updatedLead;
  });
};

/**
 * Format a todo object for the response
 * @param {Object} todo - Raw todo object from database
 * @returns {Object} - Formatted todo object
 */
const formatTodoObject = (todo) => {
  return {
    _id: todo._id,
    message: todo.message,
    isDone: todo.isDone,
    active: todo.active,
    creator: {
      _id: todo.creator_id._id,
      login: todo.creator_id.login,
      role: todo.creator_id.role,
    },
    assignedTo: todo.assigned_to
      ? {
          _id: todo.assigned_to._id,
          login: todo.assigned_to.login,
          role: todo.assigned_to.role,
        }
      : null,
    createdAt: todo.createdAt,
    updatedAt: todo.updatedAt,
  };
};

/**
 * Gets available filter fields and their configurations with dynamic values
 * @param {Object} user - User object for permission-based filtering
 * @param {boolean} canReadAllLeads - Whether user can read all leads
 * @returns {Object} - Available filter fields with their types, operators, and available values
 */
const getAvailableFilters = async (user, canReadAllLeads = false) => {
  try {
    let assignedLeadIds = [];

    // For non-admin users, get their assigned lead IDs first
    if (!canReadAllLeads) {
      const assignments = await AssignLeads.find({
        agent_id: user._id,
        status: 'active',
      })
        .select('lead_id project_id')
        .lean();

      assignedLeadIds = assignments.map((a) => a.lead_id);

      // If agent has no assigned leads, return empty options
      if (assignedLeadIds.length === 0) {
        return {
          fields: FILTER_FIELDS,
          operators: OPERATORS,
          meta: {
            totalAgents: 0,
            totalProjects: 0,
            totalSources: 0,
            totalStages: 0,
            totalStatuses: 0,
            userRole: user?.role,
            canReadAllLeads,
            message: 'No assigned leads found',
          },
        };
      }
    }

    // Build queries based on user permissions
    const queries = [];

    if (canReadAllLeads) {
      // Admin: Get all data
      queries.push(
        // Get active agents
        User.find({ active: true, role: { $in: ['Agent', 'Admin', 'Manager'] } })
          .select('_id login first_name last_name role')
          .sort({ login: 1 })
          .lean(),

        // Get active projects
        Team.find({ active: true, use_leads: true })
          .select('_id name description')
          .sort({ name: 1 })
          .lean(),

        // Get active sources
        Source.find({ active: true }).select('_id name price').sort({ name: 1 }).lean(),

        // Get distinct use_status values from all leads
        Lead.distinct('use_status'),

        // Get distinct reclamation_status values from all leads
        Lead.distinct('reclamation_status')
      );
    } else {
      // Agent: Get data only from assigned leads
      queries.push(
        // Get agents who have leads assigned to same projects as this agent
        AssignLeads.find({
          lead_id: { $in: assignedLeadIds },
          status: 'active',
        })
          .populate('agent_id', '_id login first_name last_name role active')
          .populate('project_id', '_id name description active')
          .lean()
          .then((assignments) => {
            const uniqueAgents = [];
            const uniqueProjects = [];
            const agentIds = new Set();
            const projectIds = new Set();

            assignments.forEach((assignment) => {
              if (
                assignment.agent_id &&
                assignment.agent_id.active &&
                !agentIds.has(assignment.agent_id._id.toString())
              ) {
                agentIds.add(assignment.agent_id._id.toString());
                uniqueAgents.push(assignment.agent_id);
              }
              if (
                assignment.project_id &&
                assignment.project_id.active &&
                !projectIds.has(assignment.project_id._id.toString())
              ) {
                projectIds.add(assignment.project_id._id.toString());
                uniqueProjects.push(assignment.project_id);
              }
            });

            return { agents: uniqueAgents, projects: uniqueProjects };
          }),

        // Get sources from assigned leads
        Lead.find({ _id: { $in: assignedLeadIds } })
          .populate('source_id', '_id name price active color')
          .select('source_id')
          .lean()
          .then((leads) => {
            const uniqueSources = [];
            const sourceIds = new Set();

            leads.forEach((lead) => {
              if (
                lead.source_id &&
                lead.source_id.active &&
                !sourceIds.has(lead.source_id._id.toString())
              ) {
                sourceIds.add(lead.source_id._id.toString());
                uniqueSources.push(lead.source_id);
              }
            });

            return uniqueSources;
          }),

        // Get distinct use_status values from assigned leads only
        Lead.find({ _id: { $in: assignedLeadIds } }).distinct('use_status'),

        // Get distinct reclamation_status values from assigned leads only
        Lead.find({ _id: { $in: assignedLeadIds } }).distinct('reclamation_status')
      );
    }

    // Add common queries (stages, bonus amounts, payment terms are same for all users)
    queries.push(
      // Get stages from settings collection
      mongoose
        .model('Settings')
        .find({
          type: 'stage',
        })
        .select('_id name info')
        .sort({ name: 1 })
        .lean(),

      // Get bonus amounts from settings
      mongoose
        .model('Settings')
        .find({
          type: 'bonus_amount',
        })
        .select('_id name value description')
        .sort({ name: 1 })
        .lean(),

      // Get payment terms from settings
      mongoose
        .model('Settings')
        .find({
          type: 'payment_terms',
        })
        .select('_id name value description')
        .sort({ name: 1 })
        .lean()
    );

    // Execute all queries
    const results = await Promise.all(queries);

    let agents,
      projects,
      sources,
      useStatuses,
      reclamationStatuses,
      stages,
      bonusAmounts,
      paymentTerms;

    if (canReadAllLeads) {
      [
        agents,
        projects,
        sources,
        useStatuses,
        reclamationStatuses,
        stages,
        bonusAmounts,
        paymentTerms,
      ] = results;
    } else {
      const [
        agentProjectData,
        sourcesData,
        useStatusData,
        reclamationStatusData,
        stagesData,
        bonusAmountData,
        paymentTermData,
      ] = results;
      agents = agentProjectData.agents;
      projects = agentProjectData.projects;
      sources = sourcesData;
      useStatuses = useStatusData;
      reclamationStatuses = reclamationStatusData;
      stages = stagesData;
      bonusAmounts = bonusAmountData;
      paymentTerms = paymentTermData;
    }

    // Extract statuses from stages
    const allStatuses = [];
    stages.forEach((stage) => {
      if (stage.info && stage.info.statuses && Array.isArray(stage.info.statuses)) {
        stage.info.statuses.forEach((status) => {
          if (status.allowed && !allStatuses.find((s) => s.name === status.name)) {
            allStatuses.push({
              name: status.name,
              code: status.code,
              _id: status._id,
            });
          }
        });
      }
    });

    // Create enhanced fields with available values
    const enhancedFields = { ...FILTER_FIELDS };

    // Add available values to reference fields
    if (enhancedFields.agent) {
      enhancedFields.agent.values = agents.map((agent) => agent.login);
    }

    if (enhancedFields.project) {
      enhancedFields.project.values = projects.map((project) => project.name);
    }

    if (enhancedFields.source) {
      enhancedFields.source.values = sources.map((source) => source.name);
    }

    if (enhancedFields.stage) {
      enhancedFields.stage.values = stages.map((stage) => stage.name);
    }

    if (enhancedFields.status) {
      enhancedFields.status.values = allStatuses.map((status) => status.name);
    }

    if (enhancedFields.bonus_amount) {
      enhancedFields.bonus_amount.values = bonusAmounts.map((bonus) => bonus.name);
    }

    if (enhancedFields.payment_terms) {
      enhancedFields.payment_terms.values = paymentTerms.map((term) => term.name);
    }

    if (enhancedFields.use_status) {
      enhancedFields.use_status.values = useStatuses.filter((status) => status);
    }

    if (enhancedFields.reclamation_status) {
      enhancedFields.reclamation_status.values = reclamationStatuses.filter((status) => status);
    }

    if (enhancedFields.active) {
      enhancedFields.active.values = [true, false];
    }

    if (enhancedFields.checked) {
      enhancedFields.checked.values = [true, false];
    }

    if (enhancedFields.duplicate_status) {
      enhancedFields.duplicate_status.values = [0, 1, 2];
    }

    if (enhancedFields.has_offer) {
      enhancedFields.has_offer.values = [true, false];
    }

    if (enhancedFields.has_transferred_offer) {
      enhancedFields.has_transferred_offer.values = [true, false];
    }

    if (enhancedFields.has_opening) {
      enhancedFields.has_opening.values = [true, false];
    }

    if (enhancedFields.has_confirmation) {
      enhancedFields.has_confirmation.values = [true, false];
    }

    if (enhancedFields.has_payment) {
      enhancedFields.has_payment.values = [true, false];
    }

    if (enhancedFields.has_netto) {
      enhancedFields.has_netto.values = [true, false];
    }

    if (enhancedFields.has_todo) {
      enhancedFields.has_todo.values = [true, false];
    }

    if (enhancedFields.has_extra_todo) {
      enhancedFields.has_extra_todo.values = [true, false];
    }

    if (enhancedFields.has_assigned_todo) {
      enhancedFields.has_assigned_todo.values = [true, false];
    }

    if (enhancedFields.is_favourite) {
      enhancedFields.is_favourite.values = [true, false];
    }

    // Entity relationship fields to hide from filter options (they have special handling in grouping)
    const entityRelationshipFields = [
      'has_offer',
      'has_transferred_offer',
      'has_opening',
      'has_confirmation',
      'has_payment',
      'has_netto',
      // 'has_todo',
      // 'has_extra_todo',
      // 'has_assigned_todo'
    ];

    // Filter out entity relationship fields from the response
    const filteredFields = Object.keys(enhancedFields)
      .filter((key) => !entityRelationshipFields.includes(key))
      .reduce((result, key) => {
        result[key] = enhancedFields[key];
        return result;
      }, {});

    return {
      fields: filteredFields,
      operators: OPERATORS,
      meta: {
        totalAgents: agents.length,
        totalProjects: projects.length,
        totalSources: sources.length,
        totalStages: stages.length,
        totalStatuses: allStatuses.length,
        userRole: user?.role,
        canReadAllLeads,
        assignedLeadsCount: canReadAllLeads ? null : assignedLeadIds.length,
        dataScope: canReadAllLeads ? 'all_leads' : 'assigned_leads_only',
      },
    };
  } catch (error) {
    logger.error('Error getting available filters:', error);
    // Return basic structure if there's an error
    return {
      fields: FILTER_FIELDS,
      operators: OPERATORS,
      meta: {
        totalAgents: 0,
        totalProjects: 0,
        totalSources: 0,
        totalStages: 0,
        totalStatuses: 0,
        userRole: user?.role,
        canReadAllLeads,
        error: 'Failed to load some filter options',
      },
    };
  }
};

/**
 * Gets available sort fields with their configurations
 * @param {Object} user - User object for permission-based filtering
 * @returns {Object} - Available sort fields with their types and descriptions
 */
const getAvailableSortFields = (user = null) => {
  // All users can sort by these fields
  const availableFields = { ...SORT_FIELDS };

  // Role-based filtering (if needed in the future)
  if (user && user.role !== 'Admin') {
    // Agent users might have restricted sorting options in the future
    // For now, all fields are available to all users
  }

  return {
    fields: availableFields,
    orders: ['asc', 'desc'],
    defaultSort: { field: 'createdAt', order: 'desc' },
    examples: {
      singleField: {
        sortBy: 'contact_name',
        sortOrder: 'asc',
      },
      multiField: {
        sortBy: ['lead_date', 'expected_revenue', 'contact_name'],
        sortOrder: ['desc', 'desc', 'asc'],
      },
    },
  };
};

module.exports = {
  validateFilterRule,
  validateSortParameters,
  applyDynamicFilters,
  executeDynamicFilter,
  getAvailableFilters,
  getAvailableSortFields,
  addFilteredTodosToResults,
  OPERATORS,
  FILTER_FIELDS,
  SORT_FIELDS,
};
