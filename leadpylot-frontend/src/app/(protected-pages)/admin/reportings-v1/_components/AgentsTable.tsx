'use client';

import BaseTable from '@/components/shared/BaseTable/BaseTable';
import { ColumnDef } from '@/components/shared/DataTable';
import { AgentPerformanceData, AgentSummary } from '@/services/ReportingService';
import { AGENT_COLORS } from '@/utils/utils';
import React, { useMemo } from 'react';
import AgentsSummaryCards from './AgentsSummaryCards';

interface AgentsTableProps {
  data: AgentPerformanceData[];
  onAgentSelect: (agent: AgentSummary) => void;
  dateRange: { start_date?: string; end_date?: string };
}

const AgentsTable: React.FC<AgentsTableProps> = ({ data, onAgentSelect }) => {
  // Function to get agent color based on name (same logic as CommonLeadsDashboard)
  const getAgentColor = (name: string): string => {
    try {
      if (!name || typeof name !== 'string') return 'text-gray-600';
      const trimmed = name?.trim().toUpperCase();
      let key = '';
      if (trimmed?.length === 1) {
        key = trimmed?.charAt(0);
      } else if (trimmed?.length === 2) {
        key = trimmed?.slice(0, 2);
      } else if (trimmed?.length > 2) {
        key = trimmed?.slice(0, 2) + trimmed?.charAt(trimmed?.length - 1);
      }
      // Use a hash of the key to pick a color deterministically
      const colorKeys = Object.keys(AGENT_COLORS);
      let hash = 0;
      for (let i = 0; i < key?.length; i++) {
        hash = (hash << 5) - hash + key.charCodeAt(i);
        hash |= 0; // Convert to 32bit integer
      }
      const colorIndex = Math.abs(hash) % colorKeys?.length;
      return AGENT_COLORS[colorKeys[colorIndex]] || 'text-gray-500';
    } catch {
      return 'text-gray-500';
    }
  };

  // Transform the data for the table
  const tableData = useMemo(() => {
    return data?.map((agentData) => ({
      ...agentData.agent,
      metrics: agentData?.metrics,
      // Add calculated fields for sorting/display
      performance_score:
        agentData?.metrics?.total_investment + agentData?.metrics?.total_leads * 100,
      conversion_rate: agentData?.metrics?.conversion_rates?.lead_to_offer,
    }));
  }, [data]);

  // Define table columns
  const columns: ColumnDef<any>[] = useMemo(
    () => [
      {
        accessorKey: 'display_name',
        header: 'Agent',
        cell: ({ row }) => (
          <div className="flex items-center space-x-3">
            <div>
              <div className={`font-semibold ${getAgentColor(row.original?.display_name)}`}>
                {row.original?.display_name}
              </div>
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'metrics.total_leads',
        header: 'Leads',
        cell: ({ row }) => (
          <div className="text-start">
            <div className="font-semibold text-gray-900">
              {row.original.metrics.total_leads.toLocaleString()}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'metrics.total_offers',
        header: 'Offers',
        cell: ({ row }) => (
          <div className="text-start">
            <div className="font-semibold text-gray-900">
              {row.original.metrics.total_offers.toLocaleString()}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'conversion_rate',
        header: 'Lead → Offer',
        cell: ({ row }) => (
          <div className="text-start">
            <span
              className={`rounded-full px-2 py-1 text-xs font-semibold ${
                row.original?.conversion_rate >= 10
                  ? 'bg-green-100 text-green-800'
                  : row.original?.conversion_rate >= 5
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
              }`}
            >
              {row.original?.conversion_rate?.toFixed(1)}%
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'metrics.total_openings',
        header: 'Openings',
        cell: ({ row }) => (
          <div className="text-start">
            <div className="font-semibold text-gray-900">
              {row.original?.metrics?.total_openings?.toLocaleString()}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'metrics.total_payments',
        header: 'Payments',
        cell: ({ row }) => (
          <div className="text-start">
            <div className="font-semibold text-gray-900">
              {row.original?.metrics?.total_payments?.toLocaleString()}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'metrics.total_netto1',
        header: 'Netto1',
        cell: ({ row }) => (
          <div className="text-start">
            <div className="font-semibold text-gray-900">
              {row.original?.metrics?.total_netto1?.toLocaleString()}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'metrics.total_investment',
        header: 'Investment',
        cell: ({ row }) => (
          <div className="text-start">
            <div className="font-semibold text-gray-900">
              €{row.original?.metrics?.total_investment?.toLocaleString()}
            </div>
            {row.original?.metrics?.total_offers > 0 && (
              <div className="text-xs text-gray-500">
                Avg: €{row.original?.metrics?.average_investment_per_offer?.toLocaleString()}
              </div>
            )}
          </div>
        ),
      },
    ],
    [onAgentSelect]
  );

  // Sort data by investment descending (default)
  const sortedData = useMemo(() => {
    return [...tableData]?.sort(
      (a, b) => b?.metrics?.total_investment - a?.metrics?.total_investment
    );
  }, [tableData]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    if (!data?.length) return null;

    const totals = data?.reduce(
      (acc, agent) => ({
        leads: acc?.leads + agent?.metrics?.total_leads,
        offers: acc?.offers + agent?.metrics?.total_offers,
        openings: acc?.openings + agent?.metrics?.total_openings,
        payments: acc?.payments + agent?.metrics?.total_payments,
        investment: acc?.investment + agent?.metrics?.total_investment,
      }),
      { leads: 0, offers: 0, openings: 0, payments: 0, investment: 0 }
    );

    return {
      totalAgents: data?.length,
      ...totals,
      avgConversion:
        data?.reduce((acc, agent) => acc + agent?.metrics?.conversion_rates?.lead_to_offer, 0) /
        data?.length,
    };
  }, [data]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <AgentsSummaryCards summaryStats={summaryStats} />

      {/* Agents Table */}
      <BaseTable
        tableName="agents-performance"
        data={sortedData}
        columns={columns}
        loading={false}
        pageIndex={1}
        pageSize={sortedData?.length}
        totalItems={sortedData?.length}
        onRowClick={(row) => onAgentSelect(row)}
        rowClassName="cursor-pointer hover:bg-gray-50 transition-colors duration-200"
        showActionsDropdown={false}
        selectable={false}
        deleteButton={false}
        showSearchInActionBar={true}
        showPagination={true}
        showNavigation={true}
        enableColumnResizing={false}
      />
    </div>
  );
};

export default AgentsTable;
