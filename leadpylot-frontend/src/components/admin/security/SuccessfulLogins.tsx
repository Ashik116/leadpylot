'use client';

import Button from '@/components/ui/Button';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import { ColumnDef } from '@/components/shared/DataTable';
import BaseTable from '@/components/shared/BaseTable/BaseTable';
import { useBaseTable } from '@/components/shared/BaseTable/useBaseTable';
import { useSuccessfulLogins } from '@/services/hooks/useSecurity';
import SecurityService from '@/services/SecurityService';
import React, { useMemo, useCallback } from 'react';
import { HiComputerDesktop, HiDevicePhoneMobile, HiGlobeAlt, HiNoSymbol } from 'react-icons/hi2';

interface SuccessfulLogin {
  _id: string;
  login: string;
  userId: {
    _id: string;
    login: string;
    role: string;
  };
  ipAddress: string;
  userAgent: string;
  deviceFingerprint: string;
  geolocation: {
    country?: string;
    countryCode?: string;
    region?: string;
    city?: string;
    isp?: string;
  };
  createdAt: string;
}

interface SuccessfulLoginsProps {
  timeframe?: number;
}

const SuccessfulLogins: React.FC<SuccessfulLoginsProps> = ({ timeframe }) => {
  // Default pagination values
  const pageIndex = 1;
  const pageSize = 50;

  // Fetch data using the hook
  const { data: logins, isLoading } = useSuccessfulLogins({
    page: pageIndex,
    limit: pageSize,
    timeframe: timeframe ?? undefined,
  });

  const handleBlockIP = useCallback(async (ipAddress: string) => {
    try {
      const result = await SecurityService.blockIP({
        ipAddress,
        reason: 'manual_block',
        blockType: 'manual',
        expirationHours: 24,
        notes: 'Manually blocked from successful logins',
      });

      if (result.success) {
        toast.push(
          <Notification type="success" title="Success">
            IP {ipAddress} has been blocked
          </Notification>
        );
      }
    } catch {
      toast.push(
        <Notification type="danger" title="Error">
          Failed to block IP address
        </Notification>
      );
    }
  }, []);

  const handleBlockDevice = useCallback(async (deviceFingerprint: string, userInfo?: string) => {
    try {
      const result = await SecurityService.blockDevice({
        deviceFingerprint,
        reason: 'manual_block',
        blockType: 'manual',
        expirationHours: 24,
        notes: `Manually blocked device from successful logins - ${userInfo || 'Unknown user'}`,
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

  const getDeviceIcon = (userAgent: string) => {
    if (
      userAgent?.toLowerCase()?.includes('mobile') ||
      userAgent?.toLowerCase()?.includes('android') ||
      userAgent?.toLowerCase()?.includes('iphone')
    ) {
      return <HiDevicePhoneMobile className="h-4 w-4 text-blue-500" />;
    }
    return <HiComputerDesktop className="h-4 w-4 text-gray-500" />;
  };

  const getBrowserInfo = (userAgent: string) => {
    if (!userAgent) return 'Unknown';

    const ua = userAgent?.toLowerCase();
    let browser = 'Unknown';
    let os = 'Unknown';

    // Browser detection
    if (ua?.includes('chrome')) browser = 'Chrome';
    else if (ua?.includes('firefox')) browser = 'Firefox';
    else if (ua?.includes('safari') && !ua?.includes('chrome')) browser = 'Safari';
    else if (ua?.includes('edge')) browser = 'Edge';

    // OS detection
    if (ua?.includes('windows')) os = 'Windows';
    else if (ua?.includes('mac os x')) os = 'macOS';
    else if (ua?.includes('linux')) os = 'Linux';
    else if (ua?.includes('android')) os = 'Android';
    else if (ua?.includes('iphone') || ua?.includes('ipad')) os = 'iOS';

    return `${browser} on ${os}`;
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-purple-100 text-purple-800 ',
      manager: 'bg-blue-100 text-blue-800 ',
      agent: 'bg-green-100 text-green-800',
      banker: 'bg-orange-100 text-orange-800 ',
      client: 'bg-gray-100 text-gray-800 ',
    };
    return colors[role] || colors?.client;
  };

  const columns: ColumnDef<SuccessfulLogin>[] = useMemo(
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
        header: 'User',
        accessorKey: 'userId',
        cell: ({ row }: any) => (
          <div>
            <div className="font-medium text-gray-900">
              {row.original?.userId?.login || row.original?.login}
            </div>
            <span
              className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${getRoleColor(row.original?.userId?.role)}`}
            >
              {row.original?.userId?.role || 'unknown'}
            </span>
          </div>
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
              <div className="flex items-center gap-1">
                <HiGlobeAlt className="h-4 w-4 text-gray-400" />
                {geo?.city || 'Unknown'}, {geo?.country || 'Unknown'}
              </div>
              {geo?.isp && <div className="mt-1 text-xs text-gray-500">{geo?.isp}</div>}
            </div>
          );
        },
      },
      {
        header: 'Device & Browser',
        accessorKey: 'userAgent',
        cell: ({ row }: any) => (
          <div className="text-sm">
            <div className="flex items-center gap-2">
              {getDeviceIcon(row.original?.userAgent)}
              <span>{getBrowserInfo(row.original?.userAgent)}</span>
            </div>
            <div className="mt-1 line-clamp-1 text-xs text-gray-500">
              ID: {row.original?.deviceFingerprint}
            </div>
          </div>
        ),
      },
      {
        header: 'Status',
        accessorKey: 'status',
        cell: () => (
          <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
            Success
          </span>
        ),
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
                handleBlockDevice(row.original?.deviceFingerprint, row.original?.userId?.login)
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
  const tableConfig = useBaseTable<SuccessfulLogin>({
    tableName: 'successful-logins',
    data: logins?.data || [],
    loading: isLoading,
    totalItems: logins?.meta?.total || 0,
    pageIndex,
    pageSize,
    columns,
    selectable: false,
    returnFullObjects: true,
    showSearchInActionBar: true,
    noData: (logins?.data || [])?.length === 0,
    customNoDataIcon: <HiGlobeAlt className="h-12 w-12 text-gray-400" />,
    showActionsDropdown: false,
    extraActions: (
      <Button variant="default" size="sm" onClick={() => window.location.reload()}>
        Refresh
      </Button>
    ),
    pageInfoTitle: 'Successful Logins',
    pageInfoSubtitlePrefix: 'Total Logins',
  });

  return <BaseTable {...tableConfig} />;
};

export default SuccessfulLogins;
