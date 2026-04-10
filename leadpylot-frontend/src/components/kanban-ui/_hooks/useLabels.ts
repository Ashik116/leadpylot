import { useState, useCallback, useMemo } from 'react';
import { Label } from '../types';
import {
  getLabels,
  createLabel,
  updateLabel,
  deleteLabel,
  searchLabels,
  getLabelsByIds,
} from '../_data/labels-data';

interface UseLabelsOptions {
  initialLabels?: string[];
  onUpdate?: (labels: string[]) => void;
}

export const useLabels = (options?: UseLabelsOptions) => {
  const [labels, setLabels] = useState<Label[]>(getLabels());
  const [searchQuery, setSearchQuery] = useState('');
  const [cardLabels, setCardLabels] = useState<string[]>(options?.initialLabels || []);

  // Get filtered labels based on search
  const filteredLabels = useMemo(() => {
    if (!searchQuery.trim()) return labels;
    return searchLabels(searchQuery);
  }, [labels, searchQuery]);

  // Create a new label
  const handleCreateLabel = useCallback((labelData: Omit<Label, 'id'>) => {
    const newLabel = createLabel(labelData);
    setLabels(getLabels());
    return newLabel;
  }, []);

  // Update an existing label
  const handleUpdateLabel = useCallback((id: string, updates: Partial<Omit<Label, 'id'>>) => {
    const updated = updateLabel(id, updates);
    if (updated) {
      setLabels(getLabels());
    }
    return updated;
  }, []);

  // Delete a label
  const handleDeleteLabel = useCallback((id: string) => {
    const success = deleteLabel(id);
    if (success) {
      setLabels(getLabels());
    }
    return success;
  }, []);

  // Get labels by IDs
  const getLabelsForCard = useCallback((labelIds: string[]) => {
    return getLabelsByIds(labelIds);
  }, []);

  // Toggle label on card
  const toggleLabelOnCard = useCallback((currentLabelIds: string[], labelId: string) => {
    if (currentLabelIds.includes(labelId)) {
      return currentLabelIds.filter((id) => id !== labelId);
    } else {
      return [...currentLabelIds, labelId];
    }
  }, []);

  // Update labels on card
  const updateCardLabels = useCallback((newLabels: string[]) => {
    setCardLabels(newLabels);
    options?.onUpdate?.(newLabels);
  }, [options]);

  return {
    labels,
    filteredLabels,
    searchQuery,
    setSearchQuery,
    createLabel: handleCreateLabel,
    updateLabel: handleUpdateLabel,
    deleteLabel: handleDeleteLabel,
    getLabelsForCard,
    toggleLabelOnCard,
    cardLabels,
    updateCardLabels,
  };
};
