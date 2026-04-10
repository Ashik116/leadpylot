'use client';

import React from 'react';
import TodoBox from './TodoBox';
import TodoCardSkeleton from './TodoCardSkeleton';
import { Lead } from '@/services/LeadsService';

interface TodoBoxGridProps {
  leads: Lead[];
  todos: any[]; // Keep for compatibility but not used
  // Navigation tracking props
  currentPage?: number;
  pageSize?: number;
  isLoading?: boolean;
  // Filter context to understand what type of todos we're showing
  selectedFilter?: {
    filter?: 'assigned_by_me' | 'assigned_to_me' | undefined;
    pendingTodos: boolean;
    completedTodos: boolean;
  };
}

const TodoBoxGrid: React.FC<TodoBoxGridProps> = ({ leads, currentPage, pageSize, isLoading }) => {
  // Show loading skeleton when loading
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Show 6 skeleton cards for loading state */}
        {Array.from({ length: 6 })?.map((_, index) => (
          <TodoCardSkeleton key={`skeleton-${index}`} />
        ))}
      </div>
    );
  }

  // Safety check for empty or invalid data
  if (!leads || !Array.isArray(leads)) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-sand-2 mb-2 text-lg">No data available</div>
          <div className="text-sand-3 text-sm">Please try refreshing the page</div>
        </div>
      </div>
    );
  }

  // Get leads that have activeTodos (from leads API response)
  // The API already filters based on the selected filter, so we just need to show leads with todos
  const leadsWithTodos = leads?.filter(
    (lead) =>
      lead && lead?._id && (lead as any)?.activeTodos && (lead as any)?.activeTodos?.length > 0
  );

  if (leadsWithTodos?.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-sand-2 mb-2 text-lg">No todos found</div>
          <div className="text-sand-3 text-sm">Create some todos to get started</div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {leadsWithTodos?.map((lead) => {
        const activeTodos = (lead as any).activeTodos || [];
        const projectArray = (lead as any).project;
        const projectName =
          projectArray && Array.isArray(projectArray) && projectArray?.length > 0
            ? projectArray[0]?.name
            : undefined;
        const agentName =
          projectArray &&
            Array.isArray(projectArray) &&
            projectArray?.length > 0 &&
            projectArray[0]?.agent
            ? projectArray[0]?.agent?.login
            : undefined;
        const projectId =
          projectArray && Array.isArray(projectArray) && projectArray?.length > 0
            ? projectArray[0]._id
            : undefined;

        return (
          <TodoBox
            key={lead?._id}
            activeTodos={activeTodos}
            contactName={lead?.contact_name}
            emailFrom={lead?.email_from}
            phone={lead?.phone}
            projectName={projectName}
            agentName={agentName}
            sourceName={lead?.lead_source_no || 'Unknown'}
            projectId={projectId}
            leadId={lead?._id}
            allLeadsData={leads}
            currentPage={currentPage}
            pageSize={pageSize}
          />
        );
      })}
    </div>
  );
};

export default TodoBoxGrid;
