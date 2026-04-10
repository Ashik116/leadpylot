'use client';

import { useMemo } from 'react';

export type ApiUrlType = 'regular' | 'offers' | 'offers-progress' | 'closed-leads';

export interface ApiUrlInfo {
  type: ApiUrlType;
  params: Record<string, unknown>;
  enabled: boolean;
}

function parseSearchParams(searchParams: URLSearchParams): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  searchParams.forEach((value, key) => {
    if (key === 'page' || key === 'limit' || key === 'duplicate') {
      params[key] = parseInt(value, 10);
    } else if (key === 'sortOrder') {
      const n = parseInt(value, 10);
      params[key] = Number.isNaN(n) ? value : n;
    } else if (value === 'true') {
      params[key] = true;
    } else if (value === 'false') {
      params[key] = false;
    } else if (key === 'domain') {
      params[key] = value;
    } else {
      params[key] = value;
    }
  });
  return params;
}

export default function useLeadDetailsApiUrlInfo(
  apiUrl: string | null | undefined,
  navigationItemsLength: number
): ApiUrlInfo | null {
  return useMemo(() => {
    if (!apiUrl) return null;

    try {
      const url = new URL(apiUrl, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
      const endpoint = url.pathname;
      const searchParams = url.searchParams;
      const enabled = navigationItemsLength === 0;

      if (endpoint === '/leads') {
        return {
          type: 'regular',
          params: parseSearchParams(searchParams),
          enabled,
        };
      }

      if (endpoint === '/closed-leads') {
        return {
          type: 'closed-leads',
          params: parseSearchParams(searchParams),
          enabled,
        };
      }

      if (endpoint === '/offers/progress') {
        return {
          type: 'offers-progress',
          params: parseSearchParams(searchParams),
          enabled,
        };
      }

      if (endpoint === '/offers') {
        return {
          type: 'offers',
          params: parseSearchParams(searchParams),
          enabled,
        };
      }
    } catch {
      // Silent fail on URL parse error
    }

    return null;
  }, [apiUrl, navigationItemsLength]);
}
