'use client';

import { useMutation } from '@tanstack/react-query';
import { LeadbotService } from '@/services/leadbot/LeadbotService';
import type { LeadbotClassifyEmailRequest } from '@/types/leadbot.types';

export function useClassifyEmail() {
  const mutation = useMutation({
    mutationFn: (body: LeadbotClassifyEmailRequest) => LeadbotService.classifyEmail(body),
  });

  return {
    classify: mutation.mutateAsync,
    isClassifying: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}
