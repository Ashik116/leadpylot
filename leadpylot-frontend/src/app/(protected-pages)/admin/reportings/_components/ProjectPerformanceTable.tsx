'use client';

import React from 'react';
import Card from '@/components/ui/Card';

interface ProjectBreakdown {
  project_id: string;
  project_name: string;
  lead_count: number;
  entity_counts: {
    offers: number;
    investment: number;
  };
}

interface ProjectPerformanceTableProps {
  breakdowns: ProjectBreakdown[];
}

const ProjectPerformanceTable: React.FC<ProjectPerformanceTableProps> = ({ breakdowns }) => {
  if (!breakdowns?.length) {
    return null;
  }

  return (
    <Card className="p-6">
      <h3 className="mb-4 text-lg font-semibold text-black">Project Performance</h3>
      <div className="space-y-3">
        {breakdowns?.length > 0
          ? breakdowns?.slice(0, 10)?.map((project) => (
              <div
                key={project?.project_id}
                className="flex items-center justify-between border-b border-gray-100 py-2 last:border-0 dark:border-gray-700"
              >
                <div>
                  <div className="text-sm font-medium text-black">{project?.project_name}</div>
                  <div className="text-xs text-black">
                    {project?.entity_counts?.offers} offers • €
                    {project?.entity_counts?.investment?.toLocaleString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-black">{project?.lead_count}</div>
                  <div className="text-xs text-black">leads</div>
                </div>
              </div>
            ))
          : null}
      </div>
    </Card>
  );
};

export default ProjectPerformanceTable;
