'use client';

import BaseTable from '@/components/shared/BaseTable/BaseTable';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Dropdown from '@/components/ui/Dropdown';
import RangeCalendar from '@/components/ui/DatePicker/RangeCalendar';
import { AgentSummary } from '@/services/ReportingService';
import { useDynamicHierarchicalReport } from '@/services/hooks/useReporting';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import React, { useMemo, useState, useRef } from 'react';
import dayjs from 'dayjs';
import DrillDownModal from './DrillDownModal';
import { transformHierarchicalData } from './reportingUtils';
import { useAgentsTableColumns } from './useAgentsTableColumns';
import { exportReportingDataToExcel } from '@/utils/exportUtils';

interface AgentsTableProps {
  onAgentSelect: (agent: AgentSummary) => void;
  dateRange: { start_date?: string; end_date?: string };
  onDateRangeChange?: (range: { start_date?: string; end_date?: string }) => void;
}

type ViewFilter = 'agents' | 'projects' | 'status' | 'stage';

interface ViewOption {
  label: string;
  value: ViewFilter;
}

const viewOptions: ViewOption[] = [
  { label: 'Agents', value: 'agents' },
  { label: 'Projects', value: 'projects' },
];

const AgentsTable: React.FC<AgentsTableProps> = ({
  onAgentSelect,
  dateRange,
  onDateRangeChange,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const modeParam = searchParams?.get('mode');
  const isRecycleMode = modeParam === 'recycle';
  const isLiveMode = modeParam === 'live';
  const isAllMode = !modeParam || modeParam === 'all';

  // Get search from URL query params
  const searchParam = searchParams?.get('search') || '';

  // Get sorting from URL query params
  const sortBy = searchParams?.get('sortBy') || undefined;
  const sortOrder = (searchParams?.get('sortOrder') as 'asc' | 'desc') || undefined;

  // Get view filters from URL query params
  const normalizeFilter = (value: string): ViewFilter => {
    if (value === 'states') return 'status';
    switch (value) {
      case 'agents':
      case 'projects':
      case 'status':
      case 'stage':
        return value;
      default:
        return 'agents';
    }
  };

  const viewFiltersParam = searchParams?.get('views');
  const initialFilters: ViewFilter[] = viewFiltersParam
    ? viewFiltersParam.split(',').map((value) => normalizeFilter(value))
    : ['agents'];
  const [viewFilters, setViewFilters] = useState<ViewFilter[]>(
    initialFilters.length ? initialFilters : ['agents']
  );

  // Drill-down modal state
  const [modalParams, setModalParams] = useState<{
    primary: 'agent' | 'project' | 'status' | 'stage';
    secondary: 'agent' | 'project' | 'status' | 'stage';
    primaryIds: string[];
    secondaryIds?: string[];
    title: string;
  } | null>(null);

  // Local state for temporary date selection (before Apply is clicked)
  const [tempDateRange, setTempDateRange] = useState<[Date | null, Date | null]>([
    dateRange?.start_date ? dayjs(dateRange.start_date.split(' ')[0]).toDate() : null,
    dateRange?.end_date ? dayjs(dateRange.end_date.split(' ')[0]).toDate() : null,
  ]);

  const dropdownRef = useRef<{
    handleDropdownClose: () => void;
    handleDropdownOpen: () => void;
  } | null>(null);

  // Map viewFilter to API primary parameter
  const getPrimaryGrouping = (filter: ViewFilter): 'agent' | 'project' | 'status' | 'stage' => {
    switch (filter) {
      case 'agents':
        return 'agent';
      case 'projects':
        return 'project';
      case 'status':
        return 'status';
      case 'stage':
        return 'stage';
      default:
        return 'agent';
    }
  };

  // Map mode to lead_type parameter
  const getLeadType = (): 'all' | 'live' | 'recycle' => {
    if (!modeParam || modeParam === 'all') return 'all';
    if (modeParam === 'recycle') return 'recycle';
    if (modeParam === 'live') return 'live';
    return 'all'; // fallback
  };

  // Map viewFilters to grouping hierarchy
  const primaryGrouping = viewFilters.length > 0 ? getPrimaryGrouping(viewFilters[0]) : 'agent';
  const secondaryGrouping = viewFilters.length > 1 ? getPrimaryGrouping(viewFilters[1]) : undefined;
  const tertiaryGrouping = viewFilters.length > 2 ? getPrimaryGrouping(viewFilters[2]) : undefined;
  const quaternaryGrouping =
    viewFilters.length > 3 ? getPrimaryGrouping(viewFilters[3]) : undefined;
  const quinaryGrouping = viewFilters.length > 4 ? getPrimaryGrouping(viewFilters[4]) : undefined;

  // Fetch dynamic hierarchical report
  const {
    data: reportData,
    isLoading,
    error,
  } = useDynamicHierarchicalReport({
    primary: primaryGrouping,
    secondary: secondaryGrouping,
    tertiary: tertiaryGrouping,
    quaternary: quaternaryGrouping,
    quinary: quinaryGrouping,
    lead_type: getLeadType(),
    start_date: dateRange?.start_date,
    end_date: dateRange?.end_date,
    date_field: 'assigned_date',
    search: searchParam ? searchParam.trim() : undefined,
    sortBy: sortBy,
    sortOrder: sortOrder,
  });

  const handleModeChange = (mode: 'live' | 'recycle' | 'all') => {
    const params = new URLSearchParams(searchParams?.toString());

    if (mode === 'all') params.delete('mode');
    else params.set('mode', mode);

    const queryString = params.toString();
    const url = queryString ? `${pathname}?${queryString}` : pathname;

    router.replace(url, { scroll: false });
  };

  const handleViewChange = (selectedOptions: ViewOption[] | null) => {
    const newFilters =
      selectedOptions?.map((opt) => normalizeFilter(opt.value)) || (['agents'] as ViewFilter[]);
    setViewFilters(newFilters);

    // Update URL with multiple views
    const params = new URLSearchParams(searchParams?.toString());
    params.set('views', newFilters.join(','));
    const queryString = params.toString();
    const url = queryString ? `${pathname}?${queryString}` : pathname;
    router.replace(url, { scroll: false });
  };

  // Transform the data for the table
  const tableData = useMemo(() => {
    if (!reportData?.data) return [];

    const transformed = transformHierarchicalData(
      reportData.data,
      primaryGrouping,
      secondaryGrouping,
      tertiaryGrouping
    );
    return transformed;
  }, [reportData, primaryGrouping, secondaryGrouping, tertiaryGrouping]);

  // Calculate summary statistics and totals for footer
  const { summaryStats, footerTotals } = useMemo(() => {
    if (!reportData?.data || reportData.data.length === 0)
      return { summaryStats: null, footerTotals: null };

    const apiTotal = reportData.meta?.total || {};
    const totalLeads = (apiTotal.lead?.live || 0) + (apiTotal.lead?.recycle || 0);

    const totals = {
      leads: totalLeads,
      offers: (apiTotal.angebots?.live || 0) + (apiTotal.angebots?.recycle || 0),
      openings: (apiTotal.openings?.live || 0) + (apiTotal.openings?.recycle || 0),
      // confirmation maps to ANNAHMEN (payments)
      payments: (apiTotal.confirmation?.live || 0) + (apiTotal.confirmation?.recycle || 0),
      netto1: (apiTotal.netto1?.live || 0) + (apiTotal.netto1?.recycle || 0),
      investment: 0,
      overallConversionRate: apiTotal.conversion_rate?.live || 0,
      avgInvestmentPerOffer: 0,
      // Add individual live/recycle totals for footer display
      leads_live: apiTotal.lead?.live || 0,
      leads_recycle: apiTotal.lead?.recycle || 0,
      // conversion_rate maps to u_n2 (U-N2)
      u_n2_live: apiTotal.conversion_rate?.live || 0,
      u_n2_recycle: apiTotal.conversion_rate?.recycle || 0,
      reklamation_live: apiTotal.reclamation?.live || 0,
      reklamation_recycle: apiTotal.reclamation?.recycle || 0,
      offers_live: apiTotal.angebots?.live || 0,
      offers_recycle: apiTotal.angebots?.recycle || 0,
      openings_live: apiTotal.openings?.live || 0,
      openings_recycle: apiTotal.openings?.recycle || 0,
      // confirmation maps to ANNAHMEN (payments)
      confirmation_live: apiTotal.confirmation?.live || 0,
      confirmation_recycle: apiTotal.confirmation?.recycle || 0,
      // payment_voucher maps to Ü-TRÄGER (u_trager)
      u_trager_live: apiTotal.payment_voucher?.live || 0,
      u_trager_recycle: apiTotal.payment_voucher?.recycle || 0,
      netto1_live: apiTotal.netto1?.live || 0,
      netto1_recycle: apiTotal.netto1?.recycle || 0,
      netto2_live: apiTotal.netto2?.live || 0,
      netto2_recycle: apiTotal.netto2?.recycle || 0,
    };

    return {
      summaryStats: {
        totalAgents: reportData.data.length,
        ...totals,
        avgConversion: apiTotal.conversion_rate?.live || 0,
      },
      footerTotals: totals,
    };
  }, [reportData]);

  // Handle cell click for drill-down
  const handleCellClick = (params: {
    type: 'agent' | 'project';
    id: string;
    name: string;
    rowData?: any;
  }) => {
    // Determine the drill-down parameters based on clicked cell type
    let newPrimary: 'agent' | 'project' | 'status' | 'stage';
    let newSecondary: 'agent' | 'project' | 'status' | 'stage';
    let secondaryIds: string[] | undefined;

    if (params.type === 'project') {
      newPrimary = 'project';
      newSecondary = 'agent';
      // If current view is agent->project, pass agent ID as secondary_ids
      if (
        primaryGrouping === 'agent' &&
        secondaryGrouping === 'project' &&
        params.rowData?._primaryId
      ) {
        secondaryIds = [params.rowData._primaryId];
      }
    } else if (params.type === 'agent') {
      newPrimary = 'agent';
      newSecondary = 'project';
    } else {
      return; // Unsupported type
    }

    setModalParams({
      primary: newPrimary,
      secondary: newSecondary,
      primaryIds: [params.id],
      secondaryIds,
      title: `${params.name} - Details`,
    });
  };

  // Get table columns from hook
  const columns = useAgentsTableColumns({
    footerTotals,
    primaryGrouping,
    secondaryGrouping,
    tertiaryGrouping,
    leadType: getLeadType(),
    onCellClick: handleCellClick,
  });

  // Handle temporary date range change (only updates local state)
  const handleTempDateRangeChange = (value: [Date | null, Date | null]) => {
    setTempDateRange(value);
  };

  // Handle Apply button click - passes dates to parent (allows single date)
  const handleApply = () => {
    const [startDate, endDate] = tempDateRange;
    const range = {
      start_date: startDate ? dayjs(startDate).format('YYYY-MM-DD') : undefined,
      end_date: endDate ? dayjs(endDate).format('YYYY-MM-DD') : undefined,
    };
    onDateRangeChange?.(range);
    dropdownRef.current?.handleDropdownClose();
  };

  // Handle Clear button click
  const handleClear = () => {
    setTempDateRange([null, null]);
    const range = {
      start_date: undefined,
      end_date: undefined,
    };
    onDateRangeChange?.(range);
    dropdownRef.current?.handleDropdownClose();
  };

  // Get date range value for DatePickerRange (extract date part only)
  const dateRangeValue: [Date | null, Date | null] = useMemo(() => {
    return [
      dateRange?.start_date ? dayjs(dateRange.start_date.split(' ')[0]).toDate() : null,
      dateRange?.end_date ? dayjs(dateRange.end_date.split(' ')[0]).toDate() : null,
    ];
  }, [dateRange]);

  // Update tempDateRange when dateRange prop changes
  React.useEffect(() => {
    setTempDateRange([
      dateRange?.start_date ? dayjs(dateRange.start_date.split(' ')[0]).toDate() : null,
      dateRange?.end_date ? dayjs(dateRange.end_date.split(' ')[0]).toDate() : null,
    ]);
  }, [dateRange]);

  // Handle Excel export
  const handleExportToExcel = () => {
    if (!tableData || tableData.length === 0 || !footerTotals) return;

    const filename = `reporting_${viewFilters.join('_')}_${getLeadType()}_${new Date().toISOString().split('T')[0]}`;
    exportReportingDataToExcel(
      tableData,
      footerTotals,
      primaryGrouping,
      secondaryGrouping,
      tertiaryGrouping,
      getLeadType(),
      filename
    );
  };

  if (error) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <p className="text-red-500">Failed to load report data</p>
          <p className="mt-2 text-sm text-gray-500">
            {error instanceof Error ? error.message : 'An error occurred'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Summary Cards */}
      {/* <AgentsSummaryCards summaryStats={summaryStats as any} /> */}

      {/* Agents Table */}
      <div>
        <BaseTable
          tableName={`agents-performance-${viewFilters.join('-')}`}
          data={tableData}
          columns={columns}
          loading={isLoading}
          pageIndex={1}
          pageSize={tableData?.length || 10}
          totalItems={tableData?.length || 0}
          search={searchParam}
          searchPlaceholder="Search by agent or project name..."
          actionBindUrlInQuery={true}
          onRowClick={(row) => {
            // Create a minimal AgentSummary for navigation
            const agent: AgentSummary = {
              _id: row.original.display_name,
              login: row.original.display_name,
              display_name: row.original.display_name,
            };
            onAgentSelect(agent);
          }}
          skeletonRowMultiple={1.9}
          rowClassName={(row) => {
            const baseClass = 'cursor-pointer hover:bg-gray-50 transition-colors duration-200';
            // Add subtle border for first row of each new group (except the very first row)
            // Replaced border-t-4 border-gray-400 with border-t border-gray-200
            if (row.original?.isFirstRowOfGroup && row.index > 0) {
              return `${baseClass} border-t border-gray-200`;
            }
            return baseClass;
          }}
          showActionsDropdown={false}
          selectable={false}
          deleteButton={false}
          showSearchInActionBar={true}
          showPagination={true}
          showNavigation={true}
          enableColumnResizing={false}
          isBackendSortingReady={true}
          fixedHeight="auto"
          extraActions={
            <div className="flex items-center gap-1">
              <Select<ViewOption, true>
                isMulti
                selectMultipleOptions={true}
                value={viewFilters
                  .map((filter) => viewOptions.find((option) => option.value === filter))
                  .filter((option): option is ViewOption => option !== undefined)}
                options={viewOptions}
                onChange={(newValue) => handleViewChange(newValue as ViewOption[] | null)}
                className="min-w-[200px]"
                placeholder="Select grouping..."
                size="xs"
                styles={{
                  control: (base) => ({
                    ...base,
                    minHeight: 24,
                    height: 24,
                  }),
                  valueContainer: (base) => ({
                    ...base,
                    paddingTop: 0,
                    paddingBottom: 0,
                    paddingLeft: 6,
                    paddingRight: 4,
                    minHeight: 0,
                    overflowX: 'auto',
                    overflowY: 'hidden',
                    flexWrap: 'nowrap',
                  }),
                  multiValue: (base) => ({
                    ...base,
                    marginTop: 0,
                    marginBottom: 0,
                    marginRight: 4,
                  }),
                  multiValueLabel: (base) => ({
                    ...base,
                    paddingTop: 2,
                    paddingBottom: 2,
                  }),
                }}
              />
              <Button
                onClick={() => handleModeChange('all')}
                variant={isAllMode ? 'secondary' : 'default'}
                size="xs"
              >
                All
              </Button>
              <Button
                onClick={() => handleModeChange('live')}
                variant={isLiveMode ? 'secondary' : 'default'}
                size="xs"
              >
                Live
              </Button>
              <Button
                onClick={() => handleModeChange('recycle')}
                variant={isRecycleMode ? 'secondary' : 'default'}
                size="xs"
              >
                Recycle
              </Button>
              <Button
                title="Export to Excel"
                onClick={handleExportToExcel}
                variant="default"
                disabled={!tableData || tableData.length === 0 || isLoading}
                icon={<ApolloIcon name="download" />}
                size="xs"
              />
              <Dropdown
                ref={dropdownRef}
                placement="bottom-start"
                menuClass="!z-50 z-50"
                toggleClassName="!p-0 !m-0"
                renderTitle={
                  <div className="relative flex items-center">
                    {tempDateRange[0] || tempDateRange[1] ? (
                      <div className="badge-wrapper relative flex text-xs">
                        <button
                          type="button"
                          className="absolute -top-3 -right-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white transition-colors hover:bg-red-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            handleClear();
                          }}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                          }}
                          title="Clear date"
                        >
                          <ApolloIcon name="cross" className="text-xs" />
                        </button>
                        <Button
                          variant="default"
                          size="xs"
                          icon={<ApolloIcon name="calendar" />}
                          title={
                            tempDateRange[0] && tempDateRange[1]
                              ? `${dayjs(tempDateRange[0]).format('MMM DD, YYYY')} → ${dayjs(tempDateRange[1]).format('MMM DD, YYYY')}`
                              : tempDateRange[0]
                                ? dayjs(tempDateRange[0]).format('MMM DD, YYYY')
                                : 'Select date range'
                          }
                        />
                      </div>
                    ) : (
                      <Button
                        variant="default"
                        size="xs"
                        icon={<ApolloIcon name="calendar" />}
                        title="Select date range"
                      />
                    )}
                  </div>
                }
              >
                <div className="p-0" style={{ zIndex: 50 }}>
                  <RangeCalendar
                    value={tempDateRange}
                    onChange={handleTempDateRangeChange}
                    maxDate={new Date()}
                    dayStyle={(date, modifiers) => {
                      // Ensure text is visible for selected dates (first and last in range)
                      // if (modifiers.selected || modifiers.firstInRange || modifiers.lastInRange) {
                      //   return {
                      //     color: '#ffffff',
                      //     fontWeight: '600',
                      //     backgroundColor: '#10b981'
                      //   };
                      // }
                      // Ensure text is visible for dates in the middle of range
                      if (modifiers.inRange) {
                        return {
                          color: '#1f2937',
                          backgroundColor: '#e5e7eb',
                          fontWeight: '500',
                        };
                      }
                      return {};
                    }}
                  />
                  <div className="mt-2 flex items-center justify-end gap-2 border-t px-2 pt-2 pb-2">
                    <Button variant="secondary" size="sm" onClick={handleClear}>
                      Clear
                    </Button>
                    <Button
                      variant="solid"
                      size="sm"
                      onClick={handleApply}
                      disabled={!tempDateRange[0] && !tempDateRange[1]}
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              </Dropdown>
            </div>
          }
        />
      </div>

      {/* Drill-Down Modal */}
      {modalParams && (
        <DrillDownModal
          isOpen={!!modalParams}
          onClose={() => setModalParams(null)}
          primary={modalParams.primary}
          secondary={modalParams.secondary}
          primaryIds={modalParams.primaryIds}
          secondaryIds={modalParams.secondaryIds}
          dateRange={dateRange}
          leadType={getLeadType()}
          title={modalParams.title}
        />
      )}
    </>
  );
};

export default AgentsTable;
