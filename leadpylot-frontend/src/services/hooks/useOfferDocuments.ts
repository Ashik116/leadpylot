import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  uploadOfferDocuments,
  deleteOfferDocument,
  getOfferDocuments,
  UploadOfferDocumentsResponse,
} from '../OffersService';
import useNotification from '@/utils/hooks/useNotification';

/**
 * Hook to get documents for a specific offer
 */
export const useOfferDocuments = (offerId?: string) => {
  return useQuery({
    queryKey: ['offerDocuments', offerId],
    queryFn: () => getOfferDocuments(offerId!),
    enabled: !!offerId,
    // 5 minutes
  });
};

/**
 * Hook to upload documents to an offer
 */
export const useUploadOfferDocuments = () => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  return useMutation({
    mutationFn: ({
      offerId,
      files,
      documentType,
    }: {
      offerId: string;
      files: File[];
      documentType: string;
    }) => uploadOfferDocuments(offerId, files, documentType),
    onSuccess: (data: UploadOfferDocumentsResponse, variables) => {
      // Invalidate and refetch offer documents
      queryClient.invalidateQueries({
        queryKey: ['offerDocuments', variables.offerId],
      });

      openNotification({
        type: 'success',
        massage: data.message || 'Documents uploaded successfully',
      });
    },
    onError: (error: any) => {
      openNotification({
        type: 'danger',
        massage: error?.message || 'Failed to upload documents',
      });
    },
  });
};

/**
 * Hook to delete a document from an offer
 */
export const useDeleteOfferDocument = () => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  return useMutation({
    mutationFn: ({ offerId, documentId }: { offerId: string; documentId: string }) =>
      deleteOfferDocument(offerId, documentId),
    onSuccess: (data: { success: boolean; message: string }, variables) => {
      // Invalidate and refetch offer documents
      queryClient.invalidateQueries({
        queryKey: ['offerDocuments', variables.offerId],
      });

      openNotification({
        type: 'success',
        massage: data.message || 'Document deleted successfully',
      });
    },
    onError: (error: any) => {
      openNotification({
        type: 'danger',
        massage: error?.message || 'Failed to delete document',
      });
    },
  });
};
