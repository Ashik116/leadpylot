import Dialog from '@/components/ui/Dialog';
import { OfferApiResponse } from '@/services/LeadsService';
import React from 'react';
import OfferForm from '../../leads/[id]/_components/LeadDetails/components/OfferForm';
import { useOfferForm } from '../../leads/[id]/_components/LeadDetails/hooks/useOfferForm';

interface EditOfferDialogProps {
  isOpen: boolean;
  onClose: () => void;
  offer: OfferApiResponse | null;
  dashboardType?: string;
  onSuccess?: () => void;
}

const EditOfferDialog = ({
  isOpen,
  onClose,
  offer,
  dashboardType,
  onSuccess,
}: EditOfferDialogProps) => {
  const offerForm = useOfferForm({
    projectId: offer?.project_id?._id || '',
    leadId: offer?.lead_id?._id || '',
    agentId: typeof offer?.agent_id === 'string' ? offer?.agent_id : offer?.agent_id?._id || '',
    lead: offer,
    isEditMode: true,
    existingOffer: offer,
    onClose: () => {
      onSuccess?.();
      onClose();
    },
  });

  if (!offer) return null;

  return (
    <Dialog isOpen={isOpen} onClose={onClose} width={1200}>
      <OfferForm
        isEditMode={true}
        title={`Edit ${dashboardType || ''}`}
        schema={offerForm?.schema}
        isSubmitting={offerForm.isSubmitting}
        projectId={offer?.project_id?._id || ''}
        onSubmit={offerForm.handleFormSubmit}
        fields={offerForm.fields}
        defaultValues={offerForm.defaultValues}
        showReferenceNumber={true}
        leadInfo={{
          contract_name: offer?.lead_id?.contact_name || '',
          stage: (offer?.lead_id as any)?.stage || '',
          lead_source_no: (offer?.lead_id as any)?.lead_source_no || '',
        }}
      />
    </Dialog>
  );
};

export default EditOfferDialog;
