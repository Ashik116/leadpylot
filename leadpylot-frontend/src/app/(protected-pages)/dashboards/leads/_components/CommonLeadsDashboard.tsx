'use client';

import LeadsDashboardProps from '@/_interface/commonLeadsDashboardInterface';
import BulkSearchModal from '@/components/shared/BulkSearchModal/BulkSearchModal';
import Card from '@/components/ui/Card';
import Dialog from '@/components/ui/Dialog';
import NoteDialog from '../../leads/[id]/_components/NoteDialog';
import { LeadsDashboardProvider, useLeadsDashboardContext } from '../context/LeadsDashboardContext';
import BulkUpdateDialog from './BulkUpdateDialog';
import ActionsLeadTableComponents from './core-component/ActionsLeadTableComponents';
import LeadDataTables from './core-component/LeadDataTables';
import { TaskDetailModal } from '@/components/shared/TaskDrawer/components/TaskDetailModal';
import LeadDetailsPage from '../[id]/page';

// Inner component that consumes the context
const LeadsDashboardContent = ({ fixedHeight }: { fixedHeight?: string }) => {
  const {
    // Dialog states
    isNoteDialogOpen,
    setIsNoteDialogOpen,
    selectedLead,
    isBulkUpdateDialogOpen,
    setIsBulkUpdateDialogOpen,
    isBulkSearchEditModalOpen,
    setIsBulkSearchEditModalOpen,
    bulkSearchQuery,
    selectedLeads,
    isTaskDetailModalOpen,
    setIsTaskDetailModalOpen,
    selectedTaskId,
    handleCloseTaskDetail,

    // Handlers
    openNotification,
    setSelectedLeads,
    clearSelectedItems,
    selectedLeadForDetails,
    leadDetailsViewOpen,
    handleCloseLeadDetailsView,
  } = useLeadsDashboardContext();

  return (
    <div className="">
      <Card bodyClass="" className="rounded-none border-none">
        {/* No props needed - components will consume context directly */}
        <ActionsLeadTableComponents />
        <LeadDataTables fixedHeight={fixedHeight} />
      </Card>

      <NoteDialog
        isOpen={isNoteDialogOpen}
        onClose={() => setIsNoteDialogOpen(false)}
        initialSubject={selectedLead ? `Email to ${selectedLead?.contact_name}` : ''}
        initialContent={
          selectedLead ? `<p>Email regarding lead: ${selectedLead?.contact_name}</p>` : ''
        }
        onSave={() => {
          openNotification({
            type: 'success',
            massage: 'Email has been logged successfully',
          });
          setIsNoteDialogOpen(false);
        }}
        isLeadsDashboard={false}
      />

      <BulkUpdateDialog
        isOpen={isBulkUpdateDialogOpen}
        onClose={() => setIsBulkUpdateDialogOpen(false)}
        selectedLeads={selectedLeads}
        onSuccess={() => {
          setSelectedLeads([]);
          clearSelectedItems();
        }}
      />

      <BulkSearchModal
        isOpen={isBulkSearchEditModalOpen}
        onClose={() => setIsBulkSearchEditModalOpen(false)}
        initialPartnerIds={bulkSearchQuery}
        isEditMode={true}
      />

      <TaskDetailModal
        isOpen={isTaskDetailModalOpen}
        onClose={handleCloseTaskDetail}
        taskId={selectedTaskId}
        onStatusChange={() => {
          // Optionally trigger a refetch or update when task status changes
        }}
      />
      <Dialog
        isOpen={leadDetailsViewOpen}
        onClose={handleCloseLeadDetailsView}
        className="min-w-[95vw] 2xl:min-w-[85vw]"
      >
        <div className="p-3">
          <LeadDetailsPage leadId={selectedLeadForDetails?._id} />
        </div>
      </Dialog>
    </div>
  );
};

// Main component that provides the context
const CommonLeadsDashboard = (props: LeadsDashboardProps) => {
  return (
    <LeadsDashboardProvider {...props}>
      <LeadsDashboardContent fixedHeight={props?.fixedHeight} />
    </LeadsDashboardProvider>
  );
};

export default CommonLeadsDashboard;
