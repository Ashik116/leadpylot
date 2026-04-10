'use client';

import React from 'react';
import Card from '@/components/ui/Card';
import Chart from '@/components/shared/Chart';
import { COLORS } from '@/constants/chart.constant';

interface ProjectBreakdown {
  project_id: string;
  project_name: string;
  lead_count: number;
  entity_counts: {
    offers: number;
    investment: number;
  };
}

interface ProjectBreakdownChartProps {
  breakdowns: ProjectBreakdown[];
  totalLeads: number;
}

const ProjectBreakdownChart: React.FC<ProjectBreakdownChartProps> = ({
  breakdowns,
  totalLeads,
}) => {
  // Prepare project breakdown pie chart data
  const chartData = React.useMemo(() => {
    if (!breakdowns?.length) return null;

    const data = breakdowns?.slice(0, 8); // Top 8 projects
    return {
      series: data?.length > 0 ? data?.map((project) => project?.lead_count) : [],
      labels: data?.length > 0 ? data?.map((project) => project?.project_name) : [],
      colors: data?.length > 0 ? COLORS?.slice(0, data?.length) : [],
    };
  }, [breakdowns]);

  if (!chartData || !chartData?.series?.length) {
    return null;
  }

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-black">Projects Distribution</h3>
        <p className="text-sm text-black">Leads by project</p>
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

export default ProjectBreakdownChart;
