'use client';

import React, { useMemo, useCallback } from 'react';
import Button from '@/components/ui/Button';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import { ColumnDef } from '@/components/shared/DataTable';
import BaseTable from '@/components/shared/BaseTable/BaseTable';
import { useBaseTable } from '@/components/shared/BaseTable/useBaseTable';
import { useFailedLogins } from '@/services/hooks/useSecurity';
import { apiGetFailedLogins } from '@/services/SecurityService';
import { HiExclamationTriangle, HiDevicePhoneMobile, HiNoSymbol } from 'react-icons/hi2';
import { useSelectAllApi } from '@/components/shared/BaseTable/hooks/useSelectAllApi';
import SecurityService from '@/services/SecurityService';

interface FailedLoginAttemptsProps {
  timeframe?: number;
}

const FailedLoginAttempts: React.FC<FailedLoginAttemptsProps> = ({ timeframe }) => {
  // Default pagination values
  const pageIndex = 1;
  const pageSize = 50;

  // Fetch data using the hook
  const { data: attempts, isLoading } = useFailedLogins({
    page: pageIndex,
    limit: pageSize,
    timeframe,
  });

  // Select all functionality
  const { selected: selectedAttempts, handleSelectAll: handleSelectAllAttempts } = useSelectAllApi({
    apiFn: apiGetFailedLogins,
    apiParams: {
      page: pageIndex,
      limit: pageSize,
      timeframe,
    },
    total: attempts?.meta?.total || 0,
    returnFullObjects: true,
  });

  const handleBlockIP = useCallback(async (ipAddress: string) => {
    try {
      const result = await SecurityService.blockIP({
        ipAddress,
        reason: 'too_many_failed_attempts',
        blockType: 'manual',
        expirationHours: 24,
        notes: `Manually blocked due to failed login attempts`,
      });

      if (result.success) {
        toast.push(
          <Notification type="success" title="Success">
            IP {ipAddress} has been blocked
          </Notification>
        );
        // Refresh will be handled by React Query automatically
      }
    } catch {
      toast.push(
        <Notification type="danger" title="Error">
          Failed to block IP address
        </Notification>
      );
    }
  }, []);

  const handleBlockDevice = useCallback(async (deviceFingerprint: string, login?: string) => {
    try {
      const result = await SecurityService.blockDevice({
        deviceFingerprint,
        reason: 'too_many_failed_attempts',
        blockType: 'manual',
        expirationHours: 24,
        notes: `Manually blocked device due to failed login attempts - ${login || 'Unknown user'}`,
      });
      if (result.block) {
        toast.push(
          <Notification type="success" title="Success">
            {result.message || 'Device has been blocked'}
          </Notification>
        );
      }
    } catch {
      toast.push(
        <Notification type="danger" title="Error">
          Failed to block device
        </Notification>
      );
    }
  }, []);

  const columns: ColumnDef<any>[] = useMemo(
    () => [
      {
        header: 'Time',
        accessorKey: 'createdAt',
        cell: ({ row }: any) => (
          <div className="text-sm">
            <div>{new Date(row.original?.createdAt).toLocaleDateString()}</div>
            <div className="text-gray-500">
              {new Date(row.original?.createdAt).toLocaleTimeString()}
            </div>
          </div>
        ),
      },
      {
        header: 'Login',
        accessorKey: 'login',
        cell: ({ row }: any) => (
          <span className="font-medium text-gray-900">{row.original?.login}</span>
        ),
      },
      {
        header: 'IP Address',
        accessorKey: 'ipAddress',
        cell: ({ row }: any) => (
          <span className="font-mono text-sm text-gray-700">{row.original?.ipAddress}</span>
        ),
      },
      {
        header: 'Location',
        accessorKey: 'geolocation',
        cell: ({ row }: any) => {
          const geo = row.original?.geolocation;
          return (
            <div className="text-sm">
              <div>
                {geo?.city || 'Unknown'}, {geo?.country || 'Unknown'}
              </div>
              {geo?.isp && <div className="text-xs text-gray-500">{geo?.isp}</div>}
            </div>
          );
        },
      },
      {
        header: 'Reason',
        accessorKey: 'attemptResult',
        cell: ({ row }: any) => {
          const reasonMap: Record<string, { label: string; color: string }> = {
            invalid_credentials: { label: 'Invalid Credentials', color: 'bg-red-100 text-red-800' },
            account_disabled: { label: 'Account Disabled', color: 'bg-orange-100 text-orange-800' },
            ip_blocked: { label: 'IP Blocked', color: 'bg-gray-100 text-gray-800' },
            database_error: { label: 'Database Error', color: 'bg-purple-100 text-purple-800' },
          };

          const reason = reasonMap[row.original?.attemptResult] || {
            label: row.original?.attemptResult,
            color: 'bg-gray-100 text-gray-800',
          };

          return (
            <span className={`rounded-full px-2 py-1 text-xs font-medium ${reason?.color}`}>
              {reason?.label}
            </span>
          );
        },
      },
      {
        header: 'Browser',
        accessorKey: 'userAgent',
        cell: ({ row }: any) => {
          const ua = row.original?.userAgent;
          let browser = 'Unknown';

          if (ua?.includes('Chrome')) browser = 'Chrome';
          else if (ua?.includes('Firefox')) browser = 'Firefox';
          else if (ua?.includes('Safari') && !ua?.includes('Chrome')) browser = 'Safari';
          else if (ua?.includes('Edge')) browser = 'Edge';

          return <span className="text-sm text-gray-600">{browser}</span>;
        },
      },
      {
        header: 'Actions',
        accessorKey: 'actions',
        cell: ({ row }: any) => (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="destructive"
              icon={<HiNoSymbol />}
              onClick={() => handleBlockIP(row.original?.ipAddress)}
              className="text-xs"
            >
              Block IP
            </Button>
            <Button
              size="sm"
              variant="secondary"
              color="orange"
              icon={<HiDevicePhoneMobile />}
              onClick={() =>
                handleBlockDevice(row.original?.deviceFingerprint, row.original?.login)
              }
              className="text-xs"
            >
              Block Device
            </Button>
          </div>
        ),
      },
    ],
    [handleBlockIP, handleBlockDevice]
  );

  // BaseTable configuration
  const tableConfig = useBaseTable({
    tableName: 'failed-login-attempts',
    data: attempts?.data || [],
    loading: isLoading,
    totalItems: attempts?.meta?.total || 0,
    pageIndex,
    pageSize,
    columns,
    selectable: true,
    returnFullObjects: true,
    selectedRows: selectedAttempts,
    onSelectAll: handleSelectAllAttempts,
    showSearchInActionBar: true,
    noData: (attempts?.data || [])?.length === 0,
    customNoDataIcon: <HiExclamationTriangle className="h-12 w-12 text-gray-400" />,
    showActionsDropdown: false,
    extraActions: (
      <Button variant="default" size="sm" onClick={() => window.location.reload()}>
        Refresh
      </Button>
    ),
    pageInfoTitle: 'Failed Login Attempts',
    pageInfoSubtitlePrefix: 'Total Attempts',
  });

  return <BaseTable {...tableConfig} />;
};

export default FailedLoginAttempts;
