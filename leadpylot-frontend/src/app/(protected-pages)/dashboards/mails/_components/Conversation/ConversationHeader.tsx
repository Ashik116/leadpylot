'use client';

/**
 * ConversationHeader - Missive-Style
 * Header for email detail view
 */

import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { updateUrlHash } from '../../_hooks/useUrlSync';
import { useEmailStore } from '../../_stores/emailStore';
import { EmailConversation } from '../../_types/email.types';
import QuickActionsBar from '../Actions/QuickActionsBar';
// import QuickActionsBar from '../Actions/QuickActionsBar';

// Helper: Normalize subject to fix "Re: Re:" issue - keep first "Re:", remove duplicates
const normalizeSubject = (subject: string): string => {
  if (!subject) return '(no subject)';
  // Remove duplicate "Re:" prefixes (e.g., "Re: Re: Subject" -> "Re: Subject")
  // This regex matches one or more "Re:" at the start and replaces with a single "Re: "
  let normalized = subject.trim();
  normalized = normalized.replace(/^(Re:\s*)+/i, 'Re: ');
  return normalized || '(no subject)';
};

interface ConversationHeaderProps {
  conversation: EmailConversation;
  onAssignAgent?: () => void;
  onAssignLead?: () => void;
  onCreateTask?: () => void;
  onArchive?: () => void;
  onRestore?: () => void;
  isArchiving?: boolean;
  isRestoring?: boolean;
  hideBackButton?: boolean;
  /** When provided (e.g. embedded in EmailActivityCard), show collapse button under QuickActionsBar that calls this */
  onCollapse?: () => void;
  /** When provided, show icon in header to toggle between single email and full thread (e.g. from EmailActivityCard) */
  showSingleEmail?: boolean;
  onToggleThreadView?: () => void;
  currentOfferId?: string;
  currentLeadId?: string;
  forEmail?: boolean;
}

export default function ConversationHeader({
  conversation,
  onAssignAgent,
  onAssignLead,
  onCreateTask,
  onArchive,
  onRestore,
  isArchiving,
  isRestoring,
  hideBackButton = false,
  onCollapse,
  showSingleEmail = false,
  onToggleThreadView,
  currentOfferId,
  currentLeadId,
  forEmail = false,
}: ConversationHeaderProps) {
  const { selectConversation, currentView } = useEmailStore();

  const handleClose = () => {
    selectConversation(null);
    // Remove email ID from URL, keep only the view
    updateUrlHash(currentView);
  };

  return (
    <div
      className={`-mt-1.5 bg-white  rounded-t-2xl ${onCollapse ? 'cursor-pointer' : ''}`}
      onClick={onCollapse ?? undefined}
      role={onCollapse ? 'button' : undefined}
      tabIndex={onCollapse ? 0 : undefined}
      onKeyDown={
        onCollapse
          ? (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onCollapse();
            }
          }
          : undefined
      }
    >
      {/* Top Bar - Back, Subject & Actions (no pr-8 when embedded in activity card so layout is not affected) */}
      <div className={`flex items-center justify-between gap-2 pl-2 pt-1 ${onCollapse ? '' : 'pr-7'}`}>
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {/* {!hideBackButton && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClose();
              }}
              className="shrink-0 rounded-md p-2 text-gray-600 hover:bg-gray-100"
            >
              <ApolloIcon name="arrow-left" className="text-[1.0481625rem]" />
            </button>
          )} */}
          {/* <h1 className="min-w-0 truncate text-base font-medium ">
            {normalizeSubject(conversation.subject || '')}
          </h1> */}
        </div>

        {/* Actions - stop propagation so star/assign/archive etc. work */}
        <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {/* Thread toggle - commented out, moved to MessageBubble From/To/Subject section */}
          {/* {onToggleThreadView !== null && conversation.lead_id && (
            <Button
              variant="plain"
              size="sm"
              className="shrink-0 border-0 outline-none shadow-none mr-1  text-ocean-2 hover:bg-ocean-2/10 focus:ring-0 focus:ring-offset-0"
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
          )} */}
          {/* QuickActionsBar - commented out, actions moved to MessageBubble From/To/Subject section */}
          {!conversation.lead_id && forEmail && <QuickActionsBar
            conversation={conversation}
            onAssignAgent={onAssignAgent}
            onAssignLead={onAssignLead}
            onCreateTask={onCreateTask}
            onArchive={onArchive}
            onRestore={onRestore}
            isArchiving={isArchiving}
            isRestoring={isRestoring}
            currentOfferId={currentOfferId}
            currentLeadId={currentLeadId}
          />}
          {/* QuickActionsBar - only visible when no lead is assigned (mail page design view) */}

          {/* Collapse arrow - commented out */}
          {/* {onCollapse && (
            <Button
              variant="plain"
              size="sm"
              className="ml-auto shrink-0"
              icon={<ApolloIcon name="chevron-arrow-up" className="text-base" />}
              onClick={(e) => {
                e.stopPropagation();
                onCollapse();
              }}
              title="Collapse"
            />
          )} */}
        </div>
      </div>

      {/* Metadata Bar: project, contact, approval + collapse arrow on the right */}
      <div >
        {/* Project */}
        {/* {conversation.project_id && (
          <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-[0.698775rem] font-medium text-blue-700">
            {conversation.project_id.name}
          </span>
        )} */}

        {/* Lead / Contact - stop propagation so clicking lead goes to lead page */}
        {/* {conversation.lead_id && (
          <p
            className="group inline-flex cursor-pointer items-center rounded-full bg-green-100 px-2 py-1 text-[0.698775rem] font-medium text-green-700 hover:bg-green-200"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/dashboards/leads/${conversation?.lead_id?._id}`);
            }}
          >
            <ApolloIcon name="user" className="mr-1 text-[0.698775rem]" />
            <span
              className="relative after:content-[attr(data-name)] group-hover:after:content-['View_Lead']"
              data-name={conversation.lead_id.contact_name}
            />
          </p>
        )} */}

        {/* Approval Status */}
        {conversation.needs_approval && (
          <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-1 text-[0.698775rem] font-medium text-amber-700">
            <ApolloIcon name="alert-circle" className="mr-1 text-[0.698775rem]" />
            Pending Approval
          </span>
        )}

        {/* Collapse arrow to the right of project & contact (when embedded) */}

      </div>
    </div>
  );
}
