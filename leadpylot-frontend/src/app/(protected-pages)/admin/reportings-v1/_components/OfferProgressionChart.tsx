'use client';

import React from 'react';
import Card from '@/components/ui/Card';
import Chart from '@/components/shared/Chart';
import { COLORS } from '@/constants/chart.constant';

interface OfferProgressionChartProps {
  metrics: {
    current_offers: number;
    total_openings: number;
    total_confirmations: number;
    total_payments: number;
    total_netto1: number;
    total_netto2: number;
    total_lost: number;
    total_offers: number;
  };
}

const OfferProgressionChart: React.FC<OfferProgressionChartProps> = ({ metrics }) => {
  // Prepare offer progression pie chart data
  const chartData = React.useMemo(() => {
    const data = [
      { name: 'Current Offers', value: metrics?.current_offers },
      { name: 'Openings', value: metrics?.total_openings },
      { name: 'Confirmations', value: metrics?.total_confirmations },
      { name: 'Payments', value: metrics?.total_payments },
      { name: 'Netto1', value: metrics?.total_netto1 },
      { name: 'Netto2', value: metrics?.total_netto2 },
      { name: 'Lost', value: metrics?.total_lost },
    ]?.filter((item) => item?.value > 0);

    return {
      series: data?.length > 0 ? data?.map((item) => item?.value) : [],
      labels: data?.length > 0 ? data?.map((item) => item?.name) : [],
      colors: data?.length > 0 ? COLORS?.slice(0, data?.length) : [],
    };
  }, [metrics]);

  if (!chartData?.series?.length) {
    return null;
  }

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-black">Offer Progression</h3>
        <p className="text-sm text-black">Distribution of offers by current stage</p>
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
          donutText={metrics?.total_offers?.toString()}
        />
      </div>
    </Card>
  );
};

export default OfferProgressionChart;
