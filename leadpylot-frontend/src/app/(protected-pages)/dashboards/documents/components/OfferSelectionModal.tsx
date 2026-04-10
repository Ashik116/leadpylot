import React, { useMemo, useState, useEffect } from 'react';
import { ColumnDef } from '@/components/shared/DataTable';
import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import BaseTable from '@/components/shared/BaseTable/BaseTable';
import { useBaseTable } from '@/components/shared/BaseTable/useBaseTable';
import Dialog from '@/components/ui/Dialog/Dialog';
import { apiGetOffers } from '@/services/LeadsService';
import Badge from '@/components/ui/Badge';

interface Offer {
  _id: string;
  title?: string;
  lead_id?: {
    contact_name: string;
    lead_source_no: string;
  };
  project_id?: {
    name: string;
  };
  bank_id?: {
    name: string;
  };
  agent_id?: {
    login: string;
  };
  status?: string;
  investment_volume?: number;
  interest_rate?: number;
  created_at?: string;
  updated_at?: string;
}

interface OfferSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOffer: (offer: Offer) => void;
}

const OfferSelectionModal: React.FC<OfferSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelectOffer,
}) => {
  const [offers, setOffers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalItems, setTotalItems] = useState(0);

  // Component-level pagination and search state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch offers with current parameters
  const fetchOffers = async (page: number, limit: number, search?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiGetOffers({
        page,
        limit,
        search: search || undefined,
      });
      setOffers(response?.data || []);
      setTotalItems(response?.meta?.total || response?.data?.length || 0);
    } catch (err) {
      setError('Failed to fetch offers');
      console.error('Error fetching offers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch offers when modal opens or parameters change
  useEffect(() => {
    if (isOpen) {
      fetchOffers(currentPage, pageSize, searchTerm);
    }
  }, [isOpen, currentPage, pageSize, searchTerm]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCurrentPage(1);
      setSearchTerm('');
      setOffers([]);
      setTotalItems(0);
    }
  }, [isOpen]);

  // Handle pagination change from BaseTable
  const handlePaginationChange = (page: number, newPageSize?: number, searchData?: any) => {
    // Handle page size change
    if (newPageSize && newPageSize !== pageSize) {
      setPageSize(newPageSize);
      setCurrentPage(1); // Reset to first page when page size changes
      return;
    }

    // Handle search change
    if (searchData && searchData.hasOwnProperty('search')) {
      const newSearch = searchData?.search || '';
      if (newSearch !== searchTerm) {
        setSearchTerm(newSearch);
        setCurrentPage(1); // Reset to first page when search changes
        return;
      }
    }

    // Handle page change
    if (page && page !== currentPage) {
      setCurrentPage(page);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower?.includes('won') || statusLower?.includes('success')) return 'bg-evergreen';
    if (statusLower?.includes('lost') || statusLower?.includes('failed')) return 'bg-rust';
    if (statusLower?.includes('pending') || statusLower?.includes('waiting')) return 'bg-ember';
    if (statusLower?.includes('in progress') || statusLower?.includes('active'))
      return 'bg-ocean-2';
    return 'bg-sand-2';
  };

  const columns: ColumnDef<Offer>[] = useMemo(
    () => [
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <Button
            size="xs"
            className="h-5 mt-0.5"
            variant="secondary"
            onClick={() => onSelectOffer(row.original)}
            icon={<ApolloIcon name="plus" className="h-4 w-4" />}
          >
            Select
          </Button>
        ),
      },
      {
        id: 'title',
        header: 'Title',
        accessorKey: 'title',
        cell: ({ row }) => (
          <div className="font-medium text-gray-900">{row.original?.title || '-'}</div>
        ),
      },
      {
        id: 'lead',
        header: 'Lead',
        accessorKey: 'lead_id.contact_name',
        cell: ({ row }) => (
          <div className="text-sm text-gray-600">{row.original?.lead_id?.contact_name || '-'}</div>
        ),
      },
      {
        id: 'partner_id',
        header: 'Partner ID',
        accessorKey: 'lead_id.lead_source_no',
        cell: ({ row }) => (
          <div className="text-sm text-gray-600">
            {row.original?.lead_id?.lead_source_no || '-'}
          </div>
        ),
      },
      {
        id: 'project',
        header: 'Project',
        accessorKey: 'project_id.name',
        cell: ({ row }) => (
          <div className="text-sm text-gray-600">{row.original?.project_id?.name || '-'}</div>
        ),
      },
      {
        id: 'bank',
        header: 'Bank',
        accessorKey: 'bank_id.name',
        cell: ({ row }) => (
          <div className="text-sm text-gray-600">{row.original?.bank_id?.name || '-'}</div>
        ),
      },
      {
        id: 'agent',
        header: 'Agent',
        accessorKey: 'agent_id.login',
        cell: ({ row }) => (
          <div className="text-sm text-gray-600">{row.original?.agent_id?.login || '-'}</div>
        ),
      },
      {
        id: 'investment_volume',
        header: 'Investment Amount',
        accessorKey: 'investment_volume',
        cell: ({ row }) => (
          <div className="text-sm text-gray-600">
            {row.original?.investment_volume
              ? `€${row.original?.investment_volume?.toLocaleString()}`
              : '-'}
          </div>
        ),
      },
      {
        id: 'interest_rate',
        header: 'Rate',
        accessorKey: 'interest_rate',
        cell: ({ row }) => (
          <div className="text-sm text-gray-600">
            {row.original?.interest_rate ? `${row.original?.interest_rate}%` : '-'}
          </div>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        accessorKey: 'status',
        cell: ({ row }) => {
          const status = row.original?.status?.toLowerCase() ?? '';
          const badgeColor = getStatusBadgeColor(status);
          const truncatedStatus = status?.length > 10 ? `${status?.substring(0, 10)}...` : status;

          return (
            <Badge
              className={`block w-24 h-5 text-center capitalize ${badgeColor}`}
              innerClass="text-nowrap text-xs pt-0"
              content={truncatedStatus || '-'}
            />
          );
        },
      },
    ],
    [onSelectOffer]
  );

  const tableConfig = useBaseTable({
    tableName: 'offer-selection',
    data: offers,
    loading: isLoading,
    totalItems: totalItems,
    pageIndex: currentPage,
    pageSize: pageSize,
    pageSizes: [10, 20, 50, 100],
    defaultPageSize: 20,
    columns,
    title: 'Select Offer',
    description: `Showing ${offers?.length} of ${totalItems} offers`,
    noData: !isLoading && offers?.length === 0,
    showNavigation: true,
    selectable: false,
    showPagination: true,
    showSearchInActionBar: true,
    showActionsDropdown: false,
    search: searchTerm,
    searchPlaceholder: 'Search offers...',
    fixedHeight: '70dvh',
    actionBindUrlInQuery: false,
    onPaginationChange: handlePaginationChange,
    saveCurentPageColumnToStore: false,
  });

  if (error) {
    return (
      <Dialog isOpen={isOpen} onClose={onClose} width={800}>
        <div className="flex flex-col items-center justify-center py-8">
          <ApolloIcon name="alert-circle" className="mb-4 h-12 w-12 text-red-400" />
          <h3 className="mb-2 text-lg font-medium text-gray-900">Error Loading Offers</h3>
          <p className="text-gray-500">{error}</p>
          <Button variant="solid" onClick={onClose} className="mt-4">
            Close
          </Button>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog isOpen={isOpen} onClose={onClose} width={1200}>
      <BaseTable {...tableConfig} />
    </Dialog>
  );
};

export default OfferSelectionModal;
