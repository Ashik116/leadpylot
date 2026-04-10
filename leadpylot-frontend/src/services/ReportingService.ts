import ApiService from './ApiService';

// ============ INTERFACES ============

export interface AgentSummary {
  _id: string;
  login: string;
  display_name: string;
  email?: string;
  role?: string;
  active?: boolean;
}

export interface ConversionRates {
  lead_to_offer: number;
  offer_to_opening: number;
  offer_to_confirmation: number;
  offer_to_payment: number;
  offer_to_netto1: number;
  offer_to_netto2: number;
  offer_to_lost: number;
}

export interface AgentMetrics {
  total_leads: number;
  total_offers: number;
  current_offers: number;
  total_openings: number;
  total_confirmations: number;
  total_payments: number;
  total_netto1: number;
  total_netto2: number;
  total_lost: number;
  total_investment: number;
  average_investment_per_offer: number;
  conversion_rates: ConversionRates;
}

export interface ProjectBreakdown {
  project_id: string;
  project_name: string;
  lead_count: number;
  entity_counts: {
    offers: number;
    investment: number;
  };
}

export interface SourceBreakdown {
  source_id: string;
  source_name: string;
  source_price: number;
  lead_count: number;
  entity_counts: {
    offers: number;
    investment: number;
  };
}

export interface AgentBreakdowns {
  by_project: ProjectBreakdown[];
  by_source: SourceBreakdown[];
  by_time_period: any[];
}

export interface AgentPerformanceData {
  agent: AgentSummary;
  metrics: AgentMetrics;
  breakdowns: AgentBreakdowns;
}

export interface AgentPerformanceResponse {
  success: boolean;
  data: {
    report_type: string;
    generated_at: string;
    parameters: any;
    execution_time: number;
    data: {
      agents: AgentPerformanceData[];
      summary: {
        total_agents: number;
        total_leads: number;
        total_offers: number;
        current_offers: number;
        total_openings: number;
        total_confirmations: number;
        total_payments: number;
        total_netto1: number;
        total_netto2: number;
        total_lost: number;
        total_investment: number;
      };
      time_breakdown: any[];
      performance_ranking: Array<{
        agent_id: string;
        agent_name: string;
        total_investment: number;
        total_leads: number;
        conversion_rate: number;
        performance_score: number | null;
      }>;
    };
  };
}

export interface LeadAssignmentData {
  success: boolean;
  data: {
    report_type: string;
    generated_at: string;
    parameters: any;
    execution_time: number;
    data: {
      summary: {
        total_assignments: number;
        total_agents: number;
        date_range: {
          start_date: string;
          end_date: string;
        };
      };
      raw_assignments: any[];
      recent_assignments: any[];
    };
  };
}

export interface AgentPerformanceParams {
  agent_ids?: string[];
  start_date?: string;
  end_date?: string;
  include_investment_details?: boolean;
  group_by_time_period?: string;
}

export interface LeadAssignmentParams {
  start_date?: string;
  end_date?: string;
  project_ids?: string[];
  source_ids?: string[];
  agent_ids?: string[];
  group_by?: string[];
  include_inactive?: boolean;
}

// Dynamic Hierarchical Report Types
export interface DynamicHierarchicalReportParams {
  primary?: 'project' | 'agent' | 'source' | 'stage' | 'status';
  secondary?: 'project' | 'agent' | 'source' | 'stage' | 'status';
  tertiary?: 'project' | 'agent' | 'source' | 'stage' | 'status';
  quaternary?: 'project' | 'agent' | 'source' | 'stage' | 'status';
  quinary?: 'project' | 'agent' | 'source' | 'stage' | 'status';
  primary_ids?: string[];
  secondary_ids?: string[];
  lead_type?: 'all' | 'live' | 'recycle';
  stage?: 'stage';
  start_date?: string;
  end_date?: string;
  date_field?: 'createdAt' | 'assigned_date';
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface HierarchicalGroupItem {
  agent?: { agentname: string; agent_id: string };
  project?: { projectname: string; project_id: string };
  leads?: { live: number; recycle: number; total_leads: number };
  openings?: { live: number; recycle: number };
  reclamation?: { live: number; recycle: number };
  netto1?: { live: number; recycle: number };
  netto2?: { live: number; recycle: number };
  payment_voucher?: { live: number; recycle: number };
  conversion_rate?: { live: number; recycle: number };
  projectname?: HierarchicalGroupItem[];
  agentname?: HierarchicalGroupItem[];
  // Dynamic status fields (Opening, New, Positiv, etc.)
  [statusField: string]: any;
}

export interface DynamicHierarchicalReportResponse {
  success: boolean;
  data: HierarchicalGroupItem[];
  meta?: {
    pagination: {
      current_page: number;
      per_page: number;
      total_items: number;
      total_pages: number;
      has_next_page: boolean;
      has_prev_page: boolean;
    }, total: {
      lead?: { live: number; recycle: number };
      conversion_rate?: { live: number; recycle: number };
      reclamation?: { live: number; recycle: number };
      angebots?: { live: number; recycle: number };
      openings?: { live: number; recycle: number };
      confirmation?: { live: number; recycle: number };
      payment_voucher?: { live: number; recycle: number };
      netto1?: { live: number; recycle: number };
      netto2?: { live: number; recycle: number };
    }

  };
}

// ============ API FUNCTIONS ============

export const apiGetAgentPerformanceReport = (
  params: AgentPerformanceParams
): Promise<AgentPerformanceResponse> => {
  return ApiService.fetchDataWithAxios<AgentPerformanceResponse, AgentPerformanceParams>({
    method: 'POST',
    url: '/reports/agent-performance',
    data: params,
  });
};

export const apiGetLeadAssignmentReport = (
  params: LeadAssignmentParams
): Promise<LeadAssignmentData> => {
  return ApiService.fetchDataWithAxios<LeadAssignmentData, LeadAssignmentParams>({
    method: 'POST',
    url: '/reports/lead-assignment',
    data: params,
  });
};

export const apiGetReportTemplates = () => {
  return ApiService.fetchDataWithAxios<any>({
    method: 'GET',
    url: '/reports/templates',
  });
};

export const apiGetDashboardReport = () => {
  return ApiService.fetchDataWithAxios<any>({
    method: 'GET',
    url: '/reports/dashboard',
  });
};

// Helper function to get all agents (filtering out non-agents)
export const apiGetAllAgents = (): Promise<AgentPerformanceResponse> => {
  return ApiService.fetchDataWithAxios<AgentPerformanceResponse>({
    method: 'POST',
    url: '/reports/agent-performance',
    data: {
      // Get all agents without specific filtering
      include_investment_details: false,
    },
  });
};

// Helper function to get specific agent performance
export const apiGetAgentDetails = (
  agentId: string,
  params?: Partial<AgentPerformanceParams>
): Promise<AgentPerformanceResponse> => {
  return ApiService.fetchDataWithAxios<AgentPerformanceResponse>({
    method: 'POST',
    url: '/reports/agent-performance',
    data: {
      agent_ids: [agentId],
      include_investment_details: true,
      ...params,
    },
  });
};

// Dynamic Hierarchical Report API
export const apiGetDynamicHierarchicalReport = (
  params: DynamicHierarchicalReportParams
): Promise<DynamicHierarchicalReportResponse> => {
  return ApiService.fetchDataWithAxios<DynamicHierarchicalReportResponse>({
    method: 'GET',
    url: '/reports',
    params,
  });
};

const ReportingService = {
  getAgentPerformanceReport: apiGetAgentPerformanceReport,
  getLeadAssignmentReport: apiGetLeadAssignmentReport,
  getReportTemplates: apiGetReportTemplates,
  getDashboardReport: apiGetDashboardReport,
  getAllAgents: apiGetAllAgents,
  getAgentDetails: apiGetAgentDetails,
  getDynamicHierarchicalReport: apiGetDynamicHierarchicalReport,
};

export default ReportingService;
