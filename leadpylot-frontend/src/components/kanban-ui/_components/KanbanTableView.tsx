import React, { useMemo, useState } from 'react';
import { ColumnDef } from '@/components/shared/DataTable';
import BaseTable from '@/components/shared/BaseTable/BaseTable';
import { Task } from '../types';
import { useBaseTable } from '@/components/shared/BaseTable/useBaseTable';


interface KanbanTableViewProps {
  cards: Task[];
  onCardClick: (card: Task) => void;
  loading?: boolean;
}

export const KanbanTableView: React.FC<KanbanTableViewProps> = ({
  cards,
  onCardClick,
  loading = false,
}) => {
  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');

  // Define columns
  const columns: ColumnDef<Task>[] = useMemo(
    () => [
      {
        id: 'title',
        header: 'Title',
        accessorKey: 'title',
        cell: ({ row }) => (
          <div className="font-medium text-gray-900">{row.original.title}</div>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        accessorKey: 'status',
        cell: ({ row }) => (
          <span className="inline-flex items-center rounded-full bg-ocean-2/10 px-2.5 py-0.5 text-xs font-medium text-ocean-2">
            {row.original.status}
          </span>
        ),
      },
      {
        id: 'revenue',
        header: 'Revenue',
        accessorKey: 'revenue',
        cell: ({ row }) => (
          <div className="font-medium text-emerald-600">
            {row.original.revenue ? `$${row.original.revenue}` : '-'}
          </div>
        ),
      },
      {
        id: 'project',
        header: 'Project',
        accessorKey: 'project',
        cell: ({ row }) => (
          <div className="text-gray-700">{row.original.project || '-'}</div>
        ),
      },
      {
        id: 'emails',
        header: 'Emails',
        accessorKey: 'emails',
        cell: ({ row }) => {
          const emailCount = row.original.emails?.length || 0;
          const memberCount = row.original.members?.length || 0;
          return (
            <div className="flex items-center gap-2">
              {memberCount > 0 && (
                <div className="flex -space-x-2">
                  {row.original.members.slice(0, 3).map((memberId, idx) => (
                    <div key={memberId || idx} className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-indigo-500 text-xxs font-bold text-white">
                      {/* {memberId?.charAt(0)?.toUpperCase() || '-'} */}
                    </div>
                  ))}
                  {memberCount > 3 && (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-gray-100 text-xs text-gray-600">
                      +{memberCount - 3}
                    </div>
                  )}
                </div>
              )}
              <span className="text-sm text-gray-600">
                {emailCount} email{emailCount !== 1 ? 's' : ''}
              </span>
            </div>
          );
        },
      },
      {
        id: 'labels',
        header: 'Labels',
        accessorKey: 'labels',
        cell: ({ row }) => {
          const labels = row.original.labels || [];
          if (labels.length === 0) return <span className="text-gray-400">-</span>;
          return (
            <div className="flex flex-wrap gap-1">
              {labels.slice(0, 3).map((labelId, idx) => (
                <span
                  key={labelId?._id || idx}
                  className="inline-flex items-center rounded-lg px-2 py-0.5 text-xxs font-bold text-white"
                  style={{ backgroundColor: '#579dff' }}
                >
                  {labelId.title}
                </span>
              ))}
              {labels.length > 3 && (
                <span className="text-xs text-gray-500">+{labels.length - 3}</span>
              )}
            </div>
          );
        },
      },
    ],
    []
  );

  // Handle pagination
  const handlePaginationChange = (newPageIndex: number, newPageSize?: number, searchText?: any) => {
    setPageIndex(newPageIndex);
    if (newPageSize) {
      setPageSize(newPageSize);
    }
    if (searchText) {
      setSearch(typeof searchText === 'string' ? searchText : '');
    }
  };

  // Handle row click
  const handleRowClick = (card: Task) => {
    onCardClick(card);
  };

  // Filter cards based on search
  const filteredCards = useMemo(() => {
    if (!search) return cards;
    const searchLower = search.toLowerCase();
    return cards.filter(
      (card) =>
        card.title.toLowerCase().includes(searchLower) ||
        card.status.toLowerCase().includes(searchLower) ||
        card.project?.toLowerCase().includes(searchLower) ||
        card.contact?.toLowerCase().includes(searchLower)
    );
  }, [cards, search]);

  // Paginate cards
  const paginatedCards = useMemo(() => {
    const start = (pageIndex - 1) * pageSize;
    const end = start + pageSize;
    return filteredCards.slice(start, end);
  }, [filteredCards, pageIndex, pageSize]);

  // Use useBaseTable hook
  const tableConfig = useBaseTable<Task>({
    tableName: 'kanban-cards',
    data: paginatedCards,
    columns,
    loading,
    totalItems: filteredCards.length,
    pageIndex,
    pageSize,
    onPaginationChange: handlePaginationChange,
    search,
    searchPlaceholder: 'Search cards...',
    onRowClick: handleRowClick,
    rowClassName: 'cursor-pointer hover:bg-gray-50',
    showPagination: true,
    showSearchInActionBar: true,
    showActionsDropdown: false,
    deleteButton: false,
    selectable: true,
    rowIdField: 'id',
    actionBindUrlInQuery: false,
    fixedHeight: 'calc(100vh - 200px)',
    tableClassName: 'h-full',
    isBackendSortingReady: false,
  });

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden px-1">
      <BaseTable {...tableConfig} />
    </div>
  );
};
