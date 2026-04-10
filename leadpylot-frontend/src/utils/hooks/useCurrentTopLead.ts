import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/hooks/useSession';
import {
  apiGetCurrentTopLead,
  GetCurrentTopLeadParams,
  CurrentTopLeadResponse,
  TLead,
} from '@/services/LeadsService';
import { Role } from '@/configs/navigation.config/auth.route.config';

export interface UseCurrentTopLeadOptions {
  enabled?: boolean;
  refetchInterval?: number;
  params?: GetCurrentTopLeadParams;
}

export interface UseCurrentTopLeadReturn {
  data: CurrentTopLeadResponse | undefined;
  lead: TLead | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  queueInfo: CurrentTopLeadResponse['queue_info'] | null;
  navigation: CurrentTopLeadResponse['navigation'] | null;
  previousLead?: any;
}

export const useCurrentTopLead = (
  options: UseCurrentTopLeadOptions = {}
): UseCurrentTopLeadReturn => {
  const { data: session } = useSession();
  const { enabled = true, params } = options;

  const isAuthenticated = session?.user?.role === Role.AGENT;

  const { data, isLoading, isError, error, refetch } = useQuery<CurrentTopLeadResponse, Error>({
    queryKey: ['current-top-lead', params],
    queryFn: () => apiGetCurrentTopLead(params),
    enabled: isAuthenticated && enabled,
    // refetchIntervalInBackground: false,
    // staleTime: 5000,
    // retry: (failureCount, error: any) => {
    //   if (error?.response?.status >= 400 && error?.response?.status < 500) {
    //     return false;
    //   }
    //   return failureCount < 3;
    // },
    // retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  return {
    data,
    lead: data?.data || null,
    isLoading,
    isError,
    error: error || null,
    refetch,
    queueInfo: data?.queue_info || null,
    navigation: data?.navigation || null,
    previousLead: data?.previous_lead || null,
  };
};
