import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession';
import { useBulkDeleteLeads, usePermanentDeleteLead } from '@/services/hooks/useLeads';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';

interface UseLeadActionsProps {
  leadId: string;
}

export const useLeadActions = ({ leadId }: UseLeadActionsProps) => {
  const { data: session } = useSession();
  const router = useRouter();
  const isAdmin = session?.user?.role === 'Admin';

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ file: File; type: any }>>([]);

  const bulkDeleteMutation = useBulkDeleteLeads();
  const permanentDelete = usePermanentDeleteLead();

  const handleDelete = () => {
    bulkDeleteMutation.mutate([leadId], {
      onSuccess: () => {
        toast.push(
          <Notification title="Lead deleted" type="success">
            Lead deleted successfully
          </Notification>
        );
        setIsDeleteDialogOpen(false);
        router.push('/dashboards/leads');
      },
    });
  };
  const openDeleteDialog = () => {
    setIsDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
  };

  return {
    isAdmin,
    isDeleteDialogOpen,
    uploadedFiles,
    setUploadedFiles,
    isDeletingLead: bulkDeleteMutation.isPending || permanentDelete.isPending,
    handleDelete,
    openDeleteDialog,
    closeDeleteDialog,
    permanentDelete,
  };
};
