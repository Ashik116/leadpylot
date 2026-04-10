/* eslint-disable @typescript-eslint/no-unused-vars */

'use client';

import { SearchParams } from '@/@types/common';
import RoleGuard from '@/components/shared/RoleGuard';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Button from '@/components/ui/Button';
import { Role } from '@/configs/navigation.config/auth.route.config';
import { useBulkDeleteProjects, useProjects } from '@/services/hooks/useProjects';
import { apiGetProjects, Name, Project } from '@/services/ProjectsService';
import { useClosedProjects, useGroupedSummary, useMetadataOptions } from '@/services/hooks/useLeads';
import type { DomainFilter } from '@/stores/filterStateStore';
import type {
  ColumnFilterValue,
  ColumnToFieldMap,
} from '@/components/shared/DataTable/components/ColumnHeaderFilter';
import type { ColumnHeaderFilterRenderers } from '@/components/shared/DataTable/types';
import { ClosedProject } from '@/services/LeadsService';
import { useSession } from '@/hooks/useSession';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { ColumnDef } from '@/components/shared/DataTable';
import BaseTable from '@/components/shared/BaseTable/BaseTable';
import { useBaseTable } from '@/components/shared/BaseTable/useBaseTable';
import { useSelectAllApi } from '@/components/shared/BaseTable/hooks/useSelectAllApi';
import { useBackNavigationStore } from '@/stores/backNavigationStore';
import { dateFormateUtils, DateFormatType } from '@/utils/dateFormateUtils';
import { ProjectCardSkeleton } from './_components/ProjectCard';
// Grouping and filtering imports
import { useFilterChainLeads } from '@/hooks/useFilterChainLeads';
import { useUniversalGroupingFilterStore } from '@/stores/universalGroupingFilterStore';
import {
  buildDomainFiltersForAdminPage,
  FILTER_OPERATOR_TO_API,
  filtersToQueryParams,
} from '@/utils/filterUtils';
import { useFilterProviderValue } from '@/hooks/useFilterProviderValue';
import { getActiveSubgroupPagination } from '@/utils/groupUtils';
import { useSelectedItemsStore } from '@/stores/selectedItemsStore';
import { FilterProvider } from '@/contexts/FilterContext';
import { usePageInfoStore } from '@/stores/pageInfoStore';
import { useQueryClient } from '@tanstack/react-query';

const ProjectCard = dynamic(
  () => import('./_components/ProjectCard').then((mod) => mod.ProjectCard),
  {
    ssr: false,
    loading: () => <ProjectCardSkeleton />,
  }
);

// Create a type that extends Project but explicitly defines name as potentially being a Name object
interface ExtendedProject extends Omit<Project, 'name'> {
  name: string | Name;
  agentsCount?: number;
  voipserver_name?: string;
  mailserver_name?: string;
  mailservers?: Array<{
    _id: string;
    name: string;
    info?: any;
  }>;
  email_templates?: Array<{
    _id: string;
    name: string;
    gender_type?: string | null;
  }>;
  // Closed projects specific fields
  project_active?: boolean;
  total_leads?: number;
  lead_count?: number;
  pending_count?: number;
  revertable_count?: number;
  in_use_count?: number;
  reverted_count?: number;
  last_closed_at?: string;
  color_code?: string;
}

const PROJECT_COLUMN_TO_FIELD_MAP: ColumnToFieldMap = {
  project_name: 'project_name',
  agentsCount: 'agents',
  voipserver_name: 'voipserver_id',
  mailserver_name: 'mailserver_id',
  // Some table states may surface this column id directly; keep payload consistent.
  mailservers: 'mailserver_id',
  email_templates: 'pdf_templates',
};

const PROJECT_COLUMN_HEADER_FILTER_RENDERERS: ColumnHeaderFilterRenderers = {
  // project_name: 'metadata_checkbox',
  mailserver_name: 'metadata_checkbox',
  email_templates: 'metadata_checkbox',
};

const PROJECT_GROUP_BY_ALIASES: Record<string, string> = {
  mailservers: 'mailserver_id',
};

const normalizeProjectGroupByFields = (fields: string[] = []): string[] => {
  return Array.from(new Set(fields.map((field) => PROJECT_GROUP_BY_ALIASES[field] || field)));
};

function ProjectsWrapperRefactored({ searchParams }: { searchParams: SearchParams }) {
  // Provide default values for searchParams
  const { pageIndex = '1', pageSize = '50', sortBy = null, sortOrder = '' } = searchParams || {};
  const { data: session } = useSession();
  const nextSearchParams = useSearchParams();
  const search = nextSearchParams.get('search');
  const router = useRouter();
  const pathname = usePathname();
  const { setBackUrl } = useBackNavigationStore();
  const queryClient = useQueryClient();
  const { setPageInfo } = usePageInfoStore();
  const [hasManuallyClearedGroupFilter, setHasManuallyClearedGroupFilter] = useState(false);

  // Get selected items store methods
  const { clearSelectedItems } = useSelectedItemsStore();

  // Set entity type to Team in store (Team represents projects)
  const { setEntityType: setStoreEntityType } = useUniversalGroupingFilterStore();
  useEffect(() => {
    setStoreEntityType('Team');
  }, [setStoreEntityType]);

  // Filter chain hook integration
  const filterChain = useFilterChainLeads({
    onClearSelections: () => clearSelectedItems(),
    currentTab: 'projects',
    hasManuallyClearedGroupFilter,
  });
  const {
    selectedGroupBy,
    buildApiFilters,
    buildGroupedLeadsFilters,
    handleGroupByArrayChange,
    handleClearGroupByFilter: chainHandleClearGroupByFilter,
    hasSelectedGroupBy,
    hasUserAddedGroupBy,
  } = filterChain;

  // Sync store changes back to useFilterChainLeads (one-way: store -> useFilterChainLeads)
  const storeGroupBy = useUniversalGroupingFilterStore((state) => state.groupBy);
  const isSyncingRef = useRef(false);
  const lastSyncedStoreValueRef = useRef<string>('');

  // Helper function to compare arrays by their sorted contents (order-independent)
  const arraysEqual = useCallback((a: string[], b: string[]): boolean => {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    return sortedA.every((val, idx) => val === sortedB[idx]);
  }, []);

  // Helper function to get a stable string representation (order-independent)
  const getArrayKey = useCallback((arr: string[]): string => {
    if (!Array.isArray(arr)) return '';
    return [...arr].sort().join(',');
  }, []);

  // Sync store -> useFilterChainLeads (one-way)
  useEffect(() => {
    if (isSyncingRef.current) return;
    if (!Array.isArray(storeGroupBy)) return;

    const storeKey = getArrayKey(storeGroupBy);
    const lastSyncedKey = lastSyncedStoreValueRef.current;

    // Only sync when store has values (non-empty)
    if (
      storeGroupBy.length > 0 &&
      !arraysEqual(storeGroupBy, selectedGroupBy) &&
      storeKey !== lastSyncedKey
    ) {
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;
      lastSyncedStoreValueRef.current = storeKey;

      setTimeout(() => {
        handleGroupByArrayChange(storeGroupBy);
        setTimeout(() => {
          isSyncingRef.current = false;
        }, 50);
      }, 0);
    }
  }, [storeGroupBy, handleGroupByArrayChange, selectedGroupBy, arraysEqual, getArrayKey]);

  // Sync useFilterChainLeads -> store (one-way)
  const { setGroupBy: setStoreGroupBy } = useUniversalGroupingFilterStore();
  useEffect(() => {
    if (isSyncingRef.current) return;
    if (Array.isArray(selectedGroupBy)) {
      const selectedKey = getArrayKey(selectedGroupBy);
      const lastSyncedKey = lastSyncedStoreValueRef.current;

      if (!arraysEqual(selectedGroupBy, storeGroupBy) && selectedKey !== lastSyncedKey) {
        isSyncingRef.current = true;
        lastSyncedStoreValueRef.current = selectedKey;

        setTimeout(() => {
          setStoreGroupBy(selectedGroupBy);
          setTimeout(() => {
            isSyncingRef.current = false;
          }, 50);
        }, 0);
      }
    }
  }, [selectedGroupBy, setStoreGroupBy, storeGroupBy, arraysEqual, getArrayKey]);

  // Enhanced clear group filter handler
  const handleClearGroupByFilter = useCallback(() => {
    clearSelectedItems();
    setHasManuallyClearedGroupFilter(true);
    chainHandleClearGroupByFilter();
  }, [clearSelectedItems, chainHandleClearGroupByFilter]);

  // Custom handler for group by changes
  const handleGroupByArrayChangeWithReset = useCallback(
    (newGroupBy: string[]) => {
      clearSelectedItems();
      handleGroupByArrayChange(newGroupBy);
    },
    [clearSelectedItems, handleGroupByArrayChange]
  );

  // Get domain filters from store
  const {
    userDomainFilters,
    setUserDomainFilters,
    pagination: storePagination,
    subgroupPagination: storeSubgroupPagination,
    sorting: storeSorting,
  } = useUniversalGroupingFilterStore();

  // Build domain filters (user + filter chain, normalized for API)
  const domainFilters = useMemo(
    () => buildDomainFiltersForAdminPage(buildGroupedLeadsFilters, userDomainFilters),
    [buildGroupedLeadsFilters, userDomainFilters]
  );
  const domainFiltersForFlatProjects = useMemo(
    () => (domainFilters.length > 0 ? domainFilters : undefined),
    [domainFilters]
  );

  // Clear selections when domain filters change
  useEffect(() => {
    clearSelectedItems();
  }, [clearSelectedItems, domainFilters]);

  // Check if we're on the close-projects page
  const isCloseProjectsPage = pathname?.includes('/close-projects');

  // Column header filter/group options from metadata (Team model for projects)
  const { data: metadataOptions } = useMetadataOptions('Team', {
    enabled: !isCloseProjectsPage,
  });
  const columnFilterOptions = useMemo(
    () => (isCloseProjectsPage ? [] : metadataOptions?.filterOptions || []),
    [isCloseProjectsPage, metadataOptions]
  );
  const columnGroupOptions = useMemo(
    () => (isCloseProjectsPage ? [] : metadataOptions?.groupOptions || []),
    [isCloseProjectsPage, metadataOptions]
  );

  const activeColumnFilters = useMemo(() => {
    const filters: Record<string, ColumnFilterValue> = {};
    if (!userDomainFilters?.length) return filters;

    for (const [field, operator, value] of userDomainFilters) {
      if (field) {
        filters[field] = { operator, value };
      }
    }
    return filters;
  }, [userDomainFilters]);

  const handleColumnFilterApply = useCallback(
    (fieldName: string, operator: string, value: any) => {
      const apiOperator = FILTER_OPERATOR_TO_API[operator] ?? operator;
      const newFilter: DomainFilter = [fieldName, apiOperator, value];
      const updatedFilters = [
        ...(userDomainFilters || []).filter(([field]) => field !== fieldName),
        newFilter,
      ];
      setUserDomainFilters(updatedFilters);
    },
    [userDomainFilters, setUserDomainFilters]
  );

  const handleColumnFilterClear = useCallback(
    (fieldName: string) => {
      const updatedFilters = (userDomainFilters || []).filter(([field]) => field !== fieldName);
      setUserDomainFilters(updatedFilters);
    },
    [userDomainFilters, setUserDomainFilters]
  );

  const handleToggleGroupBy = useCallback(
    (field: string) => {
      const currentGroupBy = normalizeProjectGroupByFields(selectedGroupBy || []);
      const isSelected = currentGroupBy.includes(field);
      const updatedGroupBy = isSelected
        ? currentGroupBy.filter((f) => f !== field)
        : [...currentGroupBy, field];
      setStoreGroupBy(updatedGroupBy);
    },
    [selectedGroupBy, setStoreGroupBy]
  );

  // Build default filters as query params
  const defaultFiltersAsQueryParams = useMemo(
    () => filtersToQueryParams(buildApiFilters?.() ?? []),
    [buildApiFilters]
  );

  // Determine effective group by
  const effectiveGroupBy = useMemo(() => {
    return selectedGroupBy.length > 0 ? normalizeProjectGroupByFields(selectedGroupBy) : [];
  }, [selectedGroupBy]);

  // Fetch grouped summary data
  const { data: groupedSummaryData, isLoading: groupedDataLoading } = useGroupedSummary({
    entityType: 'Team', // Team represents projects
    domain: domainFilters,
    groupBy: effectiveGroupBy,
    page: storePagination?.page || Number(pageIndex) || 1,
    limit: storePagination?.limit || Number(pageSize) || 50,
    ...getActiveSubgroupPagination(storeSubgroupPagination),
    sortBy: storeSorting?.sortBy || 'count',
    sortOrder: (storeSorting?.sortOrder as 'asc' | 'desc') || 'desc',
    enabled: effectiveGroupBy.length > 0 && !isCloseProjectsPage,
    defaultFilters: defaultFiltersAsQueryParams,
  });

  // Disable regular API hook when grouping is active
  const shouldDisableHook = effectiveGroupBy.length > 0 && !isCloseProjectsPage;

  // Use closed projects API when on close-projects page
  const { data: closedProjectsData, isLoading: isClosedProjectsLoading } = useClosedProjects({
    enabled: isCloseProjectsPage,
  });

  // Use regular projects API when not on close-projects page
  const { data: projects, isLoading: isProjectsLoading } = useProjects({
    search: search || undefined,
    role: session?.user?.role,
    sortBy: sortBy as string | undefined,
    sortOrder: sortOrder as string | undefined,
    page: Number(pageIndex) || 1,
    limit: Number(pageSize) || 50,
    domain:
      !isCloseProjectsPage && session?.user?.role !== 'Agent'
        ? domainFiltersForFlatProjects
        : undefined,
    enabled: !isCloseProjectsPage && !shouldDisableHook, // Disable API call on close-projects page or when grouping is active
  });

  // Use appropriate data and loading state
  const isLoading = isCloseProjectsPage
    ? isClosedProjectsLoading
    : shouldDisableHook
      ? groupedDataLoading
      : isProjectsLoading;

  // Calculate total based on data source
  const total = useMemo(() => {
    if (isCloseProjectsPage) {
      return closedProjectsData?.meta?.total || 0;
    }
    if (shouldDisableHook) {
      return (groupedSummaryData?.meta?.total ?? 0) as number;
    }
    if (
      projects &&
      !Array.isArray(projects) &&
      'meta' in projects &&
      typeof projects.meta?.total === 'number'
    ) {
      return projects.meta.total;
    }
    if (Array.isArray(projects)) {
      return projects.length;
    }
    return 0;
  }, [isCloseProjectsPage, closedProjectsData, projects, shouldDisableHook, groupedSummaryData]);

  // Note: useSelectAllApi is not used for closed projects since the API doesn't support pagination
  // Only initialize when not on close-projects page to avoid unnecessary API calls
  const selectAllApiResult = useSelectAllApi({
    apiFn: apiGetProjects,
    total: isCloseProjectsPage ? 0 : total, // Disable for closed projects
    returnFullObjects: true,
    apiParams: isCloseProjectsPage
      ? {} // Empty params when on close-projects page
        : {
            search: search || undefined,
            role: session?.user?.role,
            page: Number(pageIndex) || 1,
            limit: Number(pageSize) || 50,
            sortBy: sortBy as string | undefined,
            sortOrder: sortOrder as string | undefined,
            domain:
              session?.user?.role !== 'Agent'
                ? domainFiltersForFlatProjects
                : undefined,
          },
  });

  const { selected: selectedProjects, handleSelectAll: handleSelectAllProjectsApi } =
    selectAllApiResult;

  // Helper function to get project name
  const getProjectName = (name: string | Name): string => {
    if (typeof name === 'string') return name;
    return name.en_US || '';
  };

  // Transform data for table
  const transformedData = useMemo(() => {
    // Handle closed projects data
    if (isCloseProjectsPage && closedProjectsData?.data) {
      return closedProjectsData.data.map((closedProject: ClosedProject) => ({
        _id: closedProject.project_id,
        name: closedProject.project_name,
        project_active: closedProject.project_active,
        total_leads: closedProject.total_leads,
        lead_count: closedProject.lead_count,
        pending_count: closedProject.pending_count,
        assigned_count: closedProject.assigned_count,
        revertable_count: closedProject.revertable_count,
        in_use_count: closedProject.in_use_count,
        reverted_count: closedProject.reverted_count,
        last_closed_at: closedProject.last_closed_at,
        // Add other required fields with defaults
        project_website: null,
        project_website_link: null,
        deport_link: null,
        inbound_email: null,
        inbound_number: null,
        active: closedProject.project_active,
        users: 0,
        agentsCount: 0,
        voipserver_name: '',
        mailserver_name: '',
      })) as unknown as ExtendedProject[];
    }

    // Handle regular projects data
    if (!Array.isArray(projects)) {
      if (!projects?.data) return [];
      return projects.data as ExtendedProject[];
    }
    // For Agent users, projects is ProjectLeads[] which has different structure
    if (session?.user?.role === 'Agent') {
      return projects.map((project: any) => ({
        _id: project.projectId,
        name: project.projectName,
        agentsCount: project.totalAgents,
        // Add other required fields with defaults
        project_website: null,
        project_website_link: null,
        deport_link: null,
        inbound_email: null,
        inbound_number: null,
        active: true,
        users: 0,
        voipserver_name: '',
        mailserver_name: '',
      })) as unknown as ExtendedProject[];
    }
    return projects as unknown as ExtendedProject[];
  }, [isCloseProjectsPage, closedProjectsData, projects, session?.user?.role]);

  // Define columns based on user role and page type
  const columns: ColumnDef<ExtendedProject>[] = useMemo(() => {
    const baseColumns: ColumnDef<ExtendedProject>[] = [];

    // Add project name column for all users
    baseColumns.push({
      header: 'Project Name',
      id: 'project_name',
      accessorKey: 'name',
      columnWidth: 105,
      cell: ({ row }) => {
        return (
          <span style={{ color: row.original?.color_code ?? undefined }}>
            {getProjectName(row.original.name)}
          </span>
        );
      },
    });

    // Only add additional columns if user is Admin
    if (session?.user?.role === 'Admin') {
      if (isCloseProjectsPage) {
        // Closed projects specific columns
        baseColumns.push({
          id: 'total_leads',
          header: 'Total Leads',
          accessorKey: 'total_leads',
          columnWidth: 105,
        });
        baseColumns.push({
          id: 'lead_count',
          header: 'Closed Leads',
          accessorKey: 'lead_count',
          columnWidth: 105,
        });
        baseColumns.push({
          id: 'pending_count',
          header: 'Pending to Close',
          accessorKey: 'pending_count',
          columnWidth: 105,
        });
        baseColumns.push({
          id: 'assigned_count',
          header: 'Reused',
          accessorKey: 'assigned_count',
          columnWidth: 105,
        });
        baseColumns.push({
          id: 'revertable_count',
          header: 'Revertable / Reusable',
          accessorKey: 'revertable_count',
          columnWidth: 105,
        });
        baseColumns.push({
          id: 'last_closed_at',
          header: () => <span className="whitespace-nowrap">Last Closed At</span>,
          accessorKey: 'last_closed_at',
          enableSorting: false,
          columnWidth: 120,
          cell: ({ row }: { row: any }) => {
            const closedAt = row.original?.last_closed_at;
            if (!closedAt) return <span className="text-gray-400">-</span>;

            const formattedDate = dateFormateUtils(closedAt, DateFormatType.SHOW_TIME);

            return (
              <div className="text-sm">
                <div className="font-medium">{formattedDate}</div>
              </div>
            );
          },
        });

        baseColumns.push({
          header: 'Reverted',
          id: 'reverted_count',
          accessorKey: 'reverted_count',
          columnWidth: 105,
        });
      } else {
        // Regular projects columns
        // Add Agents column
        baseColumns.push({
          id: 'agentsCount',
          header: 'Agents',
          accessorKey: 'agentsCount',
          columnWidth: 105,
        });

        // Add VOIP Server column
        baseColumns.push({
          id: 'voipserver_name',
          header: 'VOIP Server',
          accessorKey: 'voipserver_name',
          columnWidth: 105,
        });

        // Add Mail Server column
        baseColumns.push({
          id: 'mailserver_name',
          header: 'Mail Server',
          accessorKey: 'mailserver_name',
          columnWidth: 105,
          cell: ({ row }) => {
            const project = row.original;
            // Check if mailservers array exists and has items
            if (
              project.mailservers &&
              Array.isArray(project.mailservers) &&
              project.mailservers.length > 0
            ) {
              // Display all mail server names, separated by commas
              const mailServerNames = project.mailservers
                .map((ms) => {
                  // Handle both string and object name formats
                  if (typeof ms.name === 'string') {
                    return ms.name;
                  }
                  if (ms.name && typeof ms.name === 'object') {
                    return (ms.name as any).en_US || '';
                  }
                  return '';
                })
                .filter((name) => name)
                .join(', ');
              return <span>{mailServerNames || '-'}</span>;
            }
            // Fallback to mailserver_name if mailservers array is not available
            return <span>{project.mailserver_name || '-'}</span>;
          },
        });

        baseColumns.push({
          id: 'email_templates',
          header: 'Email Templates',
          accessorKey: 'email_templates',
          columnWidth: 140,
          cell: ({ row }) => {
            const templates = (row.original as any)?.email_templates;
            if (!templates || !Array.isArray(templates) || templates.length === 0) {
              return <span className="text-gray-400">-</span>;
            }
            return (
              <span>
                {templates
                  .map((t: any) => t.name)
                  .filter(Boolean)
                  .join(', ')}
              </span>
            );
          },
        });
      }
    }

    return baseColumns;
  }, [session?.user?.role, isCloseProjectsPage]);

  // Handle row click - check if we're on close-projects page
  const handleRowClick = (project: ExtendedProject) => {
    if (session?.user.role === 'Admin') {
      // If on close-projects page, navigate to close-projects details
      if (pathname?.includes('/close-projects')) {
        router.push(`/dashboards/projects/close-projects/${project._id}`);
      } else {
        router.push(`/dashboards/projects/${project._id}`);
      }
    }
  };

  // Set back URL based on current page
  useEffect(() => {
    if (pathname) {
      setBackUrl(pathname);
    }
  }, [pathname, setBackUrl]);

  // Update page info for grouped and flat views
  useEffect(() => {
    const isGroupedView = effectiveGroupBy.length > 0 && !isCloseProjectsPage;
    if (isGroupedView) {
      if (groupedDataLoading) return;
      const total = (groupedSummaryData?.meta?.total ?? 0) as number;
      setPageInfo({
        title: isCloseProjectsPage ? 'Close Projects' : 'Projects',
        total,
        subtitle: `${isCloseProjectsPage ? 'Total Close Projects' : 'Total Projects'}: ${total}`,
      } as any);
    } else {
      if (isLoading) return;
      const total = isCloseProjectsPage
        ? closedProjectsData?.meta?.total || 0
        : projects &&
            !Array.isArray(projects) &&
            'meta' in projects &&
            typeof projects.meta?.total === 'number'
          ? projects.meta.total
          : Array.isArray(projects)
            ? projects.length
            : 0;
      setPageInfo({
        title: isCloseProjectsPage ? 'Close Projects' : 'Projects',
        total,
        subtitle: `${isCloseProjectsPage ? 'Total Close Projects' : 'Total Projects'}: ${total}`,
      } as any);
    }
  }, [
    effectiveGroupBy.length,
    groupedDataLoading,
    groupedSummaryData?.meta?.total,
    isLoading,
    projects,
    closedProjectsData?.meta?.total,
    isCloseProjectsPage,
    setPageInfo,
  ]);

  // BaseTable configuration for Admin users
  const tableConfig = useBaseTable({
    isBackendSortingReady: !isCloseProjectsPage, // Closed projects API doesn't support sorting
    tableName: 'projects',
    selectedRows: selectedProjects,
    data: transformedData,
    loading: isLoading,
    totalItems: total,
    pageIndex: Number(pageIndex),
    pageSize: Number(pageSize),
    search: search || '',
    columns,
    selectable: session?.user?.role === 'Admin' && !isCloseProjectsPage, // Disable selection for closed projects
    returnFullObjects: true,
    bulkActionsConfig:
      session?.user?.role === 'Admin' && !isCloseProjectsPage
        ? {
            entityName: 'projects',
            deleteUrl: '/projects/',
            invalidateQueries: ['projects'],
            apiData: transformedData,
          }
        : undefined,
    extraActions:
      session?.user?.role !== 'Agent' ? (
        <div className="flex items-center gap-2">
          {!isCloseProjectsPage && (
            <RoleGuard>
              <Link href="/dashboards/projects/create">
                <Button variant="solid" size="xs" icon={<ApolloIcon name="plus" />}>
                  Create <span className="hidden md:inline">Project</span>
                </Button>
              </Link>
            </RoleGuard>
          )}
        </div>
      ) : undefined,
    onRowClick: handleRowClick,
    rowClassName: 'cursor-pointer hover:bg-gray-50',
    onSelectAll: handleSelectAllProjectsApi,
    fixedHeight: '91dvh',
    setPageInfoFromBaseTable: false, // We handle page info manually
    // Grouping props
    selectedGroupBy: selectedGroupBy,
    onGroupByChange: handleGroupByArrayChangeWithReset,
    onClearGroupBy: handleClearGroupByFilter,
    hasSelectedGroupBy: hasSelectedGroupBy,
    hasUserAddedGroupBy: hasUserAddedGroupBy,
    dynamicallyColumnSizeFit: true,
  });

  const filterContextValue = useFilterProviderValue(
    buildApiFilters,
    buildGroupedLeadsFilters,
    handleGroupByArrayChangeWithReset,
    handleClearGroupByFilter
  );

  return (
    <FilterProvider value={filterContextValue}>
      <div className="flex flex-col px-4">
        {/* For Agent users, show project cards */}
        <RoleGuard role={Role.AGENT}>
        {isLoading ? (
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5 xl:gap-4">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div key={idx}>
                <ProjectCardSkeleton />
              </div>
            ))}
          </div>
        ) : Array.isArray(projects) && projects.length > 0 ? (
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5 xl:gap-4">
            {projects.map((project: any, key: number) => (
              <div key={key}>
                <ProjectCard projectData={project} />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <ApolloIcon name="folder" className="mb-4 text-6xl text-gray-300" />
            <p className="text-lg font-medium text-gray-500">Projects not assigned</p>
            <p className="mt-2 text-sm text-gray-400">No projects have been assigned to you yet.</p>
          </div>
        )}
      </RoleGuard>

      {/* For Admin users, show BaseTable */}
      <RoleGuard>
        <BaseTable
          {...tableConfig}
          tableLayout="auto"
          enableColumnResizing={true}
          buildApiFilters={buildApiFilters}
          columnFilterOptions={columnFilterOptions}
          activeColumnFilters={activeColumnFilters}
          onColumnFilterApply={handleColumnFilterApply}
          onColumnFilterClear={handleColumnFilterClear}
          columnToFieldMap={PROJECT_COLUMN_TO_FIELD_MAP}
          columnHeaderFilterRenderers={PROJECT_COLUMN_HEADER_FILTER_RENDERERS}
          columnGroupOptions={columnGroupOptions}
          activeGroupBy={effectiveGroupBy}
          onToggleGroupBy={handleToggleGroupBy}
          selectionResetKey={JSON.stringify(domainFilters)}
          // Pass grouped mode props
          groupedMode={effectiveGroupBy.length > 0 && !isCloseProjectsPage}
          groupedData={groupedSummaryData?.data || []}
          entityType="Team"
          groupByFields={effectiveGroupBy}
          pageInfoTitle={isCloseProjectsPage ? 'Close Projects' : 'Projects'}
          pageInfoSubtitlePrefix={isCloseProjectsPage ? 'Total Close Projects' : 'Total Projects'}
        />
      </RoleGuard>
    </div>
    </FilterProvider>
  );
}

export default ProjectsWrapperRefactored;
