'use client';

import { useState, useMemo } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { ColumnDef } from '@/components/shared/DataTable';
import BaseTable from '@/components/shared/BaseTable/BaseTable';
import { useBaseTable } from '@/components/shared/BaseTable/useBaseTable';
import { useDrawerStore } from '@/stores/drawerStore';
import { useActiveRow } from '@/hooks/useActiveRow';
import { getSidebarLayout } from '@/utils/transitions';
import {
  useRoleBasedEmails,
  useAvailableMailServers,
  useEmailStatisticsByMailServer,
  useAdminEmailMutations,
  type UseEmailSystemParams,
} from '@/services/hooks/useEmailSystem';
import { EmailSystemEmail } from '@/services/emailSystem/EmailSystemService';
import { useSetBackUrl } from '@/hooks/useSetBackUrl';
import { ProjectEmailSyncComponent } from '@/components/admin/ProjectEmailSyncComponent';
import { useAllProjects } from '@/services/hooks/useProjects';

const EmailSystemPage = () => {
  const pathname = usePathname();
  useSetBackUrl(pathname);
  const { isOpen, selectedId, resetDrawer, onOpenSidebar, onHandleSidebar } = useDrawerStore();

  // URL params
  const searchParams = useSearchParams();
  const pageIndex = parseInt(searchParams.get('pageIndex') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
  const search = searchParams.get('search') || '';

  // Filters
  const [selectedMailServerId, setSelectedMailServerId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Active row management
  const { handleRowClick, handleEdit, getRowClassName } = useActiveRow({
    onHandleSidebar,
    resetDrawer,
  });

  // Data fetching
  const { data: mailServers, isLoading: mailServersLoading } = useAvailableMailServers();
  const { data: emailStats } = useEmailStatisticsByMailServer({
    mailserver_id: selectedMailServerId || undefined,
  });
  const { data: projects } = useAllProjects({ limit: 100 });

  // Email filters
  const emailParams: UseEmailSystemParams = useMemo(
    () => ({
      page: pageIndex,
      limit: pageSize,
      search: search || undefined,
      mailserver_id: selectedMailServerId || undefined,
      status: statusFilter === 'all' ? undefined : (statusFilter as any),
      sort_by: 'received_at',
      sort_order: 'desc',
    }),
    [pageIndex, pageSize, search, selectedMailServerId, statusFilter]
  );

  const { data: emailsData, isLoading: emailsLoading } = useRoleBasedEmails(emailParams);

  // Email mutations
  const { approveEmail, refreshEmails } = useAdminEmailMutations();

  // Filter options
  const statusOptions = [
    { value: 'all', label: 'All Emails' },
    { value: 'pending', label: 'Pending Approval' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
  ];

  const mailServerOptions = useMemo(
    () => [
      { value: '', label: 'All Mail Servers' },
      ...(mailServers?.map((ms) => ({
        value: ms._id,
        label: `${ms.name} (${ms.adminEmail})`,
      })) || []),
    ],
    [mailServers]
  );

  // Table columns
  const columns: ColumnDef<EmailSystemEmail>[] = useMemo(
    () => [
      {
        id: 'subject',
        header: 'Subject',
        accessorKey: 'subject',
        cell: (props) => (
          <div className="max-w-xs truncate">
            <div className="font-medium">{props.row.original.subject}</div>
            <div className="text-sm text-gray-500">
              From: {props.row.original.from || props.row.original.from_address}
            </div>
          </div>
        ),
      },
      {
        id: 'mailserver',
        header: 'Mail Server',
        cell: (props) => (
          <div className="text-sm">
            <div className="font-medium">Mail Server Info</div>
            <div className="text-gray-500">{props.row.original.from_address || '-'}</div>
          </div>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        cell: (props) => {
          const email = props.row.original as any;
          const getStatusBadge = () => {
            if (email.approval_status === 'pending') {
              return (
                <span className="rounded bg-yellow-100 px-2 py-1 text-xs text-yellow-800">
                  Pending
                </span>
              );
            }
            // Fully Approved: approval_approved_at and attachment_approved_at are both set
            if (email.approval_approved_at && email.attachment_approved_at) {
              return (
                <span className="rounded bg-green-100 px-2 py-1 text-xs text-green-800">
                  Fully Approved
                </span>
              );
            }
            // Email Approved: approval_approved_at is set, but not attachment_approved_at
            if (email.approval_approved_at) {
              return (
                <span className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-800">
                  Email Approved
                </span>
              );
            }
            return (
              <span className="rounded bg-red-100 px-2 py-1 text-xs text-red-800">Rejected</span>
            );
          };
          return getStatusBadge();
        },
      },
      {
        id: 'received_at',
        header: 'Received',
        cell: (props: any) => {
          const receivedAt = props.row.original.received_at || props.row.original.created_at;
          return (
            <div className="text-sm">
              {receivedAt ? new Date(receivedAt).toLocaleDateString() : '-'}
              <br />
              <span className="text-gray-500">
                {receivedAt ? new Date(receivedAt).toLocaleTimeString() : '-'}
              </span>
            </div>
          );
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: (props: any) => (
          <div className="flex items-center gap-1">
            {props?.row.original.approval_status === 'pending' && (
              <Button
                variant="plain"
                size="xs"
                className="text-green-600 hover:text-green-700"
                icon={<ApolloIcon name="check" className="text-sm" />}
                onClick={(e) => {
                  e.stopPropagation();
                  approveEmail.mutate({ id: props.row.original._id });
                }}
                title="Approve Email"
              />
            )}
            <Button
              variant="plain"
              size="xs"
              className="text-blue-600 hover:text-blue-700"
              icon={<ApolloIcon name="search" className="text-sm" />}
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(props.row.original._id);
              }}
              title="View Details"
            />
          </div>
        ),
      },
    ],
    [approveEmail, handleEdit]
  );

  // BaseTable configuration
  const tableConfig = useBaseTable({
    tableName: 'emails',
    data: emailsData?.emails || [],
    loading: emailsLoading,
    totalItems: emailsData?.pagination?.total || 0,
    pageIndex,
    pageSize,
    search,
    columns,
    title: 'Email System',
    headerActions: (
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          icon={<ApolloIcon name="refresh" className="text-md" />}
          onClick={() => refreshEmails.mutate()}
          disabled={refreshEmails.isPending}
        >
          Refresh
        </Button>
        {isOpen && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onOpenSidebar}
            icon={<ApolloIcon name={isOpen ? 'arrow-right' : 'arrow-left'} className="text-md" />}
          >
            {isOpen ? 'Hide' : 'Show'} Details
          </Button>
        )}
      </div>
    ),
    onRowClick: (row) => {
      handleRowClick(row._id);
    },
    rowClassName: getRowClassName,
  });

  // Layout
  const layout = getSidebarLayout(isOpen);

  return (
    <div className="mx-2 flex flex-col gap-4 xl:mx-0">
      {/* Statistics Cards */}
      {emailStats && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="p-4">
            <div className="text-2xl font-bold text-blue-600">{emailStats.overall.totalEmails}</div>
            <div className="text-sm text-gray-600">Total Emails</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-yellow-600">
              {emailStats.overall.pendingApproval}
            </div>
            <div className="text-sm text-gray-600">Pending Approval</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {emailStats.overall.fullyApproved}
            </div>
            <div className="text-sm text-gray-600">Fully Approved</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-purple-600">
              {emailStats.overall.leadMatchRate}%
            </div>
            <div className="text-sm text-gray-600">Lead Match Rate</div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Mail Server</label>
            <Select
              value={mailServerOptions.find((opt) => opt.value === selectedMailServerId) || null}
              onChange={(option: any) => setSelectedMailServerId(option?.value || '')}
              options={mailServerOptions}
              isLoading={mailServersLoading}
              placeholder="Select mail server"
              isClearable
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Status</label>
            <Select
              value={statusOptions.find((opt) => opt.value === statusFilter) || null}
              onChange={(option: any) => setStatusFilter(option?.value || 'all')}
              options={statusOptions}
              placeholder="Select status"
              isClearable
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Search</label>
            <Input
              placeholder="Search emails... (use table search)"
              value={search}
              disabled
              readOnly
            />
          </div>
        </div>
      </Card>

      {/* Mail Server Statistics */}
      {emailStats && selectedMailServerId && (
        <Card className="p-4">
          <h3 className="mb-4 text-lg font-semibold">Mail Server Statistics</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {emailStats.byMailServer
              .filter((ms) => !selectedMailServerId || ms.mailserverId === selectedMailServerId)
              .map((ms) => (
                <div key={ms.mailserverId} className="rounded border p-3">
                  <div className="font-medium">{ms.mailserverName}</div>
                  <div className="text-sm text-gray-600">{ms.adminEmail}</div>
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between">
                      <span>Total:</span>
                      <span className="font-medium">{ms.totalEmails}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pending:</span>
                      <span className="font-medium text-yellow-600">{ms.pendingApproval}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Approved:</span>
                      <span className="font-medium text-green-600">{ms.fullyApproved}</span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </Card>
      )}

      {/* Email Project Synchronization */}
      <Card className="p-4">
        <h3 className="mb-4 text-lg font-semibold">Email Project Synchronization</h3>
        <p className="mb-4 text-sm text-gray-600">
          Manually synchronize emails with project assignments to ensure data consistency.
        </p>
        
        {projects?.data && Array.isArray(projects.data) && projects.data.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.data.slice(0, 6).map((project: any) => (
              <div key={project._id} className="rounded border p-3">
                <div className="mb-2 font-medium">{project.name}</div>
                <div className="text-sm text-gray-600 mb-3">
                  Active: {project.active ? 'Yes' : 'No'}
                </div>
                <ProjectEmailSyncComponent
                  projectId={project._id}
                  projectName={project.name}
                  variant="button"
                  onSyncComplete={(result) => {
                    // Project sync completed successfully
                    console.info(`Sync completed for ${result.projectName}:`, result);
                    // Optionally refresh the email data here
                  }}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No projects available for synchronization</p>
          </div>
        )}
        
        {projects?.data && Array.isArray(projects.data) && projects.data.length > 6 && (
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500">
              Showing first 6 projects. Use individual project pages for complete sync options.
            </p>
          </div>
        )}
      </Card>

      {/* Main Content */}
      <div className={layout.container}>
        {/* Email Table */}
        <div className={layout.mainContent}>
          <BaseTable {...tableConfig} />
        </div>

        {/* Email Details Sidebar */}
        <div className={layout.sidebar} style={layout.sidebarStyles}>
          <Card>
            <div className="p-4">
              <h3 className="mb-4 text-lg font-semibold">Email Details</h3>
              {selectedId ? (
                <div>
                  <p>Email ID: {selectedId}</p>
                  {/* Add detailed email view component here */}
                </div>
              ) : (
                <p className="text-gray-500">Select an email to view details</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EmailSystemPage;
