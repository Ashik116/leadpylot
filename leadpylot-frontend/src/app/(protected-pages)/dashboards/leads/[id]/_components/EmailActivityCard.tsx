import React, { useMemo, useState, useCallback } from 'react';
import classNames from '@/utils/classNames';
import EmailCard from './EmailCard';
import EmailDetailSkeleton from './EmailDetailSkeleton';
import EmailDetail from '@/app/(protected-pages)/dashboards/mails/_components/EmailLayout/EmailDetail';
import { useEmailDetail } from '@/app/(protected-pages)/dashboards/mails/_hooks/useEmailData';
import { ExtendedActivity } from './UpdatesActivity';

// Helper to safely extract string from value that may be {value, html, text} or string
const extractString = (value: unknown): string => {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null) {
    const o = value as Record<string, unknown>;
    if (typeof o.text === 'string') return o.text;
    if (typeof o.value === 'string') return o.value;
    if (typeof o.html === 'string') return o.html.replace(/<[^>]+>/g, '').trim();
  }
  return String(value);
};

// Helper function to normalize email subject - remove duplicate "Re:" prefixes
const normalizeEmailSubject = (subject: string | undefined): string => {
  if (!subject) return 'No Subject';

  // Remove all "Re:" prefixes (case insensitive, with optional spaces)
  let normalized = subject.trim();

  // Remove multiple "Re:" prefixes, keeping only one
  // Match "Re:" or "RE:" or "re:" followed by optional spaces
  const rePattern = /^(re:\s*)+/i;
  normalized = normalized.replace(rePattern, 'Re: ');

  return normalized.trim();
};

// Email Activity Card Component - Shows expandable email card with EmailDetail inline
interface EmailActivityCardProps {
  activity: ExtendedActivity;
  expandedEmailId: string | null;
  setExpandedEmailId: (id: string | null) => void;
  leadExpandView?: boolean;
  currentOfferId?: string;
  currentLeadId?: string;
  customClassMerge?: boolean;
  highlightEmailId?: string | null;
  showHighlightWhenExpanded?: boolean;
}

const EmailActivityCard: React.FC<EmailActivityCardProps> = ({
  activity,
  expandedEmailId,
  setExpandedEmailId,
  leadExpandView = false,
  currentOfferId,
  currentLeadId,
  customClassMerge = true,
  highlightEmailId,
  showHighlightWhenExpanded = false,
}) => {
  // Handle email_id as string or object
  const emailId: string | null = useMemo(() => {
    const normalizeId = (value: any) => {
      if (!value) return null;
      if (typeof value === 'object') {
        return value._id || value.id || null;
      }
      return value;
    };
    const id =
      normalizeId(activity?.metadata?.email_id) ||
      normalizeId(activity?.metadata?.email) ||
      normalizeId(activity?.details?.email_id);
    return id ? String(id) : null;
  }, [
    activity?.metadata?.email_id,
    activity?.metadata?.email,
    activity?.details?.email_id,
  ]);

  const isExpanded = expandedEmailId === activity.id;

  // Email assigned to lead: show full thread. Sent/received: show single email by default, with toggle to full thread.
  const isAssignedActivity = activity.type === 'email_assigned_to_lead';
  const [showFullThread, setShowFullThread] = useState(false);

  const handleToggle = useCallback(() => {
    if (isExpanded) {
      setShowFullThread(false);
      setExpandedEmailId(null);
    } else {
      setExpandedEmailId(activity.id);
    }
  }, [isExpanded, activity.id, setExpandedEmailId]);

  const showSingleEmail = isAssignedActivity ? false : !showFullThread;
  const canExpandToThread = isExpanded && !isAssignedActivity && !showFullThread;
  const isShowingFullThread = isExpanded && !isAssignedActivity && showFullThread;

  // Lazy-load: Only fetch email details when expanded. Collapsed cards use activity metadata.
  // This prevents N API calls when N email activities are visible (e.g. 18 emails = 18 calls).
  const { data: emailDetailData, isLoading: isLoadingEmail } = useEmailDetail(
    isExpanded && emailId ? emailId : null
  );

  const highlightTargets = useMemo(() => {
    const targets = [
      emailId,
      (activity as any)?.metadata?.thread_id,
      (activity as any)?.metadata?.threadId,
      (activity as any)?.details?.thread_id,
      emailDetailData?.email?._id,
      emailDetailData?.email?.thread_id,
    ]
      .filter((value) => value !== null && value !== undefined)
      .map((value) => String(value));
    return targets;
  }, [
    emailId,
    activity,
    emailDetailData?.email?._id,
    emailDetailData?.email?.thread_id,
  ]);
  const isHighlighted =
    !!highlightEmailId && highlightTargets.includes(String(highlightEmailId));
  const shouldShowHighlightBorder = isHighlighted && (showHighlightWhenExpanded || !isExpanded);

  // Extract From address (sender) - metadata uses From_email (capital F)
  const emailFromAddress = useMemo<string>(() => {
    if (emailDetailData?.email) {
      const email = emailDetailData.email as { from_address?: string; from?: string };
      return email.from_address || email.from || '';
    }
    return extractString(
      activity.metadata?.From_email ||
        activity.metadata?.email_from ||
        activity.details?.email ||
        ''
    );
  }, [emailDetailData, activity.metadata, activity.details]);

  // Extract To address (recipient)
  const emailToAddress = useMemo<string>(() => {
    if (emailDetailData?.email) {
      const email = emailDetailData.email as { to_address?: string; to?: string };
      return email.to_address || email.to || '';
    }
    return extractString(activity.metadata?.email_to || '');
  }, [emailDetailData, activity.metadata]);

  const emailSubject = useMemo(() => {
    if (emailDetailData?.email?.subject) {
      return extractString(emailDetailData.email.subject);
    }
    return extractString(
      activity.details?.subject ||
      activity.metadata?.email_subject ||
      activity.metadata?.taskTitle ||
      ''
    );
  }, [emailDetailData, activity.details, activity.metadata]);

  const emailDirection = useMemo<'incoming' | 'outgoing'>(() => {
    if (emailDetailData?.email?.direction) {
      return emailDetailData.email.direction as 'incoming' | 'outgoing';
    }
    return activity.type === 'email_sent' || activity.type === 'email_assigned_to_lead'
      ? 'outgoing'
      : 'incoming';
  }, [emailDetailData, activity.type]);

  // Body preview: from email detail when loaded, else from metadata.email_body
  const bodyPreview = useMemo<string>(() => {
    if (emailDetailData?.email) {
      const email = emailDetailData.email as { body?: unknown; html_body?: unknown };
      const raw = extractString(email.body || email.html_body || '');
      if (!raw) return '';
      const stripped = raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      const firstLine = stripped.split('\n')[0]?.trim() || stripped;
      return firstLine.length > 120 ? firstLine.slice(0, 120) + '…' : firstLine;
    }
    // Use metadata.email_body when collapsed (no email detail loaded)
    const metaBody = extractString(activity.metadata?.email_body || '');
    if (!metaBody) return '';
    const stripped = metaBody.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const firstLine = stripped.split('\n')[0]?.trim() || stripped;
    return firstLine.length > 120 ? firstLine.slice(0, 120) + '…' : firstLine;
  }, [emailDetailData, activity.metadata?.email_body]);

  // Attachments: from email detail when loaded, else from metadata.attachment
  const attachments = useMemo(() => {
    if (emailDetailData?.email) {
      const email = emailDetailData.email as {
        attachments?: Array<{
          _id: string;
          filename: string;
          document_id?: string;
          mime_type?: string;
        }>;
      };
      return email.attachments || [];
    }
    // Use metadata.attachment when collapsed (API uses "attachment" array)
    const metaAtt = activity.metadata?.attachment;
    if (!Array.isArray(metaAtt) || metaAtt.length === 0) return [];
    return metaAtt.map(
      (att: { document_id?: string; filename?: string; mime_type?: string; _id?: string }) => ({
        _id: att.document_id || att._id || '',
        filename: att.filename || 'file',
        document_id: att.document_id,
        mime_type: att.mime_type,
      })
    );
  }, [emailDetailData, activity.metadata?.attachment]);

  // Prepare activity data for EmailCard
  const emailActivityData = {
    id: activity.id,
    type: activity.type,
    subject: normalizeEmailSubject(emailSubject),
    from_address: emailFromAddress,
    to_address: emailToAddress,
    direction: emailDirection,
    timestamp: activity.timestamp,
    body_preview: bodyPreview,
    attachments,
    lead_id:
      activity.metadata?.lead_id ||
      (activity.details?.lead
        ? {
            _id: activity.details.lead._id || activity.details.lead.id,
            contact_name: extractString(activity.details.lead.contact_name),
          }
        : undefined),
    email_id: emailId,
    details: {
      from_address: emailFromAddress,
      to_address: emailToAddress,
      from: emailFromAddress,
      received_at: activity.date,
      sent_at: activity.date,
    },
  };

  return (
    <div className="pb-1">
      {/* Email Card - Only visible when not expanded */}
      {!isExpanded && (
        <div
          onClick={handleToggle}
          className={`${customClassMerge ? `relative -ml-10 cursor-pointer ${leadExpandView ? '-mr-2 w-[calc(100%+3rem)]' : '-mr-4 w-[calc(100%+3.5rem)]'}` : 'relative cursor-pointer'}`}
        >
          <EmailCard
            activity={emailActivityData}
            onClick={() => {}}
            currentOfferId={currentOfferId}
            currentLeadId={currentLeadId}
            className={classNames(
              shouldShowHighlightBorder &&
                'rounded-lg border-ocean-2 border-2 bg-ocean-2/10 p-2 shadow-[0_0_0_1px_rgba(29,122,180,0.35)]'
            )}
          />
        </div>
      )}

      {/* Expanded Email Detail - Inline with close button */}
      {isExpanded && (
        <div
          className={`${customClassMerge ? `relative z-20 -ml-10 bg-white ${leadExpandView ? '-mr-2 w-[calc(100%+3rem)]' : '-mr-4 w-[calc(100%+3.5rem)]'}` : 'relative z-20 bg-white'}`}
        >
          {isLoadingEmail ? (
            <EmailDetailSkeleton />
          ) : emailDetailData?.email ? (
            <div
              className={classNames(
                'w-full bg-white shadow-sm',
                shouldShowHighlightBorder && 'overflow-hidden rounded-lg border-ocean-2 border-2 p-2'
              )}
            >
              <div className="relative overflow-hidden">
                <EmailDetail
                  conversation={emailDetailData.email as any}
                  hideBackButton={true}
                  showSingleEmail={showSingleEmail}
                  onCollapse={handleToggle}
                  onToggleThreadView={
                    canExpandToThread || isShowingFullThread
                      ? () => setShowFullThread((f) => !f)
                      : undefined
                  }
                  currentOfferId={currentOfferId}
                  currentLeadId={currentLeadId}
                  replyAll={false}
                />
              </div>
            </div>
          ) : (
            <div className="py-4 text-center text-sm text-gray-500">
              Email details not available
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EmailActivityCard;
