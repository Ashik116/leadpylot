/**
 * Offer Service Constants
 * Contains all constants and configuration used across offer services
 */

// Mongoose populate configuration for offers
const OFFER_POPULATE_CONFIG = [
  { path: 'project_id', model: 'Team', select: 'name color_code' },
  {
    path: 'lead_id',
    select: 'contact_name lead_source_no status stage current_month email_from phone source_id offer_calls team_id user_id expected_revenue createdAt updatedAt',
    populate: [
      { path: 'source_id', select: 'name price active color' },
      { path: 'team_id', model: 'Team', select: 'name color_code' },
      { path: 'user_id', select: '_id login role color_code' },
    ],
  },
  { path: 'agent_id', select: '_id login role color_code' },
  { path: 'payment_terms', select: 'name info' },
  { path: 'bonus_amount', select: 'name info' },
  {
    path: 'bank_id',
    select: 'name nickName iban Ref provider bank_country_flag bank_country_code country logo',
    populate: [
      {
        path: 'provider',
        select: 'name login',
        model: 'User',
      },
      {
        path: 'logo',
        select: 'filetype filename path size type createdAt',
        model: 'Document',
      },
      {
        path: 'bank_country_flag',
        select: 'filetype filename path size type createdAt',
        model: 'Document',
      },
    ],
  },
];

// Pagination defaults
const DEFAULT_PAGINATION = { page: 1, limit: 20 };
const MAX_LIMIT = 100;

// Allowed sort fields for security
// NOTE: These field paths are for MongoDB aggregation pipeline, not populated Mongoose documents
const ALLOWED_SORT_FIELDS = {
  title: 'title',
  investment_volume: 'investment_volume',
  interest_rate: 'interest_rate',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  created_at: 'created_at',
  updated_at: 'updated_at',
  // Aggregation pipeline fields - these use lookup field names from PipelineBuilder
  leadName: 'lead_details.contact_name', // From addLeadLookup() 
  contactName: 'lead_details.contact_name', // From addLeadLookup()
  partnerId: 'lead_details.lead_source_no', // From addLeadLookup()
  bankName: 'bank_details.name', // From addBankLookup()
  projectName: 'project_details.name', // From addProjectLookup()
  agent: 'agent_details.login', // From addAgentLookup()
  interestMonth: 'payment_terms_details.info.info.months', // From addPaymentTermsLookup()
  bonusAmount: 'bonus_amount_details.info.bonus_amount', // From addBonusAmountLookup()
};

// Progress filter mappings
// SIMPLIFIED: Uses new consolidated schema 'current_stage' field
const PROGRESS_FILTERS = {
  opening: {
    current_stage: 'opening',
  },
  confirmation: {
    current_stage: 'confirmation',
  },
  payment: {
    current_stage: 'payment',
  },
  netto1: {
    current_stage: 'netto1',
  },
  netto2: {
    current_stage: 'netto2',
  },
  netto: {
    current_stage: { $in: ['netto1', 'netto2'] },
  },
  lost: {
    current_stage: 'lost',
  },
  // 'all' includes all progress stages (excludes 'offer' stages)
  all: {
    current_stage: { $in: ['opening', 'confirmation', 'payment', 'netto1', 'netto2', 'lost'] },
  },
};

// Status priority mapping (higher number = higher priority)
const STATUS_PRIORITY = {
  angebot: 1, // Lowest - offer creation
  contract: 2, // Opening stage
  confirmation: 3,
  payment: 4,
  netto1: 5,
  netto2: 6, // Highest
};

// Stage to status mapping for progression
const STAGE_STATUS_MAPPING = {
  opening: 'Contract',
  confirmation: 'Confirmation',
  payment: 'Payment',
  netto1: 'Netto1',
  netto2: 'Netto2',
};

module.exports = {
  OFFER_POPULATE_CONFIG,
  DEFAULT_PAGINATION,
  MAX_LIMIT,
  ALLOWED_SORT_FIELDS,
  PROGRESS_FILTERS,
  STATUS_PRIORITY,
  STAGE_STATUS_MAPPING,
};
