'use client';

/**
 * QuickActionsBar - Missive-Style
 * Quick action buttons for email operations
 */

import ApolloIcon from '@/components/ui/ApolloIcon';
import { useActionHover } from '../../_hooks/useActionHover';
import { EmailConversation } from '../../_types/email.types';
import ActionButton from '../Shared/ActionButton';

import RoleGuard from '@/components/shared/RoleGuard';
import { Role } from '@/configs/navigation.config/auth.route.config';
import { useSession } from '@/hooks/useSession';
import { useCallback, useState } from 'react';
import { useStarEmail } from '../../_hooks/useStarEmail';
import { useUnsnoozeEmail } from '../../_hooks/useSnoozeEmail';
import SnoozeMenu from '../Snooze/SnoozeMenu';
import StarButton from '../Shared/StarButton';

import { SlotPinningMenu } from '../EmailDetail/SlotPinningMenu';

interface QuickActionsBarProps {
  conversation: EmailConversation;
  onAssignAgent?: () => void;
  onAssignLead?: () => void;
  onCreateTask?: () => void;
  onArchive?: () => void;
  onRestore?: () => void;
  isArchiving?: boolean;
  isRestoring?: boolean;
  showingCreateTaskButton?: boolean;
  currentOfferId?: string;
  currentLeadId?: string;
  showingPinMenu?: boolean;
}

// Action button IDs
const ACTION_IDS = {
  ASSIGN_AGENT: 'assign-agent',
  ASSIGN_LEAD: 'assign-lead',
  CREATE_TASK: 'create-task',
  ARCHIVE: 'archive',
  SNOOZE: 'snooze',
  LABELS: 'labels',
  MORE: 'more',
} as const;

export default function QuickActionsBar({
  conversation,
  onAssignAgent,
  onAssignLead,
  onCreateTask,
  onArchive,
  onRestore,
  isArchiving,
  isRestoring,
  showingCreateTaskButton = false,
  currentOfferId,
  currentLeadId,
  showingPinMenu = false,
}: QuickActionsBarProps) {
  const { handleHoverStart, handleHoverEnd, isActive } = useActionHover();
  const { toggleStar } = useStarEmail();
  const { unsnoozeEmail, isUnsnoozing } = useUnsnoozeEmail();
  const { data: session } = useSession();
  const [showSnoozeMenu, setShowSnoozeMenu] = useState(false);

  const leadId = conversation.lead_id?._id || conversation.lead_id || currentLeadId;
  const emailId = conversation._id;

  // Check if email is archived - check multiple sources since backend may not update archived field
  const isArchived = conversation?.is_active === false;
  const isSnoozed = conversation?.snoozed === true;

  const handleStarToggle = useCallback(
    async (emailId: string, isStarred: boolean) => {
      await toggleStar(emailId, isStarred);
    },
    [toggleStar]
  );
  return (
    <div className="flex items-center gap-2">
      {leadId && emailId && showingPinMenu && <SlotPinningMenu emailId={emailId} currentOfferId={currentOfferId} title="Pin to Slot" />}
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
        onToggle={handleStarToggle}
      />
      {/* Assign Agent */}
      <RoleGuard role={Role.ADMIN}>
        <>
          {onAssignAgent && (
            <ActionButton
              id={ACTION_IDS.ASSIGN_AGENT}
              icon={<ApolloIcon name="users" />}
              label="Assign to Agent"
              onClick={onAssignAgent}
              showLabel={isActive(ACTION_IDS.ASSIGN_AGENT)}
              onHoverStart={handleHoverStart}
              onHoverEnd={handleHoverEnd}
            />
          )}

          {/* Assign to Lead - Only show if email is not already assigned to a lead */}
          {onAssignLead && !conversation.lead_id && (
            <ActionButton
              id={ACTION_IDS.ASSIGN_LEAD}
              icon={<ApolloIcon name="user-circle" />}
              label="Assign to Lead"
              onClick={onAssignLead}
              showLabel={isActive(ACTION_IDS.ASSIGN_LEAD)}
              onHoverStart={handleHoverStart}
              onHoverEnd={handleHoverEnd}
            />
          )}
        </>
      </RoleGuard>

      {/* Create Task */}
      {showingCreateTaskButton && (
        <RoleGuard role={Role.ADMIN}>
          <>
            {onCreateTask && (
              <ActionButton
                id={ACTION_IDS.CREATE_TASK}
                icon={<ApolloIcon name="plus" />}
                label="Create Task"
                onClick={onCreateTask}
                showLabel={isActive(ACTION_IDS.CREATE_TASK)}
                onHoverStart={handleHoverStart}
                onHoverEnd={handleHoverEnd}
              />
            )}
          </>
        </RoleGuard>
      )}
      {/* Snooze / Unsnooze - commented out */}
      {/* <div className="relative">
        {isSnoozed ? (
          <ActionButton
            id={ACTION_IDS.SNOOZE}
            icon={<ApolloIcon name="forward-10" />}
            label="Unsnooze"
            onClick={() => unsnoozeEmail(conversation._id)}
            loading={isUnsnoozing}
            showLabel={isActive(ACTION_IDS.SNOOZE)}
            onHoverStart={handleHoverStart}
            onHoverEnd={handleHoverEnd}
          />
        ) : (
          <>
            <ActionButton
              id={ACTION_IDS.SNOOZE}
              icon={<ApolloIcon name="stopwatch" />}
              label="Snooze"
              onClick={() => setShowSnoozeMenu(true)}
              showLabel={isActive(ACTION_IDS.SNOOZE)}
              onHoverStart={handleHoverStart}
              onHoverEnd={handleHoverEnd}
            />
            {showSnoozeMenu && (
              <SnoozeMenu emailId={conversation._id} onClose={() => setShowSnoozeMenu(false)} />
            )}
          </>
        )}
      </div> */}

      {/* Archive / Restore - commented out */}
      {/* {!isArchived ? (
        <ActionButton
          id={ACTION_IDS.ARCHIVE}
          icon={<ApolloIcon name="archive-box" />}
          label="Archive"
          title="Archive (e)"
          onClick={onArchive}
          loading={isArchiving}
          showLabel={isActive(ACTION_IDS.ARCHIVE)}
          onHoverStart={handleHoverStart}
          onHoverEnd={handleHoverEnd}
        />
      ) : (
        <ActionButton
          id={ACTION_IDS.ARCHIVE}
          icon={<ApolloIcon name="refresh" />}
          label="Restore"
          title="Restore from archive"
          onClick={onRestore}
          loading={isRestoring}
          showLabel={isActive(ACTION_IDS.ARCHIVE)}
          onHoverStart={handleHoverStart}
          onHoverEnd={handleHoverEnd}
        />
      )} */}
    </div>
  );
}
