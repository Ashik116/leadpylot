import { useQuery } from '@tanstack/react-query';
import { apiGetOfferTickets, GetOfferTicketsParams, GetOfferTicketsResponse } from '../LeadsService';

export const useOfferTickets = (params?: GetOfferTicketsParams, enabled: boolean = true) => {
  return useQuery<GetOfferTicketsResponse>({
    queryKey: ['offerTickets', params],
    queryFn: () => apiGetOfferTickets(params),
    enabled,
  });
};

export default useOfferTickets;
