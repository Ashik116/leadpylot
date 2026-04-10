'use client';

import React, { useState } from 'react';
import { HiBell } from 'react-icons/hi';
import { useUnreadCount } from '@/stores/notificationStore';
import NotificationDisplay from './NotificationDisplay';

interface ProfessionalNotificationDropdownProps {
  className?: string;
}

const ProfessionalNotificationDropdown: React.FC<ProfessionalNotificationDropdownProps> = ({
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const unreadCount = useUnreadCount();

  return (
    <div className={`relative ${className}`}>
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="Open notifications"
      >
        <HiBell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Professional Notification Display */}
      <NotificationDisplay
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        maxHeight="max-h-[500px]"
      />

      {/* Overlay to close dropdown when clicking outside */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default ProfessionalNotificationDropdown; 