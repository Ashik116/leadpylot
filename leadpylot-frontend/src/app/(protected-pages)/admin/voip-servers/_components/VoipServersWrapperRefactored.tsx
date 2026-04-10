'use client';

import { useMemo, useState, useEffect } from 'react';
import { ColumnDef } from '@/components/shared/DataTable';
import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { useVoipServers } from '@/services/hooks/useSettings';
import { useBaseTable } from '@/components/shared/BaseTable/useBaseTable';
import BaseTable from '@/components/shared/BaseTable/BaseTable';
import { useDrawerStore } from '@/stores/drawerStore';
import VoipFromWrapperComponent from './VoipFromWrapperComponent';
import { apiDeleteVoipServer, apiGetVoipServers } from '@/services/SettingsService';
import Card from '@/components/ui/Card';
import { usePathname, useSearchParams } from 'next/navigation';
import { useActiveRow } from '@/hooks/useActiveRow';
import { getSidebarLayout } from '@/utils/transitions';
import { useSelectAllApi } from '@/components/shared/BaseTable/hooks/useSelectAllApi';
import { useSetBackUrl } from '@/hooks/useSetBackUrl';
import RoleGuard from '@/components/shared/RoleGuard';
import ExtensionsTableWrapper from '../../freepbx-extensions/_components/ExtensionsTableWrapper';
import TrunksTableWrapper from '../../freepbx-trunks/_components/TrunksTableWrapper';
import InboundRoutesTableWrapper from '../../freepbx-inbound-routes/_components/InboundRoutesTableWrapper';
import OutboundRoutesTableWrapper from '../../freepbx-outbound-routes/_components/OutboundRoutesTableWrapper';

type TabType = 'servers' | 'trunks' | 'extensions' | 'inbound-routes' | 'outbound-routes';

const VoipServersWrapperRefactored = () => {
  const pathname = usePathname();
  useSetBackUrl(pathname);

  // State for tab selection with localStorage
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    // Get stored tab from localStorage
    const storageKey = 'voip_dashboard_active_tab';
    if (typeof window !== 'undefined') {
      const storedTab = localStorage.getItem(storageKey);
      // Validate stored tab
      if (
        storedTab === 'servers' ||
        storedTab === 'trunks' ||
        storedTab === 'extensions' ||
        storedTab === 'inbound-routes' ||
        storedTab === 'outbound-routes'
      ) {
        return storedTab;
      }
    }
    // Default to servers
    return 'servers';
  });

  const {
    isOpen,
    sidebarType,
    selectedId,
    sidebarKey,
    resetDrawer,
    onOpenSidebar,
    onHandleSidebar,
  } = useDrawerStore();

  // Use the active row hook
  const { handleRowClick, handleAddNew, handleEdit, getRowClassName, handleFormSuccess } =
    useActiveRow({ onHandleSidebar, resetDrawer });

  // Save active tab to localStorage whenever it changes
  useEffect(() => {
    const storageKey = 'voip_dashboard_active_tab';
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, activeTab);
    }
  }, [activeTab]);

  // Handle tab change and reset drawer state
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    resetDrawer();
  };
  // Pagination state management
  const searchParams = useSearchParams();
  const pageIndex = parseInt(searchParams.get('pageIndex') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);
  const search = searchParams.get('search') || '';
  const sortBy = searchParams.get('sortBy') || undefined;
  const sortOrder = searchParams.get('sortOrder') || undefined;

  const { data: servers, isLoading } = useVoipServers({
    page: pageIndex,
    limit: pageSize,
    search: search || undefined,
    sortBy: sortBy || undefined,
    sortOrder: sortOrder || undefined,
  });

  const { selected: selectedVoipServers, handleSelectAll: handleSelectAllVoipServer } =
    useSelectAllApi({
      apiFn: apiGetVoipServers,
      apiParams: {
        page: pageIndex,
        limit: pageSize,
        search: search || undefined,
        sortBy: sortBy || undefined,
        sortOrder: sortOrder || undefined,
        select: '_id',
      },
      total: servers?.meta?.total || 0,
      returnFullObjects: true,
    });

  // Define columns for the DataTable
  const columns: ColumnDef<any>[] = useMemo(
    () => [
      {
        id: 'name',
        header: 'Name',
        accessorKey: 'name',
        columnWidth: 70,
        minSize: 70,
      },
      {
        id: 'domain',
        header: 'Domain',
        accessorKey: 'info.domain',
        enableSorting: true,
        columnWidth: 100,
        minSize: 70,
        cell: (props: any) => props.row.original?.info?.domain || '-',
      },
      {
        id: 'address',
        header: 'Address',
        columnWidth: 100,
        minSize: 80,
        accessorKey: 'info.websocket_address',
        enableSorting: true,
        cell: (props: any) => props.row.original?.info?.websocket_address || '-',
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: (props: any) => (
          <div className="flex items-center gap-2">
            <Button
              variant="plain"
              size="xs"
              className="text-sand-2 hover:text-ocean-2"
              icon={<ApolloIcon name="pen" className="text-md" />}
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(props.row.original?._id);
              }}
            />
          </div>
        ),
      },
    ],
    [handleEdit]
  );

  // BaseTable configuration
  const tableConfig = useBaseTable({
    tableName: 'voip-servers',
    data: servers?.data || [],
    loading: isLoading,
    totalItems: servers?.meta?.total || 0,
    pageIndex,

    pageSize,
    search,
    columns,
    selectable: true,
    returnFullObjects: true,
    isBackendSortingReady: true,
    selectedRows: selectedVoipServers,
    onSelectAll: handleSelectAllVoipServer,
    bulkActionsConfig: {
      entityName: 'voipservers',
      deleteUrl: '/settings/voipservers',
      invalidateQueries: ['voip-servers'],
      singleDeleteConfig: {
        deleteFunction: apiDeleteVoipServer,
      },
    },
    customActions: ({ setDeleteConfirmOpen }: { setDeleteConfirmOpen: (open: boolean) => void }) => (
      <RoleGuard>
        <Button
          variant="destructive"
          size="xs"
          icon={<ApolloIcon name="trash" className="text-md" />}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setDeleteConfirmOpen(true);
          }}
        >
          Delete
        </Button>
      </RoleGuard>
    ),
    showPagination: !isOpen && activeTab === 'servers',
    extraActions:
      activeTab === 'servers' ? (
        <div className="flex items-center">
          <Button
            variant="solid"
            size="xs"
            icon={<ApolloIcon name={isOpen ? 'arrow-right' : 'plus'} />}
            onClick={!isOpen ? handleAddNew : onOpenSidebar}
          >
            {!isOpen ? (
              <>
                Add <span className="hidden md:inline">Server</span>{''}
              </>
            ) : (
              ''
            )}
          </Button>
        </div>
      ) : undefined,
    onRowClick: (row) => handleRowClick(row._id),
    rowClassName: getRowClassName,
    setPageInfoFromBaseTable: true,
    pageInfoTitle: 'VOIP Servers',
    pageInfoSubtitlePrefix: 'Total Servers',
    fixedHeight: 'auto',
  });

  // Get common transition classes
  const layout = getSidebarLayout(isOpen);

  return (
    <div>
      {/* Button-style Tabs Navigation */}
      <Card className="border-none" bodyClass="px-3">
        <div className="flex items-center gap-2">
          <Button
            variant={activeTab === 'servers' ? 'secondary' : 'default'}
            onClick={() => handleTabChange('servers')}
            size='xs'
            icon={<ApolloIcon name="grid" />}
            className={
              activeTab === 'servers'
                ? 'hover:bg-btn-servers filter-triangle-indicator relative flex items-center justify-center gap-2 bg-black text-white hover:text-white'
                : 'bg-btn-servers hover:bg-btn-servers relative flex items-center justify-center gap-2 hover:text-black'
            }
          >
            VOIP Servers
          </Button>
          <Button
            variant={activeTab === 'trunks' ? 'secondary' : 'default'}
            onClick={() => handleTabChange('trunks')}
            size='xs'

            icon={<ApolloIcon name="cloud-computing" />}
            className={
              activeTab === 'trunks'
                ? 'hover:bg-btn-trunks filter-triangle-indicator relative flex items-center justify-center gap-2 bg-black text-white hover:text-white'
                : 'bg-btn-trunks hover:bg-btn-trunks relative flex items-center justify-center gap-2 hover:text-black'
            }
          >
            Trunks
          </Button>
          <Button
            variant={activeTab === 'extensions' ? 'secondary' : 'default'}
            onClick={() => handleTabChange('extensions')}
            size='xs'
            icon={<ApolloIcon name="puzzle" />}
            className={
              activeTab === 'extensions'
                ? 'hover:bg-btn-extensions filter-triangle-indicator relative flex items-center justify-center gap-2 bg-black text-white hover:text-white'
                : 'bg-btn-extensions hover:bg-btn-extensions relative flex items-center justify-center gap-2 hover:text-black'
            }
          >
            Extensions
          </Button>
          <Button
            variant={activeTab === 'inbound-routes' ? 'secondary' : 'default'}
            onClick={() => handleTabChange('inbound-routes')}
            icon={<ApolloIcon name="arrow-down" />}
            size='xs'
            className={
              activeTab === 'inbound-routes'
                ? 'hover:bg-btn-inbound filter-triangle-indicator relative flex items-center justify-center gap-2 bg-black text-white hover:text-white'
                : 'bg-btn-inbound hover:bg-btn-inbound relative flex items-center justify-center gap-2 hover:text-black'
            }
          >
            Inbound
          </Button>
          <Button
            variant={activeTab === 'outbound-routes' ? 'secondary' : 'default'}
            onClick={() => handleTabChange('outbound-routes')}
            icon={<ApolloIcon name="arrow-up" />}
            size='xs'
            className={
              activeTab === 'outbound-routes'
                ? 'hover:bg-btn-outbound filter-triangle-indicator relative flex items-center justify-center gap-2 bg-black text-white hover:text-white'
                : 'bg-btn-outbound hover:bg-btn-outbound relative flex items-center justify-center gap-2 hover:text-black'
            }
          >
            Outbound
          </Button>
        </div>
      </Card>

      {/* Tab Content */}
      <div className="px-3">
        {activeTab === 'servers' && (
          <div className={layout.container}>
            {/* Main content */}
            <div className={`${layout.mainContent} relative z-10 mt-4 lg:mt-0`}>
              <BaseTable {...tableConfig} />
            </div>

            {/* Right sidebar for create/edit */}
            <div
              className={`${layout.sidebar} border-gray-100 text-sm lg:border-l-2 lg:pl-2`}
              style={layout.sidebarStyles}
            >
              <Card className="border-none">
                <VoipFromWrapperComponent
                  key={`voip-${sidebarType || 'create'}-${selectedId}-${sidebarKey}`}
                  type={sidebarType || ('create' as any)}
                  id={selectedId || undefined}
                  onSuccess={handleFormSuccess}
                  onClose={onOpenSidebar}
                />
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'trunks' && <TrunksTableWrapper />}

        {activeTab === 'extensions' && <ExtensionsTableWrapper />}

        {activeTab === 'inbound-routes' && <InboundRoutesTableWrapper />}

        {activeTab === 'outbound-routes' && <OutboundRoutesTableWrapper />}
      </div>
    </div>
  );
};

export default VoipServersWrapperRefactored;
