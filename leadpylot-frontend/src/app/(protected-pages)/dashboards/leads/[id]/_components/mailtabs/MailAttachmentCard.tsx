import Image from 'next/image';
import React from 'react';
import Checkbox from '@/components/ui/Checkbox/Checkbox';
import { GetIconPath } from '@/utils/GetFileType';
import { useUnmaskAttachment } from '@/services/hooks/useEmailSystem';

interface MailAttachmentCardProps {
  // Legacy props
  selectedAttachments?: Set<string | number>;
  onAttachmentSelect?: (attachmentId: string | number, selected: boolean) => void;
  onAttachmentClick?: (attachment: any) => void;

  // Gmail-style props
  attachment: any;
  onClick?: (attachment: any) => void;
  isSelected?: boolean;
  onSelect?: (selected: boolean) => void;
  showSelect?: boolean;
  userId?: string; // assigned_agent._id should be passed by parent
}

const MailAttachmentCard = ({
  selectedAttachments,
  attachment,
  // onAttachmentSelect,
  onAttachmentClick,
  onClick,
  isSelected: propIsSelected,
  // onSelect,
}: MailAttachmentCardProps) => {
  const name = attachment.name || attachment.filename || '';
  const attachmentId =
    attachment.id || attachment._id || attachment.document_id || attachment.documentId;
  const documentId =
    attachment.document_id || attachment.documentId || attachment._id || attachment.id;

  // Determine selection state - use prop first, then fall back to selectedAttachments set
  const isSelected =
    propIsSelected !== undefined ? propIsSelected : selectedAttachments?.has(attachmentId) || false;

  // Legacy selection checkbox removed per new UX

  const handleCardClick = (e: React.MouseEvent) => {
    // Only trigger attachment click if not clicking on checkbox
    const target = e.target as HTMLInputElement;
    if (target.type !== 'checkbox') {
      // Handle both interfaces
      if (onClick) {
        onClick(attachment);
      }
      if (onAttachmentClick) {
        onAttachmentClick(attachment);
      }
    }
  };

  // New: Unmask API integration (checkbox reflects attachment.unmask)
  const unmaskMutation = useUnmaskAttachment();
  const [isUnmasked, setIsUnmasked] = React.useState<boolean>(Boolean(attachment?.unmask));

  const handleUnmaskToggle = async (newUnmask: boolean) => {
    if (!documentId || !attachment?.userId) return;
    try {
      setIsUnmasked(newUnmask);
      await unmaskMutation.mutateAsync({
        documentId,
        unmask: newUnmask,
        userId: attachment.userId,
      });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div
      key={attachment.id || attachment.document_id || attachment.documentId}
      className={`flex cursor-pointer items-center justify-between gap-1 rounded-md border px-2 py-1 text-xs text-gray-700 transition-colors hover:bg-gray-200 overflow-hidden ${isSelected ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-white'
        }`}
      title={name || ''}
      onClick={handleCardClick}
    >
      <div className="flex items-center gap-1">
        <Image src={`${GetIconPath(name || '')}`} alt="attachment" width={16} height={16} />
        {/* <span className="truncate line-clamp-1 w-56">{name}</span> */}
        <span className="min-0 max-w-[250px] truncate line-clamp-1">{name?.split('.')[0] || ''}</span>
        <span className="text-gray-500">.{name?.split('.').pop() || ''}</span>
      </div>
      {documentId && attachment?.userId && (
        <Checkbox
          checked={isUnmasked}
          onChange={(next) => handleUnmaskToggle(next)}
          className="h-3.5 w-3.5"
        />
      )}
    </div>
  );
};

export default MailAttachmentCard;
