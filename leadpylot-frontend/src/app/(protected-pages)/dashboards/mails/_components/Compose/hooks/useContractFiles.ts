import { useEffect } from 'react';
import { OrderedOffer } from '@/app/(protected-pages)/dashboards/leads/[id]/_components/LeadAdditionalInfo/components/OffersSelector';
import { Attachment } from '@/app/(protected-pages)/dashboards/leads/[id]/_components/LeadAdditionalInfo/hooks/useEmailAttachments';
import { LeadWithOffers } from '../utils/leadUtils';

interface UseContractFilesParams {
  selectedOffers: OrderedOffer[];
  selectedLead: LeadWithOffers | null;
  addAttachments: (attachments: Attachment[]) => void;
  formatFileSize: (size: number) => string;
}

/**
 * Hook to automatically attach contract files when offers are selected
 */
export const useContractFiles = ({
  selectedOffers,
  selectedLead,
  addAttachments,
  formatFileSize,
}: UseContractFilesParams) => {
  useEffect(() => {
    if (!selectedOffers.length || !selectedLead) return;

    // Get selected offer IDs
    const selectedOfferIds = new Set(selectedOffers.map((offer) => offer.id));

    // Find matching offers from selectedLead.offers
    const leadOffers = selectedLead.offers || [];
    const matchingOffers = leadOffers.filter((offer) => selectedOfferIds.has(offer._id));

    // Extract contract files from ALL selected offers
    const contractFilesMap = new Map<string, any>();

    matchingOffers.forEach((offer) => {
      if (offer.files && Array.isArray(offer.files)) {
        offer.files.forEach((file) => {
          // Check if file is a contract (type === 'contract' or 'offer-contract')
          // Handle both transformed format (file.type) and nested format (file.document.type)
          const fileType = file.type || file.document?.type || '';

          if (fileType === 'contract' || fileType === 'offer-contract') {
            // Use the file structure directly (already transformed by backend)
            const fileData = file.document || file;

            if (fileData && fileData._id) {
              const fileId = fileData._id.toString();

              // Type guard: check if fileData has document structure or direct structure
              const filename =
                (fileData as any).filename || (fileData as any).document?.filename || '';
              const filetype =
                (fileData as any).filetype ||
                (fileData as any).document?.filetype ||
                'application/pdf';
              const size = (fileData as any).size || (fileData as any).document?.size || 0;
              const type = (fileData as any).type || fileType;

              if (!contractFilesMap.has(fileId) && filename) {
                contractFilesMap.set(fileId, {
                  id: fileId,
                  filename,
                  filetype,
                  size,
                  type,
                });
              }
            }
          }
        });
      }
    });

    // Convert map to array and add all contract files to attachments in a single batch
    const contractFilesArray = Array.from(contractFilesMap.values());

    if (contractFilesArray.length > 0) {
      // Convert to Attachment format and add all at once
      const attachmentsToAdd = contractFilesArray.map((contractFile) => ({
        id: contractFile.id,
        name: contractFile.filename,
        type: 'document' as const,
        size: formatFileSize(contractFile.size),
        file: new File([], contractFile.filename, {
          type: contractFile.filetype,
        }),
      }));

      // Add all contract files in a single batch operation
      addAttachments(attachmentsToAdd);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOffers, selectedLead]);
};
