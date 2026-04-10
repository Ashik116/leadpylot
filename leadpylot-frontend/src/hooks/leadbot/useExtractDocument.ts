'use client';

import { useMutation } from '@tanstack/react-query';
import { LeadbotService } from '@/services/leadbot/LeadbotService';

export function useExtractDocument() {
  const mutation = useMutation({
    mutationFn: (files: File[]) => LeadbotService.extractDocument(files),
  });

  return {
    extract: mutation.mutateAsync,
    isExtracting: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}
