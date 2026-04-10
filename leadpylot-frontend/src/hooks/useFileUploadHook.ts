import { useCallback, useState } from 'react';
import { useDynamicFileUploadToDocuments } from '@/services/hooks/useDynamicFileUpload';

/**
 * Simple File Upload Hook with per-operation loading state
 * 
 * Usage:
 * const { uploadFiles, isUploading } = useFileUploadHook(['offers', 'leads']);
 * await uploadFiles('offers', 'offer-id', files, 'contract');
 * // Check isUploading('offer-id', 'contract', 'offers') for specific operation
 */
export const useFileUploadHook = (invalidateQueries: string[] = []) => {
    const fileUploadMutation = useDynamicFileUploadToDocuments({
        invalidateQueries,
    });

    // Track loading state per operation using a combination of id, documentType, and table
    const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

    // Helper function to generate loading key - now includes table name for more granular tracking
    const getLoadingKey = (id: string, documentType: string, table: string) => `${table}-${id}-${documentType}`;

    // Helper function to check if a specific operation is loading
    const isUploading = useCallback((id: string, documentType: string, table: string) => {
        const key = getLoadingKey(id, documentType, table);
        return loadingStates[key] || false;
    }, [loadingStates]);

    const uploadFiles = useCallback(
        async (tableName: string, id: string, files: File[], documentType: string) => {
            if (!files || files.length === 0) return;

            const loadingKey = getLoadingKey(id, documentType, tableName);

            try {
                // Set loading state for this specific operation
                setLoadingStates(prev => ({ ...prev, [loadingKey]: true }));

                const res = await fileUploadMutation.mutateAsync({
                    tableName,
                    id,
                    data: {
                        files,
                        documentTypes: [documentType],
                    },
                });
                return res;
            } catch (error) {
                console.error('Error uploading files:', error);
            } finally {
                // Clear loading state for this specific operation
                setLoadingStates(prev => ({ ...prev, [loadingKey]: false }));
            }
        },
        [fileUploadMutation]
    );

    return {
        uploadFiles,
        isUploading,
        uploadMutation: fileUploadMutation, // Expose the full mutation for more control
    };
}; 