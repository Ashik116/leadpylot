import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback, useRef } from 'react';
import {
    apiGetBoardLabels,
    apiCreateLabel,
    apiUpdateLabel,
    apiDeleteLabel,
    CreateLabelRequest,
    UpdateLabelRequest,
    LabelsResponse,
    LabelResponse,
    DeleteLabelResponse,
} from '@/services/LabelService';
import todoBoardSocketService from '@/services/TodoBoardSocketService';
import { isDev } from '@/utils/utils';

// ============================================================================
// Query Keys
// ============================================================================

export const LABEL_KEYS = {
    all: ['labels'] as const,
    boards: () => [...LABEL_KEYS.all, 'board'] as const,
    board: (boardId: string | null) => [...LABEL_KEYS.boards(), boardId] as const,
};

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Hook to fetch labels for a specific board
 */
export const useLabels = (boardId: string | null, enabled = true) => {
    return useQuery<LabelsResponse>({
        queryKey: LABEL_KEYS.board(boardId),
        queryFn: () => {
            if (!boardId) throw new Error('Board ID is required');
            return apiGetBoardLabels(boardId);
        },
        enabled: !!boardId && enabled,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
};

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Hook to create a new label
 */
export const useCreateLabel = () => {
    const queryClient = useQueryClient();

    return useMutation<LabelResponse, Error, CreateLabelRequest>({
        mutationFn: apiCreateLabel,
        onSuccess: (response, variables) => {
            // Invalidate labels query for the board
            queryClient.invalidateQueries({ queryKey: LABEL_KEYS.board(variables.board_id) });
        },
    });
};

/**
 * Hook to update an existing label
 */
export const useUpdateLabel = () => {
    const queryClient = useQueryClient();

    return useMutation<LabelResponse, Error, { id: string; data: UpdateLabelRequest; boardId: string }>({
        mutationFn: ({ id, data }) => apiUpdateLabel(id, data),
        onSuccess: (response, variables) => {
            queryClient.invalidateQueries({ queryKey: LABEL_KEYS.board(variables.boardId) });
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
        },
    });
};

/**
 * Hook to delete a label
 */
export const useDeleteLabel = () => {
    const queryClient = useQueryClient();

    return useMutation<DeleteLabelResponse, Error, { id: string; boardId: string }>({
        mutationFn: ({ id }) => apiDeleteLabel(id),
        onSuccess: (response, variables) => {
            // Invalidate labels query for the board
            queryClient.invalidateQueries({ queryKey: LABEL_KEYS.board(variables.boardId) });
            // Invalidate all task queries so CardDetailsModal and other components refetch with updated labels
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
        },
    });
};

// ============================================================================
// Real-time Hook
// ============================================================================

/**
 * Hook to enable real-time updates for labels
 * Subscribes to label:created, label:updated, label:deleted events
 * and automatically invalidates queries when changes occur
 */
export const useLabelsRealtime = (boardId: string | null) => {
    const queryClient = useQueryClient();
    const processedEventsRef = useRef<Set<string>>(new Set());

    const handleLabelCreated = useCallback(
        (data: any) => {
            const eventKey = `label:created:${data.label?._id}`;
            if (processedEventsRef.current.has(eventKey)) {
                isDev && console.log('⏭️ Skipping duplicate label:created event');
                return;
            }
            processedEventsRef.current.add(eventKey);
            setTimeout(() => processedEventsRef.current.delete(eventKey), 5000);

            // Only invalidate if this label belongs to the current board
            const labelBoardId = data.label?.boardId;
            if (labelBoardId && (!boardId || labelBoardId === boardId)) {
                isDev && console.log('🏷️ Real-time: Label created, refreshing labels');
                queryClient.invalidateQueries({ queryKey: LABEL_KEYS.board(labelBoardId) });
            }
        },
        [queryClient, boardId]
    );

    const handleLabelUpdated = useCallback(
        (data: any) => {
            const eventKey = `label:updated:${data.labelId}:${data.updatedAt}`;
            if (processedEventsRef.current.has(eventKey)) {
                isDev && console.log('⏭️ Skipping duplicate label:updated event');
                return;
            }
            processedEventsRef.current.add(eventKey);
            setTimeout(() => processedEventsRef.current.delete(eventKey), 5000);

            const labelBoardId = data.boardId;
            if (labelBoardId && (!boardId || labelBoardId === boardId)) {
                isDev && console.log('🏷️ Real-time: Label updated, refreshing labels');
                queryClient.invalidateQueries({ queryKey: LABEL_KEYS.board(labelBoardId) });
                // Also invalidate tasks that might use this label
                queryClient.invalidateQueries({ queryKey: ['tasks'] });
            }
        },
        [queryClient, boardId]
    );

    const handleLabelDeleted = useCallback(
        (data: any) => {
            const eventKey = `label:deleted:${data.labelId}`;
            if (processedEventsRef.current.has(eventKey)) {
                isDev && console.log('⏭️ Skipping duplicate label:deleted event');
                return;
            }
            processedEventsRef.current.add(eventKey);
            setTimeout(() => processedEventsRef.current.delete(eventKey), 5000);

            const labelBoardId = data.boardId;
            if (labelBoardId && (!boardId || labelBoardId === boardId)) {
                isDev && console.log('🏷️ Real-time: Label deleted, refreshing labels');
                queryClient.invalidateQueries({ queryKey: LABEL_KEYS.board(labelBoardId) });
                // Also invalidate tasks that might use this label
                queryClient.invalidateQueries({ queryKey: ['tasks'] });
            }
        },
        [queryClient, boardId]
    );

    useEffect(() => {
        const unsubCreated = todoBoardSocketService.onLabelCreated(handleLabelCreated);
        const unsubUpdated = todoBoardSocketService.onLabelUpdated(handleLabelUpdated);
        const unsubDeleted = todoBoardSocketService.onLabelDeleted(handleLabelDeleted);

        isDev && console.log('🏷️ Subscribed to label real-time events');

        return () => {
            unsubCreated();
            unsubUpdated();
            unsubDeleted();
            isDev && console.log('🏷️ Unsubscribed from label real-time events');
        };
    }, [handleLabelCreated, handleLabelUpdated, handleLabelDeleted]);
};
