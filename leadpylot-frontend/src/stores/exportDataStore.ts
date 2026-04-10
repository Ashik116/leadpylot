import { create } from 'zustand';

export type PageType =
  | 'leads'
  | 'projects'
  | 'reclamations'
  | 'users'
  | 'banks'
  | 'voip-servers'
  | 'sources'
  | 'offers'
  | 'openings'
  | 'confirmations'
  | 'payments'
  | 'payment-terms'
  | 'mailservers'
  | 'lead-projects';

interface ExportDataState {
  exportData: Record<string, any>[];
  selectedColumns: string[];
  currentPage: PageType | null;
  setExportData: (data: Record<string, any>[], page: PageType) => void;
  setSelectedColumns: (columns: string[]) => void;
  getFilteredExportData: () => Record<string, any>[];
  clearExportData: () => void;
}

export const useExportDataStore = create<ExportDataState>((set, get) => ({
  exportData: [],
  selectedColumns: [],
  currentPage: null,

  setExportData: (data: Record<string, any>[], page: PageType) => {
    set({ exportData: data, currentPage: page });
  },

  setSelectedColumns: (columns: string[]) => {
    set({ selectedColumns: columns });
  },

  getFilteredExportData: () => {
    const { exportData, selectedColumns } = get();

    if (selectedColumns.length === 0) {
      return exportData; // Return all data if no columns selected
    }

    return exportData.map((row) => {
      const filteredRow: Record<string, any> = {};
      selectedColumns.forEach((columnKey) => {
        if (row.hasOwnProperty(columnKey)) {
          filteredRow[columnKey] = row[columnKey];
        }
      });
      return filteredRow;
    });
  },

  clearExportData: () => {
    set({ exportData: [], selectedColumns: [], currentPage: null });
  },
}));
