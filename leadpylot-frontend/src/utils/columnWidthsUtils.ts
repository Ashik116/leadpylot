/**
 * Default column widths for DataTable components
 * This utility provides consistent column width defaults across the application
 */

export const DEFAULT_COLUMN_WIDTHS: Record<string, number> = {
  // Leads dashboard columns - updated defaults
  agent: 60,
  assigned_date: 94,
  checkbox: 25,
  contact_name: 137,
  createdAt: 109,
  updatedAt: 107, // updated as per prompt
  email_from: 191,
  expected_revenue: 67,
  imp_status: 31,
  lead_date: 95,
  lead_source: 65,
  lead_source_no: 90,
  phone: 135,
  project_name: 95,
  status: 87,
  // Other widths remain unchanged
  expander: 150,
  prev_agent: 99,
  prev_project: 114,
  source_agent: 90,
  source_project: 105,
  use_status: 81,
  bankName: 150,
  bonusAmount: 74,
  edit: 79,
  email: 87,
  interestMonth: 64,
  interest_rate: 65,
  investment_volume: 79,
  leadEmail: 288,
  lead_status: 56,
  offer: 101,
  offerType: 62,
  partnerId: 150,
  pdf: 150,
  projectName: 150,
  source_id: 87,
  annah_id: 89,
  contract_id: 85,
  id_confirmation: 86,
  leadName: 270,
  swift_id: 150,
  from: 170,
  project: 50,
  subject: 136,
  created_at: 73,
  actions: 60,
  offer_actions: 100,
  todo: 350,
  filename: 150,
  size: 50,
  type: 50,
  assigned: 150,
  appointment_date: 160,
  appointment_description: 150,
  // Offers page additional columns
  offer_calls: 76,
  offer_status: 110,
  load_and_opening: 105,
  send: 83,
  select: 30,
  // Payments page additional columns
  reference_no: 113,
};

/**
 * Page-specific column width overrides
 * This allows different pages to have different default column widths for the same column names
 */
export const PAGE_SPECIFIC_COLUMN_WIDTHS: Record<string, Record<string, number>> = {
  // Documents page specific column widths
  'library-documents': {
    assigned: 150,
    expander: 10,
    filename: 150,
    size: 20,
    type: 30,
    updatedAt: 55,
  },
  // Offers page specific column widths
  offers: {
    select: 150,
    projectName: 88,
    partnerId: 81,
    leadName: 153,
    leadEmail: 186,
    phone: 135,
    bankName: 180,
    investment_volume: 63,
    interest_rate: 57,
    interestMonth: 54,
    bonusAmount: 67,
    lead_status: 99,
    offerType: 59,
    updatedAt: 91,
    createdAt: 94,
    email: 87,
    offer_calls: 76,
    offer: 101,
    agent: 72,
    source_id: 79,
    offer_status: 110,
    load_and_opening: 105,
    edit: 67,
    send: 83,
  },
  // Openings page specific column widths
  openings: {
    select: 150,
    projectName: 89,
    partnerId: 86,
    leadName: 162,
    leadEmail: 181,
    phone: 126,
    bankName: 180,
    investment_volume: 57,
    interest_rate: 61,
    interestMonth: 58,
    bonusAmount: 66,
    lead_status: 105,
    offerType: 62,
    updatedAt: 98,
    createdAt: 91,
    email: 76,
    agent: 75,
    source_id: 65,
    load_and_opening: 105,
    edit: 64,
    annah_id: 77,
    contract_id: 76,
    id_confirmation: 76,
    swift_id: 82,
  },
  // Payments page specific column widths
  payments: {
    select: 30,
    projectName: 87,
    partnerId: 91,
    leadName: 148,
    leadEmail: 185,
    phone: 135,
    bankName: 79,
    investment_volume: 57,
    interest_rate: 61,
    interestMonth: 55,
    bonusAmount: 65,
    offerType: 62,
    updatedAt: 91,
    createdAt: 87,
    email: 80,
    source_id: 66,
    edit: 65,
    annah_id: 79,
    contract_id: 85,
    id_confirmation: 79,
    swift_id: 85,
    reference_no: 113,
  },
  // Predefined tasks table
  'predefined-subtasks': {
    title: 140,
    description: 180,
    priority: 100,
    category: 120,
    tags: 100,
    todo: 100,
    status: 90,
    createdBy: 110,
    createdAt: 110,
    actions: 100,
  },
  // Predefined task categories table
  'predefined-subtask-categories': {
    title: 140,
    description: 180,
    tags: 100,
    standalone: 100,
    status: 90,
    createdBy: 110,
    createdAt: 110,
    actions: 100,
  },
};

/*
 
  filename: 150,
  size: 50,
  type: 50,
 
*/

/**
 * Get the default width for a specific column
 * @param columnId - The column identifier
 * @param fallback - Fallback width if column not found (default: 150)
 * @returns The column width
 */
export const getColumnWidth = (columnId: string, fallback: number = 150): number => {
  return DEFAULT_COLUMN_WIDTHS[columnId] || fallback;
};

/**
 * Get the page-specific width for a column, falling back to global defaults
 * @param columnId - The column identifier
 * @param pageName - The page/table name (e.g., 'library-documents')
 * @param fallback - Fallback width if column not found (default: 150)
 * @returns The column width
 */
export const getPageSpecificColumnWidth = (
  columnId: string,
  pageName: string,
  fallback: number = 150
): number => {
  // First check if there's a page-specific override
  const pageSpecificWidths = PAGE_SPECIFIC_COLUMN_WIDTHS[pageName];
  if (pageSpecificWidths && pageSpecificWidths[columnId] !== undefined) {
    return pageSpecificWidths[columnId];
  }

  // Fall back to global defaults
  return DEFAULT_COLUMN_WIDTHS[columnId] || fallback;
};

/**
 * Get multiple column widths for an array of column IDs
 * @param columnIds - Array of column identifiers
 * @param fallback - Fallback width for columns not found (default: 150)
 * @returns Record of column widths
 */
export const getColumnWidths = (
  columnIds: string[],
  fallback: number = 150
): Record<string, number> => {
  const widths: Record<string, number> = {};
  columnIds.forEach((columnId) => {
    widths[columnId] = getColumnWidth(columnId, fallback);
  });
  return widths;
};

/**
 * Get multiple page-specific column widths for an array of column IDs
 * @param columnIds - Array of column identifiers
 * @param pageName - The page/table name (e.g., 'library-documents')
 * @param fallback - Fallback width for columns not found (default: 150)
 * @returns Record of column widths
 */
export const getPageSpecificColumnWidths = (
  columnIds: string[],
  pageName: string,
  fallback: number = 150
): Record<string, number> => {
  const widths: Record<string, number> = {};
  columnIds.forEach((columnId) => {
    widths[columnId] = getPageSpecificColumnWidth(columnId, pageName, fallback);
  });
  return widths;
};

/**
 * Add or update a column width in the default widths
 * @param columnId - The column identifier
 * @param width - The width to set
 */
export const setColumnWidth = (columnId: string, width: number): void => {
  DEFAULT_COLUMN_WIDTHS[columnId] = width;
};

/**
 * Remove a column width from the default widths
 * @param columnId - The column identifier
 */
export const removeColumnWidth = (columnId: string): void => {
  delete DEFAULT_COLUMN_WIDTHS[columnId];
};

/**
 * Get default column sizing for a specific page/table
 * This combines page-specific overrides with global defaults
 * @param pageName - The page/table name (e.g., 'library-documents')
 * @param columnIds - Array of column identifiers (optional, if not provided, returns all available widths)
 * @returns Record of column widths for the page
 */
export const getPageDefaultColumnSizing = (
  pageName: string,
  columnIds?: string[]
): Record<string, number> => {
  const pageSpecificWidths = PAGE_SPECIFIC_COLUMN_WIDTHS[pageName] || {};

  if (columnIds) {
    // Return widths only for specified columns
    const widths: Record<string, number> = {};
    columnIds.forEach((columnId) => {
      widths[columnId] = getPageSpecificColumnWidth(columnId, pageName);
    });
    return widths;
  }

  // Return all available widths (page-specific + global defaults)
  return {
    ...DEFAULT_COLUMN_WIDTHS,
    ...pageSpecificWidths,
  };
};
