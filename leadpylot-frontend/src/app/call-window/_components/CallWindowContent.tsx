'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import * as JsSIP from 'jssip';
import { CallWindowMessage, CallWindowData } from '@/services/CallWindowService';

type CallState = 'idle' | 'connecting' | 'ringing' | 'established' | 'terminated' | 'failed';

interface CallInfo {
  phoneNumber: string;
  contactName: string;
  leadId: string;
  projectId: string;
  extension: string;
  password: string;
  domain: string;
  websocketUrl: string;
  direction: 'incoming' | 'outgoing';
  voipExtension: string;
}

export default function CallWindowContent() {
  const searchParams = useSearchParams();
  const [callState, setCallState] = useState<CallState>('idle');
  const [callDuration, setCallDuration] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [callInfo, setCallInfo] = useState<CallInfo>({
    phoneNumber: '',
    contactName: '',
    leadId: '',
    projectId: '',
    extension: '',
    password: '',
    domain: '',
    websocketUrl: '',
    direction: 'outgoing',
    voipExtension: '',
  });

  const userAgentRef = useRef<JsSIP.UA | null>(null);
  const sessionRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const callStartTimeRef = useRef<number | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const callId = searchParams.get('id');
    if (callId) {
      const storedData = sessionStorage.getItem(`leadpylot_call_${callId}`);
      if (storedData) {
        try {
          const data: CallWindowData = JSON.parse(storedData);
          setCallInfo({
            phoneNumber: data.phoneNumber || '',
            contactName: data.contactName || 'Unknown',
            leadId: data.leadId || '',
            projectId: data.projectId || '',
            extension: data.extension || '',
            password: data.password || '',
            domain: data.domain || '',
            websocketUrl: data.websocketUrl || '',
            direction: data.direction || 'outgoing',
            voipExtension: data.voipExtension || '',
          });
        } catch {
          setErrorMessage('Failed to load call data');
        }
      } else {
        setErrorMessage('Call data not found. Please try again.');
      }
    } else {
      setErrorMessage('No call ID provided');
    }
    setIsLoading(false);
  }, [searchParams]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const sendMessage = useCallback((type: CallWindowMessage['type'], payload?: any) => {
    if (broadcastChannelRef.current) {
      try {
        broadcastChannelRef.current.postMessage({ type, payload, timestamp: Date.now() });
      } catch { /* silent */ }
    }
  }, []);

  const handleMessage = useCallback((event: MessageEvent<CallWindowMessage>) => {
    const message = event.data;
    switch (message.type) {
      case 'PING':
        sendMessage('PONG');
        break;
      case 'REQUEST_STATUS':
        sendMessage('STATUS_UPDATE', {
          isActive: callState !== 'idle' && callState !== 'terminated' && callState !== 'failed',
          state: callState,
          phoneNumber: callInfo.phoneNumber,
          contactName: callInfo.contactName,
          duration: callDuration,
          startTime: callStartTimeRef.current,
        });
        break;
    }
  }, [callState, callInfo.phoneNumber, callInfo.contactName, callDuration, sendMessage]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      broadcastChannelRef.current = new BroadcastChannel('leadpylot_call_channel');
      broadcastChannelRef.current.onmessage = handleMessage;
      sendMessage('WINDOW_READY');
      const handleBeforeUnload = () => sendMessage('WINDOW_CLOSED');
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
        broadcastChannelRef.current?.close();
      };
    } catch { /* silent */ }
  }, [handleMessage, sendMessage]);

  useEffect(() => {
    if (isLoading) return;
    if (!callInfo.extension || !callInfo.domain || !callInfo.websocketUrl) {
      if (callState !== 'failed') {
        setErrorMessage('Missing call configuration.');
        setCallState('failed');
      }
      return;
    }
    if (!callInfo.password) {
      if (callState !== 'failed') {
        setErrorMessage('SIP credentials not found.');
        setCallState('failed');
      }
      return;
    }

    const callId = `popup-call-${Date.now()}`;

    const initializeSIP = async () => {
      try {
        setCallState('connecting');
        const socket = new JsSIP.WebSocketInterface(callInfo.websocketUrl);
        const configuration = {
          sockets: [socket],
          uri: `sip:${callInfo.extension}@${callInfo.domain}`,
          password: callInfo.password,
          display_name: callInfo.extension,
          session_timers: false,
          register: true,
          register_expires: 600,
        };
        const ua = new JsSIP.UA(configuration);
        userAgentRef.current = ua;

        ua.on('connected', () => {});
        ua.on('registered', () => {
          setIsRegistered(true);
          if (callInfo.direction === 'outgoing' && callInfo.phoneNumber) makeCall();
        });
        ua.on('registrationFailed', (e: any) => {
          setErrorMessage(`Registration failed: ${e.cause}`);
          setCallState('failed');
          sendMessage('CALL_FAILED', { reason: e.cause });
        });
        ua.on('newRTCSession', (e: any) => {
          const session = e.session;
          if (session.direction === 'incoming') {
            sessionRef.current = session;
            setCallState('ringing');
            sendMessage('INCOMING_CALL', {
              phoneNumber: session.remote_identity?.uri?.user,
              contactName: session.remote_identity?.display_name,
            });
            setupSessionHandlers(session);
          }
        });
        ua.start();
      } catch (error) {
        setErrorMessage(`Failed to initialize: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setCallState('failed');
        sendMessage('CALL_FAILED', { reason: 'Initialization failed' });
      }
    };

    const makeCall = () => {
      if (!userAgentRef.current) return;
      let dialTarget = '';
      if (callInfo.voipExtension) {
        const clean = callInfo.voipExtension.replace(/\D/g, '');
        if (clean) dialTarget = clean;
      }
      if (!dialTarget && callInfo.phoneNumber) {
        const clean = callInfo.phoneNumber.replace(/\D/g, '');
        if (clean) dialTarget = clean;
      }
      if (!dialTarget) {
        setErrorMessage('No phone number available');
        setCallState('failed');
        sendMessage('CALL_FAILED', { reason: 'No dial target' });
        return;
      }
      try {
        const session = userAgentRef.current.call(`sip:${dialTarget}@${callInfo.domain}`, {
          mediaConstraints: { audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false },
          rtcOfferConstraints: { offerToReceiveAudio: true, offerToReceiveVideo: false },
        });
        sessionRef.current = session;
        setupSessionHandlers(session);
        setCallState('connecting');
        sendMessage('CALL_INITIATED', { phoneNumber: callInfo.phoneNumber, contactName: callInfo.contactName, dialTarget });
      } catch (error) {
        setErrorMessage(`Call failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setCallState('failed');
        sendMessage('CALL_FAILED', { reason: 'Call initiation failed' });
      }
    };

    const setupRemoteAudio = (remoteStream: MediaStream) => {
      try {
        remoteStream.getAudioTracks().forEach((track) => { if (!track.enabled) track.enabled = true; });
        let audioEl = document.getElementById(`remote-audio-${callId}`) as HTMLAudioElement;
        if (!audioEl) {
          audioEl = document.createElement('audio');
          audioEl.id = `remote-audio-${callId}`;
          audioEl.autoplay = true;
          (audioEl as any).playsInline = true;
          audioEl.volume = 1.0;
          audioEl.style.display = 'none';
          document.body.appendChild(audioEl);
        }
        audioEl.srcObject = remoteStream;
        audioEl.play().catch(() => {});
        if (audioRef.current) {
          audioRef.current.srcObject = remoteStream;
          audioRef.current.play().catch(() => {});
        }
        try {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          ctx.createMediaStreamSource(remoteStream).connect(ctx.destination);
        } catch { /* silent */ }
      } catch { /* silent */ }
    };

    const cleanupAudio = () => {
      document.getElementById(`remote-audio-${callId}`)?.remove();
    };

    const setupSessionHandlers = (session: any) => {
      session.on('progress', () => setCallState('ringing'));
      session.on('accepted', () => {
        setCallState('established');
        callStartTimeRef.current = Date.now();
        timerRef.current = setInterval(() => {
          if (callStartTimeRef.current) setCallDuration(Math.floor((Date.now() - callStartTimeRef.current) / 1000));
        }, 1000);
        sendMessage('CALL_CONNECTED', { phoneNumber: callInfo.phoneNumber, contactName: callInfo.contactName, startTime: callStartTimeRef.current });
        const pc = session.connection;
        if (pc) {
          pc.getReceivers?.()?.forEach((r: RTCRtpReceiver) => {
            if (r.track?.kind === 'audio') setupRemoteAudio(new MediaStream([r.track]));
          });
        }
      });
      session.on('peerconnection', (data: any) => {
        const pc = data.peerconnection;
        if (pc) {
          pc.ontrack = (event: RTCTrackEvent) => {
            if (event.track.kind === 'audio') setupRemoteAudio(event.streams?.[0] || new MediaStream([event.track]));
          };
          setTimeout(() => {
            pc.getReceivers?.()?.forEach((r: RTCRtpReceiver) => {
              if (r.track?.kind === 'audio') setupRemoteAudio(new MediaStream([r.track]));
            });
          }, 500);
        }
      });
      session.on('ended', () => handleCallEnd('ended'));
      session.on('failed', (e: any) => handleCallEnd('failed', e.cause));
    };

    const handleCallEnd = (reason: string, cause?: string) => {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      setCallState('terminated');
      sendMessage('CALL_ENDED', { phoneNumber: callInfo.phoneNumber, contactName: callInfo.contactName, duration: callDuration, reason, cause });
      sessionRef.current = null;
    };

    initializeSIP();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      try { sessionRef.current?.terminate(); } catch { /* silent */ }
      try { userAgentRef.current?.stop(); } catch { /* silent */ }
      cleanupAudio();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, callInfo.extension, callInfo.domain, callInfo.websocketUrl, callInfo.password, callInfo.direction, callInfo.phoneNumber]);

  const handleHangUp = () => {
    try { sessionRef.current?.terminate(); } catch { /* silent */ }
    setCallState('terminated');
  };

  const handleAnswer = () => {
    if (sessionRef.current && callState === 'ringing') {
      try {
        sessionRef.current.answer({ mediaConstraints: { audio: true, video: false } });
        sendMessage('CALL_ANSWERED');
      } catch { /* silent */ }
    }
  };

  const handleDecline = () => {
    try { sessionRef.current?.terminate(); sendMessage('CALL_DECLINED'); } catch { /* silent */ }
    setCallState('terminated');
  };

  const handleMuteToggle = () => {
    if (!sessionRef.current) return;
    try {
      if (isMuted) sessionRef.current.unmute({ audio: true });
      else sessionRef.current.mute({ audio: true });
      setIsMuted(!isMuted);
    } catch { /* silent */ }
  };

  const displayName = callInfo.contactName && callInfo.contactName !== 'Unknown'
    ? callInfo.contactName
    : callInfo.phoneNumber || 'Unknown';

  const displayNumber = callInfo.phoneNumber || callInfo.voipExtension || '';

  const initial = (displayName.replace(/^Dialed:\s*/i, '').charAt(0) || '?').toUpperCase();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f1419]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
      </div>
    );
  }

  const isActive = callState === 'connecting' || callState === 'ringing' || callState === 'established';
  const isEnded = callState === 'terminated' || callState === 'failed';

  return (
    <div className="flex min-h-screen flex-col bg-[#0f1419] text-white select-none">
      <audio ref={audioRef} autoPlay playsInline className="hidden" />

      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-5 pb-2">
        <div className="flex items-center gap-2">
          <div className={`h-1.5 w-1.5 rounded-full ${isRegistered ? 'bg-emerald-400' : 'bg-amber-400'}`} />
          <span className="text-[11px] font-medium tracking-wide text-white/40 uppercase">
            {isRegistered ? 'Secured' : 'Connecting'}
          </span>
        </div>
        <span className="text-[11px] text-white/30 font-mono">
          Ext. {callInfo.extension}
        </span>
      </div>

      {/* Main content - centered */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 -mt-8">
        {/* Avatar */}
        <div className="relative mb-6">
          {/* Pulse rings for ringing state */}
          {callState === 'ringing' && (
            <>
              <div className="absolute inset-0 animate-ping rounded-full bg-white/5" style={{ animationDuration: '2s' }} />
              <div className="absolute -inset-3 animate-ping rounded-full bg-white/[0.03]" style={{ animationDuration: '2.5s' }} />
            </>
          )}
          {/* Connected glow */}
          {callState === 'established' && (
            <div className="absolute -inset-2 rounded-full bg-emerald-500/20 blur-xl" />
          )}

          <div className={`relative flex h-24 w-24 items-center justify-center rounded-full text-3xl font-semibold transition-colors duration-500 ${
            callState === 'established'
              ? 'bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500/30'
              : callState === 'ringing'
                ? 'bg-blue-500/20 text-blue-400 ring-2 ring-blue-500/30'
                : isEnded
                  ? 'bg-white/5 text-white/30'
                  : 'bg-white/10 text-white/60'
          }`}>
            {initial}
          </div>
        </div>

        {/* Contact info */}
        <h1 className={`mb-1 text-center text-xl font-semibold transition-colors ${isEnded ? 'text-white/40' : 'text-white'}`}>
          {displayName.replace(/^Dialed:\s*/i, '')}
        </h1>
        {displayNumber && displayName !== displayNumber && (
          <p className="mb-4 font-mono text-sm text-white/40">{displayNumber}</p>
        )}

        {/* Status */}
        <div className="mb-2 flex items-center gap-2">
          {callState === 'connecting' && (
            <div className="h-3 w-3 animate-spin rounded-full border border-white/20 border-t-amber-400" />
          )}
          {callState === 'ringing' && (
            <div className="h-2 w-2 animate-pulse rounded-full bg-blue-400" />
          )}
          {callState === 'established' && (
            <div className="h-2 w-2 rounded-full bg-emerald-400" />
          )}

          <span className={`text-sm font-medium ${
            callState === 'established' ? 'text-emerald-400 tabular-nums' :
            callState === 'ringing' ? 'text-blue-400' :
            callState === 'connecting' ? 'text-amber-400' :
            callState === 'failed' ? 'text-red-400' :
            'text-white/40'
          }`}>
            {callState === 'idle' && 'Initializing...'}
            {callState === 'connecting' && 'Connecting...'}
            {callState === 'ringing' && (callInfo.direction === 'incoming' ? 'Incoming Call' : 'Ringing...')}
            {callState === 'established' && formatDuration(callDuration)}
            {callState === 'terminated' && `Call ended ${callDuration > 0 ? `\u00B7 ${formatDuration(callDuration)}` : ''}`}
            {callState === 'failed' && 'Call failed'}
          </span>
        </div>

        {/* Error */}
        {errorMessage && (
          <div className="mt-2 max-w-[280px] rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2.5 text-center text-xs text-red-400">
            {errorMessage}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="px-6 pb-8 pt-4">
        {/* Incoming call */}
        {callState === 'ringing' && callInfo.direction === 'incoming' && (
          <div className="flex items-center justify-center gap-8">
            <button
              onClick={handleDecline}
              className="group flex flex-col items-center gap-2"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500 shadow-lg shadow-red-500/25 transition-transform group-active:scale-90">
                <svg className="h-7 w-7 rotate-[135deg] text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <span className="text-[11px] text-white/40">Decline</span>
            </button>
            <button
              onClick={handleAnswer}
              className="group flex flex-col items-center gap-2"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/25 transition-transform group-active:scale-90">
                <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <span className="text-[11px] text-white/40">Accept</span>
            </button>
          </div>
        )}

        {/* Active call (outgoing ringing / connecting / established) */}
        {isActive && !(callState === 'ringing' && callInfo.direction === 'incoming') && (
          <div className="flex items-center justify-center gap-6">
            {callState === 'established' && (
              <button
                onClick={handleMuteToggle}
                className="group flex flex-col items-center gap-2"
              >
                <div className={`flex h-14 w-14 items-center justify-center rounded-full transition-colors ${
                  isMuted ? 'bg-amber-500/20 ring-1 ring-amber-500/40' : 'bg-white/[0.08] hover:bg-white/[0.12]'
                }`}>
                  {isMuted ? (
                    <svg className="h-6 w-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                    </svg>
                  ) : (
                    <svg className="h-6 w-6 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  )}
                </div>
                <span className="text-[11px] text-white/40">{isMuted ? 'Unmute' : 'Mute'}</span>
              </button>
            )}

            <button
              onClick={handleHangUp}
              className="group flex flex-col items-center gap-2"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500 shadow-lg shadow-red-500/25 transition-transform group-active:scale-90">
                <svg className="h-7 w-7 rotate-[135deg] text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <span className="text-[11px] text-white/40">End</span>
            </button>
          </div>
        )}

        {/* Call ended */}
        {isEnded && (
          <div className="flex justify-center">
            <button
              onClick={() => window.close()}
              className="flex h-12 items-center gap-2 rounded-full bg-white/[0.08] px-8 text-sm font-medium text-white/60 transition-colors hover:bg-white/[0.12] hover:text-white/80 active:scale-95"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
