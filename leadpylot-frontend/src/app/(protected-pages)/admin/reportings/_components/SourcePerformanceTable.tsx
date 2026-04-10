'use client';

import React from 'react';
import Card from '@/components/ui/Card';

interface SourceBreakdown {
  source_id: string;
  source_name: string;
  source_price: number;
  lead_count: number;
  entity_counts: {
    offers: number;
  };
}

interface SourcePerformanceTableProps {
  breakdowns: SourceBreakdown[];
}

const SourcePerformanceTable: React.FC<SourcePerformanceTableProps> = ({ breakdowns }) => {
  if (!breakdowns?.length) {
    return null;
  }

  return (
    <Card className="p-6">
      <h3 className="mb-4 text-lg font-semibold text-black">Source Performance</h3>
      <div className="space-y-3">
        {breakdowns?.length > 0
          ? breakdowns?.slice(0, 10)?.map((source) => (
              <div
                key={source?.source_id}
                className="flex items-center justify-between border-b border-gray-100 py-2 last:border-0 dark:border-gray-700"
              >
                <div>
                  <div className="text-sm font-medium text-black">{source?.source_name}</div>
                  <div className="text-xs text-black">
                    €{source?.source_price} • {source?.entity_counts?.offers} offers
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-black">{source?.lead_count}</div>
                  <div className="text-xs text-black">leads</div>
                </div>
              </div>
            ))
          : null}
      </div>
    </Card>
  );
};

export default SourcePerformanceTable;
