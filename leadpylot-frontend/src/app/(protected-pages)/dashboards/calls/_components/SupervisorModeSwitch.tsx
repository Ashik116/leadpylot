/**
 * Enhanced Supervisor Mode Switch Component
 * Provides seamless switching between spy/whisper/barge modes
 * Automatically terminates previous sessions when switching
 */

'use client';

import React, { useState, useMemo, useCallback } from 'react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { useSupervisorActions, useSupervisorSessions, useSupervisorSessionActions } from '@/services/hooks/useSupervisorActions';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';

type SupervisorMode = 'spy' | 'whisper' | 'barge' | null;

interface SupervisorModeSwitchProps {
  call: any;
  disabled?: boolean;
  className?: string;
}

interface ModeConfig {
  id: SupervisorMode;
  label: string;
  icon: string;
  color: string;
  bgColor: string;
  description: string;
  featureCode: string;
}

const MODES: ModeConfig[] = [
  {
    id: 'spy',
    label: 'Listen',
    icon: 'eye',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 border-blue-200',
    description: 'Listen to the call silently',
    featureCode: '*2221'
  },
  {
    id: 'whisper',
    label: 'Whisper',
    icon: 'message-circle',
    color: 'text-green-600',
    bgColor: 'bg-green-50 border-green-200',
    description: 'Speak privately to the agent',
    featureCode: '*2222'
  },
  {
    id: 'barge',
    label: 'Barge',
    icon: 'users',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 border-orange-200',
    description: 'Join the conversation',
    featureCode: '*2223'
  }
];

export const SupervisorModeSwitch: React.FC<SupervisorModeSwitchProps> = ({
  call,
  disabled = false,
  className = ''
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [justification, setJustification] = useState('');
  const [showJustificationModal, setShowJustificationModal] = useState(false);
  const [pendingMode, setPendingMode] = useState<SupervisorMode>(null);

  const {
    spyOnCall,
    whisperToAgent,
    bargeIntoCall
  } = useSupervisorActions();

  const { terminateSession } = useSupervisorSessionActions();
  const { data: sessionsData, refetch: refetchSessions } = useSupervisorSessions();

  // Get current active session for this call
  const currentSession = useMemo(() => {
    const sessions = sessionsData?.data?.sessions || [];
    const callExtension = call.extension;
    
    // Find the most recent active session for this target extension
    const activeSessions = sessions.filter(session => 
      session.targetExtension === callExtension && 
      session.status === 'active'
    );
    
    // Sort by start time (most recent first) and return the latest
    return activeSessions.sort((a, b) => 
      new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    )[0];
  }, [sessionsData, call.extension]);

  // Get ALL active sessions for this supervisor (to terminate when switching)
  const allActiveSessions = useMemo(() => {
    const sessions = sessionsData?.data?.sessions || [];
    return sessions.filter(session => session.status === 'active');
  }, [sessionsData]);

  const currentMode: SupervisorMode = currentSession?.type || null;
  const hasAnyActiveSession = allActiveSessions.length > 0;

  // Handle mode switching with automatic termination
  const handleModeSwitch = useCallback(async (newMode: SupervisorMode) => {
    if (disabled || isLoading) return;

    // If clicking the same mode, do nothing
    if (newMode === currentMode) return;

    setPendingMode(newMode);
    setShowJustificationModal(true);
  }, [currentMode, disabled, isLoading]);

  const executeModeSwitch = useCallback(async (newMode: SupervisorMode, justificationText: string) => {
    if (!newMode || !justificationText.trim()) return;

    setIsLoading(true);
    
    try {
      const callIdentifier = call.callId || call.uniqueId;
      
      if (!callIdentifier) {
        throw new Error('No call identifier available');
      }

      // Step 1: Terminate ALL active supervisor sessions before starting new one
      if (allActiveSessions.length > 0) {
        try {
          // Terminate all active sessions for this supervisor
          const terminationPromises = allActiveSessions.map(session => 
            terminateSession(session.sessionId).catch(() => {
              // Ignore individual termination failures
            })
          );
          
          // Wait for all terminations to complete
          await Promise.all(terminationPromises);
          
          // Wait a bit for all sessions to fully terminate
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Refresh sessions to get updated state
          await refetchSessions();
        } catch {
          // Even if termination fails, proceed with new session
        }
      }

      // Step 2: Start new session
      switch (newMode) {
        case 'spy':
          await spyOnCall({ callId: callIdentifier, justification: justificationText });
          break;
        case 'whisper':
          await whisperToAgent({ callId: callIdentifier, justification: justificationText });
          break;
        case 'barge':
          await bargeIntoCall({ callId: callIdentifier, justification: justificationText });
          break;
        default:
          throw new Error(`Unknown mode: ${newMode}`);
      }

      // Success notification
      const modeConfig = MODES.find(m => m.id === newMode);
      const terminatedCount = allActiveSessions.length;
      
      toast.push(
        <Notification type="success">
          {terminatedCount > 0 
            ? `Terminated ${terminatedCount} session${terminatedCount > 1 ? 's' : ''} and activated ${modeConfig?.label} mode`
            : `${modeConfig?.label} mode activated`
          }
        </Notification>
      );

      // Refresh sessions to show new state
      setTimeout(() => refetchSessions(), 1000);

    } catch (error: any) {
      toast.push(
        <Notification type="danger">
          Failed to switch to {newMode} mode: {error.message}
        </Notification>
      );
    } finally {
      setIsLoading(false);
      setShowJustificationModal(false);
      setPendingMode(null);
      setJustification('');
    }
  }, [call, allActiveSessions, spyOnCall, whisperToAgent, bargeIntoCall, terminateSession, refetchSessions]);

  const handleStopSession = useCallback(async () => {
    if (allActiveSessions.length === 0 || isLoading) return;

    setIsLoading(true);
    
    try {
      // Terminate all active sessions
      const terminationPromises = allActiveSessions.map(session => 
        terminateSession(session.sessionId).catch(() => {
          // Ignore individual failures
        })
      );
      
      await Promise.all(terminationPromises);
      
      toast.push(
        <Notification type="success">
          {allActiveSessions.length > 1 
            ? `Terminated ${allActiveSessions.length} supervisor sessions`
            : `${allActiveSessions[0].type} session terminated`
          }
        </Notification>
      );

      // Refresh sessions
      setTimeout(() => refetchSessions(), 500);

    } catch (error: any) {
      toast.push(
        <Notification type="danger">
          Failed to terminate sessions: {error.message}
        </Notification>
      );
    } finally {
      setIsLoading(false);
    }
  }, [allActiveSessions, terminateSession, refetchSessions, isLoading]);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Current Status */}
      {allActiveSessions.length > 0 && (
        <div className="space-y-2">
          {allActiveSessions.map((session, index) => (
            <div key={session.sessionId} className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-blue-900">
                  {MODES.find(m => m.id === session.type)?.label} Mode on Ext. {session.targetExtension}
                </span>
              </div>
              {index === 0 && ( // Only show stop button on first session
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleStopSession}
                  disabled={isLoading}
                  className="text-xs"
                >
                  <ApolloIcon name="x" className="w-3 h-3 mr-1" />
                  Stop All ({allActiveSessions.length})
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Mode Selector */}
      <Card className="p-4">
        <div className="mb-3">
          <h4 className="text-sm font-medium text-gray-900 mb-1">Supervisor Mode</h4>
          <p className="text-xs text-gray-600">
            {hasAnyActiveSession ? `Switch to a different mode (${allActiveSessions.length} active session${allActiveSessions.length > 1 ? 's' : ''} will end automatically)` : 'Select a supervision mode to begin monitoring'}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {MODES.map((mode) => {
            const isActive = currentMode === mode.id;
            const isDisabled = disabled || isLoading;

            return (
              <button
                key={mode.id}
                onClick={() => handleModeSwitch(mode.id)}
                disabled={isDisabled || isActive}
                className={`
                  relative p-3 rounded-lg border-2 transition-all duration-200
                  ${isActive 
                    ? `${mode.bgColor} border-current ${mode.color} shadow-sm` 
                    : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
                  }
                  ${isDisabled && !isActive ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  ${isActive ? 'cursor-default' : ''}
                `}
              >
                <div className="flex flex-col items-center space-y-2">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center
                    ${isActive ? 'bg-white shadow-sm' : 'bg-gray-100'}
                  `}>
                    <ApolloIcon 
                      name={mode.icon as any} 
                      className={`w-4 h-4 ${isActive ? mode.color : 'text-gray-600'}`} 
                    />
                  </div>
                  <div className="text-center">
                    <div className={`text-xs font-medium ${isActive ? mode.color : 'text-gray-700'}`}>
                      {mode.label}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {mode.featureCode}
                    </div>
                  </div>
                </div>

                {isActive && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                )}

                {isLoading && pendingMode === mode.id && (
                  <div className="absolute inset-0 bg-white/80 rounded-lg flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Quick descriptions */}
        <div className="mt-3 space-y-1">
          {MODES.map((mode) => (
            <div key={`desc-${mode.id}`} className="flex items-center space-x-2 text-xs text-gray-600">
              <ApolloIcon name={mode.icon as any} className="w-3 h-3" />
              <span className="font-medium">{mode.label}:</span>
              <span>{mode.description}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Justification Modal */}
      {showJustificationModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <ApolloIcon name="shield" className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Switch to {MODES.find(m => m.id === pendingMode)?.label} Mode
                  </h3>
                  <p className="text-sm text-gray-600">
                    {hasAnyActiveSession && `${allActiveSessions.length} active session${allActiveSessions.length > 1 ? 's' : ''} will be terminated automatically`}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Justification <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    placeholder="Provide a business justification for this supervisor action..."
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-3">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setShowJustificationModal(false);
                      setPendingMode(null);
                      setJustification('');
                    }}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="default"
                    onClick={() => executeModeSwitch(pendingMode, justification)}
                    disabled={isLoading || !justification.trim()}
                    className="flex-1"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Switching...
                      </>
                    ) : (
                      `Switch to ${MODES.find(m => m.id === pendingMode)?.label}`
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default SupervisorModeSwitch;
