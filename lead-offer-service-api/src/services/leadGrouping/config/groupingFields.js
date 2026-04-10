/**
 * Grouping Fields Configuration
 * Centralized definition of all available grouping fields
 */

const GROUPING_FIELDS = {
    // Direct lead fields
    contact_name: { type: 'string', field: 'contact_name' },
    email_from: { type: 'string', field: 'email_from' },
    phone: { type: 'string', field: 'phone' },
    status: { type: 'string', field: 'status' },
    stage: { type: 'string', field: 'stage' },
    use_status: { type: 'string', field: 'use_status' },
    duplicate_status: { type: 'number', field: 'duplicate_status' },
    active: { type: 'boolean', field: 'active' },
    lead_date: { type: 'date', field: 'lead_date' },
    assigned_date: { type: 'context_date', field: 'assigned_date' },
    createdAt: { type: 'context_date', field: 'createdAt' },
    updatedAt: { type: 'context_date', field: 'updatedAt' },
    expected_revenue: { type: 'number', field: 'expected_revenue' },
    leadPrice: { type: 'number', field: 'leadPrice' },
    partner: { type: 'string', field: 'lead_source_no' },
  
    // Reference fields
    project: { type: 'reference', field: 'project_id', collection: 'Team' },
    agent: { type: 'reference', field: 'agent_id', collection: 'User' },
    source: { type: 'reference', field: 'source_id', collection: 'Source' },
    source_agent: { type: 'reference', field: 'source_agent', collection: 'User' },
    source_project: { type: 'reference', field: 'source_project', collection: 'Team' },
  
    // Computed fields
    has_offer: { type: 'computed', field: 'has_offer' },
    has_opening: { type: 'computed', field: 'has_opening' },
    has_confirmation: { type: 'computed', field: 'has_confirmation' },
    has_payment: { type: 'computed', field: 'has_payment' },
    has_netto: { type: 'computed', field: 'has_netto' },
    has_todo: { type: 'computed', field: 'has_todo' },
    has_extra_todo: { type: 'computed', field: 'has_extra_todo' },
    has_assigned_todo: { type: 'computed', field: 'has_assigned_todo' },
    is_favourite: { type: 'computed', field: 'is_favourite' },
    last_transfer: { type: 'computed', field: 'last_transfer' },
  };
  
  /**
   * Sorting options configuration
   */
  const SORTING_OPTIONS = {
    // Group-level sorting
    count: { description: 'Sort by number of leads in group', type: 'number' },
    name: { description: 'Sort by group name alphabetically', type: 'string' },
    avg_revenue: { description: 'Sort by average expected revenue', type: 'number' },
    total_revenue: { description: 'Sort by total expected revenue', type: 'number' },
    latest_lead: { description: 'Sort by most recent lead date', type: 'date' },
    oldest_lead: { description: 'Sort by oldest lead date', type: 'date' },
  
    // Lead-specific sorting
    contact_name: { description: 'Sort by contact name', type: 'string' },
    lead_source_no: { description: 'Sort by lead source number', type: 'string' },
    expected_revenue: { description: 'Sort by expected revenue', type: 'number' },
    createdAt: { description: 'Sort by creation date', type: 'date' },
    updatedAt: { description: 'Sort by last update date', type: 'date' },
    lead_date: { description: 'Sort by lead date', type: 'date' },
    email_from: { description: 'Sort by email address', type: 'string' },
    phone: { description: 'Sort by phone number', type: 'string' },
  
    // Offer-specific sorting
    title: { description: 'Sort by offer title', type: 'string' },
    investment_volume: { description: 'Sort by investment volume', type: 'number' },
    interest_rate: { description: 'Sort by interest rate', type: 'number' },
    payment_terms: { description: 'Sort by payment terms', type: 'string' },
    bonus_amount: { description: 'Sort by bonus amount', type: 'number' },
    bank_name: { description: 'Sort by bank name', type: 'string' },
    project_name: { description: 'Sort by project name', type: 'string' },
    agent: { description: 'Sort by agent', type: 'string' },
    offer_status: { description: 'Sort by offer status', type: 'string' },
    current_stage: { description: 'Sort by current progress stage', type: 'string' },
  };
  
  /**
   * Stage priority order for status/stage grouping
   */
  const STAGE_PRIORITY = {
    New: 1,
    Positiv: 2,
    Positive: 2,
    Opening: 3,
    Negative: 4,
    Negativ: 4,
    Neg: 4,
    default: 999,
  };
  
  /**
   * Entity context priority for date detection
   */
  const ENTITY_PRIORITY = [
    { entity: 'offer', pattern: 'has_offer' },
    { entity: 'opening', pattern: 'has_opening' },
    { entity: 'confirmation', pattern: 'has_confirmation' },
    { entity: 'payment', pattern: 'has_payment' },
    { entity: 'netto', pattern: 'has_netto' },
  ];
  
  /**
   * Entity date field mappings
   */
  const ENTITY_DATE_MAPPINGS = {
    offer: {
      entityType: 'offer',
      collection: 'Offer',
      fields: {
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
        assigned_date: 'createdAt',
      },
    },
    opening: {
      entityType: 'opening',
      collection: 'Opening',
      fields: {
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
        assigned_date: 'createdAt',
      },
    },
    confirmation: {
      entityType: 'confirmation',
      collection: 'Confirmation',
      fields: {
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
        assigned_date: 'createdAt',
      },
    },
    payment: {
      entityType: 'payment',
      collection: 'PaymentVoucher',
      fields: {
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
        assigned_date: 'createdAt',
      },
    },
    netto: {
      entityType: 'netto',
      collection: 'Netto1',
      fields: {
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
        assigned_date: 'createdAt',
      },
    },
  };
  
  /**
   * Fields to hide from agents
   */
  const AGENT_HIDDEN_FIELDS = ['agent'];
  
  /**
   * Entity relationship fields (hidden from grouping options)
   */
  const ENTITY_RELATIONSHIP_FIELDS = [
    'has_offer',
    'has_opening',
    'has_confirmation',
    'has_payment',
    'has_todo',
    'has_extra_todo',
    'has_assigned_todo',
  ];
  
  /**
   * Performance thresholds (milliseconds)
   */
  const PERFORMANCE_THRESHOLDS = {
    FAST: 500,
    MODERATE: 2000,
    SLOW: 5000,
  };
  
  /**
   * Pagination limits
   */
  const PAGINATION_LIMITS = {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 50,
    MAX_LIMIT: 10000,
    MAX_GROUPING_LEVELS: 5,
  };
  
  module.exports = {
    GROUPING_FIELDS,
    SORTING_OPTIONS,
    STAGE_PRIORITY,
    ENTITY_PRIORITY,
    ENTITY_DATE_MAPPINGS,
    AGENT_HIDDEN_FIELDS,
    ENTITY_RELATIONSHIP_FIELDS,
    PERFORMANCE_THRESHOLDS,
    PAGINATION_LIMITS,
  };