/**
 * Todo Board Socket.IO Service
 * Handles real-time WebSocket connections for Kanban board updates
 * 
 * Architecture: Trello-style real-time
 * - All writes go through HTTP API
 * - Socket.IO is broadcast-only for receiving updates from other users
 * - Room-based: board:{boardId} for kanban, task:{taskId} for chat
 */

import { isDev } from '@/utils/utils';
import { io, Socket } from 'socket.io-client';

// ============================================================================
// Types
// ============================================================================

export interface TaskCreatedEvent {
  task: {
    _id: string;
    taskTitle: string;
    taskDescription?: string;
    status?: string;
    priority?: string;
    position: number;
    listId: string;
    boardId: string;
    assigned?: string[];
    createdBy?: string;
    task_type?: string;
    lead_id?: string;
    offer_id?: string;
    opening_id?: string;
    email_id?: string;
    updatedAt: string;
  };
}

export interface TaskMovedEvent {
  taskId: string;
  listId: string;
  position: number;
  boardId: string;
  updatedAt: string;
}

export interface TaskUpdatedEvent {
  taskId: string;
  updates: {
    taskTitle?: string;
    taskDescription?: string;
    status?: string;
    priority?: string;
    position?: number;
    listId?: string;
    assigned?: string[];
    isCompleted?: boolean;
    dueDate?: string;
    labels?: any[];
    custom_fields?: any[];
    subTask?: any[];
  };
  boardId: string;
  updatedAt: string;
}

export interface TaskDeletedEvent {
  taskId: string;
  boardId: string;
  deletedAt: string;
}

export interface TaskRemovedEvent {
  taskId: string;
  boardId: string;
  movedToInbox: boolean;
  updatedAt: string;
}

export interface TaskMovedToInboxEvent {
  taskId: string;
  updatedAt: string;
}

export interface ListMovedEvent {
  listId: string;
  position: number;
  boardId: string;
  updatedAt: string;
}

export interface ListCreatedEvent {
  list: {
    _id: string;
    listTitle: string;
    types: string;
    position: number;
    boardId: string;
  };
}

export interface ListUpdatedEvent {
  listId: string;
  updates: {
    listTitle?: string;
    types?: string;
    position?: number;
    color?: string;
  };
  boardId: string;
}

export interface ListDeletedEvent {
  listId: string;
  boardId: string;
}

// Board events (for admin real-time updates)
export interface BoardCreatedEvent {
  board: {
    _id: string;
    name: string;
    description?: string;
    board_type: string;
    created_by?: any;
    members?: any[];
    createdAt: string;
  };
}

export interface BoardUpdatedEvent {
  boardId: string;
  updates: {
    name?: string;
    description?: string;
    board_type?: string;
    is_archived?: boolean;
    is_deleted?: boolean;
    members?: any[];
  };
  updatedAt: string;
}

export interface BoardDeletedEvent {
  boardId: string;
  deletedAt: string;
}

// Label events
export interface LabelCreatedEvent {
  label: {
    _id: string;
    title: string;
    color: string;
    boardId: string;
    createdBy?: any;
    createdAt: string;
  };
}

export interface LabelUpdatedEvent {
  labelId: string;
  updates: {
    title?: string;
    color?: string;
  };
  boardId: string;
  updatedAt: string;
}

export interface LabelDeletedEvent {
  labelId: string;
  boardId: string;
  deletedAt: string;
}

// Activity events
export interface ActivityLoggedEvent {
  activity: {
    _id: string;
    user_id?: any;
    task_id?: string;
    list_id?: string;
    board_id?: string;
    action: string;
    description: string;
    createdAt: string;
  };
}

export interface ChatMessage {
  _id: string;
  task: string;
  sender: {
    _id: string;
    login: string;
    email: string;
    first_name?: string;
    last_name?: string;
  };
  message: string;
  createdAt: string;
}

export interface BoardSocketEvents {
  // Task events
  'task:created': (data: TaskCreatedEvent) => void;
  'task:moved': (data: TaskMovedEvent) => void;
  'task:updated': (data: TaskUpdatedEvent) => void;
  'task:deleted': (data: TaskDeletedEvent) => void;
  'task:removed': (data: TaskRemovedEvent) => void;
  'task:moved-to-inbox': (data: TaskMovedToInboxEvent) => void;
  // List events
  'list:moved': (data: ListMovedEvent) => void;
  'list:created': (data: ListCreatedEvent) => void;
  'list:updated': (data: ListUpdatedEvent) => void;
  'list:deleted': (data: ListDeletedEvent) => void;
  // Board events (admin room)
  'board:created': (data: BoardCreatedEvent) => void;
  'board:updated': (data: BoardUpdatedEvent) => void;
  'board:deleted': (data: BoardDeletedEvent) => void;
  // Label events
  'label:created': (data: LabelCreatedEvent) => void;
  'label:updated': (data: LabelUpdatedEvent) => void;
  'label:deleted': (data: LabelDeletedEvent) => void;
  // Activity events
  'activity:logged': (data: ActivityLoggedEvent) => void;
  // Chat events
  'new-message': (data: ChatMessage) => void;
  'chat:message': (data: any) => void;
  'chat:updated': (data: any) => void;
  'chat:deleted': (data: any) => void;
  // Connection events
  'board:joined': (data: { boardId: string; roomName: string }) => void;
  'board:left': (data: { boardId: string; roomName: string }) => void;
  'inbox:joined': (data: { roomName: string }) => void;
  'inbox:left': (data: { roomName: string }) => void;
  'joined-room': (data: { taskId: string; roomName: string }) => void;
  'left-room': (data: { taskId: string; roomName: string }) => void;
  'message-sent': (data: { messageId: string }) => void;
  error: (data: { message: string }) => void;
}

type EventHandler<T> = (data: T) => void;

// ============================================================================
// TodoBoardSocketService Class
// ============================================================================

class TodoBoardSocketService {
  private socket: Socket | null = null;
  private token: string | null = null;
  private currentBoardId: string | null = null;
  private currentTaskRoomId: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  
  // Event handlers registry
  private taskCreatedHandlers: EventHandler<TaskCreatedEvent>[] = [];
  private taskMovedHandlers: EventHandler<TaskMovedEvent>[] = [];
  private taskUpdatedHandlers: EventHandler<TaskUpdatedEvent>[] = [];
  private taskDeletedHandlers: EventHandler<TaskDeletedEvent>[] = [];
  private taskRemovedHandlers: EventHandler<TaskRemovedEvent>[] = [];
  private taskMovedToInboxHandlers: EventHandler<TaskMovedToInboxEvent>[] = [];
  private listMovedHandlers: EventHandler<ListMovedEvent>[] = [];
  private listCreatedHandlers: EventHandler<ListCreatedEvent>[] = [];
  private listUpdatedHandlers: EventHandler<ListUpdatedEvent>[] = [];
  private listDeletedHandlers: EventHandler<ListDeletedEvent>[] = [];
  private boardCreatedHandlers: EventHandler<BoardCreatedEvent>[] = [];
  private boardUpdatedHandlers: EventHandler<BoardUpdatedEvent>[] = [];
  private boardDeletedHandlers: EventHandler<BoardDeletedEvent>[] = [];
  private boardMemberAddedHandlers: EventHandler<any>[] = [];
  private boardMemberRemovedHandlers: EventHandler<any>[] = [];
  private boardInvitedHandlers: EventHandler<any>[] = [];
  private boardRemovedHandlers: EventHandler<any>[] = [];
  private labelCreatedHandlers: EventHandler<LabelCreatedEvent>[] = [];
  private labelUpdatedHandlers: EventHandler<LabelUpdatedEvent>[] = [];
  private labelDeletedHandlers: EventHandler<LabelDeletedEvent>[] = [];
  private activityLoggedHandlers: EventHandler<ActivityLoggedEvent>[] = [];
  private chatMessageHandlers: EventHandler<ChatMessage>[] = [];
  private connectionHandlers: ((connected: boolean) => void)[] = [];
  private errorHandlers: ((error: { message: string }) => void)[] = [];
  private isInInboxRoom = false;

  /**
   * Connect to the Todo Board Socket.IO server
   */
  public connect(token: string): void {
    if (this.socket?.connected) {
      isDev && console.log('🔌 TodoBoard socket already connected');
      return;
    }

    // Disconnect existing connection first
    if (this.socket) {
      this.disconnect();
    }

    this.token = token;
    
    // Get the todo board service URL (without /api path)
    const serviceUrl = process.env.NEXT_PUBLIC_TODO_SERVICE_URL || 'http://localhost:5001';
    // Remove any trailing /api or path
    const baseUrl = serviceUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');

    isDev && console.log('🔌 Connecting to TodoBoard socket:', baseUrl);

    this.socket = io(baseUrl, {
      auth: { token },  // Token without Bearer prefix (same as notification socket)
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      transports: ['websocket', 'polling'],
    });

    this.setupEventHandlers();
  }

  /**
   * Setup all socket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Remove existing listeners to prevent duplicates
    this.socket.removeAllListeners();

    // Connection events
    this.socket.on('connect', () => {
      isDev && console.log('✅ TodoBoard socket connected:', this.socket?.id);
      this.reconnectAttempts = 0;
      this.notifyConnectionHandlers(true);

      // Rejoin board room if we were in one
      if (this.currentBoardId) {
        this.joinBoard(this.currentBoardId);
      }
      // Rejoin task room if we were in one
      if (this.currentTaskRoomId) {
        this.joinTaskRoom(this.currentTaskRoomId);
      }
    });

    this.socket.on('disconnect', (reason) => {
      isDev && console.log('❌ TodoBoard socket disconnected:', reason);
      this.notifyConnectionHandlers(false);
    });

    this.socket.on('connect_error', (error) => {
      isDev && console.error('❌ TodoBoard socket connection error:', error.message);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        isDev && console.error('🚫 Max reconnection attempts reached for TodoBoard socket');
        this.notifyConnectionHandlers(false);
      }
    });

    // Board room events
    this.socket.on('board:joined', (data) => {
      isDev && console.log('📋 Joined board room:', data.roomName);
    });

    this.socket.on('board:left', (data) => {
      isDev && console.log('📋 Left board room:', data.roomName);
    });

    // Task events
    this.socket.on('task:created', (data: TaskCreatedEvent) => {
      isDev && console.log('📝 Task created event:', data.task._id);
      this.taskCreatedHandlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          isDev && console.error('Error in task:created handler:', error);
        }
      });
    });

    this.socket.on('task:moved', (data: TaskMovedEvent) => {
      isDev && console.log('📝 Task moved event:', data.taskId, '→', data.listId);
      this.taskMovedHandlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          isDev && console.error('Error in task:moved handler:', error);
        }
      });
    });

    this.socket.on('task:updated', (data: TaskUpdatedEvent) => {
      isDev && console.log('📝 Task updated event:', data.taskId);
      this.taskUpdatedHandlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          isDev && console.error('Error in task:updated handler:', error);
        }
      });
    });

    this.socket.on('task:deleted', (data: TaskDeletedEvent) => {
      isDev && console.log('📝 Task deleted event:', data.taskId);
      this.taskDeletedHandlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          isDev && console.error('Error in task:deleted handler:', error);
        }
      });
    });

    // Task removed from board (moved to another board or inbox)
    this.socket.on('task:removed', (data: TaskRemovedEvent) => {
      isDev && console.log('📝 Task removed from board:', data.taskId, 'movedToInbox:', data.movedToInbox);
      this.taskRemovedHandlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          isDev && console.error('Error in task:removed handler:', error);
        }
      });
    });

    // Task moved to inbox (for users viewing inbox)
    this.socket.on('task:moved-to-inbox', (data: TaskMovedToInboxEvent) => {
      isDev && console.log('📥 Task moved to inbox:', data.taskId);
      this.taskMovedToInboxHandlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          isDev && console.error('Error in task:moved-to-inbox handler:', error);
        }
      });
    });

    // Inbox room events
    this.socket.on('inbox:joined', (data) => {
      isDev && console.log('📥 Joined inbox room');
      this.isInInboxRoom = true;
    });

    this.socket.on('inbox:left', (data) => {
      isDev && console.log('📥 Left inbox room');
      this.isInInboxRoom = false;
    });

    // List events
    this.socket.on('list:moved', (data: ListMovedEvent) => {
      isDev && console.log('📋 List moved event:', data.listId);
      this.listMovedHandlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          isDev && console.error('Error in list:moved handler:', error);
        }
      });
    });

    this.socket.on('list:created', (data: ListCreatedEvent) => {
      isDev && console.log('📋 List created event:', data.list._id);
      this.listCreatedHandlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          isDev && console.error('Error in list:created handler:', error);
        }
      });
    });

    this.socket.on('list:updated', (data: ListUpdatedEvent) => {
      isDev && console.log('📋 List updated event:', data.listId);
      this.listUpdatedHandlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          isDev && console.error('Error in list:updated handler:', error);
        }
      });
    });

    this.socket.on('list:deleted', (data: ListDeletedEvent) => {
      isDev && console.log('📋 List deleted event:', data.listId);
      this.listDeletedHandlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          isDev && console.error('Error in list:deleted handler:', error);
        }
      });
    });

    // Board events (for admin real-time updates)
    this.socket.on('board:created', (data: BoardCreatedEvent) => {
      isDev && console.log('📊 Board created event:', data.board._id);
      this.boardCreatedHandlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          isDev && console.error('Error in board:created handler:', error);
        }
      });
    });

    this.socket.on('board:updated', (data: BoardUpdatedEvent) => {
      isDev && console.log('📊 Board updated event:', data.boardId);
      this.boardUpdatedHandlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          isDev && console.error('Error in board:updated handler:', error);
        }
      });
    });

    this.socket.on('board:deleted', (data: BoardDeletedEvent) => {
      isDev && console.log('📊 Board deleted event:', data.boardId);
      this.boardDeletedHandlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          isDev && console.error('Error in board:deleted handler:', error);
        }
      });
    });

    // Board member events
    this.socket.on('board:member-added', (data: any) => {
      isDev && console.log('📊 Board member added event:', data.boardId, data.member?.user_id);
      this.boardMemberAddedHandlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          isDev && console.error('Error in board:member-added handler:', error);
        }
      });
    });

    this.socket.on('board:member-removed', (data: any) => {
      isDev && console.log('📊 Board member removed event:', data.boardId, data.userId);
      this.boardMemberRemovedHandlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          isDev && console.error('Error in board:member-removed handler:', error);
        }
      });
    });

    this.socket.on('board:invited', (data: any) => {
      isDev && console.log('📊 Board invited event:', data.boardId);
      this.boardInvitedHandlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          isDev && console.error('Error in board:invited handler:', error);
        }
      });
    });

    this.socket.on('board:removed', (data: any) => {
      isDev && console.log('📊 Board removed event:', data.boardId);
      this.boardRemovedHandlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          isDev && console.error('Error in board:removed handler:', error);
        }
      });
    });

    // Label events
    this.socket.on('label:created', (data: LabelCreatedEvent) => {
      isDev && console.log('🏷️ Label created event:', data.label._id);
      this.labelCreatedHandlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          isDev && console.error('Error in label:created handler:', error);
        }
      });
    });

    this.socket.on('label:updated', (data: LabelUpdatedEvent) => {
      isDev && console.log('🏷️ Label updated event:', data.labelId);
      this.labelUpdatedHandlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          isDev && console.error('Error in label:updated handler:', error);
        }
      });
    });

    this.socket.on('label:deleted', (data: LabelDeletedEvent) => {
      isDev && console.log('🏷️ Label deleted event:', data.labelId);
      this.labelDeletedHandlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          isDev && console.error('Error in label:deleted handler:', error);
        }
      });
    });

    // Activity events
    this.socket.on('activity:logged', (data: ActivityLoggedEvent) => {
      isDev && console.log('📝 Activity logged event:', data.activity._id);
      this.activityLoggedHandlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          isDev && console.error('Error in activity:logged handler:', error);
        }
      });
    });

    // Chat events
    this.socket.on('joined-room', (data) => {
      isDev && console.log('💬 Joined task chat room:', data.roomName);
    });

    this.socket.on('left-room', (data) => {
      isDev && console.log('💬 Left task chat room:', data.roomName);
    });

    this.socket.on('new-message', (data: ChatMessage) => {
      isDev && console.log('💬 New chat message:', data._id);
      this.chatMessageHandlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          isDev && console.error('Error in new-message handler:', error);
        }
      });
    });

    this.socket.on('message-sent', (data) => {
      isDev && console.log('💬 Message sent confirmation:', data.messageId);
    });

    // Error handling
    this.socket.on('error', (data: { message: string }) => {
      isDev && console.error('⚠️ TodoBoard socket error:', data.message);
      this.errorHandlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          isDev && console.error('Error in error handler:', error);
        }
      });
    });
  }

  /**
   * Notify connection handlers
   */
  private notifyConnectionHandlers(connected: boolean): void {
    this.connectionHandlers.forEach((handler) => {
      try {
        handler(connected);
      } catch (error) {
        isDev && console.error('Error in connection handler:', error);
      }
    });
  }

  // ============================================================================
  // Board Room Methods
  // ============================================================================

  /**
   * Join a board room to receive real-time updates
   */
  public joinBoard(boardId: string): void {
    if (!this.socket?.connected) {
      isDev && console.warn('Cannot join board: socket not connected');
      // Store the board ID so we join when connected
      this.currentBoardId = boardId;
      return;
    }

    // Leave previous board if different
    if (this.currentBoardId && this.currentBoardId !== boardId) {
      this.leaveBoard(this.currentBoardId);
    }

    this.currentBoardId = boardId;
    this.socket.emit('board:join', { boardId });
    isDev && console.log('📋 Requesting to join board:', boardId);
  }

  /**
   * Leave a board room
   */
  public leaveBoard(boardId?: string): void {
    const targetBoardId = boardId || this.currentBoardId;
    
    if (!targetBoardId) return;
    
    if (this.socket?.connected) {
      this.socket.emit('board:leave', { boardId: targetBoardId });
      isDev && console.log('📋 Requesting to leave board:', targetBoardId);
    }

    if (this.currentBoardId === targetBoardId) {
      this.currentBoardId = null;
    }
  }

  /**
   * Get current board ID
   */
  public getCurrentBoardId(): string | null {
    return this.currentBoardId;
  }

  // ============================================================================
  // Task Chat Room Methods
  // ============================================================================

  /**
   * Join a task chat room
   */
  public joinTaskRoom(taskId: string): void {
    if (!this.socket?.connected) {
      isDev && console.warn('Cannot join task room: socket not connected');
      this.currentTaskRoomId = taskId;
      return;
    }

    // Leave previous task room if different
    if (this.currentTaskRoomId && this.currentTaskRoomId !== taskId) {
      this.leaveTaskRoom(this.currentTaskRoomId);
    }

    this.currentTaskRoomId = taskId;
    this.socket.emit('join-task-room', taskId);
    isDev && console.log('💬 Requesting to join task room:', taskId);
  }

  /**
   * Leave a task chat room
   */
  public leaveTaskRoom(taskId?: string): void {
    const targetTaskId = taskId || this.currentTaskRoomId;
    
    if (!targetTaskId) return;
    
    if (this.socket?.connected) {
      this.socket.emit('leave-task-room', targetTaskId);
      isDev && console.log('💬 Requesting to leave task room:', targetTaskId);
    }

    if (this.currentTaskRoomId === targetTaskId) {
      this.currentTaskRoomId = null;
    }
  }

  /**
   * Send a chat message to the current task room
   */
  public sendMessage(taskId: string, message: string): void {
    if (!this.socket?.connected) {
      isDev && console.warn('Cannot send message: socket not connected');
      return;
    }

    this.socket.emit('send-message', { taskId, message });
  }

  // ============================================================================
  // Inbox Room Methods
  // ============================================================================

  /**
   * Join inbox room to receive task:moved-to-inbox events
   */
  public joinInbox(): void {
    if (!this.socket?.connected) {
      isDev && console.warn('Cannot join inbox: socket not connected');
      return;
    }

    if (this.isInInboxRoom) {
      isDev && console.log('Already in inbox room');
      return;
    }

    this.socket.emit('inbox:join');
    isDev && console.log('📥 Requesting to join inbox room');
  }

  /**
   * Leave inbox room
   */
  public leaveInbox(): void {
    if (!this.socket?.connected) {
      return;
    }

    if (!this.isInInboxRoom) {
      return;
    }

    this.socket.emit('inbox:leave');
    isDev && console.log('📥 Requesting to leave inbox room');
  }

  /**
   * Check if currently in inbox room
   */
  public isInInbox(): boolean {
    return this.isInInboxRoom;
  }

  // ============================================================================
  // Event Subscription Methods
  // ============================================================================

  /**
   * Subscribe to task created events
   */
  public onTaskCreated(handler: EventHandler<TaskCreatedEvent>): () => void {
    this.taskCreatedHandlers.push(handler);
    return () => {
      const index = this.taskCreatedHandlers.indexOf(handler);
      if (index > -1) this.taskCreatedHandlers.splice(index, 1);
    };
  }

  /**
   * Subscribe to task moved events
   */
  public onTaskMoved(handler: EventHandler<TaskMovedEvent>): () => void {
    this.taskMovedHandlers.push(handler);
    return () => {
      const index = this.taskMovedHandlers.indexOf(handler);
      if (index > -1) this.taskMovedHandlers.splice(index, 1);
    };
  }

  /**
   * Subscribe to task updated events
   */
  public onTaskUpdated(handler: EventHandler<TaskUpdatedEvent>): () => void {
    this.taskUpdatedHandlers.push(handler);
    return () => {
      const index = this.taskUpdatedHandlers.indexOf(handler);
      if (index > -1) this.taskUpdatedHandlers.splice(index, 1);
    };
  }

  /**
   * Subscribe to task deleted events
   */
  public onTaskDeleted(handler: EventHandler<TaskDeletedEvent>): () => void {
    this.taskDeletedHandlers.push(handler);
    return () => {
      const index = this.taskDeletedHandlers.indexOf(handler);
      if (index > -1) this.taskDeletedHandlers.splice(index, 1);
    };
  }

  /**
   * Subscribe to task removed events (task left this board)
   */
  public onTaskRemoved(handler: EventHandler<TaskRemovedEvent>): () => void {
    this.taskRemovedHandlers.push(handler);
    return () => {
      const index = this.taskRemovedHandlers.indexOf(handler);
      if (index > -1) this.taskRemovedHandlers.splice(index, 1);
    };
  }

  /**
   * Subscribe to task moved to inbox events
   */
  public onTaskMovedToInbox(handler: EventHandler<TaskMovedToInboxEvent>): () => void {
    this.taskMovedToInboxHandlers.push(handler);
    return () => {
      const index = this.taskMovedToInboxHandlers.indexOf(handler);
      if (index > -1) this.taskMovedToInboxHandlers.splice(index, 1);
    };
  }

  /**
   * Subscribe to list moved events
   */
  public onListMoved(handler: EventHandler<ListMovedEvent>): () => void {
    this.listMovedHandlers.push(handler);
    return () => {
      const index = this.listMovedHandlers.indexOf(handler);
      if (index > -1) this.listMovedHandlers.splice(index, 1);
    };
  }

  /**
   * Subscribe to list created events
   */
  public onListCreated(handler: EventHandler<ListCreatedEvent>): () => void {
    this.listCreatedHandlers.push(handler);
    return () => {
      const index = this.listCreatedHandlers.indexOf(handler);
      if (index > -1) this.listCreatedHandlers.splice(index, 1);
    };
  }

  /**
   * Subscribe to list updated events
   */
  public onListUpdated(handler: EventHandler<ListUpdatedEvent>): () => void {
    this.listUpdatedHandlers.push(handler);
    return () => {
      const index = this.listUpdatedHandlers.indexOf(handler);
      if (index > -1) this.listUpdatedHandlers.splice(index, 1);
    };
  }

  /**
   * Subscribe to list deleted events
   */
  public onListDeleted(handler: EventHandler<ListDeletedEvent>): () => void {
    this.listDeletedHandlers.push(handler);
    return () => {
      const index = this.listDeletedHandlers.indexOf(handler);
      if (index > -1) this.listDeletedHandlers.splice(index, 1);
    };
  }

  /**
   * Subscribe to board created events (admin room)
   */
  public onBoardCreated(handler: EventHandler<BoardCreatedEvent>): () => void {
    this.boardCreatedHandlers.push(handler);
    return () => {
      const index = this.boardCreatedHandlers.indexOf(handler);
      if (index > -1) this.boardCreatedHandlers.splice(index, 1);
    };
  }

  /**
   * Subscribe to board updated events (admin room)
   */
  public onBoardUpdated(handler: EventHandler<BoardUpdatedEvent>): () => void {
    this.boardUpdatedHandlers.push(handler);
    return () => {
      const index = this.boardUpdatedHandlers.indexOf(handler);
      if (index > -1) this.boardUpdatedHandlers.splice(index, 1);
    };
  }

  /**
   * Subscribe to board deleted events (admin room)
   */
  public onBoardDeleted(handler: EventHandler<BoardDeletedEvent>): () => void {
    this.boardDeletedHandlers.push(handler);
    return () => {
      const index = this.boardDeletedHandlers.indexOf(handler);
      if (index > -1) this.boardDeletedHandlers.splice(index, 1);
    };
  }

  /**
   * Subscribe to board member added events
   */
  public onBoardMemberAdded(handler: EventHandler<any>): () => void {
    this.boardMemberAddedHandlers.push(handler);
    return () => {
      const index = this.boardMemberAddedHandlers.indexOf(handler);
      if (index > -1) this.boardMemberAddedHandlers.splice(index, 1);
    };
  }

  /**
   * Subscribe to board member removed events
   */
  public onBoardMemberRemoved(handler: EventHandler<any>): () => void {
    this.boardMemberRemovedHandlers.push(handler);
    return () => {
      const index = this.boardMemberRemovedHandlers.indexOf(handler);
      if (index > -1) this.boardMemberRemovedHandlers.splice(index, 1);
    };
  }

  /**
   * Subscribe to board invited events (when user is invited to a board)
   */
  public onBoardInvited(handler: EventHandler<any>): () => void {
    this.boardInvitedHandlers.push(handler);
    return () => {
      const index = this.boardInvitedHandlers.indexOf(handler);
      if (index > -1) this.boardInvitedHandlers.splice(index, 1);
    };
  }

  /**
   * Subscribe to board removed events (when user is removed from a board)
   */
  public onBoardRemoved(handler: EventHandler<any>): () => void {
    this.boardRemovedHandlers.push(handler);
    return () => {
      const index = this.boardRemovedHandlers.indexOf(handler);
      if (index > -1) this.boardRemovedHandlers.splice(index, 1);
    };
  }

  /**
   * Subscribe to label created events
   */
  public onLabelCreated(handler: EventHandler<LabelCreatedEvent>): () => void {
    this.labelCreatedHandlers.push(handler);
    return () => {
      const index = this.labelCreatedHandlers.indexOf(handler);
      if (index > -1) this.labelCreatedHandlers.splice(index, 1);
    };
  }

  /**
   * Subscribe to label updated events
   */
  public onLabelUpdated(handler: EventHandler<LabelUpdatedEvent>): () => void {
    this.labelUpdatedHandlers.push(handler);
    return () => {
      const index = this.labelUpdatedHandlers.indexOf(handler);
      if (index > -1) this.labelUpdatedHandlers.splice(index, 1);
    };
  }

  /**
   * Subscribe to label deleted events
   */
  public onLabelDeleted(handler: EventHandler<LabelDeletedEvent>): () => void {
    this.labelDeletedHandlers.push(handler);
    return () => {
      const index = this.labelDeletedHandlers.indexOf(handler);
      if (index > -1) this.labelDeletedHandlers.splice(index, 1);
    };
  }

  /**
   * Subscribe to activity logged events
   */
  public onActivityLogged(handler: EventHandler<ActivityLoggedEvent>): () => void {
    this.activityLoggedHandlers.push(handler);
    return () => {
      const index = this.activityLoggedHandlers.indexOf(handler);
      if (index > -1) this.activityLoggedHandlers.splice(index, 1);
    };
  }

  /**
   * Subscribe to chat messages
   */
  public onChatMessage(handler: EventHandler<ChatMessage>): () => void {
    this.chatMessageHandlers.push(handler);
    return () => {
      const index = this.chatMessageHandlers.indexOf(handler);
      if (index > -1) this.chatMessageHandlers.splice(index, 1);
    };
  }

  /**
   * Subscribe to connection status changes
   */
  public onConnectionChange(handler: (connected: boolean) => void): () => void {
    this.connectionHandlers.push(handler);
    return () => {
      const index = this.connectionHandlers.indexOf(handler);
      if (index > -1) this.connectionHandlers.splice(index, 1);
    };
  }

  /**
   * Subscribe to socket errors
   */
  public onError(handler: (error: { message: string }) => void): () => void {
    this.errorHandlers.push(handler);
    return () => {
      const index = this.errorHandlers.indexOf(handler);
      if (index > -1) this.errorHandlers.splice(index, 1);
    };
  }

  // ============================================================================
  // Connection Management
  // ============================================================================

  /**
   * Disconnect from the socket server
   */
  public disconnect(): void {
    if (this.socket) {
      // Leave rooms before disconnecting
      if (this.currentBoardId) {
        this.leaveBoard(this.currentBoardId);
      }
      if (this.currentTaskRoomId) {
        this.leaveTaskRoom(this.currentTaskRoomId);
      }

      this.socket.disconnect();
      this.socket = null;
      this.token = null;
      this.reconnectAttempts = 0;
      this.notifyConnectionHandlers(false);
      isDev && console.log('🔌 TodoBoard socket disconnected');
    }
  }

  /**
   * Check if socket is connected
   */
  public isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Get socket ID
   */
  public getSocketId(): string | undefined {
    return this.socket?.id;
  }

  /**
   * Reconnect to the socket server
   */
  public reconnect(): void {
    if (this.token) {
      this.disconnect();
      this.connect(this.token);
    }
  }
}

// Create singleton instance
const todoBoardSocketService = new TodoBoardSocketService();

export default todoBoardSocketService;
