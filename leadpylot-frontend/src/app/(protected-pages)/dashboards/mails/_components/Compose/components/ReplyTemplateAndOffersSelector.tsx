import { EmailTemplateSelector } from '@/app/(protected-pages)/dashboards/leads/[id]/_components/LeadAdditionalInfo/components/EmailTemplateSelector';
import {
  OffersSelector,
  OrderedOffer,
} from '@/app/(protected-pages)/dashboards/leads/[id]/_components/LeadAdditionalInfo/components/OffersSelector';

interface ReplyTemplateAndOffersSelectorProps {
  leadId?: string;
  selectedTemplateId: string;
  onTemplateChange: (templateId: string | null) => void;
  templatesLoading: boolean;
  emailTemplates: any;
  selectedOffers: OrderedOffer[];
  onOffersChange: (offers: OrderedOffer[]) => void;
  offers: any[];
}

export const ReplyTemplateAndOffersSelector = ({
  leadId,
  selectedTemplateId,
  onTemplateChange,
  templatesLoading,
  emailTemplates,
  selectedOffers,
  onOffersChange,
  offers,
}: ReplyTemplateAndOffersSelectorProps) => {
  const leadHasOffers = Array.isArray(offers) && offers.length > 0;

  const selectedTemplate = emailTemplates?.data?.find(
    (template: any) => template._id === selectedTemplateId
  );
  const maxOffers = selectedTemplate?.how_many_offers
    ? parseInt(selectedTemplate.how_many_offers, 10)
    : undefined;

  return (
    <div className="mb-3 flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 md:p-4">
      <div className="grid gap-3 md:grid-cols-2">
        <EmailTemplateSelector
          selectedTemplateId={selectedTemplateId}
          onTemplateChange={onTemplateChange}
          templatesLoading={templatesLoading}
          emailTemplates={emailTemplates}
        />
        {selectedTemplateId && leadHasOffers && (
          <OffersSelector
            leadId={leadId}
            selectedOffers={selectedOffers}
            onOffersChange={onOffersChange}
            offers={offers}
            maxOffers={maxOffers}
          />
        )}
      </div>
      {!leadHasOffers && (
        <p className="text-xs text-slate-500">
          No active offers available for this lead. Template selection will still be applied.
        </p>
      )}
    </div>
  );
};
