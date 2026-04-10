const CLOSED_LEAD_GROUPING_FIELDS = {
  contact_name: { type: 'string', field: 'contact_name' },
  email_from: { type: 'string', field: 'email_from' },
  phone: { type: 'string', field: 'phone' },
  status: { type: 'string', field: 'status' },
  stage: { type: 'string', field: 'stage' },
  use_status: { type: 'string', field: 'use_status' },
  duplicate_status: { type: 'number', field: 'duplicate_status' },
  active: { type: 'boolean', field: 'active' },
  lead_date: { type: 'date', field: 'lead_date' },
  assigned_date: { type: 'date', field: 'assigned_date' },
  createdAt: { type: 'date', field: 'createdAt' },
  updatedAt: { type: 'date', field: 'updatedAt' },
  closed_at: { type: 'date', field: 'closed_at' },
  expected_revenue: { type: 'number', field: 'expected_revenue' },
  leadPrice: { type: 'number', field: 'leadPrice' },
  partner: { type: 'string', field: 'lead_source_no' },
  closeLeadStatus: { type: 'string', field: 'closeLeadStatus' },
  closure_reason: { type: 'string', field: 'closure_reason' },
  current_status: { type: 'reference', field: 'current_status', collection: 'Settings' },

  closed_project: { type: 'reference', field: 'closed_project_id', collection: 'Team' },
  project: { type: 'reference', field: 'team_id', collection: 'Team' },
  agent: { type: 'reference', field: 'user_id', collection: 'User' },
  source: { type: 'reference', field: 'source_id', collection: 'Source' },
  closed_by: { type: 'reference', field: 'closed_by_user_id', collection: 'User' },
  prev_project: { type: 'reference', field: 'prev_team_id', collection: 'Team' },
  prev_agent: { type: 'reference', field: 'prev_user_id', collection: 'User' },
  source_agent: { type: 'reference', field: 'source_user_id', collection: 'User' },
  source_project: { type: 'reference', field: 'source_team_id', collection: 'Team' },
};

const CLOSED_LEAD_SORTING_OPTIONS = {
  count: { description: 'Sort by number of closed leads in group', type: 'number' },
  name: { description: 'Sort by group name alphabetically', type: 'string' },
  avg_revenue: { description: 'Sort by average expected revenue', type: 'number' },
  total_revenue: { description: 'Sort by total expected revenue', type: 'number' },
  latest_lead: { description: 'Sort by most recent lead date', type: 'date' },
  oldest_lead: { description: 'Sort by oldest lead date', type: 'date' },
  contact_name: { description: 'Sort by contact name', type: 'string' },
  lead_source_no: { description: 'Sort by partner ID', type: 'string' },
  expected_revenue: { description: 'Sort by expected revenue', type: 'number' },
  createdAt: { description: 'Sort by creation date', type: 'date' },
  updatedAt: { description: 'Sort by last update date', type: 'date' },
  lead_date: { description: 'Sort by lead date', type: 'date' },
  closed_at: { description: 'Sort by closure date', type: 'date' },
  email_from: { description: 'Sort by email address', type: 'string' },
  phone: { description: 'Sort by phone number', type: 'string' },
};

const CLOSED_LEAD_STAGE_PRIORITY = {
  New: 1, Positiv: 2, Positive: 2, Opening: 3, Negative: 4, Negativ: 4, Neg: 4, default: 999,
};

const CLOSED_LEAD_PERFORMANCE_THRESHOLDS = { FAST: 500, MODERATE: 2000, SLOW: 5000 };

const CLOSED_LEAD_PAGINATION_LIMITS = {
  DEFAULT_PAGE: 1, DEFAULT_LIMIT: 50, MAX_LIMIT: 10000, MAX_GROUPING_LEVELS: 5,
};

module.exports = {
  CLOSED_LEAD_GROUPING_FIELDS,
  CLOSED_LEAD_SORTING_OPTIONS,
  CLOSED_LEAD_STAGE_PRIORITY,
  CLOSED_LEAD_PERFORMANCE_THRESHOLDS,
  CLOSED_LEAD_PAGINATION_LIMITS,
};
