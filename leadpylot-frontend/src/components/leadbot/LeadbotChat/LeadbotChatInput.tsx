'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Loader2, Send, Paperclip, X, FileText, Mic, Mail, Tag, ChevronDown } from 'lucide-react';
import Image from 'next/image';
import Tooltip from '@/components/ui/Tooltip';
import { leadbotRichTooltipTitle } from './leadbotRichTooltip';
import { useUserStore } from '@/stores/userStore';
import { useAttachmentPreviewFile } from '@/utils/hooks/useAttachMentPreviewFile';
import type { LeadbotAction } from '@/hooks/leadbot/useLeadbotActions';

interface LeadbotChatInputProps {
  onSend: (
    message: string,
    files?: File[],
    action?: LeadbotAction,
    classifyPayload?: { subject: string; body: string; direction?: 'incoming' | 'outgoing' }
  ) => void | Promise<unknown>;
  disabled?: boolean;
  isSending?: boolean;
  leadExpandView?: boolean;
  placeholder?: string;
  /** When set, shows action selector (Chat/Extract/Transcribe/Classify) and routes to correct API */
  action?: LeadbotAction;
  onActionChange?: (action: LeadbotAction) => void;
  extractAccept?: string;
  transcribeAccept?: string;
  /** Chat action: accepts both documents and audio */
  chatAccept?: string;
}

const MAX_MESSAGE_LENGTH = 10_000;
const MAX_FILE_SIZE_MB = 20;
const ACCEPTED_FILE_TYPES = '.pdf,.png,.jpg,.jpeg,.webp';
const ACCEPTED_AUDIO_TYPES = 'audio/*,.mp3,.wav,.m4a,.ogg,.flac,.webm,.mp4';

const ACTIONS: { value: LeadbotAction; label: string }[] = [
  { value: 'chat', label: 'Chat' },
  { value: 'extract', label: 'Extract' },
  { value: 'transcribe', label: 'Transcribe' },
  { value: 'classify', label: 'Classify' },
];

export function LeadbotChatInput({
  onSend,
  disabled = false,
  isSending = false,
  leadExpandView = false,
  placeholder = 'Write a message...',
  action = 'chat',
  onActionChange,
  extractAccept = ACCEPTED_FILE_TYPES,
  transcribeAccept = ACCEPTED_AUDIO_TYPES,
  chatAccept = `${ACCEPTED_FILE_TYPES},${ACCEPTED_AUDIO_TYPES}`,
}: LeadbotChatInputProps) {
  const { currentUser } = useUserStore();
  const imageId = currentUser?.image_id?._id || currentUser?.image_id?.id;
  const { blobUrl: profileImageUrl } = useAttachmentPreviewFile(imageId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const prevIsSendingRef = useRef(isSending);
  const [showActionMenu, setShowActionMenu] = useState(false);

  const [message, setMessage] = useState('');
  const [classifySubject, setClassifySubject] = useState('');
  const [classifyBody, setClassifyBody] = useState('');

  const acceptTypes =
    action === 'transcribe'
      ? transcribeAccept
      : action === 'extract'
        ? extractAccept
        : action === 'chat'
          ? chatAccept
          : ACCEPTED_FILE_TYPES;

  useEffect(() => {
    if (prevIsSendingRef.current && !isSending) {
      textareaRef.current?.focus();
    }
    prevIsSendingRef.current = isSending;
  }, [isSending]);
  const [files, setFiles] = useState<File[]>([]);

  const userInitials = (currentUser?.login || 'U')
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    const maxBytes = MAX_FILE_SIZE_MB * 1024 * 1024;
    const valid = selected.filter((f) => f.size <= maxBytes);
    setFiles((prev) => [...prev, ...valid].slice(0, 5));
    e.target.value = '';
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (action === 'classify') {
        if (!classifySubject.trim() || !classifyBody.trim() || disabled) return;
        const payload = { subject: classifySubject.trim(), body: classifyBody.trim() };
        setClassifySubject('');
        setClassifyBody('');
        await onSend('', undefined, 'classify', payload);
        return;
      }
      const trimmed = message.trim();
      const hasContent = trimmed || files.length > 0;
      if (!hasContent || disabled) return;

      setMessage('');
      const filesToSend = [...files];
      setFiles([]);
      await onSend(trimmed, filesToSend.length > 0 ? filesToSend : undefined, action);
    },
    [message, files, action, classifySubject, classifyBody, disabled, onSend]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const canSend =
    action === 'classify'
      ? classifySubject.trim().length > 0 && classifyBody.trim().length > 0
      : (message.trim().length > 0 || files.length > 0) && message.length <= MAX_MESSAGE_LENGTH;

  const compact = leadExpandView;

  return (
    <div className={`shrink-0 border-t border-gray-300 bg-white ${compact ? 'px-2 py-1.5' : 'px-2 py-2'}`}>
      <form onSubmit={handleSubmit}>
        {/* Action selector - commented out for now, only Chat needed */}
        {/* {onActionChange && (
          <div className="relative mb-1.5">
            <button
              type="button"
              onClick={() => setShowActionMenu((v) => !v)}
              className="flex items-center gap-1 rounded-md border border-gray-300 bg-gray-50 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
            >
              {action === 'chat' && 'Chat'}
              {action === 'extract' && 'Extract'}
              {action === 'transcribe' && 'Transcribe'}
              {action === 'classify' && 'Classify'}
              <ChevronDown className="h-3 w-3" />
            </button>
            {showActionMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowActionMenu(false)}
                  aria-hidden
                />
                <div className="absolute bottom-full left-0 z-20 mb-1 min-w-[120px] rounded-md border border-gray-200 bg-white py-1 shadow-lg">
                  {ACTIONS.map((a) => (
                    <button
                      key={a.value}
                      type="button"
                      onClick={() => {
                        onActionChange(a.value);
                        setShowActionMenu(false);
                        setFiles([]);
                      }}
                      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-gray-50 ${
                        action === a.value ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700'
                      }`}
                    >
                      {a.value === 'chat' && <Send className="h-3.5 w-3.5" />}
                      {a.value === 'extract' && <FileText className="h-3.5 w-3.5" />}
                      {a.value === 'transcribe' && <Mic className="h-3.5 w-3.5" />}
                      {a.value === 'classify' && <Tag className="h-3.5 w-3.5" />}
                      {a.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )} */}

        {/* Classify form - commented out, only Chat needed for now */}
        {/* {action === 'classify' && (
          <div className="mb-2 space-y-1.5 rounded-lg border border-gray-200 bg-gray-50 p-2">
            <input
              type="text"
              value={classifySubject}
              onChange={(e) => setClassifySubject(e.target.value)}
              placeholder="Email subject"
              className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-gray-500 focus:outline-none"
            />
            <textarea
              value={classifyBody}
              onChange={(e) => setClassifyBody(e.target.value)}
              placeholder="Email body"
              rows={2}
              className="w-full resize-none rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-gray-500 focus:outline-none"
            />
          </div>
        )} */}

        {files.length > 0 && action !== 'classify' && (
          <div className="mb-1.5 flex flex-wrap gap-1.5">
            {files.map((file, i) => (
              <span
                key={`${file.name}-${i}`}
                className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-700"
              >
                {file.name}
                <Tooltip title={`Remove ${file.name}`} placement="top" wrapperClass="inline-flex">
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="rounded p-0.5 hover:bg-gray-200"
                    aria-label={`Remove ${file.name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Tooltip>
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          {/* User Avatar */}
          {profileImageUrl ? (
            <Image
              src={profileImageUrl}
              alt={currentUser?.login || 'User'}
              className={`shrink-0 rounded-full object-cover shadow-sm ${compact ? 'h-6 w-6' : 'h-8 w-8'}`}
              width={compact ? 24 : 32}
              height={compact ? 24 : 32}
            />
          ) : (
            <div
              className={`flex shrink-0 items-center justify-center rounded-full bg-linear-to-br from-indigo-500 to-indigo-600 font-semibold text-white shadow-sm ${compact ? 'h-6 w-6 text-[9px]' : 'h-8 w-8 text-[10px]'}`}
            >
              {userInitials}
            </div>
          )}

          {/* Input Area */}
          <div className="relative min-w-0 flex-1">
            <div className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-2 py-1.5 shadow-sm transition-shadow focus-within:border-gray-500 focus-within:ring-2 focus-within:ring-gray-300 focus-within:ring-opacity-50">
              {action !== 'classify' && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={acceptTypes}
                    multiple={action !== 'transcribe'}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Tooltip
                    title={leadbotRichTooltipTitle(
                      'Attach',
                      action === 'transcribe'
                        ? `Add an audio file (max ${MAX_FILE_SIZE_MB} MB).`
                        : `Add PDF or image files (max ${MAX_FILE_SIZE_MB} MB each).`
                    )}
                    placement="top"
                    wrapperClass="inline-flex shrink-0"
                  >
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={disabled || files.length >= 5}
                      className="flex shrink-0 items-center justify-center rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Attach files"
                    >
                      <Paperclip className="h-4 w-4" />
                    </button>
                  </Tooltip>
                </>
              )}
              {action === 'classify' ? (
                <div className="flex-1 py-1 text-xs text-gray-500">
                  Fill subject & body above, then click Send
                </div>
              ) : (
                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    action === 'extract'
                      ? 'Optional note...'
                      : action === 'transcribe'
                        ? 'Optional note...'
                        : placeholder
                  }
                  disabled={disabled}
                  maxLength={MAX_MESSAGE_LENGTH}
                  className={`min-h-[32px] max-h-[100px] flex-1 resize-none border-0 bg-transparent px-0 py-0.5 text-gray-900 placeholder-gray-400 focus:outline-none disabled:cursor-not-allowed disabled:text-gray-400 ${compact ? 'text-xs' : 'text-sm'}`}
                  rows={1}
                />
              )}
              <div className="flex shrink-0 items-center">
                <Tooltip
                  title={
                    action === 'classify'
                      ? leadbotRichTooltipTitle('Classify', 'Run email classification on subject and body.')
                      : leadbotRichTooltipTitle('Send', 'Send your message (Enter).')
                  }
                  placement="top"
                  wrapperClass="inline-flex shrink-0"
                >
                  <button
                    type="submit"
                    disabled={!canSend || disabled}
                    className="flex items-center justify-center rounded-md bg-gray-600 p-1 text-white transition-all hover:bg-gray-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-gray-600"
                    aria-label={action === 'classify' ? 'Classify email' : 'Send message'}
                  >
                    {isSending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                </Tooltip>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
