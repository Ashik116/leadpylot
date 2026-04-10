'use client';

import { useEffect, useCallback, useMemo } from 'react';
import { useSafeJsSIP } from './useJsSIP';
import { Role } from '@/configs/navigation.config/auth.route.config';
import { useQuery } from '@tanstack/react-query';
import { apiGetVoipServers } from '@/services/SettingsService';
import { useSession } from './useSession';

// localStorage key for admin SIP connection state
const ADMIN_SIP_CONNECTED_KEY = 'admin_sip_connected';

/**
 * Global Admin SIP Connection Hook
 *
 * Maintains persistent SIP connection for admin users that survives page refreshes.
 * Connection persists until manually disconnected or user signs out.
 *
 * This enables supervisors to receive calls and use supervision features
 * from anywhere in the application.
 */
export const useGlobalAdminSIP = () => {
  const { data: session, status: sessionStatus } = useSession();
  const {
    connectToExtension,
    disconnectFromExtension,
    connections,
    connectStatus,
    registerStatus,
  } = useSafeJsSIP();

  const isAdmin = session?.user?.role === Role.ADMIN;
  const isSessionLoading = sessionStatus === 'loading';

  // Get VoIP server configuration
  const { data: voipServers } = useQuery({
    queryKey: ['voip-servers'],
    queryFn: apiGetVoipServers,
    enabled: !isSessionLoading && isAdmin, // Wait for session to load and user to be admin
    // Cache for 5 minutes
  });

  const voipServerInfo = voipServers?.data?.[0]?.info;

  // Admin SIP credentials from user profile (set via admin panel)
  const adminCredentials = useMemo(
    () => ({
      voip_username: session?.user?.voip_extension || '',
      voip_password: session?.user?.voip_password || '',
    }),
    [session?.user?.voip_extension, session?.user?.voip_password]
  );

  const adminExt = adminCredentials.voip_username;
  const adminConnection = connections.find((conn: any) => conn.extension === adminExt);
  const isSipConnected = adminConnection?.registered || false;

  // Debug admin connection (only in dev mode)

  // Utility functions for localStorage persistence
  const saveConnectionState = useCallback((connected: boolean) => {
    if (typeof window !== 'undefined') {
      try {
        if (connected) {
          localStorage.setItem(ADMIN_SIP_CONNECTED_KEY, 'true');
        } else {
          localStorage.removeItem(ADMIN_SIP_CONNECTED_KEY);
        }
      } catch (error) {
        // Handle localStorage errors silently
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.warn('Failed to save SIP connection state:', error);
        }
      }
    }
  }, []);

  const getSavedConnectionState = useCallback((): boolean => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem(ADMIN_SIP_CONNECTED_KEY) === 'true';
      } catch (error) {
        // Handle localStorage errors silently
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.warn('Failed to read SIP connection state:', error);
        }
      }
    }
    return false;
  }, []);

  const clearConnectionState = useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(ADMIN_SIP_CONNECTED_KEY);
      } catch (error) {
        // Handle localStorage errors silently
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.warn('Failed to clear SIP connection state:', error);
        }
      }
    }
  }, []);

  // Global SIP connection function
  const connectToSIP = useCallback(async (): Promise<void> => {
    if (!isAdmin) {
      // eslint-disable-next-line no-console
      console.warn('🚫 Global SIP: Only admin users can use supervisor features');
      return;
    }

    if (!voipServerInfo) {
      // eslint-disable-next-line no-console
      console.warn('🚫 Global SIP: VoIP server configuration not loaded');
      return;
    }

    if (!adminCredentials.voip_username || !adminCredentials.voip_password) {
      // eslint-disable-next-line no-console
      console.error('🚫 Global SIP: Admin credentials not configured');
      return;
    }

    try {
      await connectToExtension(
        adminCredentials.voip_username,
        adminCredentials.voip_password,
        'Admin Extension'
      );

      // Save connection state to localStorage
      saveConnectionState(true);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('❌ Global SIP: Connection failed:', {
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });

      // Clear connection state on failure
      saveConnectionState(false);
      throw error; // Re-throw to let UI handle the error
    }
  }, [
    isAdmin,
    voipServerInfo,
    adminCredentials.voip_username,
    adminCredentials.voip_password,
    connectToExtension,
    saveConnectionState,
  ]);

  // Manual disconnect function
  const disconnectFromSIP = useCallback(async (): Promise<void> => {
    if (!isAdmin) {
      // eslint-disable-next-line no-console
      console.warn('🚫 Global SIP: Only admin users can disconnect from supervisor extension');
      return;
    }

    try {
      disconnectFromExtension(adminExt);

      // Clear connection state from localStorage
      clearConnectionState();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('❌ Global SIP: Disconnect failed:', {
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });

      // Clear connection state even on error
      clearConnectionState();
    }
  }, [isAdmin, disconnectFromExtension, clearConnectionState]);

  // DISABLED: Auto-reconnect effect - admin must manually connect
  // No auto-reconnection - admin needs to click "Connect to SIP" button manually

  // Cleanup effect - clear connection state when user signs out
  useEffect(() => {
    // Only clear connection state if session is loaded and user is no longer admin
    // This prevents clearing state during initial page load while session is loading
    if (!isSessionLoading && !isAdmin && getSavedConnectionState()) {
      clearConnectionState();
    }
  }, [isAdmin, isSessionLoading, getSavedConnectionState, clearConnectionState]);

  // Return connection state for components that need it
  return {
    isSipConnected,
    connectStatus,
    registerStatus,
    isAdmin,
    voipServerInfo,
    connectToSIP, // Manual connection function
    disconnectFromSIP, // Manual disconnect function
    clearConnectionState, // Manual clear function (for sign out)
    adminCredentials,
  };
};

export default useGlobalAdminSIP;
