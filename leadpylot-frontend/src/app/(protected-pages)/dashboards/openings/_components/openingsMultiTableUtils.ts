import { TDashboardType } from '../../_components/dashboardTypes';
import { DragDropTableType } from './DragDropContext';

// Define the 5 progress filter types in the order they should appear
export const PROGRESS_FILTERS: TDashboardType[] = [
  'opening',
  'confirmation',
  'payment',
  'netto2',
  'lost',
];

// Titles for each table
export const TABLE_TITLES: Record<any, string> = {
  opening: 'Opening',
  confirmation: 'Confirmation',
  payment: 'Payment',
  netto1: 'Netto 1',
  netto2: 'Netto 2',
  lost: 'Lost',
  offer: 'Offer',
  netto: 'Netto',
};

// Helper function to get the index of a table type in the workflow
export const getTableIndex = (tableType: TDashboardType): number => {
  const index = PROGRESS_FILTERS.indexOf(tableType);
  return index >= 0 ? index : -1;
};

// Helper function to map table type to stage name (for availableReverts)
export const getStageNameFromTableType = (tableType: TDashboardType): string => {
  switch (tableType) {
    case 'opening':
      return 'opening';
    case 'confirmation':
      return 'confirmation';
    case 'payment':
      return 'payment';
    case 'netto1':
      return 'netto1';
    case 'netto2':
      return 'netto2';
    case 'lost':
      return 'lost';
    default:
      return tableType;
  }
};

// Helper function to get standard page type from progress filter
export const getPageTypeFromProgressFilter = (progressFilter: TDashboardType): string => {
  switch (progressFilter) {
    case 'opening':
      return 'openings';
    case 'confirmation':
      return 'confirmations';
    case 'payment':
      return 'payments';
    case 'netto2':
      return 'offers-netto2' as any; // Unique store name for netto2
    case 'lost':
      return 'offers-lost' as any; // Unique store name for lost
    default:
      return 'offers';
  }
};

// Helper function to check if drag movement is valid
// Forward: destination index > source index
// Reverse: destination must be in availableReverts (excluding first item)
export const isValidDragMovement = (
  sourceType: TDashboardType,
  destType: TDashboardType,
  availableReverts?: string[]
): boolean => {
  const sourceIndex = getTableIndex(sourceType);
  const destIndex = getTableIndex(destType);

  // If either index is invalid, allow the movement (fallback)
  if (sourceIndex < 0 || destIndex < 0) {
    return true;
  }

  // Forward movement: destination index must be greater than source
  if (destIndex > sourceIndex) {
    return true;
  }

  // Reverse movement: check if destination is in availableReverts
  if (destIndex < sourceIndex && availableReverts && availableReverts.length > 0) {
    const destStage = getStageNameFromTableType(destType);
    // Check if destination stage is in availableReverts (excluding first item which is current table)
    const validRevertStages = availableReverts.slice(1); // Skip first item (current table)
    return validRevertStages.includes(destStage);
  }

  // Default: don't allow reverse movement without availableReverts
  return false;
};

// Helper function to extract offer ID from item data
export const extractOfferId = (item: any, tableType?: TDashboardType): string | null => {
  return (
    (item?.offer_id?._id ??
      item?.opening_id?.offer_id?._id ??
      item?.confirmation_id?.offer_id?._id ??
      item?.confirmation_id?.opening_id?.offer_id?._id ??
      item?.originalData?.offer_id?._id ??
      item?.originalData?.opening_id?.offer_id?._id ??
      item?.originalData?.confirmation_id?.offer_id?._id ??
      item?.originalData?.confirmation_id?.opening_id?.offer_id?._id ??
      // For netto/lost, _id might be the offer_id directly
      (tableType === 'netto1' || tableType === 'netto2' || tableType === 'lost'
        ? item?._id
        : null) ??
      item?.originalData?._id) ||
    null
  );
};

// Helper function to extract item ID for various operations
export const extractItemId = (item: any, tableType: TDashboardType): string | null => {
  switch (tableType) {
    case 'opening':
      return item?._id ?? item?.opening_id?._id ?? null;
    case 'confirmation':
      return item?._id ?? item?.confirmation_id?._id ?? null;
    case 'payment':
      return item?._id ?? item?.payment_voucher_id?._id ?? null;
    case 'netto1':
    case 'netto2':
    case 'lost':
      return item?._id ?? item?.offer_id?._id ?? item?.originalData?._id ?? null;
    default:
      return item?._id ?? null;
  }
};

// Helper function to get action config for a table type
export const getActionConfig = (tableType: TDashboardType) => {
  const configs: Partial<Record<TDashboardType, any>> = {
    opening: {
      showRevert: true,
      showBulkUpdate: true,
      showCreateOpening: false,
      showCreateConfirmation: true,
      showCreatePaymentVoucher: true,
      showLost: true,
      showNetto: true,
      showBulkNetto: true,
    },
    confirmation: {
      showRevert: true,
      showBulkUpdate: true,
      showCreateOpening: false,
      showCreateConfirmation: false,
      showCreatePaymentVoucher: true,
      showLost: true,
      showNetto: true,
      showBulkNetto: true,
    },
    payment: {
      showRevert: true,
      showBulkUpdate: true,
      showCreateOpening: false,
      showCreateConfirmation: false,
      showCreatePaymentVoucher: false,
      showLost: true,
      showNetto: true,
      showBulkNetto: true,
    },
    netto2: {
      showRevert: true,
      showBulkUpdate: true,
      showCreateOpening: false,
      showCreateConfirmation: false,
      showCreatePaymentVoucher: false,
      showLost: true,
      showNetto: true,
      showBulkNetto: true,
    },
    lost: {
      showRevert: true,
      showBulkUpdate: true,
      showCreateOpening: false,
      showCreateConfirmation: true,
      showCreatePaymentVoucher: true,
      showLost: false, // Can't send to lost from lost table
      showNetto: true,
      showBulkNetto: true,
    },
    netto1: {
      showRevert: true,
      showBulkUpdate: true,
      showCreateOpening: false,
      showCreateConfirmation: false,
      showCreatePaymentVoucher: false,
      showLost: true,
      showNetto: true,
      showBulkNetto: true,
    },
  };

  return configs[tableType] || configs.opening || {};
};

// Helper function to get column key from column definition
export const getColumnKey = (column: any): string | undefined => {
  if (column.id) return column.id;
  if ('accessorKey' in column && typeof column.accessorKey === 'string') {
    return column.accessorKey;
  }
  return undefined;
};

// Helper function to get column display label
export const getColumnDisplayLabel = (column: any): string => {
  if (typeof column.header === 'string') return column.header;
  if (typeof column.header === 'function') {
    const headerResult = (column as any).header();
    if (headerResult && headerResult.props && headerResult.props.children) {
      return headerResult.props.children;
    }
    return column.id || 'Column';
  }
  if ('accessorKey' in column && typeof column.accessorKey === 'string') {
    return column.accessorKey
      .split('_')
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  if (column.id) {
    return column.id.charAt(0).toUpperCase() + column.id.slice(1);
  }
  return 'Unnamed Column';
};
