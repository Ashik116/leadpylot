/**
 * LeadList Component
 * Displays list of searchable leads with selection
 */

import ApolloIcon from '@/components/ui/ApolloIcon';
import { Lead } from '@/services/LeadsService';

interface LeadListProps {
  leads: Lead[];
  selectedLeadId?: string;
  onSelectLead: (lead: Lead) => void;
  isLoading: boolean;
  searchTerm: string;
}

/**
 * Extracts project name from lead project field
 */
function getProjectName(project: Lead['project']): string | null {
  if (!project) return null;
  if (typeof project === 'object') {
    if (Array.isArray(project)) {
      return project[0]?.name || null;
    }
    return (project as any)?.name || null;
  }
  return null;
}

export function LeadList({
  leads,
  selectedLeadId,
  onSelectLead,
  isLoading,
  searchTerm,
}: LeadListProps) {
  if (!searchTerm || searchTerm.length < 2) {
    return null;
  }

  return (
    <div className="mb-4 max-h-64 overflow-y-auto rounded-lg border border-gray-200">
      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <ApolloIcon name="loading" className="animate-spin text-2xl text-gray-400" />
        </div>
      ) : leads.length > 0 ? (
        <div className="divide-y divide-gray-100">
          {leads.map((lead) => {
            const isSelected = selectedLeadId === lead._id;
            const projectName = getProjectName(lead.project);

            return (
              <button
                key={lead._id}
                type="button"
                onClick={() => onSelectLead(lead)}
                className={`w-full p-4 text-left transition-colors hover:bg-gray-50 ${
                  isSelected ? 'border-l-4 border-blue-500 bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {lead.contact_name || 'Unknown'}
                    </div>
                    <div className="text-sm text-gray-600">
                      {lead.email_from || lead.phone || 'No contact info'}
                    </div>
                    {projectName && (
                      <div className="mt-1 text-xs text-blue-600">Project: {projectName}</div>
                    )}
                  </div>
                  {isSelected && <ApolloIcon name="check-circle" className="text-blue-500" />}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="p-8 text-center text-sm text-gray-500">
          No leads found matching &quot;{searchTerm}&quot;
        </div>
      )}
    </div>
  );
}

