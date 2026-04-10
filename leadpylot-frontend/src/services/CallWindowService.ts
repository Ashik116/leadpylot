/**
 * Call Window Service
 * Manages the popup call window for persistent SIP connections
 * 
 * This service handles:
 * - Opening/closing the call popup window
 * - Cross-window communication via BroadcastChannel
 * - Call state synchronization between main app and popup
 */

export interface CallWindowData {
  phoneNumber: string;
  contactName?: string;
  leadId?: string;
  projectId?: string;
  extension: string;
  password: string;
  domain: string;
  websocketUrl: string;
  direction: 'outgoing' | 'incoming';
  // Lead's VoIP extension - preferred over direct phone number
  // FreePBX routes this extension to the actual phone number
  voipExtension?: string;
}

export interface CallWindowMessage {
  type: 
    | 'CALL_INITIATED'
    | 'CALL_CONNECTED'
    | 'CALL_ENDED'
    | 'CALL_FAILED'
    | 'INCOMING_CALL'
    | 'CALL_ANSWERED'
    | 'CALL_DECLINED'
    | 'WINDOW_READY'
    | 'WINDOW_CLOSED'
    | 'REQUEST_STATUS'
    | 'STATUS_UPDATE'
    | 'PING'
    | 'PONG';
  payload?: any;
  timestamp: number;
}

export interface CallStatus {
  isActive: boolean;
  state: 'idle' | 'connecting' | 'ringing' | 'established' | 'terminated';
  phoneNumber?: string;
  contactName?: string;
  duration?: number;
  startTime?: number;
}

class CallWindowService {
  private static instance: CallWindowService;
  private callWindow: Window | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private messageListeners: Map<string, (message: CallWindowMessage) => void> = new Map();
  private currentCallStatus: CallStatus = { isActive: false, state: 'idle' };
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private windowCheckInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.initializeBroadcastChannel();
  }

  static getInstance(): CallWindowService {
    if (!CallWindowService.instance) {
      CallWindowService.instance = new CallWindowService();
    }
    return CallWindowService.instance;
  }

  /**
   * Initialize BroadcastChannel for cross-window communication
   */
  private initializeBroadcastChannel(): void {
    if (typeof window === 'undefined') return;

    try {
      this.broadcastChannel = new BroadcastChannel('leadpylot_call_channel');
      
      this.broadcastChannel.onmessage = (event: MessageEvent<CallWindowMessage>) => {
        this.handleMessage(event.data);
      };

      // Start heartbeat to check if popup is alive
      this.startHeartbeat();
    } catch (error) {
      console.error('Failed to create BroadcastChannel:', error);
    }
  }

  /**
   * Handle incoming messages from the call window
   */
  private handleMessage(message: CallWindowMessage): void {
    console.log('📨 CallWindowService received:', message.type, message.payload);

    switch (message.type) {
      case 'WINDOW_READY':
        console.log('✅ Call window is ready');
        break;

      case 'CALL_CONNECTED':
        this.currentCallStatus = {
          isActive: true,
          state: 'established',
          phoneNumber: message.payload?.phoneNumber,
          contactName: message.payload?.contactName,
          startTime: message.payload?.startTime || Date.now(),
        };
        break;

      case 'CALL_ENDED':
      case 'CALL_FAILED':
        this.currentCallStatus = { isActive: false, state: 'idle' };
        break;

      case 'WINDOW_CLOSED':
        this.callWindow = null;
        this.currentCallStatus = { isActive: false, state: 'idle' };
        break;

      case 'STATUS_UPDATE':
        if (message.payload) {
          this.currentCallStatus = message.payload;
        }
        break;

      case 'PONG':
        // Window is alive
        break;

      default:
        // Handle unknown message types silently
        break;
    }

    // Notify all listeners
    this.messageListeners.forEach((listener) => {
      try {
        listener(message);
      } catch (error) {
        console.error('Error in message listener:', error);
      }
    });
  }

  /**
   * Start heartbeat to check if popup window is still alive
   */
  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.callWindow && !this.callWindow.closed) {
        this.sendMessage({ type: 'PING', timestamp: Date.now() });
      } else if (this.callWindow) {
        // Window was closed
        this.callWindow = null;
        this.currentCallStatus = { isActive: false, state: 'idle' };
        this.notifyListeners({ type: 'WINDOW_CLOSED', timestamp: Date.now() });
      }
    }, 5000);
  }

  /**
   * Notify all listeners of a message
   */
  private notifyListeners(message: CallWindowMessage): void {
    this.messageListeners.forEach((listener) => {
      try {
        listener(message);
      } catch (error) {
        console.error('Error in message listener:', error);
      }
    });
  }

  /**
   * Open the call window popup
   */
  openCallWindow(callData: CallWindowData): Window | null {
    // If window already exists and not closed, focus it
    if (this.callWindow && !this.callWindow.closed) {
      this.callWindow.focus();
      // Send new call data to existing window
      this.sendMessage({
        type: 'CALL_INITIATED',
        payload: callData,
        timestamp: Date.now(),
      });
      return this.callWindow;
    }

    // Generate unique call ID
    const callId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Store call data securely in sessionStorage (not in URL)
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(`leadpylot_call_${callId}`, JSON.stringify(callData));
    }

    // Only pass the call ID in URL - no sensitive data exposed
    const url = `/call-window?id=${callId}`;

    // Calculate center position
    const width = 420;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    // Open popup
    this.callWindow = window.open(
      url,
      'leadpylot_call_window',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=no,status=no,menubar=no,toolbar=no,location=no`
    );

    if (!this.callWindow) {
      // Popup was blocked
      console.warn('Popup was blocked. Opening in new tab...');
      this.callWindow = window.open(url, '_blank');
    }

    // Update status
    this.currentCallStatus = {
      isActive: true,
      state: 'connecting',
      phoneNumber: callData.phoneNumber,
      contactName: callData.contactName,
    };

    // Monitor window state
    this.startWindowMonitor();

    return this.callWindow;
  }

  /**
   * Monitor if the call window is still open
   */
  private startWindowMonitor(): void {
    if (this.windowCheckInterval) {
      clearInterval(this.windowCheckInterval);
    }

    this.windowCheckInterval = setInterval(() => {
      if (this.callWindow && this.callWindow.closed) {
        this.callWindow = null;
        this.currentCallStatus = { isActive: false, state: 'idle' };
        this.notifyListeners({ type: 'WINDOW_CLOSED', timestamp: Date.now() });
        
        if (this.windowCheckInterval) {
          clearInterval(this.windowCheckInterval);
          this.windowCheckInterval = null;
        }
      }
    }, 1000);
  }

  /**
   * Send message to call window
   */
  sendMessage(message: CallWindowMessage): void {
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(message);
      } catch (error) {
        console.error('Failed to send message:', error);
      }
    }
  }

  /**
   * Subscribe to messages from call window
   */
  subscribe(id: string, callback: (message: CallWindowMessage) => void): () => void {
    this.messageListeners.set(id, callback);
    
    return () => {
      this.messageListeners.delete(id);
    };
  }

  /**
   * Get current call status
   */
  getCallStatus(): CallStatus {
    return { ...this.currentCallStatus };
  }

  /**
   * Check if call window is open
   */
  isWindowOpen(): boolean {
    return this.callWindow !== null && !this.callWindow.closed;
  }

  /**
   * Focus the call window if it exists
   */
  focusCallWindow(): void {
    if (this.callWindow && !this.callWindow.closed) {
      this.callWindow.focus();
    }
  }

  /**
   * Close the call window
   */
  closeCallWindow(): void {
    if (this.callWindow && !this.callWindow.closed) {
      this.callWindow.close();
    }
    this.callWindow = null;
    this.currentCallStatus = { isActive: false, state: 'idle' };
  }

  /**
   * Request status update from call window
   */
  requestStatus(): void {
    this.sendMessage({ type: 'REQUEST_STATUS', timestamp: Date.now() });
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.windowCheckInterval) {
      clearInterval(this.windowCheckInterval);
    }
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
    }
    this.messageListeners.clear();
  }
}

// Export singleton instance
export const callWindowService = CallWindowService.getInstance();
export default callWindowService;

