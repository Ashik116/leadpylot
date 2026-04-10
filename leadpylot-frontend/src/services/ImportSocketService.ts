/**
 * Import Socket Service
 * Handles WebSocket connections for real-time import progress tracking
 * Connects to the lead-offers-service for import progress updates
 */

import { io, Socket } from 'socket.io-client';
import { isDev } from '@/utils/utils';

export interface ImportProgress {
  importId: string;
  phase: string;
  description: string;
  percentage: number;
  processedCount?: number;
  totalRows?: number;
  currentBatch?: number;
  totalBatches?: number;
  estimatedTimeRemaining?: number;
  timestamp: string;
  error?: string;
  result?: {
    successCount: number;
    failureCount: number;
    enhancedCount?: number;
    autoAssignedCount?: number;
    downloadLink?: string;
    duplicateStatusSummary?: {
      new: number;
      oldDuplicate: number;
      duplicate: number;
    };
  };
}

type ImportProgressHandler = (progress: ImportProgress) => void;

class ImportSocketService {
  private socket: Socket | null = null;
  private token: string | null = null;
  private progressHandlers: Map<string, ImportProgressHandler[]> = new Map();
  private connectionHandlers: ((connected: boolean) => void)[] = [];
  private isConnecting = false;

  /**
   * Connect to the lead-offers-service WebSocket
   * @param token - JWT authentication token
   */
  public connect(token: string): void {
    if (this.socket?.connected || this.isConnecting) {
      return;
    }

    this.isConnecting = true;
    this.token = token;
    
    // Connect to lead-offers-service (different from notification service)
    const backendUrl = process.env.NEXT_PUBLIC_LEAD_OFFERS_SERVICE_URL || 
                       process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 
                       'http://localhost:4003';

    if (isDev) {
      // eslint-disable-next-line no-console
      console.log('🔌 Connecting to Import WebSocket server:', backendUrl);
    }

    this.socket = io(backendUrl, {
      auth: { token },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
      transports: ['websocket', 'polling'],
    });

    this.setupEventHandlers();
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      if (isDev) {
        // eslint-disable-next-line no-console
        console.log('✅ Connected to Import WebSocket server:', this.socket?.id);
      }
      this.isConnecting = false;
      this.notifyConnectionHandlers(true);
    });

    this.socket.on('disconnect', (reason) => {
      if (isDev) {
        // eslint-disable-next-line no-console
        console.log('❌ Disconnected from Import WebSocket server:', reason);
      }
      this.isConnecting = false;
      this.notifyConnectionHandlers(false);
    });

    this.socket.on('connect_error', (error) => {
      if (isDev) {
        // eslint-disable-next-line no-console
        console.error('❌ Import WebSocket connection error:', error.message);
      }
      this.isConnecting = false;
      this.notifyConnectionHandlers(false);
    });

    // Listen for import progress updates
    this.socket.on('import:progress', (progress: ImportProgress) => {
      if (isDev) {
        // eslint-disable-next-line no-console
        console.log('📊 Import progress received:', {
          importId: progress.importId,
          phase: progress.phase,
          percentage: progress.percentage,
        });
      }
      this.notifyProgressHandlers(progress);
    });
  }

  /**
   * Subscribe to a specific import's progress updates
   * @param importId - The import ID to subscribe to
   */
  public subscribeToImport(importId: string): void {
    if (!this.socket?.connected) {
      if (isDev) {
        // eslint-disable-next-line no-console
        console.warn('Socket not connected, cannot subscribe to import:', importId);
      }
      return;
    }

    if (isDev) {
      // eslint-disable-next-line no-console
      console.log('📋 Subscribing to import progress:', importId);
    }
    this.socket.emit('subscribe:import', importId);
  }

  /**
   * Unsubscribe from a specific import's progress updates
   * @param importId - The import ID to unsubscribe from
   */
  public unsubscribeFromImport(importId: string): void {
    if (!this.socket?.connected) return;

    if (isDev) {
      // eslint-disable-next-line no-console
      console.log('🔕 Unsubscribing from import progress:', importId);
    }
    this.socket.emit('unsubscribe:import', importId);
    this.progressHandlers.delete(importId);
  }

  /**
   * Register a handler for import progress updates
   * @param importId - The import ID to listen for
   * @param handler - The handler function to call on progress updates
   * @returns Cleanup function to remove the handler
   */
  public onProgress(importId: string, handler: ImportProgressHandler): () => void {
    if (!this.progressHandlers.has(importId)) {
      this.progressHandlers.set(importId, []);
    }
    this.progressHandlers.get(importId)!.push(handler);

    // Return cleanup function
    return () => {
      const handlers = this.progressHandlers.get(importId);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
        if (handlers.length === 0) {
          this.progressHandlers.delete(importId);
        }
      }
    };
  }

  /**
   * Notify all registered handlers for an import's progress
   */
  private notifyProgressHandlers(progress: ImportProgress): void {
    const handlers = this.progressHandlers.get(progress.importId);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(progress);
        } catch (error) {
          if (isDev) {
            // eslint-disable-next-line no-console
            console.error('Error in import progress handler:', error);
          }
        }
      });
    }

    // Also notify handlers registered for 'all' imports
    const allHandlers = this.progressHandlers.get('*');
    if (allHandlers) {
      allHandlers.forEach((handler) => {
        try {
          handler(progress);
        } catch (error) {
          if (isDev) {
            // eslint-disable-next-line no-console
            console.error('Error in global import progress handler:', error);
          }
        }
      });
    }
  }

  /**
   * Register a handler for connection status changes
   */
  public onConnectionChange(handler: (connected: boolean) => void): () => void {
    this.connectionHandlers.push(handler);

    return () => {
      const index = this.connectionHandlers.indexOf(handler);
      if (index > -1) {
        this.connectionHandlers.splice(index, 1);
      }
    };
  }

  /**
   * Notify connection status handlers
   */
  private notifyConnectionHandlers(connected: boolean): void {
    this.connectionHandlers.forEach((handler) => {
      try {
        handler(connected);
      } catch (error) {
        if (isDev) {
          // eslint-disable-next-line no-console
          console.error('Error in connection handler:', error);
        }
      }
    });
  }

  /**
   * Check if socket is connected
   */
  public isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Disconnect from the WebSocket server
   */
  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.token = null;
      this.progressHandlers.clear();
      this.notifyConnectionHandlers(false);
    }
  }

  /**
   * Reconnect to the WebSocket server
   */
  public reconnect(): void {
    if (this.token) {
      this.disconnect();
      this.connect(this.token);
    }
  }
}

// Create singleton instance
const importSocketService = new ImportSocketService();

export default importSocketService;
