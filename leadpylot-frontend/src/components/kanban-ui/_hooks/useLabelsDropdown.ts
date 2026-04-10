import { useState, useCallback } from 'react';
import { Label } from '../types';

interface UseLabelsDropdownOptions {
  createNewLabel: (data: { name: string; color: string }) => Label;
  editLabel: (id: string, data: { name: string; color: string }) => void;
}

/**
 * Hook to manage LabelsDropdown and CreateLabelDropdown state
 * Provides centralized state management for label dropdowns
 */
export const useLabelsDropdown = (options: UseLabelsDropdownOptions) => {
  const { createNewLabel, editLabel } = options;

  // Dropdown states
  const [labelsDropdownOpen, setLabelsDropdownOpen] = useState(false);
  const [createLabelDropdownOpen, setCreateLabelDropdownOpen] = useState(false);
  const [editingLabel, setEditingLabel] = useState<Label | undefined>();



  const handleUpdateLabel = useCallback((id: string, labelData: { name: string; color: string }) => {
    editLabel(id, labelData);
    setCreateLabelDropdownOpen(false);
    setEditingLabel(undefined);
  }, [editLabel]);

  const handleEditLabel = useCallback((label: Label) => {
    setEditingLabel(label);
    setLabelsDropdownOpen(false);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTimeout(() => {
          setCreateLabelDropdownOpen(true);
        }, 50);
      });
    });
  }, []);

  const handleCreateLabelClick = useCallback(() => {
    setEditingLabel(undefined);
    setLabelsDropdownOpen(false);
    // Use double requestAnimationFrame + small delay to ensure DOM updates
    // and positioning calculation happens after LabelsDropdown fully closes
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // Small additional delay to ensure positioning is stable
        setTimeout(() => {
          setCreateLabelDropdownOpen(true);
        }, 50);
      });
    });
  }, []);

  const handleBackToLabels = useCallback(() => {
    setCreateLabelDropdownOpen(false);
    setEditingLabel(undefined);
    setLabelsDropdownOpen(true);
  }, []);
  // Label handlers
  const handleCreateLabel = useCallback((labelData: { name: string; color: string }) => {
    createNewLabel(labelData);
    handleBackToLabels();
  }, [createNewLabel]);
  const closeLabelsDropdown = useCallback(() => {
    setLabelsDropdownOpen(false);
    setEditingLabel(undefined);
  }, []);

  const closeCreateLabelDropdown = useCallback(() => {
    setCreateLabelDropdownOpen(false);
    setEditingLabel(undefined);
  }, []);

  const openLabelsDropdown = useCallback(() => {
    setLabelsDropdownOpen(true);
  }, []);

  return {
    // State
    labelsDropdownOpen,
    createLabelDropdownOpen,
    editingLabel,

    // Setters
    setLabelsDropdownOpen,
    setCreateLabelDropdownOpen,
    setEditingLabel,

    // Handlers
    handleCreateLabel,
    handleUpdateLabel,
    handleEditLabel,
    handleCreateLabelClick,
    handleBackToLabels,
    closeLabelsDropdown,
    closeCreateLabelDropdown,
    openLabelsDropdown,
  };
};
