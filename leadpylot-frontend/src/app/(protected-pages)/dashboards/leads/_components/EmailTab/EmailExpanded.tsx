import { useCallback, useState } from 'react';
import CollapsibleHtmlItem from './CollapsibleHtmlItem';
import UpdatesActivitySkeleton from '../../[id]/_components/UpdatesActivitySkeleton';
import { useEmailById } from '@/services/hooks/useEmailSystem';
import RepliesList from './RepliesList';

const EmailExpanded = ({
  activityId,
  onAttachmentClick,
}: {
  activityId: string;
  onAttachmentClick: (attachment: any) => void;
}) => {
  const { data: email, isLoading } = useEmailById(activityId);
  const [selectedAttachments, setSelectedAttachments] = useState<Set<string | number>>(new Set());

  const handleAttachmentSelect = useCallback((attachmentId: string | number, selected: boolean) => {
    setSelectedAttachments((prev) => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(attachmentId);
      } else {
        newSet.delete(attachmentId);
      }
      return newSet;
    });
  }, []);

  if (isLoading) {
    return (
      <div className="bg-gray-50/40 px-4 py-3">
        <UpdatesActivitySkeleton />
      </div>
    );
  }

  if (!email) return null;

  const headerPrimary = email?.subject || email?.body?.slice(0, 120) || '';
  const rightMeta = email?.received_at
    ? new Date(email?.received_at).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : email?.sent_at
      ? new Date(email?.sent_at).toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '';

  return (
    <div className="bg-white">
      {/* Email Content */}
      <div className="px-3 py-2">
        <CollapsibleHtmlItem
          headerPrimary={headerPrimary}
          headerSecondary={`${email?.from_address || ''} → ${email?.to || ''}`}
          rightMeta={rightMeta}
          rawHtml={email?.html_body || email?.body || ''}
          minHeight={0}
          openDefault
          iframeTitle={`Email ${email?._id}`}
          attachments={email?.attachments?.map((a: any) => ({ id: a?.document_id, ...a }))}
          direction={email?.direction as any}
          onAttachmentClick={onAttachmentClick}
          selectedAttachments={selectedAttachments}
          onAttachmentSelect={handleAttachmentSelect}
        />
      </div>

      {/* Replies */}
      {Array?.isArray((email as any)?.replies) && (email as any)?.replies?.length > 0 && (
        <div className="border-t border-gray-100 bg-gray-50/40">
          <div className="px-3 py-2">
            {/* <h5 className="text-sm font-medium text-gray-700 mb-3">
                            Replies ({(email as any).replies.length})
                        </h5> */}
            <RepliesList replies={(email as any)?.replies} onAttachmentClick={onAttachmentClick} />
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailExpanded;
