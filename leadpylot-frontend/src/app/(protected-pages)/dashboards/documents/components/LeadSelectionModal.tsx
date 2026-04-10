import React, { useMemo, useState, useEffect } from 'react';
import { ColumnDef } from '@/components/shared/DataTable';
import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import BaseTable from '@/components/shared/BaseTable/BaseTable';
import { useBaseTable } from '@/components/shared/BaseTable/useBaseTable';
import Dialog from '@/components/ui/Dialog/Dialog';
import { apiGetLeads } from '@/services/LeadsService';
import { Lead } from '@/services/LeadsService';
import Badge from '@/components/ui/Badge';
import { getStatusBadgeColor } from '@/utils/utils';

interface LeadSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLead: (lead: Lead) => void;
}

const LeadSelectionModal: React.FC<LeadSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelectLead,
}) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalItems, setTotalItems] = useState(0);

  // Component-level pagination and search state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch leads with current parameters
  const fetchLeads = async (page: number, limit: number, search?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiGetLeads({
        page,
        limit,
        search: search || undefined,
      });
      setLeads(response.data || []);
      setTotalItems(response.meta?.total || response.data?.length || 0);
    } catch (err) {
      setError('Failed to fetch leads');
      console.error('Error fetching leads:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch leads when modal opens or parameters change
  useEffect(() => {
    if (isOpen) {
      fetchLeads(currentPage, pageSize, searchTerm);
    }
  }, [isOpen, currentPage, pageSize, searchTerm]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCurrentPage(1);
      setSearchTerm('');
      setLeads([]);
      setTotalItems(0);
    }
  }, [isOpen]);

  // Handle pagination change from BaseTable
  const handlePaginationChange = (page: number, newPageSize?: number, searchData?: any) => {
    // Handle search change first
    if (searchData && searchData.hasOwnProperty('search')) {
      const newSearch = searchData?.search || '';
      if (newSearch !== searchTerm) {
        setSearchTerm(newSearch);
        setCurrentPage(1); // Reset to first page when search changes
        return;
      }
    }

    // Handle page size change
    if (newPageSize && newPageSize !== pageSize) {
      setPageSize(newPageSize);
      setCurrentPage(1); // Reset to first page when page size changes
      return;
    }

    // Handle page change
    if (page && page !== currentPage) {
      setCurrentPage(page);
    }
  };

  const getUseStatusBadgeColor = (useStatus: string) => {
    const status = useStatus.toLowerCase();
    if (status === 'new' || status === 'usable') return 'bg-evergreen';
    if (status === 'not usable' || status === 'reclamation') return 'bg-rust';
    if (status === 'in use') return 'bg-ocean-2';
    if (status === 'pending') return 'bg-ember';
    return 'bg-sand-2';
  };

  const columns: ColumnDef<Lead>[] = useMemo(
    () => [
      {
        id: 'actions',
        header: 'Actions',
        columnWidth: 120,
        cell: ({ row }) => (
          <Button
            size="xs"
            className="h-5 mt-0.5"
            variant="secondary"
            onClick={() => onSelectLead(row.original)}
            icon={<ApolloIcon name="plus" className="text-white" />}
          >
            Select
          </Button>
        ),
      },
      {
        id: 'contact_name',
        header: 'Contact Name',
        accessorKey: 'contact_name',
        cell: ({ row }) => (
          <div className="font-medium text-gray-900">{row.original?.contact_name || '-'}</div>
        ),
      },
      {
        id: 'lead_source_no',
        header: 'Partner ID',
        accessorKey: 'lead_source_no',
        cell: ({ row }) => (
          <div className="text-sm text-gray-600">{row.original?.lead_source_no || '-'}</div>
        ),
      },
      {
        id: 'phone',
        header: 'Phone',
        accessorKey: 'phone',
        cell: ({ row }) => (
          <div className="text-sm text-gray-600">{row.original?.phone || '-'}</div>
        ),
      },
      {
        id: 'email_from',
        header: 'Email',
        accessorKey: 'email_from',
        cell: ({ row }) => (
          <div className="text-sm text-gray-600">{row.original?.email_from || '-'}</div>
        ),
      },
      {
        id: 'expected_revenue',
        header: 'Expected Revenue',
        accessorKey: 'expected_revenue',
        cell: ({ row }) => (
          <div className="text-sm text-gray-600">
            {row.original?.expected_revenue
              ? `${row.original.expected_revenue.toLocaleString()}`
              : '-'}
          </div>
        ),
      },
      {
        id: 'status',
        header: 'Lead Status',
        accessorKey: 'status',
        cell: ({ row }) => {
          const statusName = row.original?.status?.name?.toLowerCase() ?? '';
          const badgeColor = getStatusBadgeColor(statusName);
          const truncatedStatus =
            statusName.length > 10 ? `${statusName.substring(0, 10)}...` : statusName;

          return (
            <Badge
              className={`block w-24 h-5 text-center capitalize ${badgeColor}`}
              innerClass="text-nowrap text-xs pt-0"
              content={truncatedStatus || '-'}
            />
          );
        },
      },
      {
        id: 'use_status',
        header: 'Use Status',
        accessorKey: 'use_status',
        cell: ({ row }) => {
          const useStatus = row.original?.use_status?.toLowerCase().replace('_', ' ');
          const badgeColor = getUseStatusBadgeColor(useStatus);

          return (
            <Badge
              className={`block w-20 h-5 text-center capitalize ${badgeColor}`}
              innerClass="text-nowrap text-xs pt-0"
              content={useStatus ?? '-'}
            />
          );
        },
      },
      {
        id: 'project',
        header: 'Project',
        accessorKey: 'project.name',
        cell: ({ row }) => (
          <div className="text-sm text-gray-600">
            {Array.isArray(row.original?.project)
              ? row.original?.project?.[0]?.name
              : row.original?.project?.name || '-'}
          </div>
        ),
      },
      {
        id: 'agent',
        header: 'Agent',
        accessorKey: 'assigned_agent.login',
        cell: ({ row }) => (
          <div className="text-sm text-gray-600">
            {row.original?.assigned_agent?.login || (row?.original as any)?.agent_name || '-'}
          </div>
        ),
      },
    ],
    [onSelectLead]
  );

  const tableConfig = useBaseTable({
    tableName: 'lead-selection',
    data: leads,
    columns,
    loading: isLoading,
    totalItems: totalItems,
    pageIndex: currentPage,
    pageSize: pageSize,
    pageSizes: [10, 20, 50, 100],
    defaultPageSize: 20,
    title: 'Select Lead',
    description: `Showing ${leads?.length} of ${totalItems} leads`,
    noData: !isLoading && leads?.length === 0,
    showNavigation: true,
    selectable: false,
    showPagination: true,
    showSearchInActionBar: true,
    showActionsDropdown: false,
    search: searchTerm,
    searchPlaceholder: 'Search list...',
    fixedHeight: '70dvh',
    actionBindUrlInQuery: false,
    onPaginationChange: handlePaginationChange,
    saveCurentPageColumnToStore: false,
    isBackendSortingReady: true, // Enable backend pagination
  });

  if (error) {
    return (
      <Dialog isOpen={isOpen} onClose={onClose} width={800}>
        <div className="flex flex-col items-center justify-center py-8">
          <ApolloIcon name="alert-circle" className="mb-4 h-12 w-12 text-red-400" />
          <h3 className="mb-2 text-lg font-medium text-gray-900">Error Loading Leads</h3>
          <p className="text-gray-500">{error}</p>
          <Button variant="solid" onClick={onClose} className="mt-4">
            Close
          </Button>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog className="" isOpen={isOpen} onClose={onClose} width={1200}>
      <BaseTable {...tableConfig} />
    </Dialog>
  );
};

export default LeadSelectionModal;
