/**
 * useJsSIP Hook
 * Main hook for interacting with JsSIP multi-extension functionality
 * Replaces useSIPProvider from react-sipjs
 */

'use client';

import { useCallback, useMemo } from 'react';
import { useJsSIPContext } from '@/components/providers/JsSIPProvider';
import {
  JsSIPConnection,
  JsSIPCallSession,
  ExtensionCredentials,
  CallOptions,
  ConnectStatus,
} from '@/types/jssip';
import { isDev } from '@/utils/utils';

export interface UseJsSIPReturn {
  // Connection Management
  connections: JsSIPConnection[];
  connectToExtension: (extension: string, password: string, displayName?: string) => Promise<void>;
  disconnectFromExtension: (extension: string) => void;
  disconnectAll: () => void;

  // Call Management
  activeCalls: JsSIPCallSession[];
  makeCall: (
    fromExtension: string,
    target: string,
    options?: CallOptions
  ) => Promise<JsSIPCallSession>;
  terminateCall: (callId: string) => Promise<void>;
  answerCall: (callId: string) => Promise<void>;
  holdCall: (callId: string) => Promise<void>;
  resumeCall: (callId: string) => Promise<void>;

  // Status & Utility
  isExtensionConnected: (extension: string) => boolean;
  getConnectionByExtension: (extension: string) => JsSIPConnection | null;
  hasActiveConnections: boolean;
  totalConnections: number;

  // Backward Compatibility (for easy migration from react-sipjs)
  connectAndRegister: (credentials: {
    username: string;
    password: string;
    displayName?: string;
  }) => Promise<void>;
  sessions: Record<string, any>; // Mapped from activeCalls for compatibility
  connectStatus: ConnectStatus;
  registerStatus: 'REGISTERED' | 'UNREGISTERED' | 'REGISTERING' | 'FAILED';
  sessionManager: {
    call: (uri: string, options?: any) => Promise<JsSIPCallSession>;
    terminate: (callId: string) => Promise<void>;
  };

  // Server Configuration
  serverConfig: { domain: string; webSocketServer: string };
  isInitialized: boolean;
}

export const useJsSIP = (): UseJsSIPReturn => {
  const context = useJsSIPContext();

  // Transform connections map to array with backward compatibility format
  const connections: JsSIPConnection[] = useMemo(() => {
    if (!context) return [];
    return Array.from(context.connections.values())
      .map((conn) => ({
        extension: conn.extension,
        userAgent: conn.userAgent!,
        registered: conn.registered,
        connecting: conn.connecting,
        registering: conn.registering,
        error: conn.error,
        lastRegistered: conn.lastConnected,
      }))
      .filter((conn) => conn.userAgent); // Only return connections with valid UserAgent
  }, [context]);

  // Transform activeCalls map to array
  const activeCalls: JsSIPCallSession[] = useMemo(() => {
    if (!context) return [];
    return Array.from(context.activeCalls.values());
  }, [context]);

  // Enhanced connect function with better error handling
  const connectToExtension = useCallback(
    async (extension: string, password: string, displayName?: string): Promise<void> => {
      if (!context) return;
      try {
        const credentials: ExtensionCredentials = {
          extension,
          password,
          displayName: displayName || extension,
        };

        await context.connectToExtension(credentials);

        if (isDev) {
          // eslint-disable-next-line no-console
          console.log(`✅ Successfully connected to extension: ${extension}`);
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`❌ Failed to connect to extension ${extension}:`, error);
        throw error;
      }
    },
    [context]
  );

  // Enhanced makeCall with URI formatting
  const makeCall = useCallback(
    async (
      fromExtension: string,
      target: string,
      options?: CallOptions
    ): Promise<JsSIPCallSession> => {
      if (!context) {
        throw new Error('JsSIP provider not available');
      }
      try {
        // Format target as SIP URI if it's not already
        let sipUri = target;
        if (!target.startsWith('sip:')) {
          sipUri = `sip:${target}@${context.serverConfig.domain}`;
        }

        const call = await context.makeCall(fromExtension, sipUri, options);

        if (isDev) {
          // eslint-disable-next-line no-console
          console.log(`📞 Call initiated from ${fromExtension} to ${target}`);
        }

        return call;
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`❌ Failed to make call from ${fromExtension} to ${target}:`, error);
        throw error;
      }
    },
    [context]
  );

  // Get connection by extension
  const getConnectionByExtension = useCallback(
    (extension: string): JsSIPConnection | null => {
      if (!context) return null;
      const connectionState = context.getConnectionState(extension);
      if (!connectionState || !connectionState.userAgent) return null;

      return {
        extension: connectionState.extension,
        userAgent: connectionState.userAgent,
        registered: connectionState.registered,
        connecting: connectionState.connecting,
        registering: connectionState.registering,
        error: connectionState.error,
        lastRegistered: connectionState.lastConnected,
      };
    },
    [context]
  );

  // Status helpers
  const hasActiveConnections = useMemo(() => {
    return connections.some((conn) => conn.registered);
  }, [connections]);

  const totalConnections = useMemo(() => {
    return connections.length;
  }, [connections]);

  // Backward compatibility for react-sipjs migration

  // connectAndRegister - maps to connectToExtension for first available extension
  const connectAndRegister = useCallback(
    async (credentials: {
      username: string;
      password: string;
      displayName?: string;
    }): Promise<void> => {
      await connectToExtension(credentials.username, credentials.password, credentials.displayName);
    },
    [connectToExtension]
  );

  // Helper function to map JsSIP call states to react-sipjs SessionState values
  const mapCallStateToSessionState = useCallback(
    (callState: string, direction?: string): string => {
      switch (callState) {
        case 'connecting':
          return SessionState.Establishing;
        case 'ringing':
          // For incoming calls, 'ringing' means the call is waiting to be answered
          // For outgoing calls, 'ringing' means we're calling and waiting for answer
          return direction === 'incoming' ? SessionState.Incoming : SessionState.Establishing;
        case 'established':
          return SessionState.Established;
        case 'terminating':
          return SessionState.Terminating;
        case 'terminated':
          return SessionState.Terminated;
        default:
          return SessionState.Initial;
      }
    },
    []
  );

  // sessions - convert activeCalls to sessions format for backward compatibility
  const sessions = useMemo(() => {
    if (!context) return {};
    const sessionsRecord: Record<string, any> = {};
    activeCalls.forEach((call) => {
      const mappedState = mapCallStateToSessionState(call.state, call.direction);

      // Debug: Log session mapping (commented out - too verbose)
      // if (isDev) {
      //   console.log('🔄 useJsSIP Session Mapping:', {
      //     callId: call.id,
      //     originalState: call.state,
      //     mappedState,
      //     direction: call.direction,
      //   });
      // }

      sessionsRecord[call.id] = {
        id: call.id,
        direction: call.direction,
        state: mappedState, // ✅ Map to SessionState values
        remoteIdentity: {
          uri: {
            user: call.remoteNumber,
            toString: () => call.remoteUri,
          },
          displayName: call.remoteNumber,
        },
        localIdentity: {
          uri: {
            user: call.extension,
          },
        },
        startTime: call.startTime,
        // Add methods for backward compatibility
        terminate: () => context.terminateCall(call.id),
        answer: () => context.answerCall(call.id),
        hold: () => context.holdCall(call.id),
        unhold: () => context.resumeCall(call.id),
      };
    });

    // Debug: Log final sessions object (commented out - too verbose)
    // if (isDev && Object.keys(sessionsRecord).length > 0) {
    //   console.log('📋 useJsSIP Final Sessions Object:', sessionsRecord);
    // }

    return sessionsRecord;
  }, [activeCalls, context, mapCallStateToSessionState]);

  // connectStatus - determine overall connection status
  const connectStatus: ConnectStatus = useMemo(() => {
    if (connections.length === 0) return 'DISCONNECTED';
    if (connections.some((conn) => conn.connecting)) return 'CONNECTING';
    if (connections.some((conn) => conn.registering)) return 'WAIT_REQUEST_CONNECT';
    if (connections.some((conn) => conn.registered)) return 'CONNECTED';
    return 'DISCONNECTED';
  }, [connections]);

  // registerStatus - determine overall registration status
  const registerStatus: 'REGISTERED' | 'UNREGISTERED' | 'REGISTERING' | 'FAILED' = useMemo(() => {
    if (connections.length === 0) return 'UNREGISTERED';
    if (connections.some((conn) => conn.registering)) return 'REGISTERING';
    if (connections.some((conn) => conn.registered)) return 'REGISTERED';
    if (connections.some((conn) => conn.error)) return 'FAILED';
    return 'UNREGISTERED';
  }, [connections]);

  // sessionManager - backward compatibility wrapper
  const sessionManager = useMemo(
    () => ({
      call: async (uri: string, options?: any): Promise<JsSIPCallSession> => {
        // Use first available registered extension for backward compatibility
        const registeredConnection = connections.find((conn) => conn.registered);
        if (!registeredConnection) {
          throw new Error('No registered extensions available');
        }
        return makeCall(registeredConnection.extension, uri, options);
      },
      terminate: async (callId: string): Promise<void> => {
        if (context) {
          await context.terminateCall(callId);
        }
      },
    }),
    [connections, makeCall, context]
  );

  // If context is null (VOIP server not available), return safe defaults
  if (!context) {
    return getSafeDefaults();
  }

  return {
    // Modern JsSIP interface
    connections,
    connectToExtension,
    disconnectFromExtension: context.disconnectFromExtension,
    disconnectAll: context.disconnectAll,

    activeCalls,
    makeCall,
    terminateCall: context.terminateCall,
    answerCall: context.answerCall,
    holdCall: context.holdCall,
    resumeCall: context.resumeCall,

    isExtensionConnected: context.isExtensionConnected,
    getConnectionByExtension,
    hasActiveConnections,
    totalConnections,

    // Backward compatibility interface
    connectAndRegister,
    sessions,
    connectStatus,
    registerStatus,
    sessionManager,

    serverConfig: context.serverConfig,
    isInitialized: context.isInitialized,
  };
};

// Export compatibility constants
export const CONNECT_STATUS = {
  CONNECTED: 'CONNECTED' as const,
  DISCONNECTED: 'DISCONNECTED' as const,
  CONNECTING: 'CONNECTING' as const,
  WAIT_REQUEST_CONNECT: 'WAIT_REQUEST_CONNECT' as const,
  FAILED: 'FAILED' as const,
};

export const RegisterStatus = {
  REGISTERED: 'REGISTERED' as const,
  UNREGISTERED: 'UNREGISTERED' as const,
  REGISTERING: 'REGISTERING' as const,
  FAILED: 'FAILED' as const,
} as const;

// SessionState compatibility for components migrating from react-sipjs
export const SessionState = {
  Initial: 'Initial' as const,
  Incoming: 'Incoming' as const,
  Establishing: 'Establishing' as const,
  Established: 'Established' as const,
  Terminating: 'Terminating' as const,
  Terminated: 'Terminated' as const,
} as const;

// Helper function to get safe defaults when provider is not available
function getSafeDefaults(): UseJsSIPReturn {
  const emptyConnections: JsSIPConnection[] = [];
  const emptyCalls: JsSIPCallSession[] = [];
  const emptySessionsRecord: Record<string, any> = {};

  return {
    // Connection Management
    connections: emptyConnections,
    connectToExtension: () => Promise.resolve(),
    disconnectFromExtension: () => {},
    disconnectAll: () => {},

    // Call Management
    activeCalls: emptyCalls,
    makeCall: () => Promise.reject(new Error('JsSIP provider not available')),
    terminateCall: () => Promise.resolve(),
    answerCall: () => Promise.resolve(),
    holdCall: () => Promise.resolve(),
    resumeCall: () => Promise.resolve(),

    // Status & Utility
    isExtensionConnected: () => false,
    getConnectionByExtension: () => null,
    hasActiveConnections: false,
    totalConnections: 0,

    // Backward Compatibility
    connectAndRegister: () => Promise.resolve(),
    sessions: emptySessionsRecord,
    connectStatus: 'DISCONNECTED' as ConnectStatus,
    registerStatus: 'UNREGISTERED' as const,
    sessionManager: {
      call: () => Promise.reject(new Error('JsSIP provider not available')),
      terminate: () => Promise.resolve(),
    },

    // Server Configuration
    serverConfig: { domain: '', webSocketServer: '' },
    isInitialized: false,
  };
}

// Safe version that handles cases where provider isn't available
// Now this just calls useJsSIP which already handles null context
export const useSafeJsSIP = (): UseJsSIPReturn => {
  return useJsSIP();
};

// Backward compatibility hook alias
export const useSIPProvider = useJsSIP;
