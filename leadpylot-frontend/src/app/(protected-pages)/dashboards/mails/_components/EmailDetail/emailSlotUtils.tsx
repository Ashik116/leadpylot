/**
 * Shared utilities for document slot email views (OpeningDocumentsView, OfferEmailCell)
 */
import { FileDocumentCard } from '@/components/shared/FileDocumentCard';
import Button from '@/components/ui/Button';
import ApolloIcon from '@/components/ui/ApolloIcon';
import React from 'react';
import type { EmailAttachment, EmailConversation, EmailMessage } from '../../_types/email.types';

export const constructConversationFromEmails = (
  emails: EmailMessage[]
): EmailConversation => {
  if (!emails || emails.length === 0) {
    return {} as EmailConversation;
  }

  const firstEmail = emails[emails.length - 1];

  const conversation: EmailConversation = {
    _id: firstEmail._id || '',
    thread_id: null,
    subject: firstEmail.subject || '',
    participants: [
      {
        _id: '1',
        name: firstEmail.from || 'Unknown',
        email: firstEmail.from_address || '',
      },
    ],
    mailserver_id: firstEmail.mailserver_id || '',
    messages: emails,
    latest_message_date: firstEmail.received_at || firstEmail.sent_at || '',
    latest_message_snippet: firstEmail.body || '',
    unread_count: 0,
    message_count: emails.length,
    is_active: true,
    attachment_count: emails.reduce((count, email) => count + (email.attachments?.length || 0), 0),
    email_access_to_agent: [],
    direction: firstEmail.direction,
    external_id: '',
    from: firstEmail.from || '',
    from_address: firstEmail.from_address || '',
    to: firstEmail.to || '',
    cc: '',
    bcc: '',
    body: firstEmail.body || '',
    html_body: firstEmail.html_body || '',
    original_body: firstEmail.body || '',
    original_html_body: firstEmail.html_body || '',
    received_at: firstEmail.received_at || '',
    sent_at: firstEmail.sent_at || '',
    assigned_agent: undefined,
    visible_to_agents: [],
    needs_approval: false,
    approval_status: 'pending',
    email_approved: true,
    attachment_approved: true,
    lead_id: null,
    project_id: null,
    has_attachments: emails.some((e) => e.attachments && e.attachments.length > 0),
    has_unread: false,
    attachments: firstEmail.attachments || [],
    incoming_count: emails.filter((e) => e.direction === 'incoming').length,
    outgoing_count: emails.filter((e) => e.direction === 'outgoing').length,
    matched_by: undefined,
    email_status: undefined,
    priority: undefined,
    category: undefined,
    tags: undefined,
    spam_score: undefined,
    spam_indicators: undefined,
    is_spam: false,
    sentiment: undefined,
    sentiment_score: undefined,
    topics: undefined,
    delivery_status: undefined,
    delivery_attempts: undefined,
    delivery_errors: undefined,
    processed: true,
    in_reply_to: null,
    references: undefined,
    flagged: false,
    reply_to_email: null,
    reply_count: emails.length - 1,
    is_reply: firstEmail.is_reply || false,
    is_forward: false,
    internal_comments: undefined,
    comment_count: 0,
    reminders: undefined,
    snoozed: false,
    snoozed_until: undefined,
    snoozed_by: undefined,
    labels: undefined,
    agent_viewed: true,
    admin_viewed: true,
    admin_viewed_at: undefined,
    admin_viewed_by: undefined,
    archived: false,
    status: undefined,
    has_draft: false,
    workflow_history: undefined,
    conversation: undefined,
    thread_emails: emails,
    createdAt: firstEmail.createdAt || firstEmail.received_at || '',
    updatedAt: '',
    __v: 0,
  };

  return conversation;
};

export const getAllAttachmentsFromConversation = (
  conversation: EmailConversation | null
): EmailAttachment[] => {
  if (!conversation) return [];
  const attachments: EmailAttachment[] = [];
  if (conversation.attachments?.length)
    attachments.push(...conversation.attachments.map((att) => ({ ...att, type: 'email' })));
  for (const msg of conversation.messages) {
    if (msg.attachments?.length)
      attachments.push(...msg.attachments.map((att) => ({ ...att, type: 'email' })));
  }
  return attachments;
};

export type PreviewItem = {
  id: string;
  filename: string;
  fileType: string;
  type?: string;
  [key: string]: unknown;
};

export const toPreviewItems = (
  documents: { _id: string; filename?: string; filetype?: string; type?: string }[],
  attachments: EmailAttachment[]
): PreviewItem[] => {
  if (documents?.length) {
    return documents.map((d) => ({
      id: d._id,
      filename: d.filename || 'Document',
      fileType: d.filetype || d.type || 'application/octet-stream',
      ...d,
    }));
  }
  return attachments.map((a) => ({
    id:
      typeof a.document_id === 'string'
        ? a.document_id
        : (a.document_id as { _id?: string })?._id || a._id,
    fileType: a.mime_type || 'application/octet-stream',
    ...a,
  }));
};

export interface AttachmentListPopoverContentProps {
  items: PreviewItem[];
  onPreview: (item: PreviewItem) => void;
  onDownload: (item: PreviewItem) => void;
  onDelete?: (item: PreviewItem) => void;
  canDelete?: boolean;
  deletingDocumentId?: string;
}

export const AttachmentListPopoverContent: React.FC<AttachmentListPopoverContentProps> = ({
  items,
  onPreview,
  onDownload,
  onDelete,
  canDelete = false,
  deletingDocumentId,
}) => (
  <div className="max-h-64 w-64 overflow-y-auto p-1">
    <div className="space-y-0.5">
      {items.map((item) => (
        <FileDocumentCard
          key={item.id}
          variant="row"
          filename={item.filename}
          mimeType={item.fileType}
          onClick={() => onPreview(item)}
          className="border-0 px-2 py-1.5"
          actions={
            <>
              <Button
                variant="plain"
                size="xs"
                title="Download"
                icon={<ApolloIcon name="download" className="text-sm text-gray-600" />}
                onClick={(e) => {
                  e.stopPropagation();
                  onDownload(item);
                }}
              />
              <Button
                variant="plain"
                size="xs"
                title="Delete document"
                icon={<ApolloIcon name="trash" className="text-sm text-gray-500" />}
                disabled={!canDelete || !onDelete || deletingDocumentId === item.id}
                onClick={(e) => {
                  e.stopPropagation();
                  if (canDelete && onDelete) onDelete(item);
                }}
              />
            </>
          }
        />
      ))}
    </div>
  </div>
);
