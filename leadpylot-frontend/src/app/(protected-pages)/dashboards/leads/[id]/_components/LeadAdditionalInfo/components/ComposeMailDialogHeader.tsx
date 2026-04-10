import ApolloIcon from '@/components/ui/ApolloIcon';
import { EmailTemplateSelector } from './EmailTemplateSelector';
import { MailServerSelector } from './MailServerSelector';
import { OffersSelector, OrderedOffer } from './OffersSelector';
import { TLead } from '@/services/LeadsService';
import Button from '@/components/ui/Button';
import RoleGuard from '@/components/shared/RoleGuard';
// extra 

interface ComposeMailDialogHeaderProps {
  closeButton: boolean;
  onClose: () => void;
  selectedMailServer: string;
  onMailServerChange: (serverId: string) => void;
  isLoadingServers: boolean;
  servers: any;
  selectedTemplateId: string;
  onTemplateChange: (templateId: string | null) => void;
  templatesLoading: boolean;
  emailTemplates: any;
  leadId?: string;
  selectedOffers: OrderedOffer[];
  onOffersChange: (offers: OrderedOffer[]) => void;
  lead?: TLead;
}

export const ComposeMailDialogHeader = ({
  closeButton,
  onClose,
  selectedMailServer,
  onMailServerChange,
  isLoadingServers,
  servers,
  selectedTemplateId,
  onTemplateChange,
  templatesLoading,
  emailTemplates,
  leadId,
  selectedOffers,
  onOffersChange,
  lead,
}: ComposeMailDialogHeaderProps) => {
  // Get the selected template's how_many_offers value
  const selectedTemplate = emailTemplates?.data?.find((template: any) => template._id === selectedTemplateId);
  const howMany = selectedTemplate?.how_many_offers ?? (selectedTemplate as any)?.info?.how_many_offers;

  const maxOffers =
    howMany !== undefined && howMany !== null
      ? typeof howMany === 'number'
        ? howMany
        : parseInt(String(howMany), 10)
      : undefined;

  return (
    <div className="flex flex-col gap-2 px-2 py-2 md:px-3 md:py-2">
      {/* Title Row */}
      <div className="flex items-center justify-between border-b border-gray-200 ">
        <div className="flex items-center gap-2">
          {closeButton && (
            <Button
              variant="plain"
              size="xs"
              onClick={onClose}

            >
              <ApolloIcon name="arrow-left" className="text-sm" />
            </Button>
          )}
          <h3 className="font-semibold text-slate-600 text-sm">Compose Email</h3>
        </div>
      </div>

      {/* Selectors Row - Stacked on mobile, horizontal on desktop */}
      <div className="flex w-full flex-wrap gap-2 text-xs">
        <RoleGuard>
          <div className="w-full flex-1 md:w-auto md:min-w-[140px]">
            <MailServerSelector
              selectedMailServer={selectedMailServer}
              onMailServerChange={onMailServerChange}
              isLoadingServers={isLoadingServers}
              servers={servers}
            />
          </div>
        </RoleGuard>
        <div className="w-full flex-1 md:w-auto md:min-w-[140px]">
          <EmailTemplateSelector
            selectedTemplateId={selectedTemplateId}
            onTemplateChange={onTemplateChange}
            templatesLoading={templatesLoading}
            emailTemplates={emailTemplates}
          />
        </div>
        {selectedTemplateId && (
          <div className="w-full flex-1 md:w-auto md:min-w-[140px]">
            <OffersSelector
              leadId={leadId}
              selectedOffers={selectedOffers}
              onOffersChange={onOffersChange}
              offers={lead?.offers?.filter((offer: any) => offer.active === true) || []}
              maxOffers={maxOffers}
            />
          </div>
        )}
      </div>
    </div>
  );
};

