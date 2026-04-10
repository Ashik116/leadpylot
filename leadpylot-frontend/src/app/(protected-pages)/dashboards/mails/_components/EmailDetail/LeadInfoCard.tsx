'use client';

import React from 'react';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { format } from 'date-fns';
import { TLead } from '@/services/LeadsService';
import { getProjectColor } from '@/utils/projectColors';

interface LeadInfoCardProps {
  lead: TLead | null;
}

const LeadInfoCard: React.FC<LeadInfoCardProps> = ({ lead }) => {
  if (!lead) return null;

  // Get project name and color
  const projectName = lead?.project
    ? Array.isArray(lead.project)
      ? (lead.project?.[0] as any)?.name || null
      : (lead.project as any)?.name || null
    : null;
  const projectColor = projectName
    ? (lead?.project?.[0] as any)?.color_code || getProjectColor(projectName)
    : null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex h-8 items-center justify-between">
        <h6 className="text-base font-bold text-gray-900">Lead Information</h6>
        {lead?.lead_date && (
          <p className="text-sm text-gray-700">{format(new Date(lead.lead_date), 'MMM d, yyyy')}</p>
        )}
      </div>
      <div className="space-y-1">
        {/* Project */}
        <div className="flex h-6 items-center justify-between text-gray-600">
          <div className="flex items-center justify-start gap-2">
            <ApolloIcon name="company-cog" className="text-sm" />
            <span className="text-sm font-bold">Project</span>
          </div>
          <div className="flex min-w-20 items-center justify-end text-end text-xs text-gray-900 md:text-sm">
            {projectName ? (
              <span style={{ color: projectColor || undefined }} className="whitespace-nowrap">
                {projectName}
              </span>
            ) : (
              '-'
            )}
          </div>
        </div>

        {/* Assigned */}
        <div className="flex h-6 items-center justify-between text-gray-600">
          <div className="flex items-center justify-start gap-2">
            <ApolloIcon name="pen" className="text-sm" />
            <span className="text-sm font-bold">Assigned</span>
          </div>
          <div className="flex min-w-20 items-center justify-end text-end text-xs text-gray-900 md:text-sm">
            {(() => {
              const leadAny = lead as any;

              // Check for assigned_date (snake_case from API) or assignedAt (camelCase)
              const assignedDate =
                lead?.assigned_date || leadAny?.assignedAt || leadAny?.assigned_date;

              // Check for assigned agent/user - could be object or ID
              const user_id = leadAny?.user_id;
              const agent_id = leadAny?.agent_id;
              const source_agent = leadAny?.source_agent;
              const assignedAgent = user_id || agent_id || source_agent;

              // If we have an assigned date, show it with time (same format as Created/Updated)
              if (assignedDate) {
                try {
                  const date = new Date(assignedDate);
                  if (!isNaN(date.getTime())) {
                    return format(date, 'MMM d, yyyy, h:mm:ss a');
                  }
                } catch {
                  // If date parsing fails, fall through to agent check
                }
              }

              // If we have an assigned agent (object with name/login), show it
              if (assignedAgent) {
                if (typeof assignedAgent === 'object' && assignedAgent !== null) {
                  return (
                    assignedAgent?.login || assignedAgent?.name || assignedAgent?.email || 'N/A'
                  );
                }
              }

              return 'N/A';
            })()}
          </div>
        </div>

        {/* Created Date */}
        {lead?.createdAt && (
          <div className="flex h-6 items-center justify-between text-gray-600">
            <div className="flex items-center justify-start gap-2">
              <ApolloIcon name="plus-circle" className="text-sm" />
              <span className="text-sm font-bold">Created</span>
            </div>
            <div className="flex min-w-20 items-center justify-end text-end text-xs text-gray-900 md:text-sm">
              {format(new Date(lead.createdAt), 'MMM d, yyyy, h:mm:ss a')}
            </div>
          </div>
        )}

        {/* Updated Date */}
        {lead?.updatedAt && (
          <div className="flex h-6 items-center justify-between text-gray-600">
            <div className="flex items-center justify-start gap-2">
              <ApolloIcon name="users" className="text-sm" />
              <span className="text-sm font-bold">Updated</span>
            </div>
            <div className="flex min-w-20 items-center justify-end text-end text-xs text-gray-900 md:text-sm">
              {format(new Date(lead.updatedAt), 'MMM d, yyyy, h:mm:ss a')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeadInfoCard;
