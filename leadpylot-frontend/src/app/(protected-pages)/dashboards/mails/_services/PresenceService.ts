/**
 * Presence Service
 * Handles real-time presence tracking via Socket.IO
 */

import { io, Socket } from 'socket.io-client';
import { PresenceUser, PresenceEvent } from '../_types/presence.types';

class PresenceService {
  private socket: Socket | null = null;
  private currentUser: PresenceUser | null = null;

  /**
   * Initialize Socket.IO connection
   */
  initialize(user: PresenceUser) {
    if (this.socket) {
      return this.socket;
    }

    this.currentUser = user;
    
    // Connect to backend Socket.IO
    this.socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000', {
      path: '/socket.io',
      transports: ['websocket'],
      auth: {
        userId: user._id,
      },
    });

    this.socket.on('connect', () => {
      console.log('✅ Presence socket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Presence socket disconnected');
    });

    return this.socket;
  }

  /**
   * Notify that user started viewing an email
   */
  startViewing(emailId: string) {
    if (!this.socket || !this.currentUser) return;

    this.socket.emit('email:view_start', {
      email_id: emailId,
      user: this.currentUser,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Notify that user stopped viewing an email
   */
  stopViewing(emailId: string) {
    if (!this.socket || !this.currentUser) return;

    this.socket.emit('email:view_end', {
      email_id: emailId,
      user: this.currentUser,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Notify that user started composing a reply
   */
  startComposing(emailId: string) {
    if (!this.socket || !this.currentUser) return;

    this.socket.emit('email:compose_start', {
      email_id: emailId,
      user: this.currentUser,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Notify that user stopped composing
   */
  stopComposing(emailId: string) {
    if (!this.socket || !this.currentUser) return;

    this.socket.emit('email:compose_end', {
      email_id: emailId,
      user: this.currentUser,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Listen for presence updates
   */
  onPresenceUpdate(callback: (event: PresenceEvent) => void) {
    if (!this.socket) return;

    this.socket.on('email:viewer_joined', callback);
    this.socket.on('email:viewer_left', callback);
    this.socket.on('email:composer_joined', callback);
    this.socket.on('email:composer_left', callback);
  }

  /**
   * Remove presence listeners
   */
  offPresenceUpdate() {
    if (!this.socket) return;

    this.socket.off('email:viewer_joined');
    this.socket.off('email:viewer_left');
    this.socket.off('email:composer_joined');
    this.socket.off('email:composer_left');
  }

  /**
   * Disconnect socket
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

const presenceService = new PresenceService();
export default presenceService;

