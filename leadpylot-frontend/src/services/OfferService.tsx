import { useQuery } from '@tanstack/react-query';
import { apiGetOffers, GetOffersParams } from './LeadsService';
import { apiGetOpenings, GetOpeningsParams } from './OpeningsService';

export const useGetOffers = (params?: GetOffersParams) => {
  return useQuery({
    queryKey: ['offers'],
    queryFn: () => apiGetOffers(params),
  });
};

export const useGetOpenings = (params?: GetOpeningsParams) => {
  return useQuery({
    queryKey: ['openings'],
    queryFn: () => apiGetOpenings(params),
  });
};
