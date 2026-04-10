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

interface ProjectPerformanceLineChartProps {
  breakdowns: ProjectBreakdown[];
}

const ProjectPerformanceLineChart: React.FC<ProjectPerformanceLineChartProps> = ({
  breakdowns,
}) => {
  // Prepare project performance bar chart data
  const chartData = React.useMemo(() => {
    if (!breakdowns?.length) return null;

    // Sort by lead count descending and take top 8
    const sortedProjects = [...breakdowns]
      ?.sort((a, b) => b?.lead_count - a?.lead_count)
      ?.slice(0, 8);

    return {
      series: [
        {
          name: 'Leads',
          data:
            sortedProjects?.length > 0 ? sortedProjects?.map((project) => project?.lead_count) : [],
        },
        {
          name: 'Offers',
          data:
            sortedProjects?.length > 0
              ? sortedProjects?.map((project) => project?.entity_counts?.offers)
              : [],
        },
        {
          name: 'Investment (€)',
          data:
            sortedProjects?.length > 0
              ? sortedProjects?.map((project) => project?.entity_counts?.investment)
              : [],
        },
      ],
      categories:
        sortedProjects?.length > 0 ? sortedProjects?.map((project) => project?.project_name) : [],
      colors: [COLORS[0], COLORS[1], COLORS[2]],
    };
  }, [breakdowns]);

  if (!chartData || !chartData?.series?.length) {
    return null;
  }

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-black">Project Performance Trends</h3>
        <p className="text-sm text-black">Leads, offers, and investment by project</p>
      </div>
      <div className="h-80">
        <Chart
          type="bar"
          series={chartData?.series}
          height={320}
          customOptions={{
            xaxis: {
              categories: chartData?.categories,
              labels: {
                rotate: -45,
                style: {
                  fontSize: '12px',
                },
              },
            },
            yaxis: {
              labels: {
                formatter: (value: number) => value.toLocaleString(),
              },
            },
            colors: chartData?.colors,
            plotOptions: {
              bar: {
                horizontal: false,
                columnWidth: '55%',
                endingShape: 'rounded',
                borderRadius: 4,
              },
            },
            dataLabels: {
              enabled: false,
            },
            legend: {
              show: true,
              position: 'top',
            },
            grid: {
              borderColor: '#f1f5f9',
            },
          }}
        />
      </div>
    </Card>
  );
};

export default ProjectPerformanceLineChart;
