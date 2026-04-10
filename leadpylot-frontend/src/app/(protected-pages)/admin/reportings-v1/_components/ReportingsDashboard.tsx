'use client';

import ApolloIcon from '@/components/ui/ApolloIcon';
import Button from '@/components/ui/Button';
import { useAllAgents } from '@/services/hooks/useReporting';
import { AgentSummary } from '@/services/ReportingService';
import { usePageInfoStore } from '@/stores/pageInfoStore';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AgentDetailView, AgentsTable, DateRangeFilter, ReportingsSkeleton } from './index';

const ReportingsDashboard = () => {
  const [selectedAgent, setSelectedAgent] = useState<AgentSummary | null>(null);
  const [dateRange, setDateRange] = useState<{
    start_date?: string;
    end_date?: string;
  }>({});

  // URL parameters and router
  const searchParams = useSearchParams();
  const router = useRouter();

  // Fetch all agents data
  const {
    data: agentsData,
    isLoading: isLoadingAgents,
    error: agentsError,
    refetch: refetchAgents,
  } = useAllAgents();

  // Refresh mutation

  // Page info store for setting title and subtitle
  const { setPageInfo } = usePageInfoStore();

  const handleAgentSelect = (agent: AgentSummary) => {
    setSelectedAgent(agent);
  };

  const handleBackToTable = () => {
    setSelectedAgent(null);
  };

  const handleRefresh = () => {
    if (selectedAgent) {
      // If viewing agent details, just refetch that data
      // The AgentDetailView component will handle its own refresh
    } else {
      // If viewing table, refresh all agents
      refetchAgents();
    }
  };

  const handleDateRangeChange = (range: { start_date?: string; end_date?: string }) => {
    setDateRange(range);
  };

  // Handle reset parameter from URL
  useEffect(() => {
    const resetParam = searchParams.get('reset');
    if (resetParam === 'true') {
      setSelectedAgent(null);
      // Remove the reset parameter from URL
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('reset');
      const newUrl = newSearchParams.toString()
        ? `/admin/reportings?${newSearchParams.toString()}`
        : '/admin/reportings';
      router.replace(newUrl);
    }
  }, [searchParams, router]);

  // Set page info based on selected agent and data
  useEffect(() => {
    if (selectedAgent) {
      setPageInfo({
        title: `${selectedAgent?.display_name} Performance`,
        subtitle: 'Detailed performance metrics and analytics',
        total: undefined, // We don't have a total count for individual agent view
      });
    } else if (agentsData?.data?.data?.agents) {
      const totalAgents = agentsData?.data?.data?.agents?.length;
      setPageInfo({
        title: 'Agent Performance Reports',
        subtitle: 'View and analyze agent performance metrics',
        total: totalAgents,
      });
    }
  }, [selectedAgent, agentsData, setPageInfo]);

  if (agentsError) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4">
        <ApolloIcon name="alert-triangle" className="h-12 w-12 text-red-500" />
        <div className="text-center">
          <h3 className="text-lg font-medium text-black">Failed to load reporting data</h3>
          <p className="mt-2 text-sm text-black">
            {agentsError instanceof Error ? agentsError?.message : 'An unexpected error occurred'}
          </p>
          <Button onClick={handleRefresh} className="mt-4">
            <ApolloIcon name="refresh" className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div className="flex items-center space-x-4">
          <div>{/* Title and subtitle are now handled by pageInfoStore in FrameLessSide */}</div>
        </div>

        <div className="flex items-center space-x-3">
          {selectedAgent && <DateRangeFilter onDateRangeChange={handleDateRangeChange} />}
        </div>
      </div>

      {/* Main Content */}
      {isLoadingAgents ? (
        <ReportingsSkeleton />
      ) : selectedAgent ? (
        <AgentDetailView agent={selectedAgent} dateRange={dateRange} onBack={handleBackToTable} />
      ) : (
        <AgentsTable
          data={agentsData?.data?.data?.agents || []}
          onAgentSelect={handleAgentSelect}
          dateRange={dateRange}
        />
      )}
    </div>
  );
};

export default ReportingsDashboard;
