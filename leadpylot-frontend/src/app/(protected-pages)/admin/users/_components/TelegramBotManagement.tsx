'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Button from '@/components/ui/Button';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import { apiUpdateBotCredential, apiToggleBotCredential, apiRemoveBotCredential, type User, type OtherPlatformCredential } from '@/services/UsersService';
import { apiGetUser } from '@/services/UsersService';

interface TelegramBotManagementProps {
  userId: string;
  user: User | null;
  onClose?: () => void;
}

export default function TelegramBotManagement({ userId, user, onClose }: TelegramBotManagementProps) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Find Telegram credential from user's other_platform_credentials
  const telegramCredential = user?.other_platform_credentials?.find(
    (cred): cred is OtherPlatformCredential => cred.platform_type === 'telegram'
  );

  const isLinked = !!telegramCredential;
  const botEnabled = telegramCredential?.bot_enabled ?? false;

  // Mutation to enable/disable notifications
  const toggleMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!telegramCredential?._id) {
        throw new Error('Credential ID not found');
      }
      return apiToggleBotCredential(userId, telegramCredential._id, enabled);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.push(
        <Notification title="Success" type="success">
          {botEnabled ? 'Notifications disabled' : 'Notifications enabled'}
        </Notification>
      );
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.error || 'Failed to update settings';
      toast.push(<Notification title="Error" type="danger">{errorMessage}</Notification>);
    },
  });

  // Mutation to remove/unlink Telegram credential
  const removeMutation = useMutation({
    mutationFn: async () => {
      if (!telegramCredential?._id) {
        throw new Error('Credential ID not found');
      }
      return apiRemoveBotCredential(userId, telegramCredential._id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.push(
        <Notification title="Success" type="success">
          Telegram account unlinked successfully
        </Notification>
      );
      onClose?.();
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.error || 'Failed to unlink account';
      toast.push(<Notification title="Error" type="danger">{errorMessage}</Notification>);
    },
  });

  const handleToggleNotifications = async () => {
    setIsSubmitting(true);
    try {
      await toggleMutation.mutateAsync(!botEnabled);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnlinkAccount = async () => {
    if (!confirm('Are you sure you want to unlink this Telegram account? The user will no longer receive notifications.')) {
      return;
    }
    setIsSubmitting(true);
    try {
      await removeMutation.mutateAsync();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-50 text-blue-600">
          <ApolloIcon name="mail-filled" className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">Telegram Bot Settings</h3>
          <p className="text-xs text-slate-500">Manage notifications for {user?.info?.name || user?.login || 'this user'}</p>
        </div>
      </div>

      {isLinked ? (
        <div className="space-y-4">
          {/* Linked Status */}
          <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg border border-emerald-200">
            <div className="flex items-center gap-2">
              <ApolloIcon name="check-circle-task" className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald-900">Account Linked</p>
                <p className="text-xs text-emerald-700">
                  Chat ID: {telegramCredential?.chat_id || 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Enable/Disable Toggle */}
          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer">
              <div>
                <p className="text-sm font-medium text-slate-900">Enable Lead Notifications</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {botEnabled
                    ? 'User will receive notifications for new leads'
                    : 'Notifications are currently disabled'}
                </p>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={botEnabled}
                  onChange={handleToggleNotifications}
                  disabled={isSubmitting || toggleMutation.isPending}
                  className="sr-only"
                />
                <div
                  onClick={handleToggleNotifications}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    botEnabled ? 'bg-blue-600' : 'bg-slate-300'
                  } ${isSubmitting || toggleMutation.isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      botEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </div>
              </div>
            </label>
          </div>

          {/* Linked Date */}
          {telegramCredential?.linked_at && (
            <p className="text-xs text-slate-500 text-center">
              Linked since {new Date(telegramCredential.linked_at).toLocaleDateString()}
            </p>
          )}

          {/* Unlink Button */}
          <div className="pt-4 border-t border-slate-200">
            <Button
              variant="destructive"
              size="sm"
              className="w-full"
              onClick={handleUnlinkAccount}
              disabled={isSubmitting || removeMutation.isPending}
            >
              {isSubmitting || removeMutation.isPending ? 'Unlinking...' : 'Unlink Telegram Account'}
            </Button>
          </div>

          {/* Instructions for Unlinking */}
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs font-semibold text-blue-900 mb-1">How user can unlink their account:</p>
            <p className="text-xs text-blue-800">
              Users can also unlink by sending <code className="bg-blue-100 px-1.5 py-0.5 rounded text-xs">/stop</code> to the Telegram bot.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Not Linked Status */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center gap-2">
              <ApolloIcon name="times-circle" className="w-5 h-5 text-slate-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-slate-900">Account Not Linked</p>
                <p className="text-xs text-slate-500">User has not linked their Telegram account</p>
              </div>
            </div>
          </div>

          {/* Instructions for Linking */}
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm font-semibold text-blue-900 mb-2">How user can link their account:</p>
            <ol className="text-xs text-blue-800 space-y-1.5 list-decimal list-inside">
              <li>Open Telegram and search for our bot</li>
              <li>Send the command: <code className="bg-blue-100 px-1.5 py-0.5 rounded">/start {user?.info?.email || 'your@email.com'}</code></li>
              <li>User will receive a confirmation message</li>
            </ol>
          </div>

          {/* Refresh Button */}
          <div className="flex justify-center pt-2">
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ['users'] })}
              className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ApolloIcon name="refresh" className="w-4 h-4" />
              Check if user has linked
            </button>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
        <p className="text-xs text-slate-600">
          <strong>Note:</strong> {' '}
          {(user as any)?.role === 'Admin'
            ? 'As an Admin, this user will receive notifications for ALL leads matched in the system.'
            : 'As an Agent, this user will only receive notifications for leads assigned to them.'}
        </p>
      </div>
    </div>
  );
}
