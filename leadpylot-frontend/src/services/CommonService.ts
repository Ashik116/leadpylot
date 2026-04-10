import ApiService from './ApiService';

export async function apiGetNotificationList() {
  return ApiService.fetchDataWithAxios<any>({
    url: '/notifications',
    method: 'get',
  });
}

export async function apiGetSearchResult<T>(params: { query: string }) {
  return ApiService.fetchDataWithAxios<T>({
    url: '/search',
    method: 'get',
    params,
  });
}
