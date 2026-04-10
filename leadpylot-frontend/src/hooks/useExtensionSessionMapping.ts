/**
 * Hook to map extensions to their corresponding SIP sessions
 * Enables intelligent call routing from the correct extension
 */

import { useCallback } from 'react';
import { useSafeJsSIP } from './useJsSIP';
import { isDev } from '@/utils/utils';

interface SessionMatch {
  sessionId: string;
  session: any;
}

export const useExtensionSessionMapping = () => {
  const { connections, activeCalls } = useSafeJsSIP();

  /**
   * Find the SIP connection that corresponds to a specific extension
   */
  const findSessionByExtension = useCallback((targetExtension: string): SessionMatch | null => {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.log('🔍 [SESSION-MAP] Searching for extension:', targetExtension, 'in', connections.length, 'connections');
    }
    
    // Find the connection for the target extension
    const targetConnection = connections.find(conn => conn.extension === targetExtension);
    
    if (!targetConnection) {
      if (isDev) {
        // eslint-disable-next-line no-console
        console.warn('❌ [SESSION-MAP] Extension not found:', targetExtension, 'Available extensions:', 
          connections.map(conn => ({
            ext: conn.extension,
            registered: conn.registered,
            connecting: conn.connecting
          }))
        );
      }
      return null;
    }
    
    // Check if the extension is registered and available
    if (!targetConnection.registered) {
      if (isDev) {
        // eslint-disable-next-line no-console
        console.warn('❌ [SESSION-MAP] Extension not registered:', targetExtension, 'State:', {
          registered: targetConnection.registered,
          connecting: targetConnection.connecting,
          error: targetConnection.error
        });
      }
      return null;
    }
    
    if (isDev) {
      // eslint-disable-next-line no-console
      console.log('🎯 [CALL] Found registered connection for extension:', targetExtension);
    }
    
    // Return a session-like object for backward compatibility
    return { 
      sessionId: `connection-${targetExtension}`,
      session: {
        id: `connection-${targetExtension}`,
        extension: targetExtension,
        userAgent: targetConnection.userAgent,
        state: 'Established', // Connection is established if registered
        localIdentity: {
          uri: {
            user: targetExtension
          }
        },
        // Add methods for making calls
        invite: (uri: string, options?: any) => {
          return targetConnection.userAgent?.call(uri, options);
        }
      }
    };
  }, [connections]);

  /**
   * Get the extension for a given connection/session ID
   */
  const getExtensionForSession = useCallback((sessionId: string): string | null => {
    // Handle both connection IDs and call session IDs
    if (sessionId.startsWith('connection-')) {
      return sessionId.replace('connection-', '');
    }
    
    // Look for active calls
    const call = activeCalls.find(call => call.id === sessionId);
    return call?.extension || null;
  }, [activeCalls]);

  /**
   * Get all active connections and calls with their extensions
   */
  const getActiveSessionsWithExtensions = useCallback(() => {
    const connectionSessions = connections.map(conn => ({
      sessionId: `connection-${conn.extension}`,
      extension: conn.extension,
      state: conn.registered ? 'Established' : 'Connecting',
      isActive: conn.registered
    }));
    
    const callSessions = activeCalls.map(call => ({
      sessionId: call.id,
      extension: call.extension,
      state: call.state,
      isActive: call.state !== 'terminated'
    }));
    
    return [...connectionSessions, ...callSessions];
  }, [connections, activeCalls]);

  return {
    findSessionByExtension,
    getExtensionForSession,
    getActiveSessionsWithExtensions,
    totalSessions: connections.length + activeCalls.length,
    hasMultipleSessions: connections.length > 1
  };
};
