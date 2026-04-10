/**
 * Connection Status Indicator
 * Displays Socket.IO connection health with visual feedback
 */

'use client';

import React, { useState, useEffect } from 'react';
import socketService from '@/services/SocketService';
import ConnectionStatusBadge from './ConnectionStatusBadge';

interface ConnectionStatusIndicatorProps {
  showDetails?: boolean;
  showReconnectButton?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const ConnectionStatusIndicator: React.FC<ConnectionStatusIndicatorProps> = ({
  showDetails = false,
  showReconnectButton = true,
  className = '',
  size = 'md',
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date().toISOString());

  useEffect(() => {
    const checkConnection = () => {
      const connected = socketService.isConnected();
      setIsConnected(connected);
      setLastUpdate(new Date().toISOString());
    };

    checkConnection();
    const interval = setInterval(checkConnection, 5000);
    return () => clearInterval(interval);
  }, []);

  const health = isConnected ? 'good' : 'critical';

  const summaryMap: Record<string, { color: string; bg: string; border: string; icon: string; text: string; desc: string }> = {
    good: { color: 'text-green-600', bg: 'bg-green-100', border: 'border-green-200', icon: 'signals', text: 'Connected', desc: 'Real-time updates active' },
    critical: { color: 'text-red-600', bg: 'bg-red-100', border: 'border-red-200', icon: 'phone-times', text: 'Disconnected', desc: 'Connection issues detected' },
  };

  const s = summaryMap[health];

  const onReconnect = async () => {
    window.location.reload();
  };

  return (
    <ConnectionStatusBadge
      className={className}
      size={size}
      isConnected={isConnected}
      reconnecting={false}
      showDetails={showDetails}
      showReconnectButton={showReconnectButton}
      onReconnect={onReconnect}
      summary={{ icon: s.icon, text: s.text, colorClass: s.color, bgClass: s.bg, borderClass: s.border, description: s.desc }}
      method={{ icon: 'zap', label: 'WebSocket' }}
      latency={0}
      lastUpdate={lastUpdate}
    />
  );
};

export default ConnectionStatusIndicator;
