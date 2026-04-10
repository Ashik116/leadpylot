/**
 * useLeadSearch Hook
 * Handles debounced lead search functionality
 */

import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import debounce from 'lodash/debounce';
import { apiGetLeads, Lead } from '@/services/LeadsService';

interface UseLeadSearchOptions {
  initialSearchTerm?: string;
  debounceMs?: number;
  minSearchLength?: number;
  limit?: number;
}

interface UseLeadSearchReturn {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  debouncedSearchTerm: string;
  leads: Lead[];
  isLoading: boolean;
  hasResults: boolean;
}

export function useLeadSearch({
  initialSearchTerm = '',
  debounceMs = 500,
  minSearchLength = 2,
  limit = 10,
}: UseLeadSearchOptions = {}): UseLeadSearchReturn {
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(initialSearchTerm);

  // Create debounced function to update search term
  const debouncedUpdate = useMemo(
    () =>
      debounce((value: string) => {
        setDebouncedSearchTerm(value);
      }, debounceMs),
    [debounceMs]
  );

  // Update debounced search when searchTerm changes
  useEffect(() => {
    debouncedUpdate(searchTerm);
    return () => {
      debouncedUpdate.cancel();
    };
  }, [searchTerm, debouncedUpdate]);

  // Fetch leads with debounced search
  const { data: leadsData, isLoading } = useQuery({
    queryKey: ['leads-search', debouncedSearchTerm],
    queryFn: () =>
      apiGetLeads({
        search: debouncedSearchTerm,
        page: 1,
        limit,
      }),
    enabled: debouncedSearchTerm.length >= minSearchLength,
  });

  const leads = leadsData?.data || [];
  const hasResults = debouncedSearchTerm.length >= minSearchLength;

  return {
    searchTerm,
    setSearchTerm,
    debouncedSearchTerm,
    leads,
    isLoading,
    hasResults,
  };
}

