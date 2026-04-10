'use client';

/**
 * SnoozeMenu Component
 * Quick snooze buttons and custom date/time picker
 */

import { useState } from 'react';
import { format } from 'date-fns';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useSnoozeEmail, useUnsnoozeEmail } from '../../_hooks/useSnoozeEmail';

interface SnoozeMenuProps {
  emailId: string;
  onClose: () => void;
}

export default function SnoozeMenu({ emailId, onClose }: SnoozeMenuProps) {
  const { snoozeEmail, isSnoozing } = useSnoozeEmail();
  const [showCustom, setShowCustom] = useState(false);
  const [customDate, setCustomDate] = useState('');
  const [customTime, setCustomTime] = useState('09:00');
  const [reason, setReason] = useState('');

  const calculateSnoozeTime = (hours: number): string => {
    const now = new Date();
    now.setHours(now.getHours() + hours);
    return now.toISOString();
  };

  const calculateSnoozeDate = (days: number, hour: number = 9): string => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    date.setHours(hour, 0, 0, 0);
    return date.toISOString();
  };

  const handleQuickSnooze = (hours?: number, days?: number, hour?: number) => {
    let snoozeUntil: string;
    if (hours !== undefined) {
      snoozeUntil = calculateSnoozeTime(hours);
    } else if (days !== undefined) {
      snoozeUntil = calculateSnoozeDate(days, hour);
    } else {
      return;
    }
    snoozeEmail({ emailId, snoozeUntil, reason }, {
      onSuccess: () => {
        onClose();
      },
    });
  };

  const handleCustomSnooze = () => {
    if (!customDate) {
      return;
    }

    const snoozeUntil = new Date(`${customDate}T${customTime}`).toISOString();
    snoozeEmail({ emailId, snoozeUntil, reason }, {
      onSuccess: () => {
        onClose();
      },
    });
  };

  const quickOptions = [
    { label: '1 Hour', icon: 'stopwatch' as const, action: () => handleQuickSnooze(1) },
    { label: '4 Hours', icon: 'stopwatch' as const, action: () => handleQuickSnooze(4) },
    { label: 'Tomorrow 9 AM', icon: 'calendar' as const, action: () => handleQuickSnooze(undefined, 1, 9) },
    {
      label: 'This Weekend', icon: 'calendar' as const, action: () => {
        const today = new Date();
        const daysUntilSaturday = (6 - today.getDay() + 7) % 7;
        handleQuickSnooze(undefined, daysUntilSaturday || 7, 9);
      }
    },
    {
      label: 'Next Week', icon: 'calendar' as const, action: () => {
        const today = new Date();
        const daysUntilMonday = (1 - today.getDay() + 7) % 7;
        handleQuickSnooze(undefined, daysUntilMonday + 7, 9);
      }
    },
  ];

  return (
    <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg border-2 border-blue-400 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">
            <ApolloIcon name="stopwatch" className="inline mr-2" />
            Snooze Email
          </h3>
          <Button
            variant="plain"
            onClick={onClose}
            icon={<ApolloIcon name="cross" />}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Hide this email until a specific time
        </p>
      </div>

      {/* Content */}
      <div className="p-4">
        {!showCustom ? (
          <div className="space-y-2">
            {/* Quick Snooze Options */}
            {quickOptions.map((option, index) => (
              <button
                key={index}
                onClick={option.action}
                disabled={isSnoozing}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ApolloIcon name={option.icon} className="text-gray-400" />
                <span className="text-sm font-medium text-gray-700">{option.label}</span>
              </button>
            ))}

            {/* Custom Option */}
            <button
              onClick={() => setShowCustom(true)}
              disabled={isSnoozing}
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-colors"
            >
              <ApolloIcon name="calendar" className="text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Custom Date & Time</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Custom Date/Time Picker */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Date
              </label>
              <Input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Time
              </label>
              <Input
                type="time"
                value={customTime}
                onChange={(e) => setCustomTime(e.target.value)}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Reason (optional)
              </label>
              <Input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Waiting for response"
                className="w-full"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                variant="plain"
                onClick={() => setShowCustom(false)}
                disabled={isSnoozing}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                size="sm"
                variant="solid"
                onClick={handleCustomSnooze}
                disabled={!customDate || isSnoozing}
                loading={isSnoozing}
                className="flex-1"
              >
                Snooze
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-500">
        💡 Snoozed emails will return to your inbox at the specified time
      </div>
    </div>
  );
}

interface SnoozeInfoDropdownProps {
  emailId: string;
  snoozed_at?: string;
  snoozed_by?: any;
  snoozed_until?: string;
  onUnsnooze?: () => void;
}

export function SnoozeInfoDropdown({
  emailId,
  snoozed_at,
  snoozed_by,
  snoozed_until,
  onUnsnooze,
}: SnoozeInfoDropdownProps) {
  const { unsnoozeEmail, isUnsnoozing } = useUnsnoozeEmail();

  return (
    <div className="absolute right-0 top-full mt-1 w-64 bg-white rounded-lg border border-gray-200 shadow-lg z-50">
      <div className="p-3">
        {snoozed_at && (
          <div className="mb-2">
            <div className="text-[0.698775rem] text-gray-500">Snoozed At</div>
            <div className="text-[0.8152375rem] text-gray-900">
              {format(new Date(snoozed_at), 'PPp')}
            </div>
          </div>
        )}
        {snoozed_by && (
          <div className="mb-2">
            <div className="text-[0.698775rem] text-gray-500">Snoozed By</div>
            <div className="text-[0.8152375rem] text-gray-900">
              {snoozed_by?.login || snoozed_by?.name || snoozed_by}
            </div>
          </div>
        )}
        {snoozed_until && (
          <div className="mb-3">
            <div className="text-[0.698775rem] text-gray-500">Snooze Until</div>
            <div className="text-[0.8152375rem] text-gray-900">
              {format(new Date(snoozed_until), 'PPp')}
            </div>
          </div>
        )}
        <Button
          size="sm"
          variant="solid"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            unsnoozeEmail(emailId, {
              onSuccess: () => {
                if (onUnsnooze) onUnsnooze();
              },
            });
          }}
          loading={isUnsnoozing}
          className="w-full"
          icon={<ApolloIcon name="refresh" />}
        >
          Unsnooze
        </Button>
      </div>
    </div>
  );
}

