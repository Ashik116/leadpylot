/**
 * useDebouncedSearch Hook
 * Handles debounced search input with cleanup
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import debounce from 'lodash/debounce';
import { EmailFilters } from '../_types/email.types';

const DEBOUNCE_DELAY = 500;

export function useDebouncedSearch(
  filters: EmailFilters,
  setFilters: (filters: Partial<EmailFilters>) => void
) {
  const [searchTerm, setSearchTerm] = useState(filters.search || '');

  // Create debounced search - depends only on setFilters (which is stable in Zustand)
  const debouncedSearch = useMemo(() => {
    return debounce((value: string, currentFilters: EmailFilters) => {
      setFilters({ ...currentFilters, search: value });
    }, DEBOUNCE_DELAY);
  }, [setFilters]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  const handleSearch = useCallback(
    (value: string) => {
      setSearchTerm(value);
      debouncedSearch(value, filters);
    },
    [debouncedSearch, filters]
  );

  const handleClearSearch = useCallback(() => {
    setSearchTerm('');
    debouncedSearch.cancel();
    setFilters({ ...filters, search: '' });
  }, [filters, setFilters, debouncedSearch]);

  const setSearchTermDirectly = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  return {
    searchTerm,
    handleSearch,
    handleClearSearch,
    setSearchTerm: setSearchTermDirectly,
  };
}
