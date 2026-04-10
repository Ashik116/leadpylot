'use client';

import Dialog from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import { useUsersByRole } from '@/services/hooks/useUsers';
import { useAssignTodo } from '@/services/hooks/useLeads';
import { useState, useMemo } from 'react';
import AgentBatch from '../../leads/_components/AgentBatch';

interface AssignTicketDialogProps {
  isOpen: boolean;
  onClose: () => void;
  ticketId: string;
  ticketData: any;
  onSuccess?: () => void;
}

const AssignTicketDialog = ({
  isOpen,
  onClose,
  ticketId,
  ticketData,
  onSuccess,
}: AssignTicketDialogProps) => {
  const [selectedAdmin, setSelectedAdmin] = useState<{ value: string; label: string } | null>(null);
  
  // Fetch admins list using role filter
  const { data: adminsData, isLoading: adminsLoading } = useUsersByRole('admin', { limit: 100 });
  
  // Assign mutation
  const assignMutation = useAssignTodo();

  // Format admins for select
  const adminOptions = useMemo(() => {
    const users = (adminsData as any)?.data || [];
    if (!users.length) return [];
    return users
      .filter((admin: any) => admin.active !== false)
      .map((admin: any) => ({
        value: admin._id,
        label: admin.login,
        color_code: admin.color_code,
      }));
  }, [adminsData]);

  const handleAssign = () => {
    if (!selectedAdmin || !ticketId) return;

    assignMutation.mutate(
      {
        todoId: ticketId,
        data: { assignee_id: selectedAdmin.value },
      },
      {
        onSuccess: () => {
          onSuccess?.();
          onClose();
          setSelectedAdmin(null);
        },
      }
    );
  };

  const handleClose = () => {
    setSelectedAdmin(null);
    onClose();
  };

  // Custom option renderer with color
  const formatOptionLabel = (option: any) => (
    <div className="flex items-center gap-2">
      <AgentBatch agentName={option.label} agentColor={option.color_code} />
    </div>
  );

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      width={450}
    >
      <div className="p-6">
        <h3 className="text-lg font-semibold mb-4">Assign Ticket</h3>
        
        {/* Ticket Info */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">Ticket Message:</p>
          <p className="text-sm font-medium">{ticketData?.ticketMessage || ticketData?.ticket?.message || '-'}</p>
        </div>

        {/* Current Assignment */}
        {ticketData?.ticketAssignedTo && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Currently Assigned To:</p>
            <AgentBatch 
              agentName={ticketData.ticketAssignedTo.login} 
              agentColor={ticketData.ticketAssignedTo.color_code} 
            />
          </div>
        )}

        {/* Admin Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Admin to Assign
          </label>
          <Select
            value={selectedAdmin}
            onChange={(option) => setSelectedAdmin(option as { value: string; label: string })}
            options={adminOptions}
            isLoading={adminsLoading}
            placeholder="Select an admin..."
            formatOptionLabel={formatOptionLabel}
            isClearable
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <Button
            variant="plain"
            onClick={handleClose}
            disabled={assignMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="solid"
            color="blue-600"
            onClick={handleAssign}
            loading={assignMutation.isPending}
            disabled={!selectedAdmin}
          >
            Assign
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

export default AssignTicketDialog;
