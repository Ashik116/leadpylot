/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import BaseTable from '@/components/shared/BaseTable/BaseTable';
import { useBaseTable } from '@/components/shared/BaseTable/useBaseTable';
import { ColumnDef } from '@/components/shared/DataTable';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
// import Select from '@/components/ui/Select';
import {
  useDeleteTemplate,
  useDownloadTemplate,
  usePdfTemplates,
  useTemplatePreview,
} from '@/services/hooks/usePdfTemplates';
import { PdfTemplate } from '@/services/PdfTemplateService';
import classNames from 'classnames';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';

import ConfirmDialog from '@/components/shared/ConfirmDialog';
import { useSetBackUrl } from '@/hooks/useSetBackUrl';
import { useDrawerStore } from '@/stores/drawerStore';
import dayjs from 'dayjs';
import PreviewMappingDialog from './PreviewMappingDialog';
import UploadTemplateSidebar from './UploadTemplateSidebar';

const PdfTemplatesDashboard = () => {
  const pathname = usePathname();
  useSetBackUrl(pathname);
  const router = useRouter();
  const searchParams = useSearchParams();
  const pageIndex = parseInt(searchParams.get('pageIndex') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '25', 10);
  //   const status = searchParams.get('status') || '';
  const category = searchParams.get('category') || '';
  const search = searchParams.get('search') || '';
  const sortBy = searchParams.get('sortBy') || undefined;
  const sortOrder = searchParams.get('sortOrder') || undefined;
  // Legacy modal path kept for compatibility; not used with drawer store
  // const [isUploadDialogOpen] = useState(false);
  const [isPreviewMappingDialogOpen, setIsPreviewMappingDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<PdfTemplate | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<PdfTemplate | null>(null);

  const {
    isOpen,
    selectedId,
    // sidebarKey,
    resetDrawer,
    // onOpenSidebar,
    onHandleSidebar,
  } = useDrawerStore();

  // Fetch templates with current filters
  const { data: templatesData, isLoading: isTemplatesLoading } = usePdfTemplates({
    page: pageIndex || undefined,
    limit: pageSize || undefined,
    // status: (status as any) || undefined,
    category: (category as any) || undefined,
    search: search || undefined,
    sortBy: sortBy || undefined,
    sortOrder: sortOrder || undefined,
  });

  const deleteTemplateMutation = useDeleteTemplate();
  const { isDownloading: isPreviewDownloading } = useTemplatePreview();
  const { downloadTemplate, isDownloading: isTemplateDownloading } = useDownloadTemplate();

  const templates = templatesData?.data?.templates || [];
  const pagination = templatesData?.data?.pagination;
  const handlePreview = (template: PdfTemplate) => {
    setSelectedTemplate(template);
    setIsPreviewMappingDialogOpen(true);
  };

  const handleDownload = async (template: PdfTemplate) => {
    await downloadTemplate(template?._id, template?.original_filename);
  };

  const handleDelete = (template: PdfTemplate) => {
    setTemplateToDelete(template);
    setIsDeleteConfirmOpen(true);
  };

  // Mutations

  // Define columns for DataTable
  const columns: ColumnDef<PdfTemplate>[] = useMemo(
    () => [
      {
        id: 'status',
        header: 'Status',
        accessorKey: 'status',
        enableSorting: false,
        cell: (props) => (
          <div>
            <Badge
              className={classNames('block w-20 text-center text-xs', {
                'bg-evergreen text-white': props.row.original?.status === 'active',
                'bg-blue-500 text-white': props.row.original?.status === 'mapping',
                'bg-gray-400 text-white': props.row.original?.status === 'draft',
                'bg-rust text-white': props.row.original?.status === 'archived',
              })}
              content={props.row.original?.status}
            />
          </div>
        ),
      },
      {
        id: 'name',
        header: 'Template Name',
        accessorKey: 'name',
        cell: (props) => (
          <div className="min-w-0">
            <div
              className="line-clamp-1 min-w-6 font-medium whitespace-break-spaces"
              title={props.row.original?.name}
            >
              {props.row.original?.name}
            </div>
            <div
              className="line-clamp-1 text-sm whitespace-break-spaces text-gray-500"
              title={props.row.original?.original_filename}
            >
              {props.row.original?.original_filename}
            </div>
          </div>
        ),
      },
      {
        id: 'category',
        header: 'Category',
        accessorKey: 'category',
        cell: (props: any) => {
          const leadSource = props.row.original?.lead_source;
          const sourceNames = Array.isArray(leadSource)
            ? leadSource.map((s: any) => typeof s === 'object' && s?.name ? s.name : null).filter(Boolean)
            : [];
          return (
            <>
              {props.row.original?.category ? (
                <p className="w-fit px-2 text-sm font-semibold text-gray-600">
                  {props.row.original?.category}
                </p>
              ) : (
                <p className="w-fit px-2 text-sm">-</p>
              )}
              {props.row.original?.offer_type ? (
                <p className="w-fit px-2 text-xs text-gray-500">
                  {props.row.original?.offer_type || '-'}
                </p>
              ) : (
                <p className="w-fit px-2 text-sm">-</p>
              )}
              {sourceNames.length > 0 && (
                <p className="w-fit px-2 text-xs text-blue-500">
                  {sourceNames.join(', ')}
                </p>
              )}
            </>
          );
        },
      },
      {
        id: 'fields',
        header: 'Fields',
        accessorKey: 'form_fields_count',
        enableSorting: true,
        cell: (props) => (
          <div>
            <div className="text-left font-medium">{props.row.original?.form_fields_count}</div>
            <div className="text-xs text-gray-500">
              {(
                ((props.row.original?.field_mappings?.length || 0) /
                  (props.row.original?.form_fields_count || 1)) *
                100
              ).toFixed(0)}
              % mapped
            </div>
          </div>
        ),
      },
      {
        id: 'usage',
        header: 'Usage',
        accessorKey: 'usage_count',
        enableSorting: true,
        cell: (props) => (
          <div>
            <div className="font-medium">{props.row.original?.usage_count || 0}</div>
          </div>
        ),
      },
      {
        id: 'createdAt',
        header: 'Created',
        accessorKey: 'createdAt',
        cell: (props) => (
          <div className="text-sm">{dayjs(props.row.original?.createdAt).format('DD/MM/YYYY')}</div>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="success"
              size="xs"
              onClick={() => handleFieldMapping(row.original)}
              disabled={row.original?.status === 'archived'}
              title="Field Mapping"
              icon={<ApolloIcon name="eye-filled" className="h-4 w-4" />}
            />

            <Button
              variant="default"
              size="xs"
              onClick={() => handleDownload(row.original)}
              title="Download"
              disabled={isTemplateDownloading}
              icon={<ApolloIcon name="download" className="h-4 w-4" />}
            >
              {isTemplateDownloading && 'waiting'}
            </Button>
            <Button
              variant="destructive"
              size="xs"
              onClick={() => handleDelete(row.original)}
              title="Delete"
              icon={<ApolloIcon name="trash" />}
            />
          </div>
        ),
      },
    ],
    [handleDelete, handleDownload, handlePreview, isPreviewDownloading, isTemplateDownloading]
  );

  // Base table configuration
  const tableConfig = useBaseTable({
    tableName: 'pdf-templates',
    data: templates,
    columns,
    isBackendSortingReady: true,
    showActionsDropdown: false,
    showPagination: !isOpen,
    onRowClick: (row: any) => onHandleSidebar(row._id),
    rowClassName: ({ original: e }: { original: PdfTemplate }) => {
      const rowId = (e as any)?._id ?? e?._id;
      const isSelected = rowId && selectedId && rowId === selectedId;
      return isSelected ? 'bg-gray-100' : '';
    },
    showSearchInActionBar: true,
    searchPlaceholder: 'Search templates...',
    pageIndex: pageIndex,
    pageSize,
    totalItems: pagination?.totalCount || 0,
    search: search,
    onPaginationChange: (newPageIndex: number, newPageSize: number, searchTerm?: any) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('pageIndex', String(newPageIndex));
      params.set('pageSize', String(newPageSize));
      let searchValue = '';
      if (searchTerm !== undefined && searchTerm !== null) {
        if (typeof searchTerm === 'object' && 'search' in searchTerm) {
          searchValue = String(searchTerm.search || '');
        } else if (typeof searchTerm === 'string') {
          searchValue = searchTerm;
        }
      }

      if (searchValue.trim()) {
        params.set('search', searchValue.trim());
      } else {
        params.delete('search');
      }

      router.push(`?${params.toString()}`);
    },
    setPageInfoFromBaseTable: true,
    pageInfoTitle: 'PDF Templates',
    pageInfoSubtitlePrefix: 'Total Templates',
    extraActions: (
      <div className="flex items-center">
        <Button
          variant="solid"
          onClick={() => (isOpen ? resetDrawer() : onHandleSidebar(undefined))}
          icon={
            <ApolloIcon name={isOpen ? 'arrow-right' : 'plus'} />
          }
          size="xs"
        >
          {!isOpen ? (<>Add <span className="hidden md:inline">Template</span> </>) : ''}
        </Button>
      </div>
    ),
  });

  // Event handlers - Both preview and field mapping use the same dialog now
  const handleFieldMapping = (template: PdfTemplate) => {
    setSelectedTemplate(template);
    setIsPreviewMappingDialogOpen(true);
  };

  return (
    <div className="flex flex-col gap-4 px-4">
      <div className="flex flex-col-reverse gap-4 lg:flex-row">
        {/* Main content */}
        <div
          className={`relative z-10 mt-4 w-full transition-all duration-300 ease-in-out lg:mt-0 ${isOpen ? 'lg:w-1/2' : 'w-full'}`}
        >
          <BaseTable {...tableConfig} loading={isTemplatesLoading} />
        </div>

        {/* Right sidebar for create/edit */}
        <div
          className={`w-full transform space-y-4 text-sm duration-300 ease-in-out transition-all flex min-h-0 flex-col border-gray-100 lg:w-1/2 lg:border-l-2 lg:pl-2 ${isOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}
          style={{ display: isOpen ? 'block' : 'none' }}
        >

          <UploadTemplateSidebar
            isOpen={true}
            onClose={resetDrawer}
            renderInSidebar
            pdfId={selectedId || undefined}
          />
        </div>
      </div>

      {/* Existing dialogs still available if needed elsewhere */}
      {/* <UploadTemplateDialog isOpen={isUploadDialogOpen} onClose={resetDrawer} /> */}

      <PreviewMappingDialog
        isOpen={isPreviewMappingDialogOpen}
        onClose={() => {
          setIsPreviewMappingDialogOpen(false);
          setSelectedTemplate(null);
        }}
        template={selectedTemplate}
      />

      <ConfirmDialog
        type="warning"
        isOpen={isDeleteConfirmOpen}
        title="Delete PDF Template"
        onCancel={() => {
          setIsDeleteConfirmOpen(false);
          setTemplateToDelete(null);
        }}
        onConfirm={() => {
          if (templateToDelete) {
            deleteTemplateMutation.mutate(templateToDelete?._id);
            setIsDeleteConfirmOpen(false);
            setTemplateToDelete(null);
          }
        }}
        confirmButtonProps={{ disabled: deleteTemplateMutation.isPending }}
      >
        <p className="line-clamp-1">
          Are you sure you want to delete the PDF template &ldquo;{templateToDelete?.name}&rdquo;?
        </p>
        <p className="mt-2 text-sm text-gray-600">This action cannot be undone.</p>
      </ConfirmDialog>
    </div>
  );
};

export default PdfTemplatesDashboard;
