'use client';

import React, { createContext, useContext, useCallback, useRef } from 'react';

export type TDashboardType = 'opening' | 'confirmation' | 'payment' | 'netto1' | 'netto2' | 'lost';
export type DragDropTableType = TDashboardType;

export interface TableDialogHandlers {
  openConfirmationDialog: (items: any[]) => void;
  openPaymentDialog: (items: any[]) => void;
  openNettoDialog: (items: any[]) => void;
  openLostDialog: (items: any[]) => void;
}

interface DragDropContextType {
  registerTableHandlers: (tableType: TDashboardType, handlers: TableDialogHandlers) => void;
  unregisterTableHandlers: (tableType: TDashboardType) => void;
  getTableHandlers: (tableType: TDashboardType) => TableDialogHandlers | undefined;
}

const DragDropContext = createContext<DragDropContextType | undefined>(undefined);

export const DragDropProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const tableHandlersRef = useRef<Record<TDashboardType, TableDialogHandlers>>({} as any);

  const registerTableHandlers = useCallback(
    (tableType: TDashboardType, handlers: TableDialogHandlers) => {
      tableHandlersRef.current[tableType] = handlers;
    },
    []
  );

  const unregisterTableHandlers = useCallback((tableType: TDashboardType) => {
    delete tableHandlersRef.current[tableType];
  }, []);

  const getTableHandlers = useCallback(
    (tableType: TDashboardType) => {
      return tableHandlersRef.current[tableType];
    },
    []
  );

  return (
    <DragDropContext.Provider
      value={{
        registerTableHandlers,
        unregisterTableHandlers,
        getTableHandlers,
      }}
    >
      {children}
    </DragDropContext.Provider>
  );
};

export const useDragDrop = () => {
  const context = useContext(DragDropContext);
  if (context === undefined) {
    throw new Error('useDragDrop must be used within a DragDropProvider');
  }
  return context;
};

