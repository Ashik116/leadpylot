import { DateFormatType, dateFormateUtils } from '@/utils/dateFormateUtils';

// Common field mapping interface
interface CommonFieldMapping {
  _id: string;
  leadName?: string;
  updatedAt?: string;
  createdAt?: string;
  title?: string;
  files?: any[];
  leadId?: string;
  leadStatus?: string;
  lead_source_no?: string;
  projectName?: string;
  agent?: string;
  status?: string;
  investmentVolume?: number;
  interestRate?: number;
  bankName?: string;
  filesCount?: number;
  bonusAmount?: number;
  interestMonth?: number;
  reference_no?: string;
  offerType?: string;
  originalData: any;
  email_from?: string;
  phone?: string;
  source_name?: string;
  offer_calls?: number;
  todoCount?: number;
  current_stage?: string;
  load_and_opening?: string | null;
  agentColor?: string;
  projectColor?: string;
  nickName?: string;
  document_slots?: any[];
}

// Base transformation function for common fields
export const transformCommonFields = (item: any): CommonFieldMapping => {

  return {
    _id: item._id,
    leadName: item.lead_id?.contact_name || item.lead?.display_name,
    updatedAt: dateFormateUtils(item?.updatedAt, DateFormatType.SHOW_DATE),
    createdAt: dateFormateUtils(item?.createdAt, DateFormatType.SHOW_DATE),
    title: item?.title || item?.name,
    files: item?.files,
    leadId: item?.lead_id?._id,
    leadStatus: item?.lead_id?.status,
    lead_source_no: item?.lead_id?.lead_source_no,
    projectName: item?.project_id?.name,
    agent: item?.agent_id?.login,
    status: item?.active ? 'Active' : 'Inactive',
    investmentVolume: item?.investment_volume,
    interestRate: item?.interest_rate,
    bankName: item?.bank_id?.name,
    filesCount: item?.files?.length || 0,
    bonusAmount: item?.bonus_amount?.info?.amount,
    interestMonth: item?.payment_terms?.info?.info?.months,
    reference_no: item?.reference_no,
    offerType: item?.offerType,
    originalData: item,
    email_from: item?.lead_id?.email_from,
    phone: item?.lead_id?.phone,
    source_name: item?.lead_id?.source_id?.name,
    offer_calls: item?.lead_id?.offer_calls || 0,
    todoCount: item?.todoCount || 0,
    current_stage: item?.current_stage,
    load_and_opening: item?.load_and_opening || null,
    agentColor: item?.agent_id?.color_code,
    projectColor: item?.project_id?.color_code,
    nickName: item?.bank_id?.nickName,
    document_slots: item?.document_slots,
  };
};

// Progress tracking fields
export const addProgressFields = (item: any) => ({
  has_confirmation: item?.has_confirmation,
  has_opening: item?.has_opening,
  has_payment_voucher: item?.has_payment_voucher,
  has_offer: item?.has_offer,
  has_lead: item?.has_lead,
  has_agent: item?.has_agent,
  has_bank: item?.has_bank,
  has_project: item?.has_project,
});

// Generic transformation function
export const createTransformFunction = <T extends CommonFieldMapping>(
  additionalFields?: (item: any) => Partial<T>
) => {
  return (data: any[]): T[] => {
    return data?.length > 0
      ? data?.map((item: any) => {
        const commonFields = transformCommonFields(item);
        const progressFields = addProgressFields(item);
        const additional = additionalFields ? additionalFields(item) : {};

        return {
          ...commonFields,
          ...progressFields,
          ...additional,
        } as unknown as T;
      })
      : [];
  };
};

// Specific transformation functions for each dashboard type
export const transformOffersData = createTransformFunction((item: any) => ({
  email: item?.lead_id?.email_from,
  status: item?.status,
}));

export const transformOpeningsData = createTransformFunction();

export const transformConfirmationsData = createTransformFunction();

export const transformPaymentData = createTransformFunction();

export const transformNettoData = createTransformFunction((item: any) => ({
  // Netto-specific fields
  nettoStage:
    item?.nettoStage ||
    (item?.lead_id?.status?.name?.toLowerCase().includes('netto1')
      ? 'netto1'
      : item?.lead_id?.status?.name?.toLowerCase().includes('netto2')
        ? 'netto2'
        : 'pending'),
  bankerRate: item?.bankerRate || 0,
  agentRate: item?.agentRate || 0,
  agentShare: item?.agentShare || 0,
  bankShare: item?.bankShare || 0,
  netRevenue: item?.revenue || item?.netRevenue || 0,
  visibleAmounts: item?.visibleAmounts || [],
  calculationBase: item?.calculationBase || {},
  // Override leadStatus for netto
  leadStatus: item?.lead_id?.status?.name || item?.lead_id?.status,
  // Override bonusAmount for netto
  bonusAmount: item?.bonus_amount?.info?.amount || item?.bonus_amount || 0,
}));

/**
 * Transform cashflow entries data
 * Cashflow entries have offer_id populated with nested data (new API structure)
 * Also handles old API structure with fallbacks for backward compatibility
 */
export const transformCashflowEntriesData = (data: any[]) => {
  return data?.map((entry: any) => {
    // New API structure: nested under offer_id
    // Old API structure: direct properties on entry
    const offer = entry.offer_id || {};
    const lead = offer.lead_id || entry.lead_id || {};
    const project = offer.project_id || entry.project_id || {};
    const agent = offer.agent_id || entry.agent_id || {};
    const bank = entry.current_bank_id || entry.initial_bank_id || entry.bank_id || {};

    return {
      _id: entry._id,
      // Offer data (from offer_id or entry directly)
      title: offer.title || entry.title || 'N/A',
      reference_no: offer.reference_no || entry.reference_no || '-',
      investmentVolume: offer.investment_volume || entry.investment_volume || 0,
      interestRate: offer.interest_rate || entry.interest_rate || 0,
      // Lead data (nested in offer_id.lead_id or entry.lead_id)
      leadName: lead.contact_name || 'N/A',
      leadId: lead._id,
      email_from: lead.email_from,
      phone: lead.phone,
      lead_source_no: lead.lead_source_no,
      // Project data (from offer_id.project_id or entry.project_id)
      projectName: project.name || 'N/A',
      projectId: project._id,
      projectColor: project.color_code,
      // Agent data (from offer_id.agent_id or entry.agent_id)
      agent: agent.login || 'N/A',
      agentLogin: agent.login || 'N/A', // Alias for column compatibility
      agentId: agent._id,
      agentColor: agent.color_code,
      // Bank data
      bankName: bank.name || 'N/A',
      bankNickName: bank.nickName || '',
      bankId: bank._id,
      initialBankName: entry.initial_bank_id?.name || 'N/A',
      initialBankId: entry.initial_bank_id?._id,
      // Entry data
      amount: entry.amount || 0,
      currency: entry.currency || 'EUR',
      status: entry.status || 'active',
      notes: entry.notes,
      // User who entered
      enteredBy: entry.entered_by?.login,
      enteredById: entry.entered_by?._id,
      // Dates
      createdAt: dateFormateUtils(entry.createdAt, DateFormatType.SHOW_DATE),
      updatedAt: dateFormateUtils(entry.updatedAt, DateFormatType.SHOW_DATE),
      enteredAt: entry.entered_at ? dateFormateUtils(entry.entered_at, DateFormatType.SHOW_DATE) : null,
      // Original data for reference
      originalData: entry,
    };
  }) || [];
};

/**
 * Transform cashflow transactions data
 * Matches the field names used in CashflowTransactionsSection.tsx transformTransactionsData
 */
export const transformCashflowTransactionsData = (data: any[]) => {
  return data?.map((tx: any) => {
    // Handle both old and new API structures
    // New API: bank_id and counterparty_bank_id are nested objects
    // Old API: from_bank_id and to_bank_id might be used
    const fromBank = tx.bank_id || tx.from_bank_id;
    const toBank = tx.counterparty_bank_id || tx.to_bank_id;

    return {
      _id: tx._id,
      // Transaction type - use snake_case to match column accessorKey
      transaction_type: tx.transaction_type,
      direction: tx.direction,
      amount: tx.amount || 0,
      currency: tx.currency || 'EUR',
      fees: tx.fees || 0,
      // Use snake_case to match column accessorKey
      net_amount: tx.net_amount || 0,
      status: tx.status,
      // From Bank (bank_id) - match field names from transformTransactionsData
      fromBankName: fromBank?.name || 'N/A',
      fromBankNickName: fromBank?.nickName || '',
      fromBankId: fromBank?._id,
      // To Bank (counterparty_bank_id) - match field names from transformTransactionsData
      toBankName: toBank?.name || 'N/A',
      toBankNickName: toBank?.nickName || '',
      toBankId: toBank?._id,
      // User who created
      createdBy: tx.created_by?.login || 'N/A',
      // Dates - use createdAt to match column accessorKey
      createdAt: dateFormateUtils(tx.created_at || tx.createdAt, DateFormatType.SHOW_DATE),
      notes: tx.notes || '',
      // Original data for reference
      originalData: tx,
    };
  }) || [];
};
