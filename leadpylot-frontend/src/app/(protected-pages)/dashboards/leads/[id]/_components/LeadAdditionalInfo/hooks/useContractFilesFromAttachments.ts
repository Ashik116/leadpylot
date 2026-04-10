import { useEffect } from 'react';
import { OrderedOffer } from '../components/OffersSelector';
import { Attachment } from './useEmailAttachments';

interface UseContractFilesFromAttachmentsParams {
  selectedOffers: OrderedOffer[];
  leadAttachmentsData: any;
  addAttachments: (attachments: Attachment[]) => void;
  removeAttachmentsByIds: (ids: string[]) => void;
  formatFileSize: (size: number) => string;
}

/**
 * Hook to automatically attach/remove contract files from leadAttachmentsData when offers are selected/deselected
 * Adds contract docs for selected offers; removes contract docs when offers are deselected
 */
export const useContractFilesFromAttachments = ({
  selectedOffers,
  leadAttachmentsData,
  addAttachments,
  removeAttachmentsByIds,
  formatFileSize,
}: UseContractFilesFromAttachmentsParams) => {
  useEffect(() => {
    if (!leadAttachmentsData?.data?.attachments) return;

    const selectedOfferIds = new Set(selectedOffers.map((offer) => offer.id));

    // Build map of contract doc id -> offer id from leadAttachmentsData
    const contractDocIdToOfferId = new Map<string, string>();
    const contractFilesMap = new Map<string, any>();

    leadAttachmentsData.data.attachments.forEach((doc: any) => {
      const docOfferId = doc.offer_id || doc.offerId || doc.metadata?.offerId;
      const docType = doc.type || '';

      if (docOfferId && (docType === 'contract' || docType === 'offer-contract')) {
        const offerIdStr = docOfferId.toString();
        contractDocIdToOfferId.set(doc.id, offerIdStr);

        if (selectedOfferIds.has(offerIdStr)) {
          if (!contractFilesMap.has(doc.id)) {
            contractFilesMap.set(doc.id, {
              id: doc.id,
              filename: doc.filename,
              filetype: doc.filetype || 'application/pdf',
              size: doc.size || 0,
              type: docType,
            });
          }
        }
      }
    });

    // Remove contract attachments whose offer is no longer selected
    const idsToRemove: string[] = [];
    contractDocIdToOfferId.forEach((offerId, docId) => {
      if (!selectedOfferIds.has(offerId)) {
        idsToRemove.push(docId);
      }
    });
    if (idsToRemove.length > 0) {
      removeAttachmentsByIds(idsToRemove);
    }

    // Add contract files for selected offers
    if (contractFilesMap.size > 0) {
      const attachmentsToAdd = Array.from(contractFilesMap.values()).map((contractFile) => ({
        id: contractFile.id,
        name: contractFile.filename,
        type: 'document' as const,
        size: formatFileSize(contractFile.size),
        file: new File([], contractFile.filename, {
          type: contractFile.filetype,
        }),
      }));
      addAttachments(attachmentsToAdd);
    }
  }, [selectedOffers, leadAttachmentsData, addAttachments, removeAttachmentsByIds, formatFileSize]);
};

