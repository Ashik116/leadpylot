'use client';

import { Email } from '../../emailTypes/types';
import RepliesList from '../../../_components/EmailTab/RepliesList';
import CollapsibleHtmlItem from '../../../_components/EmailTab/CollapsibleHtmlItem';
import { useCallback, useState } from 'react';

interface EmailBodyProps {
  email: Email;
  onAttachmentClick?: (attachment: any) => void;
}

/**
 * Email body component that renders the HTML content of the email safely
 */
const EmailBody = ({ email, onAttachmentClick }: EmailBodyProps) => {
  const emailContent = email?.body || '';
  const attachments = email?.attachments || [];
  const [selectedAttachments, setSelectedAttachments] = useState<Set<string | number>>(new Set());

  const handleAttachmentSelect = useCallback((attachmentId: string | number, selected: boolean) => {
    setSelectedAttachments((prev) => {
      const newSet = new Set(prev);
      newSet[selected ? 'add' : 'delete'](attachmentId);

      return newSet;
    });
  }, []);
  return (
    <div className="w-full">
      <div className="overflow-hidden rounded-lg bg-white">
        <CollapsibleHtmlItem
          headerPrimary={
            email?.content?.length > 70 ? email?.content?.slice(0, 70) + '...' : email?.content
          }
          headerSecondary={email?.to ? `to: ${email?.to}` : ''}
          rightMeta={`${email?.date?.dateStr || ''} ${email?.date?.timeStr || ''}`}
          rawHtml={emailContent}
          minHeight={400}
          openDefault={true}
          iframeTitle="Email Content"
          attachments={attachments}
          onAttachmentClick={onAttachmentClick}
          direction={email?.direction as 'incoming' | 'outgoing'}
          selectedAttachments={selectedAttachments}
          onAttachmentSelect={handleAttachmentSelect}
        />

        {/* Replies list (each item collapsible) */}
        {Array?.isArray((email as any)?.replies) && (
          <div className="px-0 pb-3">
            <RepliesList
              replies={(email as any)?.replies}
              onAttachmentClick={onAttachmentClick || (() => {})}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailBody;
