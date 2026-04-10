'use client';

import React, { useState } from 'react';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import { useUsers } from '@/services/hooks/useUsers';

interface AssignTodoModalProps {
  isOpen: boolean;
  todoId?: string;
  onClose: () => void;
  onAssign: (todoId: string, agentId: string) => void;
}

const AssignTodoModal: React.FC<AssignTodoModalProps> = ({
  isOpen,
  todoId,
  onClose,
  onAssign,
}) => {
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');

  // Fetch users (agents) for assignment
  const { data: usersData } = useUsers({
    page: 1,
    limit: 100, // Get all users for assignment
  });

  // Filter agents only
  const agents = usersData?.data?.filter((user: any) => user.role === 'agent') || [];

  const handleAssign = () => {
    if (todoId && selectedAgentId) {
      onAssign(todoId, selectedAgentId);
      setSelectedAgentId('');
    }
  };

  const handleClose = () => {
    setSelectedAgentId('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Assign Todo to Agent"
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Select an agent to assign this todo to. The todo will become visible to them and they can manage it.
        </p>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Select Agent
          </label>
          <Select
            value={selectedAgentId}
            onChange={(selected: any) => setSelectedAgentId(selected.value)}
            options={agents.map((agent: any) => ({
              value: agent._id,
              label: `${agent.info?.name || `${agent.first_name || ''} ${agent.last_name || ''}`.trim()} (${agent.login})`
            }))}
            placeholder="Choose an agent..."
          />
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="plain" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={!selectedAgentId}
          >
            Assign Todosssssssssss
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default AssignTodoModal;
