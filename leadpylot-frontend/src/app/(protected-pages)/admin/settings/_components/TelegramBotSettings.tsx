'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import ApolloIcon from '@/components/ui/ApolloIcon';
import Button from '@/components/ui/Button';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import {
  apiGetTelegramBots,
  apiCreateTelegramBot,
  apiUpdateTelegramBot,
  apiDeleteTelegramBot,
  apiToggleTelegramBot,
  apiTestTelegramBot,
  apiGetNotificationBotStatus,
  apiReloadNotificationBot,
  type TelegramBot,
  type TelegramBotType,
} from '@/services/TelegramBotService';
import Dialog from '@/components/ui/Dialog';
import TelegramBotUpdatesViewer from './TelegramBotUpdatesViewer';
import { useTelegramEvents } from '@/hooks/useTelegramEvents';

// Notification types auto-assigned by bot_type — these match the backend routing logic
const EMAIL_NOTIFICATION_TYPES = ['email_received', 'email_approved', 'email_agent_assigned'];
const GENERAL_NOTIFICATION_TYPES = [
  'lead_assigned',
  'lead_updated',
  'offer_created',
  'offer_updated',
  'offer_status_sent',
  'opening_created',
  'confirmation_created',
  'payment_voucher_created',
  'netto1_created',
  'netto2_created',
  'todo_created',
  'todo_assigned',
  'todo_completed',
  'lead_transferred',
  'bulk_lead_transferred',
  'project_created',
  'project_updated',
  'reclamation_created',
  'appointment_reminder',
];

// Human-readable labels for notification type chips
const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  lead_assigned: 'Lead Assigned',
  lead_updated: 'Lead Updated',
  lead_transferred: 'Lead Transferred',
  bulk_lead_transferred: 'Bulk Lead Transferred',
  offer_created: 'Offer Created',
  offer_updated: 'Offer Updated',
  offer_status_sent: 'Offer Sent',
  opening_created: 'Opening Created',
  confirmation_created: 'Confirmation Created',
  payment_voucher_created: 'Payment Created',
  netto1_created: 'Netto 1 Created',
  netto2_created: 'Netto 2 Created',
  todo_created: 'Ticket Created',
  todo_assigned: 'Ticket Assigned',
  todo_completed: 'Ticket Completed',
  project_created: 'Project Created',
  project_updated: 'Project Updated',
  reclamation_created: 'Reclamation Created',
  appointment_reminder: 'Meeting Reminder',
  email_received: 'Email Received',
  email_approved: 'Email Approved',
  email_agent_assigned: 'Email Agent Assigned',
};

function getNotificationTypeLabel(type: string): string {
  return NOTIFICATION_TYPE_LABELS[type] || type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function getNotificationTypesForBotType(botType: TelegramBotType): string[] {
  return botType === 'email_dedicated' ? EMAIL_NOTIFICATION_TYPES : GENERAL_NOTIFICATION_TYPES;
}

// ─────────────────────────────────────────────────────────────
// BotCard
// ─────────────────────────────────────────────────────────────

interface BotCardProps {
  bot: TelegramBot;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: (isActive: boolean) => void;
  onTest: () => void;
  isToggling: boolean;
  isTesting: boolean;
}

function BotCard({ bot, onEdit, onDelete, onToggle, onTest, isToggling, isTesting }: BotCardProps) {
  const isEmail = bot.bot_type === 'email_dedicated';

  return (
    <div
      className={`bg-white rounded-xl border ${
        bot.is_active ? (isEmail ? 'border-purple-200' : 'border-blue-200') : 'border-slate-200'
      } overflow-hidden`}
    >
      {/* Header */}
      <div
        className={`p-4 border-b ${
          bot.is_active
            ? isEmail
              ? 'bg-purple-50 border-purple-200'
              : 'bg-blue-50 border-blue-200'
            : 'bg-slate-50 border-slate-200'
        }`}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                bot.is_active
                  ? isEmail
                    ? 'bg-purple-100'
                    : 'bg-blue-100'
                  : 'bg-slate-200'
              }`}
            >
              <span className="text-xl">{isEmail ? '✉️' : '⚡'}</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">{bot.name}</h3>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                    isEmail ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  {isEmail ? '✉️ Email Bot' : '⚡ General'}
                </span>
              </div>
              <p className="text-xs text-slate-500">@{bot.bot_username}</p>
            </div>
          </div>
          <button
            onClick={() => onToggle(!bot.is_active)}
            disabled={isToggling}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              bot.is_active ? (isEmail ? 'bg-purple-600' : 'bg-blue-600') : 'bg-slate-300'
            } ${isToggling ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                bot.is_active ? 'translate-x-5' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {bot.description && (
          <p className="text-sm text-slate-600 line-clamp-2">{bot.description}</p>
        )}

        {/* Routing Info */}
        <div
          className={`p-3 rounded-lg border ${
            isEmail ? 'bg-purple-50 border-purple-100' : 'bg-blue-50 border-blue-100'
          }`}
        >
          <p className={`text-xs font-semibold ${isEmail ? 'text-purple-700' : 'text-blue-700'} mb-1`}>
            {isEmail ? '📧 Handles Email Notifications' : '🔔 Handles All CRM Notifications'}
          </p>
          <p className="text-xs text-slate-600">
            {isEmail
              ? 'Sends email notifications to the registered Telegram group with rich details and interactive actions.'
              : 'Sends all non-email notifications (leads, offers, openings, payments, tickets, etc.) to assigned agents and admins.'}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-xs text-slate-500 mb-1">Notifications Sent</p>
            <p className="text-lg font-bold text-slate-900">{bot.stats.total_notifications_sent || 0}</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-xs text-slate-500 mb-1">Users Linked</p>
            <p className="text-lg font-bold text-slate-900">{bot.stats.total_users_linked || 0}</p>
          </div>
        </div>

        {/* Configuration */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-700">Allowed Roles:</p>
          <div className="flex flex-wrap gap-1.5">
            {bot.config.allowed_roles.map((role) => (
              <span
                key={role}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700"
              >
                {role}
              </span>
            ))}
          </div>
        </div>

        {/* Notification Types */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-700">Notification Types:</p>
          <div className="flex flex-wrap gap-1.5">
            {getNotificationTypesForBotType(bot.bot_type).map((type) => (
              <span
                key={type}
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                  isEmail ? 'bg-purple-50 text-purple-700' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {getNotificationTypeLabel(type)}
              </span>
            ))}
          </div>
        </div>

        {/* Last Used */}
        {bot.stats.last_used_at && (
          <p className="text-xs text-slate-500">
            Last used: {new Date(bot.stats.last_used_at).toLocaleString()}
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-200 bg-slate-50">
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={onTest} disabled={isTesting}>
            {isTesting ? 'Testing...' : 'Test Connection'}
          </Button>
          <Button variant="default" size="sm" onClick={onEdit}>
            Edit
          </Button>
          <Button variant="destructive" size="sm" onClick={onDelete}>
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Create Bot Dialog
// ─────────────────────────────────────────────────────────────

interface CreateBotDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}

function CreateBotDialog({ isOpen, onClose, onSubmit, isLoading }: CreateBotDialogProps) {
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    bot_token: string;
    bot_username: string;
    bot_type: TelegramBotType;
    webhook_url: string;
    config: { allowed_roles: string[]; notification_types: string[]; rate_limit: number };
  }>({
    name: '',
    description: '',
    bot_token: '',
    bot_username: '',
    bot_type: 'general',
    webhook_url: '',
    config: {
      allowed_roles: ['Admin', 'Agent'],
      notification_types: GENERAL_NOTIFICATION_TYPES,
      rate_limit: 30,
    },
  });

  const handleBotTypeChange = (type: TelegramBotType) => {
    setFormData((prev) => ({
      ...prev,
      bot_type: type,
      config: {
        ...prev.config,
        notification_types: getNotificationTypesForBotType(type),
      },
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const isEmail = formData.bot_type === 'email_dedicated';

  return (
    <Dialog isOpen={isOpen} onClose={onClose} width={600}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">Add New Telegram Bot</h3>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Bot Type Selector */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Bot Type *</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleBotTypeChange('general')}
                className={`flex flex-col items-start p-3 rounded-lg border-2 text-left transition-colors ${
                  formData.bot_type === 'general'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className="text-lg mb-1">⚡</span>
                <span className="text-sm font-semibold text-slate-900">General Bot</span>
                <span className="text-xs text-slate-500 mt-0.5">
                  All CRM notifications (leads, offers, payments, tickets, etc.)
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleBotTypeChange('email_dedicated')}
                className={`flex flex-col items-start p-3 rounded-lg border-2 text-left transition-colors ${
                  formData.bot_type === 'email_dedicated'
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className="text-lg mb-1">✉️</span>
                <span className="text-sm font-semibold text-slate-900">Email Dedicated Bot</span>
                <span className="text-xs text-slate-500 mt-0.5">
                  Email notifications to registered group
                </span>
              </button>
            </div>

            {/* Routing info */}
            <div
              className={`mt-2 p-3 rounded-lg border ${
                isEmail ? 'bg-purple-50 border-purple-200' : 'bg-blue-50 border-blue-200'
              }`}
            >
              <p className={`text-xs ${isEmail ? 'text-purple-700' : 'text-blue-700'}`}>
                {isEmail ? (
                  <>
                    <strong>Email Bot:</strong> Posts email notifications (received, approved, agent assigned)
                    to a registered Telegram group with rich details and interactive actions.
                  </>
                ) : (
                  <>
                    <strong>General Bot:</strong> Sends all CRM notifications to assigned agents and admins
                    — lead assignments, offer/opening/confirmation/payment creation, ticket updates, and more.
                    Every message includes a &quot;View in CRM&quot; link.
                  </>
                )}
              </p>
            </div>

            {/* Auto-assigned notification types (read-only) */}
            <div className="mt-3">
              <p className="text-xs font-medium text-slate-600 mb-1.5">
                Notification types handled by this bot:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {getNotificationTypesForBotType(formData.bot_type).map((type) => (
                  <span
                    key={type}
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      isEmail ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'
                    }`}
                  >
                    {getNotificationTypeLabel(type)}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Bot Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={isEmail ? 'Email Notifications Bot' : 'CRM Notification Bot'}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              placeholder={
                isEmail
                  ? 'Dedicated bot for email notifications to group chat'
                  : 'Main bot for all CRM notifications to agents and admins'
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Bot Token *</label>
            <input
              type="password"
              required
              value={formData.bot_token}
              onChange={(e) => setFormData({ ...formData, bot_token: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
            />
            <p className="text-xs text-slate-500 mt-1">Get your token from @BotFather on Telegram</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Bot Username *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">@</span>
              <input
                type="text"
                required
                value={formData.bot_username}
                onChange={(e) =>
                  setFormData({ ...formData, bot_username: e.target.value.replace('@', '') })
                }
                className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="MyBot"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="solid" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Bot'}
            </Button>
          </div>
        </form>
      </div>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────
// Edit Bot Dialog
// ─────────────────────────────────────────────────────────────

interface EditBotDialogProps {
  isOpen: boolean;
  bot: TelegramBot;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}

function EditBotDialog({ isOpen, bot, onClose, onSubmit, isLoading }: EditBotDialogProps) {
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    bot_token: string;
    bot_username: string;
    bot_type: TelegramBotType;
    webhook_url: string;
    is_active: boolean;
    config: { allowed_roles: string[]; notification_types: string[]; rate_limit: number };
  }>({
    name: bot.name,
    description: bot.description,
    bot_token: '',
    bot_username: bot.bot_username,
    bot_type: bot.bot_type || 'general',
    webhook_url: bot.webhook_url || '',
    is_active: bot.is_active,
    config: {
      ...bot.config,
      notification_types: getNotificationTypesForBotType(bot.bot_type || 'general'),
    },
  });

  const handleBotTypeChange = (type: TelegramBotType) => {
    setFormData((prev) => ({
      ...prev,
      bot_type: type,
      config: {
        ...prev.config,
        notification_types: getNotificationTypesForBotType(type),
      },
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      ...(formData.bot_token ? { bot_token: formData.bot_token } : {}),
    };
    onSubmit(submitData);
  };

  const isEmail = formData.bot_type === 'email_dedicated';

  return (
    <Dialog isOpen={isOpen} onClose={onClose} width={600}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">Edit {bot.name}</h3>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Bot Type Selector */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Bot Type</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleBotTypeChange('general')}
                className={`flex flex-col items-start p-3 rounded-lg border-2 text-left transition-colors ${
                  formData.bot_type === 'general'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className="text-lg mb-1">⚡</span>
                <span className="text-sm font-semibold text-slate-900">General Bot</span>
                <span className="text-xs text-slate-500 mt-0.5">
                  All CRM notifications (leads, offers, payments, tickets, etc.)
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleBotTypeChange('email_dedicated')}
                className={`flex flex-col items-start p-3 rounded-lg border-2 text-left transition-colors ${
                  formData.bot_type === 'email_dedicated'
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className="text-lg mb-1">✉️</span>
                <span className="text-sm font-semibold text-slate-900">Email Dedicated Bot</span>
                <span className="text-xs text-slate-500 mt-0.5">
                  Email notifications to registered group
                </span>
              </button>
            </div>

            {/* Routing info */}
            <div
              className={`mt-2 p-3 rounded-lg border ${
                isEmail ? 'bg-purple-50 border-purple-200' : 'bg-blue-50 border-blue-200'
              }`}
            >
              <p className={`text-xs ${isEmail ? 'text-purple-700' : 'text-blue-700'}`}>
                {isEmail ? (
                  <>
                    <strong>Email Bot:</strong> Posts email notifications (received, approved, agent assigned)
                    to a registered Telegram group with rich details and interactive actions.
                  </>
                ) : (
                  <>
                    <strong>General Bot:</strong> Sends all CRM notifications to assigned agents and admins
                    — lead assignments, offer/opening/confirmation/payment creation, ticket updates, and more.
                    Every message includes a &quot;View in CRM&quot; link.
                  </>
                )}
              </p>
            </div>

            {/* Auto-assigned notification types (read-only) */}
            <div className="mt-3">
              <p className="text-xs font-medium text-slate-600 mb-1.5">
                Notification types handled by this bot:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {getNotificationTypesForBotType(formData.bot_type).map((type) => (
                  <span
                    key={type}
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      isEmail ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'
                    }`}
                  >
                    {getNotificationTypeLabel(type)}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Bot Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              New Bot Token{' '}
              <span className="text-slate-400 font-normal">(leave empty to keep current)</span>
            </label>
            <input
              type="password"
              value={formData.bot_token}
              onChange={(e) => setFormData({ ...formData, bot_token: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter new token to update"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Bot Username</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">@</span>
              <input
                type="text"
                value={formData.bot_username}
                onChange={(e) =>
                  setFormData({ ...formData, bot_username: e.target.value.replace('@', '') })
                }
                className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Webhook URL (optional)
            </label>
            <input
              type="url"
              value={formData.webhook_url}
              onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://your-domain.com/webhook"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="solid" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────

export default function TelegramBotSettings() {
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedBot, setSelectedBot] = useState<TelegramBot | null>(null);
  const [testingBotId, setTestingBotId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'bots' | 'updates'>('bots');

  const { data: botStatusData, refetch: refetchBotStatus } = useQuery({
    queryKey: ['notification-bot-status'],
    queryFn: apiGetNotificationBotStatus,
    refetchInterval: 30000,
    retry: false,
  });

  const isBotRunning = botStatusData?.data?.initialized || false;

  useTelegramEvents({
    onUserLinked: (data) => {
      toast.push(
        <Notification title="Telegram Account Linked" type="success">
          <div className="text-sm">
            <p>
              <strong>{data.user.name}</strong> has linked their Telegram account!
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Identifier: {data.identifier} &bull; Type: {data.identifier_type}
            </p>
          </div>
        </Notification>
      );
      queryClient.invalidateQueries({ queryKey: ['telegram-bots'] });
    },
    onUserUnlinked: (data) => {
      toast.push(
        <Notification title="Telegram Account Unlinked" type="info">
          <div className="text-sm">
            <p>A user has unlinked their Telegram account.</p>
            <p className="text-xs text-slate-500 mt-1">Chat ID: {data.chat_id}</p>
          </div>
        </Notification>
      );
      queryClient.invalidateQueries({ queryKey: ['telegram-bots'] });
    },
  });

  const { data: botsData, isLoading } = useQuery({
    queryKey: ['telegram-bots'],
    queryFn: () => apiGetTelegramBots({ include_inactive: true }),
  });

  const bots = botsData?.data || [];

  const createMutation = useMutation({
    mutationFn: apiCreateTelegramBot,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telegram-bots'] });
      toast.push(
        <Notification title="Success" type="success">
          Telegram bot created successfully
        </Notification>
      );
      setIsCreateDialogOpen(false);
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.error || 'Failed to create Telegram bot';
      toast.push(
        <Notification title="Error" type="danger">
          {errorMessage}
        </Notification>
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiUpdateTelegramBot(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telegram-bots'] });
      toast.push(
        <Notification title="Success" type="success">
          Telegram bot updated successfully
        </Notification>
      );
      setIsEditDialogOpen(false);
      setSelectedBot(null);
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.error || 'Failed to update Telegram bot';
      toast.push(
        <Notification title="Error" type="danger">
          {errorMessage}
        </Notification>
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: apiDeleteTelegramBot,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telegram-bots'] });
      toast.push(
        <Notification title="Success" type="success">
          Telegram bot deleted successfully
        </Notification>
      );
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.error || 'Failed to delete Telegram bot';
      toast.push(
        <Notification title="Error" type="danger">
          {errorMessage}
        </Notification>
      );
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      apiToggleTelegramBot(id, is_active),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['telegram-bots'] });
      toast.push(
        <Notification title="Success" type="success">
          Bot status updated
        </Notification>
      );
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.error || 'Failed to update bot status';
      toast.push(
        <Notification title="Error" type="danger">
          {errorMessage}
        </Notification>
      );
    },
  });

  const testMutation = useMutation({
    mutationFn: apiTestTelegramBot,
    onSuccess: (data) => {
      toast.push(
        <Notification title="Connection Successful" type="success">
          Bot @{data.bot_info?.username} is connected and working
        </Notification>
      );
      setTestingBotId(null);
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.error || 'Failed to test bot connection';
      toast.push(
        <Notification title="Connection Failed" type="danger">
          {errorMessage}
        </Notification>
      );
      setTestingBotId(null);
    },
  });

  const reloadMutation = useMutation({
    mutationFn: apiReloadNotificationBot,
    onSuccess: () => {
      refetchBotStatus();
      toast.push(
        <Notification title="Success" type="success">
          Bot configuration reloaded successfully
        </Notification>
      );
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.error || 'Failed to reload bot';
      toast.push(
        <Notification title="Error" type="danger">
          {errorMessage}
        </Notification>
      );
    },
  });

  const handleDeleteBot = (bot: TelegramBot) => {
    if (confirm(`Are you sure you want to delete ${bot.name}? This action cannot be undone.`)) {
      deleteMutation.mutate(bot._id);
    }
  };

  const handleTestBot = (botId: string) => {
    setTestingBotId(botId);
    testMutation.mutate(botId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Telegram Bot Configuration</h2>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-sm text-slate-500">Manage notification bots for Telegram delivery</p>
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${isBotRunning ? 'bg-green-500' : 'bg-slate-300'}`}
              />
              <span className="text-xs text-slate-600">{isBotRunning ? 'Running' : 'Stopped'}</span>
            </div>
          </div>
        </div>
        {activeTab === 'bots' && (
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={<ApolloIcon name="rotate-right" className="text-md" />}
              onClick={() => reloadMutation.mutate()}
              loading={reloadMutation.isPending}
            >
              Reload
            </Button>
            <Button
              variant="solid"
              icon={<ApolloIcon name="plus" className="text-md" />}
              onClick={() => setIsCreateDialogOpen(true)}
            >
              Add New Bot
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('bots')}
            className={`${
              activeTab === 'bots'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            } whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors`}
          >
            <div className="flex items-center gap-2">
              <ApolloIcon name="cog" className="text-sm" />
              Bot Configuration
            </div>
          </button>
          <button
            onClick={() => setActiveTab('updates')}
            className={`${
              activeTab === 'updates'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            } whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors`}
          >
            <div className="flex items-center gap-2">
              <ApolloIcon name="comment" className="text-sm" />
              Bot Updates
            </div>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'updates' ? (
        <TelegramBotUpdatesViewer />
      ) : (
        <>
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              <p className="text-sm text-slate-500 mt-2">Loading bot configurations...</p>
            </div>
          ) : bots.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center">
                  <span className="text-3xl">🤖</span>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                No Telegram Bots Configured
              </h3>
              <p className="text-sm text-slate-500 mb-6">
                Add a General bot for CRM notifications and an Email bot for email alerts
              </p>
              <Button
                variant="solid"
                icon={<ApolloIcon name="plus" className="text-md" />}
                onClick={() => setIsCreateDialogOpen(true)}
              >
                Add Your First Bot
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {bots.map((bot) => (
                <BotCard
                  key={bot._id}
                  bot={bot}
                  onEdit={() => {
                    setSelectedBot(bot);
                    setIsEditDialogOpen(true);
                  }}
                  onDelete={() => handleDeleteBot(bot)}
                  onToggle={(isActive) =>
                    toggleMutation.mutate({ id: bot._id, is_active: isActive })
                  }
                  onTest={() => handleTestBot(bot._id)}
                  isToggling={toggleMutation.isPending}
                  isTesting={testingBotId === bot._id}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Create Bot Dialog */}
      <CreateBotDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSubmit={(data) => createMutation.mutate(data)}
        isLoading={createMutation.isPending}
      />

      {/* Edit Bot Dialog */}
      {selectedBot && (
        <EditBotDialog
          isOpen={isEditDialogOpen}
          bot={selectedBot}
          onClose={() => {
            setIsEditDialogOpen(false);
            setSelectedBot(null);
          }}
          onSubmit={(data) => updateMutation.mutate({ id: selectedBot._id, data })}
          isLoading={updateMutation.isPending}
        />
      )}
    </div>
  );
}
