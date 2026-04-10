/**
 * Socket.IO Service
 * Handles real-time WebSocket connections and notifications
 */

import { isDev } from '@/utils/utils';
import { io, Socket } from 'socket.io-client';

export interface RealtimeNotification {
  id: string;
  type: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  title: string;
  message: string;
  data: {
    agent?: {
      id: string;
      login: string;
      role: string;
      name: string;
    };
    // Lead assignment specific fields
    lead?: {
      id?: string;
      _id?: string;
      contact_name?: string;
      status?: string;
      displayName?: string;
    };
    assignedBy?: {
      id?: string;
      _id?: string;
      login: string;
      name: string;
    };
    assignedTo?: {
      id?: string;
      _id?: string;
      login: string;
      name: string;
    };
    creator?: {
      id?: string;
      _id?: string;
      login: string;
      name: string;
    };
    project?: {
      id?: string;
      _id?: string;
      name: string;
    };
    offer?: {
      id?: string;
      _id?: string;
      title?: string;
      investment_volume?: number;
      interest_rate?: number;
      status?: string;
    };
    // Email comment mention specific fields
    email?: {
      id?: string;
      _id?: string;
      subject: string;
    };
    comment?: {
      id?: string;
      _id?: string;
      text: string;
    };
    commenter?: {
      id?: string;
      _id?: string;
      name: string;
      login: string;
    };
    batchInfo?: {
      isMultiple: boolean;
      totalCount: number;
      currentIndex: number;
    } | null;
    // Email-matched notification fields (from email-service notifyEmailMatchedToLead)
    emailId?: string;
    from?: string;
    subject?: string;
    // Generic notification data fields
    projectName?: string;
    leadName?: string;
    amount?: string;
    commissionAmount?: string;
    targetAmount?: string;
    maintenanceTime?: string;
    userLogin?: string;
    oldRole?: string;
    newRole?: string;
    investmentVolume?: string;
    interestRate?: string;
    project_id?: string | null;
    lead_id?: string | null;
    // Audio rule fields set by backend's sendWithDynamicRules
    audioRuleId?: string;
    useRuleAudioOnly?: boolean;
    metadata: {
      ipAddress?: string;
      userAgent?: string;
      timestamp: string;
      assignedAt?: string;
      projectId?: string;
      leadId?: string;
      leadName?: string;
      leadCount?: number;
      formattedMessage?: string;
      fromProject?: string;
      toProject?: string;
      fromAgent?: string;
      notificationDbId?: string;
      [key: string]: any;
    };
  };
  timestamp: string;
  read: boolean;
  _isBulkSync?: boolean; // Flag to indicate if this is part of a bulk sync (pending notifications on login)
  _isFirstInBatch?: boolean; // Flag to indicate if this is the first notification in a bulk sync batch
  _isLastInBatch?: boolean; // Flag to indicate if this is the last notification in a bulk sync batch
}

export interface SocketEvents {
  notification: (notification: RealtimeNotification) => void;
  connected: (data: { message: string; userId: string; role: string; timestamp: string }) => void;
  agent_status_change: (data: {
    agentId: string;
    login: string;
    status: string;
    timestamp: string;
  }) => void;
  pong: (data: { timestamp: string }) => void;
  notification_read: (data: { notificationId: string; readBy: string; timestamp: string }) => void;
  telegram_user_linked: (data: {
    user: { name: string; email?: string; login: string };
    identifier: string;
    identifier_type: string;
    chat_id: string;
    timestamp: string;
  }) => void;
  telegram_user_unlinked: (data: {
    chat_id: string;
    timestamp: string;
  }) => void;
}

class SocketService {
  private socket: Socket | null = null;
  private token: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private notificationHandlers: ((notification: RealtimeNotification) => void)[] = [];
  private connectionHandlers: ((connected: boolean) => void)[] = [];
  private telegramLinkHandlers: ((data: {
    user: { name: string; email?: string; login: string };
    identifier: string;
    identifier_type: string;
    chat_id: string;
    timestamp: string;
  }) => void)[] = [];
  private telegramUnlinkHandlers: ((data: { chat_id: string; timestamp: string }) => void)[] = [];
  private processedNotifications = new Set<string>(); // Track processed notifications to prevent duplicates
  private isBulkSyncing = false; // Flag to track bulk notification sync

  /**
   * Initialize Socket.IO connection
   * @param token - JWT authentication token
   */
  public connect(token: string): void {
    // Always disconnect existing connection first to prevent duplicates
    if (this.socket) {
      // console.log('Disconnecting existing socket before creating new connection');
      this.disconnect();
    }

    this.token = token;
    const backendUrl = process.env.NEXT_PUBLIC_NOTIFICATION_SERVICE_URL || 'http://localhost:4004';

    // console.log('Connecting to Socket.IO server:', backendUrl);

    this.socket = io(backendUrl, {
      auth: { token },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      timeout: 20000,
    });

    this.setupEventHandlers();
  }

  /**
   * Setup Socket.IO event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Remove all existing listeners first to prevent duplicates
    this.socket.removeAllListeners();

    // Connection events
    this.socket.on('connect', () => {
      // isDev && // eslint-disable-next-line no-console
      // console.log('✅ Connected to Socket.IO server:', this.socket?.id);
      this.reconnectAttempts = 0;
      this.notifyConnectionHandlers(true);

      // Auto-sync notifications when connected
      this.autoSync().catch((error) => {
        isDev && console.error('Auto-sync failed on connect:', error);
      });
    });

    this.socket.on('disconnect', (reason) => {
      // isDev && console.log('❌ Disconnected from Socket.IO server:', reason);
      this.notifyConnectionHandlers(false);
    });

    this.socket.on('connect_error', (error) => {
      // isDev && console.error('❌ Socket.IO connection error:', error.message);
      this.reconnectAttempts++;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        // isDev && console.error('Max reconnection attempts reached');
        this.notifyConnectionHandlers(false);
      }
    });

    // Welcome message
    this.socket.on('connected', (data) => {
      // isDev && console.log('👋 Welcome message received:', data);
    });

    // Real-time notifications
    this.socket.on('notification', (notification: RealtimeNotification) => {
      // if (isDev) {
      //   console.log('🔔 Real-time notification received:', {
      //     id: notification.id,
      //     type: notification.type,
      //     category: notification.category,
      //     title: notification.title,
      //     message: notification.message,
      //     timestamp: notification.timestamp,
      //   });
      // }
      this.handleNotification(notification);
    });

    // Agent status changes (for admins)
    this.socket.on('agent_status_change', (data) => {
      // isDev && console.log('👤 Agent status change:', data);
    });

    // Ping/pong for connection health
    this.socket.on('pong', (data) => {
      // isDev && console.log('🏓 Pong received:', data);
    });

    // Notification read confirmations
    this.socket.on('notification_read', (data) => {
      // isDev && console.log('📖 Notification read confirmation:', data);
    });

    // Telegram user linked
    this.socket.on('telegram:user_linked', (data) => {
      isDev && console.log('🔗 Telegram user linked:', data);
      this.telegramLinkHandlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error('Error in telegram link handler:', error);
        }
      });
    });

    // Telegram user unlinked
    this.socket.on('telegram:user_unlinked', (data) => {
      isDev && console.log('🔓 Telegram user unlinked:', data);
      this.telegramUnlinkHandlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error('Error in telegram unlink handler:', error);
        }
      });
    });
  }

  /**
   * Handle incoming notifications
   */
  private handleNotification(notification: RealtimeNotification): void {
    // Check if we've already processed this notification to prevent duplicates
    const notificationKey = `${notification.id}-${notification.timestamp}`;

    // For email-type notifications, also dedup by emailId so that multiple
    // backend POSTs for the same email (admin/agent/visible) collapse into one.
    const emailId =
      notification.data?.emailId || (notification.data as any)?.email_id;
    const isEmailType = notification.type?.startsWith('email');
    const emailDedupKey =
      isEmailType && emailId ? `email_dedup_${emailId}` : null;

    if (
      this.processedNotifications.has(notificationKey) ||
      (emailDedupKey && this.processedNotifications.has(emailDedupKey))
    ) {
      if (isDev) {
        console.log('🔄 Duplicate notification detected, skipping:', notification.id);
      }
      return;
    }

    // Add to processed notifications (keep only last 200 to prevent memory leaks)
    this.processedNotifications.add(notificationKey);
    if (emailDedupKey) {
      this.processedNotifications.add(emailDedupKey);
    }
    if (this.processedNotifications.size > 200) {
      const entries = Array.from(this.processedNotifications);
      entries
        .slice(0, entries.length - 100)
        .forEach((k) => this.processedNotifications.delete(k));
    }

    this.notificationHandlers.forEach((handler, index) => {
      try {
        if (isDev && notification.type === 'offer_created') {
          console.log(`🔔 Calling notification handler ${index + 1}/${this.notificationHandlers.length} for offer_created`);
        }
        handler(notification);
      } catch (error) {
        if (isDev) {
          console.error('❌ Error in notification handler:', error, {
            notificationId: notification.id,
            notificationType: notification.type,
            handlerIndex: index,
          });
        }
      }
    });
  }

  /**
   * Notify connection handlers about connection status
   */
  private notifyConnectionHandlers(connected: boolean): void {
    this.connectionHandlers.forEach((handler) => {
      try {
        handler(connected);
      } catch (error) {
        // isDev && console.error('Error in connection handler:', error);
      }
    });
  }

  /**
   * Subscribe to real-time notifications
   */
  public onNotification(handler: (notification: RealtimeNotification) => void): () => void {
    this.notificationHandlers.push(handler);

    // Return unsubscribe function
    return () => {
      const index = this.notificationHandlers.indexOf(handler);
      if (index > -1) {
        this.notificationHandlers.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to connection status changes
   */
  public onConnectionChange(handler: (connected: boolean) => void): () => void {
    this.connectionHandlers.push(handler);

    // Return unsubscribe function
    return () => {
      const index = this.connectionHandlers.indexOf(handler);
      if (index > -1) {
        this.connectionHandlers.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to Telegram user link events
   */
  public onTelegramUserLinked(handler: (data: {
    user: { name: string; email?: string; login: string };
    identifier: string;
    identifier_type: string;
    chat_id: string;
    timestamp: string;
  }) => void): () => void {
    this.telegramLinkHandlers.push(handler);

    // Return unsubscribe function
    return () => {
      const index = this.telegramLinkHandlers.indexOf(handler);
      if (index > -1) {
        this.telegramLinkHandlers.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to Telegram user unlink events
   */
  public onTelegramUserUnlinked(handler: (data: { chat_id: string; timestamp: string }) => void): () => void {
    this.telegramUnlinkHandlers.push(handler);

    // Return unsubscribe function
    return () => {
      const index = this.telegramUnlinkHandlers.indexOf(handler);
      if (index > -1) {
        this.telegramUnlinkHandlers.splice(index, 1);
      }
    };
  }

  /**
   * Mark notification as read
   */
  public markNotificationAsRead(notificationId: string): void {
    if (!this.socket?.connected) return;

    this.socket.emit('notification_read', {
      notificationId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get last sync timestamp from localStorage
   */
  private getLastSyncTimestamp(): string | null {
    return localStorage.getItem('lastNotificationSync');
  }

  /**
   * Request pending notifications from server for sync
   */
  public async requestPendingNotifications(since?: string): Promise<void> {
    if (!this.socket?.connected) {
      // isDev && console.log('Socket not connected, cannot fetch pending notifications');
      return;
    }

    try {
      // Dynamic import to avoid circular dependencies
      const { apiGetPendingNotifications } = await import(
        '@/services/notifications/NotificationsService'
      );

      // Use provided since timestamp or get from localStorage or default to 24 hours ago
      const syncSince =
        since ||
        this.getLastSyncTimestamp() ||
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      isDev && console.log('🔄 Fetching pending notifications since:', syncSince);

      const response = await apiGetPendingNotifications(syncSince, 50);

      if (response.success && response.data.length > 0) {
        // isDev && console.log(`📥 Fetched ${response.data.length} pending notifications`);

        // Set bulk sync flag to indicate we're processing multiple notifications at once
        this.isBulkSyncing = true;

        // Process each pending notification as if it was received in real-time
        response.data.forEach((notification, index) => {
          // Mark as synced notification to avoid duplicate processing
          const syncedNotification = {
            ...notification,
            _isSynced: true,
            _isBulkSync: true, // Mark as part of bulk sync
            _syncTimestamp: response.syncTimestamp,
            _isFirstInBatch: index === 0, // Mark first notification in batch
            _isLastInBatch: index === response.data.length - 1, // Mark last notification in batch
          };

          this.handleNotification(syncedNotification);
        });

        // Reset bulk sync flag after processing all notifications
        setTimeout(() => {
          this.isBulkSyncing = false;
        }, 100);

        // Update last sync timestamp in localStorage
        localStorage.setItem('lastNotificationSync', response.syncTimestamp);

        // isDev &&
        //   console.log(
        //     '✅ Notification sync completed, updated lastSyncTime:',
        //     response.syncTimestamp
        //   );
      } else {
        // isDev && console.log('📥 No pending notifications found');

        // Still update sync timestamp even if no notifications to prevent repeated empty syncs
        const currentTime = new Date().toISOString();
        localStorage.setItem('lastNotificationSync', currentTime);
      }
    } catch (error) {
      isDev && console.error('❌ Error fetching pending notifications:', error);
    }
  }

  /**
   * Auto-sync notifications on connection
   */
  public async autoSync(): Promise<void> {
    if (!this.socket?.connected) return;

    try {
      // Wait a moment after connection to ensure everything is ready
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Check if we need to sync
      const lastSync = this.getLastSyncTimestamp();
      const now = new Date();
      const syncThreshold = 5 * 60 * 1000; // 5 minutes

      let shouldSync = true;

      if (lastSync) {
        const timeSinceLastSync = now.getTime() - new Date(lastSync).getTime();
        shouldSync = timeSinceLastSync > syncThreshold;
      }

      if (shouldSync) {
        // isDev && console.log('🔄 Auto-syncing notifications...');
        await this.requestPendingNotifications();
      } else {
        isDev && console.log('⏭️ Skipping auto-sync, last sync was recent');
      }
    } catch (error) {
      isDev && console.error('❌ Error during auto-sync:', error);
    }
  }

  /**
   * Send ping to check connection health
   */
  public ping(): void {
    if (!this.socket?.connected) return;

    this.socket.emit('ping');
  }

  /**
   * Update user status
   */
  public updateStatus(status: 'online' | 'away' | 'busy' | 'offline'): void {
    if (!this.socket?.connected) return;

    this.socket.emit('user_status', { status });
  }

  /**
   * Join a custom room
   */
  public joinRoom(room: string, password?: string): void {
    if (!this.socket?.connected) return;

    this.socket.emit('join_room', { room, password });
  }

  /**
   * Leave a custom room
   */
  public leaveRoom(room: string): void {
    if (!this.socket?.connected) return;

    this.socket.emit('leave_room', { room });
  }

  /**
   * Disconnect from Socket.IO server
   */
  public disconnect(): void {
    if (this.socket) {
      // console.log('Disconnecting from Socket.IO server');
      this.socket.disconnect();
      this.socket = null;
      this.token = null;
      this.reconnectAttempts = 0;
      this.processedNotifications.clear(); // Clear processed notifications on disconnect
      this.notifyConnectionHandlers(false);
    }
  }

  /**
   * Check if socket is connected
   */
  public isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Check if currently performing bulk sync
   */
  public isBulkSyncInProgress(): boolean {
    return this.isBulkSyncing;
  }

  /**
   * Get current socket ID
   */
  public getSocketId(): string | undefined {
    return this.socket?.id;
  }

  /**
   * Reconnect to Socket.IO server
   */
  public reconnect(): void {
    if (this.token) {
      this.disconnect();
      this.connect(this.token);
    }
  }

  /**
   * Register a custom event listener for monitoring features
   * @param event - Event name to listen for
   * @param handler - Event handler function
   * @returns Cleanup function to remove the listener
   */
  public onCustomEvent(event: string, handler: (data: any) => void): () => void {
    if (this.socket) {
      this.socket.on(event, handler);
    }

    return () => {
      if (this.socket) {
        this.socket.off(event, handler);
      }
    };
  }


}

// Create singleton instance
const socketService = new SocketService();

export default socketService;
