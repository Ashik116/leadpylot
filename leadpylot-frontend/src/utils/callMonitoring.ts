/**
 * Call Monitoring and Logging Utility
 * Provides comprehensive logging and monitoring for call issues
 */

import { isDev } from './utils';

export interface CallEvent {
  timestamp: Date;
  type: 'call_initiated' | 'call_established' | 'call_ended' | 'call_failed' | 'sip_connected' | 'sip_disconnected' | 'session_state_change';
  sessionId?: string;
  leadId?: string;
  phoneNumber?: string;
  duration?: number;
  error?: string;
  sessionState?: string;
  metadata?: Record<string, any>;
}

export interface CallSession {
  sessionId: string;
  leadId?: string;
  phoneNumber?: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  status: 'initiated' | 'ringing' | 'established' | 'ended' | 'failed';
  events: CallEvent[];
  sipState?: string;
  errors: string[];
}

class CallMonitor {
  private sessions = new Map<string, CallSession>();
  private events: CallEvent[] = [];
  private maxEvents = 1000; // Keep last 1000 events
  private maxSessions = 100; // Keep last 100 sessions

  /**
   * Log a call event
   */
  logEvent(event: Omit<CallEvent, 'timestamp'>): void {
    const callEvent: CallEvent = {
      ...event,
      timestamp: new Date(),
    };

    this.events.push(callEvent);
    
    // Keep only recent events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Add to session if sessionId provided
    if (event.sessionId) {
      const session = this.sessions.get(event.sessionId);
      if (session) {
        session.events.push(callEvent);
      }
    }

    // Log to console in dev mode
    if (isDev) {
      console.log(`📞 [CallMonitor] ${event.type}:`, callEvent);
    }

    // Send critical errors to backend (in production)
    if (event.type === 'call_failed' && !isDev) {
      this.reportErrorToBackend(callEvent);
    }
  }

  /**
   * Start tracking a new call session
   */
  startSession(sessionId: string, leadId?: string, phoneNumber?: string): void {
    const session: CallSession = {
      sessionId,
      leadId,
      phoneNumber,
      startTime: new Date(),
      status: 'initiated',
      events: [],
      errors: [],
    };

    this.sessions.set(sessionId, session);
    
    // Keep only recent sessions
    if (this.sessions.size > this.maxSessions) {
      const oldestKey = this.sessions.keys().next().value;
      if (oldestKey) {
        this.sessions.delete(oldestKey);
      }
    }

    this.logEvent({
      type: 'call_initiated',
      sessionId,
      leadId,
      phoneNumber,
    });
  }

  /**
   * Update session status
   */
  updateSession(sessionId: string, status: CallSession['status'], sipState?: string, error?: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      console.warn(`📞 [CallMonitor] Session not found: ${sessionId}`);
      return;
    }

    session.status = status;
    if (sipState) {
      session.sipState = sipState;
    }
    if (error) {
      session.errors.push(error);
    }

    if (status === 'ended' || status === 'failed') {
      session.endTime = new Date();
      session.duration = Math.floor((session.endTime.getTime() - session.startTime.getTime()) / 1000);
    }

    this.logEvent({
      type: status === 'established' ? 'call_established' : 
            status === 'ended' ? 'call_ended' : 
            status === 'failed' ? 'call_failed' : 'session_state_change',
      sessionId,
      duration: session.duration,
      error,
      sessionState: sipState,
    });
  }

  /**
   * Log SIP connection events
   */
  logSIPEvent(type: 'connected' | 'disconnected', details?: Record<string, any>): void {
    this.logEvent({
      type: type === 'connected' ? 'sip_connected' : 'sip_disconnected',
      metadata: details,
    });
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): CallSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): CallSession[] {
    return Array.from(this.sessions.values()).filter(
      session => session.status !== 'ended' && session.status !== 'failed'
    );
  }

  /**
   * Get recent events
   */
  getRecentEvents(count = 50): CallEvent[] {
    return this.events.slice(-count);
  }

  /**
   * Get call statistics
   */
  getCallStats(): {
    totalCalls: number;
    successfulCalls: number;
    failedCalls: number;
    averageDuration: number;
    recentErrors: string[];
  } {
    const sessions = Array.from(this.sessions.values());
    const totalCalls = sessions.length;
    const successfulCalls = sessions.filter(s => s.status === 'ended').length;
    const failedCalls = sessions.filter(s => s.status === 'failed').length;
    
    const completedCalls = sessions.filter(s => s.duration !== undefined);
    const averageDuration = completedCalls.length > 0 
      ? Math.round(completedCalls.reduce((sum, s) => sum + (s.duration || 0), 0) / completedCalls.length)
      : 0;

    const recentErrors = this.events
      .filter(e => e.type === 'call_failed' && e.error)
      .slice(-10)
      .map(e => e.error!)
      .filter((error, index, arr) => arr.indexOf(error) === index); // Unique errors

    return {
      totalCalls,
      successfulCalls,
      failedCalls,
      averageDuration,
      recentErrors,
    };
  }

  /**
   * Get diagnostic information
   */
  getDiagnostics(): {
    activeSessions: number;
    recentEvents: CallEvent[];
    callStats: ReturnType<CallMonitor['getCallStats']>;
    healthScore: number;
  } {
    const activeSessions = this.getActiveSessions().length;
    const recentEvents = this.getRecentEvents(20);
    const callStats = this.getCallStats();
    
    // Calculate health score (0-100)
    const successRate = callStats.totalCalls > 0 
      ? (callStats.successfulCalls / callStats.totalCalls) * 100 
      : 100;
    
    const recentFailures = recentEvents.filter(e => 
      e.type === 'call_failed' && 
      e.timestamp.getTime() > Date.now() - 30 * 60 * 1000 // Last 30 minutes
    ).length;
    
    const healthScore = Math.max(0, Math.min(100, successRate - (recentFailures * 10)));

    return {
      activeSessions,
      recentEvents,
      callStats,
      healthScore,
    };
  }

  /**
   * Report error to backend
   */
  private async reportErrorToBackend(event: CallEvent): Promise<void> {
    try {
      const response = await fetch('/api/call-monitoring/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          url: window.location.href,
        }),
      });

      if (!response.ok) {
        console.warn('📞 Failed to report error to backend:', response.status);
      }
    } catch (error) {
      console.warn('📞 Error reporting to backend:', error);
    }
  }

  /**
   * Export diagnostics data
   */
  exportDiagnostics(): string {
    const diagnostics = this.getDiagnostics();
    const exportData = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      diagnostics,
      allSessions: Array.from(this.sessions.values()),
      recentEvents: this.getRecentEvents(100),
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Reset all monitoring data
   */
  reset(): void {
    this.sessions.clear();
    this.events = [];
    this.logEvent({ type: 'session_state_change', metadata: { action: 'monitor_reset' } });
  }
}

// Global instance
export const callMonitor = new CallMonitor();

// Helper functions for common monitoring tasks
export const monitorCallStart = (sessionId: string, leadId?: string, phoneNumber?: string) => {
  callMonitor.startSession(sessionId, leadId, phoneNumber);
};

export const monitorCallEnd = (sessionId: string, success: boolean, error?: string) => {
  callMonitor.updateSession(sessionId, success ? 'ended' : 'failed', undefined, error);
};

export const monitorSIPConnection = (connected: boolean, details?: Record<string, any>) => {
  callMonitor.logSIPEvent(connected ? 'connected' : 'disconnected', details);
};

export const getCallDiagnostics = () => {
  return callMonitor.getDiagnostics();
};
