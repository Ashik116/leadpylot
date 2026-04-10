'use client';

import ApolloIcon from '@/components/ui/ApolloIcon';

// Helper to safely extract string from value that may be {value, html, text} or string
const extractString = (value: unknown): string => {
  if (value === null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null) {
    const o = value as Record<string, unknown>;
    if (typeof o.text === 'string') return o.text;
    if (typeof o.value === 'string') return o.value;
    if (typeof o.html === 'string') return o.html.replace(/<[^>]+>/g, '').trim();
  }
  return String(value);
};
import Button from '@/components/ui/Button';
import classNames from '@/utils/classNames';
import DocumentPreviewDialog from '@/components/shared/DocumentPreviewDialog';
import { useDocumentPreview } from '@/hooks/useDocumentPreview';
import { getDocumentPreviewType } from '@/utils/documentUtils';
import { FileDocumentCard } from '@/components/shared/FileDocumentCard/FileDocumentCard';
import AxiosBase from '@/services/axios/AxiosBase';

const EmailCard = ({
  activity,
  onClick,
  currentOfferId,
  currentLeadId,
  className,
}: {
  activity: any;
  onClick: (id: string) => void;
  currentOfferId?: string;
  currentLeadId?: string;
  className?: string;
}) => {
  const { from_address, to_address } = activity?.details || {};
  const from = extractString(from_address || activity?.from_address);
  const to = extractString(to_address || activity?.to_address);
  const { contact_name } = activity?.lead_id || {};
  const title = extractString(contact_name || from);
  const initial = title?.[0]?.toUpperCase() || 'M';
  const bodyPreview = extractString(activity?.body_preview || '');
  const attachments = activity?.attachments || [];
  const documentPreview = useDocumentPreview();

  const handleAttachmentClick = (e: React.MouseEvent, att: { _id: string; filename: string; document_id?: string; mime_type?: string }) => {
    e.stopPropagation();
    if (!att.document_id) return;
    const previewType = getDocumentPreviewType(att.mime_type || '', att.filename) as 'pdf' | 'image' | 'other';
    documentPreview.openPreview(att.document_id, att.filename, previewType);
  };

  const handleDownload = async (att: { _id: string; filename: string; document_id?: string; mime_type?: string }, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const docId = att.document_id || att._id;
    if (!docId) return;
    try {
      const response = await AxiosBase.get(`/attachments/${docId}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', att.filename || 'file');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      // Download failed
    }
  };

  return (
    <div
      key={activity?.id}
      className={classNames(
        'relative cursor-pointer rounded-lg  bg-white  ',
        className
      )}
      onClick={() => onClick(activity?.id)}
    >
      {/* 2nd arrow (expand button) - commented out */}
      {/* <div className="absolute top-2 right-2 flex items-center">
        <Button
          variant="plain"
          size="sm"
          className="pointer-events-none text-gray-400"
          icon={<ApolloIcon name="chevron-arrow-down" className="text-md" />}
          title="Expand"
        />
      </div> */}

      <div className="flex gap-3">
        {/* <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-300 bg-gray-50  text-gray-600">
          {initial}
        </div> */}

        <div className="min-w-0 flex-1  ">
          {/* From */}
          {from && (
            <div className="flex items-baseline gap-1.5 text-sm">
              <span className="shrink-0  ">From :</span>
              <span className="truncate ">{from}</span>
            </div>
          )}

          {/* To */}
          {to && (
            <div className="flex items-baseline gap-1.5 text-sm">
              <span className="shrink-0  ">To :</span>
              <span className="truncate ">{to}</span>
            </div>
          )}

          {/* Subject */}
          {activity?.subject && (
            <div className="flex items-baseline gap-1.5 text-sm">
              <span className="shrink-0  ">Subject :</span>
              <span className="line-clamp-1 truncate ">{extractString(activity.subject)}</span>
            </div>
          )}

          {/* Body preview - 1 line */}
          {bodyPreview && (
            <div className="line-clamp-1 text-sm ">{bodyPreview}</div>
          )}

          {/* Attachments - same pattern as MessageBubble */}
          {attachments?.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {attachments?.map((att: { _id: string; filename: string; document_id?: string; mime_type?: string }) => (
                <FileDocumentCard
                  key={att?._id}
                  variant="row"
                  filename={att?.filename}
                  mimeType={att?.mime_type}
                  onClick={(e) => {
                    e?.stopPropagation();
                    if (e) handleAttachmentClick(e, att);
                  }}
                  actions={
                    <Button
                      variant="plain"
                      size="xs"
                      title="Download attachment"
                      icon={<ApolloIcon name="download" className="text-evergreen text-xs" />}
                      className="hover:bg-transparent"
                      onClick={(e) => {
                        e?.stopPropagation();
                        if (e) handleDownload(att, e);
                      }}
                    />
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <DocumentPreviewDialog {...documentPreview.dialogProps} title="Email Attachment Preview" />
    </div>
  );
};

export default EmailCard;
