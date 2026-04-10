'use client';

/**
 * ConversationBatchSection - Contact name + badges (agent, comments, attachments, project, status, snoozed)
 * Starts from conversation name; contact truncates, badges stay visible
 */

import ApolloIcon from '@/components/ui/ApolloIcon';
import type { EmailConversation } from '../../_types/email.types';
import { SnoozeInfoDropdown } from '../Snooze/SnoozeMenu';

const BADGE_SIZE = 'text-[0.598775rem]';

const badgeBase = 'inline-flex shrink-0 items-center gap-1 rounded-sm px-2 py-[0.1rem] font-medium';

type ApprovalStatus = 'no-lead' | 'pending' | 'approved' | 'rejected';

const getApprovalStatus = (conversation: EmailConversation): ApprovalStatus => {
  if (!conversation.lead_id) return 'no-lead';
  if (conversation.approval_status === 'rejected') return 'rejected';
  if (conversation.needs_approval) return 'pending';
  return 'approved';
};

function Badge({
  icon,
  text,
  className,
  hideOnMobile,
}: {
  icon?: React.ReactNode;
  text: React.ReactNode;
  className: string;
  hideOnMobile?: boolean;
}) {
  return (
    <span
      className={`${badgeBase} ${BADGE_SIZE} ${className} ${hideOnMobile ? 'hidden sm:inline-flex' : ''
        }`}
    >
      {icon}
      {text}
    </span>
  );
}
function SnoozeBadge({
  conversation,
  showSnoozeInfo,
  onHoverChange,
}: {
  conversation: EmailConversation;
  showSnoozeInfo: boolean;
  onHoverChange: (v: boolean) => void;
}) {
  if (!conversation.snoozed) return null;

  return (
    <div className="relative shrink-0">
      <div onMouseEnter={() => onHoverChange(true)} onMouseLeave={() => onHoverChange(false)}>
        <Badge
          icon={<ApolloIcon name="stopwatch" className={`mr-1 ${BADGE_SIZE}`} />}
          text="Snoozed"
          className="bg-yellow-500 text-white"
        />
      </div>

      {showSnoozeInfo && (
        <div
          className="prevent-select"
          onMouseEnter={() => onHoverChange(true)}
          onMouseLeave={() => onHoverChange(false)}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <SnoozeInfoDropdown
            emailId={conversation._id}
            snoozed_at={(conversation as any).snoozed_at}
            snoozed_by={(conversation as any).snoozed_by}
            snoozed_until={conversation.snoozed_until}
            onUnsnooze={() => onHoverChange(false)}
          />
        </div>
      )}
    </div>
  );
}

export function ConversationBadges({
  conversation,
  hasComments,
  showSnoozeInfo,
  onSnoozeHoverChange,
}: {
  conversation: EmailConversation;
  hasComments: boolean;
  showSnoozeInfo: boolean;
  onSnoozeHoverChange: (show: boolean) => void;
}) {
  const approvalStatus = getApprovalStatus(conversation);

  return (
    <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto scrollbar-hide">
      {conversation.assigned_agent && (
        <div className={`hidden sm:flex items-center gap-1 ${BADGE_SIZE} text-gray-500`}>
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-100 text-orange-600">
            <ApolloIcon name="user" className={BADGE_SIZE} />
          </div>
          <span className="max-w-[100px] truncate">
            {conversation.assigned_agent.login}
          </span>
        </div>
      )}

      {hasComments && (
        <Badge
          icon={<ApolloIcon name="comment" className={BADGE_SIZE} />}
          text={conversation.comment_count}
          className="text-gray-500"
        />
      )}

      {!!conversation.attachment_count && (
        <Badge
          icon={<ApolloIcon name="paperclip" className={BADGE_SIZE} />}
          text={conversation.attachment_count}
          className="text-gray-500"
        />
      )}

      {conversation.project_id && (
        <Badge
          text={conversation.project_id.name}
          className="bg-blue-100 text-blue-700 max-w-[120px] truncate"
          hideOnMobile
        />
      )}

      {{
        'no-lead': (
          <Badge
            icon={<ApolloIcon name="user-plus" className={`mr-1 ${BADGE_SIZE}`} />}
            text="No Lead"
            className="bg-orange-100 text-orange-700"
          />
        ),
        pending: <Badge text="Pending" className="bg-amber-100 text-amber-700" />,
        approved: <Badge text="Approved" className="bg-green-100 text-green-700" />,
        rejected: <Badge text="Rejected" className="bg-red-100 text-red-700" />,
      }[approvalStatus]}

      <SnoozeBadge
        conversation={conversation}
        showSnoozeInfo={showSnoozeInfo}
        onHoverChange={onSnoozeHoverChange}
      />
    </div>
  );
}

export interface ConversationBatchSectionProps {
  conversation: EmailConversation;
  isUnread: boolean;
  hasComments: boolean;
  showSnoozeInfo: boolean;
  onSnoozeHoverChange: (show: boolean) => void;
}

export default function ConversationBatchSection({
  conversation,
  isUnread,
  hasComments,
  showSnoozeInfo,
  onSnoozeHoverChange,
}: ConversationBatchSectionProps) {
  const contactName = conversation.lead_id?.contact_name || conversation.participants[0]?.name || 'Unknown';

  return (
    <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
      {/* Contact name - shrink-wraps to content, truncates when space limited; badges start immediately after */}
      <span
        className={`min-w-0 shrink truncate text-[0.8152375rem] ${isUnread ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}
      >
        {contactName}
      </span>
      {conversation.has_draft && (
        <span className="inline-flex shrink-0 items-center rounded-full bg-red-100 px-2 py-0.5 text-[0.698775rem] font-medium text-red-700">
          Draft
        </span>
      )}
      <ConversationBadges
        conversation={conversation}
        hasComments={hasComments}
        showSnoozeInfo={showSnoozeInfo}
        onSnoozeHoverChange={onSnoozeHoverChange}
      />
    </div>
  );
}
