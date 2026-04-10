import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReportingService, {
  AgentPerformanceParams,
  LeadAssignmentParams,
  AgentPerformanceResponse,
  LeadAssignmentData,
  DynamicHierarchicalReportParams,
  DynamicHierarchicalReportResponse,
} from '../ReportingService';

// Query Keys
export const REPORTING_QUERY_KEYS = {
  agents: 'reporting-agents',
  agentPerformance: 'agent-performance',
  leadAssignment: 'lead-assignment',
  reportTemplates: 'report-templates',
  dashboard: 'dashboard-report',
  dynamicHierarchical: 'dynamic-hierarchical-report',
} as const;

// Hook to get all agents for the table
export const useAllAgents = () => {
  return useQuery<AgentPerformanceResponse>({
    queryKey: [REPORTING_QUERY_KEYS.agents],
    queryFn: () => ReportingService.getAllAgents(),
    // 5 minutes
  });
};

// Hook to get specific agent details
export const useAgentDetails = (agentId: string, params?: Partial<AgentPerformanceParams>) => {
  return useQuery<AgentPerformanceResponse>({
    queryKey: [REPORTING_QUERY_KEYS.agentPerformance, agentId, params],
    queryFn: () => ReportingService.getAgentDetails(agentId, params),
    enabled: !!agentId,
  });
};

// Hook to get agent performance report with custom parameters
export const useAgentPerformanceReport = (params: AgentPerformanceParams) => {
  return useQuery<AgentPerformanceResponse>({
    queryKey: [REPORTING_QUERY_KEYS.agentPerformance, params],
    queryFn: () => ReportingService.getAgentPerformanceReport(params),
    enabled: false, // Only run when explicitly refetched
  });
};

// Hook to get lead assignment report
export const useLeadAssignmentReport = (params: LeadAssignmentParams) => {
  return useQuery<LeadAssignmentData>({
    queryKey: [REPORTING_QUERY_KEYS.leadAssignment, params],
    queryFn: () => ReportingService.getLeadAssignmentReport(params),
    enabled: false, // Only run when explicitly refetched
  });
};

// Hook to get report templates
export const useReportTemplates = () => {
  return useQuery({
    queryKey: [REPORTING_QUERY_KEYS.reportTemplates],
    queryFn: () => ReportingService.getReportTemplates(),
  });
};

// Hook to get dashboard report
export const useDashboardReport = () => {
  return useQuery({
    queryKey: [REPORTING_QUERY_KEYS.dashboard],
    queryFn: () => ReportingService.getDashboardReport(),
    // 5 minutes
  });
};

// Hook to get dynamic hierarchical report
export const useDynamicHierarchicalReport = (params: DynamicHierarchicalReportParams) => {
  return useQuery<DynamicHierarchicalReportResponse>({
    queryKey: [REPORTING_QUERY_KEYS.dynamicHierarchical, params],
    queryFn: () => ReportingService.getDynamicHierarchicalReport(params),
    enabled: !!params.primary,
    // Data is immediately stale, will refetch on mount

    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });
};

// Mutation hook for refreshing reports
export const useRefreshReports = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Invalidate all reporting queries to trigger refetch
      await queryClient.invalidateQueries({ queryKey: [REPORTING_QUERY_KEYS.agents] });
      await queryClient.invalidateQueries({ queryKey: [REPORTING_QUERY_KEYS.agentPerformance] });
      await queryClient.invalidateQueries({ queryKey: [REPORTING_QUERY_KEYS.leadAssignment] });
      await queryClient.invalidateQueries({ queryKey: [REPORTING_QUERY_KEYS.dashboard] });
    },
    onSuccess: () => {
      // Optional: Show success message
      console.log('Reports refreshed successfully');
    },
    onError: (error) => {
      console.error('Failed to refresh reports:', error);
    },
  });
};
