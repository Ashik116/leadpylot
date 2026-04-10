import ApiService from './ApiService';

export interface EmailTemplateVariable {
  success: boolean;
  variables: Variables;
  message: string;
  usage: {
    description: string;
    example: string;
    note: string;
  };
}

export interface OfferGroup {
  offers: Record<string, string>;
  bank: Record<string, string>;
  payment_terms: Record<string, string>;
  bonus_amount: Record<string, string>;
  opening: Record<string, string>;
}

export interface Variables {
  lead: Record<string, string>;
  project: Record<string, string>;
  agent: Record<string, string>;
  offers: Record<string, OfferGroup>; // offer1, offer2, etc. -> each containing offers, bank, payment_terms, bonus_amount, opening
}

interface PreviewEmailTemplateRequest {
  lead_id: string;
  template_id?: string;
  template_content?: string;
  offer_ids?: string[];
}

export interface PreviewEmailTemplateResponse {
  success: boolean;
  preview: string;
}

export async function apiGetEmailTemplateVariables(howManyOffers?: number) {
  const params = howManyOffers ? { how_many_offers: howManyOffers } : {};
  return ApiService.fetchDataWithAxios<EmailTemplateVariable>({
    url: '/emails/template-variables',
    method: 'get',
    params,
  });
}

export async function apiPreviewEmailTemplate(data: PreviewEmailTemplateRequest) {
  return ApiService.fetchDataWithAxios<PreviewEmailTemplateResponse>({
    url: '/emails/preview',
    method: 'post',
    data: data as unknown as Record<string, string>,
  });
}
