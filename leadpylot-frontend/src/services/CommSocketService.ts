'use client';

import type { WSEvent, WSEventType } from '@/types/comm.types';

type EventHandler = (data: any) => void;

/**
 * WebSocket service for the communication-service (Go/Fiber backend).
 * Singleton pattern matching the existing SocketService approach.
 */
class CommSocketService {
  private static instance: CommSocketService;
  private ws: WebSocket | null = null;
  private handlers: Map<WSEventType, Set<EventHandler>> = new Map();
  private connectionHandlers: Set<(connected: boolean) => void> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private token: string | null = null;
  private _isConnected = false;
  private hasEverConnected = false;

  private constructor() {}

  static getInstance(): CommSocketService {
    if (!CommSocketService.instance) {
      CommSocketService.instance = new CommSocketService();
    }
    return CommSocketService.instance;
  }

  get isConnected(): boolean {
    return this._isConnected;
  }

  /**
   * Connect to the communication WebSocket with a JWT token.
   */
  connect(token: string): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return; // Already connected or connecting
    }

    this.token = token;

    // Build WS URL
    const envUrl = process.env.NEXT_PUBLIC_COMMUNICATION_SERVICE_URL;
    let host: string;

    if (envUrl) {
      // Strip protocol and trailing slash
      host = envUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
    } else {
      host = `${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:4020`;
    }

    const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss' : 'ws';
    const url = `${protocol}://${host}/ws?token=${token}`;

    try {
      this.ws = new WebSocket(url);
      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = () => {}; // Suppress console noise; handleClose handles retry
    } catch {
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect and clean up.
   */
  disconnect(): void {
    this.token = null; // Prevent reconnect
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.onclose = null; // Prevent reconnect
      this.ws.close();
      this.ws = null;
    }
    this._isConnected = false;
    this.hasEverConnected = false;
    this.reconnectAttempts = 0;
    this.notifyConnectionChange(false);
  }

  /**
   * Subscribe to a specific event type. Returns an unsubscribe function.
   */
  on(event: WSEventType, handler: EventHandler): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
    return () => {
      this.handlers.get(event)?.delete(handler);
    };
  }

  /**
   * Subscribe to connection state changes.
   */
  onConnectionChange(handler: (connected: boolean) => void): () => void {
    this.connectionHandlers.add(handler);
    return () => {
      this.connectionHandlers.delete(handler);
    };
  }

  /**
   * Send a typed event to the server.
   */
  send(event: WSEvent): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(event));
    }
  }

  /** Send a typing indicator for a channel. */
  sendTyping(channelId: string, serverId: string): void {
    this.send({ type: 'TYPING_START', data: { channelId, serverId } });
  }

  /** Update presence status. */
  updatePresence(status: 'online' | 'idle' | 'dnd'): void {
    this.send({ type: 'PRESENCE_UPDATE', data: { status } });
  }

  // ---- Internal handlers ----

  private handleOpen(): void {
    console.log('[CommSocket] Connected');
    this._isConnected = true;
    this.hasEverConnected = true;
    this.reconnectAttempts = 0;
    this.notifyConnectionChange(true);
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const wsEvent: WSEvent = JSON.parse(event.data);
      const handlers = this.handlers.get(wsEvent.type);
      if (handlers) {
        handlers.forEach((handler) => {
          try {
            handler(wsEvent.data);
          } catch (err) {
            console.error(`[CommSocket] Handler error for ${wsEvent.type}:`, err);
          }
        });
      }
    } catch {
      // Ignore parse errors silently
    }
  }

  private handleClose(event: CloseEvent): void {
    this._isConnected = false;
    this.ws = null;
    this.notifyConnectionChange(false);

    // Code 1006 = abnormal closure (likely auth rejected or server unreachable)
    // Only reconnect if we previously had a successful connection
    if (event.code === 1006 && !this.hasEverConnected) {
      console.warn('[CommSocket] Connection rejected (auth or server issue). Not retrying.');
      return;
    }

    // Normal reconnect for unexpected disconnects
    if (this.token) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts || !this.token) {
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.warn('[CommSocket] Max reconnect attempts reached. Call connect() to retry.');
      }
      return;
    }
    const delay = Math.min(2000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => {
      if (this.token) {
        this.connect(this.token);
      }
    }, delay);
  }

  private notifyConnectionChange(connected: boolean): void {
    this.connectionHandlers.forEach((handler) => handler(connected));
  }
}

export default CommSocketService;
