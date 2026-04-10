import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  apiGetSlotsMetadata,
  apiGetOfferDocumentSlots,
  apiPinEmailToOfferSlot,
  apiPinToSlotBulkMultiOffer,
  apiPinEmailToLeadLastEmail,
  apiGetLeadLastEmail,
  apiDeleteSlotDocument,
  apiDeleteSlotEmail,
  type DocumentSlotsMetadataResponse,
  type OfferDocumentSlotsResponse,
} from '../DocumentSlotsService';
import useNotification from '@/utils/hooks/useNotification';

export const useDocumentSlotsMetadata = () => {
  return useQuery<DocumentSlotsMetadataResponse>({
    queryKey: ['document-slots-metadata'],
    queryFn: apiGetSlotsMetadata,
    staleTime: Infinity, // Metadata doesn't change often
  });
};

export const useOfferDocumentSlots = (offerId?: string, enabled = true) => {
  return useQuery<OfferDocumentSlotsResponse>({
    queryKey: ['offer-document-slots', offerId],
    queryFn: () => {
      if (!offerId) throw new Error('Offer ID is required');
      return apiGetOfferDocumentSlots(offerId);
    },
    enabled: enabled && !!offerId,
    staleTime: 60_000, // 1 min - avoid repeated GET on row click/checkbox (mutations still invalidate)
  });
};

export const usePinEmailToOfferSlot = () => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  return useMutation({
    mutationFn: ({
      offerId,
      slotName,
      emailId,
    }: {
      offerId: string;
      slotName: string;
      emailId: string;
    }) => apiPinEmailToOfferSlot(offerId, slotName, emailId),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ['offer-document-slots', variables.offerId] });
      queryClient.invalidateQueries({ queryKey: ['opening', variables.offerId] });
      openNotification({
        type: 'success',
        massage: response.message || 'Email pinned to slot successfully',
      });
    },
    onError: (error: any) => {
      openNotification({
        type: 'danger',
        massage: error?.response?.data?.message || 'Failed to pin email to slot',
      });
    },
  });
};

export const usePinToSlotBulk = () => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  return useMutation({
    mutationFn: ({
      offerId,
      offerIds,
      slotName,
      documentIds,
      emailId,
    }: {
      offerId?: string;
      offerIds?: string[];
      slotName: string;
      documentIds: string[];
      emailId?: string;
    }) =>
      apiPinToSlotBulkMultiOffer(slotName, {
        offer_ids: offerIds ?? (offerId ? [offerId] : []),
        document_ids: documentIds,
        ...(emailId ? { email_ids: [emailId] } : {}),
      }),
    onSuccess: (response, variables) => {
      // Invalidate offer document slots for each offer (or all when using offerIds)
      const offerIdsToInvalidate = variables.offerIds ?? (variables.offerId ? [variables.offerId] : []);
      offerIdsToInvalidate.forEach((id) => {
        queryClient.invalidateQueries({ queryKey: ['offer-document-slots', id] });
      });
      if (offerIdsToInvalidate.length === 0) {
        queryClient.invalidateQueries({ queryKey: ['offer-document-slots'] });
      }
      // Invalidate lead to refetch
      queryClient.invalidateQueries({ queryKey: ['lead'] });
      // Invalidate opening for each document (opening) id
      variables.documentIds?.forEach((docId) => {
        queryClient.invalidateQueries({ queryKey: ['opening', docId] });
      });
      queryClient.invalidateQueries({ queryKey: ['offers-progress'] });
      openNotification({
        type: 'success',
        massage: response.message || 'Documents and email pinned to slot successfully',
      });
    },
    onError: (error: any) => {
      openNotification({
        type: 'danger',
        massage: error?.response?.data?.message || 'Failed to pin to slot',
      });
    },
  });
};

export const usePinEmailToLeadLastEmail = () => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  return useMutation({
    mutationFn: ({ leadId, emailId }: { leadId: string; emailId: string }) =>
      apiPinEmailToLeadLastEmail(leadId, emailId),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lead-last-email', variables.leadId] });
      openNotification({
        type: 'success',
        massage: response.message || 'Email pinned to last email successfully',
      });
    },
    onError: (error: any) => {
      openNotification({
        type: 'danger',
        massage: error?.response?.data?.message || 'Failed to pin email',
      });
    },
  });
};

export const useLeadLastEmail = (leadId?: string, enabled = true) => {
  return useQuery({
    queryKey: ['lead-last-email', leadId],
    queryFn: () => {
      if (!leadId) throw new Error('Lead ID is required');
      return apiGetLeadLastEmail(leadId);
    },
    enabled: enabled && !!leadId,
  });
};

export const useDeleteSlotDocument = () => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  return useMutation({
    mutationFn: ({
      offerId,
      slotName,
      documentId,
      documentType,
    }: {
      offerId: string;
      slotName: string;
      documentId: string;
      documentType?: 'documents' | 'emails';
    }) => apiDeleteSlotDocument(offerId, slotName, documentId, documentType),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ['offer-document-slots', variables.offerId] });
      queryClient.invalidateQueries({ queryKey: ['opening', variables.offerId] });
      openNotification({
        type: 'success',
        massage: response.message || 'Document removed from slot successfully',
      });
    },
    onError: (error: any) => {
      openNotification({
        type: 'danger',
        massage: error?.response?.data?.message || 'Failed to remove document from slot',
      });
    },
  });
};

export const useDeleteSlotEmail = () => {
  const queryClient = useQueryClient();
  const { openNotification } = useNotification();

  return useMutation({
    mutationFn: ({
      offerId,
      slotName,
      emailId,
    }: {
      offerId: string;
      slotName: string;
      emailId: string;
    }) => apiDeleteSlotEmail(offerId, slotName, emailId),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: ['offer-document-slots', variables.offerId] });
      queryClient.invalidateQueries({ queryKey: ['opening', variables.offerId] });
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      queryClient.invalidateQueries({ queryKey: ['openings'] });
      queryClient.invalidateQueries({ queryKey: ['offers-progress'] });
      queryClient.invalidateQueries({ queryKey: ['offers-progress-all'] });
      openNotification({
        type: 'success',
        massage: response.message || 'Email removed from slot successfully',
      });
    },
    onError: (error: any) => {
      openNotification({
        type: 'danger',
        massage: error?.response?.data?.message || 'Failed to remove email from slot',
      });
    },
  });
};
