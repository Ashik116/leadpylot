import { useEffect, useState } from 'react';
import { OrderedOffer } from '@/app/(protected-pages)/dashboards/leads/[id]/_components/LeadAdditionalInfo/components/OffersSelector';

interface UsePreviewVisibilityParams {
  selectedTemplateId: string;
  leadHasOffers: boolean;
  selectedOffers: OrderedOffer[];
}

/**
 * Hook to manage preview visibility based on template and offers selection
 */
export const usePreviewVisibility = ({
  selectedTemplateId,
  leadHasOffers,
  selectedOffers,
}: UsePreviewVisibilityParams) => {
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (selectedTemplateId) {
      if (leadHasOffers) {
        // If lead has offers, show preview when at least one offer is selected
        setShowPreview(selectedOffers.length > 0);
      } else {
        // If lead has no offers, show preview immediately after template selection
        setShowPreview(true);
      }
    } else {
      // No template selected, hide preview
      setShowPreview(false);
    }
  }, [selectedTemplateId, leadHasOffers, selectedOffers.length]);

  return showPreview;
};

