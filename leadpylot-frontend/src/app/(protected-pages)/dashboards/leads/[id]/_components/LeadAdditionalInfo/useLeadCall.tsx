import Notification from '@/components/ui/Notification';
import toast from '@/components/ui/toast';
import { usePhoneUIStore } from '@/stores/phoneUIStore';
import { useJsSIP } from '@/hooks/useJsSIP';
import { useQuery } from '@tanstack/react-query';
import { apiGetVoipServers } from '@/services/SettingsService';
import { useOutgoingCall } from '@/services/hooks/useCalls';
import { isDev } from '@/utils/utils';
import { useState, useCallback, useEffect } from 'react';
import { CONNECT_STATUS, RegisterStatus } from '@/hooks/useJsSIP';
import { callMonitor, monitorCallStart, monitorSIPConnection } from '@/utils/callMonitoring';
import { useSelectedProjectStore } from '@/stores/selectedProjectStore';
import { useAgentAllExtensions } from '@/hooks/useAgentAllExtensions';
import { useSession } from '@/hooks/useSession';

export const useLeadCall = () => {
  const setPhoneUIState = usePhoneUIStore((s) => s.setPhoneUIState);
  const { sessionManager, connectStatus, registerStatus, makeCall, isExtensionConnected } = useJsSIP();
  const outgoingCallMutation = useOutgoingCall();
  const [isCallInProgress, setIsCallInProgress] = useState(false);
  const [hasUserMediaAccess, setHasUserMediaAccess] = useState<boolean | null>(null);

  const { selectedProject } = useSelectedProjectStore();
  const { data: session } = useSession();
  const { allExtensions } = useAgentAllExtensions();

  // Get VoIP server configuration
  const {
    data: voipServers,
    isLoading: isVoipLoading,
    error: voipError,
  } = useQuery({
    queryKey: ['voip-servers'],
    queryFn: apiGetVoipServers,
    retry: 3,
    retryDelay: 1000,
  });

  const firstServerInfo = voipServers?.data?.[0]?.info;

  // Check for microphone access on mount
  useEffect(() => {
    const checkUserMediaAccess = async () => {
      try {
        // Request access to user media (microphone and camera)
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });

        // If successful, we have access
        setHasUserMediaAccess(true);

        // Stop the stream since we were just checking access
        stream.getTracks().forEach((track) => track.stop());
      } catch {
        setHasUserMediaAccess(false);
      }
    };

    checkUserMediaAccess();
  }, []);

  // Monitor SIP connection status changes
  useEffect(() => {
    monitorSIPConnection(connectStatus === CONNECT_STATUS.CONNECTED, {
      connectStatus,
      registerStatus,
      timestamp: new Date().toISOString(),
    });
  }, [connectStatus, registerStatus]);

  // Enhanced validation function
  const validateCallPrerequisites = useCallback(
    (lead: any) => {
      const errors: string[] = [];

      // Check lead phone number or VoIP extension - we require at least one
      // Note: VoIP extension is preferred and works for all users (masked/unmasked)
      if (!lead.phone && !lead.voip_extension) {
        errors.push('Lead has no phone number or VoIP extension configured');
      }

      // Check microphone access
      if (hasUserMediaAccess === false) {
        errors.push(
          'Microphone access is required for making calls. Please allow microphone access and try again.'
        );
      } else if (hasUserMediaAccess === null) {
        errors.push('Checking microphone access, please wait...');
      }

      // Check VoIP server configuration
      if (isVoipLoading) {
        errors.push('VoIP configuration is still loading, please wait...');
      } else if (voipError) {
        errors.push('Failed to load VoIP configuration. Please contact your administrator.');
      } else if (!firstServerInfo?.domain) {
        errors.push('No VoIP server configuration found. Please contact your administrator.');
      } else if (!firstServerInfo?.websocket_address) {
        errors.push('VoIP WebSocket configuration is missing. Please contact your administrator.');
      }

      // Check SIP connection status
      if (connectStatus === CONNECT_STATUS.DISCONNECTED) {
        errors.push(
          'SIP connection is disconnected. Please wait for automatic reconnection or refresh the page.'
        );
      } else if (connectStatus === CONNECT_STATUS.WAIT_REQUEST_CONNECT) {
        errors.push('SIP connection is still establishing. Please wait a moment and try again.');
      }

      // Check SIP registration status
      if (registerStatus !== RegisterStatus.REGISTERED) {
        errors.push('SIP registration is not active. Please wait for registration to complete.');
      }

      // Check if session manager is available
      if (!sessionManager) {
        errors.push('SIP session manager is not available. Please refresh the page.');
      }

      return errors;
    },
    [
      firstServerInfo,
      connectStatus,
      registerStatus,
      sessionManager,
      isVoipLoading,
      voipError,
      hasUserMediaAccess,
    ]
  );

  const handleCall = useCallback(
    async (lead: {
      phone?: string;
      contact_name?: string;
      _id: string;
      project?: Array<{ _id: string }>;
      voip_extension?: string;
    }) => {
      // Prevent multiple concurrent calls
      if (isCallInProgress) {
        toast.push(
          <Notification title="Call In Progress" type="warning">
            Please wait for the current call to complete before starting a new one.
          </Notification>,
          { placement: 'top-center' }
        );
        return;
      }

      // Validate all prerequisites before attempting call
      const validationErrors = validateCallPrerequisites(lead);
      if (validationErrors.length > 0) {
        toast.push(
          <Notification title="Cannot Make Call" type="warning">
            {validationErrors[0]}
          </Notification>,
          { placement: 'top-center' }
        );
        return;
      }

      setIsCallInProgress(true);

      try {
        // Open phone UI first
        setPhoneUIState({
          isOpen: true,
          contactName: lead.contact_name,
          leadId: lead._id,
          projectId: lead.project?.[0]?._id,
        });

        // ✅ ENHANCED CALLING STRATEGY
        // PRIORITY: Always use VoIP extension when available (works for both masked/unmasked users)
        // FALLBACK: Use direct phone number only if no extension exists
        let sipUri = '';
        let callingNumber = '';
        let callingMethod: 'extension' | 'direct' = 'direct';
        let fallbackReason = '';

        // STEP 1: Try to use VoIP extension (HIGHEST PRIORITY)
        // Extensions work for ALL users regardless of masking permission
        if (lead.voip_extension) {
          const cleanExtension = lead.voip_extension.replace(/\D/g, '');
          if (cleanExtension) {
            // Use extension - FreePBX will route it to the actual number
            sipUri = `sip:${cleanExtension}@${firstServerInfo!.domain}`;
            callingNumber = cleanExtension;
            callingMethod = 'extension';
            
            isDev && console.log(
              '📞 ✅ Using VoIP Extension:',
              cleanExtension,
              '(FreePBX will route to actual number)'
            );
          } else {
            fallbackReason = 'Invalid extension format - falling back to direct number';
            isDev && console.warn('⚠️ Invalid extension format:', lead.voip_extension);
          }
        } else {
          fallbackReason = 'No VoIP extension available - using direct number';
          isDev && console.log('ℹ️ No VoIP extension for lead:', lead._id);
        }

        // STEP 2: Fallback to direct phone number if extension is not available or invalid
        if (callingMethod === 'direct') {
          const cleanPhone = lead.phone?.replace(/\D/g, '') || '';
          if (!cleanPhone) {
            throw new Error('No phone number or valid extension available for calling');
          }
          
          sipUri = `sip:${cleanPhone}@${firstServerInfo!.domain}`;
          callingNumber = cleanPhone;
          
          isDev && console.log(
            '📞 ⚠️ Using direct phone:',
            cleanPhone,
            fallbackReason ? `(Reason: ${fallbackReason})` : ''
          );
        }

        // Single extension per user - read from session profile
        const fromExtension: string | undefined =
          session?.user?.voip_extension || allExtensions[0]?.extension;

        if (!fromExtension) {
          throw new Error(
            'Cannot make call: No VoIP extension configured on your user profile. ' +
            'Please ask an admin to assign you a VoIP extension.'
          );
        }

        if (!isExtensionConnected(fromExtension)) {
          throw new Error(
            `Extension ${fromExtension} is not connected. ` +
            'Please wait for extension registration to complete or try reconnecting.'
          );
        }

        // Generate a unique session ID for monitoring
        const sessionId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Start monitoring this call
        monitorCallStart(sessionId, lead._id, callingNumber);

        try {
          // Prepare call options with FROM extension specified
          const callOptions: any = {
            extraHeaders: [
              'X-Lead-ID: ' + lead._id,
              'X-Contact-Name: ' + (lead.contact_name || 'Unknown'),
              'X-Session-ID: ' + sessionId,
            ],
          };

          // Set outbound caller ID from the project's outbound_cid
          // so the customer sees the project's phone number, not the agent's extension
          if (firstServerInfo?.domain) {
            const outboundCid = (selectedProject as any)?.outbound_cid;
            const callerIdentity = outboundCid || fromExtension;

            callOptions.extraHeaders.push(
              `P-Asserted-Identity: <sip:${callerIdentity}@${firstServerInfo.domain}>`
            );
            callOptions.extraHeaders.push(
              `Remote-Party-ID: <sip:${callerIdentity}@${firstServerInfo.domain}>;party=calling;privacy=off`
            );
          }

          // ✅ FIXED: Use JsSIP Provider's makeCall method
          if (isDev) {
            // eslint-disable-next-line no-console
            console.log(
              '🎯 [CALL-FLOW] Using JsSIP makeCall - fromExtension:',
              fromExtension,
              'to:',
              sipUri
            );
          }

          // Use JsSIP Provider's makeCall method with the determined extension
          const callPromise = makeCall(fromExtension!, sipUri, {
            extraHeaders: callOptions.extraHeaders,
            audioConstraints: callOptions.mediaConstraints?.audio,
            videoConstraints: callOptions.mediaConstraints?.video,
          });

          if (isDev) {
            // eslint-disable-next-line no-console
            console.log('📞 [JsSIP] makeCall invoked - should create call session:', {
              fromExtension,
              sipUri,
              hasExtraHeaders: !!callOptions.extraHeaders?.length,
            });
          }

          // Add timeout to prevent hanging calls
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Call initiation timeout')), 10000)
          );

          await Promise.race([callPromise, timeoutPromise]);

          // Log successful call initiation
          callMonitor.updateSession(sessionId, 'ringing');
        } catch (callError) {
          // Log call initiation failure
          const errorMessage =
            callError instanceof Error ? callError.message : 'Unknown call error';
          callMonitor.updateSession(sessionId, 'failed', undefined, errorMessage);

          throw callError;
        }

        // Log the call to backend (non-blocking)
        try {
          await outgoingCallMutation.mutateAsync({
            lead_id: lead._id,
            project_id: lead.project?.[0]?._id || '',
            phone_number: callingNumber,
            call_duration: 0,
            call_status: 'initiated',
            notes: `Call initiated to ${lead.contact_name || 'Unknown'} via ${callingMethod}${fallbackReason ? ` (${fallbackReason})` : ''}`,
          });
        } catch {
          // Don't break the call flow if logging fails
        }

        toast.push(
          <Notification title="Call Initiated Successfully" type="success">
            Calling {lead.contact_name || 'Unknown'} ({callingNumber}) via {callingMethod}
            {fallbackReason && (
              <div className="mt-1 text-xs text-amber-600">{fallbackReason}</div>
            )}
          </Notification>,
          { placement: 'top-center' }
        );
      } catch (error) {
        let errorMessage = 'Unknown error occurred';
        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (typeof error === 'string') {
          errorMessage = error;
        }

        // Enhanced error messages for common issues
        if (errorMessage.includes('timeout')) {
          errorMessage =
            'Call connection timed out. Please check your internet connection and try again.';
        } else if (errorMessage.includes('network')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (errorMessage.includes('register') || errorMessage.includes('authentication')) {
          errorMessage = 'SIP authentication failed. Please contact your administrator.';
        } else if (
          errorMessage.includes('Requested device not found') ||
          errorMessage.includes('NotFoundError')
        ) {
          errorMessage =
            'Microphone not found or access denied. Please check your microphone permissions and try again.';
        } else if (errorMessage.includes('AbortError')) {
          errorMessage = 'Call was interrupted. Please try again.';
        }

        // Log the error for monitoring
        callMonitor.logEvent({
          type: 'call_failed',
          leadId: lead._id,
          phoneNumber: lead.voip_extension || lead.phone || '',
          error: errorMessage,
          metadata: {
            connectStatus,
            registerStatus,
            voipServerDomain: firstServerInfo?.domain,
            originalError: error instanceof Error ? error.message : String(error),
          },
        });

        toast.push(
          <Notification title="Call Failed" type="danger">
            {errorMessage}
          </Notification>,
          { placement: 'top-center' }
        );

        // Close phone UI if call failed
        setPhoneUIState({ isOpen: false });
      } finally {
        setIsCallInProgress(false);
      }
    },
    [
      isCallInProgress,
      validateCallPrerequisites,
      setPhoneUIState,
      firstServerInfo,
      connectStatus,
      registerStatus,
      makeCall,
      isExtensionConnected,
      outgoingCallMutation,
      selectedProject,
      session?.user?.id,
      session?.user?.role,
      session?.user?.voip_extension,
      allExtensions,
    ]
  );

  return {
    handleCall,
    isCallInProgress,
    connectStatus,
    registerStatus,
    isVoipConfigLoading: isVoipLoading,
    voipConfigError: voipError,
    hasUserMediaAccess,
    isSystemReady:
      !isVoipLoading &&
      !voipError &&
      firstServerInfo &&
      connectStatus === CONNECT_STATUS.CONNECTED &&
      registerStatus === RegisterStatus.REGISTERED &&
      hasUserMediaAccess === true,
    hasMultipleExtensions: false,
    totalExtensions: allExtensions.length,
    allExtensions: allExtensions.map((ext) => ({
      extension: ext.extension,
      project: ext.projectName,
    })),
  };
};
