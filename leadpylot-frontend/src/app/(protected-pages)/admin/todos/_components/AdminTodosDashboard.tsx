'use client';

import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
// import Card from '@/components/ui/Card';
import { useGroupedAdminTodos } from '@/services/hooks/useAdminTodos';
import { useSetBackUrl } from '@/hooks/useSetBackUrl';
import { useDrawerStore } from '@/stores/drawerStore';
import useAppendQueryParams from '@/utils/hooks/useAppendQueryParams';
import AdminTodosHeader from './AdminTodosHeader';
import AdminTodosList from './AdminTodosList';
// import AdminTodosStats from './AdminTodosStats';
import SimpleTodoSettings from './SimpleTodoSettings';

// Default page size for admin todos
const TODOS_PER_PAGE = 25;

const AdminTodosDashboard = () => {
  // const router = useRouter();
  const searchParams = useSearchParams();
  const { onAppendQueryParams } = useAppendQueryParams();

  // Set back URL for navigation
  useSetBackUrl('/admin/todos');

  // Drawer state management
  const {
    isOpen,
    sidebarType,
    // selectedId,
    // sidebarKey,
    resetDrawer,
    // onOpenSidebar,
    onHandleSidebar,
  } = useDrawerStore();

  // Local state
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');

  // Get URL parameters
  const pageIndex = Math.max(1, parseInt(searchParams.get('pageIndex') || '1', 10) || 1);
  const pageSize = Math.max(
    1,
    parseInt(searchParams.get('pageSize') || String(TODOS_PER_PAGE), 10) || TODOS_PER_PAGE
  );
  const search = searchParams.get('search');
  const sortBy = searchParams.get('sortBy') || 'priority';
  const sortOrder = searchParams.get('sortOrder') || 'desc';

  // Convert status filter to API parameter
  const isDoneParam = useMemo(() => {
    if (statusFilter === 'pending') return false;
    if (statusFilter === 'completed') return true;
    return undefined;
  }, [statusFilter]);

  // Fetch grouped admin todos
  const { data: groupedTodos, isLoading: todosLoading } = useGroupedAdminTodos({
    page: pageIndex,
    limit: pageSize,
    isDone: isDoneParam,
    search: search || undefined,
    sortBy,
    sortOrder,
  });

  // Handle pagination
  const handlePaginationChange = (newPage: number) => {
    onAppendQueryParams({ pageIndex: newPage });
  };

  const handlePageSizeChange = (newSize: number) => {
    onAppendQueryParams({ pageIndex: 1, pageSize: newSize });
  };

  // Handle search
  const handleSearch = (searchValue: string) => {
    setSearchTerm(searchValue);
    onAppendQueryParams({ search: searchValue || '', pageIndex: 1 });
  };

  // Handle status filter
  const handleStatusFilter = (status: 'all' | 'pending' | 'completed') => {
    setStatusFilter(status);
    onAppendQueryParams({ pageIndex: 1 });
  };

  // Handle settings button click
  const handleSettingsClick = () => {
    onHandleSidebar('todo-templates', 'edit');
  };

  // Handle todo template actions
  // const handleTemplateFormSuccess = () => {
  //   resetDrawer();
  // };

  return (
    <div className=" space-y-2 bg-white p-2 overflow-hidden h-[calc(100dvh-80px)]">
      {/* Header with title and settings button */}
      <AdminTodosHeader
        onSettingsClick={handleSettingsClick}
        searchTerm={searchTerm}
        onSearch={handleSearch}
        statusFilter={statusFilter}
        onStatusFilter={handleStatusFilter}
        statistics={groupedTodos?.statistics}
      />
      {/* Main Content */}
      <div>
        <AdminTodosList
          data={groupedTodos?.data || []}
          isLoading={todosLoading}
          pagination={{
            page: pageIndex,
            pageSize,
            total: groupedTodos?.meta?.total || 0,
            pages: groupedTodos?.meta?.pages || 0,
          }}
          onPaginationChange={handlePaginationChange}
          onPageSizeChange={handlePageSizeChange}
        />
      </div>

      {/* Simple Todo Settings Sidebar */}
      {isOpen && sidebarType === 'edit' && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md transform bg-white shadow-xl transition-transform">
          <SimpleTodoSettings
            onClose={resetDrawer}
          />
        </div>
      )}
    </div>
  );
};

export default AdminTodosDashboard;
