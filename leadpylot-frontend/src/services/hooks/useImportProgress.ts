/**
 * useImportProgress Hook
 * Provides real-time import progress tracking via WebSocket with polling fallback
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import importSocketService, { ImportProgress } from '../ImportSocketService';
import ApiService from '../ApiService';

export interface ImportProgressState {
  importId: string | null;
  isTracking: boolean;
  isConnected: boolean;
  progress: ImportProgress | null;
  isCompleted: boolean;
  isFailed: boolean;
  error: string | null;
}

interface UseImportProgressOptions {
  /** Polling interval in milliseconds (used as fallback if WebSocket fails) */
  pollingInterval?: number;
  /** Whether to use polling fallback if WebSocket is not connected */
  usePollingFallback?: boolean;
}

interface ImportProgressResponse {
  importId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: {
    current_phase: string;
    phase_description: string;
    percentage: number;
    processed_count: number;
    current_batch?: number;
    total_batches?: number;
    estimated_time_remaining_ms?: number;
  };
  results?: {
    success_count: number;
    failure_count: number;
    enhanced_count?: number;
    auto_assigned_count?: number;
    stage_assigned_count?: number;
    reclamation_created_count?: number;
    processing_time_ms?: number;
    downloadLink?: string;
    duplicate_status_summary?: {
      new: number;
      oldDuplicate: number;
      duplicate: number;
    };
  };
  error?: string;
}

/**
 * Hook for tracking import progress in real-time
 * Uses WebSocket for real-time updates with polling as fallback
 */
export function useImportProgress(options: UseImportProgressOptions = {}) {
  const { pollingInterval = 2000, usePollingFallback = true } = options;
  const { user } = useAuth();

  const [state, setState] = useState<ImportProgressState>({
    importId: null,
    isTracking: false,
    isConnected: false,
    progress: null,
    isCompleted: false,
    isFailed: false,
    error: null,
  });

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const importIdRef = useRef<string | null>(null);
  const isTrackingRef = useRef(false);

  /**
   * Stop tracking an import - defined first since other functions depend on it
   */
  const stopTracking = useCallback(() => {
    // Clear polling interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    // Unsubscribe from WebSocket
    if (importIdRef.current) {
      importSocketService.unsubscribeFromImport(importIdRef.current);
    }

    importIdRef.current = null;
    isTrackingRef.current = false;

    setState((prev) => ({
      ...prev,
      isTracking: false,
    }));
  }, []);

  /**
   * Handle progress updates (from WebSocket or polling)
   */
  const handleProgress = useCallback((progress: ImportProgress) => {
    setState((prev) => ({
      ...prev,
      progress,
      isCompleted: progress.phase === 'completed',
      isFailed: progress.phase === 'failed',
      error: progress.error || null,
    }));

    // Stop tracking if completed or failed
    if (progress.phase === 'completed' || progress.phase === 'failed') {
      stopTracking();
    }
  }, [stopTracking]);

  /**
   * Start polling for progress updates
   */
  const startPolling = useCallback((importId: string) => {
    // Fetch progress function for polling
    const fetchProgressAndUpdate = async () => {
      try {
        const response = await ApiService.fetchDataWithAxios<ImportProgressResponse>({
          url: `/leads/import/${importId}/progress`,
          method: 'get',
        });

        const progress: ImportProgress = {
          importId: response.importId,
          phase: response.progress.current_phase,
          description: response.progress.phase_description,
          percentage: response.progress.percentage,
          processedCount: response.progress.processed_count,
          currentBatch: response.progress.current_batch,
          totalBatches: response.progress.total_batches,
          estimatedTimeRemaining: response.progress.estimated_time_remaining_ms,
          timestamp: new Date().toISOString(),
          error: response.error,
          result: response.results ? {
            successCount: response.results.success_count,
            failureCount: response.results.failure_count,
            enhancedCount: response.results.enhanced_count,
            autoAssignedCount: response.results.auto_assigned_count,
            downloadLink: response.results.downloadLink,
            duplicateStatusSummary: response.results.duplicate_status_summary,
          } : undefined,
        };

        // Update state directly here to avoid dependency issues
        setState((prev) => ({
          ...prev,
          progress,
          isCompleted: progress.phase === 'completed',
          isFailed: progress.phase === 'failed',
          error: progress.error || null,
        }));

        // Stop tracking if completed or failed
        if (progress.phase === 'completed' || progress.phase === 'failed') {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          importIdRef.current = null;
          isTrackingRef.current = false;
          setState((prev) => ({ ...prev, isTracking: false }));
        }
      } catch {
        // Silently handle fetch errors during polling
      }
    };
    
    // Initial fetch
    fetchProgressAndUpdate();

    // Set up interval
    pollingIntervalRef.current = setInterval(() => {
      if (importIdRef.current) {
        fetchProgressAndUpdate();
      }
    }, pollingInterval);
  }, [pollingInterval]);

  /**
   * Start tracking an import
   */
  const startTracking = useCallback((importId: string) => {
    importIdRef.current = importId;
    isTrackingRef.current = true;

    setState((prev) => ({
      ...prev,
      importId,
      isTracking: true,
      isCompleted: false,
      isFailed: false,
      error: null,
      progress: {
        importId,
        phase: 'queued',
        description: 'Import queued, waiting to start...',
        percentage: 0,
        timestamp: new Date().toISOString(),
      },
    }));

    const accessToken = user?.accessToken;
    
    // Try WebSocket connection first
    if (accessToken) {
      importSocketService.connect(accessToken);
      
      // Wait for connection and subscribe
      const checkConnection = setInterval(() => {
        if (importSocketService.isConnected()) {
          clearInterval(checkConnection);
          importSocketService.subscribeToImport(importId);
          setState((prev) => ({ ...prev, isConnected: true }));
        }
      }, 100);

      // Timeout after 3 seconds and fall back to polling
      setTimeout(() => {
        clearInterval(checkConnection);
        if (!importSocketService.isConnected() && usePollingFallback) {
          startPolling(importId);
        }
      }, 3000);
    } else if (usePollingFallback) {
      // No token, use polling only
      startPolling(importId);
    }
  }, [user, usePollingFallback, startPolling]);

  /**
   * Reset the tracking state
   */
  const reset = useCallback(() => {
    stopTracking();
    setState({
      importId: null,
      isTracking: false,
      isConnected: false,
      progress: null,
      isCompleted: false,
      isFailed: false,
      error: null,
    });
  }, [stopTracking]);

  // Set up WebSocket progress handler
  useEffect(() => {
    if (!state.importId) return;

    const cleanup = importSocketService.onProgress(state.importId, handleProgress);

    return () => {
      cleanup();
    };
  }, [state.importId, handleProgress]);

  // Set up connection status handler
  useEffect(() => {
    const cleanup = importSocketService.onConnectionChange((connected) => {
      setState((prev) => ({ ...prev, isConnected: connected }));

      // If connection is lost and we're tracking, fall back to polling
      if (!connected && isTrackingRef.current && importIdRef.current && usePollingFallback) {
        startPolling(importIdRef.current);
      }

      // If connection is restored, stop polling
      if (connected && pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
        
        // Re-subscribe to import
        if (importIdRef.current) {
          importSocketService.subscribeToImport(importIdRef.current);
        }
      }
    });

    return () => {
      cleanup();
    };
  }, [usePollingFallback, startPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, [stopTracking]);

  return {
    ...state,
    startTracking,
    stopTracking,
    reset,
  };
}

export default useImportProgress;
