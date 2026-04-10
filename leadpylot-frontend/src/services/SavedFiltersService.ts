/**
 * Configuration service — user saved filter presets (`POST /saved-filters`, etc.).
 *
 * @see api-response.txt
 */
import ApiService from './ApiService';
import type {
  CreateSavedFilterInput,
  DeleteSavedFilterResponse,
  SavedFilter,
  SavedFiltersEnvelope,
  SavedFiltersListQuery,
  UpdateSavedFilterInput,
} from '@/types/savedFilter.types';

function assertSuccessData<T>(
  res: SavedFiltersEnvelope<T> | { success?: boolean; data?: T; error?: string }
): asserts res is { success: true; data: T } {
  if (!res || res.success !== true || res.data === undefined) {
    const err = (res as { error?: string })?.error || 'Request failed';
    throw new Error(err);
  }
}

/** List pagination and filters — @see api-response.txt (`page`, `limit`, `type`, …). */
function savedFiltersListParams(query?: SavedFiltersListQuery) {
  const paginationPage = query?.page ?? query?.pageNum ?? 1;
  return {
    page: paginationPage,
    limit: query?.limit ?? 20,
    ...(query?.type ? { type: query.type } : {}),
    ...(query?.search ? { search: query.search } : {}),
    ...(query?.sortBy ? { sortBy: query.sortBy } : {}),
    ...(query?.sortOrder ? { sortOrder: query.sortOrder } : {}),
  };
}

export async function apiCreateSavedFilter(body: CreateSavedFilterInput): Promise<SavedFilter> {
  const res = (await ApiService.fetchDataWithAxios({
    url: '/saved-filters',
    method: 'post',
    data: body,
  })) as SavedFiltersEnvelope<SavedFilter>;
  assertSuccessData(res);
  return res.data;
}

export async function apiListSavedFilters(query?: SavedFiltersListQuery): Promise<{
  data: SavedFilter[];
  meta?: import('@/types/savedFilter.types').SavedFilterListMeta;
}> {
  const res = (await ApiService.fetchDataWithAxios({
    url: '/saved-filters',
    method: 'get',
    params: savedFiltersListParams(query),
  })) as SavedFiltersEnvelope<SavedFilter[]>;
  assertSuccessData(res);
  return { data: res.data, meta: res.meta };
}

export async function apiListSavedFiltersByPage(
  pageKey: string,
  query?: SavedFiltersListQuery
): Promise<{ data: SavedFilter[]; meta?: import('@/types/savedFilter.types').SavedFilterListMeta }> {
  const encoded = encodeURIComponent(pageKey);
  const res = (await ApiService.fetchDataWithAxios({
    url: `/saved-filters/by-page/${encoded}`,
    method: 'get',
    params: savedFiltersListParams(query),
  })) as SavedFiltersEnvelope<SavedFilter[]>;
  assertSuccessData(res);
  return { data: res.data, meta: res.meta };
}

export async function apiGetSavedFilter(id: string): Promise<SavedFilter> {
  const res = (await ApiService.fetchDataWithAxios({
    url: `/saved-filters/${encodeURIComponent(id)}`,
    method: 'get',
  })) as SavedFiltersEnvelope<SavedFilter>;
  assertSuccessData(res);
  return res.data;
}

export async function apiUpdateSavedFilter(
  id: string,
  body: UpdateSavedFilterInput
): Promise<SavedFilter> {
  const res = (await ApiService.fetchDataWithAxios({
    url: `/saved-filters/${encodeURIComponent(id)}`,
    method: 'put',
    data: body,
  })) as SavedFiltersEnvelope<SavedFilter>;
  assertSuccessData(res);
  return res.data;
}

export async function apiDeleteSavedFilter(id: string): Promise<void> {
  const res = (await ApiService.fetchDataWithAxios({
    url: `/saved-filters/${encodeURIComponent(id)}`,
    method: 'delete',
  })) as DeleteSavedFilterResponse | { success: boolean; error?: string };
  if (!res || (res as DeleteSavedFilterResponse).success !== true) {
    throw new Error((res as { error?: string }).error || 'Delete failed');
  }
}
