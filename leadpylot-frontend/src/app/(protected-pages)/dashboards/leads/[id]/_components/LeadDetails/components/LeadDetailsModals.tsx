import React from 'react';
import Dialog from '@/components/ui/Dialog';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import OfferForm from './OfferForm';
import ReclamationForm from './ReclamationForm';
import ReclamationModalForm from './ReclamationModalForm';
import GeneratedPdfPreviewModal from '@/app/(protected-pages)/dashboards/_components/pdfModal/GeneratedPdfPreviewModal';
import AppointmentDialog from '../../LeadAdditionalInfo/AppointmentDialog';
import { useGeneratedPdfStore } from '@/stores/generatedPdfStore';

interface LeadDetailsModalsProps {
  lead: any;
  projectId: string;
  offerForm: any;
  editOfferForm?: any;
  reclamation: any;
  reclamationModal: any;
  actions: any;
  handlePermanentDelete: () => void;
  smaller: any;
}

const LeadDetailsModals = ({
  lead,
  projectId,
  offerForm,
  editOfferForm,
  reclamation,
  reclamationModal,
  actions,
  handlePermanentDelete,
  smaller,
}: LeadDetailsModalsProps) => {
  const { isOpen, pdfData, closeModal } = useGeneratedPdfStore();

  return (
    <>
      {offerForm?.isAddOfferOpen && (
        <Dialog width={1200} isOpen={offerForm.isAddOfferOpen} onClose={offerForm.cancelOffer}>
          <OfferForm
            title="Add Offer"
            schema={offerForm.schema}
            isSubmitting={offerForm.isSubmitting}
            projectId={projectId}
            onSubmit={offerForm.handleFormSubmit}
            fields={offerForm.fields}
            defaultValues={offerForm.defaultValues}
            leadInfo={{
              contract_name: lead.contact_name || '',
              leadPrice: (lead as any).leadPrice ?? 0,
              existingOffer: (lead.offers?.length ?? 0) as number,
              stage: lead.stage?.name || '',
              lead_source_no: (lead as any).lead_source_no || '',
            }}
          />
        </Dialog>
      )}

      {editOfferForm?.isAddOfferOpen && (
        <Dialog
          width={1200}
          isOpen={editOfferForm.isAddOfferOpen}
          onClose={editOfferForm.cancelOffer}
        >
          <OfferForm
            title="Edit Opening"
            schema={editOfferForm.schema}
            isSubmitting={editOfferForm.isSubmitting}
            projectId={projectId}
            onSubmit={editOfferForm.handleFormSubmit}
            fields={editOfferForm.fields}
            defaultValues={editOfferForm.defaultValues}
            leadInfo={{
              contract_name: lead.contact_name || '',
              leadPrice: (lead as any).leadPrice ?? 0,
              existingOffer: (lead.offers?.length ?? 0) as number,
              stage: lead.stage?.name || '',
              lead_source_no: (lead as any).lead_source_no || '',
            }}
            isEditMode={true}
            entityName="Opening"
          />
        </Dialog>
      )}

      {/* Old Reclamation Form */}
      {reclamation.isReclamationOpen && !smaller.lg && (
        <ReclamationForm
          reclamationReason={reclamation.reclamationReason}
          isSubmitting={reclamation.isSubmittingReclamation}
          onReasonChange={reclamation.setReclamationReason}
          onSubmit={reclamation.handleReclamationSubmit}
          onCancel={reclamation.cancelReclamation}
        />
      )}
      {reclamation.isReclamationOpen && smaller.lg && (
        <Dialog isOpen={reclamation.isReclamationOpen} onClose={reclamation.cancelReclamation}>
          <ReclamationForm
            modalView
            reclamationReason={reclamation.reclamationReason}
            isSubmitting={reclamation.isSubmittingReclamation}
            onReasonChange={reclamation.setReclamationReason}
            onSubmit={reclamation.handleReclamationSubmit}
            onCancel={reclamation.cancelReclamation}
          />
        </Dialog>
      )}

      {/* New Enhanced Reclamation Modal */}
      {reclamationModal.isModalOpen && (
        <Dialog
          isOpen={reclamationModal.isModalOpen}
          onClose={reclamationModal.closeModal}
          width={600}
        >
          <ReclamationModalForm
            isSubmitting={reclamationModal.isSubmitting}
            onSubmit={reclamationModal.handleSubmit}
            fields={reclamationModal.fields}
            schema={reclamationModal.schema}
          />
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        type="warning"
        isOpen={actions.isDeleteDialogOpen}
        title="Delete Lead"
        confirmText="Continue to Delete"
        onCancel={actions.closeDeleteDialog}
        onConfirm={handlePermanentDelete}
        confirmButtonProps={{ disabled: actions.isDeletingLead }}
      >
        <p>{`${lead.offers?.length && lead.offers?.length > 0 ? `${lead.offers?.length} offer(s) found. ` : ''}Are you sure you want to delete this lead? This action cannot be undone.`}</p>
      </ConfirmDialog>

      <GeneratedPdfPreviewModal isOpen={isOpen} onClose={closeModal} generatedPdfData={pdfData} />
      <AppointmentDialog />
    </>
  );
};

export default LeadDetailsModals;
