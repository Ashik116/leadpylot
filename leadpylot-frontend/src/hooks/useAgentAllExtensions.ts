/**
 * Hook to get the agent's single VoIP extension from their user profile.
 *
 * Architecture: each user has ONE extension (voip_extension + voip_password
 * on the User model). The outbound caller-ID is determined per-project at
 * call time via the project's outbound_cid field, so agents never need to
 * switch extensions when they switch projects.
 */

import { useMemo } from 'react';
import { useSession } from '@/hooks/useSession';

export interface AgentExtension {
  extension: string;
  password: string;
  projectId?: string;
  projectName?: string;
  agentId?: string;
}

export const useAgentAllExtensions = () => {
  const { data: session } = useSession();

  const allExtensions = useMemo(() => {
    const ext = session?.user?.voip_extension;
    const pwd = session?.user?.voip_password;

    if (!ext || !pwd) return [];

    return [
      {
        extension: ext,
        password: pwd,
      } as AgentExtension,
    ];
  }, [session?.user?.voip_extension, session?.user?.voip_password]);

  return {
    allExtensions,
    totalExtensions: allExtensions.length,
    isLoading: false,
    hasMultipleExtensions: false,
  };
};
