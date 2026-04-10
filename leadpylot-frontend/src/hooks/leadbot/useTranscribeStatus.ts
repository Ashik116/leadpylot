'use client';

import { useQuery } from '@tanstack/react-query';
import { LeadbotService } from '@/services/leadbot/LeadbotService';

const LEADBOT_TRANSCRIBE_STATUS_KEY = 'leadbot-transcribe-status';

export function useTranscribeStatus() {
  const query = useQuery({
    queryKey: [LEADBOT_TRANSCRIBE_STATUS_KEY],
    queryFn: () => LeadbotService.getTranscribeStatus(),
  });

  return {
    isAvailable: query.data?.available ?? false,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
