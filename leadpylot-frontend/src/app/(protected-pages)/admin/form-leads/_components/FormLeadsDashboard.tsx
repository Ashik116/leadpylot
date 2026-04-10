'use client';

import BaseTable from '@/components/shared/BaseTable/BaseTable';
import { useSelectAllApi } from '@/components/shared/BaseTable/hooks/useSelectAllApi';
import { useBaseTable } from '@/components/shared/BaseTable/useBaseTable';
import { ColumnDef } from '@/components/shared/DataTable';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Button from '@/components/ui/Button';
import { useActiveRow } from '@/hooks/useActiveRow';
import { useSetBackUrl } from '@/hooks/useSetBackUrl';
import RoleGuard from '@/components/shared/RoleGuard';
import {
  apiGetLeadForms,
  apiDeleteLeadForm,
  mapLeadFormToImportPayload,
  type LeadForm,
} from '@/services/LeadFormService';
import {
  useLeadFormsData,
  useImportLeadsFromForms,
} from '@/services/hooks/useLeadForms';
import Notification from '@/components/ui/Notification';
import { toast } from '@/components/ui/toast';
import { useDrawerStore } from '@/stores/drawerStore';
import { getSidebarLayout } from '@/utils/transitions';
import { dateFormateUtils } from '@/utils/dateFormateUtils';
import { usePathname, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { LeadFormDetailsSidebar } from './LeadFormDetailsSidebar';

const FormLeadsDashboard = () => {
  const pathname = usePathname();
  useSetBackUrl(pathname);
  const {
    isOpen,
    sidebarType,
    selectedId,
    sidebarKey,
    resetDrawer,
    onOpenSidebar,
    onHandleSidebar,
  } = useDrawerStore();

  const { handleRowClick, handleEdit, getRowClassName, handleFormSuccess } = useActiveRow({
    onHandleSidebar,
    resetDrawer,
  });

  const searchParams = useSearchParams();
  const pageIndex = parseInt(searchParams.get('pageIndex') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);
  const search = searchParams.get('search') || '';
  const sortBy = searchParams.get('sortBy') || undefined;
  const sortOrder = searchParams.get('sortOrder') || undefined;

  const { data: leadsData, isLoading } = useLeadFormsData({
    page: pageIndex,
    limit: pageSize,
    search: search || undefined,
    sortBy: sortBy || undefined,
    sortOrder: sortOrder || undefined,
  });

  const {
    selected: selectedLeads,
    setSelected: setSelectedLeads,
    handleSelectAll: handleSelectAllLeads,
  } = useSelectAllApi({
    apiFn: apiGetLeadForms,
    apiParams: {
      page: pageIndex,
      limit: pageSize,
      search: search || undefined,
      sortBy: sortBy || undefined,
      sortOrder: sortOrder || undefined,
    },
    total: leadsData?.meta?.total || 0,
    returnFullObjects: true,
  });

  const { mutate: importLeadsFromForms, isPending: isImporting } = useImportLeadsFromForms();

  const columns: ColumnDef<any>[] = useMemo(
    () => [
      {
        id: 'lead_source_no',
        header: 'Lead ID',
        accessorKey: 'lead_source_no',
        sortable: false,
        cell: (props: any) => props.getValue() || '-',
      },
      {
        id: 'contact_name',
        header: 'Contact Name',
        accessorKey: 'contact_name',
        sortable: true,
      },
      {
        id: 'email',
        header: 'Email',
        accessorKey: 'email',
        sortable: true,
      },
      {
        id: 'phone',
        header: 'Phone',
        accessorKey: 'phone',
        sortable: false,
        cell: (props: any) => props.getValue() || '-',
      },
      {
        id: 'source',
        header: 'Source',
        accessorKey: 'source',
        sortable: true,
        cell: (props: any) => props.getValue() || '-',
      },
      {
        id: 'site_link',
        header: 'Site',
        accessorKey: 'site_link',
        sortable: false,
        cell: (props: any) => {
          const val = props.getValue();
          if (!val) return '-';
          return (
            <span className="max-w-[150px] truncate block" title={val}>
              {val}
            </span>
          );
        },
      },
      {
        id: 'expected_revenue',
        header: 'Revenue',
        accessorKey: 'expected_revenue',
        sortable: true,
        cell: (props: any) => `€${props.getValue() || 0}`,
      },
      {
        id: 'createdAt',
        header: 'Created',
        accessorKey: 'createdAt',
        sortable: true,
        cell: (props: any) => (props.getValue() ? dateFormateUtils(props.getValue()) : '-'),
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
              icon={<ApolloIcon name="pen" />}
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
  const onTransferLeads = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();
    const leads = Array.isArray(selectedLeads) ? selectedLeads : [];
    if (leads.length === 0) {
      toast.push(
        <Notification type="warning" title="No selection">
          Please select at least one lead to transfer.
        </Notification>
      );
    }
    const payload = leads.map((lead) => mapLeadFormToImportPayload(lead as LeadForm));
    importLeadsFromForms(payload, {
      onSuccess: () => {
        toast.push(
          <Notification type="success" title="Transfer complete">
            {leads.length} lead{leads.length === 1 ? '' : 's'} imported successfully.
          </Notification>
        );
        setSelectedLeads([]);
      },
      onError: () => {
        toast.push(
          <Notification type="danger" title="Transfer failed">
            Failed to import leads. Please try again.
          </Notification>
        );
      },
    });
  };
  const tableConfig = useBaseTable({
    tableName: 'form-leads',
    data: leadsData?.data || [],
    loading: isLoading,
    totalItems: leadsData?.meta?.total || 0,
    pageIndex,
    pageSize,
    search,
    columns,
    selectable: true,
    returnFullObjects: true,
    selectedRows: selectedLeads,
    onSelectAll: handleSelectAllLeads,
    onSelectedRowsChange: (rows) => setSelectedLeads(rows ?? []),
    isBackendSortingReady: true,
    bulkActionsConfig: {
      entityName: 'leads',
      deleteUrl: '/lead-forms/',
      invalidateQueries: ['lead-forms'],
      singleDeleteConfig: {
        deleteFunction: apiDeleteLeadForm,
      },
    },
    customActions: ({ setDeleteConfirmOpen }: { setDeleteConfirmOpen: (open: boolean) => void }) => (
      <div className="flex items-center gap-2">
        <Button
          variant="solid"
          size="xs"
          icon={<ApolloIcon name="exchange" />}
          loading={isImporting}
          disabled={isImporting || (Array.isArray(selectedLeads) ? selectedLeads.length : 0) === 0}
          onClick={onTransferLeads}
        >
          Send to leads
        </Button>
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
      </div>

    ),
    showPagination: !isOpen,
    onRowClick: (row) => handleRowClick(row?._id),
    rowClassName: getRowClassName,
    setPageInfoFromBaseTable: true,
    pageInfoTitle: 'Form Leads',
    pageInfoSubtitlePrefix: 'Total Leads',
  });

  const layout = getSidebarLayout(isOpen);

  return (
    <div className="flex flex-col gap-4 px-4">
      <div>
        <div className={layout.container}>
          <div className={`${layout.mainContent} relative z-10`}>
            <BaseTable {...tableConfig} />
          </div>

          <div
            className={`${layout.sidebar} flex min-h-0 flex-col border-b-2 lg:border-b-0 lg:border-l-2 border-gray-100 lg:pl-2 text-sm`}
            style={layout.sidebarStyles}
          >
            {isOpen && sidebarType === 'edit' && selectedId && (
              <LeadFormDetailsSidebar
                key={`lead-${selectedId}-${sidebarKey}`}
                leadId={selectedId}
                onSuccess={handleFormSuccess}
                onClose={handleFormSuccess || onOpenSidebar}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormLeadsDashboard;
