import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import React from 'react';
import AxiosBase from '@/services/axios/AxiosBase';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';

export interface CreateTaskData {
    message: string;
    assigned_to?: string;
    task_type?: string;
    priority?: number;
    due_date?: string;
    lead_id?: string;
    attachment_ids?: string[];
    attachments?: File[];
}

export interface UseCreateTaskOptions {
    emailId: string;
    onSuccess?: () => void;
    onError?: (error: any) => void;
}

export function useCreateTask({ emailId, onSuccess, onError }: UseCreateTaskOptions) {
    const queryClient = useQueryClient();
    const createTask = useCallback(
        async (data: CreateTaskData) => {
            const formData = new FormData();

            formData.append('message', data.message);
            if (data.assigned_to) formData.append('assigned_to', data.assigned_to);
            if (data.task_type) formData.append('task_type', data.task_type);
            if (data.priority) formData.append('priority', String(data.priority));
            if (data.due_date) formData.append('due_date', data.due_date);
            if (data.lead_id) formData.append('lead_id', data.lead_id);

            if (data.attachment_ids?.length) {
                data.attachment_ids.forEach((id) => formData.append('attachment_ids', id));
            }

            if (data.attachments?.length) {
                data.attachments.forEach((file) => formData.append('attachments', file));
            }

            const response = await AxiosBase.post(`/email-system/${emailId}/tasks`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            return response.data;
        },
        [emailId]
    );

    const mutation = useMutation({
        mutationFn: createTask,
        onSuccess: () => {
            toast.push(
                <Notification title="Success" type="success">
                    Task created successfully
                </Notification>,

            );
            queryClient.invalidateQueries({ queryKey: ['email-tasks', emailId] });
            queryClient.invalidateQueries({ queryKey: ['todos'] });
            onSuccess?.();
        },
        onError: (error: any) => {
            const errorMessage = error?.response?.data?.error || error?.message || 'Failed to create task';
            toast.push(
                <Notification title="Error" type="danger">
                    {errorMessage}
                </Notification>,

            );
            onError?.(error);
        },
    });

    return {
        createTask: mutation.mutate,
        createTaskAsync: mutation.mutateAsync,
        isPending: mutation.isPending,
        isError: mutation.isError,
        error: mutation.error,
    };
}

