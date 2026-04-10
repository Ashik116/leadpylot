/**
 * Configuration for additional export fields that are not part of visible table columns
 * These are computed/derived fields that users can select for export
 */

export interface ExportField {
  key: string;
  label: string;
  description?: string;
  category?: string;
}

export const additionalExportFields: Record<string, ExportField[]> = {
  leads: [
    // Status Fields

    {
      key: 'reclamation_status',
      label: 'Reclamation Status',
      description: 'Reclamation status of the lead',
      category: 'Status',
    },

    {
      key: 'active',
      label: 'Active Status',
      description: 'Whether the lead is active',
      category: 'Status',
    },
    {
      key: 'usable',
      label: 'Usable Status',
      description: 'Usability status of the lead',
      category: 'Status',
    },

    // Stage Fields
    {
      key: 'stage_name',
      label: 'Stage Name',
      description: 'Human-readable stage name',
      category: 'Stage',
    },

    {
      key: 'isWonStage',
      label: 'Is Won Stage',
      description: 'Whether this is a won stage',
      category: 'Stage',
    },

    // Contact Information

    // Financial Information
    {
      key: 'expected_revenue',
      label: 'Expected Revenue',
      description: 'Expected revenue amount',
      category: 'Financial',
    },
    {
      key: 'bonus_amount',
      label: 'Total Bonus Amount',
      description: 'Sum of all bonus amounts from all offers',
      category: 'Financial',
    },
    {
      key: 'highest_bonus_amount',
      label: 'Highest Bonus Amount',
      description: 'Highest bonus amount from all offers',
      category: 'Financial',
    },
    {
      key: 'offer_count',
      label: 'Number of Offers',
      description: 'Total number of offers for this lead',
      category: 'Financial',
    },
    {
      key: 'bank_name',
      label: 'Bank Name',
      description: 'Bank name from the offer',
      category: 'Financial',
    },

    {
      key: 'payment_months',
      label: 'Payment Months',
      description: 'Number of months from payment terms',
      category: 'Financial',
    },
    {
      key: 'leadPrice',
      label: 'Lead Price',
      description: 'Price of the lead',
      category: 'Financial',
    },
    {
      key: 'investment_volume',
      label: 'Investment Amount',
      description: 'Investment Amount from the offer',
      category: 'Financial',
    },
    {
      key: 'interest_rate',
      label: 'Rate',
      description: 'rate from the offer',
      category: 'Financial',
    },
    {
      key: 'opening_active',
      label: 'Opening Active',
      description: 'Whether the opening is active',
      category: 'Status',
    },
    {
      key: 'confirmation_active',
      label: 'Confirmation Active',
      description: 'Whether the confirmation is active',
      category: 'Status',
    },
    {
      key: 'payment_voucher_active',
      label: 'Payment Voucher Active',
      description: 'Whether the payment voucher is active',
      category: 'Status',
    },

    // Source Information
    {
      key: 'lead_source_no',
      label: 'Lead Source Number',
      description: 'Lead source number',
      category: 'Source',
    },

    // Project Information

    {
      key: 'project_closed_date',
      label: 'Project Closed Date',
      description: 'Date when project was closed',
      category: 'Project',
    },
    {
      key: 'closure_reason',
      label: 'Closure Reason',
      description: 'Reason for project closure',
      category: 'Project',
    },

    // Agent Information

    // Assignment Information
    {
      key: 'assigned_date',
      label: 'Assigned Date',
      description: 'Date when lead was assigned',
      category: 'Assignment',
    },

    // Dates
    {
      key: 'lead_date',
      label: 'Lead Date',
      description: 'Date of the lead',
      category: 'Dates',
    },
    {
      key: 'createdAt',
      label: 'Created At',
      description: 'Creation timestamp',
      category: 'Dates',
    },
    {
      key: 'updatedAt',
      label: 'Updated At',
      description: 'Last update timestamp',
      category: 'Dates',
    },
  ],
  'payment-terms': [
    {
      key: 'description',
      label: 'Description',
      description: 'Payment term description',
      category: 'Basic',
    },
    {
      key: 'createdAt',
      label: 'Created At',
      description: 'Creation timestamp',
      category: 'Dates',
    },
    {
      key: 'updatedAt',
      label: 'Updated At',
      description: 'Last update timestamp',
      category: 'Dates',
    },
  ],
  projects: [
    // Add project-specific additional fields here
    {
      key: 'project_status',
      label: 'Project Status',
      description: 'Current project status',
      category: 'Status',
    },
    {
      key: 'total_leads',
      label: 'Total Leads',
      description: 'Total number of leads in project',
      category: 'Metrics',
    },
    {
      key: 'project_website',
      label: 'Project Website',
      description: 'Website URL of the project',
      category: 'Contact',
    },
    {
      key: 'deport_link',
      label: 'Deport Link',
      description: 'Deport link for the project',
      category: 'Contact',
    },
    {
      key: 'inbound_email',
      label: 'Inbound Email',
      description: 'Inbound email address for the project',
      category: 'Contact',
    },
    {
      key: 'inbound_number',
      label: 'Inbound Number',
      description: 'Inbound phone number for the project',
      category: 'Contact',
    },
    {
      key: 'banks_names',
      label: 'Banks Names',
      description: 'Comma-separated list of all bank names associated with the project',
      category: 'Financial',
    },
    {
      key: 'agents_names',
      label: 'Agents Names',
      description: 'Comma-separated list of all agent names associated with the project',
      category: 'Team',
    },
  ],
  // users: [
  //   { key: 'status', label: 'Status', description: 'User status', category: 'User' },
  // ],
  mailservers: [
    { key: 'type', label: 'Type', description: 'Mail server type', category: 'Server' },
    { key: 'name', label: 'Name', description: 'Mail server name', category: 'Server' },
    { key: 'smtp', label: 'SMTP Server', description: 'SMTP server address', category: 'SMTP' },
    { key: 'imap', label: 'IMAP Server', description: 'IMAP server address', category: 'IMAP' },
    { key: 'ssl', label: 'SSL', description: 'SSL configuration', category: 'Security' },
    { key: 'smtp_port', label: 'SMTP Port', description: 'SMTP port number', category: 'SMTP' },
    { key: 'imap_port', label: 'IMAP Port', description: 'IMAP port number', category: 'IMAP' },
  ],
  'voip-servers': [
    { key: 'type', label: 'Type', description: 'VoIP server type', category: 'Server' },
    {
      key: 'websocket_address',
      label: 'WebSocket Address',
      description: 'WebSocket server address',
      category: 'Network',
    },
  ],
  banks: [
    // Basic Information

    // Financial Information
    {
      key: 'min_limit',
      label: 'Minimum Limit',
      description: 'Minimum investment limit',
      category: 'Financial',
    },
    {
      key: 'max_limit',
      label: 'Maximum Limit',
      description: 'Maximum investment limit',
      category: 'Financial',
    },
    {
      key: 'account_number',
      label: 'Account Number',
      description: 'Bank account number',
      category: 'Financial',
    },
    {
      key: 'iban',
      label: 'IBAN',
      description: 'International Bank Account Number',
      category: 'Financial',
    },
    {
      key: 'swift_code',
      label: 'SWIFT Code',
      description: 'SWIFT/BIC code',
      category: 'Financial',
    },
    {
      key: 'lei_code',
      label: 'LEI Code',
      description: 'Legal Entity Identifier',
      category: 'Financial',
    },

    // Configuration
    {
      key: 'is_default',
      label: 'Is Default',
      description: 'Whether this is the default bank',
      category: 'Configuration',
    },
    {
      key: 'is_allow',
      label: 'Is Allowed',
      description: 'Whether this bank is allowed',
      category: 'Configuration',
    },
    {
      key: 'multi_iban',
      label: 'Multi IBAN',
      description: 'Whether bank supports multiple IBANs',
      category: 'Configuration',
    },

    // Additional Information
    { key: 'code', label: 'Code', description: 'Bank code', category: 'Additional' },
    { key: 'contact', label: 'Contact', description: 'Contact person', category: 'Additional' },
    { key: 'note', label: 'Note', description: 'Additional notes', category: 'Additional' },
    {
      key: 'instance_records',
      label: 'Instance Records',
      description: 'Instance records data',
      category: 'Additional',
    },

    // Dates
    { key: 'create_date', label: 'Create Date', description: 'Creation date', category: 'Dates' },
    { key: 'write_date', label: 'Write Date', description: 'Last write date', category: 'Dates' },
    { key: 'createdAt', label: 'Created At', description: 'Creation timestamp', category: 'Dates' },
    {
      key: 'updatedAt',
      label: 'Updated At',
      description: 'Last update timestamp',
      category: 'Dates',
    },
  ],
  offers: [
    // Basic Information
    {
      key: 'agent',
      label: 'Agent',
      description: 'Agent name',
      category: 'Basic',
    },
    {
      key: 'projectName',
      label: 'Project',
      description: 'Project name',
      category: 'Basic',
    },
    {
      key: 'partnerId',
      label: 'Partner ID',
      description: 'Partner/lead source number',
      category: 'Basic',
    },
    {
      key: 'leadName',
      label: 'Lead Name',
      description: 'Lead contact name',
      category: 'Lead',
    },
    {
      key: 'leadEmail',
      label: 'Lead Email',
      description: 'Lead email address',
      category: 'Lead',
    },
    {
      key: 'phone',
      label: 'Phone',
      description: 'Phone number',
      category: 'Lead',
    },
    {
      key: 'bankName',
      label: 'Bank',
      description: 'Bank name',
      category: 'Financial',
    },
    {
      key: 'investment_volume',
      label: 'Investment Amount',
      description: 'Investment Amount',
      category: 'Financial',
    },
    {
      key: 'interest_rate',
      label: 'Rate',
      description: 'rate',
      category: 'Financial',
    },
    {
      key: 'interestMonth',
      label: 'Interest Month',
      description: 'Interest month duration',
      category: 'Financial',
    },
    {
      key: 'bonusAmount',
      label: 'Bonus Amount',
      description: 'Bonus amount',
      category: 'Financial',
    },
    {
      key: 'source_id',
      label: 'Source',
      description: 'Source identifier',
      category: 'Source',
    },
    {
      key: 'lead_status',
      label: 'Lead Status',
      description: 'Lead status',
      category: 'Status',
    },
    {
      key: 'updatedAt',
      label: 'Updated At',
      description: 'Last update timestamp',
      category: 'Dates',
    },
    {
      key: 'status',
      label: 'Status',
      description: 'Offer status',
      category: 'Status',
    },
  ],
  'lead-projects': [
    {
      key: 'projectName',
      label: 'Project Name',
      description: 'Name of the project',
      category: 'Project',
    },
    {
      key: 'contact_name',
      label: 'Contact Name',
      description: 'Lead contact name',
      category: 'Lead',
    },
    { key: 'email_from', label: 'Email', description: 'Lead email address', category: 'Lead' },
    { key: 'phone', label: 'Phone', description: 'Lead phone number', category: 'Lead' },
    {
      key: 'expected_revenue',
      label: 'Expected Revenue',
      description: 'Expected revenue from lead',
      category: 'Financial',
    },
    {
      key: 'leadPrice',
      label: 'Lead Price',
      description: 'Price of the lead',
      category: 'Financial',
    },
    { key: 'lead_date', label: 'Lead Date', description: 'Date of the lead', category: 'Dates' },
    {
      key: 'lead_source_no',
      label: 'Lead Source No',
      description: 'Lead source number',
      category: 'Source',
    },
    { key: 'stage', label: 'Stage', description: 'Lead stage', category: 'Lead' },
    { key: 'status', label: 'Status', description: 'Lead status', category: 'Lead' },
    { key: 'active', label: 'Active', description: 'Is lead active', category: 'Status' },
    { key: 'usable', label: 'Usable', description: 'Is lead usable', category: 'Status' },
    {
      key: 'use_status',
      label: 'Use Status',
      description: 'Use status of the lead',
      category: 'Status',
    },
    {
      key: 'reclamation_status',
      label: 'Reclamation Status',
      description: 'Reclamation status',
      category: 'Status',
    },
    {
      key: 'duplicate_status',
      label: 'Duplicate Status',
      description: 'Duplicate status',
      category: 'Status',
    },
    { key: 'checked', label: 'Checked', description: 'Is lead checked', category: 'Status' },
    {
      key: 'voip_extension',
      label: 'VoIP Extension',
      description: 'VoIP extension',
      category: 'Lead',
    },
    { key: 'write_date', label: 'Write Date', description: 'Write date', category: 'Dates' },
    {
      key: 'assigned_date',
      label: 'Assigned Date',
      description: 'Date assigned',
      category: 'Assignment',
    },
    { key: 'notes', label: 'Notes', description: 'Notes for the lead', category: 'Lead' },
    {
      key: 'project_closed_date',
      label: 'Project Closed Date',
      description: 'Project closed date',
      category: 'Project',
    },
    {
      key: 'closure_reason',
      label: 'Closure Reason',
      description: 'Reason for closure',
      category: 'Project',
    },
    { key: 'createdAt', label: 'Created At', description: 'Created at', category: 'Dates' },
    { key: 'updatedAt', label: 'Updated At', description: 'Updated at', category: 'Dates' },
    // Assignment info
    {
      key: 'assigned_agent_login',
      label: 'Assigned Agent Login',
      description: 'Login of assigned agent',
      category: 'Assignment',
    },
    {
      key: 'assigned_agent_role',
      label: 'Assigned Agent Role',
      description: 'Role of assigned agent',
      category: 'Assignment',
    },
    {
      key: 'assignment_notes',
      label: 'Assignment Notes',
      description: 'Notes for assignment',
      category: 'Assignment',
    },
    {
      key: 'assigned_at',
      label: 'Assigned At',
      description: 'Assignment date/time',
      category: 'Assignment',
    },
    {
      key: 'assigned_by',
      label: 'Assigned By',
      description: 'Assigned by user',
      category: 'Assignment',
    },
    // Offer stats
    {
      key: 'total_offers',
      label: 'Total Offers',
      description: 'Total offers for this project/lead',
      category: 'Offers',
    },
    {
      key: 'pending_offers',
      label: 'Pending Offers',
      description: 'Pending offers',
      category: 'Offers',
    },
    {
      key: 'accepted_offers',
      label: 'Accepted Offers',
      description: 'Accepted offers',
      category: 'Offers',
    },
    {
      key: 'rejected_offers',
      label: 'Rejected Offers',
      description: 'Rejected offers',
      category: 'Offers',
    },
    {
      key: 'expired_offers',
      label: 'Expired Offers',
      description: 'Expired offers',
      category: 'Offers',
    },
  ],
};

/**
 * Get additional export fields for a specific page type
 */
export const getAdditionalExportFields = (pageType: string): ExportField[] => {
  return additionalExportFields[pageType] || [];
};

/**
 * Get all available export fields (columns + additional fields) for a page type
 */
export const getAllExportFields = (
  pageType: string,
  columns: Array<{ key: string; label: string }>
): Array<{
  key: string;
  label: string;
  description?: string;
  category?: string;
  isAdditional?: boolean;
}> => {
  const additionalFields = getAdditionalExportFields(pageType);

  return [
    // Regular columns
    ...columns.map((col) => ({ ...col, isAdditional: false })),
    // Additional fields
    ...additionalFields.map((field) => ({ ...field, isAdditional: true })),
  ];
};
