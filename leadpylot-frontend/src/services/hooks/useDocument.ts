import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  apiFetchDocument,
  apiFetchLibraryDocuments,
  apiUploadLibraryDocuments,
  apiAssignDocumentsToOffer,
  apiAssignDocumentsToLead,
  apiBulkDeleteLibraryDocuments,
  apiRestoreLibraryDocuments,
} from '../DocumentService';
import useNotification from '@/utils/hooks/useNotification';

export const useDocument = (documentId?: string) =>
  useQuery({
    queryKey: ['document', documentId],
    queryFn: () => apiFetchDocument(documentId!),
    enabled: !!documentId,
  });

export const useDoumentLibrary = (params?: any) => {
  return useQuery({
    queryKey: ['document-library', params],
    queryFn: () => apiFetchLibraryDocuments(params),
  });
};

export const useUploadLibraryDocuments = () => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();
  return useMutation({
    mutationFn: (files: File[]) => apiUploadLibraryDocuments(files),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['document-library'] });
      openNotification({
        type: 'success',
        massage: data?.data?.message || data?.message || 'Document uploaded successfully',
      });
    },
    onError: (error: any) => {
      openNotification({
        type: 'danger',
        massage: error?.message || 'Failed to upload document',
      });
    },
  });
};

export const useAssignDocumentsToOffer = () => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();
  return useMutation({
    mutationFn: ({
      documentIds,
      offerId,
      type,
    }: {
      documentIds: string[];
      offerId: string;
      type: string;
    }) => apiAssignDocumentsToOffer(documentIds, offerId, type),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['document-library'] });
      openNotification({
        type: 'success',
        massage: data?.data?.message || data?.message || 'Documents assigned to offer successfully',
      });
    },
    onError: (error: any) => {
      openNotification({
        type: 'danger',
        massage: error?.message || 'Failed to assign documents to offer',
      });
    },
  });
};

export const useAssignDocumentsToLead = () => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();
  return useMutation({
    mutationFn: ({
      documentIds,
      leadIdentifier,
    }: {
      documentIds: string[];
      leadIdentifier: string;
    }) => apiAssignDocumentsToLead(documentIds, leadIdentifier),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['document-library'] });
      openNotification({
        type: 'success',
        massage: data?.data?.message || data?.message || 'Documents assigned to lead successfully',
      });
    },
    onError: (error: any) => {
      openNotification({
        type: 'danger',
        massage: error?.message || 'Failed to assign documents to lead',
      });
    },
  });
};

export const useBulkDeleteLibraryDocuments = () => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();
  return useMutation({
    mutationFn: (data: { ids: string[]; unassign: boolean; permanent?: boolean }) =>
      apiBulkDeleteLibraryDocuments(data),
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['document-library'] });
      const { data } = response;
      const failureCount = data?.failureCount || 0;

      let message = response?.message || 'Bulk delete operation completed.';
      if (failureCount > 0) {
        const firstError = data?.failed?.[0]?.error || 'An unknown error occurred.';
        message = `${failureCount} document(s) failed to delete. ${firstError}`;
      }

      openNotification({
        type: failureCount > 0 ? 'danger' : 'success',
        massage: message,
      });
    },
    onError: (error: any) => {
      openNotification({
        type: 'danger',
        massage: error?.response?.data?.error || error?.response?.data?.message || 'Failed to delete documents',
      });
    },
  });
};

export const useRestoreLibraryDocuments = () => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();
  return useMutation({
    mutationFn: (ids: string[]) => apiRestoreLibraryDocuments(ids),
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['document-library'] });
      openNotification({
        type: 'success',
        massage: response?.message || 'Document(s) restored successfully',
      });
    },
    onError: (error: any) => {
      openNotification({
        type: 'danger',
        massage: error?.response?.data?.message || error?.message || 'Failed to restore documents',
      });
    },
  });
};
