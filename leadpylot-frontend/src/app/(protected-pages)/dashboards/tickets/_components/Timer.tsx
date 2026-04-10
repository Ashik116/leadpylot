'use client';

import ApolloIcon from '@/components/ui/ApolloIcon';
import Button from '@/components/ui/Button';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';

export interface TimerProps {
  /** Initial time in seconds */
  initialSeconds?: number;
  /** Creation date/time string (ISO format: "2025-11-27T11:32:29.038Z") */
  createdAt?: string;
  /** Closed/completed date/time string (ISO format) - if provided, shows static elapsed time */
  closedAt?: string;
  /** Auto-start timer on mount */
  autoStart?: boolean;
  /** Callback when timer reaches zero (for countdown) */
  onComplete?: () => void;
  /** Format: 'hh:mm:ss' | 'mm:ss' | 'human' - 'human' shows "53 min", "1h 23min", etc. */
  format?: 'hh:mm:ss' | 'mm:ss' | 'human';
  /** Custom className */
  className?: string;
  /** Show controls */
  showControls?: boolean;
  /** Color variant: 'blue' for completed tasks, 'orange' for active tasks */
  color?: 'blue' | 'orange';
  /** Whether task is done - used to determine color if color prop not provided */
  isDone?: boolean;
}

const Timer = ({
  initialSeconds,
  createdAt,
  closedAt,
  autoStart = true,
  onComplete,
  format = 'human',
  className = '',
  showControls = false,
  color,
  isDone,
}: TimerProps) => {
  // Determine color: use color prop if provided, otherwise use isDone to determine
  const timerColor = color || (isDone !== undefined ? (isDone ? 'blue' : 'orange') : 'gray');
  // Calculate elapsed seconds from createdAt to closedAt (if closed) or now (if open)
  const calculateElapsedSeconds = useCallback(() => {
    if (createdAt) {
      const createdDate = new Date(createdAt);
      const endDate = closedAt ? new Date(closedAt) : new Date();
      const elapsedMs = endDate.getTime() - createdDate.getTime();
      return Math.max(0, Math.floor(elapsedMs / 1000));
    }
    return initialSeconds ?? 0;
  }, [createdAt, closedAt, initialSeconds]);

  // Initialize state with lazy initializer
  const [displaySeconds, setDisplaySeconds] = useState(() => calculateElapsedSeconds());
  const [isRunning, setIsRunning] = useState(autoStart && !closedAt); // Don't run if closed
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const createdAtRef = useRef<string | null>(createdAt || null);
  const closedAtRef = useRef<string | null>(closedAt || null);
  const onCompleteRef = useRef(onComplete);

  // Update refs when props change and recalculate elapsed time
  useEffect(() => {
    createdAtRef.current = createdAt || null;
    closedAtRef.current = closedAt || null;

    // If closed, stop the timer and show static elapsed time
    if (closedAt) {
      setTimeout(() => {
        setIsRunning(false);
      }, 0);
    }

    // Recalculate elapsed time
    const elapsed = calculateElapsedSeconds();
    setTimeout(() => {
      setDisplaySeconds(elapsed);
    }, 0);
  }, [createdAt, closedAt, calculateElapsedSeconds]);

  // Keep callback ref updated
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Format time display - memoized for performance
  const formattedTime = useMemo(() => {
    const totalSeconds = Math.max(0, displaySeconds);
    const days = Math.floor(totalSeconds / 86400); // 86400 seconds = 24 hours
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    // Human-readable format: "53 min", "1h 23min", "2h 15min 30sec", "1d 5h 23min 30sec"
    if (format === 'human') {
      // If over 24 hours, show days
      if (days > 0) {
        const parts: string[] = [];
        parts.push(`${days}${days === 1 ? 'd' : 'd'}`);

        if (hours > 0) {
          parts.push(`${hours}${hours === 1 ? 'h' : 'h'}`);
        }

        if (minutes > 0) {
          parts.push(`${minutes}min`);
        }

        if (secs > 0) {
          parts.push(`${secs}sec`);
        }

        return parts.join(' ');
      }

      // Original logic for under 24 hours
      if (hours > 0) {
        if (minutes > 0) {
          if (secs > 0) {
            return `${hours}h ${minutes}min ${secs}sec`;
          }
          return `${hours}h ${minutes}min`;
        }
        if (secs > 0) {
          return `${hours}h ${secs}sec`;
        }
        return `${hours}h`;
      }
      if (minutes > 0) {
        if (secs > 0) {
          return `${minutes}min ${secs}sec`;
        }
        return `${minutes} min`;
      }
      return `${secs} sec`;
    }

    if (format === 'hh:mm:ss') {
      // If over 24 hours, show days: "1d 05:23:30" or "2d 12:34:56"
      if (days > 0) {
        return `${days}d ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      }
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, [displaySeconds, format]);

  // Timer logic - calculate elapsed time from createdAt to now (if open) or closedAt (if closed)
  useEffect(() => {
    // Don't run timer if todo is closed (closedAt exists)
    if (isRunning && !closedAtRef.current) {
      intervalRef.current = setInterval(() => {
        if (createdAtRef.current) {
          // Calculate elapsed time from creation date to now
          const createdDate = new Date(createdAtRef.current);
          const now = new Date();
          const elapsedMs = now.getTime() - createdDate.getTime();
          const elapsedSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
          setDisplaySeconds(elapsedSeconds);
        } else {
          // Fallback to counting up from initialSeconds
          setDisplaySeconds((prev) => prev + 1);
        }
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning]);

  const handleStart = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsRunning(true);
  }, []);

  const handlePause = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsRunning(false);
  }, []);

  const handleReset = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsRunning(false);
      const elapsed = calculateElapsedSeconds();
      setDisplaySeconds(elapsed);
    },
    [calculateElapsedSeconds]
  );

  // Color classes based on timerColor
  const colorClasses = {
    blue: 'text-blue-600',
    orange: 'text-orange-600',
    gray: 'text-gray-600',
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span
        className={`${format === 'human' ? 'text-xs' : 'text-lg'} font-mono font-semibold ${colorClasses[timerColor]}`}
      >
        {formattedTime}
      </span>
      {showControls && (
        <div className="flex items-center gap-1">
          {!isRunning ? (
            <Button
              onClick={handleStart}
              className="rounded bg-green-600 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-green-700"
              aria-label="Start timer"
              icon={<ApolloIcon name="play" className="h-4 w-4" />}
            />
          ) : (
            <Button
              onClick={handlePause}
              className="rounded bg-amber-600 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-amber-700"
              aria-label="Pause timer"
              icon={<ApolloIcon name="pause" className="h-4 w-4" />}
            />
          )}
          <Button
            onClick={handleReset}
            className="rounded bg-gray-600 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-gray-700"
            aria-label="Reset timer"
            icon={<ApolloIcon name="refresh" className="h-4 w-4" />}
          />
        </div>
      )}
    </div>
  );
};

export default Timer;
