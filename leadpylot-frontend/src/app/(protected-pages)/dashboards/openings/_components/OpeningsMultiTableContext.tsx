'use client';

import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import { TDashboardType } from './DragDropContext';
import { DragDropTableType } from './DragDropContext';

interface OpeningsMultiTableState {
  // Dialog states
  isConfirmationDialogOpen: boolean;
  isPaymentVoucherDialogOpen: boolean;
  isNettoDialogOpen: boolean;
  isLostDialogOpen: boolean;
  isBulkUpdateDialogOpen: boolean;
  isBulkNettoDialogOpen: boolean;
  createOpeningOpen: boolean;
  isDeleteDialogOpen: boolean;
  deleteTableType: TDashboardType | null;
  
  // Column customization state
  columnDialogOpenFor: TDashboardType | null;
  clearSelectionsSignal: number;
  
  // Drag-drop states
  destinationTable: DragDropTableType | null;
  sourceTable: DragDropTableType | null;
  isDragging: boolean;
  draggedItemAvailableReverts: string[] | null;
  dragDropSelectedItems: any[];
  
  // Glow effect state
  glowingItem: { itemId: string; tableId: TDashboardType } | null;
  
  // Updating table state
  updatingTable: TDashboardType | null;
}

interface OpeningsMultiTableActions {
  // Dialog actions
  setIsConfirmationDialogOpen: (open: boolean) => void;
  setIsPaymentVoucherDialogOpen: (open: boolean) => void;
  setIsNettoDialogOpen: (open: boolean) => void;
  setIsLostDialogOpen: (open: boolean) => void;
  setIsBulkUpdateDialogOpen: (open: boolean) => void;
  setIsBulkNettoDialogOpen: (open: boolean) => void;
  setCreateOpeningOpen: (open: boolean) => void;
  setIsDeleteDialogOpen: (open: boolean) => void;
  setDeleteTableType: (type: TDashboardType | null) => void;
  
  // Column customization actions
  setColumnDialogOpenFor: (type: TDashboardType | null) => void;
  setClearSelectionsSignal: (signal: number | ((prev: number) => number)) => void;
  
  // Drag-drop actions
  setDestinationTable: (table: DragDropTableType | null) => void;
  setSourceTable: (table: DragDropTableType | null) => void;
  setIsDragging: (dragging: boolean) => void;
  setDraggedItemAvailableReverts: (reverts: string[] | null) => void;
  setDragDropSelectedItems: (items: any[]) => void;
  
  // Glow effect actions
  setGlowingItem: (item: { itemId: string; tableId: TDashboardType } | null) => void;
  
  // Updating table actions
  setUpdatingTable: (table: TDashboardType | null) => void;
  
  // Helper actions
  resetDragStates: () => void;
  clearAllDialogs: () => void;
}

interface OpeningsMultiTableContextValue extends OpeningsMultiTableState, OpeningsMultiTableActions {
  // Refs for drag-drop
  sourceTableRef: React.MutableRefObject<DragDropTableType | null>;
  destinationTableRef: React.MutableRefObject<DragDropTableType | null>;
  isDraggingRef: React.MutableRefObject<boolean>;
  draggedItemAvailableRevertsRef: React.MutableRefObject<string[] | null>;
  dragOperationRef: React.MutableRefObject<{
    sourceTable: DragDropTableType | null;
    destTable: DragDropTableType | null;
    itemData: any;
    availableReverts?: string[];
  } | null>;
}

const OpeningsMultiTableContext = createContext<OpeningsMultiTableContextValue | undefined>(undefined);

export const OpeningsMultiTableProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Dialog states
  const [isConfirmationDialogOpen, setIsConfirmationDialogOpen] = useState(false);
  const [isPaymentVoucherDialogOpen, setIsPaymentVoucherDialogOpen] = useState(false);
  const [isNettoDialogOpen, setIsNettoDialogOpen] = useState(false);
  const [isLostDialogOpen, setIsLostDialogOpen] = useState(false);
  const [isBulkUpdateDialogOpen, setIsBulkUpdateDialogOpen] = useState(false);
  const [isBulkNettoDialogOpen, setIsBulkNettoDialogOpen] = useState(false);
  const [createOpeningOpen, setCreateOpeningOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteTableType, setDeleteTableType] = useState<TDashboardType | null>(null);
  
  // Column customization state
  const [columnDialogOpenFor, setColumnDialogOpenFor] = useState<TDashboardType | null>(null);
  const [clearSelectionsSignal, setClearSelectionsSignal] = useState(0);
  
  // Drag-drop states
  const [destinationTable, setDestinationTable] = useState<DragDropTableType | null>(null);
  const [sourceTable, setSourceTable] = useState<DragDropTableType | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedItemAvailableReverts, setDraggedItemAvailableReverts] = useState<string[] | null>(null);
  const [dragDropSelectedItems, setDragDropSelectedItems] = useState<any[]>([]);
  
  // Glow effect state
  const [glowingItem, setGlowingItem] = useState<{ itemId: string; tableId: TDashboardType } | null>(null);
  
  // Updating table state
  const [updatingTable, setUpdatingTable] = useState<TDashboardType | null>(null);
  
  // Refs for drag-drop (using refs to avoid re-renders)
  const sourceTableRef = useRef<DragDropTableType | null>(null);
  const destinationTableRef = useRef<DragDropTableType | null>(null);
  const isDraggingRef = useRef(false);
  const draggedItemAvailableRevertsRef = useRef<string[] | null>(null);
  const dragOperationRef = useRef<{
    sourceTable: DragDropTableType | null;
    destTable: DragDropTableType | null;
    itemData: any;
    availableReverts?: string[];
  } | null>(null);
  
  // Helper actions
  const resetDragStates = useCallback(() => {
    isDraggingRef.current = false;
    setIsDragging(false);
    destinationTableRef.current = null;
    setDestinationTable(null);
    sourceTableRef.current = null;
    setSourceTable(null);
    draggedItemAvailableRevertsRef.current = null;
    setDraggedItemAvailableReverts(null);
    dragOperationRef.current = null;
  }, []);
  
  const clearAllDialogs = useCallback(() => {
    setIsConfirmationDialogOpen(false);
    setIsPaymentVoucherDialogOpen(false);
    setIsNettoDialogOpen(false);
    setIsLostDialogOpen(false);
    setIsBulkUpdateDialogOpen(false);
    setIsBulkNettoDialogOpen(false);
    setCreateOpeningOpen(false);
    setIsDeleteDialogOpen(false);
    setDeleteTableType(null);
    setColumnDialogOpenFor(null);
  }, []);
  
  const value: OpeningsMultiTableContextValue = {
    // State
    isConfirmationDialogOpen,
    isPaymentVoucherDialogOpen,
    isNettoDialogOpen,
    isLostDialogOpen,
    isBulkUpdateDialogOpen,
    isBulkNettoDialogOpen,
    createOpeningOpen,
    isDeleteDialogOpen,
    deleteTableType,
    columnDialogOpenFor,
    clearSelectionsSignal,
    destinationTable,
    sourceTable,
    isDragging,
    draggedItemAvailableReverts,
    dragDropSelectedItems,
    glowingItem,
    updatingTable,
    
    // Actions
    setIsConfirmationDialogOpen,
    setIsPaymentVoucherDialogOpen,
    setIsNettoDialogOpen,
    setIsLostDialogOpen,
    setIsBulkUpdateDialogOpen,
    setIsBulkNettoDialogOpen,
    setCreateOpeningOpen,
    setIsDeleteDialogOpen,
    setDeleteTableType,
    setColumnDialogOpenFor,
    setClearSelectionsSignal,
    setDestinationTable,
    setSourceTable,
    setIsDragging,
    setDraggedItemAvailableReverts,
    setDragDropSelectedItems,
    setGlowingItem,
    setUpdatingTable,
    resetDragStates,
    clearAllDialogs,
    
    // Refs
    sourceTableRef,
    destinationTableRef,
    isDraggingRef,
    draggedItemAvailableRevertsRef,
    dragOperationRef,
  };
  
  return (
    <OpeningsMultiTableContext.Provider value={value}>
      {children}
    </OpeningsMultiTableContext.Provider>
  );
};

export const useOpeningsMultiTable = () => {
  const context = useContext(OpeningsMultiTableContext);
  if (context === undefined) {
    throw new Error('useOpeningsMultiTable must be used within OpeningsMultiTableProvider');
  }
  return context;
};

