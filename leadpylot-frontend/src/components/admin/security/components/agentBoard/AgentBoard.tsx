'use client';

import DataTable, { ColumnDef } from '@/components/shared/DataTable';
import CopyButton from "@/components/shared/CopyButton";
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Notification from '@/components/ui/Notification';
import toast from '@/components/ui/toast';
import SecurityService from '@/services/SecurityService';
import React, { useEffect, useState } from 'react';
import { HiArrowPath, HiComputerDesktop, HiDevicePhoneMobile, HiGlobeAlt, HiUsers } from 'react-icons/hi2';
import AgentBoardConfirmationModal from './AgentBoardConfirmationModal';
import CommonCard from '@/components/shared/card/CommonCard';

// Using any[] for sessions to avoid complex type issues

interface AgentBoardSessionsProps {
  onSessionDetails?: (session: any) => void;
}

const AgentBoardSessions: React.FC<AgentBoardSessionsProps> = ({ onSessionDetails }) => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isForceLogoutModalOpen, setIsForceLogoutModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [isLogoutLoading, setIsLogoutLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0,
  });

  const fetchActiveSessions = async (page = 1) => {
    try {
      setLoading(true);
      const result = await SecurityService.getActiveSessions({
        page,
        limit: pagination.limit,
      });

      if (result.success) {
        setSessions(result.data.data); // Changed from result.data.sessions to result.data.data
        setPagination(result.data.pagination);
      }
    } catch {
      // console.error('Error fetching active sessions:', error);
      toast.push(
        <Notification type="danger" title="Error">
          Failed to load active sessions
        </Notification>
      );
    } finally {
      setLoading(false);
    }
  };

  const handleForceLogoutClick = (session: any) => {
    setSelectedSession(session);
    setIsForceLogoutModalOpen(true);
  };

  const handleForceLogout = async () => {
    if (!selectedSession) return;

    try {
      setIsLogoutLoading(true);
      const result = await SecurityService.forceLogoutSession(selectedSession.sessionId);
      if (result.success) {
        toast.push(
          <Notification type="success" title="Success">
            User {selectedSession.userId?.login} has been logged out successfully
          </Notification>
        );

        setIsForceLogoutModalOpen(false);
        setSelectedSession(null);

        // Refresh the sessions list
        fetchActiveSessions(pagination.page);
      }
    } catch {
      // console.error('Error forcing logout:', error);
      toast.push(
        <Notification type="danger" title="Error">
          Failed to force logout user
        </Notification>
      );
    } finally {
      setIsLogoutLoading(false);
    }
  };

  const handleCloseLogoutModal = () => {
    setIsForceLogoutModalOpen(false);
    setSelectedSession(null);
  };

  useEffect(() => {
    fetchActiveSessions(1);

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchActiveSessions(pagination.page);
    }, 30000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getDeviceIcon = (deviceType: string) => {
    if (deviceType === 'mobile' || deviceType === 'tablet') {
      return <HiDevicePhoneMobile className="w-4 h-4 text-blue-500" />;
    }
    return <HiComputerDesktop className="w-4 h-4 text-gray-500" />;
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-purple-100 text-purple-800 ',
      manager: 'bg-blue-100 text-blue-800',
      agent: 'bg-green-100 text-green-800 ',
      banker: 'bg-orange-100 text-orange-800 ',
      client: 'bg-gray-100 text-gray-800',
    };
    return colors[role] || colors.client;
  };

  const getSessionDuration = (loginTime: string) => {
    const start = new Date(loginTime);
    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m`;
    }
    return `${diffMinutes}m`;
  };

  const getLastActivityTime = (lastActivity: string) => {
    const last = new Date(lastActivity);
    const now = new Date();
    const diffMs = now.getTime() - last.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const isSessionExpiringSoon = (expiresAt: string) => {
    const expires = new Date(expiresAt);
    const now = new Date();
    const diffMs = expires.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return diffHours < 2; // Less than 2 hours
  };

  const columns: ColumnDef<any>[] = [
    {
      header: 'User',
      accessorKey: 'userId',
      cell: ({ row }: any) => (
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 ">
              {row.original.userId?.login}
            </span>
            {!row.original.userId?.active && (
              <span className="text-xs bg-gray-200 px-2 py-1 rounded">Disabled</span>
            )}
          </div>
          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(row.original.userId?.role)}`}>
            {row.original.userId?.role || 'unknown'}
          </span>
        </div>
      ),
    },
    {
      header: 'Device & Browser',
      accessorKey: 'deviceInfo',
      cell: ({ row }: any) => {
        const device = row.original.deviceInfo;
        return (
          <div className="text-sm">
            <div className="flex items-center gap-2">
              {getDeviceIcon(device?.deviceType)}
              <span>
                {device?.browser || 'Unknown'}
                {device?.browserVersion && ` ${device.browserVersion.split('.')[0]}`}
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {device?.os || 'Unknown OS'} • ID: {row.original.deviceFingerprint?.substring(0, 8)}...
            </div>
          </div>
        );
      },
    },
    {
      header: 'IP & Location',
      accessorKey: 'ipAddress',
      cell: ({ row }: any) => {
        const geo = row.original.geolocation;
        return (
          <div className="text-sm">
            <div className="font-mono text-gray-700 flex items-center space-x-1 group">
              <span>{row.original.ipAddress}</span>
              <div className="opacity-0 group-hover:opacity-100"><CopyButton value={row.original.ipAddress} /></div>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
              <HiGlobeAlt className="w-3 h-3" />
              {geo?.city || 'Unknown'}, {geo?.country || 'Unknown'}
            </div>
          </div>
        );
      },
    },
    {
      header: 'Session Info',
      accessorKey: 'sessionInfo',
      cell: ({ row }: any) => (
        <div className="text-sm">
          <div>Duration: {getSessionDuration(row.original.loginTime)}</div>
          <div className="text-xs text-gray-500 mt-1">
            Last: {getLastActivityTime(row.original.lastActivity)}
          </div>
          {isSessionExpiringSoon(row.original.expiresAt) && (
            <div className="text-xs text-orange-600 mt-1">
              Expires soon
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Login Time',
      accessorKey: 'loginTime',
      cell: ({ row }: any) => (
        <div className="text-sm">
          <div>{new Date(row.original.loginTime).toLocaleDateString()}</div>
          <div className="text-gray-500">{new Date(row.original.loginTime).toLocaleTimeString()}</div>
        </div>
      ),
    },
    {
      header: 'Actions',
      accessorKey: 'actions',
      cell: ({ row }: any) => (
        <div className="flex flex-col gap-2">
          <Button
            size="xs"
            variant="destructive"
            onClick={() => handleForceLogoutClick(row.original)}
            className="w-32"
          >
            Force Logout
          </Button>
          <Button
            size="xs"
            variant="default"
            className="w-32"
            onClick={() => onSessionDetails?.(row.original)}
          >
            Details
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <HiUsers className="w-6 h-6 text-blue-500" />
            Agent Board
          </h2>
          <p className="text-sm text-gray-600  mt-1">
            Monitor active user sessions with device information and last activity
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => fetchActiveSessions(pagination.page)}
          disabled={loading}
          className="flex items-center gap-2"
        >
          <HiArrowPath className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <CommonCard title="Total Active Sessions" value={pagination.total} icon={<HiUsers className="w-8 h-8 text-blue-500" />} label={`Online users`} color="text-blue-600" />
        <CommonCard title="Mobile Sessions" value={sessions.filter(s => s.deviceInfo?.deviceType === 'mobile').length} icon={<HiDevicePhoneMobile className="w-8 h-8 text-green-500" />} label={`Mobile users`} color="text-green-600" />
        <CommonCard title="Desktop Sessions" value={sessions.filter(s => s.deviceInfo?.deviceType === 'desktop' || !s.deviceInfo?.deviceType).length} icon={<HiComputerDesktop className="w-8 h-8 text-gray-500" />} label={`Desktop users`} color="text-gray-600" />
      </div>

      {/* Sessions Table */}
      <Card>
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            <DataTable
              data={sessions}
              columns={columns}
              loading={loading}
              noData={sessions.length === 0}
              pagingData={{
                pageIndex: pagination.page,
                pageSize: pagination.limit,
                total: pagination.total,
              }}
              onPaginationChange={(pageIndex) => fetchActiveSessions(pageIndex)}
              showPagination={true}
            />

            {sessions.length === 0 && (
              <div className="text-center py-12">
                <HiUsers className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900  mb-2">
                  No Active Sessions
                </h3>
                <p className="text-gray-500">
                  No users are currently logged in to the system.
                </p>
              </div>
            )}
          </>
        )}
      </Card>

      <AgentBoardConfirmationModal
        isForceLogoutModalOpen={isForceLogoutModalOpen}
        handleCloseLogoutModal={handleCloseLogoutModal}
        selectedSession={selectedSession}
        isLogoutLoading={isLogoutLoading}
        handleForceLogout={handleForceLogout}
      />
    </div>
  );
};

export default AgentBoardSessions;
