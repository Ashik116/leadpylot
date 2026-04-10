/**
 * useEmailSelection Hook
 * Manages email selection state for bulk operations
 * Follows Single Responsibility Principle (SRP) from SOLID
 */

import { useState, useCallback, useMemo } from 'react';
import { EmailConversation } from '../_types/email.types';

export function useEmailSelection(conversations: EmailConversation[]) {
  const [selectedEmailIds, setSelectedEmailIds] = useState<string[]>([]);

  // Toggle single email selection
  const toggleEmailSelect = useCallback((emailId: string) => {
    setSelectedEmailIds((prev) =>
      prev.includes(emailId) ? prev.filter((id) => id !== emailId) : [...prev, emailId]
    );
  }, []);

  // Select all or deselect all
  const toggleSelectAll = useCallback(() => {
    setSelectedEmailIds((prev) =>
      prev.length === conversations.length ? [] : conversations.map((c) => c._id)
    );
  }, [conversations]);

  // Clear all selections
  const clearSelection = useCallback(() => {
    setSelectedEmailIds([]);
  }, []);

  // Check if specific email is selected
  const isEmailSelected = useCallback(
    (emailId: string) => selectedEmailIds.includes(emailId),
    [selectedEmailIds]
  );

  // Check if all emails are selected
  const isAllSelected = useMemo(
    () => conversations.length > 0 && selectedEmailIds.length === conversations.length,
    [conversations.length, selectedEmailIds.length]
  );

  // Check if any emails are selected
  const hasSelection = useMemo(() => selectedEmailIds.length > 0, [selectedEmailIds.length]);

  return {
    selectedEmailIds,
    toggleEmailSelect,
    toggleSelectAll,
    clearSelection,
    isEmailSelected,
    isAllSelected,
    hasSelection,
  };
}

