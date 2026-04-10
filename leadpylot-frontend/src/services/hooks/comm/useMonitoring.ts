import { useQuery } from '@tanstack/react-query';
import CommApi from '@/services/CommApiService';
import type { MonitoringOverview } from '@/services/CommApiService';

const monitoringKeys = {
  overview: ['monitoring', 'overview'] as const,
};

export function useMonitoringOverview(enabled = true) {
  return useQuery<MonitoringOverview>({
    queryKey: monitoringKeys.overview,
    queryFn: async () => {
      const res = await CommApi.getMonitoringOverview();
      return res.data.data;
    },
    refetchInterval: 3000, // poll every 3 seconds
    enabled,
    refetchIntervalInBackground: false, // pause when tab is hidden
    retry: 1,
    staleTime: 2000,
  });
}
