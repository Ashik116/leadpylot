'use client';

/**
 * MessageThread - Missive-Style
 * Display all messages in a conversation chronologically
 */

import { useState } from 'react';

import { EmailAttachment, EmailConversation, EmailMessage } from '../../_types/email.types';
import MessageBubble from './MessageBubble';
import ApolloIcon from '@/components/ui/ApolloIcon';
import classNames from '@/utils/classNames';

interface MessageThreadProps {
  conversation: EmailConversation;
  messages?: EmailMessage[];
  onAttachmentClick?: (attachment: EmailAttachment, messageId: string) => void;
  draftsMap?: Map<string, any>; // ✅ NEW: Map of drafts by reply_to_email ID
  currentOfferId?: string;
  hidePinning?: boolean;
  forceExpanded?: boolean;
  initialCardsCollapsed?: boolean;
  collapseableCount?: number;
  onDeleteFromSlot?: (emailId: string) => void;
  isDeletingEmailId?: string;
  /** When true, in DocumentSlotViewer dialog - stop propagation on email clicks */
  embeddedInDialog?: boolean;
  /** When provided (e.g. from EmailActivityCard), show thread toggle in MessageBubble */
  onToggleThreadView?: () => void;
  /** When provided (e.g. from EmailActivityCard), collapse entire view to show EmailCard */
  onCollapse?: () => void;
  showSingleEmail?: boolean;
  /** When true (from PinnedEmailView), show date and de-expand when message is expanded */
  showDateAndDeexpandWhenExpandAll?: boolean;
  /** When true, moves date+collapse into the content row and hides duplicate delete from header */
  inlineControlsWhenExpanded?: boolean;
  forEmail?: boolean;
}

export default function MessageThread({
  conversation,
  messages: propMessages,
  onAttachmentClick,
  draftsMap,
  currentOfferId,
  hidePinning = false,
  forceExpanded = false,
  initialCardsCollapsed = false,
  collapseableCount = 2,
  onDeleteFromSlot,
  isDeletingEmailId,
  embeddedInDialog = false,
  onToggleThreadView,
  onCollapse,
  showSingleEmail = false,
  showDateAndDeexpandWhenExpandAll = false,
  inlineControlsWhenExpanded = false,
  forEmail = false,
}: MessageThreadProps) {

  const [expandAll, setExpandAll] = useState(forceExpanded && !initialCardsCollapsed);
  // If draftsMap exists and has any drafts, or forceExpanded, show all messages by default
  const hasDrafts = draftsMap && draftsMap.size > 0;
  const [showAllMessages, setShowAllMessages] = useState(hasDrafts || (forceExpanded && !initialCardsCollapsed));

  // Use provided messages, or fall back to conversation.messages, or original email
  const threadMessages = propMessages || conversation.messages || [conversation];

  // Filter out any undefined/null values, drafts, and sort chronologically (oldest first)
  const allMessages = [...threadMessages]
    .filter((msg) => msg && msg._id) // Remove undefined/null messages
    .filter((msg) => !msg.is_draft) // Exclude drafts from thread display (they show in reply editor)
    .sort((a, b) => {
      const dateA = new Date(a.received_at || a.sent_at || a.createdAt).getTime();
      const dateB = new Date(b.received_at || b.sent_at || b.createdAt).getTime();
      return dateA - dateB;
    });

  const hasMultipleMessages = allMessages.length > 1;
  const collapsibleCount = Math.max(allMessages.length - collapseableCount, 0);
  const shouldCollapse = collapsibleCount > 0 && !showAllMessages;
  const hiddenCount = shouldCollapse ? collapsibleCount : 0; // First and last are visible, so middle messages are hidden

  const toggleCollapsedView = () => {
    if (shouldCollapse) {
      setShowAllMessages(true);
      return;
    }
    if (collapsibleCount > 0) {
      setShowAllMessages(false);
      setExpandAll(false);
    }
  };

  // const toggleLabel = showAllMessages
  //   ? `Hide ${collapsibleCount} message${collapsibleCount === 1 ? '' : 's'}`
  //   : `Show ${collapsibleCount} more`;

  const toggleIcon = showAllMessages ? 'chevron-arrow-up' : 'chevron-arrow-down';

  const renderToggleRow = () =>
    collapsibleCount > 0 ? (
      <div className="relative flex items-center py-1">
        <button
          type="button"
          onClick={toggleCollapsedView}
          className="group absolute left-3 flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition-all hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        >
          <ApolloIcon
            name={toggleIcon}
            className={classNames(
              'hidden text-sm group-hover:block',
              !showAllMessages ? 'hidden' : 'block'
            )}
          />
          <span
            className={classNames('block group-hover:hidden', showAllMessages ? 'hidden' : 'block')}
          >
            {collapsibleCount}
          </span>
        </button>
        <div className="flex-1 rounded-full border border-dashed border-gray-200 px-4 py-1 text-sm font-medium text-gray-600" />
      </div>
    ) : null;

  return (
    <div className="">
      {/* Thread Header - Show if multiple messages */}
      {hasMultipleMessages && (
        <div className=" flex items-center justify-between border-b border-gray-200 pr-2 py-1">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <ApolloIcon name="mail" className="text-base" />
            <span className="font-medium">
              {allMessages.length} {allMessages.length === 1 ? 'message' : 'messages'} in this
              conversation
            </span>
          </div>
          <button
            onClick={() => {
              const newExpandAll = !expandAll;
              setExpandAll(newExpandAll);
              // When expanding all, also show all messages in thread
              if (newExpandAll && allMessages.length > 3) {
                setShowAllMessages(true);
              }
            }}
            className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            {expandAll ? (
              <>
                <ApolloIcon name="arrow-up" className="text-xs" />
                Collapse All
              </>
            ) : (
              <>
                <ApolloIcon name="arrow-down" className="text-xs" />
                Expand All
              </>
            )}
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="space-y-2 pt-0 pb-2">
        {allMessages.length > 0 ? (
          <>
            {shouldCollapse ? (
              <>
                {/* First message */}
                <MessageBubble
                  key={allMessages[0]._id || 0}
                  message={allMessages[0] as unknown as EmailMessage}
                  conversation={conversation}
                  isLast={allMessages.length === 1}
                  isFirst={true}
                  threadPosition={0}
                  totalInThread={allMessages.length}
                  forceExpanded={expandAll}
                  showDateAndDeexpandWhenExpandAll={showDateAndDeexpandWhenExpandAll}
                  inlineControlsWhenExpanded={inlineControlsWhenExpanded}
                  initialCollapsed={initialCardsCollapsed}
                  onAttachmentClick={onAttachmentClick}
                  existingDraft={draftsMap?.get(allMessages[0]._id) || null}
                  currentOfferId={currentOfferId}
                  hidePinning={hidePinning}
                  onDeleteFromSlot={onDeleteFromSlot}
                  isDeletingEmailId={isDeletingEmailId}
                  embeddedInDialog={embeddedInDialog}
                  onToggleThreadView={onToggleThreadView}
                  onCollapse={onCollapse}
                  showSingleEmail={showSingleEmail}
                  forEmail={forEmail}
                />

                {/* Show All Messages Button - Between first and last message */}
                {hiddenCount > 0 && renderToggleRow()}

                {/* Last message */}
                {allMessages.length > 1 && (
                  <MessageBubble
                    key={allMessages[allMessages.length - 1]._id || allMessages.length - 1}
                    message={allMessages[allMessages.length - 1] as unknown as EmailMessage}
                    conversation={conversation}
                    isLast={true}
                    isFirst={false}
                    threadPosition={allMessages.length - 1}
                    totalInThread={allMessages.length}
                    forceExpanded={expandAll}
                    showDateAndDeexpandWhenExpandAll={showDateAndDeexpandWhenExpandAll}
                    inlineControlsWhenExpanded={inlineControlsWhenExpanded}
                    initialCollapsed={initialCardsCollapsed}
                    onAttachmentClick={onAttachmentClick}
                    existingDraft={draftsMap?.get(allMessages[allMessages.length - 1]._id) || null}
                    currentOfferId={currentOfferId}
                    hidePinning={hidePinning}
                    onDeleteFromSlot={onDeleteFromSlot}
                    isDeletingEmailId={isDeletingEmailId}
                    embeddedInDialog={embeddedInDialog}
                    onToggleThreadView={onToggleThreadView}
                    onCollapse={onCollapse}
                    showSingleEmail={showSingleEmail}
                    forEmail={forEmail}
                  />
                )}
              </>
            ) : /* All messages when expanded */
              collapsibleCount > 0 ? (
                <>
                  <MessageBubble
                    key={allMessages[0]._id || 0}
                    message={allMessages[0] as unknown as EmailMessage}
                    conversation={conversation}
                    isLast={allMessages.length === 1}
                    isFirst
                    threadPosition={0}
                    totalInThread={allMessages.length}
                    forceExpanded={expandAll}
                    showDateAndDeexpandWhenExpandAll={showDateAndDeexpandWhenExpandAll}
                    inlineControlsWhenExpanded={inlineControlsWhenExpanded}
                    initialCollapsed={initialCardsCollapsed}
                    onAttachmentClick={onAttachmentClick}
                    existingDraft={draftsMap?.get(allMessages[0]._id) || null}
                    currentOfferId={currentOfferId}
                    hidePinning={hidePinning}
                    onDeleteFromSlot={onDeleteFromSlot}
                    isDeletingEmailId={isDeletingEmailId}
                    embeddedInDialog={embeddedInDialog}
                    onToggleThreadView={onToggleThreadView}
                    onCollapse={onCollapse}
                    showSingleEmail={showSingleEmail}
                    forEmail={forEmail}
                  />

                  {renderToggleRow()}
                  {allMessages.slice(1).map((message, index) => {
                    const actualIndex = index + 1;
                    const messageDraft = draftsMap?.get(message._id) || null;
                    return (
                      <MessageBubble
                        key={message._id || actualIndex}
                        message={message as unknown as EmailMessage}
                        conversation={conversation}
                        isLast={actualIndex === allMessages.length - 1}
                        isFirst={false}
                        threadPosition={actualIndex}
                        totalInThread={allMessages.length}
                        forceExpanded={expandAll}
                        showDateAndDeexpandWhenExpandAll={showDateAndDeexpandWhenExpandAll}
                        inlineControlsWhenExpanded={inlineControlsWhenExpanded}
                        initialCollapsed={initialCardsCollapsed}
                        onAttachmentClick={onAttachmentClick}
                        existingDraft={messageDraft}
                        currentOfferId={currentOfferId}
                        hidePinning={hidePinning}
                        onDeleteFromSlot={onDeleteFromSlot}
                        isDeletingEmailId={isDeletingEmailId}
                        embeddedInDialog={embeddedInDialog}
                        onToggleThreadView={onToggleThreadView}
                        onCollapse={onCollapse}
                        showSingleEmail={showSingleEmail}
                        forEmail={forEmail}
                      />
                    );
                  })}
                </>
              ) : (
                allMessages.map((message, index) => {
                  const messageDraft = draftsMap?.get(message._id) || null;

                  return (
                    <MessageBubble
                      key={message._id || index}
                      message={message as unknown as EmailMessage}
                      conversation={conversation}
                      isLast={index === allMessages.length - 1}
                      isFirst={index === 0}
                      threadPosition={index}
                      totalInThread={allMessages.length}
                      forceExpanded={expandAll}
                      showDateAndDeexpandWhenExpandAll={showDateAndDeexpandWhenExpandAll}
                      inlineControlsWhenExpanded={inlineControlsWhenExpanded}
                      initialCollapsed={initialCardsCollapsed}
                      onAttachmentClick={onAttachmentClick}
                      existingDraft={messageDraft}
                      currentOfferId={currentOfferId}
                      hidePinning={hidePinning}
                      onDeleteFromSlot={onDeleteFromSlot}
                      isDeletingEmailId={isDeletingEmailId}
                      embeddedInDialog={embeddedInDialog}
                      onToggleThreadView={onToggleThreadView}
                      onCollapse={onCollapse}
                      showSingleEmail={showSingleEmail}
                      forEmail={forEmail}
                    />
                  );
                })
              )}
          </>
        ) : null}
      </div>
    </div>
  );
}
