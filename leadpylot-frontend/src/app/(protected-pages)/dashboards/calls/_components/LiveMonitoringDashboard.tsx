/**
 * Live Monitoring Dashboard
 * Real-time call monitoring with agent status and supervisor controls
 */

'use client';

import React, { useMemo, useEffect } from 'react';
import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { useSession } from '@/hooks/useSession';
import { Role } from '@/configs/navigation.config/auth.route.config';
import { useSafeJsSIP } from '@/hooks/useJsSIP';
import {
  useActiveCalls,
  useAgentStatus,
  useRealtimeMonitoring,
  useMonitoringSystemStatus,
} from '@/services/hooks/useMonitoring';
import { useAgentExtensionSync } from '@/services/hooks/useAgentExtensionSync';
import SupervisorSessionManager from './SupervisorSessionManager';
import SupervisorControls from './SupervisorControls';
import SupervisorModeSwitch from './SupervisorModeSwitch';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import duration from 'dayjs/plugin/duration';
import { useGlobalAdminSIP } from '@/hooks/useGlobalAdminSIP';

dayjs.extend(relativeTime);
dayjs.extend(duration);

type TLiveMonitoringDashboardProps = {
  setActiveTab: (tab: 'calls' | 'supervisor-actions') => void;
  activeTab: 'calls' | 'supervisor-actions';
};

const tabs = [
  { key: 'calls', label: 'Call History', icon: 'phone' },
  { key: 'supervisor-actions', label: 'Supervisor Actions', icon: 'shield' },
];

export const LiveMonitoringDashboard = ({
  setActiveTab,
  activeTab,
}: TLiveMonitoringDashboardProps) => {
  const { data: session } = useSession();
  const { isSipConnected } = useGlobalAdminSIP();
  const { activeCalls: jsSipCalls } = useSafeJsSIP();

  useAgentExtensionSync();

  const { isConnected: isRealtimeConnected, lastUpdate } = useRealtimeMonitoring();

  const {
    data: activeCallsData,
    isLoading: isLoadingCalls,
    error: callsError,
    refetch: refetchActiveCalls,
  } = useActiveCalls({
    refetchInterval: isRealtimeConnected ? 15000 : 5000,
  });

  const {
    data: agentStatusData,
    isLoading: isLoadingAgents,
    error: agentsError,
    refetch: refetchAgentStatus,
  } = useAgentStatus({
    refetchInterval: isRealtimeConnected ? 20000 : 10000,
  });

  const { data: systemStatus, isLoading: isLoadingSystem } = useMonitoringSystemStatus();

  useEffect(() => {
    if (jsSipCalls.length > 0) {
      refetchActiveCalls();
    }
  }, [jsSipCalls.length, refetchActiveCalls]);

  const isAdmin = session?.user?.role === Role.ADMIN;

  const filteredAgents = useMemo(() => {
    const agents = agentStatusData?.agents ?? agentStatusData?.data?.agents ?? [];
    if (!Array.isArray(agents)) return [];
    return [...agents].sort((a, b) => {
      if (String(a.id) === String(b.id)) {
        if (a.isSelected && !b.isSelected) return -1;
        if (!a.isSelected && b.isSelected) return 1;
      }
      return 0;
    });
  }, [agentStatusData]);

  const filteredActiveCalls = useMemo(() => {
    const calls = activeCallsData?.activeCalls ?? activeCallsData?.data?.activeCalls ?? [];
    if (!Array.isArray(calls)) return [];
    return calls.filter((call) => {
      const phone = call.phoneNumber ?? call.callerNumber ?? call.destination ?? '';
      const hasSupervisorCode =
        String(phone).includes('*2221') ||
        String(phone).includes('*2222') ||
        String(phone).includes('*2223') ||
        String(phone).includes('*2220');
      const hasSupervisorKeyword =
        String(phone).toLowerCase().includes('spy') ||
        String(phone).toLowerCase().includes('whisper') ||
        String(phone).toLowerCase().includes('barge');
      return !hasSupervisorCode && !hasSupervisorKeyword;
    });
  }, [activeCallsData]);

  const globalSummary = useMemo(() => {
    const summary = agentStatusData?.summary ?? agentStatusData?.data?.summary;
    if (summary) {
      return {
        totalAgents: summary.totalAgents ?? summary.totalExtensions ?? 0,
        availableAgents: summary.availableAgents ?? 0,
        agentsInCall: summary.agentsInCall ?? 0,
        offlineAgents: summary.offlineAgents ?? 0,
      };
    }
    if (!filteredAgents.length)
      return { totalAgents: 0, availableAgents: 0, agentsInCall: 0, offlineAgents: 0 };

    const unique = (status?: string) =>
      new Set(
        filteredAgents
          .filter((a) => !status || a.status === status)
          .map((a) => String(a.id ?? a._id))
      ).size;

    return {
      totalAgents: unique(),
      availableAgents: unique('available'),
      agentsInCall: unique('in_call'),
      offlineAgents: unique('offline'),
    };
  }, [filteredAgents, agentStatusData]);

  if (session?.user?.role !== Role.ADMIN) return null;

  if (isLoadingCalls || isLoadingAgents || isLoadingSystem) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-gray-200 bg-white p-8">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
        <span className="ml-3 text-sm text-gray-500">Loading dashboard...</span>
      </div>
    );
  }

  if (callsError || agentsError) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
        <ApolloIcon name="alert-circle" className="shrink-0" />
        Failed to load monitoring data. Please check your permissions.
      </div>
    );
  }

  const activeCalls = filteredActiveCalls;
  const agents = filteredAgents;
  const summary = globalSummary;

  const formatDuration = (seconds: number) =>
    dayjs.duration(seconds, 'seconds').format('mm:ss');

  const statusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-emerald-500';
      case 'ringing': return 'bg-amber-500';
      default: return 'bg-blue-500';
    }
  };

  const agentStatusStyle = (status: string) => {
    switch (status) {
      case 'available': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'in_call': return 'bg-red-50 text-red-700 border-red-200';
      case 'offline': return 'bg-gray-100 text-gray-500 border-gray-200';
      default: return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  const agentStatusLabel = (status: string) => {
    switch (status) {
      case 'available': return 'Available';
      case 'in_call': return 'In Call';
      case 'offline': return 'Offline';
      default: return 'Unknown';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-5 py-3">
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-semibold text-gray-900">Live Monitoring</h2>

          {/* Status indicators */}
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className={`h-1.5 w-1.5 rounded-full ${isRealtimeConnected ? 'bg-emerald-500' : 'bg-red-400'}`} />
              {isRealtimeConnected ? 'Live' : 'Offline'}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className={`h-1.5 w-1.5 rounded-full ${isSipConnected ? 'bg-emerald-500' : 'bg-red-400'}`} />
              SIP
            </span>
            {systemStatus && (
              <span className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className={`h-1.5 w-1.5 rounded-full ${(systemStatus.amiConnection ?? systemStatus.data?.amiConnection)?.connected ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                AMI
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Tab navigation */}
          <div className="flex rounded-md bg-gray-100 p-0.5">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key as 'calls' | 'supervisor-actions')}
                className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === t.key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <Button
            size="xs"
            variant="default"
            icon={<ApolloIcon name="refresh" className={isLoadingCalls ? 'animate-spin' : ''} />}
            onClick={() => { refetchActiveCalls(); refetchAgentStatus(); }}
          />
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'Active Calls', value: activeCalls.length, accent: 'text-blue-600', bg: 'bg-blue-50 border-blue-100' },
          { label: 'Total Agents', value: summary.totalAgents, accent: 'text-gray-700', bg: 'bg-gray-50 border-gray-100' },
          { label: 'Available', value: summary.availableAgents, accent: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
          { label: 'In Call', value: summary.agentsInCall, accent: 'text-orange-600', bg: 'bg-orange-50 border-orange-100' },
          { label: 'Offline', value: summary.offlineAgents, accent: 'text-gray-500', bg: 'bg-gray-50 border-gray-100' },
        ].map((stat) => (
          <div key={stat.label} className={`rounded-lg border px-4 py-3 ${stat.bg}`}>
            <div className={`text-xl font-bold ${stat.accent}`}>{stat.value}</div>
            <div className="text-xs text-gray-500">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-5 gap-4">
        {/* Active Calls Panel - 3 columns */}
        <div className="col-span-3 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">
              Active Calls
              {activeCalls.length > 0 && (
                <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                  {activeCalls.length}
                </span>
              )}
            </h3>
            {jsSipCalls.length > 0 && (
              <span className="flex items-center gap-1 text-xs text-emerald-600">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                {jsSipCalls.length} local
              </span>
            )}
          </div>

          {activeCalls.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50/50 py-12">
              <ApolloIcon name="phone-decline" className="mb-2 text-2xl text-gray-300" />
              <p className="text-sm text-gray-400">No active calls</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activeCalls.map((call) => (
                <div
                  key={call.callId}
                  className="rounded-lg border border-gray-200 bg-white transition-shadow hover:shadow-sm"
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {/* Status dot + direction icon */}
                        <div className="relative">
                          <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${statusColor(call.status)} text-white`}>
                            <ApolloIcon
                              name={call.direction === 'outbound' ? 'phone-out' : 'phone-in'}
                              className="text-sm"
                            />
                          </div>
                        </div>

                        {/* Call info */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-900 truncate">
                              {call.agent?.name ?? `Ext. ${call.extension ?? '-'}`}
                            </span>
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium leading-none ${
                              call.status === 'connected'
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                : call.status === 'ringing'
                                  ? 'border-amber-200 bg-amber-50 text-amber-700'
                                  : 'border-blue-200 bg-blue-50 text-blue-700'
                            }`}>
                              {call.status ?? 'initiated'}
                            </span>
                          </div>
                          <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
                            <span className="font-mono">{call.phoneNumber ?? call.callerNumber ?? call.destination ?? '-'}</span>
                            {call.lead && (
                              <>
                                <span className="text-gray-300">/</span>
                                <span className="text-blue-600">{call.lead.name ?? call.lead.contact_name}</span>
                              </>
                            )}
                            {call.lead?.project && (
                              <>
                                <span className="text-gray-300">/</span>
                                <span>{typeof call.lead.project === 'string' ? call.lead.project : call.lead.project?.name ?? '-'}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Duration + time */}
                      <div className="text-right shrink-0">
                        {call.status === 'connected' && (
                          <div className="text-sm font-bold tabular-nums text-emerald-600">
                            {formatDuration(call.currentDuration ?? call.duration ?? 0)}
                          </div>
                        )}
                        <div className="text-[10px] text-gray-400">
                          {call.startTime ? dayjs(call.startTime).format('HH:mm:ss') : '-'}
                        </div>
                      </div>
                    </div>

                    {/* Supervisor controls - collapsed by default */}
                    {isAdmin && call.status !== 'ended' && (
                      <div className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-3">
                        <SupervisorModeSwitch call={call} disabled={false} />
                        <div className="ml-auto">
                          <SupervisorControls call={call} disabled={false} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <SupervisorSessionManager />
        </div>

        {/* Agent Status Panel - 2 columns */}
        <div className="col-span-2 space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">
            Agents
            <span className="ml-2 text-xs font-normal text-gray-400">
              {summary.availableAgents} available
            </span>
          </h3>

          {agents.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50/50 py-12">
              <ApolloIcon name="users" className="mb-2 text-2xl text-gray-300" />
              <p className="text-sm text-gray-400">No agents configured</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {agents.map((agent) => (
                <div
                  key={agent.combinationId ?? String(agent.id ?? agent._id)}
                  className={`rounded-lg border bg-white p-3 transition-shadow hover:shadow-sm ${
                    agent.isSelected ? 'border-blue-300 bg-blue-50/50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Avatar */}
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${
                          agent.status === 'available'
                            ? 'bg-emerald-500'
                            : agent.status === 'in_call'
                              ? 'bg-red-500'
                              : 'bg-gray-400'
                        }`}
                      >
                        {(agent.aliasName ?? agent.alias_name ?? agent.name ?? agent.login ?? '?').charAt(0).toUpperCase()}
                      </div>

                      {/* Name + extension */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {agent.aliasName ?? agent.alias_name ?? agent.name ?? agent.login ?? '-'}
                          </span>
                          {agent.isSelected && (
                            <span className="rounded bg-blue-100 px-1 py-0.5 text-[9px] font-semibold uppercase text-blue-600 leading-none">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                          <span className="font-mono">Ext. {agent.extension ?? agent.voip_extension ?? '-'}</span>
                          <span className="text-gray-300">|</span>
                          <span className="truncate">{agent.project ?? 'No project'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Status badge */}
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium leading-none ${agentStatusStyle(agent.status)}`}>
                      {agentStatusLabel(agent.status)}
                    </span>
                  </div>

                  {/* Current call info */}
                  {agent.currentCall && (
                    <div className="mt-2 flex items-center justify-between rounded bg-gray-50 px-2.5 py-1.5 text-[11px]">
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <ApolloIcon name={agent.currentCall.direction === 'outbound' ? 'phone-out' : 'phone-in'} className="text-[10px]" />
                        <span className="font-mono">{agent.currentCall.phoneNumber ?? agent.currentCall.destination ?? agent.currentCall.callerNumber ?? '-'}</span>
                      </div>
                      <span className="font-medium tabular-nums text-emerald-600">
                        {dayjs.duration(agent.currentCall.duration ?? 0, 'seconds').format('mm:ss')}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      {lastUpdate && (
        <div className="text-[11px] text-gray-400">
          Last update: {dayjs(lastUpdate).fromNow()}
        </div>
      )}
    </div>
  );
};

export default LiveMonitoringDashboard;
