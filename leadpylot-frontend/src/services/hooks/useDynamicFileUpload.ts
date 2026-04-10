import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiUploadFiles, apiUploadFilesWithSingleType, apiUploadFilesToDocuments } from '../FileUploadService';
import type { FileUploadData, FileUploadResponse } from '../FileUploadService';
import { apiCloudinaryUploadSingle, type CloudinaryUploadResult } from '../AttachmentService';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import React from 'react';

interface UseDynamicFileUploadOptions {
    onSuccess?: (response: FileUploadResponse) => void;
    onError?: (error: any) => void;
    invalidateQueries?: string[];
    showNotifications?: boolean;
}

/**
 * Dynamic File Upload Hook
 * 
 * This hook provides a unified way to upload files to any entity
 * using the dynamic file upload service
 * 
 * @param options - Configuration options for the hook
 * @returns Mutation object with upload function and state
 */
export const useDynamicFileUpload = (options?: UseDynamicFileUploadOptions) => {
    const queryClient = useQueryClient();
    const {
        onSuccess,
        onError,
        invalidateQueries = [],
        showNotifications = true,
    } = options || {};

    const successNotification = React.createElement(
        Notification,
        { title: 'Files uploaded', type: 'success' },
        'Files uploaded successfully'
    );

    const errorNotification = React.createElement(
        Notification,
        { title: 'Upload failed', type: 'danger' },
        'Failed to upload files. Please try again.'
    );

    return useMutation<FileUploadResponse, any, { tableName: string; id: string; data: FileUploadData }>({
        mutationFn: ({ tableName, id, data }) => apiUploadFiles(tableName, id, data),
        onSuccess: (response) => {
            // Invalidate relevant queries
            invalidateQueries.forEach((queryKey) => {
                queryClient.invalidateQueries({ queryKey: [queryKey] });
            });

            // Show success notification if enabled
            if (showNotifications) {
                toast.push(successNotification);
            }

            // Call custom success handler if provided
            if (onSuccess) {
                onSuccess(response);
            }
        },
        onError: (error) => {
            // Show error notification if enabled
            if (showNotifications) {
                toast.push(errorNotification);
            }

            // Call custom error handler if provided
            if (onError) {
                onError(error);
            }
        },
    });
};

/**
 * Simplified hook for uploading files with a single document type
 * 
 * @param options - Configuration options for the hook
 * @returns Mutation object with upload function and state
 */
export const useDynamicFileUploadWithSingleType = (options?: UseDynamicFileUploadOptions) => {
    const queryClient = useQueryClient();
    const {
        onSuccess,
        onError,
        invalidateQueries = [],
        showNotifications = true,
    } = options || {};

    const successNotification = React.createElement(
        Notification,
        { title: 'Files uploaded', type: 'success' },
        'Files uploaded successfully'
    );

    const errorNotification = React.createElement(
        Notification,
        { title: 'Upload failed', type: 'danger' },
        'Failed to upload files. Please try again.'
    );

    return useMutation<FileUploadResponse, any, { tableName: string; id: string; files: File[]; documentType: string }>({
        mutationFn: ({ tableName, id, files, documentType }) =>
            apiUploadFilesWithSingleType(tableName, id, files, documentType),
        onSuccess: (response) => {
            // Invalidate relevant queries
            invalidateQueries.forEach((queryKey) => {
                queryClient.invalidateQueries({ queryKey: [queryKey] });
            });

            // Show success notification if enabled
            if (showNotifications) {
                toast.push(successNotification);
            }

            // Call custom success handler if provided
            if (onSuccess) {
                onSuccess(response);
            }
        },
        onError: (error) => {
            // Show error notification if enabled
            if (showNotifications) {
                toast.push(errorNotification);
            }

            // Call custom error handler if provided
            if (onError) {
                onError(error);
            }
        },
    });
};

/**
 * Hook for uploading a single file to Cloudinary
 * POST /attachments/cloudinary/upload  { file }
 * Returns { documentId, public_url } on success.
 */
export const useCloudinaryUploadSingle = (options?: {
    onSuccess?: (result: CloudinaryUploadResult) => void;
    onError?: (error: any) => void;
    showNotifications?: boolean;
}) => {
    const { onSuccess, onError, showNotifications = true } = options || {};

    return useMutation<CloudinaryUploadResult, any, File>({
        mutationFn: (file: File) => apiCloudinaryUploadSingle(file),
        onSuccess: (result) => {
            if (showNotifications) {
                toast.push(
                    React.createElement(
                        Notification,
                        { title: 'Image uploaded', type: 'success' },
                        'Image uploaded successfully'
                    )
                );
            }
            onSuccess?.(result);
        },
        onError: (error) => {
            if (showNotifications) {
                toast.push(
                    React.createElement(
                        Notification,
                        { title: 'Upload failed', type: 'danger' },
                        error?.response?.data?.message || error?.message || 'Failed to upload image'
                    )
                );
            }
            onError?.(error);
        },
    });
};

/**
 * Hook for uploading files to entity documents endpoint
 * 
 * @param options - Configuration options for the hook
 * @returns Mutation object with upload function and state
 */
export const useDynamicFileUploadToDocuments = (options?: UseDynamicFileUploadOptions) => {
    const queryClient = useQueryClient();
    const {
        onSuccess,
        onError,
        invalidateQueries = [],
        showNotifications = true,
    } = options || {};

    const successNotification = React.createElement(
        Notification,
        { title: 'Files uploaded', type: 'success' },
        'Files uploaded successfully'
    );

    const errorNotification = React.createElement(
        Notification,
        { title: 'Upload failed', type: 'danger' },
        'Failed to upload files. Please try again.'
    );

    return useMutation<FileUploadResponse, any, { tableName: string; id: string; data: FileUploadData }>({
        mutationFn: ({ tableName, id, data }) => apiUploadFilesToDocuments(tableName, id, data),
        onSuccess: (response) => {
            // Invalidate relevant queries
            invalidateQueries.forEach((queryKey) => {
                queryClient.invalidateQueries({ queryKey: [queryKey] });
            });

            // Show success notification if enabled
            if (showNotifications) {
                toast.push(successNotification);
            }

            // Call custom success handler if provided
            if (onSuccess) {
                onSuccess(response);
            }
        },
        onError: (error) => {
            // Show error notification if enabled
            if (showNotifications) {
                toast.push(errorNotification);
            }

            // Call custom error handler if provided
            if (onError) {
                onError(error);
            }
        },
    });
}; 