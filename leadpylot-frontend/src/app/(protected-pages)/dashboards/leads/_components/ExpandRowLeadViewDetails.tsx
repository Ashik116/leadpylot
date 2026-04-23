import { useRouter } from 'next/navigation';
import ContactInfoCard from '../[id]/_components/LeadAdditionalInfo/ContactInfoCard';
import LeadInfoCard from '../[id]/_components/LeadAdditionalInfo/LeadInfoCard';
import StatusActionCard from '../[id]/_components/LeadAdditionalInfo/StatusActionCard';
import { useUpdateLead, useUpdateLeadStatus } from '@/services/hooks/useLeads';
import { useOfferForm } from '../[id]/_components/LeadDetails/hooks/useOfferForm';
import OfferForm from '../[id]/_components/LeadDetails/components/OfferForm';
import Dialog from '@/components/ui/Dialog';

import { useReclamation } from '../[id]/_components/LeadDetails/hooks/useReclamation';
import ReclamationForm from '../[id]/_components/LeadDetails/components/ReclamationForm';

import { useContactUpdate } from '../[id]/hooks/useContactUpdate';

import RightSidebar from '../[id]/_components/RightSidebar';
// import { useLeadNavigation } from '../[id]/_components/LeadDetails/hooks/useLeadNavigation';
import GeneratedPdfPreviewModal from '../../_components/pdfModal/GeneratedPdfPreviewModal';
import { useGeneratedPdfStore } from '@/stores/generatedPdfStore';
import { getLeadDetailRouteId } from '@/utils/closedLeadNavigation';
import LeadsInformationTab from './LeadsInformationTab';

const ExpandRowLeadViewDetails = ({
  row,
  allProjects,
  negativeAndPrivatOptions,
  todos,
}: {
  row: any;
  allProjects?: any;
  negativeAndPrivatOptions?: any;
  todos?: any;
}) => {
  const router = useRouter();
  // const navigation = useLeadNavigation();
  const { isOpen, pdfData, closeModal } = useGeneratedPdfStore();
  const lead = row.original;
  const leadDetailRouteId = getLeadDetailRouteId(lead);
  const updateLeadStatusMutation = useUpdateLeadStatus({
    id: lead?._id,
    invalidLeads: true,
  });
  const agentId =
    lead?.project?.[0]?.agent?._id || (lead.project?.[0]?.agent as any)?.agent_id || '';
  const projectId = lead.project?.[0]?._id || '';
  const leadId = lead._id;
  const reclamation = useReclamation({
    leadId: leadId.toString(),
    projectId: projectId || '',
    agentId: agentId || '',
    invalidateQueries: ['leads'],
  });
  const offerForm = useOfferForm({
    projectId: projectId || '',
    leadId: leadId.toString(),
    agentId: agentId || '',
    lead: lead, // Pass the lead data for default values
  });
  // The queryKey you are passing is [['leads', 'infinite-activities']], which is an array inside an array.
  // Most React Query hooks expect queryKey to be a flat array, e.g. ['leads', 'infinite-activities'].
  // Try passing a flat array instead:
  const { updateContact } = useContactUpdate({
    leadId: lead?._id,
    queryKey: ['leads'],
  });

  const updateLeadMutation = useUpdateLead(lead?._id);

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
      const revenue = parseFloat(newValue);
      if (isNaN(revenue)) {
        throw new Error('Invalid revenue value');
      }

      updateLeadMutation.mutate({ expected_revenue: revenue });
    } catch (error) {
      console.error('Failed to update expected revenue:', error);
    }
  };

  const handleStatusClick = (stageId: string, statusId: string) => {
    // Update lead status using stage_name and status_name
    updateLeadStatusMutation.mutate({
      stage_id: stageId,
      status_id: statusId,
    });
  };

  const handleNegativeStatusClick = (stageId: string, statusId: string) => {
    // For negative status updates, we use "Negativ" as stage name
    // and need to resolve the status name from the status ID
    // Since we don't have easy access to the status mapping here,
    // we'll use stage_id and status_id for negative statuses

    updateLeadStatusMutation.mutate({
      stage_id: stageId,
      status_id: statusId,
    });
  };

  // const handleMeetingClick = () => {
  //   navigation.handleMeetingClick(lead?._id, lead?.contact_name);
  // };

  return (
    <div className="bg-gray-50 pl-4 dark:bg-[var(--dm-bg-base)]">
      <div className="3xl:gap-4 grid grid-cols-[repeat(5,minmax(270px,1fr))] gap-2">
        <ContactInfoCard
          lead={lead}
          onSendEmailClick={() => {
            router.push(`/dashboards/leads/${leadDetailRouteId}`);
          }}
          enableInlineEditing={true}
          batchMode={true}
          onCallClick={() => {
            router.push(`/dashboards/leads/${leadDetailRouteId}`);
          }}
          onContactUpdate={handleContactUpdate}
          onBatchContactUpdate={handleBatchContactUpdate}
          leadExpandView={true}
        />
        <LeadInfoCard
          lead={lead}
          onExpectedRevenueUpdate={handleExpectedRevenueUpdate}
          allProjects={allProjects}
          negativeAndPrivatOptions={negativeAndPrivatOptions}
          todos={todos}
        />
        <StatusActionCard
          lead={lead}
          onOfferClick={() => {
            offerForm.handleAddOfferClick();
          }}
          // onMeetingClick expects (data: CallScheduleData) => void, but handleMeetingClick signature doesn't match
          onStatusClick={(data: any) => handleStatusClick(data.stage_id, data.status_id)}
          onNegativeStatusClick={(data: any) =>
            handleNegativeStatusClick(data.stage_id, data.status_id)
          }
          onReclamationClick={() => {
            reclamation.setIsReclamationOpen(true);
            //   reclamation.handleReclamationClick();
          }}
          leadExpandView={true}
        />
        {/* <LeadTimeFrameCard lead={lead} hideUpdateInfo={true} /> */}
        <div className="col-span-2">
          <RightSidebar leadExpandView={true} singleLeadId={leadId} />
        </div>
      </div>
      {/* Offer Form */}
      {offerForm?.isAddOfferOpen && (
        <Dialog width={1200} isOpen={offerForm.isAddOfferOpen} onClose={offerForm.cancelOffer}>
          <OfferForm
            title="Add Offer"
            schema={offerForm?.schema}
            isSubmitting={offerForm.isSubmitting}
            projectId={projectId}
            onSubmit={offerForm?.handleFormSubmit}
            fields={offerForm?.fields}
            defaultValues={offerForm?.defaultValues}
            leadInfo={{
              contract_name: lead?.contact_name || '',
              leadPrice: (lead as any)?.leadPrice ?? 0,
              existingOffer: (lead?.offers?.length ?? 0) as number,
              stage: lead?.stage?.name || '',
              lead_source_no: (lead as any)?.lead_source_no || '',
            }}
          />
        </Dialog>
      )}

      {reclamation.isReclamationOpen && (
        <Dialog
          width={700}
          isOpen={reclamation.isReclamationOpen}
          onClose={reclamation.cancelReclamation}
        >
          <ReclamationForm
            modalView={true}
            reclamationReason={reclamation.reclamationReason}
            isSubmitting={reclamation.isSubmittingReclamation}
            onReasonChange={reclamation.setReclamationReason}
            onSubmit={reclamation.handleReclamationSubmit}
            onCancel={reclamation.cancelReclamation}
          />
        </Dialog>
      )}

      <LeadsInformationTab lead={lead as any} />

      <GeneratedPdfPreviewModal isOpen={isOpen} onClose={closeModal} generatedPdfData={pdfData} />
    </div>
  );
};

export default ExpandRowLeadViewDetails;
