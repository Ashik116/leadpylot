'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import ApolloIcon from '@/components/ui/ApolloIcon';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import { apiUpdateBotCredential, apiToggleBotCredential, apiRemoveBotCredential } from '@/services/UsersService';
import type { OtherPlatformCredential, User } from '@/services/UsersService';

interface TelegramBotSettingsProps {
  user: User;
}

interface TelegramCredential {
  _id?: string;
  platform_type: 'telegram';
  platform_name: string;
  chat_id: string | null;
  bot_enabled: boolean;
  linked_at: Date | string | null;
}

export default function TelegramBotSettings({ user }: TelegramBotSettingsProps) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Find Telegram credential from user's other_platform_credentials
  const telegramCredential = user?.other_platform_credentials?.find(
    (cred): cred is OtherPlatformCredential => cred.platform_type === 'telegram'
  ) as OtherPlatformCredential | undefined;

  const isLinked = !!telegramCredential;
  const botEnabled = telegramCredential?.bot_enabled ?? false;

  // Mutation to enable/disable notifications
  const toggleMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!telegramCredential?._id) {
        throw new Error('Credential ID not found');
      }
      return apiToggleBotCredential(user._id, telegramCredential._id, enabled);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
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

  const handleToggleNotifications = async () => {
    setIsSubmitting(true);
    try {
      await toggleMutation.mutateAsync(!botEnabled);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-50 text-blue-600">
            <ApolloIcon name="mail-filled" className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Telegram Bot Notifications</h2>
            <p className="text-xs text-slate-500">Receive lead notifications via Telegram</p>
          </div>
        </div>

        <div className="space-y-4">
          {isLinked ? (
            <div className="space-y-4">
              {/* Linked Status */}
              <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                <div className="flex items-center gap-3">
                  <ApolloIcon name="check-circle-task" className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-900">Account Linked</p>
                    <p className="text-xs text-emerald-700">
                      Your Telegram account is connected
                      {telegramCredential?.chat_id && ` (Chat ID: ${telegramCredential.chat_id})`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                    botEnabled
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {botEnabled ? 'Notifications On' : 'Notifications Off'}
                  </span>
                </div>
              </div>

              {/* Enable/Disable Toggle */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <p className="text-sm font-medium text-slate-900">Enable Lead Notifications</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {botEnabled
                      ? 'You will receive notifications for new leads'
                      : 'Notifications are currently disabled'}
                  </p>
                </div>
                <button
                  onClick={handleToggleNotifications}
                  disabled={isSubmitting || toggleMutation.isPending}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    botEnabled ? 'bg-blue-600' : 'bg-slate-300'
                  } ${isSubmitting || toggleMutation.isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      botEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Instructions */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm font-semibold text-blue-900 mb-2">How to unlink your account:</p>
                <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Open Telegram and find our bot</li>
                  <li>Send the command: <code className="bg-blue-100 px-1.5 py-0.5 rounded">/stop</code></li>
                  <li>Your account will be unlinked automatically</li>
                </ol>
              </div>

              {/* Linked Date */}
              {telegramCredential?.linked_at && (
                <p className="text-xs text-slate-500 text-center">
                  Linked since {new Date(telegramCredential.linked_at).toLocaleDateString()}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Not Linked Status */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center gap-3">
                  <ApolloIcon name="times-circle" className="w-5 h-5 text-slate-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Account Not Linked</p>
                    <p className="text-xs text-slate-500">Connect your Telegram to receive notifications</p>
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm font-semibold text-blue-900 mb-3">How to link your account:</p>
                <ol className="text-xs text-blue-800 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-blue-600">1.</span>
                    <span>Open Telegram and search for our bot</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-blue-600">2.</span>
                    <div>
                      Send the command:{' '}
                      <code className="bg-blue-100 px-2 py-1 rounded text-xs font-mono block mt-1">
                        /start {user?.info?.email || 'your@email.com'}
                      </code>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-blue-600">3.</span>
                    <span>You'll receive a confirmation message</span>
                  </li>
                </ol>
              </div>

              {/* Refresh Button */}
              <div className="flex justify-center">
                <button
                  onClick={() => queryClient.invalidateQueries({ queryKey: ['current-user'] })}
                  className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
                >
                  <ApolloIcon name="refresh" className="w-4 h-4" />
                  Check again
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
          <p className="text-xs text-slate-600">
            <strong>Note:</strong> {' '}
            {(user as any)?.role === 'Admin'
              ? 'As an Admin, you will receive notifications for ALL leads matched in the system.'
              : 'As an Agent, you will only receive notifications for leads assigned to you.'}
          </p>
        </div>
      </div>
    </section>
  );
}
