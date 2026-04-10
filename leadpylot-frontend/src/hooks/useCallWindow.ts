'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGetVoipServers } from '@/services/SettingsService';
import { useSession } from './useSession';
import { useSelectedProjectStore } from '@/stores/selectedProjectStore';
import { useGlobalAdminSIP } from './useGlobalAdminSIP';
import { Role } from '@/configs/navigation.config/auth.route.config';
import callWindowService, { 
  CallWindowMessage, 
  CallStatus,
  CallWindowData 
} from '@/services/CallWindowService';

interface UseCallWindowReturn {
  // State
  isCallWindowOpen: boolean;
  callStatus: CallStatus;
  isLoading: boolean;
  error: string | null;

  // Actions
  openCallWindow: (params: {
    phoneNumber: string;
    contactName?: string;
    leadId?: string;
    projectId?: string;
    voipExtension?: string;
    direction?: 'outgoing' | 'incoming';
    sipExtension?: string;
    sipPassword?: string;
  }) => Window | null;
  closeCallWindow: () => void;
  focusCallWindow: () => void;

  // Configuration check
  isConfigured: boolean;
}

/**
 * Hook for managing the popup call window
 * 
 * This hook provides:
 * - Easy API to open calls in a popup window
 * - Real-time call status from the popup
 * - Automatic configuration from user credentials
 * 
 * Usage:
 * ```tsx
 * const { openCallWindow, isCallWindowOpen, callStatus } = useCallWindow();
 * 
 * const handleCall = () => {
 *   openCallWindow({
 *     phoneNumber: '+49123456789',
 *     contactName: 'John Doe',
 *     leadId: 'abc123',
 *   });
 * };
 * ```
 */
export const useCallWindow = (): UseCallWindowReturn => {
  // Initialize state with service's current values to avoid sync effects
  const [isCallWindowOpen, setIsCallWindowOpen] = useState(() => callWindowService.isWindowOpen());
  const [callStatus, setCallStatus] = useState<CallStatus>(() => callWindowService.getCallStatus());
  const [error, setError] = useState<string | null>(null);
  const isInitialMount = useRef(true);

  const { data: session } = useSession();
  const { selectedProject } = useSelectedProjectStore();
  const { adminCredentials, voipServerInfo: adminVoipInfo } = useGlobalAdminSIP();

  // Get VoIP server configuration
  const { data: voipServers, isLoading: isLoadingVoip } = useQuery({
    queryKey: ['voip-servers'],
    queryFn: apiGetVoipServers,
    enabled: !!session,
  });

  const isAdmin = session?.user?.role === Role.ADMIN;

  // SIP credentials come from the user profile (single extension per user)
  const sipCredentials = useMemo(() => {
    return {
      extension: session?.user?.voip_extension || adminCredentials.voip_username || '',
      password: session?.user?.voip_password || adminCredentials.voip_password || '',
    };
  }, [session?.user?.voip_extension, session?.user?.voip_password, adminCredentials.voip_username, adminCredentials.voip_password]);

  const serverInfo = isAdmin ? adminVoipInfo : voipServers?.data?.[0]?.info;

  const isConfigured = !!(
    sipCredentials.extension &&
    sipCredentials.password &&
    serverInfo?.domain &&
    serverInfo?.websocket_address
  );

  // Subscribe to call window messages
  useEffect(() => {
    const unsubscribe = callWindowService.subscribe('useCallWindow', (message: CallWindowMessage) => {
      switch (message.type) {
        case 'WINDOW_READY':
          setIsCallWindowOpen(true);
          break;

        case 'WINDOW_CLOSED':
          setIsCallWindowOpen(false);
          setCallStatus({ isActive: false, state: 'idle' });
          break;

        case 'CALL_CONNECTED':
          setCallStatus({
            isActive: true,
            state: 'established',
            phoneNumber: message.payload?.phoneNumber,
            contactName: message.payload?.contactName,
            startTime: message.payload?.startTime,
          });
          break;

        case 'CALL_ENDED':
        case 'CALL_FAILED':
          setCallStatus({ isActive: false, state: 'idle' });
          break;

        case 'STATUS_UPDATE':
          if (message.payload) {
            setCallStatus(message.payload);
          }
          break;

        default:
          // Unknown message types are ignored
          break;
      }
    });

    // Skip initial state sync on mount (already initialized via useState callback)
    if (isInitialMount.current) {
      isInitialMount.current = false;
    }

    return () => {
      unsubscribe();
    };
  }, []);

  // Open call window
  const openCallWindow = useCallback((params: {
    phoneNumber: string;
    contactName?: string;
    leadId?: string;
    projectId?: string;
    voipExtension?: string;
    direction?: 'outgoing' | 'incoming';
    sipExtension?: string;
    sipPassword?: string;
  }): Window | null => {
    const effectiveExtension = params.sipExtension || sipCredentials.extension;
    const effectivePassword = params.sipPassword || sipCredentials.password;

    const effectiveConfigured = !!(
      effectiveExtension &&
      effectivePassword &&
      serverInfo?.domain &&
      serverInfo?.websocket_address
    );

    if (!effectiveConfigured) {
      setError('VoIP not configured. Please select a project or check your settings.');
      return null;
    }

    const callData: CallWindowData = {
      phoneNumber: params.phoneNumber,
      contactName: params.contactName,
      leadId: params.leadId,
      projectId: params.projectId || selectedProject?._id,
      extension: effectiveExtension,
      password: effectivePassword,
      domain: serverInfo?.domain || '',
      websocketUrl: serverInfo?.websocket_address || '',
      direction: params.direction || 'outgoing',
      voipExtension: params.voipExtension,
    };

    setError(null);
    const popup = callWindowService.openCallWindow(callData);

    if (!popup) {
      setError('Popup was blocked. Please allow popups for this site.');
    }

    return popup;
  }, [sipCredentials, serverInfo, selectedProject]);

  // Close call window
  const closeCallWindow = useCallback(() => {
    callWindowService.closeCallWindow();
    setIsCallWindowOpen(false);
    setCallStatus({ isActive: false, state: 'idle' });
  }, []);

  // Focus call window
  const focusCallWindow = useCallback(() => {
    callWindowService.focusCallWindow();
  }, []);

  return {
    isCallWindowOpen,
    callStatus,
    isLoading: isLoadingVoip,
    error,
    openCallWindow,
    closeCallWindow,
    focusCallWindow,
    isConfigured,
  };
};

export default useCallWindow;

