import { useEffect } from 'react';
import { OrderedOffer } from '../components/OffersSelector';

interface UseMaxOffersEnforcementParams {
  selectedTemplateId: string;
  emailTemplates: any;
  selectedOffers: OrderedOffer[];
  setSelectedOffers: (offers: OrderedOffer[]) => void;
}

/**
 * Hook to enforce max offers limit when template changes
 */
export const useMaxOffersEnforcement = ({
  selectedTemplateId,
  emailTemplates,
  selectedOffers,
  setSelectedOffers,
}: UseMaxOffersEnforcementParams) => {
  useEffect(() => {
    if (!selectedTemplateId || !emailTemplates?.data) return;

    const selectedTemplate = emailTemplates.data.find(
      (template: any) => template._id === selectedTemplateId
    );
    const howMany =
      selectedTemplate?.how_many_offers ?? (selectedTemplate as any)?.info?.how_many_offers;
    const maxOffers =
      howMany !== undefined && howMany !== null
        ? typeof howMany === 'number'
          ? howMany
          : parseInt(String(howMany), 10)
        : undefined;

    // If maxOffers is set and user has more offers selected than allowed, trim the selection
    if (maxOffers !== undefined && maxOffers > 0 && selectedOffers.length > maxOffers) {
      const trimmedOffers = [...selectedOffers]
        .sort((a, b) => a.order - b.order)
        .slice(0, maxOffers)
        .map((offer, index) => ({
          ...offer,
          order: index + 1,
        }));
      setSelectedOffers(trimmedOffers);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTemplateId, emailTemplates?.data]);
};

