import { Lead } from '@/services/LeadsService';
import { LeadSearchInput, LeadList, SelectedLeadCard } from '../../Actions/AssignToLeadModal/index';
import { MailServerSelector } from '@/app/(protected-pages)/dashboards/leads/[id]/_components/LeadAdditionalInfo/components/MailServerSelector';
import { EmailTemplateSelector } from '@/app/(protected-pages)/dashboards/leads/[id]/_components/LeadAdditionalInfo/components/EmailTemplateSelector';
import {
  OffersSelector,
  OrderedOffer,
} from '@/app/(protected-pages)/dashboards/leads/[id]/_components/LeadAdditionalInfo/components/OffersSelector';
import { LeadWithOffers, hasActiveOffers, getActiveOffers } from '../utils/leadUtils';

interface ComposeModalHeaderProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  debouncedSearchTerm: string;
  leads: Lead[];
  isLoading: boolean;
  hasResults: boolean;
  selectedLead: LeadWithOffers | null;
  onSelectLead: (lead: Lead) => void;
  onClearLead?: () => void;
  selectedMailServer: string;
  onMailServerChange: (serverId: string) => void;
  isLoadingServers: boolean;
  servers: any;
  selectedTemplateId: string;
  onTemplateChange: (templateId: string | null) => void;
  templatesLoading: boolean;
  emailTemplates: any;
  selectedOffers: OrderedOffer[];
  onOffersChange: (offers: OrderedOffer[]) => void;
}

export const ComposeModalHeader = ({
  searchTerm,
  setSearchTerm,
  debouncedSearchTerm,
  leads,
  isLoading,
  hasResults,
  selectedLead,
  onSelectLead,
  onClearLead,
  selectedMailServer,
  onMailServerChange,
  isLoadingServers,
  servers,
  selectedTemplateId,
  onTemplateChange,
  templatesLoading,
  emailTemplates,
  selectedOffers,
  onOffersChange,
}: ComposeModalHeaderProps) => {
  const leadHasOffers = hasActiveOffers(selectedLead);
  const activeOffers = getActiveOffers(selectedLead);

  // Get the selected template's how_many_offers value
  const selectedTemplate = emailTemplates?.data?.find(
    (template: any) => template._id === selectedTemplateId
  );
  const maxOffers = selectedTemplate?.how_many_offers
    ? parseInt(selectedTemplate.how_many_offers, 10)
    : undefined;

  return (
    <div className="flex flex-col">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Compose Email</h2>
      </div>

      {/* Selectors Row */}
      <div className="flex w-full flex-col gap-1">
        {/* Lead Search */}
        <div className="w-full">
          <LeadSearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            onClear={() => {
              setSearchTerm('');
            }}
          />
          {hasResults && !selectedLead && (
            <div className="">
              <LeadList
                leads={leads}
                selectedLeadId=""
                onSelectLead={onSelectLead}
                isLoading={isLoading}
                searchTerm={debouncedSearchTerm}
              />
            </div>
          )}
          {selectedLead && (
            <SelectedLeadCard
              lead={selectedLead as any}
              onRemove={() => {
                onClearLead?.();
                setSearchTerm('');
              }}
            />
          )}
        </div>

        {/* Mail Server, Email Template, and Offers */}
        <div className={`grid w-full grid-cols-1 gap-2 ${selectedTemplateId && leadHasOffers ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
          <MailServerSelector
            selectedMailServer={selectedMailServer}
            onMailServerChange={onMailServerChange}
            isLoadingServers={isLoadingServers}
            servers={servers}
          />
          <EmailTemplateSelector
            selectedTemplateId={selectedTemplateId}
            onTemplateChange={onTemplateChange}
            templatesLoading={templatesLoading}
            emailTemplates={emailTemplates}
          />
          {selectedTemplateId && leadHasOffers && (
            <OffersSelector
              leadId={selectedLead?._id}
              selectedOffers={selectedOffers}
              onOffersChange={onOffersChange}
              offers={activeOffers as any}
              maxOffers={maxOffers}
            />
          )}
        </div>
      </div>
    </div>
  );
};
