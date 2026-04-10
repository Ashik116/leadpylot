'use client';

import { useEffect, useRef, useState } from 'react';
import { useSafeJsSIP, SessionState } from '@/hooks/useJsSIP';
import useCallAudio from '@/utils/hooks/useCallAudio';

interface IncomingCallOverlayProps {
  callerId: string;
  onDismiss: () => void;
}

const IncomingCallOverlay = ({ callerId, onDismiss }: IncomingCallOverlayProps) => {
  const { sessions, answerCall, terminateCall } = useSafeJsSIP();
  const { stopSounds } = useCallAudio();
  const [callState, setCallState] = useState<'ringing' | 'established' | 'ended'>('ringing');
  const [duration, setDuration] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Find the incoming session
  const incomingSessionKey = Object.keys(sessions).find((key) => {
    const s = sessions[key];
    return (
      s.state === SessionState.Initial ||
      s.state === SessionState.Incoming ||
      s.state === SessionState.Established ||
      s.state === SessionState.Establishing
    );
  });

  const session = incomingSessionKey ? sessions[incomingSessionKey] : null;

  // Track session state changes
  useEffect(() => {
    if (!session) {
      if (callState !== 'ended') {
        setCallState('ended');
        setTimeout(onDismiss, 1500);
      }
      return;
    }

    if (session.state === SessionState.Established) {
      setCallState('established');
      if (!startTimeRef.current) {
        startTimeRef.current = Date.now();
        timerRef.current = setInterval(() => {
          if (startTimeRef.current) {
            setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
          }
        }, 1000);
      }
    } else if (session.state === SessionState.Terminated || session.state === SessionState.Terminating) {
      setCallState('ended');
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setTimeout(onDismiss, 1500);
    }
  }, [session, session?.state, callState, onDismiss]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleAnswer = async () => {
    if (incomingSessionKey) {
      try {
        await answerCall(incomingSessionKey);
        stopSounds();
      } catch { /* silent */ }
    }
  };

  const handleDecline = async () => {
    if (incomingSessionKey) {
      try {
        await terminateCall(incomingSessionKey);
        stopSounds();
      } catch { /* silent */ }
    }
    setCallState('ended');
    setTimeout(onDismiss, 500);
  };

  const handleHangUp = async () => {
    if (incomingSessionKey) {
      try {
        await terminateCall(incomingSessionKey);
        stopSounds();
      } catch { /* silent */ }
    }
    setCallState('ended');
    setTimeout(onDismiss, 500);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const initial = (callerId?.charAt(0) || '?').toUpperCase();
  const isRinging = callState === 'ringing';
  const isEstablished = callState === 'established';
  const isEnded = callState === 'ended';

  return (
    <div className="fixed top-4 right-4 z-[99999]">
      <div className="flex w-[300px] flex-col items-center rounded-2xl bg-[#1a2028] p-6 shadow-2xl ring-1 ring-white/10">
        {/* Avatar */}
        <div className="relative mb-4">
          {isRinging && (
            <div
              className="absolute -inset-2 rounded-full bg-blue-500/20"
              style={{ animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite' }}
            />
          )}
          {isEstablished && (
            <div className="absolute -inset-1 rounded-full bg-emerald-500/20 blur-lg" />
          )}
          <div
            className={`relative flex h-14 w-14 items-center justify-center rounded-full text-xl font-semibold transition-colors duration-500 ${
              isEstablished
                ? 'bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500/30'
                : isRinging
                  ? 'bg-blue-500/20 text-blue-400 ring-2 ring-blue-500/30'
                  : 'bg-white/5 text-white/30'
            }`}
          >
            {initial}
          </div>
        </div>

        {/* Caller info */}
        <h2 className={`mb-0.5 text-base font-semibold ${isEnded ? 'text-white/40' : 'text-white'}`}>
          {callerId || 'Unknown'}
        </h2>

        {/* Status */}
        <div className="mb-4 flex items-center gap-2">
          {isRinging && <div className="h-2 w-2 animate-pulse rounded-full bg-blue-400" />}
          {isEstablished && <div className="h-2 w-2 rounded-full bg-emerald-400" />}

          <span
            className={`text-sm font-medium ${
              isEstablished
                ? 'tabular-nums text-emerald-400'
                : isRinging
                  ? 'text-blue-400'
                  : 'text-white/40'
            }`}
          >
            {isRinging && 'Incoming call...'}
            {isEstablished && formatTime(duration)}
            {isEnded && (duration > 0 ? `Call ended · ${formatTime(duration)}` : 'Call ended')}
          </span>
        </div>

        {/* Controls */}
        {isRinging && (
          <div className="flex items-center gap-6">
            <button onClick={handleDecline} className="group flex flex-col items-center gap-1.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500 shadow-lg shadow-red-500/25 transition-transform group-active:scale-90">
                <svg
                  className="h-5 w-5 rotate-[135deg] text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
              </div>
              <span className="text-[11px] text-white/40">Decline</span>
            </button>

            <button onClick={handleAnswer} className="group flex flex-col items-center gap-1.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/25 transition-transform group-active:scale-90">
                <svg
                  className="h-5 w-5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
              </div>
              <span className="text-[11px] text-white/40">Accept</span>
            </button>
          </div>
        )}

        {isEstablished && (
          <button onClick={handleHangUp} className="group flex flex-col items-center gap-1.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500 shadow-lg shadow-red-500/25 transition-transform group-active:scale-90">
              <svg
                className="h-5 w-5 rotate-[135deg] text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
            </div>
            <span className="text-[11px] text-white/40">End</span>
          </button>
        )}

        {isEnded && (
          <button
            onClick={onDismiss}
            className="rounded-full bg-white/[0.08] px-6 py-2 text-sm text-white/60 transition-colors hover:bg-white/[0.12]"
          >
            Close
          </button>
        )}
      </div>
    </div>
  );
};

export default IncomingCallOverlay;
