'use client';

import { useMemo } from 'react';
import { useSettings } from '@/services/hooks/useSettings';
import type { MailServerInfo } from '@/services/SettingsService';
import { useEmailStore } from '../_stores/emailStore';

export function getMailServerDisplayName(server: MailServerInfo): string {
  if (typeof server?.name === 'string') return server.info?.admin_email ?? server.name;
  return server?.name?.en_US ?? server?.info?.admin_email ?? '';
}

export function useSelectedMailServerDisplay(): {
  id: string | null;
  name: string | null;
  servers: MailServerInfo[];
  isLoading: boolean;
  setSelectedMailServer: (id: string | null) => void;
} {
  const filters = useEmailStore((s) => s.filters);
  const setFilters = useEmailStore((s) => s.setFilters);

  const { data, isLoading } = useSettings('mailservers', { page: 1, limit: 100 });
  const servers: MailServerInfo[] = data?.data || [];

  const selectedId = filters.mailserver_id ?? null;

  const selectedServer = useMemo(
    () => (selectedId ? servers.find((s) => s._id === selectedId) : null),
    [servers, selectedId]
  );

  const selectedName = selectedServer ? getMailServerDisplayName(selectedServer) : null;

  const setSelectedMailServer = (id: string | null) => {
    const currentFilters = useEmailStore.getState().filters;
    setFilters({ ...currentFilters, mailserver_id: id ?? undefined });
  };

  return {
    id: selectedId,
    name: selectedName,
    servers,
    isLoading,
    setSelectedMailServer,
  };
}
