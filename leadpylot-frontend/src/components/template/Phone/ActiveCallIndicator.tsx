'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useCallWindow } from '@/hooks/useCallWindow';

// Helper to calculate duration outside component to avoid impure render calls
const formatDuration = (startTime: number | undefined): string => {
  if (!startTime) return '00:00';
  const seconds = Math.floor((Date.now() - startTime) / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Active Call Indicator
 * 
 * Shows a floating indicator when there's an active call in the popup window.
 * Allows users to quickly focus the call window or see call status.
 */
export const ActiveCallIndicator: React.FC = () => {
  const { isCallWindowOpen, callStatus, focusCallWindow } = useCallWindow();
  const [duration, setDuration] = useState('00:00');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Update duration via interval when call is active
  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (callStatus.isActive && callStatus.startTime) {
      const startTime = callStatus.startTime;
      
      // Update function called only from async contexts (interval/timeout)
      const updateDuration = () => {
        setDuration(formatDuration(startTime));
      };
      
      // Start interval for ongoing updates
      intervalRef.current = setInterval(updateDuration, 1000);
      
      // Deferred initial update - not synchronous in effect body
      const timeoutId = setTimeout(updateDuration, 0);
      
      return () => {
        clearTimeout(timeoutId);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }
    
    // Reset duration when call ends - also deferred
    const resetId = setTimeout(() => setDuration('00:00'), 0);
    return () => {
      clearTimeout(resetId);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [callStatus.isActive, callStatus.startTime]);

  // Don't show if no active call
  if (!isCallWindowOpen || !callStatus.isActive) {
    return null;
  }

  return (
    <div
      onClick={focusCallWindow}
      className="fixed bottom-6 right-6 z-50 cursor-pointer"
    >
      <div className="group flex items-center gap-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-3 shadow-lg shadow-emerald-500/30 transition-all hover:scale-105 hover:shadow-xl hover:shadow-emerald-500/40">
        {/* Pulsing indicator */}
        <div className="relative flex h-3 w-3 items-center justify-center">
          <div className="absolute h-full w-full animate-ping rounded-full bg-white opacity-75"></div>
          <div className="h-2 w-2 rounded-full bg-white"></div>
        </div>

        {/* Call info */}
        <div className="flex items-center gap-2 text-white">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          <span className="text-sm font-medium">
            {callStatus.contactName || callStatus.phoneNumber || 'Active Call'}
          </span>
          <span className="font-mono text-sm font-bold">{duration}</span>
        </div>

        {/* Focus hint on hover */}
        <div className="hidden items-center gap-1 text-xs text-white/80 group-hover:flex">
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          <span>Click to focus</span>
        </div>
      </div>
    </div>
  );
};

export default ActiveCallIndicator;

