/**
 * Canned Response Types
 * For quick reply templates
 */

export interface CannedResponse {
  _id: string;
  name: string;
  content: string;
  html_content?: string;
  category: 'sales' | 'support' | 'follow_up' | 'other';
  variables: string[];
  hotkey?: string;
  created_by: string;
  team_id?: string;
  project_id?: string;
  is_shared: boolean;
  is_active: boolean;
  usage_count: number;
  created_at: string;
  updated_at?: string;
}

export interface CreateCannedResponseInput {
  name: string;
  content: string;
  html_content?: string;
  category: CannedResponse['category'];
  variables?: string[];
  hotkey?: string;
  is_shared?: boolean;
}

export interface UpdateCannedResponseInput {
  name?: string;
  content?: string;
  html_content?: string;
  category?: CannedResponse['category'];
  variables?: string[];
  hotkey?: string;
  is_shared?: boolean;
}

export interface CannedResponseCategory {
  id: string;
  name: string;
  icon: string;
  count: number;
}

