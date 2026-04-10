'use client';

import React, { useMemo, useState, useCallback, useEffect, Suspense } from 'react';
import { ColumnDef } from '@/components/shared/DataTable';
import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Card from '@/components/ui/Card';
import BaseTable from '@/components/shared/BaseTable/BaseTable';
import { useBaseTable } from '@/components/shared/BaseTable/useBaseTable';
import { isDev } from '@/utils/utils';
import ExpandedRowProjectDetails from './_components/ExpandedRowProjectDetails';
import { ProjectTableData } from './Type.Lead.project';
import { ProjectLeads, apiGetLeadProjects } from '@/services/ProjectsService';
import { useSearchAndPaganation } from '@/hooks/useSearchPagination';
import { useCurrentPageColumnsStore } from '@/stores/currentPageColumnsStore';
import { usePageInfoStore } from '@/stores/pageInfoStore';
import { useSelectAllApi } from '@/components/shared/BaseTable/hooks/useSelectAllApi';
import { useLeadProjects } from '@/services/hooks/useProjects';

const LeadProjectsPage = () => {
  const { page, pageSize, search } = useSearchAndPaganation();

  // State
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const { setCurrentPageColumns } = useCurrentPageColumnsStore();
  const { setPageInfo } = usePageInfoStore();

  // Data fetching using the hook
  const { data: response, isLoading } = useLeadProjects({
    page,
    limit: pageSize,
    search: search || undefined,
  });

  // Extract projects and meta from response

  const meta = response?.meta;

  // Use the useSelectAllApi hook
  const { selected: selectedLeadProjects, handleSelectAll: handleSelectAllProjectsApi } =
    useSelectAllApi({
      apiFn: apiGetLeadProjects,
      total: meta?.total || 10000,
      returnFullObjects: true,
      apiParams: { search: search || undefined },
    });

  // Transform data for DataTable
  const transformedSelectedLeadProjects = useMemo((): ProjectTableData[] => {
    return selectedLeadProjects
      ?.filter((project: any) => project && project?.projectId)
      ?.map((project: any) => ({
        _id: project?.projectId || '',
        projectName: project?.projectName || 'Unknown Project',
        totalOffers: project?.offers?.total || 0,
        totalAgents: project?.totalAgents || 0,
        totalLeads: project?.totalLeads || 0,
        leads:
          project?.leads?.map((leadData: any) => ({
            _id: leadData?.lead?._id || '',
            lead: leadData?.lead,
            assignment: {
              agent: {
                _id: leadData?.assignment?.id || leadData?.assignment?._id || '',
                login: leadData?.assignment?.name || leadData?.assignment?.email || '',
                role: 'agent',
              },
              assignedAt: new Date().toISOString(),
              assignedBy: leadData?.assignment?.id || leadData?.assignment?._id || '',
              notes: '',
            },
          })) || [],
      }));
  }, [selectedLeadProjects]);

  // Transform data for DataTable
  const transformedData = useMemo((): ProjectTableData[] => {
    return (response?.data || [])
      ?.filter((project: ProjectLeads) => project && project?.projectId) // Filter out invalid projects
      ?.map((project: ProjectLeads) => ({
        _id: project?.projectId || '',
        projectName: project?.projectName || 'Unknown Project',
        totalOffers: project?.offers?.total || 0,
        totalAgents: project?.totalAgents || 0,
        totalLeads: project?.totalLeads || 0,
        leads:
          project?.leads?.map((leadData) => ({
            _id: leadData?.lead?._id || '',
            lead: leadData?.lead,
            assignment: {
              agent: {
                _id: leadData?.assignment?.id || leadData?.assignment?._id || '',
                login: leadData?.assignment?.name || leadData?.assignment?.email || '',
                role: 'agent',
              },
              assignedAt: new Date().toISOString(),
              assignedBy: leadData?.assignment?.id || leadData?.assignment?._id || '',
              notes: '',
            },
          })) || [],
      }));
  }, [response]);

  // Set page info for header display
  useEffect(() => {
    setPageInfo({
      title: 'Lead Projects',
      total: meta?.total || transformedData?.length,
      subtitle: `Total Projects: ${meta?.total || transformedData?.length}`,
    });
  }, [transformedData?.length, meta?.total, setPageInfo]);

  // Clear page info when component unmounts
  useEffect(() => {
    return () => {
      setPageInfo({});
    };
  }, [setPageInfo]);

  // Handlers
  const handleExpanderToggle = useCallback((id: string) => {
    try {
      console.log('Expanding row with ID:', id);
      setExpandedRowId((prev) => (prev === id ? null : id));
    } catch (error) {
      console.error('Error toggling expander:', error);
    }
  }, []);

  // Define columns for the DataTable
  const columns: ColumnDef<ProjectTableData>[] = useMemo(
    () => [
      {
        id: 'expander',
        maxSize: 40,
        enableResizing: false,
        header: () => null,
        cell: ({ row }) => {
          // Safe check for _id
          const id = row.original?._id?.toString() || '';
          const isExpanded = expandedRowId === id;

          return (
            <div
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                if (id) {
                  handleExpanderToggle(id);
                }
              }}
              data-no-navigate="true"
              className="flex h-full cursor-pointer items-center justify-center"
            >
              {isExpanded ? (
                <ApolloIcon name="chevron-arrow-down" className="text-2xl" />
              ) : (
                <ApolloIcon name="chevron-arrow-right" className="text-2xl" />
              )}
            </div>
          );
        },
      },
      {
        id: 'projectName',
        header: 'Project Name',
        accessorKey: 'projectName',
        cell: (props) => (
          <span className="font-medium whitespace-nowrap">{props.row.original?.projectName}</span>
        ),
      },
      {
        id: 'totalOffers',
        header: 'Total Offers',
        accessorKey: 'totalOffers',
        cell: (props) => (
          <span className="whitespace-nowrap">{props.row.original?.totalOffers}</span>
        ),
      },
      {
        id: 'totalAgents',
        header: 'Total Agents',
        accessorKey: 'totalAgents',
        cell: (props) => (
          <span className="whitespace-nowrap">{props.row.original?.totalAgents}</span>
        ),
      },
      {
        id: 'totalLeads',
        header: 'Total Leads',
        accessorKey: 'totalLeads',
        cell: (props) => (
          <span className="whitespace-nowrap">{props.row.original?.totalLeads}</span>
        ),
      },
    ],
    [expandedRowId, handleExpanderToggle]
  );

  useEffect(() => {
    setCurrentPageColumns(columns, 'lead-projects');
  }, [columns]);
  // BaseTable configuration using useBaseTable hook
  const tableConfig = useBaseTable({
    tableName: 'lead-projects',
    data: transformedData,
    loading: isLoading,
    returnFullObjects: true,
    totalItems: meta?.total || transformedData?.length,
    pageIndex: page,
    pageSize: pageSize,
    search: search || '',
    columns: columns,
    onSelectAll: handleSelectAllProjectsApi,
    selectedRows: transformedSelectedLeadProjects,
    deleteButton: true, // Enable delete button for bulk actions
    selectable: true, // Enable checkboxes
    bulkActionsConfig: {
      entityName: 'lead-projects',
      deleteUrl: '/projects/',
      invalidateQueries: ['lead-projects', 'leads'],
      apiData: transformedData,
    },

    onRowClick: (row) => {
      // Add row click logic here
      isDev && console.log('Project clicked:', row?.projectName);
    },
    rowClassName: 'hover:bg-sand-5 cursor-pointer',
    renderExpandedRow: (row) => {
      try {
        // Safe check for row data
        if (!row?.original?._id) {
          console.warn('Row has no _id:', row);
          return null;
        }

        // Only render if this row is expanded
        if (expandedRowId !== row?.original?._id) {
          return null;
        }

        return <ExpandedRowProjectDetails expandedRowId={expandedRowId || ''} row={row} />;
      } catch (error) {
        console.error('Error rendering expanded row:', error);
        return (
          <div className="p-4 text-red-600">Error loading project details. Please try again.</div>
        );
      }
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="min-w-max">
        <BaseTable {...tableConfig} />
      </div>
    </div>
  );
};

// Simple Error Boundary component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// Wrapper component with Suspense and Error Boundary
const LeadProjectsPageWrapper = () => {
  return (
    <ErrorBoundary
      fallback={
        <Card>
          <div className="p-6">
            <h1>Lead Projects</h1>
            <p className="text-red-600">Something went wrong. Please try refreshing the page.</p>
            <Button onClick={() => window.location.reload()} className="mt-4">
              Refresh Page
            </Button>
          </div>
        </Card>
      }
    >
      <Suspense
        fallback={
          <Card>
            <div className="p-6">
              <h1>Lead Projects</h1>
              <p>Loading...</p>
            </div>
          </Card>
        }
      >
        <LeadProjectsPage />
      </Suspense>
    </ErrorBoundary>
  );
};

export default LeadProjectsPageWrapper;
