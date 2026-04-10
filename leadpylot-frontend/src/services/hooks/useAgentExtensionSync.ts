/**
 * Hook to sync agent-extension mapping with AMI service
 * Automatically notifies backend when agent changes project/extension
 */

import { useEffect, useRef } from 'react';
import { useSession } from '@/hooks/useSession';
import { useSelectedProjectStore } from '@/stores/selectedProjectStore';
import { apiUpdateMyExtension } from '../MonitoringService';
import { Role } from '@/configs/navigation.config/auth.route.config';
import { isDev } from '@/utils/utils';

export const useAgentExtensionSync = () => {
  const { data: session } = useSession();
  const { selectedProject } = useSelectedProjectStore();
  const previousExtensionRef = useRef<string | null>(null);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    // Only sync for agents, not admins
    if (session?.user?.role !== Role.AGENT) {
      return;
    }

    // Skip if no project selected or no agent data
    if (!selectedProject?.agents?.[0]?.voip_username) {
      return;
    }

    const currentAgent = selectedProject.agents[0];
    const currentExtension = currentAgent.voip_username;
    const agentId = session.user.id;

    // Skip if this is the same extension as before
    if (previousExtensionRef.current === currentExtension) {
      return;
    }

    // Skip the very first load to avoid unnecessary initial call
    if (!isInitializedRef.current) {
      previousExtensionRef.current = currentExtension;
      isInitializedRef.current = true;
      isDev && console.log('🔄 Agent Extension Sync: Initialized with extension', currentExtension);
      return;
    }

    // Agent changed project/extension - notify AMI service
    const updateAgentExtension = async () => {
      try {
        isDev &&
          console.log('🔄 Agent Extension Sync: Updating mapping', {
            agentId,
            previousExtension: previousExtensionRef.current,
            newExtension: currentExtension,
            project: selectedProject.name,
          });

        await apiUpdateMyExtension({
          extension: currentExtension,
        });

        previousExtensionRef.current = currentExtension;

        isDev && console.log('✅ Agent Extension Sync: Successfully updated AMI mapping');
      } catch (error) {
        console.error('❌ Agent Extension Sync: Failed to update agent-extension mapping:', error);
      }
    };

    updateAgentExtension();
  }, [session?.user?.id, session?.user?.role, selectedProject]);

  return {
    currentExtension: selectedProject?.agents?.[0]?.voip_username || null,
    isAgent: session?.user?.role === Role.AGENT,
    projectName: selectedProject?.name || null,
  };
};
