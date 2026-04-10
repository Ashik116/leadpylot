'use client';

import { useMutation } from '@tanstack/react-query';
import { LeadbotService } from '@/services/leadbot/LeadbotService';
import type { LeadbotTranscribeRequest } from '@/types/leadbot.types';

export function useTranscribeAudio() {
  const mutation = useMutation({
    mutationFn: (params: LeadbotTranscribeRequest) => LeadbotService.transcribeAudio(params),
  });

  return {
    transcribe: mutation.mutateAsync,
    isTranscribing: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}
