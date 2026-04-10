import { User } from '@/@types/auth';
import ApiService from './ApiService';
import { Bank } from './SettingsService';
import { Lead } from './LeadsService';
import { Role } from '@/configs/navigation.config/auth.route.config';

export interface GetAllProjectsResponse {
  data: Project[];
  meta: any;
}

export interface ProjectLeads {
  projectId: string;
  projectName: string;
  totalAgents: number;
  totalLeads: number;
  offers: {
    total: number;
    pending: number;
    accepted: number;
    rejected: number;
    expired: number;
    details: any[];
  };
  leads: Array<{
    lead: Lead;
    assignment: User;
  }>;
  meta?: any;
}
export interface Project {
  _id: string;
  name: string;
  project_website?: null | string;
  project_website_link?: null | string;
  deport_link: null | string;
  inbound_email: null | string;
  inbound_number: null | string;
  active: boolean;
  users: number;
  agents?: Agent[];
}

export interface ProjectDetails {
  id: number;
  _id: string;
  name: Name;
  project_website?: string;
  project_website_link?: string;
  deport_link?: string;
  inbound_email?: string;
  inbound_number?: string;
  project_whatsapp?: string;
  project_hr_number?: string;
  project_company_id?: string;
  project_lei_code?: string;
  project_create_date?: string;
  project_ceo?: string;
  project_chamber_of_commerce?: string;
  project_finance_authority?: string;
  project_finma?: string;
  project_address1?: string;
  project_address2?: string;
  project_address3: null;
  mailserver_id: null;
  mailservers: { _id: string; name: string }[];
  allMailServers: { _id: string; name: string }[];
  voipserver_id: null;
  description?: string;
  agents: Agent[];
  banks: Bank[];
  contract?: string | null;
  confirmation_email?: string | null;
  pdf_template_id?: string | null;
  email_templates?: Array<{ _id: string; name: string; gender_type?: string }>;
  color_code?: string;
  outbound_cid?: string;
  inbound_did?: string;
  trunk_name?: string;
}

export interface AgentEmailSignature {
  _id: string;
  id: string;
  filename: string;
  filetype: string;
  path: string;
  public_slug: string | null;
  public_url: string | null;
  size: number;
  type: string;
}

export interface Agent {
  attachment: any;
  email_signature?: AgentEmailSignature | string | null;
  _id: string;
  user_id: number;
  user_name: string;
  active: boolean;
  assignment_max: number;
  name?: string;
  alias_name: string;
  email_address: string;
  email_password?: string;
  voip_username: string;
  voip_password: string;
  alias_phone_number: string;
  user: User;
  mailserver_id?: { _id: string; name: string } | string | null;
  mailservers?: { _id: string; name: string }[];
}

export interface AgentData {
  user_id: string;
  alias_name: string;
  email_address?: string;
  email_password?: string;
  voip_username?: string;
  voip_password?: string;
}

export interface Name {
  en_US: string;
}

export type CreateProjectRequest =
  | {
    name: string;
    project_website?: string;
    deport_link?: string;
    inbound_email?: string;
    inbound_number?: string;
    team_leader?: string;
    members?: string[];
    instance?: string;
    instance_ip?: string;
    banks: string[];
    mailserver_id?: string | null;
    voipserver_id?: string | null;
    email_template_id?: string | null;
    email_templates?: string[];
    agent_email_id?: string | null;
    description?: string;
    bank_details?: Record<string, Record<string, string>>;
    voip_details?: Record<string, string>;
    mail_details?: Record<string, string>;
    contract?: File | string | null;
    confirmation_email?: File | string | null;
  }
  | FormData;

export type UpdateProjectRequest =
  | {
    _id: string;
    name?: string | { en_US: string };
    voipserver_id?: string | null;
    mailserver_id?: string | null;
    banks: string[];
    contract?: File | string | null;
    confirmation_email?: File | string | null;
  }
  | FormData;

export type AddProjectAgentsRequest = {
  agents: AgentData[];
};

export type AddProjectAgentsResponse = {
  agents: Agent[];
};

export interface ProjectsParams {
  search?: string;
  role?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
  include_all_project_agents?: boolean;
  domain?: any;
}

const serializeDomainParam = (domain: any): string | undefined => {
  if (domain === undefined || domain === null || domain === '') return undefined;
  return typeof domain === 'string' ? domain : JSON.stringify(domain);
};

export interface LeadProjectsParams {
  search?: string;
  page?: number;
  limit?: number;
}

export interface LeadProjectsResponse {
  data: ProjectLeads[];
  meta: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export async function apiGetProjects(params?: ProjectsParams) {
  const apiParams: any = {
    search: params?.search || undefined,
    page: params?.page || undefined,
    limit: params?.limit || 50,
    sortBy: params?.sortBy || undefined,
    sortOrder: params?.sortOrder || undefined,
    include_all_project_agents: params?.include_all_project_agents || undefined,
  };

  // Include domain parameter if provided (for grouped expansion)
  if (params?.domain !== undefined) {
    apiParams.domain = serializeDomainParam(params.domain);
  }

  return ApiService.fetchDataWithAxios<GetAllProjectsResponse | ProjectLeads[]>({
    url: params?.role !== Role.AGENT ? '/projects' : '/assign-leads/grouped',
    method: 'get',
    params: apiParams,
  });
}

export const apiGetAllProjects = async ({ limit }: { limit?: number }) => {
  return ApiService.fetchDataWithAxios<GetAllProjectsResponse>({
    url: '/projects',
    method: 'get',
    params: {
      limit: limit || undefined,
    },
  });
};

export async function apiGetLeadProjects(params?: LeadProjectsParams) {
  return ApiService.fetchDataWithAxios<LeadProjectsResponse>({
    url: '/assign-leads/grouped',
    method: 'get',
    params: {
      page: params?.page || undefined,
      limit: params?.limit || undefined,
      search: params?.search || undefined,
    },
  });
}

export async function apiGetProject(id: string) {
  return ApiService.fetchDataWithAxios<ProjectDetails>({
    url: `/projects/${id}`,
    method: 'get',
  });
}

export async function apiDeleteProject(id: string) {
  return ApiService.fetchDataWithAxios<ProjectDetails>({
    url: `/projects/${id}`,
    method: 'delete',
  });
}

export async function apiBulkDeleteProjects(ids: string[]) {
  return ApiService.fetchDataWithAxios<void>({
    url: `/projects/`,
    method: 'delete',
    data: {
      ids,
    },
  });
}

export async function apiCreateProject(data: CreateProjectRequest) {
  const config: any = {
    url: '/projects',
    method: 'post',
    data,
  };

  // If data is FormData, set appropriate headers
  if (data instanceof FormData) {
    config.headers = {
      'Content-Type': 'multipart/form-data',
    };
  }

  return ApiService.fetchDataWithAxios<Project>(config);
}

export async function apiUpdateProject(id: string, data: UpdateProjectRequest) {
  const config: any = {
    url: `/projects/${id}`,
    method: 'put',
    data,
  };

  // If data is FormData, set appropriate headers
  if (data instanceof FormData) {
    config.headers = {
      'Content-Type': 'multipart/form-data',
    };
  }

  return ApiService.fetchDataWithAxios<ProjectDetails>(config);
}

export async function apiAddProjectAgents(projectId: string, data: AddProjectAgentsRequest) {
  return ApiService.fetchDataWithAxios<AddProjectAgentsResponse>({
    url: `/projects/${projectId}/agents`,
    method: 'post',
    data,
  });
}
