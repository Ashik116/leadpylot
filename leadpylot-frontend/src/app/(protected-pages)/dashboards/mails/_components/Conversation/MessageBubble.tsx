'use client';

/**
 * MessageBubble - Missive-Style
 * Individual email message in conversation thread
 */

import ApolloIcon from '@/components/ui/ApolloIcon';
import { FileDocumentCard } from '@/components/shared/FileDocumentCard';
import AxiosBase from '@/services/axios/AxiosBase';
import { format } from 'date-fns';
import { useState, useRef, useEffect } from 'react';
import { EmailAttachment, EmailConversation, EmailMessage } from '../../_types/email.types';
import { EmailContent } from '../Shared/EmailContent';
import ReplyEditor from '../Compose/ReplyEditor';
import ActionButton from '../Shared/ActionButton';
import { useUnassignAgentFromEmail } from '@/services/hooks/useEmailSystem';
import { SlotPinningMenu } from '../EmailDetail/SlotPinningMenu';
import StarButton from '../Shared/StarButton';
import Button from '@/components/ui/Button';
import { useSession } from '@/hooks/useSession';
import { useStarEmail } from '../../_hooks/useStarEmail';
import ConfirmPopover from '@/components/shared/ConfirmPopover';

interface MessageBubbleProps {
  message: EmailMessage;
  isLast: boolean;
  conversation: EmailConversation;
  isFirst?: boolean;
  threadPosition?: number;
  totalInThread?: number;
  forceExpanded?: boolean;
  initialCollapsed?: boolean;
  onAttachmentClick?: (attachment: EmailAttachment, messageId: string) => void;
  existingDraft?: any | null;
  currentOfferId?: string;
  hidePinning?: boolean;
  /** When provided (from PinnedEmailView), show delete button to remove email from slot */
  onDeleteFromSlot?: (emailId: string) => void;
  isDeletingEmailId?: string;
  /** When true, in DocumentSlotViewer dialog - stop propagation so row click doesn't open OpeningDetailsPopup */
  embeddedInDialog?: boolean;
  /** When provided (e.g. from EmailActivityCard), show thread toggle in From/To/Subject section */
  onToggleThreadView?: () => void;
  /** When provided (e.g. from EmailActivityCard), collapse entire view to show EmailCard */
  onCollapse?: () => void;
  showSingleEmail?: boolean;
  /** When true (from PinnedEmailView), show date and de-expand when message is expanded */
  showDateAndDeexpandWhenExpandAll?: boolean;
  /** When true, moves date+collapse into the content row (same line as Sent) and hides the duplicate delete from the header */
  inlineControlsWhenExpanded?: boolean;
  forEmail?: boolean;
}

// Helper: Normalize subject - remove duplicate "Re:" prefixes (e.g. "Re: Re: Re: X" -> "Re: X")
const normalizeSubject = (subject: string | undefined | null): string => {
  if (subject === null || typeof subject !== 'string') return '';
  const normalized = subject.trim().replace(/^(Re:\s*)+/i, 'Re: ');
  return normalized.trim();
};

// Helper Functions
const getInitials = (name: string): string => {
  return name
    .replace(/['"]/g, '')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
};

const getAvatarColor = (name: string): string => {
  const colors = [
    'bg-red-500',
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-orange-500',
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
};

export default function MessageBubble({
  message,
  isLast,
  conversation,
  isFirst = false,
  threadPosition = 0,
  totalInThread = 1,
  forceExpanded = false,
  initialCollapsed = false,
  onAttachmentClick,
  existingDraft = null,
  currentOfferId,
  hidePinning = false,
  onDeleteFromSlot,
  isDeletingEmailId,
  embeddedInDialog = false,
  onToggleThreadView,
  onCollapse,
  showSingleEmail = false,
  showDateAndDeexpandWhenExpandAll = false,
  inlineControlsWhenExpanded = false,
  forEmail = false,
}: MessageBubbleProps) {
  // State Management: when initialCollapsed, only expand if there's an existing draft
  const [localExpanded, setLocalExpanded] = useState(
    initialCollapsed ? !!existingDraft : isLast || !!existingDraft
  );
  const [userCollapsed, setUserCollapsed] = useState(false); // User override when forceExpanded
  const [showInlineReply, setShowInlineReply] = useState(!!existingDraft);
  const [showAgentAccessDropdown, setShowAgentAccessDropdown] = useState(false);
  const [showAttachmentDropdown, setShowAttachmentDropdown] = useState(false);
  const [selectedAttachmentIds, setSelectedAttachmentIds] = useState<Set<string>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);
  const attachmentDropdownRef = useRef<HTMLDivElement>(null);
  const unassignAgentMutation = useUnassignAgentFromEmail();
  const { toggleStar } = useStarEmail();
  const { data: session } = useSession();

  // Derived State: when forceExpanded, allow user to collapse via userCollapsed override
  const isExpanded = forceExpanded === true ? !userCollapsed : localExpanded;
  const isReply = !isFirst && totalInThread > 1;
  const senderName = message.direction === 'incoming' ? message.to : message.from;
  const recipientName = message.direction === 'incoming' ? message.from : message.to;

  // When existingDraft is found, expand message and show reply editor
  useEffect(() => {
    if (existingDraft) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocalExpanded(true);
      setShowInlineReply(true);
    }
  }, [existingDraft]);

  // Event Handlers
  const handleDownload = async (attachment: EmailAttachment, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!attachment.document_id) {
      // console.error('Attachment missing document_id:', attachment);
      return;
    }

    try {
      const response = await AxiosBase.get(`/attachments/${attachment.document_id}/download`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', attachment.filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      // alert('Failed to download attachment. Please try again.');
    }
  };

  const handleToggleExpand = () => {
    if (forceExpanded) {
      setUserCollapsed((prev) => !prev);
    } else {
      setLocalExpanded(!isExpanded);
    }
  };

  const handleToggleInlineReply = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowInlineReply(!showInlineReply);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setShowAgentAccessDropdown(false);
      }
      if (attachmentDropdownRef.current && !attachmentDropdownRef.current.contains(target)) {
        // Don't close if click was inside SlotPinningMenu Popover (rendered in portal)
        if ((event.target as Element).closest?.('[data-slot-pinning-popover]')) return;
        setShowAttachmentDropdown(false);
      }
    };

    if (showAgentAccessDropdown || showAttachmentDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAgentAccessDropdown, showAttachmentDropdown]);

  const handleRemoveAgentAccess = (agentId: string, comments = '') => {
    if (!conversation?._id || !agentId) {
      return;
    }

    unassignAgentMutation.mutate(
      {
        emailId: conversation._id,
        agentId,
        comments,
      },
      {
        onSuccess: () => {
          setShowAgentAccessDropdown(false);
        },
      }
    );
  };

  const pendingAgentId = unassignAgentMutation.variables?.agentId;
  const isRemovingAccess = unassignAgentMutation.isPending;

  // Attachment selection handlers
  const handleToggleAttachmentDropdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowAttachmentDropdown(!showAttachmentDropdown);
  };

  const handleToggleAttachmentSelection = (documentId: string) => {
    setSelectedAttachmentIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(documentId)) {
        newSet.delete(documentId);
      } else {
        newSet.add(documentId);
      }
      return newSet;
    });
  };

  const handleSelectAllAttachments = () => {
    if (message.attachments) {
      const allDocIds = message.attachments.map((a) => a.document_id);
      setSelectedAttachmentIds(new Set(allDocIds));
    }
  };

  const handleDeselectAllAttachments = () => {
    setSelectedAttachmentIds(new Set());
  };

  const handleClearSelectionAfterPin = () => {
    setSelectedAttachmentIds(new Set());
    setShowAttachmentDropdown(false);
  };

  return (
    <div
      className={`bg-white ${!isLast ? 'border-b border-gray-200' : ''} ${!isLast && !isFirst ? 'pb-3 mt-1' : ''} ${!isLast && isFirst ? 'pb-2' : ''} ${isReply ? '' : ''}`}
    >
      {/* Message Header */}
      <div
        onClick={(e) => {
          if (embeddedInDialog) e.stopPropagation();
          if (isExpanded && onCollapse) {
            onCollapse();
          } else {
            handleToggleExpand();
          }
        }}
        className="flex cursor-pointer items-start justify-between pt-0"
      >
        <div className="flex min-w-0 flex-1 gap-3">
          {/* Avatar */}
          {/* <div
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white ${getAvatarColor(senderName)}`}
          >
            {getInitials(senderName)}
          </div> */}

          {/* Message Info */}
          <div className="min-w-0 flex-1">
            <div className={`flex flex-wrap items-center gap-2 ${forEmail && isReply ? 'mb-0.5' : ''}`}>
              {/* <span className="font-medium text-gray-900">{senderName}</span> */}

              {isReply && (
                <span className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-[0.698775rem] font-medium text-gray-600">
                  <ApolloIcon name="arrow-right" className="mr-1 text-[0.698775rem]" />
                  Reply {threadPosition}/{totalInThread}
                </span>
              )}
            </div>

            {/* <div className=" text-[0.698775rem] text-gray-500">
              {message.direction === 'incoming' ? 'From: ' : 'To: '}
              {recipientName}
            </div> */}

            {!isExpanded && (
              <div className="flex gap-3   ">
                <div className="min-w-0 flex-1 text-sm">
                  <div className="flex items-baseline gap-1.5">
                    <span className=" ">From:</span>
                    <span className="truncate">{message.from_address || message.from}</span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className=" ">To:</span>
                    <span className="truncate">{message.to_address || message.to}</span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="">Subject:</span>
                    <span className="line-clamp-1 truncate">{normalizeSubject(message?.subject ?? conversation?.subject)}</span>
                  </div>
                  <div className="line-clamp-1 text-sm text-gray-600 mt-0.5">
                    {(() => {
                      const body = (message.body || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
                      return body.length > 120 ? body.slice(0, 120) + '…' : body;
                    })()}
                  </div>
                  {message?.attachments && message.attachments.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {message.attachments.slice(0, 3).map((att: EmailAttachment) => (
                        <FileDocumentCard
                          key={att._id}
                          variant="row"
                          filename={att.filename}
                          mimeType={att.mime_type}
                          className="text-xs"
                        />
                      ))}
                      {message.attachments.length > 3 && (
                        <span className="text-xs text-gray-500">+{message.attachments.length - 3} more</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Time & Expand Icon (when collapsed) / De-expand icon (when expanded) */}
        {!isExpanded ? (
          <div className={`flex shrink-0 items-center select-none ${forEmail ? 'gap-2' : 'space-x-1'}`}>
            {onDeleteFromSlot && (
              <ConfirmPopover
                title="Remove Email"
                description="Are you sure you want to remove this email from the slot?"
                onConfirm={() => onDeleteFromSlot(message._id)}
                confirmText="Remove"
                confirmButtonClass="bg-red-500 hover:bg-red-600 text-white"
                placement="left"
              >
                <Button
                  variant="plain"
                  size="xs"
                  title="Remove email from slot"
                  icon={
                    <ApolloIcon
                      name="trash"
                      className={`text-[0.8152375rem] text-red-600 ${isDeletingEmailId === message._id ? 'animate-pulse' : ''}`}
                    />
                  }
                  disabled={isDeletingEmailId === message._id}
                  onClick={(e) => e.stopPropagation()}
                />
              </ConfirmPopover>
            )}
            {forEmail ? (
              <Button
                variant="plain"
                size="xs"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleExpand();
                }}
                icon={<ApolloIcon name="dropdown-large" className="h-4 w-4 shrink-0 text-gray-400" />}
                iconAlignment="end"
                className="shrink-0 text-sm font-normal text-gray-500 hover:bg-gray-100 hover:text-gray-600"
                title="Expand"
                aria-label="Expand"
              >
                {format(new Date(message.received_at), 'MMM d, h:mm a')}
              </Button>
            ) : (
              <>
                <div className="text-sm font-normal text-gray-500">
                  {format(new Date(message.received_at), 'MMM d, h:mm a')}
                </div>
                <ApolloIcon name="dropdown-large" className="h-4 w-4 shrink-0 text-gray-400" />
              </>
            )}
          </div>
        ) : (forceExpanded || showDateAndDeexpandWhenExpandAll) ? (
          <div className={`flex shrink-0 items-center select-none ${forEmail ? 'gap-2' : 'space-x-1'}`}>
            {/* When inlineControlsWhenExpanded, delete is shown in the content row — skip it here to avoid duplicates */}
            {onDeleteFromSlot && !inlineControlsWhenExpanded && (
              <ConfirmPopover
                title="Remove Email"
                description="Are you sure you want to remove this email from the slot?"
                onConfirm={() => onDeleteFromSlot(message._id)}
                confirmText="Remove"
                confirmButtonClass="bg-red-500 hover:bg-red-600 text-white"
                placement="left"
              >
                <Button
                  variant="plain"
                  size="xs"
                  title="Remove email from slot"
                  icon={
                    <ApolloIcon
                      name="trash"
                      className={`text-[0.8152375rem] text-red-600 ${isDeletingEmailId === message._id ? 'animate-pulse' : ''}`}
                    />
                  }
                  disabled={isDeletingEmailId === message._id}
                  onClick={(e) => e.stopPropagation()}
                />
              </ConfirmPopover>
            )}
            {/* When forEmail or inlineControlsWhenExpanded, date+collapse move to the content row (same line as Sent) */}
            {!forEmail && !inlineControlsWhenExpanded && (
              <Button
                variant="plain"
                size="xs"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleExpand();
                }}
                icon={<ApolloIcon name="dropdown-up-large" className="h-4 w-4 shrink-0 text-gray-400" />}
                iconAlignment="end"
                className="shrink-0 text-sm font-normal text-gray-500 hover:bg-gray-100 hover:text-gray-600"
                title="Collapse"
                aria-label="Collapse"
              >
                {format(new Date(message.received_at), 'MMM d, h:mm a')}
              </Button>
            )}
          </div>
        ) : null}
      </div>

      {/* Expanded Content - From/To/Subject and body share same left edge */}
      {isExpanded && (
        <div className={`pl-0 ${forEmail ? 'mt-2' : ''}`}>
          {/* From / To / Subject + toggle (same as UpdatesActivity) + Action buttons */}
          <div className="flex items-start justify-between gap-4 border-b border-gray-200 pb-1 text-[0.8152375rem]">
            {/* Left: From/To/Subject - clickable to collapse to EmailCard (no arrow/time shown) */}
            <div
              className="min-w-0 flex-1 cursor-pointer "
              onClick={(e) => {
                e.stopPropagation();
                if (onCollapse) {
                  onCollapse();
                } else {
                  handleToggleExpand();
                }
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  if (onCollapse) {
                    onCollapse();
                  } else {
                    handleToggleExpand();
                  }
                }
              }}
            >
              <div className=" text-sm">
                <div className="flex gap-1">
                  <span className="shrink-0 ">From :</span>
                  <span className="min-w-0 truncate">
                    {message.from}
                    {message.from_address && message.from_address !== message.from && (
                      <span className="ml-1">&lt;{message.from_address}&gt;</span>
                    )}
                  </span>
                </div>
                <div className="flex gap-1">
                  <span className="shrink-0">To :</span>
                  <span className="min-w-0 truncate">{message.to_address || message.to}</span>
                </div>
                <div className="flex gap-1">
                  <span className="shrink-0">Subject :</span>
                  <span className="min-w-0 truncate">{normalizeSubject(message?.subject ?? conversation?.subject)}</span>
                </div>
              </div>
            </div>

            {/* Right: Action buttons (star shown here only when lead assigned - QuickActionsBar has star when no lead) */}
            <div className={`flex shrink-0 items-center ${forEmail ? 'gap-2' : 'gap-1'}`} onClick={(e) => e.stopPropagation()}>
              {/* When forEmail or inlineControlsWhenExpanded, date + arrow on same line as Sent */}
              {(forEmail || inlineControlsWhenExpanded) && (
                <Button
                  variant="plain"
                  size="xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleExpand();
                  }}
                  icon={<ApolloIcon name="dropdown-up-large" className="h-4 w-4 shrink-0 text-gray-400" />}
                  iconAlignment="end"
                  className="shrink-0 text-sm font-normal text-gray-500 hover:bg-gray-100 hover:text-gray-600"
                  title="Collapse"
                  aria-label="Collapse"
                >
                  {format(new Date(message.received_at), 'MMM d, h:mm a')}
                </Button>
              )}
              {conversation.lead_id && (
                <StarButton
                  emailId={conversation._id}
                  isStarred={
                    (conversation as any)?.starred_by?.some((star: any) =>
                      typeof star?.user_id === 'string'
                        ? star?.user_id === session?.user?.id
                        : star?.user_id?._id === session?.user?.id
                    ) || false
                  }
                  size="sm"
                  onToggle={async (emailId, isStarred) => {
                    await toggleStar(emailId, isStarred);
                  }}
                />
              )}
              {/* Thread toggle - Show full thread / Show only this email */}
              {onToggleThreadView !== null && conversation.lead_id && (
                <Button
                  variant="plain"
                  size="xs"
                  className="shrink-0 border-0 outline-none shadow-none text-ocean-2 hover:bg-ocean-2/10"
                  icon={
                    showSingleEmail ? (
                      <ApolloIcon name="layer-group" className="h-4 w-4" />
                    ) : (
                      <ApolloIcon name="mail" className="h-4 w-4" />
                    )
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleThreadView?.();
                  }}
                  title={showSingleEmail ? 'Show full thread' : 'Show only this email'}
                />
              )}

              {message.direction === 'outgoing' && (
                <span className="inline-flex items-center rounded bg-blue-100 px-2 py-[3px] text-[0.698775rem] font-medium text-blue-800">
                  <ApolloIcon name="share" className="mr-1 text-[0.698775rem]" />
                  Sent
                </span>
              )}

              {message?.attachments && message?.attachments?.length > 0 && (
                <div className="relative" ref={attachmentDropdownRef} onClick={(e) => e.stopPropagation()}>
                  <Button
                    onClick={handleToggleAttachmentDropdown}
                    title="View and pin attachments"
                    icon={<ApolloIcon name="file-alt" className="inline text-[0.698775rem]" />}
                    variant="default"
                    size="xs"
                    className="flex items-center gap-1 text-gray-400"
                  >
                    <p className="flex items-center gap-1">
                      Files <span className="text-xs">{message?.attachments?.length}</span>
                      <ApolloIcon name="dropdown-large" className="text-xs text-gray-500" />
                    </p>
                  </Button>

                  {showAttachmentDropdown && (
                    <div className="absolute right-0 top-full z-10 mt-2 w-80 rounded-lg border border-gray-200 bg-white shadow-lg">
                      <div className="max-h-64 overflow-y-auto p-2">
                        <div className="absolute -top-2 right-2 h-4 w-4 rotate-50 border-t border-l border-gray-200 bg-white"></div>

                        <div className="mb-2 flex items-center justify-between border-b border-gray-100 pb-2">
                          <span className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                            Attachments
                            <span className="inline-flex min-w-4 items-center justify-center rounded-full bg-blue-100 px-2 py-0.5 text-xxs font-bold text-blue-700">
                              {message.attachments.length}
                            </span>
                          </span>
                          {!hidePinning && (
                            <div className="flex gap-1">
                              {selectedAttachmentIds.size > 0 && (
                                <SlotPinningMenu
                                  emailId={message._id}
                                  currentOfferId={currentOfferId}
                                  documentIds={Array.from(selectedAttachmentIds)}
                                  onSuccess={handleClearSelectionAfterPin}
                                  title="Pin to Slot"
                                />
                              )}
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectAllAttachments();
                                }}
                                variant="plain"
                                size="xs"
                              >
                                All
                              </Button>
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeselectAllAttachments();
                                }}
                                variant="plain"
                                size="xs"
                              >
                                Clear
                              </Button>
                            </div>
                          )}
                        </div>

                        <div className="space-y-1">
                          {message.attachments.map((attachment: EmailAttachment) => {
                            const isSelected = selectedAttachmentIds.has(attachment.document_id);
                            const fileCard = (
                              <FileDocumentCard
                                variant="row"
                                filename={attachment.filename}
                                mimeType={attachment.mime_type}
                                className="min-w-0 flex-1 border-0"
                                actions={
                                  <Button
                                    variant="plain"
                                    size="xs"
                                    title="View attachment"
                                    icon={<ApolloIcon name="eye-filled" className="text-xxs text-gray-500" />}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onAttachmentClick?.(attachment, message._id);
                                    }}
                                  />
                                }
                              />
                            );
                            if (hidePinning) {
                              return (
                                <div
                                  key={attachment._id}
                                  className="flex items-center rounded-md p-2 hover:bg-gray-50"
                                >
                                  {fileCard}
                                </div>
                              );
                            }
                            return (
                              <label
                                key={attachment._id}
                                className={`flex cursor-pointer items-center gap-2 rounded-md p-2 hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleAttachmentSelection(attachment.document_id)}
                                  className="h-4 w-4 shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                  onClick={(e) => e.stopPropagation()}
                                />
                                {fileCard}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Pin to Slot */}
              {!hidePinning && (
                <SlotPinningMenu emailId={message._id} currentOfferId={currentOfferId} title="Pin to Slot" />
              )}

              {/* Agent Access List */}
              {conversation.email_access_to_agent &&
                conversation.email_access_to_agent.length > 0 && (
                  <div className="relative" ref={dropdownRef} onClick={(e) => e.stopPropagation()}>
                    <ActionButton
                      id="agent-access"
                      icon={<ApolloIcon name="users" className="text-[0.8152375rem]" />}
                      label="Access Agent"
                      onClick={() => {
                        setShowAgentAccessDropdown(!showAgentAccessDropdown);
                      }}
                      variant="plain"
                      size="sm"
                      showLabel={showAgentAccessDropdown}
                    />
                    {showAgentAccessDropdown && (
                      <div className="absolute top-full right-0 z-10 mt-2 w-64 rounded-lg border border-gray-200 bg-white shadow-lg">
                        <div className="max-h-64 overflow-y-auto p-2">
                          <div className="absolute -top-2 right-6 h-4 w-4 rotate-50 border-t border-l border-gray-200 bg-white"></div>
                          {conversation.email_access_to_agent.map((access) => (
                            <div
                              key={access._id}
                              className="flex items-center justify-between rounded border-b border-gray-200 p-2 last:border-b-0 hover:bg-gray-50"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-[0.8152375rem] font-medium text-gray-900 capitalize">
                                  {access.agent_id.login}
                                </div>
                                <div className="mt-0.5 text-[0.698775rem] text-gray-500">
                                  Access: <span className="font-medium">{access.access_type}</span>
                                </div>
                                {access.assigned_by && (
                                  <div className="mt-0.5 truncate text-[0.698775rem] text-gray-400">
                                    By: {access.assigned_by.login}
                                  </div>
                                )}
                              </div>
                              <button
                                className={`ml-2 shrink-0 rounded p-1.5 hover:bg-red-100 ${isRemovingAccess && pendingAgentId === access.agent_id._id ? 'cursor-not-allowed opacity-60' : ''}`}
                                title="Delete access"
                                disabled={
                                  isRemovingAccess && pendingAgentId === access.agent_id._id
                                }
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveAgentAccess(
                                    access.agent_id._id,
                                    'Access revoked from UI'
                                  );
                                }}
                              >
                                <ApolloIcon
                                  name="trash"
                                  className={`text-[0.8152375rem] text-red-600 ${isRemovingAccess && pendingAgentId === access.agent_id._id ? 'animate-pulse' : ''}`}
                                />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

              {onDeleteFromSlot && (
                <ConfirmPopover
                  title="Remove Email"
                  description="Are you sure you want to remove this email from the slot?"
                  onConfirm={() => onDeleteFromSlot(message._id)}
                  confirmText="Remove"
                  confirmButtonClass="bg-red-500 hover:bg-red-600 text-white"
                  placement="left"
                >
                  <Button
                    variant="plain"
                    size="xs"
                    title="Remove email from slot"
                    icon={
                      <ApolloIcon
                        name="trash"
                        className={`text-[0.8152375rem] text-red-600 ${isDeletingEmailId === message._id ? 'animate-pulse' : ''}`}
                      />
                    }
                    disabled={isDeletingEmailId === message._id}
                    onClick={(e) => e.stopPropagation()}
                  />
                </ConfirmPopover>
              )}

              {/* <div className="text-[0.698775rem] text-gray-500">
                {format(new Date(message.received_at), 'MMM d, h:mm a')}
              </div>
              <button type="button" onClick={handleToggleExpand} className="p-0.5">
                <ApolloIcon name="dropdown-up-large" className="h-4 w-4 shrink-0 text-gray-400" />
              </button> */}
            </div>
          </div>

          {/* Email Body - iframe preserves exact styling without breaking portal UI */}
          <EmailContent
            htmlBody={message.html_body}
            textBody={message.body || ''}
            className="rounded"
          />

          {/* Action Buttons */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {!isLast && (
              <Button
                onClick={handleToggleInlineReply}
                className={`inline-flex h-6 items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 focus:outline-none ${showInlineReply
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                icon={<ApolloIcon name="reply" className="text-[0.8152375rem]" />}
                variant="plain"
                size="xs"
              >
                {showInlineReply ? 'Hide Reply' : 'Reply'}
              </Button>
            )}
            {/* <Button
              onClick={handleToggleExpand}
              className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-1.5 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 focus:outline-none"
              title="Collapse"
              icon={<ApolloIcon name="arrow-up" className="text-sm" />}
              variant="plain"
              size="xs"
            >
              Collapse
            </Button> */}
          </div>

          {/* Inline Reply Editor */}
          {showInlineReply && !isLast && (
            <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50/30 p-3">
              <div className="mb-2 text-[0.698775rem] font-medium text-blue-700">
                <ApolloIcon name="reply" className="mr-1 inline text-[0.698775rem]" />
                Replying to this email
                {existingDraft && (
                  <span className="ml-2 text-[0.698775rem] font-normal text-gray-600">
                    (Draft loaded)
                  </span>
                )}
              </div>
              <ReplyEditor
                conversation={conversation}
                isExpanded={true}
                specificParentEmailId={message._id}
                prefetchedDraft={existingDraft}
                skipFetch={true}
              />
            </div>
          )}

          {/* Attachments Section */}
          {message?.attachments && message?.attachments?.length > 0 && (
            <>
              <div className='flex items-center my-1 space-x-2'>
                <p className='text-xs font-medium '>Attachments</p>
                <div className='border-b border-gray-200 w-full ' />
              </div>
              <div className="flex  gap-1">

                {message?.attachments?.map((attachment: EmailAttachment) => (
                  <FileDocumentCard
                    key={attachment?._id}
                    variant="row"
                    filename={attachment?.filename}
                    mimeType={attachment?.mime_type}
                    onClick={() => onAttachmentClick?.(attachment, message?._id)}
                    actions={
                      <Button
                        variant="plain"
                        size="xs"
                        title="Download attachment"
                        icon={<ApolloIcon name="download" className="text-evergreen text-xs" />}
                        className="hover:bg-transparent"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(attachment, e);
                        }}
                      />
                    }
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
