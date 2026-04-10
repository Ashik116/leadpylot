import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/hooks/useSession';
import {
  apiGetMyReclamations,
  apiGetReclamations,
  apiGetReclamation,
} from '../ReclamationsService';
import { ColumnDef } from '@tanstack/react-table';

// import { apiGetMyReclamations, apiGetReclamations } from '../ReclamationsService';

interface ReclamationType {
  _id: string;
  project_id: string;
  agent_id: {
    _id: string;
    login?: string;
    info?: {
      email?: string;
    };
  };
  lead_id: {
    _id: string;
    phone: string;
  };
  reason: string;
  status: number;
  response: string;
  createdAt: string;
  updatedAt: string;
}

interface ReclamationResponse {
  status: string;
  results: number;
  data: ReclamationType[];
  meta?: {
    total: number;
    page: number;
    limit: number;
  };
}

interface SingleReclamationResponse {
  status: string;
  data: ReclamationType;
}

import type { DomainFilter } from '@/stores/universalGroupingFilterStore';

export interface UseReclamationParams extends Record<string, unknown> {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
  /** Domain filters for filtering (converted to JSON string for API) */
  domain?: DomainFilter[];
  /** Include all records when grouping */
  includeAll?: boolean;
  /** When false, skips the query (e.g. when grouping is active) */
  enabled?: boolean;
}

export const useReclamation = (params?: UseReclamationParams) => {
  const { data: session } = useSession();
  const isAgent = session?.user?.role === 'Agent';

  const apiParams = useMemo(() => {
    if (!params) return undefined;
    const { domain, includeAll, enabled: _enabled, ...rest } = params;
    const built: Record<string, unknown> = { ...rest };
    if (domain && domain.length > 0) {
      built.domain = JSON.stringify(domain);
    }
    if (includeAll) {
      built.includeAll = 'true';
    }
    return built;
  }, [params]);

  const enabled = params?.enabled !== false && !!session;

  return useQuery<ReclamationResponse>({
    queryKey: ['reclamations', apiParams, isAgent],
    queryFn: () => (isAgent ? apiGetMyReclamations(apiParams) : apiGetReclamations(apiParams)),
    enabled,
  });
};

export const useReclamationById = (id?: string) => {
  return useQuery<SingleReclamationResponse>({
    queryKey: ['reclamation', id],
    queryFn: () => apiGetReclamation(id!),
    enabled: !!id,
  });
};

export const getColumnKey = (column: ColumnDef<any, any>): string | undefined => {
  if ('accessorKey' in column && typeof column.accessorKey === 'string') {
    return column.accessorKey;
  }
  return column.id;
};

// Column display label helper
export const getColumnDisplayLabel = (column: ColumnDef<any, any>): string => {
  if (typeof column.header === 'string') {
    return column.header;
  }
  if (typeof column.header === 'function') {
    const headerResult = (column as any).header();
    if (headerResult && headerResult.props && headerResult.props.children) {
      return headerResult.props.children;
    }
    return column.id || 'Column';
  }
  if ('accessorKey' in column && typeof column.accessorKey === 'string') {
    return column.accessorKey
      .split('_')
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  if (column.id) {
    return column.id.charAt(0).toUpperCase() + column.id.slice(1);
  }
  return 'Unnamed Column';
};
