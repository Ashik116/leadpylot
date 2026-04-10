'use client';

import Badge from '@/components/ui/Badge';
import { usePhoneUIStore } from '@/stores/phoneUIStore';
import { useSelectedProjectStore } from '@/stores/selectedProjectStore';
import withHeaderItem from '@/utils/hoc/withHeaderItem';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useSafeJsSIP, SessionState } from '@/hooks/useJsSIP';
import { CallCenter } from './CallCenter';
import PhoneToggle from './PhoneToggle';
import useBrowserNotification from '@/utils/hooks/useBrowserNotification';
import { useIncomingCall, useOutgoingCall } from '@/services/hooks/useCalls';
import { useAgentExtensionSync } from '@/services/hooks/useAgentExtensionSync';
import { callMonitor } from '@/utils/callMonitoring';
import IncomingCallOverlay from './IncomingCallOverlay';
// import { isDev } from '@/utils/utils';
import { useSession } from '@/hooks/useSession';
import { Role } from '@/configs/navigation.config/auth.route.config';
import { useGlobalAdminSIP } from '@/hooks/useGlobalAdminSIP';
import { useAgentAllExtensions } from '@/hooks/useAgentAllExtensions';
import { useMultiExtensionSync } from '@/hooks/useMultiExtensionSync';

const SIPWrapper = ({ onIncomingCall, hasIncomingOverlay }: { onIncomingCall: (callerId?: string) => void; hasIncomingOverlay?: boolean }) => {
  const { connectToExtension, connectStatus, sessions, isInitialized } = useSafeJsSIP();
  const { data: session } = useSession();
  const { selectedProject } = useSelectedProjectStore();
  const { adminCredentials } = useGlobalAdminSIP();
  // console.log('selectedProject', selectedProject);
  // For agents: use ALL available extensions globally
  // For admins: use global admin credentials
  const isAdmin = session?.user?.role === Role.ADMIN;
  const { allExtensions } = useAgentAllExtensions();

  // Single extension per user - no project switching needed

  const lastIncomingId = useRef<string | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectionAttempts = useRef(0);

  // Track connection states for multiple extensions
  const extensionConnectionStates = useRef<
    Record<
      string,
      {
        connected: boolean;
        attempts: number;
        timeout: NodeJS.Timeout | null;
      }
    >
  >({});
  const currentConnectedExtensions = useRef<string[]>([]);
  const [connectedExtensionsState, setConnectedExtensionsState] = useState<string[]>([]);

  // Keep extension sync for backward compatibility (may be needed by other components)
  useAgentExtensionSync();

  // NEW: Sync ALL connected extensions with AMI service for admin dashboard visibility
  useMultiExtensionSync(connectedExtensionsState);

  // UPDATED: Single active connection approach (react-sipjs doesn't support multiple simultaneous connections)
  const connectToSpecificExtension = useCallback(
    async (targetExtension: string) => {
      // For admins, skip connection since global connection is already established
      if (isAdmin) {
        // console.log('📞 Admin using global SIP connection, skipping local connection');
        return;
      }

      if (!allExtensions || allExtensions.length === 0) {
        // console.warn('📞 No agent extensions available for connection');
        return;
      }

      // Find the target extension info
      const extensionInfo = allExtensions.find((ext) => ext.extension === targetExtension);
      if (!extensionInfo) {
        // console.error(`❌ Extension ${targetExtension} not found in available extensions`);
        return;
      }

      // console.log(
      //   `📞 Connecting to single extension: ${targetExtension} (${extensionInfo.projectName})...`
      // );

      try {
        // Connect to the specific extension
        await connectToExtension(
          extensionInfo.extension,
          extensionInfo.password,
          extensionInfo.extension
        );

        // Update connection state
        currentConnectedExtensions.current = [targetExtension];
        setConnectedExtensionsState([targetExtension]);
        connectionAttempts.current = 0;

        extensionConnectionStates.current[targetExtension] = {
          connected: true,
          attempts: 0,
          timeout: null,
        };

        // console.log(
        //   `✅ Successfully connected to extension: ${targetExtension} (${extensionInfo.projectName})`
        // );
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(
          `❌ Failed to connect to extension ${targetExtension} (${extensionInfo.projectName}):`,
          error
        );

        extensionConnectionStates.current[targetExtension] = {
          connected: false,
          attempts: 1,
          timeout: null,
        };

        throw error;
      }
    },
    [allExtensions, connectToExtension, isAdmin]
  );

  // Helper function to report current connection status
  const logConnectionStatus = useCallback(() => {
    if (currentConnectedExtensions.current.length === 0) {
      // console.log('📞 Connection Status: No extensions connected');
      return;
    }

    // const connectedList = currentConnectedExtensions.current
    //   .map((ext) => {
    //     const extensionInfo = allExtensions.find((e) => e.extension === ext);
    //     return extensionInfo ? `${ext} (${extensionInfo.projectName})` : ext;
    //   })
    //   .join(', ');

    // console.log(
    //   `📞 Connection Status: Connected to ${currentConnectedExtensions.current.length}/${totalExtensions} extensions: ${connectedList}`
    // );
  }, []);

  // Auto-connect for agents: triggers when the provider is ready and there's
  // no active connection. Uses connectStatus (derived from real JsSIP state)
  // instead of a ref, so it correctly retries after provider re-mounts.
  useEffect(() => {
    if (isAdmin || allExtensions.length === 0 || !isInitialized) return;
    if (connectStatus !== 'DISCONNECTED') return;

    connectToSpecificExtension(allExtensions[0].extension);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allExtensions.length, isAdmin, isInitialized, connectStatus]);

  // No project-change effect needed - single extension stays connected across all projects

  // JsSIP handles reconnection internally via connection_recovery_max_interval.
  // No manual reconnect needed here — it was causing a reconnect loop.

  useEffect(() => {
    const keys = Object.keys(sessions);

    // Log all session changes so we can see what's happening
    if (keys.length > 0) {
      console.log('[SIPWrapper] Sessions update:', keys.length, 'sessions',
        keys.map(k => ({ id: k, state: sessions[k]?.state, remote: sessions[k]?.remoteIdentity?.uri?.user }))
      );
    }

    if (!keys.length) return;

    // Check ALL sessions for incoming calls, not just the last one
    for (const key of keys) {
      const session = sessions[key];
      const isIncoming =
        session.state === 'Initial' ||
        session.state === 'Incoming' ||
        session.state === SessionState.Initial ||
        session.state === SessionState.Incoming;

      if (isIncoming && key !== lastIncomingId.current) {
        lastIncomingId.current = key;

        const remoteUri = session.remoteIdentity?.uri?.user || '';
        const fullUri = session.remoteIdentity?.uri?.toString() || '';

        console.log('[SIPWrapper] Incoming call detected:', { id: key, remoteUri, state: session.state });

        // Only skip calls that use supervisor feature codes (*222x)
        const isSupervisorFeatureCode =
          remoteUri.startsWith('*2221') ||
          remoteUri.startsWith('*2222') ||
          remoteUri.startsWith('*2223') ||
          remoteUri.startsWith('*2220') ||
          fullUri.includes('*222');

        if (isSupervisorFeatureCode) {
          console.log('[SIPWrapper] Skipping supervisor feature code call');
          return;
        }

        const callerId = session.remoteIdentity?.uri?.user || session.remoteIdentity?.displayName;
        console.log('[SIPWrapper] Calling onIncomingCall with:', callerId);
        onIncomingCall(callerId);
        break;
      }
    }
  }, [sessions, onIncomingCall]);

  // Single extension per user for both agents and admins
  const callerId = session?.user?.voip_extension || adminCredentials.voip_username || allExtensions[0]?.extension;
  
  return (
    <CallCenter callerId={callerId} hideActiveCall={hasIncomingOverlay} />
  );
};

const PhoneBefore = () => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { isOpen, setPhoneUIState, leadId, projectId } = usePhoneUIStore();
  const { sessions } = useSafeJsSIP();
  const [callDuration, setCallDuration] = useState<string>('');
  const [callStatus, setCallStatus] = useState<'idle' | 'incoming' | 'outgoing' | 'established'>(
    'idle'
  );
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const callStartTimeRef = useRef<Date | null>(null);
  const lastIncomingId = useRef<string | null>(null);
  const { selectedProject } = useSelectedProjectStore();
  const { mutate: storeIncomingCall } = useIncomingCall();
  const { mutate: storeOutgoingCall } = useOutgoingCall();
  const currentCallerIdRef = useRef<string | null>(null);
  const callDurationSecondsRef = useRef<number>(0);
  const outgoingCallDataRef = useRef<{
    leadId: string;
    projectId: string;
    phoneNumber: string;
  } | null>(null);

  // Function to format time in MM:SS format
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Enhanced session state tracking with better error handling and logging
  useEffect(() => {
    const sessionKeys = Object.keys(sessions);

    // if (isDev) {
    //   // eslint-disable-next-line no-console
    //   console.log('📞 Session update - Total sessions:', sessionKeys.length);
    // }

    // Filter out supervisor sessions for call status tracking
    const nonSupervisorSessions = sessionKeys.filter((key) => {
      const session = sessions[key];
      const remoteUri = session?.remoteIdentity?.uri?.user || '';
      const isSupervisorCall =
        remoteUri.startsWith('*2221') ||
        remoteUri.startsWith('*2222') ||
        remoteUri.startsWith('*2223') ||
        remoteUri.startsWith('*2220');
      return !isSupervisorCall;
    });

    // If no non-supervisor sessions exist, reset to idle state
    if (nonSupervisorSessions.length === 0) {
      // if (isDev) {
      //   console.log('📞 No active non-supervisor sessions, resetting to idle');
      // }
      
      // Clean up timers and reset state first (ref updates are safe)
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      callStartTimeRef.current = null;
      callDurationSecondsRef.current = 0;
      
      // Schedule state updates to avoid synchronous setState in effect
      if (callStatus !== 'idle') {
        Promise.resolve().then(() => {
          setCallStatus('idle');
          setCallDuration('');
        });
      }
      return;
    }

    // Find the most recent non-supervisor session that's not terminated
    const activeSessionKeys = nonSupervisorSessions.filter((key) => {
      const session = sessions[key];
      return session.state !== SessionState.Terminated;
    });

    // If all non-supervisor sessions are terminated, handle cleanup
    if (activeSessionKeys.length === 0) {
      const terminatedSessions = nonSupervisorSessions.filter(
        (key) => sessions[key].state === SessionState.Terminated
      );

      if (terminatedSessions.length > 0) {
        // if (isDev) {
        //   console.log('📞 All sessions terminated, handling call end cleanup');
        // }
        
        // Only update status if it's not already idle
        if (callStatus !== 'idle') {
          Promise.resolve().then(() => {
            setCallStatus('idle');
          });
        }

        // Store call data if we have it
        if (outgoingCallDataRef.current) {
          // if (isDev) {
          //   console.log('📞 Storing outgoing call data:', outgoingCallDataRef.current);
          // }

          // Monitor call completion
          callMonitor.logEvent({
            type: 'call_ended',
            sessionId: terminatedSessions[terminatedSessions.length - 1],
            leadId: outgoingCallDataRef.current.leadId,
            phoneNumber: outgoingCallDataRef.current.phoneNumber,
            duration: callDurationSecondsRef.current,
            metadata: {
              callType: 'outgoing',
              status: 'completed',
            },
          });

          storeOutgoingCall({
            lead_id: outgoingCallDataRef.current.leadId,
            project_id: outgoingCallDataRef.current.projectId,
            call_duration: callDurationSecondsRef.current,
            call_status: 'completed',
            phone_number: outgoingCallDataRef.current.phoneNumber,
          });
          outgoingCallDataRef.current = null;
          setPhoneUIState({ leadId: null, projectId: null });
        } else if (currentCallerIdRef.current && selectedProject?._id) {
          // if (isDev) {
          //   console.log('📞 Storing incoming call data');
          // }

          // Monitor incoming call completion
          callMonitor.logEvent({
            type: 'call_ended',
            sessionId: terminatedSessions[terminatedSessions.length - 1],
            phoneNumber: currentCallerIdRef.current,
            duration: callDurationSecondsRef.current,
            metadata: {
              callType: 'incoming',
              status: 'completed',
            },
          });

          storeIncomingCall({
            lead_id: leadId ?? '',
            project_id: selectedProject._id,
            call_duration: callDurationSecondsRef.current,
            call_status: 'completed',
            phone_number: currentCallerIdRef.current,
          });
          currentCallerIdRef.current = null;
        }

        // Clean up
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        callStartTimeRef.current = null;
        callDurationSecondsRef.current = 0;
        Promise.resolve().then(() => {
          setCallDuration('');
        });
      }
      return;
    }

    // Get the most recent active session
    const latestActiveKey = activeSessionKeys[activeSessionKeys.length - 1];
    const latestSession = sessions[latestActiveKey];

    // if (isDev) {
    //   // eslint-disable-next-line no-console
    //   console.log('📞 Latest session state:', latestSession.state, 'ID:', latestActiveKey);
    // }

    // Handle different session states with improved logic
    switch (latestSession.state) {
      case SessionState.Initial:
        const isIncoming = latestActiveKey === lastIncomingId.current;

        if (isIncoming) {
          // if (isDev) {
          //   console.log('📞 Incoming call detected');
          // }
          if (callStatus !== 'incoming') {
            Promise.resolve().then(() => {
              setCallStatus('incoming');
            });
          }
          outgoingCallDataRef.current = null; // Clear outgoing data

          // Monitor incoming call
          callMonitor.logEvent({
            type: 'session_state_change',
            sessionId: latestActiveKey,
            sessionState: 'incoming',
            metadata: { callType: 'incoming' },
          });
        } else {
          // if (isDev) {
          //   console.log('📞 Outgoing call initiated');
          // }
          if (callStatus !== 'outgoing') {
            Promise.resolve().then(() => {
              setCallStatus('outgoing');
            });
          }

          // Store outgoing call data if available
          if (leadId && projectId) {
            const phoneNumber = latestSession.remoteIdentity?.uri?.user || '';
            outgoingCallDataRef.current = {
              leadId,
              projectId,
              phoneNumber,
            };
            // if (isDev) {
            //   console.log('📞 Stored outgoing call data for lead:', leadId);
            // }
            currentCallerIdRef.current = null; // Clear incoming data

            // Monitor outgoing call session
            callMonitor.logEvent({
              type: 'session_state_change',
              sessionId: latestActiveKey,
              leadId,
              phoneNumber,
              sessionState: 'outgoing_initial',
              metadata: { callType: 'outgoing' },
            });
          }
        }

        // Reset timer for non-established calls
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        callStartTimeRef.current = null;
        Promise.resolve().then(() => {
          setCallDuration('');
        });
        break;

      case SessionState.Establishing:
        // if (isDev) {
        //   console.log('📞 Call establishing/ringing');
        // }
        if (callStatus !== 'outgoing') {
          Promise.resolve().then(() => {
            setCallStatus('outgoing');
          });
        }

        // Monitor establishing state
        callMonitor.logEvent({
          type: 'session_state_change',
          sessionId: latestActiveKey,
          sessionState: 'establishing',
          metadata: { sipState: 'establishing' },
        });

        // Don't clear the timer if we're still establishing - just keep waiting
        break;

      case SessionState.Established:
        // if (isDev) {
        //   console.log('📞 Call established');
        // }
        if (callStatus !== 'established') {
          Promise.resolve().then(() => {
            setCallStatus('established');
          });
        }

        // Monitor call establishment
        callMonitor.logEvent({
          type: 'call_established',
          sessionId: latestActiveKey,
          sessionState: 'established',
          metadata: {
            sipState: 'established',
            leadId: outgoingCallDataRef.current?.leadId,
            phoneNumber: outgoingCallDataRef.current?.phoneNumber,
          },
        });

        // Start timing if not already started
        if (!timerRef.current) {
          if (!callStartTimeRef.current) {
            callStartTimeRef.current = new Date();
            Promise.resolve().then(() => {
              setCallDuration('00:00');
            });
            // if (isDev) {
            //   console.log('📞 Started call timer');
            // }
          }

          timerRef.current = setInterval(() => {
            if (callStartTimeRef.current) {
              const now = new Date();
              const durationInSeconds = Math.floor(
                (now.getTime() - callStartTimeRef.current.getTime()) / 1000
              );
              callDurationSecondsRef.current = durationInSeconds;
              setCallDuration(formatTime(durationInSeconds));
            }
          }, 1000);
        }
        break;

      case SessionState.Terminating:
        // if (isDev) {
        //   console.log('📞 Call terminating - maintaining current status');
        // }

        // Monitor call termination
        callMonitor.logEvent({
          type: 'session_state_change',
          sessionId: latestActiveKey,
          sessionState: 'terminating',
          duration: callDurationSecondsRef.current,
          metadata: { sipState: 'terminating' },
        });

        // Keep current status while terminating to avoid premature cleanup
        break;

      default:
        // if (isDev) {
        //   console.warn('📞 Unknown session state:', latestSession.state);
        // }
        break;
    }

    // Cleanup on unmount
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [
    sessions,
    leadId,
    projectId,
    selectedProject?._id,
    storeIncomingCall,
    storeOutgoingCall,
    setPhoneUIState,
    callStatus,
  ]);

  const toggleDropdown = () => {
    setPhoneUIState({ isOpen: !isOpen });
  };

  const { notifyIncomingCall } = useBrowserNotification();
  const [incomingCallerId, setIncomingCallerId] = useState<string | null>(null);

  const handleIncomingCall = (callerId?: string) => {
    if (callerId) {
      currentCallerIdRef.current = callerId;
    }

    if (!document.hasFocus()) {
      notifyIncomingCall(callerId || 'Unknown');
    }

    setIncomingCallerId(callerId || 'Unknown');
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const isFormElement =
        ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(target.tagName) ||
        target.isContentEditable ||
        target.closest('input, select, textarea, button, [contenteditable="true"]');

      // Prevent closing during active calls (incoming, outgoing, or established)
      const hasActiveCall = callStatus !== 'idle';

      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !isFormElement &&
        !hasActiveCall // Don't close if there's an active call
      ) {
        setPhoneUIState({ isOpen: false });
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, setPhoneUIState, callStatus]);

  return (
    <>
      {/* Incoming call overlay */}
      {incomingCallerId && (
        <IncomingCallOverlay
          callerId={incomingCallerId}
          onDismiss={() => setIncomingCallerId(null)}
        />
      )}

      <div className="relative" ref={dropdownRef}>
        <div onClick={toggleDropdown} style={{ cursor: 'pointer' }}>
          {callStatus === 'established' && callDuration ? (
            <Badge
              content={callDuration}
              maxCount={Infinity}
              innerClass="bg-moss-2 text-white text-xs font-bold px-1 py-0.5"
            >
              <PhoneToggle />
            </Badge>
          ) : callStatus === 'incoming' ? (
            <Badge innerClass="bg-rust animate-ping">
              <PhoneToggle />
            </Badge>
          ) : callStatus === 'outgoing' ? (
            <Badge innerClass="bg-ocean-2 animate-ping">
              <PhoneToggle />
            </Badge>
          ) : (
            <PhoneToggle />
          )}
        </div>

        <div
          className={`border-sand-3 absolute right-0 z-[9999] mt-2 max-h-[calc(100vh-100px)] overflow-y-auto rounded-2xl border bg-white shadow-xl ${!isOpen ? 'hidden' : ''} `}
        >
          <SIPWrapper onIncomingCall={handleIncomingCall} hasIncomingOverlay={!!incomingCallerId} />
        </div>
      </div>
    </>
  );
};

const Phone = withHeaderItem(PhoneBefore);
export default Phone;
