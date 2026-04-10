/**
 * Supervisor Session Manager Component
 * Displays active supervisor sessions and provides controls to terminate them
 */

import React, { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import Notification from '@/components/ui/Notification';
import ApolloIcon from '@/components/ui/ApolloIcon';
import toast from '@/components/ui/toast';
import { formatDistanceToNow } from 'date-fns';
import {
  useSupervisorSessions,
  useSupervisorSessionActions,
  SupervisorSession
} from '@/services/hooks/useSupervisorActions';
import { useSafeJsSIP } from '@/hooks/useJsSIP';

interface SupervisorSessionManagerProps {
  className?: string;
}

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  isLoading?: boolean;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  isLoading = false
}) => {
  return (
    <Dialog isOpen={isOpen} onClose={onClose}>
      <div className="p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <ApolloIcon name="alert-triangle" className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600">{description}</p>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <ApolloIcon name="loading" className="w-4 h-4 mr-2 animate-spin" />
                Terminating...
              </>
            ) : (
              'Terminate'
            )}
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

const SessionCard: React.FC<{
  session: SupervisorSession;
  onTerminate: (sessionId: string) => void;
  isTerminating: boolean;
}> = ({ session, onTerminate, isTerminating }) => {
  const getSessionIcon = (type: string) => {
    switch (type) {
      case 'spy': return 'view-list';
      case 'whisper': return 'bubble-question';
      case 'barge': return 'users';
      default: return 'phone';
    }
  };

  const getSessionColor = (type: string) => {
    switch (type) {
      case 'spy': return 'bg-blue-100 text-blue-800';
      case 'whisper': return 'bg-yellow-100 text-yellow-800';
      case 'barge': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSessionLabel = (type: string) => {
    switch (type) {
      case 'spy': return 'Listening';
      case 'whisper': return 'Coaching';
      case 'barge': return 'In Conference';
      default: return type;
    }
  };

  const sessionDuration = formatDistanceToNow(new Date(session.startTime), { addSuffix: false });

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className={`p-2 rounded-full ${getSessionColor(session.type)}`}>
            <ApolloIcon name={getSessionIcon(session.type)} className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <span className="font-medium text-gray-900">
                Extension {session.targetExtension}
              </span>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSessionColor(session.type)}`}>
                {getSessionLabel(session.type)}
              </span>
            </div>
            <p className="text-sm text-gray-600">
              Supervisor: {session.supervisorExtension}
            </p>
            <p className="text-xs text-gray-500">
              Duration: {sessionDuration}
            </p>
          </div>
        </div>

        <Button
          size="sm"
          variant="destructive"
          onClick={() => onTerminate(session.sessionId)}
          disabled={isTerminating}
          className="ml-4"
        >
          {isTerminating ? (
            <ApolloIcon name="loading" className="w-3 h-3 animate-spin" />
          ) : (
            <>
              <ApolloIcon name="phone-decline" className="w-3 h-3 mr-1" />
              End
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export const SupervisorSessionManager: React.FC<SupervisorSessionManagerProps> = ({
  className = ''
}) => {
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: 'single' | 'all';
    sessionId?: string;
  }>({ isOpen: false, type: 'single' });

  // Get JsSIP call data for real-time updates
  const { activeCalls, connections } = useSafeJsSIP();

  // Use more aggressive polling when there are active calls
  const { data: sessionsData, isLoading, error, refetch } = useSupervisorSessions();
  const {
    terminateSession,
    terminateAllSessions,
    isTerminatingSession,
    isTerminatingAll
  } = useSupervisorSessionActions();

  // Real-time updates: Refetch immediately when calls change
  useEffect(() => {
    // Immediate refetch when active calls change
    if (process.env.NODE_ENV === 'development') {
      console.log('📞 [SupervisorSessionManager] Active calls changed:', activeCalls.length, 'calls - refetching supervisor sessions');
    }
    refetch();
  }, [activeCalls.length, refetch]);

  // Also refetch when connections change (new extensions connected)  
  useEffect(() => {
    if (connections.length > 0) {
      refetch();
    }
  }, [connections.length, refetch]);

  // More frequent polling when there are active calls
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    if (activeCalls.length > 0) {
      // Poll every 1 second when there are active calls
      if (process.env.NODE_ENV === 'development') {
        console.log('📞 [SupervisorSessionManager] Starting aggressive polling (1s interval) due to', activeCalls.length, 'active calls');
      }
      intervalId = setInterval(() => {
        refetch();
      }, 1000);
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.log('📞 [SupervisorSessionManager] Stopping aggressive polling - no active calls');
      }
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [activeCalls.length, refetch]);

  const sessions = sessionsData?.data?.sessions || [];
  const hasActiveSessions = sessions.length > 0;

  const handleTerminateSession = async (sessionId: string) => {
    setConfirmDialog({ isOpen: true, type: 'single', sessionId });
  };

  const handleTerminateAll = async () => {
    setConfirmDialog({ isOpen: true, type: 'all' });
  };

  const confirmTerminate = async () => {
    try {
      if (confirmDialog.type === 'all') {
        await terminateAllSessions();
        toast.push(
          <Notification type="success">
            All supervisor sessions terminated successfully
          </Notification>
        );
      } else if (confirmDialog.sessionId) {
        await terminateSession(confirmDialog.sessionId);
        toast.push(
          <Notification type="success">
            Supervisor session terminated successfully
          </Notification>
        );
      }
      setConfirmDialog({ isOpen: false, type: 'single' });
    } catch (error: any) {
      // Failed to terminate session
      toast.push(
        <Notification type="danger">
          {error.message || 'Failed to terminate session'}
        </Notification>
      );
    }
  };

  if (isLoading) {
    return (
      <Card className={`p-4 ${className}`}>
        <div className="flex items-center space-x-3">
          <ApolloIcon name="loading" className="w-5 h-5 animate-spin text-blue-600" />
          <div>
            <span className="text-sm text-gray-600">Loading supervisor sessions...</span>
            {activeCalls.length > 0 && (
              <div className="flex items-center space-x-1 mt-1">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-green-600">
                  {activeCalls.length} active call{activeCalls.length !== 1 ? 's' : ''} detected
                </span>
              </div>
            )}
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`p-4 ${className}`}>
        <div className="flex items-center space-x-3 text-red-600">
          <ApolloIcon name="alert-triangle" className="w-5 h-5" />
          <span className="text-sm">Failed to load supervisor sessions</span>
        </div>
      </Card>
    );
  }

  if (!hasActiveSessions) {
    return (
      <Card className={`p-4 ${className}`}>
        <div className="text-center py-8">
          <ApolloIcon name="phone" className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Sessions</h3>
          <p className="text-sm text-gray-600">
            No supervisor sessions are currently active. Use the spy, whisper, or barge controls to start monitoring calls.
          </p>
          {/* Show real-time call status */}
          {activeCalls.length > 0 && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-blue-800">
                  {activeCalls.length} active call{activeCalls.length !== 1 ? 's' : ''} detected
                </span>
              </div>
              <p className="text-xs text-blue-600 mt-1">
                Use supervisor controls to monitor ongoing calls
              </p>
            </div>
          )}
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className={`p-4 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <ApolloIcon name="view-list" className="w-5 h-5 text-blue-600" />
              {activeCalls.length > 0 && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-medium text-gray-900">Active Supervisor Sessions</h3>
                {activeCalls.length > 0 && (
                  <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                    {activeCalls.length} call{activeCalls.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600">
                {sessions.length} active session{sessions.length !== 1 ? 's' : ''}
                {activeCalls.length > 0 && (
                  <span className="text-green-600 ml-2">
                    • {activeCalls.length} ongoing call{activeCalls.length !== 1 ? 's' : ''}
                  </span>
                )}
              </p>
            </div>
          </div>

          {hasActiveSessions && (
            <Button
              size="sm"
              variant="destructive"
              onClick={handleTerminateAll}
              disabled={isTerminatingAll}
            >
              {isTerminatingAll ? (
                <>
                  <ApolloIcon name="loading" className="w-3 h-3 mr-2 animate-spin" />
                  Ending All...
                </>
              ) : (
                <>
                  <ApolloIcon name="phone-decline" className="w-3 h-3 mr-2" />
                  End All Sessions
                </>
              )}
            </Button>
          )}
        </div>

        <div className="space-y-3">
          {sessions.map((session) => (
            <SessionCard
              key={session.sessionId}
              session={session}
              onTerminate={handleTerminateSession}
              isTerminating={isTerminatingSession}
            />
          ))}
        </div>
      </Card>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, type: 'single' })}
        onConfirm={confirmTerminate}
        title={confirmDialog.type === 'all' ? 'End All Sessions' : 'End Session'}
        description={
          confirmDialog.type === 'all'
            ? `Are you sure you want to terminate all ${sessions.length} active supervisor sessions? This action cannot be undone.`
            : 'Are you sure you want to terminate this supervisor session? This action cannot be undone.'
        }
        isLoading={isTerminatingSession || isTerminatingAll}
      />
    </>
  );
};

export default SupervisorSessionManager;
