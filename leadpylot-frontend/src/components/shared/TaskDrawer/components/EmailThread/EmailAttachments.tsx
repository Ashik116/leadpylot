/**
 * Email Attachments Component
 */

import ApolloIcon from '@/components/ui/ApolloIcon';
import { formatFileSize } from '../../TaskDrawer.utils';
import type { EmailAttachment } from '../../TaskDrawer.types';

interface EmailAttachmentsProps {
  attachments: EmailAttachment[];
}

export const EmailAttachments = ({ attachments }: EmailAttachmentsProps) => {
  if (!attachments || attachments.length === 0) return null;

  return (
    <div className="mt-3 border-t border-gray-100 pt-3">
      <div className="mb-2 flex items-center gap-1 text-xs font-medium text-gray-700">
        <ApolloIcon name="paperclip" className="text-sm" />
        {attachments.length} Attachment{attachments.length !== 1 ? 's' : ''}
      </div>
      <div className="space-y-1">
        {attachments.map((attachment) => (
          <div
            key={attachment.document_id}
            className="flex items-center justify-between gap-2 rounded-md border border-gray-200 bg-gray-50 p-2 text-xs transition-colors hover:bg-gray-100"
          >
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <ApolloIcon name="file" className="shrink-0 text-gray-400" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-gray-700">{attachment.filename}</p>
                <p className="text-gray-500">{formatFileSize(attachment.size)}</p>
              </div>
            </div>
            {attachment.approved ? (
              <span className="inline-flex shrink-0 items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                <ApolloIcon name="check" className="mr-0.5 text-xs" />
                Approved
              </span>
            ) : (
              <span className="inline-flex shrink-0 items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                <svg
                  className="mr-0.5 h-3 w-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Pending
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
