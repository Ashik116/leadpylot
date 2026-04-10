'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Card from '@/components/ui/Card';
import Tabs from '@/components/ui/Tabs';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';

// Import security components
import SecurityDashboard from '@/components/admin/security/components/securityDashboard/SecurityDashboard';
import FailedLoginAttempts from '@/components/admin/security/FailedLoginAttempts';
import SuccessfulLogins from '@/components/admin/security/SuccessfulLogins';
import AgentBoardSessions from '@/components/admin/security/components/agentBoard/AgentBoard';
import BlockedIPs from '@/components/admin/security/BlockedIPs';
import BlockedDevices from '@/components/admin/security/BlockedDevices';
import SessionDetailsModal from '@/components/admin/security/components/securityDashboard/SessionDetailsModal';
import SecurityService, { SecurityStats } from '@/services/SecurityService';
import {
  HiShieldCheck,
  HiExclamationTriangle,
  HiGlobeAlt,
  HiUsers,
  HiNoSymbol,
  HiDevicePhoneMobile,
} from 'react-icons/hi2';

const SecurityPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('0');
  const [stats, setStats] = useState<SecurityStats | null>(null);
  const [timeframe, setTimeframe] = useState(24); // 24 hours by default
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);

  const fetchSecurityStats = useCallback(async () => {
    try {
      const result = await SecurityService.getSecurityStats(timeframe);
      setStats(result.data);
    } catch {
      // console.error('Error fetching security stats:', error);
      toast.push(
        <Notification type="danger" title="Error">
          Failed to load security statistics
        </Notification>
      );
    }
  }, [timeframe]);

  const handleSessionDetails = useCallback((session: any) => {
    setSelectedSession(session);
    setIsSessionModalOpen(true);
  }, []);

  const handleCloseSessionModal = useCallback(() => {
    setIsSessionModalOpen(false);
    setSelectedSession(null);
  }, []);

  useEffect(() => {
    fetchSecurityStats();
  }, [timeframe, fetchSecurityStats]);

  const tabData = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <HiShieldCheck className="h-4 w-4" />,
      className: '',
      component: (
        <SecurityDashboard
          timeframe={timeframe}
          onTimeframeChange={setTimeframe}
          onSessionDetails={handleSessionDetails}
        />
      ),
    },
    {
      id: 'failed-logins',
      label: 'Failed Logins',
      icon: <HiExclamationTriangle className="h-4 w-4" />,
      className: 'bg-red-500',
      badge: stats?.totalFailedAttempts || 0,
      component: <FailedLoginAttempts timeframe={timeframe} />,
    },
    {
      id: 'successful-logins',
      label: 'Login History',
      icon: <HiGlobeAlt className="h-4 w-4" />,
      className: 'bg-green-500',
      badge: stats?.totalSuccessfulLogins || 0,
      component: <SuccessfulLogins timeframe={timeframe} />,
    },
    {
      id: 'active-sessions',
      label: 'Agent Board',
      icon: <HiUsers className="h-4 w-4" />,
      className: 'bg-blue-500',
      badge: stats?.activeSessionsCount || 0,
      component: <AgentBoardSessions onSessionDetails={handleSessionDetails} />,
    },
    {
      id: 'blocked-ips',
      label: 'Blocked IPs',
      icon: <HiNoSymbol className="h-4 w-4" />,
      className: 'bg-red-500',
      badge: stats?.blockedIPsCount || 0,
      component: <BlockedIPs onUpdate={fetchSecurityStats} />,
    },
    {
      id: 'blocked-devices',
      label: 'Blocked Devices',
      icon: <HiDevicePhoneMobile className="h-4 w-4" />,
      className: 'bg-orange-500',
      badge: stats?.blockedDevicesCount || 0,
      component: <BlockedDevices onUpdate={fetchSecurityStats} />,
    },
  ];

  return (
    <div className="space-y-6 px-4">
      {/* Page Header */}
      {/* <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <HiShieldCheck className="w-8 h-8 text-blue-600" />
              Security Center
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Monitor login activities, manage IP restrictions, and track user sessions
            </p>
          </div>
          
          {stats && (
            <div className="flex gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{stats.totalFailedAttempts}</div>
                <div className="text-xs text-gray-500">Failed Attempts</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.totalSuccessfulLogins}</div>
                <div className="text-xs text-gray-500">Successful Logins</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.activeSessionsCount}</div>
                <div className="text-xs text-gray-500">Active Sessions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{stats.blockedIPsCount}</div>
                <div className="text-xs text-gray-500">Blocked IPs</div>
              </div>
            </div>
          )}
        </div>
      </div> */}

      {/* Main Content */}
      <Card className="min-h-[600px]">
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.TabList className="border-b border-gray-200 dark:border-gray-700">
            {tabData?.length > 0 &&
              tabData?.map((tab, index) => (
                <Tabs.TabNav
                  key={tab?.id}
                  value={index?.toString()}
                  className="flex items-center gap-2"
                >
                  {tab?.icon}
                  <span>{tab?.label}</span>
                  {tab?.badge !== undefined && tab?.badge > 0 && (
                    <span
                      className={`ml-1 min-w-[20px] rounded-full px-2 py-0.5 text-center text-xs text-white ${tab?.className} `}
                    >
                      {tab?.badge > 99 ? '99+' : tab?.badge}
                    </span>
                  )}
                </Tabs.TabNav>
              ))}
          </Tabs.TabList>

          <div className="py-4">
            {tabData?.length > 0 &&
              tabData?.map((tab, index) => (
                <Tabs.TabContent key={tab?.id} value={index?.toString()}>
                  {tab?.component}
                </Tabs.TabContent>
              ))}
          </div>
        </Tabs>
      </Card>

      {/* Session Details Modal */}
      <SessionDetailsModal
        isOpen={isSessionModalOpen}
        onClose={handleCloseSessionModal}
        session={selectedSession}
      />
    </div>
  );
};

export default SecurityPage;
