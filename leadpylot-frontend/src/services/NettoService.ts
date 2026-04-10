import { parseKNumber } from '@/utils/utils';
import ApiService from './ApiService';

// Types for Netto API
export interface NettoRequestData {
  bankerRate?: number; // 0-100 percentage
  agentRate?: number; // 0-100 percentage
  [key: string]: unknown; // Index signature for axios compatibility
}

export interface NettoCalculationBase {
  investmentVolume: number;
  bonusAmount: number;
  baseAmount: number;
  agentRate?: number;
  bankerRate?: number;
}

export interface NettoOfferData {
  _id: string;
  title: string;
  investment_volume: number;
  bonus_amount: number;
  bankerRate?: number;
  agentRate?: number;
  agentShare?: number;
  bankShare?: number;
  revenue: number;
  visibleAmounts: string[];
  nettoStage: 'netto1' | 'netto2';
  calculationBase: NettoCalculationBase;
  lead_id?: {
    contact_name: string;
    status: string;
    stage: string;
  };
  project_id?: {
    name: string;
  };
  agent_id?: {
    login: string;
  };
}

export interface NettoResponse {
  message: string;
  data: NettoOfferData;
}

export interface NettoError {
  error: string;
  message: string;
  code: number;
  details?: Array<{
    field: string;
    message: string;
  }>;
}

/**
 * Send offer to Netto1 system
 * Updates lead stage/status to Opening/Netto1
 */
export const apiSendToNetto1 = async (
  offerId: string,
  data?: NettoRequestData
): Promise<NettoResponse> => {
  return ApiService.fetchDataWithAxios<NettoResponse>({
    url: `/offers/${offerId}/netto1`,
    method: 'POST',
    data: data || {},
  });
};

/**
 * Send offer to Netto2 system
 * Updates lead stage/status to Opening/Netto2
 */
export const apiSendToNetto2 = async (
  offerId: string,
  data?: NettoRequestData
): Promise<NettoResponse> => {
  return ApiService.fetchDataWithAxios<NettoResponse>({
    url: `/offers/${offerId}/netto2`,
    method: 'POST',
    data: data || {},
  });
};

/**
 * Validate rates before sending
 */
export const validateNettoRates = (
  bankerRate?: number,
  agentRate?: number
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (bankerRate !== undefined) {
    if (typeof bankerRate !== 'number' || bankerRate < 0 || bankerRate > 100) {
      errors.push('Banker rate must be a number between 0 and 100');
    }
  }

  if (agentRate !== undefined) {
    if (typeof agentRate !== 'number' || agentRate < 0 || agentRate > 100) {
      errors.push('Agent rate must be a number between 0 and 100');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Calculate revenue preview (client-side calculation for preview)
 */
export const calculateNettoPreview = (
  investmentVolume: number,
  bonusAmount: number,
  agentRate: number = 0,
  bankerRate: number = 0
): {
  baseAmount: number;
  agentShare: number;
  bankShare: number;
  revenue: number;
} => {
  const baseAmount = parseKNumber(investmentVolume) - bonusAmount;
  const agentShare = baseAmount * (agentRate / 100);
  const bankShare = baseAmount * (bankerRate / 100);
  const revenue = baseAmount - agentShare - bankShare;

  return {
    baseAmount,
    agentShare,
    bankShare,
    revenue,
  };
};

// Helper function to determine user role-based visible amounts
export const getVisibleAmountsForRole = (userRole: string): string[] => {
  switch (userRole.toLowerCase()) {
    case 'admin':
      return ['agentShare', 'bankShare', 'revenue'];
    case 'agent':
      return ['agentShare', 'revenue'];
    case 'banker':
      return ['bankShare', 'revenue'];
    default:
      return ['revenue'];
  }
};

// Helper function to format currency
export const formatCurrency = (amount: number, currency: string = 'EUR'): string => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Math.round(amount));
};
