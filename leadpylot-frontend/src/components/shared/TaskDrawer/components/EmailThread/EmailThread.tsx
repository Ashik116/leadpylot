/**
 * EmailThread Component - Email thread display
 */

import Spinner from '@/components/ui/Spinner';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { EmailItem } from './EmailItem';
import type { EmailThread as EmailThreadType } from '../../TaskDrawer.types';

interface EmailThreadProps {
  emails: EmailThreadType[];
  isLoading: boolean;
  expandedEmails: Set<string>;
  onToggleEmailExpansion: (emailId: string) => void;
}

export const EmailThread = ({
  emails,
  isLoading,
  expandedEmails,
  onToggleEmailExpansion,
}: EmailThreadProps) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner size={30} />
        <span className="ml-2 text-sm text-gray-500">Loading email thread...</span>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-6 text-center">
        <svg className="mb-3 h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
        <p className="mb-1 text-sm font-medium text-gray-700">Email Not Available</p>
        <p className="text-xs text-gray-500">
          The email associated with this task may have been deleted, archived, or you don&apos;t have
          permission to view it.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Thread Header */}
      <div className="mb-3 flex items-center gap-2 text-xs text-gray-600">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 10h16M4 14h16M4 18h16"
          />
        </svg>
        <span className="font-medium">
          {emails.length} {emails.length === 1 ? 'email' : 'emails'} in conversation
        </span>
      </div>

      {/* Email Messages */}
      {emails.map((email, index) => (
        <EmailItem
          key={email._id}
          email={email}
          index={index}
          totalEmails={emails.length}
          isExpanded={expandedEmails.has(email._id)}
          onToggleExpansion={onToggleEmailExpansion}
        />
      ))}
    </div>
  );
};

