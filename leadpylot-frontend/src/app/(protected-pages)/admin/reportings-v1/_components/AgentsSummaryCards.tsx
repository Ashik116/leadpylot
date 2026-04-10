'use client';

import React from 'react';
import CommonCard from '@/components/shared/card/CommonCard';
import navigationIcon from '@/configs/navigation-icon.config';

interface AgentsSummaryCardsProps {
  summaryStats: {
    totalAgents: number;
    leads: number;
    offers: number;
    openings: number;
    payments: number;
    investment: number;
    avgConversion: number;
  } | null;
}

const AgentsSummaryCards: React.FC<AgentsSummaryCardsProps> = ({ summaryStats }) => {
  if (!summaryStats) return null;

  return (
    <div className="3xl:grid-cols-6 grid grid-cols-2 gap-4 md:grid-cols-3">
      <CommonCard
        title="Agents"
        value={summaryStats?.totalAgents}
        icon={<div className="h-8 w-8 text-blue-500">{navigationIcon?.dashboardUsers}</div>}
        label="Total agents"
        color="text-blue-600"
      />

      <CommonCard
        title="Total Leads"
        value={summaryStats?.leads?.toLocaleString()}
        icon={<div className="h-8 w-8 text-green-500">{navigationIcon?.dashboardLeads}</div>}
        label="All time leads"
        color="text-green-600"
      />

      <CommonCard
        title="Total Offers"
        value={summaryStats?.offers?.toLocaleString()}
        icon={<div className="h-8 w-8 text-purple-500">{navigationIcon?.dashboardOffers}</div>}
        label="Generated offers"
        color="text-purple-600"
      />

      <CommonCard
        title="Total Openings"
        value={summaryStats?.openings?.toLocaleString()}
        icon={<div className="h-8 w-8 text-orange-500">{navigationIcon?.dashboardOpening}</div>}
        label="Account openings"
        color="text-orange-600"
      />

      <CommonCard
        title="Total Payments"
        value={summaryStats?.payments?.toLocaleString()}
        icon={
          <div className="h-8 w-8 text-emerald-500">{navigationIcon?.dashboardPaymentVouchers}</div>
        }
        label="Processed payments"
        color="text-emerald-600"
      />

      <CommonCard
        title="Total Investment"
        value={`€${summaryStats?.investment?.toLocaleString()}`}
        icon={<div className="h-8 w-8 text-indigo-500">{navigationIcon?.ChartBarIcon}</div>}
        label="Total volume"
        color="text-indigo-600"
      />
    </div>
  );
};

export default AgentsSummaryCards;
