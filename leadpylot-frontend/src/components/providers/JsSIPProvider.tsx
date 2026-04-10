/**
 * JsSIP Provider Component
 * Manages multiple SIP connections with native JsSIP support
 * Replaces react-sipjs with multi-extension capabilities
 */

'use client';

import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
} from 'react';
import * as JsSIP from 'jssip';
import { usePhoneUIStore } from '@/stores/phoneUIStore';
import {
  JsSIPConnectionState,
  JsSIPCallSession,
  ExtensionCredentials,
  JsSIPEventHandlers,
  CallOptions,
} from '@/types/jssip';
import { isDev } from '@/utils/utils';

interface JsSIPProviderProps {
  domain: string;
  webSocketServer: string;
  children: React.ReactNode;
  eventHandlers?: JsSIPEventHandlers;
  options?: {
    debugLevel?: 'debug' | 'log' | 'warn' | 'error';
    connectionTimeout?: number;
    registrationExpires?: number;
    maxRetryAttempts?: number;
  };
}

export interface JsSIPContextValue {
  // Connection Management
  connections: Map<string, JsSIPConnectionState>;
  connectToExtension: (credentials: ExtensionCredentials) => Promise<void>;
  disconnectFromExtension: (extension: string) => void;
  disconnectAll: () => void;

  // Call Management
  activeCalls: Map<string, JsSIPCallSession>;
  makeCall: (
    fromExtension: string,
    toUri: string,
    options?: CallOptions
  ) => Promise<JsSIPCallSession>;
  terminateCall: (callId: string) => Promise<void>;
  answerCall: (callId: string) => Promise<void>;
  holdCall: (callId: string) => Promise<void>;
  resumeCall: (callId: string) => Promise<void>;

  // Utility Methods
  isExtensionConnected: (extension: string) => boolean;
  getConnectionState: (extension: string) => JsSIPConnectionState | null;
  getAllConnections: () => JsSIPConnectionState[];

  // Server Configuration
  serverConfig: { domain: string; webSocketServer: string };

  // Status
  isInitialized: boolean;
}

const JsSIPContext = createContext<JsSIPContextValue | null>(null);

export const JsSIPProvider: React.FC<JsSIPProviderProps> = ({
  domain,
  webSocketServer,
  children,
  eventHandlers = {},
  options = {},
}) => {
  const [connections, setConnections] = useState<Map<string, JsSIPConnectionState>>(new Map());
  const [activeCalls, setActiveCalls] = useState<Map<string, JsSIPCallSession>>(new Map());
  const [isInitialized] = useState(true);

  // Refs to maintain stable references
  const userAgents = useRef<Map<string, JsSIP.UA>>(new Map());
  const reconnectTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const { debugLevel = isDev ? 'debug' : 'warn', registrationExpires = 600 } = options;

  // Configure JsSIP debug level
  useEffect(() => {
    JsSIP.debug.enable(debugLevel);

    if (isDev) {
      console.log('🌐 JsSIP Provider initialized:', { domain, webSocketServer, debugLevel });
    }
  }, [debugLevel, domain, webSocketServer]);

  // Helper function to update connection state
  const updateConnectionState = useCallback(
    (extension: string, updates: Partial<JsSIPConnectionState>) => {
      setConnections((prev) => {
        const newConnections = new Map(prev);
        const current = newConnections.get(extension) || {
          extension,
          userAgent: null,
          registered: false,
          registering: false,
          connecting: false,
        };

        const updated = { ...current, ...updates };
        newConnections.set(extension, updated);

        // Trigger event handler
        eventHandlers.onConnectionStateChange?.(extension, updated);

        return newConnections;
      });
    },
    [eventHandlers]
  );

  // Track all active call audio elements so we can re-route them when the user changes output device
  const callAudioElements = useRef<Map<string, HTMLAudioElement>>(new Map());

  // Route a remote audio element to the user's selected speaker via setSinkId.
  // Passing '' to setSinkId resets to the browser/system default, so we never bail.
  const applySinkId = useCallback(async (audioEl: HTMLAudioElement, callId?: string) => {
    if (!('setSinkId' in audioEl)) return;
    const { selectedOutput } = usePhoneUIStore.getState();
    // '' means browser default; any specific device ID routes explicitly
    const deviceId = (!selectedOutput || selectedOutput === 'default') ? '' : selectedOutput;
    try {
      await (audioEl as any).setSinkId(deviceId);
      console.warn(`🔊 [SINK] Audio routed to device: ${deviceId || 'system-default'}`);
    } catch (err) {
      console.warn(`⚠️ [SINK] setSinkId failed:`, err);
    }
    // Register so store-change subscriber can re-apply later
    if (callId) callAudioElements.current.set(callId, audioEl);
  }, []);

  // Re-route all active call audio elements whenever the user changes the speaker in the UI
  useEffect(() => {
    return usePhoneUIStore.subscribe(async (state) => {
      const deviceId = (!state.selectedOutput || state.selectedOutput === 'default') ? '' : state.selectedOutput;
      for (const audioEl of callAudioElements.current.values()) {
        if (!('setSinkId' in audioEl)) continue;
        try {
          await (audioEl as any).setSinkId(deviceId);
          console.warn(`🔊 [SINK-LIVE] Re-routed active call audio to: ${deviceId || 'system-default'}`);
        } catch { /* silent */ }
      }
    });
  }, []);

  // ✅ Helper function to log audio stream quality for debugging
  const logAudioStreamDetails = useCallback(
    (stream: MediaStream, callId: string, direction: 'incoming' | 'outgoing') => {
      if (!isDev) return;

      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length > 0) {
        const audioTrack = audioTracks[0];
        const settings = audioTrack.getSettings();
        const constraints = audioTrack.getConstraints();

        console.log(`🎵 Audio Stream Quality - ${direction} call ${callId}:`, {
          trackId: audioTrack.id,
          label: audioTrack.label,
          kind: audioTrack.kind,
          readyState: audioTrack.readyState,
          enabled: audioTrack.enabled,
          muted: audioTrack.muted,
          settings: {
            sampleRate: settings.sampleRate,
            sampleSize: settings.sampleSize,
            channelCount: settings.channelCount,
            echoCancellation: settings.echoCancellation,
            noiseSuppression: settings.noiseSuppression,
            autoGainControl: settings.autoGainControl,
          },
          constraints,
        });
      }
    },
    []
  );

  // Connect to a specific extension
  const connectToExtension = useCallback(
    async (credentials: ExtensionCredentials): Promise<void> => {
      const { extension, password, displayName } = credentials;

      if (isDev) {
        console.log(`🔌 Connecting to extension: ${extension}`);
      }

      try {
        // If UA already exists, let JsSIP's built-in recovery handle reconnection
        const existingUA = userAgents.current.get(extension);
        if (existingUA) {
          if (isDev) console.log(`✅ Extension ${extension} UA already exists (registered: ${existingUA.isRegistered()}), skipping`);
          return;
        }

        updateConnectionState(extension, {
          connecting: true,
          registering: false,
          error: undefined,
        });

        // Create WebSocket interface
        const socket = new JsSIP.WebSocketInterface(webSocketServer);

        // Configure UserAgent with enhanced audio settings
        // Clean domain to remove http:// or https:// if present
        const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/:\d+$/, '');

        if (isDev) {
          console.log(`🔌 Connecting extension ${extension}:`, {
            originalDomain: domain,
            cleanDomain: cleanDomain,
            webSocketServer: webSocketServer,
            uri: `sip:${extension}@${cleanDomain}`,
          });
        }

        const configuration: any = {
          sockets: [socket],
          uri: `sip:${extension}@${cleanDomain}`,
          password: password,
          display_name: displayName || extension,
          session_timers: false,
          register: true,
          register_expires: registrationExpires,
          connection_recovery_max_interval: 30,
          connection_recovery_min_interval: 4,
          // ✅ Enhanced audio codec configuration
          rtc_configuration: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
            ],
            iceCandidatePoolSize: 10,
          },
          // Prefer high-quality audio codecs
          pcConfig: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
            ],
          },
        };

        const ua = new JsSIP.UA(configuration);
        userAgents.current.set(extension, ua);

        // Set up event handlers
        ua.on('connected', () => {
          if (isDev) console.log(`✅ WebSocket connected for extension: ${extension}`);
          updateConnectionState(extension, { connecting: false });
        });

        ua.on('disconnected', () => {
          if (isDev) console.log(`🔌 WebSocket disconnected for extension: ${extension}`);
          updateConnectionState(extension, {
            registered: false,
            connecting: false,
            registering: false,
          });
        });

        ua.on('registered', () => {
          if (isDev) console.log(`📞 Registered extension: ${extension}`);
          updateConnectionState(extension, {
            registered: true,
            registering: false,
            connecting: false,
            lastConnected: new Date(),
            error: undefined,
            retryCount: 0,
          });
          eventHandlers.onRegistrationSuccess?.(extension);
        });

        ua.on('unregistered', () => {
          if (isDev) console.log(`📴 Unregistered extension: ${extension}`);
          updateConnectionState(extension, { registered: false, registering: false });
        });

        ua.on('registrationFailed', (e) => {
          const error = `Registration failed: ${e.cause}`;
          console.error(`❌ Registration failed for ${extension}:`, {
            cause: e.cause,

            response: e.response,
            event: e,
          });
          updateConnectionState(extension, {
            registered: false,
            registering: false,
            connecting: false,
            error,
          });
          eventHandlers.onRegistrationFailed?.(extension, error);
        });

        // Handle UA connection events
        ua.on('connecting', () => {
          if (isDev) console.log(`🔄 UA connecting for extension: ${extension}`);
        });

        // Handle incoming calls
        ua.on('newRTCSession', (e: any) => {
          const session = e.session as any;
          const callId = session.id || `call-${Date.now()}-${Math.random()}`;

          if (session.direction === 'incoming') {
            const remoteUri = session.remote_identity?.uri?.toString() || 'Unknown';
            const remoteNumber = session.remote_identity?.uri?.user || 'Unknown';

            const incomingCall: JsSIPCallSession = {
              id: callId,
              extension,
              direction: 'incoming',
              remoteUri,
              remoteNumber,
              state: 'ringing',
              startTime: new Date(),
              session,
            };

            // ── INCOMING CALL AUDIO PIPELINE ──────────────────────────────────────
            console.warn(`📲 [INCOMING] New incoming call registered: ${callId} from ${remoteNumber}`);

            session.on('peerconnection', (e: any) => {
              const pc = e.peerconnection as RTCPeerConnection;
              console.warn(`🔌 [INCOMING-PC] PeerConnection created for call ${callId}`, {
                signalingState: pc.signalingState,
                iceConnectionState: pc.iceConnectionState,
                connectionState: pc.connectionState,
              });

              // STEP 1 — track event (fires when remote side adds a track)
              pc.addEventListener('track', (event: RTCTrackEvent) => {
                console.warn(`🎵 [INCOMING-TRACK] track event fired`, {
                  callId,
                  kind: event.track.kind,
                  trackId: event.track.id,
                  trackEnabled: event.track.enabled,
                  trackMuted: event.track.muted,
                  trackReadyState: event.track.readyState,
                  streamsCount: event.streams?.length ?? 0,
                });

                if (event.track.kind !== 'audio') return;

                const remoteStream = (event.streams && event.streams[0])
                  ? event.streams[0]
                  : new MediaStream([event.track]);

                console.warn(`🎙️ [INCOMING-STREAM] Got audio stream`, {
                  callId,
                  streamId: remoteStream.id,
                  audioTracks: remoteStream.getAudioTracks().length,
                  videoTracks: remoteStream.getVideoTracks().length,
                  audioTrackEnabled: remoteStream.getAudioTracks()[0]?.enabled,
                  audioTrackMuted: remoteStream.getAudioTracks()[0]?.muted,
                  audioTrackState: remoteStream.getAudioTracks()[0]?.readyState,
                });

                // STEP 2 — create / reuse audio element
                let audioElement = document.getElementById(`remote-audio-${callId}`) as HTMLAudioElement;
                if (!audioElement) {
                  audioElement = document.createElement('audio');
                  audioElement.id = `remote-audio-${callId}`;
                  audioElement.autoplay = true;
                  (audioElement as any).playsInline = true;
                  audioElement.volume = 1.0;
                  (audioElement as any).muted = false;
                  document.body.appendChild(audioElement);
                  console.warn(`🔈 [INCOMING-ELEM] Created new audio element for call ${callId}`);
                } else {
                  console.warn(`🔈 [INCOMING-ELEM] Reusing existing audio element for call ${callId}`);
                }

                audioElement.srcObject = remoteStream;
                applySinkId(audioElement, callId);

                // Watch for track unmute — this is when real audio actually starts flowing
                event.track.onunmute = () => {
                  console.warn(`🔔 [INCOMING-UNMUTE] Track unmuted — audio should flow now`, {
                    callId,
                    trackId: event.track.id,
                    trackEnabled: event.track.enabled,
                    trackReadyState: event.track.readyState,
                    audioElPaused: audioElement!.paused,
                    audioElVolume: audioElement!.volume,
                    audioElMuted: audioElement!.muted,
                    audioElReadyState: audioElement!.readyState,
                    srcObject: audioElement!.srcObject ? 'set' : 'null',
                  });
                  // Re-trigger play in case the element stalled while track was muted
                  if (audioElement!.paused) {
                    audioElement!.play().catch((e) => console.error(`❌ [INCOMING-UNMUTE] Re-play failed:`, e));
                  }
                };

                event.track.onmute = () => {
                  console.warn(`🔕 [INCOMING-MUTE] Track muted`, { callId, trackId: event.track.id });
                };

                event.track.onended = () => {
                  console.warn(`🛑 [INCOMING-TRACK-ENDED] Track ended`, { callId, trackId: event.track.id });
                };

                // Use RTCPeerConnection.getStats() — the only reliable way to check audio in all browsers
                // (Firefox AnalyserNode reads zeros for remote WebRTC streams even when audio flows)
                let prevBytesReceived = 0;
                let prevTotalEnergy = 0;
                let pollCount = 0;
                const poll = setInterval(async () => {
                  pollCount++;
                  const sinkId = audioElement && 'sinkId' in audioElement ? (audioElement as any).sinkId : 'unsupported';

                  // Get WebRTC stats from the PeerConnection
                  let statsInfo: any = { bytesReceived: '?', packetsReceived: '?', packetsLost: '?', jitter: '?', codec: '?', totalAudioEnergy: '?', totalSamplesDecoded: '?', audioLevel: '?' };
                  try {
                    const stats = await pc.getStats();
                    stats.forEach((report: any) => {
                      if (report.type === 'inbound-rtp' && report.kind === 'audio') {
                        statsInfo = {
                          bytesReceived: report.bytesReceived,
                          packetsReceived: report.packetsReceived,
                          packetsLost: report.packetsLost,
                          jitter: report.jitter,
                          codec: report.codecId || report.mimeType,
                          totalAudioEnergy: report.totalAudioEnergy,
                          totalSamplesDecoded: report.totalSamplesDecoded,
                          audioLevel: report.audioLevel,
                          bytesThisPoll: report.bytesReceived - prevBytesReceived,
                          energyThisPoll: report.totalAudioEnergy - prevTotalEnergy,
                        };
                        prevBytesReceived = report.bytesReceived;
                        prevTotalEnergy = report.totalAudioEnergy || 0;
                      }
                    });
                  } catch { /* stats unavailable */ }

                  console.warn(`📊 [INCOMING-POLL-${pollCount}s]`, {
                    callId,
                    trackMuted: event.track.muted,
                    trackEnabled: event.track.enabled,
                    trackReadyState: event.track.readyState,
                    audioElPaused: audioElement!.paused,
                    audioElCurrentTime: audioElement!.currentTime,
                    audioElVolume: audioElement!.volume,
                    audioElMuted: audioElement!.muted,
                    audioElReadyState: audioElement!.readyState,
                    sinkId,
                    ...statsInfo,
                  });

                  const energy = statsInfo.totalAudioEnergy;
                  if (typeof energy === 'number' && energy > 0.001) {
                    console.warn(`✅ [DIAG] REAL AUDIO confirmed via getStats() (totalAudioEnergy=${energy.toFixed(4)}). If you can't hear it → output device issue (sinkId='${sinkId}').`);
                  } else if (pollCount >= 4 && typeof energy === 'number' && energy < 0.001) {
                    console.error(`🔇 [DIAG] totalAudioEnergy ~0 for ${pollCount}s — Asterisk sending silence or SRTP decrypt failing.`);
                  }

                  if (pollCount >= 15) clearInterval(poll);
                }, 1000);

                console.warn(`▶️ [INCOMING-PLAY] Calling .play() on audio element for call ${callId}`, {
                  volume: audioElement.volume,
                  muted: audioElement.muted,
                  paused: audioElement.paused,
                  readyState: audioElement.readyState,
                });

                // STEP 3 — play
                audioElement.play()
                  .then(() => {
                    console.warn(`✅ [INCOMING-PLAY] Audio playing successfully for call ${callId}`, {
                      currentTime: audioElement!.currentTime,
                      paused: audioElement!.paused,
                      volume: audioElement!.volume,
                    });
                  })
                  .catch((playErr) => {
                    console.error(`❌ [INCOMING-PLAY] play() FAILED for call ${callId}:`, playErr);
                  });
              });

              // ICE + connection state tracing
              pc.oniceconnectionstatechange = () => {
                console.warn(`🧊 [INCOMING-ICE]`, pc.iceConnectionState, `for call ${callId}`);
                if (pc.iceConnectionState === 'failed') {
                  console.error(`❌ [INCOMING-ICE] ICE failed — no audio path`);
                }
              };

              pc.onconnectionstatechange = () => {
                console.warn(`🔗 [INCOMING-CONN]`, pc.connectionState, `for call ${callId}`);
              };

              pc.onsignalingstatechange = () => {
                console.warn(`📡 [INCOMING-SIG]`, pc.signalingState, `for call ${callId}`);
              };
            });

            session.on('accepted', () => {
              console.warn(`📞 [INCOMING-ACCEPTED] Call ${callId} accepted — checking audio element...`);
              const audioEl = document.getElementById(`remote-audio-${callId}`) as HTMLAudioElement;
              if (audioEl) {
                console.warn(`🔊 [INCOMING-ACCEPTED] Audio element EXISTS`, {
                  paused: audioEl.paused,
                  volume: audioEl.volume,
                  muted: audioEl.muted,
                  readyState: audioEl.readyState,
                  srcObject: audioEl.srcObject ? 'set' : 'null',
                });
              } else {
                console.error(`❌ [INCOMING-ACCEPTED] No audio element found — ontrack never fired!`);
              }

              setActiveCalls((prev) => {
                const newCalls = new Map(prev);
                const updatedCall = newCalls.get(callId);
                if (updatedCall) {
                  updatedCall.state = 'established';
                  newCalls.set(callId, updatedCall);

                  // ✅ Debug: Log state change for incoming calls
                  if (isDev) {
                    console.log('🎯 JsSIP Incoming Call State Updated to ESTABLISHED:', {
                      callId,
                      extension: updatedCall.extension,
                      direction: updatedCall.direction,
                      state: updatedCall.state,
                      startTime: updatedCall.startTime,
                    });
                  }
                }
                return newCalls;
              });
            });

            session.on('ended', () => {
              if (isDev) console.log(`📞 Incoming call ${callId} - Ended (Terminated)`);
              callAudioElements.current.delete(callId);

              // ✅ FIX: Clean up remote audio element for incoming calls too
              try {
                const audioElement = document.getElementById(
                  `remote-audio-${callId}`
                ) as HTMLAudioElement;
                if (audioElement) {
                  audioElement.pause();
                  audioElement.srcObject = null;
                  audioElement.remove();
                  if (isDev)
                    console.log(`🔇 Removed remote audio element for incoming call ${callId}`);
                }
              } catch (cleanupError) {
                console.warn(
                  `⚠️ Failed to cleanup audio for incoming call ${callId}:`,
                  cleanupError
                );
              }

              setActiveCalls((prev) => {
                const newCalls = new Map(prev);
                const updatedCall = newCalls.get(callId);
                if (updatedCall) {
                  updatedCall.state = 'terminated';
                  updatedCall.endTime = new Date();
                  newCalls.set(callId, updatedCall);
                }
                return newCalls;
              });
              // Remove call after a brief delay to allow UI to show termination state
              setTimeout(() => {
                setActiveCalls((prev) => {
                  const newCalls = new Map(prev);
                  newCalls.delete(callId);
                  return newCalls;
                });
              }, 1000);
              eventHandlers.onCallEnded?.(callId);
            });

            session.on('failed', (e: any) => {
              console.error(`❌ [INCOMING-FAILED] Call ${callId} failed`, {
                cause: e?.cause,
                originator: e?.originator,
                message: e?.message?.reason_phrase || e?.message,
              });
              callAudioElements.current.delete(callId);

              // ✅ FIX: Clean up remote audio element for failed incoming calls too
              try {
                const audioElement = document.getElementById(
                  `remote-audio-${callId}`
                ) as HTMLAudioElement;
                if (audioElement) {
                  audioElement.pause();
                  audioElement.srcObject = null;
                  audioElement.remove();
                  if (isDev)
                    console.log(
                      `🔇 Removed remote audio element for failed incoming call ${callId}`
                    );
                }
              } catch (cleanupError) {
                console.warn(
                  `⚠️ Failed to cleanup audio for failed incoming call ${callId}:`,
                  cleanupError
                );
              }

              setActiveCalls((prev) => {
                const newCalls = new Map(prev);
                const updatedCall = newCalls.get(callId);
                if (updatedCall) {
                  updatedCall.state = 'terminated';
                  updatedCall.endTime = new Date();
                  newCalls.set(callId, updatedCall);
                }
                return newCalls;
              });
              // Remove call after a brief delay to allow UI to show termination state
              setTimeout(() => {
                setActiveCalls((prev) => {
                  const newCalls = new Map(prev);
                  newCalls.delete(callId);
                  return newCalls;
                });
              }, 1000);
              eventHandlers.onCallEnded?.(callId);
            });

            setActiveCalls((prev) => new Map(prev).set(callId, incomingCall));
            eventHandlers.onIncomingCall?.(incomingCall);

            if (isDev) {
              console.log(`📞 Incoming call on extension ${extension} from ${remoteNumber}`);
            }
          }
        });

        // Store UserAgent reference and start connection
        updateConnectionState(extension, {
          userAgent: ua,
          connecting: true,
          registering: true,
        });

        ua.start();

        if (isDev) {
          console.log(`🚀 Started UserAgent for extension: ${extension}`);
        }
      } catch (error) {
        const errorMessage = `Failed to connect: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(`❌ Connection failed for ${extension}:`, error);
        updateConnectionState(extension, {
          connecting: false,
          registering: false,
          error: errorMessage,
        });
        throw new Error(errorMessage);
      }
    },
    [
      domain,
      webSocketServer,
      registrationExpires,
      eventHandlers,
      updateConnectionState,
      logAudioStreamDetails,
    ]
  );

  // Disconnect from specific extension
  const disconnectFromExtension = useCallback((extension: string) => {
    const ua = userAgents.current.get(extension);
    if (ua) {
      ua.stop();
      userAgents.current.delete(extension);

      // Clear reconnection timeout
      const timeout = reconnectTimeouts.current.get(extension);
      if (timeout) {
        clearTimeout(timeout);
        reconnectTimeouts.current.delete(extension);
      }
    }

    // Update state
    setConnections((prev) => {
      const newConnections = new Map(prev);
      newConnections.delete(extension);
      return newConnections;
    });

    if (isDev) {
      console.log(`🔌 Disconnected from extension: ${extension}`);
    }
  }, []);

  // Disconnect all extensions
  const disconnectAll = useCallback(() => {
    userAgents.current.forEach((ua) => {
      ua.stop();
    });
    userAgents.current.clear();

    // Clear all timeouts
    reconnectTimeouts.current.forEach((timeout) => clearTimeout(timeout));
    reconnectTimeouts.current.clear();

    setConnections(new Map());
    setActiveCalls(new Map());

    if (isDev) {
      console.log('🔌 Disconnected from all extensions');
    }
  }, []);

  // Make a call from specific extension
  const makeCall = useCallback(
    async (
      fromExtension: string,
      toUri: string,
      options: CallOptions = {}
    ): Promise<JsSIPCallSession> => {
      const ua = userAgents.current.get(fromExtension);
      if (!ua) {
        throw new Error(`Extension ${fromExtension} not connected`);
      }

      const connection = connections.get(fromExtension);
      if (!connection?.registered) {
        throw new Error(`Extension ${fromExtension} not registered`);
      }

      try {
        // Enhanced audio quality settings
        const callOptions = {
          mediaConstraints: {
            audio: options.audioConstraints || {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              sampleRate: 48000,
              sampleSize: 16,
              channelCount: 1,
            },
            video: options.videoConstraints || false,
          },
          extraHeaders: options.extraHeaders || [],
          rtcOfferConstraints: options.rtcOfferConstraints || {
            offerToReceiveAudio: true,
            offerToReceiveVideo: false,
          },
          rtcAnswerConstraints: options.rtcAnswerConstraints || {
            offerToReceiveAudio: true,
            offerToReceiveVideo: false,
          },
          rtcConfiguration: options.rtcConfiguration || {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
            ],
            iceCandidatePoolSize: 10,
          },
        };

        const session = ua.call(toUri, callOptions) as any;
        const callId = session.id || `call-${Date.now()}-${Math.random()}`;

        const callSession: JsSIPCallSession = {
          id: callId,
          extension: fromExtension,
          direction: 'outgoing',
          remoteUri: toUri,
          remoteNumber: toUri.replace(/^sip:/, '').split('@')[0],
          state: 'connecting',
          startTime: new Date(),
          session,
        };

        // Add the initial call session to activeCalls
        setActiveCalls((prev) => new Map(prev).set(callId, callSession));

        console.warn(`📞 [CALL] Creating outgoing call session:`, {
          callId,
          from: fromExtension,
          to: callSession.remoteNumber,
          state: callSession.state,
        });

        // ── OUTGOING CALL AUDIO PIPELINE ──────────────────────────────────────
        let trackListenerAttached = false;

        const attachTrackListener = (pc: RTCPeerConnection, source: string) => {
          if (trackListenerAttached) return;
          trackListenerAttached = true;
          console.warn(`🔌 [OUTGOING-PC] Attaching track listener (source: ${source})`, {
            callId,
            signalingState: pc.signalingState,
            iceConnectionState: pc.iceConnectionState,
            connectionState: pc.connectionState,
          });

          pc.addEventListener('track', (event: RTCTrackEvent) => {
            console.warn(`🎵 [OUTGOING-TRACK] track event fired`, {
              callId,
              kind: event.track.kind,
              trackId: event.track.id,
              trackEnabled: event.track.enabled,
              trackMuted: event.track.muted,
              trackReadyState: event.track.readyState,
              streamsCount: event.streams?.length ?? 0,
            });

            if (event.track.kind !== 'audio') return;

            const remoteStream = (event.streams && event.streams[0])
              ? event.streams[0]
              : new MediaStream([event.track]);

            console.warn(`🎙️ [OUTGOING-STREAM] Got audio stream`, {
              callId,
              streamId: remoteStream.id,
              audioTracks: remoteStream.getAudioTracks().length,
              audioTrackEnabled: remoteStream.getAudioTracks()[0]?.enabled,
              audioTrackMuted: remoteStream.getAudioTracks()[0]?.muted,
              audioTrackState: remoteStream.getAudioTracks()[0]?.readyState,
            });

            let audioElement = document.getElementById(`remote-audio-${callId}`) as HTMLAudioElement;
            if (!audioElement) {
              audioElement = document.createElement('audio');
              audioElement.id = `remote-audio-${callId}`;
              audioElement.autoplay = true;
              (audioElement as any).playsInline = true;
              audioElement.volume = 1.0;
              document.body.appendChild(audioElement);
              console.warn(`🔈 [OUTGOING-ELEM] Created audio element for call ${callId}`);
            }

            audioElement.srcObject = remoteStream;
            applySinkId(audioElement, callId);

            event.track.onunmute = () => {
              console.warn(`🔔 [OUTGOING-UNMUTE] Track unmuted — audio should flow now`, {
                callId,
                trackId: event.track.id,
                trackEnabled: event.track.enabled,
                audioElPaused: audioElement!.paused,
                audioElVolume: audioElement!.volume,
                audioElMuted: audioElement!.muted,
              });
              if (audioElement!.paused) {
                audioElement!.play().catch((e) => console.error(`❌ [OUTGOING-UNMUTE] Re-play failed:`, e));
              }
            };

            event.track.onmute = () => {
              console.warn(`🔕 [OUTGOING-MUTE] Track muted`, { callId, trackId: event.track.id });
            };

            event.track.onended = () => {
              console.warn(`🛑 [OUTGOING-TRACK-ENDED] Track ended`, { callId, trackId: event.track.id });
            };

            let outPrevBytes = 0;
            let outPrevEnergy = 0;
            let pollCount = 0;
            const poll = setInterval(async () => {
              pollCount++;
              const sinkId = audioElement && 'sinkId' in audioElement ? (audioElement as any).sinkId : 'unsupported';

              let statsInfo: any = { bytesReceived: '?', packetsReceived: '?', totalAudioEnergy: '?', codec: '?' };
              try {
                const stats = await pc.getStats();
                stats.forEach((report: any) => {
                  if (report.type === 'inbound-rtp' && report.kind === 'audio') {
                    statsInfo = {
                      bytesReceived: report.bytesReceived,
                      packetsReceived: report.packetsReceived,
                      packetsLost: report.packetsLost,
                      jitter: report.jitter,
                      codec: report.codecId || report.mimeType,
                      totalAudioEnergy: report.totalAudioEnergy,
                      totalSamplesDecoded: report.totalSamplesDecoded,
                      bytesThisPoll: report.bytesReceived - outPrevBytes,
                      energyThisPoll: report.totalAudioEnergy - outPrevEnergy,
                    };
                    outPrevBytes = report.bytesReceived;
                    outPrevEnergy = report.totalAudioEnergy || 0;
                  }
                });
              } catch { /* stats unavailable */ }

              console.warn(`📊 [OUTGOING-POLL-${pollCount}s]`, {
                callId,
                trackMuted: event.track.muted,
                trackEnabled: event.track.enabled,
                audioElPaused: audioElement!.paused,
                audioElCurrentTime: audioElement!.currentTime,
                audioElVolume: audioElement!.volume,
                audioElMuted: audioElement!.muted,
                audioElReadyState: audioElement!.readyState,
                sinkId,
                ...statsInfo,
              });

              const energy = statsInfo.totalAudioEnergy;
              if (typeof energy === 'number' && energy > 0.001) {
                console.warn(`✅ [DIAG] Outgoing REAL AUDIO confirmed (totalAudioEnergy=${energy.toFixed(4)}). Check sinkId='${sinkId}'.`);
              } else if (pollCount >= 4 && typeof energy === 'number' && energy < 0.001) {
                console.error(`🔇 [DIAG] Outgoing totalAudioEnergy ~0 for ${pollCount}s — server sending silence.`);
              }

              if (pollCount >= 15) clearInterval(poll);
            }, 1000);

            console.warn(`▶️ [OUTGOING-PLAY] Calling .play() for call ${callId}`, {
              volume: audioElement.volume,
              muted: audioElement.muted,
              paused: audioElement.paused,
            });

            audioElement.play()
              .then(() => {
                console.warn(`✅ [OUTGOING-PLAY] Audio playing for call ${callId}`, {
                  currentTime: audioElement!.currentTime,
                  paused: audioElement!.paused,
                });
              })
              .catch((playErr) => {
                console.error(`❌ [OUTGOING-PLAY] play() FAILED for call ${callId}:`, playErr);
              });
          });

          pc.oniceconnectionstatechange = () => {
            console.warn(`🧊 [OUTGOING-ICE]`, pc.iceConnectionState, `for call ${callId}`);
            if (pc.iceConnectionState === 'failed') {
              console.error(`❌ [OUTGOING-ICE] ICE failed — no audio path`);
            }
          };

          pc.onconnectionstatechange = () => {
            console.warn(`🔗 [OUTGOING-CONN]`, pc.connectionState, `for call ${callId}`);
          };

          pc.onsignalingstatechange = () => {
            console.warn(`📡 [OUTGOING-SIG]`, pc.signalingState, `for call ${callId}`);
          };
        };

        // Try immediately
        if (session.connection) {
          attachTrackListener(session.connection, 'immediate');
        } else {
          console.warn(`⏳ [OUTGOING-PC] No connection yet at call creation for ${callId}`);
        }

        session.on('peerconnection', (e: any) => {
          const pc = (e?.peerconnection || session.connection) as RTCPeerConnection;
          console.warn(`🔌 [OUTGOING-PC] peerconnection event fired for ${callId}`);
          if (pc) attachTrackListener(pc, 'peerconnection-event');
        });

        session.on('connecting', () => {
          console.warn(`🔄 [OUTGOING-CONNECTING] connecting event for ${callId}`);
          if (session.connection) attachTrackListener(session.connection, 'connecting-event');
        });

        // Set up session event listeners for state tracking
        session.on('progress', () => {
          if (isDev) console.log(`📞 Call ${callId} - Progress (Ringing)`);
          setActiveCalls((prev) => {
            const newCalls = new Map(prev);
            const updatedCall = newCalls.get(callId);
            if (updatedCall) {
              updatedCall.state = 'ringing';
              newCalls.set(callId, updatedCall);
            }
            return newCalls;
          });
        });

        session.on('accepted', () => {
          if (isDev) console.log(`📞 Call ${callId} - Accepted (Established)`);

          setActiveCalls((prev) => {
            const newCalls = new Map(prev);
            const updatedCall = newCalls.get(callId);
            if (updatedCall) {
              updatedCall.state = 'established';
              newCalls.set(callId, updatedCall);
              if (isDev) {
                console.log('🎯 JsSIP Call State Updated to ESTABLISHED:', {
                  callId,
                  extension: updatedCall.extension,
                  direction: updatedCall.direction,
                  state: updatedCall.state,
                  startTime: updatedCall.startTime,
                });
              }
            }
            return newCalls;
          });

          // Fallback: attach any remote audio tracks that may have arrived before ontrack was set
          setTimeout(() => {
            const pc = session.connection;
            if (!pc) return;
            const receivers = (pc.getReceivers() as RTCRtpReceiver[]).filter((r) => r.track.kind === 'audio');
            if (receivers.length === 0) return;

            let audioEl = document.getElementById(`remote-audio-${callId}`) as HTMLAudioElement;
            if (audioEl) return; // already handled by ontrack

            console.warn(`🔊 [AUDIO] Fallback: attaching outgoing audio via getReceivers() for call ${callId}`);
            const remoteStream = new MediaStream(receivers.map((r) => r.track));
            audioEl = document.createElement('audio');
            audioEl.id = `remote-audio-${callId}`;
            audioEl.autoplay = true;
            (audioEl as any).playsInline = true;
            audioEl.volume = 1.0;
            document.body.appendChild(audioEl);
            audioEl.srcObject = remoteStream;
            applySinkId(audioEl, callId);
            audioEl.play().catch((e) => console.warn(`⚠️ Fallback outgoing audio play blocked:`, e));
          }, 300);
        });

        session.on('ended', () => {
          if (isDev) console.log(`📞 Call ${callId} - Ended (Terminated)`);
          callAudioElements.current.delete(callId);

          // Clean up remote audio element
          try {
            const audioElement = document.getElementById(
              `remote-audio-${callId}`
            ) as HTMLAudioElement;
            if (audioElement) {
              audioElement.pause();
              audioElement.srcObject = null;
              audioElement.remove();
              if (isDev) console.log(`🔇 Removed remote audio element for call ${callId}`);
            }
          } catch (cleanupError) {
            console.warn(`⚠️ Failed to cleanup audio for call ${callId}:`, cleanupError);
          }

          setActiveCalls((prev) => {
            const newCalls = new Map(prev);
            const updatedCall = newCalls.get(callId);
            if (updatedCall) {
              updatedCall.state = 'terminated';
              updatedCall.endTime = new Date();
              newCalls.set(callId, updatedCall);
            }
            return newCalls;
          });
          // Remove call after a brief delay to allow UI to show termination state
          setTimeout(() => {
            setActiveCalls((prev) => {
              const newCalls = new Map(prev);
              newCalls.delete(callId);
              return newCalls;
            });
          }, 1000);
          eventHandlers.onCallEnded?.(callId);
        });

        session.on('failed', (e: any) => {
          console.error(`📞 Call ${callId} - Failed:`, { cause: e?.cause, originator: e?.originator, message: e?.message?.reason_phrase || e?.message });
          callAudioElements.current.delete(callId);

          // Clean up remote audio element for failed calls too
          try {
            const audioElement = document.getElementById(
              `remote-audio-${callId}`
            ) as HTMLAudioElement;
            if (audioElement) {
              audioElement.pause();
              audioElement.srcObject = null;
              audioElement.remove();
              if (isDev) console.log(`🔇 Removed remote audio element for failed call ${callId}`);
            }
          } catch (cleanupError) {
            console.warn(`⚠️ Failed to cleanup audio for failed call ${callId}:`, cleanupError);
          }

          setActiveCalls((prev) => {
            const newCalls = new Map(prev);
            const updatedCall = newCalls.get(callId);
            if (updatedCall) {
              updatedCall.state = 'terminated';
              updatedCall.endTime = new Date();
              newCalls.set(callId, updatedCall);
            }
            return newCalls;
          });
          // Remove call after a brief delay to allow UI to show termination state
          setTimeout(() => {
            setActiveCalls((prev) => {
              const newCalls = new Map(prev);
              newCalls.delete(callId);
              return newCalls;
            });
          }, 1000);
          eventHandlers.onCallEnded?.(callId);
        });

        // The following call to setActiveCalls is now redundant; initial call session set above.
        // setActiveCalls(prev => new Map(prev).set(callId, callSession));

        if (isDev) {
          console.log(`📞 Making call from ${fromExtension} to ${toUri}`);
        }

        return callSession;
      } catch (error) {
        const errorMessage = `Failed to make call: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`;

        throw new Error(errorMessage);
      }
    },
    // Fix: The correct dependencies are connections, logAudioStreamDetails, eventHandlers.
    [connections, logAudioStreamDetails, eventHandlers]
  );

  // Terminate call
  const terminateCall = useCallback(
    async (callId: string): Promise<void> => {
      const call = activeCalls.get(callId);
      if (call) {
        try {
          // Set call state to terminating before terminating the session
          setActiveCalls((prev) => {
            const newCalls = new Map(prev);
            const updatedCall = newCalls.get(callId);
            if (updatedCall) {
              updatedCall.state = 'terminated'; // JsSIP will handle the actual termination
              newCalls.set(callId, updatedCall);
            }
            return newCalls;
          });

          // Terminate the session (this will trigger the 'ended' event listener)
          call.session.terminate();

          if (isDev) {
            console.log(`📞 Terminating call ${callId}`);
          }
        } catch (error) {
          console.error(`❌ Failed to terminate call ${callId}:`, error);
          throw error;
        }
      }
    },
    [activeCalls]
  );

  // Answer call
  const answerCall = useCallback(
    async (callId: string): Promise<void> => {
      const call = activeCalls.get(callId);
      if (call && call.direction === 'incoming') {
        try {
          // Pre-request microphone ourselves for clear error handling
          // (JsSIP's internal getUserMedia gives vague errors on denial)
          let localStream: MediaStream | undefined;
          try {
            localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            console.warn(`🎤 [ANSWER] Microphone access granted, tracks: ${localStream.getAudioTracks().length}`);
          } catch (micErr: any) {
            console.error(`❌ [ANSWER] Microphone access FAILED:`, {
              name: micErr?.name,
              message: micErr?.message,
              constraint: micErr?.constraint,
            });
            // Surface the error to the user
            throw new Error(
              micErr?.name === 'NotAllowedError'
                ? 'Microphone access denied. Please allow microphone access in your browser and macOS System Settings → Privacy & Security → Microphone.'
                : `Microphone error: ${micErr?.message || micErr?.name}`
            );
          }

          call.session.answer({
            mediaStream: localStream,   // pass the stream directly — JsSIP skips getUserMedia
            pcConfig: {
              iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
              ],
              iceCandidatePoolSize: 10,
            },
          });

          // Fallback: after answering, check for tracks that may have already been added
          // (ontrack can fire before our handler is registered in some timing scenarios)
          setTimeout(() => {
            const pc = call.session.connection;
            if (!pc) return;
            const receivers = (pc.getReceivers() as RTCRtpReceiver[]).filter((r) => r.track.kind === 'audio');
            if (receivers.length === 0) return;

            let audioEl = document.getElementById(`remote-audio-${callId}`) as HTMLAudioElement;
            if (audioEl) return; // already attached by ontrack handler

            console.warn(`🔊 [AUDIO] Fallback: attaching audio via getReceivers() for call ${callId}`);
            const remoteStream = new MediaStream(receivers.map((r) => r.track));
            audioEl = document.createElement('audio');
            audioEl.id = `remote-audio-${callId}`;
            audioEl.autoplay = true;
            (audioEl as any).playsInline = true;
            audioEl.volume = 1.0;
            audioEl.style.display = 'none';
            audioEl.style.position = 'absolute';
            audioEl.style.left = '-9999px';
            document.body.appendChild(audioEl);
            audioEl.srcObject = remoteStream;
            applySinkId(audioEl, callId);
            audioEl.play().catch((e) => console.warn(`⚠️ Fallback audio play blocked:`, e));
          }, 500);

          setActiveCalls((prev) => {
            const newCalls = new Map(prev);
            const updatedCall = { ...call, state: 'established' as const };
            newCalls.set(callId, updatedCall);
            return newCalls;
          });
        } catch (error) {
          console.error(`❌ Failed to answer call ${callId}:`, error);
          throw error;
        }
      }
    },
    [activeCalls]
  );

  // Hold call
  const holdCall = useCallback(
    async (callId: string): Promise<void> => {
      const call = activeCalls.get(callId);
      if (call) {
        try {
          call.session.hold();
        } catch (error) {
          console.error(`❌ Failed to hold call ${callId}:`, error);
          throw error;
        }
      }
    },
    [activeCalls]
  );

  // Resume call
  const resumeCall = useCallback(
    async (callId: string): Promise<void> => {
      const call = activeCalls.get(callId);
      if (call) {
        try {
          call.session.unhold();
        } catch (error) {
          console.error(`❌ Failed to resume call ${callId}:`, error);
          throw error;
        }
      }
    },
    [activeCalls]
  );

  // Utility functions
  const isExtensionConnected = useCallback(
    (extension: string): boolean => {
      return connections.get(extension)?.registered || false;
    },
    [connections]
  );

  const getConnectionState = useCallback(
    (extension: string): JsSIPConnectionState | null => {
      return connections.get(extension) || null;
    },
    [connections]
  );

  const getAllConnections = useCallback((): JsSIPConnectionState[] => {
    return Array.from(connections.values());
  }, [connections]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnectAll();
    };
  }, [disconnectAll]);

  const contextValue: JsSIPContextValue = useMemo(
    () => ({
      // Connection Management
      connections,
      connectToExtension,
      disconnectFromExtension,
      disconnectAll,

      // Call Management
      activeCalls,
      makeCall,
      terminateCall,
      answerCall,
      holdCall,
      resumeCall,

      // Utility Methods
      isExtensionConnected,
      getConnectionState,
      getAllConnections,

      // Server Configuration
      serverConfig: { domain, webSocketServer },

      // Status
      isInitialized,
    }),
    [
      connections,
      connectToExtension,
      disconnectFromExtension,
      disconnectAll,
      activeCalls,
      makeCall,
      terminateCall,
      answerCall,
      holdCall,
      resumeCall,
      isExtensionConnected,
      getConnectionState,
      getAllConnections,
      domain,
      webSocketServer,
      isInitialized,
    ]
  );

  return <JsSIPContext.Provider value={contextValue}>{children}</JsSIPContext.Provider>;
};

export const useJsSIPContext = (): JsSIPContextValue | null => {
  const context = useContext(JsSIPContext);
  if (!context) {
    // Return null instead of throwing error when VOIP server is not available
    // Components should handle this gracefully or use useSafeJsSIP hook
    return null;
  }
  return context;
};
