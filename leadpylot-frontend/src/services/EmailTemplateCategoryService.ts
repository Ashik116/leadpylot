import ApiService from './ApiService';

export interface EmailTemplateCategory {
  _id: string;
  name: string;
}

export interface GetEmailTemplateCategoriesResponse {
  data: EmailTemplateCategory[];
}

export async function apiGetEmailTemplateCategories(params?: Record<string, unknown>) {
  return ApiService.fetchDataWithAxios<GetEmailTemplateCategoriesResponse>({
    url: '/api/email-template-categories',
    method: 'get',
    params,
  });
}

export async function apiCreateEmailTemplateCategory(body: { name: string }) {
  return ApiService.fetchDataWithAxios<EmailTemplateCategory>({
    url: '/api/email-template-categories',
    method: 'post',
    data: body,
  });
}

export async function apiUpdateEmailTemplateCategory(categoryId: string, body: { name: string }) {
  return ApiService.fetchDataWithAxios<EmailTemplateCategory>({
    url: `/api/email-template-categories/${categoryId}`,
    method: 'put',
    data: body,
  });
}

export async function apiDeleteEmailTemplateCategory(categoryId: string) {
  return ApiService.fetchDataWithAxios<void>({
    url: `/api/email-template-categories/${categoryId}`,
    method: 'delete',
  });
}
