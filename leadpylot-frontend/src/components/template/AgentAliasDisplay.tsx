import { useSession } from '@/hooks/useSession';
import { useSelectedProjectStore } from '@/stores/selectedProjectStore';
import { useEffect, useState, useMemo } from 'react';
import { useProjects } from '@/services/hooks/useProjects';

interface AgentInfo {
  aliasName: string | null;
  emailAddress: string | null;
}

const AgentAliasDisplay = () => {
  const { data: session } = useSession();
  const { selectedProject } = useSelectedProjectStore();
  const { data: projects, status } = useProjects();
  const [agentInfo, setAgentInfo] = useState<AgentInfo>({
    aliasName: null,
    emailAddress: null,
  });

  // Memoize the projects data to prevent unnecessary re-renders
  const projectsData = useMemo(() => {
    if (!projects) return null;
    return Array.isArray(projects) ? projects : (projects as any).data;
  }, [projects]);

  // Memoize the current user ID to prevent unnecessary re-renders
  const currentUserId = useMemo(() => session?.user?.id, [session?.user?.id]);

  // Memoize the user role to prevent unnecessary re-renders
  const userRole = useMemo(() => session?.user?.role, [session?.user?.role]);

  // Find and set the agent info whenever session or selectedProject changes
  useEffect(() => {
    if (!currentUserId || !selectedProject) {
      // Use setTimeout to defer state update outside of render cycle
      const timeoutId = setTimeout(() => {
        setAgentInfo({ aliasName: null, emailAddress: null });
      }, 0);
      return () => clearTimeout(timeoutId);
    }

    // Only Agents have alias/email in context of selected project
    if (userRole !== 'Agent') {
      setAgentInfo({ aliasName: null, emailAddress: null });
      return;
    }

    // If we have agents in the selected project
    if (selectedProject.agents && selectedProject.agents.length > 0) {
      const currentAgent = selectedProject.agents.find(
        (agent) => agent.user?._id === currentUserId
      );
      if (currentAgent?.alias_name) {
        setAgentInfo({
          aliasName: currentAgent.alias_name,
          emailAddress: currentAgent.email_address || null,
        });
        return;
      }
    }

    // If we don't have agents in the selected project or couldn't find the current user,
    // try to find the agent in all projects
    if (status === 'success' && projectsData) {
      for (const project of projectsData) {
        const projectData = project as any;
        if (projectData.agents) {
          const agent = projectData.agents.find((agent: any) => agent.user?._id === currentUserId);
          if (agent?.alias_name) {
            setAgentInfo({
              aliasName: agent.alias_name,
              emailAddress: agent.email_address || null,
            });
            return;
          }
        }
      }
    }

    // No fallback for email_address as it's specific to the agent record
    setAgentInfo({
      aliasName: null,
      emailAddress: null,
    });
  }, [currentUserId, selectedProject, projectsData, status, userRole]);

  // Early return if not an Agent or no agent info
  if (userRole !== 'Agent' || (!agentInfo.aliasName && !agentInfo.emailAddress)) {
    return null;
  }

  return (
    <div className="mr-2 flex h-full items-center border-r border-gray-200 pr-2 sm:pr-4">
      <div className="flex items-center space-x-1 sm:space-x-2">
        {agentInfo.aliasName && (
          <span className="max-w-24 truncate text-sm font-medium sm:max-w-none sm:text-base">
            {agentInfo.aliasName}
          </span>
        )}
        {agentInfo.emailAddress && (
          <span className="hidden max-w-32 truncate text-xs text-gray-500 sm:text-sm md:inline">
            {agentInfo.emailAddress}
          </span>
        )}
      </div>
    </div>
  );
};

export default AgentAliasDisplay;
