import { useMemo, useState, useEffect } from 'react';
import Dialog from '../Dialog';
import { Table } from '../Table';
import { Checkbox } from '../Checkbox';
import { Button } from '../Button';
import type { User } from '@/services/UsersService';
import classNames from '@/utils/classNames';
import { Agent } from '@/services/ProjectsService';
import DebouceInput from '@/components/shared/DebouceInput';
import useAppendQueryParams from '@/utils/hooks/useAppendQueryParams';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiGetUsers } from '@/services/UsersService';
import ApolloIcon from '../ApolloIcon';
const { THead, TBody, Tr, Th, Td } = Table;

export interface AgentSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (selectedUsers: User[]) => void;
  agents?: Agent[];
}

const AgentSelectionDialog = ({
  isOpen,
  agents = [],
  onClose,
  onSelect,
}: AgentSelectionDialogProps) => {
  // Use a direct query instead of the hook to have more control
  const { data: usersResponse, refetch } = useQuery({
    queryKey: ['users'],
    queryFn: () => apiGetUsers(),
    enabled: false, // Don't run the query on component mount
  });

  // Initialize selectedUsers with an empty array
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);

  // Reset selection when dialog closes - use callback to avoid setState in effect
  useEffect(() => {
    if (!isOpen) {
      // Use setTimeout to defer state update outside of render cycle
      const timeoutId = setTimeout(() => {
        setSelectedUsers([]);
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen]);
  const searchParams = useSearchParams();
  const search = searchParams.get('search');
  const { onAppendQueryParams } = useAppendQueryParams();

  // Only fetch users data when the dialog is opened
  useEffect(() => {
    if (isOpen) {
      refetch(); // Manually trigger the query when dialog opens
    }
  }, [isOpen, refetch]);

  const handleUserSelect = (user: User, checked: boolean) => {
    if (checked) {
      setSelectedUsers((prev) => [...prev, user]);
    } else {
      setSelectedUsers((prev) => prev?.filter((u) => u?._id !== user?._id));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(usersResponse?.data || []);
    } else {
      setSelectedUsers([]);
    }
  };

  const handleConfirm = () => {
    onSelect(selectedUsers);
    onClose();
    setSelectedUsers([]);
  };

  const isAllSelected =
    usersResponse?.data &&
    usersResponse?.data?.length > 0 &&
    usersResponse?.data?.length === selectedUsers?.length;

  const filteredUsers = useMemo(() => {
    if (!usersResponse?.data) return [];
    const safeSearch = search?.toLowerCase() || '';
    return usersResponse?.data?.filter((user) => user?.login?.toLowerCase()?.includes(safeSearch));
  }, [search, usersResponse?.data]);

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      width={800}
      height={600}
      contentClassName="flex flex-col"
    >
      <div className="my-4 flex items-center justify-between gap-2 border-b border-gray-200 px-6 py-4">
        <h4 className="text-lg font-semibold">Select Agents</h4>
        <DebouceInput
          prefix={<ApolloIcon name="search" className="text-md" />}
          placeholder="Search Agents"
          onChange={(e) => {
            onAppendQueryParams({
              search: e.target.value,
            });
          }}
          defaultValue={search || ''}
          size="xs"
          className="flex-1"
          wait={750}
        />
      </div>

      <div className="flex-1 overflow-auto">
        <Table>
          <THead>
            <Tr>
              <Th className="sticky top-0 w-16">
                {/* Use Checkbox component with explicit checked value to avoid uncontrolled to controlled issues */}
                <Checkbox
                  checked={isAllSelected || false}
                  onChange={handleSelectAll}
                  key="select-all-checkbox"
                />
              </Th>
              <Th className="sticky top-0">Login</Th>
              <Th className="sticky top-0">Email</Th>
              <Th className="sticky top-0">Status</Th>
            </Tr>
          </THead>
          <TBody>
            {filteredUsers?.map((user) => {
              // Determine if this user is already an agent
              const isAlreadyAgent =
                agents?.some((agent) => agent?.user?._id === user?._id) || false;

              // Determine if this user is selected in the current session
              const isSelected = selectedUsers?.some((u) => u?._id === user?._id);

              return (
                <Tr key={user?._id}>
                  <Td>
                    {isAlreadyAgent ? (
                      // For already selected agents, use a disabled checked checkbox
                      <Checkbox
                        checked={true}
                        disabled={true}
                        key={`agent-checkbox-${user?._id}`}
                      />
                    ) : (
                      // For regular users, use a controlled checkbox with explicit checked value
                      <Checkbox
                        checked={isSelected || false}
                        onChange={(checked) => handleUserSelect(user, checked)}
                        key={`user-checkbox-${user?._id}`}
                      />
                    )}
                  </Td>
                  <Td>{user?.login}</Td>
                  <Td>{user?.info?.email || '-'}</Td>
                  <Td>
                    <span
                      className={classNames(
                        'rounded-full px-2 py-1 text-xs font-semibold text-white',
                        user?.active ? 'bg-evergreen' : 'bg-rust'
                      )}
                    >
                      {user?.active ? 'Active' : 'Inactive'}
                    </span>
                  </Td>
                </Tr>
              );
            })}
          </TBody>
        </Table>
      </div>

      <div className="px-6 py-4">
        <div className="flex justify-end gap-2">
          <Button variant="plain" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="solid" onClick={handleConfirm} disabled={selectedUsers?.length === 0}>
            Add Selected ({selectedUsers?.length})
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

export default AgentSelectionDialog;
