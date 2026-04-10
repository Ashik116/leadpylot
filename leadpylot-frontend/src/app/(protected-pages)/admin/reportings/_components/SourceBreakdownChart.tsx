'use client';

import React from 'react';
import Card from '@/components/ui/Card';
import Chart from '@/components/shared/Chart';
import { COLORS } from '@/constants/chart.constant';

interface SourceBreakdown {
  source_id: string;
  source_name: string;
  source_price: number;
  lead_count: number;
  entity_counts: {
    offers: number;
  };
}

interface SourceBreakdownChartProps {
  breakdowns: SourceBreakdown[];
  totalLeads: number;
}

const SourceBreakdownChart: React.FC<SourceBreakdownChartProps> = ({ breakdowns, totalLeads }) => {
  // Prepare source breakdown pie chart data
  const chartData = React.useMemo(() => {
    if (!breakdowns?.length) return null;

    const data = breakdowns?.slice(0, 8); // Top 8 sources
    return {
      series: data?.length > 0 ? data?.map((source) => source?.lead_count) : [],
      labels: data?.length > 0 ? data?.map((source) => source?.source_name) : [],
      colors: data?.length > 0 ? COLORS?.slice(0, data?.length) : [],
    };
  }, [breakdowns]);

  if (!chartData || !chartData?.series?.length) {
    return null;
  }

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-black">Sources Distribution</h3>
        <p className="text-sm text-black">Leads by source</p>
      </div>
      <div className="h-80">
        <Chart
          type="donut"
          series={chartData?.series}
          height={320}
          customOptions={{
            labels: chartData?.labels,
            colors: chartData?.colors,
            legend: {
              show: true,
              position: 'bottom',
            },
          }}
          donutTitle="Total"
          donutText={totalLeads.toString()}
        />
      </div>
    </Card>
  );
};

export default SourceBreakdownChart;
