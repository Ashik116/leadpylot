import type { DomainFilter } from '@/stores/universalGroupingFilterStore';

/** Path segment for close-project closed-leads bank (see `mergeCloseProjectTeamDomain`). */
export const CLOSE_PROJECTS_LEADS_BANK_PATH = '/dashboards/projects/close-projects/';

export function isCloseProjectsLeadsBankPath(pathname: string | null | undefined): boolean {
  return pathname?.includes(CLOSE_PROJECTS_LEADS_BANK_PATH) ?? false;
}

/** GET `/api/metadata/options/{entityType}` for this page uses `ClosedLeads` (model ClosedLead). */
export const METADATA_OPTIONS_ENTITY_CLOSED_LEADS = 'ClosedLeads';

/** Fallback: resolve team id from project payload when route id is missing. */
export function resolveCloseProjectTeamId(projectData: unknown): string | undefined {
  if (!projectData || typeof projectData !== 'object') return undefined;
  const p = projectData as Record<string, unknown>;

  const asMongoId = (v: unknown): string | undefined => {
    if (typeof v === 'string' && /^[0-9a-f]{24}$/i.test(v)) return v;
    if (v && typeof v === 'object' && v !== null && '_id' in v) {
      const id = (v as { _id?: unknown })._id;
      if (typeof id === 'string' && /^[0-9a-f]{24}$/i.test(id)) return id;
    }
    return undefined;
  };

  return asMongoId(p.team_id) ?? asMongoId(p.team);
}

/**
 * Close-projects lead bank: `/dashboards/projects/close-projects/[teamId]`.
 * Scope closed-leads grouping/filtering with `team_id` using `=` and the route param (not project_id).
 */
export function mergeCloseProjectTeamDomain(
  closeProjectRouteId: string | undefined,
  domainFilters: DomainFilter[]
): DomainFilter[] {
  if (!closeProjectRouteId || !/^[a-f0-9]{24}$/i.test(closeProjectRouteId)) {
    return domainFilters;
  }

  const hasTeamScope = domainFilters.some((f) => f[0] === 'team_id');
  if (hasTeamScope) return domainFilters;

  const teamScope: DomainFilter = ['team_id', '=', closeProjectRouteId];
  return [teamScope, ...domainFilters];
}

/**
 * Project detail leads embed: `/dashboards/projects/[mongoId]` (not `/close-projects/...`).
 * Scope open `/leads` grouping via `team_id` = route project id; omit legacy `project=` query scoping.
 */
export function isProjectLeadsMongoDetailRoute(opts: {
  pathname: string | null | undefined;
  currentTab?: string;
  externalProjectId?: string;
  closeProjectId?: string;
}): boolean {
  const { pathname, currentTab, externalProjectId, closeProjectId } = opts;
  if (closeProjectId) return false;
  if (!externalProjectId || !/^[a-f0-9]{24}$/i.test(externalProjectId)) return false;
  if (pathname?.startsWith('/dashboards/projects/close-projects/')) return false;
  if (pathname && /^\/dashboards\/projects\/[a-f0-9]{24}$/i.test(pathname)) return true;
  if (currentTab === 'project_leads') return true;
  return false;
}
