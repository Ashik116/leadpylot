'use client';

import { useMemo } from 'react';
import type { MailServerInfo } from '@/services/SettingsService';

/** Normalize mail server item (object or string) to MailServerInfo. Objects used as-is; string IDs resolved from allServers. */
function toMailServerObject(
  item: | { _id: string; id?: string; name: string; info?: { admin_email?: string;[k: string]: unknown } } | string, allServers: MailServerInfo[]): MailServerInfo | null {
  if (typeof item === 'string') {
    return allServers.find((s) => s._id === item) ?? null;
  }
  if (!item?._id) return null;
  return item as MailServerInfo;
}

/** Collect unique mail server objects from agent's mailservers array (objects or string IDs) */
function getAgentMailServerObjects(
  mailservers:
    | Array<
      | { _id: string; id?: string; name: string; info?: { admin_email?: string;[k: string]: unknown } }
      | string
    >
    | null
    | undefined,
  allServers: MailServerInfo[]
): MailServerInfo[] {
  if (!mailservers) return [];
  const seen = new Set<string>();
  const result: MailServerInfo[] = [];
  for (const item of mailservers) {
    const s = toMailServerObject(item, allServers);
    if (s && !seen.has(s._id)) {
      seen.add(s._id);
      result.push(s);
    }
  }
  return result;
}

/** Resolve agent mail servers for AGENT role - from selectedProject or allProjects fallback. Returns mail server objects, not IDs. */
export function useAgentMailServers(
  selectedProject: any,
  allProjects: any[],
  currentUserId: string | undefined,
  allServers: MailServerInfo[]
): MailServerInfo[] {
  return useMemo(() => {
    if (!currentUserId) return [];

    const isCurrentAgent =
      (agent: any) =>
        agent?.user?._id === currentUserId || agent?.user?.id === currentUserId;

    const collectMailServerObjects = (projects: any[]): MailServerInfo[] => {
      const seen = new Set<string>();
      const result: MailServerInfo[] = [];
      for (const project of projects) {
        const agents = project?.agents;
        if (!Array.isArray(agents)) continue;
        const agent = agents.find(isCurrentAgent);
        if (agent) {
          const servers = getAgentMailServerObjects(agent?.mailservers, allServers);
          for (const s of servers) {
            if (s._id && !seen.has(s._id)) {
              seen.add(s._id);
              result.push(s);
            }
          }
        }
      }
      return result;
    };

    const isAllProjects =
      selectedProject?._id === 'all' || selectedProject?.value === 'all';
    if (selectedProject && !isAllProjects) {
      return collectMailServerObjects([selectedProject]);
    }

    const projects = (Array.isArray(allProjects) ? allProjects : []).filter(
      (p) => p?._id !== 'all' && p?.value !== 'all'
    );
    return collectMailServerObjects(projects);
  }, [selectedProject, allProjects, currentUserId, allServers]);
}

/** Deduplicate servers by _id. Use when the source may contain duplicates. */
export function useDeduplicatedServers(servers: MailServerInfo[]): MailServerInfo[] {
  return useMemo(() => {
    const seen = new Set<string>();
    return servers.filter((s) => {
      if (!s._id || seen.has(s._id)) return false;
      seen.add(s._id);
      return true;
    });
  }, [servers]);
}
