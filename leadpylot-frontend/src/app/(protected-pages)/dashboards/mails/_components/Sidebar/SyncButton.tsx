'use client';

/**
 * SyncButton - Role-based email sync/refresh
 * Admin: Triggers IMAP email sync from mail server
 * Agent: Refreshes email data by refetching
 */

import { useEffect, useState } from 'react';
import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Tooltip from '@/components/ui/Tooltip';
import AxiosBase from '@/services/axios/AxiosBase';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import { useSession } from '@/hooks/useSession';
import { Role } from '@/configs/navigation.config/auth.route.config';
import { useInfiniteEmailData } from '../../_hooks/useInfiniteEmailData';
import { apiGetInteractiveSyncStatus } from '@/services/emailSystem/EmailSystemService';

interface SyncButtonProps {
  isCompact?: boolean;
}

export default function SyncButton({ isCompact }: SyncButtonProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isInteractiveSyncRunning, setIsInteractiveSyncRunning] = useState(false);
  const { data: session } = useSession();
  const userRole = session?.user?.role;
  const { refetch } = useInfiniteEmailData();

  const isAdmin = userRole === Role.ADMIN;
  const isAgent = userRole === Role.AGENT;

  // Check interactive sync status
  useEffect(() => {
    const checkSyncStatus = async () => {
      try {
        const status = await apiGetInteractiveSyncStatus();
        setIsInteractiveSyncRunning(status.isRunning);
        return status.isRunning;
      } catch (error) {
        // Silently fail - don't show error notification for polling
        console.error('Failed to check interactive sync status:', error);
        return false;
      }
    };

    // Check immediately on mount
    checkSyncStatus();

    // Only set up polling if sync is running
    if (isInteractiveSyncRunning) {
      const intervalId = setInterval(checkSyncStatus, 3000); // Poll every 3 seconds when running
      return () => clearInterval(intervalId);
    }
  }, [isInteractiveSyncRunning]); // Re-run when sync status changes

  const handleAdminSync = async () => {
    try {
      setIsSyncing(true);
      setIsInteractiveSyncRunning(true)

      // eslint-disable-next-line no-console
      console.log('📧 Starting IMAP email sync...');

      // Call backend sync endpoint
      const response = await AxiosBase.post('/email-system/admin/interactive-sync/start', {
        mailserver_ids: [], // Empty = sync all mail servers
      });

      // eslint-disable-next-line no-console
      console.log('✅ Sync started:', response.data);

      toast.push(
        <Notification title="Email Sync Started" type="success">
          {response.data.message || 'Importing emails... Watch the progress banner at the top!'}
        </Notification>
      );

      // Banner will auto-detect and show progress
      setTimeout(() => setIsSyncing(false), 1000);
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('❌ Sync failed:', error);

      toast.push(
        <Notification title="Sync Error" type="danger">
          {error.response?.data?.message || 'Failed to start email sync'}
        </Notification>
      );
      setIsSyncing(false);
    }
  };

  const handleAgentRefresh = async () => {
    try {
      setIsSyncing(true);
      await refetch();

      toast.push(
        <Notification title="Refreshed" type="success">
          Email data has been refreshed
        </Notification>
      );

      setIsSyncing(false);
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('❌ Refresh failed:', error);

      toast.push(
        <Notification title="Refresh Error" type="danger">
          Failed to refresh emails
        </Notification>
      );
      setIsSyncing(false);
    }
  };

  // Don't render if user is neither Admin nor Agent
  if (!isAdmin && !isAgent) {
    return null;
  }

  const buttonLabel = isSyncing
    ? isAdmin
      ? 'Starting...'
      : 'Refreshing...'
    : isAdmin
      ? 'Sync'
      : 'Refresh';

  const button = (
    <Button
      variant="plain"
      size="sm"
      className="w-full text-blue-600 hover:bg-blue-50"
      onClick={isAdmin ? handleAdminSync : handleAgentRefresh}
      loading={isSyncing}
      disabled={isInteractiveSyncRunning}
      icon={<ApolloIcon name="refresh" />}
    >
      {!isCompact && buttonLabel}
    </Button>
  );

  if (isCompact) {
    return <Tooltip title={buttonLabel}>{button}</Tooltip>;
  }

  return button;
}
