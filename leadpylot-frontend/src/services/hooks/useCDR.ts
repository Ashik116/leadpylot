import { useQuery, useMutation } from '@tanstack/react-query';
import {
  apiGetRecentCDRRecords,
  apiGetRecentRecordings,
  apiGetRecordingDetail,
  apiGetCDRStatistics,
  type CDRFilters,
} from '../CDRService';

// Hook for fetching recent CDR records
export const useRecentCDRRecords = (filters?: CDRFilters) => {
  return useQuery({
    queryKey: ['cdr-records', filters],
    queryFn: () => apiGetRecentCDRRecords(filters),
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refresh every minute
  });
};

// Hook for fetching recent recordings
export const useRecentRecordings = (filters?: CDRFilters) => {
  return useQuery({
    queryKey: ['recordings', filters],
    queryFn: () => apiGetRecentRecordings(filters),
    staleTime: 30000,
    refetchInterval: 60000,
  });
};

// Hook for fetching specific recording details
export const useRecordingDetail = (uniqueId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['recording-detail', uniqueId],
    queryFn: () => apiGetRecordingDetail(uniqueId),
    enabled: enabled && !!uniqueId,
    staleTime: 300000, // 5 minutes
  });
};

// Hook for fetching CDR statistics
export const useCDRStatistics = (filters?: Omit<CDRFilters, 'limit' | 'offset'>) => {
  return useQuery({
    queryKey: ['cdr-statistics', filters],
    queryFn: () => apiGetCDRStatistics(filters),
    staleTime: 60000, // 1 minute
    refetchInterval: 300000, // Refresh every 5 minutes
  });
};

// Hook for real-time dashboard data
export const useDashboardData = (filters?: CDRFilters) => {
  const recordingsQuery = useRecentRecordings({
    ...filters,
    limit: filters?.limit || 50,
  });
  
  const statisticsQuery = useCDRStatistics({
    extension: filters?.extension,
    phone_number: filters?.phone_number,
    disposition: filters?.disposition,
    start_date: filters?.start_date,
    end_date: filters?.end_date,
  });

  return {
    recordings: recordingsQuery,
    statistics: statisticsQuery,
    isLoading: recordingsQuery.isLoading || statisticsQuery.isLoading,
    isError: recordingsQuery.isError || statisticsQuery.isError,
    error: recordingsQuery.error || statisticsQuery.error,
    refetch: () => {
      recordingsQuery.refetch();
      statisticsQuery.refetch();
    },
  };
};

// Hook for managing filters with URL sync
import { useSearchParams, useRouter } from 'next/navigation';
import { useCallback, useMemo } from 'react';

export const useCallFilters = () => {
  const searchParams = useSearchParams();
  const router = useRouter();

  const filters = useMemo<CDRFilters>(() => ({
    limit: Number(searchParams.get('limit')) || 20,
    offset: Number(searchParams.get('offset')) || 0,
    extension: searchParams.get('extension') || undefined,
    phone_number: searchParams.get('phone_number') || undefined,
    disposition: (searchParams.get('disposition') as CDRFilters['disposition']) || undefined,
    start_date: searchParams.get('start_date') || undefined,
    end_date: searchParams.get('end_date') || undefined,
  }), [searchParams]);

  const updateFilters = useCallback((newFilters: Partial<CDRFilters>) => {
    const params = new URLSearchParams(searchParams);
    
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, String(value));
      } else {
        params.delete(key);
      }
    });

    // Reset offset when filters change (except when just changing pagination)
    if (Object.keys(newFilters).some(key => key !== 'offset' && key !== 'limit')) {
      params.set('offset', '0');
    }

    router.push(`?${params.toString()}`);
  }, [searchParams, router]);

  const clearFilters = useCallback(() => {
    router.push('?');
  }, [router]);

  const setPage = useCallback((page: number) => {
    updateFilters({ 
      offset: (page - 1) * (filters.limit || 20)
    });
  }, [updateFilters, filters.limit]);

  const currentPage = Math.floor((filters.offset || 0) / (filters.limit || 20)) + 1;

  return {
    filters,
    updateFilters,
    clearFilters,
    setPage,
    currentPage,
  };
};
