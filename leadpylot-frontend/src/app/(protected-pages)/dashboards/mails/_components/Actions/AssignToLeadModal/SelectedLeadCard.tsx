/**
 * SelectedLeadCard Component
 * Displays selected lead information
 */

import Badge from '@/components/ui/Badge';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { Lead } from '@/services/LeadsService';

interface SelectedLeadCardProps {
  lead: Lead;
  onRemove?: () => void;
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

/**
 * Counts active offers from lead
 */
function getActiveOffersCount(lead: Lead): number {
  if (!(lead as any)?.offers || !Array.isArray((lead as any).offers)) {
    return 0;
  }
  return (lead as any).offers.filter((offer: any) => offer.active === true).length;
}

export function SelectedLeadCard({ lead, onRemove }: SelectedLeadCardProps) {
  const projectName = getProjectName(lead.project);
  const activeOffersCount = getActiveOffersCount(lead);

  return (
    <div className="mt-2 flex items-center gap-3 rounded-md border border-blue-200 bg-blue-50 px-3 py-2">
      <ApolloIcon name="check-circle" className="h-4 w-4 shrink-0 text-blue-600" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium text-gray-900">
            {lead.contact_name || 'Unknown'}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">Offers:</span>
            {activeOffersCount > 0 && (
              <div className="flex min-h-5 min-w-5 items-center justify-center rounded-full bg-green-500 text-xs text-white">
                {activeOffersCount}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <span className="truncate">{lead.email_from || lead.phone || 'No contact info'}</span>
          {projectName && (
            <>
              <span className="text-gray-400">•</span>
              <span className="text-blue-600">{projectName}</span>
            </>
          )}
        </div>
      </div>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 text-gray-400 transition-colors hover:text-gray-600"
          aria-label="Remove selected lead"
        >
          <ApolloIcon name="cross" className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
