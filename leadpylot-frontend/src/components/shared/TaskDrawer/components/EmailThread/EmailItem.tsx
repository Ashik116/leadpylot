/**
 * EmailItem Component - Individual email in thread
 */

import ApolloIcon from '@/components/ui/ApolloIcon';
import { formatDate, getInitials, getAvatarColor } from '../../TaskDrawer.utils';
import { EmailAttachments } from './EmailAttachments';
import type { EmailThread } from '../../TaskDrawer.types';

interface EmailItemProps {
  email: EmailThread;
  index: number;
  totalEmails: number;
  isExpanded: boolean;
  onToggleExpansion: (emailId: string) => void;
}

export const EmailItem = ({
  email,
  index,
  totalEmails,
  isExpanded,
  onToggleExpansion,
}: EmailItemProps) => {
  const isLast = index === totalEmails - 1;

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* Email Header - Always Visible */}
      <div
        onClick={() => onToggleExpansion(email._id)}
        className="flex cursor-pointer items-start justify-between p-3 transition-colors hover:bg-gray-50"
      >
        <div className="flex min-w-0 flex-1 gap-2">
          {/* Avatar */}
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium text-white ${getAvatarColor(email.from_address)}`}
          >
            {getInitials(email.from)}
          </div>

          {/* Email Info */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate text-sm font-medium text-gray-900">{email.from}</span>
              {email.direction === 'outgoing' && (
                <span className="inline-flex items-center rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-800">
                  <ApolloIcon name="share" className="mr-0.5 text-xs" />
                  Sent
                </span>
              )}
              {!isLast && (
                <span className="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600">
                  <ApolloIcon name="reply" className="mr-0.5 text-xs" />
                  Reply {index + 1}/{totalEmails}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-gray-500">
              {formatDate(email.received_at || email.sent_at || new Date())}
            </p>
            {!isExpanded && (
              <p className="mt-1 line-clamp-2 text-xs text-gray-600">
                {email.body?.substring(0, 100)}...
              </p>
            )}
          </div>
        </div>

        {/* Expand Icon */}
        <button className="ml-2 shrink-0 text-gray-400">
          {isExpanded ? (
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 15l7-7 7 7"
              />
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          )}
        </button>
      </div>

      {/* Email Body - Expanded */}
      {isExpanded && (
        <div className="border-t border-gray-100 bg-white p-3">
          {/* Email Body */}
          <div
            className="prose prose-sm max-w-none text-sm text-gray-700"
            dangerouslySetInnerHTML={{
              __html: email.html_body || email.body?.replace(/\n/g, '<br/>') || '',
            }}
          />

          {/* Attachments */}
          {email.attachments && email.attachments.length > 0 && (
            <EmailAttachments attachments={email.attachments} />
          )}
        </div>
      )}
    </div>
  );
};
