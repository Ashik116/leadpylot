import type { QuickActionAdminItem } from '@/services/leadbot/LeadbotService';

export type { QuickActionAdminItem };

export type FormMode = 'create' | 'edit';

export interface ActionFormData {
  label: string;
  message: string;
  slug: string;
}

export const EMPTY_FORM: ActionFormData = { label: '', message: '', slug: '' };

export const QUERY_KEY = ['leadbot-admin-quick-actions'];
