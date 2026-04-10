/**
 * Professional Active Call Card Component
 * Enhanced card design for displaying individual active calls with supervisor controls
 */

'use client';

import React, { useEffect, useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { useSession } from '@/hooks/useSession';
import { Role } from '@/configs/navigation.config/auth.route.config';
import { useSupervisorSession, SupervisorMode } from '@/hooks/useSupervisorSession';

// Import the ActiveCall interface from the monitoring service
interface ActiveCall {
  callId: string;
  uniqueId: string;
  extension: string;
  agentId?: string;
  direction: 'inbound' | 'outbound';
  status: 'initiated' | 'ringing' | 'connected' | 'ended' | 'on_hold';
  phoneNumber: string;
  callerNumber?: string;
  destination?: string;
  startTime: string;
  connectTime?: string;
  endTime?: string;
  duration: number;
  currentDuration: number;
  agent?: {
    id: string;
    name: string;
    login: string;
    extension: string;
    project?: string;
  };
  lead?: {
    id: string;
    name: string;
    contact_name?: string;
    project?: string;
  };
  metadata?: Record<string, any>;
}

interface ActiveCallCardProps {
  call: ActiveCall;
  onSpy?: (callId: string) => void;
  onWhisper?: (callId: string) => void;
  onBarge?: (callId: string) => void;
  onHangup?: (callId: string) => void;
}

// Utility function to format duration
const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// Utility function to get status styling
const getStatusStyling = (status: string) => {
  switch (status) {
    case 'connected':
      return {
        color: 'bg-green-100 text-green-800 border-green-200',
        indicator: 'bg-green-500',
        borderColor: 'border-l-green-500',
      };
    case 'ringing':
      return {
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        indicator: 'bg-yellow-500 animate-pulse',
        borderColor: 'border-l-yellow-500',
      };
    case 'initiated':
      return {
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        indicator: 'bg-blue-500 animate-pulse',
        borderColor: 'border-l-blue-500',
      };
    case 'on_hold':
      return {
        color: 'bg-orange-100 text-orange-800 border-orange-200',
        indicator: 'bg-orange-500',
        borderColor: 'border-l-orange-500',
      };
    default:
      return {
        color: 'bg-gray-100 text-gray-800 border-gray-200',
        indicator: 'bg-gray-500',
        borderColor: 'border-l-gray-500',
      };
  }
};

export const ActiveCallCard: React.FC<ActiveCallCardProps> = ({
  call,
  onSpy,
  onWhisper,
  onBarge,
  onHangup,
}) => {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === Role.ADMIN;

  // Supervisor session management
  const supervisorSession = useSupervisorSession();
  const {
    spy,
    whisper,
    barge,
    endSession,
    isSupervising,
    getSupervisionMode,
    isConnecting,
    error: supervisionError,
  } = supervisorSession;

  // Real-time duration counter
  const [liveDuration, setLiveDuration] = useState(call.currentDuration || 0);

  // Update duration every second for connected calls
  useEffect(() => {
    if (call.status === 'connected') {
      const interval = setInterval(() => {
        setLiveDuration((prev) => prev + 1);
      }, 1000);

      return () => clearInterval(interval);
    } else {
      setLiveDuration(call.currentDuration || 0);
    }
  }, [call.status, call.currentDuration]);

  const statusStyling = getStatusStyling(call.status);
  const currentSupervisionMode = getSupervisionMode(call.callId);
  const isCurrentlySupervising = isSupervising(call.callId);

  // Handle supervisor actions
  const handleSupervisionAction = async (mode: SupervisorMode) => {
    const targetExtension = call.extension;
    const targetAgent = call.agent?.name;

    try {
      switch (mode) {
        case 'spy':
          await spy(call.callId, targetExtension, targetAgent);
          onSpy?.(call.callId);
          break;
        case 'whisper':
          await whisper(call.callId, targetExtension, targetAgent);
          onWhisper?.(call.callId);
          break;
        case 'barge':
          await barge(call.callId, targetExtension, targetAgent);
          onBarge?.(call.callId);
          break;
        default:
          throw new Error(`Unknown supervision mode: ${mode}`);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Failed to start ${mode} session:`, error);
    }
  };

  const handleEndSupervision = async () => {
    try {
      await endSession();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to end supervision session:', error);
    }
  };

  // Calculate call start time display
  const getTimeDisplay = () => {
    const startTime = new Date(call.startTime);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - startTime.getTime()) / (1000 * 60));

    if (diffMinutes < 1) return 'Just started';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;

    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    return `${hours}h ${minutes}m ago`;
  };

  // Get supervision mode styling
  const getSupervisionStyling = (mode: SupervisorMode) => {
    switch (mode) {
      case 'spy':
        return {
          color: 'bg-blue-500 text-white',
          icon: 'search',
          label: 'SPY (*2221)',
          description: 'Silent monitoring',
        };
      case 'whisper':
        return {
          color: 'bg-green-500 text-white',
          icon: 'volume',
          label: 'WHISPER (*2222)',
          description: 'Coaching agent',
        };
      case 'barge':
        return {
          color: 'bg-purple-500 text-white',
          icon: 'users',
          label: 'BARGE (*2223)',
          description: 'In conversation',
        };
      case 'scan':
        return {
          color: 'bg-orange-500 text-white',
          icon: 'refresh',
          label: 'SCAN (*2220)',
          description: 'Scanning all calls',
        };
      default:
        return {
          color: 'bg-gray-500 text-white',
          icon: 'search',
          label: 'UNKNOWN',
          description: 'Unknown mode',
        };
    }
  };

  return (
    <Card
      className={`border-l-4 transition-all duration-300 hover:shadow-xl ${
        isCurrentlySupervising
          ? 'border-l-purple-500 ring-2 ring-purple-200'
          : statusStyling.borderColor
      } group hover:scale-[1.02] ${isCurrentlySupervising ? 'bg-gradient-to-br from-purple-50 to-white' : ''}`}
    >
      <div className="p-5">
        {/* Call Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`h-3 w-3 rounded-full ${statusStyling.indicator}`} />
            <div className="flex items-center space-x-2">
              <ApolloIcon
                name={call.direction === 'inbound' ? 'arrow-down' : 'arrow-up'}
                className={`h-4 w-4 ${call.direction === 'inbound' ? 'text-green-600' : 'text-blue-600'}`}
              />
              <span className="text-lg font-semibold text-gray-900">{call.phoneNumber}</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div
              className={`rounded-full border px-3 py-1 text-xs font-medium ${statusStyling.color}`}
            >
              {call.status.replace('_', ' ').toUpperCase()}
            </div>

            {/* Supervision Mode Indicator */}
            {isCurrentlySupervising && currentSupervisionMode && (
              <div
                className={`rounded-full px-2 py-1 text-xs font-bold ${getSupervisionStyling(currentSupervisionMode).color} animate-pulse`}
              >
                <div className="flex items-center space-x-1">
                  <ApolloIcon
                    name={getSupervisionStyling(currentSupervisionMode).icon as any}
                    className="h-3 w-3"
                  />
                  <span>{getSupervisionStyling(currentSupervisionMode).label}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Agent Information */}
        <div className="mb-4 rounded-lg bg-gray-50 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ApolloIcon name="user" className="h-4 w-4 text-gray-600" />
              <span className="font-medium text-gray-900">
                {call.agent?.name || 'Unknown Agent'}
              </span>
            </div>
            <div className="text-sm text-gray-600">Ext: {call.extension}</div>
          </div>

          {call.agent?.project && (
            <div className="mt-2 text-xs text-gray-600">Project: {call.agent.project}</div>
          )}
        </div>

        {/* Call Details */}
        <div className="mb-4 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center space-x-1 text-gray-600">
              <ApolloIcon name="times" className="h-3 w-3" />
              <span>Duration:</span>
            </span>
            <span className="font-mono text-lg font-bold text-gray-900">
              {formatDuration(liveDuration)}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center space-x-1 text-gray-600">
              <ApolloIcon name="calendar" className="h-3 w-3" />
              <span>Started:</span>
            </span>
            <span className="text-gray-700">{getTimeDisplay()}</span>
          </div>

          {call.lead && (
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center space-x-1 text-gray-600">
                <ApolloIcon name="user" className="h-3 w-3" />
                <span>Lead:</span>
              </span>
              <span className="font-medium text-green-700">
                {call.lead.name || call.lead.contact_name || 'N/A'}
              </span>
            </div>
          )}
        </div>

        {/* Supervisor Actions (Admin Only) */}
        {isAdmin && (
          <div className="border-t border-gray-100 pt-4">
            {/* Current Supervision Status */}
            {isCurrentlySupervising && currentSupervisionMode && (
              <div className="mb-3 rounded-lg border border-purple-200 bg-purple-50 p-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <ApolloIcon
                      name={getSupervisionStyling(currentSupervisionMode).icon as any}
                      className="h-4 w-4 text-purple-600"
                    />
                    <span className="text-sm font-medium text-purple-800">
                      {getSupervisionStyling(currentSupervisionMode).description}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="border-red-200 bg-red-50 text-xs text-red-700 hover:bg-red-100"
                    onClick={handleEndSupervision}
                  >
                    End
                  </Button>
                </div>
              </div>
            )}

            {/* Error Display */}
            {supervisionError && (
              <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-2">
                <div className="text-xs text-red-600">{supervisionError}</div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant="secondary"
                className={`flex-1 transition-colors ${
                  currentSupervisionMode === 'spy'
                    ? 'border-blue-300 bg-blue-100 text-blue-800'
                    : 'hover:bg-blue-50 hover:text-blue-700'
                }`}
                onClick={() => handleSupervisionAction('spy')}
                disabled={isConnecting}
              >
                <ApolloIcon name="search" className="mr-1 h-3 w-3" />
                Spy
              </Button>

              <Button
                size="sm"
                variant="secondary"
                className={`flex-1 transition-colors ${
                  currentSupervisionMode === 'whisper'
                    ? 'border-green-300 bg-green-100 text-green-800'
                    : 'hover:bg-green-50 hover:text-green-700'
                }`}
                onClick={() => handleSupervisionAction('whisper')}
                disabled={isConnecting}
              >
                <ApolloIcon name="volume" className="mr-1 h-3 w-3" />
                Whisper
              </Button>

              <Button
                size="sm"
                variant="secondary"
                className={`flex-1 transition-colors ${
                  currentSupervisionMode === 'barge'
                    ? 'border-purple-300 bg-purple-100 text-purple-800'
                    : 'hover:bg-purple-50 hover:text-purple-700'
                }`}
                onClick={() => handleSupervisionAction('barge')}
                disabled={isConnecting}
              >
                <ApolloIcon name="users" className="mr-1 h-3 w-3" />
                Barge
              </Button>

              <Button
                size="sm"
                variant="secondary"
                className="transition-colors hover:bg-red-50 hover:text-red-700"
                onClick={() => onHangup?.(call.callId)}
                disabled={isConnecting}
              >
                <ApolloIcon name="x" className="h-3 w-3" />
              </Button>
            </div>

            {/* Loading Indicator */}
            {isConnecting && (
              <div className="mt-2 flex items-center justify-center space-x-2 text-xs text-blue-600">
                <ApolloIcon name="refresh" className="h-3 w-3 animate-spin" />
                <span>Connecting...</span>
              </div>
            )}

            {/* Quick Action Indicators */}
            {!isCurrentlySupervising && (
              <div className="mt-2 flex items-center justify-center space-x-1 text-xs text-gray-500">
                <span>👁️ Spy</span>
                <span>•</span>
                <span>🎧 Whisper</span>
                <span>•</span>
                <span>📞 Barge</span>
                <span>•</span>
                <span>⏹️ Hangup</span>
              </div>
            )}
          </div>
        )}

        {/* Call Quality Indicator */}
        <div className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100">
          <div className="flex items-center space-x-1">
            <div className="h-1 w-1 rounded-full bg-green-500"></div>
            <div className="h-1 w-1 rounded-full bg-green-500"></div>
            <div className="h-1 w-1 rounded-full bg-green-500"></div>
            <div className="h-1 w-1 rounded-full bg-gray-300"></div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ActiveCallCard;
