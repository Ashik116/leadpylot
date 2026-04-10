'use client';

import { useEffect, useState } from 'react';
import Button from '@/components/ui/Button';
import { ApolloIcon } from '@/components/ui/ApolloIcon';
import Select from '@/components/ui/Select';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import {
  apiGetTelegramBots,
  apiGetTelegramBotUpdates,
  apiGetAllTelegramBotUpdates,
  type TelegramBot,
  type TelegramUpdate,
} from '@/services/TelegramBotService';
import { useQuery } from '@tanstack/react-query';

export default function TelegramBotUpdatesViewer() {
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [page, setPage] = useState(0);
  const pageSize = 50;

  // Fetch all bots
  const { data: botsData, isLoading: botsLoading } = useQuery({
    queryKey: ['telegram-bots'],
    queryFn: () => apiGetTelegramBots({ include_inactive: true }),
  });

  const bots = botsData?.data || [];
  const activeBots = bots.filter((bot) => bot.is_active);

  // Fetch all historical updates (paginated)
  const { data: allUpdatesData, isLoading: updatesLoading, refetch: refetchUpdates } = useQuery({
    queryKey: ['telegram-bot-updates-all', selectedBotId, page],
    queryFn: () => apiGetAllTelegramBotUpdates({
      limit: pageSize,
      skip: page * pageSize,
    }),
    enabled: true,
    refetchInterval: autoRefresh ? 5000 : false, // Auto-refresh every 5 seconds if enabled
  });

  const botInfo = allUpdatesData?.bot_info;
  const updates = allUpdatesData?.data || [];
  const pagination = allUpdatesData?.pagination;

  // Load more updates
  const loadMore = () => {
    if (pagination?.has_more && !updatesLoading) {
      setPage(page + 1);
    }
  };

  // Reset to first page when bot selection changes
  const handleBotChange = (botId: string | null) => {
    setSelectedBotId(botId);
    setPage(0);
  };

  // Auto-select first active bot on mount (using setTimeout to avoid cascading renders)
  useEffect(() => {
    if (!selectedBotId && activeBots.length > 0) {
      const timer = setTimeout(() => {
        handleBotChange(activeBots[0]._id);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [activeBots.length]); // Only re-run when activeBots length changes

  const handleRefresh = () => {
    refetchUpdates();
    toast.push(
      <Notification title="Refreshing" type="success">
        Updates refreshed successfully
      </Notification>
    );
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const getUpdateTypeBadge = (update: TelegramUpdate) => {
    if (update.message?.entities?.some((e) => e.type === 'bot_command')) {
      return <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">Command</span>;
    }
    if (update.message?.text) {
      return <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">Message</span>;
    }
    return <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">Other</span>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Telegram Bot Updates</h3>
          <p className="text-sm text-gray-600">
            View real-time updates and messages from your Telegram bot
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="plain"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            icon={<ApolloIcon name={autoRefresh ? 'pause' : 'play'} className="text-sm" />}
          >
            {autoRefresh ? 'Stop' : 'Auto'} Refresh
          </Button>
          <Button
            variant="solid"
            size="sm"
            onClick={handleRefresh}
            loading={updatesLoading}
            icon={<ApolloIcon name="refresh" className="text-sm" />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Bot Selector */}
      <div className="flex items-center gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <label className="text-sm font-medium text-gray-700">Select Bot:</label>
        <div className="flex-1">
          <Select
            placeholder="Select a Telegram bot"
            options={activeBots.map((bot) => ({
              value: bot._id,
              label: `${bot.name} (@${bot.bot_username})`,
            }))}
            value={
              selectedBotId
                ? {
                    value: selectedBotId,
                    label: activeBots.find((b) => b._id === selectedBotId)?.name || '',
                  }
                : null
            }
            onChange={(option) => handleBotChange(option?.value || null)}
            isDisabled={botsLoading || activeBots.length === 0}
            className="w-full"
          />
        </div>
        {botInfo && (
          <div className="text-sm text-gray-600">
            Viewing updates from <span className="font-medium">{botInfo.name}</span>
          </div>
        )}
      </div>

      {/* No bot selected */}
      {!selectedBotId && activeBots.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
          <ApolloIcon name="info-circle" className="mx-auto mb-4 text-4xl text-gray-400" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">No Active Bots</h4>
          <p className="text-sm text-gray-600">
            Please activate a Telegram bot in the settings above to view updates.
          </p>
        </div>
      )}

      {/* Updates List */}
      {selectedBotId && (
        <div className="rounded-lg border border-gray-200 bg-white">
          {/* Updates Header */}
          <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <ApolloIcon name="comment" className="text-sm text-gray-600" />
              <span className="text-sm font-medium text-gray-700">
                Updates {pagination?.total ? `(${pagination.total} total)` : `(${updates.length})`}
              </span>
            </div>
            {pagination && (
              <span className="text-xs text-gray-500">
                Showing {Math.min((page + 1) * pageSize, pagination.total)} of {pagination.total}
              </span>
            )}
          </div>

          {/* Updates Content */}
          {updatesLoading ? (
            <div className="p-8 text-center text-sm text-gray-500">Loading updates...</div>
          ) : updates.length === 0 ? (
            <div className="p-8 text-center">
              <ApolloIcon name="comment" className="mx-auto mb-3 text-3xl text-gray-300" />
              <p className="text-sm text-gray-500">No updates yet</p>
              <p className="text-xs text-gray-400 mt-1">
                Messages and updates from your bot will appear here
              </p>
            </div>
          ) : (
            <div className="max-h-[600px] overflow-y-auto">
              <div className="divide-y divide-gray-100">
                {updates
                  .slice()
                  .reverse()
                  .map((update) => {
                    const message = update.message;
                    if (!message) return null;

                    return (
                      <div key={update.update_id} className="p-4 hover:bg-gray-50">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                              <ApolloIcon name="user" className="text-sm text-blue-600" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-900">
                                  {message.from.first_name} {message.from.last_name || ''}
                                </span>
                                {message.from.username && (
                                  <span className="text-xs text-gray-500">@{message.from.username}</span>
                                )}
                              </div>
                              <div className="text-xs text-gray-500">
                                Chat ID: {message.chat.id} • {formatDate(message.date)}
                              </div>
                            </div>
                          </div>
                          {getUpdateTypeBadge(update)}
                        </div>

                        {message.text && (
                          <div className="ml-10 rounded-lg bg-gray-50 p-3">
                            <p className="text-sm text-gray-800 font-mono break-all">
                              {message.text}
                            </p>
                          </div>
                        )}

                        {/* Message Info */}
                        <div className="ml-10 mt-2 flex items-center gap-4 text-xs text-gray-500">
                          <span>Message ID: {message.message_id}</span>
                          <span>Update ID: {update.update_id}</span>
                          <span className="inline-flex items-center gap-1">
                            <ApolloIcon name="eye-filled" className="text-xs" />
                            {message.chat.type === 'private' ? 'Private Chat' : 'Group Chat'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
          {/* Load More Button */}
          {pagination?.has_more && (
            <div className="border-t border-gray-200 p-4 text-center">
              <Button
                variant="plain"
                size="sm"
                onClick={loadMore}
                loading={updatesLoading}
                icon={<ApolloIcon name="rotate-right" className="text-sm" />}
              >
                Load More Updates
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
