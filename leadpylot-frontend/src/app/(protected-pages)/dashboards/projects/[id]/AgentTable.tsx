import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Checkbox from '@/components/ui/Checkbox';
import Notification from '@/components/ui/Notification';
import toast from '@/components/ui/toast';
import ApolloIcon from '@/components/ui/ApolloIcon';
import BaseTable from '@/components/shared/BaseTable/BaseTable';
import { ColumnDef } from '@/components/shared/DataTable';
import DebouceInput from '@/components/shared/DebouceInput';
import RoleGuard from '@/components/shared/RoleGuard';
import { useAddProjectAgents } from '@/services/hooks/useProjects';
import { Agent, ProjectDetails } from '@/services/ProjectsService';
import type { User } from '@/services/UsersService';
import { apiGetUsers } from '@/services/UsersService';
import classNames from '@/utils/classNames';
import { formatValue } from '@/utils/formateValue';
import { toastWithAxiosError } from '@/utils/toastWithAxiosError';
import { Role } from '@/configs/navigation.config/auth.route.config';
import AgentEditFromSidebar from './AgentEditFromSidebar';
// import { handleClick } from './browserAutomation/BotLogin';

const AgentTable = ({ project }: { project: ProjectDetails }) => {
  const [showSidebar, setShowSidebar] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const { mutate: addAgents, isPending: isAddingAgents } = useAddProjectAgents();

  // State to control sidebar visibility
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [sidebarType, setSidebarType] = useState<'add_agents' | 'agent_details' | null>(null);

  // Local search state (not in URL)
  const [search, setSearch] = useState('');

  // Function to scroll to top when hiding sidebar
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  // Handle agent row click
  const handleAgentRowClick = (agent: Agent) => {
    if (selectedAgent?._id === agent?._id && sidebarVisible && sidebarType === 'agent_details') {
      setSidebarVisible(false);
      setShowSidebar(false);
      setSelectedAgent(null);
    } else {
      setSelectedAgent(agent);
      setSidebarType('agent_details');
      setSidebarVisible(true);
      setShowSidebar(true);
      // The useEffect will handle the scrolling
    }
  };

  // Users query for adding agents
  const { data: usersResponse, refetch } = useQuery({
    queryKey: ['users', Role.AGENT, search],
    queryFn: () => apiGetUsers({ role: Role.AGENT, search: search || undefined }),
    enabled: showSidebar && sidebarType === 'add_agents',
  });

  useEffect(() => {
    if (!showSidebar) {
      setSelectedUsers([]);
      setSearch(''); // Clear search when sidebar closes
    }
  }, [showSidebar]);

  // Note: Removed scrollToAgentSection when opening Add Agents - it was causing the top
  // header/action bar to scroll out of view. The agent section is visible in the side-by-side
  // layout on large screens; on smaller screens users can scroll manually.

  // Agent table columns definition
  const agentColumns: ColumnDef<Agent>[] = useMemo(
    () => [
      {
        id: 'alias_name',
        header: 'Alias Name',
        accessorKey: 'alias_name',
        cell: ({ row }) => formatValue(row.original?.alias_name || row.original?.user?.name),
      },
      {
        id: 'user_name',
        header: 'User Name',
        accessorKey: 'user_name',
        cell: ({ row }) => formatValue(row.original?.user?.name || '-'),
      },
      {
        id: 'mailserver',
        header: 'Mail Server',
        accessorKey: 'mailservers',
        cell: ({ row }) => {
          const mailservers = row.original?.mailservers;
          if (!mailservers || !Array.isArray(mailservers) || mailservers.length === 0) {
            return <span className="text-gray-400">-</span>;
          }
          const names = mailservers
            .map((ms) => (typeof ms === 'object' && ms !== null ? (ms as { name?: string }).name : null))
            .filter(Boolean);
          return formatValue(names.length > 0 ? names.join(', ') : '-');
        },
      },
      {
        id: 'voip_username',
        header: 'VOIP Username',
        accessorKey: 'voip_username',
        cell: ({ row }) => formatValue(row.original?.voip_username),
      },
      // {
      //   id: 'actions',
      //   header: 'Action',
      //   cell: () => (
      //     <Button
      //       onClick={(e) => {
      //         e.stopPropagation();
      //         handleClick({
      //           email: 'emil',
      //           password: 'emil',
      //         });
      //       }}
      //       variant="default"
      //       size="sm"
      //     >
      //       Login
      //     </Button>
      //   ),
      // },
    ],
    []
  );

  // User selection handlers for adding agents
  const handleUserSelect = (user: User, checked: boolean) => {
    if (checked) {
      setSelectedUsers((prev) => [...prev, user]);
    } else {
      setSelectedUsers((prev) => prev.filter((u) => u._id !== user._id));
    }
  };

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        setSelectedUsers(usersResponse?.data || []);
      } else {
        setSelectedUsers([]);
      }
    },
    [usersResponse?.data]
  );

  const handleAddAgents = () => {
    const agentData = selectedUsers.map((user) => ({
      user_id: user._id,
      alias_name: user?.info?.name || user?.login || '',
    }));

    addAgents(
      {
        projectId: project._id,
        data: { agents: agentData },
      },
      {
        onSuccess: () => {
          toast.push(
            <Notification title="Agents added" type="success">
              Agents added successfully
            </Notification>
          );
          setShowSidebar(false);
        },
        onError: (error) => {
          const { message } = toastWithAxiosError(error);
          toast.push(
            <Notification title="Error" type="danger">
              {message}
            </Notification>
          );
        },
      }
    );
  };

  const isAllSelected =
    usersResponse?.data &&
    usersResponse.data.length > 0 &&
    usersResponse.data.length === selectedUsers.length;

  // Use the API response directly since search is handled by the backend
  const filteredUsers = usersResponse?.data || [];

  // Header actions for the agents table
  const headerActions = (
    <div className="flex items-center gap-2">
      <RoleGuard>
        {showSidebar && (
          <Button
            variant="solid"
            size="sm"
            icon={<ApolloIcon name={sidebarVisible ? 'arrow-right' : 'arrow-left'} />}
            onClick={() => {
              const newVisible = !sidebarVisible;
              setSidebarVisible(newVisible);
              if (!newVisible) {
                // When hiding, scroll to top
                setTimeout(() => {
                  scrollToTop();
                }, 100);
              }
            }}
            className="bg-yellow-500 text-sm text-black hover:bg-yellow-600"
          >
            {sidebarVisible ? 'Hide' : 'Show'} Agents
          </Button>
        )}
        <Button
          variant="solid"
          icon={<ApolloIcon name="plus" />}
          onClick={() => {
            setShowSidebar(true);
            setSidebarType('add_agents');
            setSidebarVisible(true);
            setSearch(''); // Clear search when opening sidebar
            // The useEffect will handle the scrolling
          }}
          loading={isAddingAgents}
        >
          Add Agents
        </Button>
      </RoleGuard>
    </div>
  );

  // Users table columns for agent selection
  const userColumns: ColumnDef<User>[] = [
    {
      id: 'select',
      header: () => (
        <Checkbox
          checked={isAllSelected || false}
          onChange={handleSelectAll}
          key="select-all-checkbox"
        />
      ),
      cell: ({ row }) => {
        const user = row.original;
        const isAlreadyAgent =
          project?.agents?.some((agent) => agent.user?._id === user._id) || false;
        const isSelected = selectedUsers.some((u) => u._id === user._id);

        return isAlreadyAgent ? (
          <Checkbox checked={true} disabled={true} key={`agent-checkbox-${user._id}`} />
        ) : (
          <Checkbox
            checked={isSelected || false}
            onChange={(checked) => handleUserSelect(user, checked)}
            key={`user-checkbox-${user._id}`}
          />
        );
      },
    },
    {
      id: 'login',
      header: 'Login',
      accessorKey: 'login',
      cell: ({ row }) => row.original.login,
    },
    {
      id: 'email',
      header: 'Email',
      cell: ({ row }) => row.original.info?.email || '-',
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <span
          className={classNames(
            'rounded-full px-2 py-1 text-xs font-semibold text-white',
            row.original?.active ? 'bg-evergreen' : 'bg-rust'
          )}
        >
          {row.original?.active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
  ];
  return (
    <div className="mt-4 overflow-x-hidden border-t-1 border-gray-100 pt-4">
      <div className="flex flex-col gap-4 lg:flex-row">
        <div
          className={`w-full transition-all duration-300 ease-in-out ${
            showSidebar && sidebarVisible ? 'lg:w-1/2' : 'w-full'
          }`}
        >
          <BaseTable
            tableName="agents"
            title="Agents"
            headerActions={headerActions}
            data={project?.agents || []}
            columns={agentColumns}
            loading={false}
            totalItems={project?.agents?.length || 0}
            pageIndex={1}
            pageSize={1000}
            onRowClick={handleAgentRowClick}
            rowClassName={({ original }) =>
              `cursor-pointer hover:bg-sand-4 ${original._id === selectedAgent?._id ? 'bg-sand-4 border-l-4 border-l-ocean-2' : ''}`
            }
            fixedHeight="auto"
            showPagination={false}
            showSearchInActionBar={false}
            showActionsDropdown={false}
            saveCurentPageColumnToStore={false}
            disableColumnCustomization={true}
          />
        </div>

        {/* Right sidebar for agent selection */}
        <div
          id="agent-selection-section"
          className={`w-full transform space-y-4 border-l-2 border-gray-200 transition-all duration-300 ease-in-out lg:w-1/2 ${
            showSidebar && sidebarVisible
              ? 'translate-x-0 opacity-100'
              : 'translate-x-full opacity-0 lg:absolute lg:right-0 lg:hidden'
          }`}
          style={{ overflow: showSidebar && sidebarVisible ? 'visible' : 'hidden' }}
        >
          {sidebarType === 'add_agents' && (
            <Card
              className="max-h-[530px] w-full overflow-y-auto border-none [&::-webkit-scrollbar]:hidden"
              style={{
                scrollbarWidth: 'none' /* Firefox */,
                msOverflowStyle: 'none' /* Internet Explorer 10+ */,
              }}
            >
              <div className="">
                <div className="sticky top-0 z-10 -mx-4 flex items-center justify-between gap-2 bg-white pr-8 pb-2.5 pl-4">
                  <h4 className="text-sm font-semibold text-nowrap">Select Agents</h4>
                  <div className="flex w-full items-center gap-2">
                    <DebouceInput
                      prefix={<ApolloIcon name="search" className="text-md" />}
                      placeholder="Search Agents"
                      onChange={(e) => {
                        setSearch(e.target.value);
                      }}
                      value={search}
                      size="sm"
                      className="w-full"
                      wait={750}
                    />
                    <div className="flex gap-2">
                      <Button variant="plain" onClick={() => setShowSidebar(false)}>
                        Cancel
                      </Button>
                      <Button
                        variant="solid"
                        onClick={handleAddAgents}
                        disabled={selectedUsers.length === 0 || isAddingAgents}
                        loading={isAddingAgents}
                      >
                        Add Selected ({selectedUsers.length})
                      </Button>
                    </div>
                  </div>
                </div>

                <BaseTable
                  tableName="user-selection"
                  data={filteredUsers}
                  columns={userColumns}
                  loading={false}
                  totalItems={filteredUsers.length}
                  pageIndex={1}
                  pageSize={1000}
                  showPagination={false}
                  showSearchInActionBar={false}
                  showActionsDropdown={false}
                  showHeader={true}
                  headerSticky={true}
                  saveCurentPageColumnToStore={false}
                  disableColumnCustomization={true}
                  fixedHeight="auto"
                />
              </div>
            </Card>
          )}

          {showSidebar && sidebarVisible && sidebarType === 'agent_details' && selectedAgent && (
            <Card className="w-full border-none">
              <AgentEditFromSidebar
                agent={selectedAgent}
                projectId={project._id}
                setSelectedAgent={setSelectedAgent}
                setShowSidebar={setShowSidebar}
                setSidebarVisible={setSidebarVisible}
                onClose={() => setSidebarVisible(!sidebarVisible)}
              />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentTable;
