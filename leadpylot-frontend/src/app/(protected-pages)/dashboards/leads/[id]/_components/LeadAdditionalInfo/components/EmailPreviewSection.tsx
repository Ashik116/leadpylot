import React from 'react';
import Loading from '@/components/shared/Loading';
import IframeMailPreview from '../IframeMailPreview';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { Attachment } from '../hooks/useEmailAttachments';

interface EmailPreviewSectionProps {
  subject: string;
  previewContent: string;
  attachments: Attachment[];
  templatesLoading: boolean;
}

export const EmailPreviewSection: React.FC<EmailPreviewSectionProps> = ({
  subject,
  previewContent,
  attachments,
  templatesLoading,
}) => {
  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex shrink-0 items-center justify-between pb-3">
        <h4 className="flex items-center gap-2 text-lg font-semibold">Email Preview</h4>
        <div className="mr-5 rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700">
          Live Preview
        </div>
      </div>

      <div className="flex h-full flex-col rounded-lg border border-gray-200 bg-white">
        {/* Email header preview */}
        <div className="shrink-0 rounded-t-lg border-b border-gray-200 bg-gray-50 p-4">
          <div className="">
            <span className="text-sm font-medium text-gray-500">Subject:</span>
            <span className="ml-2 text-sm">{subject || 'No subject'}</span>
          </div>
        </div>

        {/* Email content preview */}
        <div className="scrollbar-hide h-full flex-1 overflow-hidden px-2">
          {templatesLoading ? <Loading loading={true} /> : ''}
          <IframeMailPreview
            previewContent={previewContent}
            className="max-h-[650px] min-h-[650px]"
          />
        </div>

        {attachments.length > 0 && (
          <div className="shrink-0 border-t border-gray-200 p-4">
            <div className="mb-2 text-sm font-medium text-gray-500">
              Attachments ({attachments.length}):
            </div>
            <div className="max-h-24 space-y-2 overflow-y-auto">
              {attachments.map((attachment) => (
                <div key={attachment.id} className="flex items-center gap-2 text-sm">
                  <ApolloIcon name="file" className="h-4 w-4 text-gray-500" />
                  <span>{attachment.name}</span>
                  <span className="text-xs text-gray-500">({attachment.size})</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
