/**
 * JsSIP Integration Types
 * TypeScript definitions for multi-extension SIP functionality
 */

import * as JsSIP from 'jssip';

// JsSIP RTCSession interface (using any for now due to typing limitations)
export interface JsSIPRTCSession {
  id: string;
  direction: 'incoming' | 'outgoing';
  state: string;
  remote_identity: {
    uri: {
      user: string;
      toString(): string;
    };
  };
  local_identity: {
    uri: {
      user: string;
    };
  };
  answer(options?: any): void;
  terminate(options?: any): void;
  hold(): void;
  unhold(): void;
  on(event: string, callback: (...args: any[]) => void): void;
  off(event: string, callback?: (...args: any[]) => void): void;
}

export interface JsSIPConnectionState {
  extension: string;
  userAgent: JsSIP.UA | null;
  registered: boolean;
  registering: boolean;
  connecting: boolean;
  error?: string;
  lastConnected?: Date;
  retryCount?: number;
}

export interface JsSIPCallSession {
  id: string;
  extension: string;
  direction: 'incoming' | 'outgoing';
  remoteUri: string;
  remoteNumber: string;
  state: 'connecting' | 'established' | 'terminated' | 'ringing' | 'terminating';
  startTime: Date;
  endTime?: Date;
  session: any; // JsSIP RTCSession - using any to avoid typing issues
}

export interface ExtensionCredentials {
  extension: string;
  password: string;
  domain?: string;
  displayName?: string;
}

export interface JsSIPConnection {
  extension: string;
  userAgent: JsSIP.UA;
  registered: boolean;
  connecting: boolean;
  registering: boolean;
  error?: string;
  lastRegistered?: Date;
}

export interface JsSIPProviderState {
  connections: Map<string, JsSIPConnectionState>;
  activeCalls: Map<string, JsSIPCallSession>;
  isInitialized: boolean;
  serverConfig?: {
    domain: string;
    webSocketServer: string;
  };
}

export interface JsSIPEventHandlers {
  onConnectionStateChange?: (extension: string, state: JsSIPConnectionState) => void;
  onIncomingCall?: (call: JsSIPCallSession) => void;
  onCallStateChange?: (callId: string, state: JsSIPCallSession['state']) => void;
  onCallEnded?: (callId: string) => void;
  onRegistrationSuccess?: (extension: string) => void;
  onRegistrationFailed?: (extension: string, error: string) => void;
}

export interface CallOptions {
  audioConstraints?: MediaStreamConstraints['audio'];
  videoConstraints?: MediaStreamConstraints['video'];
  extraHeaders?: string[];
  rtcOfferConstraints?: RTCOfferOptions;
  rtcAnswerConstraints?: RTCAnswerOptions;
  rtcConfiguration?: RTCConfiguration;
}

export interface MakeCallOptions extends CallOptions {
  fromExtension: string;
  toUri: string;
  displayName?: string;
}

// Connection status enums to maintain compatibility
export enum ConnectionStatus {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING', 
  CONNECTED = 'CONNECTED',
  REGISTERED = 'REGISTERED',
  FAILED = 'FAILED'
}

export enum CallState {
  IDLE = 'idle',
  CALLING = 'calling',
  RINGING = 'ringing', 
  ANSWERED = 'answered',
  HELD = 'held',
  TERMINATED = 'terminated'
}

// Backward compatibility types for migration
export interface LegacySessionMatch {
  sessionId: string;
  session: any; // JsSIP RTCSession - using any to avoid typing issues
  extension?: string;
}

export type RegisterStatus = 'REGISTERED' | 'UNREGISTERED' | 'REGISTERING' | 'FAILED';
export type ConnectStatus = 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING' | 'WAIT_REQUEST_CONNECT' | 'FAILED';
