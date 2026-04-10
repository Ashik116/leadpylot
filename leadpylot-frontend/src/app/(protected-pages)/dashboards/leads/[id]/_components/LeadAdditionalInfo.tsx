import { useUpdateLead } from '@/services/hooks/useLeads';
import { useAllProjects } from '@/services/hooks/useProjects';
import { useTodosByLeadId } from '@/services/hooks/useToDo';
import { useOffersProgress } from '@/services/hooks/useOffersProgress';
import { useGeneratedPdfStore } from '@/stores/generatedPdfStore';
import { useEffect, useState } from 'react';
import { useContactUpdate } from '../hooks/useContactUpdate';
import useDisableInteractionLead from '../hooks/useDisableInteractionLead';
import ComposeMailModal from './LeadAdditionalInfo/ComposeMailModal';
import ContactInfoCard from './LeadAdditionalInfo/ContactInfoCard';
import LeadInfoCard from './LeadAdditionalInfo/LeadInfoCard';
import { useEmailViewStore } from '@/stores/emailViewStore';
import RightSidebar from './RightSidebar';
import EmailViewContent from '@/app/(protected-pages)/dashboards/mails/_components/EmailDetail/EmailViewContent';
import BankOfferOpeningTerminTaskHistorySectionTab from './v2/BankOfferOpeningTerminTaskHistorySectionTab';
import { useLeadDetailsContext } from './LeadDetailsContext';
import useNotification from '@/utils/hooks/useNotification';
import useCallWindow from '@/hooks/useCallWindow';
import { TaskType } from './RightSidebar/UpdatesFilterTabs';
import { LeadDetailsBulkActionsProvider } from './v2/LeadDetailsBulkActionsContext';
import { LeadDetailsBulkActionsDialogs } from './v2/LeadDetailsBulkActionsDialogs';
import { chatbotSendMailStore } from '@/stores/chatbotSendMailStore';

const LeadAdditionalInfo = () => {
  const {
    lead,
    leadId,

    showInDialog,

    highlightedEmailId,
    forceEmailTab,
    initialSelectedOpeningId,

    taskTypeFromDialog,
    offerIdFromDialog,
    openingIdFromDialog,
    handleAddOpeningClick,
    onOfferClick,
    onEditOffer,
  } = useLeadDetailsContext();
  const { isOpen, closeComposeMailModal } = chatbotSendMailStore();
  const [composeMailDialogOpen, setComposeMailDialogOpen] = useState(false);
  const { disableInteractionLead } = useDisableInteractionLead(lead as any);
  const { openCallWindow, isConfigured, error: callWindowError } = useCallWindow();
  const { openNotification } = useNotification();
  const { assignedPdfData } = useGeneratedPdfStore();

  // Add contact update functionality
  const { updateContact } = useContactUpdate({
    leadId: lead._id,
  });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    if (isOpen && !composeMailDialogOpen) setComposeMailDialogOpen(true)
  }, [isOpen])
  // Add the mutation hook for updating lead status
  const updateLeadMutation = useUpdateLead(lead._id);

  const { data: todos } = useTodosByLeadId(leadId as string);

  const handleContactUpdate = async (field: string, value: string) => {
    try {
      const updateData = { [field]: value };
      await updateContact(updateData);
    } catch (error) {
      console.error('Failed to update contact:', error);
    }
  };

  const handleBatchContactUpdate = async (changes: Record<string, string>) => {
    try {
      await updateContact(changes);
    } catch (error) {
      console.error('Failed to update contact:', error);
    }
  };

  const handleExpectedRevenueUpdate = async (newValue: string) => {
    try {
      const parseRevenueString = (value: string): number => {
        if (!value || typeof value !== 'string') {
          throw new Error('Invalid revenue value');
        }
        const cleaned = value.toString().trim().toLowerCase();
        if (/^\d+(\.\d+)?$/.test(cleaned)) {
          return parseFloat(cleaned);
        }
        const match = cleaned.match(/^(\d+(?:\.\d+)?)\s*([kmb]?)$/);
        if (!match) {
          throw new Error('Invalid revenue format');
        }
        const [, numberPart, suffix] = match;
        const baseNumber = parseFloat(numberPart);
        if (isNaN(baseNumber)) {
          throw new Error('Invalid revenue number');
        }
        switch (suffix) {
          case 'k':
            return baseNumber * 1000;
          case 'm':
            return baseNumber * 1000000;
          case 'b':
            return baseNumber * 1000000000;
          default:
            return baseNumber;
        }
      };

      const revenue = parseRevenueString(newValue);
      updateLeadMutation.mutate(
        { expected_revenue: revenue },
        {
          onSuccess: () => {
            console.log('Expected revenue updated successfully');
          },
          onError: (error: any) => {
            console.error('Failed to update expected revenue:', error);
          },
        }
      );
    } catch (error) {
      console.error('Failed to update expected revenue:', error);
    }
  };

  const [selectedOpeningId, setSelectedOpeningId] = useState<string | null>(
    initialSelectedOpeningId ? String(initialSelectedOpeningId) : null
  );
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);

  const { data: openingsData } = useOffersProgress({
    search: lead._id,
    has_progress: 'all',
    page: 1,
    limit: 80,
  });

  const { data: allProjects } = useAllProjects({ limit: 100 });

  const handleCallClick = () => {
    // Access voip_extension from lead (may not be in TLead type definition)
    const voipExtension = (lead as any).voip_extension as string | undefined;

    // Check if we have either a VoIP extension or phone number
    // VoIP extension is preferred as it works through FreePBX routing
    if (!lead.phone && !voipExtension) {
      openNotification({
        type: 'warning',
        massage: 'No phone number or VoIP extension available for this lead',
      });
      return;
    }

    if (!isConfigured) {
      openNotification({
        type: 'warning',
        massage: callWindowError || 'VoIP not configured. Please check your settings.',
      });
      return;
    }

    // Open the call in a popup window
    // Pass both voipExtension (preferred) and phone number (fallback)
    const popup = openCallWindow({
      phoneNumber: lead.phone || '',
      contactName: lead.contact_name,
      leadId: lead._id,
      projectId: lead.project?.[0]?._id,
      voipExtension: voipExtension,
    });

    if (!popup) {
      openNotification({
        type: 'warning',
        massage: 'Popup was blocked. Please allow popups for this site.',
      });
    }
  };

  // Check for assigned PDF data and automatically open compose mail dialog
  useEffect(() => {
    if (assignedPdfData && !composeMailDialogOpen) {
      // Use setTimeout to avoid synchronous setState within effect
      const timer = setTimeout(() => {
        setComposeMailDialogOpen(true);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [assignedPdfData, composeMailDialogOpen]);

  useEffect(() => {
    if (!initialSelectedOpeningId) return;
    const timer = setTimeout(() => setSelectedOpeningId(String(initialSelectedOpeningId)), 0);
    return () => clearTimeout(timer);
  }, [initialSelectedOpeningId]);

  const { data: emailViewData } = useEmailViewStore();

  return (
    <LeadDetailsBulkActionsProvider openingsData={openingsData}>
      <LeadDetailsBulkActionsDialogs />
      <div
        className={`grid space-y-2 gap-x-2 transition-all duration-300 ease-in-out lg:space-y-0 ${composeMailDialogOpen ? 'lg:grid-cols-10' : 'md:grid-cols-2'
          } ${showInDialog ? 'h-full grid-rows-1' : ''}`}
      >
        <div
          className={`flex flex-col gap-2 transition-all duration-300 ease-in-out ${composeMailDialogOpen ? 'lg:col-span-5' : 'lg:col-span-1'} ${showInDialog ? 'min-h-0' : 'lg:h-[calc(100dvh-7rem)]'} lg:overflow-y-auto`}
        >
          <div
            className="grid grid-cols-1 gap-2 xl:grid-cols-2"
          >
            <ContactInfoCard
              lead={lead as any}
              onSendEmailClick={() => setComposeMailDialogOpen(true)}
              onCallClick={handleCallClick}
              onContactUpdate={handleContactUpdate}
              onBatchContactUpdate={handleBatchContactUpdate}
              enableInlineEditing={true}
              batchMode={false}
              disableInteractionLead={disableInteractionLead}
            />
            <LeadInfoCard
              lead={lead}
              hideUpdateInfo={true}
              onExpectedRevenueUpdate={handleExpectedRevenueUpdate}
              allProjects={allProjects}
              todos={todos}
            />
          </div>

          <BankOfferOpeningTerminTaskHistorySectionTab
            selectedOpeningId={selectedOpeningId}
            setSelectedOpeningId={setSelectedOpeningId}
            setSelectedOfferId={setSelectedOfferId}
            openingsData={openingsData}
            onOpenComposeEmail={() => setComposeMailDialogOpen(true)}
          />
          {/* <SaleDetailsLeads lead={lead as any} />
        <DocumentList lead={lead as any} /> */}
        </div>

        {!composeMailDialogOpen && (
          <div
            className={
              showInDialog
                ? 'min-h-0 overflow-y-auto'
                : 'h-[calc(100dvh-7rem)] min-h-[calc(100dvh-7rem)] overflow-y-auto'
            }
          >
            {emailViewData ? (
              <div className="h-full">
                <EmailViewContent currentOfferId={selectedOfferId || undefined} isShareable={true} />
              </div>
            ) : (
              <RightSidebar
                singleLeadId={String(leadId)}
                currentOfferId={selectedOfferId || undefined}
                forcedFilter={forceEmailTab ? 'email' : undefined}
                highlightEmailId={highlightedEmailId || undefined}
                taskType={(taskTypeFromDialog as TaskType) || 'lead'}
                offerId={offerIdFromDialog}
                openingId={openingIdFromDialog}
              />
            )}
          </div>
        )}

        <div
          className={`transition-all duration-300 ease-in-out ${composeMailDialogOpen
            ? 'h-full translate-x-0 opacity-100 lg:col-span-5'
            : 'pointer-events-none h-0 translate-x-full opacity-0 lg:col-span-0'
            }`}
        >
          <ComposeMailModal
            isOpen={composeMailDialogOpen}
            onClose={() => {
              setComposeMailDialogOpen(false);
              closeComposeMailModal();
            }}
          />
        </div>
      </div>
    </LeadDetailsBulkActionsProvider>
  );
};

export default LeadAdditionalInfo;
