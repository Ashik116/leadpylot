import DocumentPreviewDialog from '@/components/shared/DocumentPreviewDialog';
import RoleGuard from '@/components/shared/RoleGuard';
import Button from '@/components/ui/Button';
import Popover from '@/components/ui/Popover';
import ApolloIcon from '@/components/ui/ApolloIcon';
import { Role } from '@/configs/navigation.config/auth.route.config';
import { useDocumentPreview } from '@/hooks/useDocumentPreview';
import { apiFetchDocument } from '@/services/DocumentService';
import {
  useDeleteSlotDocument,
  useLeadLastEmail,
  useOfferDocumentSlots,
} from '@/services/hooks/useDocumentSlots';
import { useEmailViewStore } from '@/stores/emailViewStore';
import { DateFormatType, dateFormateUtils } from '@/utils/dateFormateUtils';
import { downloadDocument, getDocumentPreviewType } from '@/utils/documentUtils';
import useNotification from '@/utils/hooks/useNotification';
import React, { useCallback, useState } from 'react';
import { InlineAgentCommissionPct } from '../../../leads/[id]/_components/InlineEditComponents';
import type { EmailAttachment } from '../../_types/email.types';
import ComposeEmailForSlotModal from '../Compose/ComposeEmailForSlotModal';
import {
  AttachmentListPopoverContent,
  constructConversationFromEmails,
  getAllAttachmentsFromConversation,
  toPreviewItems,
  type PreviewItem,
} from './emailSlotUtils';
import type { OpeningDocumentsViewProps } from './types';

const documentItems = [
  { label: 'Opening Email', key: 'opening_email' },
  { label: 'Last Email', key: 'last_email' },
  { label: 'Offer Contract', key: 'offer_contract' },
  { label: 'Contract', key: 'contract' },
  { label: 'ID Files', key: 'id_files' },
  { label: 'Opening Con. Client email', key: 'opening_contract_client_email' },
  { label: 'Confirmation Email', key: 'confirmation_email' },
  { label: 'Contract Reply Mail', key: 'contract_received_mail' },
  { label: 'Annahme', key: 'annahme' },
  { label: 'Swift', key: 'swift' },
  { label: 'Swift Confirm Mail', key: 'swift_confirm_mail' },
  { label: 'Bank Confirmation', key: 'bank_confirmation' },
  { label: 'Depot Update Mail', key: 'depot_update_mail' },
  // { label: 'Depot Login', key: 'depot_login' },
  { label: 'Load Mail', key: 'load_mail' },
];

export const OpeningDocumentsView: React.FC<OpeningDocumentsViewProps> = ({
  lead,
  session,
  fetchedOpening,
  offerId,
  offerIds,
  openingIdFromProp,
  refetchOpening,
  onOpenPaymentHistory,
  opening,
}) => {
  const setEmailView = useEmailViewStore((state) => state.setEmailView);
  const documentPreview = useDocumentPreview();
  const deleteSlotDocumentMutation = useDeleteSlotDocument();
  const { openNotification } = useNotification();
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewDeleteContext, setPreviewDeleteContext] = useState<{
    slotName: string;
    canDelete: boolean;
  } | null>(null);
  const [composeModalOpen, setComposeModalOpen] = useState(false);
  const [composeModalSlotData, setComposeModalSlotData] = useState<{
    to: string;
    subject: string;
    body: string;
    mailserver_id: string;
  } | null>(null);

  const { data: documentSlotsData } = useOfferDocumentSlots(offerId);
  const { data: lastEmailData } = useLeadLastEmail(lead?._id);
  const getPinnedEmailData = (key: string) => {
    if (key === 'last_email') {
      const emails = lastEmailData?.data?.emails || [];
      return {
        conversation: emails.length > 0 ? constructConversationFromEmails(emails) : null,
        documents: [],
      };
    }
    const slot = documentSlotsData?.data?.document_slots?.[key];
    const emails = slot?.emails || [];
    return {
      conversation: emails.length > 0 ? constructConversationFromEmails(emails) : null,
      documents: slot?.documents || [],
    };
  };

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
    (item: PreviewItem, slotName: string) => {
      if (!offerId) return;
      deleteSlotDocumentMutation.mutate({
        offerId: String(offerId),
        slotName,
        documentId: item.id,
        documentType: item.type === 'email' ? 'emails' : 'documents',
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

  return (
    <div className="">
      {documentItems.map((item) => {
        const pinnedData = getPinnedEmailData(item.key);
        const conversation = pinnedData.conversation;
        const emailDate =
          conversation?.latest_message_date || conversation?.received_at || conversation?.sent_at;
        const hasPreview =
          (pinnedData.documents?.length || 0) > 0 ||
          getAllAttachmentsFromConversation(conversation).length > 0;
        // console.log({ conversation, lead, offerId, documentSlotsData })
        return (
          <div
            key={item.key}
            className="flex items-center border-b border-gray-100 last:border-0 hover:bg-gray-50/50"
          >
            <div className="w-32 lg:w-40">
              <h6 className="text-sm font-medium">{item.label}</h6>
            </div>
            <div className="flex flex-1 items-center justify-end gap-2">
              <span className="text-xs text-nowrap">
                {emailDate
                  ? dateFormateUtils(emailDate, DateFormatType.SHOW_DATE)
                  : conversation
                    ? '(No Date)'
                    : '-'}
              </span>

              <div className="flex items-center">
                {hasPreview &&
                  (() => {
                    const previewItemsList = toPreviewItems(pinnedData.documents || [], []);

                    if (previewItemsList.length === 0) return null;

                    // Single attachment: direct preview on click
                    if (previewItemsList.length === 1) {
                      return (
                        <Button
                          className="font-normal"
                          size="xs"
                          variant="plain"
                          title="Preview"
                          icon={<ApolloIcon name="paperclip" className="text-xs text-gray-600" />}
                          onClick={() =>
                            handleFilePreview(previewItemsList[0], previewItemsList, {
                              slotName: item.key,
                              canDelete:
                                !!offerId &&
                                item.key !== 'last_email' &&
                                previewItemsList.length > 0,
                            })
                          }
                        >
                          <span className="font-semibold">1</span>
                        </Button>
                      );
                    }

                    // Multiple attachments: show popover (Button must be direct child for ref/click to work)
                    return (
                      <RoleGuard>
                        <Popover
                          placement="bottom-end"
                          content={
                            <AttachmentListPopoverContent
                              items={previewItemsList}
                              onPreview={(item) => handleFilePreview(item, previewItemsList)}
                              onDownload={handleFileDownload}
                              onDelete={(previewItem) => handleFileDelete(previewItem, item.key)}
                              canDelete={
                                !!offerId &&
                                item.key !== 'last_email' &&
                                previewItemsList.length > 0
                              }
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
                          >
                            <span className="font-semibold">{previewItemsList.length}</span>
                          </Button>
                        </Popover>
                      </RoleGuard>
                    );
                  })()}
                {conversation ? (
                  <>
                    <Button
                      className="font-normal"
                      size="xs"
                      variant="plain"
                      onClick={() =>
                        setEmailView(
                          conversation,
                          item.label,
                          pinnedData.documents,
                          offerId ? String(offerId) : undefined,
                          item.key
                        )
                      }
                    >
                      View
                    </Button>
                  </>
                ) : (
                  <Button
                    className="cursor-not-allowed font-normal"
                    size="xs"
                    variant="plain"
                    disabled
                  >
                    View
                  </Button>
                )}
                <Button
                  size="xs"
                  variant="plain"
                  title="Compose email"
                  disabled={!conversation}
                  onClick={() => {
                    if (conversation) {
                      // console.log({ conversation })
                      setComposeModalSlotData({
                        to: lead?.email_from || conversation.to || '',
                        subject:
                          conversation.subject ||
                          conversation.messages?.[conversation.messages.length - 1]?.subject ||
                          '',
                        body: conversation.html_body || conversation.body || '',
                        mailserver_id: conversation.mailserver_id || '',
                      });
                      setComposeModalOpen(true);
                    }
                  }}
                  icon={
                    <ApolloIcon
                      name="sequence-sending-progress"
                      className="-rotate-45 text-xs text-gray-600"
                    />
                  }
                />
              </div>
            </div>
          </div>
        );
      })}

      {/* Financial Summary Row */}
      <div className="3xl:grid-cols-3 mt-2 grid grid-cols-1 gap-x-2 lg:grid-cols-2">
        {/* Send Amount */}
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-medium">Send Amount</p>
          <div className="flex items-center gap-1.5">
            {fetchedOpening?.financials?.financials_initialized ? (
              <>
                <span
                  className="cursor-pointer text-sm font-medium text-green-600 hover:text-green-700"
                  onDoubleClick={(e?: React.MouseEvent) => {
                    e?.stopPropagation();
                    onOpenPaymentHistory();
                  }}
                  title="Double-click to view payment history"
                >
                  {(
                    fetchedOpening.financials?.payment_summary?.total_received || 0
                  ).toLocaleString()}
                  /{(fetchedOpening.financials?.expected_from_customer || 0).toLocaleString()}
                </span>
                {session?.user?.role === Role.ADMIN && (
                  <ApolloIcon
                    name="plus"
                    className="cursor-pointer text-xs text-gray-800 transition-colors hover:text-gray-600"
                    onClick={(e?: React.MouseEvent) => {
                      e?.stopPropagation();
                      onOpenPaymentHistory();
                    }}
                  />
                )}
              </>
            ) : (
              <span className="text-sm font-medium text-green-600">0/0</span>
            )}
          </div>
        </div>

        {/* Agent Commission */}
        {fetchedOpening?.financials?.financials_initialized &&
          session?.user?.role === Role.ADMIN ? (
          <InlineAgentCommissionPct
            offerId={String(offerId)}
            financials={fetchedOpening.financials}
            invalidateQueries={['opening', openingIdFromProp]}
            refetch={refetchOpening}
          />
        ) : (
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-medium">Agent Commission</p>
            <span className="text-sm font-medium text-green-600">
              {fetchedOpening?.financials?.primary_agent_commission?.percentage || 0} %
            </span>
          </div>
        )}

        {/* Profit */}
        <div className="">
          <p className="text-sm font-medium">Profit</p>
          <p className="text-sm font-medium text-green-600">
            {fetchedOpening?.financials?.financials_initialized
              ? `${(
                fetchedOpening.financials?.net_amounts?.actual_company_revenue || 0
              ).toLocaleString()}/${(
                fetchedOpening.financials?.net_amounts?.expected_company_revenue || 0
              ).toLocaleString()}`
              : '0/0'}
          </p>
        </div>
      </div>

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
        opening={opening}
        lead={lead as any}
        offerId={offerId ? String(offerId) : undefined}
        openingIdFromProp={openingIdFromProp}
        offerIds={offerIds}
      />
    </div>
  );
};
