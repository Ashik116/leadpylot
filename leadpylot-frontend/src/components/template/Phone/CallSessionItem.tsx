import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { usePhoneUIStore } from '@/stores/phoneUIStore';
import { Avatar } from '../../../components/ui/Avatar';
import { useEffect, useRef, useState, useMemo } from 'react';
import useCallAudio from '@/utils/hooks/useCallAudio';
import { useSafeJsSIP, SessionState } from '@/hooks/useJsSIP';

export const CallSessionItem = ({ sessionId }: { sessionId?: string }) => {
  const contactName = usePhoneUIStore((s) => s.contactName);
  const { sessions, terminateCall, answerCall } = useSafeJsSIP();
  const { stopSounds } = useCallAudio();
  const [callDuration, setCallDuration] = useState<string>('00:00');
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const callStartTimeRef = useRef<Date | null>(null);
  const isUnmountedRef = useRef(false);

  // Use the provided sessionId or find the active session (not terminated or terminating)
  const activeSessionKey = useMemo(() => {
    return (
      sessionId ||
      Object.keys(sessions).find((key) => {
        const session = sessions[key];
        return ![SessionState.Terminating, SessionState.Terminated].includes(session.state);
      })
    );
  }, [sessionId, sessions]);

  const activeSession = useMemo(() => {
    return activeSessionKey ? sessions[activeSessionKey] : null;
  }, [activeSessionKey, sessions]);

  // ✅ Enhanced timer logic that works regardless of exact state matching
  useEffect(() => {
    // Clear any existing timer first
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Start timer if we have an active session that's connected/established
    if (activeSession) {
      const isCallActive =
        activeSession.state === SessionState.Established ||
        activeSession.state === 'Established' ||
        activeSession.state === 'established' ||
        (activeSession.state && activeSession.state.toLowerCase().includes('established'));

      console.log('🕐 CallSessionItem Timer Debug:', {
        sessionId: activeSession.id,
        sessionState: activeSession.state,
        isCallActive,
        hasStartTime: !!activeSession.startTime,
        timerRunning: !!timerRef.current,
      });

      if (isCallActive && activeSession.startTime) {
        // Use the session's actual start time instead of creating a new one
        const sessionStartTime = new Date(activeSession.startTime);
        callStartTimeRef.current = sessionStartTime;

        console.log(
          '✅ Starting enhanced timer for session:',
          activeSession.id,
          'started at:',
          sessionStartTime
        );

        // Calculate initial duration
        const now = new Date();
        const initialDurationInSeconds = Math.floor(
          (now.getTime() - sessionStartTime.getTime()) / 1000
        );
        const initialMins = Math.floor(initialDurationInSeconds / 60);
        const initialSecs = initialDurationInSeconds % 60;
        const initialDuration = `${initialMins.toString().padStart(2, '0')}:${initialSecs.toString().padStart(2, '0')}`;
        // Use setTimeout to defer state update outside of render cycle
        const timeoutId = setTimeout(() => {
          setCallDuration(initialDuration);
        }, 0);
        return () => clearTimeout(timeoutId);

        // Start the interval timer
        timerRef.current = setInterval(() => {
          if (!isUnmountedRef.current && callStartTimeRef.current) {
            const now = new Date();
            const durationInSeconds = Math.floor(
              (now.getTime() - callStartTimeRef.current.getTime()) / 1000
            );
            const mins = Math.floor(durationInSeconds / 60);
            const secs = durationInSeconds % 60;
            const formattedDuration = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            setCallDuration(formattedDuration);

            // Debug log every 10 seconds
            if (durationInSeconds % 10 === 0 && process.env.NODE_ENV === 'development') {
              console.log(
                '⏱️ Enhanced timer update:',
                formattedDuration,
                'for session',
                activeSession.id
              );
            }
          }
        }, 1000);
      } else {
        // Call not active, reset duration
        setCallDuration('00:00');
        callStartTimeRef.current = null;
        console.log('🛑 Call not active, state:', activeSession.state);
      }
    } else {
      // No active session
      setCallDuration('00:00');
      callStartTimeRef.current = null;
      console.log('🛑 No active session');
    }
  }, [activeSession]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      isUnmountedRef.current = true;
      stopSounds();
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [stopSounds]);

  // If no active session, don't render
  if (!activeSession) {
    return null;
  }

  // Get call status text based on session state
  const getCallStatusText = () => {
    switch (activeSession.state) {
      case SessionState.Initial:
        return 'Connecting...';
      case SessionState.Incoming:
        return 'Incoming call...';
      case SessionState.Establishing:
        return 'Calling...';
      case SessionState.Established:
        return `Connected • ${callDuration}`;
      case SessionState.Terminating:
        return 'Ending call...';
      default:
        return 'Unknown status';
    }
  };

  // Get display name from session or use contact name from store
  const getDisplayName = () => {
    if (contactName) return contactName;

    const remoteIdentity = activeSession.remoteIdentity;
    if (remoteIdentity?.displayName) return remoteIdentity.displayName;
    if (remoteIdentity?.uri?.user) return remoteIdentity.uri.user;

    return 'Unknown';
  };

  // Get phone number from session
  const getPhoneNumber = () => {
    return activeSession.remoteIdentity?.uri?.user || '';
  };

  const name = getDisplayName();
  const phoneNumber = getPhoneNumber();
  const isEstablished = activeSession.state === SessionState.Established;
  const isTerminating = activeSession.state === SessionState.Terminating;
  const isIncoming = activeSession.state === SessionState.Incoming;

  // DEBUG: Log session state details (commented out - too verbose)
  // if (process.env.NODE_ENV === 'development') {
  //   console.log('🔄 CallSessionItem State:', {
  //     sessionId: activeSession.id,
  //     sessionState: activeSession.state,
  //     direction: activeSession.direction,
  //     isIncoming,
  //     isEstablished,
  //   });
  // }

  // Handle hang up call
  const handleHangUp = async () => {
    if (activeSessionKey && activeSession) {
      try {
        await terminateCall(activeSessionKey);
        stopSounds();
      } catch (error) {
        console.error('Failed to terminate call:', error);
      }
    }
  };

  // Handle answer call
  const handleAnswer = async () => {
    if (activeSessionKey && activeSession && isIncoming) {
      try {
        await answerCall(activeSessionKey);
        stopSounds();
      } catch (error) {
        console.error('Failed to answer call:', error);
      }
    }
  };

  return (
    <div className="relative flex flex-col items-center px-4 py-8 text-center">
      {/* Avatar at the top */}
      <Avatar size="lg" shape="circle" className={`bg-iris-2 text-2xl text-white`}>
        {name?.charAt(0)?.toUpperCase() ?? '?'}
      </Avatar>

      {/* Receiver name and phone number */}
      <div className="mb-2">
        <h3 className="text-xl font-semibold text-gray-900">{name}</h3>
        {phoneNumber && <p className="font-mono text-sm text-gray-600">{phoneNumber}</p>}
        <p className="mt-1 text-sm text-gray-500">{getCallStatusText()}</p>
      </div>

      {/* Call status indicator */}
      <div className="mb-6">
        {isIncoming && (
          <div className="flex items-center gap-2 text-amber-600">
            <div className="h-2 w-2 animate-pulse rounded-full bg-amber-500"></div>
            <span className="text-sm">Incoming call...</span>
          </div>
        )}
        {activeSession.state === SessionState.Establishing && (
          <div className="flex items-center gap-2 text-blue-600">
            <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500"></div>
            <span className="text-sm">Ringing...</span>
          </div>
        )}
        {isEstablished && (
          <div className="flex items-center gap-2 text-green-600">
            <div className="h-2 w-2 rounded-full bg-green-500"></div>
            <span className="text-sm font-medium">{callDuration}</span>
          </div>
        )}
        {isTerminating && (
          <div className="flex items-center gap-2 text-gray-500">
            <div className="h-2 w-2 rounded-full bg-gray-400"></div>
            <span className="text-sm">Ending call...</span>
          </div>
        )}
      </div>

      {/* Call controls */}
      <div className="flex justify-center gap-4">
        {/* Incoming call controls: Answer and Decline */}
        {isIncoming && (
          <>
            <Tooltip title="Decline" className="text-xs">
              <Button
                variant="destructive"
                shape="circle"
                size="lg"
                icon={<ApolloIcon name="phone-decline" className="text-xl" />}
                className="bg-red-500 text-white shadow-lg transition-all hover:bg-red-600 hover:shadow-xl"
                onClick={handleHangUp}
                disabled={isTerminating}
              />
            </Tooltip>

            <Tooltip title="Answer" className="text-xs">
              <Button
                variant="default"
                shape="circle"
                size="lg"
                icon={<ApolloIcon name="phone" className="text-xl" />}
                className="bg-green-500 text-white shadow-lg transition-all hover:bg-green-600 hover:shadow-xl"
                onClick={handleAnswer}
                disabled={isTerminating}
              />
            </Tooltip>
          </>
        )}

        {/* Established or outgoing call controls: Hang up */}
        {!isIncoming && (
          <Tooltip title="Hang up" className="text-xs">
            <Button
              variant="destructive"
              shape="circle"
              size="lg"
              icon={<ApolloIcon name="phone-decline" className="text-xl" />}
              className="bg-red-500 text-white shadow-lg transition-all hover:bg-red-600 hover:shadow-xl"
              onClick={handleHangUp}
              disabled={isTerminating}
            />
          </Tooltip>
        )}

        {/* Additional controls for established calls */}
        {isEstablished && (
          <>
            <Tooltip title="Mute (Coming soon)" className="text-xs">
              <Button
                variant="default"
                shape="circle"
                size="lg"
                icon={<ApolloIcon name="volume" className="text-xl" />}
                className="cursor-not-allowed opacity-50"
                disabled
              />
            </Tooltip>

            <Tooltip title="Hold (Coming soon)" className="text-xs">
              <Button
                variant="default"
                shape="circle"
                size="lg"
                icon={<ApolloIcon name="pause" className="text-xl" />}
                className="cursor-not-allowed opacity-50"
                disabled
              />
            </Tooltip>
          </>
        )}
      </div>
    </div>
  );
};
