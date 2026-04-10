'use client';

import { AgentSummary } from '@/services/ReportingService';
import { usePageInfoStore } from '@/stores/pageInfoStore';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AgentsTable } from './index';
import Card from '@/components/ui/Card';

const ReportingsDashboard = () => {
  const [selectedAgent, setSelectedAgent] = useState<AgentSummary | null>(null);
  const [dateRange, setDateRange] = useState<{
    start_date?: string;
    end_date?: string;
  }>({});

  // URL parameters and router
  const searchParams = useSearchParams();

  // Page info store for setting title and subtitle
  const { setPageInfo } = usePageInfoStore();

  const handleAgentSelect = (agent: AgentSummary) => {
    setSelectedAgent(agent);
  };

  const handleDateRangeChange = (range: { start_date?: string; end_date?: string }) => {
    setDateRange(range);
  };

  // Set page info based on selected agent and mode
  useEffect(() => {
    const mode = searchParams?.get('mode') || 'live';
    const modeText = mode === 'recycle' ? 'Recycle' : 'Live';

    if (selectedAgent) {
      setPageInfo({
        title: `${selectedAgent?.display_name} Performance (${modeText})`,
        subtitle: 'Detailed performance metrics and analytics',
        total: undefined,
      });
    } else {
      setPageInfo({
        title: `${modeText} Lead Report`,
        subtitle: 'Dynamic hierarchical performance metrics',
        total: undefined,
      });
    }
  }, [selectedAgent, searchParams, setPageInfo]);

  return (
    <Card className="h-full max-h-full overflow-hidden" bodyClass="px-4">
      {/* Header */}
      {/* <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0"> */}
      {/* <div className="flex items-center space-x-4"> */}
      <div>{/* Title and subtitle are now handled by pageInfoStore in FrameLessSide */}</div>
      {/* </div> */}

      {/* <div className="flex items-center space-x-3">
          {!selectedAgent && <DateRangeFilter onDateRangeChange={handleDateRangeChange} />}
          {selectedAgent && <DateRangeFilter onDateRangeChange={handleDateRangeChange} />}
        </div>
      </div> */}

      <AgentsTable
        onAgentSelect={handleAgentSelect}
        dateRange={dateRange}
        onDateRangeChange={handleDateRangeChange}
      />
    </Card>
  );
};

export default ReportingsDashboard;
