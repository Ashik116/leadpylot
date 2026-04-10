'use client';

import DocumentPreviewDialog from '@/components/shared/DocumentPreviewDialog';
import RoleGuard from '@/components/shared/RoleGuard';
import Button from '@/components/ui/Button';
import Popover from '@/components/ui/Popover';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { useDocumentPreview } from '@/hooks/useDocumentPreview';
import { apiFetchDocument } from '@/services/DocumentService';
import {
  useDeleteSlotDocument,
  useOfferDocumentSlots,
} from '@/services/hooks/useDocumentSlots';
import { useEmailViewStore } from '@/stores/emailViewStore';
import { downloadDocument, getDocumentPreviewType } from '@/utils/documentUtils';
import useNotification from '@/utils/hooks/useNotification';
import { useCallback, useState } from 'react';
import { TLead } from '@/services/LeadsService';
import ComposeEmailForSlotModal from '@/app/(protected-pages)/dashboards/mails/_components/Compose/ComposeEmailForSlotModal';
import {
  AttachmentListPopoverContent,
  constructConversationFromEmails,
  getAllAttachmentsFromConversation,
  toPreviewItems,
  type PreviewItem,
} from '@/app/(protected-pages)/dashboards/mails/_components/EmailDetail/emailSlotUtils';

export interface OfferEmailCellProps {
  offerId: string;
  lead: TLead;
  opening?: { _id?: string } | null;
  slotKey: string;
  slotLabel: string;
  selectedItems?: any[];
  onBulkDownload?: (columnId: string) => void;
  columnId?: string;
}

export interface ComposeModalData {
  to: string;
  subject: string;
  body: string;
  mailserver_id: string;
}

export function OfferEmailCell({
  offerId,
  lead,
  opening,
  slotKey,
  slotLabel,
  selectedItems = [],
  onBulkDownload,
  columnId,
}: OfferEmailCellProps) {
  const setEmailView = useEmailViewStore((state) => state.setEmailView);
  const documentPreview = useDocumentPreview();
  const deleteSlotDocumentMutation = useDeleteSlotDocument();
  const { openNotification } = useNotification();

  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewDeleteContext, setPreviewDeleteContext] = useState<{ slotName: string; canDelete: boolean } | null>(null);
  const [composeModalOpen, setComposeModalOpen] = useState(false);
  const [composeModalSlotData, setComposeModalSlotData] = useState<ComposeModalData | null>(null);

  const { data: documentSlotsData } = useOfferDocumentSlots(offerId);

  const slot = documentSlotsData?.data?.document_slots?.[slotKey];
  const emails = slot?.emails || [];
  const documents = slot?.documents || [];
  const pinnedData = {
    conversation: emails.length > 0 ? constructConversationFromEmails(emails) : null,
    documents,
  };

  const conversation = pinnedData.conversation;
  const hasPreview =
    (pinnedData.documents?.length || 0) > 0 ||
    getAllAttachmentsFromConversation(conversation).length > 0;

  const handleFilePreview = useCallback(
    (
      item: PreviewItem,
      allItems: PreviewItem[],
      deleteContext?: { slotName: string; canDelete: boolean }
    ) => {
      setPreviewItems(allItems);
      setPreviewDeleteContext(allItems.length === 1 ? (deleteContext ?? null) : null);
      const idx = allItems.findIndex((i) => i.id === item.id);
      setPreviewIndex(idx >= 0 ? idx : 0);
      const previewType = getDocumentPreviewType(item.fileType, item.filename) as
        | 'pdf'
        | 'image'
        | 'other';
      documentPreview.openPreview(item.id, item.filename, previewType);
    },
    [documentPreview]
  );

  const handleFileDownload = useCallback(
    async (item: PreviewItem) => {
      try {
        const blob = await apiFetchDocument(item.id);
        const contentType = blob.type || item.fileType || 'application/octet-stream';
        downloadDocument(blob, item.filename, contentType);
      } catch {
        openNotification({ type: 'danger', massage: 'Failed to download document' });
      }
    },
    [openNotification]
  );

  const handleFileDelete = useCallback(
    (item: PreviewItem) => {
      if (!offerId) return;
      deleteSlotDocumentMutation.mutate({
        offerId: String(offerId),
        slotName: slotKey,
        documentId: item.id,
        documentType: (item as { type?: string }).type === 'email' ? 'emails' : 'documents',
      });
    },
    [offerId, deleteSlotDocumentMutation]
  );

  const handlePreviewNext = useCallback(() => {
    if (previewItems.length <= 1) return;
    const nextIndex = (previewIndex + 1) % previewItems.length;
    setPreviewIndex(nextIndex);
    const item = previewItems[nextIndex];
    const previewType = getDocumentPreviewType(item.fileType, item.filename) as
      | 'pdf'
      | 'image'
      | 'other';
    documentPreview.openPreview(item.id, item.filename, previewType);
  }, [previewItems, previewIndex, documentPreview]);

  const handlePreviewPrev = useCallback(() => {
    if (previewItems.length <= 1) return;
    const prevIndex = (previewIndex - 1 + previewItems.length) % previewItems.length;
    setPreviewIndex(prevIndex);
    const item = previewItems[prevIndex];
    const previewType = getDocumentPreviewType(item.fileType, item.filename) as
      | 'pdf'
      | 'image'
      | 'other';
    documentPreview.openPreview(item.id, item.filename, previewType);
  }, [previewItems, previewIndex, documentPreview]);

  const handleDeleteFromPreview = useCallback(async () => {
    if (
      !previewDeleteContext?.canDelete ||
      !previewDeleteContext?.slotName ||
      !offerId ||
      !documentPreview.selectedDocumentId
    )
      return;
    await deleteSlotDocumentMutation.mutateAsync({
      offerId: String(offerId),
      slotName: previewDeleteContext.slotName,
      documentId: documentPreview.selectedDocumentId,
    });
    documentPreview.closePreview();
  }, [previewDeleteContext, offerId, documentPreview, deleteSlotDocumentMutation]);

  const handlePreviewClose = useCallback(() => {
    documentPreview.closePreview();
    setPreviewDeleteContext(null);
  }, [documentPreview]);

  const handleViewClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (conversation) {
        setEmailView(
          conversation,
          slotLabel,
          pinnedData.documents,
          offerId ? String(offerId) : undefined,
          slotKey
        );
      }
    },
    [conversation, pinnedData.documents, offerId, setEmailView]
  );

  const handleComposeClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (conversation) {
        setComposeModalSlotData({
          to: (lead as { email_from?: string })?.email_from || conversation.to || '',
          subject:
            conversation.subject ||
            conversation.messages?.[(conversation.messages?.length ?? 1) - 1]?.subject ||
            '',
          body: conversation.html_body || conversation.body || '',
          mailserver_id: conversation.mailserver_id || '',
        });
        setComposeModalOpen(true);
      }
    },
    [conversation, lead]
  );

  const previewItemsList = toPreviewItems(pinnedData.documents || [], []);
  const canDelete = !!offerId && previewItemsList.length > 0;

  if (!conversation && !hasPreview) {
    return <span className="whitespace-nowrap">-</span>;
  }

  return (
    <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
      {hasPreview &&
        previewItemsList.length > 0 &&
        (previewItemsList.length === 1 ? (
          <Button
            className="font-normal"
            size="xs"
            variant="plain"
            title="Preview"
            icon={<ApolloIcon name="paperclip" className="text-xs text-gray-600" />}
            onClick={(e) => {
              e.stopPropagation();
              handleFilePreview(previewItemsList[0], previewItemsList, {
                slotName: slotKey,
                canDelete,
              });
            }}
          >
            <span className="font-semibold">1</span>
          </Button>
        ) : (
          <RoleGuard>
            <Popover
              placement="bottom-end"
              content={
                <AttachmentListPopoverContent
                  items={previewItemsList}
                  onPreview={(item) => handleFilePreview(item, previewItemsList)}
                  onDownload={handleFileDownload}
                  onDelete={handleFileDelete}
                  canDelete={canDelete}
                  deletingDocumentId={
                    deleteSlotDocumentMutation.isPending
                      ? deleteSlotDocumentMutation.variables?.documentId
                      : undefined
                  }
                />
              }
            >
              <Button
                className="font-normal"
                size="xs"
                variant="plain"
                title="Preview"
                icon={<ApolloIcon name="paperclip" className="text-xs text-gray-600" />}
                onClick={(e) => e.stopPropagation()}
              >
                <span className="font-semibold">{previewItemsList.length}</span>
              </Button>
            </Popover>
          </RoleGuard>
        ))}

      <Button
        className="font-normal"
        size="xs"
        variant="plain"
        disabled={!conversation}
        onClick={handleViewClick}
      >
        {conversation ? 'View' : '-'}
      </Button>
      <Button
        size="xs"
        variant="plain"
        title="Compose email"
        disabled={!conversation}
        onClick={handleComposeClick}
        icon={
          <ApolloIcon
            name="sequence-sending-progress"
            className="-rotate-45 text-xs text-gray-600"
          />
        }
      />

      {selectedItems?.length > 0 && onBulkDownload && columnId && (
        <Button
          size="xs"
          variant="plain"
          title="Download selected documents"
          onClick={(e) => {
            e.stopPropagation();
            onBulkDownload(columnId);
          }}
          icon={<ApolloIcon name="download" className="text-xs text-emerald-500" />}
        />
      )}

      <DocumentPreviewDialog
        {...documentPreview.dialogProps}
        onClose={handlePreviewClose}
        title="Document Preview"
        showNavigation={previewItems.length > 1}
        currentIndex={previewIndex}
        totalFiles={previewItems.length}
        onNext={handlePreviewNext}
        onPrevious={handlePreviewPrev}
        onDelete={
          previewItems.length === 1 && previewDeleteContext?.canDelete
            ? handleDeleteFromPreview
            : undefined
        }
        canDelete={previewItems.length === 1 && (previewDeleteContext?.canDelete ?? false)}
        isDeleting={deleteSlotDocumentMutation.isPending}
      />

      <ComposeEmailForSlotModal
        key={composeModalOpen ? `compose-${offerId}` : 'compose-closed'}
        isOpen={composeModalOpen}
        onClose={() => {
          setComposeModalOpen(false);
          setComposeModalSlotData(null);
        }}
        initialData={composeModalSlotData}
        opening={(opening ?? {}) as any}
        lead={lead as any}
        offerId={offerId ? String(offerId) : undefined}
        openingIdFromProp={opening?._id}
        offerIds={[offerId]}
      />
    </div>
  );
}
