/**
 * Supervisor Session Management Hook
 * Handles spy/whisper/barge functionality with mode switching and session cleanup
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useJsSIP } from './useJsSIP';
import { useSession } from './useSession';

export type SupervisorMode = 'spy' | 'whisper' | 'barge' | 'scan';

export interface SupervisorSession {
  callId: string;
  mode: SupervisorMode;
  sessionId: string;
  startTime: Date;
  isActive: boolean;
  targetExtension: string;
  targetAgent?: string;
}

export interface SupervisorSessionState {
  currentSession: SupervisorSession | null;
  isConnecting: boolean;
  error: string | null;
}

export const useSupervisorSession = () => {
  const { connectToExtension, connections, sessionManager } = useJsSIP();
  const { data: session } = useSession();
  const [sessionState, setSessionState] = useState<SupervisorSessionState>({
    currentSession: null,
    isConnecting: false,
    error: null
  });

  // Client-side only guard
  const isClient = typeof window !== 'undefined';

  const currentSessionRef = useRef<SupervisorSession | null>(null);

  // Update ref when state changes
  useEffect(() => {
    currentSessionRef.current = sessionState.currentSession;
  }, [sessionState.currentSession]);

  // Clean up terminated sessions
  useEffect(() => {
    if (!isClient || !currentSessionRef.current) return;

    const currentSessionId = currentSessionRef.current.sessionId;
    // Session state handled by the currentSessionRef directly in JsSIP
    
    // Check if the current session is still active
    if (currentSessionRef.current && !currentSessionRef.current.isActive) {
      const sessionDuration = currentSessionRef.current?.startTime 
        ? Date.now() - currentSessionRef.current.startTime.getTime()
        : 0;

      // Check for immediate termination (less than 5 seconds)
      const isImmediateTermination = sessionDuration < 5000;

      if (isImmediateTermination) {
        // eslint-disable-next-line no-console
        console.warn('⚠️ Supervisor session terminated immediately:', {
          sessionId: currentSessionId,
          duration: `${sessionDuration}ms`,
          mode: currentSessionRef.current?.mode,
          targetExtension: currentSessionRef.current?.targetExtension,
          possibleCauses: [
            'Target call may have ended during spy initiation',
            'ChanSpy could not find active channel for target extension',
            'FreePBX configuration issue with feature codes',
            'Permissions or access control blocking supervision'
          ]
        });

        setSessionState(prev => ({
          ...prev,
          currentSession: null,
          isConnecting: false,
          error: `Supervision session ended immediately (${sessionDuration}ms). The target call may have ended or is no longer active. Please verify the call is still in progress and try again.`
        }));
      } else {
        // eslint-disable-next-line no-console
        console.log('🎧 Supervisor session ended:', {
          mode: currentSessionRef.current.mode,
          duration: `${Math.round(sessionDuration / 1000)}s`
        });
        
        setSessionState(prev => ({
          ...prev,
          currentSession: null,
          isConnecting: false,
          error: null
        }));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connections]);

  // Generate supervision URI based on mode and target extension
  const generateSupervisionUri = useCallback((mode: SupervisorMode, targetExtension: string): string => {
    const baseUri = 'sip:';
    
    switch (mode) {
      case 'spy':
        // Spy: *2221 + extension (listen only - silent monitoring)
        return `${baseUri}*2221${targetExtension}@voip.leadpylot.com`;
      case 'whisper':
        // Whisper: *2222 + extension (coach agent - agent hears you, caller doesn't)
        return `${baseUri}*2222${targetExtension}@voip.leadpylot.com`;
      case 'barge':
        // Barge: *2223 + extension (join conversation - 3-way call)
        return `${baseUri}*2223${targetExtension}@voip.leadpylot.com`;
      case 'scan':
        // Scan: *2220 (scan through all active calls, use # to cycle)
        return `${baseUri}*2220@voip.leadpylot.com`;
      default:
        throw new Error(`Unknown supervision mode: ${mode}`);
    }
  }, []);

  // End current supervisor session
  const endCurrentSession = useCallback(async (): Promise<void> => {
    if (!isClient || !currentSessionRef.current) return;

    const { sessionId, mode } = currentSessionRef.current;
    // In JsSIP, we handle session state directly through the session reference
    
    if (currentSessionRef.current && currentSessionRef.current.isActive) {
      try {
        // eslint-disable-next-line no-console
        console.log(`🔚 Ending ${mode} session:`, sessionId);
        // Session termination handled by sessionManager
        
        // Update state immediately
        setSessionState(prev => ({
          ...prev,
          currentSession: null,
          isConnecting: false,
          error: null
        }));
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`❌ Error ending ${mode} session:`, error);
        // Still clear the session state even if bye() fails
        setSessionState(prev => ({
          ...prev,
          currentSession: null,
          isConnecting: false,
          error: `Failed to end ${mode} session cleanly`
        }));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connections]);

  // Start a new supervisor session
  const startSupervisionSession = useCallback(async (
    callId: string,
    mode: SupervisorMode,
    targetExtension: string,
    targetAgent?: string
  ): Promise<void> => {
    // Only run on client-side
    if (!isClient) {
      // eslint-disable-next-line no-console
      console.warn('Supervisor session can only be started on client-side');
      return;
    }

    try {
      setSessionState(prev => ({ ...prev, isConnecting: true, error: null }));

      // End current session if exists
      if (currentSessionRef.current) {
        // eslint-disable-next-line no-console
        console.log(`🔄 Switching from ${currentSessionRef.current.mode} to ${mode}`);
        await endCurrentSession();
        // Small delay to ensure session cleanup
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // eslint-disable-next-line no-console
      console.log(`🎧 Starting ${mode} session for call:`, callId, 'extension:', targetExtension, 'using FreePBX ChanSpy feature codes');

      // Generate supervision URI based on mode
      const supervisionUri = generateSupervisionUri(mode, targetExtension);
      
      // Initiate SIP call for supervision
      const inviterOptions = {
        sessionDescriptionHandlerOptions: {
          constraints: {
            audio: true,
            video: false
          }
        }
      };

      // Ensure we're connected first (admin should already be connected globally)
      // But let's make sure the connection is established
      try {
        const ext = session?.user?.voip_extension;
        const pwd = session?.user?.voip_password;
        if (ext && pwd) {
          await connectToExtension(ext, pwd, 'Admin');
        }
      } catch (connectionError) {
        // If already connected, this might throw, which is OK
        // eslint-disable-next-line no-console
        console.log('Connection attempt result:', connectionError);
      }

      // Make the supervision call using the sessionManager
      if (!sessionManager) {
        throw new Error('SIP sessionManager not available - ensure SIP connection is established');
      }

      // eslint-disable-next-line no-console
      console.log(`📞 Initiating ${mode} call to:`, supervisionUri);
      
      const supervisionSession = await sessionManager.call(supervisionUri, inviterOptions);
      
      // Create session object
      const newSession: SupervisorSession = {
        callId,
        mode,
        sessionId: supervisionSession.id || `${mode}-${Date.now()}`,
        startTime: new Date(),
        isActive: true,
        targetExtension,
        targetAgent
      };

      setSessionState(prev => ({
        ...prev,
        currentSession: newSession,
        isConnecting: false,
        error: null
      }));

      // eslint-disable-next-line no-console
      console.log(`✅ ${mode} session started successfully:`, supervisionSession.id || newSession.sessionId);

    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`❌ Failed to start ${mode} session:`, error);
      setSessionState(prev => ({
        ...prev,
        currentSession: null,
        isConnecting: false,
        error: `Failed to start ${mode} session: ${error instanceof Error ? error.message : 'Unknown error'}`
      }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectToExtension, endCurrentSession, generateSupervisionUri, sessionManager]);

  // Public API methods
  const spy = useCallback((callId: string, targetExtension: string, targetAgent?: string) => {
    return startSupervisionSession(callId, 'spy', targetExtension, targetAgent);
  }, [startSupervisionSession]);

  const whisper = useCallback((callId: string, targetExtension: string, targetAgent?: string) => {
    return startSupervisionSession(callId, 'whisper', targetExtension, targetAgent);
  }, [startSupervisionSession]);

  const barge = useCallback((callId: string, targetExtension: string, targetAgent?: string) => {
    return startSupervisionSession(callId, 'barge', targetExtension, targetAgent);
  }, [startSupervisionSession]);

  const scan = useCallback(() => {
    // Scan mode doesn't target a specific call, so we use a generic identifier
    return startSupervisionSession('scan-all-calls', 'scan', '', 'all');
  }, [startSupervisionSession]);

  const endSession = useCallback(() => {
    return endCurrentSession();
  }, [endCurrentSession]);

  // Check if currently supervising a specific call
  const isSupervising = useCallback((callId: string): boolean => {
    return sessionState.currentSession?.callId === callId && sessionState.currentSession?.isActive;
  }, [sessionState.currentSession]);

  // Get current supervision mode for a call
  const getSupervisionMode = useCallback((callId: string): SupervisorMode | null => {
    if (isSupervising(callId)) {
      return sessionState.currentSession?.mode || null;
    }
    return null;
  }, [sessionState.currentSession, isSupervising]);

  return {
    // State
    currentSession: sessionState.currentSession,
    isConnecting: sessionState.isConnecting,
    error: sessionState.error,
    
    // Actions
    spy,
    whisper,
    barge,
    scan,
    endSession,
    
    // Utilities
    isSupervising,
    getSupervisionMode,
  };
};