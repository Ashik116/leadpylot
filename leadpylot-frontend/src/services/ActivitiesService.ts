import ApiService from './ApiService';

export interface GetActivitiesParams {
  page?: number; // Page number for pagination (optional, default: 1)
  limit?: number; // Results per page (optional, default: 20)
  subject_type?:
    | 'Lead'
    | 'User'
    | 'Team'
    | 'Meeting'
    | 'Offer'
    | 'Bank'
    | 'Opening'
    | 'Project'
    | 'Reclamation'
    | 'Settings'
    | 'mailservers'
    | 'voipservers'
    | 'system'
    | 'email_templates'
    | 'payment_terms'
    | 'bonus_amount'
    | 'stage'
    | 'Source'
    | 'Todo'
    | 'Transaction'
    | 'Email';
  // Filter by subject type (optional)
  subject_id?: string; // Filter by specific subject ID (optional)
  action?:
    | 'create'
    | 'update'
    | 'delete'
    | 'assign'
    | 'status_change'
    | 'comment'
    | 'approve'
    | 'reject'
    | 'password_change'
    | 'login'
    | 'logout'
    | 'registration'
    | 'password_reset'; // Filter by action type (optional)
  type?: 'info' | 'warning' | 'error'; // Filter by activity type (optional)
  startDate?: string; // Filter activities from this date (optional, ISO date string)
  endDate?: string; // Filter activities until this date (optional, ISO date string)
  domain?: string; // Domain filters as JSON stringified array (optional)
  sort_email?: string; // Sort by email ID (optional)
}

export interface GetActivitiesResponse {
  data: Activity[];
  meta: Meta;
}

export interface Activity {
  _id: string;
  creator: Creator;
  subject_id: string;
  subject_type: string;
  action: string;
  message: string;
  type: string;
  metadata?: Metadata | null;
  visibility: Visibility;
  createdAt: Date;
  updatedAt: Date;
  __v: number;
}

export interface Creator {
  _id: string;
  login: Login;
}

export enum Login {
  Emil = 'emil',
  Itadmin = 'itadmin',
}

export interface Metadata {
  lead?: Lead;
  agent?: MetadataAgent;
  project?: Project;
  agentName?: Login;
  projectName?: string;
  changes?: Changes;
  user_id?: string;
  user_name?: Login;
  ip_address?: string;
  user_agent?: string;
  timestamp?: Date;
  project_id?: string;
  project_name?: string;
  agent_id?: string;
  agent_name?: Login;
  setting?: Setting;
  source_id?: string;
  source_name?: string;
  price?: number;
  provider_id?: string;
  creator_id?: string;
  creator_name?: Login;
  // -- for todo
  todo_id?: string;
  todo_message?: string;
  todo_is_done?: boolean;
  lead_id?: string;
  lead_name?: string;
  updater_id?: string;
  updater_name?: string;
  original_message?: string;
  original_is_done?: boolean;
}

export interface MetadataAgent {
  _id: string;
  id: number;
  company_id: number;
  partner_id: number;
  info: AgentInfo;
  active: boolean;
  login: Login;
  password: string;
  role: string;
  action_id: null;
  create_uid: number;
  write_uid: number;
  signature: string;
  share: boolean;
  totp_secret: null;
  notification_type: string;
  odoobot_state: null;
  odoobot_failed: null;
  sale_team_id: number;
  target_sales_won: null;
  target_sales_done: null;
  instance_userid: null;
  anydesk: null;
  instance_status: string;
  instance_password: null;
  instance_message: null;
  backoffice: boolean;
  instance_config_id: number;
  instance_user_id: number;
  createdAt: Date;
  updatedAt: Date;
  __v: number;
}

export interface AgentInfo {
  id: number;
  company_id: null;
  create_date: Date;
  name: Login;
  title: null;
  parent_id: null;
  user_id: null;
  state_id: null;
  country_id: null;
  industry_id: null;
  color: number;
  commercial_partner_id: number;
  create_uid: number;
  write_uid: number;
  complete_name: Login;
  ref: null;
  lang: string;
  tz: string;
  vat: null;
  company_registry: null;
  website: null;
  function: null;
  type: string;
  street: null;
  street2: null;
  zip: null;
  city: null;
  email: string;
  phone: null;
  mobile: null;
  commercial_company_name: null;
  company_name: null;
  date: null;
  comment: null;
  partner_latitude: null;
  partner_longitude: null;
  active: boolean;
  employee: null;
  is_company: boolean;
  partner_share: boolean;
  write_date: Date;
  contact_address_complete: string;
  message_bounce: number;
  email_normalized: string;
  signup_type: null;
  signup_expiration: null;
  signup_token: null;
  calendar_last_notif_ack: Date;
  team_id: null;
  partner_gid: null;
  additional_info: null;
  phone_sanitized: null;
  ocn_token: null;
  supplier_rank: number;
  customer_rank: number;
  invoice_warn: string;
  invoice_warn_msg: null;
  debit_limit: null;
  last_time_entries_checked: null;
  ubl_cii_format: null;
  peppol_endpoint: null;
  peppol_eas: null;
  online_partner_information: null;
  followup_reminder_type: string;
  vies_valid: boolean;
  account_sepa_lei: null;
  l10n_de_datev_identifier: null;
  l10n_de_datev_identifier_customer: null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Changes {
  phone?: Phone;
  voip_username?: string;
  voip_password?: string;
  checked?: Checked;
  usable?: Usable;
}

export interface Checked {
  field: string;
  oldValue: boolean;
  newValue: boolean;
}

export interface Phone {
  field: string;
  oldValue: string;
  newValue: string;
}

export interface Usable {
  field: string;
  newValue: string;
}

export interface Lead {
  _id: string;
  use_status: string;
  reclamation_status: string;
  duplicate_status: number;
  checked: boolean;
  lead_source_no: string;
  contact_name: string;
  email_from: string;
  phone: string;
  expected_revenue: number;
  leadPrice: number;
  lead_date: Date;
  source_id: string;
  stage_id: string;
  status_id: string;
  stage: string;
  status: string;
  active: boolean;
  tags: any[];
  write_date: Date;
  voip_extension: string;
  createdAt: Date;
  updatedAt: Date;
  __v: number;
  usable?: string;
  assigned_date?: Date;
}

export interface Project {
  _id: string;
  id: number;
  sequence: number;
  company_id: number;
  color: null;
  create_uid: number;
  write_uid: number;
  name: string;
  active: boolean;
  create_date: Date;
  write_date: Date;
  createdAt: Date;
  updatedAt: Date;
  alias_id: number;
  assignment_domain: null;
  lead_properties_definition: null;
  use_leads: boolean;
  use_opportunities: boolean;
  assignment_optout: boolean;
  resource_calendar_id: null;
  alias_name: null;
  project_alias: null;
  project_website: null;
  project_email: null;
  project_phone: null;
  project_whatsapp: null;
  project_hr_number: null;
  project_company_id: null;
  project_lei_code: null;
  project_create_date: null;
  project_ceo: null;
  project_chamber_of_commerce: null;
  project_finance_authority: null;
  project_finma: null;
  project_address1: null;
  project_address2: null;
  project_address3: null;
  instance_ip: string;
  instance_token: string;
  instance_user: number;
  instance_database: string;
  instance_config_id: number;
  instance_project_id: number;
  agents: AgentElement[];
  __v: number;
  banks: any[];
}

export interface AgentElement {
  user_id: number;
  user: string;
  active: boolean;
  alias_name: Login;
  lead_receive: boolean;
  _id: string;
  createdAt: Date;
  updatedAt: Date;
  voip_password: string;
  voip_username: string;
}

export interface Setting {
  type: string;
  name: string;
  info: SettingInfo;
  _id: string;
  createdAt: Date;
  updatedAt: Date;
  __v: number;
}

export interface SettingInfo {
  domain: string;
  websocket_address: string;
}

export enum Visibility {
  Admin = 'admin',
  Self = 'self',
}

export interface Meta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export const apiGetActivities = async (params?: GetActivitiesParams) => {
  const response = await ApiService.fetchDataWithAxios<GetActivitiesResponse>({
    url: '/activities',
    method: 'get',
    params: params,
  });

  return response;
};

export const apiGetActivitiesBySubject = async (
  subjectId: string,
  subjectType: string,
  params?: Omit<GetActivitiesParams, 'subject_id' | 'subject_type'>
) => {
  const response = await ApiService.fetchDataWithAxios<GetActivitiesResponse>({
    url: `/api/activities/subject/${subjectId}/${subjectType}`,
    method: 'get',
    params: params,
  });
  return response;
};
