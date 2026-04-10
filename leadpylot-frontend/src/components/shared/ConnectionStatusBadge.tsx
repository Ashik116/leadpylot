'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Button from '@/components/ui/Button';
import Tag from '@/components/ui/Tag';
import ApolloIcon from '@/components/ui/ApolloIcon';

type Size = 'sm' | 'md' | 'lg';

export interface ConnectionStatusBadgeProps {
  className?: string;
  size?: Size;
  isConnected?: boolean;
  reconnecting?: boolean;
  showDetails?: boolean;
  showReconnectButton?: boolean;
  onReconnect?: () => void | Promise<void>;
  summary: {
    icon: string;
    text: string;
    colorClass: string; // e.g. text-green-600
    bgClass: string; // e.g. bg-green-100
    borderClass: string; // e.g. border-green-200
    description?: string;
  };
  method: {
    icon: string;
    label: string;
  };
  latency?: number;
  lastUpdate?: string;
}

const sizeMap: Record<Size, { container: string; icon: string; text: string; details: string }> = {
  sm: { container: 'px-2 py-1', icon: 'w-3 h-3', text: 'text-xs', details: 'text-xs' },
  md: { container: 'px-3 py-2', icon: 'w-4 h-4', text: 'text-sm', details: 'text-xs' },
  lg: { container: 'px-4 py-3', icon: 'w-6 h-6', text: 'text-base', details: 'text-sm' },
};

const ConnectionStatusBadge: React.FC<ConnectionStatusBadgeProps> = ({
  className = '',
  size = 'md',
  isConnected,
  reconnecting,
  showDetails,
  showReconnectButton,
  onReconnect,
  summary,
  method,
  latency = 0,
  lastUpdate,
}) => {
  const sz = sizeMap[size];
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const portalRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number; width: number } | null>(
    null
  );

  useEffect(() => {
    if (!isOpen || !wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    setTooltipPos({
      top: rect.bottom + 8, // 8px gap below
      left: rect.left,
      width: rect.width,
    });

    const handle = () => {
      const r = wrapperRef.current?.getBoundingClientRect();
      if (r) setTooltipPos({ top: r.bottom + 8, left: r.left, width: r.width });
    };

    window.addEventListener('scroll', handle, true);
    window.addEventListener('resize', handle);
    return () => {
      window.removeEventListener('scroll', handle, true);
      window.removeEventListener('resize', handle);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (wrapperRef.current?.contains(target)) return;
      if (portalRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', onDocClick, true);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick, true);
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen]);

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen((v) => !v);
          }
        }}
        className={`flex cursor-pointer items-center space-x-2 rounded-lg transition-all duration-200 ${summary?.bgClass} ${summary?.borderClass} ${sz.container} `}
      >
        <div className="relative">
          <ApolloIcon name={summary?.icon as any} className={`${summary?.colorClass} ${sz.icon}`} />
          {isConnected && (
            <div className={`absolute inset-0 ${sz.icon} animate-ping opacity-20`}>
              <ApolloIcon name={summary?.icon as any} className={summary?.colorClass} />
            </div>
          )}
          {reconnecting && (
            <div className={`absolute inset-0 ${sz.icon} animate-spin`}>
              <ApolloIcon name="refresh" className={summary?.colorClass} />
            </div>
          )}
        </div>

        <span className={`font-medium ${summary?.colorClass} ${sz.text}`}>{summary?.text}</span>

        {showDetails && (
          <Tag className="border-gray-300 bg-white/50 px-2 py-1 text-xs text-gray-700">
            <ApolloIcon name={method?.icon as any} className="mr-1 h-3 w-3" />
            {method?.label}
          </Tag>
        )}

        {showDetails && latency > 0 && (
          <span className={`${sz.details} font-mono text-gray-600`}>{latency?.toFixed(0)}ms</span>
        )}

        <ApolloIcon
          name={isOpen ? 'chevron-arrow-up' : 'chevron-arrow-down'}
          className={`${summary?.colorClass}`}
        />
      </button>
      {isOpen &&
        tooltipPos &&
        typeof window !== 'undefined' &&
        createPortal(
          <div
            ref={portalRef}
            role="dialog"
            aria-label="Connection status details"
            className="z-[9999] w-60 rounded-lg border border-gray-200 bg-white p-4 shadow-xl"
            style={{ position: 'fixed', top: tooltipPos.top, left: tooltipPos.left }}
          >
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-base font-semibold text-gray-900">Connection Status</h4>
              <div className={`h-2 w-2 rounded-full ${summary?.bgClass?.replace('100', '500')}`} />
            </div>

            <div className="mb-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Health:</span>
                <span className={`font-medium ${summary?.colorClass}`}>{summary?.text}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Method:</span>
                <span className="font-medium text-gray-900">{method?.label}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Latency:</span>
                <span className="font-mono text-sm text-gray-900">
                  {latency > 0 ? `${latency}ms` : '-'}
                </span>
              </div>
              {lastUpdate && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Update:</span>
                  <span className="text-sm text-gray-600">
                    {new Date(lastUpdate).toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>

            {summary?.description && (
              <p className="mb-4 text-sm text-gray-600">{summary?.description}</p>
            )}

            {showReconnectButton && summary?.text !== 'Excellent' && (
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={onReconnect}
                  disabled={!!reconnecting}
                  icon={
                    <ApolloIcon name="refresh" className={reconnecting ? 'animate-spin' : ''} />
                  }
                >
                  {reconnecting ? 'Reconnecting...' : 'Reconnect'}
                </Button>
              </div>
            )}
          </div>,
          document.body
        )}
    </div>
  );
};

export default ConnectionStatusBadge;
