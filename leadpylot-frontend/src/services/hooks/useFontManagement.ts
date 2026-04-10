import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  FontManagementService,
  type AvailableFontsResponse,
  type FontUploadResponse,
  type FontDeleteResponse,
  type FontOptionsResponse,
} from '../FontManagementService';

/**
 * Hook for getting available fonts
 */
export function useAvailableFonts(enabled = true) {
  return useQuery<AvailableFontsResponse>({
    queryKey: ['availableFonts'],
    queryFn: FontManagementService.getAvailableFonts,
    enabled,
    // 5 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook for getting font options for dropdowns
 */
export function useFontOptions(enabled = true) {
  return useQuery<FontOptionsResponse>({
    queryKey: ['fontOptions'],
    queryFn: FontManagementService.getFontOptions,
    enabled,
    // 5 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook for uploading fonts
 */
export function useUploadFont() {
  const queryClient = useQueryClient();

  return useMutation<FontUploadResponse, Error, File>({
    mutationFn: FontManagementService.uploadFont,
    onSuccess: () => {
      // Invalidate font queries to refresh the lists
      queryClient.invalidateQueries({ queryKey: ['availableFonts'] });
      queryClient.invalidateQueries({ queryKey: ['fontOptions'] });
    },
  });
}

/**
 * Hook for deleting fonts
 */
export function useDeleteFont() {
  const queryClient = useQueryClient();

  return useMutation<FontDeleteResponse, Error, string>({
    mutationFn: FontManagementService.deleteFont,
    onSuccess: () => {
      // Invalidate font queries to refresh the lists
      queryClient.invalidateQueries({ queryKey: ['availableFonts'] });
      queryClient.invalidateQueries({ queryKey: ['fontOptions'] });
    },
  });
}

/**
 * Hook for font preview
 */
export function useFontPreview() {
  return useMutation({
    mutationFn: ({ fontFamily, sampleText }: { fontFamily: string; sampleText?: string }) =>
      FontManagementService.previewFont(fontFamily, sampleText),
  });
}
