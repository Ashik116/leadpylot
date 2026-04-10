import Dialog from '@/components/ui/Dialog';

import { Offer } from '@/services/LeadsService';
import React from 'react';
import OfferForm from '../LeadDetails/components/OfferForm';
import { useOfferForm } from '../LeadDetails/hooks/useOfferForm';

interface EditOfferDialogProps {
  isOpen: boolean;
  onClose: () => void;
  offer: Offer | null;
  projectId: string;
}

const EditLeadOfferDialog = ({ isOpen, onClose, offer, projectId }: EditOfferDialogProps) => {
  // Extract lead_id - it can be a string or an object with _id
  const leadId = offer?.lead_id
    ? typeof offer.lead_id === 'string'
      ? offer.lead_id
      : (offer.lead_id as any)?._id || ''
    : '';

  // Extract agent_id - it can be a string or an object with _id
  const agentId = offer?.agent_id
    ? typeof offer.agent_id === 'string'
      ? offer.agent_id
      : offer.agent_id?._id || ''
    : '';

  const offerForm = useOfferForm({
    projectId: projectId || '',
    leadId: leadId,
    agentId: agentId,
    lead: offer, // Pass the lead data for default values
    isEditMode: true, // Add edit mode flag
    existingOffer: offer, // Pass existing offer data
    onClose: onClose, // Pass onClose callback to close modal after update
  });

  return (
    <>
      {isOpen && (
        <Dialog width={1200} isOpen={isOpen} onClose={onClose}>
          <OfferForm
            isEditMode={true}
            title="Edit Offer"
            schema={offerForm?.schema}
            isSubmitting={offerForm.isSubmitting}
            projectId={projectId}
            onSubmit={offerForm?.handleFormSubmit}
            fields={offerForm?.fields}
            defaultValues={offerForm?.defaultValues}
            leadInfo={{
              contract_name: (offer as any)?.contact_name || '',
              stage: (offer as any)?.stage || '',
              lead_source_no: (offer as any)?.lead_source_no || '',
            }}
          />
        </Dialog>
      )}
    </>
  );
};

export default EditLeadOfferDialog;
