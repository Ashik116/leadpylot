'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';

import { TLead } from '@/services/LeadsService';
import AddOpeningSection from './AddOpeningSection';
import LeadAdditionalInfo from './LeadAdditionalInfo';
import { LeadDetailsProvider } from './LeadDetailsContext';

import useResponsive from '@/utils/hooks/useResponsive';
import { useLeadForm } from './LeadDetails/hooks/useLeadForm';
import { useLeadNavigation } from './LeadDetails/hooks/useLeadNavigation';
import { useLeadActions } from './LeadDetails/hooks/useLeadActions';
import { useSingleLeadAssignment } from './LeadDetails/hooks/useSingleLeadAssignment';
import { useOfferForm } from './LeadDetails/hooks/useOfferForm';
import { useReclamation } from './LeadDetails/hooks/useReclamation';
import { useReclamationModal } from './LeadDetails/hooks/useReclamationModal';
import LeadHeader from './LeadDetails/components/LeadHeader';
import { useCompleteCurrentTopLead, useUpdateLeadStatus } from '@/services/hooks/useLeads';
import { useLeadNavigationHandlers } from './LeadDetails/hooks/useLeadNavigationHandlers';
import LeadDetailsModals from './LeadDetails/components/LeadDetailsModals';

interface NavigationData {
  previous_lead_id?: string | null;
  has_previous?: boolean;
  next_lead_id?: string | null;
  has_next?: boolean;
  next_is_current_top?: boolean;
  is_current_top?: boolean;
  is_pinned?: boolean;
  can_complete?: boolean;
  view_count?: number;
  first_viewed_at?: string | null;
  last_viewed_at?: string | null;
}

interface UIHints {
  show_previous_button?: boolean;
  show_next_button?: boolean;
  show_complete_button?: boolean;
  show_back_to_current_button?: boolean;
  next_endpoint?: string | null;
  previous_endpoint?: string | null;
  complete_endpoint?: string | null;
}

interface LeadDetailsProps {
  lead: TLead;
  isAddOpeningOpen?: boolean;
  setIsAddOpeningOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  // Queue navigation props (from current-top endpoint)
  queueNavigation?: NavigationData;
  uiHints?: UIHints;
  // Optional custom navigation handlers (for agent queue view)
  onNavigatePrevious?: () => void;
  onNavigateNext?: () => void;
  onNavigateComplete?: () => void;
  queueInfo?: any;
  showInDialog?: boolean;
  highlightedOfferId?: string;
  highlightedOpeningId?: string;
  highlightedEmailId?: string;
  forceEmailTab?: boolean;
  initialSelectedOpeningId?: string;
  defaultActiveTab?: 'offers' | 'openings';
  taskTypeFromDialog?: string;
  offerIdFromDialog?: string;
  openingIdFromDialog?: string;
}

export const LeadDetails = ({
  lead,
  queueInfo,
  isAddOpeningOpen: externalIsAddOpeningOpen,
  setIsAddOpeningOpen: externalSetIsAddOpeningOpen,
  queueNavigation,
  uiHints,
  onNavigatePrevious,
  onNavigateNext,
  onNavigateComplete,
  showInDialog,
  highlightedOfferId,
  highlightedOpeningId,
  highlightedEmailId,
  forceEmailTab,
  initialSelectedOpeningId,
  defaultActiveTab,
  taskTypeFromDialog,
  offerIdFromDialog,
  openingIdFromDialog,
}: LeadDetailsProps) => {
  // Internal state for add opening when not controlled externally
  const [internalIsAddOpeningOpen, setInternalIsAddOpeningOpen] = useState(false);
  const isAddOpeningOpen =
    externalIsAddOpeningOpen !== undefined ? externalIsAddOpeningOpen : internalIsAddOpeningOpen;
  const setIsAddOpeningOpen = externalSetIsAddOpeningOpen || setInternalIsAddOpeningOpen;
  const handleAddOpeningClick = useCallback(() => setIsAddOpeningOpen(true), [setIsAddOpeningOpen]);
  const { smaller } = useResponsive();

  // Extract IDs from lead data
  const agentId =
    lead?.project?.[0]?.agent?._id || (lead?.project?.[0]?.agent as any)?.agent_id || '';
  const projectId = lead?.project?.[0]?._id || '';
  const leadId = lead?._id;

  // Custom hooks for different functionalities
  const leadForm = useLeadForm({ lead });
  const navigation = useLeadNavigation();
  const actions = useLeadActions({ leadId: leadId });
  const assignment = useSingleLeadAssignment({ leadId, lead });
  const completeTopLead = useCompleteCurrentTopLead();

  // Logic hooks
  const offerForm = useOfferForm({
    projectId: projectId || '',
    leadId: leadId,
    agentId: agentId || '',
    lead: lead,
  });
  // State for editing offer/opening
  const [offerToEdit, setOfferToEdit] = useState<any>(null);

  const editOfferForm = useOfferForm({
    projectId: projectId || '',
    leadId: leadId,
    agentId: agentId || '',
    lead: lead,
    isEditMode: true,
    existingOffer: offerToEdit,
    onClose: () => setOfferToEdit(null),
  });

  // Sync edit form open state with offerToEdit presence
  useEffect(() => {
    if (offerToEdit) {
      editOfferForm.setIsAddOfferOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- editOfferForm changes every render
  }, [offerToEdit]);

  const reclamation = useReclamation({
    leadId: leadId,
    projectId,
    agentId,
  });
  const reclamationModal = useReclamationModal({
    leadId: leadId,
    projectId,
    agentId,
  });

  // Navigation and Action Handlers
  const navHandlers = useLeadNavigationHandlers({
    leadId,
    lead,
    queueNavigation,
    navigation,
    actions,
    completeTopLead,
    onNavigatePrevious,
    onNavigateNext,
    onNavigateComplete,
  });

  // Memoize header props
  const headerProps = useMemo(
    () => ({
      currentPosition: queueInfo ? queueInfo?.current_position : navigation?.currentPosition,
      totalUsers: queueInfo ? queueInfo?.total_in_queue : navigation?.totalUsers,
      canGoToPrevious: navigation?.canGoToPrevious,
      canGoToNext: navigation?.canGoToNext || (lead as any)?.is_on_top,
      isAdmin: actions?.isAdmin,
      onPrevious: navHandlers.onPrevious,
      onNext: navHandlers.onNext,
      onDelete: navHandlers.onDelete,
      onComplete: navHandlers.onComplete,
      onReclamationClick: reclamationModal.openModal,
      lead: lead,
      assignment: assignment,
      hasActiveFilters: navigation?.hasActiveFilters,
      filterState: navigation?.filterState,
      navigation: queueNavigation,
      uiHints: uiHints,
      taskTypeFromDialog,
      offerIdFromDialog,
      openingIdFromDialog,
    }),
    [
      queueInfo,
      navigation,
      actions?.isAdmin,
      navHandlers,
      lead,
      assignment,
      taskTypeFromDialog,
      offerIdFromDialog,
      openingIdFromDialog,
      queueNavigation,
      uiHints,
      reclamationModal,
    ]
  );

  const handleSectionToggle = useCallback(
    (section: 'edit' | 'offer' | 'reclamation' | 'opening') => {
      if (section !== 'edit') leadForm.setIsEditing(false);
      if (section !== 'offer' && offerForm) offerForm.setIsAddOfferOpen(false);
      if (section !== 'reclamation') reclamation.setIsReclamationOpen(false);
      if (section !== 'opening') setIsAddOpeningOpen(false);
    },
    [leadForm, offerForm, reclamation, setIsAddOpeningOpen]
  );

  const handleEditOffer = useCallback(
    (offer: any) => {
      handleSectionToggle('edit');
      setOfferToEdit(offer);
    },
    [handleSectionToggle]
  );

  const handleOfferClick = useCallback(() => {
    if (offerForm) {
      handleSectionToggle('offer');
      offerForm.handleAddOfferClick();
    }
  }, [offerForm, handleSectionToggle]);

  const handleMeetingClick = useCallback(() => {
    navigation.handleMeetingClick(lead?._id, lead?.contact_name);
  }, [navigation, lead._id, lead.contact_name]);

  const updateStatusMutation = useUpdateLeadStatus({
    id: leadId,
    invalidLead: true,
    invalidActivities: true,
  });

  const handleStatusUpdate = useCallback(
    (stageId: string, statusId: string) => {
      updateStatusMutation.mutate({
        stage_id: stageId,
        status_id: statusId,
      });
    },
    [updateStatusMutation]
  );

  const contextValue = useMemo(
    () => ({
      lead,
      leadId: leadId ?? '',
      projectId: projectId || '',
      agentId: agentId || '',
      showInDialog,
      highlightedOfferId,
      highlightedOpeningId,
      highlightedEmailId,
      forceEmailTab,
      initialSelectedOpeningId,
      defaultActiveTab,
      taskTypeFromDialog,
      offerIdFromDialog,
      openingIdFromDialog,
      handleAddOpeningClick,
      onOfferClick: handleOfferClick,
      onEditOffer: handleEditOffer,
      onReclamationClick: reclamationModal.openModal,
      onMeetingClick: handleMeetingClick,
      onDelete: navHandlers.onDelete,
    }),
    [
      lead,
      leadId,
      projectId,
      agentId,
      showInDialog,
      highlightedOfferId,
      highlightedOpeningId,
      highlightedEmailId,
      forceEmailTab,
      initialSelectedOpeningId,
      defaultActiveTab,
      taskTypeFromDialog,
      offerIdFromDialog,
      openingIdFromDialog,
      handleAddOpeningClick,
      handleOfferClick,
      handleEditOffer,
      reclamationModal,
      handleMeetingClick,
      navHandlers.onDelete,
    ]
  );

  return (
    <LeadDetailsProvider value={contextValue}>
      <div className={`flex flex-col ${showInDialog ? 'h-full' : ''}`}>
        {/* Sticky Header */}
        <div className={`${showInDialog ? 'shrink-0' : 'sticky top-0'} z-10 bg-white shadow-sm`}>
          <LeadHeader
            {...headerProps}
            onStatusUpdated={handleStatusUpdate}
            disableAllButtons={false}
            showInDialog={showInDialog}
          />
        </div>

        {/* Content Area */}
        <div className={`flex-1 ${showInDialog ? 'min-h-0' : ''}`}>
          {/* Add Opening Section */}
          {isAddOpeningOpen && (
            <AddOpeningSection
              uploadedFiles={actions.uploadedFiles}
              setUploadedFiles={actions.setUploadedFiles}
              leadId={leadId}
              lead={lead}
              setIsAddOpeningOpen={setIsAddOpeningOpen}
            />
          )}

          {/* Lead Additional Info */}
          <LeadAdditionalInfo />
        </div>

        <LeadDetailsModals
          lead={lead}
          projectId={projectId}
          offerForm={offerForm}
          editOfferForm={editOfferForm}
          reclamation={reclamation}
          reclamationModal={reclamationModal}
          actions={actions}
          handlePermanentDelete={navHandlers.handlePermanentDelete}
          smaller={smaller}
        />
      </div>
    </LeadDetailsProvider>
  );
};
