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

interface SourcePerformanceLineChartProps {
  breakdowns: SourceBreakdown[];
}

const SourcePerformanceLineChart: React.FC<SourcePerformanceLineChartProps> = ({ breakdowns }) => {
  // Prepare source performance bar chart data
  const chartData = React.useMemo(() => {
    if (!breakdowns?.length) return null;

    // Sort by lead count descending and take top 8
    const sortedSources = [...breakdowns]
      ?.sort((a, b) => b?.lead_count - a?.lead_count)
      ?.slice(0, 8);

    return {
      series: [
        {
          name: 'Leads',
          data: sortedSources?.length > 0 ? sortedSources?.map((source) => source?.lead_count) : [],
        },
        {
          name: 'Offers',
          data:
            sortedSources?.length > 0
              ? sortedSources?.map((source) => source?.entity_counts?.offers)
              : [],
        },
        {
          name: 'Price (€)',
          data:
            sortedSources?.length > 0 ? sortedSources?.map((source) => source?.source_price) : [],
        },
      ],
      categories:
        sortedSources?.length > 0 ? sortedSources?.map((source) => source?.source_name) : [],
      colors: [COLORS[3], COLORS[4], COLORS[5]],
    };
  }, [breakdowns]);

  if (!chartData || !chartData?.series?.length) {
    return null;
  }

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-black">Source Performance Trends</h3>
        <p className="text-sm text-black">Leads, offers, and pricing by source</p>
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
                formatter: (value: number) => value?.toLocaleString(),
              },
            },
            colors: chartData?.colors,
            plotOptions: {
              bar: {
                horizontal: false,
                columnWidth: '60%',
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

export default SourcePerformanceLineChart;
