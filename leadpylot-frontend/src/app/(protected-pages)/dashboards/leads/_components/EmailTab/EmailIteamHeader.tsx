import ApolloIcon from '@/components/ui/ApolloIcon';
import { GetIconPath } from '@/utils/GetFileType';
import Image from 'next/image';
import { useState } from 'react';
import { Activity } from './EmailCompactList';

const EmailItemHeader = ({
  activity,
  isOpen,
  onToggle,
  onAttachmentClick,
}: {
  activity: Activity;
  isOpen: boolean;
  onToggle: () => void;
  onAttachmentClick: (attachment: any) => void;
}) => {
  const [showAllAttachments, setShowAllAttachments] = useState(false);
  const hasAttachments = (activity?.attachments?.length || 0) > 0;
  const isIncoming = activity?.direction === 'incoming';

  // Format content preview (first line of content)
  const contentPreview =
    activity?.details?.content?.split('\n')[0]?.slice(0, 100) ||
    activity?.details?.subject ||
    '(No content)';

  const handleResendClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Add reset functionality here
    // TODO: Implement reset functionality
  };
  //   {`group relative w-full cursor-pointer transition-all duration-150 ${isOpen ? 'bg-gray-100' : 'bg-white'}`}
  return (
    <div
      role="button"
      aria-expanded={isOpen}
      tabIndex={0}
      className={`group sticky top-10 z-10 w-full cursor-pointer bg-white/90 backdrop-blur transition-colors duration-150 ${
        isOpen ? 'bg-gray-50' : 'bg-white'
      }`}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e?.key === 'Enter' || e?.key === ' ') onToggle();
      }}
    >
      <div className="items-top flex justify-between border-b border-gray-100 px-4 py-2">
        {/* Lead Name (Left) */}
        <div
          className={`items-top flex min-w-0 shrink-0 gap-3 transition-all duration-300 ${isOpen ? 'w-max' : 'w-56'}`}
        >
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium ${
              isIncoming ? 'bg-new text-white' : 'bg-sky-400 text-white'
            }`}
          >
            {isIncoming ? (
              <ApolloIcon name="arrow-down" className="rotate-45" />
            ) : (
              <ApolloIcon name="arrow-up" className="rotate-45" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-gray-900">
              {(isIncoming ? activity?.details?.from_address : activity?.details?.to) ||
                'Unknown Lead'}
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white ${
                  isIncoming ? 'bg-new/90' : 'bg-sky-400/90'
                }`}
              >
                {isIncoming ? 'Incoming' : 'Outgoing'}
              </span>
              <p>{activity?.project_id?.name}</p>
            </div>
          </div>
        </div>

        {/* Content (Middle) */}
        <div
          className={`mx-4 min-w-0 flex-1 transition-all duration-300 ${isOpen ? 'hidden' : ''}`}
        >
          <div className="line-clamp-1 flex truncate text-sm text-gray-700">
            <span className="font-semibold">{activity?.details?.subject || contentPreview}</span>
            <span className="px-1 text-gray-400">—</span>
            <div className="line-clamp-1 truncate opacity-70">{activity?.details?.content}</div>
          </div>
          {/* Attachments (Below main row) */}
          {hasAttachments && (
            <div className="pt-1 pb-1">
              <div className="flex flex-wrap items-center gap-2">
                {(showAllAttachments
                  ? activity?.attachments
                  : activity?.attachments?.slice(0, 3)
                )?.map((attachment, index) => (
                  <div
                    key={attachment?._id || index}
                    className="flex cursor-pointer items-center gap-1 rounded-full bg-white px-2 py-1 text-xs text-gray-700 ring-1 ring-gray-200 transition-colors hover:bg-gray-100"
                    title={attachment?.filename || attachment?.name}
                    onClick={(e) => {
                      e.stopPropagation();
                      onAttachmentClick(attachment);
                    }}
                  >
                    <Image
                      src={`${GetIconPath(attachment?.filename || attachment?.name || '')}`}
                      alt="attachment"
                      width={16}
                      height={16}
                    />
                    <span className="max-w-[120px] truncate">
                      {(attachment?.filename || attachment?.name)?.split('.')[0]}
                    </span>
                    <span className="text-gray-500">
                      .{(attachment?.filename || attachment?.name)?.split('.').pop()}
                    </span>
                  </div>
                ))}
                {(activity?.attachments?.length || 0) > 3 && (
                  <button
                    className="cursor-pointer rounded-md bg-blue-50 px-2 py-1 text-xs text-blue-600 ring-1 ring-blue-100 transition-colors hover:bg-blue-100 hover:text-blue-800"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAllAttachments(!showAllAttachments);
                    }}
                  >
                    {showAllAttachments
                      ? 'Show less'
                      : `+${(activity?.attachments?.length || 0) - 3} more`}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Button (Right) */}
        <div className="space-x-2 text-right">
          <div className="items-top flex shrink-0 gap-2">
            <button
              onClick={handleResendClick}
              className="flex w-7 items-center justify-center rounded-full opacity-0 transition-colors duration-150 group-hover:opacity-100 hover:bg-gray-200"
              title="Resend"
            >
              <Image
                src="/img/others/resend.svg"
                alt="resend"
                width={16}
                height={16}
                className="cursor-pointer text-red-500 opacity-70"
              />
            </button>
            {/* Expand Arrow */}
            <ApolloIcon
              name={isOpen ? 'chevron-arrow-up' : 'chevron-arrow-down'}
              className="ml-1 w-4 text-gray-400"
            />
          </div>
          {activity?.conversation?.reply_count && activity?.conversation?.reply_count > 0 ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-sm border border-blue-200 bg-blue-50 px-1 text-[11px] font-medium text-blue-700">
              <ApolloIcon name="reply" className="text-blue-600" />
              <span>{activity?.conversation?.reply_count}</span>
            </span>
          ) : (
            ''
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailItemHeader;
