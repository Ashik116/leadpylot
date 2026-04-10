'use client';

/**
 * PinnedEmailView Component
 * High-fidelity view matching the user's design screenshots
 * Displays ALL emails in the slot (full messages array from constructed conversation)
 */

import DocumentPreviewDialog from '@/components/shared/DocumentPreviewDialog';
import { useDocumentHandler } from '@/hooks/useDocumentHandler';
import { getDocumentPreviewType } from '@/utils/documentUtils';
import { useCallback } from 'react';
import { EmailAttachment, EmailConversation } from '../../_types/email.types';
import MessageThread from '../Conversation/MessageThread';
import { useDeleteSlotEmail } from '@/services/hooks/useDocumentSlots';
import { useEmailViewStore } from '@/stores/emailViewStore';

interface PinnedEmailViewProps {
  conversation: EmailConversation;
  slotTitle: string;
  slotDocuments: any[];
  /** When true, in DocumentSlotViewer dialog - stop propagation so row click doesn't open OpeningDetailsPopup */
  embeddedInDialog?: boolean;
  /** Tailwind padding class(es) applied to the content wrapper (e.g. 'p-2') */
  contentPadding?: string;
}

export default function PinnedEmailView({
  conversation,
  slotTitle,
  slotDocuments,
  embeddedInDialog = false,
  contentPadding,
}: PinnedEmailViewProps) {
  const { data: emailViewData, clearEmailView } = useEmailViewStore();
  const deleteSlotEmailMutation = useDeleteSlotEmail();
  const offerId = emailViewData?.offerId;
  const slotName = emailViewData?.slotName;
  const canDeleteFromSlot =
    !!offerId && !!slotName && slotName !== 'last_email';
  const documentHandler = useDocumentHandler();

  const handleDocumentClick = (doc: any) => {
    const document = doc?.document || doc;
    if (!document?._id) return;

    const fileType = document?.filetype || document?.type || 'application/octet-stream';
    const filename = document?.filename || 'Unknown file';
    const previewType = getDocumentPreviewType(fileType, filename);

    documentHandler.documentPreview.openPreview(
      document._id,
      filename,
      previewType as 'pdf' | 'image' | 'other'
    );
  };

  const handleDeleteFromSlot = useCallback(
    (emailId: string) => {
      if (!offerId || !slotName) return;
      deleteSlotEmailMutation.mutate(
        { offerId, slotName, emailId },
        {
          onSuccess: () => {
            clearEmailView();
          },
        }
      );
    },
    [offerId, slotName, deleteSlotEmailMutation, clearEmailView]
  );

  const handleAttachmentClick = useCallback(
    (attachment: EmailAttachment) => {
      const documentId =
        typeof attachment.document_id === 'string'
          ? attachment.document_id
          : (attachment.document_id as { _id?: string })?._id || attachment._id;
      if (!documentId) return;

      const previewType = getDocumentPreviewType(
        attachment.mime_type || '',
        attachment.filename
      ) as 'pdf' | 'image' | 'other';

      documentHandler.documentPreview.openPreview(
        documentId,
        attachment.filename || 'Unknown file',
        previewType
      );
    },
    [documentHandler.documentPreview]
  );

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">
      {/* Content - MessageThread renders ALL messages from conversation.messages */}
      <div
        className={`flex-1 space-y-8 overflow-y-auto ${!embeddedInDialog ? 'p-2' : ''} ${contentPadding ?? ''}`}
      >
        <MessageThread
          conversation={conversation}
          onAttachmentClick={handleAttachmentClick}
          hidePinning={true}
          initialCardsCollapsed={true}
          collapseableCount={10}
          onDeleteFromSlot={canDeleteFromSlot ? handleDeleteFromSlot : undefined}
          isDeletingEmailId={
            deleteSlotEmailMutation.isPending
              ? deleteSlotEmailMutation.variables?.emailId
              : undefined
          }
          embeddedInDialog={embeddedInDialog}
          showDateAndDeexpandWhenExpandAll={true}
          inlineControlsWhenExpanded={true}
        />

        {/* Offer Document Section */}
        {/* {slotDocuments && slotDocuments.length > 0 && (
          <div className="space-y-4 pt-4">
            <h3 className="text-sm font-bold tracking-tight text-gray-900">Offer Document</h3>
            <div className="flex flex-wrap gap-3">
              {slotDocuments.map((doc, index) => {
                const document = doc?.document || doc;
                return (
                  <FileDocumentCard
                    key={document._id || index}
                    variant="card"
                    filename={document.filename || 'Document'}
                    mimeType={document.filetype || document.type}
                    onClick={() => handleDocumentClick(document)}
                  />
                );
              })}
            </div>
          </div>
        )} */}


      </div>

      {/* Embedded Document Preview */}
      <DocumentPreviewDialog
        {...documentHandler.documentPreview.dialogProps}
        title={`${slotTitle} - Preview`}
      />
    </div>
  );
}
