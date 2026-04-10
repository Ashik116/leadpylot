'use client';

import CommonCard from '@/components/shared/card/CommonCard';
import Button from '@/components/ui/Button';
import Notification from '@/components/ui/Notification';
import Select from '@/components/ui/Select';
import toast from '@/components/ui/toast';
import SecurityService from '@/services/SecurityService';
import React, { useCallback, useEffect, useState } from 'react';
import {
  HiArrowPath,
  HiExclamationTriangle,
  HiNoSymbol,
  HiShieldCheck,
  HiUsers,
  HiDevicePhoneMobile,
} from 'react-icons/hi2';
import ActiveSession from './ActiveSession';
import FailedLogin from './FailedLogin';
import RecentSuccessFullLogin from './RecentSuccessFullLogin';
import SecurityDashboardSkeleton from './SecurityDashboardSkeleton';

interface SecurityStats {
  totalFailedAttempts: number;
  totalSuccessfulLogins: number;
  activeSessionsCount: number;
  blockedIPsCount: number;
  blockedDevicesCount: number;
  uniqueFailedIPs: number;
  uniqueFailedDevices: number;
  topFailedCountries: Array<{ _id: string; count: number }>;
  timeframe: number;
}

interface SecurityThreatLevel {
  level: 'MINIMAL' | 'LOW' | 'MEDIUM' | 'HIGH';
  color: string;
  message: string;
}

interface UnifiedSecurityOverview {
  totalIPBlocks: number;
  totalDeviceBlocks: number;
  activeIPBlocks: number;
  activeDeviceBlocks: number;
  recentIPBlocks: number;
  recentDeviceBlocks: number;
}

interface DashboardData {
  stats: SecurityStats;
  failedLogins: any[];
  successfulLogins: any[];
  activeSessions: any[];
  blockedIPs: any[];
  blockedDevices: any[];
  overview?: UnifiedSecurityOverview;
  combinedThreatLevel?: SecurityThreatLevel;
}

interface SecurityDashboardProps {
  timeframe: number;
  onTimeframeChange: (timeframe: number) => void;
  onSessionDetails?: (session: any) => void;
}

const SecurityDashboard: React.FC<SecurityDashboardProps> = ({
  timeframe,
  onTimeframeChange,
  onSessionDetails,
}) => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const timeframeOptions = [
    { value: 1, label: 'Last Hour' },
    { value: 6, label: 'Last 6 Hours' },
    { value: 24, label: 'Last 24 Hours' },
    { value: 72, label: 'Last 3 Days' },
    { value: 168, label: 'Last Week' },
  ];

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      // Use existing login-security endpoints
      const result = await SecurityService.getSecurityDashboard(timeframe, 5);

      setData(result?.data as unknown as DashboardData);
    } catch {
      toast.push(
        <Notification type="danger" title="Error">
          Failed to load security dashboard
        </Notification>
      );
    } finally {
      setLoading(false);
    }
  }, [timeframe]);

  useEffect(() => {
    fetchDashboardData();
  }, [timeframe, fetchDashboardData]);

  const stats = data?.stats;
  const threatLevel = data?.combinedThreatLevel;
  const recentFailedLogins = data?.failedLogins?.slice(0, 5) || [];
  const recentSuccessfulLogins = data?.successfulLogins?.slice(0, 5) || [];
  const topSessions = data?.activeSessions?.slice(0, 5) || [];
  const recentIPBlocks = data?.blockedIPs?.slice(0, 5) || [];
  const recentDeviceBlocks = data?.blockedDevices?.slice(0, 5) || [];

  if (loading) {
    return <SecurityDashboardSkeleton />;
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Time Range:</label>
          <Select
            value={timeframe}
            onChange={(value) => onTimeframeChange(Number(value))}
            className="w-40"
          >
            {timeframeOptions?.length > 0 &&
              timeframeOptions?.map((option, i) => (
                <option key={i} value={option?.value}>
                  {option?.label}
                </option>
              ))}
          </Select>
        </div>

        <Button
          variant="default"
          size="sm"
          onClick={fetchDashboardData}
          className="flex items-center gap-2"
          disabled={loading}
        >
          <HiArrowPath className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Threat Level Alert */}
      {threatLevel && threatLevel?.level !== 'MINIMAL' && (
        <div
          className={`rounded-lg border-l-4 p-4 ${threatLevel?.level === 'HIGH'
              ? 'border-red-500 bg-red-50'
              : threatLevel?.level === 'MEDIUM'
                ? 'border-orange-500 bg-orange-50'
                : 'border-yellow-500 bg-yellow-50'
            }`}
        >
          <div className="flex items-center gap-3">
            <HiExclamationTriangle
              className={`h-5 w-5 ${threatLevel?.level === 'HIGH'
                  ? 'text-red-500'
                  : threatLevel?.level === 'MEDIUM'
                    ? 'text-orange-500'
                    : 'text-yellow-500'
                }`}
            />
            <div>
              <p className="font-medium text-gray-900">
                Security Alert: {threatLevel?.level} Threat Level
              </p>
              <p className="text-sm text-gray-600">{threatLevel?.message}</p>
            </div>
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
        <CommonCard
          title="Failed Attempts"
          value={stats?.totalFailedAttempts || 0}
          icon={<HiExclamationTriangle className="h-8 w-8 text-red-500" />}
          label={`Last ${timeframe}h`}
          color="text-red-600"
        />
        <CommonCard
          title="Successful Logins"
          value={stats?.totalSuccessfulLogins || 0}
          icon={<HiShieldCheck className="h-8 w-8 text-green-500" />}
          label={`Last ${timeframe}h`}
          color="text-green-600"
        />
        <CommonCard
          title="Active Sessions"
          value={stats?.activeSessionsCount || 0}
          icon={<HiUsers className="h-8 w-8 text-blue-500" />}
          label="Online users"
          color="text-blue-600"
        />
        <CommonCard
          title="Blocked IPs"
          value={stats?.blockedIPsCount || 0}
          icon={<HiNoSymbol className="h-8 w-8 text-orange-500" />}
          label="Manual blocks"
          color="text-orange-600"
        />
        <CommonCard
          title="Blocked Devices"
          value={stats?.blockedDevicesCount || 0}
          icon={<HiDevicePhoneMobile className="h-8 w-8 text-purple-500" />}
          label="Auto + Manual"
          color="text-purple-600"
        />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          {/* Recent Failed Logins */}
          <FailedLogin
            recentFailedLogins={recentFailedLogins}
            onSessionDetails={onSessionDetails}
          />
          <ActiveSession topSessions={topSessions} onSessionDetails={onSessionDetails} />
        </div>
        <div className="space-y-6">
          {/* Recent Successful Logins */}
          <RecentSuccessFullLogin
            recentSuccessfulLogins={recentSuccessfulLogins}
            onSessionDetails={onSessionDetails}
          />

          {/* Recent Security Blocks */}
          {(recentIPBlocks?.length > 0 || recentDeviceBlocks?.length > 0) && (
            <div className="rounded-lg border bg-white">
              <div className="border-b border-gray-200 p-4">
                <h3 className="flex items-center gap-2 text-lg font-medium text-gray-900">
                  <HiShieldCheck className="h-5 w-5 text-red-500" />
                  Recent Security Blocks
                </h3>
              </div>
              <div className="space-y-3 p-4">
                {recentIPBlocks?.length > 0 &&
                  recentIPBlocks?.map((block: any, index: number) => (
                    <div
                      key={`ip-${index}`}
                      className="flex items-center justify-between border-b border-gray-100 py-2 last:border-b-0"
                    >
                      <div className="flex items-center gap-3">
                        <HiNoSymbol className="h-4 w-4 text-orange-500" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            IP: {block?.ipAddress}
                          </p>
                          <p className="text-xs text-gray-500">{block?.blockReason}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">
                          {new Date(block?.blockedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                {recentDeviceBlocks?.length > 0 &&
                  recentDeviceBlocks?.map((block: any, index: number) => (
                    <div
                      key={`device-${index}`}
                      className="flex items-center justify-between border-b border-gray-100 py-2 last:border-b-0"
                    >
                      <div className="flex items-center gap-3">
                        <HiDevicePhoneMobile className="h-4 w-4 text-purple-500" />
                        <div>
                          <p className="min-w-0 text-sm font-medium text-gray-900">
                            Device: {block?.deviceFingerprint}
                          </p>
                          <p className="text-xs text-gray-500">{block?.blockReason}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">
                          {new Date(block?.blockedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SecurityDashboard;
