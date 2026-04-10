import { useMutation, useQuery } from '@tanstack/react-query';
import { apiGetEmailTemplateVariables, apiPreviewEmailTemplate } from '../MailTemplateService';

export const useMailTemplateVariables = (howManyOffers?: number) =>
  useQuery({
    queryKey: ['mailTemplates', howManyOffers],
    queryFn: () => apiGetEmailTemplateVariables(howManyOffers),
  });

export const usePreviewEmailTemplate = () => useMutation({ mutationFn: apiPreviewEmailTemplate });
