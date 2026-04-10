import { useState } from 'react';

interface UseActiveRowProps {
  onHandleSidebar: (id?: string, type?: 'create' | 'edit' | 'changePassword') => void;
  resetDrawer: () => void;
}

interface UseActiveRowReturn {
  activeRowId: string | null;
  setActiveRow: (id: string | null) => void;
  handleRowClick: (id: string) => void;
  handleAddNew: () => void;
  handleEdit: (id: string) => void;
  handleDelete: () => void;
  getRowClassName: (row: any) => string;
  handleFormSuccess: () => void;
}

export const useActiveRow = ({
  onHandleSidebar,
  resetDrawer,
}: UseActiveRowProps): UseActiveRowReturn => {
  const [activeRowId, setActiveRowId] = useState<string | null>(null);

  const setActiveRow = (id: string | null) => {
    setActiveRowId(id);
  };

  const handleRowClick = (id: string) => {
    // If clicking on the same row that's already active, close the sidebar
    if (activeRowId === id) {
      resetDrawer();
      setActiveRowId(null);
    } else {
      // Open sidebar for new row selection
      onHandleSidebar(id);
      setActiveRowId(id);
    }
  };

  const handleAddNew = () => {
    onHandleSidebar();
    setActiveRowId(null);
  };

  const handleEdit = (id: string) => {
    onHandleSidebar(id);
    setActiveRowId(id);
  };

  const handleDelete = () => {
    // Close sidebar and clear selection when row is deleted
    resetDrawer();
    setActiveRowId(null);
  };

  const getRowClassName = (row: any) => {
    const baseClasses = 'hover:bg-sand-5 cursor-pointer';
    // Try to get ID from different possible fields
    const rowId = row?.original?._id || 
                  row?.original?.trunkid?.toString() || 
                  row?.original?.extension || 
                  row?.original?.route_id?.toString() ||
                  row?.original?.id?.toString();
    const isActive = activeRowId === rowId;
    return `${baseClasses} ${isActive ? 'bg-sand-5 border-l-4 border-l-ocean-2' : ''}`;
  };

  const handleFormSuccess = () => {
    resetDrawer();
    // Keep the active row when form is successfully submitted
  };

  return {
    activeRowId,
    setActiveRow,
    handleRowClick,
    handleAddNew,
    handleEdit,
    handleDelete,
    getRowClassName,
    handleFormSuccess,
  };
};
