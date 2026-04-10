'use client';

import React, { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import CommonCard from '@/components/shared/card/CommonCard';
import navigationIcon from '@/configs/navigation-icon.config';
import { useAgentDetails } from '@/services/hooks/useReporting';
import { AgentSummary } from '@/services/ReportingService';
import OfferProgressionChart from './OfferProgressionChart';
import ProjectBreakdownChart from './ProjectBreakdownChart';
import SourceBreakdownChart from './SourceBreakdownChart';
import ProjectPerformanceTable from './ProjectPerformanceTable';
import SourcePerformanceTable from './SourcePerformanceTable';
import ProjectPerformanceLineChart from './ProjectPerformanceLineChart';
import SourcePerformanceLineChart from './SourcePerformanceLineChart';

interface AgentDetailViewProps {
  agent: AgentSummary;
  dateRange: { start_date?: string; end_date?: string };
  onBack: () => void;
}

const AgentDetailView: React.FC<AgentDetailViewProps> = ({ agent, dateRange, onBack }) => {
  // Tab state for switching between charts and tables
  const [activeTab, setActiveTab] = useState<'charts' | 'tables'>('charts');

  // Fetch detailed agent data
  const { data: agentData, isLoading, error, refetch } = useAgentDetails(agent?._id, dateRange);

  const agentDetails = agentData?.data?.data?.agents?.[0];
  const metrics = agentDetails?.metrics;
  const breakdowns = agentDetails?.breakdowns;

  if (error) {
    return (
      <Card className="pb-8">
        <div className="space-y-4 text-center">
          <ApolloIcon name="alert-triangle" className="mx-auto h-12 w-12 text-red-500" />
          <div>
            <h3 className="text-lg font-medium text-black">Failed to load agent details</h3>
            <p className="mt-2 text-sm text-black">
              {error instanceof Error ? error.message : 'An unexpected error occurred'}
            </p>
          </div>
          <div className="flex justify-center space-x-3">
            <Button
              onClick={onBack}
              variant="plain"
              className="focus:ring-opacity-20 flex items-center gap-2 border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all duration-200 hover:border-gray-400 hover:bg-gray-50 hover:shadow-md focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <ApolloIcon name="arrow-left" className="h-4 w-4" />
              Back to Agents
            </Button>
            <Button onClick={() => refetch()}>Try Again</Button>
          </div>
        </div>
      </Card>
    );
  }

  if (isLoading || !metrics) {
    return (
      <Card className="p-8">
        <LoadingSpinner className="mx-auto" />
        <p className="mt-4 text-center text-black">Loading agent details...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Agent Overview Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-8">
        <CommonCard
          title="Leads"
          value={metrics?.total_leads?.toLocaleString()}
          icon={null}
          label=""
          color="text-blue-600"
        />

        <CommonCard
          title="Offers"
          value={metrics?.total_offers?.toLocaleString()}
          icon={null}
          label=""
          color="text-purple-600"
        />

        <CommonCard
          title="Current Offers"
          value={metrics?.current_offers?.toLocaleString()}
          icon={null}
          label=""
          color="text-indigo-600"
        />

        <CommonCard
          title="Openings"
          value={metrics?.total_openings?.toLocaleString()}
          icon={null}
          label=""
          color="text-orange-600"
        />

        <CommonCard
          title="Confirmations"
          value={metrics?.total_confirmations?.toLocaleString()}
          icon={null}
          label=""
          color="text-green-600"
        />

        <CommonCard
          title="Payments"
          value={metrics?.total_payments?.toLocaleString()}
          icon={null}
          label=""
          color="text-emerald-600"
        />

        <CommonCard
          title="Netto1"
          value={metrics?.total_netto1?.toLocaleString()}
          icon={null}
          label=""
          color="text-cyan-600"
        />

        <CommonCard
          title="Netto2"
          value={metrics?.total_netto2?.toLocaleString()}
          icon={null}
          label=""
          color="text-teal-600"
        />
      </div>

      {/* Investment & Conversion Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <CommonCard
          title="Total Investment"
          value={`€${metrics?.total_investment?.toLocaleString()}`}
          icon={<div className="h-8 w-8 text-indigo-500">{navigationIcon.ChartBarIcon}</div>}
          label={`Avg per offer: €${metrics?.average_investment_per_offer?.toLocaleString()}`}
          color="text-indigo-600"
        />

        <CommonCard
          title="Lead → Offer"
          value={`${metrics?.conversion_rates?.lead_to_offer?.toFixed(1)}%`}
          icon={<div className="h-8 w-8 text-green-500">{navigationIcon.dashboardLeads}</div>}
          label={
            metrics?.conversion_rates?.lead_to_offer >= 10
              ? 'Excellent'
              : metrics?.conversion_rates?.lead_to_offer >= 5
                ? 'Good'
                : 'Needs Improvement'
          }
          color={
            metrics?.conversion_rates?.lead_to_offer >= 10
              ? 'text-green-600'
              : metrics?.conversion_rates?.lead_to_offer >= 5
                ? 'text-yellow-600'
                : 'text-red-600'
          }
        />

        <CommonCard
          title="Offer → Opening"
          value={`${metrics?.conversion_rates?.offer_to_opening?.toFixed(1)}%`}
          icon={<div className="h-8 w-8 text-orange-500">{navigationIcon?.dashboardOpening}</div>}
          label="Conversion rate"
          color="text-orange-600"
        />

        <CommonCard
          title="Offer → Payment"
          value={`${metrics?.conversion_rates?.offer_to_payment?.toFixed(1)}%`}
          icon={
            <div className="h-8 w-8 text-emerald-500">
              {navigationIcon?.dashboardPaymentVouchers}
            </div>
          }
          label="Payment rate"
          color="text-emerald-600"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <OfferProgressionChart metrics={metrics} />
        <ProjectBreakdownChart
          breakdowns={breakdowns?.by_project || []}
          totalLeads={metrics?.total_leads}
        />
        <SourceBreakdownChart
          breakdowns={breakdowns?.by_source || []}
          totalLeads={metrics?.total_leads}
        />
      </div>

      {/* Tabbed Performance Section */}
      <Card className="p-6">
        <div className="mb-6">
          <div className="flex space-x-1 rounded-lg bg-gray-100 p-1">
            <button
              onClick={() => setActiveTab('charts')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all duration-200 ${
                activeTab === 'charts'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ApolloIcon name="area-chart" className="h-4 w-4" />
              Performance Charts
            </button>
            <button
              onClick={() => setActiveTab('tables')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all duration-200 ${
                activeTab === 'tables'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ApolloIcon name="grid" className="h-4 w-4" />
              Detailed Tables
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'charts' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ProjectPerformanceLineChart breakdowns={breakdowns?.by_project || []} />
            <SourcePerformanceLineChart breakdowns={breakdowns?.by_source || []} />
          </div>
        )}

        {activeTab === 'tables' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ProjectPerformanceTable breakdowns={breakdowns?.by_project || []} />
            <SourcePerformanceTable breakdowns={breakdowns?.by_source || []} />
          </div>
        )}
      </Card>
    </div>
  );
};

export default AgentDetailView;
