'use client';

import Button from '@/components/ui/Button';
import FormItem from '@/components/ui/Form/FormItem';
import Input from '@/components/ui/Input';
import Notification from '@/components/ui/Notification';
import Popover from '@/components/ui/Popover';
import toast from '@/components/ui/toast';
import { useUnlinkTelegram, useUpdateTelegramCredentials, useToggleBotNotifications, useActiveTelegramBots } from '@/services/hooks/useTelegram';
import { apiRemoveBotCredential } from '@/services/UsersService';
import type { TelegramConnection } from '@/services/UserService';
import { zodResolver } from '@hookform/resolvers/zod';
import { AtSign, CalendarDays, ChevronDown, ExternalLink, Link2Off, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import ApolloIcon from '../ui/ApolloIcon';
import { useUserStore } from '@/stores/userStore';
import RoleGuard from '../shared/RoleGuard';
import { Role } from '@/configs/navigation.config/auth.route.config';

export type TelegramFormValues = {
  telegram_username?: string;
  telegram_phone?: string;
};

type NormalizedTelegramValues = {
  telegram_username: string;
  telegram_phone: string;
};

type TelegramContactFormValues = {
  contact: string;
};

const telegramContactSchema = z.object({
  contact: z
    .string()
    .trim()
    .max(64, 'Input is too long'),
});

interface TelegramPopoverItemProps {
  value: TelegramFormValues;
}

const normalizeTelegramValues = (formValue: TelegramFormValues): NormalizedTelegramValues => ({
  telegram_username: formValue.telegram_username?.trim() || '',
  telegram_phone: formValue.telegram_phone?.trim() || '',
});

/** Map saved credential to the username field (Telegram links by username only). */
const savedToContactInput = (v: NormalizedTelegramValues): string =>
  v.telegram_username ? v.telegram_username.replace(/^@/, '') : '';

/**
 * Single text field → API payload (username only; never telegram_phone).
 */
const contactToUsernamePayload = (raw: string): TelegramFormValues => {
  const trimmed = raw.trim();
  if (!trimmed) return {};
  const withoutAt = trimmed.startsWith('@') ? trimmed.slice(1).trim() : trimmed;
  return withoutAt ? { telegram_username: withoutAt } : {};
};

const formatTelegramUsername = (telegramUsername: string) => {
  if (!telegramUsername) return '';
  return telegramUsername.startsWith('@') ? telegramUsername : `@${telegramUsername}`;
};

const formatLinkedDate = (linkedAt?: string) => {
  if (!linkedAt) return 'Unknown';

  const parsedDate = new Date(linkedAt);
  if (Number.isNaN(parsedDate.getTime())) return 'Unknown';

  return parsedDate.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const getFirstTelegramAccount = (telegram?: TelegramConnection[]) => {
  if (!Array.isArray(telegram) || telegram.length === 0) return null;
  return telegram[0];
};

const TelegramPopoverItem = ({ value }: TelegramPopoverItemProps) => {
  const { currentUser } = useUserStore();
  const normalizedValue = normalizeTelegramValues(value);
  const linkedTelegramFromUser = getFirstTelegramAccount(currentUser?.telegram);
  const [isOpen, setIsOpen] = useState(false);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const [localValueOverride, setLocalValueOverride] = useState<NormalizedTelegramValues | null>(
    null
  );
  const [dismissedLinkedTelegramIdentity, setDismissedLinkedTelegramIdentity] = useState<
    string | null
  >(null);
  const [showBotSetupStep, setShowBotSetupStep] = useState(false);
  const updateTelegramCredentialsMutation = useUpdateTelegramCredentials();
  const unlinkTelegramMutation = useUnlinkTelegram();
  const toggleBotNotificationsMutation = useToggleBotNotifications();
  const { data: activeBots = [] } = useActiveTelegramBots();

  const visibleActiveBots = useMemo(() => {
    const role = currentUser?.role;
    if (role === Role.ADMIN) {
      return activeBots;
    }
    return activeBots.filter((bot) => bot.bot_type === 'general');
  }, [activeBots, currentUser?.role]);
  const linkedTelegramIdentity =
    linkedTelegramFromUser?._id ?? linkedTelegramFromUser?.id ?? linkedTelegramFromUser?.chat_id;
  const linkedTelegram =
    linkedTelegramIdentity && linkedTelegramIdentity === dismissedLinkedTelegramIdentity
      ? null
      : linkedTelegramFromUser;
  const savedValue = localValueOverride ?? normalizedValue;

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<TelegramContactFormValues>({
    resolver: zodResolver(telegramContactSchema),
    defaultValues: { contact: savedToContactInput(normalizedValue) },
  });

  const watchedContact = useWatch({ control, name: 'contact' }) || '';
  const draftValue = normalizeTelegramValues(contactToUsernamePayload(watchedContact));
  const hasSavedValue = Boolean(savedValue.telegram_username);
  const hasChanges =
    draftValue.telegram_username !== savedValue.telegram_username ||
    Boolean(savedValue.telegram_phone);
  const hasLinkedTelegram = Boolean(linkedTelegram);
  const triggerSummary = hasLinkedTelegram
    ? formatTelegramUsername(linkedTelegram?.telegram_username || '') || 'Connected via Telegram'
    : hasSavedValue
      ? formatTelegramUsername(savedValue.telegram_username) || 'Configured'
      : 'Add your Telegram username';
  const previewRows = hasLinkedTelegram
    ? [
      {
        label: 'Username',
        value: linkedTelegram?.telegram_username
          ? formatTelegramUsername(linkedTelegram.telegram_username)
          : 'Not available',
        icon: <AtSign className="h-4 w-4" />,
      },
      {
        label: 'Automation',
        value: linkedTelegram?.bot_enabled ? 'Enabled' : 'Disabled',
        icon: <ShieldCheck className="h-4 w-4" />,
      },
      {
        label: 'connected',
        value: formatLinkedDate(linkedTelegram?.linked_at),
        icon: <CalendarDays className="h-4 w-4" />,
      },
    ]
    : [];

  const handleSetPortalRoot = (node: HTMLElement | null) => {
    if (!node) return;
    setPortalRoot((previousRoot) => (previousRoot === node ? previousRoot : node));
  };

  const handleOpenChange = (open: boolean) => {
    if (open) {
      if (!linkedTelegramFromUser && dismissedLinkedTelegramIdentity) {
        setDismissedLinkedTelegramIdentity(null);
      }
      reset({ contact: savedToContactInput(savedValue) });
      setShowBotSetupStep(false);
    }
    setIsOpen(open);
  };

  const handleSetTelegram = (formValue: TelegramFormValues) => {
    const normalizedTelegram = normalizeTelegramValues(formValue);

    updateTelegramCredentialsMutation.mutate(normalizedTelegram, {
      onSuccess: () => {
        setLocalValueOverride(normalizedTelegram);
        reset({ contact: savedToContactInput(normalizedTelegram) });
        // Show the bot start step so the user can link to all active bots
        setShowBotSetupStep(true);
      },
      onError: (error: any) => {
        toast.push(
          <Notification title="Error" type="danger">
            {error?.response?.data?.message ||
              error?.message ||
              'Failed to update Telegram credentials'}
          </Notification>
        );
      },
    });
  };

  const handleUnlinkTelegram = async () => {
    const chatId = linkedTelegram?.chat_id?.trim();
    const userId = currentUser?._id || (currentUser as any)?.id;
    const credentialId = linkedTelegram?._id || linkedTelegram?.id;

    const onUnlinkSuccess = () => {
      setDismissedLinkedTelegramIdentity(linkedTelegramIdentity || null);
      reset({ contact: savedToContactInput(savedValue) });
      toast.push(
        <Notification title="Success" type="success">
          Telegram account removed successfully
        </Notification>
      );
    };

    const onUnlinkError = (error: any) => {
      toast.push(
        <Notification title="Error" type="danger">
          {error?.response?.data?.message ||
            error?.message ||
            'Failed to remove Telegram account'}
        </Notification>
      );
    };

    // If chat_id exists, use the standard unlink flow (also unlinks on bot side)
    if (chatId) {
      unlinkTelegramMutation.mutate({ chat_id: chatId }, {
        onSuccess: onUnlinkSuccess,
        onError: onUnlinkError,
      });
      return;
    }

    // No chat_id — account was added via form but never linked to the bot
    // Remove the credential entry directly using credential ID
    if (!userId || !credentialId) {
      toast.push(
        <Notification title="Error" type="danger">
          Could not find account credentials to remove
        </Notification>
      );
      return;
    }

    try {
      await apiRemoveBotCredential(userId, credentialId);
      onUnlinkSuccess();
    } catch (error: any) {
      onUnlinkError(error);
    }
  };

  const handleToggleBotNotifications = (enable: boolean) => {
    const userId = currentUser?._id || (currentUser as any)?.id;
    const credentialId = linkedTelegram?._id || linkedTelegram?.id;

    if (!userId || !credentialId) {
      toast.push(
        <Notification title="Error" type="danger">
          Could not find account credentials to update
        </Notification>
      );
      return;
    }

    toggleBotNotificationsMutation.mutate(
      { userId, credentialId, bot_enabled: enable },
      {
        onSuccess: () => {
          toast.push(
            <Notification title="Success" type="success">
              {enable
                ? 'Telegram notifications enabled successfully'
                : 'Telegram notifications disabled'}
            </Notification>
          );
        },
        onError: (error: any) => {
          toast.push(
            <Notification title="Error" type="danger">
              {error?.response?.data?.message ||
                error?.message ||
                'Failed to update notification settings'}
            </Notification>
          );
        },
      }
    );
  };

  return (
    <li className="px-0" ref={handleSetPortalRoot}>
      <Popover
        isOpen={isOpen}
        onOpenChange={handleOpenChange}
        placement="bottom-end"
        portalRoot={portalRoot}
        dismissOnOutsideClick
        closeOnFocusOut={false}
        className="w-[310px]"
        content={
          <div
            className="bg-gradient-to-br from-sky-50 via-white to-cyan-50 p-4 dark:from-[var(--dm-bg-elevated)] dark:via-[var(--dm-bg-elevated)] dark:to-[var(--dm-bg-elevated)]"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start gap-3">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sky-500 text-white shadow-sm`}
              >
                <ApolloIcon name="send-inclined" className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-[var(--dm-text-primary)]">Telegram</h3>
                  <span
                    className={`text-xxs rounded-full px-2 py-0.5 font-semibold tracking-[0.14em] uppercase ${hasLinkedTelegram
                      ? 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400'
                      : hasSavedValue
                        ? 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400'
                        : 'bg-gray-100 text-gray-500 dark:bg-[var(--dm-bg-hover)] dark:text-[var(--dm-text-muted)]'
                      }`}
                  >
                    {hasLinkedTelegram ? 'connected' : hasSavedValue ? 'Configured' : 'Not set'}
                  </span>
                </div>
                {/* <p className="text-xs leading-5 text-gray-500">
                  {hasLinkedTelegram
                    ? 'Already connected to your profile.'
                    : 'Add a username or phone number.'}
                </p> */}
              </div>
            </div>

            {/* Bot start links — shown in connected view or after saving credentials */}
            {(hasLinkedTelegram || showBotSetupStep) && visibleActiveBots.length > 0 && (
              <div className="mb-3 rounded-lg border border-sky-100 bg-white/90 p-4 shadow-sm dark:bg-[var(--dm-bg-surface)] dark:border-[var(--dm-border)]">
                <div className="mb-2 text-[11px] font-semibold tracking-[0.16em] text-sky-600 uppercase dark:text-sky-400">
                  {showBotSetupStep && !hasLinkedTelegram ? 'Step 2 — Start the bots' : 'Active bots'}
                </div>
                {showBotSetupStep && !hasLinkedTelegram && (
                  <p className="mb-3 text-xs text-gray-500 leading-4 dark:text-[var(--dm-text-muted)]">
                    Open each bot in Telegram and press <b>Start</b>. You&apos;ll be automatically linked and receive notifications.
                  </p>
                )}
                <div className="space-y-2">
                  {visibleActiveBots.map((bot) => (
                    <a
                      key={bot._id}
                      href={`https://t.me/${bot.bot_username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between gap-3 rounded-2xl bg-sky-50 px-3 py-2.5 transition-colors hover:bg-sky-100 dark:bg-sky-500/10 dark:hover:bg-sky-500/20"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-gray-900 dark:text-[var(--dm-text-primary)]">{bot.name}</div>
                        <div className="text-[11px] text-gray-500 dark:text-[var(--dm-text-muted)]">@{bot.bot_username}</div>
                      </div>
                      <span className="flex shrink-0 items-center gap-1 text-[11px] font-semibold text-sky-600 dark:text-sky-400">
                        Open <ExternalLink className="h-3 w-3" />
                      </span>
                    </a>
                  ))}
                </div>
                {showBotSetupStep && !hasLinkedTelegram && (
                  <button
                    type="button"
                    onClick={() => { setShowBotSetupStep(false); setIsOpen(false); }}
                    className="mt-3 w-full rounded-2xl bg-gray-100 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-200 transition-colors dark:bg-[var(--dm-bg-surface)] dark:text-[var(--dm-text-secondary)] dark:hover:bg-[var(--dm-bg-hover)]"
                  >
                    Done
                  </button>
                )}
              </div>
            )}

            {hasLinkedTelegram ? (
              // <div className="rounded-[24px] border border-emerald-100 bg-white/90 p-4 shadow-sm">
              //   <div className="mb-4 flex items-start justify-between gap-3">
              //     <div className="min-w-0">
              //       <div className="text-[11px] font-semibold tracking-[0.16em] text-sky-600 uppercase">
              //         connected account
              //       </div>
              //       <div className="mt-1 truncate text-sm font-semibold text-gray-900">
              //         {formatTelegramUsername(linkedTelegram?.telegram_username || '') ||
              //           linkedTelegram?.telegram_phone ||
              //           'Telegram connected'}
              //       </div>
              //       <p className="mt-1 text-xs leading-5 text-gray-500">
              //         {linkedTelegram?.bot_enabled
              //           ? 'Telegram notifications are enabled for this account.'
              //           : 'Notifications are disabled. Enable them below to start receiving alerts.'}
              //       </p>
              //     </div>
              //     <span
              //       className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              //         linkedTelegram?.bot_enabled
              //           ? 'bg-sky-100 text-sky-700'
              //           : 'bg-amber-100 text-amber-700'
              //       }`}
              //     >
              //       {linkedTelegram?.bot_enabled ? 'Active' : 'Disabled'}
              //     </span>
              //   </div>

              //   <div className="space-y-2">
              //     {previewRows.map((item) => (
              //       <div
              //         key={item.label}
              //         className="flex items-center justify-between gap-3 rounded-2xl bg-gray-50 px-3 py-2.5"
              //       >
              //         <div className="flex min-w-0 items-center gap-2 text-gray-500">
              //           <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sky-500 shadow-sm">
              //             {item.icon}
              //           </span>
              //           <span className="text-xs font-medium text-gray-600">{item.label}</span>
              //         </div>
              //         <span className="min-w-0 truncate text-right text-xs font-medium text-gray-900">
              //           {item.value}
              //         </span>
              //       </div>
              //     ))}
              //   </div>

              //   {/* Enable / Disable notifications toggle */}
              //   <div className="mt-3 flex items-center justify-between rounded-2xl bg-gray-50 px-3 py-2.5">
              //     <span className="text-xs font-medium text-gray-700">
              //       {linkedTelegram?.bot_enabled ? 'Notifications on' : 'Notifications off'}
              //     </span>
              //     <button
              //       type="button"
              //       disabled={toggleBotNotificationsMutation.isPending}
              //       onClick={() => handleToggleBotNotifications(!linkedTelegram?.bot_enabled)}
              //       className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
              //         linkedTelegram?.bot_enabled ? 'bg-sky-500' : 'bg-gray-300'
              //       }`}
              //     >
              //       <span
              //         className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
              //           linkedTelegram?.bot_enabled ? 'translate-x-5' : 'translate-x-1'
              //         }`}
              //       />
              //     </button>
              //   </div>


              // </div>
              <RoleGuard>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  icon={<Link2Off className="h-4 w-4" />}
                  className=" w-full"
                  loading={unlinkTelegramMutation.isPending}
                  disabled={unlinkTelegramMutation.isPending}
                  onClick={handleUnlinkTelegram}
                >
                  Unlink Telegram
                </Button>
              </RoleGuard>
            ) : !showBotSetupStep ? (
              <form
                className="space-y-1"
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
                onSubmit={handleSubmit((data) =>
                  handleSetTelegram(contactToUsernamePayload(data.contact))
                )}
              >
                <div className="rounded-lg border border-sky-100 bg-white/90 p-3 shadow-sm dark:bg-[var(--dm-bg-surface)] dark:border-[var(--dm-border)]">
                  <div className="mb-2">
                    <div className="text-xs font-semibold tracking-wide text-sky-600 uppercase dark:text-sky-400">
                      Contact details
                    </div>
                  </div>

                  <div className="space-y-2">
                    <FormItem
                      label="Telegram username"
                      invalid={Boolean(errors.contact)}
                      errorMessage={errors.contact?.message}
                      className="mb-0"
                      labelClass="text-xs font-semibold text-gray-700 dark:text-[var(--dm-text-primary)]"
                    >
                      <Input
                        {...register('contact')}
                        placeholder="e.g. yourname"
                        className="w-full"
                        autoComplete="username"
                        onKeyDown={(event) => event.stopPropagation()}
                      />
                    </FormItem>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    className="flex-1"
                    onClick={() => reset({ contact: savedToContactInput(savedValue) })}
                    disabled={updateTelegramCredentialsMutation.isPending || !hasChanges}
                  >
                    Reset
                  </Button>
                  <Button
                    type="submit"
                    variant="solid"
                    size="sm"
                    className="flex-1"
                    loading={updateTelegramCredentialsMutation.isPending}
                    disabled={updateTelegramCredentialsMutation.isPending || !hasChanges}
                  >
                    Save
                  </Button>
                </div>

                <p className="text-[11px] leading-4 text-gray-500 dark:text-[var(--dm-text-muted)]">
                  Use the same @username you use in Telegram (with or without @). Clear the field
                  and save to remove Telegram details.
                </p>
              </form>
            ) : null}
          </div>
        }
      >
        <button
          type="button"
          aria-expanded={isOpen}
          className={`flex w-full items-center justify-between gap-3 rounded-2xl px-2.5 py-2.5 text-left transition-colors ${isOpen ? 'bg-sky-50 dark:bg-sky-500/10' : 'hover:bg-gray-50 dark:hover:bg-[var(--dm-bg-hover)]'
            }`}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          <div className="flex min-w-0 items-center gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-500 text-white shadow-sm`}
            >
              <ApolloIcon name="send-inclined" className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900 dark:text-[var(--dm-text-primary)]">Telegram</span>
                <span
                  className={`text-xxs rounded-full px-2 py-0.5 font-semibold ${hasLinkedTelegram
                    ? 'bg-sky-100 text-sky-700'
                    : hasSavedValue
                      ? 'bg-sky-100 text-sky-700'
                      : 'bg-gray-100 text-gray-500 dark:bg-[var(--dm-bg-hover)] dark:text-[var(--dm-text-muted)]'
                    }`}
                >
                  {hasLinkedTelegram ? 'connected' : hasSavedValue ? 'Saved' : 'Optional'}
                </span>
              </div>
              <p className="truncate text-xs text-gray-500 dark:text-[var(--dm-text-muted)]">{triggerSummary}</p>
            </div>
          </div>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-gray-400 dark:text-[var(--dm-text-muted)] transition-transform ${isOpen ? 'rotate-180 text-sky-500' : ''
              }`}
          />
        </button>
      </Popover>
    </li>
  );
};

export default TelegramPopoverItem;
