// Define types for the opening dashboard
export interface OpeningItem {
  _id: string;
  projectName: string;
  agentLogin: string;
  agentRole: string;
  leadName: string;
  amount: number;
  offerDate: string;
  offerId: string;
  leadId: string;
  contactName: string;
  interestRate: number;
  bankName: string;
  paymentTerms: string;
  bonusAmount: number;
  openingData: {
    _id: string;
    createdAt: string;
    active: boolean;
    files?: Array<{
      _id: string;
      document: {
        _id: string;
        filename: string;
        path: string;
        filetype: string;
      };
    }>;
  } | null;
}

// This matches the actual API response structure
export interface LeadData {
  _id: string | number;
  contact_name: string;
  attached_project?: {
    name: string;
  };
  assigned_agent?: {
    login: string;
    role: string;
    offers?: Array<{
      _id: string;
      investment_volume: number;
      created_at: string;
      opening: {
        _id: string;
      } | null;
    }>;
  };
}
