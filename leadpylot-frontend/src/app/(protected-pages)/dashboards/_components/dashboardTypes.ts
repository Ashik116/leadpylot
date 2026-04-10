export type TDashboardType =
  | 'offer'
  | 'offer_tickets'
  | 'opening'
  | 'confirmation'
  | 'payment'
  | 'netto'
  | 'netto1'
  | 'netto2'
  | 'lost'
  | 'cashflow'
  | 'all';

export const DashboardType: Record<string, TDashboardType> = {
  OFFER: 'offer',
  OFFER_TICKETS: 'offer_tickets',
  OPENING: 'opening',
  CONFIRMATION: 'confirmation',
  PAYMENT: 'payment',
  NETTO: 'netto',
  NETTO1: 'netto1',
  NETTO2: 'netto2',
  LOST: 'lost',
  CASHFLOW: 'cashflow',
  ALL: 'all',
};

export const OPeningDashboardType: Record<string, any> = {
  OFFER_TICKETS: 'offer_tickets',
  OPENING: 'opening',
  CONFIRMATION: 'confirmation',
  PAYMENT: 'payment',
  NETTO: 'netto',
  NETTO1: 'netto1',
  NETTO2: 'netto2',
  LOST: 'lost',
  ALL: 'all',
};

// Helper function to get the correct table name based on dashboard type
// Use unique store names for netto2 and lost to prevent selection conflicts in multi-table mode
export const getTableNameForDashboardType = (
  dashboardType: TDashboardType,
  useProgressFilter?: TDashboardType
) => {
  const effectiveType = useProgressFilter || dashboardType;
  switch (effectiveType) {
    case 'offer':
      return 'offers';
    case 'opening':
      return 'openings';
    case 'confirmation':
      return 'confirmations';
    case 'payment':
      return 'payments';
    case 'netto2':
      return 'offers-netto2' as any; // Unique store name for netto2 to prevent conflicts with lost
    case 'lost':
      return 'offers-lost' as any; // Unique store name for lost to prevent conflicts with netto2
    case 'all':
      return 'offers-all' as any; // Unique store name for all progress stages
    case 'netto':
    case 'netto1':
      return 'offers';
    case 'cashflow':
      return 'cashflow-entries' as any;
    default:
      return 'offers';
  }
};
