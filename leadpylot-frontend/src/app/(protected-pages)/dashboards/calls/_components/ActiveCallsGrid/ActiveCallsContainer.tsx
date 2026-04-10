/**
 * Professional Active Calls Grid Container
 * Responsive grid layout for displaying multiple active call cards
 */

'use client';

import React, { useState } from 'react';
import Card from '@/components/ui/Card';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { ActiveCallCard } from './ActiveCallCard';

// Import the ActiveCall interface (should be shared/exported from a types file in the future)
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

interface ActiveCallsContainerProps {
  activeCalls: ActiveCall[];
  isLoading?: boolean;
  onRefresh?: () => void;
  onSpy?: (callId: string) => void;
  onWhisper?: (callId: string) => void;
  onBarge?: (callId: string) => void;
  onHangup?: (callId: string) => void;
}

export const ActiveCallsContainer: React.FC<ActiveCallsContainerProps> = ({
  activeCalls,
  isLoading = false,
  onRefresh,
  onSpy,
  onWhisper,
  onBarge,
  onHangup
}) => {
  const [sortBy, setSortBy] = useState<'duration' | 'agent' | 'status'>('duration');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Filter and sort calls
  const processedCalls = React.useMemo(() => {
    let filtered = activeCalls;
    
    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(call => call.status === filterStatus);
    }
    
    // Apply sorting
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'duration':
          return (b.currentDuration || 0) - (a.currentDuration || 0);
        case 'agent':
          return (a.agent?.name || '').localeCompare(b.agent?.name || '');
        case 'status':
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });
  }, [activeCalls, sortBy, filterStatus]);

  // Calculate statistics
  const stats = React.useMemo(() => {
    const total = activeCalls.length;
    const connected = activeCalls.filter(call => call.status === 'connected').length;
    const ringing = activeCalls.filter(call => call.status === 'ringing').length;
    const initiated = activeCalls.filter(call => call.status === 'initiated').length;
    const onHold = activeCalls.filter(call => call.status === 'on_hold').length;
    
    return { total, connected, ringing, initiated, onHold };
  }, [activeCalls]);

  return (
    <div className="space-y-6">
      {/* Header with Stats and Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Active Calls ({stats.total})
          </h2>
          
          {/* Live Stats */}
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-gray-600">{stats.connected} Connected</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
              <span className="text-gray-600">{stats.ringing} Ringing</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-gray-600">{stats.initiated} Initiating</span>
            </div>
            {stats.onHold > 0 && (
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <span className="text-gray-600">{stats.onHold} On Hold</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Filter Dropdown */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="connected">Connected</option>
            <option value="ringing">Ringing</option>
            <option value="initiated">Initiating</option>
            <option value="on_hold">On Hold</option>
          </select>

          {/* Sort Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'duration' | 'agent' | 'status')}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="duration">Sort by Duration</option>
            <option value="agent">Sort by Agent</option>
            <option value="status">Sort by Status</option>
          </select>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            className="flex items-center space-x-2 px-3 py-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            disabled={isLoading}
          >
            <ApolloIcon 
              name="refresh" 
              className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} 
            />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Active Calls Grid */}
      {processedCalls.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
          {processedCalls.map((call) => (
            <ActiveCallCard
              key={call.callId}
              call={call}
              onSpy={onSpy}
              onWhisper={onWhisper}
              onBarge={onBarge}
              onHangup={onHangup}
            />
          ))}
        </div>
      ) : (
        /* Empty State */
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center space-y-6">
            <div className="p-6 bg-gray-100 rounded-full">
              <ApolloIcon name="phone" className="w-12 h-12 text-gray-400" />
            </div>
            <div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">
                {filterStatus === 'all' ? 'No Active Calls' : `No ${filterStatus.replace('_', ' ')} Calls`}
              </h3>
              <p className="text-gray-600 max-w-md">
                {filterStatus === 'all' 
                  ? 'All agents are currently available. Active calls will appear here in real-time when they start.'
                  : `There are no calls with "${filterStatus.replace('_', ' ')}" status at the moment.`
                }
              </p>
            </div>
            
            {/* Live Monitoring Indicator */}
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Live monitoring active</span>
            </div>
          </div>
        </Card>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-10 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-xl">
            <div className="flex items-center space-x-3">
              <ApolloIcon name="refresh" className="w-6 h-6 animate-spin text-blue-600" />
              <span className="text-lg font-medium">Refreshing calls...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActiveCallsContainer;
